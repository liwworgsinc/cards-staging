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
const STAGING_HEADER = "cards-staging-promo-public-v1";
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const VISITOR_RE = /^[A-Za-z0-9._:-]{8,96}$/;
const EVENT_TYPES = new Set(["visit", "applied"]);

function requestOrigin(req: Request) {
  return req.headers.get("origin") || "";
}

function allowedOrigin(req: Request) {
  const value = requestOrigin(req);
  return value === STAGING_ORIGIN || LOCAL_ORIGINS.has(value);
}

function corsHeaders(req: Request) {
  const value = requestOrigin(req);
  return {
    "Access-Control-Allow-Origin": allowedOrigin(req) ? value : STAGING_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-liw-staging-promo",
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

function cleanText(value: unknown, max = 120) {
  return String(value || "").trim().slice(0, max) || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    if (!allowedOrigin(req) || req.headers.get("x-liw-staging-promo") !== STAGING_HEADER) {
      throw new Error("This promo endpoint is only available from LIW Cards staging");
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim().toUpperCase();
    if (!CODE_RE.test(code)) throw new Error("Enter a valid promo code");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: promo, error: promoError } = await admin
      .from("staging_promo_codes")
      .select("id,code,description,discount_type,discount_value,currency,active,starts_at,expires_at,max_redemptions,applicable_plans")
      .ilike("code", code)
      .maybeSingle();

    if (promoError) throw promoError;
    if (!promo) throw new Error("Promo code was not found");
    if (!promo.active) throw new Error("Promo code is inactive");

    const now = Date.now();
    if (promo.starts_at && new Date(promo.starts_at).getTime() > now) throw new Error("Promo code is not active yet");
    if (promo.expires_at && new Date(promo.expires_at).getTime() <= now) throw new Error("Promo code has expired");

    const staleBefore = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    await admin
      .from("staging_promo_redemptions")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("status", "reserved")
      .lt("created_at", staleBefore);

    const { count: usageCount, error: usageError } = await admin
      .from("staging_promo_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_id", promo.id)
      .in("status", ["reserved", "completed"]);
    if (usageError) throw usageError;

    if (promo.max_redemptions && Number(usageCount || 0) >= Number(promo.max_redemptions)) {
      throw new Error("Promo code usage limit has been reached");
    }

    const visitorId = String(body.visitorId || "").trim();
    const requestedEvents = Array.isArray(body.events) ? body.events : [];
    if (requestedEvents.length && VISITOR_RE.test(visitorId)) {
      const events = [...new Set(requestedEvents.map((value: unknown) => String(value).toLowerCase()).filter((value: string) => EVENT_TYPES.has(value)))];
      const campaign = body.campaign && typeof body.campaign === "object" ? body.campaign : {};
      for (const eventType of events) {
        const { error } = await admin.from("staging_promo_events").insert({
          promo_id: promo.id,
          event_type: eventType,
          visitor_id: visitorId,
          utm_source: cleanText(campaign.utmSource),
          utm_medium: cleanText(campaign.utmMedium),
          utm_campaign: cleanText(campaign.utmCampaign),
          landing_path: cleanText(campaign.landingPath, 300)
        });
        if (error && error.code !== "23505") throw error;
      }
    }

    const remaining = promo.max_redemptions
      ? Math.max(0, Number(promo.max_redemptions) - Number(usageCount || 0))
      : null;

    return json(req, {
      ok: true,
      promo: {
        code: promo.code,
        description: promo.description,
        discountType: promo.discount_type,
        discountValue: Number(promo.discount_value),
        currency: promo.currency,
        startsAt: promo.starts_at,
        expiresAt: promo.expires_at,
        maxRedemptions: promo.max_redemptions,
        remaining,
        applicablePlans: Array.isArray(promo.applicable_plans) ? promo.applicable_plans : []
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to validate promo code";
    const status = /only available/.test(message) ? 403 : 400;
    return json(req, { error: message }, status);
  }
});
