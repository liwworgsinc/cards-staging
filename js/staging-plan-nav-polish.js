(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  function previewPlan(){
    try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}catch(_){return '';}
  }

  function loadDashboardOverviewPolish(){
    if(!/\/dashboard(?:\.html)?$/.test(location.pathname))return;
    if(document.querySelector('link[data-dashboard-overview-polish]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/dashboard-overview-premium-staging.css?v=20260821-1';
    link.dataset.dashboardOverviewPolish='true';
    document.head.appendChild(link);
  }

  function addEmailSignatureEntryPoints(){
    if(!/\/dashboard(?:\.html)?$/.test(location.pathname))return;
    const workspaceNav=document.querySelector('.sidebar nav');
    const mediaLink=workspaceNav?.querySelector('a[href="media.html"]');
    if(workspaceNav&&mediaLink&&!workspaceNav.querySelector('a[href="email-signature.html"]')){
      const navLink=document.createElement('a');
      navLink.href='email-signature.html';
      navLink.dataset.liwEmailSignatureLink='true';
      navLink.innerHTML='<i data-lucide="signature" size="18"></i> Email signature';
      mediaLink.insertAdjacentElement('afterend',navLink);
    }
    const grid=document.querySelector('.dashboard-tool-grid');
    if(grid&&!grid.querySelector('[data-liw-email-signature-tool]')){
      const tool=document.createElement('a');
      tool.className='card dashboard-tool';
      tool.href='email-signature.html';
      tool.dataset.liwEmailSignatureTool='true';
      tool.innerHTML='<span><i data-lucide="signature"></i></span><div><strong>Create an email signature</strong><p>Turn any LIW card into a professional Gmail, Outlook, or Apple Mail signature.</p></div><i data-lucide="arrow-right"></i>';
      const affiliate=grid.querySelector('a[href="affiliate-dashboard.html"]');
      grid.insertBefore(tool,affiliate||null);
    }
    if(window.lucide)lucide.createIcons();
  }

  function installSignatureMobileOverflowFix(){
    if(!/\/email-signature(?:\.html)?$/.test(location.pathname))return;
    if(document.querySelector('style[data-liw-signature-mobile-fix]'))return;

    document.documentElement.classList.add('liw-signature-mobile-fix');
    document.body?.classList.add('liw-signature-mobile-fix');

    const backLink=document.querySelector('.signature-page .topbar-actions a[href="dashboard.html"]');
    if(backLink){
      backLink.dataset.liwSignatureBack='true';
      backLink.setAttribute('aria-label','Back to dashboard');
      backLink.setAttribute('title','Back to dashboard');
    }

    const style=document.createElement('style');
    style.dataset.liwSignatureMobileFix='true';
    style.textContent=`
      html.liw-signature-mobile-fix,body.liw-signature-mobile-fix{max-width:100%;overflow-x:hidden}
      .signature-page{width:100%;max-width:100%;min-width:0;overflow-x:clip}
      .signature-page .main,.signature-page .topbar,.signature-page .topbar>div,.signature-page .topbar-actions,.signature-page .signature-hero,.signature-page .signature-layout,.signature-page .signature-builder,.signature-page .signature-preview-card,.signature-page .signature-section,.signature-page .signature-section-head,.signature-page .signature-section-head>div,.signature-page .signature-field-grid,.signature-page .signature-field,.signature-page .signature-template-grid,.signature-page .signature-template,.signature-page .signature-template-demo,.signature-page .signature-email-canvas,.signature-page .signature-email-copy,.signature-page .signature-actions,.signature-page .signature-install,.signature-page .signature-install-grid,.signature-page .liw-signature-color-control{min-width:0;max-width:100%}
      .signature-page .signature-template{width:100%;overflow:hidden}
      .signature-page .signature-template-demo{width:100%}
      .signature-page .signature-template-demo span:last-child{min-width:0}
      .signature-page .signature-field .input,.signature-page .signature-field input,.signature-page .signature-field select,.signature-page .signature-field textarea{min-width:0;max-width:100%;width:100%}
      .signature-page .signature-section-head p,.signature-page .signature-template small,.signature-page .signature-hero p,.signature-page #signature-user-email{overflow-wrap:anywhere}
      .signature-page #signature-preview{width:100%;min-width:0;max-width:100%;overflow-x:hidden!important}
      .signature-page #signature-preview table{min-width:0!important}
      .signature-page #signature-preview td,.signature-page #signature-preview div,.signature-page #signature-preview a{min-width:0;overflow-wrap:anywhere;word-break:normal}
      @media(max-width:720px){
        .signature-page .main{width:100%;max-width:100%;padding:16px 14px!important;overflow-x:hidden}
        .signature-page .topbar{display:grid!important;grid-template-columns:minmax(0,1fr) 42px;align-items:start!important;gap:10px!important;width:100%}
        .signature-page .topbar>div:first-child{min-width:0;gap:9px!important}
        .signature-page .topbar>div:first-child>div{min-width:0}
        .signature-page .topbar h1{font-size:1.45rem!important;line-height:1.18;overflow-wrap:anywhere}
        .signature-page .topbar-actions{display:block!important;width:42px;min-width:42px;max-width:42px;overflow:hidden}
        .signature-page .topbar-actions .btn,.signature-page .topbar-actions [data-liw-signature-back]{display:grid!important;place-items:center;width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;min-height:42px!important;padding:0!important;font-size:0!important;line-height:0;white-space:nowrap;overflow:hidden;border-radius:12px}
        .signature-page .topbar-actions .btn svg,.signature-page .topbar-actions [data-liw-signature-back] svg{width:18px;height:18px;flex:0 0 18px}
        .signature-page .topbar-actions .user-chip{display:none}
        .signature-page .signature-hero,.signature-page .signature-builder,.signature-page .signature-preview-card,.signature-page .signature-install{width:100%;max-width:100%}
        .signature-page .signature-hero{padding:18px!important}
        .signature-page .signature-builder,.signature-page .signature-preview-card,.signature-page .signature-install{padding:16px!important}
        .signature-page .signature-field-grid,.signature-page .signature-template-grid,.signature-page .signature-install-grid{grid-template-columns:minmax(0,1fr)!important}
        .signature-page .signature-field-grid .full{grid-column:auto!important}
        .signature-page .signature-section-head{flex-wrap:wrap;align-items:flex-start}
        .signature-page .signature-section-head>div{flex:1 1 190px}
        .signature-page .signature-section-head>.btn{flex:0 0 auto}
        .signature-page .signature-template{min-width:0!important;max-width:100%!important}
        .signature-page .signature-email-copy{padding:15px!important;overflow:hidden}
        .signature-page #signature-preview{width:100%!important;max-width:100%!important;overflow:hidden!important;padding-bottom:4px}
        .signature-page #signature-preview>table{width:112%!important;min-width:0!important;max-width:none!important;table-layout:auto!important;transform:scale(.89);transform-origin:top left}
        .signature-page #signature-preview>table>tbody>tr:last-child>td:first-child:not([colspan]){width:54px!important;max-width:54px!important}
        .signature-page #signature-preview>table>tbody>tr:last-child>td:last-child{width:auto!important;min-width:0!important;padding-left:10px!important}
        .signature-page #signature-preview img{width:54px!important;height:54px!important;max-width:54px!important;object-fit:cover!important}
      }
      @media(max-width:390px){
        .signature-page .main{padding-inline:12px!important}
        .signature-page .signature-hero,.signature-page .signature-builder,.signature-page .signature-preview-card,.signature-page .signature-install{padding:14px!important}
        .signature-page .signature-section-head{gap:9px}
        .signature-page #signature-preview>table{width:116%!important;transform:scale(.86)}
        .signature-page #signature-preview>table>tbody>tr:last-child>td:first-child:not([colspan]){width:48px!important;max-width:48px!important}
        .signature-page #signature-preview img{width:48px!important;height:48px!important;max-width:48px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeHex(value){
    const hex=String(value||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(hex))return hex.toUpperCase();
    if(/^[0-9a-f]{6}$/i.test(hex))return `#${hex.toUpperCase()}`;
    return '';
  }

  function installSignatureColorPicker(){
    if(!/\/email-signature(?:\.html)?$/.test(location.pathname))return;
    if(document.querySelector('[data-liw-signature-color-picker]'))return;

    const input=document.getElementById('signature-accent');
    const row=input?.closest('.signature-color-row');
    if(!input||!row)return;

    const current=normalizeHex(input.value)||'#5B5CF0';
    input.type='hidden';
    input.value=current.toLowerCase();
    row.querySelector('.input[disabled]')?.remove();

    const style=document.createElement('style');
    style.dataset.liwSignatureColorPicker='styles';
    style.textContent=`
      .signature-color-row{display:block!important;position:relative;min-width:0;max-width:100%}
      #signature-accent{display:none!important}
      .liw-signature-color-control{position:relative;width:100%;min-width:0;max-width:100%}
      .liw-signature-color-trigger{width:100%;min-width:0;min-height:52px;padding:8px 11px;display:flex;align-items:center;gap:11px;border:1px solid #d0d5dd;border-radius:13px;background:#fff;color:#101828;font:inherit;text-align:left;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.03);transition:border-color .16s ease,box-shadow .16s ease}
      .liw-signature-color-trigger:hover{border-color:#b7b9f6}
      .liw-signature-color-trigger:focus-visible,.liw-signature-color-trigger[aria-expanded="true"]{outline:none;border-color:#7778ef;box-shadow:0 0 0 4px rgba(91,92,240,.10)}
      .liw-signature-color-trigger>svg{margin-left:auto;flex:0 0 auto;color:#667085;transition:transform .16s ease}
      .liw-signature-color-trigger[aria-expanded="true"]>svg{transform:rotate(180deg)}
      .liw-signature-color-chip{width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:var(--liw-picker-color);box-shadow:inset 0 0 0 1px rgba(16,24,40,.10),0 2px 8px rgba(16,24,40,.10)}
      .liw-signature-color-copy{min-width:0;display:grid;gap:1px}
      .liw-signature-color-copy small{color:#667085;font-size:.69rem;font-weight:700}
      .liw-signature-color-copy strong{font-size:.86rem;letter-spacing:.02em;overflow-wrap:anywhere}
      .liw-signature-color-panel{position:absolute;z-index:1200;top:calc(100% + 9px);right:0;width:min(360px,calc(100vw - 48px));max-width:100%;padding:15px;border:1px solid #e4e7ec;border-radius:18px;background:#fff;box-shadow:0 24px 65px rgba(16,24,40,.18),0 4px 14px rgba(16,24,40,.08)}
      .liw-signature-color-panel[hidden]{display:none!important}
      .liw-signature-color-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px}
      .liw-signature-color-head strong{display:block;font-size:.94rem}
      .liw-signature-color-head small{display:block;margin-top:3px;color:#667085;font-size:.72rem;line-height:1.35}
      .liw-signature-color-close{width:34px;height:34px;display:grid;place-items:center;flex:0 0 34px;border:0;border-radius:10px;background:#f2f4f7;color:#475467;cursor:pointer}
      .liw-signature-color-selected{display:flex;align-items:center;gap:11px;padding:10px 11px;margin-bottom:13px;border:1px solid #eaecf0;border-radius:13px;background:#f9fafb;min-width:0}
      .liw-signature-color-selected-swatch{width:42px;height:42px;flex:0 0 42px;border-radius:12px;background:var(--liw-picker-color);box-shadow:inset 0 0 0 1px rgba(16,24,40,.08)}
      .liw-signature-color-selected small{display:block;color:#667085;font-size:.68rem;font-weight:700}
      .liw-signature-color-selected strong{display:block;margin-top:2px;font-size:.9rem;letter-spacing:.03em;overflow-wrap:anywhere}
      .liw-signature-color-swatches{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-bottom:14px}
      .liw-signature-color-swatch{width:100%;min-width:0;aspect-ratio:1;border:2px solid transparent;border-radius:11px;background:var(--swatch);cursor:pointer;box-shadow:inset 0 0 0 1px rgba(16,24,40,.08);transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}
      .liw-signature-color-swatch:hover{transform:translateY(-1px)}
      .liw-signature-color-swatch[aria-pressed="true"]{border-color:#fff;box-shadow:0 0 0 3px #5b5cf0,inset 0 0 0 1px rgba(16,24,40,.08)}
      .liw-signature-custom-label{display:block;margin-bottom:7px;color:#344054;font-size:.72rem;font-weight:800}
      .liw-signature-custom-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;min-width:0}
      .liw-signature-custom-row input{min-width:0;width:100%;height:43px;padding:0 12px;border:1px solid #d0d5dd;border-radius:11px;background:#fff;color:#101828;font:inherit;text-transform:uppercase}
      .liw-signature-custom-row input:focus{outline:none;border-color:#7778ef;box-shadow:0 0 0 3px rgba(91,92,240,.10)}
      .liw-signature-custom-row button{height:43px;padding:0 14px;border:0;border-radius:11px;background:#13162a;color:#fff;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
      .liw-signature-color-error{min-height:17px;margin:6px 2px 0;color:#b42318;font-size:.69rem}
      @media(max-width:720px){.liw-signature-color-panel{position:static;width:100%;max-width:100%;margin-top:9px;padding:14px;border-radius:15px;box-shadow:0 10px 30px rgba(16,24,40,.10)}.liw-signature-color-swatches{grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}}
    `;
    document.head.appendChild(style);

    const control=document.createElement('div');
    control.className='liw-signature-color-control';
    control.dataset.liwSignatureColorPicker='true';
    control.innerHTML=`
      <button class="liw-signature-color-trigger" type="button" aria-expanded="false" aria-controls="liw-signature-color-panel"><span class="liw-signature-color-chip" aria-hidden="true"></span><span class="liw-signature-color-copy"><small>Signature accent</small><strong data-liw-color-value>${current}</strong></span><i data-lucide="chevron-down" size="18"></i></button>
      <div class="liw-signature-color-panel" id="liw-signature-color-panel" hidden>
        <div class="liw-signature-color-head"><div><strong>Choose accent color</strong><small>Pick a polished preset or enter your brand hex.</small></div><button class="liw-signature-color-close" type="button" aria-label="Close color picker"><i data-lucide="x" size="17"></i></button></div>
        <div class="liw-signature-color-selected"><span class="liw-signature-color-selected-swatch" aria-hidden="true"></span><div><small>Selected color</small><strong data-liw-selected-value>${current}</strong></div></div>
        <div class="liw-signature-color-swatches" aria-label="Accent color presets"></div>
        <label class="liw-signature-custom-label" for="liw-signature-custom-hex">Custom hex</label>
        <div class="liw-signature-custom-row"><input id="liw-signature-custom-hex" inputmode="text" maxlength="7" spellcheck="false" value="${current}" aria-label="Custom accent hex color"><button type="button" data-liw-apply-color>Apply</button></div>
        <div class="liw-signature-color-error" aria-live="polite"></div>
      </div>`;
    row.appendChild(control);

    const presets=['#5B5CF0','#6D3CEB','#2563EB','#0F4C81','#0891B2','#0F766E','#16A34A','#D97706','#EA580C','#E11D48','#C026D3','#111827'];
    const swatchWrap=control.querySelector('.liw-signature-color-swatches');
    presets.forEach(color=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='liw-signature-color-swatch';
      button.style.setProperty('--swatch',color);
      button.dataset.color=color;
      button.setAttribute('aria-label',`Use ${color}`);
      button.setAttribute('aria-pressed','false');
      swatchWrap.appendChild(button);
    });

    const trigger=control.querySelector('.liw-signature-color-trigger');
    const panel=control.querySelector('.liw-signature-color-panel');
    const close=control.querySelector('.liw-signature-color-close');
    const hexInput=control.querySelector('#liw-signature-custom-hex');
    const error=control.querySelector('.liw-signature-color-error');

    function updateDisplay(value){
      const color=normalizeHex(value)||'#5B5CF0';
      control.style.setProperty('--liw-picker-color',color);
      control.querySelector('[data-liw-color-value]').textContent=color;
      control.querySelector('[data-liw-selected-value]').textContent=color;
      if(document.activeElement!==hexInput)hexInput.value=color;
      control.querySelectorAll('.liw-signature-color-swatch').forEach(button=>button.setAttribute('aria-pressed',button.dataset.color===color?'true':'false'));
    }
    function applyColor(value){
      const color=normalizeHex(value);
      if(!color){error.textContent='Enter a 6-digit hex color, like #5B5CF0.';return;}
      error.textContent='';
      input.value=color.toLowerCase();
      updateDisplay(color);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    function openPanel(){panel.hidden=false;trigger.setAttribute('aria-expanded','true');updateDisplay(input.value);if(window.lucide)lucide.createIcons();}
    function closePanel(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');}

    trigger.addEventListener('click',()=>panel.hidden?openPanel():closePanel());
    close.addEventListener('click',closePanel);
    swatchWrap.addEventListener('click',event=>{const button=event.target.closest('.liw-signature-color-swatch');if(button)applyColor(button.dataset.color);});
    control.querySelector('[data-liw-apply-color]').addEventListener('click',()=>applyColor(hexInput.value));
    hexInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();applyColor(hexInput.value);}if(event.key==='Escape')closePanel();});
    document.addEventListener('click',event=>{if(!panel.hidden&&!control.contains(event.target))closePanel();});
    document.getElementById('signature-card-select')?.addEventListener('change',()=>setTimeout(()=>updateDisplay(input.value),0));
    document.getElementById('signature-reset')?.addEventListener('click',()=>setTimeout(()=>updateDisplay(input.value),0));

    updateDisplay(current);
    let lastValue=input.value;
    setInterval(()=>{if(input.value!==lastValue){lastValue=input.value;updateDisplay(input.value);}},500);
    if(window.lucide)lucide.createIcons();
  }

  function sync(){
    const plan=previewPlan();
    if(!plan)return;
    const agencyAllowed=['agency','white_label'].includes(plan);
    const admin=document.getElementById('admin-nav-link');
    if(admin)admin.hidden=true;
    document.querySelectorAll('[data-liw-program-link="admin-white-label"]').forEach(item=>{item.hidden=true;});
    document.querySelectorAll('[data-liw-program-link="agency-workspace"]').forEach(item=>{item.hidden=!agencyAllowed;});
  }

  function boot(){
    loadDashboardOverviewPolish();
    addEmailSignatureEntryPoints();
    installSignatureMobileOverflowFix();
    installSignatureColorPicker();
    sync();
    setTimeout(()=>{addEmailSignatureEntryPoints();installSignatureMobileOverflowFix();installSignatureColorPicker();sync();},400);
    setTimeout(()=>{addEmailSignatureEntryPoints();installSignatureMobileOverflowFix();installSignatureColorPicker();sync();},1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();