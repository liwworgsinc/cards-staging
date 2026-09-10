/* LIW Cards staging — branded public-card loader controller.
   Keeps the base card hidden until the selected experience is actually ready.
   Mobile-safe: readiness uses a lightweight timer only; no self-triggering DOM observer. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_LOADER__)return;
  window.__LIW_PUBLIC_CARD_LOADER__=true;

  const root=document.documentElement;
  const loading=document.getElementById('loading');
  const started=performance.now();
  const MIN_VISIBLE_MS=420;
  const FAILSAFE_MS=12000;
  const PROBE_MS=80;
  let released=false;
  let failed=false;
  let timer=0;
  let lastMode='';
  let lastPrimary='';
  let lastSecondary='';

  if(loading){
    loading.setAttribute('aria-live','polite');
    loading.setAttribute('aria-busy','true');
  }

  function cardData(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function experience(data){return String(data?.card_experience||'classic').trim().toLowerCase();}

  function setMode(type){
    if(type===lastMode)return;
    lastMode=type;
    root.classList.toggle('liw-loader-music',type==='music');
  }

  function inheritAccent(card){
    if(!loading||!card)return;
    try{
      const style=getComputedStyle(card);
      const primary=(style.getPropertyValue('--music-template-primary')||style.getPropertyValue('--card-primary')||style.getPropertyValue('--primary-color')||'').trim();
      const secondary=(style.getPropertyValue('--music-template-secondary')||style.getPropertyValue('--card-secondary')||'').trim();
      if(primary&&primary!==lastPrimary){
        lastPrimary=primary;
        loading.style.setProperty('--liw-loader-accent',primary);
      }
      if(secondary&&secondary!==lastSecondary){
        lastSecondary=secondary;
        loading.style.setProperty('--liw-loader-accent-2',secondary);
      }
    }catch(_){ }
  }

  function musicReady(card){
    if(!card||card.hidden||!card.classList.contains('music-card-active'))return false;
    return Boolean(
      card.classList.contains('music-home-stable')&&
      card.querySelector('.music-luxe-launcher')&&
      card.querySelector('.music-identity-row')
    );
  }

  function clearProbe(){
    if(timer){clearInterval(timer);timer=0;}
  }

  function ensureFailureUi(reason){
    if(!loading)return;
    let panel=loading.querySelector('.liw-loader-error');
    if(!panel){
      panel=document.createElement('div');
      panel.className='liw-loader-error';
      panel.setAttribute('role','alert');
      panel.innerHTML='\
        <div class="liw-loader-error-mark" aria-hidden="true">!</div>\
        <div class="liw-loader-error-kicker">LIW CARDS</div>\
        <h1>We couldn\'t load this card</h1>\
        <p class="liw-loader-error-copy"></p>\
        <div class="liw-loader-error-actions">\
          <button class="liw-loader-retry" type="button">Try again</button>\
          <a class="liw-loader-home" href="https://cards.liwworgs.com/">LIW Cards home</a>\
        </div>';
      loading.appendChild(panel);
      const retry=panel.querySelector('.liw-loader-retry');
      if(retry){
        retry.addEventListener('click',()=>{
          retry.disabled=true;
          retry.textContent='Retrying…';
          try{location.reload();}catch(_){location.href=location.href;}
        });
      }
    }
    const copy=panel.querySelector('.liw-loader-error-copy');
    if(copy){
      copy.textContent=navigator.onLine===false
        ? 'Your device appears to be offline. Reconnect, then try again.'
        : 'The card took too long to respond. Check your connection and try again.';
    }
    panel.dataset.reason=reason||'timeout';
  }

  function fail(reason){
    if(released||failed)return;
    failed=true;
    clearProbe();
    root.classList.remove('liw-card-loader-release');
    root.classList.add('liw-card-loader-failed');
    if(loading)loading.setAttribute('aria-busy','false');
    ensureFailureUi(reason);
    try{window.dispatchEvent(new CustomEvent('liw:card-loader-failed',{detail:{reason}}));}catch(_){ }
  }

  function release(reason){
    if(released||failed)return;
    const card=document.getElementById('card');
    if(!card)return;
    const elapsed=performance.now()-started;
    if(elapsed<MIN_VISIBLE_MS){
      setTimeout(()=>release(reason),Math.max(0,MIN_VISIBLE_MS-elapsed));
      return;
    }
    released=true;
    clearProbe();
    if(loading)loading.setAttribute('aria-busy','false');
    root.classList.remove('liw-card-loader-failed');
    root.classList.add('liw-card-loader-release');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      setTimeout(()=>{
        root.classList.remove('liw-card-loader-active','liw-card-loader-release','liw-loader-music','liw-card-loader-failed');
      },280);
    }));
    try{window.dispatchEvent(new CustomEvent('liw:card-loader-ready',{detail:{reason}}));}catch(_){ }
  }

  function probe(){
    if(released||failed)return true;
    const data=cardData();
    const card=document.getElementById('card');
    if(!data||!card)return false;

    const type=experience(data);
    setMode(type);
    inheritAccent(card);

    if(type==='music'){
      if(musicReady(card)){release('music-stable');return true;}
      return false;
    }

    if(!card.hidden){
      release(type==='flow'?'flow-ready':'classic-ready');
      return true;
    }
    return false;
  }

  timer=setInterval(()=>{
    if(probe()||released||failed){clearProbe();return;}
    if(performance.now()-started>=FAILSAFE_MS){
      const data=cardData();
      const card=document.getElementById('card');
      if(data&&card&&!card.hidden){
        console.warn('[LIW Loader] failsafe release before experience stabilization');
        release('failsafe');
      }else{
        console.warn('[LIW Loader] card failed to become ready before timeout');
        fail(data?'card-not-visible':'data-timeout');
      }
    }
  },PROBE_MS);

  window.addEventListener('online',()=>{
    if(!failed)return;
    const copy=loading&&loading.querySelector('.liw-loader-error-copy');
    if(copy)copy.textContent='You\'re back online. Try loading the card again.';
  });

  probe();
})();

/* Staging-only: mount the native Booking / Appointments V1 public experience without
   changing the production public-card bundle. */
