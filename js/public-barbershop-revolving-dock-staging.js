/* LIW Cards staging — premium Barbershop revolving dock V5.
   Finger-driven ratchet wheel. Event-driven only: no polling, no pointer capture,
   no group translation and no forced scrolling. */
(function(){
  'use strict';
  if(window.__LIW_BARBERSHOP_REVOLVING_DOCK_STAGING__)return;
  window.__LIW_BARBERSHOP_REVOLVING_DOCK_STAGING__=true;

  const MODE='barbershop';
  const ACTIONS=[
    {key:'home',label:'Welcome',icon:'house',kind:'room'},
    {key:'book',label:'Book',icon:'calendar-check-2',kind:'direct'},
    {key:'call',label:'Call',icon:'phone',kind:'direct'},
    {key:'text',label:'Text',icon:'message-circle',kind:'direct'},
    {key:'cuts',label:'Cuts',icon:'scissors',kind:'room'},
    {key:'gallery',label:'Gallery',icon:'images',kind:'room'},
    {key:'map',label:'Map',icon:'map-pin',kind:'room'},
    {key:'reviews',label:'Reviews',icon:'message-square-heart',kind:'room'},
    {key:'social',label:'Social',icon:'instagram',kind:'room'},
    {key:'shop',label:'Shop',icon:'shopping-bag',kind:'room'},
    {key:'inquiry',label:'Inquiry',icon:'send',kind:'room'},
    {key:'save',label:'Save',icon:'user-round-plus',kind:'direct'}
  ];

  let activeKey='home';
  let card=null;
  let dock=null;
  let content=null;
  let readyObserver=null;
  let contentObserver=null;
  let refreshQueued=false;
  let pointer=null;
  let ignoreClicksUntil=0;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const cardData=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const safe=(value,max=500)=>String(value??'').trim().slice(0,max);
  const icon=(name,size=19)=>`<i data-lucide="${name}" size="${size}"></i>`;

  function isBarber(data){return String(data?.color_mode||'').trim().toLowerCase()===MODE&&String(data?.card_experience||'classic').trim().toLowerCase()!=='music';}
  function telHref(value){const clean=safe(value,80).replace(/[^0-9+*#,;]/g,'');return clean?`tel:${clean}`:'';}
  function smsHref(value){const clean=safe(value,80).replace(/[^0-9+*#,;]/g,'');return clean?`sms:${clean}`:'';}
  function nativeBookingReady(){
    const data=cardData()||{};
    const access=globalThis.publicCardFeatureAccess||{};
    return Boolean(q('#booking-v1-section')||q('[data-liw-native-booking-action]')||(data.booking_enabled===true&&access.appointment_booking===true));
  }
  function roomReady(key){
    if(key==='home')return true;
    if(window.LIWBarberClientRoom?.sourceConfigured)return window.LIWBarberClientRoom.sourceConfigured(key);
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
    const signature=actions.map(item=>item.key).join('|');
    const track=q('.barber-revolve-track',dock);
    if(track&&track.dataset.signature!==signature){
      track.dataset.signature=signature;
      track.innerHTML=actions.map(item=>`<button type="button" class="barber-revolve-item" data-barber-dock-action="${item.key}" data-barber-action-kind="${item.kind}" aria-label="${item.label}">${icon(item.icon)}<span>${item.label}</span></button>`).join('');
      qa('[data-barber-dock-action]',track).forEach(button=>button.addEventListener('click',event=>{
        if(performance.now()<ignoreClicksUntil){event.preventDefault();event.stopPropagation();return;}
        select(button.dataset.barberDockAction,{perform:true,pulse:true,hapticFeedback:true});
      }));
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
    const buttons=qa('[data-barber-dock-action]',dock);
    const activeIndex=Math.max(0,buttons.findIndex(button=>button.dataset.barberDockAction===activeKey));
    const fingerTurning=pointer?.axis==='horizontal';
    buttons.forEach((button,index)=>{
      const distance=shortestDistance(index,activeIndex,buttons.length);
      const visible=Math.abs(distance)<=3;
      button.style.setProperty('transition',fingerTurning
        ? 'left .18s cubic-bezier(.22,.84,.28,1),transform .18s cubic-bezier(.22,.84,.28,1),opacity .16s ease,width .18s ease,height .18s ease,border-color .18s ease,box-shadow .18s ease'
        : 'left .38s cubic-bezier(.16,1.05,.3,1),transform .38s cubic-bezier(.16,1.05,.3,1),opacity .24s ease,width .32s cubic-bezier(.16,1.05,.3,1),height .32s cubic-bezier(.16,1.05,.3,1),border-color .22s ease,box-shadow .28s ease','important');
      button.style.setProperty('--dock-slot',String(distance));
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

  function queueDockRefresh(){
    if(refreshQueued)return;
    refreshQueued=true;
    requestAnimationFrame(()=>{refreshQueued=false;updateDock();});
  }

  function haptic(ms=4){try{navigator.vibrate?.(ms);}catch(_){ }}

  function select(key,{perform=false,pulse=false,hapticFeedback=false}={}){
    if(!availableActions().some(item=>item.key===key))return;
    activeKey=key;
    updateDock({pulse});
    if(hapticFeedback)haptic();
    if(perform)performAction(key);
  }

  function rotate(step,{perform=false,fromFinger=false}={}){
    const actions=availableActions();
    if(actions.length<2)return;
    let index=actions.findIndex(item=>item.key===activeKey);
    if(index<0)index=0;
    index=(index+step+actions.length)%actions.length;
    select(actions[index].key,{perform,pulse:!fromFinger,hapticFeedback:fromFinger});
  }

  function performAction(key){
    const data=cardData()||{};
    if(key==='call'){const href=telHref(data.phone);if(href)location.href=href;return;}
    if(key==='text'){const href=smsHref(data.sms_phone||data.phone);if(href)location.href=href;return;}
    if(key==='save'){q('#save')?.click();return;}
    if(key==='book'){window.LIWBarberClientRoom?.openNativeAppointment?.();return;}
    if(key==='home'||roomReady(key))window.LIWBarberClientRoom?.setRoom?.(key);
  }

  function clearPointer(){
    pointer=null;
    dock?.classList.remove('dock-wheel-touch');
  }

  function handlePointerMove(event){
    if(!pointer||event.pointerId!==pointer.id)return;
    const totalX=event.clientX-pointer.startX;
    const totalY=event.clientY-pointer.startY;

    if(!pointer.axis){
      if(Math.abs(totalX)<7&&Math.abs(totalY)<7)return;
      if(Math.abs(totalY)>Math.abs(totalX)*1.08){pointer.axis='vertical';return;}
      pointer.axis='horizontal';
      pointer.moved=true;
      dock?.classList.add('dock-wheel-touch');
    }
    if(pointer.axis!=='horizontal')return;
    if(event.cancelable)event.preventDefault();

    const delta=event.clientX-pointer.lastX;
    pointer.lastX=event.clientX;
    pointer.accum+=delta;

    const threshold=30;
    while(Math.abs(pointer.accum)>=threshold){
      const direction=pointer.accum<0?1:-1;
      rotate(direction,{perform:false,fromFinger:true});
      pointer.accum+=pointer.accum<0?threshold:-threshold;
    }
  }

  function finishPointer(event){
    if(!pointer||event.pointerId!==pointer.id)return;
    const moved=pointer.moved&&pointer.axis==='horizontal';
    clearPointer();
    if(moved){
      ignoreClicksUntil=performance.now()+120;
      updateDock({pulse:true});
    }
  }

  function cancelPointer(event){
    if(pointer&&event?.pointerId!==undefined&&event.pointerId!==pointer.id)return;
    const moved=pointer?.moved&&pointer?.axis==='horizontal';
    clearPointer();
    if(moved)updateDock({pulse:true});
  }

  function bindGestures(){
    if(!dock||dock.dataset.gesturesBound==='true')return;
    dock.dataset.gesturesBound='true';
    const track=q('.barber-revolve-track',dock);if(!track)return;

    track.addEventListener('pointerdown',event=>{
      if(event.button!==undefined&&event.button!==0)return;
      pointer={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,accum:0,axis:null,moved:false};
    },{passive:true});

    window.addEventListener('pointermove',handlePointerMove,{passive:false});
    window.addEventListener('pointerup',finishPointer,{passive:true});
    window.addEventListener('pointercancel',cancelPointer,{passive:true});
    window.addEventListener('blur',()=>cancelPointer(),{passive:true});

    dock.addEventListener('keydown',event=>{
      if(event.key==='ArrowRight'){event.preventDefault();rotate(1);}
      else if(event.key==='ArrowLeft'){event.preventDefault();rotate(-1);}
      else if(event.key==='Enter'||event.key===' '){
        const button=event.target.closest?.('[data-barber-dock-action]');
        if(button){event.preventDefault();select(button.dataset.barberDockAction,{perform:true,pulse:true,hapticFeedback:true});}
      }
    });
  }

  function watchMiddle(){
    if(contentObserver||!content)return;
    contentObserver=new MutationObserver(()=>queueDockRefresh());
    contentObserver.observe(content,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
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
    bindGestures();
    updateDock();
    return true;
  }

  function mount(){
    const data=cardData();
    card=q('#card');
    if(!data||!card||card.hidden)return false;
    if(!isBarber(data))return true;
    content=q('.public-content',card);if(!content)return false;
    document.documentElement.classList.add('liw-public-barbershop','liw-barber-app-shell');
    document.body.classList.add('liw-public-barbershop','liw-barber-app-shell');
    card.classList.add('barbershop-card-active','barbershop-dock-active');
    buildDock();
    watchMiddle();
    readyObserver?.disconnect();readyObserver=null;
    return true;
  }

  function watchUntilReady(){
    if(mount())return;
    const target=q('#card')||document.body;
    readyObserver=new MutationObserver(()=>{if(mount()){readyObserver?.disconnect();readyObserver=null;}});
    readyObserver.observe(target,{attributes:true,attributeFilter:['hidden','class'],childList:true,subtree:target===document.body});
  }

  window.LIWBarberRevolvingDock={mount,select,rotate,refresh:updateDock,getActive:()=>activeKey};
  window.addEventListener('liw:card-loader-ready',()=>mount(),{passive:true});
  window.addEventListener('load',()=>mount(),{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchUntilReady,{once:true});
  else watchUntilReady();
})();
