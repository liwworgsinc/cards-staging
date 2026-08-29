import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://cards.liwworgs.com",
  "https://liwworgsinc.github.io",
  "https://globalcorent.github.io",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

const allowedCardFields = new Set([
  "template_id", "slug", "status", "full_name", "job_title", "company_name", "biography", "phone", "sms_phone", "email", "website", "business_address", "headline",
  "profile_image_url", "primary_color", "secondary_color", "background_color", "text_color", "button_color", "button_text_color", "font_family", "button_style",
  "profile_image_shape", "profile_border_color", "border_radius", "card_layout", "card_experience", "gradient_background", "color_mode", "show_branding", "qr_foreground_color", "qr_background_color", "qr_logo_url",
  "booking_url", "payment_url", "services_enabled", "products_enabled", "booking_enabled", "lead_form_enabled", "seo_title", "cover_image_url", "cover_position", "cover_overlay",
  "branding_mode", "custom_branding_text", "custom_branding_url", "seo_description", "internal_label", "client_name", "campaign_tag", "video_title", "video_url", "video_enabled",
  "payment_sharing_enabled", "cash_app_cashtag", "cash_app_label", "venmo_username", "venmo_label", "paypal_url", "paypal_label", "zelle_contact", "zelle_label",
  "payment_qr_url", "profile_position_x", "profile_position_y", "profile_zoom", "social_button_style", "social_button_size"
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.has(origin) ? origin : "https://cards.liwworgs.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown, max = 2000): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}

function finiteCents(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function normalizeSlug(value: unknown): string | null {
  const text = cleanText(value, 120);
  if (!text) return null;
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return normalized || null;
}

function readableError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    for (const key of ["message", "details", "hint", "error_description"]) {
      const value = candidate[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "Unable to save card";
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : "";
}

async function slugConflict(admin: ReturnType<typeof createClient>, slug: string, requestedId: string | null): Promise<boolean> {
  let query = admin.from("digital_cards").select("id").eq("slug", slug).limit(1);
  if (requestedId) query = query.neq("id", requestedId);
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function makeUniqueSlug(admin: ReturnType<typeof createClient>, requested: string, requestedId: string | null = null): Promise<string> {
  const base = normalizeSlug(requested) || "card";
  if (!(await slugConflict(admin, base, requestedId))) return base;
  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const ending = `-${suffix}`;
    const candidate = `${base.slice(0, Math.max(1, 60 - ending.length))}${ending}`;
    if (!(await slugConflict(admin, candidate, requestedId))) return candidate;
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const ending = `-${crypto.randomUUID().replaceAll("-", "").slice(0, 6)}`;
    const candidate = `${base.slice(0, Math.max(1, 60 - ending.length))}${ending}`;
    if (!(await slugConflict(admin, candidate, requestedId))) return candidate;
  }
  throw new Error("A unique card address could not be generated. Try a different address.");
}

async function recoverRecentDraft(admin: ReturnType<typeof createClient>, userId: string, fullName: string) {
  const threshold = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  const { data, error } = await admin.from("digital_cards")
    .select("id,user_id,slug,status,full_name,created_at")
    .eq("user_id", userId)
    .eq("status", "draft")
    .eq("full_name", fullName)
    .gte("created_at", threshold)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  const startedAt = Date.now();

  try {
    const origin = req.headers.get("origin") || "";
    if (origin && !allowedOrigins.has(origin)) throw new Error("Origin is not allowed");

    const auth = req.headers.get("Authorization") || "";
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    let requestedId = cleanText(body.cardId, 80);
    const incoming = body.card && typeof body.card === "object" ? body.card : {};

    let ownerId = user.id;
    let existingCard: { id: string; user_id: string; slug: string | null } | null = null;

    if (requestedId) {
      const { data: existing, error } = await admin.from("digital_cards").select("id,user_id,slug").eq("id", requestedId).maybeSingle();
      if (error) throw error;
      if (!existing) throw new Error("Card not found");
      existingCard = existing;
      ownerId = existing.user_id;

      if (ownerId !== user.id) {
        const { data: profile, error: profileError } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profileError) throw profileError;
        const isAdmin = profile?.role === "admin" || ["liwworgsinc@gmail.com", "globalcorent@gmail.com"].includes(String(user.email || "").toLowerCase());
        if (!isAdmin) {
          const { data: membership, error: membershipError } = await admin.from("workspace_members").select("role,status").eq("owner_user_id", ownerId).eq("member_user_id", user.id).eq("status", "active").maybeSingle();
          if (membershipError) throw membershipError;
          if (membership?.role !== "editor") throw new Error("This shared card is view-only. Ask the workspace owner to grant Editor access.");
        }
      }
    }

    const cardPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(incoming)) if (allowedCardFields.has(key)) cardPayload[key] = value;
    cardPayload.updated_at = new Date().toISOString();
    if (!cleanText(cardPayload.full_name, 500)) cardPayload.full_name = "Untitled Card";

    let slugAdjusted = false;
    let requestedSlug = normalizeSlug(cardPayload.slug);
    let slugAction: "kept_existing" | "generated_unique" | "recovered_recent_draft" | null = null;
    if (!requestedSlug) {
      requestedSlug = normalizeSlug(cardPayload.full_name) || "card";
      cardPayload.slug = await makeUniqueSlug(admin, requestedSlug, requestedId);
      slugAdjusted = true;
      slugAction = "generated_unique";
    } else {
      cardPayload.slug = requestedSlug;
    }

    let cardResult = requestedId
      ? await admin.from("digital_cards").update(cardPayload).eq("id", requestedId).select("*").single()
      : await admin.from("digital_cards").insert({ ...cardPayload, user_id: ownerId }).select("*").single();

    // If the first guest save created the Free-plan card but the browser lost that
    // response, its retry arrives with cardId=null and the plan trigger rejects a
    // duplicate. Reattach only to a same-name draft created very recently by this user.
    if (!requestedId && cardResult.error && /Card limit reached for current plan/i.test(readableError(cardResult.error))) {
      const recovered = await recoverRecentDraft(admin, user.id, String(cardPayload.full_name || "Untitled Card"));
      if (recovered?.id && recovered?.slug) {
        requestedId = recovered.id;
        existingCard = { id: recovered.id, user_id: user.id, slug: recovered.slug };
        ownerId = user.id;
        cardPayload.slug = recovered.slug;
        slugAdjusted = true;
        slugAction = "recovered_recent_draft";
        cardResult = await admin.from("digital_cards").update(cardPayload).eq("id", recovered.id).select("*").single();
      }
    }

    if (cardResult.error && errorCode(cardResult.error) === "23505") {
      const message = readableError(cardResult.error);
      if (/slug|digital_cards_slug_key/i.test(message)) {
        slugAdjusted = true;
        if (requestedId && existingCard?.slug) {
          cardPayload.slug = existingCard.slug;
          slugAction = "kept_existing";
        } else {
          cardPayload.slug = await makeUniqueSlug(admin, String(cardPayload.slug || requestedSlug || "card"), requestedId);
          slugAction = "generated_unique";
        }
        cardResult = requestedId
          ? await admin.from("digital_cards").update(cardPayload).eq("id", requestedId).select("*").single()
          : await admin.from("digital_cards").insert({ ...cardPayload, user_id: ownerId }).select("*").single();
      }
    }

    if (cardResult.error) throw cardResult.error;
    const card = cardResult.data;
    if (!card?.id) throw new Error("The server did not confirm the card save");

    const hasSocials = Object.prototype.hasOwnProperty.call(body, "socials");
    const hasServices = Object.prototype.hasOwnProperty.call(body, "services");
    const hasProducts = Object.prototype.hasOwnProperty.call(body, "products");
    const socials = hasSocials && Array.isArray(body.socials) ? body.socials.slice(0, 12) : [];
    const services = hasServices && Array.isArray(body.services) ? body.services.slice(0, 30) : [];
    const products = hasProducts && Array.isArray(body.products) ? body.products.slice(0, 30) : [];

    const socialRows = socials.map((row: any, index: number) => ({ card_id: card.id, platform: cleanText(row?.platform, 50) || "website", label: cleanText(row?.label, 100), url: cleanText(row?.url, 2000), is_enabled: row?.is_enabled !== false, sort_order: index })).filter((row: any) => row.url);
    const serviceRows = services.map((row: any, index: number) => ({ card_id: card.id, name: cleanText(row?.name, 200), description: cleanText(row?.description, 3000), price_cents: finiteCents(row?.price_cents), currency: "usd", image_url: cleanText(row?.image_url, 2000), booking_url: cleanText(row?.booking_url, 2000), payment_url: cleanText(row?.payment_url, 2000), cta_label: cleanText(row?.cta_label, 80) || "Learn more", is_enabled: row?.is_enabled !== false, sort_order: index })).filter((row: any) => row.name);
    const productRows = products.map((row: any, index: number) => ({ card_id: card.id, name: cleanText(row?.name, 200), description: cleanText(row?.description, 3000), price_cents: finiteCents(row?.price_cents), currency: "usd", image_urls: Array.isArray(row?.image_urls) ? row.image_urls.map((url: unknown) => cleanText(url, 2000)).filter(Boolean).slice(0, 8) : [], purchase_url: cleanText(row?.purchase_url, 2000), is_enabled: row?.is_enabled !== false, sort_order: index })).filter((row: any) => row.name);

    const deleteTasks: PromiseLike<any>[] = [];
    if (hasSocials) deleteTasks.push(admin.from("social_links").delete().eq("card_id", card.id));
    if (hasServices) deleteTasks.push(admin.from("card_services").delete().eq("card_id", card.id));
    if (hasProducts) deleteTasks.push(admin.from("card_products").delete().eq("card_id", card.id));
    const deleteResults = await Promise.all(deleteTasks);
    for (const result of deleteResults) if (result.error) throw result.error;

    const insertTasks: PromiseLike<any>[] = [];
    if (hasSocials && socialRows.length) insertTasks.push(admin.from("social_links").insert(socialRows));
    if (hasServices && serviceRows.length) insertTasks.push(admin.from("card_services").insert(serviceRows));
    if (hasProducts && productRows.length) insertTasks.push(admin.from("card_products").insert(productRows));
    const insertResults = await Promise.all(insertTasks);
    for (const result of insertResults) if (result.error) throw result.error;

    return json(req, { ok: true, card, savedAt: card.updated_at || new Date().toISOString(), slugAdjusted, slugAction, requestedSlug, recoveredCardId: slugAction === "recovered_recent_draft" ? card.id : null, elapsedMs: Date.now() - startedAt });
  } catch (error) {
    const message = readableError(error);
    const code = errorCode(error);
    console.error("save-card-state failed", { message, code, elapsedMs: Date.now() - startedAt });
    const status = /Unauthorized/.test(message) ? 401 : /view-only|grant Editor|not found/i.test(message) ? 403 : code === "23505" ? 409 : 400;
    const publicMessage = /Card limit reached for current plan/i.test(message)
      ? "Your current plan has reached its card limit. Open an existing card or upgrade to add another."
      : code === "23505" && /slug|digital_cards_slug_key/i.test(message)
        ? "That public card address is already in use. Choose a different address."
        : message;
    return json(req, { error: publicMessage, code: code || null }, status);
  }
});