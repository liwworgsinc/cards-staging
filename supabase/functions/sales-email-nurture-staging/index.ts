import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const clean = (value: unknown, max = 1000) => String(value ?? "").trim().slice(0, max);
const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[ch] || ch));
const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

function verticalFor(value: unknown) {
  const raw = clean(value, 240).toLowerCase();
  if (/barber|barbershop/.test(raw)) return "barber";
  if (/nail|manicure|pedicure/.test(raw)) return "nail";
  if (/restaurant|food|cafe|chef|catering/.test(raw)) return "restaurant";
  if (/realtor|real estate|broker|property/.test(raw)) return "real_estate";
  if (/contractor|construction|electric|plumb|hvac|roof|handyman/.test(raw)) return "contractor";
  if (/tax|account|bookkeep|business service/.test(raw)) return "tax";
  if (/tattoo|pierc/.test(raw)) return "tattoo";
  return "general";
}

function firstName(name: unknown) {
  return clean(name, 120).split(/\s+/).filter(Boolean)[0] || "there";
}

function personalize(value: unknown, lead: any) {
  const businessType = clean(lead.service_interest, 160) || "business";
  return String(value ?? "")
    .replaceAll("{{first_name}}", firstName(lead.name))
    .replaceAll("{{business_type}}", businessType)
    .replaceAll("{{business_name}}", businessType);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Sales email staging is not configured." }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    async function requireAdmin() {
      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized");
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error } = await userClient.auth.getUser();
      if (error || !user) throw new Error("Unauthorized");
      const { data: isAdmin, error: adminError } = await admin.rpc("user_is_admin", { p_user_id: user.id });
      if (adminError || isAdmin !== true) throw new Error("Admin access required");
      return user;
    }

    async function getConfig() {
      const { data, error } = await admin.from("staging_sales_email_config").select("*").eq("singleton", true).single();
      if (error) throw error;
      return data;
    }

    async function refreshQueue() {
      const [{ data: prefs, error: prefError }, { data: sequences, error: seqError }] = await Promise.all([
        admin.from("staging_sales_lead_preferences").select("lead_id,email,marketing_opt_in,consented_at,unsubscribed_at").eq("marketing_opt_in", true).is("unsubscribed_at", null),
        admin.from("staging_sales_email_sequences").select("sequence_key,vertical,step_no,delay_hours,enabled").eq("enabled", true),
      ]);
      if (prefError) throw prefError;
      if (seqError) throw seqError;
      const leadIds = (prefs || []).map((p: any) => p.lead_id);
      if (!leadIds.length) return { inserted: 0, eligibleLeads: 0 };

      const { data: leads, error: leadError } = await admin.from("leads")
        .select("id,name,email,service_interest,status,created_at")
        .in("id", leadIds);
      if (leadError) throw leadError;
      const leadMap = new Map((leads || []).map((l: any) => [l.id, l]));
      const activePrefs = [];
      for (const pref of prefs || []) {
        const lead: any = leadMap.get(pref.lead_id);
        if (!lead || !lead.email || !validEmail(clean(lead.email, 320))) continue;
        if (["sold","won","converted","customer","closed"].includes(clean(lead.status, 40).toLowerCase())) continue;
        const { data: suppressed, error: suppressionError } = await admin.from("staging_email_suppressions")
          .select("email").eq("email", clean(lead.email, 320).toLowerCase()).maybeSingle();
        if (suppressionError) throw suppressionError;
        if (!suppressed) activePrefs.push({ pref, lead });
      }

      const rows: any[] = [];
      for (const item of activePrefs) {
        const vertical = verticalFor(item.lead.service_interest);
        const matched = (sequences || []).filter((s: any) => s.vertical === vertical || (vertical === "general" && s.vertical === "general"));
        const anchor = new Date(item.pref.consented_at || item.lead.created_at || Date.now()).getTime();
        for (const sequence of matched) {
          rows.push({
            lead_id: item.lead.id,
            sequence_key: sequence.sequence_key,
            due_at: new Date(anchor + Number(sequence.delay_hours || 0) * 3600000).toISOString(),
          });
        }
      }
      if (!rows.length) return { inserted: 0, eligibleLeads: activePrefs.length };
      const { data: inserted, error: insertError } = await admin.from("staging_sales_email_queue")
        .upsert(rows, { onConflict: "lead_id,sequence_key", ignoreDuplicates: true })
        .select("id");
      if (insertError) throw insertError;
      return { inserted: inserted?.length || 0, eligibleLeads: activePrefs.length };
    }

    async function eligibility(job: any) {
      const [{ data: pref, error: prefError }, { data: lead, error: leadError }, { data: sequence, error: seqError }] = await Promise.all([
        admin.from("staging_sales_lead_preferences").select("email,marketing_opt_in,unsubscribed_at,preference_token").eq("lead_id", job.lead_id).maybeSingle(),
        admin.from("leads").select("id,name,email,service_interest,status").eq("id", job.lead_id).maybeSingle(),
        admin.from("staging_sales_email_sequences").select("sequence_key,vertical,enabled,subject,body_text,cta_label,cta_url").eq("sequence_key", job.sequence_key).maybeSingle(),
      ]);
      if (prefError) throw prefError;
      if (leadError) throw leadError;
      if (seqError) throw seqError;
      if (!pref || !pref.marketing_opt_in || pref.unsubscribed_at) return { ok:false, status:"suppressed", reason:"Sales follow-up consent is not active." };
      if (!lead) return { ok:false, status:"skipped", reason:"Lead no longer exists." };
      if (["sold","won","converted","customer","closed"].includes(clean(lead.status, 40).toLowerCase())) return { ok:false, status:"skipped", reason:"Lead is already converted/closed." };
      if (!sequence || !sequence.enabled) return { ok:false, status:"skipped", reason:"Sales email step is disabled." };
      if (sequence.vertical !== verticalFor(lead.service_interest)) return { ok:false, status:"skipped", reason:"Lead business type changed." };
      const email = clean(lead.email || pref.email, 320).toLowerCase();
      if (!validEmail(email)) return { ok:false, status:"suppressed", reason:"Lead email is missing or invalid." };
      const { data: suppressed, error: suppressionError } = await admin.from("staging_email_suppressions").select("reason").eq("email", email).maybeSingle();
      if (suppressionError) throw suppressionError;
      if (suppressed) return { ok:false, status:"suppressed", reason:"Email is suppressed: " + suppressed.reason };
      return { ok:true, lead, sequence, email, token: pref.preference_token };
    }

    async function finishJob(jobId: string, status: string, reason = "") {
      await admin.from("staging_sales_email_queue").update({
        status, last_error: reason || null, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", jobId);
    }

    async function sendJob(job: any, sentBy: string | null) {
      const claimedAt = new Date().toISOString();
      const { data: claimed, error: claimError } = await admin.from("staging_sales_email_queue")
        .update({ status:"processing", attempt_count:Number(job.attempt_count || 0)+1, last_attempt_at:claimedAt, updated_at:claimedAt })
        .eq("id", job.id).eq("status", "queued").select("attempt_count").maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) return { outcome:"not_claimed" };
      const check: any = await eligibility(job);
      if (!check.ok) {
        await finishJob(job.id, check.status, check.reason);
        return { outcome:check.status, reason:check.reason };
      }
      if (!resendKey) {
        await finishJob(job.id, "failed", "Resend is not configured.");
        return { outcome:"failed", error:"Resend is not configured." };
      }

      const subject = personalize(check.sequence.subject, check.lead);
      const bodyText = personalize(check.sequence.body_text, check.lead);
      const ctaLabel = personalize(check.sequence.cta_label, check.lead);
      const ctaUrl = clean(check.sequence.cta_url, 1000);
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/sales-email-preferences-staging?token=${encodeURIComponent(String(check.token))}`;
      const html = '<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#182230">' +
        '<div style="max-width:640px;margin:0 auto;padding:30px 18px"><div style="background:#fff;border:1px solid #e4e7ec;border-radius:20px;overflow:hidden">' +
        '<div style="height:5px;background:linear-gradient(90deg,#0b1438,#d4a84f)"></div><div style="padding:28px">' +
        '<img src="https://cards.liwworgs.com/assets/liw-worgs-logo.png" alt="LIW Cards" style="max-height:48px;max-width:190px;object-fit:contain">' +
        '<div style="margin-top:22px;font-size:11px;font-weight:800;letter-spacing:.1em;color:#b3832e;text-transform:uppercase">LIW Cards · sales follow-up · staging</div>' +
        '<h1 style="margin:8px 0 14px;font-size:25px;color:#0b1438">Hi ' + esc(firstName(check.lead.name)) + ',</h1>' +
        '<div style="color:#475467;font-size:15px;line-height:1.75">' + esc(bodyText).replaceAll("\n","<br>") + '</div>' +
        '<p style="margin:26px 0"><a href="' + esc(ctaUrl) + '" style="display:inline-block;background:#0b1438;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:800">' + esc(ctaLabel) + '</a></p>' +
        '<div style="margin-top:26px;padding-top:18px;border-top:1px solid #edf0f4;color:#8a94a6;font-size:12px;line-height:1.6"><strong>STAGING SALES FOLLOW-UP.</strong> You asked LIW Cards to follow up and opted in to email updates.<br><a href="' + esc(unsubscribeUrl) + '" style="color:#667085">Stop LIW sales follow-up emails</a></div>' +
        '</div></div></div></body></html>';
      const text = `Hi ${firstName(check.lead.name)},\n\n${bodyText}\n\n${ctaLabel}: ${ctaUrl}\n\nStop LIW sales follow-up emails: ${unsubscribeUrl}\n\nSTAGING SALES FOLLOW-UP`;
      const from = Deno.env.get("RESEND_FROM_EMAIL") || "LIW Cards <notifications@cards.liwworgs.com>";
      const replyTo = Deno.env.get("RESEND_REPLY_TO_EMAIL") || "globalcorent@gmail.com";
      const providerResponse = await fetch("https://api.resend.com/emails", {
        method:"POST",
        headers:{ Authorization:`Bearer ${resendKey}`, "Content-Type":"application/json", "Idempotency-Key":`liw-staging-sales-${job.id}` },
        body:JSON.stringify({ from, to:[check.email], reply_to:replyTo, subject:`[STAGING SALES] ${subject}`, html, text }),
      });
      const provider = await providerResponse.json().catch(() => ({}));
      const now = new Date().toISOString();
      if (!providerResponse.ok) {
        const message = clean(provider?.message || provider?.error || "Email delivery failed", 1500);
        const attempts = Number(claimed.attempt_count || 1);
        await admin.from("staging_sales_email_log").insert({ lead_id:job.lead_id, sequence_key:job.sequence_key, recipient_email:check.email, status:"failed", provider_error:message, sent_by:sentBy, created_at:now, updated_at:now });
        if (attempts >= 3) await finishJob(job.id, "failed", message);
        else await admin.from("staging_sales_email_queue").update({ status:"queued", due_at:new Date(Date.now()+attempts*30*60000).toISOString(), last_error:message, updated_at:now }).eq("id", job.id);
        return { outcome:attempts >= 3 ? "failed" : "retry", error:message };
      }
      const providerId = clean(provider?.id, 240) || null;
      await admin.from("staging_sales_email_queue").update({ status:"sent", provider_message_id:providerId, last_error:null, completed_at:now, updated_at:now }).eq("id", job.id);
      await admin.from("staging_sales_email_log").insert({ lead_id:job.lead_id, sequence_key:job.sequence_key, recipient_email:check.email, status:"sent", provider_message_id:providerId, sent_by:sentBy, created_at:now, updated_at:now });
      return { outcome:"sent", providerMessageId:providerId };
    }

    const body = await req.json().catch(() => ({}));
    const action = clean(body.action || "status", 40);
    const user = await requireAdmin();
    const config: any = await getConfig();

    if (action === "set_enabled") {
      const enabled = body.enabled === true;
      const { error } = await admin.from("staging_sales_email_config").update({ automation_enabled:enabled, updated_at:new Date().toISOString() }).eq("singleton", true);
      if (error) throw error;
      return json({ ok:true, automationEnabled:enabled });
    }

    if (action === "update_sequence") {
      const sequenceKey = clean(body.sequenceKey, 100);
      const patch: any = {};
      if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
      if (body.subject !== undefined) patch.subject = clean(body.subject, 240);
      if (body.bodyText !== undefined) patch.body_text = clean(body.bodyText, 8000);
      if (body.delayHours !== undefined) patch.delay_hours = Math.max(0, Number(body.delayHours) || 0);
      patch.updated_by = user.id; patch.updated_at = new Date().toISOString();
      const { data, error } = await admin.from("staging_sales_email_sequences").update(patch).eq("sequence_key", sequenceKey).select("*").single();
      if (error) throw error;
      return json({ ok:true, sequence:data });
    }

    if (action === "send_test") {
      if (!resendKey) return json({ error:"Resend is not configured." }, 500);
      const sequenceKey = clean(body.sequenceKey, 100);
      const recipient = clean(user.email, 320).toLowerCase();
      if (!validEmail(recipient)) return json({ error:"Admin email is invalid." }, 400);
      const { data: sequence, error } = await admin.from("staging_sales_email_sequences").select("*").eq("sequence_key", sequenceKey).maybeSingle();
      if (error) throw error;
      if (!sequence) return json({ error:"Sales email step not found." }, 404);
      const fakeLead = { name:firstName(user.user_metadata?.full_name || "LIW Admin"), service_interest:sequence.vertical };
      const subject = personalize(sequence.subject, fakeLead);
      const bodyText = personalize(sequence.body_text, fakeLead);
      const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:28px"><strong>STAGING SALES TEST</strong><h2>${esc(subject)}</h2><p style="line-height:1.7">${esc(bodyText)}</p><p><a href="${esc(sequence.cta_url)}">${esc(sequence.cta_label)}</a></p></div>`;
      const from = Deno.env.get("RESEND_FROM_EMAIL") || "LIW Cards <notifications@cards.liwworgs.com>";
      const providerResponse = await fetch("https://api.resend.com/emails", { method:"POST", headers:{ Authorization:`Bearer ${resendKey}`, "Content-Type":"application/json" }, body:JSON.stringify({ from, to:[recipient], subject:`[STAGING SALES TEST] ${subject}`, html }) });
      const provider = await providerResponse.json().catch(() => ({}));
      if (!providerResponse.ok) return json({ error:clean(provider?.message || "Test email failed", 1000) }, 502);
      return json({ ok:true, recipient, providerMessageId:provider?.id || null });
    }

    const refresh = await refreshQueue();
    if (action === "status") {
      const [{ data: sequences }, { data: queue }, { data: logs }, { count: optedInCount }] = await Promise.all([
        admin.from("staging_sales_email_sequences").select("*").order("vertical").order("step_no"),
        admin.from("staging_sales_email_queue").select("id,lead_id,sequence_key,due_at,status,attempt_count,last_error,created_at").order("created_at", { ascending:false }).limit(75),
        admin.from("staging_sales_email_log").select("lead_id,sequence_key,recipient_email,status,provider_message_id,provider_error,created_at").order("created_at", { ascending:false }).limit(50),
        admin.from("staging_sales_lead_preferences").select("lead_id", { count:"exact", head:true }).eq("marketing_opt_in", true).is("unsubscribed_at", null),
      ]);
      const counts = (queue || []).reduce((acc: Record<string,number>, row: any) => { acc[row.status]=(acc[row.status]||0)+1; return acc; }, {});
      return json({ ok:true, resendConfigured:Boolean(resendKey), automationEnabled:Boolean(config.automation_enabled), optedInCount:optedInCount||0, refresh, queueCounts:counts, sequences:sequences||[], queue:queue||[], logs:logs||[], lastRunAt:config.last_run_at, lastRunSummary:config.last_run_summary||{} });
    }

    const now = new Date().toISOString();
    const { data: due, error: dueError } = await admin.from("staging_sales_email_queue").select("id,lead_id,sequence_key,due_at,status,attempt_count").eq("status","queued").lte("due_at",now).order("due_at").limit(Number(config.batch_size||25));
    if (dueError) throw dueError;
    if (action === "dry_run") return json({ ok:true, refresh, dueCount:due?.length||0, due:(due||[]).map((r:any)=>({ id:r.id, leadId:r.lead_id, sequenceKey:r.sequence_key, dueAt:r.due_at })) });
    if (action !== "run") return json({ error:"Unsupported action" }, 400);
    if (!config.automation_enabled) return json({ ok:true, skipped:true, reason:"Staging sales email automation is paused.", refresh, dueCount:due?.length||0 });

    const results: any[] = [];
    for (const job of due || []) results.push({ id:job.id, sequenceKey:job.sequence_key, ...(await sendJob(job, user.id)) });
    const summary = results.reduce((acc: Record<string,number>, row:any) => { const key=row.outcome||"unknown"; acc[key]=(acc[key]||0)+1; return acc; }, {});
    await admin.from("staging_sales_email_config").update({ last_run_at:new Date().toISOString(), last_run_summary:{ ...summary, due:due?.length||0, refresh }, updated_at:new Date().toISOString() }).eq("singleton", true);
    return json({ ok:true, refresh, processed:results.length, summary });
  } catch (error) {
    console.error("sales-email-nurture-staging", error);
    const message = error instanceof Error ? error.message : "Unable to run sales email staging.";
    return json({ error:message }, message === "Unauthorized" ? 401 : message === "Admin access required" ? 403 : 400);
  }
});
