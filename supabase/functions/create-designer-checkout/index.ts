import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const allowedOrigins = new Set([
  "https://cards.liwworgs.com",
  "https://liwworgsinc.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);
const paidStatuses = new Set(["active", "trialing", "past_due"]);
const planKeys = new Set(["starter", "lite", "plus", "pro"]);
const domainModes = new Set(["liw", "buy", "own"]);
const designOfferMap: Record<string,string> = {
  setup: "done_for_you",
  premium: "premium_design",
  team: "designer_team",
  done_for_you: "done_for_you",
  premium_design: "premium_design",
  designer_team: "designer_team",
};

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://cards.liwworgs.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(req: Request, body: unknown, status=200) {
  return new Response(JSON.stringify(body), { status, headers:{...cors(req), "Content-Type":"application/json", "Cache-Control":"no-store"} });
}
function clean(value: unknown, max=240) { return String(value ?? "").trim().slice(0,max); }
function normalizeDomain(value: unknown) {
  return clean(value,253).toLowerCase().replace(/^https?:\/\//,"").replace(/^www\./,"").split(/[/?#]/)[0].replace(/\.$/,"");
}
function validDomain(domain:string) {
  return Boolean(domain && domain.length<=253 && domain.includes(".") && domain.split(".").every(label => label.length>=1 && label.length<=63 && /^[a-z0-9-]+$/.test(label) && !label.startsWith("-") && !label.endsWith("-")));
}
function validateReturnUrl(raw:string) {
  const value = clean(raw,1000);
  const url = new URL(value);
  if (!allowedOrigins.has(url.origin)) throw new Error("Return URL is not allowed");
  if (url.origin === "https://liwworgsinc.github.io" && !url.pathname.startsWith("/cards-staging/")) throw new Error("Return URL path is not allowed");
  return value;
}
function uuid(value:unknown) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||"")); }
function boolPaid(status:unknown) { return paidStatuses.has(String(status||"")); }

