(function(){
  'use strict';

  const isStaging=location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/');
  if(!isStaging)return;

  const banner=()=>document.querySelector('#cards .agency-addon-banner');
  const liveStatuses=new Set(['active','trialing']);

  function notify(message){
    const toast=document.getElementById('agency-toast');
    if(typeof window.toast==='function')return window.toast(message);
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('show');
    clearTimeout(window.__agencyCapacityToast);
    window.__agencyCapacityToast=setTimeout(()=>toast.classList.remove('show'),3200);
  }

  function previewPlanKey(){
    try{
      const value=String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();
      return ['agency','white_label'].includes(value)?value:'';
    }catch(_){return '';}
  }

  function moneyLabel(interval,isPreview=false){
    if(isPreview)return '$10/mo · $100/yr';
    return interval==='year'?'$100/year':'$10/month';
  }

  async function loadState(){
    const target=banner();
    if(!target||typeof supabaseClient==='undefined')return;
    target.classList.remove('capacity-visible','capacity-warning','capacity-critical','capacity-reached');
    target.hidden=true;

    const {data:{user}}=await supabaseClient.auth.getUser();
    if(!user)return;

    const previewPlan=previewPlanKey();
    const isPreview=Boolean(previewPlan);
    const [subscriptionResult,countResult,packResult]=await Promise.all([
      supabaseClient.from('subscriptions').select('plan_key,status,billing_interval,stripe_subscription_id').eq('user_id',user.id).maybeSingle(),
      supabaseClient.from('digital_cards').select('id',{count:'exact',head:true}).eq('user_id',user.id),
      supabaseClient.from('subscription_addons').select('quantity,status').eq('user_id',user.id).eq('addon_key','agency_card_pack_25').maybeSingle()
    ]);

    if(subscriptionResult.error||countResult.error)return;
    const subscription=subscriptionResult.data;

    let planKey='';
    let limit=0;
    let interval='month';
    let packQuantity=0;

    if(isPreview){
      const {data:plan,error:planError}=await supabaseClient.from('plan_definitions').select('card_limit').eq('plan_key',previewPlan).maybeSingle();
      if(planError)return;
      planKey=previewPlan;
      limit=Math.max(1,Number(plan?.card_limit||(previewPlan==='white_label'?50:15)));
      interval=subscription?.billing_interval==='year'?'year':'month';
    }else{
      if(!subscription||!['agency','white_label'].includes(String(subscription.plan_key||''))||!liveStatuses.has(String(subscription.status||'')))return;
      planKey=String(subscription.plan_key||'');
      interval=subscription.billing_interval==='year'?'year':'month';
      const {data:liveLimit,error:limitError}=await supabaseClient.rpc('card_limit_for_user',{p_user_id:user.id});
      if(limitError)return;
      limit=Math.max(1,Number(liveLimit||0));
      packQuantity=['active','trialing'].includes(String(packResult.data?.status||''))?Number(packResult.data?.quantity||0):0;
    }

    if(!['agency','white_label'].includes(planKey))return;

    const used=Number(countResult.count||0);
    const percent=Math.min(100,Math.round((used/limit)*100));
    if(percent<80)return;

    const reached=used>=limit;
    const critical=!reached&&percent>=90;
    const levelClass=reached?'capacity-reached':critical?'capacity-critical':'capacity-warning';
    const statusLabel=reached?'Capacity reached':critical?'Almost at capacity':'Capacity watch';
    const title=reached
      ? `You’ve used all ${limit} client-card slots.`
      : critical
        ? `Only ${Math.max(limit-used,0)} client-card slot${Math.max(limit-used,0)===1?'':'s'} remaining.`
        : `You’re approaching your ${limit}-card capacity.`;
    const copy=reached
      ? `You’re at ${used} / ${limit}. Add another 25 slots so new client work is not blocked.`
      : `${used} of ${limit} slots are in use. Add 25 more when you’re ready to keep growing.`;
    const buttonLabel=packQuantity>0?'Add another +25':'Add +25 cards';

    target.hidden=false;
    target.classList.add('capacity-visible',levelClass);
    target.innerHTML=`
      <span class="agency-capacity-alert-icon"><i data-lucide="${reached?'triangle-alert':'layers-3'}" size="19"></i></span>
      <div class="agency-capacity-alert-copy">
        <span class="agency-capacity-alert-label">${statusLabel}${isPreview?' · staging preview':''}</span>
        <strong>${title}</strong>
        <small>${copy}</small>
      </div>
      <div class="agency-capacity-alert-action">
        <div class="agency-capacity-pack-price"><strong>+25 cards</strong><span>${moneyLabel(interval,isPreview)}</span></div>
        <button class="btn btn-primary btn-sm" id="agency-add-capacity-pack" type="button" data-preview="${isPreview?'true':'false'}">${buttonLabel}</button>
      </div>`;

    document.getElementById('agency-add-capacity-pack')?.addEventListener('click',purchasePack);
    if(window.lucide)lucide.createIcons();
  }

  async function purchasePack(event){
    const button=event.currentTarget;
    if(button.dataset.preview==='true'){
      notify('Staging preview only — a real Agency customer would open Stripe billing here.');
      return;
    }

    const original=button.innerHTML;
    button.disabled=true;
    button.innerHTML='<span class="button-spinner"></span>Adding capacity…';
    try{
      const {data:{session}}=await supabaseClient.auth.getSession();
      if(!session)throw new Error('Your session expired. Log in again.');
      const response=await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/manage-agency-capacity`,{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'Authorization':`Bearer ${session.access_token}`,
          'apikey':LIW_CONFIG.supabaseKey
        },
        body:JSON.stringify({action:'add_pack'})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Unable to add Agency capacity.');
      if(data.paymentUrl){
        location.href=data.paymentUrl;
        return;
      }
      notify(data.message||'25 client-card slots added.');
      setTimeout(()=>{
        const url=new URL(liwUrl('agency-dashboard.html'));
        url.searchParams.set('billing','capacity-added');
        url.hash='cards';
        location.href=url.href;
      },650);
    }catch(error){
      notify(error?.message||'Unable to add Agency capacity.');
      button.disabled=false;
      button.innerHTML=original;
    }
  }

  function showSuccessToast(){
    const params=new URLSearchParams(location.search);
    if(params.get('billing')!=='capacity-added')return;
    notify('Agency capacity updated successfully.');
    params.delete('billing');
    const clean=`${location.pathname}${params.toString()?`?${params}`:''}${location.hash||''}`;
    history.replaceState({},'',clean);
  }

  async function init(){
    showSuccessToast();
    await loadState();
    setTimeout(loadState,900);
    setTimeout(loadState,1800);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