(function mountBookingAppointmentsV1(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  try{
    if(!window.supabaseClient&&typeof supabaseClient!=='undefined')window.supabaseClient=supabaseClient;
  }catch(_){ }
  if(!document.querySelector('link[data-liw-booking-v1]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/public-booking-v1-staging.css?v=20260909-2';
    style.dataset.liwBookingV1='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-liw-booking-v1]')){
    const script=document.createElement('script');
    script.src='js/public-booking-v1-staging.js?v=20260909-2';
    script.defer=true;
    script.dataset.liwBookingV1='true';
    document.body.appendChild(script);
  }
})();

/* Staging-only V2 bridge. V1 remains the renderer; V2 adds secure management to live bookings. */
(function mountBookingAppointmentsV2(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  if(!document.querySelector('link[data-liw-booking-v2]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/public-booking-v2-staging.css?v=20260909-1';
    style.dataset.liwBookingV2='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-liw-booking-v2]')){
    const script=document.createElement('script');
    script.src='js/public-booking-v2-staging.js?v=20260910-native-cta-2';
    script.defer=true;
    script.dataset.liwBookingV2='true';
    document.body.appendChild(script);
  }
})();

/* Staging-only Barbershop public theme. The persisted color_mode marker keeps this
   isolated from Classic, Flow and Showtime without a schema migration. */
(function mountBarbershopTheme(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  if(!document.querySelector('link[data-liw-public-barbershop]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/public-barbershop-staging.css?v=20260909-barber-1';
    style.dataset.liwPublicBarbershop='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-liw-public-barbershop]')){
    const script=document.createElement('script');
    script.src='js/public-barbershop-staging.js?v=20260909-barber-1';
    script.defer=true;
    script.dataset.liwPublicBarbershop='true';
    document.body.appendChild(script);
  }
})();

/* Premium Barbershop revolving dock. Kept isolated from the base Barbershop bridge so
   the animation layer cannot repeatedly rebuild the public card. */
(function mountBarbershopRevolvingDock(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  if(!document.querySelector('link[data-liw-barber-revolving-dock]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/public-barbershop-revolving-dock-staging.css?v=20260910-premium-safe-1';
    style.dataset.liwBarberRevolvingDock='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-liw-barber-revolving-dock]')){
    const script=document.createElement('script');
    script.src='js/public-barbershop-revolving-dock-staging.js?v=20260910-premium-safe-1';
    script.defer=true;
    script.dataset.liwBarberRevolvingDock='true';
    document.body.appendChild(script);
  }
})();

/* Barber-first client room: direct Call/Text/Book/Save remain in the chair rail while
   rich content uses only the scrollable middle. */
(function mountBarbershopClientRoom(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  if(!document.querySelector('link[data-liw-barber-client-room]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='css/public-barbershop-client-room-staging.css?v=20260910-client-room-1';
    style.dataset.liwBarberClientRoom='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-liw-barber-client-room]')){
    const script=document.createElement('script');
    script.src='js/public-barbershop-client-room-staging.js?v=20260910-client-room-1';
    script.defer=true;
    script.dataset.liwBarberClientRoom='true';
    document.body.appendChild(script);
  }
})();
