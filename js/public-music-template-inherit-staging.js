/* LIW Cards staging — selected template remains Music's visual source of truth. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_TEMPLATE_INHERIT__)return;
  window.__LIW_MUSIC_TEMPLATE_INHERIT__=true;

  function cardData(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function safe(v,fallback=''){const s=String(v??'').trim();return s||fallback;}
  function isMusic(data){return String(data?.card_experience||'').toLowerCase()==='music';}

  function applyVars(data){
    if(!isMusic(data))return false;
    const card=document.getElementById('card');
    if(!card||!card.classList.contains('music-card-active'))return false;
    const root=document.documentElement;
    const vars={
      '--music-template-primary':safe(data.primary_color,'#7c3aed'),
      '--music-template-secondary':safe(data.secondary_color,'#2563eb'),
      '--music-template-bg':safe(data.background_color,'#090b14'),
      '--music-template-text':safe(data.text_color,'#ffffff'),
      '--music-template-button':safe(data.button_color,safe(data.primary_color,'#7c3aed')),
      '--music-template-button-text':safe(data.button_text_color,'#ffffff'),
      '--music-template-gradient':safe(data.gradient_background,`linear-gradient(135deg,${safe(data.primary_color,'#7c3aed')},${safe(data.secondary_color,'#2563eb')})`),
      '--music-template-font':safe(data.font_family,'DM Sans'),
      '--music-template-name-font':safe(data.name_font_family,safe(data.font_family,'DM Sans')),
      '--music-template-radius':`${Math.max(6,Math.min(28,Number(data.border_radius)||18))}px`
    };
    [root,card].forEach(node=>Object.entries(vars).forEach(([k,v])=>node.style.setProperty(k,v)));
    card.classList.remove('glam-nova-violet','glam-gold-luxe','glam-rose-chrome','glam-ice-blue','music-button-style-filled','music-button-style-outline','music-button-style-soft');
    const style=['filled','outline','soft'].includes(String(data.button_style))?String(data.button_style):'filled';
    card.classList.add(`music-button-style-${style}`);
    card.dataset.musicTemplateInherited='true';
    return true;
  }

  function relabel(){
    const cta=document.querySelector('.music-card-active .music-primary-cta span');
    if(cta)cta.textContent='STREAM RELEASE';
    const ctaButton=document.querySelector('.music-card-active .music-primary-cta');
    if(ctaButton)ctaButton.setAttribute('aria-label','Open streaming options for this release');
    const releasePlay=document.querySelector('.music-card-active .music-release-play');
    if(releasePlay){releasePlay.innerHTML='<i data-lucide="headphones" size="19"></i>';releasePlay.setAttribute('aria-label','Open streaming options');}
    const room=document.querySelector('.music-artist-room');
    if(room){
      room.querySelectorAll('.music-streaming-hero small').forEach(el=>{if(/now playing/i.test(el.textContent||''))el.textContent='FEATURED RELEASE';});
      room.querySelectorAll('.music-streaming-hero .music-room-link').forEach(el=>{
        if(/listen now/i.test(el.textContent||''))el.innerHTML='Open stream <i data-lucide="arrow-up-right" size="16"></i>';
      });
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function run(){const data=cardData();if(!data||!isMusic(data))return false;const ok=applyVars(data);if(ok)relabel();return ok;}
  let tries=0;const timer=setInterval(()=>{tries++;if(run()&&tries>10)clearInterval(timer);if(tries>80)clearInterval(timer);},150);
  const observer=new MutationObserver(()=>{const data=cardData();if(data&&isMusic(data)){applyVars(data);relabel();}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  run();
})();
