/* LIW Cards — STAGING ONLY business-tool Style & Layout experiment — 2026-08-14.
   Gives Services, booking, leads, products and payment tools the same premium
   customization pattern used by Beef up your card, while keeping every Style &
   Layout panel collapsed by default to reduce scrolling.

   Prototype values are stored in localStorage for safe staging testing only.
   Once approved, these settings can be persisted with the card record. */
(function(){
  const STYLE_ID='staging-business-tool-style-test';

  const APPEARANCES=[
    ['clean','Clean','Airy and simple'],
    ['luxe','Luxe','Gold detail + depth'],
    ['glass','Glass','Soft translucent surface'],
    ['bold','Bold','High-contrast statement']
  ];

  const TOOL_TITLE_MAP={
    'services':'services',
    'appointment booking':'booking',
    'lead capture':'leads',
    'product showcase':'products',
    'share payment information':'payment-sharing',
    'payment link':'payment-link'
  };

  const TOOL_DEFAULTS={
    services:{appearance:'luxe',layout:'two-column'},
    booking:{appearance:'clean',layout:'button'},
    leads:{appearance:'clean',layout:'card'},
    products:{appearance:'luxe',layout:'grid'},
    'payment-sharing':{appearance:'clean',layout:'buttons'},
    'payment-link':{appearance:'clean',layout:'button'}
  };

  const TOOL_LAYOUTS={
    services:[['list','List'],['cards','Cards'],['two-column','Two-column']],
    booking:[['button','Button'],['card','Card'],['banner','Banner']],
    leads:[['card','Card'],['compact','Compact'],['split','Split']],
    products:[['grid','Grid'],['cards','Cards'],['list','List']],
    'payment-sharing':[['buttons','Buttons'],['grid','Grid'],['compact','Compact']],
    'payment-link':[['button','Button'],['pill','Pill'],['card','Card']]
  };

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function cardKey(){
    return new URLSearchParams(location.search).get('id')||'new-card';
  }

  function storageKey(tool){
    return `liw-staging-tool-style:${cardKey()}:${tool}`;
  }

  function defaultState(tool){
    return {
      appearance:TOOL_DEFAULTS[tool]?.appearance||'clean',
      layout:TOOL_DEFAULTS[tool]?.layout||'card',
      accent:'brand',
      heading_align:'left',
      display_title:'',
      display_kicker:''
    };
  }

  function getState(tool){
    try{
      const stored=JSON.parse(localStorage.getItem(storageKey(tool))||'null');
      return {...defaultState(tool),...(stored&&typeof stored==='object'?stored:{})};
    }catch(_){
      return defaultState(tool);
    }
  }

  function setState(tool,patch){
    const next={...getState(tool),...patch};
    localStorage.setItem(storageKey(tool),JSON.stringify(next));
    return next;
  }

  function appearanceLabel(value){
    return APPEARANCES.find(item=>item[0]===value)?.[1]||'Clean';
  }

  function appearanceOptions(tool){
    const selected=getState(tool).appearance;
    return APPEARANCES.map(([value,label,copy])=>`<label class="rich-style-choice" data-business-style-choice="${value}">
      <input type="radio" name="staging-business-style-${tool}" data-business-tool="${tool}" data-business-path="appearance" value="${value}" ${selected===value?'checked':''}>
      <span class="rich-style-swatch rich-style-swatch-${value}"></span>
      <span><strong>${label}</strong><small>${copy}</small></span>
    </label>`).join('');
  }

  function layoutOptions(tool){
    const selected=getState(tool).layout;
    return (TOOL_LAYOUTS[tool]||[['card','Card']]).map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('');
  }

  function controlsMarkup(tool){
    const state=getState(tool);
    return `<details class="rich-premium-options staging-business-premium-options" data-business-style-for="${tool}">
      <summary>
        <span><i data-lucide="sparkles" size="15"></i><strong>Style & layout</strong></span>
        <small data-business-style-summary>${appearanceLabel(state.appearance)} · tap to customize</small>
      </summary>
      <div class="rich-premium-body">
        <div class="rich-premium-label"><strong>Section style</strong><span>Choose the visual personality for this section.</span></div>
        <div class="rich-style-choices">${appearanceOptions(tool)}</div>
        <div class="rich-grid-2 rich-premium-fields">
          <div class="rich-field"><label>Layout</label><select data-business-tool="${tool}" data-business-path="layout">${layoutOptions(tool)}</select></div>
          <div class="rich-field"><label>Accent</label><select data-business-tool="${tool}" data-business-path="accent">
            <option value="gold" ${state.accent==='gold'?'selected':''}>Gold</option>
            <option value="brand" ${state.accent==='brand'?'selected':''}>Card brand color</option>
            <option value="dark" ${state.accent==='dark'?'selected':''}>Deep navy</option>
          </select></div>
        </div>
        <div class="rich-grid-2 rich-premium-fields">
          <div class="rich-field"><label>Heading alignment</label><select data-business-tool="${tool}" data-business-path="heading_align">
            <option value="left" ${state.heading_align==='left'?'selected':''}>Left</option>
            <option value="center" ${state.heading_align==='center'?'selected':''}>Centered</option>
          </select></div>
          <div class="rich-field"><label>Custom section heading</label><input data-business-tool="${tool}" data-business-path="display_title" value="${esc(state.display_title)}" placeholder="Use the default heading"></div>
        </div>
        <div class="rich-field"><label>Small heading label</label><input data-business-tool="${tool}" data-business-path="display_kicker" value="${esc(state.display_kicker)}" placeholder="Use the default label"></div>
      </div>
    </details>`;
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Keep each premium business customizer compact until the customer opens it. */
      .staging-business-premium-options{margin:12px 0 14px!important}
      .staging-business-premium-options>summary{cursor:pointer}
      .staging-business-premium-options>summary small[data-business-style-summary]{white-space:nowrap}

      /* Live phone preview appearance language. */
      #phone-preview{--staging-primary:#0b1438;--staging-secondary:#d4a84f}
      #phone-preview [data-staging-appearance="clean"].preview-service-card,
      #phone-preview [data-staging-appearance="clean"].preview-product-card,
      #phone-preview [data-staging-appearance="clean"].preview-business-action,
      #phone-preview [data-staging-appearance="clean"].preview-payment-action,
      #phone-preview [data-staging-appearance="clean"]#preview-lead-section{
        background:#fff!important;border:1px solid #e4e7ed!important;color:#283247!important;box-shadow:0 4px 12px rgba(11,20,56,.045)!important;
      }
      #phone-preview [data-staging-appearance="luxe"].preview-service-card,
      #phone-preview [data-staging-appearance="luxe"].preview-product-card,
      #phone-preview [data-staging-appearance="luxe"].preview-business-action,
      #phone-preview [data-staging-appearance="luxe"].preview-payment-action,
      #phone-preview [data-staging-appearance="luxe"]#preview-lead-section{
        background:linear-gradient(145deg,#fffdf8,#fff)!important;border:1px solid color-mix(in srgb,var(--staging-accent,#d4a84f) 55%,#e8e5dc)!important;color:#263047!important;box-shadow:0 8px 18px rgba(11,20,56,.075),inset 3px 0 0 color-mix(in srgb,var(--staging-accent,#d4a84f) 76%,transparent)!important;
      }
      #phone-preview [data-staging-appearance="glass"].preview-service-card,
      #phone-preview [data-staging-appearance="glass"].preview-product-card,
      #phone-preview [data-staging-appearance="glass"].preview-business-action,
      #phone-preview [data-staging-appearance="glass"].preview-payment-action,
      #phone-preview [data-staging-appearance="glass"]#preview-lead-section{
        background:linear-gradient(135deg,rgba(255,255,255,.74),rgba(237,242,250,.52))!important;border:1px solid rgba(255,255,255,.82)!important;color:#263249!important;box-shadow:0 8px 18px rgba(11,20,56,.09),inset 0 0 18px rgba(255,255,255,.42)!important;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);
      }
      #phone-preview [data-staging-appearance="bold"].preview-service-card,
      #phone-preview [data-staging-appearance="bold"].preview-product-card,
      #phone-preview [data-staging-appearance="bold"].preview-business-action,
      #phone-preview [data-staging-appearance="bold"].preview-payment-action,
      #phone-preview [data-staging-appearance="bold"]#preview-lead-section{
        background:linear-gradient(135deg,var(--staging-primary),color-mix(in srgb,var(--staging-primary) 72%,var(--staging-accent,var(--staging-secondary))))!important;border:1px solid color-mix(in srgb,var(--staging-accent,var(--staging-secondary)) 50%,transparent)!important;color:#fff!important;box-shadow:0 8px 18px rgba(11,20,56,.13)!important;
      }
      #phone-preview [data-staging-appearance="bold"] strong,
      #phone-preview [data-staging-appearance="bold"] small,
      #phone-preview [data-staging-appearance="bold"] em,
      #phone-preview [data-staging-appearance="bold"] span,
      #phone-preview [data-staging-appearance="bold"] svg{color:#fff!important}

      /* A few useful layout previews without changing production rendering. */
      #preview-services-section[data-staging-layout="two-column"] .preview-service-list,
      #preview-products-section[data-staging-layout="grid"] .preview-product-list{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
      #preview-services-section[data-staging-layout="list"] .preview-service-card,
      #preview-products-section[data-staging-layout="list"] .preview-product-card{border-radius:8px!important;box-shadow:none!important}
      #preview-lead-section[data-staging-layout="compact"]{padding:8px 10px!important}
      #preview-lead-section[data-staging-layout="split"]{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important}
      #preview-business-actions[data-staging-booking-layout="banner"] .preview-business-action[data-staging-tool="booking"],
      #preview-business-actions[data-staging-payment-link-layout="card"] .preview-business-action[data-staging-tool="payment-link"]{width:100%!important;min-height:48px!important;border-radius:15px!important}
      #preview-business-actions[data-staging-payment-link-layout="pill"] .preview-business-action[data-staging-tool="payment-link"]{border-radius:999px!important}

      [data-staging-heading-align="center"] .preview-section-heading{text-align:center!important;align-items:center!important}

      @media(max-width:760px){
        .staging-business-premium-options>summary{padding:12px 13px!important}
        .staging-business-premium-options>summary small[data-business-style-summary]{font-size:.58rem!important}
        .staging-business-premium-options .rich-premium-body{padding:13px!important}
        .staging-business-premium-options .rich-style-choices{gap:7px!important}
        .staging-business-premium-options .rich-style-choice{min-height:66px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function restorePreviousWrongExperiment(){
    const builder=document.getElementById('rich-card-builder');
    const content=document.getElementById('business-tools-content');
    if(builder&&content&&builder.parentElement!==content)content.appendChild(builder);
    document.getElementById('staging-whole-card-customizer')?.remove();
    const designTab=document.querySelector('.editor-tab[data-tab="design"] .editor-step-tab-copy small');
    if(designTab&&designTab.textContent.includes('full card'))designTab.textContent='Template, colors and cover';
    document.querySelectorAll('.staging-collapsible-tool').forEach(card=>{
      card.classList.remove('staging-collapsible-tool','is-open');
      delete card.dataset.stagingCollapsible;
      card.querySelector(':scope > .staging-tool-toggle')?.remove();
    });
    document.querySelectorAll(':scope > .staging-tool-customize').forEach?.(()=>{});
    const builderTitle=builder?.querySelector('.rich-card-builder-head h3');
    const builderCopy=builder?.querySelector('.rich-card-builder-head p');
    if(builderTitle)builderTitle.textContent='Beef up your card';
    if(builderCopy)builderCopy.textContent='Your fast 2-minute card stays simple. Open only the extra sections you want and turn them on when they are ready.';
  }

  function toolForCard(card){
    const title=String(card.querySelector('.tool-editor-head h3')?.textContent||'').trim().toLowerCase();
    return TOOL_TITLE_MAP[title]||null;
  }

  function mountCustomizers(){
    const content=document.getElementById('business-tools-content');
    if(!content)return false;
    content.querySelectorAll(':scope > .tool-editor-card').forEach(card=>{
      const tool=toolForCard(card);
      if(!tool||card.querySelector(':scope > .staging-business-premium-options'))return;
      const head=card.querySelector(':scope > .tool-editor-head');
      if(!head)return;
      head.insertAdjacentHTML('afterend',controlsMarkup(tool));
    });
    if(window.lucide)window.lucide.createIcons();
    return true;
  }

  function accentValue(value){
    if(value==='gold')return '#d4a84f';
    if(value==='dark')return '#0b1438';
    return document.querySelector('[name="primary_color"]')?.value||'#0b1438';
  }

  function decorateElement(element,tool){
    if(!element)return;
    const state=getState(tool);
    element.dataset.stagingAppearance=state.appearance;
    element.dataset.stagingTool=tool;
    element.style.setProperty('--staging-accent',accentValue(state.accent));
  }

  function setSectionHeading(section,tool,defaults){
    if(!section)return;
    const state=getState(tool);
    section.dataset.stagingLayout=state.layout;
    section.dataset.stagingHeadingAlign=state.heading_align;
    const heading=section.querySelector('.preview-section-heading strong, :scope > div > strong');
    const kicker=section.querySelector('.preview-section-heading span, :scope > div > span');
    if(heading)heading.textContent=state.display_title||defaults.title;
    if(kicker)kicker.textContent=state.display_kicker||defaults.kicker;
  }

  function applyPreviewStyles(){
    const phone=document.getElementById('phone-preview');
    if(!phone)return;
    const primary=document.querySelector('[name="primary_color"]')?.value||'#0b1438';
    const secondary=document.querySelector('[name="secondary_color"]')?.value||'#d4a84f';
    phone.style.setProperty('--staging-primary',primary);
    phone.style.setProperty('--staging-secondary',secondary);

    const servicesSection=document.getElementById('preview-services-section');
    setSectionHeading(servicesSection,'services',{title:'Services',kicker:'How I can help'});
    servicesSection?.querySelectorAll('.preview-service-card').forEach(el=>decorateElement(el,'services'));

    const productsSection=document.getElementById('preview-products-section');
    setSectionHeading(productsSection,'products',{title:'Featured products',kicker:'Shop'});
    productsSection?.querySelectorAll('.preview-product-card').forEach(el=>decorateElement(el,'products'));

    const leadSection=document.getElementById('preview-lead-section');
    setSectionHeading(leadSection,'leads',{title:'Send an inquiry',kicker:'Customers can contact you from this card.'});
    decorateElement(leadSection,'leads');

    const actionArea=document.getElementById('preview-business-actions');
    if(actionArea){
      actionArea.dataset.stagingBookingLayout=getState('booking').layout;
      actionArea.dataset.stagingPaymentLinkLayout=getState('payment-link').layout;
      actionArea.querySelectorAll('.preview-business-action').forEach(el=>{
        const text=String(el.textContent||'').toLowerCase();
        let tool=null;
        let defaultLabel='';
        if(text.includes('book an appointment')||el.dataset.stagingTool==='booking'){
          tool='booking';defaultLabel='Book an appointment';
        }else if(text.includes('make a payment')||el.dataset.stagingTool==='payment-link'){
          tool='payment-link';defaultLabel='Make a payment';
        }else if(text.includes('send an inquiry')||el.dataset.stagingTool==='leads'){
          tool='leads';defaultLabel='Send an inquiry';
        }
        if(!tool)return;
        decorateElement(el,tool);
        const label=el.querySelector('span');
        const state=getState(tool);
        if(label)label.textContent=state.display_title||defaultLabel;
      });
    }

    document.querySelectorAll('#preview-tools .preview-payment-action').forEach(el=>{
      const text=String(el.textContent||'').toLowerCase();
      if(text.includes('pay option')||el.dataset.stagingTool==='payment-sharing')decorateElement(el,'payment-sharing');
      else if(text.trim()==='pay'||el.dataset.stagingTool==='payment-link')decorateElement(el,'payment-link');
    });
  }

  function updateSummary(details,tool){
    const summary=details?.querySelector('[data-business-style-summary]');
    if(summary)summary.textContent=`${appearanceLabel(getState(tool).appearance)} · tap to customize`;
  }

  function wireCustomizerEvents(){
    if(document.body.dataset.stagingBusinessStyleWired==='true')return;
    document.body.dataset.stagingBusinessStyleWired='true';

    document.addEventListener('change',event=>{
      const input=event.target.closest('.staging-business-premium-options [data-business-tool][data-business-path]');
      if(!input)return;
      const tool=input.dataset.businessTool;
      const path=input.dataset.businessPath;
      setState(tool,{[path]:input.value});
      updateSummary(input.closest('.staging-business-premium-options'),tool);
      applyPreviewStyles();
    });

    document.addEventListener('input',event=>{
      const input=event.target.closest('.staging-business-premium-options input[data-business-tool][data-business-path]');
      if(!input||input.type==='radio')return;
      const tool=input.dataset.businessTool;
      const path=input.dataset.businessPath;
      setState(tool,{[path]:input.value});
      applyPreviewStyles();
    });

    /* Accordion behavior: opening one Style & Layout panel closes the others. */
    document.addEventListener('toggle',event=>{
      const details=event.target.closest?.('.staging-business-premium-options');
      if(!details||!details.open)return;
      document.querySelectorAll('.staging-business-premium-options[open]').forEach(other=>{
        if(other!==details)other.removeAttribute('open');
      });
    },true);
  }

  function refresh(){
    injectStyles();
    restorePreviousWrongExperiment();
    mountCustomizers();
    applyPreviewStyles();
  }

  function init(){
    wireCustomizerEvents();
    refresh();

    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      refresh();
      if(attempts>80)clearInterval(timer);
    },250);

    const phone=document.getElementById('phone-preview');
    if(phone){
      const observer=new MutationObserver(()=>requestAnimationFrame(applyPreviewStyles));
      observer.observe(phone,{childList:true,subtree:true});
    }

    document.addEventListener('input',event=>{
      if(event.target.matches('[name="primary_color"],[name="secondary_color"]'))requestAnimationFrame(applyPreviewStyles);
    });
    document.addEventListener('change',event=>{
      if(event.target.matches('[name="primary_color"],[name="secondary_color"]'))requestAnimationFrame(applyPreviewStyles);
    });
    document.addEventListener('click',event=>{
      if(event.target.closest('#show-business-tools,.editor-tab,[data-editor-jump],#add-service,#add-product'))setTimeout(refresh,40);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
