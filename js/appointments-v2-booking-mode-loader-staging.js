/* LIW Cards staging — cache-safe Appointments V2 booking-mode loader. */
(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  if(!document.querySelector('link[data-liw-appointments-responsive-hotfix]')){
    const responsive=document.createElement('link');
    responsive.rel='stylesheet';
    responsive.href='css/appointments-v2-responsive-hotfix-staging.css?v=20260912-layout-1';
    responsive.dataset.liwAppointmentsResponsiveHotfix='true';
    document.head.appendChild(responsive);
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
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
