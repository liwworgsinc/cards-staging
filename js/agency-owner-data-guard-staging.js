/* LIW Cards — cards-staging only: role-aware client data protection.
   Owner / LIW Admin: client info + import + export + connected-file download.
   Agency Admin: client info + import, but NO client export / connected-file download.
   Editor / Designer / Viewer: no client directory or bulk client data movement. */
(function(){
  'use strict';
  if(window.__LIW_AGENCY_OWNER_DATA_GUARD__)return;
  window.__LIW_AGENCY_OWNER_DATA_GUARD__=true;

  let resolved=false;
  let observer=null;
  let applyFrame=0;
  let permissions={
    role:'unknown',
    ownerId:null,
    canManageClientInfo:false,
    canImport:false,
    canExport:false
  };

  const $=selector=>document.querySelector(selector);
  const qsa=selector=>Array.from(document.querySelectorAll(selector));

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencyOwnerDataToast);
    window.__agencyOwnerDataToast=setTimeout(()=>toast.classList.remove('show'),3200);
  }

  function setText(node,value){
    if(node&&node.textContent!==value)node.textContent=value;
  }

  function removeNode(node){
    if(!node)return;
    const label=node.matches?.('input')?node.closest('label'):null;
    (label||node).remove();
  }

  function applyClientInfoAccess(){
    if(!resolved)return;
    const canManage=permissions.canManageClientInfo;

    ['#top-add-client','#quick-add-client','#section-add-client'].forEach(selector=>{
      const control=$(selector);
      if(control&&!canManage)control.remove();
    });

    const clientNav=$('.agency-sidebar a[href="#clients"]');
    const clientSection=$('#clients');
    if(!canManage){
      if(clientNav)clientNav.hidden=true;
      if(clientSection)clientSection.hidden=true;
    }else{
      if(clientNav)clientNav.hidden=false;
      if(clientSection)clientSection.hidden=false;
    }
  }

  function applyDataMovementAccess(){
    if(!resolved)return;

    if(!permissions.canExport){
      qsa('[data-pro-client-export],#agency-hosting-v2-button,#agency-hosting-v2-download').forEach(removeNode);
      const dialog=$('#agency-hosting-v2-dialog');
      if(dialog){try{dialog.close?.();}catch(_){ }dialog.remove();}
    }

    if(!permissions.canImport){
      qsa('[data-pro-client-import]').forEach(removeNode);
    }

    const settingsCards=qsa('#settings .agency-results-card');
    settingsCards.forEach(card=>{
      const strong=card.querySelector('strong');
      if(!strong||!/imports?, exports? & automation/i.test(strong.textContent||''))return;
      const copy=card.querySelector('p');
      if(permissions.canExport&&permissions.canImport){
        setText(strong,'Owner/Admin data controls');
        setText(copy,'Client import, export, and connected hosting-file downloads are available.');
      }else if(permissions.canImport){
        setText(strong,'Agency Admin client intake');
        setText(copy,'CSV client import is allowed. Client export and connected hosting-file downloads stay Owner/Admin only.');
      }else{
        setText(strong,'Protected client data');
        setText(copy,'Client import, bulk export, and connected hosting-file downloads are unavailable for this staff role.');
      }
    });
  }

  function wrapGlobalDataFunctions(){
    const currentExport=window.exportClientsCsv;
    if(typeof currentExport==='function'&&!currentExport.__liwPermissionWrapped){
      const wrapped=async function(...args){
        if(!resolved||!permissions.canExport){
          notify(resolved?'Client export is Owner/Admin only.':'Checking client-data permissions…');
          return;
        }
        return currentExport.apply(this,args);
      };
      wrapped.__liwPermissionWrapped=true;
      window.exportClientsCsv=wrapped;
    }

    const currentImport=window.importClientsCsv;
    if(typeof currentImport==='function'&&!currentImport.__liwPermissionWrapped){
      const wrapped=async function(...args){
        if(!resolved||!permissions.canImport){
          notify(resolved?'Client import is available to the Owner/Admin and Agency Admin only.':'Checking client-data permissions…');
          return;
        }
        return currentImport.apply(this,args);
      };
      wrapped.__liwPermissionWrapped=true;
      window.importClientsCsv=wrapped;
    }
  }

  function applyPermissions(){
    applyClientInfoAccess();
    applyDataMovementAccess();
    wrapGlobalDataFunctions();
    document.documentElement.dataset.agencyDataRole=permissions.role;
    document.documentElement.dataset.agencyClientExport=permissions.canExport?'allowed':'blocked';
    document.documentElement.dataset.agencyClientImport=permissions.canImport?'allowed':'blocked';
    document.documentElement.dataset.agencyClientInfo=permissions.canManageClientInfo?'allowed':'blocked';
    window.LIWAgencyDataPermissions={...permissions};
  }

  function schedulePermissions(){
    cancelAnimationFrame(applyFrame);
    applyFrame=requestAnimationFrame(applyPermissions);
  }

  function blockedControl(target){
    if(!(target instanceof Element))return null;
    return {
      exportControl:target.closest('[data-pro-client-export],#agency-hosting-v2-button,#agency-hosting-v2-download'),
      importInput:target.matches('[data-pro-client-import]')?target:target.closest('label')?.querySelector('[data-pro-client-import]'),
      clientControl:target.closest('#top-add-client,#quick-add-client,#section-add-client,#agency-client-submit,#agency-client-form')
    };
  }

  function guardAction(event){
    const controls=blockedControl(event.target);
    if(!controls||(!controls.exportControl&&!controls.importInput&&!controls.clientControl))return;

    if(!resolved){
      event.preventDefault();
      event.stopImmediatePropagation();
      notify('Checking client-data permissions…');
      return;
    }

    if(controls.exportControl&&!permissions.canExport){
      event.preventDefault();
      event.stopImmediatePropagation();
      notify('Client export and connected card downloads are Owner/Admin only.');
      queueMicrotask(applyPermissions);
      return;
    }

    if(controls.importInput&&!permissions.canImport){
      event.preventDefault();
      event.stopImmediatePropagation();
      try{controls.importInput.value='';}catch(_){ }
      notify('Client import is available to the Owner/Admin and Agency Admin only.');
      queueMicrotask(applyPermissions);
      return;
    }

    if(controls.clientControl&&!permissions.canManageClientInfo){
      event.preventDefault();
      event.stopImmediatePropagation();
      notify('Client information is restricted to the Owner/Admin and Agency Admin.');
      queueMicrotask(applyPermissions);
    }
  }

  async function resolvePermissions(){
    try{
      const {data:{user},error}=await supabaseClient.auth.getUser();
      if(error||!user)throw error||new Error('No signed-in user');

      let ownerId=user.id;
      let role='owner';
      const {data:member,error:memberError}=await supabaseClient.from('workspace_members')
        .select('owner_user_id,role,status')
        .eq('member_user_id',user.id)
        .eq('status','active')
        .order('created_at',{ascending:false})
        .limit(1)
        .maybeSingle();
      if(memberError)throw memberError;

      if(member?.owner_user_id&&member.owner_user_id!==user.id){
        ownerId=member.owner_user_id;
        role=String(member.role||'staff').trim().toLowerCase();
      }

      const [manageResult,importResult,exportResult]=await Promise.all([
        supabaseClient.rpc('can_manage_agency_client_info',{p_owner:ownerId}),
        supabaseClient.rpc('can_import_agency_clients',{p_owner:ownerId}),
        supabaseClient.rpc('can_export_agency_clients',{p_owner:ownerId})
      ]);

      if(manageResult.error)throw manageResult.error;
      if(importResult.error)throw importResult.error;
      if(exportResult.error)throw exportResult.error;

      permissions={
        role,
        ownerId,
        canManageClientInfo:manageResult.data===true,
        canImport:importResult.data===true,
        canExport:exportResult.data===true
      };
    }catch(error){
      console.warn('Agency client data guard defaulted to staff-safe mode:',error);
      permissions={
        role:'unknown',
        ownerId:null,
        canManageClientInfo:false,
        canImport:false,
        canExport:false
      };
    }finally{
      resolved=true;
      applyPermissions();
      installObserver();
    }
  }

  function installObserver(){
    if(observer)return;
    observer=new MutationObserver(mutations=>{
      /* Only react to structural additions/removals. Idempotent text updates above
         prevent this guard from creating its own endless mutation cycle. */
      if(!mutations.some(mutation=>mutation.addedNodes.length||mutation.removedNodes.length))return;
      schedulePermissions();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener('click',guardAction,true);
  document.addEventListener('change',guardAction,true);
  document.addEventListener('submit',guardAction,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resolvePermissions,{once:true});
  else resolvePermissions();
})();