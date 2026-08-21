(function(){
  'use strict';

  function loadFixStyles(){
    if(document.querySelector('link[data-agency-launch-fixes]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/agency-launch-fixes.css?v=20260813-1';
    link.dataset.agencyLaunchFixes='true';
    document.head.appendChild(link);
  }

  function loadResultsEnhancement(){
    if(!document.querySelector('link[data-agency-results]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='css/agency-results.css?v=20260821-1';
      link.dataset.agencyResults='true';
      document.head.appendChild(link);
    }
    if(!document.querySelector('link[data-agency-results-collapse]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='css/agency-results-collapse.css?v=20260821-1';
      link.dataset.agencyResultsCollapse='true';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-agency-results]')){
      const script=document.createElement('script');
      script.src='js/agency-results.js?v=20260821-1';
      script.dataset.agencyResults='true';
      document.body.appendChild(script);
    }
    if(!document.querySelector('script[data-agency-results-collapse]')){
      const script=document.createElement('script');
      script.src='js/agency-results-collapse.js?v=20260821-1';
      script.dataset.agencyResultsCollapse='true';
      document.body.appendChild(script);
    }
  }

  function qaPreviewPlan(){
    try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}catch(_){return '';}
  }

  function syncSidebar(planKey,isAdmin=false,isPlanPreview=false){
    const isPro=planKey==='white_label'||(isAdmin&&!isPlanPreview);
    const team=document.getElementById('agency-team-nav');
    const branding=document.getElementById('agency-branding-nav');
    if(team)team.hidden=!isPro;
    if(branding)branding.hidden=!isPro;
  }

  async function applyAccessPolish(){
    loadFixStyles();
    loadResultsEnhancement();

    // The staging QA bar must behave like a real customer account. Admin QA
    // previews of Free, Plus, or Pro do not get Agency workspace access.
    const preview=qaPreviewPlan();
    if(typeof isLiwStagingPlanQaHost==='function'&&isLiwStagingPlanQaHost()&&['starter','plus','pro'].includes(preview)){
      location.replace(typeof liwUrl==='function'?liwUrl('agency.html'):'agency.html');
      return;
    }

    try{
      if(typeof getLiwAccessContext!=='function')return;
      const access=await getLiwAccessContext(null,{refresh:true});
      const plan=String(access?.planKey||'');
      syncSidebar(plan,Boolean(access?.isAdmin),Boolean(access?.isPlanPreview));
    }catch(_){ }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyAccessPolish,{once:true});
  else applyAccessPolish();
})();
