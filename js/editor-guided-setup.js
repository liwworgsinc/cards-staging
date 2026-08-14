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
