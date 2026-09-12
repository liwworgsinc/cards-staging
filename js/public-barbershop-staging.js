/* LIW Cards staging — public Studio bridge.
   `barbershop` stays as the internal experience key for backward compatibility.
   studio_business_type changes the icon and business-specific customer wording. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_BARBERSHOP_STAGING__)return;
  window.__LIW_PUBLIC_BARBERSHOP_STAGING__=true;

  const MODE='barbershop';
  const TYPES={
    barber:{label:'Barber',booking:'Book My Chair',services:'Cuts · grooming · style',social:'Follow My Work'},
    hair:{label:'Hair Stylist',booking:'Book Hair Appointment',services:'Cuts · color · styling',social:'See My Styles'},
    nails:{label:'Nail Tech',booking:'Book Nail Appointment',services:'Sets · fills · nail art',social:'See My Nail Work'},
    lashes:{label:'Lash / Brow',booking:'Book Lash / Brow',services:'Lashes · brows · fills',social:'See My Work'},
    makeup:{label:'Makeup Artist',booking:'Book Makeup Session',services:'Beauty · bridal · events',social:'See My Looks'},
    esthetician:{label:'Esthetician',booking:'Book Skin Treatment',services:'Facials · skincare · treatments',social:'See My Work'},
    spa:{label:'Spa',booking:'Book Spa Service',services:'Massage · facials · wellness',social:'Explore My Studio'},
    cosmetics:{label:'Cosmetics',booking:'Book Consultation',services:'Products · beauty · consultations',social:'See What’s New'}
  };
  let studioType='barber';
  let typeCardId='';

  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const isStudio=cardData=>String(cardData?.color_mode||'').trim().toLowerCase()===MODE&&String(cardData?.card_experience||'classic').toLowerCase()!=='music';

  function businessIcon(type,size=20){
    const open=`<svg class="studio-business-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;
    const close='</svg>';
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
    return open+(paths[type]||paths.barber)+close;
  }

  function injectStudioStyles(){
    if(document.getElementById('liw-public-studio-adaptive-style'))return;
    const style=document.createElement('style');
    style.id='liw-public-studio-adaptive-style';
    style.textContent=`
      .liw-public-studio #public-cover{position:relative}
      .studio-public-industry{position:absolute;right:14px;bottom:14px;z-index:7;display:flex;align-items:center;gap:7px;max-width:170px;padding:7px 10px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:rgba(7,10,18,.72);backdrop-filter:blur(10px);color:#fff;box-shadow:0 8px 22px rgba(0,0,0,.2)}
      .studio-public-industry svg{width:18px;height:18px;flex:0 0 auto}.studio-public-industry span{font-size:.68rem;font-weight:850;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .barbershop-card-active[data-studio-business-type="hair"] .studio-public-industry,.barbershop-card-active[data-studio-business-type="makeup"] .studio-public-industry{background:color-mix(in srgb,var(--barber-primary) 78%,rgba(7,10,18,.78))}
      @media(max-width:520px){.studio-public-industry{right:10px;bottom:10px;padding:6px 8px}.studio-public-industry span{font-size:.62rem}}
    `;
    document.head.appendChild(style);
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
      if(typeof window.LIWRolodex?.save==='function'){
        window.LIWRolodex.save({source:'studio_wallet_top',studio_business_type:studioType});
        return;
      }
      if(typeof window.LIWRolodexPublicSave==='function'){
        window.LIWRolodexPublicSave();
        return;
      }
    }catch(_){ }
    try{window.toast?.('LIW Wallet is still loading. Try again.');}catch(_){ }
  }

  function ensureWalletTopAction(){
    const actions=document.querySelector('#public-cover .public-top-actions');
    const qr=document.getElementById('qr-top');
    if(!actions||!qr)return;
    let button=document.getElementById('barber-wallet-top');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.id='barber-wallet-top';
      button.className='public-round-btn barber-wallet-top';
      button.setAttribute('aria-label','Save to LIW Wallet');
      button.title='Save to LIW Wallet';
      button.innerHTML=walletIcon();
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        saveToWallet();
      });
    }
    if(button.parentElement!==actions||qr.nextElementSibling!==button)qr.insertAdjacentElement('afterend',button);
  }

  function rememberAndSet(element,text){
    if(!element)return;
    if(!element.dataset.barberOriginal)element.dataset.barberOriginal=element.textContent||'';
    element.textContent=text;
  }

  function relabel(){
    const meta=TYPES[studioType]||TYPES.barber;
    const booking=document.querySelector('[data-event="booking_click"]');
    if(booking){
      const span=booking.querySelector('span');
      rememberAndSet(span,meta.booking);
      booking.classList.add('barber-book-chair');
    }
    rememberAndSet(document.querySelector('#services-section .public-section-heading span'),meta.services);
    rememberAndSet(document.querySelector('#social-section .public-section-heading h2'),meta.social);
  }

  function renderIndustryBadge(){
    const cover=document.getElementById('public-cover');
    if(!cover)return;
    let badge=cover.querySelector('.studio-public-industry');
    if(!badge){
      badge=document.createElement('div');
      badge.className='studio-public-industry';
      cover.appendChild(badge);
    }
    const meta=TYPES[studioType]||TYPES.barber;
    badge.innerHTML=`${businessIcon(studioType,18)}<span>${meta.label}</span>`;
  }

  async function resolveStudioType(cardData){
    if(!cardData?.id||typeCardId===String(cardData.id))return studioType;
    typeCardId=String(cardData.id);
    try{
      const {data:type,error}=await window.supabaseClient.rpc('public_studio_business_type',{p_card_id:cardData.id});
      if(!error&&TYPES[String(type||'').toLowerCase()])studioType=String(type).toLowerCase();
    }catch(error){console.warn('Studio business type lookup skipped:',error);}
    return studioType;
  }

  function restore(){
    document.documentElement.classList.remove('liw-public-barbershop','liw-public-studio');
    delete document.documentElement.dataset.studioBusinessType;
    const card=document.getElementById('card');
    card?.classList.remove('barbershop-card-active');
    if(card)delete card.dataset.studioBusinessType;
    document.querySelector('.barber-public-badge')?.remove();
    document.querySelector('.studio-public-industry')?.remove();
    document.getElementById('barber-wallet-top')?.remove();
    document.querySelectorAll('[data-barber-original]').forEach(el=>{
      el.textContent=el.dataset.barberOriginal;
      delete el.dataset.barberOriginal;
    });
    document.querySelector('[data-event="booking_click"]')?.classList.remove('barber-book-chair');
  }

  async function mount(){
    const cardData=data();
    const card=document.getElementById('card');
    if(!cardData||!card||card.hidden)return false;
    if(!isStudio(cardData)){restore();return true;}
    await resolveStudioType(cardData);
    injectStudioStyles();
    document.documentElement.classList.add('liw-public-barbershop','liw-public-studio');
    document.documentElement.dataset.studioBusinessType=studioType;
    card.classList.add('barbershop-card-active');
    card.dataset.studioBusinessType=studioType;
    setVars(card,cardData);
    document.querySelector('.barber-public-badge')?.remove();
    ensureWalletTopAction();
    renderIndustryBadge();
    relabel();
    return true;
  }

  const run=()=>{void mount();};
  window.addEventListener('liw:card-loader-ready',run,{passive:true});
  window.addEventListener('load',run,{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();
