import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const page = (title: string, message: string, ok = true) => new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#182230}.wrap{max-width:560px;margin:10vh auto;padding:20px}.card{background:#fff;border:1px solid #e4e7ec;border-radius:22px;padding:30px;box-shadow:0 18px 50px rgba(11,20,56,.08)}h1{color:#0b1438;margin:0 0 12px}p{line-height:1.65;color:#667085}.pill{display:inline-block;padding:7px 10px;border-radius:999px;background:${ok ? '#e9f7ef' : '#fff0ef'};color:${ok ? '#21643d' : '#b42318'};font-weight:800;font-size:12px}</style></head><body><div class="wrap"><div class="card"><span class="pill">LIW Cards · staging</span><h1>${title}</h1><p>${message}</p></div></div></body></html>`, { status: ok ? 200 : 400, headers: { "Content-Type":"text/html; charset=utf-8", "Cache-Control":"no-store" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return page("Unsupported request", "This link only supports email preference updates.", false);
  try {
    const url = new URL(req.url);
    const token = String(url.searchParams.get("token") || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(token)) return page("Invalid link", "This sales email preference link is not valid.", false);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) return page("Preference service unavailable", "Please contact LIW Cards and we will update your preference manually.", false);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth:{ persistSession:false, autoRefreshToken:false } });
    const { data: pref, error } = await admin.from("staging_sales_lead_preferences")
      .select("lead_id,email,unsubscribed_at")
      .eq("preference_token", token).maybeSingle();
    if (error) throw error;
    if (!pref) return page("Link not found", "This sales email preference link is no longer available.", false);
    if (!pref.unsubscribed_at) {
      const now = new Date().toISOString();
      const { error: updateError } = await admin.from("staging_sales_lead_preferences").update({ marketing_opt_in:false, unsubscribed_at:now, updated_at:now }).eq("lead_id", pref.lead_id);
      if (updateError) throw updateError;
      await admin.from("staging_sales_email_queue").update({ status:"suppressed", last_error:"Lead unsubscribed from sales follow-up.", completed_at:now, updated_at:now }).eq("lead_id", pref.lead_id).in("status", ["queued","processing"]);
    }
    return page("Sales follow-up stopped", "You will not receive additional LIW Cards sales follow-up emails from this staging sequence. Your original inquiry and contact information remain in the LIW lead system.");
  } catch (error) {
    console.error("sales-email-preferences-staging", error);
    return page("Could not update preference", "Please contact LIW Cards and we will update your preference manually.", false);
  }
});
