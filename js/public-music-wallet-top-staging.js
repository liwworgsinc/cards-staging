/* LIW Cards staging — Music-only LIW Wallet top action.
   Repurposes the former Add-to-Home-Screen shortcut without touching the
   existing Share or QR handlers. Add to Home Screen remains inside Share. */
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

  function relabel(){
    if(!isMusic())return false;
    const button=document.getElementById('music-save-home-top');
    if(!button)return false;

    button.dataset.liwWalletTop='true';
    button.setAttribute('aria-label','Save to LIW Wallet');
    button.title='Save to LIW Wallet';

    if(button.dataset.liwWalletVisual!=='true'){
      button.dataset.liwWalletVisual='true';
      button.innerHTML='<i data-lucide="wallet" size="19"></i>';
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
    return true;
  }

  function invokeWalletSave(){
    if(typeof window.LIWRolodexPublicSave==='function'){
      window.LIWRolodexPublicSave();
      return true;
    }

    const legacy=document.getElementById('liw-rolodex-public-button');
    if(legacy){
      legacy.click();
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

  document.addEventListener('click',event=>{
    if(!isMusic())return;
    const target=event.target instanceof Element?event.target.closest('#music-save-home-top'):null;
    if(!target)return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openWallet();
  },true);

  let tries=0;
  const timer=setInterval(()=>{
    tries+=1;
    if(relabel()||tries>100)clearInterval(timer);
  },80);

  const observer=new MutationObserver(()=>{relabel();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  relabel();
})();
