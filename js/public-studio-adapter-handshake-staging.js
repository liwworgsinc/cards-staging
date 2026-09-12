/* LIW Cards staging — Studio render handshake.
   Studio is not a second renderer. It reuses the proven Barbershop engine and only
   needs one reliable signal after the async public card becomes visible. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_ADAPTER_RENDER_HANDSHAKE__)return;
  window.__LIW_STUDIO_ADAPTER_RENDER_HANDSHAKE__=true;

  const MAX_WAIT_MS=5000;
  const TICK_MS=80;
  const started=Date.now();
  let timer=0;
  let signaled=false;

  function cardData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}
  }

  function isStudio(data){
    const mode=String(data?.color_mode||'').trim().toLowerCase();
    const experience=String(data?.card_experience||'classic').trim().toLowerCase();
    return experience==='barbershop'||(mode==='barbershop'&&experience!=='music');
  }

  function stop(){
    if(timer){clearInterval(timer);timer=0;}
  }

  function pulse(){
    if(signaled)return true;
    const data=cardData();
    const card=document.getElementById('card');
    if(!data||!card||card.hidden||!isStudio(data))return false;

    /* The existing public Studio adapter sets this flag at startup. Waiting for the
       flag avoids firing before its liw:card-loader-ready listener is registered. */
    if(window.__LIW_PUBLIC_BARBERSHOP_STAGING__!==true)return false;

    signaled=true;
    try{
      window.dispatchEvent(new CustomEvent('liw:card-loader-ready',{
        detail:{reason:'studio-card-rendered'}
      }));
    }catch(_){ }
    stop();
    return true;
  }

  timer=setInterval(()=>{
    if(pulse())return;
    if(Date.now()-started>=MAX_WAIT_MS)stop();
  },TICK_MS);

  window.addEventListener('load',pulse,{once:true,passive:true});
  if(document.readyState!=='loading')pulse();
})();
