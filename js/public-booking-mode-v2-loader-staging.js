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

  function mountBarberRoute(){
    if(document.querySelector('script[data-liw-barber-booking-route-v2]'))return;
    const bridge=document.createElement('script');
    bridge.src='js/public-barber-booking-route-v2-staging.js?v=20260912-booking-mode-1';
    bridge.async=false;
    bridge.dataset.liwBarberBookingRouteV2='true';
    document.body.appendChild(bridge);
  }

  function mount(){
    mountBarberRoute();
    if(window.__LIW_PUBLIC_BOOKING_V2__)return;
    marker?.remove();
    const script=document.createElement('script');
    script.src='js/public-booking-v2-staging.js?v=20261011-observer-freeze-1';
    script.async=false;
    script.dataset.liwBookingV2='booking-mode';
    document.body.appendChild(script);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();

/* Staging-only Super Studio public experience. Keep this loader independent from
   Classic/Flow/Realtor/Restaurant/Showtime so production remains untouched. */
(function mountSuperStudio(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  document.addEventListener('liw:public-card-ready',event=>{
    if(String(event.detail?.card?.card_experience||'').toLowerCase()==='super-studio'){
      document.documentElement.classList.add('liw-preload-super-studio');
    }
  });

  if(!document.querySelector('link[data-liw-super-studio]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/super-studio-staging.css?v=20261011-1';
    style.dataset.liwSuperStudio='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('link[data-liw-super-studio-completion]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/super-studio-completion-staging.css?v=20261011-1';
    style.dataset.liwSuperStudioCompletion='true';
    document.head.appendChild(style);
  }

  const loadPublic=()=>{
    if(document.querySelector('script[data-liw-super-studio-public]'))return;
    const script=document.createElement('script');
    script.src='js/super-studio-public-staging.js?v=20261011-1';
    script.defer=true;
    script.dataset.liwSuperStudioPublic='true';
    document.body.appendChild(script);
  };

  if(window.LIWSuperStudio){loadPublic();return;}
  if(document.querySelector('script[data-liw-super-studio-config]'))return;
  const config=document.createElement('script');
  config.src='js/super-studio-config-staging.js?v=20261011-1';
  config.defer=true;
  config.dataset.liwSuperStudioConfig='true';
  config.onload=loadPublic;
  document.body.appendChild(config);
})();
