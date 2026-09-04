import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAGING_ORIGIN = "https://liwworgsinc.github.io";
const LOCAL_ORIGINS = new Set([
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);
const STAGING_HEADER = "cards-staging-admin-v1";
const ADMIN_EMAILS = new Set(["liwworgsinc@gmail.com", "globalcorent@gmail.com"]);
const ALLOWED_PLANS = new Set(["starter", "lite", "plus", "pro", "agency"]);

type SubscriptionRow = {
  user_id: string;
  plan_key: string;
  status: string;
  billing_interval: string;
  stripe_subscription_id?: string | null;
  billing_plan_key?: string | null;
  billing_status?: string | null;
  admin_override_plan_key?: string | null;
  admin_override_reason?: string | null;
  admin_override_by?: string | null;
  admin_override_at?: string | null;
};

function origin(req: Request) {
  return req.headers.get("origin") || "";
}
function allowedOrigin(req: Request) {
  const value = origin(req);
  return value === STAGING_ORIGIN || LOCAL_ORIGINS.has(value);
}
function allowedSurface(req: Request) {
  return req.headers.get("x-liw-staging-admin") === STAGING_HEADER;
}
function corsHeaders(req: Request) {
  const value = origin(req);
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req) ? value : STAGING_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-liw-staging-admin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" }
  });
}
function planState(row: SubscriptionRow | null) {
  const effectivePlan = row?.plan_key || "starter";
  const effectiveStatus = row?.status || "active";
  const overridePlan = row?.admin_override_plan_key || null;
  const hasStripeSubscription = Boolean(row?.stripe_subscription_id);
  return {
    userId: row?.user_id || null,
    planKey: effectivePlan,
    planStatus: effectiveStatus,
    planSource: overridePlan ? "admin_override" : hasStripeSubscription ? "stripe" : "free",
    overridePlanKey: overridePlan,
    overrideReason: row?.admin_override_reason || "",
    overrideBy: row?.admin_override_by || null,
    overrideAt: row?.admin_override_at || null,
    billingPlanKey: row?.billing_plan_key || null,
    billingStatus: row?.billing_status || null,
    hasStripeSubscription
  };
}

async function callerAndAdmin(req: Request) {
  if (!allowedOrigin(req) || !allowedSurface(req)) {
    throw new Error("This plan control is only available from LIW Cards staging");
  }
  const auth = req.headers.get("Authorization") || "";
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new Error("Unauthorized");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  const email = String(user.email || "").toLowerCase();
  if (profile?.role !== "admin" && !ADMIN_EMAILS.has(email)) {
    throw new Error("Admin access is required");
  }
  return { caller: user, admin };
}

async function ensureCustomer(admin: ReturnType<typeof createClient>, userId: string, callerId: string) {
  if (!userId) throw new Error("Customer ID is required");
  if (userId === callerId) throw new Error("You cannot change your own LIW Admin plan");
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) throw new Error(error?.message || "Customer account was not found");
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw profileError;
  const targetEmail = String(data.user.email || "").toLowerCase();
  if (profile?.role === "admin" || ADMIN_EMAILS.has(targetEmail)) {
    throw new Error("LIW Admin accounts cannot be changed here");
  }
  return data.user;
}

async function getSubscription(admin: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id,plan_key,status,billing_interval,stripe_subscription_id,billing_plan_key,billing_status,admin_override_plan_key,admin_override_reason,admin_override_by,admin_override_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data || null) as SubscriptionRow | null;
}

async function reconcile(admin: ReturnType<typeof createClient>, userId: string) {
  const { error } = await admin.rpc("reconcile_user_feature_configuration", { p_user_id: userId });
  if (error) throw error;
}

