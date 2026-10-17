import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SALES_CARD_SLUG = "card-o0n4";

const allowedOrigins = new Set([
  "https://sales.liwworgs.com",
  "https://www.sales.liwworgs.com",
  "https://liwworgsinc.github.io",
  "http://localhost",
  "http://127.0.0.1",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowOrigin = allowedOrigins.has(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")
    ? origin
    : "https://sales.liwworgs.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, { ok: false, error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin") || "";
  const originAllowed = !origin || allowedOrigins.has(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  if (!originAllowed) return json(req, { ok: false, error: "Origin not allowed" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { ok: false, error: "Invalid request" }, 400);
  }

  if (clean(body.website, 200)) return json(req, { ok: true });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 64);
  const company = clean(body.company, 160);
  const businessType = clean(body.businessType, 120);
  const customerNotes = clean(body.notes, 1200);
  const marketing = body.marketing === true;

  if (name.length < 2) return json(req, { ok: false, error: "Please enter your name." }, 400);
  if (!email && !phone) return json(req, { ok: false, error: "Please enter a phone number or email." }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(req, { ok: false, error: "Please enter a valid email." }, 400);
  if (!SUPABASE_URL || !SERVICE_KEY) return json(req, { ok: false, error: "Lead service is not configured." }, 500);

  const authHeaders = {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  const cardUrl = `${SUPABASE_URL}/rest/v1/digital_cards?select=id,user_id,slug&slug=eq.${encodeURIComponent(SALES_CARD_SLUG)}&status=eq.published&lead_form_enabled=eq.true&limit=1`;
  const cardRes = await fetch(cardUrl, { headers: authHeaders });
  if (!cardRes.ok) {
    console.error("sales lead card lookup failed", cardRes.status, await cardRes.text());
    return json(req, { ok: false, error: "Lead service is unavailable." }, 503);
  }

  const cards = await cardRes.json();
  const card = Array.isArray(cards) ? cards[0] : null;
  if (!card?.id || !card?.user_id) return json(req, { ok: false, error: "Lead service is unavailable." }, 503);

  const messageParts: string[] = [];
  if (company) messageParts.push(`Business: ${company}`);
  if (customerNotes) messageParts.push(customerNotes);
  const message = messageParts.join("\n\n") || "Interested in an LIW Card.";

  const internalNotes = [
    "Captured from LIW Sales Mode Get Lead QR.",
    `Marketing opt-in: ${marketing ? "yes" : "no"}.`,
  ].join(" ");

  const payload = {
    owner_user_id: card.user_id,
    card_id: card.id,
    name,
    email: email || null,
    phone: phone || null,
    message,
    service_interest: businessType || null,
    source: "sales_qr",
    notes: internalNotes,
    status: "new",
    consent_given: true,
  };

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: "POST",
    headers: { ...authHeaders, "Prefer": "return=representation" },
    body: JSON.stringify(payload),
  });

  if (!insertRes.ok) {
    console.error("sales lead insert failed", insertRes.status, await insertRes.text());
    return json(req, { ok: false, error: "We couldn't save your info. Please try again." }, 500);
  }

  const saved = await insertRes.json();
  const lead = Array.isArray(saved) ? saved[0] : null;
  if (lead?.id && email) {
    const preferencePayload = {
      lead_id: lead.id,
      email,
      marketing_opt_in: marketing,
      consent_source: "sales_qr",
      consented_at: marketing ? new Date().toISOString() : null,
      unsubscribed_at: null,
      updated_at: new Date().toISOString(),
    };
    const prefRes = await fetch(`${SUPABASE_URL}/rest/v1/staging_sales_lead_preferences?on_conflict=lead_id`, {
      method: "POST",
      headers: { ...authHeaders, "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(preferencePayload),
    });
    if (!prefRes.ok) console.error("sales lead preference save failed", prefRes.status, await prefRes.text());
  }
  return json(req, { ok: true, leadId: lead?.id ?? null, nurtureEligible: Boolean(lead?.id && email && marketing) });
});
