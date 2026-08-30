/* LIW Cards — staging-only Agency domain cleanup.
   Agency domains now live inside Host & deliver. This file removes legacy
   sidebar, quick-action, and per-card domain shortcuts without touching the
   regular LIW customer domain flow. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_DOMAIN_ENTRYPOINTS__)return;
  window.__LIW_AGENCY_DOMAIN_ENTRYPOINTS__=true;

  function removeLegacyAgencyDomainLinks(root=document){
    root.querySelectorAll([
      '[data-liw-agency-domains]',
      '[data-liw-agency-domain-quick]',
      '[data-liw-agency-card-domain]',
      'a[href^="domains.html?from=agency-nav"]',
      'a[href*="from=agency-card"]',
      'a[href*="from=agency-quick"]'
    ].join(',')).forEach(node=>node.remove());
  }

  function boot(){
    removeLegacyAgencyDomainLinks();

    const sidebar=document.querySelector('.agency-sidebar');
    const grid=document.getElementById('agency-card-grid');
    const quick=document.querySelector('.agency-quick-grid');

    [sidebar,grid,quick].filter(Boolean).forEach(target=>{
      new MutationObserver(()=>removeLegacyAgencyDomainLinks(target)).observe(target,{childList:true,subtree:true});
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
