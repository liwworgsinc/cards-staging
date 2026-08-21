(function(){
  'use strict';

  const OPEN_KEY='liw_agency_settings_open_v1';
  const TAB_KEY='liw_agency_settings_tab_v1';
  const DEFAULT_STATUS_KEY='liw_agency_default_client_status_v1';
  const APPLY_DEFAULT_KEY='liw_agency_apply_default_status_v1';
  const CARDS_COLLAPSED_KEY='liw_agency_cards_collapsed_v1';
  const RESULTS_COLLAPSED_KEY='liw_agency_results_collapsed_v1';
  const VALID_TABS=['workspace','defaults','billing','automation','data','advanced'];
  const VALID_STATUSES=['lead','onboarding','active','paused'];

  let user=null;
  let access=null;
  let workspace=null;
  let ownerId=null;
  let cards=[];
  let clients=[];
  let templates=[];
  let members=[];
  let cardLimit=15;
  let open=false;
  let activeTab='workspace';

  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function read(key,fallback=''){
    try{const value=localStorage.getItem(key);return value===null?fallback:value;}catch(_){return fallback;}
  }
  function write(key,value){try{localStorage.setItem(key,String(value));}catch(_){ }}
  function remove(key){try{localStorage.removeItem(key);}catch(_){ }}
  function previewPlan(){try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}catch(_){return '';}}
  function isPro(){
    const preview=previewPlan();
    if(access?.isAdmin&&['agency','white_label'].includes(preview))return preview==='white_label';
    return String(access?.planKey||'')==='white_label'||Boolean(access?.isAdmin&&!access?.isPlanPreview);
  }
  function titleCase(value){return String(value||'').replace(/[_-]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase());}
  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencySettingsToast);
    window.__agencySettingsToast=setTimeout(()=>toast.classList.remove('show'),3000);
  }

  async function waitForAgencyReady(){
    for(let i=0;i<40;i++){
      const planLoading=$('#agency-sidebar-plan')?.textContent?.includes('Loading');
      const cardsLoading=$('#agency-card-grid')?.textContent?.includes('Loading cards');
      if(!planLoading&&!cardsLoading)return;
      await wait(125);
    }
  }

  async function loadContext(){
    user=await requireUser();
    if(!user)return false;
    access=await getLiwAccessContext(user,{refresh:true});
    const {data:workspaceData,error:workspaceError}=await supabaseClient.rpc('ensure_agency_workspace');
    if(workspaceError)throw workspaceError;
    workspace=workspaceData;
    ownerId=workspace?.owner_id||workspace?.agency?.owner_user_id||user.id;

    const [cardResult,clientResult,templateResult,memberResult,limitResult]=await Promise.all([
      supabaseClient.from('digital_cards').select('id,agency_client_id,full_name,company_name,status,slug,updated_at').eq('user_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('agency_clients').select('id,name,company_name,email,phone,website,status,updated_at').eq('agency_owner_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('agency_saved_templates').select('id').eq('agency_owner_id',ownerId).eq('is_active',true),
      supabaseClient.from('workspace_members').select('id,status').eq('owner_user_id',ownerId).in('status',['invited','active']),
      supabaseClient.rpc('card_limit_for_user',{p_user_id:ownerId})
    ]);

    if(cardResult.error)console.warn('Agency settings cards:',cardResult.error);
    if(clientResult.error)console.warn('Agency settings clients:',clientResult.error);
    if(templateResult.error)console.warn('Agency settings templates:',templateResult.error);
    if(memberResult.error)console.warn('Agency settings members:',memberResult.error);
    cards=cardResult.data||[];
    clients=clientResult.data||[];
    templates=templateResult.data||[];
    members=memberResult.data||[];
    cardLimit=Number(limitResult.data||access?.cardLimit||(isPro()?50:15));
    return true;
  }

  function defaultStatus(){
    const value=read(DEFAULT_STATUS_KEY,'onboarding');
    return VALID_STATUSES.includes(value)?value:'onboarding';
  }
  function applyDefaultEnabled(){return read(APPLY_DEFAULT_KEY,'1')!=='0';}
  function collapsed(key){return read(key,'0')==='1';}

  function businessName(){
    return workspace?.agency?.business_name||$('#agency-business-name')?.textContent?.trim()||'Agency Workspace';
  }

  function summaryMarkup(){
    const used=cards.length;
    const percent=cardLimit>0?Math.min(100,Math.round(used/cardLimit*100)):0;
    return `<div class="agency-settings-summary">
      <div class="agency-settings-summary-brand">
        <span class="agency-settings-summary-icon"><i data-lucide="sliders-horizontal" size="17"></i></span>
        <div><strong>Agency control center</strong><small>Workspace preferences, plan tools and data controls</small></div>
      </div>
      <div class="agency-settings-summary-stats">
        <span><b>${esc(access?.planName||'Agency')}</b><small>Plan</small></span>
        <span><b>${used} / ${cardLimit}</b><small>Card capacity</small></span>
        <span><b>${esc(titleCase(defaultStatus()))}</b><small>Client default</small></span>
        <span><b>${members.length}</b><small>Team members</small></span>
      </div>
      <div class="agency-settings-mini-progress" aria-label="${percent}% card capacity used"><span style="width:${percent}%"></span></div>
    </div>`;
  }

  function workspacePane(){
    const activeClients=clients.filter(row=>row.status!=='archived').length;
    return `<section class="agency-settings-pane" data-settings-pane="workspace" role="tabpanel">
      <div class="agency-settings-pane-head"><h3>Workspace</h3><p>Core Agency identity and account overview.</p></div>
      <div class="agency-settings-list">
        ${infoRow('building-2','Agency name',businessName(),'The name attached to this Agency workspace.')}
        ${infoRow('mail','Owner account',user?.email||'—','Primary account for Agency ownership and billing access.')}
        ${infoRow('badge-check','Current plan',access?.planName||'Agency',isPro()?'Agency Pro tools are available in this workspace.':'Agency Starter workspace controls are active.',isPro()?'PRO':'')}
      </div>
      <div class="agency-settings-overview-grid">
        ${miniMetric(activeClients,'Active clients','users-round')}
        ${miniMetric(cards.length,'Client cards','contact-round')}
        ${miniMetric(templates.length,'Templates','layout-template')}
        ${miniMetric(members.length,'Team','user-cog')}
      </div>
      <div class="agency-settings-action-row">
        ${isPro()?'<a class="agency-settings-action" href="#branding"><i data-lucide="paintbrush-vertical" size="15"></i>Branding</a><a class="agency-settings-action" href="#team"><i data-lucide="users-round" size="15"></i>Team access</a>':'<a class="agency-settings-action" href="agency.html#plans"><i data-lucide="sparkles" size="15"></i>Compare Agency Pro</a>'}
      </div>
    </section>`;
  }

  function defaultsPane(){
    return `<section class="agency-settings-pane" data-settings-pane="defaults" role="tabpanel" hidden>
      <div class="agency-settings-pane-head"><h3>Defaults</h3><p>Set the starting behavior for everyday Agency work.</p></div>
      <div class="agency-settings-list">
        <div class="agency-setting-row agency-setting-row-control">
          <span class="agency-setting-row-icon"><i data-lucide="user-round-cog" size="16"></i></span>
          <div class="agency-setting-row-copy"><strong>Default client status</strong><small>New clients can start in the status your agency uses most.</small></div>
          <select class="agency-settings-select" id="agency-settings-default-status" aria-label="Default client status">
            ${VALID_STATUSES.map(status=>`<option value="${status}" ${defaultStatus()===status?'selected':''}>${titleCase(status)}</option>`).join('')}
          </select>
        </div>
        ${switchRow('agency-settings-apply-default','wand-sparkles','Apply default automatically','Preselect the saved status whenever Add client opens.',applyDefaultEnabled())}
        ${switchRow('agency-settings-cards-compact','panels-top-left','Keep Cards compact','Open the dashboard with the detailed card inventory collapsed.',collapsed(CARDS_COLLAPSED_KEY))}
        ${switchRow('agency-settings-results-compact','chart-spline','Keep Results compact','Open the dashboard with detailed performance panels collapsed.',collapsed(RESULTS_COLLAPSED_KEY))}
      </div>
      <p class="agency-settings-footnote"><i data-lucide="info" size="13"></i>These preferences are saved in this browser and do not change client card content.</p>
    </section>`;
  }

  function billingPane(){
    const used=cards.length;
    const percent=cardLimit>0?Math.min(100,Math.round(used/cardLimit*100)):0;
    return `<section class="agency-settings-pane" data-settings-pane="billing" role="tabpanel" hidden>
      <div class="agency-settings-pane-head"><h3>Capacity & billing</h3><p>See the plan and capacity that power this Agency workspace.</p></div>
      <div class="agency-settings-plan-card">
        <div class="agency-settings-plan-top"><div><span>Current Agency plan</span><strong>${esc(access?.planName||'Agency')}</strong></div>${isPro()?'<span class="agency-settings-plan-badge">PRO</span>':''}</div>
        <div class="agency-settings-capacity-line"><span><b>${used}</b> client cards used</span><strong>${cardLimit} capacity</strong></div>
        <div class="agency-settings-capacity-bar"><span style="width:${percent}%"></span></div>
        <div class="agency-settings-plan-actions"><a class="btn btn-primary btn-sm" href="agency.html#plans"><i data-lucide="credit-card" size="14"></i>View Agency plans</a><a class="btn btn-light btn-sm" href="#cards"><i data-lucide="layers-3" size="14"></i>View card portfolio</a></div>
      </div>
      <div class="agency-settings-list agency-settings-list-spaced">
        ${infoRow('layers-3','+25 client card capacity','$10/mo · $100/yr','Stackable capacity for growing Agency portfolios.')}
        ${infoRow('shield-check','Card protection','Existing cards stay intact','Reducing capacity never automatically deletes existing client cards.')}
      </div>
    </section>`;
  }

  function automationPane(){
    return `<section class="agency-settings-pane" data-settings-pane="automation" role="tabpanel" hidden>
      <div class="agency-settings-pane-head"><h3>Automation</h3><p>Remove repetitive clicks from the Agency workflow without hiding what the system is doing.</p></div>
      <div class="agency-settings-list">
        ${switchRow('agency-settings-auto-status','wand-sparkles','Client onboarding default','Automatically apply your saved default status to the Add client form.',applyDefaultEnabled())}
        ${switchRow('agency-settings-auto-cards','panel-top-close','Compact card inventory','Remember a collapsed Cards inventory between visits.',collapsed(CARDS_COLLAPSED_KEY))}
        ${switchRow('agency-settings-auto-results','chart-no-axes-combined','Compact performance reporting','Remember a collapsed Results detail view between visits.',collapsed(RESULTS_COLLAPSED_KEY))}
      </div>
      <div class="agency-settings-roadmap">
        <span class="agency-settings-roadmap-icon"><i data-lucide="workflow" size="18"></i></span>
        <div><strong>Advanced workflow automation</strong><p>Auto-create client drafts, scheduled reporting and notification rules are not enabled yet. This area is ready for those controls when the workflow is built.</p></div>
        ${isPro()?'<span class="agency-settings-roadmap-state">Pro ready</span>':'<span class="agency-settings-roadmap-state">Pro roadmap</span>'}
      </div>
    </section>`;
  }

  function dataPane(){
    const pro=isPro();
    return `<section class="agency-settings-pane" data-settings-pane="data" role="tabpanel" hidden>
      <div class="agency-settings-pane-head"><h3>Data & exports</h3><p>Move Agency information out cleanly when you need reporting or backup files.</p></div>
      <div class="agency-settings-data-list">
        ${dataRow('users-round','Client directory','Names, companies, contact details and client status.',pro?'Export CSV':'Agency Pro','agency-settings-export-clients',!pro)}
        ${dataRow('contact-round','Card inventory','Client card names, status, slug and last updated date.',pro?'Export CSV':'Agency Pro','agency-settings-export-cards',!pro)}
        ${dataRow('inbox','Lead management','Review captured leads and use the existing lead export tools.','Open Leads','agency-settings-open-leads',false,'leads.html')}
        ${dataRow('chart-no-axes-combined','Analytics','Open the deeper card performance workspace.','Open Analytics','agency-settings-open-analytics',false,'analytics.html')}
      </div>
      ${pro?'<div class="agency-settings-action-row"><a class="agency-settings-action" href="#clients"><i data-lucide="file-up" size="15"></i>Client import tools</a></div>':'<div class="agency-settings-pro-note"><i data-lucide="lock-keyhole" size="15"></i><span>CSV Agency exports are part of Agency Pro.</span><a href="agency.html#plans">Compare Pro</a></div>'}
    </section>`;
  }

  function advancedPane(){
    return `<section class="agency-settings-pane" data-settings-pane="advanced" role="tabpanel" hidden>
      <div class="agency-settings-pane-head"><h3>Advanced</h3><p>Workspace recovery and low-frequency controls live away from daily operations.</p></div>
      <div class="agency-settings-list">
        ${infoRow('key-round','Workspace owner',user?.email||'—','Only the Agency owner should manage subscription and ownership-level changes.')}
        ${infoRow('database','Agency data','Stored in your LIW Cards workspace','Resetting dashboard preferences does not delete clients, cards, leads or analytics.')}
      </div>
      <div class="agency-settings-danger">
        <div><span class="agency-settings-danger-icon"><i data-lucide="rotate-ccw" size="16"></i></span><div><strong>Reset dashboard preferences</strong><p>Clear saved section states, Settings tab choice and client-status default in this browser.</p></div></div>
        <button class="btn btn-light btn-sm" type="button" id="agency-settings-reset"><i data-lucide="rotate-ccw" size="14"></i>Reset preferences</button>
      </div>
      <div class="agency-settings-action-row"><a class="agency-settings-action" href="dashboard.html"><i data-lucide="arrow-left" size="15"></i>Back to LIW dashboard</a></div>
    </section>`;
  }

  function infoRow(icon,label,value,copy,badge=''){
    return `<div class="agency-setting-row"><span class="agency-setting-row-icon"><i data-lucide="${icon}" size="16"></i></span><div class="agency-setting-row-copy"><strong>${esc(label)}${badge?` <span class="agency-setting-inline-badge">${esc(badge)}</span>`:''}</strong><small>${esc(copy)}</small></div><div class="agency-setting-value">${esc(value)}</div></div>`;
  }
  function miniMetric(value,label,icon){return `<div class="agency-settings-mini-metric"><span><i data-lucide="${icon}" size="15"></i></span><strong>${Number(value||0).toLocaleString()}</strong><small>${esc(label)}</small></div>`;}
  function switchRow(id,icon,label,copy,checked){
    return `<div class="agency-setting-row agency-setting-row-control"><span class="agency-setting-row-icon"><i data-lucide="${icon}" size="16"></i></span><div class="agency-setting-row-copy"><strong>${esc(label)}</strong><small>${esc(copy)}</small></div><button class="agency-settings-switch ${checked?'is-on':''}" id="${id}" type="button" role="switch" aria-checked="${checked?'true':'false'}" aria-label="${esc(label)}"><span></span></button></div>`;
  }
  function dataRow(icon,label,copy,action,id,locked=false,href=''){
    const control=href?`<a class="agency-settings-data-action" id="${id}" href="${href}">${esc(action)}<i data-lucide="arrow-up-right" size="13"></i></a>`:`<button class="agency-settings-data-action ${locked?'is-locked':''}" id="${id}" type="button" ${locked?'disabled':''}>${locked?'<i data-lucide="lock-keyhole" size="12"></i>':''}${esc(action)}</button>`;
    return `<div class="agency-settings-data-row"><span class="agency-settings-data-icon"><i data-lucide="${icon}" size="16"></i></span><div><strong>${esc(label)}</strong><small>${esc(copy)}</small></div>${control}</div>`;
  }

  function navMarkup(){
    const items=[
      ['workspace','building-2','Workspace'],['defaults','sliders-horizontal','Defaults'],['billing','credit-card','Billing'],
      ['automation','workflow','Automation'],['data','database','Data'],['advanced','settings-2','Advanced']
    ];
    return `<nav class="agency-settings-nav" role="tablist" aria-label="Agency settings">${items.map(([key,icon,label])=>`<button type="button" role="tab" data-settings-tab="${key}" aria-selected="${activeTab===key?'true':'false'}" class="${activeTab===key?'active':''}"><i data-lucide="${icon}" size="15"></i><span>${label}</span>${key==='data'&&!isPro()?'<em>Pro</em>':''}</button>`).join('')}</nav>`;
  }

  function render(){
    const host=$('#settings .agency-section-card');
    if(!host)return;
    const storedTab=read(TAB_KEY,'workspace');
    activeTab=VALID_TABS.includes(storedTab)?storedTab:'workspace';
    open=read(OPEN_KEY,'0')==='1'||location.hash==='#settings';

    host.classList.add('agency-settings-premium');
    host.innerHTML=`<div class="agency-settings-shell ${open?'is-open':''}">
      <div class="agency-settings-head">
        <div><h2>Agency Settings</h2><p>Configure how your agency works without cluttering the daily workspace.</p></div>
        <button class="agency-settings-open" id="agency-settings-open" type="button" aria-expanded="${open?'true':'false'}"><span>${open?'Close settings':'Open settings'}</span><span><i data-lucide="${open?'chevron-up':'chevron-down'}" size="15"></i></span></button>
      </div>
      ${summaryMarkup()}
      <div class="agency-settings-detail-wrap" ${open?'':'aria-hidden="true"'}>
        <div class="agency-settings-hub">
          ${navMarkup()}
          <div class="agency-settings-content">
            ${workspacePane()}${defaultsPane()}${billingPane()}${automationPane()}${dataPane()}${advancedPane()}
          </div>
        </div>
      </div>
    </div>`;
    applyTab(activeTab,false);
    wire();
    requestAnimationFrame(()=>syncDetailHeight(true));
    if(window.lucide)lucide.createIcons();
  }

  function syncDetailHeight(instant=false){
    const shell=$('#settings .agency-settings-shell');
    const wrap=shell?.querySelector('.agency-settings-detail-wrap');
    if(!wrap)return;
    if(instant){
      wrap.style.transition='none';
      wrap.style.maxHeight=shell.classList.contains('is-open')?`${wrap.scrollHeight}px`:'0px';
      requestAnimationFrame(()=>wrap.style.removeProperty('transition'));
      return;
    }
    if(shell.classList.contains('is-open'))wrap.style.maxHeight=`${wrap.scrollHeight}px`;
    else wrap.style.maxHeight='0px';
  }

  function setOpen(next,persist=true){
    const shell=$('#settings .agency-settings-shell');
    if(!shell)return;
    open=Boolean(next);
    shell.classList.toggle('is-open',open);
    const button=$('#agency-settings-open');
    if(button){
      button.setAttribute('aria-expanded',String(open));
      button.innerHTML=`<span>${open?'Close settings':'Open settings'}</span><span><i data-lucide="${open?'chevron-up':'chevron-down'}" size="15"></i></span>`;
    }
    const wrap=shell.querySelector('.agency-settings-detail-wrap');
    if(wrap)wrap.setAttribute('aria-hidden',String(!open));
    if(persist)write(OPEN_KEY,open?'1':'0');
    syncDetailHeight(false);
    if(window.lucide)lucide.createIcons();
  }

  function applyTab(tab,persist=true){
    if(!VALID_TABS.includes(tab))tab='workspace';
    activeTab=tab;
    document.querySelectorAll('#settings [data-settings-tab]').forEach(button=>{
      const selected=button.dataset.settingsTab===tab;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-selected',String(selected));
    });
    document.querySelectorAll('#settings [data-settings-pane]').forEach(pane=>pane.hidden=pane.dataset.settingsPane!==tab);
    if(persist)write(TAB_KEY,tab);
    requestAnimationFrame(()=>syncDetailHeight(false));
  }

  function setSwitch(button,on){
    if(!button)return;
    button.classList.toggle('is-on',on);
    button.setAttribute('aria-checked',String(on));
  }

  function setSectionPreference(key,sectionId,buttonSelector,on){
    write(key,on?'1':'0');
    const section=document.getElementById(sectionId);
    const current=section?.classList.contains('is-collapsed');
    if(section&&current!==on)section.querySelector(buttonSelector)?.click();
  }

  function syncMirroredSwitches(){
    const apply=applyDefaultEnabled();
    const cardsCompact=collapsed(CARDS_COLLAPSED_KEY);
    const resultsCompact=collapsed(RESULTS_COLLAPSED_KEY);
    ['#agency-settings-apply-default','#agency-settings-auto-status'].forEach(selector=>setSwitch($(selector),apply));
    ['#agency-settings-cards-compact','#agency-settings-auto-cards'].forEach(selector=>setSwitch($(selector),cardsCompact));
    ['#agency-settings-results-compact','#agency-settings-auto-results'].forEach(selector=>setSwitch($(selector),resultsCompact));
  }

  function bindSwitch(id,handler){
    const button=$(id);
    button?.addEventListener('click',()=>{
      const next=button.getAttribute('aria-checked')!=='true';
      handler(next);
      syncMirroredSwitches();
    });
  }

  function wire(){
    $('#agency-settings-open')?.addEventListener('click',()=>setOpen(!open));
    document.querySelectorAll('#settings [data-settings-tab]').forEach(button=>button.addEventListener('click',()=>applyTab(button.dataset.settingsTab)));
    $('#agency-settings-default-status')?.addEventListener('change',event=>{
      const value=VALID_STATUSES.includes(event.target.value)?event.target.value:'onboarding';
      write(DEFAULT_STATUS_KEY,value);
      notify(`Default client status set to ${titleCase(value)}`);
      const summary=$('#settings .agency-settings-summary');
      if(summary){const target=summary.querySelector('.agency-settings-summary-stats span:nth-child(3) b');if(target)target.textContent=titleCase(value);}
    });
    bindSwitch('#agency-settings-apply-default',next=>write(APPLY_DEFAULT_KEY,next?'1':'0'));
    bindSwitch('#agency-settings-auto-status',next=>write(APPLY_DEFAULT_KEY,next?'1':'0'));
    bindSwitch('#agency-settings-cards-compact',next=>setSectionPreference(CARDS_COLLAPSED_KEY,'cards','[data-agency-cards-collapse]',next));
    bindSwitch('#agency-settings-auto-cards',next=>setSectionPreference(CARDS_COLLAPSED_KEY,'cards','[data-agency-cards-collapse]',next));
    bindSwitch('#agency-settings-results-compact',next=>setSectionPreference(RESULTS_COLLAPSED_KEY,'results','[data-results-collapse]',next));
    bindSwitch('#agency-settings-auto-results',next=>setSectionPreference(RESULTS_COLLAPSED_KEY,'results','[data-results-collapse]',next));
    $('#agency-settings-export-clients')?.addEventListener('click',exportClients);
    $('#agency-settings-export-cards')?.addEventListener('click',exportCards);
    $('#agency-settings-reset')?.addEventListener('click',resetPreferences);
    syncMirroredSwitches();
  }

  function wireDefaultClientStatus(){
    ['#top-add-client','#quick-add-client','#section-add-client'].forEach(selector=>{
      document.querySelector(selector)?.addEventListener('click',()=>{
        if(!applyDefaultEnabled())return;
        queueMicrotask(()=>{const select=$('#agency-client-status');if(select)select.value=defaultStatus();});
      });
    });
  }

  function csvCell(value){const text=String(value??'').replace(/\r?\n/g,' ').trim();return `"${text.replace(/"/g,'""')}"`;}
  function downloadCsv(filename,headers,rows){
    const csv=[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
    const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  }

  async function exportClients(){
    if(!isPro())return notify('Agency CSV exports are included with Agency Pro.');
    const {data,error}=await supabaseClient.from('agency_clients').select('name,company_name,email,phone,website,status,updated_at').eq('agency_owner_id',ownerId).order('updated_at',{ascending:false});
    if(error)return notify(error.message||'Could not export clients');
    const rows=(data||[]).map(row=>[row.name,row.company_name,row.email,row.phone,row.website,row.status,row.updated_at]);
    if(!rows.length)return notify('No clients to export yet.');
    downloadCsv(`liw-agency-clients-${new Date().toISOString().slice(0,10)}.csv`,['Name','Company','Email','Phone','Website','Status','Updated'],rows);
    notify(`Exported ${rows.length} client${rows.length===1?'':'s'}`);
  }

  async function exportCards(){
    if(!isPro())return notify('Agency CSV exports are included with Agency Pro.');
    const {data,error}=await supabaseClient.from('digital_cards').select('full_name,company_name,status,slug,updated_at,agency_client_id').eq('user_id',ownerId).order('updated_at',{ascending:false});
    if(error)return notify(error.message||'Could not export cards');
    const rows=(data||[]).map(row=>[row.full_name,row.company_name,row.status,row.slug,row.updated_at,row.agency_client_id]);
    if(!rows.length)return notify('No client cards to export yet.');
    downloadCsv(`liw-agency-cards-${new Date().toISOString().slice(0,10)}.csv`,['Card name','Company','Status','Slug','Updated','Client ID'],rows);
    notify(`Exported ${rows.length} card${rows.length===1?'':'s'}`);
  }

  function resetPreferences(){
    if(!confirm('Reset saved Agency dashboard preferences in this browser? Your clients, cards, leads and analytics will not be deleted.'))return;
    [OPEN_KEY,TAB_KEY,DEFAULT_STATUS_KEY,APPLY_DEFAULT_KEY,CARDS_COLLAPSED_KEY,RESULTS_COLLAPSED_KEY].forEach(remove);
    notify('Dashboard preferences reset');
    setTimeout(()=>location.reload(),450);
  }

  function wireSettingsNavigation(){
    document.querySelectorAll('.agency-sidebar a[href="#settings"]').forEach(link=>link.addEventListener('click',()=>{
      setOpen(true);
      requestAnimationFrame(()=>document.getElementById('settings')?.scrollIntoView({behavior:'smooth',block:'start'}));
    }));
    window.addEventListener('hashchange',()=>{if(location.hash==='#settings')setOpen(true);});
  }

  async function boot(){
    try{
      await waitForAgencyReady();
      const ok=await loadContext();
      if(!ok)return;
      render();
      wireDefaultClientStatus();
      wireSettingsNavigation();
      window.addEventListener('resize',()=>syncDetailHeight(true),{passive:true});
    }catch(error){
      console.error('Agency Settings Hub failed:',error);
      const host=$('#settings .agency-section-card');
      if(host)host.innerHTML='<div class="agency-settings-fallback"><h2>Agency Settings</h2><p>Settings could not be loaded right now. Refresh the workspace and try again.</p></div>';
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
