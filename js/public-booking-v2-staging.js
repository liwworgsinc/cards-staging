/* LIW Cards — Appointments V2 public bridge, staging only. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_BOOKING_V2__)return;
  window.__LIW_PUBLIC_BOOKING_V2__=true;

  const slug=new URLSearchParams(location.search).get('slug')||'';
  let manageToken='';
  let patched=false;
  let routeReady=false;
  let route={mode:'auto',external_url:''};
  const manageUrl=token=>`appointment.html?token=${encodeURIComponent(token)}`;
  const calendarEndpoint='https://nfwqcilqmqruysovjuyj.supabase.co/functions/v1/google-calendar-sync';

  function client(){
    try{return window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.supabaseClient||null;}
  }

  function safeExternalUrl(value){
    try{
      const url=new URL(String(value||'').trim());
      return ['http:','https:'].includes(url.protocol)?url.href:'';
    }catch(_){return '';}
  }

  function bookingActions(actions=document.getElementById('business-actions')){
    if(!actions)return [];
    return [...actions.querySelectorAll('[data-business-event="booking_click"],[data-event="booking_click"]')];
  }

  function removeExternalBookingActions(){
    bookingActions().forEach(link=>link.remove());
  }

  function hidePendingExternalActions(){
    if(routeReady)return;
    bookingActions().forEach(link=>{link.hidden=true;});
  }

  function syncCalendar(token){
    if(!token)return;
    fetch(calendarEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync_appointment',manage_token:token})}).catch(()=>{});
  }

  function nativeBookingLabel(section){
    const heading=String(section?.querySelector('.public-section-heading h2')?.textContent||'').trim().toLowerCase();
    return heading.includes('request service')?'Request service':'Book an appointment';
  }

  function ensureExternalBookingAction(){
    const actions=document.getElementById('business-actions');
    if(!actions)return false;
    const href=safeExternalUrl(route.external_url);
    const section=document.querySelector('#booking-v1-section');
    if(section)section.hidden=true;
    actions.querySelector('[data-liw-native-booking-action]')?.remove();

    const links=bookingActions(actions);
    links.slice(1).forEach(link=>link.remove());
    let action=links[0]||null;
    if(!href){
      action?.remove();
      return false;
    }

    if(!action){
      action=document.createElement('a');
      action.className='business-action primary';
      action.dataset.businessEvent='booking_click';
      action.addEventListener('click',()=>{try{if(typeof window.track==='function')window.track('booking_click');}catch(_){ }});
      actions.prepend(action);
    }
    action.href=href;
    action.target='_blank';
    action.rel='noopener';
    action.hidden=false;
    action.innerHTML='<i data-lucide="calendar-check-2" size="19"></i><span>Book an appointment</span><i data-lucide="arrow-up-right" size="17"></i>';
    actions.hidden=false;
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function syncNativeBookingAction(){
    const section=document.querySelector('#booking-v1-section');
    const actions=document.getElementById('business-actions');
    if(!actions)return false;

    if(!routeReady){
      hidePendingExternalActions();
      return false;
    }

    if(route.mode==='external'){
      ensureExternalBookingAction();
      return false;
    }

    const existing=actions.querySelector('[data-liw-native-booking-action]');
    const active=Boolean(section&&!section.hidden&&section.textContent.trim());
    if(!active){
      existing?.remove();
      if(route.mode==='liw')removeExternalBookingActions();
      return false;
    }

    // LIW mode always wins over a legacy shared booking_url in staging. In automatic
    // fallback mode, native booking also wins once its section is actually available.
    removeExternalBookingActions();

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
        try{if(typeof window.track==='function')window.track('native_booking_click');}catch(_){ }
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

  function applyRoute(){
    if(!routeReady){hidePendingExternalActions();return;}
    if(route.mode==='external')ensureExternalBookingAction();
    else syncNativeBookingAction();
  }

  async function loadRoute(){
    if(!slug){routeReady=true;applyRoute();return;}
    const c=client();
    if(!c){setTimeout(loadRoute,80);return;}
    try{
      const {data,error}=await c.rpc('booking_public_route_staging',{p_slug:slug});
      if(error)throw error;
      if(data?.ok){
        route={mode:data.mode==='external'?'external':data.mode==='liw'?'liw':'auto',external_url:String(data.external_url||'')};
      }
    }catch(error){
      console.warn('LIW booking route staging:',error);
      route={mode:'auto',external_url:''};
    }finally{
      routeReady=true;
      applyRoute();
    }
  }

  function addManageAction(){
    syncNativeBookingAction();
    if(route.mode==='external'||!manageToken)return;
    const confirmation=document.querySelector('#booking-v1-section .public-booking-confirmation');
    if(!confirmation||confirmation.querySelector('[data-booking-v2-manage]'))return;
    const wrap=document.createElement('div');
    wrap.className='public-booking-v2-manage';
    wrap.dataset.bookingV2Manage='true';
    wrap.innerHTML=`<a class="btn btn-light btn-block" href="${manageUrl(manageToken)}"><span>Manage appointment</span></a><small>Reschedule or cancel online while the business's change window is open.</small>`;
    confirmation.appendChild(wrap);
  }

  function patchClient(){
    const c=client();
    if(!c||patched||typeof c.rpc!=='function')return false;
    patched=true;
    const originalRpc=c.rpc.bind(c);
    c.rpc=function(name,args,options){
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

  // Hide a legacy external CTA while the staging route preference is being resolved,
  // then keep presentation synchronized as the native V1 renderer arrives asynchronously.
  hidePendingExternalActions();
  loadRoute();
  let ctaAttempts=0;
  const ctaTimer=setInterval(()=>{
    ctaAttempts+=1;
    applyRoute();
    if((routeReady&&route.mode==='external'&&ensureExternalBookingAction())||(routeReady&&syncNativeBookingAction())||ctaAttempts>=60)clearInterval(ctaTimer);
  },250);

  const observer=new MutationObserver(()=>{
    applyRoute();
    addManageAction();
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();