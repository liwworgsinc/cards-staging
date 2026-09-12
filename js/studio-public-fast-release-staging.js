/* LIW Cards staging — Studio public fast-release controller.
   The core card is the loading boundary. Optional Studio rooms/dock may continue
   mounting after reveal; they must never keep the customer behind the LIW loader. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_PUBLIC_FAST_RELEASE__)return;
  window.__LIW_STUDIO_PUBLIC_FAST_RELEASE__=true;

  const MODE='barbershop';
  const TYPES=new Set(['barber','hair','nails','lashes','makeup','esthetician','spa','cosmetics']);
  const root=document.documentElement;
  const started=performance.now();
  const MAX_STUDIO_GATE_MS=2200;
  const PROBE_MS=45;
  let timer=0;
  let studioDetected=false;
  let released=false;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};

  function isStudio(cardData){
    const mode=String(cardData?.color_mode||'').trim().toLowerCase();
    const experience=String(cardData?.card_experience||'classic').trim().toLowerCase();
    return experience==='barbershop'||(mode===MODE&&experience!=='music');
  }

  function resolvedType(card){
    const candidates=[
      root.dataset.studioBusinessType,
      document.body?.dataset?.studioBusinessType,
      card?.dataset?.studioBusinessType,
      data()?.studio_business_type
    ];
    const type=String(candidates.find(value=>TYPES.has(String(value||'').trim().toLowerCase()))||'').trim().toLowerCase();
    if(type){
      root.dataset.studioBusinessType=type;
      if(document.body)document.body.dataset.studioBusinessType=type;
      if(card)card.dataset.studioBusinessType=type;
    }
    return type;
  }

  function injectStyle(){
    if(q('#liw-studio-fast-release-style'))return;
    const style=document.createElement('style');
    style.id='liw-studio-fast-release-style';
    style.textContent=`
      html.liw-studio-fast-pending #card{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-studio-fast-ready #loading{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-studio-fast-ready #loading *,html.liw-studio-fast-ready #loading *::before,html.liw-studio-fast-ready #loading *::after{animation:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .public-cover::after{content:none!important;display:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-welcome-kicker>span{width:20px!important;height:3px!important;background:var(--barber-secondary,#d4a84f)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--barber-secondary,#d4a84f) 22%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-center-mark span{background:var(--barber-secondary,#d4a84f)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active.barber-client-room-active .public-content,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-stage,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-home,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-iframe-shell,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-booking-host{background:var(--barber-background,#fff)!important;color:var(--barber-text,#111827)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo{border-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 30%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--barber-secondary,#d4a84f) 12%,var(--barber-background,#fff)),color-mix(in srgb,var(--barber-primary,#111827) 3%,var(--barber-background,#fff)))!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-dock{background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#d4a84f) 10%,var(--barber-background,#fff)),var(--barber-background,#fff) 64%)!important;border-top-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 38%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item{background:color-mix(in srgb,var(--barber-primary,#111827) 8%,var(--barber-background,#fff))!important;color:color-mix(in srgb,var(--barber-text,#111827) 82%,var(--barber-secondary,#d4a84f))!important;border-color:color-mix(in srgb,var(--barber-secondary,#d4a84f) 22%,transparent)!important}
    `;
    document.head.appendChild(style);
  }

  function stopLoader(reason){
    if(released)return;
    const card=q('#card');
    if(!card||card.hidden)return;
    released=true;
    clearInterval(timer);
    root.classList.remove('liw-studio-fast-pending','liw-card-loader-active','liw-card-loader-release','liw-card-loader-failed','liw-studio-runtime-pending');
    root.classList.add('liw-studio-fast-ready','liw-studio-runtime-ready');
    card.style.removeProperty('visibility');
    card.style.removeProperty('opacity');
    card.style.removeProperty('pointer-events');
    card.dataset.studioReady='true';
    const loading=q('#loading');
    if(loading){
      loading.hidden=true;
      loading.setAttribute('aria-hidden','true');
      loading.setAttribute('aria-busy','false');
      loading.style.setProperty('display','none','important');
      loading.style.setProperty('visibility','hidden','important');
      loading.style.setProperty('opacity','0','important');
      loading.style.setProperty('pointer-events','none','important');
      qa('.skeleton',loading).forEach(node=>node.style.setProperty('animation','none','important'));
    }
    try{window.dispatchEvent(new CustomEvent('liw:studio-ready',{detail:{reason,type:resolvedType(card)}}));}catch(_){ }
  }

  function coreReady(){
    const cardData=data();
    const card=q('#card');
    if(!cardData||!card||card.hidden||!isStudio(cardData))return false;
    const type=resolvedType(card);
    return Boolean(type&&card.classList.contains('barbershop-card-active'));
  }

  function probe(){
    if(released)return;
    const cardData=data();
    const card=q('#card');
    if(cardData&&card&&isStudio(cardData)){
      studioDetected=true;
      root.classList.add('liw-studio-fast-pending');
      if(coreReady()){
        stopLoader('core-studio-ready');
        return;
      }
    }

    if(studioDetected&&performance.now()-started>=MAX_STUDIO_GATE_MS&&card&&!card.hidden){
      // Performance boundary: show the usable card even if an optional Studio
      // enhancement is late. Never make customers wait on the dock/rooms.
      resolvedType(card);
      stopLoader('fast-bounded-release');
    }
  }

  injectStyle();
  timer=setInterval(probe,PROBE_MS);
  probe();
  window.addEventListener('liw:barber-client-ready',()=>{if(coreReady())stopLoader('client-core-ready');},{passive:true});
  window.addEventListener('load',()=>{if(coreReady())stopLoader('window-load-ready');},{once:true,passive:true});
})();
