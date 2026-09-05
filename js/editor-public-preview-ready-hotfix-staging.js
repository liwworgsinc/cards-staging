/* LIW Cards — STAGING ONLY — mobile public preview readiness guard.
   Clears stale timeout overlays if the exact public-card iframe finishes rendering
   after an earlier slow-load warning. Safe alongside the stable preview controller. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_PREVIEW_READY_HOTFIX__)return;
  window.__LIW_PUBLIC_PREVIEW_READY_HOTFIX__=true;

  const MODAL='#liw-public-preview-modal';
  const FRAME=`${MODAL} iframe.liw-public-preview-frame`;
  const STATE=`${MODAL} .liw-public-preview-state`;
  let scanTimer=0;

  function frameReady(frame){
    try{
      const doc=frame?.contentDocument;
      if(!doc)return false;
      const card=doc.getElementById('card');
      if(!card||card.hidden)return false;
      return card.getClientRects().length>0;
    }catch(_){return false;}
  }

  function clearReadyState(frame){
    if(!frameReady(frame))return false;
    const state=document.querySelector(STATE);
    if(state)state.hidden=true;
    return true;
  }

  function settleAfterLoad(frame){
    [0,60,180,420,900,1600,2800,5000].forEach(delay=>{
      setTimeout(()=>clearReadyState(frame),delay);
    });
  }

  function wire(frame){
    if(!frame||frame.dataset.liwPreviewReadyHotfix==='true')return;
    frame.dataset.liwPreviewReadyHotfix='true';
    frame.addEventListener('load',()=>settleAfterLoad(frame));
    settleAfterLoad(frame);
  }

  function scan(){
    const frame=document.querySelector(FRAME);
    if(frame){
      wire(frame);
      clearReadyState(frame);
    }
  }

  function startShortWatcher(){
    clearInterval(scanTimer);
    let attempts=0;
    scanTimer=setInterval(()=>{
      attempts+=1;
      scan();
      const frame=document.querySelector(FRAME);
      if((frame&&clearReadyState(frame))||attempts>=240){
        clearInterval(scanTimer);
        scanTimer=0;
      }
    },250);
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;
    if(target.closest('#mobile-preview-button,.liw-public-preview-refresh')){
      setTimeout(scan,20);
      setTimeout(scan,200);
      startShortWatcher();
    }
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{scan();startShortWatcher();},{once:true});
  else {scan();startShortWatcher();}
})();
