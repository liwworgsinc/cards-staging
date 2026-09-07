/* LIW Cards staging — Music-only LIW Wallet top action.
   Mobile-safe bounded mounting; Share and QR stay untouched. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_WALLET_TOP__)return;
  window.__LIW_MUSIC_WALLET_TOP__=true;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function invoke(){
    if(typeof window.LIWRolodex?.save==='function'){window.LIWRolodex.save({source:'music_wallet_top'});return true;}
    if(typeof window.LIWRolodexPublicSave==='function'){window.LIWRolodexPublicSave();return true;}
    return false;
  }
  function openWallet(){
    if(invoke())return;let tries=0;const timer=setInterval(()=>{tries++;if(invoke()||tries>=32){clearInterval(timer);if(tries>=32)window.toast?.('LIW Wallet is still loading. Try again.');}},90);
  }
  function mount(){
    if(!isMusic())return false;const current=document.getElementById('music-save-home-top');if(!current)return false;if(current.dataset.liwWalletTop==='true')return true;
    const button=current.cloneNode(false);button.dataset.liwWalletTop='true';button.setAttribute('aria-label','Save to LIW Wallet');button.title='Save to LIW Wallet';button.innerHTML='<i data-lucide="wallet" size="19"></i>';
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openWallet();});current.replaceWith(button);if(window.lucide)try{lucide.createIcons();}catch(_){ }return true;
  }
  [0,80,180,360,700,1200,2000,3200,5000].forEach(delay=>setTimeout(mount,delay));
  document.addEventListener('liw:card-loader-ready',()=>setTimeout(mount,50));window.addEventListener('pageshow',()=>setTimeout(mount,80),{once:true});
})();

/* Music-only modular performer actions v2. */
(function loadArtistPerformerModulesV2(){
  if(document.querySelector('script[data-liw-public-artist-performer-modules-v2]'))return;
  const script=document.createElement('script');script.src='js/public-artist-performer-modules-v2-staging.js?v=20260907-mobilefix-1';script.defer=true;script.dataset.liwPublicArtistPerformerModulesV2='true';document.body.appendChild(script);
})();
