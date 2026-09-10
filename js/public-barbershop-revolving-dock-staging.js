/* LIW Cards staging — premium Barbershop revolving dock V7.
   Lightweight and button-first: no MutationObserver, no global pointer handlers,
   no pointer capture, no pointermove rendering, and no global icon remount. */
(function(){
  'use strict';
  if(window.__LIW_BARBERSHOP_REVOLVING_DOCK_STAGING__)return;
  window.__LIW_BARBERSHOP_REVOLVING_DOCK_STAGING__=true;

  const MODE='barbershop';
  const ACTIONS=[
    {key:'home',label:'Welcome',icon:'home',kind:'room'},
    {key:'book',label:'Book',icon:'book',kind:'direct'},
    {key:'call',label:'Call',icon:'call',kind:'direct'},
    {key:'text',label:'Text',icon:'text',kind:'direct'},
    {key:'cuts',label:'Cuts',icon:'cuts',kind:'room'},
    {key:'gallery',label:'Gallery',icon:'gallery',kind:'room'},
    {key:'map',label:'Map',icon:'map',kind:'room'},
    {key:'reviews',label:'Reviews',icon:'reviews',kind:'room'},
    {key:'social',label:'Social',icon:'social',kind:'room'},
    {key:'shop',label:'Shop',icon:'shop',kind:'room'},
    {key:'inquiry',label:'Inquiry',icon:'inquiry',kind:'room'},
    {key:'save',label:'Save',icon:'save',kind:'direct'}
  ];

  const ICONS={
    home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/>',
    book:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 15l2 2 5-5"/>',
    call:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1A19.5 19.5 0 0 1 5.2 13a19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c1 .4 1.9.6 3 .7a2 2 0 0 1 1.5 1.9z"/>',
    text:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/>',
    cuts:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.7 7.4 10.8 6.2M8.7 16.6 19.5 10.4"/>',
    gallery:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-4.5-4.5L8 19"/>',
    map:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
    reviews:'<path d="M21 15a4 4 0 0 1-4 4H9l-5 3v-5a7 7 0 1 1 17-2z"/><path d="M12 15s-3-1.8-3-4a1.8 1.8 0 0 1 3-1.3A1.8 1.8 0 0 1 15 11c0 2.2-3 4-3 4z"/>',
    social:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
    shop:'<path d="M6 8V6a6 6 0 0 1 12 0v2"/><path d="M4 8h16l-1 13H5z"/>',
    inquiry:'<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    save:'<circle cx="9" cy="8" r="4"/><path d="M2.5 21a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>'
  };

  let activeKey='home';
  let card=null;
  let dock=null;
  let gesture=null;
  let suppressClickUntil=0;
  let mounted=false;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const cardData=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const safe=(value,max=500)=>String(value??'').trim().slice(0,max);

  function icon(name){
    return `<svg class="barber-dock-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.home}</svg>`;
  }

  function isBarber(data){
    return String(data?.color_mode||'').trim().toLowerCase()===MODE&&
      String(data?.card_experience||'classic').trim().toLowerCase()!=='music';
  }

  function telHref(value){
    const clean=safe(value,80).replace(/[^0-9+*#,;]/g,'');
    return clean?`tel:${clean}`:'';
  }

  function smsHref(value){
    const clean=safe(value,80).replace(/[^0-9+*#,;]/g,'');
    return clean?`sms:${clean}`:'';
  }

  function nativeBookingReady(){
    const data=cardData()||{};
    const access=globalThis.publicCardFeatureAccess||{};
    return Boolean(q('#booking-v1-section')||q('[data-liw-native-booking-action]')||(data.booking_enabled===true&&access.appointment_booking===true));
  }

  function roomReady(key){
    if(key==='home')return true;
    if(window.LIWBarberClientRoom?.sourceConfigured){
      try{return window.LIWBarberClientRoom.sourceConfigured(key);}catch(_){ }
    }
    if(key==='cuts')return Boolean(q('#services-section #services > *'));
    if(key==='gallery')return Boolean(q('[data-public-rich="gallery"]'));
    if(key==='map')return Boolean(q('[data-public-rich="location"]')||safe(cardData()?.business_address,260));
    if(key==='reviews')return Boolean(q('[data-public-rich="testimonials"]'));
    if(key==='social')return Boolean(q('#social-section #socials a,#social-section #socials button'));
    if(key==='shop')return Boolean(q('#products-section #products > *'));
    if(key==='inquiry')return Boolean(q('#lead-section #lead-form'));
    return false;
  }

  function availableActions(){
    const data=cardData()||{};
    return ACTIONS.filter(action=>{
      if(action.key==='home'||action.key==='save')return true;
      if(action.key==='book')return nativeBookingReady();
      if(action.key==='call')return Boolean(telHref(data.phone));
      if(action.key==='text')return Boolean(smsHref(data.sms_phone||data.phone));
      return roomReady(action.key);
    });
  }

  function shortestDistance(index,activeIndex,total){
    if(total<2)return 0;
    let distance=index-activeIndex;
    if(distance>total/2)distance-=total;
    if(distance<-total/2)distance+=total;
    return distance;
  }

  function updateDock({pulse=false}={}){
    if(!dock)return;
    const actions=availableActions();
    if(!actions.some(item=>item.key===activeKey))activeKey='home';
    const track=q('.barber-revolve-track',dock);
    if(!track)return;

    const signature=actions.map(item=>item.key).join('|');
    if(track.dataset.signature!==signature){
      track.dataset.signature=signature;
      track.innerHTML=actions.map(item=>
        `<button type="button" class="barber-revolve-item" data-barber-dock-action="${item.key}" data-barber-action-kind="${item.kind}" aria-label="${item.label}">${icon(item.icon)}<span>${item.label}</span></button>`
      ).join('');
    }

    const buttons=qa('[data-barber-dock-action]',track);
    const activeIndex=Math.max(0,buttons.findIndex(button=>button.dataset.barberDockAction===activeKey));
    buttons.forEach((button,index)=>{
      const distance=shortestDistance(index,activeIndex,buttons.length);
      const visible=Math.abs(distance)<=3;
      button.style.setProperty('--dock-slot',String(distance));
      button.style.pointerEvents=visible?'auto':'none';
      button.style.zIndex=distance===0?'6':String(Math.max(1,4-Math.abs(distance)));
      button.dataset.distance=String(Math.max(-3,Math.min(3,distance)));
      button.hidden=!visible;
      button.classList.toggle('active',distance===0);
      button.setAttribute('aria-current',distance===0?'true':'false');
      button.setAttribute('aria-hidden',visible?'false':'true');
      button.tabIndex=visible?0:-1;
    });

    if(pulse){
      dock.classList.remove('dock-change');
      requestAnimationFrame(()=>dock?.classList.add('dock-change'));
    }
  }

  function haptic(ms=4){try{navigator.vibrate?.(ms);}catch(_){ }}

  function select(key,{perform=false,pulse=false,hapticFeedback=false}={}){
    if(!availableActions().some(item=>item.key===key))return;
    activeKey=key;
    updateDock({pulse});
    if(hapticFeedback)haptic();
    if(perform)performAction(key);
  }

  function rotate(step,{fromFinger=false}={}){
    const actions=availableActions();
    if(actions.length<2)return;
    let index=actions.findIndex(item=>item.key===activeKey);
    if(index<0)index=0;
    index=(index+step+actions.length)%actions.length;
    select(actions[index].key,{pulse:true,hapticFeedback:fromFinger});
  }

  function performAction(key){
    const data=cardData()||{};
    if(key==='call'){
      const href=telHref(data.phone);
      if(href)location.href=href;
      return;
    }
    if(key==='text'){
      const href=smsHref(data.sms_phone||data.phone);
      if(href)location.href=href;
      return;
    }
    if(key==='save'){
      q('#save')?.click();
      return;
    }
    try{window.LIWBarberClientRoom?.mount?.();}catch(_){ }
    if(key==='book'){
      window.LIWBarberClientRoom?.openNativeAppointment?.();
      return;
    }
    if(key==='home'||roomReady(key))window.LIWBarberClientRoom?.setRoom?.(key);
  }

  function handleDockClick(event){
    const button=event.target.closest?.('[data-barber-dock-action]');
    if(!button||!dock?.contains(button))return;
    if(performance.now()<suppressClickUntil){
      event.preventDefault();
      suppressClickUntil=0;
      return;
    }
    select(button.dataset.barberDockAction,{perform:true,pulse:true,hapticFeedback:true});
  }

  function handlePointerDown(event){
    if(event.button!==undefined&&event.button!==0)return;
    gesture={id:event.pointerId,startX:event.clientX,startY:event.clientY};
  }

  function handlePointerUp(event){
    if(!gesture||event.pointerId!==gesture.id)return;
    const dx=event.clientX-gesture.startX;
    const dy=event.clientY-gesture.startY;
    gesture=null;
    if(Math.abs(dx)<32||Math.abs(dx)<=Math.abs(dy)*1.15)return;
    const steps=Math.min(2,Math.max(1,Math.round(Math.abs(dx)/70)));
    suppressClickUntil=performance.now()+180;
    rotate(dx<0?steps:-steps,{fromFinger:true});
    dock?.classList.add('dock-release');
    setTimeout(()=>dock?.classList.remove('dock-release'),360);
  }

  function bindInteractions(){
    if(!dock||dock.dataset.gesturesBound==='true')return;
    dock.dataset.gesturesBound='true';
    const track=q('.barber-revolve-track',dock);
    if(!track)return;
    dock.addEventListener('click',handleDockClick);
    track.addEventListener('pointerdown',handlePointerDown,{passive:true});
    track.addEventListener('pointerup',handlePointerUp,{passive:true});
    track.addEventListener('pointercancel',()=>{gesture=null;},{passive:true});
    dock.addEventListener('keydown',event=>{
      if(event.key==='ArrowRight'){event.preventDefault();rotate(1);}
      else if(event.key==='ArrowLeft'){event.preventDefault();rotate(-1);}
    });
  }

  function buildDock(){
    if(!card)return false;
    dock=q('.barber-revolve-dock',card);
    if(!dock){
      dock=document.createElement('nav');
      dock.className='barber-revolve-dock';
      dock.setAttribute('aria-label','Barbershop revolving actions');
      dock.innerHTML='<div class="barber-dock-orbit" aria-hidden="true"></div><div class="barber-revolve-track" tabindex="0"></div><div class="barber-dock-center-mark" aria-hidden="true"><span></span></div>';
      card.appendChild(dock);
    }
    dock.style.pointerEvents='auto';
    bindInteractions();
    updateDock();
    return true;
  }

  function mount(){
    const data=cardData();
    card=q('#card');
    if(!data||!card||card.hidden||!isBarber(data))return false;
    document.documentElement.classList.add('liw-public-barbershop','liw-barber-app-shell');
    document.body.classList.add('liw-public-barbershop','liw-barber-app-shell');
    card.classList.add('barbershop-card-active','barbershop-dock-active');
    buildDock();
    mounted=true;
    return true;
  }

  function refreshAfterPageLoad(){
    if(!mounted)mount();
    else updateDock();
  }

  window.LIWBarberRevolvingDock={mount,select,rotate,refresh:updateDock,getActive:()=>activeKey};
  window.addEventListener('liw:card-loader-ready',mount,{passive:true});
  window.addEventListener('liw:barber-client-ready',refreshAfterPageLoad,{passive:true});
  window.addEventListener('load',refreshAfterPageLoad,{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();