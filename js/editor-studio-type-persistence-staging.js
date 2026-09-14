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
  const RPC_TIMEOUT_MS=5000;
  let desiredType='';
  let inFlight=null;
  let retryTimer=0;
  let retryCount=0;

  const studioActive=()=>{
    const mode=String(document.querySelector('[name="color_mode"]')?.value||'').trim().toLowerCase();
    const experience=String(document.querySelector('[name="card_experience"]')?.value||'classic').trim().toLowerCase();
    /* Studio's editor contract is explicit: barbershop mode + classic/barbershop
       experience. A stale barbershop color mode must never capture Flow or Showtime. */
    return mode==='barbershop'&&(experience==='classic'||experience==='barbershop');
  };

  const selectedStudioType=()=>{
    if(!studioActive())return '';
    const active=document.querySelector('[data-studio-business-type].is-active,[data-studio-business-type][aria-pressed="true"]');
    const apiType=String(window.LIWStudio?.businessType||'').trim().toLowerCase();
    const domType=String(active?.dataset?.studioBusinessType||'').trim().toLowerCase();
    return TYPES.has(apiType)?apiType:TYPES.has(domType)?domType:'';
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

  function clearPending(){
    desiredType='';
    clearRetry();
    retryCount=0;
  }

  function withTimeout(promise,timeoutMs,message){
    let timer=0;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(new Error(message)),timeoutMs);
      })
    ]).finally(()=>clearTimeout(timer));
  }

  function scheduleRetry(){
    if(!desiredType||retryTimer||retryCount>=MAX_RETRIES||!studioActive())return;
    retryCount+=1;
    retryTimer=setTimeout(()=>{
      retryTimer=0;
      void drain(false);
    },RETRY_MS);
  }

  async function drain(throwOnError=false){
    if(!studioActive()){
      clearPending();
      return;
    }

    if(inFlight){
      await inFlight;
      if(desiredType&&throwOnError)return drain(true);
      return;
    }

    inFlight=(async()=>{
      if(!desiredType)return;
      if(!studioActive()){clearPending();return;}
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
        let result;
        try{
          result=await withTimeout(
            supabase.rpc('set_studio_business_type',{p_card_id:id,p_business_type:next}),
            RPC_TIMEOUT_MS,
            'Studio type save timed out.'
          );
        }catch(error){
          desiredType=desiredType||next;
          if(!throwOnError){
            console.warn('Studio business type save failed:',error);
            scheduleRetry();
            return;
          }
          throw error;
        }
        const {error}=result||{};
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
      if(!studioActive()){clearPending();return;}
      if(throwOnError)return drain(true);
      scheduleRetry();
    }
  }

  function queue(type){
    if(!studioActive()){
      clearPending();
      return Promise.resolve();
    }
    const next=String(type||'').trim().toLowerCase();
    if(!TYPES.has(next))return Promise.resolve();
    desiredType=next;
    return drain(false);
  }

  async function waitForReady(timeoutMs=1600){
    const started=Date.now();
    while(studioActive()&&!ready()&&Date.now()-started<timeoutMs){
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    return ready();
  }

  async function flush(){
    /* Critical isolation rule: Studio persistence must never participate in
       Flow, Classic, Showtime, or any future non-Studio preview. */
    if(!studioActive()){
      clearPending();
      return {skipped:true,reason:'studio-inactive'};
    }

    const latest=selectedStudioType();
    if(latest)desiredType=latest;
    if(!desiredType)return {skipped:true,reason:'no-studio-type'};
    clearRetry();
    if(inFlight)await withTimeout(inFlight,RPC_TIMEOUT_MS+500,'Studio type save timed out.');
    if(!studioActive()){
      clearPending();
      return {skipped:true,reason:'studio-became-inactive'};
    }
    const isReady=await waitForReady();
    if(!isReady)throw new Error('Studio type is still connecting. Wait a moment and try Preview again.');
    await drain(true);
    if(desiredType)await drain(true);
    return {saved:true,type:latest||document.documentElement.dataset.studioBusinessType||''};
  }

  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('[data-studio-business-type]'):null;
    if(!button||!studioActive())return;
    const type=button.dataset.studioBusinessType;
    setTimeout(()=>{void queue(type);},0);
  },true);

  window.LIWStudioTypePersistence={queue,flush,get pending(){return desiredType;},get active(){return studioActive();}};
})();
