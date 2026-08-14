/* LIW Cards — STAGING ONLY editor UX experiment — 2026-08-14.
   Separates whole-card customization from business tools and makes business
   tools compact/open-on-demand. Remove this file or revert the staging commit
   to return to the previous editor. */
(function(){
  const STYLE_ID='staging-editor-ux-test-style';

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .staging-whole-card-customizer{
        margin-top:18px!important;
        padding:0!important;
        overflow:hidden;
        border:1px solid #dfe4ed!important;
        border-radius:20px!important;
        background:#fff!important;
        box-shadow:0 10px 28px rgba(11,20,56,.055);
      }
      .staging-customizer-intro{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:14px;
        padding:18px 19px;
        border-bottom:1px solid #edf0f5;
        background:linear-gradient(180deg,#fbfcff,#f7f9fc);
      }
      .staging-customizer-intro>div{display:grid;gap:4px;min-width:0}
      .staging-customizer-kicker{
        color:#9a7423;
        font-size:.62rem;
        font-weight:950;
        letter-spacing:.08em;
        text-transform:uppercase;
      }
      .staging-customizer-intro h3{margin:0;color:#0b1438;font-size:1.06rem}
      .staging-customizer-intro p{margin:0;max-width:720px;color:#69738a;font-size:.76rem;line-height:1.45}
      .staging-test-pill{
        flex:0 0 auto;
        padding:6px 9px;
        border:1px solid #e5d6ad;
        border-radius:999px;
        background:#fff8e8;
        color:#7a5c1d;
        font-size:.6rem;
        font-weight:900;
      }
      .staging-customizer-host{padding:16px}
      .staging-whole-card-customizer #rich-card-builder{margin:0}
      .staging-whole-card-customizer .rich-card-builder-head{
        margin-bottom:12px;
        padding:13px 14px;
        border-radius:14px;
        background:#f7f9fc;
        border:1px solid #e8ecf2;
      }
      .advanced-tools-panel .panel-heading{margin-bottom:12px}
      .advanced-tools-panel #business-tools-content{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:10px;
      }
      .advanced-tools-panel #business-tools-content[hidden]{display:none!important}
      .staging-collapsible-tool{
        min-width:0;
        margin:0!important;
        padding:0!important;
        overflow:hidden;
        align-self:start;
        border-radius:16px!important;
      }
      .staging-collapsible-tool>.tool-editor-head{margin:0!important;padding:14px 14px 10px!important}
      .staging-tool-toggle{
        width:calc(100% - 24px);
        margin:0 12px 12px;
        min-height:38px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        padding:8px 10px;
        border:1px solid #e3e7ee;
        border-radius:11px;
        background:#f8fafc;
        color:#344057;
        font-family:inherit;
        font-size:.7rem;
        font-weight:800;
        line-height:1;
        cursor:pointer;
      }
      .staging-tool-toggle svg{transition:transform .18s ease}
      .staging-collapsible-tool.is-open>.staging-tool-toggle svg{transform:rotate(180deg)}
      .staging-collapsible-tool:not(.is-open)>:not(.tool-editor-head):not(.staging-tool-toggle){display:none!important}
      .staging-collapsible-tool.is-open{grid-column:1/-1}
      .staging-collapsible-tool.is-open>.staging-tool-toggle{margin-bottom:8px;background:#fffaf0;border-color:#eadfbe;color:#73571c}
      .staging-collapsible-tool.is-open>:not(.tool-editor-head):not(.staging-tool-toggle){margin-left:14px;margin-right:14px}
      .staging-collapsible-tool.is-open>:last-child{margin-bottom:14px}
      @media(max-width:760px){
        .staging-customizer-intro{padding:15px;flex-direction:column}
        .staging-customizer-host{padding:12px}
        .advanced-tools-panel #business-tools-content{grid-template-columns:1fr;gap:8px}
        .staging-collapsible-tool.is-open{grid-column:auto}
      }
    `;
    document.head.appendChild(style);
  }

  function relabelDesignTab(){
    const designTab=document.querySelector('.editor-tab[data-tab="design"] .editor-step-tab-copy small');
    if(designTab)designTab.textContent='Template, colors & full card';
  }

  function moveWholeCardBuilder(){
    const builder=document.getElementById('rich-card-builder');
    const design=document.querySelector('.editor-panel[data-panel="design"]');
    if(!builder||!design)return false;

    let wrapper=document.getElementById('staging-whole-card-customizer');
    if(!wrapper){
      wrapper=document.createElement('section');
      wrapper.id='staging-whole-card-customizer';
      wrapper.className='form-section staging-whole-card-customizer';
      wrapper.innerHTML=`<div class="staging-customizer-intro">
        <div><span class="staging-customizer-kicker">Whole-card customization</span><h3>Customize Your Whole Card</h3><p>Add the sections that make the entire card feel like your business—hours, gallery, reviews, FAQs, location, calls-to-action, credentials and featured links. Open only what you want.</p></div>
        <span class="staging-test-pill">Staging test</span>
      </div><div class="staging-customizer-host" data-staging-customizer-host></div>`;
      const advanced=design.querySelector('.design-advanced-details');
      if(advanced)design.insertBefore(wrapper,advanced);
      else design.appendChild(wrapper);
    }

    const host=wrapper.querySelector('[data-staging-customizer-host]');
    if(host&&builder.parentElement!==host)host.appendChild(builder);
    builder.dataset.stagingMoved='true';

    const builderHead=builder.querySelector('.rich-card-builder-head');
    const title=builderHead?.querySelector('h3');
    const copy=builderHead?.querySelector('p');
    if(title)title.textContent='Build out your whole card';
    if(copy)copy.textContent='These sections customize the full public card, not just one small area. Turn on only the sections your business needs.';
    return true;
  }

  function compactBusinessTools(){
    const panel=document.querySelector('.editor-panel[data-panel="tools"]');
    const content=document.getElementById('business-tools-content');
    if(!panel||!content)return false;

    const heading=panel.querySelector('.panel-heading h2');
    const subheading=panel.querySelector('.panel-heading p');
    if(heading)heading.textContent='Advanced business tools';
    if(subheading)subheading.textContent='Booking, leads, products, payments and service tools stay compact. Open only the tool you want to configure.';

    const gateButton=document.getElementById('show-business-tools');
    if(gateButton&&!gateButton.dataset.stagingCopy){
      gateButton.dataset.stagingCopy='true';
      gateButton.innerHTML='<i data-lucide="sliders-horizontal" size="16"></i> Choose business tools';
    }

    content.querySelectorAll(':scope > .tool-editor-card').forEach(card=>{
      if(card.dataset.stagingCollapsible==='true')return;
      const head=card.querySelector(':scope > .tool-editor-head');
      if(!head)return;
      card.dataset.stagingCollapsible='true';
      card.classList.add('staging-collapsible-tool');

      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='staging-tool-toggle';
      toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML='<span>Open settings</span><i data-lucide="chevron-down" size="15"></i>';
      head.insertAdjacentElement('afterend',toggle);
      toggle.addEventListener('click',()=>{
        const open=card.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded',String(open));
        toggle.querySelector('span').textContent=open?'Close settings':'Open settings';
      });
    });
    return true;
  }

  function refreshExperiment(){
    injectStyles();
    relabelDesignTab();
    moveWholeCardBuilder();
    compactBusinessTools();
    if(window.lucide)window.lucide.createIcons();
  }

  function initExperiment(){
    refreshExperiment();
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      refreshExperiment();
      if(attempts>80)clearInterval(timer);
    },250);
    document.addEventListener('click',event=>{
      if(event.target.closest('#show-business-tools,.editor-tab,[data-editor-jump]'))setTimeout(refreshExperiment,30);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initExperiment,{once:true});
  else initExperiment();
})();
