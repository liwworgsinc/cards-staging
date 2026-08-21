(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);

  function notify(message){
    const toast=$('#agency-toast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencyHostingToast);
    window.__agencyHostingToast=setTimeout(()=>toast.classList.remove('show'),3000);
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
      console.warn('Agency hosting export permission check failed:',error);
      return false;
    }
  }

  function collectCards(){
    return Array.from(document.querySelectorAll('#agency-card-grid .agency-client-card')).map(article=>{
      const preview=article.querySelector('a[href*="card.html?slug="]');
      if(!preview)return null;
      let slug='';
      try{slug=new URL(preview.href,location.href).searchParams.get('slug')||'';}catch(_){}
      if(!slug)return null;
      return {
        slug,
        name:article.querySelector('h3')?.textContent?.trim()||'Client Card',
        company:article.querySelector('p')?.textContent?.trim()||''
      };
    }).filter(Boolean);
  }

  async function openHosting(){
    if(!(await canExportClientData())){
      notify('Connected card downloads are Owner/Admin only.');
      return;
    }
    const cards=collectCards();
    if(!cards.length){notify('No client cards are ready yet.');return;}
    window.dispatchEvent(new CustomEvent('liw:agency-hosting-open',{detail:{cards}}));
  }

  async function install(){
    if($('#agency-hosting-v2-button'))return;
    const allowed=await canExportClientData();
    if(!allowed)return;
    const actions=$('#cards .agency-section-actions');
    if(!actions)return setTimeout(install,250);
    const button=document.createElement('button');
    button.id='agency-hosting-v2-button';
    button.type='button';
    button.className='btn btn-primary btn-sm';
    button.textContent='Host client card';
    button.addEventListener('click',openHosting);
    actions.appendChild(button);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

/* cards-staging only: upgrade Add client into a card-ready team workflow. */
(function(){
  'use strict';
  const version='20260818-agency-card-ready-2';
  if(!document.querySelector('link[data-liw-agency-card-ready]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`css/agency-client-card-ready-staging.css?v=${version}`;
    link.dataset.liwAgencyCardReady='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-liw-agency-card-ready]')){
    const script=document.createElement('script');
    script.src=`js/agency-client-card-ready-staging.js?v=${version}`;
    script.defer=true;
    script.dataset.liwAgencyCardReady='true';
    document.head.appendChild(script);
  }
})();

/* cards-staging only: role-aware protection for client information and exports. */
(function(){
  'use strict';
  const version='20260820-client-data-permissions-2';
  if(document.querySelector('script[data-liw-agency-owner-data-guard]'))return;
  const script=document.createElement('script');
  script.src=`js/agency-owner-data-guard-staging.js?v=${version}`;
  script.defer=true;
  script.dataset.liwAgencyOwnerDataGuard='true';
  document.head.appendChild(script);
})();
