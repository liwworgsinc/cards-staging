/* LIW Cards staging — cache-safe public booking-mode V2 loader. */
(function(){
  'use strict';
  if(new URLSearchParams(location.search).get('embed')==='1')return;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  if(!document.querySelector('link[data-liw-booking-v2]')){const style=document.createElement('link');style.rel='stylesheet';style.href='css/public-booking-v2-staging.css?v=20260912-booking-mode-1';style.dataset.liwBookingV2='booking-mode';document.head.appendChild(style);}
  let marker=document.querySelector('script[data-liw-booking-v2]');
  if(!marker){marker=document.createElement('script');marker.type='application/json';marker.dataset.liwBookingV2='pending-booking-mode';document.body.appendChild(marker);}
  function mountBarberRoute(){if(document.querySelector('script[data-liw-barber-booking-route-v2]'))return;const bridge=document.createElement('script');bridge.src='js/public-barber-booking-route-v2-staging.js?v=20260912-booking-mode-1';bridge.async=false;bridge.dataset.liwBarberBookingRouteV2='true';document.body.appendChild(bridge);}
  function mount(){mountBarberRoute();if(window.__LIW_PUBLIC_BOOKING_V2__)return;marker?.remove();const script=document.createElement('script');script.src='js/public-booking-v2-staging.js?v=20261011-observer-freeze-1';script.async=false;script.dataset.liwBookingV2='booking-mode';document.body.appendChild(script);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

/* Staging-only Super Studio public experience. */
(function mountSuperStudio(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  document.addEventListener('liw:public-card-ready',event=>{if(String(event.detail?.card?.card_experience||'').toLowerCase()==='super-studio')document.documentElement.classList.add('liw-preload-super-studio');});

  if(!document.querySelector('link[data-liw-super-studio]')){const style=document.createElement('link');style.rel='stylesheet';style.href='css/super-studio-staging.css?v=20261011-1';style.dataset.liwSuperStudio='true';document.head.appendChild(style);}
  if(!document.querySelector('link[data-liw-super-studio-completion]')){const style=document.createElement('link');style.rel='stylesheet';style.href='css/super-studio-completion-staging.css?v=20261011-3';style.dataset.liwSuperStudioCompletion='true';document.head.appendChild(style);}
  if(!document.querySelector('link[data-liw-super-studio-desktop-card]')){const style=document.createElement('link');style.rel='stylesheet';style.href='css/super-studio-desktop-card-staging.css?v=20261012-1';style.dataset.liwSuperStudioDesktopCard='true';document.head.appendChild(style);}

  const loadHome=()=>{
    if(document.querySelector('script[data-liw-super-studio-home-v9]'))return;
    const script=document.createElement('script');
    script.src='js/super-studio-home-v9-staging.js?v=20261012-home-1';
    script.defer=true;
    script.dataset.liwSuperStudioHomeV9='true';
    document.body.appendChild(script);
  };

  const loadFinalParity=()=>{
    if(!document.querySelector('link[data-liw-super-studio-preview-parity-final]')){
      const style=document.createElement('link');
      style.rel='stylesheet';
      style.href='css/super-studio-preview-parity-final-staging.css?v=20261012-2';
      style.dataset.liwSuperStudioPreviewParityFinal='true';
      document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-liw-super-studio-preview-parity-final]')){
      const script=document.createElement('script');
      script.src='js/super-studio-preview-parity-final-staging.js?v=20261012-2';
      script.defer=true;
      script.dataset.liwSuperStudioPreviewParityFinal='true';
      document.body.appendChild(script);
    }
    loadHome();
  };

  const loadHotfixes=()=>{
    if(!document.querySelector('link[data-liw-super-studio-public-shell-final]')){const style=document.createElement('link');style.rel='stylesheet';style.href='css/super-studio-public-shell-final-staging.css?v=20261012-2';style.dataset.liwSuperStudioPublicShellFinal='true';document.head.appendChild(style);}
    if(!document.querySelector('script[data-liw-super-studio-stability]')){const stability=document.createElement('script');stability.src='js/super-studio-stability-hotfix-staging.js?v=20261011-6';stability.defer=true;stability.dataset.liwSuperStudioStability='true';document.body.appendChild(stability);}
    if(!document.querySelector('script[data-liw-super-studio-booking-hotfix]')){const booking=document.createElement('script');booking.src='js/super-studio-booking-hotfix-staging.js?v=20261011-1';booking.defer=true;booking.dataset.liwSuperStudioBookingHotfix='true';document.body.appendChild(booking);}
    loadFinalParity();
  };
  const loadHero=()=>{
    const existing=document.querySelector('script[data-liw-super-studio-hero-v4]');
    if(existing){if(window.__LIW_SUPER_STUDIO_HERO_V7__)loadHotfixes();else existing.addEventListener('load',loadHotfixes,{once:true});return;}
    const script=document.createElement('script');script.src='js/super-studio-hero-v4-staging.js?v=20261011-6';script.defer=true;script.dataset.liwSuperStudioHeroV4='true';script.addEventListener('load',loadHotfixes,{once:true});document.body.appendChild(script);
  };
  const loadLayout=()=>{
    const existing=document.querySelector('script[data-liw-super-studio-layout-v2]');
    if(existing){if(window.__LIW_SUPER_STUDIO_LAYOUT_V3__)loadHero();else existing.addEventListener('load',loadHero,{once:true});return;}
    const script=document.createElement('script');script.src='js/super-studio-layout-v2-staging.js?v=20261012-routing-1';script.defer=true;script.dataset.liwSuperStudioLayoutV2='true';script.addEventListener('load',loadHero,{once:true});document.body.appendChild(script);
  };
  const loadEnhancements=()=>{
    if(!document.querySelector('script[data-liw-super-studio-public-enhancements]')){const script=document.createElement('script');script.src='js/super-studio-public-enhancements-staging.js?v=20261011-2';script.defer=true;script.dataset.liwSuperStudioPublicEnhancements='true';document.body.appendChild(script);}
    loadLayout();
  };
  const loadPublic=()=>{
    const existing=document.querySelector('script[data-liw-super-studio-public]');
    if(existing){if(window.__LIW_SUPER_STUDIO_PUBLIC__)loadEnhancements();else existing.addEventListener('load',loadEnhancements,{once:true});return;}
    const script=document.createElement('script');script.src='js/super-studio-public-staging.js?v=20261011-1';script.defer=true;script.dataset.liwSuperStudioPublic='true';script.addEventListener('load',loadEnhancements,{once:true});document.body.appendChild(script);
  };
  if(window.LIWSuperStudio){loadPublic();return;}
  if(document.querySelector('script[data-liw-super-studio-config]'))return;
  const config=document.createElement('script');config.src='js/super-studio-config-staging.js?v=20261011-1';config.defer=true;config.dataset.liwSuperStudioConfig='true';config.onload=loadPublic;document.body.appendChild(config);
})();
