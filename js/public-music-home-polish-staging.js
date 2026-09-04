/* LIW Cards staging — Music home polish helper.
   Pairs Inner Circle + Upcoming Show and reveals the Music home after the
   plan-aware bottom state has settled. Classic/Flow are untouched. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_HOME_POLISH__)return;
  window.__LIW_MUSIC_HOME_POLISH__=true;

  function data(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}

  function pairSecondaryCards(card){
    const content=card?.querySelector('.public-content');
    if(!content)return false;
    let row=content.querySelector('.music-secondary-row');
    const inner=content.querySelector('.music-inner-circle');
    const show=content.querySelector('.music-upcoming-show');

    if(!inner&&!show)return false;

    if(!row){
      row=document.createElement('section');
      row.className='music-secondary-row';
      row.setAttribute('aria-label','Artist updates');
      const anchor=inner||show;
      anchor?.parentNode?.insertBefore(row,anchor);
    }

    if(inner&&inner.parentNode!==row)row.appendChild(inner);
    if(show&&show.parentNode!==row)row.appendChild(show);
    row.classList.toggle('is-single',row.children.length<2);
    return true;
  }

  function settle(card){
    if(!card||!isMusic())return false;
    card.classList.add('music-home-stabilizing');
    card.classList.remove('music-home-stable');

    const started=Date.now();
    const finish=()=>{
      pairSecondaryCards(card);
      card.classList.remove('music-home-stabilizing');
      requestAnimationFrame(()=>card.classList.add('music-home-stable'));
    };

    const timer=setInterval(()=>{
      pairSecondaryCards(card);
      const planReady=card.classList.contains('music-plan-free')||card.classList.contains('music-plan-paid');
      const artistControlsReady=Boolean(card.querySelector('.music-luxe-launcher'));
      const secondaryReady=Boolean(card.querySelector('.music-secondary-row'))||Date.now()-started>700;
      if((planReady&&artistControlsReady&&secondaryReady)||Date.now()-started>1400){
        clearInterval(timer);
        finish();
      }
    },60);
    return true;
  }

  function run(){
    if(!isMusic())return false;
    const card=document.querySelector('.music-card-active');
    if(!card)return false;
    if(card.dataset.musicHomePolishMounted==='true'){
      pairSecondaryCards(card);
      return true;
    }
    card.dataset.musicHomePolishMounted='true';
    settle(card);

    const observer=new MutationObserver(()=>pairSecondaryCards(card));
    observer.observe(card,{childList:true,subtree:true});
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries+=1;
    if(run()||tries>90)clearInterval(timer);
  },80);
  run();
})();