/* LIW Cards — staging-only Agency Overview Work Center. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_WORK_CENTER__)return;
  window.__LIW_AGENCY_WORK_CENTER__=true;

  let currentUser=null;
  let ownerId=null;
  let clients=[];
  let cards=[];
  let leads=[];

  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function titleCase(value){return String(value||'').replace(/[_-]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase());}
  function dateValue(value){const time=value?new Date(value).getTime():0;return Number.isFinite(time)?time:0;}
  function ageDays(value){const time=dateValue(value);return time?Math.max(0,Math.floor((Date.now()-time)/86400000)):0;}
  function relativeTime(value){
    const time=dateValue(value);if(!time)return 'Recently';
    const mins=Math.max(0,Math.round((Date.now()-time)/60000));
    if(mins<2)return 'Just now';
    if(mins<60)return `${mins}m ago`;
    const hours=Math.floor(mins/60);if(hours<24)return `${hours}h ago`;
    const days=Math.floor(hours/24);if(days<7)return `${days}d ago`;
    return new Date(time).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  }

  async function waitForDashboard(){
    for(let i=0;i<48;i++){
      const overview=$('#overview');
      const quick=overview?.querySelector('.agency-quick-grid');
      const loading=$('#agency-sidebar-plan')?.textContent?.includes('Loading');
      if(overview&&quick&&!loading)return true;
      await sleep(125);
    }
    return Boolean($('#overview .agency-quick-grid'));
  }

  async function resolveOwner(){
    currentUser=await requireUser();
    if(!currentUser)return false;
    try{
      const {data:member}=await supabaseClient.from('workspace_members')
        .select('owner_user_id,status')
        .eq('member_user_id',currentUser.id)
        .eq('status','active')
        .order('created_at',{ascending:false})
        .limit(1)
        .maybeSingle();
      ownerId=member?.owner_user_id||currentUser.id;
    }catch(_){ownerId=currentUser.id;}
    return true;
  }

  async function loadData(){
    const results=await Promise.all([
      supabaseClient.from('agency_clients')
        .select('id,name,company_name,email,phone,status,created_at,updated_at')
        .eq('agency_owner_id',ownerId)
        .order('updated_at',{ascending:false}),
      supabaseClient.from('digital_cards')
        .select('id,agency_client_id,full_name,company_name,status,slug,created_at,updated_at')
        .eq('user_id',ownerId)
        .order('updated_at',{ascending:false}),
      supabaseClient.from('leads')
        .select('id,card_id,name,email,phone,status,service_interest,created_at')
        .eq('owner_user_id',ownerId)
        .order('created_at',{ascending:false})
        .limit(100)
    ]);
    clients=results[0].error?[]:(results[0].data||[]);
    cards=results[1].error?[]:(results[1].data||[]);
    leads=results[2].error?[]:(results[2].data||[]);
    if(results[0].error)console.warn('Agency Work Center clients:',results[0].error);
    if(results[1].error)console.warn('Agency Work Center cards:',results[1].error);
    if(results[2].error)console.warn('Agency Work Center leads:',results[2].error);
  }

  function clientCards(clientId){return cards.filter(card=>String(card.agency_client_id||'')===String(clientId||''));}
  function clientHasPublishedCard(clientId){return clientCards(clientId).some(card=>String(card.status||'').toLowerCase()==='published');}
  function activeClients(){return clients.filter(client=>String(client.status||'').toLowerCase()!=='archived');}

  function updateHero(){
    const hero=$('#overview .agency-hero-card');
    const kicker=hero?.querySelector('.agency-kicker');
    const title=$('#agency-welcome-title');
    const copy=title?.nextElementSibling;
    if(kicker)kicker.textContent='Agency operations';
    if(title)title.textContent='Keep client work moving.';
    if(copy&&copy.tagName==='P')copy.textContent='See what needs attention, where clients are in the workflow, and what changed recently — without hunting through the dashboard.';
  }

  function workItems(){
    const items=[];
    const newLeads=leads.filter(lead=>String(lead.status||'new').toLowerCase()==='new');
    if(newLeads.length){
      const names=newLeads.slice(0,2).map(lead=>lead.name).filter(Boolean).join(', ');
      items.push({priority:'high',icon:'inbox',title:`${newLeads.length} new lead${newLeads.length===1?'':'s'} to follow up`,detail:names?`Newest: ${names}${newLeads.length>2?' + more':''}`:'Open Leads to review the newest inquiries.',href:'leads.html',action:'Review leads'});
    }

    const onboarding=activeClients().filter(client=>String(client.status||'').toLowerCase()==='onboarding'&&!clientHasPublishedCard(client.id));
    if(onboarding.length){
      const names=onboarding.slice(0,2).map(client=>client.name).filter(Boolean).join(', ');
      items.push({priority:'high',icon:'user-round-check',title:`${onboarding.length} onboarding client${onboarding.length===1?'':'s'} still need a live card`,detail:names||'These clients do not have a published card yet.',href:'#clients',action:'Open clients'});
    }

    const drafts=cards.filter(card=>String(card.status||'').toLowerCase()==='draft');
    if(drafts.length){
      const oldest=[...drafts].sort((a,b)=>dateValue(a.updated_at)-dateValue(b.updated_at))[0];
      const age=ageDays(oldest?.updated_at);
      items.push({priority:age>=7?'high':'normal',icon:'file-pen-line',title:`${drafts.length} draft card${drafts.length===1?'':'s'} waiting to finish`,detail:oldest?`${oldest.full_name||oldest.company_name||'Oldest draft'}${age?` · ${age} day${age===1?'':'s'} since update`:''}`:'Continue a draft and move it toward publish.',href:oldest?.id?`editor.html?id=${encodeURIComponent(oldest.id)}`:'#cards',action:'Continue draft'});
    }

    const leadClients=activeClients().filter(client=>String(client.status||'').toLowerCase()==='lead');
    if(leadClients.length){
      items.push({priority:'normal',icon:'user-search',title:`${leadClients.length} prospect${leadClients.length===1?'':'s'} in your client pipeline`,detail:'Review them and move ready prospects into onboarding.',href:'#clients',action:'Review pipeline'});
    }

    return items.slice(0,4);
  }

  function workQueueMarkup(){
    const items=workItems();
    if(!items.length)return `<div class="agency-work-empty"><span><i data-lucide="circle-check-big" size="20"></i></span><div><strong>You’re caught up</strong><p>No new leads, unfinished onboarding, or draft-card work is demanding attention right now.</p></div></div>`;
    return items.map(item=>`<article class="agency-work-item ${item.priority==='high'?'is-priority':''}">
      <span class="agency-work-item-icon"><i data-lucide="${item.icon}" size="17"></i></span>
      <div class="agency-work-item-copy"><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></div>
      <a class="agency-work-item-action" href="${esc(item.href)}">${esc(item.action)}<i data-lucide="arrow-right" size="13"></i></a>
    </article>`).join('');
  }

  function pipelineMarkup(){
    const stages=[
      ['lead','user-search','Leads'],
      ['onboarding','sparkles','Onboarding'],
      ['active','circle-check-big','Active'],
      ['paused','pause-circle','Paused']
    ];
    return stages.map(([key,icon,label])=>{
      const rows=activeClients().filter(client=>String(client.status||'').toLowerCase()===key);
      const names=rows.slice(0,2).map(client=>client.name).filter(Boolean).join(', ');
      return `<button class="agency-pipeline-stage" type="button" data-work-stage="${key}">
        <span class="agency-pipeline-stage-icon"><i data-lucide="${icon}" size="15"></i></span>
        <span><strong>${rows.length}</strong><small>${label}</small>${names?`<em>${esc(names)}${rows.length>2?' + more':''}</em>`:''}</span>
        <i data-lucide="chevron-right" size="14"></i>
      </button>`;
    }).join('');
  }

  function recentActivity(){
    const cardMap=new Map(cards.map(card=>[String(card.id),card]));
    const activity=[];
    clients.forEach(client=>activity.push({type:'client',icon:'user-round',title:client.name||client.company_name||'Client',detail:`Client ${titleCase(client.status||'updated')}`,time:client.updated_at||client.created_at,href:'#clients'}));
    cards.forEach(card=>activity.push({type:'card',icon:'contact-round',title:card.full_name||card.company_name||'Client card',detail:`Card ${titleCase(card.status||'updated')}`,time:card.updated_at||card.created_at,href:card.id?`editor.html?id=${encodeURIComponent(card.id)}`:'#cards'}));
    leads.forEach(lead=>{
      const card=cardMap.get(String(lead.card_id||''));
      activity.push({type:'lead',icon:'inbox',title:lead.name||'New inquiry',detail:`Lead${card?.full_name?` · ${card.full_name}`:''}`,time:lead.created_at,href:'leads.html'});
    });
    return activity.sort((a,b)=>dateValue(b.time)-dateValue(a.time)).slice(0,6);
  }

  function activityMarkup(){
    const rows=recentActivity();
    if(!rows.length)return '<div class="agency-work-activity-empty">Recent client, card, and lead changes will appear here.</div>';
    return rows.map(row=>`<a class="agency-work-activity-row" href="${esc(row.href)}">
      <span><i data-lucide="${row.icon}" size="15"></i></span>
      <div><strong>${esc(row.title)}</strong><small>${esc(row.detail)}</small></div>
      <time>${esc(relativeTime(row.time))}</time>
    </a>`).join('');
  }

  function render(){
    const overview=$('#overview');
    const quick=overview?.querySelector('.agency-quick-grid');
    if(!overview||!quick)return;
    updateHero();
    let host=$('#agency-work-center');
    if(!host){host=document.createElement('div');host.id='agency-work-center';host.className='agency-work-center';quick.insertAdjacentElement('afterend',host);}
    const published=cards.filter(card=>String(card.status||'').toLowerCase()==='published').length;
    const drafts=cards.filter(card=>String(card.status||'').toLowerCase()==='draft').length;
    const newLeadCount=leads.filter(lead=>String(lead.status||'new').toLowerCase()==='new').length;
    host.innerHTML=`
      <div class="agency-work-center-head">
        <div><span class="agency-work-center-kicker">WORK CENTER</span><h2>Run the work, not just the dashboard.</h2><p>Priorities are generated from your live clients, cards, and leads.</p></div>
        <button type="button" class="agency-work-refresh" data-work-refresh><i data-lucide="refresh-cw" size="14"></i><span>Refresh</span></button>
      </div>
      <div class="agency-work-layout">
        <section class="agency-work-panel agency-work-focus">
          <div class="agency-work-panel-head"><div><span>Focus now</span><h3>What needs attention</h3></div><span class="agency-work-count">${workItems().length}</span></div>
          <div class="agency-work-queue">${workQueueMarkup()}</div>
        </section>
        <aside class="agency-work-side">
          <section class="agency-work-panel agency-work-pipeline">
            <div class="agency-work-panel-head"><div><span>Workflow</span><h3>Client pipeline</h3></div><a href="#clients">View clients</a></div>
            <div class="agency-pipeline-list">${pipelineMarkup()}</div>
            <div class="agency-work-health">
              <span><b>${published}</b><small>Published</small></span>
              <span><b>${drafts}</b><small>Drafts</small></span>
              <span><b>${newLeadCount}</b><small>New leads</small></span>
            </div>
          </section>
        </aside>
      </div>
      <section class="agency-work-panel agency-work-activity">
        <div class="agency-work-panel-head"><div><span>Activity</span><h3>Recently changed</h3></div><small>Latest 6 updates</small></div>
        <div class="agency-work-activity-list">${activityMarkup()}</div>
      </section>`;
    wire(host);
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function clearClientFilter(){
    const body=$('#agency-client-table');
    if(!body)return;
    body.querySelectorAll('tr').forEach(row=>row.hidden=false);
    document.querySelector('.agency-client-filter-note')?.remove();
    document.querySelectorAll('[data-work-stage]').forEach(button=>button.classList.remove('active'));
  }

  function filterClients(status,sourceButton){
    const body=$('#agency-client-table');
    const wrap=$('#clients .agency-table-wrap');
    if(!body||!wrap){location.hash='clients';return;}
    body.querySelectorAll('tr').forEach(row=>{
      const rowStatus=String(row.querySelector('.agency-status')?.textContent||'').trim().toLowerCase();
      row.hidden=rowStatus!==status;
    });
    let note=wrap.querySelector('.agency-client-filter-note');
    if(!note){note=document.createElement('div');note.className='agency-client-filter-note';wrap.prepend(note);}
    const count=activeClients().filter(client=>String(client.status||'').toLowerCase()===status).length;
    note.innerHTML=`<span><i data-lucide="filter" size="13"></i>Showing ${count} ${esc(titleCase(status))} client${count===1?'':'s'}</span><button type="button" data-clear-client-filter>Clear filter</button>`;
    note.querySelector('[data-clear-client-filter]')?.addEventListener('click',clearClientFilter);
    document.querySelectorAll('[data-work-stage]').forEach(button=>button.classList.toggle('active',button===sourceButton));
    document.getElementById('clients')?.scrollIntoView({behavior:'smooth',block:'start'});
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function wire(host){
    host.querySelector('[data-work-refresh]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;button.classList.add('is-loading');
      try{await loadData();render();}finally{button.disabled=false;button.classList.remove('is-loading');}
    });
    host.querySelectorAll('[data-work-stage]').forEach(button=>button.addEventListener('click',()=>filterClients(button.dataset.workStage,button)));
  }

  async function boot(){
    try{
      const ready=await waitForDashboard();if(!ready)return;
      const signedIn=await resolveOwner();if(!signedIn)return;
      await loadData();render();
      window.addEventListener('focus',()=>{if(document.visibilityState==='visible')loadData().then(render).catch(()=>{});},{passive:true});
    }catch(error){console.warn('Agency Work Center unavailable:',error);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();