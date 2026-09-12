/* LIW Cards staging — Barber Social iframe icon bridge V4.
   Builds each social glyph as a self-contained SVG data-URI image immediately
   before the Barber client room clones Social into sandboxed srcdoc.
   This avoids SVG/CSS inheritance issues inside the iframe.
   Event-driven only: no polling, observers or animation loops. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_SOCIAL_SVG_V4__)return;
  window.__LIW_BARBER_SOCIAL_SVG_V4__=true;

  const DARK_BRAND_OVERRIDES={
    tiktok:'#25F4EE',
    x:'#F8F8FB',
    twitter:'#F8F8FB',
    threads:'#F8F8FB'
  };

  function isBarber(){
    const card=document.getElementById('card');
    return Boolean(card&&!card.hidden&&card.classList.contains('barbershop-card-active'));
  }

  function chipKey(chip){
    if(!chip)return '';
    for(const name of chip.classList){
      if(name.startsWith('social-chip-'))return name.slice('social-chip-'.length);
    }
    const existing=chip.querySelector('.social-brand-icon');
    if(existing){
      for(const name of existing.classList){
        if(name.startsWith('social-brand-'))return name.slice('social-brand-'.length);
      }
    }
    const label=Array.from(chip.querySelectorAll('span')).find(span=>!span.classList.contains('social-brand-icon')&&!span.classList.contains('sr-only'));
    if(label&&typeof window.socialKey==='function'){
      try{return window.socialKey(label.textContent||'');}catch(_){ }
    }
    return '';
  }

  function validHex(value){return /^#[0-9a-f]{6}$/i.test(String(value||''));}

  function displayBrand(meta){
    const override=DARK_BRAND_OVERRIDES[String(meta?.key||'').toLowerCase()];
    if(validHex(override))return override;
    return validHex(meta?.color)?String(meta.color):'#F8F8FB';
  }

  function svgDataUri(meta,glyph){
    if(!meta?.viewBox||!Array.isArray(meta.paths)||!meta.paths.length)return '';
    const paths=meta.paths.map(path=>`<path fill="${glyph}" d="${String(path).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"/>`).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${String(meta.viewBox).replace(/"/g,'&quot;')}" role="img">${paths}</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function buildPortableIcon(key){
    if(!key||typeof window.socialMeta!=='function')return null;
    let meta=null;
    try{meta=window.socialMeta(key);}catch(_){return null;}
    if(!meta?.key)return null;

    const brand=displayBrand(meta);
    const originalBrand=validHex(meta.color)?String(meta.color):brand;
    const src=svgDataUri(meta,brand);
    if(!src)return null;

    const icon=document.createElement('span');
    icon.className=`social-brand-icon social-brand-${meta.key}`;
    icon.setAttribute('aria-hidden','true');
    icon.dataset.liwBarberSocialSvg='portable-v4';
    icon.dataset.socialPlatform=meta.key;
    icon.style.setProperty('--brand',brand);
    icon.style.setProperty('--brand-original',originalBrand);
    icon.style.setProperty('--brand-bg',`${brand}18`);
    icon.style.setProperty('display','inline-grid','important');
    icon.style.setProperty('place-items','center','important');
    icon.style.setProperty('width','35px','important');
    icon.style.setProperty('height','35px','important');
    icon.style.setProperty('min-width','35px','important');
    icon.style.setProperty('border-radius','12px','important');
    icon.style.setProperty('background',`${brand}18`,'important');
    icon.style.setProperty('border',`1px solid ${brand}35`,'important');
    icon.style.setProperty('opacity','1','important');
    icon.style.setProperty('visibility','visible','important');
    icon.style.setProperty('overflow','hidden','important');

    const image=document.createElement('img');
    image.src=src;
    image.alt='';
    image.setAttribute('aria-hidden','true');
    image.dataset.barberSocialIconImage=meta.key;
    image.width=22;
    image.height=22;
    image.style.setProperty('display','block','important');
    image.style.setProperty('width','22px','important');
    image.style.setProperty('height','22px','important');
    image.style.setProperty('max-width','22px','important');
    image.style.setProperty('max-height','22px','important');
    image.style.setProperty('object-fit','contain','important');
    image.style.setProperty('opacity','1','important');
    image.style.setProperty('visibility','visible','important');
    image.style.setProperty('pointer-events','none','important');
    icon.appendChild(image);
    return icon;
  }

  function rebuildSocialSource(){
    if(!isBarber())return false;
    const area=document.querySelector('#social-section #socials');
    if(!area)return false;
    const chips=Array.from(area.querySelectorAll('.social-chip'));
    if(!chips.length)return false;

    let rebuilt=0;
    chips.forEach(chip=>{
      const key=chipKey(chip);
      const next=buildPortableIcon(key);
      if(!next)return;
      const current=chip.querySelector('.social-brand-icon');
      if(current)current.replaceWith(next);
      else chip.prepend(next);
      chip.dataset.barberSocialPlatform=key;
      rebuilt+=1;
    });
    area.dataset.liwBarberSocialRebuilt=String(rebuilt);
    area.dataset.liwBarberSocialIconMode='portable-v4';
    return rebuilt>0;
  }

  function wrapClientRoom(){
    const api=window.LIWBarberClientRoom;
    if(!api||typeof api.setRoom!=='function'||api.__liwSocialV4Wrapped)return false;
    const original=api.setRoom.bind(api);
    api.setRoom=function(key){
      if(key==='social')rebuildSocialSource();
      return original(key);
    };
    api.__liwSocialV4Wrapped=true;
    return true;
  }

  function prepare(){
    wrapClientRoom();
    return rebuildSocialSource();
  }

  window.LIWBarberSocialSvg={paint:rebuildSocialSource,prepare,wrap:wrapClientRoom,buildPortableIcon};
  window.addEventListener('liw:barber-client-ready',()=>{wrapClientRoom();},{passive:true});
  window.addEventListener('liw:card-loader-ready',()=>{wrapClientRoom();},{passive:true});
  window.addEventListener('load',()=>{wrapClientRoom();},{once:true,passive:true});

  document.addEventListener('click',event=>{
    const action=event.target instanceof Element?event.target.closest('[data-barber-dock-action="social"]'):null;
    if(!action)return;
    wrapClientRoom();
    rebuildSocialSource();
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wrapClientRoom,{once:true});
  else wrapClientRoom();
})();

/* Studio V4 adapts the already-rendered card and never owns the global loader. */
(function loadStudioV4(){
  'use strict';
  if(document.querySelector('script[data-liw-public-studio-v4]'))return;
  const script=document.createElement('script');
  script.src='js/public-studio-v4-staging.js?v=20260912-studio-v4-1';
  script.async=false;
  script.dataset.liwPublicStudioV4='true';
  document.body.appendChild(script);
})();
