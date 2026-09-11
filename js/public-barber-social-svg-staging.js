/* LIW Cards staging — Barber Social iframe icon bridge V3.
   Rebuilds Social icons from LIW's authoritative socialIconHtml/socialMeta data
   immediately before the Barber client room clones Social into sandboxed srcdoc.
   Event-driven only: no polling, observers or animation loops. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_SOCIAL_SVG_V3__)return;
  window.__LIW_BARBER_SOCIAL_SVG_V3__=true;

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
    return '';
  }

  function buildPaintedIcon(key){
    if(!key||typeof window.socialMeta!=='function'||typeof window.socialIconHtml!=='function')return null;
    let meta=null;
    try{meta=window.socialMeta(key);}catch(_){return null;}
    if(!meta?.key)return null;

    const host=document.createElement('template');
    host.innerHTML=window.socialIconHtml(meta.key,{size:17}).trim();
    const icon=host.content.firstElementChild;
    if(!icon)return null;

    const brand=/^#[0-9a-f]{6}$/i.test(String(meta.color||''))?meta.color:'#ffffff';
    const bg=String(meta.background||`${brand}18`);
    icon.style.setProperty('--brand',brand);
    icon.style.setProperty('--brand-bg',bg);
    icon.style.setProperty('display','inline-grid','important');
    icon.style.setProperty('place-items','center','important');
    icon.style.setProperty('flex','0 0 auto','important');
    icon.style.setProperty('color',brand,'important');
    icon.style.setProperty('background',bg,'important');
    icon.style.setProperty('opacity','1','important');

    const svg=icon.querySelector('svg');
    if(svg){
      svg.setAttribute('width','17');
      svg.setAttribute('height','17');
      svg.setAttribute('fill',brand);
      svg.style.setProperty('display','block','important');
      svg.style.setProperty('width','17px','important');
      svg.style.setProperty('height','17px','important');
      svg.style.setProperty('color',brand,'important');
      svg.style.setProperty('fill',brand,'important');
      svg.style.setProperty('opacity','1','important');
      svg.style.setProperty('visibility','visible','important');
      svg.querySelectorAll('path,circle,rect,polygon,polyline').forEach(shape=>{
        const tag=shape.tagName.toLowerCase();
        if(tag==='polyline'){
          shape.setAttribute('stroke',brand);
          shape.style.setProperty('stroke',brand,'important');
        }else{
          shape.setAttribute('fill',brand);
          shape.style.setProperty('fill',brand,'important');
        }
        shape.style.setProperty('opacity','1','important');
        shape.style.setProperty('visibility','visible','important');
      });
    }
    icon.dataset.liwBarberSocialSvg='rebuilt';
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
      const next=buildPaintedIcon(key);
      if(!next)return;
      const current=chip.querySelector('.social-brand-icon');
      if(current)current.replaceWith(next);
      else chip.prepend(next);
      rebuilt+=1;
    });
    area.dataset.liwBarberSocialRebuilt=String(rebuilt);
    return rebuilt>0;
  }

  function wrapClientRoom(){
    const api=window.LIWBarberClientRoom;
    if(!api||typeof api.setRoom!=='function'||api.__liwSocialV3Wrapped)return false;
    const original=api.setRoom.bind(api);
    api.setRoom=function(key){
      if(key==='social')rebuildSocialSource();
      return original(key);
    };
    api.__liwSocialV3Wrapped=true;
    return true;
  }

  function prepare(){
    wrapClientRoom();
    return rebuildSocialSource();
  }

  window.LIWBarberSocialSvg={paint:rebuildSocialSource,prepare,wrap:wrapClientRoom};
  window.addEventListener('liw:barber-client-ready',()=>{wrapClientRoom();},{passive:true});
  window.addEventListener('liw:card-loader-ready',()=>{wrapClientRoom();},{passive:true});
  window.addEventListener('load',()=>{wrapClientRoom();},{once:true,passive:true});

  /* Capture provides a final same-tap guard; setRoom is also wrapped, so Social
     is rebuilt synchronously immediately before roomMarkup/cloneNode runs. */
  document.addEventListener('click',event=>{
    const action=event.target instanceof Element?event.target.closest('[data-barber-dock-action="social"]'):null;
    if(!action)return;
    wrapClientRoom();
    rebuildSocialSource();
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wrapClientRoom,{once:true});
  else wrapClientRoom();
})();
