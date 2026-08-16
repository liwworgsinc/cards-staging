/* LIW Cards — cards-staging only: make Bulk Style affect the visible public-style phone preview. */
(function(){
  'use strict';
  if(window.__LIW_BULK_STYLE_VISIBLE_PREVIEW__)return;
  window.__LIW_BULK_STYLE_VISIBLE_PREVIEW__=true;

  const STYLE_ID='liw-bulk-style-visible-preview-css';
  const APPEARANCES=['clean','luxe','glass','bold'];
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];

  function cardKey(){return new URLSearchParams(location.search).get('id')||'new-card';}
  function storageKey(tool){return `liw-staging-tool-style:${cardKey()}:${tool}`;}
  function getState(tool){
    try{
      const value=JSON.parse(localStorage.getItem(storageKey(tool))||'null');
      return value&&typeof value==='object'?value:{};
    }catch(_){return {};}
  }
  function setAppearance(tool,appearance){
    const next={...getState(tool),appearance};
    localStorage.setItem(storageKey(tool),JSON.stringify(next));
  }
  function selectedTools(){return qa('[data-bulk-tool]:checked').map(input=>input.dataset.bulkTool).filter(Boolean);}
  function accent(){return q('[name="primary_color"]')?.value||'#0b1438';}

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #preview-public-mirror [data-liw-bulk-visible-tool]{--liw-bulk-accent:var(--card-primary,#0b1438);transition:background .16s ease,border-color .16s ease,color .16s ease,box-shadow .16s ease}
      #preview-public-mirror [data-liw-bulk-visible-tool][data-staging-appearance="clean"]{background:#fff!important;border-color:#e4e7ed!important;color:#283247!important;box-shadow:0 4px 12px rgba(11,20,56,.045)!important}
      #preview-public-mirror [data-liw-bulk-visible-tool][data-staging-appearance="luxe"]{background:linear-gradient(145deg,#fffdf8,#fff)!important;border-color:color-mix(in srgb,var(--liw-bulk-accent) 55%,#e8e5dc)!important;color:#263047!important;box-shadow:0 8px 18px rgba(11,20,56,.075),inset 3px 0 0 color-mix(in srgb,var(--liw-bulk-accent) 76%,transparent)!important}
      #preview-public-mirror [data-liw-bulk-visible-tool][data-staging-appearance="glass"]{background:linear-gradient(135deg,rgba(255,255,255,.78),rgba(237,242,250,.58))!important;border-color:rgba(255,255,255,.88)!important;color:#263249!important;box-shadow:0 8px 18px rgba(11,20,56,.09),inset 0 0 18px rgba(255,255,255,.42)!important;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px)}
      #preview-public-mirror [data-liw-bulk-visible-tool][data-staging-appearance="bold"]{background:linear-gradient(135deg,var(--card-primary,#0b1438),color-mix(in srgb,var(--card-primary,#0b1438) 72%,var(--card-secondary,#d4a84f)))!important;border-color:color-mix(in srgb,var(--card-secondary,#d4a84f) 52%,transparent)!important;color:#fff!important;box-shadow:0 8px 18px rgba(11,20,56,.14)!important}
      #preview-public-mirror [data-liw-bulk-visible-tool][data-staging-appearance="bold"] :is(h2,h3,strong,small,span,p,svg){color:#fff!important}
      #preview-public-mirror .lead-capture-section[data-liw-bulk-visible-tool]{padding:12px!important;border:1px solid transparent;border-radius:16px}
      .staging-bulk-look.is-applied{outline:2px solid #0b1438;outline-offset:2px;box-shadow:0 0 0 4px rgba(11,20,56,.08)}
      .staging-bulk-look.is-applied:after{content:' ✓';font-weight:950}
    `;
    document.head.appendChild(style);
  }

  function decorate(element,tool){
    if(!element)return;
    const appearance=String(getState(tool).appearance||'clean').toLowerCase();
    element.dataset.liwBulkVisibleTool=tool;
    element.dataset.stagingAppearance=APPEARANCES.includes(appearance)?appearance:'clean';
    element.style.setProperty('--liw-bulk-accent',accent());
  }

  function clearOld(mirror){
    qa('[data-liw-bulk-visible-tool]',mirror).forEach(el=>{
      delete el.dataset.liwBulkVisibleTool;
      delete el.dataset.stagingAppearance;
      el.style.removeProperty('--liw-bulk-accent');
    });
  }

  function applyVisibleStyles(){
    injectStyles();
    const mirror=document.getElementById('preview-public-mirror');
    if(!mirror)return false;
    clearOld(mirror);

    qa('.public-service-card',mirror).forEach(el=>decorate(el,'services'));
    qa('.public-product-card',mirror).forEach(el=>decorate(el,'products'));
    qa('.payment-sharing-section .payment-share-button',mirror).forEach(el=>decorate(el,'payment-sharing'));
    qa('.lead-capture-section',mirror).forEach(el=>decorate(el,'leads'));

    qa('.preview-mirror-actions .business-action',mirror).forEach(el=>{
      const text=String(el.textContent||'').toLowerCase();
      if(text.includes('book an appointment'))decorate(el,'booking');
      else if(text.includes('make a payment'))decorate(el,'payment-link');
      else if(text.includes('send an inquiry'))decorate(el,'leads');
    });

    syncBulkLookState();
    return true;
  }

  function syncBulkLookState(){
    const tools=selectedTools();
    let common='';
    if(tools.length){
      const looks=tools.map(tool=>String(getState(tool).appearance||'clean'));
      if(looks.every(value=>value===looks[0]))common=looks[0];
    }
    qa('[data-bulk-look]').forEach(button=>button.classList.toggle('is-applied',Boolean(common)&&button.dataset.bulkLook===common));
  }

  function hookMirror(){
    const api=window.LIWStagingPreviewMirror;
    if(!api||typeof api.refresh!=='function')return false;
    if(api.refresh.__liwBulkVisiblePatched)return true;
    const base=api.refresh.bind(api);
    const wrapped=function(...args){
      const result=base(...args);
      requestAnimationFrame(applyVisibleStyles);
      setTimeout(applyVisibleStyles,45);
      return result;
    };
    wrapped.__liwBulkVisiblePatched=true;
    api.refresh=wrapped;
    return true;
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-bulk-look]');
    if(!button)return;
    const tools=selectedTools();
    if(!tools.length)return;
    const appearance=String(button.dataset.bulkLook||'clean');
    tools.forEach(tool=>setAppearance(tool,appearance));
    setTimeout(()=>{
      try{window.LIWStagingPreviewMirror?.refresh?.();}catch(_){ }
      applyVisibleStyles();
    },0);
    setTimeout(applyVisibleStyles,90);
  });

  document.addEventListener('change',event=>{
    if(event.target.matches('[data-bulk-tool],.staging-business-premium-options input[data-business-path="appearance"]')){
      setTimeout(syncBulkLookState,0);
      setTimeout(applyVisibleStyles,25);
    }
  });

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    hookMirror();
    applyVisibleStyles();
    if(attempts>=40)clearInterval(timer);
  },250);
  hookMirror();
  setTimeout(applyVisibleStyles,350);
  setTimeout(applyVisibleStyles,1200);
  window.LIWBulkStyleVisiblePreview={refresh:applyVisibleStyles};
})();
