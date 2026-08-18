/* LIW Cards — cards-staging only: save Standard/Flow immediately after selection.
   The core selector still owns entitlement checks and UI state. This bridge only
   shortens the normal autosave debounce for an intentional experience change. */
(function(){
  'use strict';
  if(window.__LIW_EXPERIENCE_AUTOSAVE_STAGING__)return;
  window.__LIW_EXPERIENCE_AUTOSAVE_STAGING__=true;

  let flushTimer=0;

  function flushExperienceSave(button){
    if(!button||button.disabled||button.classList.contains('locked'))return;
    const experience=String(button.dataset.cardExperience||'').toLowerCase();
    if(!['classic','flow'].includes(experience))return;

    clearTimeout(flushTimer);
    document.documentElement.dataset.liwExperienceSavePending=experience;

    /* editor-swipe-layout.js synchronously updates card_experience and dispatches
       input/change before this delegated bubble listener runs. Give editor.js one
       short turn to mark the revision dirty, then flush the existing save queue. */
    flushTimer=setTimeout(()=>{
      flushTimer=0;
      try{
        if(typeof window.requestImmediateAutosave==='function'){
          window.requestImmediateAutosave();
          return;
        }
      }catch(_){ }

      const saveButton=document.getElementById('save-now-button');
      if(saveButton&&!saveButton.disabled)saveButton.click();
    },45);
  }

  document.addEventListener('click',event=>{
    const button=event.target instanceof Element
      ? event.target.closest('[data-card-experience]')
      : null;
    if(button)flushExperienceSave(button);
  },false);

  /* Clear the pending marker after the existing save UX reports success. The
     exact preview refresh remains owned by editor-save-ux-staging.js so there is
     only one post-save iframe refresh and no reload race. */
  const clearWhenSaved=()=>{
    const state=document.getElementById('save-state');
    if(!state||!document.documentElement.dataset.liwExperienceSavePending)return;
    if(state.classList.contains('saved'))delete document.documentElement.dataset.liwExperienceSavePending;
  };
  document.addEventListener('click',event=>{
    if(event.target instanceof Element&&event.target.closest('#save-now-button'))setTimeout(clearWhenSaved,900);
  });
})();
