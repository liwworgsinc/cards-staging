/* LIW Cards — staging-only Agency client approval workflow. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_APPROVAL_WORKFLOW__)return;
  window.__LIW_AGENCY_APPROVAL_WORKFLOW__=true;

  const state={user:null,ownerId:null,planKey:'agency',limit:50,used:0,cards:new Map(),clients:new Map(),approvals:new Map(),observer:null,busy:false};
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=value=>String(value??'').trim();
  const monthStart=()=>{const now=new Date();return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();};

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;toast.classList.add('show');
    clearTimeout(window.__liwApprovalToast);window.__liwApprovalToast=setTimeout(()=>toast.classList.remove('show'),3600);
  }
  function previewPlan(){try{const v=String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();return ['agency','white_label'].includes(v)?v:'';}catch(_){return '';}}
  function labelFor(status){return ({sent:'Awaiting approval',approved:'Approved',changes_requested:'Changes requested',expired:'Expired',draft:'Not sent'})[status]||'Not sent';}
  function iconFor(status){return ({sent:'clock-3',approved:'badge-check',changes_requested:'message-square-warning',expired:'clock-alert',draft:'send'})[status]||'send';}
  function buttonFor(status){return ({sent:'Resend approval',approved:'Send again',changes_requested:'Send revised',expired:'Send again',draft:'Send for approval'})[status]||'Send for approval';}

  async function resolveContext(){
    state.user=await requireUser();if(!state.user)throw new Error('Sign in again.');
    const {data:workspace,error}=await supabaseClient.rpc('ensure_agency_workspace');if(error)throw error;
    state.ownerId=workspace?.owner_id||workspace?.agency?.owner_user_id||state.user.id;
    let planKey='';
    try{const access=await getLiwAccessContext(state.user,{refresh:false});planKey=String(access?.planKey||'');if(access?.isAdmin&&previewPlan())planKey=previewPlan();}catch(_){ }
    if(!['agency','white_label'].includes(planKey)){
      const {data:agency}=await supabaseClient.from('agency_accounts').select('plan_key').eq('owner_user_id',state.ownerId).maybeSingle();
      planKey=agency?.plan_key==='white_label_beta'?'white_label':String(agency?.plan_key||'agency');
    }
    state.planKey=planKey==='white_label'?'white_label':'agency';
    const {data:plan}=await supabaseClient.from('plan_definitions').select('entitlements').eq('plan_key',state.planKey).maybeSingle();
    state.limit=Number(plan?.entitlements?.approval_email_limit||(state.planKey==='white_label'?250:50));
  }

  async function loadData(){
    const [cardsResult,clientsResult,approvalsResult,usageResult]=await Promise.all([
      supabaseClient.from('digital_cards').select('id,agency_client_id,full_name,company_name,email,slug,status').eq('user_id',state.ownerId),
      supabaseClient.from('agency_clients').select('id,name,company_name,email').eq('agency_owner_id',state.ownerId),
      supabaseClient.from('agency_approvals').select('id,card_id,status,recipient_email,client_feedback,requested_at,responded_at,email_sent_at,delivery_status,created_at').eq('agency_owner_id',state.ownerId).order('created_at',{ascending:false}),
      supabaseClient.from('agency_approval_email_log').select('id',{count:'exact',head:true}).eq('agency_owner_id',state.ownerId).eq('status','sent').gte('created_at',monthStart())
    ]);
    if(cardsResult.error)throw cardsResult.error;if(clientsResult.error)throw clientsResult.error;if(approvalsResult.error)throw approvalsResult.error;if(usageResult.error)throw usageResult.error;
    state.cards=new Map((cardsResult.data||[]).map(row=>[String(row.id),row]));
    state.clients=new Map((clientsResult.data||[]).map(row=>[String(row.id),row]));
    state.approvals=new Map();
    (approvalsResult.data||[]).forEach(row=>{const key=String(row.card_id);if(!state.approvals.has(key))state.approvals.set(key,row);});
    state.used=Number(usageResult.count||0);
  }

  function ensureApprovalSummary(){
    const section=$('#cards');if(!section)return;
    let panel=section.querySelector('[data-agency-approval-summary]');
    if(!panel){
      panel=document.createElement('div');panel.dataset.agencyApprovalSummary='true';panel.className='agency-approval-summary';
      const anchor=section.querySelector('.agency-cards-summary')||section.querySelector('.agency-section-head');
      anchor?.insertAdjacentElement('afterend',panel);
    }
    const rows=Array.from(state.approvals.values());
    const pending=rows.filter(r=>r.status==='sent').length,approved=rows.filter(r=>r.status==='approved').length,changes=rows.filter(r=>r.status==='changes_requested').length;
    const remaining=Math.max(0,state.limit-state.used),pct=state.limit?Math.min(100,Math.round(state.used/state.limit*100)):0;
    panel.innerHTML=`<div class="agency-approval-summary-copy"><span class="agency-approval-summary-icon"><i data-lucide="mail-check" size="17"></i></span><div><strong>Client approvals</strong><small>Send private card reviews and track client decisions.</small></div></div><div class="agency-approval-summary-stats"><span><b>${pending}</b><small>Waiting</small></span><span><b>${approved}</b><small>Approved</small></span><span><b>${changes}</b><small>Changes</small></span></div><div class="agency-approval-quota"><div><span>Approval emails this month</span><strong>${state.used} / ${state.limit}</strong></div><div class="agency-approval-quota-bar"><span style="width:${pct}%"></span></div><small>${remaining} remaining · ${state.planKey==='white_label'?'Agency Pro':'Agency Starter'}</small></div>`;
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function cardIdFromTile(tile){
    const edit=tile.querySelector('a[href*="editor.html?id="]');if(!edit)return '';
    try{return new URL(edit.getAttribute('href'),location.href).searchParams.get('id')||'';}catch(_){return '';}
  }

  function enhanceCards(){
    const grid=$('#agency-card-grid');if(!grid)return;
    grid.querySelectorAll('.agency-client-card').forEach(tile=>{
      const cardId=cardIdFromTile(tile);if(!cardId||!state.cards.has(cardId))return;
      const approval=state.approvals.get(cardId);const status=String(approval?.status||'draft');
      let row=tile.querySelector('[data-card-approval-state]');
      if(!row){row=document.createElement('div');row.dataset.cardApprovalState='true';row.className='agency-card-approval-state';const actions=tile.querySelector('.agency-template-actions');actions?.insertAdjacentElement('beforebegin',row);}
      const feedback=status==='changes_requested'&&approval?.client_feedback?`<small title="${esc(approval.client_feedback)}">${esc(approval.client_feedback)}</small>`:'';
      row.className=`agency-card-approval-state status-${status}`;
      row.innerHTML=`<span><i data-lucide="${iconFor(status)}" size="14"></i>${labelFor(status)}</span>${feedback}`;

      const actions=tile.querySelector('.agency-template-actions');if(!actions)return;
      let button=actions.querySelector('[data-send-card-approval]');
      if(!button){button=document.createElement('button');button.type='button';button.className='btn btn-approval btn-sm';button.dataset.sendCardApproval=cardId;actions.appendChild(button);button.addEventListener('click',()=>openSendDialog(cardId));}
      button.dataset.sendCardApproval=cardId;button.innerHTML=`<i data-lucide="mail-check" size="14"></i>${buttonFor(status)}`;
      button.disabled=state.used>=state.limit;button.title=button.disabled?`Monthly approval email limit reached (${state.limit}).`:buttonFor(status);
    });
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function ensureDialog(){
    let dialog=$('#agency-approval-send-dialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='agency-approval-send-dialog';dialog.className='agency-dialog agency-approval-dialog';
    dialog.innerHTML=`<form class="agency-dialog-body" id="agency-approval-send-form"><div class="agency-dialog-head"><div><span class="agency-approval-kicker">CLIENT APPROVAL</span><h2>Send card for approval</h2><p>Send a private review link. The client can approve or request changes without an LIW account.</p></div><button class="icon-btn" type="button" data-close-approval-dialog aria-label="Close"><i data-lucide="x"></i></button></div><div class="agency-approval-card-line"><span><i data-lucide="contact-round" size="18"></i></span><div><strong id="agency-approval-card-name">Client card</strong><small id="agency-approval-card-company"></small></div><span class="agency-status" id="agency-approval-current-status">Not sent</span></div><div class="agency-field"><label for="agency-approval-email">Send review to *</label><input id="agency-approval-email" type="email" required placeholder="client@company.com"><small class="agency-field-help">This address receives the private approval link.</small></div><div class="agency-field"><label for="agency-approval-message">Message to client <span>Optional</span></label><textarea id="agency-approval-message" maxlength="1600" rows="4" placeholder="Hi — your card is ready. Please review the details and let us know if anything needs changing."></textarea></div><div class="agency-approval-dialog-quota"><div><span><i data-lucide="gauge" size="15"></i>Monthly email allowance</span><strong id="agency-approval-dialog-quota-text">0 / 50</strong></div><small id="agency-approval-dialog-quota-copy"></small></div><input type="hidden" id="agency-approval-card-id"><div class="agency-dialog-actions"><button class="btn btn-light" type="button" data-close-approval-dialog>Cancel</button><button class="btn btn-primary" id="agency-approval-send-button" type="submit"><i data-lucide="send" size="16"></i>Send for approval</button></div></form>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-approval-dialog]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('form')?.addEventListener('submit',sendApproval);
    if(window.lucide)try{lucide.createIcons();}catch(_){}
    return dialog;
  }

  function openSendDialog(cardId){
    const card=state.cards.get(cardId);if(!card)return;
    const client=card.agency_client_id?state.clients.get(String(card.agency_client_id)):null;
    const approval=state.approvals.get(cardId);const dialog=ensureDialog();
    $('#agency-approval-card-id').value=cardId;
    $('#agency-approval-card-name').textContent=card.full_name||client?.name||'Client card';
    $('#agency-approval-card-company').textContent=card.company_name||client?.company_name||'';
    $('#agency-approval-current-status').textContent=labelFor(String(approval?.status||'draft'));
    $('#agency-approval-email').value=approval?.recipient_email||client?.email||card.email||'';
    $('#agency-approval-message').value='';
    $('#agency-approval-dialog-quota-text').textContent=`${state.used} / ${state.limit}`;
    $('#agency-approval-dialog-quota-copy').textContent=`${Math.max(0,state.limit-state.used)} approval emails remaining this month.`;
    $('#agency-approval-send-button').disabled=state.used>=state.limit;
    if(!dialog.open)dialog.showModal();setTimeout(()=>$('#agency-approval-email')?.focus(),80);
  }

  async function sendApproval(event){
    event.preventDefault();if(state.busy)return;
    const cardId=clean($('#agency-approval-card-id')?.value),recipientEmail=clean($('#agency-approval-email')?.value),message=clean($('#agency-approval-message')?.value);
    if(!cardId||!recipientEmail)return;
    state.busy=true;const button=$('#agency-approval-send-button'),original=button.innerHTML;button.disabled=true;button.innerHTML='<span class="spinner-mini"></span> Sending…';
    try{
      const {data,error}=await supabaseClient.functions.invoke('send-agency-approval',{body:{cardId,recipientEmail,message,environment:'staging'}});
      if(error)throw new Error(data?.error||error.message||'Approval email could not be sent.');
      if(data?.error)throw new Error(data.error);
      $('#agency-approval-send-dialog')?.close();notify('Approval email sent.');
      await refresh();
    }catch(error){console.error('Agency approval send:',error);notify(error?.message||'Approval email could not be sent.');}
    finally{state.busy=false;button.disabled=state.used>=state.limit;button.innerHTML=original;if(window.lucide)try{lucide.createIcons();}catch(_){};}
  }

  async function refresh(){try{await loadData();ensureApprovalSummary();enhanceCards();}catch(error){console.warn('Agency approval refresh:',error);}}
  function observe(){
    const section=$('#cards');if(!section||state.observer)return;
    let frame=0;state.observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(enhanceCards);});state.observer.observe(section,{childList:true,subtree:true});
  }
  async function boot(){
    try{await resolveContext();await loadData();ensureDialog();ensureApprovalSummary();enhanceCards();observe();setInterval(()=>{if(!document.hidden)refresh();},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});}
    catch(error){console.warn('Agency approval workflow:',error);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
