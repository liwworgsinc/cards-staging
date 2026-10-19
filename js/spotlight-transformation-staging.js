/* LIW Cards — Spotlight transformation, staging only.
   Enhances the normal public renderer without replacing card data or booking logic. */
(function(){
  'use strict';
  if(window.__LIW_SPOTLIGHT_TRANSFORMATION__)return;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  window.__LIW_SPOTLIGHT_TRANSFORMATION__=true;

  const state={enabled:false,scheduled:false,lastFocus:null};
  const html=document.documentElement;
  const lower=value=>String(value||'').trim().toLowerCase();
  const icon=(name,size=18)=>`<i data-lucide="${name}" size="${size}"></i>`;
  const visible=el=>Boolean(el&&!el.hidden&&el.textContent.trim());

  function isSpotlight(card){
    const q=new URLSearchParams(location.search);
    return lower(card?.card_experience)==='spotlight'||lower(card?.card_layout)==='spotlight'||lower(q.get('experience'))==='spotlight'||lower(q.get('layout'))==='spotlight';
  }

  function schedule(){
    if(!state.enabled||state.scheduled)return;
    state.scheduled=true;
    requestAnimationFrame(()=>{state.scheduled=false;enhance();});
  }

  function activate(card){
    if(!isSpotlight(card))return;
    state.enabled=true;
    html.classList.add('liw-spotlight-experience');
    document.body?.classList.add('liw-spotlight-experience');
    document.getElementById('card')?.classList.add('public-experience-spotlight');
    schedule();
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
      if(!el)return;
      if(el.parentElement!==identity)identity.appendChild(el);
      const shouldHide=!el.textContent.trim();
      if(el.hidden!==shouldHide)el.hidden=shouldHide;
    });
    let actions=document.getElementById('spotlight-primary-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.id='spotlight-primary-actions';
      actions.className='spotlight-primary-actions';
      actions.setAttribute('aria-label','Primary actions');
      identity.insertAdjacentElement('afterend',actions);
    }
  }

  function originalAction(eventName){return document.querySelector(`#actions [data-event="${eventName}"]`);}

  function promotedLink(source,label,iconName,eventName){
    if(!source)return null;
    const a=document.createElement('a');
    a.className='spotlight-primary-action';
    a.href=source.getAttribute('href')||'#';
    if(/^https?:/i.test(a.href)){a.target='_blank';a.rel='noopener';}
    a.innerHTML=`${icon(iconName)}<span>${label}</span>`;
    a.addEventListener('click',()=>{try{window.track?.(eventName);}catch(_){ }});
    return a;
  }

  function nativeBooking(){
    const section=document.getElementById('booking-v1-section');
    return section&&!section.hidden&&section.textContent.trim()?section:null;
  }

  function bookingMode(){
    const section=nativeBooking();
    if(section)return {type:'native',section};
    const wrap=document.getElementById('business-actions');
    const action=wrap?.querySelector('[data-liw-native-booking-action],[data-business-event="booking_click"],[data-event="booking_click"]');
    const href=String(action?.getAttribute('href')||'').trim();
    if(action&&href&&href!=='#booking-v1-section')return {type:'external',href};
    return null;
  }

  function ensurePrimaryActions(){
    const area=document.getElementById('spotlight-primary-actions');
    if(!area)return;
    const call=originalAction('phone_click');
    const text=originalAction('text_click');
    call?.classList.add('spotlight-promoted-action');
    text?.classList.add('spotlight-promoted-action');
    const booking=bookingMode();
    const signature=[call?.getAttribute('href')||'',text?.getAttribute('href')||'',booking?.type||'',booking?.href||''].join('|');
    if(area.dataset.signature===signature)return;
    area.dataset.signature=signature;
    area.replaceChildren();
    const callLink=promotedLink(call,'Call','phone','phone_click');
    const textLink=promotedLink(text,'Message','message-circle','text_click');
    if(callLink)area.appendChild(callLink);
    if(textLink)area.appendChild(textLink);
    if(booking?.type==='native'){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='spotlight-primary-action is-primary spotlight-primary-book';
      btn.innerHTML=`${icon('calendar-check-2')}<span>Book Now</span>`;
      btn.addEventListener('click',openBooking);
      area.appendChild(btn);
    }else if(booking?.type==='external'){
      const a=document.createElement('a');
      a.className='spotlight-primary-action is-primary';
      a.href=booking.href;a.target='_blank';a.rel='noopener';
      a.innerHTML=`${icon('calendar-check-2')}<span>Book Now</span>`;
      a.addEventListener('click',()=>{try{window.track?.('booking_click');}catch(_){ }});
      area.appendChild(a);
    }
    const shouldHide=!area.children.length;
    if(area.hidden!==shouldHide)area.hidden=shouldHide;
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
      (document.getElementById('business-actions')||document.getElementById('save')||document.getElementById('actions'))?.insertAdjacentElement('afterend',section);
      section.querySelector('.spotlight-about-toggle').addEventListener('click',()=>{
        const expanded=section.classList.toggle('is-expanded');
        section.querySelector('.spotlight-about-toggle').textContent=expanded?'Show less':'Read more';
      });
    }
    if(bio.parentElement!==section)section.appendChild(bio);
    const hasBio=Boolean(bio.textContent.trim());
    if(section.hidden===hasBio)section.hidden=!hasBio;
    if(!hasBio)return;
    const clamp=bio.textContent.trim().length>190;
    bio.classList.toggle('spotlight-clamp',clamp);
    const toggle=section.querySelector('.spotlight-about-toggle');
    if(toggle.hidden===clamp)toggle.hidden=!clamp;
  }

  function setHeading(section,title,kicker,defaults=[]){
    if(!section)return;
    const h2=section.querySelector('.public-section-heading h2,.public-rich-head h2');
    const hint=section.querySelector('.public-section-heading span,.public-rich-head span');
    if(h2){
      const current=lower(h2.textContent);
      if((!defaults.length||defaults.includes(current))&&h2.textContent!==title)h2.textContent=title;
    }
    if(hint&&kicker&&hint.textContent!==kicker)hint.textContent=kicker;
  }

  function markRail(rail){
    if(!rail)return;
    rail.classList.add('spotlight-swipe');
    const count=[...rail.children].filter(el=>!el.hidden).length;
    const value=count>1?'true':'false';
    if(rail.dataset.spotlightScrollable!==value)rail.dataset.spotlightScrollable=value;
    if(count>1&&!rail.getAttribute('aria-label'))rail.setAttribute('aria-label','Swipe horizontally for more');
  }

  function enhanceSections(){
    const services=document.getElementById('services-section');
    if(visible(services)){setHeading(services,'Services','Swipe to explore',['services']);markRail(document.getElementById('services'));}
    const products=document.getElementById('products-section');
    if(visible(products)){setHeading(products,'Featured Products','Swipe to explore',['featured products']);markRail(document.getElementById('products'));}
    const social=document.getElementById('social-section');
    if(visible(social)){setHeading(social,'Connect','Social & contact',['connect with me']);markRail(document.getElementById('socials'));}
    document.querySelectorAll('#public-rich-sections .public-rich-section').forEach(section=>{
      const type=section.dataset.publicRich;
      if(type==='gallery'){setHeading(section,'Featured Projects','Swipe through recent work',['gallery','photos']);markRail(section.querySelector('.public-gallery-grid'));}
      if(type==='testimonials'){setHeading(section,'Client Reviews','Swipe through feedback',['what clients say','reviews']);markRail(section.querySelector('.public-testimonial-list'));}
      if(type==='credentials'){setHeading(section,'Why Choose Us','Trust & qualifications',['credentials']);markRail(section.querySelector('.public-credential-grid'));}
      if(type==='featured_links'){setHeading(section,'Explore More','Swipe for links',['featured links']);markRail(section.querySelector('.public-featured-links'));}
    });
    document.querySelectorAll('.public-section,.public-rich-section').forEach(section=>{
      if(section.hidden)return;
      const meaningful=section.querySelector('img,video,form,a,button,input,select,textarea')||section.textContent.trim();
      section.classList.toggle('spotlight-empty',!meaningful);
    });
  }

  function orderContent(){
    const content=document.querySelector('.public-content');
    if(!content)return;
    content.style.display='flex';
    content.style.flexDirection='column';
    const order={
      'about-section':1,actions:10,save:11,'business-actions':12,'spotlight-about':20,
      'services-section':30,'products-section':35,'public-rich-sections':40,'video-section':45,
      'social-section':60,'payment-sharing-section':65,'downloads-section':70,'lead-section':80,
      'spotlight-bottom-book':90,branding:100
    };
    Object.entries(order).forEach(([id,value])=>{const el=document.getElementById(id);if(el&&el.style.order!==String(value))el.style.order=String(value);});
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
    const body=ensureBookingShell().querySelector('#spotlight-booking-body');
    if(section.parentElement!==body)body.appendChild(section);
  }

  function openBooking(event){
    event?.preventDefault?.();
    if(!nativeBooking())return false;
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
    const branding=document.getElementById('branding');
    if(!branding)return;
    let cta=document.getElementById('spotlight-bottom-book');
    if(!cta){
      cta=document.createElement('button');
      cta.id='spotlight-bottom-book';cta.type='button';cta.className='spotlight-bottom-book';
      cta.innerHTML=`<span>${icon('calendar-check-2')} &nbsp; Book an Appointment</span>${icon('arrow-right',18)}`;
      branding.insertAdjacentElement('beforebegin',cta);
    }
    const booking=bookingMode();
    cta.classList.toggle('is-active',Boolean(booking));
    cta.onclick=null;
    if(booking?.type==='native')cta.onclick=openBooking;
    if(booking?.type==='external')cta.onclick=()=>{window.open(booking.href,'_blank','noopener');try{window.track?.('booking_click');}catch(_){ }};
  }

  function enhance(){
    if(!state.enabled)return;
    ensureIdentity();
    ensureAbout();
    markRail(document.getElementById('actions'));
    enhanceSections();
    relocateBooking();
    ensurePrimaryActions();
    ensureBottomBook();
    orderContent();
  }

  document.addEventListener('liw:public-card-ready',event=>activate(event.detail?.card));
  document.addEventListener('liw:public-card-rendered',event=>{activate(event.detail?.card);schedule();});
  document.addEventListener('click',event=>{
    if(!state.enabled)return;
    const nativeLink=event.target.closest?.('[data-liw-native-booking-action],a[href="#booking-v1-section"]');
    if(nativeLink&&nativeBooking()){
      event.preventDefault();event.stopImmediatePropagation();openBooking(event);
    }
  },true);
  document.addEventListener('keydown',event=>{if(state.enabled&&event.key==='Escape')closeBooking();});

  const observer=new MutationObserver(()=>schedule());
  const startObserver=()=>observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','href']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();

  const query=new URLSearchParams(location.search);
  if(lower(query.get('experience'))==='spotlight'||lower(query.get('layout'))==='spotlight'){
    state.enabled=true;html.classList.add('liw-spotlight-experience');
    if(document.body)document.body.classList.add('liw-spotlight-experience');
    else document.addEventListener('DOMContentLoaded',()=>document.body.classList.add('liw-spotlight-experience'),{once:true});
  }
})();