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

  function suppressLegacyBookingAction(){
    const nativeSection=document.querySelector('#booking-v1-section');
    if(!nativeSection||nativeSection.hidden)return;
    const businessActions=document.getElementById('business-actions');
    businessActions?.querySelectorAll('[data-event="booking_click"]').forEach(link=>link.remove());
    if(businessActions&&!businessActions.children.length)businessActions.hidden=true;
  }

  function addManageAction(){
    suppressLegacyBookingAction();
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

  const timer=setInterval(()=>{if(patchClient())clearInterval(timer);},50);
  setTimeout(()=>clearInterval(timer),10000);
  patchClient();
  suppressLegacyBookingAction();
  const observer=new MutationObserver(()=>addManageAction());
  observer.observe(document.body,{childList:true,subtree:true});
})();
