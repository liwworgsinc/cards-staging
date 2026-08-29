import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAILS = new Set(["liwworgsinc@gmail.com", "globalcorent@gmail.com"]);
const AGENCY_EDIT_ROLES = new Set(["editor", "designer", "agency_admin"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function normalizeDomain(value: unknown) {
  let domain = String(value || "").trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  return domain.replace(/\.$/, "");
}

function isValidDomain(domain: string) {
  if (!domain || domain.length > 253 || !domain.includes(".")) return false;
  return domain.split(".").every((label) =>
    label.length >= 1 &&
    label.length <= 63 &&
    /^[a-z0-9-]+$/.test(label) &&
    !label.startsWith("-") &&
    !label.endsWith("-")
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "The domain connection service is not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Your session expired. Log in again." }, 401);

    const body = await req.json().catch(() => ({}));
    const domain = normalizeDomain(body?.domain);
    const cardId = String(body?.cardId || "").trim();
    if (!isValidDomain(domain)) return json({ error: "Enter a valid domain, such as yourbusiness.com." }, 400);
    if (!/^[0-9a-f-]{36}$/i.test(cardId)) return json({ error: "Choose a valid LIW Card." }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: card, error: cardError } = await admin
      .from("digital_cards")
      .select("id,user_id,full_name,company_name,status")
      .eq("id", cardId)
      .maybeSingle();
    if (cardError) throw cardError;
    if (!card) return json({ error: "That LIW Card could not be found." }, 404);

    const requesterEmail = String(user.email || "").trim().toLowerCase();
    let allowed = card.user_id === user.id || ADMIN_EMAILS.has(requesterEmail);

    if (!allowed) {
      const { data: membership } = await admin
        .from("workspace_members")
        .select("role,status")
        .eq("owner_user_id", card.user_id)
        .eq("member_user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      allowed = Boolean(membership && AGENCY_EDIT_ROLES.has(String(membership.role || "")));
    }

    if (!allowed) return json({ error: "You do not have permission to connect a domain to this card." }, 403);

    const { data: existing } = await admin
      .from("domain_requests")
      .select("id,domain_name,dns_status,created_at")
      .eq("user_id", card.user_id)
      .eq("card_id", card.id)
      .eq("domain_name", domain)
      .in("dns_status", ["awaiting_instructions", "pending_verification", "verifying"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return json({
        requestId: existing.id,
        domain: existing.domain_name,
        status: existing.dns_status,
        existing: true,
      });
    }

    const { data: request, error: insertError } = await admin
      .from("domain_requests")
      .insert({
        user_id: card.user_id,
        card_id: card.id,
        domain_name: domain,
        preferred_path: "external",
        dns_status: "awaiting_instructions",
        notes: "Existing-domain connection request submitted from LIW Cards staging. No DNS changes performed.",
      })
      .select("id,domain_name,dns_status,created_at")
      .single();
    if (insertError) throw insertError;

    return json({
      requestId: request.id,
      domain: request.domain_name,
      status: request.dns_status,
      existing: false,
    }, 201);
  } catch (error) {
    console.error("liw-domain-connect-request", error instanceof Error ? error.message : error);
    return json({ error: "Unable to save this domain connection request right now." }, 500);
  }
});
