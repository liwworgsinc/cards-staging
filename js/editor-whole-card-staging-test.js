/* LIW Cards — STAGING ONLY business-tool style experiment — 2026-08-14.
   Goal: Services, booking, leads, products and payment tools each get their own
   Customize Look control with independent Clean / Glass / Bold / Minimal styles.
   The existing Beef up your card builder remains in Advanced Tools.

   This prototype stores style choices in localStorage for safe visual testing.
   Once approved, the selected styles can be persisted with the card record so
   every public visitor receives the same look. */
(function(){
  const STYLE_ID='staging-business-tool-style-test';
  const LOOKS=[
    {key:'clean',label:'Clean',help:'Crisp white cards'},
    {key:'glass',label:'Glass',help:'Soft translucent panels'},
    {key:'bold',label:'Bold',help:'Strong branded blocks'},
    {key:'minimal',label:'Minimal',help:'Lightweight, low chrome'}
  ];
  const TOOL_TITLE_MAP={
    'services':'services',
    'appointment booking':'booking',
    'lead capture':'leads',
    'product showcase':'products',
    'share payment information':'payment-sharing',
    'payment link':'payment-link'
  };

  function cardKey(){
    return new URLSearchParams(location.search).get('id')||'new-card';
  }
  function storageKey(tool){return `liw-staging-tool-look:${cardKey()}:${tool}`;}
  function getLook(tool){return localStorage.getItem(storageKey(tool))||'clean';}
  function setLook(tool,look){localStorage.setItem(storageKey(tool),look);}

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .staging-tool-customize{
        margin:12px 0 14px;
        padding:11px;
        border:1px solid #e3e7ee;
        border-radius:13px;
        background:linear-gradient(180deg,#fbfcfe,#f7f9fc);
      }
      .staging-tool-customize-top{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }
      .staging-tool-customize-copy{display:grid;gap:2px;min-width:0}
      .staging-tool-customize-copy strong{font-size:.74rem;color:#29354d}
      .staging-tool-customize-copy small{font-size:.63rem;line-height:1.3;color:#7b8497}
      .staging-customize-button{
        flex:0 0 auto;
        min-height:35px;
        display:inline-flex;
        align-items:center;
        gap:7px;
        padding:7px 10px;
        border:1px solid #d9dee8;
        border-radius:10px;
        background:#fff;
        color:#0b1438;
        font:850 .67rem/1 inherit;
        cursor:pointer;
        box-shadow:0 4px 10px rgba(11,20,56,.035);
      }
      .staging-customize-button:hover{border-color:#c4ccda;background:#fdfefe}
      .staging-current-look{
        padding:3px 6px;
        border-radius:999px;
        background:#fff6de;
        color:#7a5b18;
        font-size:.56rem;
        font-weight:950;
      }
      .staging-tool-look-panel{margin-top:10px;padding-top:10px;border-top:1px solid #e6eaf0}
      .staging-tool-look-panel[hidden]{display:none!important}
      .staging-tool-look-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .staging-look-choice{
        min-width:0;
        padding:7px;
        border:1px solid #e1e5ec;
        border-radius:11px;
        background:#fff;
        color:#344057;
        text-align:left;
        font-family:inherit;
        cursor:pointer;
      }
      .staging-look-choice:hover{border-color:#c8d0de}
      .staging-look-choice.is-selected{border-color:#0b1438;box-shadow:0 0 0 2px rgba(11,20,56,.07)}
      .staging-look-preview{height:30px;margin-bottom:6px;border-radius:8px;overflow:hidden;position:relative}
      .staging-look-preview::before,.staging-look-preview::after{content:"";position:absolute}
      .staging-look-preview.clean{border:1px solid #e5e8ee;background:#fff;box-shadow:0 3px 8px rgba(11,20,56,.05)}
      .staging-look-preview.clean::before{left:7px;top:8px;width:55%;height:4px;border-radius:5px;background:#0b1438}
      .staging-look-preview.clean::after{left:7px;top:17px;width:35%;height:3px;border-radius:5px;background:#d4a84f}
      .staging-look-preview.glass{border:1px solid rgba(255,255,255,.7);background:linear-gradient(135deg,rgba(255,255,255,.78),rgba(222,231,246,.55));box-shadow:inset 0 0 16px rgba(255,255,255,.55),0 3px 8px rgba(11,20,56,.08)}
      .staging-look-preview.glass::before{inset:6px 8px;border-radius:6px;background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.8)}
      .staging-look-preview.bold{background:linear-gradient(135deg,#0b1438,#d4a84f)}
      .staging-look-preview.bold::before{left:7px;top:8px;width:58%;height:4px;border-radius:5px;background:#fff}
      .staging-look-preview.bold::after{left:7px;top:17px;width:38%;height:3px;border-radius:5px;background:rgba(255,255,255,.55)}
      .staging-look-preview.minimal{background:#fff;border-bottom:2px solid #0b1438;border-radius:0}
      .staging-look-preview.minimal::before{left:2px;top:8px;width:55%;height:3px;border-radius:5px;background:#374151}
      .staging-look-preview.minimal::after{left:2px;top:17px;width:30%;height:2px;border-radius:5px;background:#a6adba}
      .staging-look-choice strong{display:block;font-size:.63rem;line-height:1.15;color:#29354d}
      .staging-look-choice small{display:block;margin-top:2px;font-size:.54rem;line-height:1.2;color:#8a92a1}

      /* Live editor preview — shared styling language for every business tool. */
      #phone-preview{--staging-primary:#0b1438;--staging-secondary:#d4a84f}
      #phone-preview [data-staging-look="clean"].preview-service-card,
      #phone-preview [data-staging-look="clean"].preview-product-card,
      #phone-preview [data-staging-look="clean"].preview-business-action,
      #phone-preview [data-staging-look="clean"].preview-payment-action,
      #phone-preview [data-staging-look="clean"]#preview-lead-section{
        background:#fff!important;
        border:1px solid #e4e7ed!important;
        color:#283247!important;
        box-shadow:0 4px 12px rgba(11,20,56,.045)!important;
      }
      #phone-preview [data-staging-look="glass"].preview-service-card,
      #phone-preview [data-staging-look="glass"].preview-product-card,
      #phone-preview [data-staging-look="glass"].preview-business-action,
      #phone-preview [data-staging-look="glass"].preview-payment-action,
      #phone-preview [data-staging-look="glass"]#preview-lead-section{
        background:linear-gradient(135deg,rgba(255,255,255,.74),rgba(237,242,250,.52))!important;
        border:1px solid rgba(255,255,255,.82)!important;
        color:#263249!important;
        box-shadow:0 8px 18px rgba(11,20,56,.09),inset 0 0 18px rgba(255,255,255,.42)!important;
        backdrop-filter:blur(9px);
        -webkit-backdrop-filter:blur(9px);
      }
      #phone-preview [data-staging-look="bold"].preview-service-card,
      #phone-preview [data-staging-look="bold"].preview-product-card,
      #phone-preview [data-staging-look="bold"].preview-business-action,
      #phone-preview [data-staging-look="bold"].preview-payment-action,
      #phone-preview [data-staging-look="bold"]#preview-lead-section{
        background:linear-gradient(135deg,var(--staging-primary),color-mix(in srgb,var(--staging-primary) 72%,var(--staging-secondary)))!important;
        border:1px solid color-mix(in srgb,var(--staging-secondary) 50%,transparent)!important;
        color:#fff!important;
        box-shadow:0 8px 18px rgba(11,20,56,.13)!important;
      }
      #phone-preview [data-staging-look="bold"] strong,
      #phone-preview [data-staging-look="bold"] small,
      #phone-preview [data-staging-look="bold"] em,
      #phone-preview [data-staging-look="bold"] span,
      #phone-preview [data-staging-look="bold"] svg{color:#fff!important}
      #phone-preview [data-staging-look="minimal"].preview-service-card,
      #phone-preview [data-staging-look="minimal"].preview-product-card,
      #phone-preview [data-staging-look="minimal"].preview-business-action,
      #phone-preview [data-staging-look="minimal"].preview-payment-action,
      #phone-preview [data-staging-look="minimal"]#preview-lead-section{
        background:transparent!important;
        border:0!important;
        border-bottom:1px solid color-mix(in srgb,var(--staging-primary) 22%,#d8dde6)!important;
        border-radius:0!important;
        color:#30394c!important;
        box-shadow:none!important;
      }
      @media(max-width:760px){
        .staging-tool-customize-top{align-items:flex-start;flex-direction:column}
        .staging-customize-button{width:100%;justify-content:space-between}
        .staging-tool-look-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
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
    const builderTitle=builder?.querySelector('.rich-card-builder-head h3');
    const builderCopy=builder?.querySelector('.rich-card-builder-head p');
    if(builderTitle)builderTitle.textContent='Beef up your card';
    if(builderCopy)builderCopy.textContent='Your fast 2-minute card stays simple. Open only the extra sections you want and turn them on when they are ready.';
  }

  function toolForCard(card){
    const title=String(card.querySelector('.tool-editor-head h3')?.textContent||'').trim().toLowerCase();
    return TOOL_TITLE_MAP[title]||null;
  }

  function choiceMarkup(tool){
    const current=getLook(tool);
    return LOOKS.map(look=>`<button class="staging-look-choice ${current===look.key?'is-selected':''}" data-tool-look-choice="${look.key}" type="button">
      <span class="staging-look-preview ${look.key}" aria-hidden="true"></span>
      <strong>${look.label}</strong><small>${look.help}</small>
    </button>`).join('');
  }

  function addCustomizer(card,tool){
    if(card.querySelector(':scope > .staging-tool-customize'))return;
    const head=card.querySelector(':scope > .tool-editor-head');
    if(!head)return;
    const current=getLook(tool);
    const box=document.createElement('div');
    box.className='staging-tool-customize';
    box.dataset.toolStyleFor=tool;
    box.innerHTML=`<div class="staging-tool-customize-top">
      <span class="staging-tool-customize-copy"><strong>Customize this section</strong><small>Choose how this feature looks on the customer card.</small></span>
      <button class="staging-customize-button" type="button" aria-expanded="false"><i data-lucide="paintbrush" size="14"></i><span>Customize look</span><span class="staging-current-look">${LOOKS.find(item=>item.key===current)?.label||'Clean'}</span></button>
    </div>
    <div class="staging-tool-look-panel" hidden><div class="staging-tool-look-grid">${choiceMarkup(tool)}</div></div>`;
    head.insertAdjacentElement('afterend',box);

    const toggle=box.querySelector('.staging-customize-button');
    const panel=box.querySelector('.staging-tool-look-panel');
    toggle.addEventListener('click',()=>{
      const opening=panel.hidden;
      document.querySelectorAll('.staging-tool-look-panel').forEach(other=>{if(other!==panel)other.hidden=true;});
      document.querySelectorAll('.staging-customize-button').forEach(other=>{if(other!==toggle)other.setAttribute('aria-expanded','false');});
      panel.hidden=!opening;
      toggle.setAttribute('aria-expanded',String(opening));
    });
    box.addEventListener('click',event=>{
      const choice=event.target.closest('[data-tool-look-choice]');
      if(!choice)return;
      const look=choice.dataset.toolLookChoice;
      setLook(tool,look);
      box.querySelectorAll('[data-tool-look-choice]').forEach(button=>button.classList.toggle('is-selected',button===choice));
      const pill=box.querySelector('.staging-current-look');
      if(pill)pill.textContent=LOOKS.find(item=>item.key===look)?.label||look;
      applyPreviewStyles();
    });
  }

  function mountCustomizers(){
    const content=document.getElementById('business-tools-content');
    if(!content)return false;
    content.querySelectorAll(':scope > .tool-editor-card').forEach(card=>{
      const tool=toolForCard(card);
      if(tool)addCustomizer(card,tool);
    });
    return true;
  }

  function setLookAttribute(element,tool){
    if(element)element.dataset.stagingLook=getLook(tool);
  }

  function applyPreviewStyles(){
    const phone=document.getElementById('phone-preview');
    if(!phone)return;
    const primary=document.querySelector('[name="primary_color"]')?.value||'#0b1438';
    const secondary=document.querySelector('[name="secondary_color"]')?.value||'#d4a84f';
    phone.style.setProperty('--staging-primary',primary);
    phone.style.setProperty('--staging-secondary',secondary);

    document.querySelectorAll('#preview-services-section .preview-service-card').forEach(el=>setLookAttribute(el,'services'));
    document.querySelectorAll('#preview-products-section .preview-product-card').forEach(el=>setLookAttribute(el,'products'));
    setLookAttribute(document.getElementById('preview-lead-section'),'leads');

    document.querySelectorAll('#preview-business-actions .preview-business-action').forEach(el=>{
      const text=String(el.textContent||'').toLowerCase();
      if(text.includes('book an appointment'))setLookAttribute(el,'booking');
      else if(text.includes('make a payment'))setLookAttribute(el,'payment-link');
      else if(text.includes('send an inquiry'))setLookAttribute(el,'leads');
    });

    document.querySelectorAll('#preview-tools .preview-payment-action').forEach(el=>{
      const text=String(el.textContent||'').toLowerCase();
      if(text.includes('pay option'))setLookAttribute(el,'payment-sharing');
      else if(text.trim()==='pay')setLookAttribute(el,'payment-link');
    });
  }

  function refresh(){
    injectStyles();
    restorePreviousWrongExperiment();
    mountCustomizers();
    applyPreviewStyles();
    if(window.lucide)window.lucide.createIcons();
  }

  function init(){
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
