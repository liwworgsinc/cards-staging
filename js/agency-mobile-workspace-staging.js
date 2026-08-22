/* LIW Cards — staging-only mobile Agency workspace UX. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_MOBILE_WORKSPACE__)return;
  window.__LIW_AGENCY_MOBILE_WORKSPACE__=true;

  const MQ=window.matchMedia('(max-width: 900px)');
  const SECTION_IDS=['clients','cards','templates','results','team','branding','settings'];
  const DEFAULT_COLLAPSED=new Set(['templates','results','team','branding','settings']);
  const STORAGE_PREFIX='liw_agency_mobile_section_';
  let observer=null;
  let frame=0;

  const $=(selector,root=document)=>root.querySelector(selector);
  const all=(selector,root=document)=>Array.from(root.querySelectorAll(selector));

  function storageValue(id){
    try{
      const value=localStorage.getItem(STORAGE_PREFIX+id);
      if(value==='1')return true;
      if(value==='0')return false;
    }catch(_){ }
    return DEFAULT_COLLAPSED.has(id);
  }
  function saveValue(id,collapsed){try{localStorage.setItem(STORAGE_PREFIX+id,collapsed?'1':'0');}catch(_){ }}

  function forceLegacyInnerOpen(){
    if(!MQ.matches)return;
    try{localStorage.removeItem('liw_agency_cards_collapsed_v1');}catch(_){ }
    try{localStorage.removeItem('liw_agency_results_collapsed_v1');}catch(_){ }

    const cards=document.getElementById('cards');
    if(cards){
      cards.classList.remove('is-collapsed');
      const wrap=cards.querySelector('.agency-cards-detail-wrap');
      if(wrap){wrap.style.maxHeight='none';wrap.style.opacity='1';wrap.style.transform='none';wrap.style.pointerEvents='';}
    }
    const results=document.getElementById('results');
    const shell=results?.querySelector('.agency-results-shell');
    if(shell){
      shell.classList.remove('is-collapsed');
      const wrap=shell.querySelector('.agency-results-detail-wrap');
      if(wrap){wrap.style.maxHeight='none';wrap.style.opacity='1';wrap.style.transform='none';wrap.style.pointerEvents='';}
    }
  }

  function updateToggle(section,collapsed){
    const button=section.querySelector('[data-agency-mobile-section-toggle]');
    if(!button)return;
    const title=section.querySelector(':scope > .agency-section-card > .agency-section-head h2')?.textContent?.trim()||section.id;
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',`${collapsed?'Open':'Close'} ${title} section`);
    button.title=`${collapsed?'Open':'Close'} ${title}`;
    if(button.dataset.mobileCollapseState===(collapsed?'closed':'open'))return;
    button.dataset.mobileCollapseState=collapsed?'closed':'open';
    button.innerHTML=`<i data-lucide="chevron-${collapsed?'down':'up'}" size="19"></i>`;
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function setCollapsed(section,collapsed,{save=true,scroll=false}={}){
    if(!section)return;
    section.classList.toggle('agency-mobile-collapsed',collapsed);
    updateToggle(section,collapsed);
    if(save)saveValue(section.id,collapsed);
    if(scroll&&!collapsed){
      requestAnimationFrame(()=>section.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  }

  function ensureSection(section){
    const card=section.querySelector(':scope > .agency-section-card');
    const head=card?.querySelector(':scope > .agency-section-head');
    if(!card||!head)return;
    section.classList.add('agency-mobile-accordion-section');

    let actions=head.querySelector(':scope > .agency-section-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.className='agency-section-actions';
      head.appendChild(actions);
    }
    let button=actions.querySelector('[data-agency-mobile-section-toggle]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='agency-mobile-section-toggle';
      button.dataset.agencyMobileSectionToggle='true';
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        const next=!section.classList.contains('agency-mobile-collapsed');
        setCollapsed(section,next,{save:true});
      });
      actions.appendChild(button);
    }

    if(MQ.matches){
      if(section.dataset.mobileAccordionInitialized!=='true'){
        const hash=location.hash.replace('#','');
        const collapsed=hash===section.id?false:storageValue(section.id);
        section.dataset.mobileAccordionInitialized='true';
        setCollapsed(section,collapsed,{save:false});
      }else{
        updateToggle(section,section.classList.contains('agency-mobile-collapsed'));
      }
    }else{
      section.classList.remove('agency-mobile-collapsed');
      delete section.dataset.mobileAccordionInitialized;
      updateToggle(section,false);
    }
  }

  function labelClientCells(){
    const labels=['Client','Company','Status','Cards','Contact'];
    all('#agency-client-table tr').forEach(row=>{
      all('td',row).forEach((cell,index)=>{
        if(!cell.dataset.mobileLabel)cell.dataset.mobileLabel=labels[index]||'';
      });
    });
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
    const topbar=document.querySelector('.agency-topbar');
    if(!topbar)return;
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
      if(MQ.matches)forceLegacyInnerOpen();
      labelClientCells();
      ensureSidebarBackdrop();
      enhanceTopbar();
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    });
  }

  function handleHash(){
    if(!MQ.matches)return;
    const id=location.hash.replace('#','');
    if(!SECTION_IDS.includes(id))return;
    const section=document.getElementById(id);
    if(section){
      section.dataset.mobileAccordionInitialized='true';
      setCollapsed(section,false,{save:true,scroll:true});
    }
  }

  function resetResponsiveState(){
    SECTION_IDS.forEach(id=>{
      const section=document.getElementById(id);
      if(section)delete section.dataset.mobileAccordionInitialized;
    });
    document.body.classList.remove('agency-mobile-nav-open');
    enhance();
  }

  function boot(){
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
      const link=event.target.closest?.('.agency-sidebar a[href^="#"]');
      if(!link)return;
      const id=String(link.getAttribute('href')||'').replace('#','');
      if(SECTION_IDS.includes(id))setTimeout(()=>{const section=document.getElementById(id);if(section){section.dataset.mobileAccordionInitialized='true';setCollapsed(section,false,{save:true,scroll:true});}},40);
    });

    window.addEventListener('hashchange',handleHash);
    if(typeof MQ.addEventListener==='function')MQ.addEventListener('change',resetResponsiveState);
    else MQ.addListener(resetResponsiveState);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
