/* LIW Cards staging — public Barbershop theme bridge V2.
   Event-driven only: no polling and no global icon remount. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_BARBERSHOP_STAGING__)return;
  window.__LIW_PUBLIC_BARBERSHOP_STAGING__=true;

  const MODE='barbershop';
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const isBarber=cardData=>String(cardData?.color_mode||'').trim().toLowerCase()===MODE&&String(cardData?.card_experience||'classic').toLowerCase()!=='music';

  function setVars(card,cardData){
    card.style.setProperty('--barber-primary',cardData.primary_color||'#111111');
    card.style.setProperty('--barber-secondary',cardData.secondary_color||'#d4a84f');
    card.style.setProperty('--barber-background',cardData.background_color||'#090909');
    card.style.setProperty('--barber-text',cardData.text_color||'#f8f4e8');
  }

  function ensureBadge(){
    const cover=document.getElementById('public-cover');
    if(!cover||cover.querySelector('.barber-public-badge'))return;
    const badge=document.createElement('div');
    badge.className='barber-public-badge';
    badge.innerHTML='<span class="barber-public-pole" aria-hidden="true"></span><strong>BARBERSHOP</strong>';
    cover.appendChild(badge);
  }

  function relabel(){
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
  }

  function restore(){
    document.documentElement.classList.remove('liw-public-barbershop');
    const card=document.getElementById('card');
    card?.classList.remove('barbershop-card-active');
    document.querySelector('.barber-public-badge')?.remove();
    document.querySelectorAll('[data-barber-original]').forEach(el=>{
      el.textContent=el.dataset.barberOriginal;
      delete el.dataset.barberOriginal;
    });
    document.querySelector('[data-event="booking_click"]')?.classList.remove('barber-book-chair');
  }

  function mount(){
    const cardData=data();
    const card=document.getElementById('card');
    if(!cardData||!card||card.hidden)return false;
    if(!isBarber(cardData)){restore();return true;}
    document.documentElement.classList.add('liw-public-barbershop');
    card.classList.add('barbershop-card-active');
    setVars(card,cardData);
    ensureBadge();
    relabel();
    return true;
  }

  window.addEventListener('liw:card-loader-ready',mount,{passive:true});
  window.addEventListener('load',mount,{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();