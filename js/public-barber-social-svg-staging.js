/* LIW Cards staging — Barber Social iframe SVG reliability.
   The Barber client room clones the rendered Social section into sandboxed srcdoc.
   Inline each brand path color before cloning so Samsung/iframe CSS inheritance
   cannot blank the icon. Event-driven only; no polling or observers. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_SOCIAL_SVG_STAGING__)return;
  window.__LIW_BARBER_SOCIAL_SVG_STAGING__=true;

  function isBarber(){
    const card=document.getElementById('card');
    if(!card||card.hidden)return false;
    return card.classList.contains('barbershop-card-active');
  }

  function directBrand(icon){
    if(!icon)return '#ffffff';
    let brand='';
    try{brand=getComputedStyle(icon).getPropertyValue('--brand').trim();}catch(_){ }
    if(!/^#[0-9a-f]{6}$/i.test(brand)){
      const inline=String(icon.getAttribute('style')||'').match(/--brand\s*:\s*(#[0-9a-f]{6})/i);
      brand=inline?.[1]||'';
    }
    return /^#[0-9a-f]{6}$/i.test(brand)?brand:'#ffffff';
  }

  function paintSocialIcons(){
    if(!isBarber())return false;
    const icons=document.querySelectorAll('#social-section .social-brand-icon');
    if(!icons.length)return false;

    icons.forEach(icon=>{
      const brand=directBrand(icon);
      icon.style.setProperty('display','inline-grid','important');
      icon.style.setProperty('place-items','center','important');
      icon.style.setProperty('color',brand,'important');
      icon.style.setProperty('opacity','1','important');

      const svg=icon.querySelector('svg');
      if(!svg)return;
      svg.setAttribute('width','18');
      svg.setAttribute('height','18');
      svg.setAttribute('fill',brand);
      svg.style.setProperty('display','block','important');
      svg.style.setProperty('width','18px','important');
      svg.style.setProperty('height','18px','important');
      svg.style.setProperty('max-width','none','important');
      svg.style.setProperty('max-height','none','important');
      svg.style.setProperty('color',brand,'important');
      svg.style.setProperty('fill',brand,'important');
      svg.style.setProperty('opacity','1','important');
      svg.style.setProperty('visibility','visible','important');

      svg.querySelectorAll('path,circle,rect,polygon,polyline').forEach(shape=>{
        if(shape.tagName.toLowerCase()==='polyline'){
          shape.setAttribute('stroke',brand);
          shape.style.setProperty('stroke',brand,'important');
        }else{
          shape.setAttribute('fill',brand);
          shape.style.setProperty('fill',brand,'important');
        }
        shape.style.setProperty('opacity','1','important');
        shape.style.setProperty('visibility','visible','important');
      });
      icon.dataset.liwBarberSocialSvg='painted';
    });
    return true;
  }

  window.LIWBarberSocialSvg={paint:paintSocialIcons};
  window.addEventListener('liw:barber-client-ready',paintSocialIcons,{passive:true});
  window.addEventListener('liw:auto-contrast-applied',paintSocialIcons,{passive:true});
  window.addEventListener('load',paintSocialIcons,{once:true,passive:true});

  /* Capture the Social dock tap before the client-room handler builds srcdoc. */
  document.addEventListener('click',event=>{
    const action=event.target instanceof Element?event.target.closest('[data-barber-dock-action="social"]'):null;
    if(action)paintSocialIcons();
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',paintSocialIcons,{once:true});
  else paintSocialIcons();
})();
