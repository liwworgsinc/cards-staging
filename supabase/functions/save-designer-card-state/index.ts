import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const cardKeys = new Set([
  "template_id","full_name","job_title","company_name","biography","phone","sms_phone","email","website","business_address","headline",
  "primary_color","secondary_color","background_color","text_color","button_color","button_text_color","font_family","button_style","profile_image_shape","profile_border_color",
  "profile_position_x","profile_position_y","profile_zoom","border_radius","card_layout","card_experience","gradient_background","color_mode","cover_image_url","cover_position","cover_overlay",
  "branding_mode","show_branding","custom_branding_text","custom_branding_url","seo_title","seo_description","internal_label","client_name","campaign_tag","slug","profile_image_url",
  "booking_url","payment_url","services_enabled","products_enabled","booking_enabled","lead_form_enabled","payment_sharing_enabled","cash_app_cashtag","cash_app_label","venmo_username","venmo_label",
  "paypal_url","paypal_label","social_button_style","social_button_size","zelle_contact","zelle_label","payment_qr_url","qr_foreground_color","qr_background_color","qr_logo_url"
]);

function cleanObject(input: unknown, allowed: Set<string>) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

function safeArray(input: unknown) {
  return Array.isArray(input) ? input.slice(0, 100) : [];
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !anon) return json(500, { error: "Supabase environment is not configured" });

    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json(401, { error: "Sign in required" });

    const db = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await db.auth.getUser(auth.slice(7));
    if (authError || !authData.user) return json(401, { error: "Your LIW login is no longer valid" });

    const body = await req.json().catch(() => null);
    const cardId = String(body?.cardId || "").trim();
    if (!cardId) return json(400, { error: "Card ID is required" });

    const { data: access, error: accessError } = await db.rpc("designer_card_access_context", { p_card_id: cardId });
    if (accessError || !access?.order_id) return json(403, { error: accessError?.message || "This card is not assigned to your designer account" });

    const card = cleanObject(body?.card, cardKeys);
    delete (card as Record<string, unknown>).status;
    delete (card as Record<string, unknown>).user_id;
    delete (card as Record<string, unknown>).created_by;

    const socials = safeArray(body?.socials).map((row: any, index) => ({
      card_id: cardId,
      platform: String(row?.platform || "website").slice(0, 80),
      label: row?.label == null ? null : String(row.label).slice(0, 120),
      url: String(row?.url || "").trim().slice(0, 1200),
      is_enabled: row?.is_enabled !== false,
      sort_order: index,
    })).filter((row: any) => row.url);

    const services = safeArray(body?.services).map((row: any, index) => ({
      card_id: cardId,
      name: String(row?.name || "").trim().slice(0, 180),
      description: row?.description == null ? null : String(row.description).slice(0, 1600),
      price_cents: Number.isFinite(Number(row?.price_cents)) ? Number(row.price_cents) : null,
      currency: "usd",
      image_url: row?.image_url ? String(row.image_url).slice(0, 1200) : null,
      booking_url: row?.booking_url ? String(row.booking_url).slice(0, 1200) : null,
      payment_url: row?.payment_url ? String(row.payment_url).slice(0, 1200) : null,
      cta_label: row?.cta_label ? String(row.cta_label).slice(0, 100) : "Learn more",
      is_enabled: row?.is_enabled !== false,
      sort_order: index,
    })).filter((row: any) => row.name);

    const products = safeArray(body?.products).map((row: any, index) => ({
      card_id: cardId,
      name: String(row?.name || "").trim().slice(0, 180),
      description: row?.description == null ? null : String(row.description).slice(0, 1600),
      price_cents: Number.isFinite(Number(row?.price_cents)) ? Number(row.price_cents) : null,
      currency: "usd",
      image_urls: Array.isArray(row?.image_urls) ? row.image_urls.filter(Boolean).slice(0, 8) : [],
      purchase_url: row?.purchase_url ? String(row.purchase_url).slice(0, 1200) : null,
      is_enabled: row?.is_enabled !== false,
      sort_order: index,
    })).filter((row: any) => row.name);

    const { data: savedCard, error: cardError } = await db.from("digital_cards").update(card).eq("id", cardId).select("*").single();
    if (cardError) return json(400, { error: cardError.message });

    for (const [table, rows] of [["social_links", socials], ["card_services", services], ["card_products", products]] as const) {
      const { error: deleteError } = await db.from(table).delete().eq("card_id", cardId);
      if (deleteError) return json(400, { error: `Could not update ${table}: ${deleteError.message}` });
      if (rows.length) {
        const { error: insertError } = await db.from(table).insert(rows as any[]);
        if (insertError) return json(400, { error: `Could not update ${table}: ${insertError.message}` });
      }
    }

    return json(200, { card: savedCard, assignedDesigner: true });
  } catch (error) {
    console.error("save-designer-card-state", error);
    return json(500, { error: error instanceof Error ? error.message : "Could not save assigned designer card" });
  }
});
