import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(value: unknown, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

function htmlEscape(value: unknown) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Lead service is not configured." }, 500);

    const body = await req.json().catch(() => ({}));
    if (text(body.website, 200)) return json({ ok: true, emailSent: false });

    const cardId = text(body.cardId, 50);
    const name = text(body.name, 120);
    const email = text(body.email, 180).toLowerCase();
    const phone = text(body.phone, 60);
    const message = text(body.message, 3000);
    const interest = text(body.serviceInterest, 250);
    const source = ["qr", "card", "share"].includes(body.source) ? body.source : "card";
    const consentGiven = body.consentGiven === true;

    if (!/^[0-9a-f-]{36}$/i.test(cardId)) return json({ error: "Invalid card." }, 400);
    if (name.length < 2) return json({ error: "Enter your name." }, 400);
    if (!email && !phone) return json({ error: "Enter an email address or phone number." }, 400);
    if (email && !validEmail(email)) return json({ error: "Enter a valid email address." }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: card, error: cardError } = await admin.from("digital_cards")
      .select("id,user_id,agency_client_id,full_name,company_name,email,status,lead_form_enabled")
      .eq("id", cardId).maybeSingle();
    if (cardError) throw cardError;
    if (!card || card.status !== "published" || !card.lead_form_enabled) {
      return json({ error: "This card is not accepting inquiries." }, 403);
    }

    const { data: agency } = await admin.from("agency_accounts")
      .select("status,allow_public_cards,business_name")
      .eq("owner_user_id", card.user_id).maybeSingle();
    if (agency && !["trial", "active"].includes(agency.status) && !agency.allow_public_cards) {
      return json({ error: "This card is temporarily unavailable." }, 403);
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    let duplicateQuery = admin.from("leads").select("id", { count: "exact", head: true })
      .eq("card_id", card.id).gte("created_at", tenMinutesAgo);
    duplicateQuery = email ? duplicateQuery.eq("email", email) : duplicateQuery.eq("phone", phone);
    const { count: duplicateCount, error: duplicateError } = await duplicateQuery;
    if (duplicateError) throw duplicateError;
    if ((duplicateCount || 0) > 0) {
      return json({ error: "This inquiry was already received. Please wait before sending it again." }, 429);
    }

    const { data: lead, error: insertError } = await admin.from("leads").insert({
      card_id: card.id,
      owner_user_id: card.user_id,
      name,
      email: email || null,
      phone: phone || null,
      message: message || null,
      service_interest: interest || null,
      status: "new",
      consent_given: consentGiven,
      source,
    }).select().single();
    if (insertError) throw insertError;

    let recipient = "";
    let recipientType: "agency_client" | "card" | "owner" | "none" = "none";
    let recipientName = card.company_name || card.full_name || "the business";

    if (card.agency_client_id) {
      const { data: client, error: clientError } = await admin.from("agency_clients")
        .select("id,name,company_name,email,status")
        .eq("id", card.agency_client_id)
        .eq("agency_owner_id", card.user_id)
        .maybeSingle();
      if (clientError) throw clientError;

      recipient = text(client?.email, 240).toLowerCase();
      recipientName = text(client?.company_name || client?.name || recipientName, 180);
      if (recipient && validEmail(recipient)) recipientType = "agency_client";
      else recipient = "";
    } else {
      const cardEmail = text(card.email, 240).toLowerCase();
      if (cardEmail && validEmail(cardEmail)) {
        recipient = cardEmail;
        recipientType = "card";
      } else {
        const { data: owner } = await admin.auth.admin.getUserById(card.user_id);
        const ownerEmail = text(owner.user?.email, 240).toLowerCase();
        if (ownerEmail && validEmail(ownerEmail)) {
          recipient = ownerEmail;
          recipientType = "owner";
        }
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "LIW Cards Leads <notifications@cards.liwworgs.com>";
    let emailSent = false;
    let emailError = "";

    if (card.agency_client_id && !recipient) {
      emailError = "Agency client email is missing. The lead was saved in the Agency lead inbox.";
    } else if (!resendKey) {
      emailError = "Resend is not configured. The lead was saved in the lead inbox.";
    } else if (recipient) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject: `New inquiry from ${name} — ${recipientName}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#182230"><h2 style="color:#0b1438">New inquiry from your digital card</h2><p><strong>Business:</strong> ${htmlEscape(recipientName)}</p><p><strong>Name:</strong> ${htmlEscape(name)}</p><p><strong>Email:</strong> ${htmlEscape(email || "Not provided")}</p><p><strong>Phone:</strong> ${htmlEscape(phone || "Not provided")}</p><p><strong>Interest:</strong> ${htmlEscape(interest || "Not specified")}</p><p><strong>Message:</strong><br>${htmlEscape(message || "No message").replaceAll("\n", "<br>")}</p><p style="color:#667085;font-size:13px">Reply to this email to respond directly when the customer provided an email address.</p></div>`,
          reply_to: email || undefined,
        }),
      });
      emailSent = response.ok;
      if (!response.ok) emailError = await response.text();
    }

    return json({
      ok: true,
      leadId: lead.id,
      emailSent,
      emailError: emailError || undefined,
      recipientType,
    });
  } catch (error) {
    console.error("submit-agency-lead", error);
    return json({ error: error instanceof Error ? error.message : "Unable to submit inquiry." }, 400);
  }
});