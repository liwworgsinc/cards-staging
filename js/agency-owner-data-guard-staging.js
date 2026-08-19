/* LIW Cards — cards-staging only: keep bulk client data movement owner-only. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_OWNER_DATA_GUARD__)return;
  window.__LIW_AGENCY_OWNER_DATA_GUARD__=true;

  let resolved=false;
  let ownerOnly=true;
  let role='owner';
  let observer=null;

  const $=selector=>document.querySelector(selector);

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencyOwnerDataToast);
    window.__agencyOwnerDataToast=setTimeout(()=>toast.classList.remove('show'),3200);
  }

  function removeBulkControls(){
    if(!resolved||ownerOnly)return;
    document.querySelectorAll('[data-pro-client-export]').forEach(el=>el.remove());
    document.querySelectorAll('[data-pro-client-import]').forEach(input=>{
      const label=input.closest('label');
      if(label)label.remove();
      else input.remove();
    });

    const settingsCards=document.querySelectorAll('#settings .agency-results-card');
    settingsCards.forEach(card=>{
      const strong=card.querySelector('strong');
      if(!strong||!/imports?, exports? & automation/i.test(strong.textContent||''))return;
      strong.textContent='Owner-only data controls';
      const copy=card.querySelector('p');
      if(copy)copy.textContent='Client import and export are restricted to the Agency Owner. Staff cannot bulk-download or upload the client list.';
    });
  }

  function blockStaffDataAction(event){
    if(!resolved||ownerOnly)return;
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;
    const exportButton=target.closest('[data-pro-client-export]');
    const importInput=target.matches('[data-pro-client-import]')?target:target.closest('label')?.querySelector('[data-pro-client-import]');
    if(!exportButton&&!importInput)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(importInput&&'value' in importInput)try{importInput.value='';}catch(_){ }
    notify('Client import and export are restricted to the Agency Owner.');
    queueMicrotask(removeBulkControls);
  }

  async function resolveOwnerAccess(){
    try{
      const {data:{user},error}=await supabaseClient.auth.getUser();
      if(error||!user)throw error||new Error('No signed-in user');
      const {data:member,error:memberError}=await supabaseClient.from('workspace_members')
        .select('owner_user_id,role,status')
        .eq('member_user_id',user.id)
        .eq('status','active')
        .order('created_at',{ascending:false})
        .limit(1)
        .maybeSingle();
      if(memberError)throw memberError;
      if(member?.owner_user_id&&member.owner_user_id!==user.id){
        ownerOnly=false;
        role=String(member.role||'staff');
      }else{
        ownerOnly=true;
        role='owner';
      }
    }catch(error){
      console.warn('Agency owner data guard defaulted to staff-safe mode:',error);
      ownerOnly=false;
      role='unknown';
    }finally{
      resolved=true;
      document.documentElement.dataset.agencyDataRole=role;
      removeBulkControls();
      installObserver();
    }
  }

  function installObserver(){
    if(observer||ownerOnly)return;
    const actions=$('#clients .agency-section-actions');
    if(!actions)return setTimeout(installObserver,250);
    observer=new MutationObserver(removeBulkControls);
    observer.observe(actions,{childList:true});
  }

  document.addEventListener('click',blockStaffDataAction,true);
  document.addEventListener('change',blockStaffDataAction,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resolveOwnerAccess,{once:true});
  else resolveOwnerAccess();
})();
