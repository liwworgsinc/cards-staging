/* LIW Cards — cards-staging only: keep the editor phone faithful to card.html/public-card.js. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_WYSIWYG_STAGING__) return;
  window.__LIW_EDITOR_WYSIWYG_STAGING__=true;

  const STYLE_ID='liw-editor-wysiwyg-staging-css';
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];

  function val(name){
    try{
      if(typeof value==='function') return value(name);
      const el=document.querySelector(`[name="${name}"]`);
      if(!el) return '';
      return el.type==='checkbox'?el.checked:(el.value||'');
    }catch(_){ return ''; }
  }

  function esc(raw){
    try{ if(typeof escapeHtml==='function') return escapeHtml(String(raw??'')); }catch(_){ }
    return String(raw??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* #7: public card is the visual source of truth. */
      #preview-public-mirror{display:grid;gap:0;margin-top:0;text-align:left}
      #preview-public-mirror[hidden]{display:none!important}
      #preview-public-mirror .public-section{margin:0;padding:20px 0;border-radius:0;box-shadow:none;border-top:1px solid rgba(0,0,0,.08);background:transparent;text-align:left}
      #preview-public-mirror .public-section-heading{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:13px}
      #preview-public-mirror .public-section-heading h2{font-size:1rem;line-height:1.2;margin:0;color:inherit}
      #preview-public-mirror .public-section-heading span{font-size:.7rem;color:var(--muted,#697089);font-weight:700}

      #preview-public-mirror .public-product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      #preview-public-mirror .public-product-card{border:1px solid rgba(0,0,0,.09)!important;border-radius:16px;overflow:hidden;background:rgba(255,255,255,.62)!important;color:inherit!important;box-shadow:none!important}
      #preview-public-mirror .public-product-card>img,#preview-public-mirror .product-placeholder{width:100%;height:125px;object-fit:cover;background:#eef0f6}
      #preview-public-mirror .product-placeholder{display:grid;place-items:center;color:var(--muted,#697089)}
      #preview-public-mirror .public-product-copy{padding:11px}
      #preview-public-mirror .public-product-copy h3{font-size:.86rem;margin:0 0 4px;color:inherit!important}
      #preview-public-mirror .public-product-copy p{font-size:.7rem;color:var(--muted,#697089)!important;margin:0 0 9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      #preview-public-mirror .public-product-copy>div{display:flex;align-items:center;justify-content:space-between;gap:7px}
      #preview-public-mirror .public-product-copy strong{font-size:.8rem;color:inherit!important}
      #preview-public-mirror .preview-public-buy{display:inline-flex;align-items:center;gap:3px;color:var(--card-primary,#0b1438)!important;font-size:.72rem;font-weight:900}

      #preview-public-mirror .lead-capture-section{background:linear-gradient(145deg,rgba(91,92,240,.08),rgba(155,93,229,.08))!important;padding:16px!important;border:0!important;border-radius:18px!important;color:inherit!important;box-shadow:none!important}
      #preview-public-mirror .public-lead-form{display:grid;gap:9px}
      #preview-public-mirror .lead-form-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      #preview-public-mirror .public-lead-form .input{width:100%;min-width:0;border:1px solid var(--border,#e2e4e9);border-radius:13px;padding:13px 14px;background:#fff;color:var(--ink,#0b1224)!important;box-shadow:none;font:inherit;font-size:.72rem;line-height:1.25;appearance:auto}
      #preview-public-mirror .public-lead-form .input::placeholder{color:#697089;opacity:1}
      #preview-public-mirror .public-lead-form select.input{min-height:43px}
      #preview-public-mirror .public-lead-form textarea.input{min-height:95px;resize:none}
      #preview-public-mirror .public-lead-form .btn{min-height:46px;border:0;border-radius:var(--card-radius,16px);padding:10px 12px;font-weight:800}
      #preview-public-mirror .public-lead-form .btn-primary{background:linear-gradient(135deg,var(--card-primary,#0b1438),var(--card-secondary,#d4a84f))!important;color:#fff!important}
      #preview-public-mirror .public-lead-form .btn:disabled{opacity:.58}
      #preview-public-mirror .public-lead-form small{text-align:center;color:var(--muted,#697089)!important;font-size:.65rem;line-height:1.4}

      /* Neutralize the old preview-only Bulk Style paint. Those values are not
         persisted to the public card, so showing them here would not be WYSIWYG. */
      #preview-public-mirror .public-service-card[data-liw-bulk-visible-tool]{background:rgba(255,255,255,.55)!important;border-color:rgba(0,0,0,.09)!important;color:inherit!important;box-shadow:none!important}
      #preview-public-mirror .public-product-card[data-liw-bulk-visible-tool]{background:rgba(255,255,255,.62)!important;border-color:rgba(0,0,0,.09)!important;color:inherit!important;box-shadow:none!important}
      #preview-public-mirror .lead-capture-section[data-liw-bulk-visible-tool]{background:linear-gradient(145deg,rgba(91,92,240,.08),rgba(155,93,229,.08))!important;border:0!important;color:inherit!important;box-shadow:none!important;padding:16px!important}
      #preview-public-mirror :is(.public-service-card,.public-product-card,.lead-capture-section)[data-liw-bulk-visible-tool] :is(h2,h3,strong,small,span,p,svg){color:inherit!important}
      #preview-public-mirror .public-product-card[data-liw-bulk-visible-tool] .preview-public-buy{color:var(--card-primary,#0b1438)!important}
      #preview-public-mirror .lead-capture-section[data-liw-bulk-visible-tool] .public-section-heading span,#preview-public-mirror .lead-capture-section[data-liw-bulk-visible-tool] .public-lead-form small{color:var(--muted,#697089)!important}
      #preview-public-mirror .lead-capture-section[data-liw-bulk-visible-tool] .public-lead-form .input{color:var(--ink,#0b1224)!important}

      #preview-public-mirror a,#preview-public-mirror button,#preview-public-mirror input,#preview-public-mirror select,#preview-public-mirror textarea{pointer-events:none}
      @media(max-width:340px){
        #preview-public-mirror .public-lead-form .input{padding:11px 10px;font-size:.68rem}
        #preview-public-mirror .lead-form-row{gap:7px}
      }
    `;
    document.head.appendChild(style);
  }

  function serviceNames(){
    if(!val('services_enabled')) return [];
    try{
      return (Array.isArray(services)?services:[]).map(item=>String(item?.name||'').trim()).filter(Boolean);
    }catch(_){ return []; }
  }

  function syncLeadForm(){
    const mirror=document.getElementById('preview-public-mirror');
    const section=q('.lead-capture-section',mirror);
    if(!section) return false;
    const form=q('.public-lead-form',section);
    if(!form) return false;

    const names=serviceNames();
    const draft=String(val('status')||'draft')!=='published';
    const select=names.length
      ? `<select aria-label="Service interest" class="input" tabindex="-1"><option value="">What are you interested in?</option>${names.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select>`
      : '';
    form.className='public-lead-form preview-lead-form';
    form.innerHTML=`
      <div class="lead-form-row"><input aria-label="Your name" class="input" placeholder="Your name" readonly tabindex="-1"><input aria-label="Phone number" class="input" placeholder="Phone number" type="tel" readonly tabindex="-1"></div>
      <input aria-label="Email address" class="input" placeholder="Email address" type="email" readonly tabindex="-1">
      ${select}
      <textarea aria-label="How can I help you?" class="input" placeholder="How can I help you?" readonly tabindex="-1"></textarea>
      <button class="btn btn-primary btn-block preview-disabled-submit" type="button" ${draft?'disabled':''}><i data-lucide="${draft?'eye':'send'}" size="17"></i> ${draft?'Disabled in draft preview':'Send inquiry'}</button>
      <small>Your information goes directly to the card owner.</small>`;
    return true;
  }

  function clearPreviewOnlyBulkPaint(){
    const mirror=document.getElementById('preview-public-mirror');
    if(!mirror) return false;
    qa('[data-liw-bulk-visible-tool]',mirror).forEach(el=>{
      delete el.dataset.liwBulkVisibleTool;
      delete el.dataset.stagingAppearance;
      el.style.removeProperty('--liw-bulk-accent');
    });
    return true;
  }

  function sync(){
    injectStyles();
    const mirror=document.getElementById('preview-public-mirror');
    if(!mirror) return false;
    syncLeadForm();
    clearPreviewOnlyBulkPaint();
    if(window.lucide) try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function hookMirror(){
    const api=window.LIWStagingPreviewMirror;
    if(!api||typeof api.refresh!=='function') return false;
    if(api.refresh.__liwWysiwygPatched) return true;
    const base=api.refresh.bind(api);
    const wrapped=function(...args){
      const result=base(...args);
      requestAnimationFrame(sync);
      setTimeout(sync,35);
      setTimeout(sync,95);
      return result;
    };
    wrapped.__liwWysiwygPatched=true;
    api.refresh=wrapped;
    return true;
  }

  function hookBulkApi(){
    const api=window.LIWBulkStyleVisiblePreview;
    if(!api||api.__liwWysiwygPatched) return false;
    api.__liwWysiwygPatched=true;
    const baseRefresh=typeof api.refresh==='function'?api.refresh.bind(api):null;
    api.refresh=function(...args){
      const result=baseRefresh?baseRefresh(...args):undefined;
      requestAnimationFrame(sync);
      setTimeout(sync,25);
      return result;
    };
    return true;
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-bulk-look],[data-bulk-tool],.editor-tab,.tool-editor-card')){
      requestAnimationFrame(sync);
      setTimeout(sync,40);
      setTimeout(sync,120);
    }
  });
  document.addEventListener('input',()=>requestAnimationFrame(sync));
  document.addEventListener('change',()=>{requestAnimationFrame(sync);setTimeout(sync,35);});

  injectStyles();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    hookMirror();
    hookBulkApi();
    sync();
    if(attempts>=60) clearInterval(timer);
  },250);
  setTimeout(sync,100);
  setTimeout(sync,650);
  setTimeout(sync,1500);
  window.LIWEditorWysiwygStaging={refresh:sync};
})();
