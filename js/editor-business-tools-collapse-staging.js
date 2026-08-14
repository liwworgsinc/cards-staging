/* LIW Cards — STAGING ONLY compact business tools + bulk style control — 2026-08-14.
   Keeps every business tool collapsed by default and lets the customer apply
   Clean / Luxe / Glass / Bold to multiple selected tools at once. */
(function(){
  const STYLE_ID='staging-business-tools-collapse-style';
  const TOOL_TITLE_MAP={
    'services':'services',
    'appointment booking':'booking',
    'lead capture':'leads',
    'product showcase':'products',
    'share payment information':'payment-sharing',
    'payment link':'payment-link'
  };
  const TOOL_LABELS={
    services:'Services',
    booking:'Booking',
    leads:'Leads',
    products:'Products',
    'payment-sharing':'Payment info',
    'payment-link':'Payment link'
  };
  const ENABLE_FIELDS={
    services:'services_enabled',
    booking:'booking_enabled',
    leads:'lead_form_enabled',
    products:'products_enabled',
    'payment-sharing':'payment_sharing_enabled'
  };
  const APPEARANCES=[
    ['clean','Clean'],
    ['luxe','Luxe'],
    ['glass','Glass'],
    ['bold','Bold']
  ];

  function cardKey(){
    return new URLSearchParams(location.search).get('id')||'new-card';
  }

  function storageKey(tool){
    return `liw-staging-tool-style:${cardKey()}:${tool}`;
  }

  function getState(tool){
    try{
      const stored=JSON.parse(localStorage.getItem(storageKey(tool))||'null');
      return stored&&typeof stored==='object'?stored:{};
    }catch(_){
      return {};
    }
  }

  function setAppearance(tool,appearance){
    const next={...getState(tool),appearance};
    localStorage.setItem(storageKey(tool),JSON.stringify(next));
  }

  function toolForCard(card){
    const title=String(card.querySelector('.tool-editor-head h3')?.textContent||'').trim().toLowerCase();
    return TOOL_TITLE_MAP[title]||null;
  }

  function isToolEnabled(tool){
    const fieldName=ENABLE_FIELDS[tool];
    if(fieldName){
      const input=document.querySelector(`[name="${fieldName}"]`);
      return Boolean(input?.checked);
    }
    if(tool==='payment-link'){
      return Boolean(String(document.querySelector('[name="payment_url"]')?.value||'').trim());
    }
    return false;
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .staging-bulk-style{
        grid-column:1/-1;
        margin:0 0 10px;
        border:1px solid #dfe4ed;
        border-radius:16px;
        overflow:hidden;
        background:#fff;
        box-shadow:0 7px 18px rgba(11,20,56,.035);
      }
      .staging-bulk-style>summary{
        list-style:none;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:13px 14px;
        background:linear-gradient(180deg,#fbfcfe,#f7f9fc);
      }
      .staging-bulk-style>summary::-webkit-details-marker{display:none}
      .staging-bulk-style-summary-copy{display:flex;align-items:center;gap:10px;min-width:0}
      .staging-bulk-style-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:#0b1438;color:#e8cb79;flex:0 0 auto}
      .staging-bulk-style-summary-copy>span:last-child{display:grid;gap:2px;min-width:0}
      .staging-bulk-style-summary-copy strong{font-size:.78rem;color:#0b1438}
      .staging-bulk-style-summary-copy small{font-size:.62rem;line-height:1.3;color:#788196}
      .staging-bulk-style-state{display:flex;align-items:center;gap:6px;color:#7a5b18;font-size:.6rem;font-weight:900;white-space:nowrap}
      .staging-bulk-style-state svg{transition:transform .18s ease}
      .staging-bulk-style[open] .staging-bulk-style-state svg{transform:rotate(180deg)}
      .staging-bulk-style-body{padding:13px 14px 15px;border-top:1px solid #e9edf3}
      .staging-bulk-tool-list{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}
      .staging-bulk-tool-check{display:inline-flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid #e2e6ed;border-radius:999px;background:#fff;color:#445068;font-size:.63rem;font-weight:800}
      .staging-bulk-tool-check input{accent-color:#0b1438}
      .staging-bulk-style-label{display:block;margin:0 0 7px;color:#58637a;font-size:.63rem;font-weight:900;text-transform:uppercase;letter-spacing:.055em}
      .staging-bulk-looks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .staging-bulk-look{
        min-height:42px;
        border:1px solid #dfe4ec;
        border-radius:11px;
        background:#fff;
        color:#2f3a51;
        font:850 .67rem/1 inherit;
        cursor:pointer;
      }
      .staging-bulk-look:hover{border-color:#bfc8d7;background:#fafbfd}
      .staging-bulk-look[data-look="luxe"]{box-shadow:inset 3px 0 0 #d4a84f}
      .staging-bulk-look[data-look="glass"]{background:linear-gradient(135deg,#fff,rgba(230,237,248,.72))}
      .staging-bulk-look[data-look="bold"]{background:#0b1438;color:#fff;border-color:#0b1438}
      .staging-bulk-note{margin:9px 0 0;color:#7b8497;font-size:.59rem;line-height:1.35}

      .staging-business-card{
        position:relative;
        overflow:hidden;
        transition:border-color .16s ease,box-shadow .16s ease;
      }
      .staging-business-card>.tool-editor-head{margin-bottom:0!important}
      .staging-business-card:not(.is-open)>:not(.tool-editor-head){display:none!important}
      .staging-business-card.is-open{box-shadow:0 10px 24px rgba(11,20,56,.06)}
      .staging-tool-card-toggle{
        margin-left:auto;
        flex:0 0 auto;
        min-width:34px;
        height:34px;
        display:inline-grid;
        place-items:center;
        border:1px solid #dfe4eb;
        border-radius:10px;
        background:#f8fafc;
        color:#465269;
        cursor:pointer;
      }
      .staging-tool-card-toggle svg{transition:transform .18s ease}
      .staging-business-card.is-open .staging-tool-card-toggle svg{transform:rotate(180deg)}
      .staging-tool-card-style-pill{
        margin-left:6px;
        padding:4px 7px;
        border-radius:999px;
        background:#fff6de;
        color:#7a5b18;
        font-size:.55rem;
        font-weight:950;
        white-space:nowrap;
      }
      .staging-business-card.is-open>.staging-business-premium-options,
      .staging-business-card.is-open>:not(.tool-editor-head){margin-left:0;margin-right:0}

      @media(max-width:760px){
        .staging-bulk-style>summary{padding:11px 12px}
        .staging-bulk-style-body{padding:11px 12px 13px}
        .staging-bulk-looks{grid-template-columns:repeat(2,minmax(0,1fr))}
        .staging-business-card>.tool-editor-head{padding:13px 12px!important;gap:9px!important}
        .staging-business-card>.tool-editor-head>div{min-width:0}
        .staging-business-card>.tool-editor-head p{display:none!important}
        .staging-tool-card-style-pill{display:none}
        .staging-tool-card-toggle{width:34px;min-width:34px}
      }
    `;
    document.head.appendChild(style);
  }

  function syncCardStylePill(card,tool){
    const pill=card.querySelector(':scope > .tool-editor-head .staging-tool-card-style-pill');
    if(!pill)return;
    const value=getState(tool).appearance||'clean';
    pill.textContent=APPEARANCES.find(item=>item[0]===value)?.[1]||'Clean';
  }

  function mountCardCollapse(card,tool){
    if(card.dataset.stagingCardCollapsed==='true'){
      syncCardStylePill(card,tool);
      return;
    }
    const head=card.querySelector(':scope > .tool-editor-head');
    if(!head)return;
    card.dataset.stagingCardCollapsed='true';
    card.dataset.stagingToolCard=tool;
    card.classList.add('staging-business-card');
    card.classList.remove('is-open');

    const pill=document.createElement('span');
    pill.className='staging-tool-card-style-pill';
    head.appendChild(pill);

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='staging-tool-card-toggle';
    toggle.setAttribute('aria-label',`Open ${TOOL_LABELS[tool]} settings`);
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<i data-lucide="chevron-down" size="17"></i>';
    head.appendChild(toggle);
    syncCardStylePill(card,tool);

    toggle.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      const opening=!card.classList.contains('is-open');
      document.querySelectorAll('.staging-business-card.is-open').forEach(other=>{
        if(other===card)return;
        other.classList.remove('is-open');
        const otherToggle=other.querySelector(':scope > .tool-editor-head .staging-tool-card-toggle');
        otherToggle?.setAttribute('aria-expanded','false');
      });
      card.classList.toggle('is-open',opening);
      toggle.setAttribute('aria-expanded',String(opening));
      if(!opening)card.querySelector(':scope > .staging-business-premium-options[open]')?.removeAttribute('open');
    });
  }

  function selectedTools(){
    return [...document.querySelectorAll('[data-bulk-tool]:checked')].map(input=>input.dataset.bulkTool);
  }

  function bulkMarkup(){
    const toolChecks=Object.keys(TOOL_LABELS).map(tool=>`<label class="staging-bulk-tool-check"><input type="checkbox" data-bulk-tool="${tool}" ${isToolEnabled(tool)?'checked':''}> ${TOOL_LABELS[tool]}</label>`).join('');
    const looks=APPEARANCES.map(([value,label])=>`<button type="button" class="staging-bulk-look" data-bulk-look="${value}" data-look="${value}">${label}</button>`).join('');
    return `<details class="staging-bulk-style" id="staging-bulk-style">
      <summary>
        <span class="staging-bulk-style-summary-copy"><span class="staging-bulk-style-icon"><i data-lucide="swatches" size="17"></i></span><span><strong>Customize multiple business sections</strong><small>Select the sections, then apply one visual style to all of them.</small></span></span>
        <span class="staging-bulk-style-state"><span>Bulk style</span><i data-lucide="chevron-down" size="15"></i></span>
      </summary>
      <div class="staging-bulk-style-body">
        <span class="staging-bulk-style-label">Apply to</span>
        <div class="staging-bulk-tool-list">${toolChecks}</div>
        <span class="staging-bulk-style-label">Choose one style</span>
        <div class="staging-bulk-looks">${looks}</div>
        <p class="staging-bulk-note">Only the selected sections change. Their individual layouts, headings and other settings stay intact.</p>
      </div>
    </details>`;
  }

  function mountBulkControl(content){
    if(document.getElementById('staging-bulk-style'))return;
    content.insertAdjacentHTML('afterbegin',bulkMarkup());
    const bulk=document.getElementById('staging-bulk-style');
    bulk?.addEventListener('click',event=>{
      const button=event.target.closest('[data-bulk-look]');
      if(!button)return;
      const tools=selectedTools();
      if(!tools.length){
        if(typeof toast==='function')toast('Select at least one business section first.');
        return;
      }
      const appearance=button.dataset.bulkLook;
      tools.forEach(tool=>{
        setAppearance(tool,appearance);
        const details=document.querySelector(`.staging-business-premium-options[data-business-style-for="${tool}"]`);
        const radio=details?.querySelector(`input[data-business-path="appearance"][value="${appearance}"]`);
        if(radio){
          radio.checked=true;
          radio.dispatchEvent(new Event('change',{bubbles:true}));
        }
        const card=document.querySelector(`.staging-business-card[data-staging-tool-card="${tool}"]`);
        if(card)syncCardStylePill(card,tool);
      });
      const label=APPEARANCES.find(item=>item[0]===appearance)?.[1]||appearance;
      if(typeof toast==='function')toast(`${label} applied to ${tools.length} selected section${tools.length===1?'':'s'}.`);
    });
  }

  function syncBulkChecks(){
    document.querySelectorAll('[data-bulk-tool]').forEach(input=>{
      if(document.activeElement===input)return;
      const tool=input.dataset.bulkTool;
      input.checked=isToolEnabled(tool);
    });
  }

  function refresh(){
    injectStyles();
    const content=document.getElementById('business-tools-content');
    if(!content)return;
    mountBulkControl(content);
    content.querySelectorAll(':scope > .tool-editor-card').forEach(card=>{
      const tool=toolForCard(card);
      if(tool)mountCardCollapse(card,tool);
    });
    syncBulkChecks();
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

    document.addEventListener('change',event=>{
      if(event.target.matches('[name="services_enabled"],[name="booking_enabled"],[name="lead_form_enabled"],[name="products_enabled"],[name="payment_sharing_enabled"],[name="payment_url"]'))setTimeout(syncBulkChecks,20);
      if(event.target.matches('.staging-business-premium-options input[data-business-path="appearance"]')){
        const tool=event.target.dataset.businessTool;
        const card=document.querySelector(`.staging-business-card[data-staging-tool-card="${tool}"]`);
        if(card)setTimeout(()=>syncCardStylePill(card,tool),20);
      }
    });
    document.addEventListener('input',event=>{
      if(event.target.matches('[name="payment_url"]'))setTimeout(syncBulkChecks,20);
    });
    document.addEventListener('click',event=>{
      if(event.target.closest('#show-business-tools,.editor-tab,[data-editor-jump],#add-service,#add-product'))setTimeout(refresh,40);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
