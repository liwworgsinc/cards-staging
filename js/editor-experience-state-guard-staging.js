/* LIW Cards staging — global card-experience state guard.
   Keeps the authoritative hidden experience fields mutually consistent when a user
   moves between Studio and Classic / Flow / Showtime. This is intentionally global:
   no standard experience is allowed to inherit Studio's barbershop mode marker. */
(function(){
  'use strict';
  if(window.__LIW_EXPERIENCE_STATE_GUARD__)return;
  window.__LIW_EXPERIENCE_STATE_GUARD__=true;

  const STANDARD=new Set(['classic','flow','music']);
  const STUDIO_MODE='barbershop';
  const field=name=>document.querySelector(`[name="${name}"]`);
  const value=name=>String(field(name)?.value||'').trim().toLowerCase();

  function emit(el,type){
    try{el?.dispatchEvent(new Event(type,{bubbles:true}));}catch(_){ }
  }

  function allowedButton(button){
    if(!button)return false;
    return !button.disabled&&!button.classList.contains('locked')&&button.getAttribute('aria-disabled')!=='true';
  }

  function log(stage,details={}){
    console.info(`[LIW Experience] ${stage}`,{
      experience:value('card_experience')||'classic',
      colorMode:value('color_mode')||'light',
      templateId:String(field('template_id')?.value||'').trim()||'custom',
      ...details
    });
  }

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
       can only be stale transition state, so repair it immediately on load. */
    if(mode===STUDIO_MODE&&(experience==='flow'||experience==='music')){
      clearStudioMarker(experience,{events:true,reason:'stale-studio-marker-on-load'});
      try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
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

    /* Capture phase runs before theme-specific bubble handlers. Clearing Studio here
       makes the user's explicit experience choice authoritative regardless of module
       registration order. */
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
    clearStudioMarker
  };

  const boot=()=>{
    setTimeout(repairImpossibleStoredCombination,0);
    setTimeout(repairImpossibleStoredCombination,350);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
