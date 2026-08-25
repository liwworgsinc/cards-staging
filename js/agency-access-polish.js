(function(){
  'use strict';

  function addCss(key,href){
    if(document.querySelector(`link[data-${key}]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute(`data-${key}`,'true');document.head.appendChild(link);
  }
  function addJs(key,src){
    if(document.querySelector(`script[data-${key}]`))return;
    const script=document.createElement('script');script.src=src;script.setAttribute(`data-${key}`,'true');document.body.appendChild(script);
  }

  function loadFixStyles(){addCss('agency-launch-fixes','css/agency-launch-fixes.css?v=20260813-1');}
  function loadResultsEnhancement(){
    addCss('agency-results','css/agency-results.css?v=20260821-1');
    addJs('agency-results','js/agency-results.js?v=20260821-1');
  }
  function loadCardsEnhancement(){
    addCss('agency-cards-polish','css/agency-cards-polish.css?v=20260821-1');
    addJs('agency-cards-polish','js/agency-cards-polish.js?v=20260821-1');
  }
  function loadSettingsEnhancement(){
    addCss('agency-settings-hub','css/agency-settings-hub.css?v=20260821-1');
    addJs('agency-settings-hub','js/agency-settings-hub.js?v=20260821-1');
    addJs('agency-settings-display-sync','js/agency-settings-display-sync.js?v=20260821-1');
  }
  function loadCapacityEnhancement(){
    addCss('agency-capacity-pack','css/agency-capacity-pack-staging.css?v=20260821-2');
    addJs('agency-capacity-pack','js/agency-capacity-pack-staging.js?v=20260821-2');
  }
  function loadAddClientDialogFix(){addCss('agency-add-client-gap-fix','css/agency-add-client-dialog-gap-fix-staging.css?v=20260821-2');}
  function loadApprovalEnhancement(){
    addCss('agency-approval-workflow','css/agency-approval-workflow-staging.css?v=20260821-6');
    addJs('agency-approval-workflow','js/agency-approval-workflow-staging.js?v=20260821-5');
    addJs('agency-live-approval-guard','js/agency-approval-live-card-guard-staging.js?v=20260821-1');
  }
  function loadApprovalCloseFix(){
    addCss('agency-approval-close-fix','css/agency-approval-close-fix-staging.css?v=20260821-1');
    addJs('agency-approval-close-fix','js/agency-approval-close-fix-staging.js?v=20260821-1');
  }
  function loadMobileEnhancement(){
    addCss('agency-mobile-workspace','css/agency-mobile-workspace-staging.css?v=20260821-2');
    addCss('agency-mobile-workspace-tight','css/agency-mobile-workspace-tight-staging.css?v=20260821-1');
    addCss('agency-section-controls','css/agency-section-controls-staging.css?v=20260825-2');
    addJs('agency-mobile-workspace','js/agency-mobile-workspace-staging.js?v=20260822-4');
  }
  function loadWorkCenter(){
    addCss('agency-work-center','css/agency-work-center-staging.css?v=20260825-1');
    addJs('agency-work-center','js/agency-work-center-staging.js?v=20260825-1');
  }

  function qaPreviewPlan(){try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}catch(_){return '';}}
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
    loadCardsEnhancement();
    loadSettingsEnhancement();
    loadCapacityEnhancement();
    loadAddClientDialogFix();
    loadApprovalEnhancement();
    loadApprovalCloseFix();
    loadMobileEnhancement();
    loadWorkCenter();

    const preview=qaPreviewPlan();
    if(typeof isLiwStagingPlanQaHost==='function'&&isLiwStagingPlanQaHost()&&['starter','plus','pro'].includes(preview)){
      location.replace(typeof liwUrl==='function'?liwUrl('agency.html'):'agency.html');
      return;
    }
    try{
      if(typeof getLiwAccessContext!=='function')return;
      const access=await getLiwAccessContext(null,{refresh:true});
      syncSidebar(String(access?.planKey||''),Boolean(access?.isAdmin),Boolean(access?.isPlanPreview));
    }catch(_){ }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyAccessPolish,{once:true});
  else applyAccessPolish();
})();