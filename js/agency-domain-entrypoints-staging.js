/* LIW Cards — staging-only, Agency-safe custom-domain entrypoints.
   Watches only direct card-grid replacements; never observes its own buttons/icons. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_DOMAIN_ENTRYPOINTS__)return;
  window.__LIW_AGENCY_DOMAIN_ENTRYPOINTS__=true;

  function domainHref(cardId='',from='agency-card'){
    const next=new URL('domains.html',location.href);
    if(cardId)next.searchParams.set('card',cardId);
    next.searchParams.set('from',from);
    return `${next.pathname.split('/').pop()}${next.search}`;
  }

  function cardIdFromTile(tile){
    const edit=tile.querySelector('a[href*="editor.html?id="]');
    if(!edit)return '';
    try{return new URL(edit.getAttribute('href')||'',location.href).searchParams.get('id')||'';}
    catch(_){return '';}
  }

  function ensureNav(){
    const firstNav=document.querySelector('.agency-sidebar nav');
    if(!firstNav||firstNav.querySelector('[data-liw-agency-domains]'))return false;
    const link=document.createElement('a');
    link.href=domainHref('','agency-nav');
    link.dataset.liwAgencyDomains='true';
    link.innerHTML='<i data-lucide="globe-2" size="17"></i>Domains';
    const results=firstNav.querySelector('a[href="#results"]');
    if(results)results.insertAdjacentElement('afterend',link);
    else firstNav.appendChild(link);
    return true;
  }

  function wireCards(){
    let changed=false;
    document.querySelectorAll('#agency-card-grid .agency-client-card').forEach(tile=>{
      const actions=tile.querySelector('.agency-template-actions');
      if(!actions||actions.querySelector('[data-liw-agency-card-domain]'))return;
      const id=cardIdFromTile(tile);
      if(!id)return;
      const link=document.createElement('a');
      link.className='btn btn-light btn-sm liw-domain-card-action';
      link.dataset.liwAgencyCardDomain='true';
      link.href=domainHref(id,'agency-card');
      link.innerHTML='<i data-lucide="globe-2" size="14"></i>Domain';
      actions.appendChild(link);
      changed=true;
    });
    return changed;
  }

  function refreshIcons(){
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function boot(){
    let changed=ensureNav();
    changed=wireCards()||changed;
    if(changed)refreshIcons();

    const grid=document.getElementById('agency-card-grid');
    if(!grid)return;
    const observer=new MutationObserver(mutations=>{
      if(!mutations.some(mutation=>mutation.target===grid&&mutation.type==='childList'))return;
      if(wireCards())refreshIcons();
    });
    observer.observe(grid,{childList:true,subtree:false});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();