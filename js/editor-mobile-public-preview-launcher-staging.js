/* LIW Cards — cards-staging only: reliable mobile launcher for the exact public preview.
   Mobile hides the internal phone completely and keeps only the body-level preview launcher. */
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
        body.editor-page .phone-stage{display:none!important}
        #${ID}{
          position:fixed!important;
          right:12px!important;
          bottom:calc(66px + env(safe-area-inset-bottom,0px))!important;
          z-index:2147482500!important;
          display:inline-flex!important;
          align-items:center!important;
          justify-content:center!important;
          gap:7px!important;
          width:auto!important;
          min-width:0!important;
          min-height:44px!important;
          margin:0!important;
          padding:10px 14px!important;
          border:1px solid rgba(255,255,255,.22)!important;
          border-radius:999px!important;
          background:#0b1438!important;
          color:#fff!important;
          box-shadow:0 10px 28px rgba(11,20,56,.28)!important;
          font:900 .73rem/1 'DM Sans',system-ui,sans-serif!important;
          letter-spacing:0!important;
          white-space:nowrap!important;
          cursor:pointer!important;
          pointer-events:auto!important;
          opacity:1!important;
          visibility:visible!important;
          transform:none!important;
        }
        #${ID} .liw-mobile-preview-icon{font-size:.9rem;line-height:1}
        #${ID}:disabled{opacity:.58!important;cursor:wait!important}
        body.liw-public-preview-open #${ID}{display:none!important}
      }
      @media(min-width:921px){#${ID}{display:none!important}}

      /* Mobile editor chrome: one clean row, no clipped logo/tagline/actions. */
      @media(max-width:600px){
        body.editor-page{overflow-x:hidden!important}
        body.editor-page .editor-topbar{
          width:100%!important;min-height:62px!important;padding:8px 10px!important;
          display:flex!important;align-items:center!important;justify-content:space-between!important;
          gap:8px!important;box-sizing:border-box!important;overflow:hidden!important;
        }
        body.editor-page .editor-topbar-left{
          flex:1 1 auto!important;min-width:0!important;display:flex!important;align-items:center!important;
          gap:8px!important;overflow:hidden!important;
        }
        body.editor-page .editor-topbar-left>.icon-btn{
          width:42px!important;height:42px!important;min-width:42px!important;min-height:42px!important;
          flex:0 0 42px!important;border-radius:13px!important;
        }
        body.editor-page .editor-topbar-left .brand{
          flex:0 1 140px!important;min-width:0!important;max-width:140px!important;overflow:hidden!important;
        }
        body.editor-page .editor-topbar-left .brand-logo{
          display:block!important;width:100%!important;max-width:140px!important;height:40px!important;
          object-fit:contain!important;object-position:left center!important;
        }
        body.editor-page .editor-brand-tagline,
        body.editor-page #save-state,
        body.editor-page #save-now-button,
        body.editor-page #preview-link{display:none!important}
        body.editor-page .editor-topbar-right{flex:0 0 auto!important;min-width:0!important;margin-left:auto!important;gap:0!important}
        body.editor-page #publish-button{
          width:auto!important;min-width:104px!important;min-height:44px!important;padding:0 13px!important;
          gap:7px!important;border-radius:14px!important;font-size:.82rem!important;line-height:1!important;white-space:nowrap!important;
        }
        body.editor-page #publish-button svg{width:17px!important;height:17px!important}

        body.editor-page .editor-shell{
          width:100%!important;max-width:none!important;margin:0!important;padding:10px 10px 116px!important;
          gap:0!important;box-sizing:border-box!important;
        }
        body.editor-page .editor-workspace{
          width:100%!important;min-width:0!important;margin:0!important;padding-bottom:18px!important;
          border-radius:20px!important;box-sizing:border-box!important;
        }
        body.editor-page #editor-flow-summary.editor-flow-summary.guided-setup-bar{
          margin:8px 10px 10px!important;box-sizing:border-box!important;
        }
        body.editor-page .editor-panel{
          min-width:0!important;padding:18px 16px 22px!important;box-sizing:border-box!important;
        }
        body.editor-page .editor-panel>.panel-heading{
          min-width:0!important;margin:0 0 16px!important;padding:0!important;gap:10px!important;
        }
        body.editor-page .editor-panel>.panel-heading h2{
          max-width:100%!important;margin:0!important;font-size:clamp(1.68rem,7.5vw,2rem)!important;
          line-height:1.08!important;letter-spacing:-.04em!important;text-wrap:balance!important;
        }
        body.editor-page .editor-panel>.panel-heading p{
          margin:7px 0 0!important;font-size:.8rem!important;line-height:1.45!important;text-wrap:pretty!important;
        }
        body.editor-page .form-section,
        body.editor-page .social-quick-section{min-width:0!important;margin-bottom:14px!important;box-sizing:border-box!important}
        body.editor-page .form-section{padding:16px!important;border-radius:16px!important}
        body.editor-page .editor-contact-section h3{margin:0 0 12px!important;font-size:1.2rem!important;line-height:1.2!important}
        body.editor-page .contact-fast-note{
          width:100%!important;min-width:0!important;margin:0 0 14px!important;padding:11px 12px!important;
          display:flex!important;align-items:flex-start!important;gap:8px!important;box-sizing:border-box!important;
          font-size:.78rem!important;line-height:1.4!important;white-space:normal!important;overflow:visible!important;
        }
        body.editor-page .contact-fast-note svg{width:17px!important;height:17px!important;flex:0 0 17px!important;margin-top:1px!important}
        body.editor-page .form-row{grid-template-columns:1fr!important;gap:12px!important}
        body.editor-page .form-group,
        body.editor-page .section-mini-heading,
        body.editor-page .section-mini-heading>div{min-width:0!important}
        body.editor-page .input,
        body.editor-page input,
        body.editor-page select,
        body.editor-page textarea{max-width:100%!important;box-sizing:border-box!important}
        body.editor-page .upload-actions,
        body.editor-page .feature-section-heading,
        body.editor-page .section-mini-heading{flex-wrap:wrap!important}

        /* Staging plan QA stays available but becomes a slim swipeable rail. */
        body.editor-page #liw-staging-plan-qa{
          left:8px!important;right:8px!important;bottom:8px!important;width:auto!important;
          max-width:calc(100vw - 16px)!important;max-height:48px!important;min-height:0!important;
          margin:0!important;padding:6px 7px!important;display:flex!important;align-items:center!important;
          flex-wrap:nowrap!important;gap:6px!important;overflow-x:auto!important;overflow-y:hidden!important;
          overscroll-behavior-x:contain!important;scrollbar-width:none!important;white-space:nowrap!important;
          border-radius:14px!important;box-sizing:border-box!important;
        }
        body.editor-page #liw-staging-plan-qa::-webkit-scrollbar{display:none!important}
        body.editor-page #liw-staging-plan-qa>*{flex:0 0 auto!important}
        body.editor-page #liw-staging-plan-qa button{
          min-height:32px!important;padding:6px 10px!important;border-radius:9px!important;
          font-size:.68rem!important;line-height:1!important;white-space:nowrap!important;
        }
      }

      @media(max-width:380px){
        body.editor-page .editor-topbar-left .brand{flex-basis:118px!important;max-width:118px!important}
        body.editor-page .editor-topbar-left .brand-logo{max-width:118px!important}
        body.editor-page #publish-button{min-width:94px!important;padding-inline:11px!important;font-size:.76rem!important}
        body.editor-page .editor-shell{padding-inline:8px!important}
        body.editor-page .editor-panel{padding-inline:14px!important}
        #${ID}{right:9px!important;padding:9px 12px!important;min-height:42px!important;font-size:.69rem!important}
      }
      @media(max-height:520px) and (max-width:920px){
        #${ID}{bottom:calc(62px + env(safe-area-inset-bottom,0px))!important;min-height:40px!important;padding:8px 12px!important}
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

  function syncViewport(){
    const stage=document.querySelector('.phone-stage');
    if(!stage) return;
    if(mobile.matches){
      stage.hidden=true;
      stage.setAttribute('aria-hidden','true');
    }else{
      stage.hidden=false;
      stage.removeAttribute('aria-hidden');
    }
  }

  function syncButton(){
    injectStyles();
    syncViewport();
    let button=document.getElementById(ID);
    if(!button){
      button=document.createElement('button');
      button.id=ID;
      button.type='button';
      button.setAttribute('aria-label','View exact public card preview');
      button.innerHTML='<span class="liw-mobile-preview-icon" aria-hidden="true">↗</span><span>Preview card</span>';
      button.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        if(!openPreview()){
          button.disabled=true;
          button.querySelector('span:last-child').textContent='Preparing…';
          let tries=0;
          const retry=setInterval(()=>{
            tries+=1;
            if(openPreview() || tries>=12){
              clearInterval(retry);
              button.disabled=false;
              button.querySelector('span:last-child').textContent='Preview card';
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
