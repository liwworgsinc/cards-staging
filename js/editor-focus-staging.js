(function(){
  'use strict';

  const DESIGN_META={
    themes:{step:'1 of 4',title:'Choose a theme',icon:'layout-template',status:'Current design'},
    colors:{step:'2 of 4',title:'Set your brand colors',icon:'palette',status:'Live preview on'},
    cover:{step:'3 of 4',title:'Add a cover',icon:'image',status:'Optional'},
    advanced:{step:'4 of 4',title:'Fine-tune the details',icon:'sliders-horizontal',status:'Optional'}
  };

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
      body.liw-editor-focus-staging .editor-brand-tagline span{display:inline-block!important}
      body.liw-editor-focus-staging .editor-brand-tagline span:last-child{color:#fff!important}

      body.liw-editor-focus-staging .editor-tabs{
        border-radius:18px 18px 0 0!important;
        overflow:hidden!important;
        background:#fff!important;
      }
      body.liw-editor-focus-staging .editor-tab{min-height:64px!important;padding:10px 14px!important;gap:8px!important}
      body.liw-editor-focus-staging .editor-tab .editor-step-number{width:26px!important;height:26px!important;min-width:26px!important;font-size:.68rem!important}
      body.liw-editor-focus-staging .editor-tab>svg{width:19px!important;height:19px!important}
      body.liw-editor-focus-staging .editor-step-tab-copy{gap:1px!important}
      body.liw-editor-focus-staging .editor-step-tab-copy strong{font-size:.82rem!important;line-height:1.15!important}
      body.liw-editor-focus-staging .editor-step-tab-copy small{font-size:.61rem!important;line-height:1.22!important;color:#7a8499!important}

      body.liw-editor-focus-staging #editor-flow-summary.editor-flow-summary.guided-setup-bar{
        grid-template-columns:minmax(0,1.55fr) minmax(145px,.56fr) minmax(185px,.72fr)!important;
        gap:8px!important;
        padding:9px 14px!important;
        background:linear-gradient(180deg,#f7f9fc,#f3f6fa)!important;
        border-bottom:1px solid #e2e7ef!important;
      }
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current{grid-template-columns:34px minmax(0,1fr)!important;gap:9px!important;min-height:58px!important;padding:9px 12px!important;border-radius:14px!important;box-shadow:0 5px 16px rgba(11,20,56,.035)!important}
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current::after{width:3px!important}
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-step-icon{width:34px!important;height:34px!important;border-radius:11px!important;box-shadow:0 5px 12px rgba(11,20,56,.12)!important}
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-step-icon>svg{width:16px!important;height:16px!important}
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-kicker{font-size:.55rem!important;letter-spacing:.07em!important}
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current strong{font-size:.82rem!important}
      body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current span:last-child{font-size:.64rem!important;line-height:1.3!important}
      body.liw-editor-focus-staging #editor-flow-summary .editor-autosave-note,
      body.liw-editor-focus-staging #editor-flow-summary .editor-promise-line{min-height:58px!important;padding:9px 10px!important;border-radius:14px!important;gap:7px!important}
      body.liw-editor-focus-staging #editor-flow-summary .editor-autosave-note>svg,
      body.liw-editor-focus-staging #editor-flow-summary .editor-promise-line>svg{width:16px!important;height:16px!important}
      body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy{gap:1px!important}
      body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy strong{font-size:.64rem!important}
      body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy small{font-size:.56rem!important;line-height:1.23!important}

      /* Step 1 should begin with the work, not another explanation block. */
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]{padding-top:14px!important}
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.panel-heading,
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.editor-step-note{display:none!important}
      body.liw-editor-focus-staging .editor-panel[data-panel="content"]>.photo-upload{margin-top:0!important;border:1px solid rgba(11,20,56,.10)!important;box-shadow:0 8px 24px rgba(11,20,56,.04)!important}

      /* DESIGN STUDIO — one clear navigation system, not two competing roadmaps. */
      @media(min-width:901px){
        body.liw-editor-focus-staging .editor-panel[data-panel="design"]>.panel-heading{
          position:relative!important;
          margin-bottom:12px!important;
          padding-top:18px!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"]>.panel-heading::before{
          content:'DESIGN STUDIO';
          position:absolute;
          top:0;
          left:0;
          color:#9a7423;
          font-size:.62rem;
          line-height:1;
          font-weight:950;
          letter-spacing:.105em;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"]>.panel-heading h2{
          margin:0!important;
          color:#0b1438!important;
          font-size:1.36rem!important;
          letter-spacing:-.035em!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"]>.panel-heading p{
          margin:5px 0 0!important;
          color:#778095!important;
          font-size:.8rem!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"] .desktop-design-switcher{
          margin:8px 0 10px!important;
          padding:7px!important;
          gap:7px!important;
          border-radius:15px!important;
          background:linear-gradient(180deg,#fafbfe,#f5f7fb)!important;
          border-color:#e0e5ed!important;
          box-shadow:0 6px 18px rgba(11,20,56,.035)!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"] .desktop-design-switcher button{
          min-height:43px!important;
          padding:9px 12px!important;
          border-radius:10px!important;
          font-size:.72rem!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"] .desktop-design-switcher button.active{
          background:linear-gradient(135deg,#0b1438,#17295a)!important;
          box-shadow:0 5px 13px rgba(11,20,56,.15)!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"] .design-setup-roadmap{
          display:none!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"] .liw-design-context-strip{
          display:flex!important;
          align-items:center!important;
          justify-content:space-between!important;
          gap:14px!important;
          min-height:48px!important;
          margin:0 0 14px!important;
          padding:9px 12px 9px 10px!important;
          border:1px solid rgba(11,20,56,.09)!important;
          border-radius:13px!important;
          background:#fff!important;
          box-shadow:0 5px 16px rgba(11,20,56,.035)!important;
        }
        body.liw-editor-focus-staging .liw-design-context-main{
          display:flex!important;
          align-items:center!important;
          gap:10px!important;
          min-width:0!important;
        }
        body.liw-editor-focus-staging .liw-design-context-icon{
          width:31px!important;
          height:31px!important;
          flex:0 0 31px!important;
          display:grid!important;
          place-items:center!important;
          border-radius:9px!important;
          background:#0b1438!important;
          color:#e8cb79!important;
        }
        body.liw-editor-focus-staging .liw-design-context-icon svg{width:15px!important;height:15px!important}
        body.liw-editor-focus-staging .liw-design-context-copy{display:grid!important;gap:2px!important;min-width:0!important}
        body.liw-editor-focus-staging .liw-design-context-copy small{
          color:#9a7423!important;
          font-size:.57rem!important;
          font-weight:950!important;
          letter-spacing:.065em!important;
          text-transform:uppercase!important;
        }
        body.liw-editor-focus-staging .liw-design-context-copy strong{
          color:#27324a!important;
          font-size:.76rem!important;
          line-height:1.15!important;
        }
        body.liw-editor-focus-staging .liw-design-context-status{
          max-width:42%!important;
          padding:6px 9px!important;
          border:1px solid #e5d6aa!important;
          border-radius:999px!important;
          background:#fff9ea!important;
          color:#77591c!important;
          font-size:.61rem!important;
          line-height:1!important;
          font-weight:850!important;
          white-space:nowrap!important;
          overflow:hidden!important;
          text-overflow:ellipsis!important;
        }
        body.liw-editor-focus-staging .editor-panel[data-panel="design"] .desktop-design-pane.is-active{
          margin-top:0!important;
        }
      }

      @media(max-width:1100px){
        body.liw-editor-focus-staging .editor-brand-tagline{margin-left:6px!important;padding:6px 9px!important;font-size:.66rem!important}
      }
      @media(max-width:980px){
        body.liw-editor-focus-staging #editor-flow-summary.editor-flow-summary.guided-setup-bar{grid-template-columns:minmax(0,1fr) 150px 185px!important}
      }
      @media(max-width:760px){
        body.liw-editor-focus-staging .editor-brand-tagline{gap:3px!important;margin-left:3px!important;padding:5px 7px!important;font-size:.55rem!important;letter-spacing:0!important;box-shadow:0 4px 10px rgba(11,20,56,.12)!important}
        body.liw-editor-focus-staging .editor-tab{min-height:55px!important;padding:8px 7px!important;gap:5px!important}
        body.liw-editor-focus-staging .editor-tab .editor-step-number{width:23px!important;height:23px!important;min-width:23px!important;font-size:.6rem!important}
        body.liw-editor-focus-staging .editor-tab>svg{display:none!important}
        body.liw-editor-focus-staging .editor-step-tab-copy strong{font-size:.68rem!important}
        body.liw-editor-focus-staging .editor-step-tab-copy small{display:none!important}
        body.liw-editor-focus-staging #editor-flow-summary.editor-flow-summary.guided-setup-bar{display:grid!important;grid-template-columns:1fr auto!important;gap:6px!important;padding:7px 9px!important}
        body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current{grid-column:1/-1!important;grid-template-columns:30px minmax(0,1fr)!important;min-height:50px!important;padding:8px 10px!important;border-radius:12px!important}
        body.liw-editor-focus-staging #editor-flow-summary .editor-flow-step-icon{width:30px!important;height:30px!important;border-radius:10px!important}
        body.liw-editor-focus-staging #editor-flow-summary .editor-flow-current span:last-child{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
        body.liw-editor-focus-staging #editor-flow-summary .editor-autosave-note,
        body.liw-editor-focus-staging #editor-flow-summary .editor-promise-line{min-height:38px!important;padding:7px 9px!important;border-radius:11px!important}
        body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy small{display:none!important}
        body.liw-editor-focus-staging #editor-flow-summary .guided-status-copy strong{font-size:.59rem!important}
        body.liw-editor-focus-staging .editor-panel[data-panel="content"]{padding-top:10px!important}
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

  function selectedThemeName(){
    const named=document.getElementById('desktop-selected-theme-name')?.textContent?.trim();
    if(named&&named!=='Custom design')return named;
    const summary=document.getElementById('template-selected-summary')?.textContent?.trim();
    return summary||'Custom design';
  }

  function activeDesignTarget(){
    return document.querySelector('.desktop-design-switcher [data-design-target].active')?.dataset.designTarget||'themes';
  }

  function syncDesignContext(){
    const strip=document.querySelector('.liw-design-context-strip');
    if(!strip)return;
    const target=activeDesignTarget();
    const meta=DESIGN_META[target]||DESIGN_META.themes;
    const icon=strip.querySelector('.liw-design-context-icon');
    const step=strip.querySelector('[data-design-context-step]');
    const title=strip.querySelector('[data-design-context-title]');
    const status=strip.querySelector('[data-design-context-status]');
    if(icon&&icon.dataset.icon!==meta.icon){icon.dataset.icon=meta.icon;icon.innerHTML=`<i data-lucide="${meta.icon}"></i>`;}
    if(step)step.textContent=meta.step;
    if(title)title.textContent=meta.title;
    if(status){
      if(target==='themes')status.textContent=selectedThemeName();
      else status.textContent=meta.status;
    }
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function enhanceDesignStudio(){
    const panel=document.querySelector('.editor-panel[data-panel="design"]');
    if(!panel)return;
    const heading=panel.querySelector(':scope > .panel-heading');
    if(heading){
      const h2=heading.querySelector('h2');
      const p=heading.querySelector('p');
      if(h2)h2.textContent='Design your card';
      if(p)p.textContent='Choose a theme, then fine-tune colors, cover and details.';
    }
    const nav=panel.querySelector('.desktop-design-switcher');
    if(!nav)return;
    let strip=panel.querySelector('.liw-design-context-strip');
    if(!strip){
      strip=document.createElement('div');
      strip.className='liw-design-context-strip';
      strip.innerHTML=`<div class="liw-design-context-main"><span class="liw-design-context-icon"><i data-lucide="layout-template"></i></span><span class="liw-design-context-copy"><small data-design-context-step>1 of 4</small><strong data-design-context-title>Choose a theme</strong></span></div><span class="liw-design-context-status" data-design-context-status>Custom design</span>`;
      nav.insertAdjacentElement('afterend',strip);
    }
    syncDesignContext();
  }

  function apply(){
    document.body.classList.add('liw-editor-focus-staging');
    injectStyles();
    styleSlogan();
    restoreOriginalContentOrder();
    enhanceDesignStudio();
  }

  function init(){
    apply();
    document.addEventListener('click',event=>{
      if(event.target.closest('.desktop-design-switcher [data-design-target],.template-card,.desktop-theme-browse')){
        requestAnimationFrame(()=>setTimeout(()=>{enhanceDesignStudio();syncDesignContext();},30));
      }
    });
    const themeName=document.getElementById('template-selected-summary');
    if(themeName)new MutationObserver(()=>requestAnimationFrame(syncDesignContext)).observe(themeName,{childList:true,subtree:true,characterData:true});
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      apply();
      if(attempts>=28)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
