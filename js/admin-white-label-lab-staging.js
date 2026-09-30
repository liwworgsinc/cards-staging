(() => {
  const panel = document.getElementById('admin-white-label-panel');
  const form = document.getElementById('admin-white-label-form');
  const preview = document.getElementById('admin-workspace-brand-preview');
  if (!panel || !form || !preview || panel.dataset.labV2 === 'true') return;
  panel.dataset.labV2 = 'true';
  panel.classList.add('lab-v2');

  const presets = [
    { name:'LIW Core', primary:'#0b1438', secondary:'#d4a84f', sidebar:'#07102e', theme:'light', button:'rounded' },
    { name:'Midnight Gold', primary:'#111827', secondary:'#f2c66d', sidebar:'#050914', theme:'dark', button:'soft' },
    { name:'Slate Blue', primary:'#334155', secondary:'#7dd3fc', sidebar:'#172033', theme:'light', button:'rounded' },
    { name:'Forest', primary:'#174f3f', secondary:'#d6b86a', sidebar:'#0d2d25', theme:'light', button:'soft' },
    { name:'Warm Sand', primary:'#6a4d38', secondary:'#e8bd73', sidebar:'#34261d', theme:'light', button:'pill' }
  ];

  const safety = panel.querySelector('.admin-branding-safety-note');
  const toolbar = document.createElement('div');
  toolbar.className = 'lab-v2-toolbar';
  toolbar.innerHTML = `
    <div class="lab-v2-summary">
      <div class="lab-v2-summary-top">
        <div class="lab-v2-summary-copy">
          <strong>Brand readiness</strong>
          <span>Build the admin workspace as a complete brand system, not just a logo swap.</span>
        </div>
        <div class="lab-v2-score" id="lab-v2-score">0/5</div>
      </div>
      <div class="lab-v2-checks" id="lab-v2-checks">
        <span class="lab-v2-check" data-check="name"><i data-lucide="type"></i>Name</span>
        <span class="lab-v2-check" data-check="logo"><i data-lucide="image"></i>Logo</span>
        <span class="lab-v2-check" data-check="palette"><i data-lucide="palette"></i>Palette</span>
        <span class="lab-v2-check" data-check="support"><i data-lucide="headset"></i>Support</span>
        <span class="lab-v2-check" data-check="footer"><i data-lucide="panel-bottom"></i>Footer</span>
      </div>
    </div>
    <div class="lab-v2-mode-card">
      <span class="lab-v2-mode-label">Brand visibility</span>
      <div class="lab-v2-mode-switch" role="group" aria-label="Brand visibility mode">
        <button type="button" data-lab-mode="cobrand">LIW + my brand</button>
        <button type="button" data-lab-mode="white">Full white-label</button>
      </div>
      <span class="lab-v2-mode-help" id="lab-v2-mode-help">LIW stays visible while you test your brand beside it.</span>
    </div>`;
  (safety || panel.querySelector('.section-title'))?.insertAdjacentElement('afterend', toolbar);

  const presetsWrap = document.createElement('div');
  presetsWrap.className = 'lab-v2-presets';
  presetsWrap.innerHTML = `
    <div class="lab-v2-presets-head">
      <div><strong>Brand style presets</strong><span>Start with a polished system, then fine-tune the controls below.</span></div>
      <span class="lab-v2-contrast" id="lab-v2-contrast"><i data-lucide="circle-check"></i> Contrast</span>
    </div>
    <div class="lab-v2-preset-grid">
      ${presets.map((p,i)=>`<button class="lab-v2-preset" type="button" data-lab-preset="${i}">
        <span class="lab-v2-swatches"><span style="background:${p.primary}"></span><span style="background:${p.secondary}"></span><span style="background:${p.sidebar}"></span></span>
        <strong>${p.name}</strong>
      </button>`).join('')}
    </div>`;
  toolbar.insertAdjacentElement('afterend', presetsWrap);

  const previewTools = document.createElement('div');
  previewTools.className = 'lab-v2-preview-tools';
  previewTools.innerHTML = `
    <strong>Live workspace preview</strong>
    <div class="lab-v2-device-switch" role="group" aria-label="Preview size">
      <button type="button" class="active" data-lab-device="desktop" aria-label="Desktop preview"><i data-lucide="monitor"></i></button>
      <button type="button" data-lab-device="mobile" aria-label="Mobile preview"><i data-lucide="smartphone"></i></button>
    </div>`;
  preview.prepend(previewTools);

  const shell = preview.querySelector('.workspace-preview-shell');
  if (shell) {
    shell.innerHTML = `
      <div class="workspace-preview-sidebar">
        <div id="admin-workspace-preview-logo">LIW</div>
        <div class="workspace-preview-nav" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      </div>
      <div class="workspace-preview-main">
        <div class="lab-v2-preview-top">
          <div><small>Admin dashboard</small><h3 id="admin-workspace-preview-name">LIW Admin workspace</h3></div>
          <span class="lab-v2-preview-avatar"></span>
        </div>
        <div class="lab-v2-kpis" aria-hidden="true">
          <div class="lab-v2-kpi"><strong>126</strong><span>Accounts</span></div>
          <div class="lab-v2-kpi"><strong>84</strong><span>Published</span></div>
          <div class="lab-v2-kpi"><strong>19</strong><span>Leads</span></div>
        </div>
        <div class="lab-v2-preview-card">
          <div class="lab-v2-preview-card-head"><strong>Customer activity</strong><span>Last 30 days</span></div>
          <div class="lab-v2-preview-bars" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="lab-v2-preview-actions"><button type="button">Primary action</button><button type="button">Open card</button></div>
        </div>
        <p class="lab-v2-preview-footer" id="lab-v2-preview-footer">Internal admin workspace</p>
      </div>`;
  }

  const actions = form.querySelector('.white-label-actions');
  if (actions) {
    const state = document.createElement('div');
    state.className = 'lab-v2-save-state';
    state.innerHTML = '<span><i data-lucide="eye" size="14"></i> Live preview is active</span><span id="lab-v2-dirty-state">Ready to edit</span>';
    actions.insertAdjacentElement('beforebegin', state);
  }

  const $ = id => document.getElementById(id);
  const value = id => String($(id)?.value || '').trim();
  const setValue = (id,val) => {
    const el=$(id); if(!el) return;
    el.value=val;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  };

  function hexToRgb(hex) {
    const h=String(hex||'').replace('#','');
    if(!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  function luminance(rgb){
    return rgb.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)})
      .reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  }
  function contrast(hexA,hexB){
    const a=hexToRgb(hexA),b=hexToRgb(hexB); if(!a||!b) return 0;
    const l1=luminance(a),l2=luminance(b);
    return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
  }

  function hasLogo(){
    return Boolean($('admin-workspace-logo-file')?.files?.[0] || value('admin-workspace-logo-url') || !$('admin-workspace-current-logo')?.hidden);
  }
  function refreshReadiness(){
    const checks={
      name:Boolean(value('admin-workspace-brand-name')),
      logo:hasLogo(),
      palette:Boolean(value('admin-workspace-primary-color')&&value('admin-workspace-secondary-color')&&value('admin-workspace-sidebar-color')),
      support:Boolean(value('admin-workspace-support-email')||value('admin-workspace-support-phone')),
      footer:Boolean(value('admin-workspace-footer-text'))
    };
    let done=0;
    Object.entries(checks).forEach(([key,ok])=>{
      panel.querySelector(`[data-check="${key}"]`)?.classList.toggle('done',ok);
      if(ok) done++;
    });
    const score=$('lab-v2-score');
    if(score){score.textContent=`${done}/5`;score.classList.toggle('ready',done===5)}
  }

  function refreshMode(){
    const full=Boolean($('admin-hide-liw-dashboard-branding')?.checked);
    panel.querySelectorAll('[data-lab-mode]').forEach(btn=>btn.classList.toggle('active',(btn.dataset.labMode==='white')===full));
    const help=$('lab-v2-mode-help');
    if(help) help.textContent=full
      ? 'Your admin workspace uses your test brand as the primary identity.'
      : 'LIW stays visible while you test your brand beside it.';
  }

  function refreshContrast(){
    const primary=value('admin-workspace-primary-color')||'#0b1438';
    const ratio=contrast(primary,'#ffffff');
    const chip=$('lab-v2-contrast');
    if(!chip) return;
    const pass=ratio>=4.5;
    chip.classList.toggle('pass',pass);
    chip.innerHTML=`<i data-lucide="${pass?'circle-check':'circle-alert'}"></i> Text contrast ${ratio.toFixed(1)}:1`;
    if(window.lucide) lucide.createIcons();
  }

  function refreshPreviewExtras(){
    const footer=$('lab-v2-preview-footer');
    if(footer) footer.textContent=value('admin-workspace-footer-text') || 'Internal admin workspace';
    const shell=preview.querySelector('.workspace-preview-shell');
    if(shell){
      shell.style.setProperty('--preview-primary', value('admin-workspace-primary-color')||'#0b1438');
      shell.style.setProperty('--preview-secondary', value('admin-workspace-secondary-color')||'#d4a84f');
    }
  }

  function markDirty(){
    const dirty=$('lab-v2-dirty-state');
    if(dirty){dirty.textContent='Unsaved changes';dirty.classList.add('dirty')}
  }
  function refreshAll(mark=false){
    refreshReadiness();refreshMode();refreshContrast();refreshPreviewExtras();
    if(mark) markDirty();
  }

  panel.querySelectorAll('[data-lab-mode]').forEach(btn=>btn.addEventListener('click',()=>{
    const checkbox=$('admin-hide-liw-dashboard-branding');
    if(!checkbox) return;
    checkbox.checked=btn.dataset.labMode==='white';
    checkbox.dispatchEvent(new Event('change',{bubbles:true}));
    refreshAll(true);
  }));

  panel.querySelectorAll('[data-lab-preset]').forEach(btn=>btn.addEventListener('click',()=>{
    const p=presets[Number(btn.dataset.labPreset)]; if(!p) return;
    setValue('admin-workspace-primary-color',p.primary);
    setValue('admin-workspace-secondary-color',p.secondary);
    setValue('admin-workspace-sidebar-color',p.sidebar);
    setValue('admin-workspace-theme',p.theme);
    setValue('admin-workspace-button-style',p.button);
    refreshAll(true);
  }));

  panel.querySelectorAll('[data-lab-device]').forEach(btn=>btn.addEventListener('click',()=>{
    const mobile=btn.dataset.labDevice==='mobile';
    preview.classList.toggle('is-mobile',mobile);
    panel.querySelectorAll('[data-lab-device]').forEach(b=>b.classList.toggle('active',b===btn));
  }));

  form.addEventListener('input',()=>refreshAll(true));
  form.addEventListener('change',()=>refreshAll(true));

  const observer=new MutationObserver(()=>refreshAll(false));
  const currentLogo=$('admin-workspace-current-logo');
  if(currentLogo) observer.observe(currentLogo,{attributes:true,attributeFilter:['hidden']});

  setTimeout(()=>refreshAll(false),50);
  setTimeout(()=>refreshAll(false),900);
  if(window.lucide) lucide.createIcons();
})();