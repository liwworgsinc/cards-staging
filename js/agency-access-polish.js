(function(){
  'use strict';

  function addStyle(key,href){if(document.querySelector(`link[data-${key}]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset[key.replaceAll('-','')]='true';link.setAttribute(`data-${key}`,'true');document.head.appendChild(link);}
  function addScript(key,src){if(document.querySelector(`script[data-${key}]`))return;const script=document.createElement('script');script.src=src;script.setAttribute(`data-${key}`,'true');document.body.appendChild(script);}

  function loadFixStyles(){addStyle('agency-launch-fixes','css/agency-launch-fixes.css?v=20260813-1');}
  function loadResultsEnhancement(){
    addStyle('agency-results','css/agency-results.css?v=20260821-1');
    addStyle('agency-results-collapse','css/agency-results-collapse.css?v=20260821-1');
    addScript('agency-results','js/agency-results.js?v=20260821-1');
    addScript('agency-results-collapse','js/agency-results-collapse.js?v=20260821-1');
  }
  function loadCardsEnhancement(){
    addStyle('agency-cards-polish','css/agency-cards-polish.css?v=20260821-1');
    addScript('agency-cards-polish','js/agency-cards-polish.js?v=20260821-1');
  }
  function loadSettingsEnhancement(){
    addStyle('agency-settings-hub','css/agency-settings-hub.css?v=20260821-1');
    addScript('agency-settings-hub','js/agency-settings-hub.js?v=20260821-1');
    addScript('agency-settings-display-sync','js/agency-settings-display-sync.js?v=20260821-1');
  }
  function loadCapacityEnhancement(){
    addStyle('agency-capacity-pack','css/agency-capacity-pack-staging.css?v=20260821-2');
    addScript('agency-capacity-pack','js/agency-capacity-pack-staging.js?v=20260821-2');
  }
  function loadAddClientDialogFix(){addStyle('agency-add-client-gap-fix','css/agency-add-client-dialog-gap-fix-staging.css?v=20260821-2');}
  function loadApprovalEnhancement(){
    addStyle('agency-approval-workflow','css/agency-approval-workflow-staging.css?v=20260821-1');
    addScript('agency-approval-workflow','js/agency-approval-workflow-staging.js?v=20260821-1');
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
