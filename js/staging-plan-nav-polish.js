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

  function loadEmailSignaturePermissions(){
    if(!/\/email-signature(?:\.html)?$/.test(location.pathname))return;
    if(document.querySelector('script[data-email-signature-permissions]'))return;
    const script=document.createElement('script');
    script.src='js/email-signature-permissions.js?v=20260823-1';
    script.dataset.emailSignaturePermissions='true';
    document.body.appendChild(script);
  }

  function loadVirtualBackgroundPlanGate(){
    if(!/\/virtual-background(?:\.html)?$/.test(location.pathname))return;
    if(document.querySelector('script[data-virtual-background-plan-gate]'))return;
    const script=document.createElement('script');
    script.src='js/virtual-background-plan-gate-staging.js?v=20260823-1';
    script.dataset.virtualBackgroundPlanGate='true';
    document.body.appendChild(script);
  }

  function applyVirtualBackgroundBrandPolish(){
    if(!/\/virtual-background(?:\.html)?$/.test(location.pathname))return;
    if(document.getElementById('liw-vb-brand-polish'))return;
    const style=document.createElement('style');
    style.id='liw-vb-brand-polish';
    style.textContent=`
      .vb-download{
        border-color:var(--primary)!important;
        background:linear-gradient(135deg,var(--primary),var(--secondary))!important;
        color:#fff!important;
        box-shadow:0 10px 24px rgba(11,20,56,.24)!important;
      }
      .vb-download:hover:not(:disabled){
        background:linear-gradient(135deg,var(--primary-dark),var(--secondary))!important;
        box-shadow:0 14px 30px rgba(11,20,56,.34)!important;
        transform:translateY(-1px);
      }
      .vb-download:disabled{opacity:.58;cursor:not-allowed;transform:none;}
    `;
    document.head.appendChild(style);
  }

  function addCreatorEntryPoints(){
    const workspaceNav=document.querySelector('.sidebar nav');
    const mediaLink=workspaceNav?.querySelector('a[href="media.html"]');
    let emailLink=workspaceNav?.querySelector('a[href="email-signature.html"]');
    if(workspaceNav&&mediaLink&&!emailLink){
      emailLink=document.createElement('a');
      emailLink.href='email-signature.html';
      emailLink.dataset.liwEmailSignatureLink='true';
      emailLink.innerHTML='<i data-lucide="signature" size="18"></i> Email signature';
      mediaLink.insertAdjacentElement('afterend',emailLink);
    }

    if(workspaceNav&&!workspaceNav.querySelector('a[href="virtual-background.html"]')){
      const virtualLink=document.createElement('a');
      virtualLink.href='virtual-background.html';
      virtualLink.dataset.liwVirtualBackgroundLink='true';
      virtualLink.innerHTML='<i data-lucide="monitor-up" size="18"></i> Virtual background';
      const anchor=emailLink||mediaLink;
      if(anchor)anchor.insertAdjacentElement('afterend',virtualLink);
      else workspaceNav.appendChild(virtualLink);
    }

    if(!/\/dashboard(?:\.html)?$/.test(location.pathname)){
      if(window.lucide)lucide.createIcons();
      return;
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

    if(grid&&!grid.querySelector('[data-liw-virtual-background-tool]')){
      const tool=document.createElement('a');
      tool.className='card dashboard-tool';
      tool.href='virtual-background.html';
      tool.dataset.liwVirtualBackgroundTool='true';
      tool.innerHTML='<span><i data-lucide="monitor-up"></i></span><div><strong>Create a virtual background</strong><p>Promote yourself on every Zoom, Meet, or Teams call with your card details and a scan-to-card QR.</p></div><i data-lucide="arrow-right"></i>';
      const signature=grid.querySelector('[data-liw-email-signature-tool]');
      if(signature)signature.insertAdjacentElement('afterend',tool);
      else{
        const affiliate=grid.querySelector('a[href="affiliate-dashboard.html"]');
        grid.insertBefore(tool,affiliate||null);
      }
    }

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
    loadEmailSignaturePermissions();
    loadVirtualBackgroundPlanGate();
    applyVirtualBackgroundBrandPolish();
    addCreatorEntryPoints();
    sync();
    setTimeout(()=>{loadEmailSignaturePermissions();loadVirtualBackgroundPlanGate();applyVirtualBackgroundBrandPolish();addCreatorEntryPoints();sync();},400);
    setTimeout(()=>{loadEmailSignaturePermissions();loadVirtualBackgroundPlanGate();applyVirtualBackgroundBrandPolish();addCreatorEntryPoints();sync();},1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();