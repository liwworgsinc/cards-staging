/* LIW Cards staging — recover from the guard's 12s false timeout when the editor is still legitimately finishing startup. */
(function(){
  if(window.__LIW_HYDRATION_COMPLETION_BRIDGE__)return;
  window.__LIW_HYDRATION_COMPLETION_BRIDGE__=true;

  const existingCardId=new URLSearchParams(location.search).get('id');
  if(!existingCardId)return;

  const started=Date.now();
  const HARD_TIMEOUT_MS=45000;
  let settled=false;

  const field=name=>document.querySelector(`[name="${name}"]`);
  const hydration=()=>window.LIWExperienceStateGuard?.hydrationSafety||null;

  function editorInitFinished(){
    try{return typeof editorInitializationComplete!=='undefined'&&editorInitializationComplete===true;}catch(_){return false;}
  }

  function valuesMatchSavedCard(saved){
    if(!saved)return false;
    const critical=[
      'full_name','job_title','company_name','biography','phone','email','website','business_address','headline',
      'primary_color','secondary_color','background_color','text_color','button_color','button_text_color','font_family',
      'profile_image_shape','profile_position_x','profile_position_y','profile_zoom','border_radius','card_layout','gradient_background',
      'template_id','profile_image_url','status'
    ];
    for(const name of critical){
      const persisted=saved[name];
      if(persisted===null||persisted===undefined)continue;
      const element=field(name);
      if(!element)continue;
      let expected=element.type==='checkbox'?Boolean(persisted):String(persisted);
      let actual=element.type==='checkbox'?Boolean(element.checked):String(element.value??'');
      if(name==='full_name'&&expected.trim().toLowerCase()==='untitled card'&&actual==='')continue;
      if(actual!==expected)return false;
    }
    return true;
  }

  function restoreLoadingVisual(state){
    const overlay=state?.overlay||document.querySelector('[data-liw-hydration-lock]');
    if(!overlay)return;
    let spinner=overlay.querySelector('[data-liw-hydration-spinner]');
    if(!spinner){
      spinner=document.createElement('div');
      spinner.dataset.liwHydrationSpinner='true';
      spinner.style.cssText='width:32px;height:32px;margin:0 auto 16px;border:3px solid #e5e7eb;border-top-color:#0b1438;border-radius:50%;animation:liwHydrateSpin .8s linear infinite';
      const title=overlay.querySelector('[data-liw-hydration-title]');
      title?.parentNode?.insertBefore(spinner,title);
    }
    const title=overlay.querySelector('[data-liw-hydration-title]');
    const copy=overlay.querySelector('[data-liw-hydration-copy]');
    if(title)title.textContent='Loading your content…';
    if(copy)copy.textContent='Your saved card is still restoring. Editing remains locked until the saved version is verified.';
  }

  function unlock(state){
    state.failed=false;
    state.safe=true;
    const shell=document.querySelector('.editor-shell');
    if(shell)shell.inert=false;
    document.querySelectorAll('[data-liw-hydration-disabled="true"]').forEach(button=>{
      button.disabled=false;
      delete button.dataset.liwHydrationDisabled;
    });
    state.overlay?.remove();
    state.overlay=null;
    console.info('[LIW Hydration] slow startup completed safely',{cardId:existingCardId,elapsedMs:Date.now()-started});
  }

  function finalFailure(state){
    state.failed=true;
    state.safe=false;
    const overlay=state.overlay||document.querySelector('[data-liw-hydration-lock]');
    if(!overlay)return;
    overlay.querySelector('[data-liw-hydration-spinner]')?.remove();
    const title=overlay.querySelector('[data-liw-hydration-title]');
    const copy=overlay.querySelector('[data-liw-hydration-copy]');
    if(title)title.textContent='Your card could not finish loading';
    if(copy)copy.innerHTML='Editing stayed locked to protect the saved version.<br><button type="button" data-liw-hydration-reload style="margin-top:16px;min-height:42px;padding:0 17px;border:0;border-radius:12px;background:#0b1438;color:#fff;font:inherit;font-weight:800;cursor:pointer">Reload latest version</button>';
    overlay.querySelector('[data-liw-hydration-reload]')?.addEventListener('click',()=>location.reload());
  }

  const timer=setInterval(()=>{
    if(settled){clearInterval(timer);return;}
    const state=hydration();
    if(!state)return;

    if(state.safe&&!state.failed){
      settled=true;
      clearInterval(timer);
      return;
    }

    if(state.failed&&state.baseline&&!editorInitFinished()&&Date.now()-started<HARD_TIMEOUT_MS){
      state.failed=false;
      state.safe=false;
      restoreLoadingVisual(state);
    }

    if(state.baseline&&editorInitFinished()){
      if(valuesMatchSavedCard(state.baseline)){
        unlock(state);
        settled=true;
        clearInterval(timer);
        return;
      }
    }

    if(Date.now()-started>=HARD_TIMEOUT_MS){
      finalFailure(state);
      settled=true;
      clearInterval(timer);
    }
  },100);
})();