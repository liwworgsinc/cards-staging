/* LIW Cards — Appointments V2 owner controls, staging only. */
(function(){
  'use strict';
  if(window.__LIW_APPOINTMENTS_V2_OWNER__)return;
  window.__LIW_APPOINTMENTS_V2_OWNER__=true;
  let user=null;
  let cardId='';
  let activity=[];
  let activityMap=new Map();
  let currentFilter='all';
  let observerTimer=0;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toastMsg=m=>{try{if(typeof toast==='function')toast(m);}catch(_){}};
  function isLiveMode(){return !$('#paid-scheduling-settings')?.hidden;}
  function activeCard(){return $('#booking-card-select')?.value||'';}
  function formatBlackout(row){try{const a=new Date(row.starts_at),b=new Date(row.ends_at);return `${a.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} – ${b.toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}`;}catch(_){return 'Blocked time';}}
  function inject(){
    if($('#booking-v2-block'))return;
    const paid=$('#paid-scheduling-settings');if(!paid)return;
    const block=document.createElement('section');
    block.id='booking-v2-block';block.className='booking-v2-block';
    block.innerHTML=`<div class="booking-v2-title"><div><h3>Client controls & reminders</h3><p>Let clients manage confirmed appointments and control automatic reminders.</p></div><span class="booking-v2-badge">V2</span></div><div class="booking-v2-controls"><label class="booking-v2-control"><span>Client rescheduling<small>Allow clients to choose another open time.</small></span><input id="booking-v2-reschedule" type="checkbox"/></label><label class="booking-v2-control"><span>Client cancellation<small>Allow clients to release their appointment online.</small></span><input id="booking-v2-cancel" type="checkbox"/></label><label class="booking-v2-control"><span>Change cutoff<small>Stop online changes this long before start.</small></span><select id="booking-v2-cutoff"><option value="0">Any time</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="240">4 hours</option><option value="720">12 hours</option><option value="1440">24 hours</option></select></label><label class="booking-v2-control"><span>24-hour reminder<small>Email clients before the appointment.</small></span><input id="booking-v2-reminder24" type="checkbox"/></label><label class="booking-v2-control"><span>2-hour reminder<small>Optional same-day email reminder.</small></span><input id="booking-v2-reminder2" type="checkbox"/></label></div><div class="booking-v2-blackouts"><div class="booking-v2-blackout-head"><strong>Blackout / time off</strong><span class="muted">Blocks live booking slots.</span></div><div class="booking-v2-blackout-form"><label>Starts<input class="input" id="booking-v2-blackout-start" type="datetime-local"/></label><label>Ends<input class="input" id="booking-v2-blackout-end" type="datetime-local"/></label><label>Label<input class="input" id="booking-v2-blackout-label" maxlength="100" placeholder="Time off"/></label><button class="btn btn-light btn-sm" id="booking-v2-add-blackout" type="button">Add blackout</button></div><div class="booking-v2-blackout-list" id="booking-v2-blackout-list"></div></div>`;
    paid.insertAdjacentElement('afterend',block);
    $('#booking-v2-add-blackout')?.addEventListener('click',addBlackout);
  }
  function injectFilters(){
    const feed=$('#booking-feed');if(!feed)return;
    let filters=$('#booking-v2-filters');
    if(!filters){filters=document.createElement('div');filters.id='booking-v2-filters';filters.className='booking-v2-filters';filters.innerHTML=['all','today','upcoming','requests','completed','cancelled'].map(v=>`<button class="booking-v2-filter${v==='all'?' active':''}" data-v2-filter="${v}" type="button">${v[0].toUpperCase()+v.slice(1)}</button>`).join('');feed.parentNode.insertBefore(filters,feed);filters.addEventListener('click',e=>{const button=e.target.closest('[data-v2-filter]');if(!button)return;currentFilter=button.dataset.v2Filter;filters.querySelectorAll('[data-v2-filter]').forEach(b=>b.classList.toggle('active',b===button));applyFilter();});}
  }
  async function loadSettings(){
    if(!cardId||!isLiveMode()){$('#booking-v2-block')?.setAttribute('hidden','');return;}
    $('#booking-v2-block')?.removeAttribute('hidden');
    const {data,error}=await supabaseClient.from('booking_settings').select('allow_client_reschedule,allow_client_cancel,change_notice_minutes,reminder_24h_enabled,reminder_2h_enabled').eq('card_id',cardId).maybeSingle();
    if(error)throw error;const row=data||{};
    $('#booking-v2-reschedule').checked=row.allow_client_reschedule!==false;
    $('#booking-v2-cancel').checked=row.allow_client_cancel!==false;
    $('#booking-v2-cutoff').value=String(row.change_notice_minutes??120);
    $('#booking-v2-reminder24').checked=row.reminder_24h_enabled!==false;
    $('#booking-v2-reminder2').checked=row.reminder_2h_enabled===true;
  }
  async function saveSettings(){
    if(!cardId||!isLiveMode()||!user)return;
    const {error}=await supabaseClient.from('booking_settings').upsert({card_id:cardId,user_id:user.id,allow_client_reschedule:$('#booking-v2-reschedule').checked,allow_client_cancel:$('#booking-v2-cancel').checked,change_notice_minutes:Number($('#booking-v2-cutoff').value||120),reminder_24h_enabled:$('#booking-v2-reminder24').checked,reminder_2h_enabled:$('#booking-v2-reminder2').checked},{onConflict:'card_id'});
    if(error)throw error;
  }
  async function loadBlackouts(){
    const root=$('#booking-v2-blackout-list');if(!root||!cardId)return;root.innerHTML='<div class="booking-v2-empty">Loading blocked times…</div>';
    const {data,error}=await supabaseClient.from('booking_blackouts').select('id,starts_at,ends_at,label').eq('card_id',cardId).gte('ends_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(50);
    if(error)throw error;const rows=data||[];
    root.innerHTML=rows.length?rows.map(row=>`<div class="booking-v2-blackout-row" data-blackout-id="${esc(row.id)}"><div><strong>${esc(row.label||'Unavailable')}</strong><small>${esc(formatBlackout(row))}</small></div><button type="button" data-delete-blackout>Remove</button></div>`).join(''):'<div class="booking-v2-empty">No upcoming blackout times.</div>';
    root.querySelectorAll('[data-delete-blackout]').forEach(button=>button.addEventListener('click',async()=>{const row=button.closest('[data-blackout-id]');button.disabled=true;const {error}=await supabaseClient.from('booking_blackouts').delete().eq('id',row.dataset.blackoutId).eq('user_id',user.id);if(error){toastMsg(error.message);button.disabled=false;return;}await loadBlackouts();toastMsg('Blackout removed');}));
  }
  async function addBlackout(){
    if(!cardId||!user)return;const start=$('#booking-v2-blackout-start').value,end=$('#booking-v2-blackout-end').value,label=$('#booking-v2-blackout-label').value.trim();
    if(!start||!end){toastMsg('Choose a start and end time');return;}const a=new Date(start),b=new Date(end);if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime())||b<=a){toastMsg('End time must be after start time');return;}
    const button=$('#booking-v2-add-blackout');button.disabled=true;try{const {error}=await supabaseClient.from('booking_blackouts').insert({card_id:cardId,user_id:user.id,starts_at:a.toISOString(),ends_at:b.toISOString(),label:label||null});if(error)throw error;$('#booking-v2-blackout-start').value='';$('#booking-v2-blackout-end').value='';$('#booking-v2-blackout-label').value='';await loadBlackouts();toastMsg('Blackout added');}catch(error){toastMsg(error?.message||'Unable to add blackout');}finally{button.disabled=false;}
  }
  async function loadActivityData(){
    if(!cardId)return;const {data,error}=await supabaseClient.from('booking_appointments').select('id,kind,status,start_at,preferred_start_at,timezone,manage_token').eq('card_id',cardId).eq('user_id',user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;activity=data||[];activityMap=new Map(activity.map(row=>[String(row.id),row]));decorateActivity();
  }
  function sameDay(date){const d=new Date(date),n=new Date();return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate();}
  function matches(row){const now=Date.now(),time=new Date(row.start_at||row.preferred_start_at||0).getTime();if(currentFilter==='all')return true;if(currentFilter==='today')return Boolean(time)&&sameDay(time);if(currentFilter==='upcoming')return row.kind==='booking'&&row.status==='confirmed'&&time>=now;if(currentFilter==='requests')return row.kind==='request'&&row.status==='requested';if(currentFilter==='completed')return row.status==='completed';if(currentFilter==='cancelled')return row.status==='cancelled';return true;}
  function applyFilter(){document.querySelectorAll('#booking-feed [data-appointment-id]').forEach(el=>{const row=activityMap.get(String(el.dataset.appointmentId));el.hidden=row?!matches(row):false;});}
  function decorateActivity(){
    injectFilters();document.querySelectorAll('#booking-feed [data-appointment-id]').forEach(el=>{const row=activityMap.get(String(el.dataset.appointmentId));if(!row)return;const actions=el.querySelector('.booking-item-actions');if(actions&&row.kind==='booking'&&row.manage_token&&!actions.querySelector('[data-v2-manage-link]')){const link=document.createElement('a');link.className='btn btn-light booking-v2-manage-link';link.dataset.v2ManageLink='true';link.href=`appointment.html?token=${encodeURIComponent(row.manage_token)}`;link.target='_blank';link.rel='noopener';link.textContent='Manage';actions.appendChild(link);}});applyFilter();
  }
  function scheduleDecorate(){clearTimeout(observerTimer);observerTimer=setTimeout(()=>decorateActivity(),40);}
  async function loadCard(){cardId=activeCard();if(!cardId)return;try{await Promise.all([loadSettings(),loadBlackouts(),loadActivityData()]);}catch(error){console.warn('LIW Appointments V2:',error);}}
  async function init(){
    try{user=await requireUser();if(!user)return;inject();injectFilters();cardId=activeCard();$('#booking-card-select')?.addEventListener('change',()=>setTimeout(loadCard,100));$('#booking-save')?.addEventListener('click',()=>saveSettings().catch(error=>console.warn('LIW V2 save:',error)));const feed=$('#booking-feed');if(feed)new MutationObserver(scheduleDecorate).observe(feed,{childList:true,subtree:true});await loadCard();const kicker=document.querySelector('.booking-kicker');if(kicker)kicker.lastChild.textContent=' LIW Booking V2';}
    catch(error){console.warn('LIW Appointments V2 init:',error);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})();
