import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.8";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const clean=(v:unknown,max=500)=>String(v??"").trim().slice(0,max);
const validEmail=(v:string)=>/^\S+@\S+\.\S+$/.test(v);
const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]||c));
const manageBase=(env:string)=>env==="production"?"https://cards.liwworgs.com/appointment.html":"https://liwworgsinc.github.io/cards-staging/appointment.html";
function whenLabel(iso:string,tz:string){try{return new Intl.DateTimeFormat("en-US",{weekday:"long",month:"long",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:tz||"America/New_York",timeZoneName:"short"}).format(new Date(iso));}catch{return new Date(iso).toLocaleString("en-US");}}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendKey=Deno.env.get("RESEND_API_KEY");
    if(!supabaseUrl||!serviceRoleKey||!resendKey)return json({error:"Reminder service is not configured"},500);
    const admin=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const provided=req.headers.get("x-liw-cron-secret")||"";
    const {data:secretRow,error:secretError}=await admin.from("booking_system_secrets").select("secret_value").eq("secret_key","reminder_cron_secret").maybeSingle();
    if(secretError||!secretRow||!provided||provided!==secretRow.secret_value)return json({error:"Unauthorized"},401);

    const body=await req.json().catch(()=>({}));
    const environment=body?.environment==="production"?"production":"staging";
    const now=new Date();
    const horizon=new Date(now.getTime()+24.5*60*60*1000).toISOString();
    const {data:appointments,error:apptError}=await admin.from("booking_appointments").select("id,card_id,service_name,customer_name,customer_email,start_at,timezone,manage_token,reminder_24h_sent_at,reminder_2h_sent_at").eq("kind","booking").eq("status","confirmed").eq("source_environment",environment).not("customer_email","is",null).gt("start_at",now.toISOString()).lte("start_at",horizon).order("start_at").limit(250);
    if(apptError)throw apptError;
    if(!appointments?.length)return json({ok:true,environment,checked:0,sent:0});
    const cardIds=[...new Set(appointments.map(a=>a.card_id))];
    const [{data:settings,error:settingsError},{data:cards,error:cardsError}]=await Promise.all([
      admin.from("booking_settings").select("card_id,reminder_24h_enabled,reminder_2h_enabled,location_text").in("card_id",cardIds),
      admin.from("digital_cards").select("id,company_name,full_name,internal_label,email").in("id",cardIds),
    ]);
    if(settingsError)throw settingsError;if(cardsError)throw cardsError;
    const settingMap=new Map((settings||[]).map(s=>[String(s.card_id),s]));
    const cardMap=new Map((cards||[]).map(c=>[String(c.id),c]));
    let sent=0,failed=0,skipped=0;
    for(const appt of appointments){
      const email=clean(appt.customer_email,240).toLowerCase();if(!validEmail(email)){skipped++;continue;}
      const hours=(new Date(appt.start_at).getTime()-now.getTime())/3600000;
      const setting=settingMap.get(String(appt.card_id))||{};
      let type:"24h"|"2h"|null=null;
      if(setting.reminder_2h_enabled===true&&hours<=2&&hours>0&&!appt.reminder_2h_sent_at)type="2h";
      else if(setting.reminder_24h_enabled!==false&&hours<=24&&hours>0&&!appt.reminder_24h_sent_at)type="24h";
      if(!type){skipped++;continue;}
      const field=type==="2h"?"reminder_2h_sent_at":"reminder_24h_sent_at";
      const claimedAt=new Date().toISOString();
      const {data:claim,error:claimError}=await admin.from("booking_appointments").update({[field]:claimedAt}).eq("id",appt.id).eq("status","confirmed").is(field,null).select("id").maybeSingle();
      if(claimError||!claim){skipped++;continue;}
      const card=cardMap.get(String(appt.card_id))||{};
      const business=clean(card.company_name||card.full_name||card.internal_label,180)||"LIW Card";
      const service=clean(appt.service_name,180)||"Appointment";
      const customer=clean(appt.customer_name,120)||"there";
      const when=whenLabel(appt.start_at,appt.timezone||"America/New_York");
      const manageUrl=`${manageBase(environment)}?token=${encodeURIComponent(appt.manage_token)}`;
      const location=clean(setting.location_text,500);
      const from=Deno.env.get("RESEND_FROM_EMAIL")||"LIW Cards <notifications@cards.liwworgs.com>";
      const replyTo=clean(card.email,240).toLowerCase();
      const lead=type==="2h"?"Your appointment is coming up soon.":"Here’s a reminder for your appointment tomorrow.";
      const html=`<!doctype html><html><body style="margin:0;background:#f5f6fa;font-family:Arial,sans-serif;color:#172033"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="background:#fff;border:1px solid #e3e7ef;border-radius:20px;overflow:hidden"><div style="height:5px;background:linear-gradient(90deg,#07102e,#d4a84f)"></div><div style="padding:28px"><div style="font-size:11px;font-weight:800;letter-spacing:.12em;color:#b38320;text-transform:uppercase">Appointment reminder</div><h1 style="margin:8px 0 8px;font-size:26px;color:#101828">${esc(service)}</h1><p style="margin:0 0 20px;color:#667085;line-height:1.6">Hi ${esc(customer)}, ${esc(lead)}</p><div style="padding:16px;border-radius:14px;background:#f8f9fc"><strong style="display:block;font-size:16px">${esc(when)}</strong><span style="display:block;margin-top:6px;color:#667085">${esc(business)}</span>${location?`<span style="display:block;margin-top:6px;color:#667085">${esc(location)}</span>`:""}</div><a href="${esc(manageUrl)}" style="display:inline-block;margin-top:20px;padding:12px 18px;border-radius:10px;background:#07102e;color:#fff;text-decoration:none;font-weight:800">Manage appointment</a><p style="margin:16px 0 0;color:#98a2b3;font-size:12px;line-height:1.5">Use the manage link to reschedule or cancel if those options are still available.</p></div></div></div></body></html>`;
      const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${resendKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[email],subject:`Reminder: ${service} — ${business}`,html,reply_to:validEmail(replyTo)?replyTo:undefined})});
      if(response.ok){sent++;}else{failed++;await admin.from("booking_appointments").update({[field]:null}).eq("id",appt.id).eq(field,claimedAt);console.error("booking-reminders-v2",appt.id,await response.text().catch(()=>"Resend error"));}
    }
    return json({ok:true,environment,checked:appointments.length,sent,failed,skipped});
  }catch(error){console.error("booking-reminders-v2",error);return json({error:error instanceof Error?error.message:"Unable to run reminders"},500);}
});
