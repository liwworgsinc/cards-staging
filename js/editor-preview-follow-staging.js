/* LIW Cards — STAGING ONLY — true viewport-following live preview.
   The real preview is lifted to <body> on every viewport so no editor/grid
   containing block can stop it from following the page. A lightweight slot
   keeps the desktop two-column editor layout from shifting. */
(function(){
  'use strict';
  if(window.__LIW_STAGING_PREVIEW_FOLLOW__) return;
  window.__LIW_STAGING_PREVIEW_FOLLOW__=true;

  const DESKTOP_QUERY='(min-width: 921px)';
  const desktop=window.matchMedia(DESKTOP_QUERY);
  let stage=null;
  let slot=null;
  let shell=null;
  let resizeFrame=0;

  function ensureSlot(){
    if(slot || !stage?.parentNode) return;
    slot=document.createElement('div');
    slot.className='liw-preview-rail-slot';
    slot.setAttribute('aria-hidden','true');
    stage.parentNode.insertBefore(slot,stage);
  }

  function liftToViewport(){
    if(!stage) return;
    ensureSlot();
    if(stage.parentElement!==document.body) document.body.appendChild(stage);
    stage.dataset.liwViewportDock='true';
    stage.style.setProperty('position','fixed','important');
    stage.style.setProperty('left','auto','important');
    stage.style.setProperty('z-index','120','important');
  }

  function placeDesktop(){
    liftToViewport();
    stage.dataset.liwViewportMode='desktop';
    shell=document.querySelector('.editor-shell');
    const rect=shell?.getBoundingClientRect();
    const right=rect ? Math.max(14,Math.round(window.innerWidth-rect.right+8)) : 18;
    stage.style.setProperty('top','92px','important');
    stage.style.setProperty('right',`${right}px`,'important');
    stage.style.setProperty('bottom','auto','important');
  }

  function placeMobile(){
    liftToViewport();
    stage.dataset.liwViewportMode='mobile';
    stage.style.setProperty('top','auto','important');
    stage.style.setProperty('right','10px','important');
    /* Staging has a one-line QA rail at the bottom. Keep preview above it so
       neither utility covers the editor form. */
    stage.style.setProperty('bottom','calc(64px + env(safe-area-inset-bottom, 0px))','important');

    const fullButton=document.getElementById('mobile-preview-button');
    if(fullButton){
      fullButton.setAttribute('aria-label','Open full-size card preview');
      fullButton.title='Open full-size card preview';
    }
  }

  function placePreview(){
    if(!stage) return;
    if(desktop.matches) placeDesktop();
    else placeMobile();
  }

  function queuePlace(){
    if(resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{
      resizeFrame=0;
      placePreview();
    });
  }

  function boot(){
    stage=document.querySelector('.phone-stage');
    if(!stage) return false;
    shell=document.querySelector('.editor-shell');
    ensureSlot();
    liftToViewport();
    placePreview();

    desktop.addEventListener?.('change',queuePlace);
    window.addEventListener('resize',queuePlace,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(queuePlace,80),{passive:true});
    window.addEventListener('pageshow',queuePlace,{passive:true});
    return true;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else if(!boot()){
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      if(boot()||tries>20) clearInterval(timer);
    },100);
  }
})();