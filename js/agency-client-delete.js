(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let ownerId='';
  let clients=[];
  let cards=[];

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencyClientDeleteToast);
    window.__agencyClientDeleteToast=setTimeout(()=>toast.classList.remove('show'),3200);
  }

  function ensureUi(){
    const actions=$('#clients .agency-section-actions');
    if(actions&&!$('#agency-manage-clients')){
      const button=document.createElement('button');
      button.id='agency-manage-clients';
      button.type='button';
      button.className='btn btn-light btn-sm';
      button.innerHTML='<i data-lucide="settings-2" size="15"></i>Manage clients';
      button.addEventListener('click',openDialog);
      actions.appendChild(button);
    }
    if(!$('#agency-manage-clients-dialog')){
      const dialog=document.createElement('dialog');
      dialog.id='agency-manage-clients-dialog';
      dialog.className='agency-dialog agency-manage-dialog';
      dialog.innerHTML='<div class="agency-dialog-body"><div class="agency-dialog-head"><div><h2>Manage clients</h2><p>Delete a client record without deleting their card work.</p></div><button class="icon-btn" type="button" id="agency-manage-close" aria-label="Close"><i data-lucide="x"></i></button></div><div class="agency-manage-note"><strong>Safe delete</strong><span>Linked cards are kept in your workspace and become unassigned.</span></div><div id="agency-manage-client-list" class="agency-manage-client-list"><div class="agency-empty">Loading clients…</div></div></div>';
      document.body.appendChild(dialog);
      $('#agency-manage-close').addEventListener('click',()=>dialog.close());
    }
    if(window.lucide)lucide.createIcons();
  }

  async function loadData(){
    const {data:{user}}=await supabaseClient.auth.getUser();
    if(!user)throw new Error('Please sign in again.');
    const {data:workspace,error:workspaceError}=await supabaseClient.rpc('ensure_agency_workspace');
    if(workspaceError)throw workspaceError;
    ownerId=workspace?.owner_id||workspace?.agency?.owner_user_id||user.id;
    if(user.id!==ownerId)throw new Error('Only the Agency owner can delete clients.');
    const [clientResult,cardResult]=await Promise.all([
      supabaseClient.from('agency_clients').select('id,name,company_name,email,status').eq('agency_owner_id',ownerId).order('updated_at',{ascending:false}),
      supabaseClient.from('digital_cards').select('id,agency_client_id').eq('user_id',ownerId)
    ]);
    if(clientResult.error)throw clientResult.error;
    if(cardResult.error)throw cardResult.error;
    clients=clientResult.data||[];
    cards=cardResult.data||[];
  }

  function countCards(clientId){return cards.filter(card=>card.agency_client_id===clientId).length;}

  function render(){
    const list=$('#agency-manage-client-list');
    if(!clients.length){list.innerHTML='<div class="agency-empty">No clients to manage.</div>';return;}
    list.innerHTML=clients.map(client=>{const count=countCards(client.id);return `<div class="agency-manage-client-row"><div><strong>${esc(client.name||'Unnamed client')}</strong><span>${esc(client.company_name||client.email||'No company')}</span><small>${count} linked card${count===1?'':'s'} · ${esc(client.status||'onboarding')}</small></div><button class="btn btn-sm agency-danger-btn" type="button" data-delete-client="${esc(client.id)}"><i data-lucide="trash-2" size="14"></i>Delete</button></div>`;}).join('');
    list.querySelectorAll('[data-delete-client]').forEach(button=>button.addEventListener('click',()=>removeClient(button.dataset.deleteClient,button)));
    if(window.lucide)lucide.createIcons();
  }

  async function openDialog(){
    ensureUi();
    const dialog=$('#agency-manage-clients-dialog');
    const list=$('#agency-manage-client-list');
    list.innerHTML='<div class="agency-empty">Loading clients…</div>';
    dialog.showModal();
    try{await loadData();render();}
    catch(error){list.innerHTML=`<div class="agency-empty">${esc(error.message||'Unable to manage clients.')}</div>`;}
  }

  async function removeClient(clientId,button){
    const client=clients.find(row=>String(row.id)===String(clientId));
    if(!client)return;
    const count=countCards(client.id);
    const warning=count?`Delete ${client.name}? ${count} linked card${count===1?'':'s'} will be kept and become unassigned.`:`Delete ${client.name}? This permanently removes the client record.`;
    if(!confirm(warning))return;
    button.disabled=true;
    button.textContent='Deleting…';
    try{
      if(count){
        const {error}=await supabaseClient.from('digital_cards').update({agency_client_id:null}).eq('user_id',ownerId).eq('agency_client_id',client.id);
        if(error)throw error;
      }
      const {error}=await supabaseClient.from('agency_clients').delete().eq('id',client.id).eq('agency_owner_id',ownerId);
      if(error)throw error;
      notify(`${client.name} deleted. Linked cards were kept.`);
      $('#agency-manage-clients-dialog')?.close();
      setTimeout(()=>location.reload(),450);
    }catch(error){
      notify(error.message||'Could not delete client.');
      button.disabled=false;
      button.textContent='Delete';
    }
  }

  function install(){ensureUi();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
