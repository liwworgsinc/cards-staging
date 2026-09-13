/* LIW Cards staging — Studio business-type persistence reliability.
   One last-write-wins queue prevents fast mobile taps from dropping the selected type.
   Retries are bounded timers; this module never owns rendering or the Barbershop engine. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_TYPE_PERSISTENCE__)return;
  window.__LIW_STUDIO_TYPE_PERSISTENCE__=true;

  const TYPES=new Set(['barber','hair','nails','lashes','makeup','esthetician','spa','cosmetics']);
  const MAX_RETRIES=8;
  const RETRY_MS=220;
  let desiredType='';
  let inFlight=null;
  let retryTimer=0;
  let retryCount=0;

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

  function client(){
    try{
      if(window.supabaseClient?.rpc)return window.supabaseClient;
      if(typeof supabaseClient!=='undefined'&&supabaseClient?.rpc){
        window.supabaseClient=supabaseClient;
        return supabaseClient;
      }
    }catch(_){ }
    return null;
  }

  function ready(){return Boolean(studioActive()&&cardId()&&client());}

  function clearRetry(){
    if(retryTimer){clearTimeout(retryTimer);retryTimer=0;}
  }

  function scheduleRetry(){
    if(!desiredType||retryTimer||retryCount>=MAX_RETRIES)return;
    retryCount+=1;
    retryTimer=setTimeout(()=>{
      retryTimer=0;
      void drain(false);
    },RETRY_MS);
  }

  async function drain(throwOnError=false){
    if(inFlight){
      await inFlight;
      if(desiredType&&throwOnError)return drain(true);
      return;
    }

    inFlight=(async()=>{
      if(!desiredType)return;
      if(!studioActive()){desiredType='';clearRetry();retryCount=0;return;}
      if(!ready()){
        if(throwOnError)throw new Error('Studio type could not save yet. Wait a moment and try Preview again.');
        scheduleRetry();
        return;
      }

      clearRetry();
      const supabase=client();
      const id=cardId();
      while(desiredType&&studioActive()){
        const next=desiredType;
        desiredType='';
        const {error}=await supabase.rpc('set_studio_business_type',{p_card_id:id,p_business_type:next});
        if(error){
          desiredType=desiredType||next;
          if(!throwOnError){
            console.warn('Studio business type save failed:',error);
            scheduleRetry();
            return;
          }
          throw error;
        }
        retryCount=0;
        document.documentElement.dataset.studioBusinessType=next;
        if(document.body)document.body.dataset.studioBusinessType=next;
      }
    })();

    try{
      await inFlight;
    }finally{
      inFlight=null;
    }

    if(desiredType){
      if(throwOnError)return drain(true);
      scheduleRetry();
    }
  }

  function queue(type){
    const next=String(type||'').trim().toLowerCase();
    if(!TYPES.has(next))return Promise.resolve();
    desiredType=next;
    return drain(false);
  }

  async function waitForReady(timeoutMs=1600){
    const started=Date.now();
    while(!ready()&&Date.now()-started<timeoutMs){
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    return ready();
  }

  async function flush(){
    const latest=selectedStudioType();
    if(latest)desiredType=latest;
    if(!desiredType)return;
    clearRetry();
    if(inFlight)await inFlight;
    const isReady=await waitForReady();
    if(!isReady)throw new Error('Studio type is still connecting. Wait a moment and try Preview again.');
    await drain(true);
    if(desiredType)await drain(true);
  }

  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('[data-studio-business-type]'):null;
    if(!button)return;
    const type=button.dataset.studioBusinessType;
    setTimeout(()=>{void queue(type);},0);
  },true);

  window.LIWStudioTypePersistence={queue,flush,get pending(){return desiredType;}};
})();
