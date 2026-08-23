(function(){
  const PRICES={
    month:{agency:{price:'$29',period:'/month',note:'15 client cards included',trial:'$0 today · then $29/month unless canceled'},white_label:{price:'$69',period:'/month',note:'50 client cards included',trial:'$0 today · then $69/month unless canceled'}},
    year:{agency:{price:'$290',period:'/year',note:'Save $58 vs monthly',trial:'$0 today · then $290/year unless canceled'},white_label:{price:'$599',period:'/year',note:'Save $229 vs monthly',trial:'$0 today · then $599/year unless canceled'}}
  };
  let interval='month';

  function loadAgencyLaunchFixes(){
    if(document.querySelector('link[data-agency-launch-fixes]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/agency-launch-fixes.css?v=20260813-1';
    link.dataset.agencyLaunchFixes='true';
    document.head.appendChild(link);
  }

  function removeStagingCheckoutNote(){
    document.querySelector('.agency-note')?.remove();
  }

  function renderBilling(){
    document.querySelectorAll('[data-agency-billing]').forEach(button=>button.classList.toggle('active',button.dataset.agencyBilling===interval));
    Object.entries(PRICES[interval]).forEach(([plan,copy])=>{
      const price=document.querySelector(`[data-agency-price="${plan}"]`);
      const period=document.querySelector(`[data-agency-period="${plan}"]`);
      const note=document.querySelector(`[data-agency-save="${plan}"]`);
      const trial=document.querySelector(`[data-agency-trial-charge="${plan}"]`);
      if(price) price.textContent=copy.price;
      if(period) period.textContent=copy.period;
      if(note) note.textContent=copy.note;
      if(trial) trial.textContent=copy.trial;
    });
  }

  async function previewPlan(plan){
    try{
      const {data:{user}}=await supabaseClient.auth.getUser();
      if(!user){
        sessionStorage.setItem('liw_cards_after_login','agency');
        location.href=liwUrl('login.html');
        return;
      }
      const access=await getLiwAccessContext(user,{refresh:true});
      if(!access.isAdmin || !isLiwStagingPlanQaHost()){
        toast('Agency subscriptions are still in staging. Live checkout is not enabled yet.');
        return;
      }
      localStorage.setItem(LIW_ADMIN_PLAN_PREVIEW_KEY,plan);
      localStorage.setItem('liw_agency_preview_interval',interval);
      clearLiwAccessContextCache();
      location.href=liwUrl('agency-dashboard.html');
    }catch(error){
      console.warn('Agency plan preview failed:',error);
      toast('Agency preview could not be opened.');
    }
  }

  function mountVirtualBackgroundBenefits(){
    const cards=document.querySelectorAll('.agency-plan-card');
    const starter=cards[0];
    const pro=cards[1];

    function add(card,copy,detail,key){
      const list=card?.querySelector('.agency-feature-list');
      if(!list||list.querySelector(`[data-agency-vb="${key}"]`))return;
      const feature=document.createElement('div');
      feature.className='agency-feature';
      feature.dataset.agencyVb=key;
      feature.innerHTML=`<i data-lucide="monitor-up" size="15"></i><span><strong style="font:inherit">${copy}</strong>${detail?`<small style="display:block;margin-top:2px;color:#667085;font-size:.68rem;line-height:1.3">${detail}</small>`:''}</span>`;
      const branding=[...list.querySelectorAll('.agency-feature')].find(node=>node.textContent.toLowerCase().includes('branding'));
      list.insertBefore(feature,branding||null);
    }

    add(starter,'Custom Virtual Backgrounds','Create client-ready backgrounds with their card details and uploaded brand imagery.','starter');
    add(pro,'Custom Virtual Backgrounds','Included for client cards, alongside Agency Pro white-label delivery.','pro');
    if(window.lucide)lucide.createIcons();
  }

  loadAgencyLaunchFixes();
  removeStagingCheckoutNote();
  mountVirtualBackgroundBenefits();
  document.querySelectorAll('[data-agency-billing]').forEach(button=>button.addEventListener('click',()=>{interval=button.dataset.agencyBilling==='year'?'year':'month';renderBilling();}));
  document.querySelectorAll('[data-agency-plan-preview]').forEach(button=>button.addEventListener('click',()=>previewPlan(button.dataset.agencyPlanPreview)));
  renderBilling();
  if(window.lucide) lucide.createIcons();
})();