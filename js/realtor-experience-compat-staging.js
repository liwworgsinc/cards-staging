/* LIW Cards staging — Realtor experience compatibility bridge.
   Realtor is a first-class card_experience like Classic/Flow/Showtime, while Studio
   uses the legacy barbershop color_mode marker. Keep those states mutually exclusive
   without weakening the existing hydration/concurrency guard. */
(function(){
  'use strict';
  if(window.__LIW_REALTOR_EXPERIENCE_COMPAT__)return;
  window.__LIW_REALTOR_EXPERIENCE_COMPAT__=true;

  const field=name=>document.querySelector(`[name="${name}"]`);
  const current=()=>String(field('card_experience')?.value||'').trim().toLowerCase();

  function reconcileRealtor(){
    if(current()!=='realtor')return false;
    const mode=field('color_mode');
    if(mode&&String(mode.value||'').trim().toLowerCase()==='barbershop'){
      // Intentional in-memory state repair only. Do not dispatch save-producing events;
      // the next explicit user save/autosave will persist the compatible state.
      mode.value='light';
    }
    document.documentElement.dataset.liwExplicitExperience='realtor';
    return true;
  }

  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('[data-card-experience="realtor"]'):null;
    if(!button)return;
    setTimeout(reconcileRealtor,0);
  },true);

  document.addEventListener('input',event=>{
    if(event.target===field('card_experience'))setTimeout(reconcileRealtor,0);
  },true);
  document.addEventListener('change',event=>{
    if(event.target===field('card_experience'))setTimeout(reconcileRealtor,0);
  },true);

  // Existing-card hydration assigns the saved experience directly instead of
  // dispatching input/change. Reconcile from the authoritative hydrated value.
  document.addEventListener('liw:editor-card-hydrated',event=>{
    const hydrated=String(event.detail?.cardExperience||current()||'').trim().toLowerCase();
    if(hydrated==='realtor'){
      document.documentElement.dataset.liwExplicitExperience='realtor';
      setTimeout(reconcileRealtor,0);
    }
  });

  const boot=()=>{
    reconcileRealtor();
    setTimeout(reconcileRealtor,350);
    setTimeout(reconcileRealtor,1200);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();