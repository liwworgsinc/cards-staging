/* LIW Cards — cards-staging only: save-confidence UX + exact-preview cleanup.
   - Hides the legacy mock layer once the exact public-card iframe is ready.
   - Makes template selection autosave immediately.
   - Refreshes the exact preview only after the server confirms the save.
   - Shows a clear Save now reminder while changes are pending. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_SAVE_UX_STAGING__)return;
  window.__LIW_EDITOR_SAVE_UX_STAGING__=true;

  const ID='liw-save-reminder-staging';
  const STYLE_ID='liw-save-ux-staging-css';
  let templatePending=false;
  let reminderTimer=0;
  let hideTimer=0;
  let lastState='saved';
  let lastText='';

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Exact iframe owns the phone once ready. Keep the physical phone notch,
         but remove the old mock preview so its Share / QR controls cannot bleed through. */
      .phone-stage[data-liw-public-frame-ready="true"] #phone-preview > .preview-card-scroll{
        display:none!important;
      }
      .phone-stage[data-liw-public-frame-ready="true"] #phone-preview > .liw-public-card-frame{
        z-index:4!important;
      }
      .phone-stage[data-liw-public-frame-ready="true"] #phone-preview > .phone-notch{
        z-index:8!important;
      }

      #${ID}{
        position:fixed;
        right:20px;
        bottom:20px;
        z-index:2147481800;
        width:min(390px,calc(100vw - 28px));
        display:none;
        align-items:center;
        gap:12px;
        padding:12px;
        border:1px solid rgba(11,20,56,.14);
        border-radius:16px;
        background:rgba(255,255,255,.97);
        color:#0b1438;
        box-shadow:0 18px 46px rgba(11,20,56,.20);
        backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);
      }
      #${ID}.is-visible{display:flex}
      #${ID}[data-state="dirty"],#${ID}[data-state="saving"]{border-color:rgba(212,168,79,.48)}
      #${ID}[data-state="error"]{border-color:rgba(220,53,69,.38)}
      #${ID}[data-state="saved"]{border-color:rgba(18,138,104,.28)}
      #${ID} .liw-save-reminder-icon{
        width:38px;height:38px;flex:0 0 38px;border-radius:12px;
        display:grid;place-items:center;background:#f7f0df;color:#76591e;
      }
      #${ID}[data-state="saved"] .liw-save-reminder-icon{background:#e8f8f1;color:#087a5c}
      #${ID}[data-state="error"] .liw-save-reminder-icon{background:#fee9eb;color:#9f2330}
      #${ID} .liw-save-reminder-copy{min-width:0;display:grid;gap:2px;flex:1 1 auto}
      #${ID} .liw-save-reminder-copy strong{font-size:.84rem;line-height:1.2}
      #${ID} .liw-save-reminder-copy span{font-size:.72rem;line-height:1.35;color:#697089}
      #${ID} .liw-save-reminder-action{
        flex:0 0 auto;min-height:38px;padding:8px 12px;border:0;border-radius:11px;
        background:#0b1438;color:#fff;font:850 .74rem/1 'DM Sans',system-ui,sans-serif;
        cursor:pointer;white-space:nowrap;
      }
      #${ID}[data-state="saving"] .liw-save-reminder-action{opacity:.62}
      body.liw-public-preview-open #${ID}{display:none!important}
      @media(max-width:920px){
        #${ID}{
          left:12px;right:12px;width:auto;
          bottom:calc(112px + env(safe-area-inset-bottom,0px));
        }
      }
      @media(max-width:520px){
        #${ID}{gap:9px;padding:10px}
        #${ID} .liw-save-reminder-icon{width:34px;height:34px;flex-basis:34px}
        #${ID} .liw-save-reminder-copy strong{font-size:.78rem}
        #${ID} .liw-save-reminder-copy span{font-size:.67rem}
        #${ID} .liw-save-reminder-action{padding:8px 10px;font-size:.69rem}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureReminder(){
    injectStyles();
    let reminder=document.getElementById(ID);
    if(reminder)return reminder;
    reminder=document.createElement('div');
    reminder.id=ID;
    reminder.setAttribute('role','status');
    reminder.setAttribute('aria-live','polite');
    reminder.innerHTML=`
      <div class="liw-save-reminder-icon" aria-hidden="true">●</div>
      <div class="liw-save-reminder-copy"><strong>Unsaved changes</strong><span>Save to update your public preview.</span></div>
      <button class="liw-save-reminder-action" type="button">Save now</button>`;
    reminder.querySelector('.liw-save-reminder-action')?.addEventListener('click',()=>{
      const button=document.getElementById('save-now-button');
      if(button&&!button.disabled)button.click();
      else if(typeof window.requestImmediateAutosave==='function')window.requestImmediateAutosave();
    });
    document.body.appendChild(reminder);
    return reminder;
  }

  function setReminder(state,title,detail,{autoHide=0}={}){
    clearTimeout(hideTimer);
    const reminder=ensureReminder();
    reminder.dataset.state=state;
    reminder.querySelector('.liw-save-reminder-copy strong').textContent=title;
    reminder.querySelector('.liw-save-reminder-copy span').textContent=detail;
    const action=reminder.querySelector('.liw-save-reminder-action');
    action.hidden=state==='saved';
    action.disabled=state==='saving';
    action.textContent=state==='error'?'Retry save':'Save now';
    reminder.querySelector('.liw-save-reminder-icon').textContent=state==='saved'?'✓':state==='error'?'!':'●';
    reminder.classList.add('is-visible');
    if(autoHide>0){
      hideTimer=setTimeout(()=>reminder.classList.remove('is-visible'),autoHide);
    }
  }

  function hideReminder(){
    clearTimeout(reminderTimer);
    clearTimeout(hideTimer);
    document.getElementById(ID)?.classList.remove('is-visible');
  }

  function saveStateSnapshot(){
    const state=document.getElementById('save-state');
    if(!state)return {mode:'',text:''};
    const mode=state.classList.contains('error')?'error':state.classList.contains('saving')?'saving':'saved';
    return {mode,text:String(state.textContent||'').replace(/\s+/g,' ').trim()};
  }

  function refreshExactPreviewAfterSave(){
    setTimeout(()=>{
      try{window.LIWPublicCardFrameStaging?.refresh?.();}catch(_){ }
    },180);
  }

  function syncFromSaveState(){
    const {mode,text}=saveStateSnapshot();
    if(!mode)return;
    const changed=mode!==lastState||text!==lastText;
    lastState=mode;
    lastText=text;

    clearTimeout(reminderTimer);
    if(mode==='error'){
      setReminder('error','Changes are not saved','Tap Retry save so your latest work is protected.');
      return;
    }
    if(mode==='saving'){
      const unsaved=/unsaved changes/i.test(text);
      const offline=/offline/i.test(text);
      const title=templatePending?'Template selected — saving…':offline?'Offline — changes waiting':'Saving your changes…';
      const detail=templatePending?'Your public preview will update as soon as the server confirms the save.':'You can tap Save now if you want to sync immediately.';
      if(templatePending||unsaved){
        setReminder('dirty',title,detail);
      }else{
        reminderTimer=setTimeout(()=>setReminder('saving',title,detail),220);
      }
      return;
    }
    if(mode==='saved'){
      if(changed&&(templatePending||document.getElementById(ID)?.classList.contains('is-visible'))){
        templatePending=false;
        refreshExactPreviewAfterSave();
        setReminder('saved','Saved','Your public preview is now up to date.',{autoHide:1500});
      }else if(!templatePending){
        hideReminder();
      }
    }
  }

  function onTemplateSelected(button){
    if(!button||button.classList.contains('locked')||button.disabled)return;
    templatePending=true;
    setReminder('dirty','Template selected','Saving now so the exact public preview can update.');
    /* editor.js already calls scheduleSave(); this shortens the 500ms debounce
       for a deliberate template change without changing normal typing behavior. */
    setTimeout(()=>{
      try{window.requestImmediateAutosave?.();}catch(_){ }
    },60);
  }

  function boot(){
    injectStyles();
    ensureReminder();
    const saveState=document.getElementById('save-state');
    if(saveState){
      new MutationObserver(syncFromSaveState).observe(saveState,{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
      syncFromSaveState();
    }
    document.addEventListener('click',event=>{
      const template=event.target instanceof Element?event.target.closest('.template-card'):null;
      if(template)onTemplateSelected(template);
      if(event.target instanceof Element&&event.target.closest('#save-now-button')){
        setReminder('saving','Saving your changes…','Your public preview will refresh after the server confirms the save.');
      }
    },false);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
