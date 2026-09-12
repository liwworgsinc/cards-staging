/* LIW Cards staging — Studio public adapter V4.
   Studio never owns or blocks the global LIW loader. The base public card renders first;
   Studio identity and legacy Barber-powered controls adapt progressively afterward. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_STUDIO_V4__)return;
  window.__LIW_PUBLIC_STUDIO_V4__=true;

  const MODE='barbershop';
  const TYPE_META={
    barber:{label:'Barber',booking:'Book My Chair',dock:'Cuts',services:'Cuts · grooming · style',specialty:'Fresh cuts · clean finish',promo:'Fresh cuts. Sharp details. Leave the chair looking ready.',bio:'Welcome in. Browse fresh work, find the Studio, or send an inquiry from the rail below.'},
    hair:{label:'Hair Stylist',booking:'Book Hair Appointment',dock:'Hair',services:'Cuts · color · styling',specialty:'Cuts · color · styling',promo:'Fresh styles, color and finishing made for you.',bio:'Browse styles, services and availability, then book your next hair appointment.'},
    nails:{label:'Nail Tech',booking:'Book Nail Appointment',dock:'Nails',services:'Sets · fills · nail art',specialty:'Sets · fills · nail art',promo:'Fresh sets, detailed art and clean finishes.',bio:'Browse nail work, services and availability, then book your next appointment.'},
    lashes:{label:'Lash / Brow',booking:'Book Lash / Brow',dock:'Lash/Brow',services:'Lashes · brows · fills',specialty:'Lashes · brows · fills',promo:'Defined lashes and brows tailored to your look.',bio:'Browse services, results and availability, then reserve your next session.'},
    makeup:{label:'Makeup Artist',booking:'Book Makeup Session',dock:'Makeup',services:'Makeup · bridal · events',specialty:'Makeup · bridal · events',promo:'Camera-ready looks for bridal, events and everyday glam.',bio:'Explore looks, services and availability, then book your makeup session.'},
    esthetician:{label:'Esthetician',booking:'Book Skin Treatment',dock:'Skin',services:'Facials · skincare · treatments',specialty:'Facials · skincare · treatments',promo:'Personalized skincare focused on healthy-looking results.',bio:'Explore treatments, results and availability, then schedule your skin service.'},
    spa:{label:'Spa',booking:'Book Spa Service',dock:'Spa',services:'Massage · facials · wellness',specialty:'Massage · facials · wellness',promo:'Relax, reset and make time for your wellness.',bio:'Explore spa services and availability, then reserve your visit.'},
    cosmetics:{label:'Cosmetics',booking:'Book Consultation',dock:'Products',services:'Products · cosmetics · consults',specialty:'Products · cosmetics · consults',promo:'Discover products and recommendations made for your routine.',bio:'Explore products, looks and consultation options from the Studio.'},
    studio:{label:'Studio',booking:'Book Appointment',dock:'Services',services:'Services · appointments',specialty:'Professional services',promo:'Explore services, work and availability.',bio:'Browse services and availability, then connect with this Studio.'}
  };
  const root=document.documentElement;
  let currentType='';
  let lookupCardId='';
  let lookupStarted=false;
  let timer=0;
  let observer=null;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const valid=value=>Object.prototype.hasOwnProperty.call(TYPE_META,String(value||'').trim().toLowerCase())?String(value).trim().toLowerCase():'';
  const isStudio=cardData=>{
    const mode=String(cardData?.color_mode||'').trim().toLowerCase();
    const experience=String(cardData?.card_experience||'classic').trim().toLowerCase();
    return mode===MODE&&experience!=='music';
  };

  function injectStyle(){
    if(q('#liw-public-studio-v4-style'))return;
    const style=document.createElement('style');
    style.id='liw-public-studio-v4-style';
    style.textContent=`
      html.liw-public-studio #public-cover{position:relative}
      html.liw-public-studio .studio-public-industry{position:absolute;right:12px;bottom:12px;z-index:8;display:flex;align-items:center;gap:7px;max-width:180px;padding:7px 10px;border:1px solid color-mix(in srgb,var(--barber-secondary,#ec4899) 38%,transparent);border-radius:999px;background:color-mix(in srgb,var(--barber-primary,#6d28d9) 82%,#111 18%);color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.18)}
      html.liw-public-studio .studio-public-industry span:first-child{font-size:.72rem;line-height:1}html.liw-public-studio .studio-public-industry span:last-child{font-size:.66rem;font-weight:900;white-space:nowrap}
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .public-cover::after{content:none!important;display:none!important}
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-welcome-kicker>span{width:20px!important;height:3px!important;background:var(--barber-secondary,#ec4899)!important;box-shadow:none!important}
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol{font-size:0!important}
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-hint-symbol::after{content:"✦";font-size:.72rem}
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) body.public-body,
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) body.public-body .public-shell,
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active,
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) #card.barbershop-card-active .public-content,
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-stage,
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-home,
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-iframe-shell,
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-booking-host{background:var(--barber-background,#fff7ff)!important;color:var(--barber-text,#2e1065)!important}
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-client-promo{border-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 30%,transparent)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--barber-secondary,#ec4899) 12%,var(--barber-background,#fff7ff)),color-mix(in srgb,var(--barber-primary,#6d28d9) 4%,var(--barber-background,#fff7ff)))!important}
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) #card .barber-revolve-dock{background:linear-gradient(180deg,color-mix(in srgb,var(--barber-secondary,#ec4899) 10%,var(--barber-background,#fff7ff)),var(--barber-background,#fff7ff) 64%)!important;border-top-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 38%,transparent)!important}
      html.liw-public-studio[data-studio-business-type]:not([data-studio-business-type="barber"]) #card .barber-revolve-item{background:color-mix(in srgb,var(--barber-primary,#6d28d9) 8%,var(--barber-background,#fff7ff))!important;color:var(--barber-text,#2e1065)!important;border-color:color-mix(in srgb,var(--barber-secondary,#ec4899) 24%,transparent)!important}
    `;
    document.head.appendChild(style);
  }

  function setVars(card,cardData){
    card.style.setProperty('--barber-primary',cardData.primary_color||'#6d28d9');
    card.style.setProperty('--barber-secondary',cardData.secondary_color||'#ec4899');
    card.style.setProperty('--barber-background',cardData.background_color||'#fff7ff');
    card.style.setProperty('--barber-text',cardData.text_color||'#2e1065');
  }

  function badge(card,type){
    const cover=q('#public-cover',card)||q('#public-cover');
    if(!cover)return;
    let el=q('.studio-public-industry',cover);
    if(!el){el=document.createElement('div');el.className='studio-public-industry';cover.appendChild(el);}
    el.innerHTML=`<span aria-hidden="true">${type==='barber'?'✂':'✦'}</span><span>${TYPE_META[type].label}</span>`;
  }

  function adapt(type){
    const cardData=data();
    const card=q('#card');
    if(!cardData||!card||!isStudio(cardData))return false;
    type=valid(type)||'studio';
    currentType=type;
    root.classList.add('liw-public-barbershop','liw-public-studio');
    document.body?.classList.add('liw-public-barbershop','liw-public-studio');
    root.dataset.studioBusinessType=type;
    if(document.body)document.body.dataset.studioBusinessType=type;
    card.classList.add('barbershop-card-active');
    card.dataset.studioBusinessType=type;
    setVars(card,cardData);
    q('.barber-public-badge')?.remove();
    badge(card,type);

    const meta=TYPE_META[type];
    const booking=q('[data-event="booking_click"]');
    const bookingLabel=booking?.querySelector('span');if(bookingLabel)bookingLabel.textContent=meta.booking;
    const serviceHeading=q('#services-section .public-section-heading span');if(serviceHeading)serviceHeading.textContent=meta.services;
    const dock=q('.barber-revolve-dock');if(dock)dock.setAttribute('aria-label','Studio revolving actions');
    const serviceButton=q('[data-barber-dock-action="cuts"]');
    if(serviceButton){const label=serviceButton.querySelector('span');if(label)label.textContent=meta.dock;}

    const home=q('.barber-client-home');
    if(home){
      const title=home.querySelector('h1');if(title&&/^Your Barber$/i.test(title.textContent||''))title.textContent=`Your ${meta.label}`;
      const specialty=home.querySelector('.barber-welcome-specialty');if(specialty&&/fresh cuts|professional services/i.test(specialty.textContent||''))specialty.textContent=meta.specialty;
      const promo=home.querySelector('.barber-client-promo strong');if(promo&&(/fresh cuts/i.test(promo.textContent||'')||type==='studio'))promo.textContent=meta.promo;
      const bio=home.querySelector('.barber-client-promo p');if(bio&&(/barber|browse fresh work/i.test(bio.textContent||'')||type==='studio'))bio.textContent=meta.bio;
      const hint=home.querySelector('.barber-client-hint span:last-child');if(hint&&/Cuts, Gallery, Map/i.test(hint.textContent||''))hint.textContent=`Call, Text, Book and Save act instantly. ${meta.dock}, Gallery, Map and more open in the client room.`;
    }
    return true;
  }

  function kickLegacyControllers(){
    try{window.LIWBarberClientRoom?.mount?.();}catch(_){ }
    try{window.LIWBarberRevolvingDock?.mount?.();}catch(_){ }
  }

  function lookup(cardData){
    if(lookupStarted||!cardData?.id||typeof window.supabaseClient?.rpc!=='function')return;
    lookupStarted=true;lookupCardId=String(cardData.id);
    Promise.resolve(window.supabaseClient.rpc('public_studio_business_type',{p_card_id:cardData.id}))
      .then(result=>{const type=!result?.error?valid(result?.data):'';if(type&&String(data()?.id||'')===lookupCardId)adapt(type);})
      .catch(()=>{});
  }

  function sync(){
    const cardData=data();
    const card=q('#card');
    if(!cardData||!card||!isStudio(cardData))return;
    injectStyle();
    const direct=valid(cardData.studio_business_type);
    const existing=valid(root.dataset.studioBusinessType)||valid(card.dataset.studioBusinessType);
    adapt(direct||existing||currentType||'studio');
    lookup(cardData);
    kickLegacyControllers();
    if(!observer){
      observer=new MutationObserver(()=>{if(currentType)adapt(currentType);});
      observer.observe(card,{childList:true,subtree:true});
      setTimeout(()=>{observer?.disconnect();observer=null;},8000);
    }
  }

  timer=setInterval(sync,100);
  setTimeout(()=>{if(timer){clearInterval(timer);timer=0;}sync();},8000);
  window.addEventListener('liw:card-loader-ready',sync,{passive:true});
  window.addEventListener('liw:barber-client-ready',sync,{passive:true});
  window.addEventListener('load',sync,{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
