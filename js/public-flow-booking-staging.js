/* LIW Cards staging — Flow-native booking entry.
   Flow can finish composing its swipe rooms before the async LIW booking bootstrap.
   This bridge restores a Contact action target when needed and mounts the existing
   native booking form inside Flow without changing Classic or Showtime. */
(function(){
  'use strict';
  if(window.__LIW_FLOW_NATIVE_BOOKING__)return;
  window.__LIW_FLOW_NATIVE_BOOKING__=true;

  function cardData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}
  }

  function isFlow(){
    const card=document.getElementById('card');
    const data=cardData();
    const experience=String(data?.card_experience||'').trim().toLowerCase();
    const layout=String(data?.card_layout||'').trim().toLowerCase();
    return Boolean(card?.classList.contains('swipe-card-active')&&(experience==='flow'||layout==='swipe'));
  }

  function bookingLabel(section){
    const heading=String(section?.querySelector('.public-section-heading h2')?.textContent||'').trim().toLowerCase();
    return heading.includes('request service')?'Request service':'Book appointment';
  }

  function ensureActions(contact){
    let actions=document.getElementById('business-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.id='business-actions';
      actions.className='business-action-stack';
      actions.dataset.liwFlowRestored='true';
    }
    if(actions.parentElement!==contact)contact.prepend(actions);
    return actions;
  }

  function bindAction(action,section){
    if(action.dataset.liwFlowBookingBound==='true')return;
    action.dataset.liwFlowBookingBound='true';
    action.setAttribute('aria-expanded',section.classList.contains('flow-native-booking-expanded')?'true':'false');
    action.addEventListener('click',event=>{
      if(!isFlow())return;
      event.preventDefault();
      section.classList.add('flow-native-booking-expanded');
      section.setAttribute('aria-hidden','false');
      action.setAttribute('aria-expanded','true');
      requestAnimationFrame(()=>{
        section.scrollIntoView({behavior:'smooth',block:'start'});
        const first=section.querySelector('[data-booking-service],input,select,button,textarea');
        try{first?.focus({preventScroll:true});}catch(_){ }
      });
      try{if(typeof window.track==='function')window.track('native_booking_open',null,{source:'flow_contact'});}catch(_){ }
    });
  }

  function ensureAction(actions,section){
    let action=actions.querySelector('[data-liw-native-booking-action]');
    const label=bookingLabel(section);
    if(!action){
      action=document.createElement('a');
      action.className='business-action primary flow-native-booking-action';
      action.href='#booking-v1-section';
      action.dataset.liwNativeBookingAction='true';
      action.dataset.event='native_booking_click';
      actions.prepend(action);
    }
    action.classList.add('flow-native-booking-action');
    action.innerHTML=`<i data-lucide="calendar-check-2" size="18"></i><span data-liw-native-booking-label>${label}</span><i data-lucide="arrow-right" size="17"></i>`;
    bindAction(action,section);
    actions.hidden=false;
    return action;
  }

  function mount(){
    if(!isFlow())return false;
    const card=document.getElementById('card');
    const contact=card?.querySelector('.swipe-contact-panel');
    const section=document.getElementById('booking-v1-section');
    if(!contact||!section||section.hidden||!section.textContent.trim())return false;

    const actions=ensureActions(contact);
    const action=ensureAction(actions,section);

    section.classList.add('flow-native-booking-section');
    if(!section.dataset.liwFlowBookingInitialized){
      section.dataset.liwFlowBookingInitialized='true';
      section.setAttribute('aria-hidden','true');
    }

    const lead=contact.querySelector('#lead-section');
    if(section.parentElement!==contact){
      if(lead)contact.insertBefore(section,lead);
      else contact.appendChild(section);
    }else if(lead&&section.nextElementSibling!==lead){
      contact.insertBefore(section,lead);
    }
    if(actions.nextElementSibling!==section)contact.insertBefore(actions,section);

    bindAction(action,section);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    if(mount()||attempts>=80)clearInterval(timer);
  },150);

  window.addEventListener('liw:card-loader-ready',()=>setTimeout(mount,0),{once:true});
  window.addEventListener('pageshow',()=>setTimeout(mount,80));
  mount();
})();
