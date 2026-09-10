/* LIW Cards staging — public Barbershop theme bridge. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_BARBERSHOP_STAGING__)return;
  window.__LIW_PUBLIC_BARBERSHOP_STAGING__=true;

  const MODE='barbershop';
  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isBarber(cardData){return String(cardData?.color_mode||'').trim().toLowerCase()===MODE&&String(cardData?.card_experience||'classic').toLowerCase()!=='music';}
  function setVars(card,cardData){
    const primary=cardData.primary_color||'#111111';
    const secondary=cardData.secondary_color||'#d4a84f';
    const background=cardData.background_color||'#090909';
    const text=cardData.text_color||'#f8f4e8';
    card.style.setProperty('--barber-primary',primary);
    card.style.setProperty('--barber-secondary',secondary);
    card.style.setProperty('--barber-background',background);
    card.style.setProperty('--barber-text',text);
  }
  function ensureBadge(){
    const cover=document.getElementById('public-cover');if(!cover)return;
    let badge=cover.querySelector('.barber-public-badge');
    if(!badge){
      badge=document.createElement('div');
      badge.className='barber-public-badge';
      badge.innerHTML='<span class="barber-public-pole" aria-hidden="true"></span><strong>BARBERSHOP</strong>';
      cover.appendChild(badge);
    }
  }
  function relabel(){
    const save=document.getElementById('save');
    if(save&&!save.dataset.barberOriginal){
      save.dataset.barberOriginal=save.innerHTML;
      save.innerHTML='<i data-lucide="user-round-plus" size="19"></i> Save My Barber';
    }
    const booking=document.querySelector('[data-event="booking_click"]');
    if(booking){
      const span=booking.querySelector('span');
      if(span){
        if(!span.dataset.barberOriginal)span.dataset.barberOriginal=span.textContent||'Book an appointment';
        span.textContent='Book My Chair';
      }
      booking.classList.add('barber-book-chair');
    }
    const services=document.querySelector('#services-section .public-section-heading span');
    if(services){
      if(!services.dataset.barberOriginal)services.dataset.barberOriginal=services.textContent||'How I can help';
      services.textContent='Cuts · grooming · style';
    }
    const social=document.querySelector('#social-section .public-section-heading h2');
    if(social){
      if(!social.dataset.barberOriginal)social.dataset.barberOriginal=social.textContent||'Connect with me';
      social.textContent='Follow My Work';
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }
  function restore(){
    document.documentElement.classList.remove('liw-public-barbershop');
    const card=document.getElementById('card');card?.classList.remove('barbershop-card-active');
    document.querySelector('.barber-public-badge')?.remove();
    const save=document.getElementById('save');
    if(save?.dataset.barberOriginal){save.innerHTML=save.dataset.barberOriginal;delete save.dataset.barberOriginal;}
    document.querySelectorAll('[data-barber-original]').forEach(el=>{el.textContent=el.dataset.barberOriginal;delete el.dataset.barberOriginal;});
    document.querySelector('[data-event="booking_click"]')?.classList.remove('barber-book-chair');
  }
  function mount(){
    const cardData=data(),card=document.getElementById('card');
    if(!cardData||!card||card.hidden)return false;
    if(!isBarber(cardData)){restore();return true;}
    document.documentElement.classList.add('liw-public-barbershop');
    card.classList.add('barbershop-card-active');
    setVars(card,cardData);
    ensureBadge();
    relabel();
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{tries++;if(mount()||tries>120)clearInterval(timer);},100);
  window.addEventListener('liw:card-loader-ready',()=>setTimeout(mount,0));
  mount();
})();