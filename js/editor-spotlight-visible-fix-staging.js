/* Staging-only reliability bridge for Spotlight experience visibility. */
(function(){
  'use strict';
  if(window.__LIW_SPOTLIGHT_VISIBLE_FIX__)return;
  window.__LIW_SPOTLIGHT_VISIBLE_FIX__=true;

  let queued=false;
  function sync(){
    queued=false;
    try{window.LIWSpotlightEditor?.sync?.();}catch(error){console.warn('[Spotlight] visibility sync skipped',error);}
  }
  function queue(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(sync);
  }

  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.type==='childList'))queue();
  });

  function start(){
    observer.observe(document.body,{childList:true,subtree:true});
    [0,100,250,500,900,1500,2500,4000,6500,10000,15000].forEach(delay=>setTimeout(sync,delay));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
