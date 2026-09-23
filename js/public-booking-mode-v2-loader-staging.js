/* LIW Cards staging — cache-safe public booking-mode V2 loader. */
(function(){
  'use strict';
  if(new URLSearchParams(location.search).get('embed')==='1')return;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  if(!document.querySelector('link[data-liw-booking-v2]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/public-booking-v2-staging.css?v=20260912-booking-mode-1';
    style.dataset.liwBookingV2='booking-mode';
    document.head.appendChild(style);
  }

  let marker=document.querySelector('script[data-liw-booking-v2]');
  if(!marker){
    marker=document.createElement('script');
    marker.type='application/json';
    marker.dataset.liwBookingV2='pending-booking-mode';
    document.body.appendChild(marker);
  }

  function exposeClient(){
    try{
      if(!window.supabaseClient&&typeof supabaseClient!=='undefined')window.supabaseClient=supabaseClient;
    }catch(_){ }
  }

  function mountBookingV1(){
    exposeClient();
    if(!document.querySelector('link[data-liw-booking-v1]')){
      const style=document.createElement('link');
      style.rel='stylesheet';
      style.href='css/public-booking-v1-staging.css?v=20260922-integration-hardening-1';
      style.dataset.liwBookingV1='true';
      document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-liw-booking-v1]')){
      const script=document.createElement('script');
      script.src='js/public-booking-v1-staging.js?v=20260922-integration-hardening-1';
      script.async=false;
      script.dataset.liwBookingV1='true';
      document.body.appendChild(script);
    }
  }

  function mountBarberRoute(){
    if(document.querySelector('script[data-liw-barber-booking-route-v2]'))return;
    const bridge=document.createElement('script');
    bridge.src='js/public-barber-booking-route-v2-staging.js?v=20260912-booking-mode-1';
    bridge.async=false;
    bridge.dataset.liwBarberBookingRouteV2='true';
    document.body.appendChild(bridge);
  }

  function mountExperienceBridge(){
    if(document.querySelector('script[data-liw-experience-booking-bridge]'))return;
    const bridge=document.createElement('script');
    bridge.src='js/public-experience-booking-bridge-staging.js?v=20260922-integration-hardening-1';
    bridge.async=false;
    bridge.dataset.liwExperienceBookingBridge='true';
    document.body.appendChild(bridge);
  }

  function mount(){
    mountBookingV1();
    mountBarberRoute();
    mountExperienceBridge();
    if(window.__LIW_PUBLIC_BOOKING_V2__)return;
    marker?.remove();
    const script=document.createElement('script');
    script.src='js/public-booking-v2-staging.js?v=20260912-booking-mode-1';
    script.async=false;
    script.dataset.liwBookingV2='booking-mode';
    document.body.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
