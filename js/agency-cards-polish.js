(function(){
  'use strict';

  const STORAGE_KEY='liw_agency_cards_collapsed_v1';
  let frame=0;
  let observer=null;
  let summaryLoaded=false;

  function getCollapsed(){
    try{return localStorage.getItem(STORAGE_KEY)==='1';}catch(_){return false;}
  }

  function saveCollapsed(value){
    try{localStorage.setItem(STORAGE_KEY,value?'1':'0');}catch(_){ }
  }

  function setDetailHeight(wrapper,collapsed,instant=false){
    if(!wrapper)return;
    if(instant){
      wrapper.style.transition='none';
      wrapper.style.maxHeight=collapsed?'0px':`${wrapper.scrollHeight}px`;
      requestAnimationFrame(()=>wrapper.style.removeProperty('transition'));
      return;
    }
    if(collapsed){
      wrapper.style.maxHeight=`${wrapper.scrollHeight}px`;
      requestAnimationFrame(()=>wrapper.style.maxHeight='0px');
    }else{
      wrapper.style.maxHeight='0px';
      requestAnimationFrame(()=>wrapper.style.maxHeight=`${wrapper.scrollHeight}px`);
    }
  }

  function updateCollapseButton(button,collapsed){
    if(!button)return false;
    const nextState=collapsed?'collapsed':'expanded';
    button.setAttribute('aria-expanded',String(!collapsed));
    button.setAttribute('aria-label',collapsed?'Show client cards':'Hide client cards');
    button.title=collapsed?'Show client cards':'Hide client cards';
    if(button.dataset.cardsCollapseState===nextState)return false;
    button.dataset.cardsCollapseState=nextState;
    button.innerHTML=`<span>${collapsed?'Show cards':'Hide cards'}</span><span class="agency-cards-collapse-icon"><i data-lucide="chevron-${collapsed?'down':'up'}" size="15"></i></span>`;
    return true;
  }

  function applyCollapseState(section,collapsed,instant=false){
    const wrapper=section.querySelector('.agency-cards-detail-wrap');
    const button=section.querySelector('[data-agency-cards-collapse]');
    section.classList.toggle('is-collapsed',collapsed);
    const iconChanged=updateCollapseButton(button,collapsed);
    setDetailHeight(wrapper,collapsed,instant);
    if(iconChanged&&window.lucide)lucide.createIcons();
  }

  function ensureSummary(section){
    let summary=section.querySelector('.agency-cards-summary');
    if(summary)return summary;
    const head=section.querySelector('.agency-section-head');
    if(!head)return null;
    summary=document.createElement('div');
    summary.className='agency-cards-summary';
    summary.innerHTML=`
      <div class="agency-cards-summary-label">
        <span class="agency-cards-summary-icon"><i data-lucide="briefcase-business" size="16"></i></span>
        <div><strong>Card portfolio</strong><small>Client inventory at a glance</small></div>
      </div>
      <div class="agency-cards-summary-stats">
        <span><b data-agency-cards-total>—</b><small>Total</small></span>
        <span><b data-agency-cards-published>—</b><small>Published</small></span>
        <span><b data-agency-cards-drafts>—</b><small>Drafts</small></span>
        <span class="agency-cards-capacity"><b data-agency-cards-capacity>—</b><small>Capacity</small></span>
      </div>`;
    head.after(summary);
    return summary;
  }

  function enhanceCardTiles(section){
    let changed=false;
    section.querySelectorAll('#agency-card-grid .agency-client-card').forEach(card=>{
      if(card.dataset.agencyPremiumCard==='true')return;
      card.dataset.agencyPremiumCard='true';
      card.classList.add('agency-premium-card');

      const icon=document.createElement('span');
      icon.className='agency-card-tile-icon';
      icon.innerHTML='<i data-lucide="contact-round" size="17"></i>';
      card.prepend(icon);

      const meta=card.querySelector('.agency-card-meta');
      if(meta){
        const first=meta.querySelector('span');
        if(first){
          const status=String(first.textContent||'').trim().toLowerCase();
          first.classList.add('agency-card-status-pill');
          if(status)first.classList.add(`status-${status.replace(/[^a-z0-9]+/g,'-')}`);
        }
      }

      const actions=card.querySelector('.agency-template-actions');
      if(actions){
        const links=actions.querySelectorAll('a');
        if(links[0]&&!links[0].querySelector('svg,i'))links[0].insertAdjacentHTML('afterbegin','<i data-lucide="pencil-line" size="14"></i>');
        if(links[1]&&!links[1].querySelector('svg,i'))links[1].insertAdjacentHTML('afterbegin','<i data-lucide="eye" size="14"></i>');
      }
      changed=true;
    });
    return changed;
  }

  function ensureStructure(section){
    const card=section.querySelector('.agency-section-card');
    const grid=section.querySelector('#agency-card-grid');
    if(!card||!grid)return false;
    card.classList.add('agency-cards-premium');

    const actions=section.querySelector('.agency-section-actions');
    if(actions&&!actions.querySelector('[data-agency-cards-collapse]')){
      const button=document.createElement('button');
      button.type='button';
      button.className='agency-cards-collapse';
      button.dataset.agencyCardsCollapse='true';
      actions.appendChild(button);
      button.addEventListener('click',()=>{
        const next=!section.classList.contains('is-collapsed');
        saveCollapsed(next);
        applyCollapseState(section,next,false);
      });
    }

    ensureSummary(section);

    let wrapper=section.querySelector('.agency-cards-detail-wrap');
    if(!wrapper){
      wrapper=document.createElement('div');
      wrapper.className='agency-cards-detail-wrap';
      grid.before(wrapper);
      wrapper.appendChild(grid);
      const addon=section.querySelector('.agency-addon-banner');
      if(addon)wrapper.appendChild(addon);
    }

    const changed=enhanceCardTiles(section);
    applyCollapseState(section,getCollapsed(),true);
    return changed;
  }

  async function loadSummary(){
    if(summaryLoaded)return;
    summaryLoaded=true;
    const section=document.getElementById('cards');
    if(!section)return;
    try{
      const user=await requireUser();
      if(!user)return;
      const {data:workspace}=await supabaseClient.rpc('ensure_agency_workspace');
      const ownerId=workspace?.owner_id||workspace?.agency?.owner_user_id||user.id;
      const {data,error}=await supabaseClient.from('digital_cards').select('status').eq('user_id',ownerId);
      if(error)throw error;
      const rows=data||[];
      const published=rows.filter(row=>String(row.status||'').toLowerCase()==='published').length;
      const drafts=rows.filter(row=>String(row.status||'').toLowerCase()==='draft').length;
      section.querySelector('[data-agency-cards-total]')?.replaceChildren(document.createTextNode(String(rows.length)));
      section.querySelector('[data-agency-cards-published]')?.replaceChildren(document.createTextNode(String(published)));
      section.querySelector('[data-agency-cards-drafts]')?.replaceChildren(document.createTextNode(String(drafts)));
      const capacity=String(document.getElementById('agency-capacity-display')?.textContent||'').trim();
      section.querySelector('[data-agency-cards-capacity]')?.replaceChildren(document.createTextNode(capacity||String(rows.length)));
    }catch(error){
      console.warn('Agency Cards summary:',error);
      const total=String(document.getElementById('agency-card-count')?.textContent||'—').trim();
      section.querySelector('[data-agency-cards-total]')?.replaceChildren(document.createTextNode(total));
      const capacity=String(document.getElementById('agency-capacity-display')?.textContent||'—').trim();
      section.querySelector('[data-agency-cards-capacity]')?.replaceChildren(document.createTextNode(capacity));
    }
  }

  function enhance(){
    const section=document.getElementById('cards');
    if(!section)return;
    const changed=ensureStructure(section);
    if(changed&&window.lucide)lucide.createIcons();
  }

  function scheduleEnhance(){
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(enhance);
  }

  function boot(){
    const section=document.getElementById('cards');
    if(!section)return;
    scheduleEnhance();
    loadSummary();
    observer=new MutationObserver(scheduleEnhance);
    observer.observe(section,{childList:true,subtree:true});
    window.addEventListener('resize',()=>{
      const wrapper=section.querySelector('.agency-cards-detail-wrap');
      if(wrapper&&!section.classList.contains('is-collapsed'))wrapper.style.maxHeight=`${wrapper.scrollHeight}px`;
    },{passive:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
