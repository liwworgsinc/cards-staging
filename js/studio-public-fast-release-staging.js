/* LIW Cards staging — Studio public readiness controller.
   Studio may reuse the legacy Barber shell internally, but customers must never see
   that raw shell or a dead dock. Reveal the core card once the Studio identity has
   been applied; keep the dock hidden until its real click controller is bound. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_PUBLIC_FAST_RELEASE__)return;
  window.__LIW_STUDIO_PUBLIC_FAST_RELEASE__=true;

  const MODE='barbershop';
  const TYPES=new Set(['barber','hair','nails','lashes','makeup','esthetician','spa','cosmetics']);
  const TYPE_LABELS={barber:'Barber',hair:'Hair Stylist',nails:'Nail Tech',lashes:'Lash / Brow',makeup:'Makeup Artist',esthetician:'Esthetician',spa:'Spa',cosmetics:'Cosmetics'};
  const root=document.documentElement;
  const started=performance.now();
  const MAX_STUDIO_GATE_MS=2800;
  const MOUNT_KICK_MS=650;
  const PROBE_MS=45;
  let timer=0;
  let studioDetected=false;
  let released=false;
  let mountKicked=false;

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
      html.liw-studio-fast-pending #loading{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      html.liw-studio-fast-ready #loading{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-studio-fast-ready #loading *,html.liw-studio-fast-ready #loading *::before,html.liw-studio-fast-ready #loading *::after{animation:none!important}

      /* A dock is never shown until the real revolving-dock controller has bound its
         click/pointer handlers. This avoids visible controls that do nothing. */
      html.liw-public-studio:not(.liw-studio-dock-ready) #card .barber-revolve-dock{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-public-studio.liw-studio-dock-ready #card .barber-revolve-dock{visibility:visible!important;opacity:1!important;pointer-events:auto!important}

      /* Only Barber keeps barber-pole/scissors chrome. */
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .public-cover::after{content:none!important;display:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-welcome-kicker>span{width:20px!important;height:3px!important;background:var(--barber-secondary,#ec4899)!important;box-shadow:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-center-mark{width:22px!important;height:2px!important;opacity:.5!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-center-mark span{background:var(--barber-secondary,#ec4899)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol{font-size:0!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol::after{content:"✦";font-size:.72rem;line-height:1}

      /* Non-Barber Studio uses the selected LIW template palette instead of the old
         black/gold Barber surfaces. The internal --barber-* vars are populated from
         the saved template/card values by the Studio public bridge. */
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) body.public-body,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) body.public-body .public-shell{background:var(--barber-background,#fff7ff)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active{background:var(--barber-background,#fff7ff)!important;color:var(--barber-text,#2e1065)!important;border-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 28%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active.barber-client-room-active .public-content,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-stage,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-home,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-iframe-shell,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-booking-host{background:var(--barber-background,#fff7ff)!important;color:var(--barber-text,#2e1065)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-home h1,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo>strong{color:var(--barber-text,#2e1065)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-welcome-specialty,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo>p,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-hint{color:color-mix(in srgb,var(--barber-text,#2e1065) 72%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-hint{background:color-mix(in srgb,var(--barber-primary,#6d28d9) 6%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo{border-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 30%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--barber-secondary,#ec4899) 12%,var(--barber-background,#fff7ff)),color-mix(in srgb,var(--barber-primary,#6d28d9) 4%,var(--barber-background,#fff7ff)))!important;box-shadow:0 12px 28px color-mix(in srgb,var(--barber-primary,#6d28d9) 12%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-iframe-top{background:color-mix(in srgb,var(--barber-primary,#6d28d9) 7%,var(--barber-background,#fff7ff))!important;border-bottom-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 28%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-dock{background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#ec4899) 10%,var(--barber-background,#fff7ff)),var(--barber-background,#fff7ff) 64%)!important;border-top-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 38%,transparent)!important;box-shadow:0 -10px 24px color-mix(in srgb,var(--barber-primary,#6d28d9) 10%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-dock-orbit{border-top-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 50%,transparent)!important;background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#ec4899) 8%,transparent),transparent 52%)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item{background:color-mix(in srgb,var(--barber-primary,#6d28d9) 8%,var(--barber-background,#fff7ff))!important;color:color-mix(in srgb,var(--barber-text,#2e1065) 82%,var(--barber-secondary,#ec4899))!important;border-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 24%,transparent)!important;box-shadow:0 6px 12px color-mix(in srgb,var(--barber-primary,#6d28d9) 12%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item span{color:color-mix(in srgb,var(--barber-text,#2e1065) 86%,var(--barber-secondary,#ec4899))!important;text-shadow:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .barber-revolve-item.active{background:color-mix(in srgb,var(--barber-secondary,#ec4899) 13%,var(--barber-background,#fff7ff))!important;border-color:var(--barber-secondary,#ec4899)!important;color:var(--barber-secondary,#ec4899)!important}
    `;
    document.head.appendChild(style);
  }

  function kickControllers(){
    try{window.LIWBarberClientRoom?.mount?.();}catch(error){console.warn('[Studio] client room mount retry:',error);}
    try{window.LIWBarberRevolvingDock?.mount?.();}catch(error){console.warn('[Studio] dock mount retry:',error);}
  }

  function identityReady(){
    const cardData=data();
    const card=q('#card');
    if(!cardData||!card||card.hidden||!isStudio(cardData))return false;
    const type=resolvedType(card);
    if(!type)return false;
    if(!root.classList.contains('liw-public-studio')||!card.classList.contains('barbershop-card-active'))return false;
    if(String(card.dataset.studioBusinessType||'')!==type)return false;
    const badge=q('.studio-public-industry',card);
    const label=TYPE_LABELS[type]||'';
    if(!badge||!String(badge.textContent||'').includes(label))return false;
    return true;
  }

  function dockReady(){
    const dock=q('.barber-revolve-dock');
    const controller=window.LIWBarberRevolvingDock;
    const room=window.LIWBarberClientRoom;
    const ready=Boolean(
      controller&&typeof controller.mount==='function'&&
      room&&typeof room.setRoom==='function'&&
      q('.barber-client-stage')&&
      dock&&dock.dataset.gesturesBound==='true'&&
      q('[data-barber-dock-action]',dock)
    );
    root.classList.toggle('liw-studio-dock-ready',ready);
    if(ready)dock.dataset.studioInteractiveReady='true';
    return ready;
  }

  function stopLoader(reason){
    if(released)return;
    const card=q('#card');
    if(!card||card.hidden||!identityReady())return;
    released=true;
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
    try{window.dispatchEvent(new CustomEvent('liw:studio-ready',{detail:{reason,type:resolvedType(card),dockReady:dockReady()}}));}catch(_){ }
  }

  function probe(){
    const cardData=data();
    const card=q('#card');
    if(!cardData||!card||!isStudio(cardData))return;

    studioDetected=true;
    if(!released)root.classList.add('liw-studio-fast-pending');
    kickControllers();
    const interactive=dockReady();

    if(identityReady()){
      stopLoader(interactive?'studio-interactive-ready':'studio-identity-ready');
    }

    const elapsed=performance.now()-started;
    if(!mountKicked&&elapsed>=MOUNT_KICK_MS){
      mountKicked=true;
      /* The base LIW loader sees card_experience=classic. Re-fire its ready event so
         every Studio module gets one deterministic idempotent mount opportunity. */
      try{window.dispatchEvent(new CustomEvent('liw:card-loader-ready',{detail:{reason:'studio-mount-kick'}}));}catch(_){ }
      kickControllers();
    }

    if(!released&&studioDetected&&elapsed>=MAX_STUDIO_GATE_MS){
      /* Never expose the raw Barber shell. A bounded retry is allowed, but release
         still requires the adaptive Studio identity. Once identity exists, a late
         dock remains hidden until its handlers are genuinely bound. */
      kickControllers();
      if(identityReady())stopLoader('studio-bounded-identity-ready');
    }

    if(released&&interactive){
      clearInterval(timer);
      timer=0;
    }
  }

  injectStyle();
  timer=setInterval(probe,PROBE_MS);
  probe();
  window.addEventListener('liw:barber-client-ready',()=>{kickControllers();probe();},{passive:true});
  window.addEventListener('liw:card-loader-ready',()=>{kickControllers();probe();},{passive:true});
  window.addEventListener('load',probe,{once:true,passive:true});
})();
