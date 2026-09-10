/* LIW Cards staging — premium Barbershop revolving dock.
   Event-driven only: no polling loops, no forced scroll-to-center cycles. */
(function(){
  'use strict';
  if(window.__LIW_BARBERSHOP_REVOLVING_DOCK_STAGING__)return;
  window.__LIW_BARBERSHOP_REVOLVING_DOCK_STAGING__=true;

  const MODE='barbershop';
  const ACTIONS=[
    {key:'home',label:'Home',icon:'house'},
    {key:'book',label:'Book',icon:'calendar-days'},
    {key:'call',label:'Call',icon:'phone'},
    {key:'text',label:'Text',icon:'message-circle'},
    {key:'cuts',label:'Cuts',icon:'scissors'},
    {key:'social',label:'Social',icon:'instagram'},
    {key:'shop',label:'Shop',icon:'map-pin'},
    {key:'save',label:'Save',icon:'user-round-plus'}
  ];

  let activeKey='home';
  let card=null;
  let dock=null;
  let content=null;
  let observer=null;
  let pointerStart=null;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const cardData=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const safe=(value,max=500)=>String(value??'').trim().slice(0,max);
  const icon=(name,size=19)=>`<i data-lucide="${name}" size="${size}"></i>`;

  function isBarber(data){
    return String(data?.color_mode||'').trim().toLowerCase()===MODE&&String(data?.card_experience||'classic').trim().toLowerCase()!=='music';
  }
  function telHref(value){const clean=safe(value,80).replace(/[^0-9+*#,;]/g,'');return clean?`tel:${clean}`:'';}
  function smsHref(value){const clean=safe(value,80).replace(/[^0-9+*#,;]/g,'');return clean?`sms:${clean}`:'';}
  function hasBooking(data){return Boolean(safe(data?.booking_url,900)||data?.booking_enabled===true||q('#booking-v1-section')||q('[data-event="booking_click"],[data-booking-open],.booking-v1-launch,.public-booking-cta'));}
  function hasCuts(){return Boolean(q('#services-section:not([hidden]) #services > *,#services-section:not([hidden]) .public-service-item,#booking-v1-section .public-booking-service'));}
  function hasSocial(){return Boolean(q('#social-section:not([hidden]) #socials a,#social-section:not([hidden]) #socials button'));}

  function availableActions(){
    const data=cardData()||{};
    return ACTIONS.filter(action=>{
      if(action.key==='home'||action.key==='save')return true;
      if(action.key==='book')return hasBooking(data);
      if(action.key==='call')return Boolean(telHref(data.phone));
      if(action.key==='text')return Boolean(smsHref(data.sms_phone||data.phone));
      if(action.key==='cuts')return hasCuts();
      if(action.key==='social')return hasSocial();
      if(action.key==='shop')return Boolean(safe(data.business_address,260));
      return false;
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
      track.innerHTML=actions.map(item=>`<button type="button" class="barber-revolve-item" data-barber-dock-action="${item.key}" aria-label="${item.label}">${icon(item.icon)}<span>${item.label}</span></button>`).join('');
      qa('[data-barber-dock-action]',track).forEach(button=>button.addEventListener('click',()=>select(button.dataset.barberDockAction,{perform:true})));
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
    const buttons=qa('[data-barber-dock-action]',dock);
    const activeIndex=Math.max(0,buttons.findIndex(button=>button.dataset.barberDockAction===activeKey));
    buttons.forEach((button,index)=>{
      const distance=shortestDistance(index,activeIndex,buttons.length);
      const visible=Math.abs(distance)<=3;
      button.style.setProperty('--dock-slot',String(distance));
      button.dataset.distance=String(Math.max(-3,Math.min(3,distance)));
      button.hidden=!visible;
      button.classList.toggle('active',distance===0);
      button.setAttribute('aria-current',distance===0?'true':'false');
      button.setAttribute('aria-hidden',visible?'false':'true');
    });
    if(pulse){
      dock.classList.remove('dock-change');
      requestAnimationFrame(()=>dock?.classList.add('dock-change'));
    }
  }

  function rotate(step){
    const actions=availableActions();
    if(actions.length<2)return;
    let index=actions.findIndex(item=>item.key===activeKey);
    if(index<0)index=0;
    index=(index+step+actions.length)%actions.length;
    select(actions[index].key,{perform:false});
  }

  function scrollMiddleTo(target){
    if(!content||!target)return;
    const top=Math.max(0,target.offsetTop-content.offsetTop-12);
    try{content.scrollTo({top,behavior:'smooth'});}catch(_){content.scrollTop=top;}
  }

  function performAction(key){
    const data=cardData()||{};
    if(key==='home'){
      try{content?.scrollTo({top:0,behavior:'smooth'});}catch(_){if(content)content.scrollTop=0;}
      return;
    }
    if(key==='call'){
      const href=telHref(data.phone);if(href)location.href=href;return;
    }
    if(key==='text'){
      const href=smsHref(data.sms_phone||data.phone);if(href)location.href=href;return;
    }
    if(key==='save'){
      q('#save')?.click();return;
    }
    if(key==='shop'){
      const address=safe(data.business_address,260);if(!address)return;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,'_blank','noopener');return;
    }
    if(key==='cuts'){
      scrollMiddleTo(q('#services-section'));return;
    }
    if(key==='social'){
      scrollMiddleTo(q('#social-section'));return;
    }
    if(key==='book'){
      const native=q('[data-event="booking_click"],[data-booking-open],.booking-v1-launch,.public-booking-cta');
      if(native){native.click();return;}
      const section=q('#booking-v1-section');if(section){scrollMiddleTo(section);return;}
      const url=safe(data.booking_url,900);
      if(url){try{const parsed=new URL(url,location.href);if(['http:','https:'].includes(parsed.protocol))window.open(parsed.href,'_blank','noopener');}catch(_){ }}
    }
  }

  function haptic(){try{navigator.vibrate?.(7);}catch(_){ }}
  function select(key,{perform=false}={}){
    if(!availableActions().some(item=>item.key===key))return;
    activeKey=key;
    updateDock({pulse:true});
    haptic();
    if(perform)performAction(key);
  }

  function bindGestures(){
    if(!dock||dock.dataset.gesturesBound==='true')return;
    dock.dataset.gesturesBound='true';
    const track=q('.barber-revolve-track',dock);if(!track)return;
    track.addEventListener('pointerdown',event=>{
      if(event.button!==undefined&&event.button!==0)return;
      pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId};
      try{track.setPointerCapture(event.pointerId);}catch(_){ }
    },{passive:true});
    track.addEventListener('pointerup',event=>{
      if(!pointerStart||pointerStart.id!==event.pointerId)return;
      const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;
      pointerStart=null;
      if(Math.abs(dx)>=28&&Math.abs(dx)>Math.abs(dy)*1.15)rotate(dx<0?1:-1);
    },{passive:true});
    track.addEventListener('pointercancel',()=>{pointerStart=null;},{passive:true});
    dock.addEventListener('keydown',event=>{
      if(event.key==='ArrowRight'){event.preventDefault();rotate(1);}
      if(event.key==='ArrowLeft'){event.preventDefault();rotate(-1);}
      if(event.key==='Enter'||event.key===' '){const button=event.target.closest?.('[data-barber-dock-action]');if(button){event.preventDefault();select(button.dataset.barberDockAction,{perform:true});}}
    });
  }

  function buildDock(){
    if(!card)return false;
    dock=q('.barber-revolve-dock',card);
    if(!dock){
      dock=document.createElement('nav');
      dock.className='barber-revolve-dock';
      dock.setAttribute('aria-label','Barbershop quick actions');
      dock.innerHTML='<div class="barber-dock-orbit" aria-hidden="true"></div><div class="barber-revolve-track" tabindex="0"></div><div class="barber-dock-caption" aria-hidden="true">SWIPE · TAP · CONNECT</div>';
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
    content=q('.public-content',card);
    if(!content)return false;
    document.documentElement.classList.add('liw-public-barbershop','liw-barber-app-shell');
    document.body.classList.add('liw-public-barbershop','liw-barber-app-shell');
    card.classList.add('barbershop-card-active','barbershop-dock-active');
    buildDock();
    observer?.disconnect();observer=null;
    return true;
  }

  function watchUntilReady(){
    if(mount())return;
    const target=q('#card')||document.body;
    observer=new MutationObserver(()=>{if(mount()){observer?.disconnect();observer=null;}});
    observer.observe(target,{attributes:true,attributeFilter:['hidden','class'],childList:true,subtree:target===document.body});
  }

  window.LIWBarberRevolvingDock={mount,select,rotate,refresh:updateDock};
  window.addEventListener('liw:card-loader-ready',()=>mount(),{passive:true});
  window.addEventListener('load',()=>mount(),{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchUntilReady,{once:true});
  else watchUntilReady();
})();