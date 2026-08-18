/* LIW Cards — cards-staging only: reliable mobile launcher for the exact public preview.
   Keeps the launcher outside .phone-stage so legacy preview positioning cannot push it off-screen. */
(function(){
  'use strict';
  if(window.__LIW_MOBILE_PUBLIC_PREVIEW_LAUNCHER__) return;
  window.__LIW_MOBILE_PUBLIC_PREVIEW_LAUNCHER__=true;

  const ID='liw-mobile-public-preview-launcher';
  const STYLE_ID='liw-mobile-public-preview-launcher-css';
  const mobile=window.matchMedia('(max-width: 920px)');

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      @media(max-width:920px){
        body > .phone-stage{display:none!important}
        #${ID}{
          position:fixed!important;
          right:14px!important;
          bottom:calc(116px + env(safe-area-inset-bottom,0px))!important;
          z-index:2147482500!important;
          display:inline-flex!important;
          align-items:center!important;
          justify-content:center!important;
          gap:8px!important;
          min-width:190px!important;
          min-height:50px!important;
          margin:0!important;
          padding:12px 17px!important;
          border:1px solid rgba(255,255,255,.22)!important;
          border-radius:999px!important;
          background:#0b1438!important;
          color:#fff!important;
          box-shadow:0 16px 38px rgba(11,20,56,.34)!important;
          font:900 .78rem/1 'DM Sans',system-ui,sans-serif!important;
          letter-spacing:0!important;
          cursor:pointer!important;
          pointer-events:auto!important;
          opacity:1!important;
          visibility:visible!important;
          transform:none!important;
        }
        #${ID} .liw-mobile-preview-icon{font-size:1rem;line-height:1}
        #${ID}:disabled{opacity:.58!important;cursor:wait!important}
        body.liw-public-preview-open #${ID}{display:none!important}
      }
      @media(min-width:921px){#${ID}{display:none!important}}
      @media(max-width:540px){
        #${ID}{right:10px!important;bottom:calc(112px + env(safe-area-inset-bottom,0px))!important;min-width:176px!important}
      }
      @media(max-height:520px) and (max-width:920px){
        #${ID}{bottom:calc(104px + env(safe-area-inset-bottom,0px))!important;min-height:46px!important;padding:10px 14px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function cardHasSlug(){
    return Boolean(String(document.querySelector('[name="slug"]')?.value||'').trim());
  }

  function openPreview(){
    const api=window.LIWPublicCardFrameStaging;
    if(api && typeof api.open==='function' && cardHasSlug()){
      api.open();
      return true;
    }
    return false;
  }

  function syncButton(){
    injectStyles();
    let button=document.getElementById(ID);
    if(!button){
      button=document.createElement('button');
      button.id=ID;
      button.type='button';
      button.setAttribute('aria-label','View exact public card preview');
      button.innerHTML='<span class="liw-mobile-preview-icon" aria-hidden="true">↗</span><span>View public preview</span>';
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        if(!openPreview()){
          button.disabled=true;
          button.querySelector('span:last-child').textContent='Preparing preview…';
          let tries=0;
          const retry=setInterval(()=>{
            tries+=1;
            if(openPreview() || tries>=12){
              clearInterval(retry);
              button.disabled=false;
              button.querySelector('span:last-child').textContent='View public preview';
            }
          },250);
        }
      });
      document.body.appendChild(button);
    }
    button.hidden=!mobile.matches;
    button.disabled=mobile.matches && !cardHasSlug();
    button.title=button.disabled?'Save this card once, then preview it.':'View the exact public card';
    return button;
  }

  function boot(){
    syncButton();
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      syncButton();
      if((window.LIWPublicCardFrameStaging && cardHasSlug()) || tries>=30) clearInterval(timer);
    },350);
  }

  mobile.addEventListener?.('change',syncButton);
  document.addEventListener('input',event=>{
    if(event.target instanceof Element && event.target.matches('[name="slug"]')) syncButton();
  });
  window.addEventListener('pageshow',syncButton,{passive:true});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
