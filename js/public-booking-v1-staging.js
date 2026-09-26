/* LIW Cards — Public Booking / Appointments V1 staging */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_BOOKING_V1__)return;
  window.__LIW_PUBLIC_BOOKING_V1__=true;

  const slug=new URLSearchParams(location.search).get('slug');
  const $=selector=>document.querySelector(selector);
  let bootstrap=null;
  let selectedServiceId=null;
  let selectedSlot=null;
  let realtorContext=null;
  let bootstrapReady=false;
  let slotRequestId=0;
  let showingDaysRequestId=0;
  let showingDaySlots=new Map();
  let shownShowingDates=[];

  function esc(value){
    return typeof escapeHtml==='function'
      ? escapeHtml(String(value??''))
      : String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function money(cents){
    if(cents==null)return '';
    try{return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents)/100);}catch(_){return '';}
  }
  function isStaging(){return location.hostname==='liwworgsinc.github.io'&&location.pathname.includes('/cards-staging/');}
  function qaPlan(){
    if(!isStaging())return null;
    try{
      const value=String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();
      return ['starter','lite','plus','pro','agency','white_label'].includes(value)?value:null;
    }catch(_){return null;}
  }
  function planServiceLimit(plan){
    if(plan==='lite')return 1;
    if(plan==='plus')return 5;
    if(['pro','agency','white_label'].includes(plan))return 100;
    return 8;
  }
  function effectiveBootstrap(data){
    const preview=qaPlan();
    if(!preview)return data;
    const requestMode=preview==='starter';
    return {
      ...data,
      mode:requestMode?'request':'booking',
      plan:preview,
      service_limit:planServiceLimit(preview),
      services:Array.isArray(data.services)?data.services.slice(0,planServiceLimit(preview)):[]
    };
  }
  function todayLocal(){
    const d=new Date();
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function addDaysLocal(days){
    const d=new Date();d.setDate(d.getDate()+Number(days||30));
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  // The existing booking RPC formats timestamps with escaped quotes around T and
  // timezone offsets like +00. Normalize at the staging boundary before Date parsing
  // or sending a selected slot back to PostgREST.
  function normalizeBookingTimestamp(raw){
    const input=String(raw??'').trim();
    const clean=input.replace(/\\?"T\\?"/g,'T')
      .replace(/([+-]\d{2})(?::?(\d{2}))?$/,(_,hours,minutes)=>hours+':'+(minutes||'00'));
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(clean))return '';
    const timestamp=Date.parse(clean);
    return Number.isFinite(timestamp)?new Date(timestamp).toISOString():'';
  }
  function prettyConfirmed(raw,timeZone){
    const iso=normalizeBookingTimestamp(raw);
    if(!iso)return '';
    try{
      return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:timeZone||'America/New_York'}).format(new Date(iso));
    }catch(_){return new Date(iso).toLocaleString();}
  }
  function updateSelection(controls,value){
    controls.forEach(button=>{
      const active=String(button.dataset.bookingService||button.dataset.bookingSlot||'')===String(value||'');
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function businessToday(){
    try{
      const parts=new Intl.DateTimeFormat('en-US',{timeZone:bootstrap?.timezone||'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
      const get=key=>parts.find(part=>part.type===key)?.value;
      return `${get('year')}-${get('month')}-${get('day')}`;
    }catch(_){return todayLocal();}
  }
  function addDaysBusiness(days){
    const [year,month,day]=businessToday().split('-').map(Number);
    return new Date(Date.UTC(year,month-1,day+Number(days||30),12)).toISOString().slice(0,10);
  }

  function candidateShowingDates(){
    const days=realtorContext?.days||{};
    const [year,month,day]=businessToday().split('-').map(Number);
    const max=Math.max(0,Math.min(60,Number(bootstrap?.days_ahead||30)));
    const dates=[];
    for(let offset=0;offset<=max;offset++){
      const date=new Date(Date.UTC(year,month-1,day+offset,12));
      const rule=days[String(date.getUTCDay())];
      if(!rule?.enabled||!rule.start||!rule.end||rule.end<=rule.start)continue;
      dates.push(date.toISOString().slice(0,10));
    }
    return dates.slice(0,28);
  }
  function dateChoicesMarkup(){
    return `<div class="liw-showing-date-panel"><div class="liw-showing-section-heading"><span class="liw-showing-number">01</span><div><strong>Choose a day</strong><small>Only dates with available showing times appear.</small></div></div>
      <div class="public-booking-day-scroll" id="booking-v1-day-choices" role="group" aria-label="Available showing dates"><span class="liw-showing-loading">Checking available days…</span></div></div>`;
  }
  function formatShowingDate(value,long=false){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';
    const date=new Date(value+'T12:00:00Z');
    return new Intl.DateTimeFormat('en-US',long
      ?{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}
      :{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(date);
  }
  function updateDateChoices(){
    const chosen=$('#booking-v1-date')?.value||'';
    document.querySelectorAll('#booking-v1-day-choices [data-booking-date]').forEach(button=>{
      const active=button.dataset.bookingDate===chosen;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }
  function updateShowingSummary(){
    const box=$('#booking-v1-summary');if(!box||!realtorContext)return;
    const date=$('#booking-v1-date')?.value;
    const slot=$('#booking-v1-slots [data-booking-slot].active');
    const when=date?formatShowingDate(date):'Choose a day';
    const time=slot?.textContent?.replace(/\s*✓\s*$/,'').trim()||'Choose an available time';
    box.innerHTML=`<div class="liw-showing-summary-top"><span>Your showing</span><span class="liw-showing-summary-state">${selectedSlot?'Ready to book':'Select a time'}</span></div>
      <strong>${esc(realtorContext.address)}</strong><p><i data-lucide="calendar-check-2" size="15"></i> ${esc(when)} <span aria-hidden="true">·</span> ${esc(time)}</p>`;
    if(window.lucide)try{lucide.createIcons({nodes:[box]});}catch(_){}
  }
  function updateShowingSubmit(){
    if(!realtorContext)return;
    const button=$('#booking-v1-submit');
    if(button&&!button.dataset.submitting)button.disabled=!(selectedSlot&&$('#booking-v1-date')?.value);
  }
  function wireDateChoices(){
    document.querySelectorAll('#booking-v1-day-choices [data-booking-date]').forEach(button=>button.addEventListener('click',()=>{
      const input=$('#booking-v1-date');if(!input)return;
      input.value=button.dataset.bookingDate;
      updateDateChoices();
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }));
  }
  function renderShowingDates(){
    const root=$('#booking-v1-day-choices');if(!root)return;
    if(!shownShowingDates.length){
      root.innerHTML='<span class="liw-showing-loading">Checking available days…</span>';return;
    }
    root.innerHTML=shownShowingDates.map(value=>{
      const date=new Date(value+'T12:00:00Z');
      const weekday=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(date);
      const month=new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(date);
      return `<button type="button" class="public-booking-date-choice" data-booking-date="${esc(value)}" aria-pressed="false" aria-label="${esc(formatShowingDate(value,true))}"><span>${esc(weekday)}</span><strong>${date.getUTCDate()}</strong><small>${esc(month)}</small></button>`;
    }).join('');
    wireDateChoices();updateDateChoices();
  }
  async function loadRealtorDays(){
    if(!realtorContext||bootstrap?.mode!=='booking')return;
    const token=++showingDaysRequestId;
    const context=realtorContext;
    const root=$('#booking-v1-day-choices');
    const dates=candidateShowingDates();
    shownShowingDates=[];showingDaySlots=new Map();
    if(!root)return;
    if(!dates.length){
      root.innerHTML='<div class="liw-showing-empty">This property does not have viewing days set up yet. Use Ask About It to contact the Realtor.</div>';
      return;
    }
    let errors=0;
    let fatalReason='';
    for(let start=0;start<dates.length&&shownShowingDates.length<14&&!fatalReason;start+=6){
      const batch=dates.slice(start,start+6);
      const probes=await Promise.all(batch.map(async date=>{
        try{
          const {data,error}=await window.supabaseClient.rpc('realtor_showing_slots_staging',{p_slug:slug,p_listing_id:context.id,p_date:date});
          if(error)throw error;
          if(!data?.ok)return {date,slots:[],fatal:String(data?.reason||'booking_disabled')};
          return {date,slots:Array.isArray(data.slots)?data.slots:[]};
        }catch(error){errors++;console.warn('LIW showing day availability:',error);return {date,slots:[]};}
      }));
      if(token!==showingDaysRequestId||context!==realtorContext||$('#booking-v1-day-choices')!==root)return;
      const fatal=probes.find(probe=>probe.fatal);
      if(fatal){
        fatalReason=({showing_disabled:'This Realtor has not enabled online showings.',booking_disabled:'Online booking has not been enabled.',service_unavailable:'The Property Showing service is not ready.',listing_unavailable:'This listing is not available for showings.',request_only:'Please contact the Realtor to request a viewing.',invalid_showing_hours:'The listing’s available hours need an update.'})[fatal.fatal]||'This property cannot be booked online yet.';
        break;
      }
      for(const probe of probes){
        const slots=probe.slots.filter(slot=>normalizeBookingTimestamp(slot.start_at));
        if(!slots.length)continue;
        showingDaySlots.set(probe.date,slots);
        if(shownShowingDates.length<14)shownShowingDates.push(probe.date);
      }
      if(shownShowingDates.length){
        renderShowingDates();
        if(!$('#booking-v1-date')?.value){
          const input=$('#booking-v1-date');if(!input)return;
          input.value=shownShowingDates[0];
          updateDateChoices();
          loadSlots({resetSelection:true});
        }
      }
    }
    if(token!==showingDaysRequestId||context!==realtorContext||$('#booking-v1-day-choices')!==root)return;
    if(fatalReason){
      root.innerHTML='<div class="liw-showing-empty">'+esc(fatalReason)+' Please use Ask About It to contact the Realtor.</div>';
      const slots=$('#booking-v1-slots');if(slots)slots.innerHTML='<span class="public-booking-empty">Showing times are unavailable for this property.</span>';
      return;
    }
    if(!shownShowingDates.length){
      root.innerHTML='<div class="liw-showing-empty">'+(errors===dates.length?'Unable to check showing times. Please try again.':'No available showing dates right now. You can still ask the Realtor about this property.')+'</div>';
      if(errors===dates.length)root.innerHTML+='<button type="button" class="liw-showing-retry" id="booking-v1-retry-days">Try again</button>';
      $('#booking-v1-retry-days')?.addEventListener('click',loadRealtorDays);
      const slots=$('#booking-v1-slots');if(slots)slots.innerHTML='<span class="public-booking-empty">No available slots yet.</span>';
    }
  }
  function serviceById(id){return (bootstrap?.services||[]).find(service=>String(service.id)===String(id))||null;}
  function selectedService(){return serviceById(selectedServiceId);}

  function mountSection(){
    const existing=$('#booking-v1-section');
    const realtorHost=$('#realtor-booking-dialog-body');
    if(existing){if(realtorHost&&existing.parentElement!==realtorHost)realtorHost.appendChild(existing);return existing;}
    const section=document.createElement('section');
    section.className='public-section public-booking-v1';
    section.id='booking-v1-section';
    const servicesSection=$('#services-section');
    const productsSection=$('#products-section');
    if(realtorHost)realtorHost.appendChild(section);
    else if(servicesSection?.parentNode)servicesSection.insertAdjacentElement('afterend',section);
    else if(productsSection?.parentNode)productsSection.insertAdjacentElement('beforebegin',section);
    else $('#branding')?.insertAdjacentElement('beforebegin',section);
    return section;
  }

  function serviceCards(){
    const services=Array.isArray(bootstrap.services)?bootstrap.services:[];
    if(realtorContext){const service=selectedService();return `<div class="liw-showing-intro"><span>PRIVATE PROPERTY TOUR</span><strong>Choose a time that works for you.</strong><small><i data-lucide="clock-3" size="14"></i> ${Number(service?.duration_minutes||30)}-minute showing · ${esc(bootstrap.timezone||'America/New_York').replace('America/','').replaceAll('_',' ')}</small></div>`;}
    if(!services.length){
      if(bootstrap.mode==='request')return '<div class="public-booking-empty">Tell the card owner what service you need below.</div>';
      return '<div class="public-booking-empty">No bookable services are available yet.</div>';
    }
    return `<div class="public-booking-service-grid">${services.map((service,index)=>{
      const duration=bootstrap.mode==='booking'?` · ${Number(service.duration_minutes||30)} min`:'';
      const price=service.price_cents!=null?`<span class="service-price">${esc(money(service.price_cents))}</span>`:'';
      return `<button class="public-booking-service${String(selectedServiceId)===String(service.id)?' active':''}" type="button" aria-pressed="${String(selectedServiceId)===String(service.id)}" data-booking-service="${esc(service.id)}"><span><strong>${esc(service.name||'Service')}</strong><small>${esc(service.description||'Choose this service')}${duration}</small></span>${price}</button>`;
    }).join('')}</div>`;
  }

  function withPropertyContext(value){
    const note=String(value||'').trim().slice(0,700);
    if(!realtorContext)return note||null;
    return [`Property: ${realtorContext.address}`,`Listing ID: ${realtorContext.id}`,note].filter(Boolean).join('\n');
  }
  function requestMarkup(){
    const hasServices=(bootstrap.services||[]).length>0;
    return `<div class="public-section-heading"><h2>${realtorContext?'Request a Showing':'Request service'}</h2><span>Tell me what you need</span></div>
      <div class="public-booking-shell">${serviceCards()}
      <form class="public-booking-form" id="booking-v1-form" novalidate>
        <div class="public-booking-row"><div><label class="public-booking-label" for="booking-v1-name">Your name *</label><input class="input" id="booking-v1-name" name="name" maxlength="120" autocomplete="name" required></div><div><label class="public-booking-label" for="booking-v1-phone">Phone</label><input class="input" id="booking-v1-phone" name="phone" maxlength="60" type="tel" autocomplete="tel"></div></div>
        <div><label class="public-booking-label" for="booking-v1-email">Email</label><input class="input" id="booking-v1-email" name="email" maxlength="180" type="email" autocomplete="email"></div>
        <div class="public-booking-row"><div><label class="public-booking-label" for="booking-v1-date">Preferred date</label><input class="input" id="booking-v1-date" name="date" type="date" min="${todayLocal()}"></div><div><label class="public-booking-label" for="booking-v1-time">Preferred time</label><input class="input" id="booking-v1-time" name="time" type="time"></div></div>
        <div><label class="public-booking-label" for="booking-v1-message">What do you need?</label><textarea class="input" id="booking-v1-message" name="message" maxlength="1000" rows="3" placeholder="Service details, questions, location, or anything the business should know"></textarea></div>
        ${bootstrap.location_text?`<div class="public-booking-note"><i data-lucide="map-pin" size="14"></i><span>${esc(bootstrap.location_text)}</span></div>`:''}
        <div class="public-booking-status" id="booking-v1-status" role="status" aria-live="polite" hidden></div>
        <button class="btn btn-primary btn-block" id="booking-v1-submit" type="submit"><i data-lucide="send" size="17"></i> Send service request</button>
        <div class="public-booking-note"><i data-lucide="info" size="14"></i><span>This is a request, not a confirmed appointment. The card owner will contact you to confirm.</span></div>
      </form></div>`;
  }

  function bookingMarkup(){
    const services=Array.isArray(bootstrap.services)?bootstrap.services:[];
    return `${realtorContext?'': '<div class="public-section-heading"><h2>Book an appointment</h2><span>Choose an open time</span></div>'}
      <div class="public-booking-shell${realtorContext?' liw-showing-shell':''}">${serviceCards()}
      ${services.length?`<form class="public-booking-form" id="booking-v1-form" novalidate>
        ${realtorContext?dateChoicesMarkup():''}
        ${realtorContext?'<input id="booking-v1-date" name="date" type="hidden" value="">':`<div><label class="public-booking-label" for="booking-v1-date">Choose a date *</label><input class="input" id="booking-v1-date" name="date" type="date" min="${businessToday()}" max="${addDaysBusiness(bootstrap.days_ahead||30)}" required></div>`}
        <div class="${realtorContext?'liw-showing-times-panel':''}">${realtorContext?'<div class="liw-showing-section-heading"><span class="liw-showing-number">02</span><div><strong>Choose a time</strong><small>All times are shown in the Realtor’s time zone.</small></div></div>':'<span class="public-booking-label">Available times *</span>'}<div class="public-booking-slots" id="booking-v1-slots" role="group" aria-label="Available showing times"><span class="public-booking-loading">${realtorContext?'Choose a day to see open times.':'Choose a service and date to see open times.'}</span></div><div class="public-booking-selected-time" id="booking-v1-selected-time" role="status" aria-live="polite" hidden></div></div>
        ${realtorContext?'<div class="liw-showing-summary" id="booking-v1-summary" role="status" aria-live="polite"></div><div class="liw-showing-section-heading liw-showing-contact-heading"><span class="liw-showing-number">03</span><div><strong>Your details</strong><small>So the Realtor can confirm your visit.</small></div></div>':''}
        <div class="public-booking-row"><div><label class="public-booking-label" for="booking-v1-name">Your name *</label><input class="input" id="booking-v1-name" name="name" maxlength="120" autocomplete="name" required></div><div><label class="public-booking-label" for="booking-v1-phone">Phone</label><input class="input" id="booking-v1-phone" name="phone" maxlength="60" type="tel" autocomplete="tel"></div></div>
        <div><label class="public-booking-label" for="booking-v1-email">Email</label><input class="input" id="booking-v1-email" name="email" maxlength="180" type="email" autocomplete="email"></div>
        <div><label class="public-booking-label" for="booking-v1-message">Notes</label><textarea class="input" id="booking-v1-message" name="message" maxlength="1000" rows="3" placeholder="Anything the business should know before the appointment"></textarea></div>
        ${bootstrap.location_text?`<div class="public-booking-note"><i data-lucide="map-pin" size="14"></i><span>${esc(bootstrap.location_text)}</span></div>`:''}
        <div class="public-booking-status" id="booking-v1-status" role="status" aria-live="polite" hidden></div>
        <button class="btn btn-primary btn-block" id="booking-v1-submit" type="submit" ${realtorContext?'disabled':''}><i data-lucide="calendar-check-2" size="17"></i> ${realtorContext?'Confirm Showing':'Confirm appointment'}</button>
        ${realtorContext?'<button class="liw-showing-ask" id="booking-v1-ask" type="button"><i data-lucide="message-circle" size="16"></i> Ask About It instead</button>':''}
      </form>`:''}</div>`;
  }

  function status(message,type=''){
    const box=$('#booking-v1-status');
    if(!box)return;
    box.hidden=!message;
    box.textContent=message||'';
    box.className=`public-booking-status${type?` ${type}`:''}`;
  }
  function validateContact(form){
    const name=String(form.elements.name?.value||'').trim();
    const email=String(form.elements.email?.value||'').trim();
    const phone=String(form.elements.phone?.value||'').trim();
    if(name.length<2){status('Please enter your name.','error');form.elements.name?.focus();return null;}
    if(!email&&!phone){status('Add an email address or phone number so the business can reach you.','error');(form.elements.phone||form.elements.email)?.focus();return null;}
    if(email&&form.elements.email&&!form.elements.email.checkValidity()){status('Check the email address and try again.','error');form.elements.email.focus();return null;}
    return {name,email,phone};
  }

  function selectedTimeLabel(label){
    const output=$('#booking-v1-selected-time');
    if(output){
      output.hidden=!label;
      output.textContent=label?'✓ Selected time: '+label:'';
    }
    updateShowingSummary();
    updateShowingSubmit();
  }
  async function loadSlots({resetSelection=false,forceRefresh=false}={}){
    if(bootstrap.mode!=='booking')return;
    const date=$('#booking-v1-date')?.value;
    const root=$('#booking-v1-slots');
    if(resetSelection){selectedSlot=null;selectedTimeLabel('');}
    if(!root)return;
    const serviceId=selectedServiceId;
    const currentContext=realtorContext;
    const requestId=++slotRequestId;
    if(!date||!serviceId){
      root.innerHTML='<span class="public-booking-loading">'+(!serviceId?'Choose an appointment service first.':'Choose a date to see open times.')+'</span>';
      return;
    }
    if(realtorContext?.days&&Object.values(realtorContext.days).some(day=>day?.enabled)){
      const weekday=new Date(date+'T12:00:00Z').getUTCDay();
      if(!realtorContext.days[String(weekday)]?.enabled){
        root.innerHTML='<span class="public-booking-empty">This property has no showings on that day. Choose one of the available showing days above.</span>';
        return;
      }
    }
    root.innerHTML='<span class="public-booking-loading">Checking open times…</span>';
    try{
      const cached=currentContext&&!forceRefresh?showingDaySlots.get(date):null;
      const response=cached?{data:{ok:true,slots:cached},error:null}:currentContext
        ? await window.supabaseClient.rpc('realtor_showing_slots_staging',{p_slug:slug,p_listing_id:currentContext.id,p_date:date})
        : await window.supabaseClient.rpc('booking_available_slots',{p_slug:slug,p_service_id:serviceId,p_date:date});
      const {data,error}=response;
      if(error)throw error;
      if(requestId!==slotRequestId||currentContext!==realtorContext||$('#booking-v1-slots')!==root||$('#booking-v1-date')?.value!==date||selectedServiceId!==serviceId)return;
      if(currentContext&&data?.ok)showingDaySlots.set(date,Array.isArray(data.slots)?data.slots:[]);
      const slots=Array.isArray(data?.slots)?data.slots:[];
      if(!data?.ok){
        const reason=({showing_disabled:'The Realtor has not enabled showing appointments.',booking_disabled:'Online booking is not enabled.',service_unavailable:'The showing service is not active.',listing_unavailable:'This property is not available for showings.',request_only:'Contact the Realtor to request a showing.',invalid_showing_hours:'The listing hours need correction.'})[data?.reason]||'Open times could not be loaded. Try again.';
        root.innerHTML='<span class="public-booking-empty">'+reason+'</span>';return;
      }
      const available=slots.map(slot=>({...slot,iso:normalizeBookingTimestamp(slot.start_at)})).filter(slot=>slot.iso);
      if(!available.length){selectedSlot=null;selectedTimeLabel('');root.innerHTML='<span class="public-booking-empty">No open times on this date. Try another available day.</span>';return;}
      if(selectedSlot&&!available.some(slot=>slot.iso===selectedSlot)){selectedSlot=null;selectedTimeLabel('');}
      root.innerHTML=available.map(slot=>`<button class="public-booking-slot${selectedSlot===slot.iso?' active':''}" type="button" aria-pressed="${selectedSlot===slot.iso}" data-booking-slot="${esc(slot.iso)}">${esc(slot.label||'Open')}</button>`).join('');
      updateShowingSummary();updateShowingSubmit();
      root.querySelectorAll('[data-booking-slot]').forEach(button=>button.addEventListener('click',()=>{
        selectedSlot=button.dataset.bookingSlot;
        updateSelection([...root.querySelectorAll('[data-booking-slot]')],selectedSlot);
        selectedTimeLabel(button.textContent.trim());
        status('');
      }));
    }catch(error){
      if(requestId!==slotRequestId||$('#booking-v1-slots')!==root)return;
      console.warn('LIW booking slots:',error);
      root.innerHTML='<span class="public-booking-empty">Open times could not be loaded. Try again.</span>';
    }
  }

  function wireServices(){
    const buttons=[...document.querySelectorAll('#booking-v1-section [data-booking-service]')];
    if(realtorContext){selectedServiceId=realtorContext.serviceId;return;}
    if(!buttons.some(button=>button.dataset.bookingService===selectedServiceId))selectedServiceId=null;
    updateSelection(buttons,selectedServiceId);
    buttons.forEach(button=>button.addEventListener('click',()=>{
      if(selectedServiceId===button.dataset.bookingService)return;
      selectedServiceId=button.dataset.bookingService;
      updateSelection(buttons,selectedServiceId);
      status('');
      loadSlots({resetSelection:true});
    }));
  }

  async function submitRequest(event){
    event.preventDefault();
    const form=event.currentTarget,contact=validateContact(form);if(!contact)return;
    const button=$('#booking-v1-submit'),original=button.innerHTML;
    button.disabled=true;button.innerHTML='<span class="button-spinner"></span> Sending…';status('');
    try{
      const date=String(form.elements.date?.value||'');
      const time=String(form.elements.time?.value||'');
      let preferred=null;
      if(date){
        const value=`${date}T${time||'12:00'}:00`;
        const parsed=new Date(value);
        if(!Number.isNaN(parsed.getTime()))preferred=parsed.toISOString();
      }
      const {data,error}=await window.supabaseClient.rpc('booking_submit_request',{
        p_slug:slug,
        p_service_id:selectedServiceId||null,
        p_customer_name:contact.name,
        p_customer_email:contact.email||null,
        p_customer_phone:contact.phone||null,
        p_preferred_start_at:preferred,
        p_message:withPropertyContext(form.elements.message?.value)
      });
      if(error)throw error;
      if(!data?.ok)throw new Error(({disabled:'Service requests are not available right now.',contact_required:'Add an email or phone number.',service_unavailable:'That service is no longer available.'})[data?.reason]||'Unable to send your request.');
      form.reset();
      status('Request sent. The card owner will contact you to confirm.','success');
      if(typeof window.track==='function')window.track('service_request_submit',selectedServiceId||null,{source:'booking_v1'});
      if(!realtorContext){selectedServiceId=null;updateSelection([...document.querySelectorAll('#booking-v1-section [data-booking-service]')],null);}
    }catch(error){status(String(error?.message||'Unable to send your request.').slice(0,180),'error');}
    finally{button.disabled=false;button.innerHTML=original;if(window.lucide)lucide.createIcons();}
  }


  function renderConfirmation(result){
    const section=$('#booking-v1-section');if(!section)return;
    const when=prettyConfirmed(result.start_at,result.timezone||bootstrap.timezone);
    const service=String(result.service_name||selectedService()?.name||'Appointment');
    const pay=result.external_payment_url;
    const property=realtorContext?.address||'';
    const valid=Boolean(when);
    const manage=String(result.manage_token||'');
    const manageUrl=manage?new URL('appointment.html?token='+encodeURIComponent(manage),location.href).href:'';
    const manageActions=manage?`<div class="public-booking-v2-manage liw-booking-manage-save" data-booking-v2-manage="true"><strong>Keep your booking link</strong><p>This private link lets you view, reschedule or cancel later, even after closing this card. Save it somewhere you can find it.</p><a class="btn btn-primary btn-block" id="liw-booking-manage-link" href="${esc(manageUrl)}"><i data-lucide="calendar-check-2" size="17"></i> Manage appointment</a><div class="liw-booking-save-actions"><button type="button" id="liw-booking-copy-link" class="btn btn-light"><i data-lucide="copy" size="16"></i> Copy link</button><button type="button" id="liw-booking-share-link" class="btn btn-light"><i data-lucide="share-2" size="16"></i> Share / save</button></div><small id="liw-booking-save-status" role="status" aria-live="polite">Treat this link as private. Anyone with it can manage your booking.</small><small id="liw-booking-email-status" role="status" aria-live="polite"></small></div>`:'';
    section.innerHTML=`<div class="public-section-heading"><h2>${valid?'Appointment confirmed':'Appointment received'}</h2><span>${valid?'You’re booked':'Check booking details'}</span></div><div class="public-booking-confirmation"><h3>${esc(service)}</h3>${property?`<p><strong>${esc(property)}</strong></p>`:''}${valid?`<p><strong>${esc(when)}</strong></p>`:'<p>We could not display the booked time. Use Manage appointment to view the saved details, or contact the business.</p>'}${bootstrap.location_text?`<p>${esc(bootstrap.location_text)}</p>`:''}${pay?`<div class="public-booking-pay"><a class="btn btn-primary btn-block" href="${esc(pay)}" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link" size="17"></i> Continue to payment</a><small class="public-booking-pay-note">Payment is handled by the business’s external provider. LIW does not process or verify payment.</small></div>`:''}${manageActions}</div>`;
    if(manageUrl){
      const feedback=$('#liw-booking-save-status');
      $('#liw-booking-copy-link')?.addEventListener('click',async()=>{
        try{
          if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(manageUrl);
          else{
            const input=document.createElement('textarea');
            input.value=manageUrl;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';
            document.body.appendChild(input);input.select();
            const copied=document.execCommand('copy');input.remove();
            if(!copied)throw new Error('Copy not supported');
          }
          if(feedback)feedback.textContent='Link copied. Save it somewhere private before closing.';
        }catch(_){if(feedback)feedback.textContent='Copy unavailable. Open Manage appointment and bookmark the page.';}
      });
      $('#liw-booking-share-link')?.addEventListener('click',async()=>{
        if(!navigator.share){if(feedback)feedback.textContent='Sharing is not available here. Use Copy link instead.';return;}
        try{
          await navigator.share({title:'My LIW appointment',text:property?'Manage my property showing: '+property:'Manage my LIW appointment',url:manageUrl});
          if(feedback)feedback.textContent='Share action completed. Keep the link private.';
        }catch(error){if(error?.name!=='AbortError'&&feedback)feedback.textContent='Sharing was not completed. Use Copy link instead.';}
      });
    }
    if(window.lucide)lucide.createIcons();
  }

  async function sendBookingConfirmationEmail(manageToken,email){
    const note=$('#liw-booking-email-status');
    const recipient=String(email||'').trim();
    if(!recipient){if(note)note.textContent='No email provided. Please copy or share your private management link.';return;}
    if(note)note.textContent='Requesting your confirmation email…';
    try{
      const invoke=window.supabaseClient?.functions?.invoke;
      if(typeof invoke!=='function')throw new Error('Email service unavailable');
      const {data,error}=await window.supabaseClient.functions.invoke('booking-confirmation-staging',{
        body:{manage_token:manageToken}
      });
      if(error||!data?.ok||!data?.sent)throw error||new Error(data?.reason||'Email unavailable');
      if(note)note.textContent='Confirmation email requested for '+recipient+'. Keep the private link saved as a backup.';
    }catch(error){
      console.warn('LIW staging booking confirmation email:',error);
      if(note)note.textContent='Email could not be confirmed. Copy or share your private link before closing.';
    }
  }
  async function submitBooking(event){
    event.preventDefault();
    const form=event.currentTarget,contact=validateContact(form);if(!contact)return;
    if(!selectedServiceId){status(realtorContext?'Property showing is not set up yet. Contact the Realtor.':'Choose an appointment service.','error');return;}
    if(!form.elements.date?.value){status('Choose a date.','error');form.elements.date?.focus();return;}
    const slot=normalizeBookingTimestamp(selectedSlot);
    if(!slot){selectedSlot=null;selectedTimeLabel('');status('Choose an available time.','error');return;}
    const button=$('#booking-v1-submit'),original=button.innerHTML;
    if(button.dataset.submitting)return;
    button.dataset.submitting='true';
    button.disabled=true;button.innerHTML='<span class="button-spinner"></span> Booking…';status('');
    try{
      // Use the staging V2 RPC explicitly: a late bridge script cannot accidentally
      // route a staging booking through the production legacy RPC.
      const {data,error}=realtorContext
        ? await window.supabaseClient.rpc('realtor_book_showing_staging',{
          p_slug:slug,p_listing_id:realtorContext.id,p_start_at:slot,
          p_customer_name:contact.name,p_customer_email:contact.email||null,
          p_customer_phone:contact.phone||null,p_message:String(form.elements.message?.value||'').trim()||null
        })
        : await window.supabaseClient.rpc('booking_create_appointment_v2',{
          p_slug:slug,p_service_id:selectedServiceId,p_start_at:slot,
          p_customer_name:contact.name,p_customer_email:contact.email||null,
          p_customer_phone:contact.phone||null,p_message:withPropertyContext(form.elements.message?.value),
          p_environment:'staging'
        });
      if(error)throw error;
      if(!data?.ok){
        if(data?.reason==='slot_taken'||data?.reason==='slot_unavailable'){
          if(realtorContext)showingDaySlots.delete(form.elements.date?.value||'');
          await loadSlots({resetSelection:true,forceRefresh:true});
          throw new Error('That time was just taken. Choose another open time.');
        }
        throw new Error(({disabled:'Booking is not available right now.',request_only:'This card accepts appointment requests instead of live bookings.',service_unavailable:'That service is no longer available.',contact_required:'Add an email or phone number.'})[data?.reason]||'Unable to book this appointment.');
      }
      if(!data.appointment_id||!data.manage_token){
        throw new Error('The booking response is incomplete. Please contact the business before attempting another booking.');
      }
      const confirmed=normalizeBookingTimestamp(data.start_at)||slot;
      if(typeof window.track==='function')window.track('booking_submit',selectedServiceId,{source:'booking_v1',listing_id:realtorContext?.id||null});
      renderConfirmation({...data,start_at:confirmed});
      document.dispatchEvent(new CustomEvent('liw:booking-confirmed',{detail:{manage_token:data.manage_token,appointment_id:data.appointment_id}}));
      void sendBookingConfirmationEmail(data.manage_token,contact.email);
    }catch(error){status(String(error?.message||'Unable to book this appointment.').slice(0,220),'error');}
    finally{if(document.body.contains(button)){delete button.dataset.submitting;button.disabled=false;button.innerHTML=original;updateShowingSubmit();if(window.lucide)lucide.createIcons();}}
  }

  function render(){
    ++slotRequestId;++showingDaysRequestId;
    const section=mountSection();if(!section)return;
    section.hidden=false;
    section.innerHTML=bootstrap.mode==='request'?requestMarkup():bookingMarkup();
    wireServices();wireDateChoices();
    $('#booking-v1-date')?.addEventListener('change',()=>{updateDateChoices();loadSlots({resetSelection:true});});
    const form=$('#booking-v1-form');
    if(form)form.addEventListener('submit',bootstrap.mode==='request'?submitRequest:submitBooking);
    $('#booking-v1-ask')?.addEventListener('click',()=>{
      if(realtorContext)document.dispatchEvent(new CustomEvent('liw:realtor-ask-about-listing',{detail:{listingId:realtorContext.id}}));
    });
    if(realtorContext&&bootstrap.mode==='booking'){
      updateShowingSummary();updateShowingSubmit();
      loadRealtorDays();
    }
    if(window.lucide)lucide.createIcons();
  }

  function openForListing(context){
    if(!bootstrapReady)return {ok:false,reason:'loading'};
    if(!bootstrap?.ok||!bootstrap.enabled)return {ok:false,reason:'disabled'};
    const id=String(context?.id||'').trim(),address=String(context?.address||'').trim().slice(0,250);
    const configured=serviceById(String(context?.serviceId||'').trim());
    const available=(bootstrap?.services||[]).find(service=>String(service.name||'').trim().toLowerCase()==='property showing');
    const service=configured&&String(configured.name||'').trim().toLowerCase()==='property showing'?configured:available;
    if(!id||!address||!service)return {ok:false,reason:'service_unavailable'};
    const serviceId=String(service.id);
    realtorContext={id,address,serviceId,days:context.days&&typeof context.days==='object'?context.days:{}};selectedServiceId=serviceId;selectedSlot=null;render();
    return {ok:true,mode:bootstrap.mode};
  }
  function openGeneral(){
    if(!bootstrapReady)return {ok:false,reason:'loading'};
    if(!bootstrap?.ok||!bootstrap.enabled)return {ok:false,reason:'disabled'};
    realtorContext=null;selectedSlot=null;selectedServiceId=null;render();
    return {ok:true,mode:bootstrap.mode};
  }
  window.LIWNativeBookingV1={openForListing,openGeneral,getState:()=>({ready:bootstrapReady,enabled:Boolean(bootstrap?.ok&&bootstrap?.enabled),mode:bootstrap?.mode||null})};
  function announceReady(){document.dispatchEvent(new CustomEvent('liw:native-booking-ready',{detail:window.LIWNativeBookingV1.getState()}));}
  async function boot(){
    if(!slug||!window.supabaseClient)return;
    try{
      const {data,error}=await window.supabaseClient.rpc('booking_public_bootstrap',{p_slug:slug});
      if(error)throw error;
      bootstrap=effectiveBootstrap(data||{});
      bootstrapReady=true;
      if(bootstrap.ok&&bootstrap.enabled)render();
      announceReady();
    }catch(error){bootstrapReady=true;console.warn('LIW public booking v1:',error);announceReady();}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
  else setTimeout(boot,0);
})();
