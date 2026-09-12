/* LIW Cards staging — Studio public readiness controller V3.
   No experience may hold the customer behind the loader forever. Studio identity is
   resolved independently from the legacy Barber bridge, then optional rooms/dock hydrate. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_PUBLIC_FAST_RELEASE_V3__)return;
  window.__LIW_STUDIO_PUBLIC_FAST_RELEASE_V3__=true;

  const MODE='barbershop';
  const TYPES={
    barber:{label:'Barber',dock:'Cuts',specialty:'Fresh cuts · clean finish',promo:'Fresh cuts. Sharp details. Leave the chair looking ready.',bio:'Welcome in. Browse fresh work, find the Studio, or send an inquiry from the rail below.'},
    hair:{label:'Hair Stylist',dock:'Hair',specialty:'Cuts · color · styling',promo:'Fresh styles, color and finishing made for you.',bio:'Browse styles, services and availability, then book your next hair appointment.'},
    nails:{label:'Nail Tech',dock:'Nails',specialty:'Sets · fills · nail art',promo:'Fresh sets, detailed art and clean finishes.',bio:'Browse nail work, services and availability, then book your next appointment.'},
    lashes:{label:'Lash / Brow',dock:'Lash/Brow',specialty:'Lashes · brows · fills',promo:'Defined lashes and brows tailored to your look.',bio:'Browse services, results and availability, then reserve your next session.'},
    makeup:{label:'Makeup Artist',dock:'Makeup',specialty:'Makeup · bridal · events',promo:'Camera-ready looks for bridal, events and everyday glam.',bio:'Explore looks, services and availability, then book your makeup session.'},
    esthetician:{label:'Esthetician',dock:'Skin',specialty:'Facials · skincare · treatments',promo:'Personalized skincare focused on healthy-looking results.',bio:'Explore treatments, results and availability, then schedule your skin service.'},
    spa:{label:'Spa',dock:'Spa',specialty:'Massage · facials · wellness',promo:'Relax, reset and make time for your wellness.',bio:'Explore spa services and availability, then reserve your visit.'},
    cosmetics:{label:'Cosmetics',dock:'Products',specialty:'Products · cosmetics · consults',promo:'Discover products and recommendations made for your routine.',bio:'Explore products, looks and consultation options from the Studio.'}
  };

  const root=document.documentElement;
  const started=performance.now();
  const TYPE_WAIT_MS=1800;
  const FAIL_OPEN_MS=2400;
  const STOP_PROBE_MS=8000;
  const PROBE_MS=70;
  let timer=0;
  let released=false;
  let resolvedType='';
  let lookupStarted=false;
  let lookupDone=false;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const valid=value=>Object.prototype.hasOwnProperty.call(TYPES,String(value||'').trim().toLowerCase())?String(value).trim().toLowerCase():'';

  function isStudio(cardData){
    const mode=String(cardData?.color_mode||'').trim().toLowerCase();
    const experience=String(cardData?.card_experience||'classic').trim().toLowerCase();
    return experience==='barbershop'||(mode===MODE&&experience!=='music');
  }

  function directType(){return valid(data()?.studio_business_type);}
  function bridgeType(card){
    const candidates=[root.dataset.studioBusinessType,document.body?.dataset?.studioBusinessType,card?.dataset?.studioBusinessType];
    for(const value of candidates){const type=valid(value);if(type)return type;}
    return '';
  }

  function injectStyle(){
    if(q('#liw-studio-fast-release-style-v3'))return;
    const style=document.createElement('style');
    style.id='liw-studio-fast-release-style-v3';
    style.textContent=`
      html.liw-studio-fast-pending #card{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-studio-fast-pending #loading{display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      html.liw-studio-fast-ready #loading{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-public-studio:not(.liw-studio-dock-ready) #card .barber-revolve-dock{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      html.liw-public-studio.liw-studio-dock-ready #card .barber-revolve-dock{visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      .studio-public-industry{position:absolute;right:12px;bottom:12px;z-index:8;display:flex;align-items:center;gap:7px;max-width:180px;padding:7px 10px;border:1px solid color-mix(in srgb,var(--barber-secondary,#ec4899) 42%,transparent);border-radius:999px;background:color-mix(in srgb,var(--barber-primary,#6d28d9) 78%,#111 22%);color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.18)}
      .studio-public-industry .studio-industry-mark{font-size:.74rem;line-height:1}.studio-public-industry span:last-child{font-size:.67rem;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .public-cover::after{content:none!important;display:none!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol{font-size:0!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol::after{content:"✦";font-size:.72rem}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) body.public-body,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) body.public-body .public-shell{background:var(--barber-background,#fff7ff)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active.barber-client-room-active .public-content,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-stage,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-home,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-iframe-shell,
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-booking-host{background:var(--barber-background,#fff7ff)!important;color:var(--barber-text,#2e1065)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo{border-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 30%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--barber-secondary,#ec4899) 12%,var(--barber-background,#fff7ff)),color-mix(in srgb,var(--barber-primary,#6d28d9) 4%,var(--barber-background,#fff7ff)))!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card .barber-revolve-dock{background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#ec4899) 10%,var(--barber-background,#fff7ff)),var(--barber-background,#fff7ff) 64%)!important;border-top-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 38%,transparent)!important}
      html[data-studio-business-type]:not([data-studio-business-type="barber"]) #card .barber-revolve-item{background:color-mix(in srgb,var(--barber-primary,#6d28d9) 8%,var(--barber-background,#fff7ff))!important;color:var(--barber-text,#2e1065)!important;border-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 24%,transparent)!important}
    `;
    document.head.appendChild(style);
  }

  function setVars(card,cardData){
    card.style.setProperty('--barber-primary',cardData.primary_color||'#6d28d9');
    card.style.setProperty('--barber-secondary',cardData.secondary_color||'#ec4899');
    card.style.setProperty('--barber-background',cardData.background_color||'#fff7ff');
    card.style.setProperty('--barber-text',cardData.text_color||'#2e1065');
  }

  function ensureBadge(card,type){
    const cover=q('#public-cover',card)||q('#public-cover');
    if(!cover)return;
    let badge=q('.studio-public-industry',cover);
    if(!badge){badge=document.createElement('div');badge.className='studio-public-industry';cover.appendChild(badge);}
    const meta=TYPES[type];
    badge.innerHTML=`<span class="studio-industry-mark" aria-hidden="true">${type==='barber'?'✂':'✦'}</span><span>${meta.label}</span>`;
  }

  function adaptChrome(type){
    const meta=TYPES[type];
    const dock=q('.barber-revolve-dock');
    if(dock)dock.setAttribute('aria-label','Studio revolving actions');
    const serviceButton=q('[data-barber-dock-action="cuts"]');
    if(serviceButton){
      const label=serviceButton.querySelector('span');
      if(label)label.textContent=meta.dock;
      if(type!=='barber'){
        const icon=serviceButton.querySelector('svg');
        if(icon)icon.outerHTML='<span class="studio-industry-mark" aria-hidden="true">✦</span>';
      }
    }
    const home=q('.barber-client-home');
    if(home){
      const title=home.querySelector('h1');if(title&&String(title.textContent||'').trim()==='Your Barber')title.textContent=`Your ${meta.label}`;
      const specialty=home.querySelector('.barber-welcome-specialty');if(specialty&&String(specialty.textContent||'').trim()==='Fresh cuts · clean finish')specialty.textContent=meta.specialty;
      const promo=home.querySelector('.barber-client-promo strong');if(promo&&String(promo.textContent||'').trim()==='Fresh cuts. Sharp details. Leave the chair looking ready.')promo.textContent=meta.promo;
      const bio=home.querySelector('.barber-client-promo p');if(bio&&/Browse fresh work|barber rail/i.test(bio.textContent||''))bio.textContent=meta.bio;
      const hint=home.querySelector('.barber-client-hint span:last-child');if(hint&&/Cuts, Gallery, Map/i.test(hint.textContent||''))hint.textContent=`Call, Text, Book and Save act instantly. ${meta.dock}, Gallery, Map and more open in the client room.`;
    }
  }

  function applyIdentity(card,type){
    const cardData=data();
    if(!cardData||!card||!type)return false;
    resolvedType=type;
    root.classList.add('liw-public-barbershop','liw-public-studio');
    document.body?.classList.add('liw-public-barbershop','liw-public-studio');
    root.dataset.studioBusinessType=type;
    if(document.body)document.body.dataset.studioBusinessType=type;
    card.classList.add('barbershop-card-active');
    card.dataset.studioBusinessType=type;
    setVars(card,cardData);
    q('.barber-public-badge')?.remove();
    ensureBadge(card,type);
    adaptChrome(type);
    return true;
  }

  function kickControllers(){
    try{window.LIWBarberClientRoom?.mount?.();}catch(_){ }
    try{window.LIWBarberRevolvingDock?.mount?.();}catch(_){ }
  }

  function dockReady(){
    const dock=q('.barber-revolve-dock');
    const ready=Boolean(window.LIWBarberRevolvingDock?.mount&&window.LIWBarberClientRoom?.setRoom&&q('.barber-client-stage')&&dock&&dock.dataset.gesturesBound==='true'&&q('[data-barber-dock-action]',dock));
    root.classList.toggle('liw-studio-dock-ready',ready);
    if(ready)dock.dataset.studioInteractiveReady='true';
    return ready;
  }

  function startLookup(cardData,card){
    if(lookupStarted||!cardData?.id||typeof window.supabaseClient?.rpc!=='function')return;
    lookupStarted=true;
    Promise.resolve(window.supabaseClient.rpc('public_studio_business_type',{p_card_id:cardData.id}))
      .then(result=>{
        const type=!result?.error?valid(result?.data):'';
        if(type){resolvedType=type;applyIdentity(card,type);}
      })
      .catch(()=>{})
      .finally(()=>{lookupDone=true;probe();});
  }

  function release(reason){
    if(released)return;
    const card=q('#card');
    if(!card||card.hidden||!resolvedType)return;
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
    }
    try{window.dispatchEvent(new CustomEvent('liw:studio-ready',{detail:{reason,type:resolvedType}}));}catch(_){ }
    setTimeout(()=>{try{window.dispatchEvent(new CustomEvent('liw:card-loader-ready',{detail:{reason:'studio-ready-v3'}}));}catch(_){ }kickControllers();},0);
  }

  function probe(){
    const cardData=data();
    const card=q('#card');
    if(!cardData||!card||!isStudio(cardData))return;
    const elapsed=performance.now()-started;
    if(!released)root.classList.add('liw-studio-fast-pending');

    const direct=directType();
    const bridged=bridgeType(card);
    if(direct&&direct!==resolvedType)applyIdentity(card,direct);
    else if(resolvedType)applyIdentity(card,resolvedType);
    else if(bridged&&bridged!=='barber')applyIdentity(card,bridged);

    startLookup(cardData,card);
    kickControllers();
    const interactive=dockReady();
    if(resolvedType&&!released)release('studio-identity-ready');

    if(!released&&elapsed>=TYPE_WAIT_MS&&lookupDone&&bridged)applyIdentity(card,bridged);
    if(!released&&elapsed>=FAIL_OPEN_MS){
      applyIdentity(card,direct||resolvedType||bridged||'barber');
      release('studio-failsafe-release');
    }

    if(resolvedType)adaptChrome(resolvedType);
    if(released&&interactive&&elapsed>=2500&&lookupDone){clearInterval(timer);timer=0;}
    else if(released&&elapsed>=STOP_PROBE_MS){clearInterval(timer);timer=0;}
  }

  injectStyle();
  timer=setInterval(probe,PROBE_MS);
  probe();
  window.addEventListener('liw:barber-client-ready',()=>{kickControllers();probe();},{passive:true});
  window.addEventListener('liw:card-loader-ready',()=>{kickControllers();probe();},{passive:true});
  window.addEventListener('load',probe,{once:true,passive:true});
})();
