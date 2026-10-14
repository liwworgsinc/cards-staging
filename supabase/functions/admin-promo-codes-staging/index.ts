import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAGING_ORIGIN = "https://liwworgsinc.github.io";
const LOCAL_ORIGINS = new Set(["http://localhost:4173","http://127.0.0.1:4173","http://localhost:8080","http://127.0.0.1:8080","http://localhost:5500","http://127.0.0.1:5500"]);
const STAGING_HEADER = "cards-staging-promo-v1";
const ADMIN_EMAILS = new Set(["liwworgsinc@gmail.com","globalcorent@gmail.com"]);
const ALLOWED_PLANS = new Set(["starter","lite","plus","pro","agency","white_label"]);
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

function origin(req:Request){return req.headers.get("origin")||""}
function allowedOrigin(req:Request){const o=origin(req);return o===STAGING_ORIGIN||LOCAL_ORIGINS.has(o)}
function cors(req:Request){const o=origin(req);return{"Access-Control-Allow-Origin":allowedOrigin(req)?o:STAGING_ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-liw-staging-admin","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),"Content-Type":"application/json"}})}

async function requireAdmin(req:Request){
  if(!allowedOrigin(req)||req.headers.get("x-liw-staging-admin")!==STAGING_HEADER)throw new Error("This promo control is only available from LIW Cards staging");
  const auth=req.headers.get("Authorization")||"";
  const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const{data:{user},error}=await client.auth.getUser();
  if(error||!user)throw new Error("Unauthorized");
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{autoRefreshToken:false,persistSession:false}});
  const{data:profile}=await admin.from("profiles").select("role").eq("id",user.id).maybeSingle();
  const email=String(user.email||"").toLowerCase();
  if(profile?.role!=="admin"&&!ADMIN_EMAILS.has(email))throw new Error("Admin access is required");
  return{user,admin};
}

function cleanPlans(value:unknown){if(!Array.isArray(value))return[] as string[];return[...new Set(value.map(v=>String(v).toLowerCase()).filter(v=>ALLOWED_PLANS.has(v)))]}
function isoOrNull(value:unknown){if(!value)return null;const d=new Date(String(value));if(Number.isNaN(d.getTime()))throw new Error("Invalid promo date");return d.toISOString()}
async function stripeRequest(path:string,stripeKey:string){
  const response=await fetch(`https://api.stripe.com/v1/${path}`,{headers:{Authorization:`Bearer ${stripeKey}`}});
  const result=await response.json().catch(()=>({}));
  return{response,result};
}

