/* LIW Cards staging — Studio business-type persistence reliability.
   One last-write-wins queue prevents fast mobile taps from dropping the selected type.
   This does not render Studio or replace the Barbershop engine. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_TYPE_PERSISTENCE__)return;
  window.__LIW_STUDIO_TYPE_PERSISTENCE__=true;

  const TYPES=new Set(['barber','hair','nails','lashes','makeup','esthetician','spa','cosmetics']);
  let desiredType='';
  let saving=false;
  let flushPromise=Promise.resolve();

  const selectedStudioType=()=>{
    const active=document.querySelector('[data-studio-business-type].is-active,[data-studio-business-type][aria-pressed="true"]');
    const apiType=String(window.LIWStudio?.businessType||'').trim().toLowerCase();
    const domType=String(active?.dataset?.studioBusinessType||'').trim().toLowerCase();
    return TYPES.has(apiType)?apiType:TYPES.has(domType)?domType:'';
  };

  const studioActive=()=>{
    const mode=String(document.querySelector('[name="color_mode"]')?.value||'').trim().toLowerCase();
    const experience=String(document.querySelector('[name="card_experience"]')?.value||'classic').trim().toLowerCase();
    return mode==='barbershop'&&experience!=='music';
  };

  const cardId=()=>{
    try{return typeof currentId!=='undefined'&&currentId?String(currentId):'';}catch(_){return '';}
  };

  async function drain(){
    if(saving)return flushPromise;
    saving=true;
    flushPromise=(async()=>{
      try{
        while(desiredType){
          const next=desiredType;
          desiredType='';
          if(!studioActive())continue;
          const id=cardId();
          if(!id||!window.supabaseClient?.rpc){
            desiredType=next;
            break;
          }
          const {error}=await window.supabaseClient.rpc('set_studio_business_type',{p_card_id:id,p_business_type:next});
          if(error){
            desiredType=desiredType||next;
            console.warn('Studio business type save failed:',error);
            throw error;
          }
          document.documentElement.dataset.studioBusinessType=next;
          if(document.body)document.body.dataset.studioBusinessType=next;
        }
      } finally {
        saving=false;
        if(desiredType&&cardId()&&studioActive())queueMicrotask(()=>{void drain();});
      }
    })();
    return flushPromise;
  }

  function queue(type){
    const next=String(type||'').trim().toLowerCase();
    if(!TYPES.has(next))return Promise.resolve();
    desiredType=next;
    return drain();
  }

  async function flush(){
    const latest=selectedStudioType();
    if(latest)desiredType=latest;
    await drain();
    if(desiredType)await drain();
  }

  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('[data-studio-business-type]'):null;
    if(!button)return;
    const type=button.dataset.studioBusinessType;
    queueMicrotask(()=>{void queue(type);});
  },true);

  window.LIWStudioTypePersistence={queue,flush,get pending(){return desiredType;}};
})();
