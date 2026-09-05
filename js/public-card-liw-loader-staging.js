/* LIW Cards staging — branded public-card loader controller.
   Keeps the base card hidden until the selected experience is actually ready. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_CARD_LOADER__)return;
  window.__LIW_PUBLIC_CARD_LOADER__=true;

  const root=document.documentElement;
  const loading=document.getElementById('loading');
  const started=performance.now();
  const MIN_VISIBLE_MS=420;
  const FAILSAFE_MS=12000;
  let released=false;

  function cardData(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function experience(data){return String(data?.card_experience||'classic').trim().toLowerCase();}

  function setMode(type){
    root.classList.toggle('liw-loader-music',type==='music');
  }

  function inheritAccent(card){
    if(!loading||!card)return;
    try{
      const style=getComputedStyle(card);
      const primary=(style.getPropertyValue('--music-template-primary')||style.getPropertyValue('--card-primary')||style.getPropertyValue('--primary-color')||'').trim();
      const secondary=(style.getPropertyValue('--music-template-secondary')||style.getPropertyValue('--card-secondary')||'').trim();
      if(primary)loading.style.setProperty('--liw-loader-accent',primary);
      if(secondary)loading.style.setProperty('--liw-loader-accent-2',secondary);
    }catch(_){ }
  }

  function musicReady(card){
    if(!card||card.hidden||!card.classList.contains('music-card-active'))return false;
    return Boolean(
      card.classList.contains('music-home-stable')&&
      card.querySelector('.music-luxe-launcher')&&
      card.querySelector('.music-identity-row')
    );
  }

  function release(reason){
    if(released)return;
    const card=document.getElementById('card');
    if(!card)return;
    const elapsed=performance.now()-started;
    if(elapsed<MIN_VISIBLE_MS){
      setTimeout(()=>release(reason),Math.max(0,MIN_VISIBLE_MS-elapsed));
      return;
    }
    released=true;
    root.classList.add('liw-card-loader-release');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      setTimeout(()=>{
        root.classList.remove('liw-card-loader-active','liw-card-loader-release','liw-loader-music');
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
    setMode(type);
    inheritAccent(card);

    if(type==='music'){
      if(musicReady(card)){release('music-stable');return true;}
      return false;
    }

    if(!card.hidden){
      release(type==='flow'?'flow-ready':'classic-ready');
      return true;
    }
    return false;
  }

  const timer=setInterval(()=>{
    if(probe()||released){clearInterval(timer);return;}
    if(performance.now()-started>=FAILSAFE_MS){
      const card=document.getElementById('card');
      if(card&&!card.hidden){
        clearInterval(timer);
        console.warn('[LIW Loader] failsafe release before experience stabilization');
        release('failsafe');
      }
    }
  },50);

  const observer=new MutationObserver(()=>{
    if(released){observer.disconnect();return;}
    probe();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style']});
  probe();
})();
