import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIW_STANDARD_FIRST_YEAR_CENTS = 2499;
const LIW_STANDARD_RENEWAL_CENTS = 2999;
const LIW_STANDARD_MARGIN_CENTS = 1400;
const LIW_PREMIUM_MIN_MARGIN_CENTS = 1500;
const LIW_PREMIUM_MARKUP = 1.25;
const LIW_ADMIN_EMAILS = new Set(["liwworgsinc@gmail.com", "globalcorent@gmail.com"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function normalizeDomain(value: unknown) {
  let domain = String(value || "").trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  domain = domain.replace(/\.$/, "");
  if (domain && !domain.includes(".")) domain += ".com";
  return domain;
}

function isValidDomain(domain: string) {
  if (!domain || domain.length > 253 || !domain.includes(".")) return false;
  const labels = domain.split(".");
  return labels.every((label) =>
    label.length >= 1 &&
    label.length <= 63 &&
    /^[a-z0-9-]+$/.test(label) &&
    !label.startsWith("-") &&
    !label.endsWith("-")
  );
}

function moneyShape(value: any) {
  if (!value || typeof value.value !== "number") return null;
  return { currencyCode: String(value.currencyCode || "USD"), value: Math.round(value.value) };
}

function sanitizePrice(item: any) {
  return {
    term: item?.term || null,
    period: Number(item?.period || 0),
    price: moneyShape(item?.price),
    renewalPrice: moneyShape(item?.renewalPrice),
    firstTermPrice: moneyShape(item?.firstTermPrice),
    fees: Array.isArray(item?.fees)
      ? item.fees.map((fee: any) => ({
          type: fee?.type || fee?.feeType || null,
          amount: moneyShape(fee?.amount || fee?.price),
        })).filter((fee: any) => fee.amount)
      : [],
  };
}

function feeTotalCents(item: any) {
  if (!Array.isArray(item?.fees)) return 0;
  return item.fees.reduce((sum: number, fee: any) => {
    const amount = fee?.amount || fee?.price;
    return sum + (typeof amount?.value === "number" ? Math.max(0, Math.round(amount.value)) : 0);
  }, 0);
}

function retailCents(wholesaleCents: number, minimumCents: number, isPremium: boolean) {
  if (!Number.isFinite(wholesaleCents) || wholesaleCents < 0) return null;
  if (isPremium) {
    return Math.ceil(Math.max(
      wholesaleCents + LIW_PREMIUM_MIN_MARGIN_CENTS,
      wholesaleCents * LIW_PREMIUM_MARKUP,
    ));
  }
  return Math.max(minimumCents, wholesaleCents + LIW_STANDARD_MARGIN_CENTS);
}

function retailPrice(item: any, isPremium: boolean) {
  const currencyCode = String(
    item?.firstTermPrice?.currencyCode ||
    item?.price?.currencyCode ||
    item?.renewalPrice?.currencyCode ||
    "USD",
  );
  const fees = feeTotalCents(item);
  const registrationBase = typeof item?.firstTermPrice?.value === "number"
    ? item.firstTermPrice.value
    : item?.price?.value;
  const renewalBase = item?.renewalPrice?.value;
  const registrationWholesale = typeof registrationBase === "number"
    ? Math.max(0, Math.round(registrationBase)) + fees
    : null;
  const renewalWholesale = typeof renewalBase === "number"
    ? Math.max(0, Math.round(renewalBase))
    : registrationWholesale;

  const registrationRetail = registrationWholesale === null
    ? null
    : retailCents(registrationWholesale, LIW_STANDARD_FIRST_YEAR_CENTS, isPremium);
  const renewalRetail = renewalWholesale === null
    ? null
    : retailCents(renewalWholesale, LIW_STANDARD_RENEWAL_CENTS, isPremium);

  return {
    term: item?.term || null,
    period: Number(item?.period || 0),
    price: registrationRetail === null ? null : { currencyCode, value: registrationRetail },
    renewalPrice: renewalRetail === null ? null : { currencyCode, value: renewalRetail },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const godaddyPat = Deno.env.get("GODADDY_PAT");

    if (!supabaseUrl || !anonKey) {
      return json({ error: "The domain search service is missing required Supabase environment variables." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Your session expired. Log in again." }, 401);

    if (!godaddyPat) {
      return json({
        error: "GoDaddy is not connected yet. Add the GODADDY_PAT secret in Supabase Edge Function Secrets.",
        code: "GODADDY_NOT_CONFIGURED",
      }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const domain = normalizeDomain(body?.domain);
    if (!isValidDomain(domain)) return json({ error: "Enter a valid domain, such as mybusiness.com." }, 400);

    const endpoint = new URL("https://api.godaddy.com/v3/domains/check-availability");
    endpoint.searchParams.set("domain", domain);
    endpoint.searchParams.set("optimizeFor", "SPEED");

    const response = await fetch(endpoint, {
      headers: { "Authorization": `Bearer ${godaddyPat}`, "Accept": "application/json" },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("godaddy-domain-search", response.status, payload?.code || payload?.message || "GoDaddy request failed");
      const friendly = response.status === 401 || response.status === 403
        ? "GoDaddy rejected the token or the Domains read scope is missing."
        : response.status === 429
          ? "GoDaddy is receiving too many requests right now. Try again shortly."
          : payload?.message || "GoDaddy could not check this domain right now.";
      return json({ error: friendly, code: payload?.code || "GODADDY_ERROR" }, response.status >= 500 ? 502 : response.status);
    }

    const inventory = String(payload?.inventory || "STANDARD").toUpperCase();
    const isPremium = inventory === "PREMIUM";
    const sourcePrices = Array.isArray(payload?.prices) ? payload.prices : [];
    const isAdmin = LIW_ADMIN_EMAILS.has(String(user.email || "").trim().toLowerCase());

    return json({
      domain: payload?.domain || domain,
      available: Boolean(payload?.available),
      inventory,
      retailPrices: sourcePrices.map((item: any) => retailPrice(item, isPremium)),
      ...(isAdmin ? { adminWholesalePrices: sourcePrices.map(sanitizePrice) } : {}),
      pricingPolicy: {
        standardFirstYearFrom: { currencyCode: "USD", value: LIW_STANDARD_FIRST_YEAR_CENTS },
        standardRenewalFrom: { currencyCode: "USD", value: LIW_STANDARD_RENEWAL_CENTS },
        premiumPricing: "25% markup or $15 minimum margin, whichever is greater",
      },
      checkedAt: new Date().toISOString(),
      indicative: true,
    });
  } catch (error) {
    console.error("godaddy-domain-search", error instanceof Error ? error.message : error);
    return json({ error: "Unable to check this domain right now." }, 500);
  }
});