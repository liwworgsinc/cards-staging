/* LIW Cards — staging-only bootstrap for the Admin Scroll Lab. */
(function(){
  'use strict';
  const params=new URLSearchParams(window.location.search);
  if(params.get('liwAdminScroll')!=='1')return;
  if(window.__LIW_ADMIN_SCROLL_BOOTSTRAP__)return;
  window.__LIW_ADMIN_SCROLL_BOOTSTRAP__=true;

  function ready(){
    const card=document.getElementById('card');
    const name=(document.getElementById('name')?.textContent||'').trim();
    return Boolean(card&&!card.hidden&&name);
  }

  function load(){
    if(document.querySelector('script[data-liw-admin-scroll-lab]'))return;
    const script=document.createElement('script');
    script.src='js/public-admin-scroll-lab-staging.js?v=20260912-admin-scroll-1';
    script.dataset.liwAdminScrollLab='true';
    document.body.appendChild(script);
  }

  if(ready())return load();

  const observer=new MutationObserver(()=>{
    if(!ready())return;
    observer.disconnect();
    load();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true});

  setTimeout(()=>{
    observer.disconnect();
    if(ready())load();
  },6500);
})();
