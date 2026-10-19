/* LIW Cards — Spotlight transformation, staging only.
   Enhances the normal public renderer without replacing card data or booking logic. */
(function(){
  'use strict';
  if(window.__LIW_SPOTLIGHT_TRANSFORMATION__)return;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  window.__LIW_SPOTLIGHT_TRANSFORMATION__=true;

  const state={enabled:false,card:null,scheduled:false,lastFocus:null};
  const html=document.documentElement;

  const lower=value=>String(value||'').trim().toLowerCase();
  const visible=el=>Boolean(el&&!el.hidden&&el.textContent.trim());
  const icon=(name,size=18)=>`<i data-lucide="${name}" size="${size}"></i>`;

  function isSpotlight(card){
    const query=new URLSearchParams(location.search);
    return lower(card?.card_experience)==='spotlight'||
      lower(card?.card_layout)==='spotlight'||
      lower(query.get('experience'))==='spotlight'||
      lower(query.get('layout'))==='spotlight';
  }

  function activate(card){
    if(!isSpotlight(card))return;
    state.enabled=true;
    state.card=card||state.card;
    html.classList.add('liw-spotlight-experience');
    document.body?.classList.add('liw-spotlight-experience');
    const publicCard=document.getElementById('card');
    publicCard?.classList.add('public-experience-spotlight');
    scheduleEnhance();
  }

  function scheduleEnhance(){
    if(!state.enabled||state.scheduled)return;
    state.scheduled=true;
    requestAnimationFrame(()=>{
      state.scheduled=false;
      enhance();
    });
  }

  function ensureIdentity(){
    const card=document.getElementById('card');
    const cover=document.getElementById('public-cover');
    if(!card||!cover)return;
    card.classList.add('public-experience-spotlight');

    let identity=document.getElementById('spotlight-identity');
    if(!identity){
      identity=document.createElement('section');
      identity.id='spotlight-identity';
      identity.className='spotlight-identity';
      identity.setAttribute('aria-label','Business identity');
      cover.insertAdjacentElement('afterend',identity);
    }

    ['name','company','title','headline'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&el.parentElement!==identity)identity.appendChild(el);
      if(el)el.hidden=!el.textContent.trim();
    });

    let primary=document.getElementById('spotlight-primary-actions');
    if(!primary){
      primary=document.createElement('div');
      primary.id='spotlight-primary-actions';
      primary.className='spotlight-primary-actions';
      primary.setAttribute('aria-label','Primary actions');
      identity.insertAdjacentElement('afterend',primary);
    }
  }

  function findAction(eventName){
    return document.querySelector(`#actions [data-event="${eventName}"]`);
  }

  function createPromotedLink(source,label,iconName,eventName){
    if(!source)return null;
    const link=document.createElement('a');
    link.className='spotlight-primary-action';
    link.href=source.getAttribute('href')||'#';
    if(/^https?:/i.test(link.href)){
      link.target='_blank';
      link.rel='noopener';
    }
    link.innerHTML=`${icon(iconName)}<span>${label}</span>`;
    link.addEventListener('click',()=>{
      try{if(typeof window.track==='function')window.track(eventName);}catch(_){ }
    });
    return link;
  }

  function nativeBookingSection(){
    const section=document.getElementById('booking-v1-section');
    return section&&!section.hidden&&section.textContent.trim()?section:null;
  }

  function bookingAction(){
    const actions=document.getElementById('business-actions');
    if(!actions)return null;
    return actions.querySelector('[data-liw-native-booking-action]')||
      actions.querySelector('[data-business-event="booking_click"],[data-event="booking_click"]');
  }

  function bookingMode(){
    const section=nativeBookingSection();
    if(section)return {type:'native',section};
    const action=bookingAction();
    const href=String(action?.getAttribute('href')||'').trim();
    if(action&&href&&href!=='#booking-v1-section')return {type:'external',action,href};
    return null;
  }

  function ensurePrimaryActions(){
    const area=document.getElementById('spotlight-primary-actions');
    if(!area)return;

    const call=findAction('phone_click');
    const text=findAction('text_click');
    call?.classList.add('spotlight-promoted-action');
    text?.classList.add('spotlight-promoted-action');

    const signature=[call?.getAttribute('href')||'',text?.getAttribute('href')||'',bookingMode()?.type||'',bookingMode()?.href||''].join('|');
    if(area.dataset.signature===signature)return;
    area.dataset.signature=signature;
    area.innerHTML='';

    const callLink=createPromotedLink(call,'Call','phone','phone_click');
    const textLink=createPromotedLink(text,'Message','message-circle','text_click');
    if(callLink)area.appendChild(callLink);
    if(textLink)area.appendChild(textLink);

    const booking=bookingMode();
    if(booking?.type==='native'){
      const button=document.createElement('button');
      button.type='button';
      button.className='spotlight-primary-action is-primary spotlight-primary-book';
      button.innerHTML=`${icon('calendar-check-2')}<span>Book Now</span>`;
      button.addEventListener('click',openBooking);
      area.appendChild(button);
    }else if(booking?.type==='external'){
      const link=document.createElement('a');
      link.className='spotlight-primary-action is-primary';
      link.href=booking.href;
      link.target='_blank';
      link.rel='noopener';
      link.innerHTML=`${icon('calendar-check-2')}<span>Book Now</span>`;
      link.addEventListener('click',()=>{try{window.track?.('booking_click');}catch(_){ }});
      area.appendChild(link);
    }

    area.hidden=!area.children.length;
    if(window.lucide)try{lucide.createIcons({nodes:[area]});}catch(_){try{lucide.createIcons();}catch(__){ }}
  }

  function ensureAbout(){
    const content=document.querySelector('.public-content');
    const bio=document.getElementById('bio');
    if(!content||!bio)return;
    let section=document.getElementById('spotlight-about');
    if(!section){
      section=document.createElement('section');
      section.id='spotlight-about';
      section.className='spotlight-about';
      section.innerHTML='<div class="spotlight-section-head"><h2>About Me</h2><button class="spotlight-about-toggle" type="button" hidden>Read more</button></div>';
      const actions=document.getElementById('actions');
      const save=document.getElementById('save');
      const business=document.getElementById('business-actions');
      const anchor=business||save||actions;
      if(anchor?.parentElement===content)anchor.insertAdjacentElement('afterend',section);
      else content.prepend(section);
      section.appendChild(bio);
      section.querySelector('.spotlight-about-toggle').addEventListener('click',()=>{
        const expanded=section.classList.toggle('is-expanded');
        section.querySelector('.spotlight-about-toggle').textContent=expanded?'Show less':'Read more';
      });
    }else if(bio.parentElement!==section){
      section.appendChild(bio);
    }
    const hasBio=Boolean(bio.textContent.trim());
    section.hidden=!hasBio;
    if(!hasBio)return;
    const toggle=section.querySelector('.spotlight-about-toggle');
    const shouldClamp=bio.textContent.trim().length>190;
    bio.classList.toggle('spotlight-clamp',shouldClamp);
    toggle.hidden=!shouldClamp;
  }

  function setHeading(section,title,kicker,replaceOnlyDefaults=[]){
    if(!section)return;
    const h2=section.querySelector('.public-section-heading h2,.public-rich-head h2');
    const hint=section.querySelector('.public-section-heading span,.public-rich-head span');
    if(h2){
      const current=lower(h2.textContent);
      if(!replaceOnlyDefaults.length||replaceOnlyDefaults.includes(current))h2.textContent=title;
    }
    if(hint&&kicker)hint.textContent=kicker;
  }

  function markRail(rail){
    if(!rail)return;
    rail.classList.add('spotlight-swipe');
    const count=[...rail.children].filter(child=>!child.hidden).length;
    rail.dataset.spotlightScrollable=count>1?'true':'false';
    if(count>1&&!rail.getAttribute('aria-label'))rail.setAttribute('aria-label','Swipe horizontally for more');
  }

  function enhanceSections(){
    const services=document.getElementById('services-section');
    if(visible(services)){
      setHeading(services,'Services','Swipe to explore',['services']);
      markRail(document.getElementById('services'));
    }

    const products=document.getElementById('products-section');
    if(visible(products)){
      setHeading(products,'Featured Products','Swipe to explore',['featured products']);
      markRail(document.getElementById('products'));
    }

    const social=document.getElementById('social-section');
    if(visible(social)){
      setHeading(social,'Connect','Social & contact',['connect with me']);
      markRail(document.getElementById('socials'));
    }

    document.querySelectorAll('#public-rich-sections .public-rich-section').forEach(section=>{
      const type=section.dataset.publicRich;
      if(type==='gallery'){
        setHeading(section,'Featured Projects','Swipe through recent work',['gallery','photos']);
        markRail(section.querySelector('.public-gallery-grid'));
      }else if(type==='testimonials'){
        setHeading(section,'Client Reviews','Swipe through feedback',['what clients say','reviews']);
        markRail(section.querySelector('.public-testimonial-list'));
      }else if(type==='credentials'){
        setHeading(section,'Why Choose Us','Trust & qualifications',['credentials']);
        markRail(section.querySelector('.public-credential-grid'));
      }else if(type==='featured_links'){
        setHeading(section,'Explore More','Swipe for links',['featured links']);
        markRail(section.querySelector('.public-featured-links'));
      }
    });

    document.querySelectorAll('.public-section,.public-rich-section').forEach(section=>{
      if(section.hidden)return;
      const meaningful=section.querySelector('img,video,form,a,button,input,select,textarea')||section.textContent.trim();
      section.classList.toggle('spotlight-empty',!meaningful);
    });
  }

  function ensureBookingShell(){
    let overlay=document.getElementById('spotlight-booking-overlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='spotlight-booking-overlay';
    overlay.className='spotlight-booking-overlay';
    overlay.hidden=true;
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','spotlight-booking-title');
    overlay.innerHTML=`<div class="spotlight-booking-sheet"><div class="spotlight-booking-handle" aria-hidden="true"></div><div class="spotlight-booking-head"><h2 id="spotlight-booking-title">Book an appointment</h2><button type="button" class="spotlight-booking-close" aria-label="Close booking">${icon('x',20)}</button></div><div class="spotlight-booking-body" id="spotlight-booking-body"></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.spotlight-booking-close').addEventListener('click',closeBooking);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeBooking();});
    if(window.lucide)try{lucide.createIcons({nodes:[overlay]});}catch(_){try{lucide.createIcons();}catch(__){ }}
    return overlay;
  }

  function relocateBooking(){
    const section=document.getElementById('booking-v1-section');
    if(!section)return;
    const overlay=ensureBookingShell();
    const body=overlay.querySelector('#spotlight-booking-body');
    if(section.parentElement!==body)body.appendChild(section);
  }

  function openBooking(event){
    event?.preventDefault?.();
    const section=nativeBookingSection();
    if(!section)return false;
    relocateBooking();
    const overlay=ensureBookingShell();
    state.lastFocus=document.activeElement;
    overlay.hidden=false;
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('spotlight-booking-open');
    requestAnimationFrame(()=>overlay.querySelector('.spotlight-booking-close')?.focus());
    try{window.track?.('native_booking_click');}catch(_){ }
    return true;
  }

  function closeBooking(){
    const overlay=document.getElementById('spotlight-booking-overlay');
    if(!overlay||overlay.hidden)return;
    overlay.hidden=true;
    overlay.setAttribute('aria-hidden','true');
    document.body.classList.remove('spotlight-booking-open');
    try{state.lastFocus?.focus?.();}catch(_){ }
  }

  function ensureBottomBook(){
    const content=document.querySelector('.public-content');
    const branding=document.getElementById('branding');
    if(!content||!branding)return;
    let cta=document.getElementById('spotlight-bottom-book');
    if(!cta){
      cta=document.createElement('button');
      cta.id='spotlight-bottom-book';
      cta.type='button';
      cta.className='spotlight-bottom-book';
      cta.innerHTML=`<span>${icon('calendar-check-2')} &nbsp; Book an Appointment</span>${icon('arrow-right',18)}`;
      branding.insertAdjacentElement('beforebegin',cta);
    }
    const booking=bookingMode();
    cta.classList.toggle('is-active',Boolean(booking));
    cta.onclick=null;
    if(booking?.type==='native'){
      cta.type='button';
      cta.removeAttribute('data-external-href');
      cta.onclick=openBooking;
    }else if(booking?.type==='external'){
      cta.type='button';
      cta.dataset.externalHref=booking.href;
      cta.onclick=()=>{window.open(booking.href,'_blank','noopener');try{window.track?.('booking_click');}catch(_){ }};
    }
    if(window.lucide)try{lucide.createIcons({nodes:[cta]});}catch(_){try{lucide.createIcons();}catch(__){ }}
  }

  function improveQuickActions(){
    const actions=document.getElementById('actions');
    if(actions)markRail(actions);
  }

  function enhance(){
    if(!state.enabled)return;
    ensureIdentity();
    ensureAbout();
    improveQuickActions();
    enhanceSections();
    relocateBooking();
    ensurePrimaryActions();
    ensureBottomBook();
  }

  document.addEventListener('liw:public-card-ready',event=>activate(event.detail?.card));
  document.addEventListener('liw:public-card-rendered',event=>{
    activate(event.detail?.card);
    scheduleEnhance();
  });

  document.addEventListener('click',event=>{
    if(!state.enabled)return;
    const nativeLink=event.target.closest?.('[data-liw-native-booking-action],a[href="#booking-v1-section"]');
    if(nativeLink&&nativeBookingSection()){
      event.preventDefault();
      event.stopImmediatePropagation();
      openBooking(event);
    }
  },true);

  document.addEventListener('keydown',event=>{
    if(state.enabled&&event.key==='Escape')closeBooking();
  });

  const observer=new MutationObserver(()=>scheduleEnhance());
  const startObserver=()=>observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','href']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();

  // Preview URLs can declare Spotlight before card data arrives. This only preloads
  // the class; the adapter still waits for real card data before moving content.
  const query=new URLSearchParams(location.search);
  if(lower(query.get('experience'))==='spotlight'||lower(query.get('layout'))==='spotlight'){
    state.enabled=true;
    html.classList.add('liw-spotlight-experience');
    if(document.body)document.body.classList.add('liw-spotlight-experience');
    else document.addEventListener('DOMContentLoaded',()=>document.body.classList.add('liw-spotlight-experience'),{once:true});
  }
})();