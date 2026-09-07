/* LIW Cards staging — Music-only LIW Wallet top action.
   Replaces the former Add-to-Home-Screen shortcut without touching Share or QR.
   Add to Home Screen remains available inside the existing Share flow. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_WALLET_TOP__)return;
  window.__LIW_MUSIC_WALLET_TOP__=true;

  function cardData(){
    try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}
  }

  function isMusic(){
    return String(cardData()?.card_experience||'').toLowerCase()==='music';
  }

  function invokeWalletSave(){
    if(typeof window.LIWRolodex?.save==='function'){
      window.LIWRolodex.save({source:'music_wallet_top'});
      return true;
    }
    if(typeof window.LIWRolodexPublicSave==='function'){
      window.LIWRolodexPublicSave();
      return true;
    }
    return false;
  }

  function openWallet(){
    if(invokeWalletSave())return;
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(invokeWalletSave()||attempts>=40){
        clearInterval(timer);
        if(attempts>=40)window.toast?.('LIW Wallet is still loading. Try again.');
      }
    },75);
  }

  function mount(){
    if(!isMusic())return false;
    const current=document.getElementById('music-save-home-top');
    if(!current)return false;
    if(current.dataset.liwWalletTop==='true')return true;

    /* Clone once so the old Add-to-Home-Screen click listener attached by
       public-music-grid-labels-staging.js is discarded instead of intercepted. */
    const button=current.cloneNode(false);
    button.dataset.liwWalletTop='true';
    button.setAttribute('aria-label','Save to LIW Wallet');
    button.title='Save to LIW Wallet';
    button.innerHTML='<i data-lucide="wallet" size="19"></i>';
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      openWallet();
    });
    current.replaceWith(button);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries+=1;
    if(mount()||tries>100)clearInterval(timer);
  },80);

  const observer=new MutationObserver(()=>{mount();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  mount();
})();
