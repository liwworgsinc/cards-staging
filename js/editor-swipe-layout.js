(function(){
  function getAccess(){
    try{return typeof editorAccess!=='undefined'?editorAccess:null;}catch(_){return null;}
  }

  function allowed(){
    const access=getAccess();
    if(!access)return false;
    return Boolean(access.has?.('flow_experience')||(access.isAdmin&&!access.isPlanPreview));
  }

  function currentValue(){
    const experience=document.querySelector('[name="card_experience"]');
    const stored=String(experience?.value||'').toLowerCase();
    if(stored==='flow')return 'flow';
    // Backward-safe fallback for a cached/legacy card row.
    const legacyLayout=String(document.querySelector('[name="card_layout"]')?.value||'').toLowerCase();
    return legacyLayout==='swipe'?'flow':'classic';
  }

  function ensurePreviewStyle(){
    if(document.getElementById('liw-flow-editor-preview-style'))return;
    const style=document.createElement('style');
    style.id='liw-flow-editor-preview-style';
    style.textContent=`
      .preview-swipe-note{display:none;margin:8px 12px 0;padding:9px 10px;border-radius:12px;background:linear-gradient(135deg,#07102e,#132552);color:#fff;box-shadow:0 8px 18px rgba(7,16,46,.18);font-size:.66rem;text-align:left}
      .phone.preview-swipe-selected .preview-swipe-note{display:grid;gap:7px}
      .preview-flow-state-row{display:flex;align-items:center;gap:5px;overflow:hidden}
      .preview-flow-state-row strong{flex:0 0 auto;padding:4px 7px;border-radius:999px;background:#d4a84f;color:#07102e;font-size:.57rem;letter-spacing:.06em}
      .preview-flow-state-row span{flex:0 0 auto;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.10);font-size:.57rem;font-weight:800}
      .preview-flow-state-row span:first-of-type{background:#fff;color:#07102e}
      .preview-flow-state-copy{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#d9deef;font-size:.58rem;line-height:1.3}
      .preview-flow-state-copy b{color:#f0cf78;font-weight:900;white-space:nowrap}
      .phone.preview-swipe-selected .preview-content{position:relative}
      .phone.preview-swipe-selected .preview-public-section{border-radius:12px;box-shadow:inset 0 0 0 1px rgba(11,20,56,.05)}
    `;
    document.head.appendChild(style);
  }

  function syncPreview(value){
    const phone=document.getElementById('phone-preview');
    if(!phone)return;
    ensurePreviewStyle();
    const isFlow=value==='flow';
    phone.classList.toggle('preview-swipe-selected',isFlow);
    phone.dataset.cardExperience=value;
    let note=phone.querySelector('.preview-swipe-note');
    if(!note){
      note=document.createElement('div');
      note.className='preview-swipe-note';
      phone.querySelector('.preview-card-scroll')?.prepend(note);
    }
    note.innerHTML=isFlow
      ? '<div class="preview-flow-state-row"><strong>FLOW</strong><span>About</span><span>Services</span><span>Connect</span></div><div class="preview-flow-state-copy"><span>Fixed identity + swipe-style sections</span><b>Flow active</b></div>'
      : '';
    note.hidden=!isFlow;
  }

  function syncAccessUi(){
    const canFlow=allowed();
    const section=document.getElementById('card-experience-section');
    const flowButton=section?.querySelector('[data-card-experience="flow"]');
    const badge=section?.querySelector('.entitlement-badge');
    if(flowButton){
      flowButton.disabled=!canFlow;
      flowButton.classList.toggle('locked',!canFlow);
      flowButton.setAttribute('aria-disabled',canFlow?'false':'true');
      flowButton.title=canFlow?'Use the Flow card experience':'Flow is included with Pro and Agency plans';
    }
    if(badge){
      badge.className=`entitlement-badge ${canFlow?'included':'locked'}`;
      badge.textContent=canFlow?'Flow included':'Pro+';
    }
    section?.classList.toggle('flow-unlocked',canFlow);
    return canFlow;
  }

  function refresh(){
    let value=currentValue();
    const canFlow=syncAccessUi();
    if(value==='flow'&&!canFlow){
      const input=document.querySelector('[name="card_experience"]');
      if(input)input.value='classic';
      value='classic';
    }
    document.querySelectorAll('[data-card-experience]').forEach(button=>button.classList.toggle('active',button.dataset.cardExperience===value));
    syncPreview(value);
  }

  function selectExperience(value){
    const input=document.querySelector('[name="card_experience"]');
    if(!input)return;
    if(value==='flow'&&!allowed()){
      if(typeof toast==='function')toast('Flow is included with Pro and Agency plans.');
      syncAccessUi();
      return;
    }
    input.value=value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    refresh();
    try{if(typeof render==='function')render();}catch(_){ }
    if(typeof toast==='function')toast(value==='flow'?'Flow selected — saving card experience':'Classic selected — saving card experience');
  }

  function build(){
    if(document.getElementById('card-experience-section'))return true;
    const design=document.querySelector('.editor-panel[data-panel="design"]');
    if(!design)return false;
    const templateSection=design.querySelector('.form-section');
    if(!templateSection)return false;

    const section=document.createElement('div');
    section.className='form-section card-experience-section';
    section.id='card-experience-section';
    section.innerHTML=`
      <div class="feature-section-heading">
        <div><h3>Choose the card experience</h3><p class="muted">Keep the selected template design and choose how customers move through it.</p></div>
        <span class="entitlement-badge">Checking</span>
      </div>
      <div class="card-experience-grid">
        <button class="card-experience-option" type="button" data-card-experience="classic">
          <span class="card-experience-number">A</span>
          <strong><i data-lucide="rows-3" size="17"></i> Classic</strong>
          <span>The familiar vertical card. Customers scroll naturally from top to bottom.</span>
        </button>
        <button class="card-experience-option" type="button" data-card-experience="flow">
          <span class="card-experience-pro">PRO+</span>
          <span class="card-experience-number">B</span>
          <strong><i data-lucide="gallery-horizontal-end" size="17"></i> Flow</strong>
          <span>Your app-like premium experience. Identity stays fixed while business sections move left and right.</span>
        </button>
      </div>
      <p class="card-experience-note"><strong>Template stays intact:</strong> curves, colors, profile placement, cover style and typography remain part of the design you selected.</p>`;
    templateSection.insertAdjacentElement('afterend',section);

    section.querySelectorAll('[data-card-experience]').forEach(button=>button.addEventListener('click',()=>selectExperience(button.dataset.cardExperience)));
    document.querySelector('[name="card_experience"]')?.addEventListener('change',refresh);
    document.querySelector('[name="card_experience"]')?.addEventListener('input',refresh);

    refresh();
    if(window.lucide)lucide.createIcons();
    return true;
  }

  window.LIWFlowExperience={refresh,currentValue,syncAccessUi};

  // Keep syncing during editor startup. The selector may be built before the
  // account entitlement lookup finishes, so refresh the disabled state as soon
  // as Pro, Agency, or LIW Admin access becomes available.
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    build();
    refresh();
    if(getAccess()&&attempts>8)clearInterval(timer);
    if(attempts>80)clearInterval(timer);
  },250);
  build();
})();
