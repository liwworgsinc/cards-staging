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
    sync();
    setTimeout(()=>{addEmailSignatureEntryPoints();sync();},400);
    setTimeout(()=>{addEmailSignatureEntryPoints();sync();},1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();