(function(){
  'use strict';
  const input=document.getElementById('slug');
  if(!input||typeof slugify!=='function'||typeof scheduleSave!=='function')return;

  const finalSlugify=slugify;
  const normalScheduleSave=scheduleSave;
  const normalImmediateAutosave=typeof requestImmediateAutosave==='function'?requestImmediateAutosave:null;
  const normalPerformSave=typeof performSave==='function'?performSave:null;
  const normalCollect=typeof collectCardPayload==='function'?collectCardPayload:null;

  let editGeneration=0;
  let pendingSlugValue=input.value||'';
  let slugEditPending=false;

  const isEditingSlug=()=>document.activeElement===input;

  function rememberSlugEdit(value=input.value){
    pendingSlugValue=String(value??'');
    slugEditPending=true;
    editGeneration+=1;
  }

  function restorePendingSlug(){
    if(!slugEditPending)return;
    const start=input.selectionStart;
    const end=input.selectionEnd;
    if(input.value!==pendingSlugValue)input.value=pendingSlugValue;
    if(typeof render==='function')render();
    if(isEditingSlug()&&typeof input.setSelectionRange==='function'){
      try{
        const length=input.value.length;
        input.setSelectionRange(Math.min(start??length,length),Math.min(end??length,length));
      }catch(_){ }
    }
  }

  function showSlugSaved(){
    const status=document.getElementById('slug-status');
    if(!status||status.classList.contains('warning'))return;
    status.textContent='Card address saved.';
    status.className='input-help slug-status success';
  }

  slugify=function(text){
    if(isEditingSlug()){
      return String(text||'').toLowerCase().replace(/[^a-z0-9 -]/g,'').slice(0,60);
    }
    return finalSlugify(text);
  };

  scheduleSave=function(){
    if(isEditingSlug()){
      if(typeof markDirty==='function')markDirty();
      if(typeof persistLocalDraft==='function')persistLocalDraft();
      if(typeof setSaveState==='function')setSaveState('saving','Finish typing your card address…');
      return;
    }
    return normalScheduleSave();
  };

  if(normalImmediateAutosave){
    requestImmediateAutosave=function(){
      if(isEditingSlug()){
        if(typeof setSaveState==='function')setSaveState('saving','Finish typing your card address…');
        return;
      }
      return normalImmediateAutosave();
    };
  }

  /* A save that started before the user began editing can finish later and
     write the old server slug back into the input. Keep the user's newest
     typing authoritative until a save that started with that edit completes. */
  if(normalPerformSave){
    performSave=async function(...args){
      const generationAtStart=editGeneration;
      const pendingAtStart=slugEditPending;
      const editingAtStart=isEditingSlug();
      try{
        const result=await normalPerformSave.apply(this,args);
        const changedDuringSave=editGeneration!==generationAtStart;
        if(changedDuringSave||isEditingSlug()||editingAtStart){
          restorePendingSlug();
          if(typeof setSaveState==='function')setSaveState('saving','Finish typing your card address…');
        }else if(pendingAtStart){
          slugEditPending=false;
          pendingSlugValue=input.value||'';
          showSlugSaved();
        }
        return result;
      }catch(error){
        if(editGeneration!==generationAtStart||isEditingSlug())restorePendingSlug();
        throw error;
      }
    };
  }

  if(normalCollect){
    collectCardPayload=function(){
      const payload=normalCollect();
      if(payload.slug)payload.slug=finalSlugify(payload.slug);
      return payload;
    };
  }

  input.addEventListener('focus',()=>{
    /* Cancel a normal pending debounce so it cannot fire midway through the
       address edit. An already-running request is handled by performSave above. */
    try{
      if(typeof saveTimer!=='undefined'&&saveTimer){
        clearTimeout(saveTimer);
        saveTimer=null;
      }
    }catch(_){ }
    rememberSlugEdit(input.value);
  });

  input.addEventListener('input',()=>{
    rememberSlugEdit(input.value);
    const status=document.getElementById('slug-status');
    if(status){
      status.textContent='Keep typing. Your card address will save when you finish this field.';
      status.className='input-help slug-status';
    }
  });

  input.addEventListener('blur',()=>{
    const formatted=finalSlugify(input.value);
    input.value=formatted;
    rememberSlugEdit(formatted);
    if(typeof render==='function')render();
    normalScheduleSave();
    const status=document.getElementById('slug-status');
    if(status){
      status.textContent=input.value?'Card address formatted and saving…':'Enter a short public card address.';
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

(function loadEditorFocusStaging(){
  if(document.querySelector('script[data-editor-focus-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-focus-staging.js?v=20260824-2';
  script.dataset.editorFocusStaging='true';
  document.body.appendChild(script);
})();

/* Emergency rollback 2026-08-14: selected-status experiment disabled because
   its DOM observer could repeatedly mutate the editor and freeze the page. */
