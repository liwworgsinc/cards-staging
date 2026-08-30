/* LIW Cards — staging-only Agency Pro team management.
   Scoped to #agency-team-content. No body-wide observers and no section ownership. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_TEAM_MANAGEMENT__)return;
  window.__LIW_AGENCY_TEAM_MANAGEMENT__=true;

  const state={user:null,ownerId:null,limit:5,members:[],observer:null,rendering:false,renderQueued:false};
  const $=selector=>document.querySelector(selector);
  const clean=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__liwTeamManagementToast);
    window.__liwTeamManagementToast=setTimeout(()=>toast.classList.remove('show'),3400);
  }

  function previewPlan(){
    try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}
    catch(_){return '';}
  }

  function roleLabel(role){
    return ({agency_admin:'Agency Admin',designer:'Designer',viewer:'Viewer'})[role]||'Designer';
  }

  function roleCopy(role){
    return ({
      agency_admin:'Manage clients and broader workspace operations.',
      designer:'Create and edit client cards.',
      viewer:'Reporting and read-only workspace access.'
    })[role]||'Create and edit client cards.';
  }

  function statusLabel(status){return status==='active'?'Active':'Pending';}
  function deliveryLabel(member){
    const delivery=clean(member.invite_delivery_status).toLowerCase();
    if(member.status==='active')return 'Connected';
    if(delivery==='failed')return 'Email failed';
    if(delivery==='sent')return 'Invite sent';
    return 'Pending delivery';
  }

  function relativeDate(value){
    const time=Date.parse(value||'');
    if(!Number.isFinite(time))return '';
    const diff=Math.max(0,Date.now()-time);
    const mins=Math.floor(diff/60000);
    if(mins<1)return 'just now';
    if(mins<60)return `${mins}m ago`;
    const hours=Math.floor(mins/60);
    if(hours<24)return `${hours}h ago`;
    const days=Math.floor(hours/24);
    if(days<30)return `${days}d ago`;
    return new Date(time).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  }

  async function resolveContext(){
    state.user=await requireUser();
    if(!state.user)return false;
    const {data:workspace,error}=await supabaseClient.rpc('ensure_agency_workspace');
    if(error)throw error;
    state.ownerId=workspace?.owner_id||workspace?.agency?.owner_user_id||state.user.id;
    if(state.ownerId!==state.user.id)return false;

    if(previewPlan()==='white_label'){
      state.limit=5;
      return true;
    }

    const {data,error:limitError}=await supabaseClient.rpc('team_seat_limit_for_user',{p_user_id:state.ownerId});
    if(limitError)console.warn('Agency team seat limit:',limitError);
    state.limit=Math.max(0,Number(data||5));
    return true;
  }

  async function loadMembers(){
    const {data,error}=await supabaseClient.from('workspace_members')
      .select('id,invited_email,role,status,member_user_id,invite_delivery_status,invite_last_error,invite_sent_at,accepted_at,invitation_attempts,updated_at')
      .eq('owner_user_id',state.ownerId)
      .in('status',['invited','active'])
      .order('created_at',{ascending:true});
    if(error)throw error;
    state.members=data||[];
  }

  function memberMarkup(member){
    const role=clean(member.role)||'designer';
    const active=member.status==='active';
    const stamp=active?(member.accepted_at||member.updated_at):(member.invite_sent_at||member.updated_at);
    const error=clean(member.invite_last_error);
    return `<article class="agency-team-member" data-team-member="${esc(member.id)}">
      <div class="agency-team-member-main">
        <span class="agency-team-avatar"><i data-lucide="${active?'user-check':'mail'}" size="18"></i></span>
        <div class="agency-team-identity">
          <strong>${esc(member.invited_email)}</strong>
          <span>${esc(roleLabel(role))} · ${esc(roleCopy(role))}</span>
        </div>
        <span class="agency-team-status ${active?'is-active':'is-pending'}"><i data-lucide="${active?'circle-check':'clock-3'}" size="13"></i>${statusLabel(member.status)}</span>
      </div>
      <div class="agency-team-member-meta">
        <span><i data-lucide="mail-check" size="14"></i>${esc(deliveryLabel(member))}${stamp?` · ${esc(relativeDate(stamp))}`:''}</span>
        ${error?`<span class="is-error" title="${esc(error)}"><i data-lucide="triangle-alert" size="14"></i>${esc(error)}</span>`:''}
      </div>
      <div class="agency-team-member-controls">
        <label class="agency-team-role-control"><span>Role</span><select data-team-role="${esc(member.id)}" data-current-role="${esc(role)}">
          <option value="agency_admin" ${role==='agency_admin'?'selected':''}>Agency Admin</option>
          <option value="designer" ${role==='designer'?'selected':''}>Designer</option>
          <option value="viewer" ${role==='viewer'?'selected':''}>Viewer</option>
        </select></label>
        <div class="agency-team-member-actions">
          <button class="btn btn-light btn-sm" type="button" data-team-resend="${esc(member.id)}"><i data-lucide="${active?'key-round':'send'}" size="14"></i>${active?'Send sign-in link':'Resend invite'}</button>
          <button class="btn btn-sm agency-team-revoke" type="button" data-team-revoke="${esc(member.id)}"><i data-lucide="user-x" size="14"></i>Revoke access</button>
        </div>
      </div>
    </article>`;
  }

  function syncSummary(){
    const content=$('#agency-team-content');
    if(!content||content.classList.contains('agency-pro-lock'))return;
    const active=state.members.filter(member=>member.status==='active').length;
    const pending=state.members.filter(member=>member.status==='invited').length;
    const available=Math.max(0,state.limit-state.members.length);
    $('#agency-team-count')?.replaceChildren(document.createTextNode(String(state.members.length)));
    const topCopy=$('#agency-team-limit-copy');
    if(topCopy)topCopy.textContent=`${state.limit} staff seats`;

    const nestedHead=content.querySelector(':scope > .agency-section-head');
    const headStrong=nestedHead?.querySelector('strong');
    const headCopy=nestedHead?.querySelector('p');
    if(headStrong)headStrong.textContent=`${state.members.length} of ${state.limit} staff seats used`;
    if(headCopy)headCopy.textContent='Change roles, resend access, or revoke a team member instantly.';
    const invite=nestedHead?.querySelector('#agency-invite-member');
    if(invite){invite.disabled=available<=0;invite.title=available<=0?'All team seats are currently in use.':'Invite staff';}

    let overview=content.querySelector(':scope > [data-agency-team-overview]');
    if(!overview){
      overview=document.createElement('div');
      overview.dataset.agencyTeamOverview='true';
      overview.className='agency-team-overview';
      nestedHead?.insertAdjacentElement('afterend',overview);
    }
    overview.innerHTML=`<span><b>${active}</b><small>Active</small></span><span><b>${pending}</b><small>Pending</small></span><span><b>${available}</b><small>Seats available</small></span>`;
  }

  async function render(){
    if(state.rendering){state.renderQueued=true;return;}
    const content=$('#agency-team-content');
    if(!content||content.classList.contains('agency-pro-lock'))return;
    const grid=content.querySelector(':scope > .agency-card-grid');
    if(!grid)return;
    state.rendering=true;
    try{
      await loadMembers();
      syncSummary();
      grid.classList.add('agency-team-grid');
      grid.innerHTML=state.members.length
        ? state.members.map(memberMarkup).join('')
        : '<div class="agency-team-empty"><i data-lucide="users-round" size="22"></i><strong>No team members yet</strong><span>Invite your first staff member when you are ready to share the workspace.</span></div>';
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }catch(error){
      console.warn('Agency team management:',error);
    }finally{
      state.rendering=false;
      if(state.renderQueued){state.renderQueued=false;queueMicrotask(render);}
    }
  }

  function memberById(id){return state.members.find(member=>String(member.id)===String(id));}

  async function updateRole(select){
    const member=memberById(select.dataset.teamRole);
    if(!member)return;
    const next=clean(select.value);
    if(!['agency_admin','designer','viewer'].includes(next)){select.value=member.role;return;}
    if(next===member.role)return;
    select.disabled=true;
    try{
      const {error}=await supabaseClient.from('workspace_members').update({role:next,updated_at:new Date().toISOString()})
        .eq('id',member.id).eq('owner_user_id',state.ownerId);
      if(error)throw error;
      member.role=next;
      select.dataset.currentRole=next;
      notify(`${member.invited_email} is now ${roleLabel(next)}.`);
      await render();
    }catch(error){
      select.value=member.role;
      notify(error.message||'Could not update the team role.');
    }finally{select.disabled=false;}
  }

  async function resendAccess(button){
    const member=memberById(button.dataset.teamResend);
    if(!member)return;
    button.disabled=true;
    const original=button.innerHTML;
    button.textContent='Sending…';
    try{
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session)throw new Error('Your session expired. Sign in again.');
      const response=await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/invite-agency-member`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`,'apikey':LIW_CONFIG.supabaseKey},
        body:JSON.stringify({email:member.invited_email,role:member.role,redirectTo:liwUrl('auth-callback.html')})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Could not send team access.');
      notify(data.message||'Team access email sent.');
      await render();
    }catch(error){notify(error.message||'Could not send team access.');}
    finally{button.disabled=false;button.innerHTML=original;if(window.lucide)try{lucide.createIcons();}catch(_){ }}
  }

  async function revokeAccess(button){
    const member=memberById(button.dataset.teamRevoke);
    if(!member)return;
    const connected=member.status==='active';
    const message=connected
      ? `Revoke ${member.invited_email}'s Agency access? They will lose workspace access immediately. Their LIW account will not be deleted.`
      : `Cancel ${member.invited_email}'s pending invitation? The old invite will no longer be able to connect to this Agency workspace.`;
    if(!confirm(message))return;
    button.disabled=true;
    button.textContent='Revoking…';
    try{
      const {error}=await supabaseClient.from('workspace_members').update({status:'revoked',updated_at:new Date().toISOString()})
        .eq('id',member.id).eq('owner_user_id',state.ownerId);
      if(error)throw error;
      notify(`${member.invited_email} no longer has Agency access.`);
      /* Reload intentionally: the core Agency closure keeps its own member array for seat checks.
         A reload synchronizes that authoritative state without coupling this module to it. */
      setTimeout(()=>location.reload(),650);
    }catch(error){
      notify(error.message||'Could not revoke team access.');
      button.disabled=false;
      button.innerHTML='<i data-lucide="user-x" size="14"></i>Revoke access';
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
  }

  function wireEvents(content){
    if(content.dataset.teamManagementWired==='true')return;
    content.dataset.teamManagementWired='true';
    content.addEventListener('change',event=>{
      const select=event.target.closest?.('[data-team-role]');
      if(select)updateRole(select);
    });
    content.addEventListener('click',event=>{
      const resend=event.target.closest?.('[data-team-resend]');
      if(resend){resendAccess(resend);return;}
      const revoke=event.target.closest?.('[data-team-revoke]');
      if(revoke)revokeAccess(revoke);
    });
  }

  function observeCoreRenders(content){
    if(state.observer)return;
    state.observer=new MutationObserver(mutations=>{
      const replaced=mutations.some(mutation=>Array.from(mutation.addedNodes||[]).some(node=>
        node instanceof Element && (node.matches('.agency-card-grid')||node.querySelector?.('.agency-card-grid'))
      ));
      if(replaced)render();
    });
    /* Direct children only. Our controls live below the grid and cannot retrigger this observer. */
    state.observer.observe(content,{childList:true,subtree:false});
  }

  async function boot(){
    try{
      if(!(await resolveContext()))return;
      const content=$('#agency-team-content');
      if(!content)return;
      wireEvents(content);
      observeCoreRenders(content);
      for(let attempt=0;attempt<40;attempt++){
        if(!content.classList.contains('agency-pro-lock')&&content.querySelector(':scope > .agency-card-grid')){await render();return;}
        await new Promise(resolve=>setTimeout(resolve,125));
      }
    }catch(error){console.warn('Agency team management boot:',error);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();