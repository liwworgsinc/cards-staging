import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

// LIW Cards — confirmed booking email. Staging-only; no caller-chosen recipient.
// The appointment UUID and secret manage token must BOTH match a saved booking.
const ORIGIN = "https://liwworgsinc.github.io";
const MANAGE_BASE = "https://liwworgsinc.github.io/cards-staging/appointment.html?token=";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max = 250) => String(v ?? "").trim().slice(0, max);
const esc = (v: unknown) => clean(v, 1200).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
}[c] || c));
const cors = (origin: string | null) => ({
  "Content-Type": "application/json",
  "Vary": "Origin",
  ...(origin === ORIGIN ? { "Access-Control-Allow-Origin": ORIGIN } : {}),
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
});
const json = (body: Record<string, unknown>, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: cors(origin) });
const toDate = (value: unknown, zone: string) => {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) throw new Error("invalid_booked_date");
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZone: zone,
      timeZoneName: "short"
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
      timeZoneName: "short"
    }).format(date);
  }
};
const propertyFrom = (message: unknown) => {
  const match = /^Property:\s*(.+)$/im.exec(String(message || ""));
  return match ? clean(match[1], 280) : "";
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: origin === ORIGIN ? 204 : 403, headers: cors(origin) });
  if (req.method !== "POST") return json({ ok: false, reason: "method_not_allowed" }, 405, origin);
  if (origin && origin !== ORIGIN) return json({ ok: false, reason: "origin_not_allowed" }, 403, origin);

  try {
    const body = await req.json().catch(() => ({}));
    const appointmentId = clean(body?.appointment_id, 80);
    const manageToken = clean(body?.manage_token, 80);
    if (!UUID.test(appointmentId) || !UUID.test(manageToken)) {
      return json({ ok: false, reason: "invalid_booking_reference" }, 400, origin);
    }
    const url = Deno.env.get("SUPABASE_URL");
    const modern = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || modern.default;
    if (!url || !key) return json({ ok: false, reason: "booking_mail_not_configured" }, 503, origin);
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: appointment, error: appointmentError } = await admin.from("booking_appointments")
      .select("id,card_id,kind,status,source_environment,customer_name,customer_email,service_name,message,start_at,timezone,manage_token")
      .eq("id", appointmentId).eq("manage_token", manageToken)
      .eq("source_environment", "staging").eq("kind", "booking").eq("status", "confirmed")
      .maybeSingle();
    if (appointmentError) throw appointmentError;
    if (!appointment) return json({ ok: false, reason: "confirmed_booking_not_found" }, 404, origin);
    const email = clean(appointment.customer_email, 180).toLowerCase();
    if (!EMAIL.test(email)) return json({ ok: false, reason: "no_email_on_booking" }, 200, origin);
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ ok: false, reason: "booking_mail_not_configured" }, 503, origin);
    const now = new Date().toISOString();
    // A durable claim prevents duplicate sends even after Resend's idempotency window.
    let claimed = false;
    const inserted = await admin.from("booking_confirmation_deliveries")
      .insert({ appointment_id: appointmentId, state: "sending", claimed_at: now, updated_at: now })
      .select("appointment_id").maybeSingle();
    if (inserted.error && inserted.error.code !== "23505") throw inserted.error;
    claimed = Boolean(inserted.data);
    if (!claimed) {
      const { data: previous, error: previousError } = await admin.from("booking_confirmation_deliveries")
        .select("state,claimed_at").eq("appointment_id", appointmentId).maybeSingle();
      if (previousError) throw previousError;
      if (!previous) return json({ ok: false, reason: "email_claim_unavailable" }, 503, origin);
      if (previous.state === "sent") return json({ ok: true, status: "already_sent" }, 200, origin);
      const age = Date.now() - new Date(previous.claimed_at).getTime();
      if (previous.state === "sending" && Number.isFinite(age) && age < 5 * 60 * 1000) {
        return json({ ok: true, status: "sending" }, 202, origin);
      }
      const { data: retry, error: retryError } = await admin.from("booking_confirmation_deliveries")
        .update({ state: "sending", claimed_at: now, updated_at: now, last_error: null })
        .eq("appointment_id", appointmentId).eq("state", previous.state)
        .eq("claimed_at", previous.claimed_at).select("appointment_id").maybeSingle();
      if (retryError) throw retryError;
      if (!retry) return json({ ok: true, status: "sending" }, 202, origin);
      claimed = true;
    }

    try {
      const { data: card, error: cardError } = await admin.from("digital_cards")
        .select("company_name,full_name,internal_label,email").eq("id", appointment.card_id).maybeSingle();
      if (cardError) throw cardError;
      const company = clean(card?.company_name || card?.full_name || card?.internal_label, 160) || "LIW Cards";
      const service = clean(appointment.service_name, 140) || "Appointment";
      const property = propertyFrom(appointment.message);
      const firstName = clean(appointment.customer_name, 120) || "there";
      const when = toDate(appointment.start_at, clean(appointment.timezone, 80) || "America/New_York");
      const manageUrl = MANAGE_BASE + encodeURIComponent(manageToken);
      const showing = service.toLowerCase() === "property showing";
      const subject = clean("[LIW Staging] " + (showing ? "Your property showing is confirmed" : "Your appointment is confirmed") + " — " + (property || company), 220).replace(/[\r\n]/g, " ");
      const from = Deno.env.get("RESEND_FROM_EMAIL") || "LIW Cards <notifications@cards.liwworgs.com>";
      const replyTo = clean(card?.email, 180).toLowerCase();
      const html = [
        '<!doctype html><html><body style="margin:0;background:#f5f6fa;font-family:Arial,sans-serif;color:#172033">',
        '<div style="max-width:620px;margin:0 auto;padding:24px 14px"><div style="background:#fff;border:1px solid #e4e8ef;border-radius:18px;overflow:hidden">',
        '<div style="height:5px;background:linear-gradient(90deg,#101b35,#d4a84f)"></div><div style="padding:27px">',
        '<div style="font-size:11px;font-weight:800;color:#ab7b22;letter-spacing:.12em">LIW CARDS · STAGING CONFIRMATION</div>',
        '<h1 style="margin:11px 0;font-size:25px;color:#101828">', esc(showing ? "Your showing is confirmed" : "Your appointment is confirmed"), '</h1>',
        '<p style="line-height:1.6;color:#475569">Hi ', esc(firstName), ', your booking with ', esc(company), ' has been confirmed.</p>',
        '<div style="background:#f7f9fc;border:1px solid #e4e8f0;border-radius:13px;padding:16px;margin:19px 0">',
        '<strong style="display:block;font-size:17px;color:#101828">', esc(property || service), '</strong>',
        property ? '<span style="display:block;margin-top:6px;font-size:13px;color:#64748b">' + esc(service) + '</span>' : '',
        '<strong style="display:block;margin-top:12px;font-size:15px">', esc(when), '</strong></div>',
        '<a href="', esc(manageUrl), '" style="display:inline-block;padding:14px 18px;background:#101b35;color:#fff;text-decoration:none;border-radius:11px;font-size:14px;font-weight:800">Manage appointment</a>',
        '<p style="color:#475569;font-size:13px;line-height:1.6;margin-top:17px">Keep this email. The private button above lets you review, reschedule or cancel your appointment, subject to the Realtor’s change policy.</p>',
        '<p style="color:#98a2b3;font-size:11px;line-height:1.5">This is a staging/test booking confirmation. Do not forward your private management link.</p>',
        '</div></div></div></body></html>'
      ].join("");
      const plain = [
        "LIW Cards — staging booking confirmation",
        "Hi " + firstName + ", your booking with " + company + " is confirmed.",
        property ? "Property: " + property : "Service: " + service,
        property ? "Service: " + service : "",
        "Date and time: " + when,
        "Manage appointment (private): " + manageUrl,
        "Keep this email to reschedule or cancel under the business change policy."
      ].filter(Boolean).join("\n\n");
      const payload: Record<string, unknown> = { from, to: [email], subject, html, text: plain };
      if (EMAIL.test(replyTo)) payload.reply_to = replyTo;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + resendKey,
          "Content-Type": "application/json",
          "Idempotency-Key": "liw-staging-booking-confirmed-" + appointmentId
        },
        body: JSON.stringify(payload)
      });
      const delivered = await response.json().catch(() => ({}));
      if (!response.ok || !delivered?.id) {
        throw new Error("email_provider_" + response.status);
      }
      const { error: sentError } = await admin.from("booking_confirmation_deliveries")
        .update({ state: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          provider_message_id: clean(delivered.id, 200), last_error: null })
        .eq("appointment_id", appointmentId).eq("state", "sending").eq("claimed_at", now);
      if (sentError) throw sentError;
      return json({ ok: true, status: "sent" }, 200, origin);
    } catch (error) {
      const reason = clean(error instanceof Error ? error.message : "email_delivery_failed", 160);
      await admin.from("booking_confirmation_deliveries")
        .update({ state: "failed", updated_at: new Date().toISOString(), last_error: reason })
        .eq("appointment_id", appointmentId).eq("state", "sending").eq("claimed_at", now);
      console.error("LIW staging booking confirmation:", reason);
      return json({ ok: false, reason: "email_delivery_failed" }, 503, origin);
    }
  } catch (error) {
    console.error("LIW staging booking confirmation:", clean(error instanceof Error ? error.message : "error", 140));
    return json({ ok: false, reason: "booking_mail_unavailable" }, 503, origin);
  }
});
