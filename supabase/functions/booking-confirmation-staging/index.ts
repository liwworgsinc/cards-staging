import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

// Public staging booking customers authenticate with the private, high-entropy
// management token. The recipient comes ONLY from the persisted appointment.
// This endpoint cannot be used to send email to a caller-supplied address.
const ORIGIN="https://liwworgsinc.github.io";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type","Vary":"Origin"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json",...cors,"Cache-Control":"no-store"}});
const clean=(v:unknown,max=200)=>String(v??"").trim().slice(0,max);
const validEmail=(v:string)=>/^\S+@\S+\.\S+$/.test(v);
const validToken=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c));
function whenLabel(raw:string,tz:string){
  const date=new Date(raw);
  if(!Number.isFinite(date.getTime()))return "See your appointment link for the latest time.";
  try{return new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZone:tz||"America/New_York",timeZoneName:"short"}).format(date);}
  catch{return date.toLocaleString("en-US");}
}
Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return respond({ok:false,reason:"method_not_allowed"},405);
  const origin=req.headers.get("origin");
  if(origin&&origin!==ORIGIN)return respond({ok:false,reason:"origin_not_allowed"},403);
  const body=await req.json().catch(()=>({}));
  const token=clean(body?.manage_token,60);
  if(!validToken(token))return respond({ok:false,reason:"invalid_booking_link"},400);
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),resend=Deno.env.get("RESEND_API_KEY");
  if(!url||!key||!resend)return respond({ok:false,reason:"email_unavailable"},503);
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:appt,error:apptError}=await admin.from("booking_appointments")
    .select("id,card_id,customer_email,customer_name,service_name,message,start_at,timezone,manage_token,status")
    .eq("manage_token",token).eq("source_environment","staging").eq("kind","booking").eq("status","confirmed").maybeSingle();
  if(apptError){console.error("staging-confirmation-lookup",apptError.message);return respond({ok:false,reason:"booking_unavailable"},503);}
  if(!appt)return respond({ok:false,reason:"booking_unavailable"},404);
  const email=clean(appt.customer_email,240).toLowerCase();
  if(!validEmail(email))return respond({ok:true,sent:false,reason:"email_not_provided"});
  const table=admin.from("booking_confirmation_delivery_staging");
  const {data:prior,error:priorError}=await table.select("status,claimed_at").eq("appointment_id",appt.id).maybeSingle();
  if(priorError)return respond({ok:false,reason:"delivery_unavailable"},503);
  if(prior?.status==="sent")return respond({ok:true,sent:true,already_sent:true});
  const claimedAt=new Date().toISOString();
  if(prior?.status==="sending"&&Date.parse(prior.claimed_at)>Date.now()-120000)return respond({ok:true,sent:false,reason:"sending"},202);
  let claim;
  if(prior){
    const result=await admin.from("booking_confirmation_delivery_staging").update({
      status:"sending",claimed_at:claimedAt,updated_at:claimedAt,last_error:null
    }).eq("appointment_id",appt.id).eq("status",prior.status).eq("claimed_at",prior.claimed_at)
      .select("appointment_id").maybeSingle();
    if(result.error)return respond({ok:false,reason:"delivery_unavailable"},503);
    claim=result.data;
  }else{
    const result=await admin.from("booking_confirmation_delivery_staging").insert({
      appointment_id:appt.id,status:"sending",claimed_at:claimedAt
    }).select("appointment_id").maybeSingle();
    if(result.error&&result.error.code!=="23505")return respond({ok:false,reason:"delivery_unavailable"},503);
    claim=result.data;
  }
  if(!claim)return respond({ok:true,sent:false,reason:"sending"},202);
  const {data:card,error:cardError}=await admin.from("digital_cards")
    .select("company_name,full_name,internal_label,email").eq("id",appt.card_id).maybeSingle();
  if(cardError)console.warn("staging-confirmation-card",cardError.message);
  const business=clean(card?.company_name||card?.full_name||card?.internal_label,160)||"LIW Cards";
  const service=clean(appt.service_name,140)||"Appointment";
  const customer=clean(appt.customer_name,120)||"there";
  const propertyMatch=String(appt.message||"").match(/^Property:\s*(.+)$/m);
  const property=clean(propertyMatch?.[1]||"",300);
  const when=whenLabel(appt.start_at,appt.timezone||"America/New_York");
  const link="https://liwworgsinc.github.io/cards-staging/appointment.html?token="+encodeURIComponent(token);
  const reply=clean(card?.email,240).toLowerCase();
  const from=Deno.env.get("RESEND_FROM_EMAIL")||"LIW Cards <notifications@cards.liwworgs.com>";
  const subject=(service==="Property Showing"?"Showing confirmed":"Appointment confirmed")+" — "+business;
  const html='<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#17213a"><div style="max-width:590px;margin:0 auto;padding:26px 16px"><div style="background:#fff;border-radius:18px;overflow:hidden;border:1px solid #e1e6ef"><div style="height:5px;background:linear-gradient(90deg,#07102e,#c5a15b)"></div><div style="padding:26px"><div style="font-size:11px;letter-spacing:.12em;font-weight:800;color:#9e772f">LIW CARDS · CONFIRMED</div><h1 style="font-size:25px;margin:9px 0 8px">'+esc(service)+'</h1><p style="color:#59677e;line-height:1.5">Hi '+esc(customer)+', your appointment with '+esc(business)+' is confirmed.</p><div style="padding:16px;background:#f7f9fc;border-radius:12px;line-height:1.6"><strong>'+esc(when)+'</strong>'+(property?'<br><span>'+esc(property)+'</span>':'')+'</div><a href="'+esc(link)+'" style="display:inline-block;margin-top:20px;padding:13px 18px;border-radius:11px;background:#07102e;color:#fff;text-decoration:none;font-weight:bold">Manage appointment</a><p style="font-size:12px;line-height:1.5;color:#677589">Save this private link to view, reschedule or cancel later while changes are allowed. Keep it private; anyone with the link can manage the appointment.</p><p style="font-size:11px;color:#97a0ad">This is a staging test booking from LIW Cards.</p></div></div></div></body></html>';
  const textBody=service+" confirmed\n"+when+"\n"+(property?property+"\n":"")+"Manage appointment: "+link+"\nKeep this private link safe.";
  try{
    const response=await fetch("https://api.resend.com/emails",{
      method:"POST",headers:{"Authorization":"Bearer "+resend,"Content-Type":"application/json","Idempotency-Key":"liw-staging-booking-"+appt.id},
      body:JSON.stringify({from,to:[email],subject,html,text:textBody,reply_to:validEmail(reply)?reply:undefined})
    });
    if(!response.ok)throw new Error("Resend HTTP "+response.status+": "+clean(await response.text().catch(()=>""),200));
    const receipt=await response.json().catch(()=>({}));
    await admin.from("booking_confirmation_delivery_staging").update({
      status:"sent",sent_at:new Date().toISOString(),provider_id:clean(receipt.id,120),updated_at:new Date().toISOString(),last_error:null
    }).eq("appointment_id",appt.id).eq("claimed_at",claimedAt);
    return respond({ok:true,sent:true});
  }catch(error){
    console.error("staging-booking-confirmation",appt.id,error);
    await admin.from("booking_confirmation_delivery_staging").update({
      status:"failed",last_error:clean(error instanceof Error?error.message:error,250),updated_at:new Date().toISOString()
    }).eq("appointment_id",appt.id).eq("claimed_at",claimedAt);
    return respond({ok:false,reason:"email_unavailable"},503);
  }
});
