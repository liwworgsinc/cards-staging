/* LIW Cards staging — Barbershop client room.
   Keeps direct actions in the bottom dock and reserves the scrollable middle for rich client content. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_CLIENT_ROOM_STAGING__)return;
  window.__LIW_BARBER_CLIENT_ROOM_STAGING__=true;

  const MODE='barbershop';
  const ROOM_KEYS=new Set(['home','cuts','social','shop','book']);
  let card=null;
  let content=null;
  let stage=null;
  let home=null;
  let shopRoom=null;
  let bookingObserver=null;
  let activeRoom='home';

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const safe=(value,max=800)=>String(value??'').trim().slice(0,max);
  const esc=value=>safe(value,1600).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};

  function isBarber(cardData){
    return String(cardData?.color_mode||'').trim().toLowerCase()===MODE&&String(cardData?.card_experience||'classic').trim().toLowerCase()!=='music';
  }

  function configured(section,innerSelector){
    if(!section)return false;
    if(innerSelector&&q(innerSelector,section))return true;
    return !section.hidden&&Boolean(safe(section.textContent,600));
  }

  function directNativeBookingReady(){
    return Boolean(
      q('#booking-v1-section')||
      q('[data-liw-native-booking-action]')||
      data()?.booking_enabled===true
    );
  }

  function removeExternalBookingFromBarber(){
    const cardData=data();
    if(!cardData||cardData.__barberExternalBookingSuppressed)return;
    cardData.__barberExternalBookingSuppressed=true;
    cardData.__barberExternalBookingUrl=safe(cardData.booking_url,1200);
    cardData.booking_url='';
  }

  function buildHome(){
    const cardData=data()||{};
    const barber=safe(cardData.full_name||cardData.name,120)||'Your Barber';
    const shop=safe(cardData.company_name,120)||'The Barbershop';
    const specialty=safe(cardData.job_title||cardData.title,140)||'Fresh cuts · clean finish';
    const promo=safe(cardData.headline,240)||'Fresh cuts. Sharp details. Leave the chair looking ready.';
    const bio=safe(cardData.bio,360)||'Welcome in. Check the latest cuts, find the shop, or send an inquiry from the barber menu below.';
    if(!home){
      home=document.createElement('section');
      home.className='barber-client-home';
      home.dataset.barberRoom='home';
      stage.appendChild(home);
    }
    home.innerHTML=`
      <div class="barber-welcome-kicker"><span></span> WELCOME TO ${esc(shop).toUpperCase()}</div>
      <h1>${esc(barber)}</h1>
      <p class="barber-welcome-specialty">${esc(specialty)}</p>
      <div class="barber-client-promo">
        <div class="barber-client-promo-label"><i data-lucide="sparkles" size="15"></i><span>CLIENT PROMO</span></div>
        <strong>${esc(promo)}</strong>
        <p>${esc(bio)}</p>
      </div>
      <div class="barber-client-hint"><i data-lucide="scissors" size="15"></i><span>Use the barber rail below for appointments, cuts, directions and contact.</span></div>`;
  }

  function buildShopRoom(){
    const cardData=data()||{};
    const address=safe(cardData.business_address,260);
    if(!shopRoom){
      shopRoom=document.createElement('section');
      shopRoom.className='barber-shop-room';
      shopRoom.dataset.barberRoom='shop';
      stage.appendChild(shopRoom);
    }
    shopRoom.innerHTML=`
      <div class="barber-room-heading"><small>THE SHOP</small><h2>Visit · shop · inquire</h2><p>Everything that needs more room lives here — not in the bottom action rail.</p></div>
      ${address?`<div class="barber-location-card"><div><i data-lucide="map-pin" size="20"></i><span><small>SHOP LOCATION</small><strong>${esc(address)}</strong></span></div><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}" target="_blank" rel="noopener">OPEN MAP <i data-lucide="arrow-up-right" size="15"></i></a></div>`:''}
      <div class="barber-shop-content" data-barber-shop-content></div>`;
    const holder=q('[data-barber-shop-content]',shopRoom);
    const products=q('#products-section');
    const lead=q('#lead-section');
    if(configured(products,'#products > *')){products.dataset.barberRoomOriginal='products';holder.appendChild(products);}
    if(configured(lead,'#lead-form')){lead.dataset.barberRoomOriginal='inquiry';holder.appendChild(lead);}
    if(!holder.children.length){
      const empty=document.createElement('div');
      empty.className='barber-room-empty';
      empty.innerHTML='<i data-lucide="store" size="22"></i><strong>Shop details coming soon</strong><span>Add products or enable inquiries to fill this room.</span>';
      holder.appendChild(empty);
    }
  }

  function moveRichSections(){
    const services=q('#services-section');
    const social=q('#social-section');
    if(configured(services,'#services > *')){services.dataset.barberRoom='cuts';stage.appendChild(services);}
    if(configured(social,'#socials a, #socials button')){social.dataset.barberRoom='social';stage.appendChild(social);}
    buildShopRoom();
  }

  function hideLegacyMiddleChrome(){
    card.classList.add('barber-client-room-active');
    ['#about-section','#name','#title','#company','#headline','#bio','#actions','#save','#business-actions','#branding'].forEach(selector=>{
      const el=q(selector,content);if(el)el.dataset.barberLegacyMiddle='true';
    });
  }

  function ensureStage(){
    if(stage)return stage;
    stage=document.createElement('div');
    stage.className='barber-client-stage';
    stage.setAttribute('aria-live','polite');
    content.prepend(stage);
    return stage;
  }

  function roomSection(key){
    if(key==='home')return home;
    if(key==='cuts')return q('[data-barber-room="cuts"]',stage);
    if(key==='social')return q('[data-barber-room="social"]',stage);
    if(key==='shop')return shopRoom;
    if(key==='book')return q('#booking-v1-section',stage)||q('#booking-v1-section');
    return null;
  }

  function setRoom(key){
    if(!ROOM_KEYS.has(key))return;
    if(key==='book'){
      openNativeAppointment();
      return;
    }
    const target=roomSection(key)||home;
    if(!target)return;
    activeRoom=key;
    [...stage.children].forEach(child=>{child.hidden=child!==target;child.classList.toggle('barber-room-current',child===target);});
    try{content.scrollTo({top:0,behavior:'smooth'});}catch(_){content.scrollTop=0;}
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function showBookingSection(section){
    if(!section||!stage)return false;
    if(section.parentElement!==stage)stage.appendChild(section);
    section.dataset.barberRoom='book';
    section.hidden=false;
    activeRoom='book';
    [...stage.children].forEach(child=>{child.hidden=child!==section;child.classList.toggle('barber-room-current',child===section);});
    try{content.scrollTo({top:0,behavior:'smooth'});}catch(_){content.scrollTop=0;}
    const first=section.querySelector('button,input,select,textarea');
    try{first?.focus({preventScroll:true});}catch(_){ }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function waitForNativeAppointment(){
    if(bookingObserver)return;
    bookingObserver=new MutationObserver(()=>{
      const section=q('#booking-v1-section');
      if(!section)return;
      bookingObserver.disconnect();bookingObserver=null;
      showBookingSection(section);
    });
    bookingObserver.observe(content,{childList:true,subtree:true});
  }

  function openNativeAppointment(){
    const section=q('#booking-v1-section');
    if(section){showBookingSection(section);return;}
    const nativeAction=q('[data-liw-native-booking-action]');
    if(nativeAction){
      nativeAction.click();
      const after=q('#booking-v1-section');
      if(after)showBookingSection(after);else waitForNativeAppointment();
      return;
    }
    if(data()?.booking_enabled===true){
      waitForNativeAppointment();
      if(home){
        setRoom('home');
        const hint=q('.barber-client-hint',home);
        if(hint)hint.innerHTML='<i data-lucide="loader-circle" size="15"></i><span>Loading LIW Appointments…</span>';
      }
    }
  }

  function interceptDock(event){
    const button=event.target.closest?.('[data-barber-dock-action]');
    if(!button||!card?.contains(button)||!isBarber(data()))return;
    const key=button.dataset.barberDockAction;
    if(!ROOM_KEYS.has(key))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.LIWBarberRevolvingDock?.select?.(key,{perform:false});
    setRoom(key);
  }

  function syncBookAvailability(){
    card?.classList.toggle('barber-native-booking-ready',directNativeBookingReady());
  }

  function mount(){
    const cardData=data();
    card=q('#card');
    if(!cardData||!card||card.hidden||!isBarber(cardData))return false;
    content=q('.public-content',card);
    if(!content)return false;
    removeExternalBookingFromBarber();
    ensureStage();
    hideLegacyMiddleChrome();
    buildHome();
    moveRichSections();
    syncBookAvailability();
    setRoom(activeRoom);
    document.removeEventListener('click',interceptDock,true);
    document.addEventListener('click',interceptDock,true);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  window.LIWBarberClientRoom={mount,setRoom,openNativeAppointment};
  window.addEventListener('liw:card-loader-ready',()=>mount(),{passive:true});
  window.addEventListener('load',()=>mount(),{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
