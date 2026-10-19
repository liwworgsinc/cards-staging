/* LIW Cards staging — Spotlight public experience adapter.
   Spotlight deliberately reuses the Classic renderer/data model and only changes presentation. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_SPOTLIGHT_EXPERIENCE__)return;
  window.__LIW_PUBLIC_SPOTLIGHT_EXPERIENCE__=true;

  const VERSION='20261018-spotlight-1';
  let lastCardId='';
  let lastLogo='';
  let attempts=0;

  function ensureStyle(){
    if(document.querySelector('link[data-liw-spotlight-public]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`css/public-spotlight-experience-staging.css?v=${VERSION}`;
    link.dataset.liwSpotlightPublic='true';
    document.head.appendChild(link);
  }

  function getCardData(detail){
    if(detail?.card)return detail.card;
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}
  }

  function initials(value,fallback='LIW'){
    const parts=String(value||'').trim().split(/\s+/).filter(Boolean);
    if(!parts.length)return fallback;
    return parts.slice(0,2).map(part=>part[0]).join('').toUpperCase();
  }

  function removeSpotlight(){
    const card=document.getElementById('card');
    card?.classList.remove('spotlight-experience-active');
    document.documentElement.classList.remove('liw-spotlight-experience');
    document.getElementById('spotlight-logo-badge')?.remove();
    lastCardId='';
    lastLogo='';
  }

  function ensureBadge(data){
    const cover=document.getElementById('public-cover');
    if(!cover)return null;
    let badge=document.getElementById('spotlight-logo-badge');
    if(!badge){
      badge=document.createElement('div');
      badge.id='spotlight-logo-badge';
      badge.className='spotlight-logo-badge';
      badge.setAttribute('aria-label','Business logo');
      cover.appendChild(badge);
    }

    // Spotlight v1 reuses the existing scan-safe logo upload so no database migration
    // is required while the experience is being tested in staging. If no logo exists,
    // a clean company-initial badge preserves the intended attached-circle treatment.
    const logo=String(data.qr_logo_url||'').trim();
    const fingerprint=`${logo}|${data.company_name||''}|${data.full_name||''}`;
    if(fingerprint===lastLogo&&badge.childNodes.length)return badge;
    lastLogo=fingerprint;

    if(logo){
      badge.classList.remove('is-initials');
      badge.innerHTML=`<img src="${logo.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" alt="${String(data.company_name||'Business').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')} logo">`;
      badge.dataset.logoSource='qr-logo';
    }else{
      badge.classList.add('is-initials');
      badge.textContent=initials(data.company_name||data.full_name,'LIW');
      badge.dataset.logoSource='initials';
    }
    return badge;
  }

  function applySpotlight(data){
    const card=document.getElementById('card');
    if(!card||!data)return false;
    const experience=String(data.card_experience||'classic').trim().toLowerCase();
    if(experience!=='spotlight'){
      if(card.classList.contains('spotlight-experience-active'))removeSpotlight();
      return false;
    }

    ensureStyle();
    card.classList.add('spotlight-experience-active');
    card.dataset.cardExperience='spotlight';
    document.documentElement.classList.add('liw-spotlight-experience');
    ensureBadge(data);
    lastCardId=String(data.id||data.slug||'spotlight');

    try{window.LIWWalletGlobal?.sync?.();}catch(_){ }
    try{window.lucide?.createIcons?.();}catch(_){ }
    return true;
  }

  function sync(detail){
    const data=getCardData(detail);
    if(!data)return false;
    return applySpotlight(data);
  }

  document.addEventListener('liw:public-card-ready',event=>sync(event.detail));
  document.addEventListener('liw:public-card-rendered',event=>sync(event.detail));
  document.addEventListener('liw:card-loader-ready',()=>sync());
  window.addEventListener('pageshow',()=>sync());

  const timer=setInterval(()=>{
    attempts+=1;
    const data=getCardData();
    if(data)sync({card:data});
    if((data&&String(data.card_experience||'').toLowerCase()==='spotlight'&&document.querySelector('.spotlight-experience-active'))||attempts>=80){
      clearInterval(timer);
    }
  },125);

  window.LIWSpotlightExperience={
    sync:()=>sync(),
    version:VERSION,
    isActive:()=>document.getElementById('card')?.classList.contains('spotlight-experience-active')===true
  };
})();
