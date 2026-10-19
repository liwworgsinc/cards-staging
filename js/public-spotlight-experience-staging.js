/* LIW Cards staging — Spotlight public experience adapter.
   Reuses Classic data/rendering and applies Spotlight presentation only when
   card_experience=spotlight. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_SPOTLIGHT_EXPERIENCE__)return;
  window.__LIW_PUBLIC_SPOTLIGHT_EXPERIENCE__=true;

  const VERSION='20261019-spotlight-studio-1';
  let lastCard=null;

  function ensureStyle(){
    if(document.querySelector('link[data-liw-spotlight-public]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`css/public-spotlight-experience-staging.css?v=${VERSION}`;
    link.dataset.liwSpotlightPublic='true';
    document.head.appendChild(link);
  }

  function initials(value,fallback='LIW'){
    const parts=String(value||'').trim().split(/\s+/).filter(Boolean);
    return parts.length?parts.slice(0,2).map(part=>part[0]).join('').toUpperCase():fallback;
  }

  function active(data){return String(data?.card_experience||'').trim().toLowerCase()==='spotlight';}

  function removeSpotlight(){
    const root=document.getElementById('card');
    root?.classList.remove('spotlight-experience-active');
    document.documentElement.classList.remove('liw-spotlight-experience');
    document.getElementById('spotlight-logo-badge')?.remove();
  }

  function ensureBadge(data){
    const cover=document.getElementById('public-cover');
    if(!cover)return;
    let badge=document.getElementById('spotlight-logo-badge');
    if(!badge){
      badge=document.createElement('div');
      badge.id='spotlight-logo-badge';
      badge.className='spotlight-logo-badge';
      badge.setAttribute('aria-label','Business logo');
      cover.appendChild(badge);
    }
    const logo=String(data.qr_logo_url||'').trim();
    if(logo){
      badge.classList.remove('is-initials');
      let image=badge.querySelector('img');
      if(!image){image=document.createElement('img');image.alt='Business logo';badge.replaceChildren(image);}
      if(image.getAttribute('src')!==logo)image.src=logo;
    }else{
      badge.classList.add('is-initials');
      badge.textContent=initials(data.company_name||data.full_name);
    }
  }

  function apply(data){
    if(data)lastCard=data;
    data=lastCard||window.__LIW_SPOTLIGHT_PENDING_CARD__||null;
    if(!data)return false;
    const root=document.getElementById('card');
    const avatar=document.getElementById('avatar');
    if(!root||!avatar)return false;
    if(!active(data)){removeSpotlight();return false;}

    ensureStyle();
    root.classList.add('spotlight-experience-active');
    root.dataset.cardExperience='spotlight';
    document.documentElement.classList.add('liw-spotlight-experience');

    const radius=Math.max(4,Math.min(28,Number(data.border_radius)||16));
    root.style.setProperty('--spotlight-radius',`${radius}px`);
    root.style.setProperty('--spotlight-accent',data.primary_color||'#0b1438');
    root.style.setProperty('--spotlight-accent-2',data.secondary_color||'#d4a84f');

    const shape=String(data.profile_image_shape||'circle').toLowerCase();
    avatar.style.borderRadius=shape==='square'?'8px':shape==='rounded'?'26px':'50%';
    const frame=data.profile_border_enabled===true||String(data.profile_border_enabled).toLowerCase()==='true';
    const width=Math.max(1,Math.min(8,Number(data.profile_border_width)||4));
    const frameColor=frame?(data.profile_border_color||data.secondary_color||'#d4a84f'):'#ffffff';
    avatar.style.border=`${frame?width:4}px solid ${frameColor}`;

    ensureBadge(data);
    try{window.LIWWalletGlobal?.sync?.();}catch(_){ }
    try{window.lucide?.createIcons?.();}catch(_){ }
    return true;
  }

  document.addEventListener('liw:public-card-rendered',event=>apply(event.detail?.card));
  document.addEventListener('liw:public-card-ready',event=>apply(event.detail?.card));
  window.addEventListener('pageshow',()=>apply());

  function start(){
    ensureStyle();
    if(window.__LIW_SPOTLIGHT_PENDING_CARD__)apply(window.__LIW_SPOTLIGHT_PENDING_CARD__);
  }

  window.LIWSpotlightExperience={sync:apply,version:VERSION,isActive:()=>document.getElementById('card')?.classList.contains('spotlight-experience-active')===true};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
