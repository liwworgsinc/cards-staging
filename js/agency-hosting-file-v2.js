(function(){
  'use strict';

  function renderer(){
    return location.hostname==='liwworgsinc.github.io'
      ? 'https://liwworgsinc.github.io/cards-staging/card.html'
      : 'https://cards.liwworgs.com/card.html';
  }

  function notify(message){
    const toast=document.getElementById('agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencyHostingFileToast);
    window.__agencyHostingFileToast=setTimeout(()=>toast.classList.remove('show'),3200);
  }

  async function resolveOwnerId(){
    const {data:{user},error}=await supabaseClient.auth.getUser();
    if(error||!user)throw error||new Error('Sign in again.');
    const {data:member,error:memberError}=await supabaseClient.from('workspace_members')
      .select('owner_user_id,status')
      .eq('member_user_id',user.id)
      .eq('status','active')
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(memberError)throw memberError;
    return member?.owner_user_id||user.id;
  }

  async function canExportClientData(){
    try{
      const ownerId=await resolveOwnerId();
      const {data,error}=await supabaseClient.rpc('can_export_agency_clients',{p_owner:ownerId});
      if(error)throw error;
      return data===true;
    }catch(error){
      console.warn('Agency connected-file export permission check failed:',error);
      return false;
    }
  }

  function buildFile(card){
    const title=(card.company?card.name+' · '+card.company:card.name).replace(/[<>]/g,'');
    const src=renderer()+'?slug='+encodeURIComponent(card.slug);
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}body{overflow:hidden}</style></head><body><iframe title="'+title+'" src="'+src+'"></iframe></body></html>';
  }

  window.addEventListener('click',async event=>{
    if(event.target?.id!=='agency-hosting-v2-download')return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const allowed=await canExportClientData();
    if(!allowed){
      notify('Connected client-card downloads are Owner/Admin only.');
      document.getElementById('agency-hosting-v2-dialog')?.close?.();
      return;
    }

    const select=document.getElementById('agency-hosting-v2-select');
    const slug=select?.value||'';
    const option=select?.selectedOptions?.[0];
    if(!slug||!option)return;
    const card={slug,name:option.textContent||'Client Card',company:''};
    const blob=new Blob([buildFile(card)],{type:'text/html;charset=utf-8'});
    const href=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=href;
    link.download='index.html';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),1000);
  },true);
})();
