(function(){
  const stepMeta={
    content:{icon:'user-round'},
    links:{icon:'phone-call'},
    design:{icon:'palette'},
    tools:{icon:'briefcase-business'},
    share:{icon:'rocket'}
  };
  const mobileStepOrder=['content','links','design','share'];
  const mobileStepLabels=['You','Contact','Design','Publish'];

  function activePanelName(){
    return document.querySelector('.editor-panel.active')?.dataset.panel||'content';
  }

  function enhanceMobileStepper(){
    const track=document.querySelector('.fast-setup-track');
    if(!track)return;
    track.removeAttribute('aria-hidden');
    track.querySelectorAll('.fast-track-item').forEach((item,index)=>{
      const panel=mobileStepOrder[index];
      if(!panel)return;
      item.dataset.editorJump=panel;
      item.setAttribute('role','button');
      item.setAttribute('tabindex','0');
      item.setAttribute('aria-label',`Go to step ${index+1}: ${mobileStepLabels[index]}`);
      item.style.cursor='pointer';
      item.style.touchAction='manipulation';
    });
  }

  function upgradeStatusCards(summary){
    const autosave=summary.querySelector('.editor-autosave-note');
    const promise=summary.querySelector('.editor-promise-line');
    if(autosave&&!autosave.querySelector('.guided-status-copy')){
      autosave.innerHTML='<i data-lucide="cloud-check" size="18"></i><span class="guided-status-copy"><strong>Autosave on</strong><small>Changes save automatically to the LIW server</small></span>';
    }
    if(promise&&!promise.querySelector('.guided-status-copy')){
      promise.innerHTML='<i data-lucide="timer" size="18"></i><span class="guided-status-copy"><strong>Fast setup</strong><small>Name · one contact method · design · publish</small></span>';
    }
  }

  function syncGuidance(){
    const summary=document.getElementById('editor-flow-summary');
    if(!summary)return;
    summary.classList.add('guided-setup-bar');
    const step=activePanelName();
    summary.dataset.editorStep=step;
    const current=summary.querySelector('.editor-flow-current');
    if(current&&!current.querySelector('.editor-flow-step-icon')){
      const marker=document.createElement('span');
      marker.className='editor-flow-step-icon';
      marker.setAttribute('aria-hidden','true');
      current.prepend(marker);
    }
    const marker=current?.querySelector('.editor-flow-step-icon');
    const icon=stepMeta[step]?.icon||'sparkles';
    if(marker&&marker.dataset.icon!==icon){
      marker.dataset.icon=icon;
      marker.innerHTML=`<i data-lucide="${icon}" size="19"></i>`;
    }
    upgradeStatusCards(summary);
    if(window.lucide)window.lucide.createIcons();
  }

  function roadmapMarkup(){
    return `<div class="design-setup-roadmap" id="design-setup-roadmap">
      <div class="design-setup-roadmap-head">
        <div><span>Design studio</span><strong>Build the look in three quick choices</strong><p>Pick the layout first, choose Classic or Flow second, then finish the brand colors.</p></div>
        <div class="design-setup-roadmap-status" id="design-roadmap-status">Ready when you are</div>
      </div>
      <div class="design-setup-roadmap-steps">
        <button class="design-roadmap-step" data-design-jump="template" type="button"><span>1</span><div><strong>Choose template</strong><small id="roadmap-template-copy">Pick your base layout</small></div></button>
        <button class="design-roadmap-step" data-design-jump="experience" type="button"><span>2</span><div><strong>Classic or Flow</strong><small id="roadmap-experience-copy">Choose how customers browse</small></div></button>
        <button class="design-roadmap-step" data-design-jump="brand" type="button"><span>3</span><div><strong>Brand it</strong><small id="roadmap-brand-copy">Colors, cover and details</small></div></button>
      </div>
    </div>`;
  }

  function addStage(section,label,className){
    if(!section)return;
    section.classList.add('design-stage-card',className);
    section.dataset.designStageLabel=label;
  }

  function enhanceDesign(){
    const design=document.querySelector('.editor-panel[data-panel="design"]');
    if(!design)return;
    const heading=design.querySelector('.panel-heading');
    if(heading&&!document.getElementById('design-setup-roadmap'))heading.insertAdjacentHTML('afterend',roadmapMarkup());

    const templateSection=document.getElementById('template-grid')?.closest('.form-section');
    addStage(templateSection,'Step 1 · Template','template-picker-section');
    const templateHead=templateSection?.querySelector('.template-section-head');
    if(templateHead&&!templateSection.querySelector('.template-choice-tip')){
      templateHead.insertAdjacentHTML('afterend','<div class="template-choice-tip"><i data-lucide="layout-template" size="17"></i><div><strong>Start with the structure, not the color.</strong><span>Choose the template whose spacing, curves and profile placement fit your business. You can customize colors right after.</span></div></div>');
    }

    const experience=document.getElementById('card-experience-section');
    addStage(experience,'Step 2 · Experience','experience-stage');

    const brandSection=document.getElementById('color-presets')?.closest('.form-section');
    addStage(brandSection,'Step 3 · Brand colors','brand-color-stage');

    syncRoadmap();
    if(window.lucide)window.lucide.createIcons();
  }

  function fieldValue(name){
    const el=document.querySelector(`[name="${name}"]`);
    return String(el?.value||'').trim();
  }

  function syncRoadmap(){
    const templateCopy=document.getElementById('roadmap-template-copy');
    const experienceCopy=document.getElementById('roadmap-experience-copy');
    const brandCopy=document.getElementById('roadmap-brand-copy');
    const status=document.getElementById('design-roadmap-status');
    const selected=document.getElementById('template-selected-summary')?.textContent?.trim();
    const hasTemplate=Boolean(fieldValue('template_id'));
    const experience=fieldValue('card_experience')==='flow'?'Flow':'Classic';
    if(templateCopy)templateCopy.textContent=hasTemplate&&selected?selected:'Pick your base layout';
    if(experienceCopy)experienceCopy.textContent=`${experience} selected`;
    if(brandCopy)brandCopy.textContent='Colors and cover come next';
    document.querySelector('[data-design-jump="template"]')?.classList.toggle('is-ready',hasTemplate);
    document.querySelector('[data-design-jump="experience"]')?.classList.add('is-ready');
    document.querySelector('[data-design-jump="brand"]')?.classList.toggle('is-ready',Boolean(fieldValue('primary_color')));
    if(status)status.textContent=hasTemplate?`${experience} · template selected`:'Start with a template';
  }

  function jumpToDesignStage(stage){
    const target=stage==='template'
      ?document.querySelector('.template-picker-section')
      :stage==='experience'
        ?document.getElementById('card-experience-section')
        :document.querySelector('.brand-color-stage');
    target?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function jumpToEditorStep(panel){
    const tab=document.querySelector(`.editor-tab[data-tab="${panel}"]`);
    tab?.click();
  }

  function wire(){
    document.addEventListener('click',event=>{
      const editorJump=event.target.closest('[data-editor-jump]');
      if(editorJump){jumpToEditorStep(editorJump.dataset.editorJump);return;}
      const jump=event.target.closest('[data-design-jump]');
      if(jump){jumpToDesignStage(jump.dataset.designJump);return;}
      if(event.target.closest('.editor-tab,#editor-step-next,#editor-step-back,[data-card-experience],.template-card,.color-preset')){
        requestAnimationFrame(()=>{syncGuidance();enhanceDesign();enhanceMobileStepper();});
      }
    });
    document.addEventListener('keydown',event=>{
      const editorJump=event.target.closest?.('[data-editor-jump]');
      if(!editorJump||!['Enter',' '].includes(event.key))return;
      event.preventDefault();
      jumpToEditorStep(editorJump.dataset.editorJump);
    });
    document.addEventListener('input',event=>{
      if(event.target.matches('[name="card_experience"],[name="template_id"],[name="primary_color"],[name="secondary_color"]'))requestAnimationFrame(syncRoadmap);
    });
    document.addEventListener('change',event=>{
      if(event.target.matches('[name="card_experience"],[name="template_id"],[name="primary_color"],[name="secondary_color"]'))requestAnimationFrame(syncRoadmap);
    });

    const observer=new MutationObserver(()=>requestAnimationFrame(syncGuidance));
    document.querySelectorAll('.editor-panel').forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));
  }

  function init(){
    syncGuidance();
    enhanceDesign();
    enhanceMobileStepper();
    wire();
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      syncGuidance();
      enhanceDesign();
      enhanceMobileStepper();
      if(document.getElementById('card-experience-section')&&attempts>12)clearInterval(timer);
      if(attempts>60)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

/* STAGING ONLY — compact mobile Design editor. */
(function(){
  const mobileQuery=window.matchMedia('(max-width:760px)');

  function injectCompactStyles(){
    if(document.getElementById('liw-staging-mobile-design-compact'))return;
    const style=document.createElement('style');
    style.id='liw-staging-mobile-design-compact';
    style.textContent=`
      @media(max-width:760px){
        body.liw-mobile-design-compact .editor-flow-summary.guided-setup-bar[data-editor-step="design"] .editor-autosave-note,
        body.liw-mobile-design-compact .editor-flow-summary.guided-setup-bar[data-editor-step="design"] .editor-promise-line{display:none!important}
        body.liw-mobile-design-compact .editor-panel[data-panel="design"]>.panel-heading{margin-bottom:9px!important}
        body.liw-mobile-design-compact .editor-panel[data-panel="design"]>.panel-heading p{display:none!important}
        body.liw-mobile-design-compact .design-setup-roadmap{margin:0 0 10px!important;padding:10px 11px!important;border-radius:15px!important}
        body.liw-mobile-design-compact .design-setup-roadmap-head{display:block!important;margin:0 0 8px!important}
        body.liw-mobile-design-compact .design-setup-roadmap-head>div>span,
        body.liw-mobile-design-compact .design-setup-roadmap-head p,
        body.liw-mobile-design-compact .design-setup-roadmap-status{display:none!important}
        body.liw-mobile-design-compact .design-setup-roadmap-head strong{font-size:.83rem!important}
        body.liw-mobile-design-compact .design-setup-roadmap-steps{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}
        body.liw-mobile-design-compact .design-roadmap-step{display:flex!important;min-height:58px!important;padding:7px 4px!important;flex-direction:column;align-items:center;justify-content:center;gap:4px!important;text-align:center!important;border-radius:10px!important}
        body.liw-mobile-design-compact .design-roadmap-step>span{width:23px!important;height:23px!important;border-radius:7px!important;font-size:.58rem!important}
        body.liw-mobile-design-compact .design-roadmap-step>div{display:block!important}
        body.liw-mobile-design-compact .design-roadmap-step strong{font-size:.61rem!important;line-height:1.1!important}
        body.liw-mobile-design-compact .design-roadmap-step small{display:none!important}
        body.liw-mobile-design-compact .design-stage-card::before{display:none!important}

        body.liw-mobile-design-compact .template-picker-section,
        body.liw-mobile-design-compact .card-experience-section.design-stage-card,
        body.liw-mobile-design-compact .brand-color-stage{padding:11px!important;border-radius:15px!important}
        body.liw-mobile-design-compact .template-picker-section .template-section-head{margin-bottom:8px!important;padding-bottom:8px!important;gap:7px!important}
        body.liw-mobile-design-compact .template-picker-section .template-section-head h3{font-size:.92rem!important}
        body.liw-mobile-design-compact .template-picker-section .template-section-head p,
        body.liw-mobile-design-compact .template-choice-tip,
        body.liw-mobile-design-compact .template-tier-heading p{display:none!important}
        body.liw-mobile-design-compact .template-picker-section .template-selected-summary{padding:5px 7px!important;font-size:.6rem!important}
        body.liw-mobile-design-compact .template-picker-section .template-tier-group{margin:0 0 9px!important;padding:8px!important;border-radius:13px!important}
        body.liw-mobile-design-compact .template-picker-section .template-tier-heading{margin:0 0 7px!important}
        body.liw-mobile-design-compact .template-picker-section .template-tier-heading h4{font-size:.78rem!important}
        body.liw-mobile-design-compact .template-picker-section .template-tier-grid{display:flex!important;grid-template-columns:none!important;gap:8px!important;overflow-x:auto!important;overscroll-behavior-inline:contain;scroll-snap-type:x proximity;padding:0 1px 4px!important;scrollbar-width:none}
        body.liw-mobile-design-compact .template-picker-section .template-tier-grid::-webkit-scrollbar{display:none}
        body.liw-mobile-design-compact .template-picker-section .template-card{flex:0 0 142px!important;min-width:142px!important;scroll-snap-align:start;border-radius:12px!important}
        body.liw-mobile-design-compact .template-picker-section .template-card.active::after{top:6px!important;left:6px!important;padding:4px 6px!important;font-size:.48rem!important}

        body.liw-mobile-design-compact .card-experience-section .feature-section-heading{margin-bottom:7px!important}
        body.liw-mobile-design-compact .card-experience-section .feature-section-heading h3{font-size:.9rem!important}
        body.liw-mobile-design-compact .card-experience-section .feature-section-heading p,
        body.liw-mobile-design-compact .card-experience-section .card-experience-note{display:none!important}
        body.liw-mobile-design-compact .card-experience-section .card-experience-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
        body.liw-mobile-design-compact .card-experience-section .card-experience-option{min-height:82px!important;padding:9px!important;border-radius:12px!important}
        body.liw-mobile-design-compact .card-experience-section .card-experience-option>span:last-child{display:none!important}
        body.liw-mobile-design-compact .card-experience-number{width:23px!important;height:23px!important;margin-bottom:5px!important;border-radius:7px!important}
        body.liw-mobile-design-compact .card-experience-section .card-experience-option strong{font-size:.7rem!important}

        body.liw-mobile-design-compact .brand-color-stage>h3{margin-bottom:7px!important;font-size:.9rem!important}
        body.liw-mobile-design-compact .premium-design-kicker{margin-bottom:7px!important}
        body.liw-mobile-design-compact .premium-design-kicker strong{font-size:.72rem!important}
        body.liw-mobile-design-compact .premium-design-kicker span{display:none!important}
        body.liw-mobile-design-compact .premium-palette-grid{display:flex!important;grid-template-columns:none!important;gap:7px!important;overflow-x:auto!important;scroll-snap-type:x proximity;padding:0 1px 4px!important;margin-bottom:7px!important;scrollbar-width:none}
        body.liw-mobile-design-compact .premium-palette-grid::-webkit-scrollbar{display:none}
        body.liw-mobile-design-compact .premium-palette-card{flex:0 0 112px!important;min-width:112px!important;padding:6px!important;scroll-snap-align:start;border-radius:11px!important}
        body.liw-mobile-design-compact .premium-palette-swatch{height:32px!important;border-radius:8px!important}
        body.liw-mobile-design-compact .premium-palette-card strong{margin-top:5px!important;font-size:.64rem!important}
        body.liw-mobile-design-compact .premium-brand-studio>.form-row{display:none!important;margin-top:7px!important;padding:8px!important}
        body.liw-mobile-design-compact .premium-brand-studio.mobile-custom-open>.form-row{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}
        body.liw-mobile-design-compact .premium-brand-studio>.form-row input[type="color"]{height:42px!important}

        body.liw-mobile-design-compact .mobile-design-disclosure{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;margin:5px 0 0;padding:9px 10px;border:1px solid #dce2ec;border-radius:11px;background:#f8fafc;color:#27324a;font:800 .7rem/1.2 inherit;text-align:left}
        body.liw-mobile-design-compact .mobile-design-disclosure span{color:#7b8497;font-size:.61rem;font-weight:700}
        body.liw-mobile-design-compact .mobile-design-disclosure svg{flex:0 0 auto;transition:transform .16s ease}
        body.liw-mobile-design-compact .mobile-design-disclosure[aria-expanded="true"] svg{transform:rotate(180deg)}

        body.liw-mobile-design-compact #cover-image-section{padding:11px!important}
        body.liw-mobile-design-compact #cover-image-section .feature-section-heading{margin-bottom:0!important}
        body.liw-mobile-design-compact #cover-image-section .feature-section-heading h3{font-size:.9rem!important}
        body.liw-mobile-design-compact #cover-image-section .feature-section-heading p{display:none!important}
        body.liw-mobile-design-compact #cover-image-section .premium-cover-studio,
        body.liw-mobile-design-compact #cover-image-section .cover-upload-editor{display:none!important}
        body.liw-mobile-design-compact #cover-image-section.mobile-cover-open .premium-cover-studio{display:block!important;margin:8px 0!important;padding:9px!important}
        body.liw-mobile-design-compact #cover-image-section.mobile-cover-open .cover-upload-editor{display:grid!important;margin-top:8px!important;padding:9px!important}
        body.liw-mobile-design-compact #cover-image-section .premium-cover-head{margin-bottom:7px!important}
        body.liw-mobile-design-compact #cover-image-section .premium-cover-head span{display:none!important}
        body.liw-mobile-design-compact #cover-image-section .premium-cover-label{margin:8px 0 5px!important}
        body.liw-mobile-design-compact #cover-image-section .premium-cover-gallery,
        body.liw-mobile-design-compact #cover-image-section .premium-gradient-grid{display:flex!important;grid-template-columns:none!important;gap:7px!important;overflow-x:auto!important;scroll-snap-type:x proximity;scrollbar-width:none}
        body.liw-mobile-design-compact #cover-image-section .premium-cover-gallery::-webkit-scrollbar,
        body.liw-mobile-design-compact #cover-image-section .premium-gradient-grid::-webkit-scrollbar{display:none}
        body.liw-mobile-design-compact #cover-image-section .premium-cover-card{flex:0 0 136px!important;min-width:136px!important;scroll-snap-align:start}
        body.liw-mobile-design-compact #cover-image-section .premium-gradient-card{flex:0 0 104px!important;min-width:104px!important;scroll-snap-align:start}

        body.liw-mobile-design-active .editor-step-actions{position:sticky!important;bottom:0!important;z-index:35!important;margin-top:10px!important;padding:9px 10px calc(9px + env(safe-area-inset-bottom))!important;background:rgba(255,255,255,.96)!important;border-top:1px solid #e1e5ec!important;box-shadow:0 -8px 22px rgba(11,20,56,.08)!important;backdrop-filter:blur(10px)}
        body.liw-mobile-design-active .editor-step-actions-copy{display:none!important}
        body.liw-mobile-design-active #editor-step-back{min-width:82px!important}
        body.liw-mobile-design-active #editor-step-next{flex:1!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDisclosure(section,id,label,detail,openClass){
    if(!section)return;
    let button=document.getElementById(id);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.id=id;
      button.className='mobile-design-disclosure';
      button.setAttribute('aria-expanded','false');
      button.innerHTML=`<div><strong>${label}</strong><span>${detail}</span></div><i data-lucide="chevron-down" size="17"></i>`;
      const anchor=openClass==='mobile-cover-open' ? section.querySelector('.feature-section-heading') : section.querySelector('#premium-palette-grid');
      if(anchor)anchor.insertAdjacentElement('afterend',button);else section.prepend(button);
      button.addEventListener('click',()=>{
        const next=!section.classList.contains(openClass);
        section.classList.toggle(openClass,next);
        button.setAttribute('aria-expanded',String(next));
        const strong=button.querySelector('strong');
        if(strong)strong.textContent=next?`Hide ${label.toLowerCase()}`:label;
      });
    }
  }

  function syncCompactMode(){
    const mobile=mobileQuery.matches;
    const active=document.querySelector('.editor-panel[data-panel="design"]')?.classList.contains('active');
    document.body.classList.toggle('liw-mobile-design-compact',mobile);
    document.body.classList.toggle('liw-mobile-design-active',mobile&&active);
    if(!mobile)return;
    const brand=document.getElementById('color-presets')?.closest('.form-section');
    ensureDisclosure(brand,'mobile-fine-tune-colors','Fine-tune colors','Optional custom color controls','mobile-custom-open');
    const cover=document.getElementById('cover-image-section');
    ensureDisclosure(cover,'mobile-cover-options','Cover options','Artwork, gradients or upload','mobile-cover-open');
    if(window.lucide)try{window.lucide.createIcons();}catch(_){ }
  }

  function initCompactMobile(){
    injectCompactStyles();
    syncCompactMode();
    mobileQuery.addEventListener?.('change',syncCompactMode);
    document.addEventListener('click',event=>{
      if(event.target.closest('.editor-tab,#editor-step-next,#editor-step-back'))requestAnimationFrame(syncCompactMode);
    });
    const observer=new MutationObserver(()=>requestAnimationFrame(syncCompactMode));
    document.querySelectorAll('.editor-panel').forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:['class']}));
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      syncCompactMode();
      if(document.getElementById('premium-palette-grid')&&document.getElementById('card-experience-section')&&attempts>8)clearInterval(timer);
      if(attempts>40)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initCompactMobile,{once:true});
  else initCompactMobile();
})();
