(function(){
  'use strict';

  const DEFAULT_DAYS=30;
  const EVENT_LABELS={
    phone_click:['Phone click','phone'],
    text_click:['Text click','message-square-text'],
    email_click:['Email click','mail'],
    website_click:['Website click','globe'],
    location_click:['Directions click','map-pin'],
    social_click:['Social click','share-2'],
    contact_save:['Contact saved','user-round-plus'],
    share_click:['Card shared','send'],
    qr_scan:['QR open','qr-code']
  };

  let user=null;
  let access=null;
  let ownerId=null;
  let cards=[];
  let clients=[];
  let days=DEFAULT_DAYS;
  let currentViews=[];
  let previousViews=[];
  let currentEvents=[];
  let previousEvents=[];
  let currentLeads=[];
  let previousLeads=[];
  let loading=false;

  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function isPro(){
    const preview=qaPreviewPlan();
    if(access?.isAdmin&&['agency','white_label'].includes(preview))return preview==='white_label';
    return String(access?.planKey||'')==='white_label'||Boolean(access?.isAdmin&&!access?.isPlanPreview);
  }

  function qaPreviewPlan(){
    try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}catch(_){return '';}
  }

  function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

  async function waitForAgencyReady(){
    for(let attempt=0;attempt<40;attempt++){
      const clientLoading=$('#agency-client-table')?.textContent?.includes('Loading clients');
      const cardLoading=$('#agency-card-grid')?.textContent?.includes('Loading cards');
      const planLoading=$('#agency-sidebar-plan')?.textContent?.includes('Loading');
      if(!clientLoading&&!cardLoading&&!planLoading)return;
      await wait(125);
    }
  }

  async function resolveOwner(){
    const {data}=await supabaseClient.rpc('ensure_agency_workspace');
    ownerId=data?.owner_id||data?.agency?.owner_user_id||user.id;
  }

  async function loadDirectory(){
    const [cardResult,clientResult]=await Promise.all([
      supabaseClient.from('digital_cards').select('id,agency_client_id,full_name,company_name,status,slug,updated_at').eq('user_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('agency_clients').select('id,name,company_name,status').eq('agency_owner_id',ownerId).order('updated_at',{ascending:false})
    ]);
    if(cardResult.error)console.warn('Agency Results cards:',cardResult.error);
    if(clientResult.error)console.warn('Agency Results clients:',clientResult.error);
    cards=cardResult.data||[];
    clients=clientResult.data||[];
  }

  function splitPeriod(rows,dateKey,since,previousSince){
    const sinceTime=since.getTime();
    const previousTime=previousSince.getTime();
    const current=[];
    const previous=[];
    (rows||[]).forEach(row=>{
      const stamp=new Date(row[dateKey]).getTime();
      if(stamp>=sinceTime)current.push(row);
      else if(stamp>=previousTime)previous.push(row);
    });
    return {current,previous};
  }

  async function loadPerformance(){
    if(loading)return;
    loading=true;
    renderLoading();
    try{
      if(!cards.length){
        currentViews=[];previousViews=[];currentEvents=[];previousEvents=[];currentLeads=[];previousLeads=[];
        render();
        return;
      }
      const now=new Date();
      const since=new Date(now.getTime()-days*86400000);
      const previousSince=new Date(now.getTime()-days*2*86400000);
      const ids=cards.map(card=>card.id);
      const [viewResult,eventResult,leadResult]=await Promise.all([
        supabaseClient.from('card_views').select('card_id,device_type,referrer,viewed_at').in('card_id',ids).gte('viewed_at',previousSince.toISOString()).order('viewed_at',{ascending:false}),
        supabaseClient.from('card_events').select('card_id,event_type,occurred_at').in('card_id',ids).gte('occurred_at',previousSince.toISOString()).order('occurred_at',{ascending:false}),
        supabaseClient.from('leads').select('id,card_id,name,status,created_at').eq('owner_user_id',ownerId).gte('created_at',previousSince.toISOString()).order('created_at',{ascending:false})
      ]);
      if(viewResult.error)console.warn('Agency Results views:',viewResult.error);
      if(eventResult.error)console.warn('Agency Results events:',eventResult.error);
      if(leadResult.error)console.warn('Agency Results leads:',leadResult.error);

      const viewSplit=splitPeriod(viewResult.data||[],'viewed_at',since,previousSince);
      const eventSplit=splitPeriod(eventResult.data||[],'occurred_at',since,previousSince);
      const leadSplit=splitPeriod(leadResult.data||[],'created_at',since,previousSince);
      currentViews=viewSplit.current;previousViews=viewSplit.previous;
      currentEvents=eventSplit.current;previousEvents=eventSplit.previous;
      currentLeads=leadSplit.current;previousLeads=leadSplit.previous;
      render();
    }catch(error){
      console.error('Agency Results failed:',error);
      renderError(error?.message||'Results could not be loaded.');
    }finally{
      loading=false;
    }
  }

  function changeCopy(current,previous,noun){
    if(!previous&&current)return {text:`New ${noun} activity`,className:'positive'};
    if(!previous&&!current)return {text:`No ${noun} yet`,className:''};
    const percent=Math.round((current-previous)/previous*100);
    if(percent===0)return {text:`No change vs prior ${days} days`,className:''};
    return {text:`${percent>0?'+':''}${percent}% vs prior ${days} days`,className:percent>0?'positive':'negative'};
  }

  function eventCounts(rows){
    const saves=rows.filter(row=>row.event_type==='contact_save').length;
    const actions=rows.filter(row=>row.event_type!=='contact_save').length;
    return {saves,actions};
  }

  function getClient(card){return clients.find(client=>client.id===card.agency_client_id)||null;}
  function cardName(card){return card.company_name||card.full_name||'Untitled card';}
  function clientName(card){const client=getClient(card);return client?.company_name||client?.name||'Unassigned client';}

  function performanceRows(){
    return cards.map(card=>{
      const views=currentViews.filter(row=>row.card_id===card.id).length;
      const events=currentEvents.filter(row=>row.card_id===card.id);
      const saves=events.filter(row=>row.event_type==='contact_save').length;
      const actions=events.filter(row=>row.event_type!=='contact_save').length;
      const leads=currentLeads.filter(row=>row.card_id===card.id).length;
      return {card,views,saves,actions,leads,outcomes:saves+actions+leads};
    }).sort((a,b)=>b.views-a.views||b.outcomes-a.outcomes||cardName(a.card).localeCompare(cardName(b.card)));
  }

  function clientRows(cardRows){
    const map=new Map();
    cardRows.forEach(row=>{
      const key=row.card.agency_client_id||`card:${row.card.id}`;
      const client=getClient(row.card);
      const existing=map.get(key)||{name:client?.company_name||client?.name||cardName(row.card),cards:0,views:0,actions:0,leads:0};
      existing.cards+=1;
      existing.views+=row.views;
      existing.actions+=row.saves+row.actions;
      existing.leads+=row.leads;
      map.set(key,existing);
    });
    return [...map.values()].sort((a,b)=>b.views-a.views||(b.actions+b.leads)-(a.actions+a.leads));
  }

  function recentActivity(){
    const cardMap=new Map(cards.map(card=>[card.id,card]));
    const rows=[];
    currentLeads.forEach(lead=>{
      const card=cardMap.get(lead.card_id);
      rows.push({at:lead.created_at,icon:'inbox',title:`New lead${lead.name?` from ${lead.name}`:''}`,meta:card?cardName(card):'Digital card'});
    });
    currentEvents.forEach(event=>{
      const card=cardMap.get(event.card_id);
      const [label,icon]=EVENT_LABELS[event.event_type]||['Card action','mouse-pointer-click'];
      rows.push({at:event.occurred_at,icon,title:label,meta:card?cardName(card):'Digital card'});
    });
    if(!rows.length){
      currentViews.slice(0,5).forEach(view=>{
        const card=cardMap.get(view.card_id);
        rows.push({at:view.viewed_at,icon:'eye',title:'Card viewed',meta:card?cardName(card):'Digital card'});
      });
    }
    return rows.sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,5);
  }

  function formatActivityTime(value){
    const date=new Date(value);
    const diff=Date.now()-date.getTime();
    if(diff<3600000)return `${Math.max(1,Math.round(diff/60000))} min ago`;
    if(diff<86400000)return `${Math.round(diff/3600000)} hr ago`;
    return date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  }

  function renderLoading(){
    const host=$('#results .agency-section-card');
    if(!host)return;
    host.innerHTML=`<div class="agency-results-shell"><div class="agency-results-toolbar"><div><h2>Results</h2><p>Loading agency performance…</p></div></div><div class="agency-results-kpis agency-results-loading"><div class="agency-results-kpi"></div><div class="agency-results-kpi"></div><div class="agency-results-kpi"></div><div class="agency-results-kpi"></div></div><div id="agency-wide-results-card" hidden></div></div>`;
  }

  function renderError(message){
    const host=$('#results .agency-section-card');
    if(!host)return;
    host.innerHTML=`<div class="agency-results-shell"><div class="agency-results-toolbar"><div><h2>Results</h2><p>Live performance across your client cards.</p></div></div><div class="agency-results-empty">${esc(message)} <button class="btn btn-light btn-sm" type="button" id="agency-results-retry">Try again</button></div><div id="agency-wide-results-card" hidden></div></div>`;
    $('#agency-results-retry')?.addEventListener('click',loadPerformance);
  }

  function render(){
    const host=$('#results .agency-section-card');
    if(!host)return;
    const counts=eventCounts(currentEvents);
    const previousCounts=eventCounts(previousEvents);
    const viewChange=changeCopy(currentViews.length,previousViews.length,'view');
    const saveChange=changeCopy(counts.saves,previousCounts.saves,'save');
    const actionChange=changeCopy(counts.actions,previousCounts.actions,'action');
    const leadChange=changeCopy(currentLeads.length,previousLeads.length,'lead');
    const cardRows=performanceRows();
    const maxViews=Math.max(1,...cardRows.map(row=>row.views));
    const activity=recentActivity();
    const published=cardRows.filter(row=>String(row.card.status||'').toLowerCase()!=='draft');
    const needsAttention=published.filter(row=>row.views===0).slice(0,5);
    const clientsRanked=clientRows(cardRows);

    host.innerHTML=`<div class="agency-results-shell">
      <div class="agency-results-toolbar">
        <div><h2>Results</h2><p>Your agency performance snapshot. See what is getting attention, what is converting, and which client cards need work.</p></div>
        <div class="agency-results-actions">
          <div class="agency-results-range" role="group" aria-label="Results date range">
            ${[7,30,90].map(value=>`<button type="button" data-results-days="${value}" class="${days===value?'active':''}">${value} days</button>`).join('')}
          </div>
          <a class="agency-results-link" href="analytics.html"><i data-lucide="chart-no-axes-combined" size="14"></i>Analytics</a>
          <a class="agency-results-link" href="leads.html"><i data-lucide="inbox" size="14"></i>Leads</a>
        </div>
      </div>

      <div class="agency-results-kpis">
        ${kpi('Card views','eye',currentViews.length,viewChange)}
        ${kpi('Contact saves','user-round-plus',counts.saves,saveChange)}
        ${kpi('Link actions','mouse-pointer-click',counts.actions,actionChange)}
        ${kpi('Leads','inbox',currentLeads.length,leadChange)}
      </div>

      <div class="agency-results-main-grid">
        <article class="agency-results-panel">
          <div class="agency-results-panel-head"><div><h3>Top-performing cards</h3><p>Ranked by views, then engagement outcomes.</p></div><a href="analytics.html">Full analytics →</a></div>
          <div class="agency-results-panel-body">
            ${cardRows.length?`<div class="agency-performance-list">${cardRows.slice(0,isPro()?8:5).map(row=>performanceRow(row,maxViews)).join('')}</div>`:'<div class="agency-results-empty">No cards yet. Create and publish a client card to start collecting results.</div>'}
          </div>
        </article>
        <article class="agency-results-panel">
          <div class="agency-results-panel-head"><div><h3>Recent activity</h3><p>Latest meaningful engagement.</p></div></div>
          <div class="agency-results-panel-body">
            ${activity.length?`<div class="agency-activity-list">${activity.map(item=>`<div class="agency-activity-row"><span class="agency-activity-icon"><i data-lucide="${item.icon}" size="15"></i></span><div class="agency-activity-copy"><strong>${esc(item.title)}</strong><small>${esc(item.meta)} · ${esc(formatActivityTime(item.at))}</small></div></div>`).join('')}</div>`:'<div class="agency-results-empty">No engagement activity in this period yet.</div>'}
          </div>
        </article>
      </div>

      <div class="agency-results-bottom-grid">
        <article class="agency-results-panel" id="agency-results-client-comparison">
          ${isPro()?renderProRanking(clientsRanked):renderProLock()}
        </article>
        <article class="agency-results-panel agency-attention-panel">
          <div class="agency-attention-title"><span><i data-lucide="radar" size="16"></i></span>Needs attention</div>
          ${!published.length?'<div class="agency-results-empty">Publish client cards to start monitoring performance.</div>':needsAttention.length?`<div class="agency-attention-list">${needsAttention.map(row=>`<div class="agency-attention-item"><div><strong>${esc(cardName(row.card))}</strong><small>${esc(clientName(row.card))} · no views in ${days} days</small></div><a href="editor.html?id=${encodeURIComponent(row.card.id)}">Review</a></div>`).join('')}</div>`:`<div class="agency-attention-good"><i data-lucide="circle-check" size="15"></i> Every published card has activity in the selected period.</div>`}
        </article>
      </div>
      <div id="agency-wide-results-card" hidden></div>
    </div>`;

    host.querySelectorAll('[data-results-days]').forEach(button=>button.addEventListener('click',()=>{
      const next=Number(button.dataset.resultsDays);
      if(next===days||loading)return;
      days=next;
      loadPerformance();
    }));
    if(window.lucide)lucide.createIcons();
  }

  function kpi(label,icon,value,change){
    return `<article class="agency-results-kpi"><div class="agency-results-kpi-head"><span>${esc(label)}</span><span class="agency-results-kpi-icon"><i data-lucide="${icon}" size="15"></i></span></div><strong>${Number(value||0).toLocaleString()}</strong><small class="${change.className}">${esc(change.text)}</small></article>`;
  }

  function performanceRow(row,maxViews){
    const width=Math.max(row.views?8:0,Math.round(row.views/maxViews*100));
    return `<div class="agency-performance-row"><div class="agency-performance-card"><strong>${esc(cardName(row.card))}</strong><small>${esc(clientName(row.card))}</small><div class="agency-performance-meter"><span style="width:${width}%"></span></div></div><div class="agency-performance-metric"><strong>${row.views}</strong><small>views</small></div><div class="agency-performance-metric"><strong>${row.outcomes}</strong><small>outcomes</small></div></div>`;
  }

  function renderProRanking(rows){
    return `<div class="agency-results-panel-head"><div><h3>Client performance · Pro</h3><p>Compare client results across the agency from one view.</p></div><a href="analytics.html">Deep dive →</a></div><div class="agency-results-panel-body">${rows.length?`<div class="agency-client-ranking">${rows.slice(0,8).map((row,index)=>`<div class="agency-client-rank-row"><span class="agency-client-rank-number">${index+1}</span><div class="agency-client-rank-name"><strong>${esc(row.name)}</strong><small>${row.cards} card${row.cards===1?'':'s'}</small></div><div class="agency-client-rank-stat"><strong>${row.views}</strong><small>views</small></div><div class="agency-client-rank-stat"><strong>${row.actions}</strong><small>actions</small></div><div class="agency-client-rank-stat"><strong>${row.leads}</strong><small>leads</small></div></div>`).join('')}</div>`:'<div class="agency-results-empty">Client comparison appears as performance data comes in.</div>'}</div>`;
  }

  function renderProLock(){
    return `<div class="agency-results-pro-lock"><span class="agency-results-lock-icon"><i data-lucide="building-2" size="18"></i></span><strong>Agency-wide client comparison · Pro</strong><p>Starter gives you the live performance snapshot above. Agency Pro adds ranked client comparisons so you can quickly see who is winning and who needs attention.</p><a href="agency.html#plans"><i data-lucide="sparkles" size="13"></i>Compare Agency Pro</a></div>`;
  }

  async function boot(){
    try{
      await waitForAgencyReady();
      user=await requireUser();
      if(!user)return;
      access=await getLiwAccessContext(user,{refresh:true});
      await resolveOwner();
      await loadDirectory();
      await loadPerformance();
    }catch(error){
      console.error('Agency Results boot failed:',error);
      renderError(error?.message||'Results could not be loaded.');
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