async function writeHistory(
  admin: ReturnType<typeof createClient>,
  userId: string,
  previousPlan: string,
  newPlan: string,
  action: "override" | "restore",
  reason: string,
  changedBy: string
) {
  const { error } = await admin.from("admin_plan_change_history").insert({
    user_id: userId,
    previous_plan_key: previousPlan,
    new_plan_key: newPlan,
    action,
    reason: reason || null,
    changed_by: changedBy
  });
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const { caller, admin } = await callerAndAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").toLowerCase();

    if (action === "list") {
      const { data, error } = await admin
        .from("subscriptions")
        .select("user_id,plan_key,status,billing_interval,stripe_subscription_id,billing_plan_key,billing_status,admin_override_plan_key,admin_override_reason,admin_override_by,admin_override_at");
      if (error) throw error;
      return json(req, { ok: true, plans: (data || []).map(row => planState(row as SubscriptionRow)) });
    }

    const userId = String(body.userId || "").trim();
    await ensureCustomer(admin, userId, caller.id);
    const callerEmail = String(caller.email || caller.id);

    if (action === "history") {
      const { data, error } = await admin
        .from("admin_plan_change_history")
        .select("id,previous_plan_key,new_plan_key,action,reason,changed_by,changed_at")
        .eq("user_id", userId)
        .order("changed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return json(req, { ok: true, history: data || [] });
    }

    const current = await getSubscription(admin, userId);

    if (action === "set_plan") {
      const planKey = String(body.planKey || "").toLowerCase();
      if (!ALLOWED_PLANS.has(planKey)) throw new Error("Choose Free, Lite, Plus, Pro, or Agency");
      const reason = String(body.reason || "").trim().slice(0, 500);
      const now = new Date().toISOString();
      const previousPlan = current?.plan_key || "starter";
      const billingPlanKey = current?.admin_override_plan_key
        ? current.billing_plan_key || null
        : current?.stripe_subscription_id
          ? current.plan_key
          : current?.billing_plan_key || null;
      const billingStatus = current?.admin_override_plan_key
        ? current.billing_status || null
        : current?.stripe_subscription_id
          ? current.status
          : current?.billing_status || null;

      const payload = {
        user_id: userId,
        plan_key: planKey,
        status: "active",
        billing_interval: current?.billing_interval || "month",
        billing_plan_key: billingPlanKey,
        billing_status: billingStatus,
        admin_override_plan_key: planKey,
        admin_override_reason: reason || null,
        admin_override_by: callerEmail,
        admin_override_at: now,
        updated_at: now
      };
      const { error } = await admin.from("subscriptions").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      await writeHistory(admin, userId, previousPlan, planKey, "override", reason, callerEmail);
      await reconcile(admin, userId);
      const updated = await getSubscription(admin, userId);
      return json(req, {
        ok: true,
        plan: planState(updated),
        message: `${planKey === "starter" ? "Free" : planKey.charAt(0).toUpperCase() + planKey.slice(1)} access applied as an admin override. Stripe billing was not changed.`
      });
    }

    if (action === "clear_override") {
      if (!current?.admin_override_plan_key) {
        return json(req, { ok: true, plan: planState(current), message: "This customer is already using their billing-managed plan." });
      }
      const reason = String(body.reason || "").trim().slice(0, 500);
      const restoredPlan = current.billing_plan_key || "starter";
      const restoredStatus = current.billing_status || "active";
      const previousPlan = current.plan_key;
      const now = new Date().toISOString();
      const { error } = await admin
        .from("subscriptions")
        .update({
          plan_key: restoredPlan,
          status: restoredStatus,
          admin_override_plan_key: null,
          admin_override_reason: null,
          admin_override_by: null,
          admin_override_at: null,
          updated_at: now
        })
        .eq("user_id", userId);
      if (error) throw error;
      await writeHistory(admin, userId, previousPlan, restoredPlan, "restore", reason, callerEmail);
      await reconcile(admin, userId);
      const updated = await getSubscription(admin, userId);
      return json(req, {
        ok: true,
        plan: planState(updated),
        message: current.stripe_subscription_id
          ? "Admin override removed. The customer is back on their Stripe-managed plan."
          : "Admin override removed. The customer is back on Free access."
      });
    }

    throw new Error("Unknown plan action");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to manage customer plan";
    const status = /Unauthorized|Admin access/.test(message) ? 401 : /only available/.test(message) ? 403 : 400;
    return json(req, { error: message }, status);
  }
});
