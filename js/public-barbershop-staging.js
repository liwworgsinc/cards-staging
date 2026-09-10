/* LIW Cards staging — public Barbershop theme bridge V3.
   Event-driven only: profile badge + LIW Wallet top action, no polling/icon remount. */
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
    const avatar=document.getElementById('avatar');
    if(!avatar)return;
    let badge=document.querySelector('.barber-public-badge');
    if(!badge){
      badge=document.createElement('div');
      badge.className='barber-public-badge';
      badge.innerHTML='<span class="barber-public-pole" aria-hidden="true"></span><strong>BARBERSHOP</strong>';
    }
    if(badge.parentElement!==avatar)avatar.appendChild(badge);
  }

  function walletIcon(){
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5h14.5A2.5 2.5 0 0 1 21 10v8a2.5 2.5 0 0 1-2.5 2.5h-14A2.5 2.5 0 0 1 2 18V6a2.5 2.5 0 0 1 2.5-2.5H17"/><path d="M2.5 7.5H17"/><path d="M16 12h5v4h-5a2 2 0 0 1 0-4Z"/><circle cx="17.5" cy="14" r=".6" fill="currentColor" stroke="none"/></svg>';
  }

  function saveToWallet(){
    try{
      if(typeof window.LIWRolodex?.save==='function'){
        window.LIWRolodex.save({source:'barbershop_wallet_top'});
        return;
      }
      if(typeof window.LIWRolodexPublicSave==='function'){
        window.LIWRolodexPublicSave();
        return;
      }
    }catch(_){ }
    try{window.toast?.('LIW Wallet is still loading. Try again.');}catch(_){ }
  }

  function ensureWalletTopAction(){
    const actions=document.querySelector('#public-cover .public-top-actions');
    const qr=document.getElementById('qr-top');
    if(!actions||!qr)return;
    let button=document.getElementById('barber-wallet-top');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.id='barber-wallet-top';
      button.className='public-round-btn barber-wallet-top';
      button.setAttribute('aria-label','Save to LIW Wallet');
      button.title='Save to LIW Wallet';
      button.innerHTML=walletIcon();
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        saveToWallet();
      });
    }
    if(button.parentElement!==actions||qr.nextElementSibling!==button)qr.insertAdjacentElement('afterend',button);
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
    document.getElementById('barber-wallet-top')?.remove();
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
    ensureWalletTopAction();
    relabel();
    return true;
  }

  window.addEventListener('liw:card-loader-ready',mount,{passive:true});
  window.addEventListener('load',mount,{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();