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

/* STAGING ONLY: load the isolated editor UX experiment without changing the
   production editor bundle or overwriting existing staging editor upgrades. */
(function loadWholeCardStagingTest(){
  if(document.querySelector('script[data-whole-card-staging-test]'))return;
  const script=document.createElement('script');
  script.src='js/editor-whole-card-staging-test.js?v=20260814-1';
  script.dataset.wholeCardStagingTest='true';
  document.body.appendChild(script);
})();
