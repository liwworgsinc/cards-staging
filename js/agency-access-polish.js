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
      const link=document.createElement('link');link.rel='stylesheet';link.href='css/agency-results.css?v=20260821-1';link.dataset.agencyResults='true';document.head.appendChild(link);
    }
    if(!document.querySelector('link[data-agency-results-collapse]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='css/agency-results-collapse.css?v=20260821-1';link.dataset.agencyResultsCollapse='true';document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-agency-results]')){
      const script=document.createElement('script');script.src='js/agency-results.js?v=20260821-1';script.dataset.agencyResults='true';document.body.appendChild(script);
    }
    if(!document.querySelector('script[data-agency-results-collapse]')){
      const script=document.createElement('script');script.src='js/agency-results-collapse.js?v=20260821-1';script.dataset.agencyResultsCollapse='true';document.body.appendChild(script);
    }
  }

  function loadCardsEnhancement(){
    if(!document.querySelector('link[data-agency-cards-polish]')){const link=document.createElement('link');link.rel='stylesheet';link.href='css/agency-cards-polish.css?v=20260821-1';link.dataset.agencyCardsPolish='true';document.head.appendChild(link);}
    if(!document.querySelector('script[data-agency-cards-polish]')){const script=document.createElement('script');script.src='js/agency-cards-polish.js?v=20260821-1';script.dataset.agencyCardsPolish='true';document.body.appendChild(script);}
  }

  function loadSettingsEnhancement(){
    if(!document.querySelector('link[data-agency-settings-hub]')){const link=document.createElement('link');link.rel='stylesheet';link.href='css/agency-settings-hub.css?v=20260821-1';link.dataset.agencySettingsHub='true';document.head.appendChild(link);}
    if(!document.querySelector('script[data-agency-settings-hub]')){const script=document.createElement('script');script.src='js/agency-settings-hub.js?v=20260821-1';script.dataset.agencySettingsHub='true';document.body.appendChild(script);}
    if(!document.querySelector('script[data-agency-settings-display-sync]')){const script=document.createElement('script');script.src='js/agency-settings-display-sync.js?v=20260821-1';script.dataset.agencySettingsDisplaySync='true';document.body.appendChild(script);}
  }

  function loadCapacityEnhancement(){
    if(!document.querySelector('link[data-agency-capacity-pack]')){const link=document.createElement('link');link.rel='stylesheet';link.href='css/agency-capacity-pack-staging.css?v=20260821-2';link.dataset.agencyCapacityPack='true';document.head.appendChild(link);}
    if(!document.querySelector('script[data-agency-capacity-pack]')){const script=document.createElement('script');script.src='js/agency-capacity-pack-staging.js?v=20260821-2';script.dataset.agencyCapacityPack='true';document.body.appendChild(script);}
  }

  function loadAddClientDialogFix(){
    if(document.querySelector('link[data-agency-add-client-gap-fix]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='css/agency-add-client-dialog-gap-fix-staging.css?v=20260821-2';link.dataset.agencyAddClientGapFix='true';document.head.appendChild(link);
  }

  function loadApprovalEnhancement(){
    if(!document.querySelector('link[data-agency-approval-workflow]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='css/agency-approval-workflow-staging.css?v=20260821-4';link.dataset.agencyApprovalWorkflow='true';document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-agency-approval-workflow]')){
      const script=document.createElement('script');script.src='js/agency-approval-workflow-staging.js?v=20260821-4';script.dataset.agencyApprovalWorkflow='true';document.body.appendChild(script);
    }
  }

  function qaPreviewPlan(){try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}catch(_){return '';}}
  function syncSidebar(planKey,isAdmin=false,isPlanPreview=false){
    const isPro=planKey==='white_label'||(isAdmin&&!isPlanPreview);
    const team=document.getElementById('agency-team-nav');const branding=document.getElementById('agency-branding-nav');
    if(team)team.hidden=!isPro;if(branding)branding.hidden=!isPro;
  }

  async function applyAccessPolish(){
    loadFixStyles();loadResultsEnhancement();loadCardsEnhancement();loadSettingsEnhancement();loadCapacityEnhancement();loadAddClientDialogFix();loadApprovalEnhancement();
    const preview=qaPreviewPlan();
    if(typeof isLiwStagingPlanQaHost==='function'&&isLiwStagingPlanQaHost()&&['starter','plus','pro'].includes(preview)){
      location.replace(typeof liwUrl==='function'?liwUrl('agency.html'):'agency.html');return;
    }
    try{if(typeof getLiwAccessContext!=='function')return;const access=await getLiwAccessContext(null,{refresh:true});syncSidebar(String(access?.planKey||''),Boolean(access?.isAdmin),Boolean(access?.isPlanPreview));}catch(_){ }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyAccessPolish,{once:true});else applyAccessPolish();
})();
