/* LIW Cards — Appointments V2 public bridge, staging only. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_BOOKING_V2__)return;
  window.__LIW_PUBLIC_BOOKING_V2__=true;
  let manageToken='';
  let patched=false;
  const manageUrl=token=>`appointment.html?token=${encodeURIComponent(token)}`;
  const calendarEndpoint='https://nfwqcilqmqruysovjuyj.supabase.co/functions/v1/google-calendar-sync';

  function syncCalendar(token){
    if(!token)return;
    fetch(calendarEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync_appointment',manage_token:token})}).catch(()=>{});
  }

  function nativeBookingLabel(section){
    const heading=String(section?.querySelector('.public-section-heading h2')?.textContent||'').trim().toLowerCase();
    return heading.includes('request service')?'Request service':'Book an appointment';
  }

  function syncNativeBookingAction(){
    const section=document.querySelector('#booking-v1-section');
    const actions=document.getElementById('business-actions');
    if(!actions)return false;

    const existing=actions.querySelector('[data-liw-native-booking-action]');
    const active=Boolean(section&&!section.hidden&&section.textContent.trim());
    if(!active){
      existing?.remove();
      return false;
    }

    // Remove only the old external booking action. Inquiry/payment actions remain.
    actions.querySelectorAll('[data-event="booking_click"]').forEach(link=>link.remove());

    const label=nativeBookingLabel(section);
    let action=actions.querySelector('[data-liw-native-booking-action]');
    if(!action){
      action=document.createElement('a');
      action.className='business-action primary';
      action.href='#booking-v1-section';
      action.dataset.liwNativeBookingAction='true';
      action.dataset.event='native_booking_click';
      action.addEventListener('click',event=>{
        event.preventDefault();
        section.scrollIntoView({behavior:'smooth',block:'start'});
        const firstControl=section.querySelector('button,input,select,textarea');
        try{firstControl?.focus({preventScroll:true});}catch(_){ }
      });
      actions.prepend(action);
    }

    const current=action.querySelector('[data-liw-native-booking-label]')?.textContent||'';
    if(current!==label){
      action.innerHTML=`<i data-lucide="calendar-check-2" size="18"></i><span data-liw-native-booking-label>${label}</span><i data-lucide="arrow-right" size="17"></i>`;
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
    actions.hidden=false;
    return true;
  }

  function addManageAction(){
    syncNativeBookingAction();
    if(!manageToken)return;
    const confirmation=document.querySelector('#booking-v1-section .public-booking-confirmation');
    if(!confirmation||confirmation.querySelector('[data-booking-v2-manage]'))return;
    const wrap=document.createElement('div');
    wrap.className='public-booking-v2-manage';
    wrap.dataset.bookingV2Manage='true';
    wrap.innerHTML=`<a class="btn btn-light btn-block" href="${manageUrl(manageToken)}"><span>Manage appointment</span></a><small>Reschedule or cancel online while the business's change window is open.</small>`;
    confirmation.appendChild(wrap);
  }

  function patchClient(){
    let client=null;
    try{client=window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){client=window.supabaseClient;}
    if(!client||patched||typeof client.rpc!=='function')return false;
    patched=true;
    const originalRpc=client.rpc.bind(client);
    client.rpc=function(name,args,options){
      if(name!=='booking_create_appointment')return originalRpc(name,args,options);
      const nextArgs={...(args||{}),p_environment:'staging'};
      return originalRpc('booking_create_appointment_v2',nextArgs,options).then(result=>{
        manageToken=String(result?.data?.manage_token||'');
        if(manageToken)syncCalendar(manageToken);
        setTimeout(addManageAction,0);
        return result;
      });
    };
    return true;
  }

  const rpcTimer=setInterval(()=>{if(patchClient())clearInterval(rpcTimer);},50);
  setTimeout(()=>clearInterval(rpcTimer),10000);
  patchClient();

  // V1 renders asynchronously after the public bootstrap RPC. Retry independently
  // of DOM observer timing so the native Book CTA cannot be missed on slower phones.
  let ctaAttempts=0;
  const ctaTimer=setInterval(()=>{
    ctaAttempts+=1;
    if(syncNativeBookingAction()||ctaAttempts>=40)clearInterval(ctaTimer);
  },250);
  syncNativeBookingAction();

  const observer=new MutationObserver(()=>{
    syncNativeBookingAction();
    addManageAction();
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
