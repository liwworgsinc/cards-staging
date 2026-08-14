(function(){
  'use strict';
  const input=document.getElementById('slug');
  if(!input||typeof slugify!=='function'||typeof scheduleSave!=='function')return;

  const finalSlugify=slugify;
  const normalScheduleSave=scheduleSave;
  const normalCollect=typeof collectCardPayload==='function'?collectCardPayload:null;

  slugify=function(text){
    if(document.activeElement===input){
      return String(text||'').toLowerCase().replace(/[^a-z0-9 -]/g,'').slice(0,60);
    }
    return finalSlugify(text);
  };

  scheduleSave=function(){
    if(document.activeElement===input){
      if(typeof markDirty==='function')markDirty();
      if(typeof persistLocalDraft==='function')persistLocalDraft();
      if(typeof setSaveState==='function')setSaveState('saving','Card address not saved yet');
      return;
    }
    return normalScheduleSave();
  };

  if(normalCollect){
    collectCardPayload=function(){
      const payload=normalCollect();
      if(payload.slug)payload.slug=finalSlugify(payload.slug);
      return payload;
    };
  }

  input.addEventListener('blur',()=>{
    input.value=finalSlugify(input.value);
    if(typeof render==='function')render();
    normalScheduleSave();
    const status=document.getElementById('slug-status');
    if(status){
      status.textContent=input.value?'Card address formatted and ready to save.':'Enter a short public card address.';
      status.className=`input-help slug-status${input.value?' success':''}`;
    }
  });
})();

/* STAGING ONLY: isolated editor UX experiments. */
(function loadWholeCardStagingTest(){
  if(document.querySelector('script[data-whole-card-staging-test]'))return;
  const script=document.createElement('script');
  script.src='js/editor-whole-card-staging-test.js?v=20260814-2';
  script.dataset.wholeCardStagingTest='true';
  document.body.appendChild(script);
})();

(function loadBusinessToolsCollapseStaging(){
  if(document.querySelector('script[data-business-tools-collapse-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-business-tools-collapse-staging.js?v=20260814-2';
  script.dataset.businessToolsCollapseStaging='true';
  document.body.appendChild(script);
})();

(function loadBusinessToolsMobilePolishStaging(){
  if(document.querySelector('script[data-business-tools-mobile-polish-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-business-tools-mobile-polish-staging.js?v=20260814-3';
  script.dataset.businessToolsMobilePolishStaging='true';
  document.body.appendChild(script);
})();

(function loadBusinessToolsMobileRefineStaging(){
  if(document.querySelector('script[data-business-tools-mobile-refine-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-business-tools-mobile-refine-staging.js?v=20260814-1';
  script.dataset.businessToolsMobileRefineStaging='true';
  document.body.appendChild(script);
})();

(function loadSimpleBusinessCollapseStaging(){
  if(document.querySelector('script[data-simple-business-collapse-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-business-tools-simple-collapse-staging.js?v=20260814-2';
  script.dataset.simpleBusinessCollapseStaging='true';
  document.body.appendChild(script);
})();

(function loadServicesCheckboxStaging(){
  if(document.querySelector('script[data-services-checkbox-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-services-checkbox-staging.js?v=20260814-1';
  script.dataset.servicesCheckboxStaging='true';
  document.body.appendChild(script);
})();

/* Emergency rollback 2026-08-14: selected-status experiment disabled because
   its DOM observer could repeatedly mutate the editor and freeze the page. */
