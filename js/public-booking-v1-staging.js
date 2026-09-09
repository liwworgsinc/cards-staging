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
  function prettyConfirmed(raw,timeZone){
    try{
      return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:timeZone||'America/New_York'}).format(new Date(raw));
    }catch(_){return new Date(raw).toLocaleString();}
  }
  function serviceById(id){return (bootstrap?.services||[]).find(service=>String(service.id)===String(id))||null;}
  function selectedService(){return serviceById(selectedServiceId);}

  function mountSection(){
    if($('#booking-v1-section'))return $('#booking-v1-section');
    const section=document.createElement('section');
    section.className='public-section public-booking-v1';
    section.id='booking-v1-section';
    const servicesSection=$('#services-section');
    const productsSection=$('#products-section');
    if(servicesSection?.parentNode)servicesSection.insertAdjacentElement('afterend',section);
    else if(productsSection?.parentNode)productsSection.insertAdjacentElement('beforebegin',section);
    else $('#branding')?.insertAdjacentElement('beforebegin',section);
    return section;
  }

  function serviceCards(){
    const services=Array.isArray(bootstrap.services)?bootstrap.services:[];
    if(!services.length){
      if(bootstrap.mode==='request')return '<div class="public-booking-empty">Tell the card owner what service you need below.</div>';
      return '<div class="public-booking-empty">No bookable services are available yet.</div>';
    }
    return `<div class="public-booking-service-grid">${services.map((service,index)=>{
      const duration=bootstrap.mode==='booking'?` · ${Number(service.duration_minutes||30)} min`:'';
      const price=service.price_cents!=null?`<span class="service-price">${esc(money(service.price_cents))}</span>`:'';
      return `<button class="public-booking-service${index===0?' active':''}" type="button" data-booking-service="${esc(service.id)}"><span><strong>${esc(service.name||'Service')}</strong><small>${esc(service.description||'Choose this service')}${duration}</small></span>${price}</button>`;
    }).join('')}</div>`;
  }

  function requestMarkup(){
    const hasServices=(bootstrap.services||[]).length>0;
    return `<div class="public-section-heading"><h2>Request service</h2><span>Tell me what you need</span></div>
      <div class="public-booking-shell">${serviceCards()}
      <form class="public-booking-form" id="booking-v1-form" novalidate>
        <div class="public-booking-row"><div><label class="public-booking-label" for="booking-v1-name">Your name *</label><input class="input" id="booking-v1-name" name="name" maxlength="120" autocomplete="name" required></div><div><label class="public-booking-label" for="booking-v1-phone">Phone</label><input class="input" id="booking-v1-phone" name="phone" maxlength="60" type="tel" autocomplete="tel"></div></div>
        <div><label class="public-booking-label" for="booking-v1-email">Email</label><input class="input" id="booking-v1-email" name="email" maxlength="180" type="email" autocomplete="email"></div>
        <div class="public-booking-row"><div><label class="public-booking-label" for="booking-v1-date">Preferred date</label><input class="input" id="booking-v1-date" name="date" type="date" min="${todayLocal()}"></div><div><label class="public-booking-label" for="booking-v1-time">Preferred time</label><input class="input" id="booking-v1-time" name="time" type="time"></div></div>
        <div><label class="public-booking-label" for="booking-v1-message">What do you need?</label><textarea class="input" id="booking-v1-message" name="message" maxlength="1000" rows="3" placeholder="Service details, questions, location, or anything the business should know"></textarea></div>
        ${bootstrap.location_text?`<div class="public-booking-note"><i data-lucide="map-pin" size="14"></i><span>${esc(bootstrap.location_text)}</span></div>`:''}
        <div class="public-booking-status" id="booking-v1-status" hidden></div>
        <button class="btn btn-primary btn-block" id="booking-v1-submit" type="submit"><i data-lucide="send" size="17"></i> Send service request</button>
        <div class="public-booking-note"><i data-lucide="info" size="14"></i><span>This is a request, not a confirmed appointment. The card owner will contact you to confirm.</span></div>
      </form></div>`;
  }

  function bookingMarkup(){
    const services=Array.isArray(bootstrap.services)?bootstrap.services:[];
    return `<div class="public-section-heading"><h2>Book an appointment</h2><span>Choose an open time</span></div>
      <div class="public-booking-shell">${serviceCards()}
      ${services.length?`<form class="public-booking-form" id="booking-v1-form" novalidate>
        <div><label class="public-booking-label" for="booking-v1-date">Choose a date *</label><input class="input" id="booking-v1-date" name="date" type="date" min="${todayLocal()}" max="${addDaysLocal(bootstrap.days_ahead||30)}" required></div>
        <div><span class="public-booking-label">Available times *</span><div class="public-booking-slots" id="booking-v1-slots"><span class="public-booking-loading">Choose a date to see open times.</span></div></div>
        <div class="public-booking-row"><div><label class="public-booking-label" for="booking-v1-name">Your name *</label><input class="input" id="booking-v1-name" name="name" maxlength="120" autocomplete="name" required></div><div><label class="public-booking-label" for="booking-v1-phone">Phone</label><input class="input" id="booking-v1-phone" name="phone" maxlength="60" type="tel" autocomplete="tel"></div></div>
        <div><label class="public-booking-label" for="booking-v1-email">Email</label><input class="input" id="booking-v1-email" name="email" maxlength="180" type="email" autocomplete="email"></div>
        <div><label class="public-booking-label" for="booking-v1-message">Notes</label><textarea class="input" id="booking-v1-message" name="message" maxlength="1000" rows="3" placeholder="Anything the business should know before the appointment"></textarea></div>
        ${bootstrap.location_text?`<div class="public-booking-note"><i data-lucide="map-pin" size="14"></i><span>${esc(bootstrap.location_text)}</span></div>`:''}
        <div class="public-booking-status" id="booking-v1-status" hidden></div>
        <button class="btn btn-primary btn-block" id="booking-v1-submit" type="submit"><i data-lucide="calendar-check-2" size="17"></i> Confirm appointment</button>
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

  async function loadSlots(){
    if(bootstrap.mode!=='booking')return;
    const date=$('#booking-v1-date')?.value;
    const root=$('#booking-v1-slots');
    selectedSlot=null;
    if(!root)return;
    if(!date||!selectedServiceId){root.innerHTML='<span class="public-booking-loading">Choose a date to see open times.</span>';return;}
    root.innerHTML='<span class="public-booking-loading">Checking open times…</span>';
    try{
      const {data,error}=await window.supabaseClient.rpc('booking_available_slots',{p_slug:slug,p_service_id:selectedServiceId,p_date:date});
      if(error)throw error;
      const slots=Array.isArray(data?.slots)?data.slots:[];
      if(!data?.ok||!slots.length){root.innerHTML='<span class="public-booking-empty">No open times on this date. Try another day.</span>';return;}
      root.innerHTML=slots.map(slot=>`<button class="public-booking-slot" type="button" data-booking-slot="${esc(slot.start_at)}">${esc(slot.label||'Open')}</button>`).join('');
      root.querySelectorAll('[data-booking-slot]').forEach(button=>button.addEventListener('click',()=>{
        selectedSlot=button.dataset.bookingSlot;
        root.querySelectorAll('[data-booking-slot]').forEach(item=>item.classList.toggle('active',item===button));
        status('');
      }));
    }catch(error){console.warn('LIW booking slots:',error);root.innerHTML='<span class="public-booking-empty">Open times could not be loaded. Try again.</span>';}
  }

  function wireServices(){
    const buttons=[...document.querySelectorAll('[data-booking-service]')];
    if(buttons.length&&!selectedServiceId)selectedServiceId=buttons[0].dataset.bookingService;
    buttons.forEach(button=>button.addEventListener('click',()=>{
      selectedServiceId=button.dataset.bookingService;
      buttons.forEach(item=>item.classList.toggle('active',item===button));
      status('');
      loadSlots();
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
        p_message:String(form.elements.message?.value||'').trim()||null
      });
      if(error)throw error;
      if(!data?.ok)throw new Error(({disabled:'Service requests are not available right now.',contact_required:'Add an email or phone number.',service_unavailable:'That service is no longer available.'})[data?.reason]||'Unable to send your request.');
      form.reset();
      status('Request sent. The card owner will contact you to confirm.','success');
      if(typeof window.track==='function')window.track('service_request_submit',selectedServiceId||null,{source:'booking_v1'});
      document.querySelectorAll('[data-booking-service]').forEach((item,index)=>item.classList.toggle('active',index===0));
      selectedServiceId=document.querySelector('[data-booking-service]')?.dataset.bookingService||null;
    }catch(error){status(String(error?.message||'Unable to send your request.').slice(0,180),'error');}
    finally{button.disabled=false;button.innerHTML=original;if(window.lucide)lucide.createIcons();}
  }

  function renderConfirmation(result){
    const section=$('#booking-v1-section');if(!section)return;
    const service=result.service_name||selectedService()?.name||'Appointment';
    const when=prettyConfirmed(result.start_at,result.timezone||bootstrap.timezone);
    const pay=result.external_payment_url;
    section.innerHTML=`<div class="public-section-heading"><h2>Appointment confirmed</h2><span>You’re booked</span></div><div class="public-booking-confirmation"><h3>${esc(service)}</h3><p><strong>${esc(when)}</strong></p>${bootstrap.location_text?`<p>${esc(bootstrap.location_text)}</p>`:''}${pay?`<div class="public-booking-pay"><a class="btn btn-primary btn-block" href="${esc(pay)}" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link" size="17"></i> Continue to payment</a><small class="public-booking-pay-note">Payment is handled by the card owner’s external provider. LIW does not process, hold, or verify this payment.</small></div>`:''}</div>`;
    if(window.lucide)lucide.createIcons();
  }

  async function submitBooking(event){
    event.preventDefault();
    const form=event.currentTarget,contact=validateContact(form);if(!contact)return;
    if(!selectedServiceId){status('Choose a service.','error');return;}
    if(!form.elements.date?.value){status('Choose a date.','error');form.elements.date?.focus();return;}
    if(!selectedSlot){status('Choose an available time.','error');return;}
    const button=$('#booking-v1-submit'),original=button.innerHTML;
    button.disabled=true;button.innerHTML='<span class="button-spinner"></span> Booking…';status('');
    try{
      const {data,error}=await window.supabaseClient.rpc('booking_create_appointment',{
        p_slug:slug,
        p_service_id:selectedServiceId,
        p_start_at:selectedSlot,
        p_customer_name:contact.name,
        p_customer_email:contact.email||null,
        p_customer_phone:contact.phone||null,
        p_message:String(form.elements.message?.value||'').trim()||null
      });
      if(error)throw error;
      if(!data?.ok){
        if(data?.reason==='slot_taken'||data?.reason==='slot_unavailable'){
          await loadSlots();
          throw new Error('That time is no longer available. Choose another open time.');
        }
        throw new Error(({disabled:'Booking is not available right now.',request_only:'This card accepts service requests instead of live bookings.',service_unavailable:'That service is no longer available.',contact_required:'Add an email or phone number.'})[data?.reason]||'Unable to book this appointment.');
      }
      if(typeof window.track==='function')window.track('booking_submit',selectedServiceId,{source:'booking_v1'});
      renderConfirmation(data);
    }catch(error){status(String(error?.message||'Unable to book this appointment.').slice(0,180),'error');}
    finally{if(document.body.contains(button)){button.disabled=false;button.innerHTML=original;if(window.lucide)lucide.createIcons();}}
  }

  function render(){
    const section=mountSection();if(!section)return;
    section.hidden=false;
    section.innerHTML=bootstrap.mode==='request'?requestMarkup():bookingMarkup();
    wireServices();
    $('#booking-v1-date')?.addEventListener('change',loadSlots);
    const form=$('#booking-v1-form');
    if(form)form.addEventListener('submit',bootstrap.mode==='request'?submitRequest:submitBooking);
    if(window.lucide)lucide.createIcons();
  }

  async function boot(){
    if(!slug||!window.supabaseClient)return;
    try{
      const {data,error}=await window.supabaseClient.rpc('booking_public_bootstrap',{p_slug:slug});
      if(error)throw error;
      bootstrap=effectiveBootstrap(data||{});
      if(!bootstrap.ok||!bootstrap.enabled)return;
      render();
    }catch(error){console.warn('LIW public booking v1:',error);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
  else setTimeout(boot,0);
})();
