/* LIW Cards — staging-only white Agency Work Center. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_WHITE_WORKCENTER__)return;
  window.__LIW_AGENCY_WHITE_WORKCENTER__=true;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const stamp=v=>{const n=v?new Date(v).getTime():0;return Number.isFinite(n)?n:0};
  const rel=v=>{const t=stamp(v);if(!t)return 'Recently';const m=Math.max(0,Math.round((Date.now()-t)/60000));if(m<2)return 'Now';if(m<60)return `${m}m`;const h=Math.floor(m/60);if(h<24)return `${h}h`;const d=Math.floor(h/24);return d<7?`${d}d`:new Date(t).toLocaleDateString('en-US',{month:'short',day:'numeric'})};
  const title=v=>String(v||'').replace(/[_-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const initials=v=>String(v||'').trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'—';

  let user=null,access=null,ownerId=null,agencyName='Agency',ownerEmail='';
  let clients=[],cards=[],leads=[],views=[],events=[],cardLimit=15;

  async function waitReady(){
    for(let i=0;i<60;i++){
      const plan=$('#agency-sidebar-plan');
      if($('#overview')&&$('#agency-client-table')&&plan&&!/Loading/i.test(plan.textContent||''))return true;
      await sleep(125);
    }
    return Boolean($('#overview'));
  }

  function qaPreview(){try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase()}catch(_){return ''}}
  function planName(){
    const preview=qaPreview();
    if(preview==='white_label')return 'Agency Pro';
    if(preview==='agency')return 'Agency Starter';
    const key=String(access?.planKey||'');
    if(key==='white_label')return 'Agency Pro';
    if(key==='agency')return 'Agency Starter';
    return String($('#agency-sidebar-plan')?.textContent||'Agency').replace(/preview/ig,'').trim()||'Agency';
  }
  function isPro(){const p=qaPreview();if(access?.isAdmin&&['agency','white_label'].includes(p))return p==='white_label';return String(access?.planKey||'')==='white_label'||Boolean(access?.isAdmin&&!access?.isPlanPreview)}

  async function resolveContext(){
    user=await requireUser();if(!user)return false;
    ownerEmail=user.email||'';
    try{if(typeof getLiwAccessContext==='function')access=await getLiwAccessContext(user,{refresh:true});}catch(_){access=null}
    try{const {data}=await supabaseClient.rpc('ensure_agency_workspace');ownerId=data?.owner_id||data?.agency?.owner_user_id||user.id;}catch(_){ownerId=user.id}
    const existing=String($('#agency-business-name')?.textContent||'').trim();
    if(existing&&!/Agency Workspace|Agency Work Center/i.test(existing))agencyName=existing;
    return true;
  }

  async function loadData(){
    const since30=new Date(Date.now()-30*86400000).toISOString();
    const [clientR,cardR,leadR,limitR]=await Promise.all([
      supabaseClient.from('agency_clients').select('id,name,company_name,email,phone,status,created_at,updated_at').eq('agency_owner_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('digital_cards').select('id,agency_client_id,full_name,company_name,status,slug,created_at,updated_at').eq('user_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('leads').select('id,card_id,name,email,phone,status,service_interest,created_at').eq('owner_user_id',ownerId).order('created_at',{ascending:false}).limit(100),
      supabaseClient.rpc('card_limit_for_user',{p_user_id:ownerId})
    ]);
    clients=clientR.error?[]:(clientR.data||[]);cards=cardR.error?[]:(cardR.data||[]);leads=leadR.error?[]:(leadR.data||[]);
    const limitValue=Number(limitR.data);if(Number.isFinite(limitValue)&&limitValue>0)cardLimit=limitValue;
    if(cards.length){
      const ids=cards.map(c=>c.id);
      const [viewR,eventR]=await Promise.all([
        supabaseClient.from('card_views').select('card_id,viewed_at').in('card_id',ids).gte('viewed_at',since30).order('viewed_at',{ascending:false}),
        supabaseClient.from('card_events').select('card_id,event_type,occurred_at').in('card_id',ids).gte('occurred_at',since30).order('occurred_at',{ascending:false})
      ]);
      views=viewR.error?[]:(viewR.data||[]);events=eventR.error?[]:(eventR.data||[]);
    }else{views=[];events=[]}
  }

  function activeClients(){return clients.filter(c=>String(c.status||'').toLowerCase()!=='archived')}
  function publishedCards(){return cards.filter(c=>String(c.status||'').toLowerCase()==='published')}
  function draftCards(){return cards.filter(c=>String(c.status||'').toLowerCase()==='draft')}
  function newLeads(){return leads.filter(l=>String(l.status||'new').toLowerCase()==='new')}
  function clientCards(id){return cards.filter(c=>String(c.agency_client_id||'')===String(id||''))}
  function hasPublished(id){return clientCards(id).some(c=>String(c.status||'').toLowerCase()==='published')}
  function cardName(c){return c?.company_name||c?.full_name||'Untitled card'}
  function cardViews(id){return views.filter(v=>String(v.card_id)===String(id)).length}
  function cardEvents(id){return events.filter(v=>String(v.card_id)===String(id)).length}

  function decorateShell(){
    document.body.classList.add('agency-white-workcenter');
    const h1=$('#agency-business-name'),sub=$('#agency-user-email');
    if(h1)h1.textContent='Agency Work Center';
    if(sub)sub.textContent=`Here’s what’s happening with ${agencyName} today.`;

    const actions=$('.agency-topbar-actions');
    if(actions){
      const planLink=actions.querySelector('a');
      const addBtn=$('#top-add-client');
      if(addBtn){addBtn.className='btn btn-light';addBtn.innerHTML='<i data-lucide="user-round-plus" size="16"></i><span>Add Client</span>';}
      if(planLink){planLink.className='btn btn-primary';planLink.href='editor.html';planLink.innerHTML='<i data-lucide="plus" size="16"></i><span>Create Card</span>';}
      if(addBtn&&planLink){actions.append(addBtn,planLink)}
    }

    const firstNav=$('.agency-sidebar nav');
    if(firstNav&&!firstNav.querySelector('a[href="leads.html"]')){
      const results=firstNav.querySelector('a[href="#results"]');
      results?.insertAdjacentHTML('afterend','<a href="leads.html"><i data-lucide="inbox" size="17"></i>Leads</a>');
    }
    const labels=$$('.agency-sidebar-label');
    if(labels[0])labels[0].textContent='Workspace';
    if(labels[1])labels[1].textContent='Manage';
    renderPlanCard();
    renderAccountCard();
  }

  function renderPlanCard(){
    const box=$('.agency-sidebar-plan');if(!box)return;
    const used=cards.length;const pct=Math.min(100,Math.round(used/Math.max(1,cardLimit)*100));
    box.innerHTML=`<div class="awc-plan-title"><i data-lucide="crown" size="14"></i>${esc(planName())}</div><span class="awc-plan-name">${esc(planName())}</span><div class="awc-plan-capacity">Cards used<strong>${used} / ${cardLimit}</strong><div class="awc-plan-meter"><span style="width:${pct}%"></span></div></div><a class="awc-plan-link" href="agency.html#plans">Manage Plan</a>`;
  }

  function renderAccountCard(){
    const sidebar=$('.agency-sidebar');if(!sidebar)return;
    let card=$('.awc-sidebar-account');if(!card){card=document.createElement('div');card.className='awc-sidebar-account';sidebar.append(card)}
    card.innerHTML=`<strong>${esc(agencyName)}</strong><small>${esc(ownerEmail||'Agency owner')}</small>`;
  }

  function statCard(icon,label,value,foot){return `<article class="awc-stat-card"><div class="awc-stat-top"><div class="awc-stat-main"><span class="awc-stat-icon"><i data-lucide="${icon}" size="22"></i></span><div class="awc-stat-copy"><small>${esc(label)}</small><strong>${esc(value)}</strong></div></div><i data-lucide="ellipsis" size="16"></i></div><div class="awc-stat-foot">${foot}</div></article>`}

  function focusItems(){
    const rows=[];
    const drafts=draftCards();
    if(drafts.length){const oldest=[...drafts].sort((a,b)=>stamp(a.updated_at)-stamp(b.updated_at))[0];rows.push({icon:'file-pen-line',tone:'is-red',title:'Cards waiting to finish',count:`${drafts.length} draft${drafts.length===1?'':'s'}`,href:oldest?.id?`editor.html?id=${encodeURIComponent(oldest.id)}`:'#cards'});}
    const onboarding=activeClients().filter(c=>String(c.status||'').toLowerCase()==='onboarding'&&!hasPublished(c.id));
    if(onboarding.length)rows.push({icon:'badge-check',tone:'',title:'Client onboarding',count:`${onboarding.length} need a live card`,href:'#clients'});
    const nl=newLeads();if(nl.length)rows.push({icon:'user-round-plus',tone:'is-blue',title:'New leads',count:`${nl.length} waiting`,href:'leads.html'});
    const low=publishedCards().filter(c=>cardViews(c.id)===0);if(low.length)rows.push({icon:'chart-no-axes-combined',tone:'is-purple',title:'Cards needing attention',count:`${low.length} with no 30-day views`,href:'#results'});
    if(!rows.length)rows.push({icon:'circle-check-big',tone:'',title:'You’re caught up',count:'No urgent work right now',href:'#clients'});
    return rows.slice(0,4);
  }

  function pipelineStages(){
    const active=activeClients();
    const leadsC=active.filter(c=>String(c.status||'').toLowerCase()==='lead');
    const onboarding=active.filter(c=>String(c.status||'').toLowerCase()==='onboarding');
    const draftClientIds=new Set(draftCards().map(c=>String(c.agency_client_id||'')).filter(Boolean));
    const draftC=active.filter(c=>draftClientIds.has(String(c.id))&&!hasPublished(c.id));
    const liveC=active.filter(c=>hasPublished(c.id));
    const paused=active.filter(c=>String(c.status||'').toLowerCase()==='paused');
    return [
      {key:'lead',label:'Lead',rows:leadsC,copy:'Prospects'},
      {key:'onboarding',label:'Onboarding',rows:onboarding,copy:'Getting started'},
      {key:'draft',label:'Draft',rows:draftC,copy:'Cards in progress'},
      {key:'live',label:'Live',rows:liveC,copy:'Published cards'},
      {key:'paused',label:'Paused',rows:paused,copy:'On hold'}
    ];
  }

  function leadRows(){return leads.slice(0,5).map(l=>{const status=String(l.status||'new').toLowerCase();const cls=status==='contacted'?'is-contacted':status==='qualified'?'is-qualified':'';return `<a class="awc-lead-row" href="leads.html"><span class="awc-avatar">${esc(initials(l.name))}</span><span><strong>${esc(l.name||'New lead')}</strong><small>${esc(l.service_interest||l.email||'Digital card inquiry')}</small></span><span class="awc-lead-meta"><time>${esc(rel(l.created_at))}</time><span class="awc-status-pill ${cls}">${esc(title(status))}</span></span></a>`}).join('')||'<div class="awc-lead-row"><span class="awc-avatar">—</span><span><strong>No leads yet</strong><small>New inquiries will appear here.</small></span></div>'}

  function topCards(){
    const now=Date.now();
    return cards.map(c=>{
      const cv=views.filter(v=>String(v.card_id)===String(c.id));
      const byDay=Array(7).fill(0);cv.forEach(v=>{const d=Math.floor((now-stamp(v.viewed_at))/86400000);if(d>=0&&d<7)byDay[6-d]++});
      return {card:c,views:cv.length,events:cardEvents(c.id),days:byDay};
    }).sort((a,b)=>b.views-a.views||b.events-a.events).slice(0,4);
  }

  function bars(days){const max=Math.max(1,...days);return days.map(n=>`<i style="height:${Math.max(4,Math.round(n/max*27))}px"></i>`).join('')}

  function activityRows(){
    const cmap=new Map(cards.map(c=>[String(c.id),c]));const rows=[];
    leads.slice(0,10).forEach(l=>rows.push({at:l.created_at,icon:'user-round-plus',text:`New lead: ${l.name||'Inquiry'}`,meta:cmap.get(String(l.card_id||''))?cardName(cmap.get(String(l.card_id))):'Lead inbox',href:'leads.html'}));
    events.slice(0,15).forEach(e=>rows.push({at:e.occurred_at,icon:e.event_type==='contact_save'?'user-round-check':'mouse-pointer-click',text:title(e.event_type||'Card action'),meta:cardName(cmap.get(String(e.card_id))||{}),href:'#results'}));
    if(!rows.length)views.slice(0,8).forEach(v=>rows.push({at:v.viewed_at,icon:'eye',text:'Card viewed',meta:cardName(cmap.get(String(v.card_id))||{}),href:'#results'}));
    return rows.sort((a,b)=>stamp(b.at)-stamp(a.at)).slice(0,5);
  }

  function renderOverview(){
    const overview=$('#overview');if(!overview)return;
    let host=$('#awc-overview');if(!host){host=document.createElement('div');host.id='awc-overview';host.className='awc-overview';overview.append(host)}
    const monthStart=new Date();monthStart.setDate(1);monthStart.setHours(0,0,0,0);
    const monthLeads=leads.filter(l=>stamp(l.created_at)>=monthStart.getTime()).length;
    const focus=focusItems();const stages=pipelineStages();const top=topCards();const activity=activityRows();
    host.innerHTML=`
      <div class="awc-stat-grid">
        ${statCard('users-round','Active Clients',activeClients().length,'Current client roster')}
        ${statCard('contact-round','Published Cards',publishedCards().length,`${cards.length} total client cards`)}
        ${statCard('user-round-plus','Leads This Month',monthLeads,`${newLeads().length} currently new`)}
        ${statCard('eye','Card Views',views.length,'Last 30 days')}
      </div>
      <div class="awc-dashboard-grid">
        <section class="awc-panel awc-focus-panel"><div class="awc-panel-head"><div><h2>Focus Today</h2><p>Items that need your attention</p></div><span class="awc-status-pill">${focus.length}</span></div><div class="awc-focus-list">${focus.map(r=>`<a class="awc-focus-row" href="${esc(r.href)}"><span class="awc-focus-icon ${r.tone}"><i data-lucide="${r.icon}" size="15"></i></span><span><strong>${esc(r.title)}</strong><small>${esc(r.count)}</small></span><i data-lucide="chevron-right" size="14"></i></a>`).join('')}</div><div class="awc-focus-footer"><a class="awc-panel-link" href="#clients">View all work →</a></div></section>
        <section class="awc-panel awc-pipeline-panel"><div class="awc-panel-head"><div><h2>Client Pipeline</h2><p>See where your clients stand</p></div></div><div class="awc-pipeline"><div class="awc-pipeline-grid">${stages.map(s=>`<button class="awc-stage" type="button" data-awc-stage="${s.key}"><div class="awc-stage-bar">${esc(s.label)}</div><strong>${s.rows.length}</strong><small>Clients</small><em>${esc(s.copy)}<br>${esc(s.rows.slice(0,2).map(c=>c.name||c.company_name).filter(Boolean).join(' · ')||'No clients')}</em></button>`).join('')}</div></div></section>
        <section class="awc-panel awc-leads-panel"><div class="awc-panel-head"><div><h2>Recent Leads</h2></div><a class="awc-panel-link" href="leads.html">View all</a></div><div class="awc-lead-list">${leadRows()}</div></section>
      </div>
      <div class="awc-bottom-grid">
        <section class="awc-panel"><div class="awc-panel-head"><div><h2>Quick Actions</h2></div></div><div class="awc-quick-grid"><button class="awc-quick" type="button" data-awc-add-client><i data-lucide="user-round-plus"></i>Add Client</button><a class="awc-quick" href="editor.html"><i data-lucide="contact-round"></i>Create Card</a><a class="awc-quick" href="#results"><i data-lucide="chart-no-axes-combined"></i>View Results</a><a class="awc-quick" href="#branding"><i data-lucide="paintbrush-vertical"></i>Brand Studio</a></div></section>
        <section class="awc-panel awc-top-cards-panel"><div class="awc-panel-head"><div><h2>Top Performing Cards</h2><p>Last 30 days</p></div><a class="awc-panel-link" href="#results">View all results</a></div><div class="awc-top-card-list">${top.length?top.map(r=>`<a class="awc-top-card-row" href="${r.card.id?`editor.html?id=${encodeURIComponent(r.card.id)}`:'#cards'}"><span class="awc-top-card-name"><strong>${esc(cardName(r.card))}</strong><small>${esc(String(r.card.status||'draft').toUpperCase())}</small></span><span class="awc-top-card-stat"><small>30-day views</small><strong>${r.views}</strong></span><span class="awc-mini-bars">${bars(r.days)}</span></a>`).join(''):'<div class="awc-top-card-row"><span class="awc-top-card-name"><strong>No card performance yet</strong><small>Publish a card to start collecting views.</small></span></div>'}</div></section>
        <section class="awc-panel"><div class="awc-panel-head"><div><h2>Recent Activity</h2></div><a class="awc-panel-link" href="#results">View all</a></div><div class="awc-activity-list">${activity.length?activity.map(r=>`<a class="awc-activity-row" href="${esc(r.href)}"><span class="awc-activity-icon"><i data-lucide="${r.icon}" size="13"></i></span><span><strong>${esc(r.text)}</strong><small>${esc(r.meta)}</small></span><time>${esc(rel(r.at))}</time></a>`).join(''):'<div class="awc-activity-row"><span class="awc-activity-icon"><i data-lucide="activity" size="13"></i></span><span><strong>Activity will appear here</strong><small>Views, actions and leads</small></span></div>'}</div></section>
      </div>`;
    wireOverview(host);
  }

  function sectionTitle(id){const sec=document.getElementById(id);return sec?.querySelector('h2')?.textContent?.trim()||title(id)}
  function sectionCopy(id){const sec=document.getElementById(id);return sec?.querySelector('.agency-section-head p')?.textContent?.trim()||''}
  function showScreen(id,pushHash=true){
    const allowed=['overview','clients','cards','templates','results','team','branding','settings'];if(!allowed.includes(id))id='overview';
    $$('.agency-section').forEach(s=>s.classList.toggle('awc-screen-hidden',s.id!==id));
    $$('.agency-sidebar a[href^="#"]').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${id}`));
    const h1=$('#agency-business-name'),sub=$('#agency-user-email');
    if(id==='overview'){if(h1)h1.textContent='Agency Work Center';if(sub)sub.textContent=`Here’s what’s happening with ${agencyName} today.`;}
    else{if(h1)h1.textContent=sectionTitle(id);if(sub)sub.textContent=sectionCopy(id)||`Manage ${title(id).toLowerCase()} for ${agencyName}.`;}
    if(pushHash&&location.hash!==`#${id}`)history.replaceState(null,'',`#${id}`);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function filterClients(stage){
    showScreen('clients');
    const body=$('#agency-client-table');if(!body)return;
    const liveIds=new Set(publishedCards().map(c=>String(c.agency_client_id||'')));
    const draftIds=new Set(draftCards().map(c=>String(c.agency_client_id||'')));
    $$('tr',body).forEach(row=>{
      const status=String(row.querySelector('.agency-status')?.textContent||'').trim().toLowerCase();
      const text=String(row.textContent||'').toLowerCase();
      let match=true;
      if(stage==='lead'||stage==='onboarding'||stage==='paused')match=status===stage;
      else if(stage==='draft')match=status!=='archived'&&text&&[...draftIds].some(id=>row.innerHTML.includes(id)) || status==='onboarding';
      else if(stage==='live')match=status==='active';
      row.hidden=!match;
    });
  }

  function wireOverview(host){
    host.querySelector('[data-awc-add-client]')?.addEventListener('click',()=>$('#top-add-client')?.click());
    host.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href').slice(1);if(document.getElementById(id)){e.preventDefault();showScreen(id)}}));
    host.querySelectorAll('[data-awc-stage]').forEach(b=>b.addEventListener('click',()=>filterClients(b.dataset.awcStage)));
  }

  function wireNavigation(){
    $$('.agency-sidebar a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href').slice(1);if(document.getElementById(id)){e.preventDefault();showScreen(id)}}));
    window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(id)showScreen(id,false)});
  }

  async function boot(){
    try{
      if(!await waitReady())return;
      if(!await resolveContext())return;
      await loadData();
      decorateShell();renderOverview();wireNavigation();
      const start=location.hash.slice(1)||'overview';showScreen(start,false);
      if(window.lucide)try{lucide.createIcons()}catch(_){}
      window.addEventListener('focus',()=>{if(document.visibilityState==='visible')loadData().then(()=>{renderPlanCard();renderOverview();if(window.lucide)lucide.createIcons()}).catch(()=>{})},{passive:true});
    }catch(error){console.warn('White Agency Work Center unavailable:',error)}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
