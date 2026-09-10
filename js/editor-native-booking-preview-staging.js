/* LIW Cards staging — native Appointments status + live editor booking CTA. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_NATIVE_BOOKING_PREVIEW__)return;
  window.__LIW_EDITOR_NATIVE_BOOKING_PREVIEW__=true;

  let active=false;
  let refreshInFlight=null;
  let observer=null;

  function cardId(){
    try{
      if(typeof currentId!=='undefined'&&currentId)return String(currentId);
    }catch(_){ }
    return new URLSearchParams(location.search).get('id')||'';
  }

  function client(){
    try{
      return window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);
    }catch(_){return window.supabaseClient||null;}
  }

  function planKey(){
    try{
      const preview=String(localStorage.getItem('liw_admin_plan_preview')||'').trim().toLowerCase();
      if(preview)return preview;
    }catch(_){ }
    try{
      return String(typeof currentPlan!=='undefined'&&currentPlan?currentPlan:'starter').trim().toLowerCase();
    }catch(_){return 'starter';}
  }

  function bookingLabel(){
    return ['starter','free'].includes(planKey())?'Request service':'Book appointment';
  }

  function removePreviewAction(){
    document.querySelector('[data-liw-native-booking-preview]')?.remove();
  }

  function ensurePreviewAction(){
    const area=document.getElementById('preview-business-actions');
    if(!area)return;
    if(!active){
      removePreviewAction();
      return;
    }

    const label=bookingLabel();
    let action=area.querySelector('[data-liw-native-booking-preview]');
    if(!action){
      action=document.createElement('button');
      action.type='button';
      action.className='preview-business-action primary';
      action.dataset.liwNativeBookingPreview='true';
      action.setAttribute('aria-label',`${label}. Open customer booking preview.`);
      action.style.width='100%';
      action.style.cursor='pointer';
      action.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const preview=document.getElementById('preview-link')||document.getElementById('mobile-preview-button');
        if(preview)preview.click();
      });
      area.prepend(action);
    }
    const current=action.querySelector('[data-liw-native-booking-label]')?.textContent||'';
    if(current!==label){
      action.innerHTML=`<i data-lucide="calendar-check-2" size="15"></i><span data-liw-native-booking-label>${label}</span><i data-lucide="arrow-up-right" size="14"></i>`;
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
    area.hidden=false;
  }

  function watchPreview(){
    const area=document.getElementById('preview-business-actions');
    if(!area||observer)return;
    observer=new MutationObserver(()=>{
      if(active&&!area.querySelector('[data-liw-native-booking-preview]'))requestAnimationFrame(ensurePreviewAction);
    });
    observer.observe(area,{childList:true,subtree:false});
  }

  async function refresh(){
    if(refreshInFlight)return refreshInFlight;
    refreshInFlight=(async()=>{
      const id=cardId();
      const sb=client();
      if(!id||!sb){
        active=false;
        removePreviewAction();
        return false;
      }
      try{
        const {data,error}=await sb.from('booking_settings').select('enabled').eq('card_id',id).maybeSingle();
        if(error)throw error;
        active=data?.enabled===true;
      }catch(error){
        console.warn('[LIW Appointments] editor preview status:',error);
        active=false;
      }
      window.__LIW_NATIVE_BOOKING_ACTIVE__=active;
      ensurePreviewAction();
      watchPreview();
      return active;
    })();
    try{return await refreshInFlight;}finally{refreshInFlight=null;}
  }

  async function boot(){
    for(let attempt=0;attempt<45;attempt+=1){
      if(cardId()&&client()&&document.getElementById('preview-business-actions'))break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    watchPreview();
    await refresh();
  }

  window.LIWNativeBookingPreview={refresh};
  window.addEventListener('pageshow',()=>setTimeout(refresh,60));
  window.addEventListener('focus',()=>setTimeout(refresh,60));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refresh,60);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
