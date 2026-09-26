/* LIW Cards — public Appointment V2 management, staging only */
(function(){
  'use strict';
  const root=document.getElementById('manage-card');
  const token=new URLSearchParams(location.search).get('token')||'';
  let data=null;
  let selectedSlot='';
  let slotRequestId=0;
  const calendarEndpoint='https://nfwqcilqmqruysovjuyj.supabase.co/functions/v1/google-calendar-sync';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const client=()=>{try{return typeof supabaseClient!=='undefined'?supabaseClient:window.supabaseClient;}catch(_){return window.supabaseClient;}};
  const validToken=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  function syncCalendar(){if(!validToken(token))return;fetch(calendarEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync_appointment',manage_token:token})}).catch(()=>{});}
  function when(iso,tz){const date=new Date(String(iso||'').replace(/\\?"T\\?"/g,'T'));if(!Number.isFinite(date.getTime()))return 'Check with the business';try{return new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:tz||'America/New_York',timeZoneName:'short'}).format(date);}catch(_){return date.toLocaleString();}}
  function statusLabel(value){return ({confirmed:'Confirmed',cancelled:'Cancelled',completed:'Completed',no_show:'No show'})[value]||value||'Appointment';}
  function errorView(title,copy){root.innerHTML=`<div class="manage-error"><div class="manage-kicker">LIW Appointment</div><h1>${esc(title)}</h1><p>${esc(copy)}</p></div>`;}
  function note(message,type=''){const el=document.getElementById('manage-note');if(!el)return;el.textContent=message||'';el.className=`manage-note${type?' '+type:''}`;el.hidden=!message;}
  function render(){
    const canChange=data.can_reschedule||data.can_cancel;
    root.innerHTML=`<div class="manage-inner"><div class="manage-kicker">Manage appointment</div><div class="manage-head"><div><h1>${esc(data.business_name||'Your appointment')}</h1></div><span class="manage-status ${esc(data.status)}">${esc(statusLabel(data.status))}</span></div><div class="manage-summary"><div class="manage-row"><span>Service</span><strong>${esc(data.service_name||'Appointment')}</strong></div><div class="manage-row"><span>Date & time</span><strong id="manage-when">${esc(when(data.start_at,data.timezone))}</strong></div>${data.is_property_showing&&data.property_address?`<div class="manage-row"><span>Property</span><strong>${esc(data.property_address)}</strong></div>`:''}${data.location_text?`<div class="manage-row"><span>Location</span><strong>${esc(data.location_text)}</strong></div>`:''}<div class="manage-row"><span>Name</span><strong>${esc(data.customer_name||'Client')}</strong></div></div>${canChange?`<div class="manage-actions">${data.can_reschedule?'<button class="manage-btn manage-btn-primary" id="manage-reschedule" type="button">Reschedule</button>':''}${data.can_cancel?'<button class="manage-btn manage-btn-danger" id="manage-cancel" type="button">Cancel appointment</button>':''}</div>`:`<div class="manage-note">Online changes are no longer available for this appointment. Contact the business directly if you need help.</div>`}<div class="manage-panel" id="reschedule-panel" hidden><h2>Choose a new time</h2><p>Select a date, then choose one of the available times.</p><div class="manage-field"><label for="manage-date">New date</label><input class="manage-input" id="manage-date" type="date"/></div><div class="manage-slots" id="manage-slots"></div><div class="manage-actions"><button class="manage-btn manage-btn-light" data-close-panel="reschedule" type="button">Back</button><button class="manage-btn manage-btn-primary" id="manage-save-reschedule" type="button" disabled>Confirm new time</button></div></div><div class="manage-panel" id="cancel-panel" hidden><h2>Cancel appointment</h2><p>This will release your reserved time.</p><div class="manage-field"><label for="manage-cancel-reason">Reason (optional)</label><textarea class="manage-input manage-cancel-copy" id="manage-cancel-reason" maxlength="500" placeholder="Add a short note for the business"></textarea></div><div class="manage-actions"><button class="manage-btn manage-btn-light" data-close-panel="cancel" type="button">Keep appointment</button><button class="manage-btn manage-btn-danger" id="manage-confirm-cancel" type="button">Yes, cancel</button></div></div><div class="manage-note" id="manage-note" hidden></div><div class="manage-private-link"><strong>Keep this private link</strong><p>Bookmark or copy this page to return to your appointment after closing the card.</p><button type="button" class="manage-btn manage-btn-light" id="manage-copy-link">Copy management link</button><small id="manage-copy-result" role="status" aria-live="polite">Anyone with this link can manage your booking.</small></div></div>`;
    wire();
  }
  function openPanel(name){document.getElementById('reschedule-panel').hidden=name!=='reschedule';document.getElementById('cancel-panel').hidden=name!=='cancel';note('');if(name==='reschedule'){const date=document.getElementById('manage-date');if(!date.value){const d=new Date();date.value=d.toISOString().slice(0,10);}loadSlots();}}
  async function loadSlots(){
    const date=document.getElementById('manage-date')?.value;
    const slots=document.getElementById('manage-slots');
    const submit=document.getElementById('manage-save-reschedule');
    selectedSlot='';if(submit)submit.disabled=true;
    const seq=++slotRequestId;
    if(!date||!slots)return;
    slots.innerHTML='<div class="manage-empty">Checking open times…</div>';
    try{
      const method=data?.is_property_showing?'realtor_manage_showing_slots_staging':'booking_manage_available_slots_staging_v3';
      const {data:result,error}=await client().rpc(method,{p_token:token,p_date:date});
      if(error)throw error;
      if(seq!==slotRequestId||document.getElementById('manage-slots')!==slots||document.getElementById('manage-date')?.value!==date)return;
      const items=Array.isArray(result?.slots)?result.slots:[];
      if(!result?.ok||!items.length){
        slots.innerHTML='<div class="manage-empty">'+(result?.reason==='changes_closed'?'Online changes are closed for this booking.':'No open times on this date. Try another day.')+'</div>';return;
      }
      slots.innerHTML=items.map(item=>`<button class="manage-slot" type="button" aria-pressed="false" data-slot="${esc(item.start_at)}">${esc(item.label||'Open')}</button>`).join('');
      slots.querySelectorAll('[data-slot]').forEach(button=>button.addEventListener('click',()=>{
        selectedSlot=button.dataset.slot;
        slots.querySelectorAll('[data-slot]').forEach(el=>{const active=el===button;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
        if(submit)submit.disabled=false;
      }));
    }catch(error){if(seq===slotRequestId)slots.innerHTML='<div class="manage-empty">Open times could not be loaded. Try again.</div>';}
  }
  async function reschedule(){
    if(!selectedSlot)return;
    const btn=document.getElementById('manage-save-reschedule');
    if(!btn||btn.disabled)return;
    btn.disabled=true;btn.textContent='Rescheduling…';note('');
    try{
      const method=data?.is_property_showing?'realtor_reschedule_showing_staging':'booking_reschedule_staging_v3';
      const {data:result,error}=await client().rpc(method,{p_token:token,p_start_at:selectedSlot});
      if(error)throw error;
      if(!result?.ok)throw new Error(result?.reason==='slot_unavailable'?'That time is no longer available. Choose another time.':'This appointment can no longer be rescheduled.');
      syncCalendar();await load();
      note('Appointment rescheduled.','success');
    }catch(error){note(error?.message||'Unable to reschedule.','error');btn.disabled=false;btn.textContent='Confirm new time';}
  }
  async function cancel(){
    const btn=document.getElementById('manage-confirm-cancel');
    if(!btn||btn.disabled)return;
    btn.disabled=true;btn.textContent='Cancelling…';note('');
    try{
      const reason=document.getElementById('manage-cancel-reason')?.value||null;
      const {data:result,error}=await client().rpc('booking_cancel_staging_v3',{p_token:token,p_reason:reason});
      if(error)throw error;
      if(!result?.ok)throw new Error(result?.reason==='changes_closed'?'The online cancellation window has closed.':'This appointment cannot be cancelled online.');
      syncCalendar();await load();note('Appointment cancelled.','success');
    }catch(error){note(error?.message||'Unable to cancel.','error');btn.disabled=false;btn.textContent='Yes, cancel';}
  }
  async function copyManageLink(){
    const feedback=document.getElementById('manage-copy-result');
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(location.href);
      else{
        const input=document.createElement('textarea');
        input.value=location.href;input.setAttribute('readonly','');
        input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);
        input.select();const ok=document.execCommand('copy');input.remove();
        if(!ok)throw Error('Copy unsupported');
      }
      if(feedback)feedback.textContent='Private link copied. Save it somewhere you can find it.';
    }catch(_){if(feedback)feedback.textContent='Copy is unavailable. Bookmark this page instead.';}
  }
  function wire(){document.getElementById('manage-reschedule')?.addEventListener('click',()=>openPanel('reschedule'));document.getElementById('manage-cancel')?.addEventListener('click',()=>openPanel('cancel'));document.querySelectorAll('[data-close-panel]').forEach(button=>button.addEventListener('click',()=>openPanel('')));document.getElementById('manage-date')?.addEventListener('change',loadSlots);document.getElementById('manage-save-reschedule')?.addEventListener('click',reschedule);document.getElementById('manage-confirm-cancel')?.addEventListener('click',cancel);document.getElementById('manage-copy-link')?.addEventListener('click',copyManageLink);}
  async function load(){if(!validToken(token)){errorView('Invalid appointment link','This management link is incomplete or invalid.');return;}try{const c=client();if(!c)throw new Error('Booking service unavailable');const {data:result,error}=await c.rpc('realtor_manage_appointment_staging',{p_token:token});if(error)throw error;if(!result?.ok){errorView('Appointment not found','This management link may have expired or is not valid.');return;}data=result;render();}catch(error){console.warn('LIW booking manage v2:',error);errorView('Unable to load appointment','Please try this link again in a moment.');}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
