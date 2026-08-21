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

  function moneyLabel(interval){return interval==='year'?'$100/year':'$10/month';}

  async function loadState(){
    const target=banner();
    if(!target||typeof supabaseClient==='undefined')return;
    target.classList.remove('capacity-visible','capacity-warning','capacity-critical','capacity-reached');
    target.hidden=true;

    const {data:{user}}=await supabaseClient.auth.getUser();
    if(!user)return;

    const [subscriptionResult,countResult,limitResult,packResult]=await Promise.all([
      supabaseClient.from('subscriptions').select('plan_key,status,billing_interval,stripe_subscription_id').eq('user_id',user.id).maybeSingle(),
      supabaseClient.from('digital_cards').select('id',{count:'exact',head:true}).eq('user_id',user.id),
      supabaseClient.rpc('card_limit_for_user',{p_user_id:user.id}),
      supabaseClient.from('subscription_addons').select('quantity,status').eq('user_id',user.id).eq('addon_key','agency_card_pack_25').maybeSingle()
    ]);

    const subscription=subscriptionResult.data;
    if(subscriptionResult.error||countResult.error||limitResult.error)return;
    if(!subscription||!['agency','white_label'].includes(String(subscription.plan_key||''))||!liveStatuses.has(String(subscription.status||'')))return;

    const used=Number(countResult.count||0);
    const limit=Math.max(1,Number(limitResult.data||0));
    const percent=Math.min(100,Math.round((used/limit)*100));
    if(percent<80)return;

    const interval=subscription.billing_interval==='year'?'year':'month';
    const packQuantity=['active','trialing'].includes(String(packResult.data?.status||''))?Number(packResult.data?.quantity||0):0;
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
      ? 'Add another 25 slots now so new client work is not blocked.'
      : `${used} of ${limit} slots are in use. Add 25 more when you’re ready to keep growing.`;
    const buttonLabel=packQuantity>0?'Add another +25':'Add +25 cards';

    target.hidden=false;
    target.classList.add('capacity-visible',levelClass);
    target.innerHTML=`
      <span class="agency-capacity-alert-icon"><i data-lucide="${reached?'triangle-alert':'layers-3'}" size="19"></i></span>
      <div class="agency-capacity-alert-copy">
        <span class="agency-capacity-alert-label">${statusLabel}</span>
        <strong>${title}</strong>
        <small>${copy}</small>
      </div>
      <div class="agency-capacity-alert-action">
        <div class="agency-capacity-pack-price"><strong>+25 cards</strong><span>${moneyLabel(interval)}</span></div>
        <button class="btn btn-primary btn-sm" id="agency-add-capacity-pack" type="button">${buttonLabel}</button>
      </div>`;

    document.getElementById('agency-add-capacity-pack')?.addEventListener('click',purchasePack);
    if(window.lucide)lucide.createIcons();
  }

  async function purchasePack(event){
    const button=event.currentTarget;
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
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
