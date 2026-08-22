/* LIW Cards — staging-only responsive Agency section controls + mobile UX. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_SECTION_CONTROLS_STAGING__)return;
  window.__LIW_AGENCY_SECTION_CONTROLS_STAGING__=true;

  const MQ=window.matchMedia('(max-width: 900px)');
  const SECTION_IDS=['clients','cards','templates','results','team','branding','settings'];
  const MOBILE_DEFAULT_COLLAPSED=new Set(['templates','results','team','branding','settings']);
  const STORAGE_MOBILE='liw_agency_mobile_section_';
  const STORAGE_DESKTOP='liw_agency_desktop_section_';
  let observer=null;
  let frame=0;

  const all=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const storagePrefix=()=>MQ.matches?STORAGE_MOBILE:STORAGE_DESKTOP;

  function storageValue(id){
    try{
      const value=localStorage.getItem(storagePrefix()+id);
      if(value==='1')return true;
      if(value==='0')return false;
    }catch(_){ }
    return MQ.matches&&MOBILE_DEFAULT_COLLAPSED.has(id);
  }
  function saveValue(id,collapsed){try{localStorage.setItem(storagePrefix()+id,collapsed?'1':'0');}catch(_){ }}

  function removeLegacyControls(section){
    if(!section)return;
    section.classList.remove('is-collapsed','mobile-expanded','agency-mobile-collapsed','agency-mobile-collapsible','agency-mobile-accordion-section');
    section.querySelectorAll('.agency-mobile-section-toggle,[data-agency-mobile-section-toggle],[data-agency-cards-collapse],[data-agency-results-collapse]').forEach(node=>node.remove());
    const cardsWrap=section.querySelector('.agency-cards-detail-wrap');
    if(cardsWrap){['max-height','opacity','transform','pointer-events','transition'].forEach(prop=>cardsWrap.style.removeProperty(prop));}
    const resultsShell=section.querySelector('.agency-results-shell');
    resultsShell?.classList.remove('is-collapsed');
    const resultsWrap=section.querySelector('.agency-results-detail-wrap');
    if(resultsWrap){['max-height','opacity','transform','pointer-events','transition'].forEach(prop=>resultsWrap.style.removeProperty(prop));}
  }

  /* Results rebuilds its card after analytics loads. Promote its toolbar to the
     canonical section header so it keeps the same accordion contract as every
     other Agency section without losing range / Analytics / Leads controls. */
  function resolveStructure(section){
    const card=section.querySelector(':scope > .agency-section-card');
    if(!card)return {card:null,head:null};
    let head=card.querySelector(':scope > .agency-section-head');
    if(!head&&section.id==='results'){
      const shell=card.querySelector(':scope > .agency-results-shell');
      const toolbar=shell?.querySelector(':scope > .agency-results-toolbar');
      if(toolbar){
        toolbar.classList.add('agency-section-head','agency-results-section-head');
        shell.before(toolbar);
        head=toolbar;
      }
    }
    return {card,head};
  }

  function updateToggle(section,collapsed){
    const button=section.querySelector(':scope > .agency-section-card > .agency-section-head > [data-agency-section-toggle]');
    if(!button)return;
    const title=section.querySelector(':scope > .agency-section-card > .agency-section-head h2')?.textContent?.trim()||section.id||'section';
    const action=collapsed?'Open':'Hide';
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',`${action} ${title} section`);
    button.title=`${action} ${title}`;
    const state=collapsed?'closed':'open';
    if(button.dataset.collapseState===state)return;
    button.dataset.collapseState=state;
    button.innerHTML=`<span class="agency-section-toggle-label">${action}</span><span class="agency-section-toggle-icon"><i data-lucide="chevron-${collapsed?'down':'up'}" size="15" aria-hidden="true"></i></span>`;
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function setCollapsed(section,collapsed,{save=true,scroll=false}={}){
    if(!section)return;
    section.classList.toggle('agency-section-collapsed',collapsed);
    updateToggle(section,collapsed);
    if(save)saveValue(section.id,collapsed);
    if(scroll&&!collapsed)requestAnimationFrame(()=>section.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  function ensureSection(section){
    removeLegacyControls(section);
    const {card,head}=resolveStructure(section);
    if(!card||!head)return;
    section.classList.add('agency-accordion-section');

    /* The collapse control is a direct child of the section header, after the
       section action group. This keeps Cards identical to Clients/Templates/etc
       instead of mixing Open/Hide with Create/Manage/Host actions. */
    let button=head.querySelector(':scope > [data-agency-section-toggle]');
    section.querySelectorAll('[data-agency-section-toggle]').forEach(node=>{if(node!==button)node.remove();});
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='agency-section-toggle';
      button.dataset.agencySectionToggle='true';
      head.appendChild(button);
    }else if(button.parentElement!==head){
      head.appendChild(button);
    }

    const mode=MQ.matches?'mobile':'desktop';
    if(section.dataset.agencyAccordionMode!==mode){
      section.dataset.agencyAccordionMode=mode;
      const hash=decodeURIComponent(location.hash.replace(/^#/,''));
      setCollapsed(section,hash===section.id?false:storageValue(section.id),{save:false});
    }else updateToggle(section,section.classList.contains('agency-section-collapsed'));
  }

  function labelClientCells(){
    const labels=['Client','Company','Status','Cards','Contact'];
    all('#agency-client-table tr').forEach(row=>all('td',row).forEach((cell,index)=>{if(!cell.dataset.mobileLabel)cell.dataset.mobileLabel=labels[index]||'';}));
  }

  function ensureSidebarBackdrop(){
    const shell=document.getElementById('agency-workspace-shell');
    if(!shell)return;
    let backdrop=document.querySelector('[data-agency-mobile-sidebar-backdrop]');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='agency-mobile-sidebar-backdrop';
      backdrop.dataset.agencyMobileSidebarBackdrop='true';
      backdrop.setAttribute('aria-label','Close Agency navigation');
      backdrop.addEventListener('click',()=>shell.classList.remove('sidebar-open'));
      document.body.appendChild(backdrop);
    }
    const open=MQ.matches&&shell.classList.contains('sidebar-open');
    backdrop.classList.toggle('is-visible',open);
    document.body.classList.toggle('agency-mobile-nav-open',open);
  }

  function enhanceTopbar(){
    const add=document.getElementById('top-add-client');
    if(add&&!add.dataset.mobileCopyReady){
      add.dataset.mobileCopyReady='true';
      const label=add.querySelector('span');
      if(label)label.dataset.fullLabel=label.textContent||'Add client';
    }
  }

  function enhance(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      SECTION_IDS.forEach(id=>{const section=document.getElementById(id);if(section)ensureSection(section);});
      labelClientCells();
      ensureSidebarBackdrop();
      enhanceTopbar();
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    });
  }

  function openHashTarget(){
    const id=decodeURIComponent(location.hash.replace(/^#/,''));
    if(!SECTION_IDS.includes(id))return;
    const section=document.getElementById(id);
    if(section)setCollapsed(section,false,{save:true,scroll:true});
  }

  function resetResponsiveState(){
    SECTION_IDS.forEach(id=>{const section=document.getElementById(id);if(section)delete section.dataset.agencyAccordionMode;});
    enhance();
  }

  function boot(){
    try{localStorage.removeItem('liw_agency_cards_collapsed_v1');localStorage.removeItem('liw_agency_results_collapsed_v1');}catch(_){ }
    enhance();
    const shell=document.getElementById('agency-workspace-shell');
    observer=new MutationObserver(mutations=>{
      let relevant=false;
      for(const mutation of mutations){
        if(mutation.type==='attributes'&&mutation.target===shell&&mutation.attributeName==='class')ensureSidebarBackdrop();
        if(mutation.type==='childList')relevant=true;
      }
      if(relevant)enhance();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

    document.addEventListener('click',event=>{
      const toggle=event.target.closest?.('[data-agency-section-toggle]');
      if(toggle){
        event.preventDefault();
        event.stopPropagation();
        const section=toggle.closest('.agency-section');
        if(section)setCollapsed(section,!section.classList.contains('agency-section-collapsed'),{save:true});
        return;
      }
      const link=event.target.closest?.('.agency-sidebar a[href^="#"]');
      if(!link)return;
      const id=String(link.getAttribute('href')||'').replace(/^#/,'');
      if(SECTION_IDS.includes(id))setTimeout(openHashTarget,40);
    });

    window.addEventListener('hashchange',openHashTarget);
    if(typeof MQ.addEventListener==='function')MQ.addEventListener('change',resetResponsiveState);
    else MQ.addListener(resetResponsiveState);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
