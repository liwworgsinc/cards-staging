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
const LIW_DEAL_MIN_MARGIN_PER_YEAR_CENTS = 1000;
const LIW_TERM_DISCOUNTS = new Map<number, number>([
  [1, 0],
  [2, 0.05],
  [3, 0.08],
  [5, 0.10],
  [10, 0.12],
]);
const LIW_ADMIN_EMAILS = new Set(["liwworgsinc@gmail.com", "globalcorent@gmail.com"]);
const COMMON_TLDS = ["com", "net", "org", "co", "me", "shop"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function cleanInput(value: unknown) {
  let input = String(value || "").trim().toLowerCase();
  input = input.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  return input.replace(/\.$/, "");
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

function normalizeStem(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

function buildCandidates(value: unknown) {
  const input = cleanInput(value);
  if (!input) return [];

  const hasDot = input.includes(".");
  const exact = hasDot && isValidDomain(input) ? input : null;
  const rawStem = hasDot ? input.split(".")[0] : input;
  const stem = normalizeStem(rawStem);
  if (!stem) return exact ? [exact] : [];

  const candidates: string[] = [];
  if (exact) candidates.push(exact);
  for (const tld of COMMON_TLDS) {
    const candidate = `${stem}.${tld}`;
    if (!candidates.includes(candidate) && isValidDomain(candidate)) candidates.push(candidate);
  }
  return candidates.slice(0, 10);
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
    recommended: Boolean(item?.recommended),
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

function wholesaleBases(item: any) {
  const fees = feeTotalCents(item);
  const registrationBase = typeof item?.firstTermPrice?.value === "number"
    ? item.firstTermPrice.value
    : item?.price?.value;
  const renewalBase = item?.renewalPrice?.value;
  const registration = typeof registrationBase === "number"
    ? Math.max(0, Math.round(registrationBase)) + fees
    : null;
  const renewal = typeof renewalBase === "number"
    ? Math.max(0, Math.round(renewalBase))
    : registration;
  const currencyCode = String(
    item?.firstTermPrice?.currencyCode ||
    item?.price?.currencyCode ||
    item?.renewalPrice?.currencyCode ||
    "USD"
  );
  return { registration, renewal, currencyCode };
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
  const bases = wholesaleBases(item);
  const registrationRetail = bases.registration === null
    ? null
    : retailCents(bases.registration, LIW_STANDARD_FIRST_YEAR_CENTS, isPremium);
  const renewalRetail = bases.renewal === null
    ? null
    : retailCents(bases.renewal, LIW_STANDARD_RENEWAL_CENTS, isPremium);

  return {
    term: item?.term || null,
    period: Number(item?.period || 0),
    price: registrationRetail === null ? null : { currencyCode: bases.currencyCode, value: registrationRetail },
    renewalPrice: renewalRetail === null ? null : { currencyCode: bases.currencyCode, value: renewalRetail },
    recommended: Boolean(item?.recommended),
  };
}

function buildTermDeals(item: any, isPremium: boolean) {
  if (!item) return [];
  const bases = wholesaleBases(item);
  const retail = retailPrice(item, isPremium);
  const firstRetail = retail?.price?.value;
  const renewalRetail = retail?.renewalPrice?.value;
  if (
    typeof bases.registration !== "number" ||
    typeof bases.renewal !== "number" ||
    typeof firstRetail !== "number" ||
    typeof renewalRetail !== "number"
  ) return [];

  return Array.from(LIW_TERM_DISCOUNTS.entries()).map(([years, requestedRate]) => {
    const regularTotal = firstRetail + (renewalRetail * (years - 1));
    const wholesaleTotal = bases.registration + (bases.renewal * (years - 1));
    const targetTotal = Math.round(regularTotal * (1 - requestedRate));
    const profitFloor = wholesaleTotal + (LIW_DEAL_MIN_MARGIN_PER_YEAR_CENTS * years);
    const dealTotal = years === 1
      ? regularTotal
      : Math.min(regularTotal, Math.max(targetTotal, profitFloor));
    const savings = Math.max(0, regularTotal - dealTotal);
    const effectivePercent = regularTotal > 0 ? Math.round((savings / regularTotal) * 100) : 0;

    return {
      years,
      regularTotal: { currencyCode: bases.currencyCode, value: regularTotal },
      dealTotal: { currencyCode: bases.currencyCode, value: dealTotal },
      savings: { currencyCode: bases.currencyCode, value: savings },
      discountPercent: effectivePercent,
    };
  });
}

function shapeAvailability(item: any, fallbackDomain: string, isAdmin: boolean) {
  const domain = String(item?.domain || fallbackDomain || "");
  if (item?.error) {
    return {
      domain,
      available: false,
      inventory: "STANDARD",
      retailPrices: [],
      termDeals: [],
      error: item.error?.message || item.error?.code || "Unable to check this domain.",
    };
  }

  const inventory = String(item?.inventory || "STANDARD").toUpperCase();
  const isPremium = inventory === "PREMIUM";
  const sourcePrices = Array.isArray(item?.prices) ? item.prices : [];
  const oneYearSource = sourcePrices.find((price: any) => Number(price?.period) === 1) || sourcePrices[0] || null;
  return {
    domain,
    available: Boolean(item?.available),
    inventory,
    retailPrices: sourcePrices.map((price: any) => retailPrice(price, isPremium)),
    termDeals: buildTermDeals(oneYearSource, isPremium),
    ...(isAdmin ? { adminWholesalePrices: sourcePrices.map(sanitizePrice) } : {}),
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
        error: "The domain provider connection is not configured yet.",
        code: "DOMAIN_PROVIDER_NOT_CONFIGURED",
      }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const candidates = buildCandidates(body?.domain);
    if (!candidates.length) {
      return json({ error: "Enter a business name or valid domain, such as mybusiness.com." }, 400);
    }

    const endpoint = "https://api.godaddy.com/v3/domains/check-availability";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${godaddyPat}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ domains: candidates, optimizeFor: "SPEED" }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("godaddy-domain-search", response.status, payload?.code || payload?.message || "Domain request failed");
      const friendly = response.status === 401 || response.status === 403
        ? "The domain provider rejected the connection or required read permission is missing."
        : response.status === 429
          ? "Domain search is receiving too many requests right now. Try again shortly."
          : payload?.message || "Unable to check domains right now.";
      return json({ error: friendly, code: payload?.code || "DOMAIN_PROVIDER_ERROR" }, response.status >= 500 ? 502 : response.status);
    }

    const sourceItems = Array.isArray(payload?.items) ? payload.items : [];
    const isAdmin = LIW_ADMIN_EMAILS.has(String(user.email || "").trim().toLowerCase());
    const items = candidates.map((candidate, index) => shapeAvailability(sourceItems[index], candidate, isAdmin));
    const primary = items[0] || null;

    return json({
      ...(primary || {}),
      items,
      searchQuery: cleanInput(body?.domain),
      searchedExtensions: candidates.map((domain) => domain.split(".").slice(1).join(".")),
      pricingPolicy: {
        standardFirstYearFrom: { currencyCode: "USD", value: LIW_STANDARD_FIRST_YEAR_CENTS },
        standardRenewalFrom: { currencyCode: "USD", value: LIW_STANDARD_RENEWAL_CENTS },
        premiumPricing: "25% markup or $15 minimum margin, whichever is greater",
        multiYearDeals: "2 years up to 5% off, 3 years up to 8% off, 5 years up to 10% off, 10 years up to 12% off; profit floor applies",
      },
      checkedAt: new Date().toISOString(),
      indicative: true,
    });
  } catch (error) {
    console.error("godaddy-domain-search", error instanceof Error ? error.message : error);
    return json({ error: "Unable to check domains right now." }, 500);
  }
});