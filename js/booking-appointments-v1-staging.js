/* LIW Cards — Booking / Appointments V1 staging */
(function(){
  'use strict';

  const $=selector=>document.querySelector(selector);
  const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let user=null;
  let access=null;
  let planKey='starter';
  let cards=[];
  let activeCard=null;
  let services=[];
  let allServiceRows=[];
  let previousCandidates=[];
  let serviceSettings=new Map();
  let availability=new Map();
  let appointments=[];

  function esc(value){
    return typeof escapeHtml==='function'
      ? escapeHtml(String(value??''))
      : String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function normalize(value){return String(value??'').trim().toLowerCase();}
  function cleanUrl(value){return String(value||'').trim()||null;}
  function priceToCents(value){
    if(String(value||'').trim()==='')return null;
    const amount=Number(String(value).replace(/[^0-9.]/g,''));
    return Number.isFinite(amount)&&amount>=0?Math.round(amount*100):null;
  }
  function planName(){return ({starter:'Free',free:'Free',lite:'Lite',plus:'Plus',pro:'Pro',agency:'Agency Starter',white_label:'Agency Pro'})[planKey]||'Free';}
  function isRequestOnly(){return ['starter','free'].includes(planKey);}
  function serviceLimit(){if(isRequestOnly())return 8;if(planKey==='lite')return 1;if(planKey==='plus')return 5;return 100;}
  function isProPlus(){return ['pro','agency','white_label'].includes(planKey)||(access?.isAdmin&&!access?.isPlanPreview);}
  function cardLabel(card){return card?.internal_label||card?.company_name||card?.full_name||'Untitled card';}
  function cardById(id){return cards.find(card=>String(card.id)===String(id))||null;}
  function money(cents){if(cents==null)return '';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents)/100);}
  function toastMsg(message){if(typeof toast==='function')toast(message);}
  function serviceSignature(row){return JSON.stringify([normalize(row?.name),normalize(row?.description),Number(row?.price_cents??-1),normalize(row?.payment_url)]);}
  function enabledServiceCount(){return [...serviceSettings.values()].filter(row=>row.enabled).length;}

  function renderDays(){
    const root=$('#booking-days');
    if(!root)return;
    root.innerHTML=DAYS.map((name,weekday)=>{
      const row=availability.get(weekday)||{weekday,enabled:weekday>=1&&weekday<=5,start_time:'09:00:00',end_time:'17:00:00'};
      const start=String(row.start_time||'09:00').slice(0,5);
      const end=String(row.end_time||'17:00').slice(0,5);
      return `<div class="booking-day" data-weekday="${weekday}"><label class="booking-day-name"><input type="checkbox" data-day-enabled ${row.enabled?'checked':''}/> <span>${name}</span></label><input class="input" data-day-start type="time" value="${esc(start)}"/><span class="booking-day-sep">to</span><input class="input" data-day-end type="time" value="${esc(end)}"/></div>`;
    }).join('');
  }

  function renderPlan(){
    const limit=serviceLimit();
    $('#booking-plan-pill').innerHTML=`<i data-lucide="sparkles" size="14"></i><span>${esc(planName())}</span>`;
    const paymentWrap=$('#booking-new-service-payment-wrap');
    if(paymentWrap)paymentWrap.hidden=!isProPlus();
    if(isRequestOnly()){
      $('#booking-hero-title').textContent='Collect service requests from your card';
      $('#booking-hero-copy').textContent='Free includes a simple request form. Clients choose a service, preferred date/time, and send their contact details. You confirm the appointment yourself.';
      $('#booking-mode-copy').textContent='Request mode — no live calendar slots or automatic confirmation.';
      $('#paid-scheduling-settings').hidden=true;
      $('#booking-limit-note').innerHTML='<strong>Free:</strong> add or reuse services below. Clients send preferred times as requests; no time is reserved automatically.';
    }else{
      $('#booking-hero-title').textContent='Let clients book confirmed time slots';
      $('#booking-hero-copy').textContent=planKey==='lite'?'Lite includes live booking for 1 service.':'Clients can choose a service and reserve an open time from your weekly availability.';
      $('#booking-mode-copy').textContent='Live booking mode — booked times are blocked automatically.';
      $('#paid-scheduling-settings').hidden=false;
      const label=limit>=100?'unlimited services':`${limit} bookable service${limit===1?'':'s'}`;
      $('#booking-limit-note').innerHTML=`<strong>${esc(planName())}:</strong> ${label}. Add a new service or reuse one from another card.${isProPlus()?' Pro can optionally send clients to an external payment link after booking. LIW does not process or verify that payment.':''}`;
    }
    if(window.lucide)lucide.createIcons();
  }

  function renderServices(){
    const root=$('#booking-service-list');
    if(!root)return;
    if(!services.length){
      root.innerHTML='<div class="booking-empty booking-service-empty"><i data-lucide="briefcase-business" size="22"></i><strong>No services on this card yet.</strong><span>Use <b>Add service</b> or <b>Use previous</b> above.</span></div>';
      if(window.lucide)lucide.createIcons();
      return;
    }
    const max=serviceLimit();
    root.innerHTML=services.map((service,index)=>{
      const saved=serviceSettings.get(String(service.id));
      const enabled=saved?saved.enabled:index<max;
      const duration=Number(saved?.duration_minutes||30);
      const pay=isProPlus()&&service.payment_url?'<small class="booking-payment-ready"><i data-lucide="external-link" size="11"></i> External payment link ready</small>':'';
      return `<div class="booking-service-row" data-service-id="${esc(service.id)}"><div class="booking-service-copy"><strong>${esc(service.name)}</strong><small>${service.price_cents!=null?`${esc(money(service.price_cents))} · `:''}${esc(service.description||'Service')}</small>${pay}</div><div class="booking-service-controls"><label class="booking-use-service"><input data-service-enabled type="checkbox" ${enabled?'checked':''}/> <span>Use</span></label>${isRequestOnly()?'':`<select class="input" data-service-duration aria-label="Duration for ${esc(service.name)}"><option value="15" ${duration===15?'selected':''}>15 min</option><option value="30" ${duration===30?'selected':''}>30 min</option><option value="45" ${duration===45?'selected':''}>45 min</option><option value="60" ${duration===60?'selected':''}>60 min</option><option value="90" ${duration===90?'selected':''}>90 min</option><option value="120" ${duration===120?'selected':''}>2 hr</option></select>`}</div></div>`;
    }).join('');
    root.querySelectorAll('[data-service-enabled]').forEach(input=>input.addEventListener('change',()=>{
      const checked=[...root.querySelectorAll('[data-service-enabled]:checked')];
      if(checked.length>max){
        input.checked=false;
        toastMsg(`${planName()} allows ${max>=100?'up to 100':max} active ${isRequestOnly()?'request':'booking'} service${max===1?'':'s'}.`);
      }
    }));
    if(window.lucide)lucide.createIcons();
  }

  function formatActivityDate(row){
    const raw=row.start_at||row.preferred_start_at||row.created_at;
    if(!raw)return 'No date selected';
    try{return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:row.timezone||'America/New_York'}).format(new Date(raw));}
    catch(_){return new Date(raw).toLocaleString();}
  }

  function renderActivity(){
    const now=Date.now();
    $('#booking-upcoming-count').textContent=String(appointments.filter(row=>row.kind==='booking'&&row.status==='confirmed'&&new Date(row.start_at).getTime()>=now).length);
    $('#booking-request-count').textContent=String(appointments.filter(row=>row.kind==='request'&&row.status==='requested').length);
    const root=$('#booking-feed');
    if(!appointments.length){
      root.innerHTML='<div class="booking-empty"><i data-lucide="calendar-days" size="22"></i><br/>No client activity yet.</div>';
      if(window.lucide)lucide.createIcons();
      return;
    }
    root.innerHTML=appointments.map(row=>`<article class="booking-item" data-appointment-id="${esc(row.id)}"><div class="booking-item-top"><div><strong>${esc(row.customer_name)}</strong><div class="booking-item-meta"><span>${row.kind==='request'?'Service request':'Appointment'}</span><span>${esc(row.service_name||'General service')}</span><span>${esc(formatActivityDate(row))}</span></div></div><span class="booking-status ${esc(row.status)}">${esc(row.status)}</span></div><div class="booking-item-meta">${row.customer_phone?`<span>${esc(row.customer_phone)}</span>`:''}${row.customer_email?`<span>${esc(row.customer_email)}</span>`:''}</div>${row.message?`<p class="booking-item-message">${esc(row.message)}</p>`:''}<div class="booking-item-actions">${row.status!=='completed'&&row.status!=='cancelled'?'<button class="btn btn-light" data-status="completed" type="button"><i data-lucide="check" size="13"></i> Complete</button><button class="btn btn-light" data-status="cancelled" type="button"><i data-lucide="x" size="13"></i> Cancel</button>':''}${row.customer_phone?`<a class="btn btn-light" href="tel:${esc(row.customer_phone)}"><i data-lucide="phone" size="13"></i> Call</a>`:''}${row.customer_email?`<a class="btn btn-light" href="mailto:${esc(row.customer_email)}"><i data-lucide="mail" size="13"></i> Email</a>`:''}</div></article>`).join('');
    root.querySelectorAll('[data-status]').forEach(button=>button.addEventListener('click',async()=>{
      const article=button.closest('[data-appointment-id]');
      await updateStatus(article.dataset.appointmentId,button.dataset.status);
    }));
    if(window.lucide)lucide.createIcons();
  }

  async function updateStatus(id,status){
    try{
      const {error}=await supabaseClient.from('booking_appointments').update({status}).eq('id',id).eq('user_id',user.id);
      if(error)throw error;
      toastMsg(`Marked ${status}`);
      await loadActivity();
    }catch(error){toastMsg(error?.message||'Unable to update appointment');}
  }

  async function loadActivity(){
    if(!activeCard)return;
    const {data,error}=await supabaseClient.from('booking_appointments').select('*').eq('card_id',activeCard.id).eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);
    if(error)throw error;
    appointments=data||[];
    renderActivity();
  }

  function setValue(selector,value,fallback=''){
    const element=$(selector);
    if(element)element.value=value??fallback;
  }
  function setTimezone(value){
    const select=$('#booking-timezone');
    const timezone=value||'America/New_York';
    if(![...select.options].some(option=>option.value===timezone))select.add(new Option(timezone,timezone));
    select.value=timezone;
  }

  async function refreshServiceLibrary(){
    if(!cards.length){allServiceRows=[];return;}
    const ids=cards.map(card=>card.id);
    const {data,error}=await supabaseClient.from('card_services')
      .select('id,card_id,name,description,price_cents,currency,image_url,booking_url,payment_url,cta_label,is_enabled,sort_order')
      .in('card_id',ids)
      .eq('is_enabled',true)
      .order('created_at',{ascending:false});
    if(error)throw error;
    allServiceRows=data||[];
  }

  function buildPreviousCandidates(){
    const currentSignatures=new Set(services.map(serviceSignature));
    const seen=new Set();
    previousCandidates=[];
    allServiceRows.forEach(row=>{
      if(String(row.card_id)===String(activeCard?.id))return;
      const signature=serviceSignature(row);
      if(currentSignatures.has(signature)||seen.has(signature))return;
      seen.add(signature);
      previousCandidates.push(row);
    });
    return previousCandidates;
  }

  function renderPreviousServices(){
    const root=$('#booking-previous-service-list');
    const items=buildPreviousCandidates();
    if(!items.length){
      root.innerHTML='<div class="booking-empty">No previous services are available to copy. Create a new service instead.</div>';
      $('#booking-add-previous-services').disabled=true;
      return;
    }
    $('#booking-add-previous-services').disabled=false;
    root.innerHTML=items.map((row,index)=>{
      const source=cardById(row.card_id);
      return `<label class="booking-previous-row"><input type="checkbox" value="${index}"/><span><strong>${esc(row.name)}</strong><small>${row.price_cents!=null?`${esc(money(row.price_cents))} · `:''}${esc(row.description||'Service')}</small><em>From ${esc(cardLabel(source))}</em></span></label>`;
    }).join('');
  }

  function showDialogView(mode){
    const dialog=$('#booking-service-dialog');
    const newView=$('#booking-new-service-view');
    const previousView=$('#booking-previous-service-view');
    const title=$('#booking-service-dialog-title');
    const copy=$('#booking-service-dialog-copy');
    const previous=mode==='previous';
    newView.hidden=previous;
    previousView.hidden=!previous;
    title.textContent=previous?'Use previous services':'Add a service';
    copy.textContent=previous?'Select services you already created on another card.':'Create a service directly for the selected card.';
    if(previous)renderPreviousServices();
    $('#booking-new-service-error').hidden=true;
    $('#booking-previous-service-error').hidden=true;
    if(!dialog.open)dialog.showModal();
    if(window.lucide)lucide.createIcons();
  }

  function closeServiceDialog(){
    const dialog=$('#booking-service-dialog');
    if(dialog?.open)dialog.close();
  }

  function dialogError(selector,message){
    const box=$(selector);
    if(!box)return;
    box.textContent=message;
    box.hidden=!message;
  }

  async function createService(event){
    event.preventDefault();
    if(!activeCard)return;
    const name=$('#booking-new-service-name').value.trim();
    if(!name){dialogError('#booking-new-service-error','Add a service name.');return;}
    const price_cents=priceToCents($('#booking-new-service-price').value);
    const description=$('#booking-new-service-description').value.trim()||null;
    const payment_url=isProPlus()?cleanUrl($('#booking-new-service-payment').value):null;
    const button=$('#booking-create-service');
    const original=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<i data-lucide="loader-circle" size="15"></i> Adding…';
    dialogError('#booking-new-service-error','');
    if(window.lucide)lucide.createIcons();
    try{
      const {data,error}=await supabaseClient.from('card_services').insert({
        card_id:activeCard.id,
        name,
        description,
        price_cents,
        currency:'usd',
        payment_url,
        cta_label:'Learn more',
        is_enabled:true,
        sort_order:services.length
      }).select('id').single();
      if(error)throw error;
      const enableForBooking=enabledServiceCount()<serviceLimit();
      const {error:settingError}=await supabaseClient.from('booking_service_settings').upsert({
        card_service_id:data.id,
        card_id:activeCard.id,
        user_id:user.id,
        enabled:enableForBooking,
        duration_minutes:30
      },{onConflict:'card_service_id'});
      if(settingError)throw settingError;
      await supabaseClient.from('digital_cards').update({services_enabled:true}).eq('id',activeCard.id).eq('user_id',user.id);
      $('#booking-new-service-form').reset();
      closeServiceDialog();
      await refreshServiceLibrary();
      await loadCard(activeCard.id);
      toastMsg(enableForBooking?'Service added and selected':'Service added. Choose which services to use, then save.');
    }catch(error){dialogError('#booking-new-service-error',error?.message||'Unable to add this service.');}
    finally{
      button.disabled=false;
      button.innerHTML=original;
      if(window.lucide)lucide.createIcons();
    }
  }

  async function addPreviousServices(){
    if(!activeCard)return;
    const indexes=[...document.querySelectorAll('#booking-previous-service-list input:checked')].map(input=>Number(input.value)).filter(Number.isInteger);
    const selected=indexes.map(index=>previousCandidates[index]).filter(Boolean);
    if(!selected.length){dialogError('#booking-previous-service-error','Select at least one previous service.');return;}
    const button=$('#booking-add-previous-services');
    const original=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<i data-lucide="loader-circle" size="15"></i> Adding…';
    dialogError('#booking-previous-service-error','');
    if(window.lucide)lucide.createIcons();
    try{
      const baseSort=services.length;
      const inserts=selected.map((row,index)=>({
        card_id:activeCard.id,
        name:row.name,
        description:row.description||null,
        price_cents:row.price_cents,
        currency:row.currency||'usd',
        image_url:row.image_url||null,
        booking_url:row.booking_url||null,
        payment_url:isProPlus()?row.payment_url||null:null,
        cta_label:row.cta_label||'Learn more',
        is_enabled:true,
        sort_order:baseSort+index
      }));
      const {data,error}=await supabaseClient.from('card_services').insert(inserts).select('id');
      if(error)throw error;
      let availableSlots=Math.max(0,serviceLimit()-enabledServiceCount());
      const settings=(data||[]).map(row=>{
        const enabled=availableSlots>0;
        if(enabled)availableSlots-=1;
        return {card_service_id:row.id,card_id:activeCard.id,user_id:user.id,enabled,duration_minutes:30};
      });
      if(settings.length){
        const {error:settingError}=await supabaseClient.from('booking_service_settings').upsert(settings,{onConflict:'card_service_id'});
        if(settingError)throw settingError;
      }
      await supabaseClient.from('digital_cards').update({services_enabled:true}).eq('id',activeCard.id).eq('user_id',user.id);
      closeServiceDialog();
      await refreshServiceLibrary();
      await loadCard(activeCard.id);
      toastMsg(`${selected.length} previous service${selected.length===1?'':'s'} added. Review Use selections and save.`);
    }catch(error){dialogError('#booking-previous-service-error',error?.message||'Unable to add selected services.');}
    finally{
      button.disabled=false;
      button.innerHTML=original;
      if(window.lucide)lucide.createIcons();
    }
  }

  async function loadCard(cardId){
    activeCard=cards.find(card=>String(card.id)===String(cardId))||cards[0]||null;
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
    renderDays();
    renderServices();
    renderActivity();
  }

  async function save(){
    if(!activeCard)return;
    const button=$('#booking-save');
    const original=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<i data-lucide="loader-circle" size="17"></i> Saving…';
    if(window.lucide)lucide.createIcons();
    try{
      const settings={
        card_id:activeCard.id,
        user_id:user.id,
        enabled:$('#booking-enabled').checked,
        timezone:$('#booking-timezone').value,
        location_type:$('#booking-location-type').value,
        location_text:$('#booking-location-text').value.trim()||null,
        min_notice_minutes:Number($('#booking-min-notice').value||60),
        days_ahead:Number($('#booking-days-ahead').value||30),
        buffer_minutes:Number($('#booking-buffer').value||0)
      };
      const {error:settingsError}=await supabaseClient.from('booking_settings').upsert(settings,{onConflict:'card_id'});
      if(settingsError)throw settingsError;
      if(!isRequestOnly()){
        const dayRows=[...document.querySelectorAll('.booking-day')].map(row=>({
          card_id:activeCard.id,
          user_id:user.id,
          weekday:Number(row.dataset.weekday),
          enabled:row.querySelector('[data-day-enabled]').checked,
          start_time:row.querySelector('[data-day-start]').value,
          end_time:row.querySelector('[data-day-end]').value
        }));
        const invalid=dayRows.find(row=>row.enabled&&(!row.start_time||!row.end_time||row.end_time<=row.start_time));
        if(invalid)throw new Error(`Check ${DAYS[invalid.weekday]} availability hours.`);
        const {error:dayError}=await supabaseClient.from('booking_availability').upsert(dayRows,{onConflict:'card_id,weekday'});
        if(dayError)throw dayError;
      }
      const serviceRows=[...document.querySelectorAll('.booking-service-row')].map(row=>({
        card_service_id:row.dataset.serviceId,
        card_id:activeCard.id,
        user_id:user.id,
        enabled:row.querySelector('[data-service-enabled]').checked,
        duration_minutes:Number(row.querySelector('[data-service-duration]')?.value||30)
      }));
      const activeCount=serviceRows.filter(row=>row.enabled).length;
      if(activeCount>serviceLimit())throw new Error(`${planName()} allows ${serviceLimit()} active service${serviceLimit()===1?'':'s'}.`);
      if(serviceRows.length){
        const {error:serviceError}=await supabaseClient.from('booking_service_settings').upsert(serviceRows,{onConflict:'card_service_id'});
        if(serviceError)throw serviceError;
      }
      toastMsg(isRequestOnly()?'Service request setup saved':'Booking setup saved');
      await loadCard(activeCard.id);
    }catch(error){
      console.error('LIW booking save:',error);
      toastMsg(error?.message||'Unable to save booking setup');
    }finally{
      button.disabled=false;
      button.innerHTML=original;
      if(window.lucide)lucide.createIcons();
    }
  }

  function wireServiceDialog(){
    $('#booking-add-service')?.addEventListener('click',()=>showDialogView('new'));
    $('#booking-use-previous')?.addEventListener('click',async()=>{
      try{await refreshServiceLibrary();showDialogView('previous');}
      catch(error){toastMsg(error?.message||'Unable to load previous services');}
    });
    $('#booking-service-dialog-close')?.addEventListener('click',closeServiceDialog);
    document.querySelectorAll('[data-booking-dialog-cancel]').forEach(button=>button.addEventListener('click',closeServiceDialog));
    $('#booking-new-service-form')?.addEventListener('submit',createService);
    $('#booking-add-previous-services')?.addEventListener('click',addPreviousServices);
    $('#booking-service-dialog')?.addEventListener('click',event=>{
      if(event.target===event.currentTarget)closeServiceDialog();
    });
  }

  async function init(){
    try{
      user=await requireUser();
      if(!user)return;
      access=await getLiwAccessContext(user,{refresh:true});
      planKey=String(access?.planKey||'starter').toLowerCase();
      renderPlan();
      const {data,error}=await supabaseClient.from('digital_cards').select('id,slug,full_name,company_name,internal_label,status,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false});
      if(error)throw error;
      cards=data||[];
      const select=$('#booking-card-select');
      if(!cards.length){
        select.innerHTML='<option value="">No cards yet</option>';
        select.disabled=true;
        $('#booking-service-list').innerHTML='<div class="booking-empty">Create a card first.</div>';
        $('#booking-feed').innerHTML='<div class="booking-empty">No card selected.</div>';
        $('#booking-save').disabled=true;
        $('#booking-add-service').disabled=true;
        $('#booking-use-previous').disabled=true;
        return;
      }
      select.innerHTML=cards.map(card=>`<option value="${esc(card.id)}">${esc(cardLabel(card))}${card.status==='published'?'':' · Draft'}</option>`).join('');
      const requested=new URLSearchParams(location.search).get('card');
      select.addEventListener('change',()=>loadCard(select.value).catch(handleError));
      $('#booking-save').addEventListener('click',save);
      $('#booking-refresh').addEventListener('click',()=>loadActivity().catch(handleError));
      wireServiceDialog();
      await refreshServiceLibrary();
      await loadCard(cards.some(card=>String(card.id)===String(requested))?requested:cards[0].id);
      if(window.lucide)lucide.createIcons();
    }catch(error){handleError(error);}
  }

  function handleError(error){
    console.error('LIW booking v1:',error);
    toastMsg(error?.message||'Unable to load appointments');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
