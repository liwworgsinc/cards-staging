(function(){
  const DESIGN_FIELDS=['template_id','primary_color','secondary_color','background_color','text_color','button_color','button_text_color','font_family','button_style','profile_image_shape','profile_border_color','border_radius','card_layout','card_experience','gradient_background','color_mode','cover_position','cover_overlay','branding_mode','social_button_style','social_button_size','qr_foreground_color','qr_background_color'];
  const RICH_STYLE_FIELDS=['appearance','layout','accent','heading_align','display_title','display_kicker'];
  let user=null;
  let access=null;
  let workspace=null;
  let ownerId=null;
  let clients=[];
  let cards=[];
  let templates=[];
  let members=[];
  let cardLimit=15;
  let templateLimit=3;
  let teamLimit=0;
  let packQuantity=0;

  const $=selector=>document.querySelector(selector);
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function notify(message){
    const el=$('#agency-toast');
    if(!el)return;
    el.textContent=message;
    el.classList.add('show');
    clearTimeout(window.__agencyToastTimer);
    window.__agencyToastTimer=setTimeout(()=>el.classList.remove('show'),3200);
  }

  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function slugify(value='client'){return String(value||'client').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'client';}
  function previewPlanKey(){
    if(!isLiwStagingPlanQaHost())return '';
    try{const value=String(localStorage.getItem(LIW_ADMIN_PLAN_PREVIEW_KEY)||'').toLowerCase();return ['agency','white_label'].includes(value)?value:'';}catch(_){return '';}
  }

  async function resolveAgencyAccess(){
    const base=await getLiwAccessContext(user,{refresh:true});
    const preview=previewPlanKey();
    if(base.isAdmin&&preview){
      const {data:plan}=await supabaseClient.from('plan_definitions').select('plan_key,name,card_limit,entitlements').eq('plan_key',preview).maybeSingle();
      return {...base,isPlanPreview:true,simulatedPlanKey:preview,planKey:preview,planName:plan?.name||(preview==='agency'?'Agency Starter':'Agency Pro'),cardLimit:Number(plan?.card_limit||(preview==='agency'?15:50)),entitlements:{...(plan?.entitlements||{})},has(feature){return Boolean(plan?.entitlements?.[feature]);}};
    }
    return base;
  }

  function isAgencyPlan(){return access?.isAdmin||['agency','white_label'].includes(String(access?.planKey||''));}
  function isPro(){return String(access?.planKey||'')==='white_label'||(access?.isAdmin&&!access?.isPlanPreview);}
  function isOwner(){return Boolean(user && ownerId && user.id===ownerId);}
  function canEditWorkspace(){return !access?.workspaceMember || ['editor','designer','agency_admin'].includes(String(access.workspaceMember.role||''));}

  async function inheritAgencyMembership(){
    const {data:member}=await supabaseClient.from('workspace_members').select('owner_user_id,role,status').eq('member_user_id',user.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(!member)return false;
    const {data:agency}=await supabaseClient.from('agency_accounts').select('owner_user_id,plan_key,status').eq('owner_user_id',member.owner_user_id).maybeSingle();
    if(!agency||!['trial','active'].includes(String(agency.status||'')))return false;
    const planKey=agency.plan_key==='white_label_beta'?'white_label':agency.plan_key;
    if(!['agency','white_label'].includes(planKey))return false;
    const {data:plan}=await supabaseClient.from('plan_definitions').select('plan_key,name,card_limit,entitlements').eq('plan_key',planKey).maybeSingle();
    access={...access,planKey,planName:plan?.name||(planKey==='agency'?'Agency Starter':'Agency Pro'),cardLimit:Number(plan?.card_limit||(planKey==='agency'?15:50)),entitlements:{...(plan?.entitlements||{})},workspaceMember:member,has(feature){return Boolean(plan?.entitlements?.[feature]);}};
    return true;
  }

  async function loadWorkspace(){
    const {data,error}=await supabaseClient.rpc('ensure_agency_workspace');
    if(error)throw error;
    workspace=data;
    ownerId=data?.owner_id||data?.agency?.owner_user_id||user.id;
  }

  async function loadCapacity(){
    if(access?.isPlanPreview){
      cardLimit=Number(access.cardLimit||15);
      templateLimit=String(access.planKey)==='white_label'?100000:3;
      teamLimit=String(access.planKey)==='white_label'?5:0;
      packQuantity=0;
      return;
    }
    const [cardResult,templateResult,seatResult,packResult]=await Promise.all([
      supabaseClient.rpc('card_limit_for_user',{p_user_id:ownerId}),
      supabaseClient.rpc('agency_template_limit_for_user',{p_user_id:ownerId}),
      supabaseClient.rpc('team_seat_limit_for_user',{p_user_id:ownerId}),
      supabaseClient.from('subscription_addons').select('quantity,status').eq('user_id',ownerId).eq('addon_key','agency_card_pack_25').maybeSingle()
    ]);
    cardLimit=Number(cardResult.data||access?.cardLimit||15);
    templateLimit=Number(templateResult.data||3);
    teamLimit=Number(seatResult.data||0);
    packQuantity=['active','trialing'].includes(packResult.data?.status)?Number(packResult.data?.quantity||0):0;
  }

  async function loadData(){
    const [clientResult,cardResult,templateResult,memberResult]=await Promise.all([
      supabaseClient.from('agency_clients').select('*').eq('agency_owner_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('digital_cards').select('id,agency_client_id,full_name,company_name,status,slug,updated_at,template_id,primary_color,secondary_color,background_color,text_color,button_color,button_text_color,font_family,button_style,profile_image_shape,border_radius,card_layout,card_experience,gradient_background,color_mode,cover_position,cover_overlay,branding_mode,social_button_style,social_button_size,qr_foreground_color,qr_background_color').eq('user_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('agency_saved_templates').select('*').eq('agency_owner_id',ownerId).eq('is_active',true).order('updated_at',{ascending:false}),
      supabaseClient.from('workspace_members').select('id,invited_email,role,status,member_user_id,invite_delivery_status').eq('owner_user_id',ownerId).in('status',['invited','active']).order('created_at',{ascending:true})
    ]);
    if(clientResult.error)throw clientResult.error;
    if(cardResult.error)throw cardResult.error;
    if(templateResult.error)throw templateResult.error;
    if(memberResult.error)throw memberResult.error;
    clients=clientResult.data||[];
    cards=cardResult.data||[];
    templates=templateResult.data||[];
    members=memberResult.data||[];
  }

  function renderHeader(){
    const business=workspace?.agency?.business_name||access?.profile?.full_name||'Agency Workspace';
    $('#agency-business-name').textContent=business;
    $('#agency-user-email').textContent=user.email||'';
    $('#agency-sidebar-plan').textContent=access.planName||'Agency';
    $('#agency-sidebar-copy').textContent=isPro()?'White-label, team, templates and scale tools':'15 cards · 3 templates · owner workspace';
    if(access.isPlanPreview){$('#agency-preview-note').hidden=false;}
  }

  function renderStats(){
    const activeClients=clients.filter(row=>row.status!=='archived').length;
    const used=cards.length;
    const percent=cardLimit>0?Math.min(100,Math.round((used/cardLimit)*100)):0;
    $('#agency-client-count').textContent=String(activeClients);
    $('#agency-card-count').textContent=String(used);
    $('#agency-card-limit-copy').textContent=`${cardLimit} included${packQuantity?` · ${packQuantity} capacity pack${packQuantity===1?'':'s'}`:''}`;
    $('#agency-capacity-display').textContent=`${used} / ${cardLimit}`;
    $('#agency-capacity-progress').style.width=`${percent}%`;
    $('#agency-template-count').textContent=String(templates.length);
    $('#agency-template-limit-copy').textContent=templateLimit>=100000?'Unlimited saved templates':`${templateLimit} saved templates`;
    $('#agency-team-count').textContent=String(members.length);
    $('#agency-team-limit-copy').textContent=teamLimit>0?`${teamLimit} staff seats`:'Owner only';
  }

  function clientCardCount(clientId){return cards.filter(card=>card.agency_client_id===clientId).length;}
  function renderClients(){
    const body=$('#agency-client-table');
    if(!clients.length){body.innerHTML='<tr><td colspan="5" class="agency-empty">No clients yet. Add your first client to start the Agency workflow.</td></tr>';return;}
    body.innerHTML=clients.map(client=>`<tr><td><strong>${esc(client.name)}</strong><br><small>${esc(client.email||'')}</small></td><td>${esc(client.company_name||'—')}</td><td><span class="agency-status ${esc(client.status)}">${esc(client.status)}</span></td><td>${clientCardCount(client.id)}</td><td>${esc(client.phone||client.website||'—')}</td></tr>`).join('');
  }

  function renderCards(){
    const grid=$('#agency-card-grid');
    if(!cards.length){grid.innerHTML='<div class="agency-empty">No client cards yet. Create one or start from an Agency Template.</div>';return;}
    const clientMap=new Map(clients.map(row=>[row.id,row]));
    grid.innerHTML=cards.slice(0,12).map(card=>{const client=clientMap.get(card.agency_client_id);return `<article class="agency-client-card"><h3>${esc(card.full_name||'Untitled card')}</h3><p>${esc(card.company_name||client?.company_name||'No company')}</p><div class="agency-card-meta"><span>${esc(card.status||'draft')}</span>${client?`<span>${esc(client.name)}</span>`:''}</div><div class="agency-template-actions"><a class="btn btn-light btn-sm" href="editor.html?id=${encodeURIComponent(card.id)}">Edit</a><a class="btn btn-ghost btn-sm" href="card.html?slug=${encodeURIComponent(card.slug||'')}">Preview</a></div></article>`;}).join('');
  }

  function renderTemplates(){
    const grid=$('#agency-template-grid');
    if(!templates.length){grid.innerHTML='<div class="agency-empty">No Agency Templates saved yet. Choose “Save from card” to turn a strong design into a reusable starting point.</div>';return;}
    grid.innerHTML=templates.map(template=>`<article class="agency-template-item"><h3>${esc(template.name)}</h3><p>${esc(template.description||'Reusable agency design')}</p><div class="agency-card-meta">${template.category?`<span>${esc(template.category)}</span>`:''}<span>${isPro()?'Pro library':'Starter library'}</span></div><div class="agency-template-actions"><button class="btn btn-primary btn-sm" type="button" data-use-agency-template="${template.id}">Use template</button><button class="btn btn-ghost btn-sm" type="button" data-delete-agency-template="${template.id}">Delete</button></div></article>`).join('');
    grid.querySelectorAll('[data-use-agency-template]').forEach(button=>button.addEventListener('click',()=>openUseTemplate(button.dataset.useAgencyTemplate)));
    grid.querySelectorAll('[data-delete-agency-template]').forEach(button=>button.addEventListener('click',()=>deleteTemplate(button.dataset.deleteAgencyTemplate)));
  }

  function renderPlanTools(){
    const wide=$('#agency-wide-results-card');
    if(isPro()){
      wide.innerHTML='<strong>Agency-wide analytics unlocked</strong><p>Pro can compare client performance across the full agency and use exports for reporting.</p>';
      renderTeamTools();
      renderBrandingTools();
      renderProClientTools();
    }
  }

  function renderProClientTools(){
    const actions=$('#clients .agency-section-actions');
    if(!actions||actions.querySelector('[data-pro-client-export]'))return;
    const exportButton=document.createElement('button');
    exportButton.type='button';exportButton.className='btn btn-light btn-sm';exportButton.dataset.proClientExport='true';exportButton.innerHTML='<i data-lucide="download" size="15"></i>Export CSV';exportButton.addEventListener('click',exportClientsCsv);
    const importLabel=document.createElement('label');
    importLabel.className='btn btn-light btn-sm';importLabel.innerHTML='<i data-lucide="file-up" size="15"></i>Import CSV<input type="file" accept=".csv,text/csv" hidden data-pro-client-import>';
    importLabel.querySelector('input').addEventListener('change',importClientsCsv);
    actions.prepend(importLabel,exportButton);
    if(window.lucide)lucide.createIcons();
  }

  function renderTeamTools(){
    const container=$('#agency-team-content');
    container.className='';
    container.innerHTML=`<div class="agency-section-head" style="margin-bottom:10px"><div><strong>${members.length} of ${teamLimit} staff seats used</strong><p>Invite staff as Agency Admin, Designer, or Viewer.</p></div>${isOwner()?'<button class="btn btn-primary btn-sm" id="agency-invite-member" type="button"><i data-lucide="user-plus" size="15"></i>Invite staff</button>':'<span class="agency-status">Owner manages invitations</span>'}</div><div class="agency-card-grid">${members.length?members.map(m=>`<article class="agency-client-card"><h3>${esc(m.invited_email||'Team member')}</h3><p>${esc(String(m.role||'designer').replaceAll('_',' '))}</p><div class="agency-card-meta"><span>${esc(m.status)}</span><span>${esc(m.invite_delivery_status||'pending')}</span></div></article>`).join(''):'<div class="agency-empty">No staff invited yet.</div>'}</div>`;
    $('#agency-invite-member')?.addEventListener('click',openInviteDialog);
  }

  async function renderBrandingTools(){
    const container=$('#agency-branding-content');
    const {data}=await supabaseClient.from('workspace_settings').select('*').eq('user_id',ownerId).maybeSingle();
    if(!isOwner()){
      container.className='agency-pro-lock';
      container.innerHTML='<strong>Agency Pro branding is active</strong><p>The agency owner manages logo, colors, and client-facing support information.</p>';
      return;
    }
    container.className='';
    container.innerHTML=`<form id="agency-branding-form"><div class="agency-form-grid"><div class="agency-field"><label>Brand name</label><input id="agency-brand-name" value="${esc(data?.brand_name??'')}" placeholder="${esc(workspace?.agency?.business_name||'Agency Workspace')}"></div><div class="agency-field"><label>Logo URL</label><input id="agency-logo-url" value="${esc(data?.logo_url||'')}" placeholder="https://"></div><div class="agency-field"><label>Primary color</label><input id="agency-primary-color" type="color" value="${esc(data?.primary_color||data?.accent_color||'#0b1438')}"></div><div class="agency-field"><label>Secondary color</label><input id="agency-secondary-color" type="color" value="${esc(data?.secondary_color||'#d4a84f')}"></div><div class="agency-field"><label>Support email</label><input id="agency-support-email" type="email" value="${esc(data?.support_email||'')}"></div><div class="agency-field"><label>Support phone</label><input id="agency-support-phone" value="${esc(data?.support_phone||'')}"></div></div><div class="agency-dialog-actions"><button class="btn btn-primary btn-sm" type="submit"><i data-lucide="save" size="15"></i>Save branding</button></div></form>`;
    $('#agency-branding-form')?.addEventListener('submit',saveBranding);
    if(window.lucide)lucide.createIcons();
  }

  function openDialog(id){const dialog=document.getElementById(id);if(dialog&&!dialog.open)dialog.showModal();}
  function closeDialog(id){const dialog=document.getElementById(id);if(dialog?.open)dialog.close();}

  function populateTemplateSource(){
    const select=$('#agency-template-source');
    select.innerHTML=cards.length?cards.map(card=>`<option value="${card.id}">${esc(card.full_name||'Untitled')} · ${esc(card.company_name||'No company')}</option>`).join(''):'<option value="">Create a card first</option>';
  }
  function populateClientSelect(){
    const select=$('#agency-use-template-client');
    select.innerHTML='<option value="">No client yet</option>'+clients.filter(c=>c.status!=='archived').map(client=>`<option value="${client.id}">${esc(client.name)}${client.company_name?` · ${esc(client.company_name)}`:''}</option>`).join('');
  }

  async function addClient(event){
    event.preventDefault();
    const button=$('#agency-client-submit');button.disabled=true;button.textContent='Adding…';
    try{
      const row={agency_owner_id:ownerId,created_by:user.id,name:$('#agency-client-name').value.trim(),company_name:$('#agency-client-company').value.trim()||null,email:$('#agency-client-email').value.trim()||null,phone:$('#agency-client-phone').value.trim()||null,website:$('#agency-client-website').value.trim()||null,address:$('#agency-client-address').value.trim()||null,status:$('#agency-client-status').value||'onboarding'};
      const {error}=await supabaseClient.from('agency_clients').insert(row);if(error)throw error;
      closeDialog('agency-client-dialog');event.target.reset();notify('Client added');await refreshData();
    }catch(error){notify(error.message||'Could not add client');}
    finally{button.disabled=false;button.textContent='Add client';}
  }

  function designConfiguration(card){
    const design={};
    DESIGN_FIELDS.forEach(key=>{if(card[key]!==undefined&&card[key]!==null&&card[key]!=='')design[key]=card[key];});
    return design;
  }

  async function saveTemplate(event){
    event.preventDefault();
    if(templateLimit<100000&&templates.length>=templateLimit){notify(`Agency Starter includes ${templateLimit} saved templates. Upgrade to Pro for unlimited templates.`);return;}
    const sourceId=$('#agency-template-source').value;
    const card=cards.find(row=>row.id===sourceId);
    if(!card){notify('Choose a source card first.');return;}
    const button=$('#agency-template-submit');button.disabled=true;button.textContent='Saving…';
    try{
      const {data:sections,error:sectionError}=await supabaseClient.from('card_sections').select('section_type,content').eq('card_id',card.id);if(sectionError)throw sectionError;
      const richStyles={};
      (sections||[]).forEach(section=>{const style={};RICH_STYLE_FIELDS.forEach(key=>{if(section.content?.[key]!==undefined)style[key]=section.content[key];});if(Object.keys(style).length)richStyles[section.section_type]=style;});
      const configuration={version:1,card:designConfiguration(card),rich_section_styles:richStyles};
      const {error}=await supabaseClient.from('agency_saved_templates').insert({agency_owner_id:ownerId,created_by:user.id,name:$('#agency-template-name').value.trim(),description:$('#agency-template-description').value.trim()||null,category:$('#agency-template-category').value.trim()||null,configuration,is_active:true});if(error)throw error;
      closeDialog('agency-template-dialog');event.target.reset();notify('Agency Template saved');await refreshData();
    }catch(error){notify(error.message||'Could not save Agency Template');}
    finally{button.disabled=false;button.textContent='Save template';}
  }

  function openUseTemplate(id){$('#agency-use-template-id').value=id;populateClientSelect();openDialog('agency-use-template-dialog');}

  async function useTemplate(event){
    event.preventDefault();
    if(cards.length>=cardLimit){notify(`Card capacity reached (${cardLimit}). Add capacity or reduce usage before creating another card.`);return;}
    const template=templates.find(row=>row.id===$('#agency-use-template-id').value);if(!template){notify('Template not found');return;}
    const client=clients.find(row=>row.id===$('#agency-use-template-client').value)||null;
    const button=$('#agency-use-template-submit');button.disabled=true;button.textContent='Creating…';
    try{
      const suffix=crypto.randomUUID().replaceAll('-','').slice(0,7);
      const design={...(template.configuration?.card||{})};
      delete design.slug;delete design.status;delete design.full_name;delete design.company_name;delete design.email;delete design.phone;delete design.sms_phone;delete design.website;delete design.business_address;delete design.profile_image_url;delete design.cover_image_url;delete design.custom_branding_text;delete design.custom_branding_url;
      const fullName=client?.name||'New Client';
      const payload={...design,user_id:ownerId,agency_client_id:client?.id||null,full_name:fullName,company_name:client?.company_name||null,email:client?.email||null,phone:client?.phone||null,website:client?.website||null,business_address:client?.address||null,client_name:client?.name||null,internal_label:client?.company_name||client?.name||template.name,status:'draft',slug:`${slugify(client?.name||template.name)}-${suffix}`};
      const {data:card,error}=await supabaseClient.from('digital_cards').insert(payload).select('id').single();if(error)throw error;
      const styleRows=Object.entries(template.configuration?.rich_section_styles||{}).map(([section_type,style],index)=>({card_id:card.id,agency_owner_id:ownerId,section_type,sort_order:index,is_enabled:false,content:{enabled:false,...style}}));
      if(styleRows.length){const {error:styleError}=await supabaseClient.from('card_sections').insert(styleRows);if(styleError)console.warn('Template section styles could not be copied:',styleError);}
      location.href=liwUrl(`editor.html?id=${encodeURIComponent(card.id)}`);
    }catch(error){notify(error.message||'Could not create card from template');button.disabled=false;button.textContent='Create draft';}
  }

  async function deleteTemplate(id){
    const template=templates.find(row=>row.id===id);if(!template)return;
    if(!confirm(`Delete the Agency Template “${template.name}”? Existing client cards will not be changed.`))return;
    const {error}=await supabaseClient.from('agency_saved_templates').update({is_active:false}).eq('id',id).eq('agency_owner_id',ownerId);if(error)return notify(error.message||'Could not delete template');notify('Agency Template removed');await refreshData();
  }

  function exportClientsCsv(){
    if(!clients.length)return notify('There are no clients to export yet.');
    const headers=['name','company_name','email','phone','website','address','status'];
    const quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
    const csv=[headers.join(','),...clients.map(row=>headers.map(key=>quote(row[key])).join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='liw-agency-clients.csv';a.click();URL.revokeObjectURL(url);
  }

  function parseCsvLine(line){
    const out=[];let value='';let quoted=false;
    for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){out.push(value);value='';}else value+=c;}out.push(value);return out;
  }

  async function importClientsCsv(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    try{
      const text=await file.text();const lines=text.split(/\r?\n/).filter(line=>line.trim());if(lines.length<2)throw new Error('CSV has no client rows.');
      const headers=parseCsvLine(lines[0]).map(value=>value.trim().toLowerCase());
      if(!headers.includes('name'))throw new Error('CSV must include a name column.');
      const allowed=new Set(['name','company_name','email','phone','website','address','status']);
      const rows=lines.slice(1,501).map(line=>{const values=parseCsvLine(line);const row={agency_owner_id:ownerId,created_by:user.id,status:'onboarding'};headers.forEach((key,index)=>{if(allowed.has(key)&&values[index]?.trim())row[key]=values[index].trim();});if(!['lead','onboarding','active','paused','archived'].includes(row.status))row.status='onboarding';return row;}).filter(row=>row.name);
      if(!rows.length)throw new Error('No valid client rows found.');
      const {error}=await supabaseClient.from('agency_clients').insert(rows);if(error)throw error;notify(`${rows.length} client${rows.length===1?'':'s'} imported`);await refreshData();
    }catch(error){notify(error.message||'Could not import clients');}
  }

  function openInviteDialog(){
    if(members.length>=teamLimit){notify('All Agency Pro team seats are in use.');return;}
    let dialog=$('#agency-invite-dialog');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='agency-invite-dialog';dialog.className='agency-dialog';dialog.innerHTML=`<form class="agency-dialog-body" id="agency-invite-form"><div class="agency-dialog-head"><div><h2>Invite staff</h2><p>Choose the simplest role that matches what this person needs to do.</p></div><button class="icon-btn" type="button" data-close-agency-dialog="agency-invite-dialog"><i data-lucide="x"></i></button></div><div class="agency-form-grid"><div class="agency-field full"><label>Email *</label><input id="agency-invite-email" type="email" required></div><div class="agency-field full"><label>Role</label><select id="agency-invite-role"><option value="designer">Designer · edit client cards</option><option value="viewer">Viewer · reporting only</option><option value="agency_admin">Agency Admin · broader workspace access</option></select></div></div><div class="agency-dialog-actions"><button class="btn btn-light" type="button" data-close-agency-dialog="agency-invite-dialog">Cancel</button><button class="btn btn-primary" type="submit">Send invitation</button></div></form>`;document.body.appendChild(dialog);wireDialogClosers();$('#agency-invite-form').addEventListener('submit',inviteMember);if(window.lucide)lucide.createIcons();}
    dialog.showModal();
  }

  async function inviteMember(event){
    event.preventDefault();const submit=event.target.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Sending…';
    try{
      const {data:{session}}=await supabaseClient.auth.getSession();if(!session)throw new Error('Your session expired.');
      const response=await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/invite-agency-member`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':LIW_CONFIG.supabaseKey},body:JSON.stringify({email:$('#agency-invite-email').value.trim(),role:$('#agency-invite-role').value,redirectTo:liwUrl('auth-callback.html')})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Unable to send invitation.');closeDialog('agency-invite-dialog');event.target.reset();notify(data.message||'Invitation sent');await refreshData();
    }catch(error){notify(error.message||'Could not invite staff');}
    finally{submit.disabled=false;submit.textContent='Send invitation';}
  }

  async function saveBranding(event){
    event.preventDefault();const button=event.target.querySelector('button[type="submit"]');button.disabled=true;button.textContent='Saving…';
    try{
      const payload={user_id:ownerId,brand_name:$('#agency-brand-name').value.trim()||null,logo_url:$('#agency-logo-url').value.trim()||null,primary_color:$('#agency-primary-color').value,secondary_color:$('#agency-secondary-color').value,support_email:$('#agency-support-email').value.trim()||null,support_phone:$('#agency-support-phone').value.trim()||null,hide_liw_dashboard_branding:true,updated_at:new Date().toISOString()};
      const {error}=await supabaseClient.from('workspace_settings').upsert(payload,{onConflict:'user_id'});if(error)throw error;notify('Agency Pro branding saved. Refresh to preview it.');
    }catch(error){notify(error.message||'Could not save branding');}
    finally{button.disabled=false;button.innerHTML='<i data-lucide="save" size="15"></i>Save branding';if(window.lucide)lucide.createIcons();}
  }

  function applyPermissionUi(){
    if(canEditWorkspace())return;
    ['#top-add-client','#quick-add-client','#section-add-client','#save-agency-template'].forEach(selector=>{const el=$(selector);if(el)el.hidden=true;});
    document.querySelectorAll('a[href="editor.html"]').forEach(link=>link.hidden=true);
    notify('Viewer access: this Agency workspace is read-only.');
  }

  function wireDialogClosers(){document.querySelectorAll('[data-close-agency-dialog]').forEach(button=>{if(button.dataset.wired)return;button.dataset.wired='true';button.addEventListener('click',()=>closeDialog(button.dataset.closeAgencyDialog));});}
  function wireUi(){
    ['#top-add-client','#quick-add-client','#section-add-client'].forEach(selector=>$(selector)?.addEventListener('click',()=>openDialog('agency-client-dialog')));
    $('#save-agency-template')?.addEventListener('click',()=>{populateTemplateSource();if(!cards.length)return notify('Create a card first, then save its design as an Agency Template.');openDialog('agency-template-dialog');});
    $('#agency-client-form')?.addEventListener('submit',addClient);
    $('#agency-template-form')?.addEventListener('submit',saveTemplate);
    $('#agency-use-template-form')?.addEventListener('submit',useTemplate);
    $('#agency-menu-button')?.addEventListener('click',()=>$('#agency-workspace-shell').classList.toggle('sidebar-open'));
    document.querySelectorAll('.agency-sidebar a[href^="#"]').forEach(link=>link.addEventListener('click',()=>$('#agency-workspace-shell').classList.remove('sidebar-open')));
    wireDialogClosers();
  }

  async function refreshData(){await Promise.all([loadCapacity(),loadData()]);renderStats();renderClients();renderCards();renderTemplates();renderPlanTools();populateTemplateSource();populateClientSelect();if(window.lucide)lucide.createIcons();}

  async function boot(){
    try{
      user=await requireUser();if(!user)return;
      access=await resolveAgencyAccess();
      if(!isAgencyPlan())await inheritAgencyMembership();
      if(!isAgencyPlan()){notify('Agency workspace requires Agency Starter or Agency Pro.');await wait(800);location.href=liwUrl('agency.html');return;}
      await loadWorkspace();
      renderHeader();wireUi();applyPermissionUi();await refreshData();
    }catch(error){console.error('Agency workspace failed:',error);notify(error.message||'Unable to load Agency workspace.');}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();