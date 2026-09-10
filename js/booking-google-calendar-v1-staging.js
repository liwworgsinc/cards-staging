/* LIW Cards — Google Calendar sync controls for Appointments, staging only. */
(function(){
  'use strict';
  if(window.__LIW_BOOKING_GOOGLE_CALENDAR_V1__)return;
  window.__LIW_BOOKING_GOOGLE_CALENDAR_V1__=true;

  const ENDPOINT='https://nfwqcilqmqruysovjuyj.supabase.co/functions/v1/google-calendar-sync';
  const $=selector=>document.querySelector(selector);
  let user=null;
  let cardId='';
  let calendars=[];
  let status=null;
  let requestSeq=0;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const client=()=>{try{return window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.supabaseClient;}};
  const activeCard=()=>$('#booking-card-select')?.value||'';
  const liveBooking=()=>!$('#paid-scheduling-settings')?.hidden;
  const toastMsg=message=>{try{if(typeof toast==='function')toast(message);}catch(_){}}
  function formatTime(value){if(!value)return 'Not synced yet';try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));}catch(_){return 'Not synced yet';}}

  async function call(action,payload={}){
    const c=client();
    if(!c)throw new Error('LIW calendar service is unavailable.');
    const {data:{session}}=await c.auth.getSession();
    if(!session?.access_token)throw new Error('Please sign in again.');
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({action,...payload})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data?.ok===false){const error=new Error(data?.error||reasonText(data?.reason)||'Google Calendar request failed.');error.reason=data?.reason;error.payload=data;throw error;}
    return data;
  }
  function reasonText(reason){return ({not_configured:'LIW Google authorization still needs its one-time Google Cloud setup.',not_connected:'Connect Google Calendar first.',calendar_readonly:'That Google calendar is read-only. Choose a writable calendar or turn off Add LIW bookings.',reauth_required:'Google needs you to reconnect this account.',calendar_not_found:'That Google calendar is no longer available.'})[reason]||'';}

  function inject(){
    if($('#booking-google-calendar'))return true;
    const anchor=$('#booking-v2-block')||$('#paid-scheduling-settings');
    if(!anchor)return false;
    const section=document.createElement('section');
    section.id='booking-google-calendar';
    section.className='booking-google-calendar';
    section.innerHTML='<div class="booking-google-loading">Loading Google Calendar…</div>';
    anchor.insertAdjacentElement('afterend',section);
    return true;
  }

  function renderSetupRequired(){
    const root=$('#booking-google-calendar');if(!root)return;
    const redirect=status?.redirect_uri||`${ENDPOINT}/callback`;
    root.innerHTML=`<div class="booking-google-head"><div class="booking-google-brand"><span class="booking-google-logo">G</span><div><span class="booking-google-kicker">Calendar connection</span><h3>Google Calendar</h3></div></div><span class="booking-google-status setup">LIW setup required</span></div><div class="booking-google-setup"><strong>The LIW side is built.</strong><p>Google needs one OAuth web client before card owners can authorize their calendars. Add this exact redirect URL in Google Cloud, then store the client ID and secret in Supabase.</p><div class="booking-google-uri"><code>${esc(redirect)}</code><button type="button" id="booking-google-copy-uri">Copy</button></div><small>Once those two secrets are added, this panel automatically changes into the Connect Google Calendar flow.</small></div>`;
    $('#booking-google-copy-uri')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(redirect);toastMsg('Google redirect URL copied');}catch(_){toastMsg('Copy the redirect URL shown here');}});
  }

  function renderDisconnected(){
    const root=$('#booking-google-calendar');if(!root)return;
    root.innerHTML=`<div class="booking-google-head"><div class="booking-google-brand"><span class="booking-google-logo">G</span><div><span class="booking-google-kicker">Calendar connection</span><h3>Google Calendar</h3></div></div><span class="booking-google-status">Not connected</span></div><div class="booking-google-connect"><div><strong>Keep LIW booking and your real schedule together.</strong><p>Google busy time can block LIW slots, and confirmed LIW appointments can be added to your selected Google calendar.</p></div><button class="btn btn-primary" id="booking-google-connect" type="button"><i data-lucide="calendar-plus" size="16"></i> Connect Google Calendar</button></div><div class="booking-google-provider-note"><span>Next provider</span><strong>Microsoft Outlook / 365</strong></div>`;
    $('#booking-google-connect')?.addEventListener('click',connectGoogle);
    refreshIcons();
  }

  function calendarOptions(selected){
    if(!calendars.length)return '<option value="">No calendars found</option>';
    return calendars.map(calendar=>`<option value="${esc(calendar.id)}" ${calendar.id===selected?'selected':''}>${esc(calendar.name)}${calendar.primary?' · Primary':''}${calendar.can_write?'':' · Busy only'}</option>`).join('');
  }
  function renderConnected(){
    const root=$('#booking-google-calendar');if(!root)return;
    const setting=status?.setting||{};
    const connection=status?.connection||{};
    const last=setting.last_event_sync_at||setting.last_busy_sync_at;
    const syncError=setting.last_sync_error;
    root.innerHTML=`<div class="booking-google-head"><div class="booking-google-brand"><span class="booking-google-logo">G</span><div><span class="booking-google-kicker">Calendar connection</span><h3>Google Calendar</h3></div></div><span class="booking-google-status connected"><span></span> Connected</span></div><div class="booking-google-account"><div><span>Google account</span><strong>${esc(connection.account_email||'Connected Google account')}</strong></div><button class="booking-google-link" id="booking-google-disconnect" type="button">Disconnect</button></div><div class="booking-google-fields"><label class="booking-google-field"><span>Calendar for this LIW card</span><select class="input" id="booking-google-calendar-select">${calendarOptions(setting.calendar_id)}</select></label><label class="booking-google-toggle"><span><strong>Block Google busy time</strong><small>Busy events disappear from LIW booking availability.</small></span><input id="booking-google-block-busy" type="checkbox" ${setting.block_busy!==false?'checked':''}/></label><label class="booking-google-toggle"><span><strong>Add LIW bookings to Google</strong><small>Confirmed LIW appointments become Google Calendar events.</small></span><input id="booking-google-push" type="checkbox" ${setting.push_bookings!==false?'checked':''}/></label><label class="booking-google-toggle"><span><strong>Keep changes synced</strong><small>LIW reschedules and cancellations update the Google event.</small></span><input id="booking-google-changes" type="checkbox" ${setting.sync_changes!==false?'checked':''}/></label></div><div class="booking-google-foot"><div class="booking-google-sync-state ${syncError?'error':''}"><span>${syncError?'Sync needs attention':'Last synced'}</span><strong>${syncError?esc(syncError):esc(formatTime(last))}</strong></div><div class="booking-google-actions"><button class="btn btn-light btn-sm" id="booking-google-sync" type="button"><i data-lucide="refresh-cw" size="14"></i> Sync now</button><button class="btn btn-primary btn-sm" id="booking-google-save" type="button"><i data-lucide="check" size="14"></i> Save calendar</button></div></div><div class="booking-google-provider-note"><span>Next provider</span><strong>Microsoft Outlook / 365</strong></div>`;
    $('#booking-google-save')?.addEventListener('click',saveSettings);
    $('#booking-google-sync')?.addEventListener('click',syncNow);
    $('#booking-google-disconnect')?.addEventListener('click',disconnect);
    refreshIcons();
  }
  function renderHidden(){const root=$('#booking-google-calendar');if(root)root.hidden=true;}
  function refreshIcons(){if(window.lucide)try{lucide.createIcons();}catch(_){}}

  async function connectGoogle(){
    const button=$('#booking-google-connect');if(button){button.disabled=true;button.textContent='Opening Google…';}
    try{const result=await call('auth_url',{card_id:cardId});if(!result.url)throw new Error('Google authorization URL was not returned.');location.href=result.url;}
    catch(error){if(error.reason==='not_configured'){await load();return;}toastMsg(error.message||'Unable to connect Google Calendar');if(button){button.disabled=false;button.innerHTML='<i data-lucide="calendar-plus" size="16"></i> Connect Google Calendar';refreshIcons();}}
  }
  async function loadCalendars(){
    try{const result=await call('list_calendars',{card_id:cardId});calendars=Array.isArray(result.calendars)?result.calendars:[];}catch(error){calendars=[];if(error.reason==='reauth_required')status.connection.status='reauth_required';}
  }
  async function load(){
    const seq=++requestSeq;
    cardId=activeCard();
    if(!cardId||!liveBooking()){renderHidden();return;}
    if(!inject())return;
    const root=$('#booking-google-calendar');root.hidden=false;root.innerHTML='<div class="booking-google-loading">Loading Google Calendar…</div>';
    try{
      status=await call('status',{card_id:cardId});
      if(seq!==requestSeq)return;
      if(!status.configured){renderSetupRequired();return;}
      if(!status.connected){renderDisconnected();return;}
      if(status.connection?.status==='reauth_required'){renderDisconnected();const badge=$('#booking-google-calendar .booking-google-status');if(badge)badge.textContent='Reconnect required';return;}
      await loadCalendars();if(seq!==requestSeq)return;renderConnected();
    }catch(error){root.innerHTML=`<div class="booking-google-error"><strong>Google Calendar could not load.</strong><span>${esc(error.message||'Try again in a moment.')}</span><button class="btn btn-light btn-sm" id="booking-google-retry" type="button">Retry</button></div>`;$('#booking-google-retry')?.addEventListener('click',load);}
  }
  async function saveSettings(){
    const button=$('#booking-google-save');if(button){button.disabled=true;button.textContent='Saving…';}
    try{const selected=$('#booking-google-calendar-select')?.value||'';await call('save_settings',{card_id:cardId,calendar_id:selected,enabled:true,block_busy:$('#booking-google-block-busy')?.checked!==false,push_bookings:$('#booking-google-push')?.checked!==false,sync_changes:$('#booking-google-changes')?.checked!==false});toastMsg('Google Calendar settings saved');await load();}
    catch(error){toastMsg(error.message||'Unable to save Google Calendar');if(button){button.disabled=false;button.textContent='Save calendar';}}
  }
  async function syncNow(){
    const button=$('#booking-google-sync');if(button){button.disabled=true;button.textContent='Syncing…';}
    try{await call('sync_now',{card_id:cardId});toastMsg('Google Calendar synced');await load();}
    catch(error){toastMsg(error.message||'Google Calendar could not sync');if(button){button.disabled=false;button.textContent='Sync now';}}
  }
  async function disconnect(){
    if(!confirm('Disconnect Google Calendar from LIW Appointments? Existing Google events will stay on Google.'))return;
    const button=$('#booking-google-disconnect');if(button){button.disabled=true;button.textContent='Disconnecting…';}
    try{await call('disconnect',{card_id:cardId});toastMsg('Google Calendar disconnected');calendars=[];await load();}
    catch(error){toastMsg(error.message||'Unable to disconnect Google Calendar');if(button){button.disabled=false;button.textContent='Disconnect';}}
  }
  function handleCallbackState(){
    const params=new URLSearchParams(location.search),state=params.get('google_calendar'),requestedCard=params.get('card');
    if(!state)return;
    const select=$('#booking-card-select');if(requestedCard&&select&&[...select.options].some(o=>o.value===requestedCard)){select.value=requestedCard;select.dispatchEvent(new Event('change',{bubbles:true}));}
    if(state==='connected')toastMsg('Google Calendar connected');
    if(state==='error')toastMsg(`Google Calendar could not connect${params.get('reason')?`: ${params.get('reason')}`:''}`);
    params.delete('google_calendar');params.delete('reason');params.delete('card');const query=params.toString();history.replaceState({},'',`${location.pathname}${query?'?'+query:''}${location.hash}`);
  }
  async function init(){
    try{user=await requireUser();if(!user)return;let tries=0;while(!inject()&&tries<30){await new Promise(resolve=>setTimeout(resolve,100));tries++;}handleCallbackState();$('#booking-card-select')?.addEventListener('change',()=>setTimeout(load,120));await load();}
    catch(error){console.warn('[LIW Google Calendar]',error);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,50),{once:true});else setTimeout(init,50);
})();
