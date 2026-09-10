/* LIW Cards staging — Barbershop full-screen fixed-identity experience V2. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_BARBERSHOP_V2_STAGING__)return;
  window.__LIW_PUBLIC_BARBERSHOP_V2_STAGING__=true;
  window.__LIW_PUBLIC_BARBERSHOP_STAGING__=true;

  const MODE='barbershop';
  const ACTIONS=[
    {key:'home',label:'Home',icon:'house'},
    {key:'book',label:'Book',icon:'calendar-days'},
    {key:'call',label:'Call',icon:'phone'},
    {key:'text',label:'Text',icon:'message-circle'},
    {key:'services',label:'Cuts',icon:'scissors'},
    {key:'social',label:'Social',icon:'instagram'},
    {key:'location',label:'Shop',icon:'map-pin'},
    {key:'save',label:'Save',icon:'user-round-plus'}
  ];
  let selected='home';
  let shell=null;
  let refreshTimer=0;
  let refreshCount=0;

  function q(sel,scope=document){return scope.querySelector(sel);}
  function qa(sel,scope=document){return [...scope.querySelectorAll(sel)];}
  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function safe(value,max=240){return String(value??'').trim().slice(0,max);}
  function esc(value){return safe(value,1800).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function icon(name,size=18){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function isBarber(cardData){return String(cardData?.color_mode||'').trim().toLowerCase()===MODE&&String(cardData?.card_experience||'classic').toLowerCase()!=='music';}
  function phone(){return safe(data()?.phone,80);}
  function sms(){return safe(data()?.sms_phone||data()?.phone,80);}
  function address(){return safe(data()?.business_address,260);}
  function bookingUrl(){return safe(data()?.booking_url,900);}
  function safeWebUrl(raw){
    const value=safe(raw,1200);if(!value)return '';
    try{const url=new URL(value,location.href);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch(_){return '';}
  }
  function telHref(value){const clean=safe(value,80).replace(/[^0-9+*#,;]/g,'');return clean?`tel:${clean}`:'';}
  function smsHref(value){const clean=safe(value,80).replace(/[^0-9+*#,;]/g,'');return clean?`sms:${clean}`:'';}
  function initials(value){const words=safe(value,100).split(/\s+/).filter(Boolean);return (words.slice(0,2).map(w=>w[0]).join('')||'LI').toUpperCase();}

  function setVars(card,cardData){
    card.style.setProperty('--barber-primary',cardData.primary_color||'#111111');
    card.style.setProperty('--barber-secondary',cardData.secondary_color||'#d4a84f');
    card.style.setProperty('--barber-background',cardData.background_color||'#090909');
    card.style.setProperty('--barber-text',cardData.text_color||'#f8f4e8');
  }

  function ensureCoverIdentity(){
    const cover=q('#public-cover');if(!cover)return;
    let badge=q('.barber-public-badge',cover);
    if(!badge){badge=document.createElement('div');badge.className='barber-public-badge';badge.innerHTML='<span class="barber-public-pole" aria-hidden="true"></span><strong>BARBER CARD</strong>';cover.appendChild(badge);}
    const avatar=q('#avatar',cover);const name=safe(data()?.full_name||data()?.name,120);
    if(avatar&&!avatar.querySelector('img')&&!safe(avatar.style.backgroundImage,800)){const span=q('#avatar-initials',avatar);if(span&&!span.textContent.trim())span.textContent=initials(name);}
  }

  function nativeBookingButton(){
    return q('#booking-v1-section button[data-action="open"],#booking-v1-section .booking-v1-open,[data-event="booking_click"],[data-booking-open],.booking-v1-launch,.public-booking-cta');
  }
  function servicesAvailable(){return qa('#services > *,#booking-v1-section .booking-v1-service-card').some(node=>safe(node.textContent,300));}
  function socialAvailable(){return qa('#socials a,#socials button').length>0;}
  function actionAvailable(key){
    if(key==='home'||key==='save')return true;
    if(key==='book')return Boolean(safeWebUrl(bookingUrl())||nativeBookingButton()||data()?.booking_enabled===true);
    if(key==='call')return Boolean(telHref(phone()));
    if(key==='text')return Boolean(smsHref(sms()));
    if(key==='services')return servicesAvailable();
    if(key==='social')return socialAvailable();
    if(key==='location')return Boolean(address());
    return false;
  }
  function visibleActions(){return ACTIONS.filter(item=>actionAvailable(item.key));}

  function cleanClone(node){
    const clone=node.cloneNode(true);
    clone.removeAttribute?.('id');
    qa('[id]',clone).forEach(el=>el.removeAttribute('id'));
    qa('button',clone).forEach(button=>{button.type='button';});
    return clone;
  }

  function renderServiceContent(stage){
    stage.innerHTML=`<div class="barber-panel-kicker">FRESH CUTS</div><h2>Services & prices</h2><div class="barber-service-list"></div>`;
    const list=q('.barber-service-list',stage);
    const nodes=qa('#services > *').filter(node=>safe(node.textContent,300)).slice(0,4);
    if(!nodes.length){
      const bookingCards=qa('#booking-v1-section .booking-v1-service-card').slice(0,4);
      bookingCards.forEach(node=>list.appendChild(cleanClone(node)));
    }else nodes.forEach(node=>list.appendChild(cleanClone(node)));
    if(!list.children.length)list.innerHTML='<p class="barber-empty">Services will appear here when they are added.</p>';
  }

  function renderSocialContent(stage){
    stage.innerHTML=`<div class="barber-panel-kicker">SOCIAL</div><h2>Follow my work</h2><p class="barber-panel-copy">Stay connected with the barber between visits.</p><div class="barber-social-links"></div>`;
    const holder=q('.barber-social-links',stage);
    qa('#socials a,#socials button').slice(0,8).forEach(node=>holder.appendChild(cleanClone(node)));
    if(!holder.children.length)holder.innerHTML='<p class="barber-empty">Social profiles will appear here when they are added.</p>';
  }

  function homeMarkup(){
    const cardData=data()||{};
    const name=safe(cardData.full_name||cardData.name,140)||'Your Barber';
    const title=safe(cardData.job_title||cardData.title,140)||'Barber';
    const shop=safe(cardData.company_name,140);
    const headline=safe(cardData.headline,180);
    const canBook=actionAvailable('book');
    return `<div class="barber-panel-kicker">${esc(shop||'LIW BARBER CARD')}</div><h1>${esc(name)}</h1><p class="barber-home-title">${esc(title)}</p>${headline?`<div class="barber-status-pill"><span></span>${esc(headline)}</div>`:''}${canBook?`<button type="button" class="barber-primary-cta" data-barber-command="book">${icon('calendar-days',18)}<span>BOOK MY CHAIR</span>${icon('arrow-right',17)}</button>`:''}`;
  }

  function renderPanel(key){
    if(!shell)return;
    const stage=q('.barber-center-stage',shell);if(!stage)return;
    if(!actionAvailable(key))key='home';selected=key;
    stage.dataset.barberView=key;
    if(key==='services')renderServiceContent(stage);
    else if(key==='social')renderSocialContent(stage);
    else if(key==='call')stage.innerHTML=`<div class="barber-panel-icon">${icon('phone',24)}</div><div class="barber-panel-kicker">CALL</div><h2>${esc(phone())}</h2><p class="barber-panel-copy">Tap below to call the chair directly.</p><a class="barber-primary-cta" href="${esc(telHref(phone()))}">${icon('phone-call',18)}<span>CALL NOW</span>${icon('arrow-right',17)}</a>`;
    else if(key==='text')stage.innerHTML=`<div class="barber-panel-icon">${icon('message-circle',24)}</div><div class="barber-panel-kicker">TEXT</div><h2>${esc(sms())}</h2><p class="barber-panel-copy">Questions, confirmations and quick client messages.</p><a class="barber-primary-cta" href="${esc(smsHref(sms()))}">${icon('send',18)}<span>TEXT MY BARBER</span>${icon('arrow-right',17)}</a>`;
    else if(key==='book')stage.innerHTML=`<div class="barber-panel-icon">${icon('calendar-days',24)}</div><div class="barber-panel-kicker">APPOINTMENTS</div><h2>Book My Chair</h2><p class="barber-panel-copy">Pick your service and lock in your next cut.</p><button type="button" class="barber-primary-cta" data-barber-command="book-native">${icon('calendar-check',18)}<span>OPEN BOOKING</span>${icon('arrow-right',17)}</button>`;
    else if(key==='location'){
      const maps=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address())}`;
      stage.innerHTML=`<div class="barber-panel-icon">${icon('map-pin',24)}</div><div class="barber-panel-kicker">THE SHOP</div><h2>${esc(address())}</h2><p class="barber-panel-copy">Get directions to the chair.</p><a class="barber-primary-cta" href="${esc(maps)}" target="_blank" rel="noopener">${icon('navigation',18)}<span>DIRECTIONS</span>${icon('arrow-up-right',17)}</a>`;
    }else if(key==='save')stage.innerHTML=`<div class="barber-panel-icon">${icon('user-round-plus',24)}</div><div class="barber-panel-kicker">KEEP THE CONNECTION</div><h2>Save My Barber</h2><p class="barber-panel-copy">Keep this barber handy for the next cut.</p><button type="button" class="barber-primary-cta" data-barber-command="save">${icon('contact-round',18)}<span>SAVE MY BARBER</span>${icon('arrow-right',17)}</button>`;
    else stage.innerHTML=homeMarkup();
    q('[data-barber-command="book"]',stage)?.addEventListener('click',()=>select('book'));
    q('[data-barber-command="book-native"]',stage)?.addEventListener('click',openBooking);
    q('[data-barber-command="save"]',stage)?.addEventListener('click',()=>q('#save')?.click());
    syncDock();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function openBooking(){
    const native=nativeBookingButton();
    if(native){native.click();return;}
    const url=safeWebUrl(bookingUrl());
    if(url){try{location.href=url;}catch(_){window.open(url,'_blank','noopener');}}
  }

  function cyclicDistance(index,activeIndex,total){
    if(total<=1)return 0;
    let d=index-activeIndex;
    if(d>total/2)d-=total;if(d<-total/2)d+=total;
    return Math.max(-3,Math.min(3,d));
  }
  function syncDock(){
    if(!shell)return;
    const dock=q('.barber-flow-dock',shell);if(!dock)return;
    const items=visibleActions();
    const signature=items.map(item=>item.key).join('|');
    if(dock.dataset.signature!==signature){
      dock.dataset.signature=signature;
      dock.innerHTML=items.map(item=>`<button type="button" data-barber-view="${item.key}" aria-label="${item.label}">${icon(item.icon,19)}<span>${item.label}</span></button>`).join('');
      qa('[data-barber-view]',dock).forEach(button=>button.addEventListener('click',()=>select(button.dataset.barberView)));
    }
    const buttons=qa('[data-barber-view]',dock);let activeIndex=buttons.findIndex(button=>button.dataset.barberView===selected);
    if(activeIndex<0){selected='home';activeIndex=buttons.findIndex(button=>button.dataset.barberView==='home');}
    buttons.forEach((button,index)=>{
      const isActive=index===activeIndex;button.classList.toggle('active',isActive);button.setAttribute('aria-current',isActive?'true':'false');
      button.dataset.distance=String(cyclicDistance(index,activeIndex,buttons.length));
    });
    const activeButton=buttons[activeIndex];
    if(activeButton)setTimeout(()=>activeButton.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}),0);
  }
  function select(key){selected=key;renderPanel(key);}

  function buildShell(){
    const card=q('#card');const cover=q('#public-cover');if(!card||!cover)return false;
    shell=q('.barber-screen-interface',card);
    if(!shell){
      shell=document.createElement('section');shell.className='barber-screen-interface';shell.setAttribute('aria-label','Barbershop card controls');
      shell.innerHTML='<div class="barber-center-stage" aria-live="polite"></div><div class="barber-dock-wrap"><div class="barber-dock-glow" aria-hidden="true"></div><nav class="barber-flow-dock" aria-label="Barber card actions"></nav></div>';
      cover.insertAdjacentElement('afterend',shell);
    }
    renderPanel(selected);return true;
  }

  function relabelBase(){
    const save=q('#save');if(save&&!save.dataset.barberOriginal){save.dataset.barberOriginal=save.innerHTML;save.innerHTML=`${icon('user-round-plus',19)} Save My Barber`;}
    const booking=q('[data-event="booking_click"]');const span=booking?.querySelector('span');if(span&&!span.dataset.barberOriginal){span.dataset.barberOriginal=span.textContent||'Book';span.textContent='Book My Chair';}
  }

  function restore(){
    document.documentElement.classList.remove('liw-public-barbershop');
    document.body.classList.remove('liw-public-barbershop');
    const card=q('#card');card?.classList.remove('barbershop-card-active');
    q('.barber-screen-interface',card||document)?.remove();shell=null;
    q('.barber-public-badge')?.remove();
    const save=q('#save');if(save?.dataset.barberOriginal){save.innerHTML=save.dataset.barberOriginal;delete save.dataset.barberOriginal;}
  }

  function mount(){
    const cardData=data(),card=q('#card');
    if(!cardData||!card)return false;
    if(!isBarber(cardData)){restore();return true;}
    document.documentElement.classList.add('liw-public-barbershop');document.body.classList.add('liw-public-barbershop');card.classList.add('barbershop-card-active');
    setVars(card,cardData);ensureCoverIdentity();relabelBase();buildShell();
    return !card.hidden;
  }

  function startRefresh(){
    if(refreshTimer)return;
    refreshTimer=setInterval(()=>{
      refreshCount+=1;mount();
      if(shell){syncDock();if(refreshCount<18||selected==='services'||selected==='social')renderPanel(selected);}
      if(refreshCount>60){clearInterval(refreshTimer);refreshTimer=0;}
    },250);
  }
  window.LIWBarbershopPublic={mount,select,refresh(){mount();renderPanel(selected);}};
  window.addEventListener('liw:card-loader-ready',()=>{setTimeout(()=>{mount();startRefresh();},0);});
  window.addEventListener('load',()=>{mount();startRefresh();},{once:true});
  mount();startRefresh();
})();
