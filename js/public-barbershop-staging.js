/* LIW Cards staging — full-card Studio adapter.
   Barbershop remains the single engine. Studio only adapts industry identity,
   icons and customer wording. No loader ownership and no MutationObserver. */
(function(){
  'use strict';
  if(new URLSearchParams(location.search).get('embed')==='1')return;
  if(window.__LIW_PUBLIC_BARBERSHOP_STAGING__)return;
  window.__LIW_PUBLIC_BARBERSHOP_STAGING__=true;

  const MODE='barbershop';
  const TYPES={
    barber:{label:'Barber',booking:'Book My Chair',services:'Cuts · grooming · style',social:'Follow My Work',dock:'Cuts',room:'Cuts & Services',gallery:'Fresh Cuts Gallery',specialty:'Fresh cuts · clean finish',promo:'Fresh cuts. Sharp details. Leave the chair looking ready.',bio:'Welcome in. Browse fresh work, find the shop, or send an inquiry from the barber rail below.'},
    hair:{label:'Hair Stylist',booking:'Book Hair Appointment',services:'Cuts · color · styling',social:'See My Styles',dock:'Hair',room:'Hair Services',gallery:'Style Gallery',specialty:'Cuts · color · styling',promo:'Fresh styles, color and finishing made for you.',bio:'Browse styles, services and availability, then book your next hair appointment.'},
    nails:{label:'Nail Tech',booking:'Book Nail Appointment',services:'Sets · fills · nail art',social:'See My Nail Work',dock:'Nails',room:'Nail Services',gallery:'Nail Gallery',specialty:'Sets · fills · nail art',promo:'Fresh sets, detailed art and clean finishes.',bio:'Browse nail work, services and availability, then book your next appointment.'},
    lashes:{label:'Lash / Brow',booking:'Book Lash / Brow',services:'Lashes · brows · fills',social:'See My Work',dock:'Lash/Brow',room:'Lash & Brow Services',gallery:'Lash & Brow Gallery',specialty:'Lashes · brows · fills',promo:'Defined lashes and brows tailored to your look.',bio:'Browse services, results and availability, then reserve your next session.'},
    makeup:{label:'Makeup Artist',booking:'Book Makeup Session',services:'Beauty · bridal · events',social:'See My Looks',dock:'Makeup',room:'Makeup Services',gallery:'Makeup Portfolio',specialty:'Beauty · bridal · events',promo:'Camera-ready looks for everyday beauty, bridal and events.',bio:'Explore looks, services and availability, then book your makeup session.'},
    esthetician:{label:'Esthetician',booking:'Book Skin Treatment',services:'Facials · skincare · treatments',social:'See My Work',dock:'Skin',room:'Skin Services',gallery:'Skin Results',specialty:'Facials · skincare · treatments',promo:'Personalized skincare focused on healthy-looking results.',bio:'Explore treatments, results and availability, then schedule your skin service.'},
    spa:{label:'Spa',booking:'Book Spa Service',services:'Massage · facials · wellness',social:'Explore My Studio',dock:'Spa',room:'Spa Services',gallery:'Spa Gallery',specialty:'Massage · facials · wellness',promo:'Relax, reset and make time for your wellness.',bio:'Explore spa services, the Studio and availability, then reserve your visit.'},
    cosmetics:{label:'Cosmetics',booking:'Book Consultation',services:'Products · beauty · consultations',social:'See What’s New',dock:'Products',room:'Beauty & Product Services',gallery:'Product Gallery',specialty:'Beauty · products · consultations',promo:'Discover beauty products and recommendations made for your routine.',bio:'Explore products, looks and consultation options from the Studio.'}
  };

  let studioType='';
  let resolvedCardId='';
  let resolving=null;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const validType=value=>TYPES[String(value||'').trim().toLowerCase()]?String(value).trim().toLowerCase():'';

  function isStudio(cardData){
    const mode=String(cardData?.color_mode||'').trim().toLowerCase();
    const experience=String(cardData?.card_experience||'classic').trim().toLowerCase();
    return experience==='barbershop'||(mode===MODE&&experience!=='music');
  }

  function client(){
    try{
      if(window.supabaseClient?.rpc)return window.supabaseClient;
      if(typeof supabaseClient!=='undefined'&&supabaseClient?.rpc){
        window.supabaseClient=supabaseClient;
        return supabaseClient;
      }
    }catch(_){ }
    return null;
  }

  function businessIcon(type,size=20){
    const open=`<svg class="studio-business-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;
    const paths={
      barber:'<path d="M8 3h8l1 4-1.2 2.2V20H8.2V9.2L7 7l1-4Z"/><path d="M10 6h4M10.2 11.5h3.6M10.2 15h3.6"/><path d="M9 20h6"/>',
      hair:'<path d="M4 9c0-3.1 2.6-5 6.3-5h2.2c3.6 0 6.5 2.2 6.5 5.2 0 2.6-2.2 4.8-5 4.8H9"/><path d="M9 14v6M6.5 20h5"/><path d="M18.5 7.5 22 6v6l-3.4-1.4"/>',
      nails:'<path d="M9 3h6v4H9z"/><path d="M8 7h8l1 3v10H7V10l1-3Z"/><path d="M10 12h4v5h-4z"/>',
      lashes:'<path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.1"/><path d="m5.2 8.4-1.3-2M8.1 7.1 7.5 4.7M12 6.6V4M15.9 7.1l.6-2.4M18.8 8.4l1.3-2"/>',
      makeup:'<path d="m5 19 8.8-8.8 2 2L7 21H5v-2Z"/><path d="m14.4 9.6 3.8-5.3c.7-1 2.2-.9 2.8.1.4.7.3 1.5-.2 2.1l-4.7 4.4"/><path d="M5 14c2.7-.3 4.7 1.6 5 4.2"/>',
      esthetician:'<circle cx="11" cy="12" r="7"/><path d="M8.5 11h.01M13.5 11h.01M9 15c1.1.9 2.9.9 4 0"/><path d="m18 4 .6 1.4L20 6l-1.4.6L18 8l-.6-1.4L16 6l1.4-.6L18 4Z"/>',
      spa:'<path d="M12 20c-4.6 0-8-2.4-8-5.8 2.6-.4 4.8.1 6.5 1.5C9 12.1 9.8 8.7 12 5c2.2 3.7 3 7.1 1.5 10.7 1.7-1.4 3.9-1.9 6.5-1.5 0 3.4-3.4 5.8-8 5.8Z"/>',
      cosmetics:'<path d="M9 3h6v5H9z"/><path d="M8 8h8v13H8z"/><path d="M10 8V5h4v3"/><path d="M10 13h4"/>'
    };
    return open+(paths[type]||paths.barber)+'</svg>';
  }

  function setVars(card,cardData){
    card.style.setProperty('--barber-primary',cardData.primary_color||'#111111');
    card.style.setProperty('--barber-secondary',cardData.secondary_color||'#d4a84f');
    card.style.setProperty('--barber-background',cardData.background_color||'#090909');
    card.style.setProperty('--barber-text',cardData.text_color||'#f8f4e8');
  }

  function walletIcon(){
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5h14.5A2.5 2.5 0 0 1 21 10v8a2.5 2.5 0 0 1-2.5 2.5h-14A2.5 2.5 0 0 1 2 18V6a2.5 2.5 0 0 1 2.5-2.5H17"/><path d="M2.5 7.5H17"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"/><circle cx="17.5" cy="14" r=".6" fill="currentColor" stroke="none"/></svg>';
  }

  function saveToWallet(){
    try{
      if(typeof window.LIWRolodex?.save==='function')return void window.LIWRolodex.save({source:'studio_wallet_top',studio_business_type:studioType||'barber'});
      if(typeof window.LIWRolodexPublicSave==='function')return void window.LIWRolodexPublicSave();
    }catch(_){ }
    try{window.toast?.('LIW Wallet is still loading. Try again.');}catch(_){ }
  }

  function ensureWalletTopAction(){
    const actions=q('#public-cover .public-top-actions');
    const qr=q('#qr-top');
    if(!actions||!qr)return;
    let button=q('#barber-wallet-top');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.id='barber-wallet-top';
      button.className='public-round-btn barber-wallet-top';
      button.setAttribute('aria-label','Save to LIW Wallet');
      button.title='Save to LIW Wallet';
      button.innerHTML=walletIcon();
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();saveToWallet();});
    }
    if(button.parentElement!==actions||qr.nextElementSibling!==button)qr.insertAdjacentElement('afterend',button);
  }

  function engineReady(cardData,card){
    document.documentElement.classList.add('liw-public-barbershop','liw-public-studio');
    document.body?.classList.add('liw-public-barbershop','liw-public-studio');
    card.classList.add('barbershop-card-active');
    setVars(card,cardData);
    q('.barber-public-badge')?.remove();
    ensureWalletTopAction();
  }

  function setDataset(type){
    document.documentElement.dataset.studioBusinessType=type;
    if(document.body)document.body.dataset.studioBusinessType=type;
    const card=q('#card');
    if(card)card.dataset.studioBusinessType=type;
  }

  function pendingIdentity(){
    studioType='';
    setDataset('pending');
    q('.studio-public-industry')?.remove();
  }

  function rememberAndSet(element,text){
    if(!element)return;
    if(!element.dataset.barberOriginal)element.dataset.barberOriginal=element.textContent||'';
    if(element.textContent!==text)element.textContent=text;
  }

  function renderIndustryBadge(){
    if(!studioType)return;
    const cover=q('#public-cover');
    if(!cover)return;
    let badge=q('.studio-public-industry',cover);
    if(!badge){badge=document.createElement('div');badge.className='studio-public-industry';cover.appendChild(badge);}
    const meta=TYPES[studioType];
    const markup=`${businessIcon(studioType,18)}<span>${meta.label}</span>`;
    if(badge.innerHTML!==markup)badge.innerHTML=markup;
  }

  function relabelBase(){
    if(!studioType)return;
    const meta=TYPES[studioType];
    const booking=q('[data-event="booking_click"]');
    if(booking){
      rememberAndSet(q('span',booking),meta.booking);
      booking.classList.add('barber-book-chair');
    }
    rememberAndSet(q('#services-section .public-section-heading span'),meta.services);
    rememberAndSet(q('#social-section .public-section-heading h2'),meta.social);
  }

  function setTextIf(element,expected,next){
    if(element&&String(element.textContent||'').trim()===expected)element.textContent=next;
  }

  function adaptFrame(meta){
    const back=q('[data-barber-frame-home]');
    if(back&&back.getAttribute('aria-label')!=='Back to Studio welcome')back.setAttribute('aria-label','Back to Studio welcome');
    const title=q('[data-barber-frame-title]');
    if(title){
      const current=String(title.textContent||'').trim();
      if(current==='Cuts & Services')title.textContent=meta.room;
      else if(current==='Fresh Cuts Gallery')title.textContent=meta.gallery;
      else if(current==='Find the Shop')title.textContent='Find the Studio';
    }
    const frame=q('.barber-client-iframe');
    if(!frame)return;
    if(frame.title==='Barbershop client content'||frame.title==='Cuts & Services')frame.title='Studio client content';
    const current=frame.getAttribute('srcdoc')||'';
    if(!current)return;
    let next=current;
    [
      ['Cuts & Services',meta.room],
      ['Fresh Cuts Gallery',meta.gallery],
      ['Find the Shop','Find the Studio'],
      ['Find the shop','Find the Studio'],
      ['This barber has not added an address yet.','This Studio has not added an address yet.'],
      ['This barber has not added this section yet.','This Studio has not added this section yet.'],
      ['Barbershop client content','Studio client content']
    ].forEach(([from,to])=>{next=next.split(from).join(to);});
    if(next!==current)frame.setAttribute('srcdoc',next);
  }

  function adaptClientChrome(){
    if(!studioType)return;
    const meta=TYPES[studioType];
    const dock=q('.barber-revolve-dock');
    if(dock&&dock.getAttribute('aria-label')!=='Studio revolving actions')dock.setAttribute('aria-label','Studio revolving actions');
    const servicesButton=q('[data-barber-dock-action="cuts"]');
    if(servicesButton){
      const label=q('span',servicesButton);if(label&&label.textContent!==meta.dock)label.textContent=meta.dock;
      const existingIcon=q('svg',servicesButton);
      if(existingIcon&&!existingIcon.classList.contains('studio-business-svg'))existingIcon.outerHTML=businessIcon(studioType,20);
    }
    const home=q('.barber-client-home');
    if(home){
      setTextIf(q('h1',home),'Your Barber',`Your ${meta.label}`);
      setTextIf(q('.barber-welcome-specialty',home),'Fresh cuts · clean finish',meta.specialty);
      setTextIf(q('.barber-client-promo strong',home),'Fresh cuts. Sharp details. Leave the chair looking ready.',meta.promo);
      setTextIf(q('.barber-client-promo p',home),'Welcome in. Browse fresh work, find the shop, or send an inquiry from the barber rail below.',meta.bio);
      const hint=q('.barber-client-hint span:last-child',home);
      if(hint&&/Cuts, Gallery, Map and more open in the client room\./.test(hint.textContent||''))hint.textContent=`Call, Text, Book and Save act instantly. ${meta.dock}, Gallery, Map and more open in the client room.`;
    }
    adaptFrame(meta);
  }

  function settleClientChrome(){
    adaptClientChrome();
    requestAnimationFrame(()=>{
      adaptClientChrome();
      setTimeout(adaptClientChrome,70);
      setTimeout(adaptClientChrome,220);
    });
  }

  function wireClientRoom(){
    const api=window.LIWBarberClientRoom;
    if(!api||typeof api.setRoom!=='function'||api.setRoom.__liwStudioWrapped)return;
    const original=api.setRoom.bind(api);
    const wrapped=function(key){
      const result=original(key);
      settleClientChrome();
      return result;
    };
    wrapped.__liwStudioWrapped=true;
    api.setRoom=wrapped;
  }

  function applyType(type){
    const next=validType(type)||'barber';
    studioType=next;
    setDataset(next);
    renderIndustryBadge();
    relabelBase();
    wireClientRoom();
    settleClientChrome();
    try{window.dispatchEvent(new CustomEvent('liw:studio-type-ready',{detail:{type:next}}));}catch(_){ }
  }

  async function resolveType(cardData){
    const direct=validType(cardData?.studio_business_type);
    if(direct)return direct;
    const id=String(cardData?.id||'');
    if(!id)return 'barber';
    if(resolvedCardId===id&&studioType)return studioType;
    if(resolving)return resolving;
    const supabase=client();
    if(!supabase)return 'barber';
    resolving=(async()=>{
      try{
        const {data:type,error}=await supabase.rpc('public_studio_business_type',{p_card_id:id});
        if(error)throw error;
        const resolved=validType(type)||'barber';
        resolvedCardId=id;
        return resolved;
      }catch(error){
        console.warn('Studio business type lookup skipped:',error);
        return 'barber';
      }finally{
        resolving=null;
      }
    })();
    return resolving;
  }

  function mount(){
    const cardData=data();
    const card=q('#card');
    if(!cardData||!card||card.hidden)return false;
    if(!isStudio(cardData))return true;

    engineReady(cardData,card);
    const direct=validType(cardData.studio_business_type);
    if(direct){applyType(direct);return true;}

    pendingIdentity();
    void resolveType(cardData).then(type=>{
      const latest=data();
      if(!latest||!isStudio(latest)||String(latest.id||'')!==String(cardData.id||''))return;
      applyType(type);
    });
    return true;
  }

  document.addEventListener('click',event=>{
    if(!event.target?.closest?.('[data-barber-dock-action]'))return;
    settleClientChrome();
  },true);

  window.addEventListener('liw:barber-client-ready',()=>{wireClientRoom();settleClientChrome();},{passive:true});
  window.addEventListener('liw:card-loader-ready',mount,{passive:true});
  window.addEventListener('load',mount,{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  setTimeout(mount,180);
  setTimeout(mount,650);

  window.LIWStudioPublic={refresh:mount,get businessType(){return studioType||'';},types:TYPES};
})();
