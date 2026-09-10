/* LIW Cards staging — native Appointments status + live editor booking CTA. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_NATIVE_BOOKING_PREVIEW__)return;
  window.__LIW_EDITOR_NATIVE_BOOKING_PREVIEW__=true;

  let active=false;
  let bookingMode='booking';
  let refreshInFlight=null;
  let observer=null;

  function cardId(){
    try{
      if(typeof currentId!=='undefined'&&currentId)return String(currentId);
    }catch(_){ }
    return new URLSearchParams(location.search).get('id')||'';
  }

  function cardSlug(){
    const input=document.querySelector('[name="slug"]');
    return String(input?.value||'').trim();
  }

  function client(){
    try{
      return window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);
    }catch(_){return window.supabaseClient||null;}
  }

  function bookingLabel(){
    return bookingMode==='request'?'Request service':'Book appointment';
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
    action.setAttribute('aria-label',`${label}. Open customer booking preview.`);
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

  async function lookupNativeBooking(sb){
    const slug=cardSlug();
    if(slug){
      try{
        const {data,error}=await sb.rpc('booking_public_bootstrap',{p_slug:slug});
        if(error)throw error;
        if(data?.ok){
          return {enabled:data.enabled===true,mode:String(data.mode||'booking')};
        }
      }catch(error){
        console.warn('[LIW Appointments] public bootstrap preview status:',error);
      }
    }

    const id=cardId();
    if(!id)return {enabled:false,mode:'booking'};
    try{
      const {data,error}=await sb.from('booking_settings').select('enabled').eq('card_id',id).maybeSingle();
      if(error)throw error;
      return {enabled:data?.enabled===true,mode:'booking'};
    }catch(error){
      console.warn('[LIW Appointments] owner booking status fallback:',error);
      return {enabled:false,mode:'booking'};
    }
  }

  async function refresh(){
    if(refreshInFlight)return refreshInFlight;
    refreshInFlight=(async()=>{
      const sb=client();
      if(!cardId()||!sb){
        active=false;
        removePreviewAction();
        return false;
      }
      const state=await lookupNativeBooking(sb);
      active=state.enabled===true;
      bookingMode=state.mode==='request'?'request':'booking';
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
    const retry=setInterval(()=>{
      refresh().catch(()=>{});
      if(active)clearInterval(retry);
    },800);
    setTimeout(()=>clearInterval(retry),8000);
  }

  window.LIWNativeBookingPreview={refresh};
  window.addEventListener('pageshow',()=>setTimeout(refresh,60));
  window.addEventListener('focus',()=>setTimeout(refresh,60));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(refresh,60);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
