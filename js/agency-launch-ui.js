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

/* LIW Cards — staging-only: simple Agency client ↔ card assignment. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_SIMPLE_CARD_ASSIGNMENT__)return;
  window.__LIW_AGENCY_SIMPLE_CARD_ASSIGNMENT__=true;

  const $=selector=>document.querySelector(selector);
  const clean=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const selectedForNewClient=new Set();
  let user=null;
  let ownerId=null;
  let clients=[];
  let cards=[];
  let observer=null;
  let decorateTimer=0;
  let busy=false;

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencySimpleAssignmentToast);
    window.__agencySimpleAssignmentToast=setTimeout(()=>toast.classList.remove('show'),3400);
  }

  function slugify(value='client'){
    return String(value||'client').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'client';
  }

  async function resolveOwner(){
    if(user&&ownerId)return;
    const auth=await supabaseClient.auth.getUser();
    user=auth?.data?.user||null;
    if(!user)throw new Error('Sign in again to manage Agency clients.');
    const {data:member}=await supabaseClient.from('workspace_members').select('owner_user_id,status').eq('member_user_id',user.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(member?.owner_user_id){ownerId=member.owner_user_id;return;}
    const {data:workspace,error}=await supabaseClient.rpc('ensure_agency_workspace');
    if(error)throw error;
    ownerId=workspace?.owner_id||workspace?.agency?.owner_user_id||user.id;
  }

  async function refreshData(){
    await resolveOwner();
    const [clientResult,cardResult]=await Promise.all([
      supabaseClient.from('agency_clients').select('id,name,company_name,email,phone,website,address,status,updated_at').eq('agency_owner_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('digital_cards').select('id,agency_client_id,full_name,company_name,status,slug,updated_at').eq('user_id',ownerId).order('updated_at',{ascending:false})
    ]);
    if(clientResult.error)throw clientResult.error;
    if(cardResult.error)throw cardResult.error;
    clients=clientResult.data||[];
    cards=cardResult.data||[];
  }

  function clientName(clientId){
    const client=clients.find(row=>String(row.id)===String(clientId));
    return client?.name||client?.company_name||'another client';
  }

  function cardLabel(card){
    const name=clean(card.full_name)||'Untitled card';
    const company=clean(card.company_name);
    return company?`${name} · ${company}`:name;
  }

  function addStyles(){
    if($('#agency-simple-card-assignment-style'))return;
    const style=document.createElement('style');
    style.id='agency-simple-card-assignment-style';
    style.textContent=`
      .agency-card-link-tools{grid-column:1/-1;border:1px solid rgba(11,20,56,.12);border-radius:16px;padding:14px;background:#f8f9fc;display:grid;gap:10px}
      .agency-card-link-tools strong{color:#0b1438}.agency-card-link-tools small{color:#65708a;line-height:1.45}
      .agency-card-link-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .agency-card-link-summary{font-size:13px;color:#59647d;font-weight:700}
      .agency-card-link-check{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:700;color:#19213d;cursor:pointer}
      .agency-card-link-check input{width:18px;height:18px;accent-color:#0b1438}
      .agency-assign-row-action{margin-top:7px;display:inline-flex;align-items:center;gap:6px}
      .agency-assign-dialog{width:min(620px,calc(100vw - 28px));border:0;border-radius:20px;padding:0;box-shadow:0 24px 70px rgba(4,12,40,.28)}
      .agency-assign-dialog::backdrop{background:rgba(4,9,25,.54)}
      .agency-assign-dialog-body{padding:20px;display:grid;gap:16px}
      .agency-assign-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .agency-assign-dialog-head h2{margin:0;color:#0b1438}.agency-assign-dialog-head p{margin:5px 0 0;color:#65708a}
      .agency-assign-list{display:grid;gap:8px;max-height:48vh;overflow:auto;padding-right:3px}
      .agency-assign-option{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid #e2e6ef;border-radius:14px;background:#fff;cursor:pointer}
      .agency-assign-option:hover{border-color:#c6ad70}.agency-assign-option input{width:18px;height:18px;margin-top:2px;accent-color:#0b1438;flex:0 0 auto}
      .agency-assign-option span{display:grid;gap:2px}.agency-assign-option strong{color:#111a38}.agency-assign-option small{color:#6b748a}
      .agency-assign-dialog-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding-top:4px}
      .agency-assign-dialog-actions>div{display:flex;gap:8px;flex-wrap:wrap}
      @media(max-width:700px){.agency-card-link-row{align-items:stretch}.agency-card-link-row .btn{width:100%}.agency-assign-dialog-actions,.agency-assign-dialog-actions>div{width:100%}.agency-assign-dialog-actions .btn{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function selectedNewSummary(){
    const summary=$('[data-new-client-card-summary]');
    if(!summary)return;
    const count=selectedForNewClient.size;
    summary.textContent=count?`${count} existing card${count===1?'':'s'} selected`:'No existing cards selected';
  }

  function installAddClientTools(){
    const form=$('#agency-client-form');
    if(!form||$('#agency-card-link-tools'))return;
    const actions=form.querySelector('.agency-dialog-actions');
    if(!actions)return;
    const tools=document.createElement('div');
    tools.id='agency-card-link-tools';
    tools.className='agency-card-link-tools';
    tools.innerHTML=`<div><strong>Cards for this client</strong><br><small>Optional. Link cards you already built, or create a fresh draft after saving.</small></div><div class="agency-card-link-row"><button class="btn btn-light btn-sm" type="button" data-pick-new-client-cards>Assign existing cards</button><span class="agency-card-link-summary" data-new-client-card-summary>No existing cards selected</span></div><label class="agency-card-link-check"><input id="agency-client-create-new-card-simple" type="checkbox">Create a new draft card for this client</label>`;
    actions.before(tools);
    tools.querySelector('[data-pick-new-client-cards]')?.addEventListener('click',()=>openAssignmentDialog(null,true));
    form.addEventListener('submit',handleAddClientSubmit,true);
    ['#top-add-client','#section-add-client','#quick-add-client'].forEach(selector=>$(selector)?.addEventListener('click',()=>{selectedForNewClient.clear();selectedNewSummary();const create=$('#agency-client-create-new-card-simple');if(create)create.checked=false;}));
  }

  function assignmentDialog(){
    let dialog=$('#agency-simple-assignment-dialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='agency-simple-assignment-dialog';
    dialog.className='agency-assign-dialog';
    dialog.innerHTML='<div class="agency-assign-dialog-body"><div class="agency-assign-dialog-head"><div><h2 data-assignment-title>Assign cards</h2><p data-assignment-copy>Select the cards that belong to this client.</p></div><button class="icon-btn" type="button" data-assignment-close aria-label="Close"><i data-lucide="x"></i></button></div><div class="agency-assign-list" data-assignment-list></div><div class="agency-assign-dialog-actions"><button class="btn btn-light" type="button" data-create-card-for-client hidden>Create new card</button><div><button class="btn btn-light" type="button" data-assignment-close>Cancel</button><button class="btn btn-primary" type="button" data-assignment-save>Save assignment</button></div></div></div>';
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-assignment-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('[data-assignment-save]')?.addEventListener('click',saveAssignmentDialog);
    dialog.querySelector('[data-create-card-for-client]')?.addEventListener('click',createCardFromAssignmentDialog);
    if(window.lucide)try{lucide.createIcons({nodes:[dialog]});}catch(_){}
    return dialog;
  }

  async function openAssignmentDialog(clientId,newClientMode=false){
    try{
      await refreshData();
      const dialog=assignmentDialog();
      dialog.dataset.clientId=clientId||'';
      dialog.dataset.newClientMode=newClientMode?'true':'false';
      const client=clientId?clients.find(row=>String(row.id)===String(clientId)):null;
      dialog.querySelector('[data-assignment-title]').textContent=newClientMode?'Assign existing cards':`Cards for ${client?.name||'client'}`;
      dialog.querySelector('[data-assignment-copy]').textContent=newClientMode?'Choose any cards already built in this Agency workspace.':'Select cards for this client. Uncheck one to remove it from this client.';
      const list=dialog.querySelector('[data-assignment-list]');
      const selected=newClientMode?selectedForNewClient:new Set(cards.filter(card=>String(card.agency_client_id||'')===String(clientId||'')).map(card=>String(card.id)));
      list.innerHTML=cards.length?cards.map(card=>{
        const assignedElsewhere=card.agency_client_id&&String(card.agency_client_id)!==String(clientId||'');
        const note=assignedElsewhere?`Currently linked to ${clientName(card.agency_client_id)} · selecting moves it`:(card.status||'draft');
        return `<label class="agency-assign-option"><input type="checkbox" value="${esc(card.id)}" ${selected.has(String(card.id))?'checked':''}><span><strong>${esc(cardLabel(card))}</strong><small>${esc(note)}</small></span></label>`;
      }).join(''):'<div class="agency-empty">No cards have been built yet. You can create a new one instead.</div>';
      const createButton=dialog.querySelector('[data-create-card-for-client]');
      createButton.hidden=newClientMode;
      createButton.dataset.clientId=clientId||'';
      dialog.querySelector('[data-assignment-save]').textContent=newClientMode?'Use selected cards':'Save assignment';
      if(!dialog.open)dialog.showModal();
    }catch(error){notify(error.message||'Could not load cards.');}
  }

  async function saveCardLinks(clientId,selectedIds){
    const selected=new Set(selectedIds.map(String));
    const currentForClient=cards.filter(card=>String(card.agency_client_id||'')===String(clientId)).map(card=>String(card.id));
    const unlink=currentForClient.filter(id=>!selected.has(id));
    if(selected.size){const {error}=await supabaseClient.from('digital_cards').update({agency_client_id:clientId}).eq('user_id',ownerId).in('id',Array.from(selected));if(error)throw error;}
    if(unlink.length){const {error}=await supabaseClient.from('digital_cards').update({agency_client_id:null}).eq('user_id',ownerId).in('id',unlink);if(error)throw error;}
  }

  async function saveAssignmentDialog(){
    const dialog=assignmentDialog();
    const selected=Array.from(dialog.querySelectorAll('[data-assignment-list] input[type="checkbox"]:checked')).map(input=>String(input.value));
    if(dialog.dataset.newClientMode==='true'){
      selectedForNewClient.clear();selected.forEach(id=>selectedForNewClient.add(id));selectedNewSummary();dialog.close();return;
    }
    const clientId=dialog.dataset.clientId;if(!clientId)return;
    const button=dialog.querySelector('[data-assignment-save]');button.disabled=true;button.textContent='Saving…';
    try{await saveCardLinks(clientId,selected);notify('Card assignment saved');dialog.close();setTimeout(()=>location.reload(),300);}
    catch(error){notify(error.message||'Could not save card assignment.');button.disabled=false;button.textContent='Save assignment';}
  }

  async function capacityCheck(){
    const [limitResult,countResult]=await Promise.all([
      supabaseClient.rpc('card_limit_for_user',{p_user_id:ownerId}),
      supabaseClient.from('digital_cards').select('id',{count:'exact',head:true}).eq('user_id',ownerId)
    ]);
    if(limitResult.error)throw limitResult.error;
    if(countResult.error)throw countResult.error;
    const limit=Number(limitResult.data||0),count=Number(countResult.count||0);
    if(limit>0&&count>=limit)throw new Error(`Card capacity reached (${limit}).`);
  }

  async function createDraftCard(client){
    await capacityCheck();
    const suffix=crypto.randomUUID().replaceAll('-','').slice(0,7);
    const payload={user_id:ownerId,agency_client_id:client.id,full_name:client.name||'New Client',company_name:client.company_name||null,email:client.email||null,phone:client.phone||null,sms_phone:client.phone||null,website:client.website||null,business_address:client.address||null,client_name:client.name||null,internal_label:client.company_name||client.name||'Client',status:'draft',slug:`${slugify(client.name||client.company_name||'client')}-${suffix}`};
    const {data,error}=await supabaseClient.from('digital_cards').insert(payload).select('id').single();
    if(error)throw error;
    return data;
  }

  async function createCardFromAssignmentDialog(){
    const dialog=assignmentDialog(),clientId=dialog.dataset.clientId;
    const client=clients.find(row=>String(row.id)===String(clientId));if(!client)return;
    const button=dialog.querySelector('[data-create-card-for-client]');button.disabled=true;button.textContent='Creating…';
    try{const card=await createDraftCard(client);location.href=typeof liwUrl==='function'?liwUrl(`editor.html?id=${encodeURIComponent(card.id)}`):`editor.html?id=${encodeURIComponent(card.id)}`;}
    catch(error){notify(error.message||'Could not create card.');button.disabled=false;button.textContent='Create new card';}
  }

  async function handleAddClientSubmit(event){
    if(event.currentTarget?.id!=='agency-client-form'||busy)return;
    event.preventDefault();event.stopImmediatePropagation();
    const form=event.currentTarget;if(!form.reportValidity())return;
    busy=true;
    const submit=$('#agency-client-submit');if(submit){submit.disabled=true;submit.textContent='Saving…';}
    try{
      await refreshData();
      const row={agency_owner_id:ownerId,created_by:user.id,name:clean($('#agency-client-name')?.value),company_name:clean($('#agency-client-company')?.value)||null,email:clean($('#agency-client-email')?.value)||null,phone:clean($('#agency-client-phone')?.value)||null,website:clean($('#agency-client-website')?.value)||null,address:clean($('#agency-client-address')?.value)||null,status:clean($('#agency-client-status')?.value)||'onboarding'};
      const {data:client,error}=await supabaseClient.from('agency_clients').insert(row).select('*').single();if(error)throw error;
      if(selectedForNewClient.size)await saveCardLinks(client.id,Array.from(selectedForNewClient));
      const createNew=Boolean($('#agency-client-create-new-card-simple')?.checked);
      if(createNew){const card=await createDraftCard(client);location.href=typeof liwUrl==='function'?liwUrl(`editor.html?id=${encodeURIComponent(card.id)}`):`editor.html?id=${encodeURIComponent(card.id)}`;return;}
      notify(selectedForNewClient.size?'Client added and cards assigned':'Client added');
      selectedForNewClient.clear();
      setTimeout(()=>location.reload(),300);
    }catch(error){notify(error.message||'Could not add client.');busy=false;if(submit){submit.disabled=false;submit.textContent='Add client';}}
  }

  async function decorateClientRows(){
    if(busy)return;
    const tbody=$('#agency-client-table');if(!tbody)return;
    try{
      await refreshData();
      const rows=Array.from(tbody.querySelectorAll('tr')).filter(row=>!row.querySelector('.agency-empty'));
      rows.forEach((row,index)=>{
        const client=clients[index];if(!client||row.dataset.cardAssignmentClientId===String(client.id))return;
        row.dataset.cardAssignmentClientId=String(client.id);
        const cell=row.lastElementChild;if(!cell)return;
        const button=document.createElement('button');
        button.type='button';button.className='btn btn-ghost btn-sm agency-assign-row-action';button.innerHTML='<i data-lucide="link-2" size="14"></i>Assign cards';
        button.addEventListener('click',()=>openAssignmentDialog(client.id,false));
        cell.append(document.createElement('br'),button);
      });
      if(window.lucide)try{lucide.createIcons({nodes:[tbody]});}catch(_){}
    }catch(error){console.warn('Agency card assignment:',error);}
  }

  function scheduleDecorate(){clearTimeout(decorateTimer);decorateTimer=setTimeout(decorateClientRows,120);}

  async function install(){
    if(typeof supabaseClient==='undefined')return;
    addStyles();
    installAddClientTools();
    scheduleDecorate();
    const tbody=$('#agency-client-table');
    if(tbody&&!observer){observer=new MutationObserver(scheduleDecorate);observer.observe(tbody,{childList:true,subtree:true});}
    setTimeout(()=>{installAddClientTools();scheduleDecorate();},900);
    setTimeout(()=>{installAddClientTools();scheduleDecorate();},2200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();