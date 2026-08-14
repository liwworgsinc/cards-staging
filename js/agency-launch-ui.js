(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);

  function addStylesheet(){
    if(document.querySelector('link[data-agency-launch-polish]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/agency-launch-polish.css?v=20260813-1';
    link.dataset.agencyLaunchPolish='true';
    document.head.appendChild(link);
  }

  function installLaunchFlow(){
    const overview=$('#overview');
    if(!overview||$('#agency-launch-flow'))return;
    const flow=document.createElement('div');
    flow.id='agency-launch-flow';
    flow.className='agency-launch-flow';
    flow.innerHTML='<div class="agency-launch-flow-copy"><strong>Your client delivery flow</strong><span>Add the client, build the card, then preview and deliver.</span></div><div class="agency-launch-steps"><button type="button" data-launch-add-client><b>1</b><span><strong>Add client</strong><small>Create their record</small></span></button><a href="editor.html"><b>2</b><span><strong>Create card</strong><small>Build and brand it</small></span></a><a href="#cards"><b>3</b><span><strong>Deliver</strong><small>Preview · publish · host</small></span></a></div>';
    overview.prepend(flow);
    flow.querySelector('[data-launch-add-client]')?.addEventListener('click',()=>$('#section-add-client')?.click());
  }

  function installPlanSummary(){
    const hero=$('.agency-hero-card');
    if(!hero||$('#agency-plan-summary'))return;
    const box=document.createElement('div');
    box.id='agency-plan-summary';
    box.className='agency-plan-summary';
    box.innerHTML='<strong>Agency tools included</strong><span id="agency-plan-summary-copy">Client management · card creation · analytics · leads · connected hosting</span>';
    hero.insertAdjacentElement('afterend',box);
  }

  function updatePlanSummary(){
    const plan=String($('#agency-sidebar-plan')?.textContent||'').toLowerCase();
    const copy=$('#agency-plan-summary-copy');
    if(!copy)return;
    if(plan.includes('pro'))copy.textContent='Agency Pro · higher card capacity · unlimited templates · Auto-Sync hosting · white label · team tools';
    else if(plan.includes('starter'))copy.textContent='Agency Starter · 15 client cards · 3 saved templates · Auto-Sync hosting · analytics & leads';
  }

  function installDeliveryChecklist(){
    const grid=$('#agency-card-grid');
    if(!grid||$('#agency-delivery-checklist'))return;
    const checklist=document.createElement('div');
    checklist.id='agency-delivery-checklist';
    checklist.className='agency-delivery-checklist';
    checklist.innerHTML='<div><strong>Before you deliver a client card</strong><span>Five quick checks help avoid callbacks and broken handoffs.</span></div><div class="agency-delivery-items"><span>✓ Contact info</span><span>✓ Links</span><span>✓ Mobile preview</span><span>✓ QR test</span><span>✓ Published</span></div>';
    grid.insertAdjacentElement('afterend',checklist);
  }

  function polishLabels(){
    const manageAll=$('#cards .agency-section-actions a[href="dashboard.html"]');
    if(manageAll)manageAll.innerHTML='<i data-lucide="list-checks" size="15"></i>Manage all cards';
  }

  function polishEmptyStates(){
    const clientCell=$('#agency-client-table .agency-empty');
    if(clientCell&&/No clients yet/i.test(clientCell.textContent||'')&&!clientCell.querySelector('[data-launch-empty-add]')){
      clientCell.innerHTML='<div class="agency-launch-empty"><strong>No clients yet</strong><span>Add your first client, then build their digital card.</span><button class="btn btn-primary btn-sm" type="button" data-launch-empty-add>Add first client</button></div>';
      clientCell.querySelector('[data-launch-empty-add]')?.addEventListener('click',()=>$('#section-add-client')?.click());
    }
    const cardEmpty=$('#agency-card-grid .agency-empty');
    if(cardEmpty&&/No client cards yet/i.test(cardEmpty.textContent||''))cardEmpty.innerHTML='<div class="agency-launch-empty"><strong>No cards yet</strong><span>Create a client card or start from an Agency Template.</span><a class="btn btn-primary btn-sm" href="editor.html">Create first card</a></div>';
    const templateEmpty=$('#agency-template-grid .agency-empty');
    if(templateEmpty&&/No Agency Templates/i.test(templateEmpty.textContent||''))templateEmpty.innerHTML='<div class="agency-launch-empty"><strong>No saved templates yet</strong><span>Build one strong client card, then save its design for reuse.</span></div>';
    if(window.lucide)lucide.createIcons();
  }

  function install(){
    addStylesheet();
    installLaunchFlow();
    installPlanSummary();
    installDeliveryChecklist();
    polishLabels();
    updatePlanSummary();
    setTimeout(()=>{updatePlanSummary();polishEmptyStates();},900);
    setTimeout(polishEmptyStates,2200);
    if(window.lucide)lucide.createIcons();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
