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

  function sync(){
    const plan=previewPlan();
    if(!plan)return;
    const agencyAllowed=['agency','white_label'].includes(plan);
    const admin=document.getElementById('admin-nav-link');
    if(admin)admin.hidden=true;
    document.querySelectorAll('[data-liw-program-link="admin-white-label"]').forEach(item=>{item.hidden=true;});
    document.querySelectorAll('[data-liw-program-link="agency-workspace"]').forEach(item=>{item.hidden=!agencyAllowed;});
  }

  loadDashboardOverviewPolish();

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
    sync();
    setTimeout(sync,400);
    setTimeout(sync,1200);
  },{once:true});
  else{
    sync();
    setTimeout(sync,400);
    setTimeout(sync,1200);
  }
})();
