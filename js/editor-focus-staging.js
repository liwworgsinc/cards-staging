(function(){
  'use strict';

  const STEP_LABELS={
    content:['1','You'],
    links:['2','Contact'],
    design:['3','Design'],
    share:['4','Publish']
  };

  function injectStyles(){
    if(document.getElementById('liw-editor-focus-staging-styles'))return;
    const style=document.createElement('style');
    style.id='liw-editor-focus-staging-styles';
    style.textContent=`
      body.liw-editor-focus-staging .editor-tabs .editor-step-tab-copy small{
        display:none!important;
      }
      body.liw-editor-focus-staging .editor-tabs .editor-tab{
        min-height:54px!important;
        padding-top:9px!important;
        padding-bottom:9px!important;
      }

      body.liw-editor-focus-staging #editor-flow-summary,
      body.liw-editor-focus-staging .editor-flow-summary.guided-setup-bar{
        display:flex!important;
        align-items:center!important;
        min-height:36px!important;
        padding:7px 18px!important;
        gap:0!important;
        background:#f8fafc!important;
        border:0!important;
        border-bottom:1px solid #e5e9f0!important;
        box-shadow:none!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-autosave-note,
      body.liw-editor-focus-staging #editor-flow-summary .editor-promise-line,
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-step-icon,
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current::after,
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current>div{
        display:none!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current{
        display:flex!important;
        align-items:center!important;
        width:auto!important;
        min-width:0!important;
        min-height:0!important;
        padding:0!important;
        gap:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        overflow:visible!important;
      }
      body.liw-editor-focus-staging #editor-flow-kicker{
        display:inline-flex!important;
        align-items:center!important;
        min-height:22px!important;
        margin:0!important;
        padding:4px 8px!important;
        border:1px solid #e2e7ef!important;
        border-radius:999px!important;
        background:#fff!important;
        color:#687089!important;
        font-size:.64rem!important;
        line-height:1!important;
        font-weight:850!important;
        letter-spacing:.045em!important;
        text-transform:uppercase!important;
      }

      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.panel-heading,
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.editor-step-note{
        display:none!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]{
        padding-top:16px!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .quick-identity-section{
        margin-top:0!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .quick-identity-section .section-mini-heading{
        margin-bottom:12px!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .quick-identity-section .section-mini-heading p{
        display:none!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .quick-identity-section .section-mini-heading h3{
        margin:0!important;
        font-size:1rem!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .photo-upload{
        margin-top:14px!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .profile-photo-copy>p.muted{
        display:none!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .profile-photo-copy strong{
        display:block!important;
        margin-bottom:8px!important;
      }
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .form-section,
      body.liw-editor-focus-staging .editor-panel[data-panel="content"] .photo-upload{
        border-radius:16px!important;
      }

      @media(max-width:760px){
        body.liw-editor-focus-staging #editor-flow-summary,
        body.liw-editor-focus-staging .editor-flow-summary.guided-setup-bar{
          min-height:32px!important;
          padding:5px 12px!important;
        }
        body.liw-editor-focus-staging #editor-flow-kicker{
          min-height:20px!important;
          padding:4px 7px!important;
          font-size:.58rem!important;
        }
        body.liw-editor-focus-staging .editor-tabs .editor-step-tab-copy small{
          display:none!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="content"]{
          padding-top:10px!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="content"] .photo-upload{
          margin-top:10px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function activePanel(){
    return document.querySelector('.editor-panel.active')?.dataset.panel||'content';
  }

  function syncStepLabel(){
    const kicker=document.getElementById('editor-flow-kicker');
    if(!kicker)return;
    const step=activePanel();
    const meta=STEP_LABELS[step];
    if(meta)kicker.textContent=`Step ${meta[0]} of 4 · ${meta[1]}`;
    else kicker.textContent='Editor';
  }

  function moveBasicsFirst(){
    const panel=document.querySelector('.editor-panel[data-panel="content"]');
    const identity=panel?.querySelector('.quick-identity-section');
    const photo=panel?.querySelector('.photo-upload');
    if(!panel||!identity||!photo)return;
    if(identity.nextElementSibling!==photo)panel.insertBefore(identity,photo);
  }

  function apply(){
    document.body.classList.add('liw-editor-focus-staging');
    injectStyles();
    moveBasicsFirst();
    syncStepLabel();
  }

  function init(){
    apply();
    document.addEventListener('click',event=>{
      if(event.target.closest('.editor-tab,#editor-step-next,#editor-step-back,[data-editor-jump]')){
        requestAnimationFrame(syncStepLabel);
        setTimeout(syncStepLabel,80);
      }
    });

    const observer=new MutationObserver(()=>requestAnimationFrame(()=>{
      moveBasicsFirst();
      syncStepLabel();
    }));
    document.querySelectorAll('.editor-panel').forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));

    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      apply();
      if(attempts>=24)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