Deno.serve(async (req:Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors(req) });
  if (req.method !== "POST") return json(req,{error:"Method not allowed"},405);
  try {
    const origin = req.headers.get("origin") || "";
    if (origin && !allowedOrigins.has(origin)) return json(req,{error:"Origin not allowed"},403);

    const url = Deno.env.get("SUPABASE_URL") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    if (!url || !anon || !service || !stripeKey) throw new Error("Designer checkout is not configured");

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json(req,{error:"Your session expired. Sign in again."},401);
    const client = createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError} = await client.auth.getUser();
    if (authError || !user) return json(req,{error:"Your session expired. Sign in again."},401);
    const admin = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});

    const body = await req.json().catch(()=>({}));
    const checkoutId = clean(body?.checkoutId,64);
    if (!uuid(checkoutId)) throw new Error("Invalid checkout request. Refresh and try again.");
    const offerKey = designOfferMap[clean(body?.designKey,80)];
    if (!offerKey) throw new Error("Choose a valid designer service.");
    const planKey = clean(body?.planKey,40).toLowerCase();
    if (!planKeys.has(planKey)) throw new Error("Choose a valid LIW Cards plan.");
    const successUrl = validateReturnUrl(body?.successUrl);
    const cancelUrl = validateReturnUrl(body?.cancelUrl);

    const domainMode = clean(body?.domain?.mode || "liw",20).toLowerCase();
    if (!domainModes.has(domainMode)) throw new Error("Choose a valid web address option.");
    const domainName = domainMode === "liw" ? "" : normalizeDomain(body?.domain?.name);
    if (domainMode !== "liw" && !validDomain(domainName)) throw new Error("Choose or enter a valid domain before checkout.");
    const domainYears = Math.max(1,Math.min(10,Number(body?.domain?.years || 1)));
    const domainQuoteCents = domainMode === "buy" ? Math.max(0,Math.min(5000000,Number(body?.domain?.quotedPriceCents || 0))) : 0;

    const [{data:profile,error:profileError},{data:offer,error:offerError},{data:existing,error:existingError},{data:plan,error:planError}] = await Promise.all([
      admin.from("profiles").select("role").eq("id",user.id).maybeSingle(),
      admin.from("one_time_offers").select("offer_key,name,price_cents,is_active").eq("offer_key",offerKey).maybeSingle(),
      admin.from("subscriptions").select("plan_key,status,billing_interval,stripe_customer_id,stripe_subscription_id").eq("user_id",user.id).maybeSingle(),
      admin.from("plan_definitions").select("plan_key,name,yearly_price_cents,stripe_yearly_price_id,is_active").eq("plan_key",planKey).maybeSingle(),
    ]);
    if (profileError) throw profileError;
    if (offerError) throw offerError;
    if (existingError) throw existingError;
    if (planError) throw planError;
    const email = clean(user.email,240).toLowerCase();
    if (profile?.role === "admin" || ["liwworgsinc@gmail.com","globalcorent@gmail.com"].includes(email)) throw new Error("LIW Admin accounts use the Designer Orders QA button instead of live checkout.");
    if (!offer?.is_active || Number(offer.price_cents||0) <= 0) throw new Error("That designer service is not currently available.");
    if (!plan?.is_active) throw new Error("That LIW Cards plan is not currently available.");

    const activePaid = Boolean(existing?.stripe_subscription_id && boolPaid(existing?.status));
    if (existing?.status === "past_due") throw new Error("Resolve your current subscription payment before placing a designer order.");
    if (activePaid && existing?.plan_key !== planKey) throw new Error(`You already have the ${clean(existing?.plan_key,40)} plan. Keep your current plan selected here, or change plans first in Plans & Billing.`);

    const needsSubscription = !activePaid && planKey !== "starter";
    const planPriceCents = needsSubscription ? Number(plan.yearly_price_cents||0) : 0;
    const planStripePrice = needsSubscription ? clean(plan.stripe_yearly_price_id,120) : "";
    if (needsSubscription && (!planStripePrice || planPriceCents <= 0)) throw new Error("The selected LIW plan is not ready for designer checkout.");

    const designPriceCents = Number(offer.price_cents||0);
    const metadata:Record<string,string> = {
      liw_flow:"designer_checkout",
      user_id:user.id,
      checkout_id:checkoutId,
      offer_key:offerKey,
      design_key:clean(body?.designKey,80),
      design_price_cents:String(designPriceCents),
      plan_key:planKey,
      plan_name:clean(plan.name || planKey,100),
      plan_price_cents:String(planPriceCents),
      plan_interval:planKey === "starter" ? "none" : "year",
      domain_mode:domainMode,
      domain_name:domainName,
      domain_years:String(domainYears),
      domain_price_cents:"0",
      domain_quote_cents:String(Math.round(domainQuoteCents)),
      domain_deferred:domainMode === "buy" ? "true" : "false",
    };

    const params = new URLSearchParams();
    params.set("mode", needsSubscription ? "subscription" : "payment");
    params.set("success_url",successUrl);
    params.set("cancel_url",cancelUrl);
    params.set("client_reference_id",user.id);
    params.set("billing_address_collection","auto");
    params.set("metadata[liw_flow]",metadata.liw_flow);
    Object.entries(metadata).forEach(([key,value])=>params.set(`metadata[${key}]`,value));

    if (existing?.stripe_customer_id) params.set("customer",String(existing.stripe_customer_id));
    else if (user.email) params.set("customer_email",String(user.email));

    let index = 0;
    if (needsSubscription) {
      params.set(`line_items[${index}][price]`,planStripePrice);
      params.set(`line_items[${index}][quantity]`,"1");
      index += 1;
      params.set("payment_method_collection","always");
      params.set("subscription_data[metadata][liw_flow]","designer_checkout");
      params.set("subscription_data[metadata][user_id]",user.id);
      params.set("subscription_data[metadata][plan_key]",planKey);
    }
    params.set(`line_items[${index}][price_data][currency]`,"usd");
    params.set(`line_items[${index}][price_data][unit_amount]`,String(designPriceCents));
    params.set(`line_items[${index}][price_data][product_data][name]`,clean(offer.name || "LIW Designer Service",120));
    params.set(`line_items[${index}][price_data][product_data][description]`,"One-time LIW Cards professional design service");
    params.set(`line_items[${index}][quantity]`,"1");

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions",{
      method:"POST",
      headers:{
        "Authorization":`Bearer ${stripeKey}`,
        "Content-Type":"application/x-www-form-urlencoded",
        "Idempotency-Key":`liw-designer-${user.id}-${checkoutId}`,
      },
      body:params,
    });
    const stripe = await stripeResponse.json().catch(()=>({}));
    if (!stripeResponse.ok || !stripe?.id || !stripe?.url) throw new Error(stripe?.error?.message || "Stripe could not start designer checkout.");

    const pendingMetadata = {
      ...metadata,
      checkout_mode: needsSubscription ? "subscription" : "payment",
      checkout_total_expected_cents: designPriceCents + planPriceCents,
      domain_registration_billed_separately: domainMode === "buy",
    };
    const {error:pendingError} = await admin.from("one_time_orders").upsert({
      user_id:user.id,
      offer_key:offerKey,
      stripe_checkout_session_id:String(stripe.id),
      stripe_customer_id:stripe.customer ? String(stripe.customer) : (existing?.stripe_customer_id || null),
      customer_email:user.email || null,
      amount_total:designPriceCents + planPriceCents,
      currency:"usd",
      status:"unpaid",
      metadata:pendingMetadata,
      updated_at:new Date().toISOString(),
    },{onConflict:"stripe_checkout_session_id"});
    if (pendingError) {
      console.error("designer pending order",pendingError);
      throw new Error("The secure checkout was created, but LIW could not reserve the designer order. Please try again before paying.");
    }

    return json(req,{
      url:String(stripe.url),
      sessionId:String(stripe.id),
      mode:needsSubscription ? "subscription" : "payment",
      designPriceCents,
      planPriceCents,
      domainBilledSeparately:domainMode === "buy",
    });
  } catch (error) {
    console.error("create-designer-checkout",error);
    return json(req,{error:error instanceof Error ? error.message : "Unable to open designer checkout"},400);
  }
});