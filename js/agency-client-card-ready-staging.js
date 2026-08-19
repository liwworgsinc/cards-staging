/* LIW Cards — cards-staging only: card-ready Agency client workflow. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_CARD_READY_CLIENT__) return;
  window.__LIW_AGENCY_CARD_READY_CLIENT__=true;

  const DIALOG_ID='agency-client-dialog';
  const FORM_ID='agency-client-form';
  const TEMPLATE_SELECT_ID='agency-client-template';
  const EXPERIENCE_ID='agency-client-experience';
  const CREATE_CARD_ID='agency-client-create-card';
  const STYLE_FIELDS=['appearance','layout','accent','heading_align','display_title','display_kicker'];

  let currentUser=null;
  let ownerId=null;
  let templates=[];
  let flowAllowed=false;
  let readyPromise=null;
  let needsRefresh=false;

  const $=selector=>document.querySelector(selector);
  const clean=value=>String(value??'').trim();

  function esc(value=''){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function slugify(value='client'){
    return String(value||'client').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)||'client';
  }

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencyCardReadyToast);
    window.__agencyCardReadyToast=setTimeout(()=>toast.classList.remove('show'),3400);
  }

  async function resolveOwner(){
    if(currentUser&&ownerId)return ownerId;
    const auth=await supabaseClient.auth.getUser();
    currentUser=auth?.data?.user||null;
    if(!currentUser)throw new Error('Sign in again to add a client.');
    const {data:member}=await supabaseClient.from('workspace_members').select('owner_user_id,status').eq('member_user_id',currentUser.id).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(member?.owner_user_id){ownerId=member.owner_user_id;return ownerId;}
    const {data:workspace,error}=await supabaseClient.rpc('ensure_agency_workspace');
    if(error)throw error;
    ownerId=workspace?.owner_id||workspace?.agency?.owner_user_id||currentUser.id;
    return ownerId;
  }

  async function resolveFlowAccess(){
    try{
      const base=await getLiwAccessContext(currentUser,{refresh:false});
      if(base?.isAdmin&&typeof isLiwStagingPlanQaHost==='function'&&isLiwStagingPlanQaHost()){
        let preview='';
        try{preview=String(localStorage.getItem(LIW_ADMIN_PLAN_PREVIEW_KEY)||'').toLowerCase();}catch(_){}
        if(['agency','white_label'].includes(preview)){
          const {data:plan}=await supabaseClient.from('plan_definitions').select('entitlements').eq('plan_key',preview).maybeSingle();
          flowAllowed=Boolean(plan?.entitlements?.flow_experience);return;
        }
      }
      flowAllowed=Boolean(base?.has?.('flow_experience')||(base?.isAdmin&&!base?.isPlanPreview));
    }catch(_){flowAllowed=false;}
  }

  async function loadTemplates(){
    if(!ownerId)return;
    const {data,error}=await supabaseClient.from('agency_saved_templates').select('id,name,category,configuration,is_active').eq('agency_owner_id',ownerId).eq('is_active',true).order('updated_at',{ascending:false});
    if(error)throw error;
    templates=data||[];renderTemplateOptions();
  }

  function renderTemplateOptions(){
    const select=document.getElementById(TEMPLATE_SELECT_ID);if(!select)return;
    const current=select.value;
    select.innerHTML='<option value="">Start with default LIW card</option>'+templates.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}${t.category?` · ${esc(t.category)}`:''}</option>`).join('');
    if(Array.from(select.options).some(option=>option.value===current))select.value=current;
  }

  function formMarkup(){
    return `
      <div class="agency-dialog-head agency-card-ready-head"><div><span class="agency-card-ready-kicker">CARD-READY CLIENT</span><h2>Add client</h2><p>Add only what helps build the card. Finish photos, socials, and advanced tools in the editor.</p></div><button class="icon-btn" type="button" data-card-ready-close aria-label="Close"><i data-lucide="x"></i></button></div>
      <div class="agency-card-ready-section"><div class="agency-card-ready-section-head"><span class="agency-card-ready-step">1</span><div><strong>Who is this card for?</strong><small>Name is the only required field.</small></div></div><div class="agency-form-grid agency-card-ready-grid"><div class="agency-field full"><label for="agency-client-name">Full name *</label><input id="agency-client-name" required maxlength="160" autocomplete="name" placeholder="Jane Smith"></div><div class="agency-field"><label for="agency-client-job-title">Job title or specialty</label><input id="agency-client-job-title" maxlength="180" placeholder="Licensed Real Estate Agent"></div><div class="agency-field"><label for="agency-client-company">Business or company</label><input id="agency-client-company" maxlength="180" autocomplete="organization" placeholder="Smith Realty"></div></div></div>
      <div class="agency-card-ready-section"><div class="agency-card-ready-section-head"><span class="agency-card-ready-step">2</span><div><strong>How should customers reach them?</strong><small>Add the contact methods you already have.</small></div></div><div class="agency-form-grid agency-card-ready-grid"><div class="agency-field"><label for="agency-client-email">Email</label><input id="agency-client-email" type="email" maxlength="220" autocomplete="email" placeholder="jane@company.com"></div><div class="agency-field"><label for="agency-client-phone">Phone</label><input id="agency-client-phone" inputmode="tel" maxlength="80" autocomplete="tel" placeholder="(555) 555-5555"></div><div class="agency-field full"><label for="agency-client-website">Website</label><input id="agency-client-website" inputmode="url" maxlength="500" placeholder="https://"></div></div></div>
      <div class="agency-card-ready-section agency-card-ready-build"><label class="agency-card-ready-toggle" for="${CREATE_CARD_ID}"><span class="agency-card-ready-toggle-icon"><i data-lucide="badge-plus" size="18"></i></span><span><strong>Create a draft card now</strong><small>Recommended — the contact info above will populate the card automatically.</small></span><input id="${CREATE_CARD_ID}" type="checkbox" checked><span class="agency-switch" aria-hidden="true"></span></label><div class="agency-card-ready-card-options" data-card-ready-card-options><div class="agency-form-grid agency-card-ready-grid"><div class="agency-field full"><label for="${TEMPLATE_SELECT_ID}">Start from a design</label><select id="${TEMPLATE_SELECT_ID}"><option value="">Start with default LIW card</option></select><small class="agency-field-help">Agency Templates copy the design, not another client's personal details.</small></div><div class="agency-field full"><label>Card experience</label><div class="agency-experience-picker" id="${EXPERIENCE_ID}"><button type="button" class="active" data-agency-experience="classic"><strong>Standard</strong><span>Simple vertical card</span></button><button type="button" data-agency-experience="flow"><strong>Flow</strong><span>App-like swipe experience</span></button></div><input type="hidden" id="agency-client-experience-value" value="classic"></div></div></div></div>
      <details class="agency-card-ready-more"><summary><span><i data-lucide="sliders-horizontal" size="16"></i> More client details</span><small>Optional tracking</small></summary><div class="agency-form-grid agency-card-ready-grid agency-card-ready-more-body"><div class="agency-field full"><label for="agency-client-address">Business address</label><input id="agency-client-address" maxlength="500" autocomplete="street-address" placeholder="Optional location for the card"></div><div class="agency-field full"><label for="agency-client-status">Client status</label><select id="agency-client-status"><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="lead">Lead</option><option value="paused">Paused</option></select></div></div></details>
      <div class="agency-card-ready-note"><i data-lucide="image" size="16"></i><span><strong>Profile photo comes next.</strong> The editor opens with this client's details filled so you can crop the photo, add socials, and publish.</span></div>
      <div class="agency-dialog-actions agency-card-ready-actions"><button class="btn btn-light" type="button" data-card-ready-close>Cancel</button><button class="btn btn-light agency-add-another" type="submit" data-after-save="another"><i data-lucide="users-round" size="16"></i>Create & add another</button><button class="btn btn-primary" id="agency-client-submit" type="submit" data-after-save="edit"><i data-lucide="arrow-right" size="16"></i>Create & edit card</button></div>`;
  }

  function installForm(){
    const dialog=document.getElementById(DIALOG_ID),form=document.getElementById(FORM_ID);if(!dialog||!form||form.dataset.cardReadyInstalled==='true')return false;
    form.dataset.cardReadyInstalled='true';form.classList.add('agency-card-ready-form');form.innerHTML=formMarkup();renderTemplateOptions();
    form.querySelectorAll('[data-card-ready-close]').forEach(button=>button.addEventListener('click',()=>{if(needsRefresh){location.reload();return;}dialog.close();}));
    form.querySelectorAll('[data-agency-experience]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.agencyExperience==='flow'&&!flowAllowed){notify('Flow is not included with this Agency plan.');return;}form.querySelectorAll('[data-agency-experience]').forEach(item=>item.classList.toggle('active',item===button));$('#agency-client-experience-value').value=button.dataset.agencyExperience||'classic';}));
    const flowButton=form.querySelector('[data-agency-experience="flow"]');if(flowButton){flowButton.classList.toggle('locked',!flowAllowed);flowButton.disabled=!flowAllowed;flowButton.title=flowAllowed?'Use Flow experience':'Flow is not included with this Agency plan';}
    document.getElementById(CREATE_CARD_ID)?.addEventListener('change',syncCreateCardUi);form.addEventListener('submit',submitCardReadyClient,true);syncCreateCardUi();if(window.lucide)try{lucide.createIcons();}catch(_){}return true;
  }

  function syncCreateCardUi(){
    const enabled=Boolean(document.getElementById(CREATE_CARD_ID)?.checked),options=document.querySelector('[data-card-ready-card-options]');if(options)options.hidden=!enabled;
    document.querySelectorAll('.agency-card-ready-actions [type="submit"]').forEach(button=>{const edit=button.dataset.afterSave==='edit';button.innerHTML=edit?(enabled?'<i data-lucide="arrow-right" size="16"></i>Create & edit card':'<i data-lucide="user-round-plus" size="16"></i>Add client'):(enabled?'<i data-lucide="users-round" size="16"></i>Create & add another':'<i data-lucide="users-round" size="16"></i>Add & add another');});if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  async function capacityCheck(){
    const [limitResult,countResult]=await Promise.all([supabaseClient.rpc('card_limit_for_user',{p_user_id:ownerId}),supabaseClient.from('digital_cards').select('id',{count:'exact',head:true}).eq('user_id',ownerId)]);
    if(limitResult.error)throw limitResult.error;if(countResult.error)throw countResult.error;const limit=Number(limitResult.data||0),count=Number(countResult.count||0);if(limit>0&&count>=limit)throw new Error(`Card capacity reached (${limit}). Add capacity before creating another client card.`);
  }

  function selectedTemplate(){const id=clean(document.getElementById(TEMPLATE_SELECT_ID)?.value);return templates.find(row=>String(row.id)===id)||null;}
  function designFromTemplate(template){const design={...(template?.configuration?.card||{})};['slug','status','full_name','company_name','job_title','headline','biography','email','phone','sms_phone','website','business_address','profile_image_url','cover_image_url','custom_branding_text','custom_branding_url','agency_client_id','client_name','internal_label'].forEach(key=>delete design[key]);return design;}

  async function createDraftCard(client,identity,template){
    const suffix=crypto.randomUUID().replaceAll('-','').slice(0,7),design=designFromTemplate(template),experience=clean($('#agency-client-experience-value')?.value)||'classic';
    const payload={...design,user_id:ownerId,agency_client_id:client.id,full_name:identity.name,company_name:identity.company||null,job_title:identity.jobTitle||null,email:identity.email||null,phone:identity.phone||null,sms_phone:identity.phone||null,website:identity.website||null,business_address:identity.address||null,client_name:identity.name,internal_label:identity.company||identity.name,card_experience:experience,status:'draft',slug:`${slugify(identity.name)}-${suffix}`};
    const {data:card,error}=await supabaseClient.from('digital_cards').insert(payload).select('id').single();if(error)throw error;
    if(template){const rows=Object.entries(template.configuration?.rich_section_styles||{}).map(([section_type,style],index)=>{const safeStyle={};STYLE_FIELDS.forEach(field=>{if(style&&Object.prototype.hasOwnProperty.call(style,field))safeStyle[field]=style[field];});return{card_id:card.id,agency_owner_id:ownerId,section_type,sort_order:index,is_enabled:false,content:{enabled:false,...safeStyle}};});if(rows.length){const {error:styleError}=await supabaseClient.from('card_sections').insert(rows);if(styleError)console.warn('Agency template section styles could not be copied:',styleError);}}
    return card;
  }

  function setBusy(busy){document.querySelectorAll('.agency-card-ready-actions button').forEach(button=>button.disabled=busy);const close=$('[data-card-ready-close]');if(close)close.disabled=busy;}
  function values(){return{name:clean($('#agency-client-name')?.value),jobTitle:clean($('#agency-client-job-title')?.value),company:clean($('#agency-client-company')?.value),email:clean($('#agency-client-email')?.value),phone:clean($('#agency-client-phone')?.value),website:clean($('#agency-client-website')?.value),address:clean($('#agency-client-address')?.value),status:clean($('#agency-client-status')?.value)||'onboarding'};}
  function resetForAnother(){const form=document.getElementById(FORM_ID);form?.reset();const toggle=document.getElementById(CREATE_CARD_ID);if(toggle)toggle.checked=true;const experience=$('#agency-client-experience-value');if(experience)experience.value='classic';form?.querySelectorAll('[data-agency-experience]').forEach(button=>button.classList.toggle('active',button.dataset.agencyExperience==='classic'));syncCreateCardUi();renderTemplateOptions();$('#agency-client-name')?.focus();}

  async function submitCardReadyClient(event){
    if(event.currentTarget?.id!==FORM_ID)return;event.preventDefault();event.stopImmediatePropagation();const form=document.getElementById(FORM_ID);if(!form?.reportValidity())return;
    const after=event.submitter?.dataset?.afterSave||'edit',identity=values(),createCard=Boolean(document.getElementById(CREATE_CARD_ID)?.checked);setBusy(true);
    try{
      await resolveOwner();if(createCard)await capacityCheck();
      const clientRow={agency_owner_id:ownerId,created_by:currentUser.id,name:identity.name,company_name:identity.company||null,email:identity.email||null,phone:identity.phone||null,website:identity.website||null,address:identity.address||null,status:identity.status};
      const {data:client,error:clientError}=await supabaseClient.from('agency_clients').insert(clientRow).select('*').single();if(clientError)throw clientError;
      let card=null;
      if(createCard){
        try{card=await createDraftCard(client,identity,selectedTemplate());}
        catch(cardError){needsRefresh=true;console.error('Agency draft card creation failed after client save:',cardError);notify('Client saved, but the draft card could not be created. Refresh Clients and try the card again.');setBusy(false);return;}
      }
      needsRefresh=true;
      if(after==='another'){notify(createCard?'Client + draft card created. Add the next person.':'Client added. Add the next person.');resetForAnother();setBusy(false);return;}
      if(card?.id){location.href=liwUrl(`editor.html?id=${encodeURIComponent(card.id)}`);return;}
      notify('Client added.');location.reload();
    }catch(error){console.error('Agency card-ready client:',error);notify(error?.message||'Could not create this client.');setBusy(false);}
  }

  async function prepare(){if(readyPromise)return readyPromise;readyPromise=(async()=>{await resolveOwner();await resolveFlowAccess();await loadTemplates();installForm();})().catch(error=>{console.error('Agency card-ready workflow could not initialize:',error);installForm();});return readyPromise;}
  function boot(){prepare();document.addEventListener('click',event=>{const add=event.target instanceof Element?event.target.closest('#top-add-client,#quick-add-client,#section-add-client'):null;if(add)setTimeout(()=>{prepare();installForm();renderTemplateOptions();},0);},true);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
