/* LIW Cards staging — cache-safe Appointments V2 booking-mode loader. */
(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const GOOGLE_ENDPOINT='/functions/v1/google-calendar-sync';

  /* Compatibility guard for a browser that still has an older cached Google Calendar
     controller. Never let placeholder select text such as "Loading cards..." reach
     Supabase as card_id. Wait briefly for the real UUID and replay only that request. */
  if(!window.__LIW_GOOGLE_CARD_ID_FETCH_GUARD__){
    window.__LIW_GOOGLE_CARD_ID_FETCH_GUARD__=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:String(input?.url||'');
      if(url.includes(GOOGLE_ENDPOINT)&&init?.body){
        try{
          const payload=JSON.parse(String(init.body));
          if(Object.prototype.hasOwnProperty.call(payload,'card_id')&&!UUID_RE.test(String(payload.card_id||'').trim())){
            let replacement='';
            for(let attempt=0;attempt<60;attempt+=1){
              const value=String(document.querySelector('#booking-card-select')?.value||'').trim();
              if(UUID_RE.test(value)){replacement=value;break;}
              await new Promise(resolve=>setTimeout(resolve,100));
            }
            if(replacement){
              payload.card_id=replacement;
              init={...init,body:JSON.stringify(payload)};
            }else{
              return new Response(JSON.stringify({ok:false,error:'Choose a card before loading Google Calendar.'}),{status:400,headers:{'Content-Type':'application/json'}});
            }
          }
        }catch(_){ }
      }
      return nativeFetch(input,init);
    };
  }

  if(!document.querySelector('link[data-liw-appointments-responsive-hotfix]')){
    const responsive=document.createElement('link');
    responsive.rel='stylesheet';
    responsive.href='css/appointments-v2-responsive-hotfix-staging.css?v=20260915-duration-2';
    responsive.dataset.liwAppointmentsResponsiveHotfix='true';
    document.head.appendChild(responsive);
  }

  if(!document.querySelector('script[data-liw-appointments-name-first-picker]')){
    const picker=document.createElement('script');
    picker.src='js/appointments-card-picker-name-first-staging.js?v=20260912-name-first-1';
    picker.defer=true;
    picker.dataset.liwAppointmentsNameFirstPicker='true';
    document.body.appendChild(picker);
  }

  // Reserve the V2 selector before the legacy label bundle runs so it cannot mount
  // a stale cached copy of the owner controller.
  if(!document.querySelector('link[data-liw-appointments-v2]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/booking-appointments-v2-staging.css?v=20260912-booking-mode-1';
    style.dataset.liwAppointmentsV2='booking-mode';
    document.head.appendChild(style);
  }

  let marker=document.querySelector('script[data-liw-appointments-v2]');
  if(!marker){
    marker=document.createElement('script');
    marker.type='application/json';
    marker.dataset.liwAppointmentsV2='pending-booking-mode';
    document.body.appendChild(marker);
  }

  function cardReady(){
    const value=String(document.querySelector('#booking-card-select')?.value||'');
    return UUID_RE.test(value);
  }

  function mount(attempt=0){
    if(window.__LIW_APPOINTMENTS_V2_OWNER__)return;
    if(!cardReady()&&attempt<50){setTimeout(()=>mount(attempt+1),100);return;}
    marker?.remove();
    const script=document.createElement('script');
    script.src='js/booking-appointments-v2-staging.js?v=20260912-booking-mode-1';
    script.async=false;
    script.dataset.liwAppointmentsV2='booking-mode';
    document.body.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>mount(),80),{once:true});
  else setTimeout(()=>mount(),80);
})();
