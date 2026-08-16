/* LIW Cards — STAGING ONLY — unified live-preview sync.
   Keeps the existing editor logic intact and simply guarantees that user
   interactions (typing, selects, toggles, templates, palettes, Flow/Classic,
   toolkit controls, etc.) refresh the live card after the control updates. */
(function(){
  'use strict';
  if(window.__LIW_STAGING_PREVIEW_SYNC__) return;
  window.__LIW_STAGING_PREVIEW_SYNC__=true;

  let frame=0;

  function refreshPreview(){
    frame=0;
    try{
      if(typeof window.render==='function') window.render();
      else if(typeof render==='function') render();
    }catch(error){
      console.warn('LIW staging preview refresh skipped:',error);
    }

    /* Flow/profile and Advanced + Beef Up mirrors live outside core render(). */
    try{ window.LIWFlowExperience?.refresh?.(); }catch(_){ }
    try{ window.LIWProfileBorder?.refresh?.(); }catch(_){ }
    try{ window.LIWStagingPreviewMirror?.refresh?.(); }catch(_){ }
  }

  function queueRefresh(){
    if(frame) return;
    frame=requestAnimationFrame(refreshPreview);
  }

  function isEditorField(target){
    return target instanceof Element && target.matches('input,textarea,select');
  }

  function isEditorAction(target){
    if(!(target instanceof Element)) return false;
    const action=target.closest('button,[role="button"],label,summary');
    if(!action) return false;
    return Boolean(action.closest('.editor-workspace,.liw-toolkit-drawer,#rich-card-builder'));
  }

  /* Delegation also covers controls inserted after editor startup. */
  document.addEventListener('input',event=>{
    if(isEditorField(event.target)) queueRefresh();
  },false);

  document.addEventListener('change',event=>{
    if(isEditorField(event.target)) queueRefresh();
  },false);

  document.addEventListener('click',event=>{
    if(!isEditorAction(event.target)) return;
    /* Target-level click handlers run before this document listener. The next
       animation frame therefore sees the values produced by the pressed UI. */
    queueRefresh();
    /* Some editor controls finish their state on a zero-delay timer. */
    setTimeout(queueRefresh,40);
  },false);

  function initialSync(){
    queueRefresh();
    setTimeout(queueRefresh,350);
    setTimeout(queueRefresh,1200);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialSync,{once:true});
  else initialSync();
})();