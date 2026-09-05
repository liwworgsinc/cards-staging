/* LIW Cards staging — branded public-card loader controller.
   Keeps the base card hidden until the selected experience is actually ready. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_LOADER__)return;
  window.__LIW_PUBLIC_CARD_LOADER__=true;

  const root=document.documentElement;
  const loader=document.getElementById('liw-card-loader');
  const kicker=loader?.querySelector('[data-liw-loader-kicker]');
  const message=loader?.querySelector('[data-liw-loader-message]');
  const started=performance.now();
  const MIN_VISIBLE_MS=420;
  const FAILSAFE_MS=12000;
  let released=false;
  let musicSeen=false;

  function cardData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}
  }

  function experience(data){return String(data?.card_experience||'classic').trim().toLowerCase();}

  function setCopy(type){
    if(!loader)return;
    const music=type==='music';
    loader.classList.toggle('is-music',music);
    if(kicker)kicker.textContent=music?'Setting the stage':'Loading your LIW card';
    if(message)message.textContent=music?'Building the artist experience…':'Connecting your experience…';
  }

  function inheritAccent(card){
    if(!loader||!card)return;
    try{
      const style=getComputedStyle(card);
      const primary=(style.getPropertyValue('--music-template-primary')||style.getPropertyValue('--card-primary')||style.getPropertyValue('--primary-color')||'').trim();
      const secondary=(style.getPropertyValue('--music-template-secondary')||style.getPropertyValue('--card-secondary')||'').trim();
      if(primary)loader.style.setProperty('--liw-loader-accent',primary);
      if(secondary)loader.style.setProperty('--liw-loader-accent-2',secondary);
    }catch(_){ }
  }

  function musicReady(card){
    if(!card||card.hidden)return false;
    if(!card.classList.contains('music-card-active'))return false;
    const launcher=card.querySelector('.music-luxe-launcher');
    const identity=card.querySelector('.music-identity-row');
    const stable=card.classList.contains('music-home-stable');
    return Boolean(launcher&&identity&&stable);
  }

  function baseReady(card){return Boolean(card&&!card.hidden);}

  function release(reason){
    if(released)return;
    const card=document.getElementById('card');
    if(!card)return;
    const elapsed=performance.now()-started;
    if(elapsed<MIN_VISIBLE_MS){
      setTimeout(()=>release(reason),MIN_VISIBLE_MS-elapsed);
      return;
    }
    released=true;
    if(kicker)kicker.textContent='Ready';
    if(message)message.textContent=musicSeen?'Your artist card is ready.':'Your LIW card is ready.';
    root.classList.add('liw-card-loader-release');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      setTimeout(()=>{
        root.classList.remove('liw-card-loader-active','liw-card-loader-release');
        if(loader)loader.hidden=true;
      },280);
    }));
    try{window.dispatchEvent(new CustomEvent('liw:card-loader-ready',{detail:{reason}}));}catch(_){ }
  }

  function probe(){
    if(released)return true;
    const data=cardData();
    const card=document.getElementById('card');
    if(!data||!card)return false;

    const type=experience(data);
    musicSeen=type==='music';
    setCopy(type);
    inheritAccent(card);

    if(type==='music'){
      if(musicReady(card)){release('music-stable');return true;}
      return false;
    }

    if(baseReady(card)){
      release(type==='flow'?'flow-base-ready':'classic-ready');
      return true;
    }
    return false;
  }

  let ticks=0;
  const timer=setInterval(()=>{
    ticks+=1;
    if(probe()||released)clearInterval(timer);
    else if(performance.now()-started>=FAILSAFE_MS){
      clearInterval(timer);
      const card=document.getElementById('card');
      if(card&&!card.hidden){
        console.warn('[LIW Loader] failsafe release before experience stabilization');
        release('failsafe');
      }
    }
  },50);

  const observer=new MutationObserver(()=>{
    if(!released)probe();
    else observer.disconnect();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});

  setCopy('classic');
  probe();
})();
