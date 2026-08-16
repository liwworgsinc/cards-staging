/* LIW Cards — STAGING ONLY — true viewport-following live preview.
   On mobile the preview is temporarily moved to <body> so browser/WebView
   containing blocks cannot trap position:fixed inside the editor layout.
   Desktop restores the exact original DOM position and uses the sticky rail. */
(function(){
  'use strict';
  if(window.__LIW_STAGING_PREVIEW_FOLLOW__) return;
  window.__LIW_STAGING_PREVIEW_FOLLOW__=true;

  const MOBILE_QUERY='(max-width: 920px)';
  const media=window.matchMedia(MOBILE_QUERY);
  let stage=null;
  let anchor=null;

  function clearDockInlineStyles(){
    if(!stage) return;
    ['position','top','right','bottom','left','z-index'].forEach(name=>stage.style.removeProperty(name));
  }

  function dockToViewport(){
    if(!stage) return;
    if(stage.parentElement!==document.body) document.body.appendChild(stage);
    stage.dataset.liwViewportDock='true';
    stage.style.setProperty('position','fixed','important');
    stage.style.setProperty('top','auto','important');
    stage.style.setProperty('right','10px','important');
    stage.style.setProperty('bottom','calc(76px + env(safe-area-inset-bottom, 0px))','important');
    stage.style.setProperty('left','auto','important');
    stage.style.setProperty('z-index','120','important');
  }

  function restoreDesktopRail(){
    if(!stage||!anchor?.parentNode) return;
    if(stage.parentNode!==anchor.parentNode || stage.previousSibling!==anchor){
      anchor.parentNode.insertBefore(stage,anchor.nextSibling);
    }
    delete stage.dataset.liwViewportDock;
    clearDockInlineStyles();
  }

  function placePreview(){
    if(!stage) return;
    if(media.matches) dockToViewport();
    else restoreDesktopRail();
  }

  function boot(){
    stage=document.querySelector('.phone-stage');
    if(!stage) return false;
    if(!anchor){
      anchor=document.createComment('liw-staging-preview-anchor');
      stage.parentNode?.insertBefore(anchor,stage);
    }
    placePreview();
    media.addEventListener?.('change',placePreview);
    window.addEventListener('orientationchange',()=>setTimeout(placePreview,80),{passive:true});
    window.addEventListener('pageshow',placePreview,{passive:true});
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