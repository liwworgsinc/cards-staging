/* LIW Cards staging — keep native booking isolated to a dedicated Super Studio panel. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_BOOKING_HOTFIX__)return;
  window.__LIW_SUPER_STUDIO_BOOKING_HOTFIX__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/card\.html$/i.test(location.pathname)))return;

  const q=(s,r=document)=>r.querySelector(s);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function ensureStyle(){
    if(q('link[data-liw-ss-booking-hotfix]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/super-studio-booking-hotfix-staging.css?v=20261012-readability-1';
    link.dataset.liwSsBookingHotfix='true';
    document.head.appendChild(link);
  }

  function dialog(){
    let modal=q('#ss-booking-modal');
    if(modal)return modal;
    modal=document.createElement('dialog');
    modal.id='ss-booking-modal';
    modal.className='ss-booking-modal';
    modal.innerHTML=`<div class="ss-booking-modal-shell"><header class="ss-booking-modal-head"><div><span>Super Studio</span><h2>Book Appointment</h2></div><button type="button" aria-label="Close booking" data-ss-booking-close><i data-lucide="x"></i></button></header><div class="ss-booking-modal-body" data-ss-booking-host></div></div>`;
    document.body.appendChild(modal);
    q('[data-ss-booking-close]',modal)?.addEventListener('click',()=>modal.close());
    modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
    modal.addEventListener('close',()=>document.body.classList.remove('ss-booking-open'));
    return modal;
  }

  function selectService(native,name){
    if(!name)return;
    const select=native?.querySelector('select');
    if(!select)return;
    const option=Array.from(select.options||[]).find(opt=>String(opt.textContent||'').trim().toLowerCase()===String(name).trim().toLowerCase());
    if(option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  function openNativeBooking(button){
    const native=q('#booking-v1-section');
    if(!native||native.hidden||!native.textContent.trim())return false;
    const modal=dialog();
    const host=q('[data-ss-booking-host]',modal);
    if(native.parentElement!==host)host.appendChild(native);
    native.classList.add('ss-native-booking','ss-native-booking-modalized');
    native.hidden=false;
    selectService(native,button?.dataset?.serviceName||'');
    document.body.classList.add('ss-booking-open');
    if(!modal.open)modal.showModal();
    setTimeout(()=>native.querySelector('button,input,select,textarea')?.focus(),80);
    if(window.lucide)try{lucide.createIcons({nodes:[modal]});}catch(_){}
    return true;
  }

  function externalFallback(){
    const external=q('#business-actions [data-business-event="booking_click"],#business-actions [data-event="booking_click"]');
    if(external?.href){window.open(external.href,'_blank','noopener');return true;}
    try{
      const card=typeof publicCard!=='undefined'?publicCard:window.publicCard;
      if(card?.booking_url){window.open(card.booking_url,'_blank','noopener');return true;}
    }catch(_){}
    return false;
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.super-studio-experience [data-ss-action="book"],.super-studio-experience [data-ss-app-book]');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    if(openNativeBooking(button))return;
    externalFallback();
  },true);

  ensureStyle();
})();
