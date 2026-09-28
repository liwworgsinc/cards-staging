import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

function response(body: string, status = 200, contentType = "application/manifest+json; charset=utf-8", extra: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": contentType,
      "Cache-Control": status === 200 ? "public, max-age=30, stale-while-revalidate=60" : "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

function cleanHex(value: unknown, fallback: string) {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
}

function shortName(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length <= 28 ? trimmed : `${trimmed.slice(0, 27).trim()}…`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return response("ok", 200, "text/plain; charset=utf-8");
  if (req.method !== "GET") return response(JSON.stringify({ error: "Method not allowed" }), 405, "application/json; charset=utf-8", { Allow: "GET, OPTIONS" });

  try {
    const requestUrl = new URL(req.url);
    const slug = String(requestUrl.searchParams.get("slug") || "").trim().toLowerCase();
    const appUrlInput = String(requestUrl.searchParams.get("app_url") || "").trim();

    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) || !appUrlInput) {
      return response(JSON.stringify({ error: "Invalid manifest request" }), 400, "application/json; charset=utf-8");
    }

    let appUrl: URL;
    try { appUrl = new URL(appUrlInput); }
    catch { return response(JSON.stringify({ error: "Invalid app URL" }), 400, "application/json; charset=utf-8"); }

    if (appUrl.protocol !== "https:") {
      return response(JSON.stringify({ error: "HTTPS is required" }), 400, "application/json; charset=utf-8");
    }

    const staging = appUrl.hostname === "liwworgsinc.github.io" && appUrl.pathname.startsWith("/cards-staging/");
    // Staging-only function: never return a changed manifest for production.
    if (!staging) {
      return response(JSON.stringify({ error: "Unapproved app origin" }), 403, "application/json; charset=utf-8");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
    if (!supabaseUrl || !serviceKey) throw new Error("Database configuration unavailable");

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: card, error: cardError } = await client
      .from("digital_cards")
      .select("id,slug,full_name,company_name,biography,primary_color,background_color,profile_image_url,status")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (cardError) throw cardError;
    if (!card) return response(JSON.stringify({ error: "Card not found" }), 404, "application/json; charset=utf-8");

    // Use the authoritative effective plan: QR-logo entitlement is unrelated
    // to the install icon. Free gets LIW; every paid plan gets a profile icon.
    const { data: planKey, error: planError } = await client.rpc("public_card_plan_key", { p_card_id: card.id });
    if (planError) throw planError;
    const paid = Boolean(planKey && planKey !== "starter");
    const profileUrl = String(card.profile_image_url || "").trim();
    if (appUrl.pathname !== "/cards-staging/card.html" || appUrl.searchParams.get("slug") !== slug) {
      return response(JSON.stringify({ error: "Invalid card URL" }), 400, "application/json; charset=utf-8");
    }
    const appBase = `${appUrl.origin}/cards-staging/`;
    const cardPath = "/cards-staging/card.html";

    const startUrl = new URL(cardPath, appUrl.origin);
    startUrl.searchParams.set("slug", card.slug);
    startUrl.searchParams.set("source", "home-screen");

    const identityUrl = new URL(startUrl.href);
    identityUrl.searchParams.delete("source");

    const displayName = String(card.full_name || card.company_name || "Digital Card").trim() || "Digital Card";
    const liw192 = `${appBase}assets/icons/icon-192-v1062.png`;
    const liw512 = `${appBase}assets/icons/icon-512-v1062.png`;
    const liwMaskable = `${appBase}assets/icons/icon-maskable-512-v1062.png`;
    const icons: Array<Record<string, string>> = [];

    if (paid) {
      // Profile photo, not QR logo; endpoint returns a neutral profile
      // silhouette if the card has no usable photo.
      const revision = encodeURIComponent(profileUrl.split("/").pop() || "default");
      const iconBase = `${supabaseUrl}/functions/v1/card-icon-staging?slug=${encodeURIComponent(card.slug)}&v=${revision}`;
      icons.push(
        { src: `${iconBase}&size=192`, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: `${iconBase}&size=512`, sizes: "512x512", type: "image/png", purpose: "any" },
      );
    } else {
      icons.push(
        { src: liw192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: liw512, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: liwMaskable, sizes: "512x512", type: "image/png", purpose: "maskable" },
      );
    }

    const manifest = {
      id: identityUrl.href,
      name: `${displayName} — Digital Card`,
      short_name: shortName(displayName),
      description: String(card.biography || `Open ${displayName}'s digital business card.`).slice(0, 220),
      lang: "en-US",
      start_url: startUrl.href,
      scope: appBase,
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      orientation: "any",
      background_color: cleanHex(card.background_color, "#ffffff"),
      theme_color: cleanHex(card.primary_color, "#0b1438"),
      categories: ["business", "productivity"],
      prefer_related_applications: false,
      launch_handler: { client_mode: "navigate-existing" },
      liw_icon_source: paid ? (profileUrl ? "profile" : "profile-placeholder") : "liw",
      icons,
    };

    return response(JSON.stringify(manifest));
  } catch (error) {
    console.error("card-manifest error", error);
    return response(JSON.stringify({ error: "Unable to build card manifest" }), 500, "application/json; charset=utf-8");
  }
});
