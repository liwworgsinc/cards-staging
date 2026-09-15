/* LIW Cards staging — editor state + data-integrity guard.
   1) Keeps card experience fields mutually consistent.
   2) Prevents an existing card from becoming saveable before its persisted state is
      completely hydrated and verified.
   3) Prevents stale local recovery drafts from silently replacing server state.
   4) Adds optimistic-concurrency metadata to every existing-card save. */
(function(){
  'use strict';
  if(window.__LIW_EXPERIENCE_STATE_GUARD__)return;
  window.__LIW_EXPERIENCE_STATE_GUARD__=true;

  const STANDARD=new Set(['classic','flow','music']);
  const STUDIO_MODE='barbershop';
  const field=name=>document.querySelector(`[name="${name}"]`);
  const value=name=>String(field(name)?.value||'').trim().toLowerCase();
  const existingCardId=new URLSearchParams(location.search).get('id');

  function emit(el,type){
    try{el?.dispatchEvent(new Event(type,{bubbles:true}));}catch(_){ }
  }

  function allowedButton(button){
    if(!button)return false;
    return !button.disabled&&!button.classList.contains('locked')&&button.getAttribute('aria-disabled')!=='true';
  }

  function log(stage,details={}){
    console.info(`[LIW Experience] ${stage}`,{
      cardId:existingCardId||null,
      experience:value('card_experience')||'classic',
      colorMode:value('color_mode')||'light',
      templateId:String(field('template_id')?.value||'').trim()||'custom',
      ...details
    });
  }

  /* --------------------------------------------------------------------------
     Existing-card hydration/data safety
     -------------------------------------------------------------------------- */
  const hydrationSafety={
    active:Boolean(existingCardId),
    safe:!existingCardId,
    failed:false,
    baseline:null,
    sessionId:(globalThis.crypto?.randomUUID?.()||`liw-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    overlay:null,
    nativeFetch:window.fetch.bind(window),
    setStatus:null
  };

  function createHydrationOverlay(){
    if(!existingCardId||document.querySelector('[data-liw-hydration-lock]'))return;
    const shell=document.querySelector('.editor-shell');
    if(shell)shell.inert=true;
    ['save-now-button','publish-button','panel-publish-button','preview-link','mobile-preview-button'].forEach(id=>{
      const button=document.getElementById(id);
      if(button&&!button.disabled){button.disabled=true;button.dataset.liwHydrationDisabled='true';}
    });

    const overlay=document.createElement('div');
    overlay.dataset.liwHydrationLock='true';
    overlay.setAttribute('role','status');
    overlay.setAttribute('aria-live','polite');
    overlay.style.cssText='position:fixed;inset:0;z-index:2147483000;background:rgba(248,250,252,.90);backdrop-filter:blur(7px);display:grid;place-items:center;padding:22px';
    overlay.innerHTML=`<div style="width:min(92vw,430px);background:#fff;border:1px solid #e5e7eb;border-radius:24px;padding:28px;box-shadow:0 30px 90px rgba(15,23,42,.18);text-align:center;font-family:inherit;color:#111827">
      <div style="width:56px;height:56px;border-radius:18px;margin:0 auto 15px;display:grid;place-items:center;background:#0b1438;color:#fff;font-weight:900;letter-spacing:.02em">LIW</div>
      <div data-liw-hydration-spinner style="width:32px;height:32px;margin:0 auto 16px;border:3px solid #e5e7eb;border-top-color:#0b1438;border-radius:50%;animation:liwHydrateSpin .8s linear infinite"></div>
      <h2 data-liw-hydration-title style="margin:0 0 7px;font-size:1.24rem">Loading your card…</h2>
      <p data-liw-hydration-copy style="margin:0;color:#6b7280;line-height:1.5">Restoring your saved design and content safely.</p>
    </div>`;
    const style=document.createElement('style');
    style.dataset.liwHydrationStyle='true';
    style.textContent='@keyframes liwHydrateSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    hydrationSafety.overlay=overlay;
    hydrationSafety.setStatus=(title,copy)=>{
      const titleEl=overlay.querySelector('[data-liw-hydration-title]');
      const copyEl=overlay.querySelector('[data-liw-hydration-copy]');
      if(titleEl)titleEl.textContent=title;
      if(copyEl)copyEl.textContent=copy||'';
    };
  }

  function unlockHydratedEditor(){
    if(!existingCardId||hydrationSafety.failed)return;
    hydrationSafety.safe=true;
    const shell=document.querySelector('.editor-shell');
    if(shell)shell.inert=false;
    document.querySelectorAll('[data-liw-hydration-disabled="true"]').forEach(button=>{
      button.disabled=false;
      delete button.dataset.liwHydrationDisabled;
    });
    hydrationSafety.overlay?.remove();
    hydrationSafety.overlay=null;
    log('existing card hydration verified',{revision:hydrationSafety.baseline?.revision,updatedAt:hydrationSafety.baseline?.updated_at});
  }

  function lockForFailure(title,copy){
    hydrationSafety.failed=true;
    hydrationSafety.safe=false;
    createHydrationOverlay();
    const overlay=hydrationSafety.overlay;
    if(!overlay)return;
    overlay.querySelector('[data-liw-hydration-spinner]')?.remove();
    const titleEl=overlay.querySelector('[data-liw-hydration-title]');
    const copyEl=overlay.querySelector('[data-liw-hydration-copy]');
    if(titleEl)titleEl.textContent=title;
    if(copyEl)copyEl.innerHTML=`${copy}<br><button type="button" data-liw-hydration-reload style="margin-top:16px;min-height:42px;padding:0 17px;border:0;border-radius:12px;background:#0b1438;color:#fff;font:inherit;font-weight:800;cursor:pointer">Reload latest version</button>`;
    overlay.querySelector('[data-liw-hydration-reload]')?.addEventListener('click',()=>location.reload());
  }

  function valuesMatchSavedCard(saved){
    if(!saved)return false;
    const critical=[
      'full_name','job_title','company_name','biography','phone','email','website','business_address','headline',
      'primary_color','secondary_color','background_color','text_color','button_color','button_text_color','font_family',
      'profile_image_shape','profile_position_x','profile_position_y','profile_zoom','border_radius','card_layout','gradient_background',
      'template_id','profile_image_url','status'
    ];
    const mismatches=[];
    critical.forEach(name=>{
      const persisted=saved[name];
      /* Null persisted values intentionally do not need to match HTML defaults. What we
         must prove is that established/non-null server content was actually applied. */
      if(persisted===null||persisted===undefined)return;
      const element=field(name);
      if(!element)return;
      const actual=element.type==='checkbox'?Boolean(element.checked):String(element.value??'');
      const expected=element.type==='checkbox'?Boolean(persisted):String(persisted);
      if(actual!==expected)mismatches.push({name,expected,actual});
    });
    if(mismatches.length)log('hydration verification mismatch',{mismatches:mismatches.slice(0,12)});
    return mismatches.length===0;
  }

  function editorInitFinished(){
    try{return typeof editorInitializationComplete!=='undefined'&&editorInitializationComplete===true;}catch(_){return false;}
  }

  function installSaveLocks(){
    if(!existingCardId)return;

    /* Existing-card local recovery must never auto-apply. A recovery copy can be
       surfaced later with an explicit user choice; silently applying it is unsafe in
       multi-browser sessions. */
    try{
      if(typeof restoreLocalDraftIfNewer==='function'){
        restoreLocalDraftIfNewer=function(){
          log('suppressed automatic local recovery restore',{reason:'existing-card-multi-session-safety'});
          return false;
        };
      }
    }catch(error){console.warn('LIW hydration guard could not wrap local recovery restore',error);}

    try{
      if(typeof scheduleSave==='function'){
        const original=scheduleSave;
        scheduleSave=function(...args){
          if(!hydrationSafety.safe){log('blocked autosave before hydration');return;}
          return original.apply(this,args);
        };
      }
      if(typeof requestImmediateAutosave==='function'){
        const original=requestImmediateAutosave;
        requestImmediateAutosave=function(...args){
          if(!hydrationSafety.safe){log('blocked immediate autosave before hydration');return;}
          return original.apply(this,args);
        };
      }
      if(typeof runAutosave==='function'){
        const original=runAutosave;
        runAutosave=function(...args){
          if(!hydrationSafety.safe){log('blocked autosave runner before hydration');return Promise.resolve(false);}
          return original.apply(this,args);
        };
      }
      if(typeof flushSave==='function'){
        const original=flushSave;
        flushSave=function(...args){
          if(!hydrationSafety.safe)return Promise.reject(new Error('LIW Cards is still restoring this saved card.'));
          return original.apply(this,args);
        };
      }
      if(typeof performSave==='function'){
        const original=performSave;
        performSave=function(...args){
          if(!hydrationSafety.safe)return Promise.reject(new Error('LIW Cards blocked a save before existing-card hydration completed.'));
          return original.apply(this,args);
        };
      }
    }catch(error){console.warn('LIW hydration guard could not wrap one or more save functions',error);}
  }

  async function loadBaseline(){
    if(!existingCardId)return null;
    createHydrationOverlay();
    hydrationSafety.setStatus?.('Loading your card…','Checking the latest saved version.');
    try{
      const client=window.supabaseClient;
      if(!client)throw new Error('Supabase client unavailable');
      const {data,error}=await client.from('digital_cards').select('*').eq('id',existingCardId).maybeSingle();
      if(error)throw error;
      if(!data)throw new Error('Card not found');
      hydrationSafety.baseline=data;
      hydrationSafety.setStatus?.('Restoring your design…','Loading your saved content and theme.');
      return data;
    }catch(error){
      console.error('LIW existing-card baseline load failed',error);
      lockForFailure('Your saved card could not be verified','LIW Cards did not enable editing, so no saved data was overwritten.');
      return null;
    }
  }

  function watchHydration(){
    if(!existingCardId)return;
    const started=Date.now();
    const timer=setInterval(()=>{
      if(hydrationSafety.failed){clearInterval(timer);return;}
      if(!hydrationSafety.baseline){
        if(Date.now()-started>12000){clearInterval(timer);lockForFailure('Your card is taking too long to restore','Editing stayed locked to protect the saved version.');}
        return;
      }
      if(!editorInitFinished()){
        hydrationSafety.setStatus?.('Loading your content…','Applying all saved card details before editing is enabled.');
        if(Date.now()-started>12000){clearInterval(timer);lockForFailure('Your card did not finish restoring','Editing stayed locked to protect the saved version.');}
        return;
      }
      if(!valuesMatchSavedCard(hydrationSafety.baseline)){
        clearInterval(timer);
        lockForFailure('Your card did not restore completely','Some saved fields did not hydrate into this browser. LIW Cards blocked editing instead of risking an overwrite.');
        return;
      }
      clearInterval(timer);
      hydrationSafety.setStatus?.('Almost ready…','Your saved card has been verified.');
      setTimeout(unlockHydratedEditor,120);
    },80);
  }

  function installSaveFetchGuard(){
    if(!existingCardId||typeof window.fetch!=='function')return;
    const nativeFetch=hydrationSafety.nativeFetch;
    window.fetch=async function(input,init){
      const url=typeof input==='string'?input:(input?.url||'');
      const isSave=/\/functions\/v1\/(save-card-state|save-designer-card-state)(?:\?|$)/.test(String(url));
      if(!isSave)return nativeFetch(input,init);
      if(!hydrationSafety.safe||!hydrationSafety.baseline){
        return new Response(JSON.stringify({error:'LIW Cards blocked a save before existing-card hydration completed.',code:'CARD_HYDRATION_INCOMPLETE'}),{status:409,headers:{'Content-Type':'application/json'}});
      }

      let rawBody=init?.body;
      if(rawBody==null&&input instanceof Request){try{rawBody=await input.clone().text();}catch(_){ }}
      let body=null;
      try{body=typeof rawBody==='string'?JSON.parse(rawBody):rawBody;}catch(_){ }
      if(!body||typeof body!=='object')return nativeFetch(input,init);
      if(String(body.cardId||'')!==String(existingCardId)){
        lockForFailure('This editor lost track of the card ID','The save was blocked before it could affect another card.');
        return new Response(JSON.stringify({error:'Card ID mismatch',code:'CARD_ID_MISMATCH'}),{status:409,headers:{'Content-Type':'application/json'}});
      }

      body.expectedRevision=Number(hydrationSafety.baseline.revision);
      body.editorSessionId=hydrationSafety.sessionId;
      const nextInit={...(init||{}),body:JSON.stringify(body)};
      const response=await nativeFetch(input,nextInit);
      let payload=null;
      try{payload=await response.clone().json();}catch(_){ }

      if(response.ok&&payload?.card){
        hydrationSafety.baseline=payload.card;
      }else if(response.status===409&&['CARD_CONFLICT','CARD_REVISION_REQUIRED','CARD_ID_MISMATCH'].includes(payload?.code)){
        lockForFailure('This card was updated in another session.','A newer saved version exists. This browser was locked before it could overwrite that version.');
      }else if(response.status===410||payload?.code==='CARD_MISSING'){
        lockForFailure('This card changed in another session','The card is no longer present at the saved ID. This browser cannot recreate it silently.');
      }
      return response;
    };
  }

  if(existingCardId){
    createHydrationOverlay();
    installSaveLocks();
    installSaveFetchGuard();
    loadBaseline();
    watchHydration();
  }

  /* --------------------------------------------------------------------------
     Experience-state guard
     -------------------------------------------------------------------------- */
  function clearStudioMarker(next,{events=false,reason='standard-experience-selected'}={}){
    const experience=String(next||'').trim().toLowerCase();
    if(!STANDARD.has(experience))return false;

    const experienceField=field('card_experience');
    const modeField=field('color_mode');
    if(!experienceField||!modeField)return false;

    const previousExperience=value('card_experience')||'classic';
    const previousMode=value('color_mode')||'light';
    let changed=false;

    if(previousExperience!==experience){
      experienceField.value=experience;
      changed=true;
      if(events){emit(experienceField,'input');emit(experienceField,'change');}
    }

    if(previousMode===STUDIO_MODE){
      modeField.value='light';
      changed=true;
      if(events){emit(modeField,'input');emit(modeField,'change');}
    }

    document.documentElement.dataset.liwExplicitExperience=experience;
    if(changed)log('reconciled standard experience',{reason,fromExperience:previousExperience,fromColorMode:previousMode,toExperience:experience,toColorMode:value('color_mode')});
    return changed;
  }

  function repairImpossibleStoredCombination(){
    const experience=value('card_experience');
    const mode=value('color_mode');
    /* Studio's editor contract is classic + barbershop. Flow/Showtime + barbershop
       can only be stale transition state, so repair it in memory on load.
       IMPORTANT: never autosave this load-time repair. */
    if(mode===STUDIO_MODE&&(experience==='flow'||experience==='music')){
      clearStudioMarker(experience,{events:true,reason:'stale-studio-marker-on-load'});
      return true;
    }
    return false;
  }

  function reconcileBeforePreview(){
    const explicit=String(document.documentElement.dataset.liwExplicitExperience||'').trim().toLowerCase();
    if(STANDARD.has(explicit)){
      clearStudioMarker(explicit,{events:true,reason:'preview-preflight'});
    }else{
      repairImpossibleStoredCombination();
    }
    return {
      experience:value('card_experience')||'classic',
      colorMode:value('color_mode')||'light'
    };
  }

  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('[data-card-experience]'):null;
    if(!button||!allowedButton(button))return;
    const next=String(button.dataset.cardExperience||'').trim().toLowerCase();
    if(!STANDARD.has(next))return;

    clearStudioMarker(next,{events:false,reason:'experience-click'});

    setTimeout(()=>{
      const currentExperience=value('card_experience');
      const currentMode=value('color_mode');
      if(currentExperience!==next||currentMode===STUDIO_MODE){
        clearStudioMarker(next,{events:true,reason:'post-click-race-repair'});
        try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
      }
    },0);
  },true);

  window.LIWExperienceStateGuard={
    reconcile:reconcileBeforePreview,
    repair:repairImpossibleStoredCombination,
    clearStudioMarker,
    hydrationSafety
  };

  const boot=()=>{
    setTimeout(repairImpossibleStoredCombination,0);
    setTimeout(repairImpossibleStoredCombination,350);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
