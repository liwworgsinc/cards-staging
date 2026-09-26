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
    if(realtorContext){const service=selectedService();return `<div class="liw-realtor-booking-property" style="display:grid;gap:5px;padding:15px;border:1px solid #d6dce6;border-radius:14px;background:#f8fafc"><small style="font-weight:900;letter-spacing:.08em;color:#64748b">PROPERTY SHOWING</small><strong>${esc(realtorContext.address)}</strong><span style="font-size:.8rem;color:#475569">${esc(service?.name||'Property showing')}${bootstrap.mode==='booking'?` · ${Number(service?.duration_minutes||30)} min`:''}</span></div>`;}
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
    return `<div class="public-section-heading"><h2>${realtorContext?'Schedule a Showing':'Book an appointment'}</h2><span>Choose an open time</span></div>
      <div class="public-booking-shell">${serviceCards()}
      ${services.length?`<form class="public-booking-form" id="booking-v1-form" novalidate>
        <div><label class="public-booking-label" for="booking-v1-date">Choose a date *</label><input class="input" id="booking-v1-date" name="date" type="date" min="${todayLocal()}" max="${addDaysLocal(bootstrap.days_ahead||30)}" required></div>
        <div><span class="public-booking-label">Available times *</span><div class="public-booking-slots" id="booking-v1-slots"><span class="public-booking-loading">Choose a service and date to see open times.</span></div><div class="public-booking-selected-time" id="booking-v1-selected-time" role="status" aria-live="polite" hidden></div></div>
        <div class="public-booking-row"><div><label class="public-booking-label" for="booking-v1-name">Your name *</label><input class="input" id="booking-v1-name" name="name" maxlength="120" autocomplete="name" required></div><div><label class="public-booking-label" for="booking-v1-phone">Phone</label><input class="input" id="booking-v1-phone" name="phone" maxlength="60" type="tel" autocomplete="tel"></div></div>
        <div><label class="public-booking-label" for="booking-v1-email">Email</label><input class="input" id="booking-v1-email" name="email" maxlength="180" type="email" autocomplete="email"></div>
        <div><label class="public-booking-label" for="booking-v1-message">Notes</label><textarea class="input" id="booking-v1-message" name="message" maxlength="1000" rows="3" placeholder="Anything the business should know before the appointment"></textarea></div>
        ${bootstrap.location_text?`<div class="public-booking-note"><i data-lucide="map-pin" size="14"></i><span>${esc(bootstrap.location_text)}</span></div>`:''}
        <div class="public-booking-status" id="booking-v1-status" role="status" aria-live="polite" hidden></div>
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

  function selectedTimeLabel(label){
    const output=$('#booking-v1-selected-time');
    if(output){
      output.hidden=!label;
      output.textContent=label?'✓ Selected time: '+label:'';
    }
  }
  async function loadSlots({resetSelection=false}={}){
    if(bootstrap.mode!=='booking')return;
    const date=$('#booking-v1-date')?.value;
    const root=$('#booking-v1-slots');
    if(resetSelection){selectedSlot=null;selectedTimeLabel('');}
    if(!root)return;
    const serviceId=selectedServiceId;
    const requestId=++slotRequestId;
    if(!date||!serviceId){
      root.innerHTML='<span class="public-booking-loading">'+(!serviceId?'Choose an appointment service first.':'Choose a date to see open times.')+'</span>';
      return;
    }
    root.innerHTML='<span class="public-booking-loading">Checking open times…</span>';
    try{
      const {data,error}=realtorContext
        ? await window.supabaseClient.rpc('realtor_showing_slots_staging',{p_slug:slug,p_listing_id:realtorContext.id,p_date:date})
        : await window.supabaseClient.rpc('booking_available_slots',{p_slug:slug,p_service_id:serviceId,p_date:date});
      if(error)throw error;
      if(requestId!==slotRequestId||$('#booking-v1-slots')!==root||$('#booking-v1-date')?.value!==date||selectedServiceId!==serviceId)return;
      const slots=Array.isArray(data?.slots)?data.slots:[];
      if(!data?.ok){
        const reason=({showing_disabled:'The Realtor has not enabled showing appointments.',booking_disabled:'Online booking is not enabled.',service_unavailable:'The showing service is not active.',listing_unavailable:'This property is not available for showings.',request_only:'Contact the Realtor to request a showing.',invalid_showing_hours:'The listing hours need correction.'})[data?.reason]||'Open times could not be loaded. Try again.';
        root.innerHTML='<span class="public-booking-empty">'+reason+'</span>';return;
      }
      const available=slots.map(slot=>({...slot,iso:normalizeBookingTimestamp(slot.start_at)})).filter(slot=>slot.iso);
      if(!available.length){selectedSlot=null;selectedTimeLabel('');root.innerHTML='<span class="public-booking-empty">No open times on this date. Try another day.</span>';return;}
      if(selectedSlot&&!available.some(slot=>slot.iso===selectedSlot)){selectedSlot=null;selectedTimeLabel('');}
      root.innerHTML=available.map(slot=>`<button class="public-booking-slot${selectedSlot===slot.iso?' active':''}" type="button" aria-pressed="${selectedSlot===slot.iso}" data-booking-slot="${esc(slot.iso)}">${esc(slot.label||'Open')}</button>`).join('');
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
    const manageButton=manage?`<div class="public-booking-v2-manage" data-booking-v2-manage="true"><a class="btn btn-light btn-block" href="appointment.html?token=${encodeURIComponent(manage)}">Manage appointment</a><small>View, reschedule or cancel online while the change window is open.</small></div>`:'';
    section.innerHTML=`<div class="public-section-heading"><h2>${valid?'Appointment confirmed':'Appointment received'}</h2><span>${valid?'You’re booked':'Check booking details'}</span></div><div class="public-booking-confirmation"><h3>${esc(service)}</h3>${property?`<p><strong>${esc(property)}</strong></p>`:''}${valid?`<p><strong>${esc(when)}</strong></p>`:'<p>We could not display the booked time. Use Manage appointment to view the saved details, or contact the business.</p>'}${bootstrap.location_text?`<p>${esc(bootstrap.location_text)}</p>`:''}${pay?`<div class="public-booking-pay"><a class="btn btn-primary btn-block" href="${esc(pay)}" target="_blank" rel="noopener noreferrer"><i data-lucide="external-link" size="17"></i> Continue to payment</a><small class="public-booking-pay-note">Payment is handled by the business’s external provider. LIW does not process or verify payment.</small></div>`:''}${manageButton}</div>`;
    if(window.lucide)lucide.createIcons();
  }

  async function submitBooking(event){
    event.preventDefault();
    const form=event.currentTarget,contact=validateContact(form);if(!contact)return;
    if(!selectedServiceId){status(realtorContext?'Property showing is not set up yet. Contact the Realtor.':'Choose an appointment service.','error');return;}
    if(!form.elements.date?.value){status('Choose a date.','error');form.elements.date?.focus();return;}
    const slot=normalizeBookingTimestamp(selectedSlot);
    if(!slot){selectedSlot=null;selectedTimeLabel('');status('Choose an available time.','error');return;}
    const button=$('#booking-v1-submit'),original=button.innerHTML;
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
          await loadSlots({resetSelection:true});
          throw new Error('That time is no longer available. Choose another open time.');
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
    }catch(error){status(String(error?.message||'Unable to book this appointment.').slice(0,220),'error');}
    finally{if(document.body.contains(button)){button.disabled=false;button.innerHTML=original;if(window.lucide)lucide.createIcons();}}
  }

  function render(){
    const section=mountSection();if(!section)return;
    section.hidden=false;
    section.innerHTML=bootstrap.mode==='request'?requestMarkup():bookingMarkup();
    wireServices();
    $('#booking-v1-date')?.addEventListener('change',()=>loadSlots({resetSelection:true}));
    const form=$('#booking-v1-form');
    if(form)form.addEventListener('submit',bootstrap.mode==='request'?submitRequest:submitBooking);
    if(window.lucide)lucide.createIcons();
  }

  function openForListing(context){
    if(!bootstrapReady)return {ok:false,reason:'loading'};
    if(!bootstrap?.ok||!bootstrap.enabled)return {ok:false,reason:'disabled'};
    const id=String(context?.id||'').trim(),address=String(context?.address||'').trim().slice(0,250),serviceId=String(context?.serviceId||'').trim();
    if(!id||!address||!serviceId||!serviceById(serviceId))return {ok:false,reason:'service_unavailable'};
    realtorContext={id,address,serviceId};selectedServiceId=serviceId;selectedSlot=null;render();
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
