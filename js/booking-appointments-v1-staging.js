/* LIW Cards — Booking / Appointments V1 staging */
(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let user=null,access=null,planKey='starter',cards=[],activeCard=null,services=[],serviceSettings=new Map(),availability=new Map(),appointments=[];

  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function planName(){return ({starter:'Free',free:'Free',lite:'Lite',plus:'Plus',pro:'Pro',agency:'Agency Starter',white_label:'Agency Pro'})[planKey]||'Free';}
  function isRequestOnly(){return ['starter','free'].includes(planKey);}
  function serviceLimit(){if(isRequestOnly())return 8;if(planKey==='lite')return 1;if(planKey==='plus')return 5;return 100;}
  function isProPlus(){return ['pro','agency','white_label'].includes(planKey)||(access?.isAdmin&&!access?.isPlanPreview);}
  function cardLabel(card){return card.internal_label||card.company_name||card.full_name||'Untitled card';}
  function money(cents){if(cents==null)return '';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents)/100);}
  function toastMsg(msg){if(typeof toast==='function')toast(msg);}

  function renderDays(){
    const root=$('#booking-days');
    root.innerHTML=DAYS.map((name,weekday)=>{
      const row=availability.get(weekday)||{weekday,enabled:weekday>=1&&weekday<=5,start_time:'09:00:00',end_time:'17:00:00'};
      const start=String(row.start_time||'09:00').slice(0,5),end=String(row.end_time||'17:00').slice(0,5);
      return `<div class="booking-day" data-weekday="${weekday}"><label class="booking-day-name"><input type="checkbox" data-day-enabled ${row.enabled?'checked':''}/> <span>${name}</span></label><input class="input" data-day-start type="time" value="${esc(start)}"/><span class="booking-day-sep">to</span><input class="input" data-day-end type="time" value="${esc(end)}"/></div>`;
    }).join('');
  }

  function renderPlan(){
    const limit=serviceLimit();
    $('#booking-plan-pill').innerHTML=`<i data-lucide="sparkles" size="14"></i><span>${esc(planName())}</span>`;
    if(isRequestOnly()){
      $('#booking-hero-title').textContent='Collect service requests from your card';
      $('#booking-hero-copy').textContent='Free includes a simple request form. Clients choose a service, preferred date/time, and send their contact details. You confirm the appointment yourself.';
      $('#booking-mode-copy').textContent='Request mode — no live calendar slots or automatic confirmation.';
      $('#paid-scheduling-settings').hidden=true;
      $('#booking-limit-note').innerHTML='<strong>Free:</strong> clients can request any enabled service shown here. Times are preferences only and are not reserved.';
    }else{
      $('#booking-hero-title').textContent='Let clients book confirmed time slots';
      $('#booking-hero-copy').textContent=planKey==='lite'?'Lite includes live booking for 1 service.':'Clients can choose a service and reserve an open time from your weekly availability.';
      $('#booking-mode-copy').textContent='Live booking mode — booked times are blocked automatically.';
      $('#paid-scheduling-settings').hidden=false;
      const label=limit>=100?'unlimited services':`${limit} bookable service${limit===1?'':'s'}`;
      $('#booking-limit-note').innerHTML=`<strong>${esc(planName())}:</strong> ${label}.${isProPlus()?' Services can optionally send clients to your existing external payment link after booking. LIW does not process or verify that payment.':''}`;
    }
    if(window.lucide)lucide.createIcons();
  }

  function renderServices(){
    const root=$('#booking-service-list');
    if(!services.length){root.innerHTML='<div class="booking-empty">No services yet. Add services in Products &amp; services first.</div>';return;}
    const max=serviceLimit();
    root.innerHTML=services.map((service,index)=>{
      const saved=serviceSettings.get(String(service.id));
      const enabled=saved?saved.enabled:index<max;
      const duration=Number(saved?.duration_minutes||30);
      const pay=isProPlus()&&service.payment_url?'<small><i data-lucide="external-link" size="11"></i> External payment link ready</small>':'';
      return `<div class="booking-service-row" data-service-id="${esc(service.id)}"><div class="booking-service-copy"><strong>${esc(service.name)}</strong><small>${service.price_cents!=null?`${esc(money(service.price_cents))} · `:''}${esc(service.description||'Service')}</small>${pay}</div><div class="booking-service-controls"><label><input data-service-enabled type="checkbox" ${enabled?'checked':''}/> Use</label>${isRequestOnly()?'':`<select class="input" data-service-duration aria-label="Duration for ${esc(service.name)}"><option value="15" ${duration===15?'selected':''}>15 min</option><option value="30" ${duration===30?'selected':''}>30 min</option><option value="45" ${duration===45?'selected':''}>45 min</option><option value="60" ${duration===60?'selected':''}>60 min</option><option value="90" ${duration===90?'selected':''}>90 min</option><option value="120" ${duration===120?'selected':''}>2 hr</option></select>`}</div></div>`;
    }).join('');
    root.querySelectorAll('[data-service-enabled]').forEach(input=>input.addEventListener('change',()=>{
      const checked=[...root.querySelectorAll('[data-service-enabled]:checked')];
      if(checked.length>max){input.checked=false;toastMsg(`${planName()} allows ${max>=100?'up to 100':max} active ${isRequestOnly()?'request':'booking'} service${max===1?'':'s'}.`);}
    }));
    if(window.lucide)lucide.createIcons();
  }

  function formatActivityDate(row){
    const raw=row.start_at||row.preferred_start_at||row.created_at;
    if(!raw)return 'No date selected';
    try{return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:row.timezone||'America/New_York'}).format(new Date(raw));}catch(_){return new Date(raw).toLocaleString();}
  }

  function renderActivity(){
    const now=Date.now();
    $('#booking-upcoming-count').textContent=String(appointments.filter(a=>a.kind==='booking'&&a.status==='confirmed'&&new Date(a.start_at).getTime()>=now).length);
    $('#booking-request-count').textContent=String(appointments.filter(a=>a.kind==='request'&&a.status==='requested').length);
    const root=$('#booking-feed');
    if(!appointments.length){root.innerHTML='<div class="booking-empty"><i data-lucide="calendar-days" size="22"></i><br/>No client activity yet.</div>';if(window.lucide)lucide.createIcons();return;}
    root.innerHTML=appointments.map(row=>`<article class="booking-item" data-appointment-id="${esc(row.id)}"><div class="booking-item-top"><div><strong>${esc(row.customer_name)}</strong><div class="booking-item-meta"><span>${row.kind==='request'?'Service request':'Appointment'}</span><span>${esc(row.service_name||'General service')}</span><span>${esc(formatActivityDate(row))}</span></div></div><span class="booking-status ${esc(row.status)}">${esc(row.status)}</span></div><div class="booking-item-meta">${row.customer_phone?`<span>${esc(row.customer_phone)}</span>`:''}${row.customer_email?`<span>${esc(row.customer_email)}</span>`:''}</div>${row.message?`<p class="booking-item-message">${esc(row.message)}</p>`:''}<div class="booking-item-actions">${row.status!=='completed'&&row.status!=='cancelled'?'<button class="btn btn-light" data-status="completed" type="button"><i data-lucide="check" size="13"></i> Complete</button><button class="btn btn-light" data-status="cancelled" type="button"><i data-lucide="x" size="13"></i> Cancel</button>':''}${row.customer_phone?`<a class="btn btn-light" href="tel:${esc(row.customer_phone)}"><i data-lucide="phone" size="13"></i> Call</a>`:''}${row.customer_email?`<a class="btn btn-light" href="mailto:${esc(row.customer_email)}"><i data-lucide="mail" size="13"></i> Email</a>`:''}</div></article>`).join('');
    root.querySelectorAll('[data-status]').forEach(btn=>btn.addEventListener('click',async()=>{
      const article=btn.closest('[data-appointment-id]');
      await updateStatus(article.dataset.appointmentId,btn.dataset.status);
    }));
    if(window.lucide)lucide.createIcons();
  }

  async function updateStatus(id,status){
    try{
      const {error}=await supabaseClient.from('booking_appointments').update({status}).eq('id',id).eq('user_id',user.id);
      if(error)throw error;toastMsg(`Marked ${status}`);await loadActivity();
    }catch(error){toastMsg(error?.message||'Unable to update appointment');}
  }

  async function loadActivity(){
    if(!activeCard)return;
    const {data,error}=await supabaseClient.from('booking_appointments').select('*').eq('card_id',activeCard.id).eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);
    if(error)throw error;appointments=data||[];renderActivity();
  }

  function setValue(id,value,fallback=''){const el=$(id);if(!el)return;el.value=value??fallback;}
  function setTimezone(value){const select=$('#booking-timezone');const tz=value||'America/New_York';if(![...select.options].some(o=>o.value===tz)){const option=new Option(tz,tz);select.add(option);}select.value=tz;}

  async function loadCard(cardId){
    activeCard=cards.find(c=>String(c.id)===String(cardId))||cards[0]||null;
    if(!activeCard)return;
    $('#booking-card-select').value=activeCard.id;
    $('#booking-service-list').innerHTML='<div class="booking-empty">Loading services…</div>';
    $('#booking-feed').innerHTML='<div class="booking-empty">Loading activity…</div>';
    const [settingsResult,availabilityResult,servicesResult,serviceSettingsResult,appointmentResult]=await Promise.all([
      supabaseClient.from('booking_settings').select('*').eq('card_id',activeCard.id).maybeSingle(),
      supabaseClient.from('booking_availability').select('*').eq('card_id',activeCard.id).order('weekday'),
      supabaseClient.from('card_services').select('id,name,description,price_cents,payment_url,is_enabled,sort_order').eq('card_id',activeCard.id).eq('is_enabled',true).order('sort_order'),
      supabaseClient.from('booking_service_settings').select('*').eq('card_id',activeCard.id),
      supabaseClient.from('booking_appointments').select('*').eq('card_id',activeCard.id).eq('user_id',user.id).order('created_at',{ascending:false}).limit(100)
    ]);
    [settingsResult,availabilityResult,servicesResult,serviceSettingsResult,appointmentResult].forEach(result=>{if(result.error)throw result.error;});
    const settings=settingsResult.data||{};
    $('#booking-enabled').checked=Boolean(settings.enabled);
    setTimezone(settings.timezone);
    setValue('#booking-location-type',settings.location_type,'business');
    setValue('#booking-location-text',settings.location_text,'');
    setValue('#booking-min-notice',String(settings.min_notice_minutes??60),'60');
    setValue('#booking-days-ahead',String(settings.days_ahead??30),'30');
    setValue('#booking-buffer',String(settings.buffer_minutes??0),'0');
    availability=new Map((availabilityResult.data||[]).map(row=>[Number(row.weekday),row]));
    services=servicesResult.data||[];
    serviceSettings=new Map((serviceSettingsResult.data||[]).map(row=>[String(row.card_service_id),row]));
    appointments=appointmentResult.data||[];
    renderDays();renderServices();renderActivity();
  }

  async function save(){
    if(!activeCard)return;
    const button=$('#booking-save'),original=button.innerHTML;button.disabled=true;button.innerHTML='<i data-lucide="loader-circle" size="17"></i> Saving…';if(window.lucide)lucide.createIcons();
    try{
      const settings={card_id:activeCard.id,user_id:user.id,enabled:$('#booking-enabled').checked,timezone:$('#booking-timezone').value,location_type:$('#booking-location-type').value,location_text:$('#booking-location-text').value.trim()||null,min_notice_minutes:Number($('#booking-min-notice').value||60),days_ahead:Number($('#booking-days-ahead').value||30),buffer_minutes:Number($('#booking-buffer').value||0)};
      const {error:settingsError}=await supabaseClient.from('booking_settings').upsert(settings,{onConflict:'card_id'});if(settingsError)throw settingsError;
      if(!isRequestOnly()){
        const dayRows=[...document.querySelectorAll('.booking-day')].map(row=>({card_id:activeCard.id,user_id:user.id,weekday:Number(row.dataset.weekday),enabled:row.querySelector('[data-day-enabled]').checked,start_time:row.querySelector('[data-day-start]').value,end_time:row.querySelector('[data-day-end]').value}));
        const invalid=dayRows.find(row=>row.enabled&&(!row.start_time||!row.end_time||row.end_time<=row.start_time));if(invalid)throw new Error(`Check ${DAYS[invalid.weekday]} availability hours.`);
        const {error:dayError}=await supabaseClient.from('booking_availability').upsert(dayRows,{onConflict:'card_id,weekday'});if(dayError)throw dayError;
      }
      const serviceRows=[...document.querySelectorAll('.booking-service-row')].map(row=>({card_service_id:row.dataset.serviceId,card_id:activeCard.id,user_id:user.id,enabled:row.querySelector('[data-service-enabled]').checked,duration_minutes:Number(row.querySelector('[data-service-duration]')?.value||30)}));
      if(serviceRows.length){const {error:serviceError}=await supabaseClient.from('booking_service_settings').upsert(serviceRows,{onConflict:'card_service_id'});if(serviceError)throw serviceError;}
      toastMsg(isRequestOnly()?'Service request form saved':'Booking setup saved');
      await loadCard(activeCard.id);
    }catch(error){console.error('LIW booking save:',error);toastMsg(error?.message||'Unable to save booking setup');}
    finally{button.disabled=false;button.innerHTML=original;if(window.lucide)lucide.createIcons();}
  }

  async function init(){
    try{
      user=await requireUser();if(!user)return;
      access=await getLiwAccessContext(user,{refresh:true});planKey=String(access?.planKey||'starter').toLowerCase();renderPlan();
      const {data,error}=await supabaseClient.from('digital_cards').select('id,slug,full_name,company_name,internal_label,status,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false});if(error)throw error;cards=data||[];
      const select=$('#booking-card-select');
      if(!cards.length){select.innerHTML='<option value="">No cards yet</option>';select.disabled=true;$('#booking-service-list').innerHTML='<div class="booking-empty">Create a card first.</div>';$('#booking-feed').innerHTML='<div class="booking-empty">No card selected.</div>';$('#booking-save').disabled=true;return;}
      select.innerHTML=cards.map(card=>`<option value="${esc(card.id)}">${esc(cardLabel(card))}${card.status==='published'?'':' · Draft'}</option>`).join('');
      const requested=new URLSearchParams(location.search).get('card');
      select.addEventListener('change',()=>loadCard(select.value).catch(handleError));
      $('#booking-save').addEventListener('click',save);$('#booking-refresh').addEventListener('click',()=>loadActivity().catch(handleError));
      await loadCard(cards.some(c=>String(c.id)===String(requested))?requested:cards[0].id);
      if(window.lucide)lucide.createIcons();
    }catch(error){handleError(error);}
  }
  function handleError(error){console.error('LIW booking v1:',error);toastMsg(error?.message||'Unable to load appointments');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
