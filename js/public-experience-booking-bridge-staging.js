/* LIW Cards staging — native booking bridge for custom public experiences.
   Keeps one booking engine while custom shells own presentation. */
(function(){
  'use strict';
  if(window.__LIW_EXPERIENCE_BOOKING_BRIDGE__)return;
  window.__LIW_EXPERIENCE_BOOKING_BRIDGE__=true;
  if(new URLSearchParams(location.search).get('embed')==='1')return;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  let route=null;
  let scheduled=false;
  let observer=null;
  const q=(selector,root=document)=>root.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function client(){
    try{return window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.supabaseClient||null;}
  }
  function cardData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:{};}catch(_){return {};}
  }
  function slug(){
    return String(new URLSearchParams(location.search).get('slug')||cardData().slug||'').trim();
  }
  function safeUrl(value){
    try{const url=new URL(String(value||'').trim());return ['http:','https:'].includes(url.protocol)?url.href:'';}catch(_){return '';}
  }
  function nativeSection(){return q('#booking-v1-section');}
  function nativeLabel(){
    const heading=String(nativeSection()?.querySelector('.public-section-heading h2')?.textContent||'').trim().toLowerCase();
    return heading.includes('request service')?'Request service':'Book appointment';
  }
  function isNativeReady(){return route?.mode==='liw'&&route?.native_enabled===true&&Boolean(nativeSection());}
  function injectStyle(){
    if(q('#liw-experience-booking-bridge-style'))return;
    const style=document.createElement('style');
    style.id='liw-experience-booking-bridge-style';
    style.textContent=`
      .realtor-native-booking-cta{width:100%;min-height:48px;border:0;border-radius:var(--rradius,12px);background:var(--rbutton,var(--rdark,#111));color:var(--rbuttontext,#fff);display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 14px;font:inherit;font-size:.78rem;font-weight:900;text-decoration:none;cursor:pointer}
      .realtor-native-booking-host{display:block;margin-top:2px}
      .realtor-native-booking-host #booking-v1-section{margin:0!important}
      .restaurant-native-booking-host{display:block;margin-top:4px}
      .restaurant-native-booking-host #booking-v1-section{margin:0!important}
      .restaurant-public-action[data-rest-reserve][data-liw-native-booking="true"]{cursor:pointer}
    `;
    document.head.appendChild(style);
  }
  function focusNative(){
    const section=nativeSection();
    if(!section||section.hidden)return;
    section.scrollIntoView({behavior:'smooth',block:'start'});
    const first=section.querySelector('[data-booking-service],input,select,button,textarea');
    try{first?.focus({preventScroll:true});}catch(_){ }
    try{if(typeof window.track==='function')window.track('native_booking_click',null,{source:'experience_bridge'});}catch(_){ }
  }
  function mountSection(host){
    const section=nativeSection();
    if(!host||!section)return false;
    if(section.parentNode!==host)host.appendChild(section);
    section.hidden=false;
    return true;
  }

  function ensureRealtor(){
    const shell=q('#realtor-public-shell');
    if(!shell)return false;
    const actions=q('.realtor-public-actions',shell);
    if(!actions)return false;
    let cta=q('[data-realtor-native-booking]',shell);
    const external=route?.mode==='external'?safeUrl(route.external_url):'';
    const shouldShow=Boolean(external||isNativeReady());
    if(!shouldShow){cta?.remove();return true;}

    if(!cta){
      cta=document.createElement(external?'a':'button');
      cta.className='realtor-native-booking-cta';
      cta.dataset.realtorNativeBooking='true';
      actions.insertAdjacentElement('afterend',cta);
    }

    const label=external?'Book appointment':nativeLabel();
    cta.innerHTML=`<i data-lucide="calendar-check-2" size="17"></i><span>${esc(label)}</span>`;
    if(external){
      if(cta.tagName==='A'){
        cta.href=external;cta.target='_blank';cta.rel='noopener';
      }else{
        cta.onclick=()=>window.open(external,'_blank','noopener');
      }
    }else{
      if(cta.tagName==='A'){cta.removeAttribute('href');cta.removeAttribute('target');}
      cta.onclick=event=>{event.preventDefault();focusNative();};
      let host=q('[data-realtor-booking-host]',shell);
      if(!host){
        host=document.createElement('div');
        host.className='realtor-native-booking-host';
        host.dataset.realtorBookingHost='true';
        const nav=q('.realtor-public-nav',shell);
        (nav||actions).insertAdjacentElement('afterend',host);
      }
      mountSection(host);
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function ensureRestaurant(){
    const shell=q('#restaurant-public-shell');
    if(!shell)return false;
    const action=q('[data-rest-reserve]',shell);
    if(!action)return false;
    const external=route?.mode==='external'?safeUrl(route.external_url):'';
    const native=isNativeReady();

    if(external){
      action.disabled=false;
      action.dataset.liwNativeBooking='false';
      if(action.tagName==='A'){
        action.href=external;action.target='_blank';action.rel='noopener';
      }else{
        action.onclick=()=>window.open(external,'_blank','noopener');
      }
      return true;
    }

    if(!native){
      if(action.tagName==='BUTTON')action.disabled=true;
      return true;
    }

    action.disabled=false;
    action.dataset.liwNativeBooking='true';
    if(action.tagName==='A'){
      action.href='#booking-v1-section';
      action.removeAttribute('target');
      action.removeAttribute('rel');
    }
    action.onclick=event=>{event.preventDefault();focusNative();};
    const text=q('span',action);if(text)text.textContent='Reserve';

    let host=q('[data-restaurant-booking-host]',shell);
    if(!host){
      host=document.createElement('div');
      host.className='restaurant-native-booking-host';
      host.dataset.restaurantBookingHost='true';
      const cta=q('.restaurant-public-cta',shell);
      const footer=q('.restaurant-footer',shell);
      if(cta)cta.insertAdjacentElement('beforebegin',host);
      else if(footer)footer.insertAdjacentElement('beforebegin',host);
      else q('.restaurant-public-body',shell)?.appendChild(host);
    }
    mountSection(host);
    return true;
  }

  function apply(){
    scheduled=false;
    if(!route)return;
    injectStyle();
    ensureRealtor();
    ensureRestaurant();
  }
  function scheduleApply(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(apply);
  }

  async function loadRoute(attempt=0){
    const s=slug();
    const c=client();
    if((!s||!c)&&attempt<60){setTimeout(()=>loadRoute(attempt+1),100);return;}
    if(!s||!c)return;
    try{
      const {data,error}=await c.rpc('booking_public_route_staging',{p_slug:s});
      if(error)throw error;
      if(data?.ok){
        route={
          mode:data.mode==='external'?'external':'liw',
          external_url:String(data.external_url||''),
          native_enabled:data.native_enabled===true
        };
      }
    }catch(error){
      console.warn('[LIW booking experience bridge]',error);
      route=null;
    }
    apply();
  }

  function boot(){
    injectStyle();
    loadRoute();
    observer=new MutationObserver(scheduleApply);
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('liw:card-loader-ready',scheduleApply,{passive:true});
    window.addEventListener('load',scheduleApply,{once:true,passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();