async function syncRedemptions(admin:any,stripeKey:string){
  if(!stripeKey)return;
  const cutoff=new Date(Date.now()-60*1000).toISOString();
  const{data:rows,error}=await admin.from("staging_promo_redemptions")
    .select("id,checkout_session_id,status,completed_at,last_synced_at")
    .not("checkout_session_id","is",null)
    .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
    .order("created_at",{ascending:false})
    .limit(30);
  if(error)throw error;
  for(const row of rows||[]){
    try{
      const{response,result}=await stripeRequest(`checkout/sessions/${encodeURIComponent(String(row.checkout_session_id))}`,stripeKey);
      if(!response.ok)continue;
      let nextStatus=row.status;
      if(result.status==="complete")nextStatus="completed";
      else if(result.status==="expired")nextStatus="canceled";
      const patch:any={
        status:nextStatus,
        stripe_checkout_status:result.status||null,
        stripe_payment_status:result.payment_status||null,
        stripe_subscription_id:typeof result.subscription==="string"?result.subscription:null,
        amount_subtotal:Number.isFinite(result.amount_subtotal)?result.amount_subtotal:null,
        amount_discount:Number.isFinite(result.total_details?.amount_discount)?result.total_details.amount_discount:null,
        amount_total:Number.isFinite(result.amount_total)?result.amount_total:null,
        currency:result.currency||null,
        last_synced_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      };
      if(nextStatus==="completed"&&!row.completed_at)patch.completed_at=new Date().toISOString();
      await admin.from("staging_promo_redemptions").update(patch).eq("id",row.id);
    }catch(error){console.error("Promo redemption sync failed",row.id,error instanceof Error?error.message:error)}
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});
  if(req.method!=="POST")return json(req,{error:"Method not allowed"},405);
  try{
    const{user,admin}=await requireAdmin(req);
    const body=await req.json().catch(()=>({}));
    const action=String(body.action||"list").toLowerCase();

    if(action==="list"){
      await syncRedemptions(admin,Deno.env.get("STRIPE_SECRET_KEY")||"");
      const[{data:promos,error:promoError},{data:redemptions,error:redemptionError},{data:events,error:eventError}]=await Promise.all([
        admin.from("staging_promo_codes").select("*").order("created_at",{ascending:false}),
        admin.from("staging_promo_redemptions").select("promo_id,user_id,status,stripe_payment_status,amount_discount,amount_total,currency,created_at"),
        admin.from("staging_promo_events").select("promo_id,event_type,utm_source,utm_medium,utm_campaign,created_at")
      ]);
      if(promoError)throw promoError;
      if(redemptionError)throw redemptionError;
      if(eventError)throw eventError;

      const rows=(promos||[]).map((promo:any)=>{
        const promoRedemptions=(redemptions||[]).filter((r:any)=>r.promo_id===promo.id);
        const used=promoRedemptions.filter((r:any)=>["reserved","completed"].includes(r.status));
        const completed=promoRedemptions.filter((r:any)=>r.status==="completed");
        const paid=completed.filter((r:any)=>r.stripe_payment_status==="paid");
        const promoEvents=(events||[]).filter((e:any)=>e.promo_id===promo.id);
        const visits=promoEvents.filter((e:any)=>e.event_type==="visit").length;
        const applies=promoEvents.filter((e:any)=>e.event_type==="applied").length;
        const revenueCents=paid.reduce((sum:number,r:any)=>sum+Number(r.amount_total||0),0);
        const discountCents=completed.reduce((sum:number,r:any)=>sum+Number(r.amount_discount||0),0);
        return{
          ...promo,
          usage_count:used.length,
          customer_count:new Set(used.map((r:any)=>r.user_id)).size,
          visit_count:visits,
          apply_count:applies,
          checkout_count:promoRedemptions.length,
          conversion_count:completed.length,
          paid_count:paid.length,
          revenue_cents:revenueCents,
          discount_cents:discountCents,
          conversion_rate:visits?Number(((completed.length/visits)*100).toFixed(1)):0
        };
      });
      const summary=rows.reduce((acc:any,p:any)=>{
        acc.visits+=p.visit_count||0;
        acc.applies+=p.apply_count||0;
        acc.checkouts+=p.checkout_count||0;
        acc.conversions+=p.conversion_count||0;
        acc.paid+=p.paid_count||0;
        acc.revenue_cents+=p.revenue_cents||0;
        acc.discount_cents+=p.discount_cents||0;
        return acc;
      },{visits:0,applies:0,checkouts:0,conversions:0,paid:0,revenue_cents:0,discount_cents:0});
      return json(req,{ok:true,promos:rows,summary});
    }

    if(action==="save"){
      const id=String(body.id||"").trim()||null,
        code=String(body.code||"").trim().toUpperCase(),
        description=String(body.description||"").trim().slice(0,300)||null,
        discountType=String(body.discountType||"").toLowerCase(),
        discountValue=Number(body.discountValue),
        startsAt=isoOrNull(body.startsAt),
        expiresAt=isoOrNull(body.expiresAt),
        maxRedemptions=body.maxRedemptions===null||body.maxRedemptions===""||body.maxRedemptions===undefined?null:Number(body.maxRedemptions),
        perCustomerLimit=Number(body.perCustomerLimit||1),
        applicablePlans=cleanPlans(body.applicablePlans),
        active=body.active!==false,
        buzzFeatured=Boolean(body.buzzFeatured);
      if(!CODE_RE.test(code))throw new Error("Promo code must be 3–32 characters using letters, numbers, _ or -");
      if(!["percent","fixed"].includes(discountType))throw new Error("Choose percentage or fixed-dollar discount");
      if(!Number.isFinite(discountValue)||discountValue<=0)throw new Error("Discount must be greater than zero");
      if(discountType==="percent"&&discountValue>100)throw new Error("Percentage discount cannot exceed 100%");
      if(maxRedemptions!==null&&(!Number.isInteger(maxRedemptions)||maxRedemptions<1))throw new Error("Usage limit must be a positive whole number");
      if(!Number.isInteger(perCustomerLimit)||perCustomerLimit<1)throw new Error("Per-customer limit must be at least 1");
      if(startsAt&&expiresAt&&new Date(expiresAt)<=new Date(startsAt))throw new Error("Expiration must be after the start date");
      let stripeCouponId:string|null=null;
      if(id){
        const{data:current,error}=await admin.from("staging_promo_codes").select("discount_type,discount_value,stripe_coupon_id").eq("id",id).maybeSingle();
        if(error)throw error;
        if(!current)throw new Error("Promo code not found");
        if(current.discount_type===discountType&&Number(current.discount_value)===discountValue)stripeCouponId=current.stripe_coupon_id||null;
      }
      const payload={code,description,discount_type:discountType,discount_value:discountValue,currency:"usd",active,starts_at:startsAt,expires_at:expiresAt,max_redemptions:maxRedemptions,per_customer_limit:perCustomerLimit,applicable_plans:applicablePlans,stripe_coupon_id:stripeCouponId,updated_at:new Date().toISOString()};
      let saved:any;
      if(id){
        const{data,error}=await admin.from("staging_promo_codes").update(payload).eq("id",id).select("*").single();if(error)throw error;saved=data;
      }else{
        const{data,error}=await admin.from("staging_promo_codes").insert({...payload,created_by:user.id}).select("*").single();if(error)throw error;saved=data;
      }

      const nowIso=new Date().toISOString();
      if(buzzFeatured){
        const{error:clearError}=await admin.from("staging_promo_codes").update({buzz_featured:false,updated_at:nowIso}).eq("buzz_featured",true).neq("id",saved.id);
        if(clearError)throw clearError;
        const{data:featured,error:featureError}=await admin.from("staging_promo_codes").update({buzz_featured:true,updated_at:nowIso}).eq("id",saved.id).select("*").single();
        if(featureError)throw featureError;
        saved=featured;
      }else{
        const{data:unfeatured,error:featureError}=await admin.from("staging_promo_codes").update({buzz_featured:false,updated_at:nowIso}).eq("id",saved.id).select("*").single();
        if(featureError)throw featureError;
        saved=unfeatured;
      }

      return json(req,{ok:true,promo:saved,message:`${code} saved for staging${saved.buzz_featured?" and selected for LIW Buzz":""}.`});
    }

    if(action==="toggle"){
      const id=String(body.id||"").trim();if(!id)throw new Error("Promo ID is required");
      const active=Boolean(body.active);
      const{data,error}=await admin.from("staging_promo_codes").update({active,updated_at:new Date().toISOString()}).eq("id",id).select("*").single();
      if(error)throw error;
      return json(req,{ok:true,promo:data,message:`${data.code} ${active?"activated":"disabled"}.`});
    }

    throw new Error("Unknown promo action");
  }catch(error){
    const message=error instanceof Error?error.message:"Unable to manage staging promo codes";
    const status=/Unauthorized|Admin access/.test(message)?401:/only available/.test(message)?403:400;
    return json(req,{error:message},status);
  }
});
