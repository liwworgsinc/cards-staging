(function(){
  'use strict';

  function injectStyles(){
    if(document.getElementById('liw-editor-focus-staging-styles'))return;
    const style=document.createElement('style');
    style.id='liw-editor-focus-staging-styles';
    style.textContent=`
      /* STAGING ONLY — premium compact editor chrome. */
      body.liw-editor-focus-staging .editor-brand-tagline{
        display:inline-flex!important;
        align-items:center!important;
        gap:5px!important;
        margin-left:10px!important;
        padding:7px 11px!important;
        border:1px solid rgba(212,168,79,.48)!important;
        border-radius:999px!important;
        background:linear-gradient(135deg,#0b1438 0%,#17295a 100%)!important;
        color:#f2d98e!important;
        box-shadow:0 7px 18px rgba(11,20,56,.14),inset 0 1px 0 rgba(255,255,255,.08)!important;
        font-family:'Manrope',sans-serif!important;
        font-size:.75rem!important;
        line-height:1!important;
        font-weight:900!important;
        letter-spacing:.02em!important;
        white-space:nowrap!important;
      }
      body.liw-editor-focus-staging .editor-brand-tagline span{
        display:inline-block!important;
      }
      body.liw-editor-focus-staging .editor-brand-tagline span:last-child{
        color:#fff!important;
      }

      body.liw-editor-focus-staging .editor-tabs{
        border-radius:18px 18px 0 0!important;
        overflow:hidden!important;
        background:#fff!important;
      }
      body.liw-editor-focus-staging .editor-tab{
        min-height:64px!important;
        padding:10px 14px!important;
        gap:8px!important;
      }
      body.liw-editor-focus-staging .editor-tab .editor-step-number{
        width:26px!important;
        height:26px!important;
        min-width:26px!important;
        font-size:.68rem!important;
      }
      body.liw-editor-focus-staging .editor-tab>svg{
        width:19px!important;
        height:19px!important;
      }
      body.liw-editor-focus-staging .editor-step-tab-copy{
        gap:1px!important;
      }
      body.liw-editor-focus-staging .editor-step-tab-copy strong{
        font-size:.82rem!important;
        line-height:1.15!important;
      }
      body.liw-editor-focus-staging .editor-step-tab-copy small{
        font-size:.61rem!important;
        line-height:1.22!important;
        color:#7a8499!important;
      }

      body.liw-editor-focus-staging #editor-flow-summary.editor-flow-summary.guided-setup-bar{
        grid-template-columns:minmax(0,1.55fr) minmax(145px,.56fr) minmax(185px,.72fr)!important;
        gap:8px!important;
        padding:9px 14px!important;
        background:linear-gradient(180deg,#f7f9fc,#f3f6fa)!important;
        border-bottom:1px solid #e2e7ef!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current{
        grid-template-columns:34px minmax(0,1fr)!important;
        gap:9px!important;
        min-height:58px!important;
        padding:9px 12px!important;
        border-radius:14px!important;
        box-shadow:0 5px 16px rgba(11,20,56,.035)!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current::after{
        width:3px!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-step-icon{
        width:34px!important;
        height:34px!important;
        border-radius:11px!important;
        box-shadow:0 5px 12px rgba(11,20,56,.12)!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-step-icon>svg{
        width:16px!important;
        height:16px!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-kicker{
        font-size:.55rem!important;
        letter-spacing:.07em!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current strong{
        font-size:.82rem!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current span:last-child{
        font-size:.64rem!important;
        line-height:1.3!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-autosave-note,
      body.liw-editor-focus-staging #editor-flow-summary .editor-promise-line{
        min-height:58px!important;
        padding:9px 10px!important;
        border-radius:14px!important;
        gap:7px!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-autosave-note>svg,
      body.liw-editor-focus-staging #editor-flow-summary .editor-promise-line>svg{
        width:16px!important;
        height:16px!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy{
        gap:1px!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy strong{
        font-size:.64rem!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy small{
        font-size:.56rem!important;
        line-height:1.23!important;
      }

      /* Keep the first panel premium but stop stacking large intro blocks. */
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.panel-heading{
        margin-bottom:10px!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.panel-heading h2{
        font-size:1.28rem!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.panel-heading p{
        margin-top:3px!important;
        font-size:.82rem!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.editor-step-note{
        margin:0 0 12px!important;
        padding:10px 12px!important;
        border-radius:13px!important;
        min-height:0!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.editor-step-note>svg{
        width:16px!important;
        height:16px!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.editor-step-note strong{
        font-size:.72rem!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.editor-step-note span{
        font-size:.64rem!important;
        line-height:1.3!important;
      }

      @media(max-width:1100px){
        body.liw-editor-focus-staging .editor-brand-tagline{
          margin-left:6px!important;
          padding:6px 9px!important;
          font-size:.66rem!important;
        }
      }

      @media(max-width:980px){
        body.liw-editor-focus-staging #editor-flow-summary.editor-flow-summary.guided-setup-bar{
          grid-template-columns:minmax(0,1fr) 150px 185px!important;
        }
      }

      @media(max-width:760px){
        body.liw-editor-focus-staging .editor-brand-tagline{
          gap:3px!important;
          margin-left:3px!important;
          padding:5px 7px!important;
          font-size:.55rem!important;
          letter-spacing:0!important;
          box-shadow:0 4px 10px rgba(11,20,56,.12)!important;
        }
        body.liw-editor-focus-staging .editor-tab{
          min-height:55px!important;
          padding:8px 7px!important;
          gap:5px!important;
        }
        body.liw-editor-focus-staging .editor-tab .editor-step-number{
          width:23px!important;
          height:23px!important;
          min-width:23px!important;
          font-size:.6rem!important;
        }
        body.liw-editor-focus-staging .editor-tab>svg{display:none!important}
        body.liw-editor-focus-staging .editor-step-tab-copy strong{font-size:.68rem!important}
        body.liw-editor-focus-staging .editor-step-tab-copy small{display:none!important}

        body.liw-editor-focus-staging #editor-flow-summary.editor-flow-summary.guided-setup-bar{
          display:grid!important;
          grid-template-columns:1fr auto!important;
          gap:6px!important;
          padding:7px 9px!important;
        }
        body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current{
          grid-column:1/-1!important;
          grid-template-columns:30px minmax(0,1fr)!important;
          min-height:50px!important;
          padding:8px 10px!important;
          border-radius:12px!important;
        }
        body.liw-editor-focus-staging #editor-flow-summary .editor-flow-step-icon{
          width:30px!important;
          height:30px!important;
          border-radius:10px!important;
        }
        body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current span:last-child{
          white-space:nowrap!important;
          overflow:hidden!important;
          text-overflow:ellipsis!important;
        }
        body.liw-editor-focus-staging #editor-flow-summary .editor-autosave-note,
        body.liw-editor-focus-staging #editor-flow-summary .editor-promise-line{
          min-height:38px!important;
          padding:7px 9px!important;
          border-radius:11px!important;
        }
        body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy small{display:none!important}
        body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy strong{font-size:.59rem!important}
      }
    `;
    document.head.appendChild(style);
  }

  function styleSlogan(){
    const slogan=document.querySelector('.editor-brand-tagline');
    if(!slogan)return;
    if(slogan.dataset.liwSloganStyled==='true')return;
    slogan.dataset.liwSloganStyled='true';
    slogan.setAttribute('aria-label','Build. Share. Grow. Earn.');
    slogan.innerHTML='<span>Build.</span><span>Share.</span><span>Grow.</span><span>Earn.</span>';
  }

  function restoreOriginalContentOrder(){
    const panel=document.querySelector('.editor-panel[data-panel="content"]');
    const identity=panel?.querySelector('.quick-identity-section');
    const photo=panel?.querySelector('.photo-upload');
    if(!panel||!identity||!photo)return;
    if(photo.nextElementSibling!==identity)panel.insertBefore(photo,identity);
  }

  function apply(){
    document.body.classList.add('liw-editor-focus-staging');
    injectStyles();
    styleSlogan();
    restoreOriginalContentOrder();
  }

  function init(){
    apply();
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      apply();
      if(attempts>=20)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
