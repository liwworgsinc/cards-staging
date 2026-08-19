(async()=>{
  const statusEl=document.getElementById('affiliate-status');
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){
    if(statusEl)statusEl.innerHTML='Create a free account to receive your affiliate link automatically.';
    window.LIWAffiliateShareKit?.refresh?.();
    return;
  }
  const {data:affiliate,error}=await supabaseClient.from('affiliates').select('referral_code,status,tax_status,payout_status').eq('user_id',session.user.id).maybeSingle();
  if(error){
    if(statusEl)statusEl.textContent='Your affiliate status could not be loaded right now.';
    return;
  }
  if(!affiliate){
    if(statusEl)statusEl.textContent='Your referral account is being created. Refresh in a moment.';
    return;
  }
  const link=`https://cards.liwworgs.com/${encodeURIComponent(affiliate.referral_code)}`;
  window.LIWAffiliateShareKit?.setLink?.(link,true);
  if(statusEl)statusEl.innerHTML=`Referral link active: <strong>${affiliate.referral_code}</strong>. <a href="affiliate-dashboard.html">Open your earnings dashboard</a>.`;
})();

// Boosted + standard all-plan affiliate commission estimator.
(()=>{
  const rateSets={
    boosted:{plus:12.25,pro:24.75,starterMonth:52.20,starterYear:43.50,proMonth:124.20,proYear:89.85,note:'Boosted mode uses 25% for Plus/Pro and 15% for Agency. Monthly Agency estimates illustrate 12 eligible monthly payments occurring while the boosted rate applies.'},
    standard:{plus:9.80,pro:19.80,starterMonth:34.80,starterYear:29.00,proMonth:82.80,proYear:59.90,note:'Standard mode uses 20% for Plus/Pro and 10% for Agency. Monthly Agency estimates illustrate 12 eligible monthly payments at the standard rate.'}
  };
  const ids={plus:'affiliate-calc-plus',pro:'affiliate-calc-pro',starterMonth:'affiliate-calc-agency-starter-month',starterYear:'affiliate-calc-agency-starter-year',proMonth:'affiliate-calc-agency-pro-month',proYear:'affiliate-calc-agency-pro-year'};
  const mode=document.getElementById('affiliate-calc-rate-mode');
  const total=document.getElementById('affiliate-calc-total');
  const note=document.getElementById('affiliate-calc-note');
  const inputs=Object.fromEntries(Object.entries(ids).map(([key,id])=>[key,document.getElementById(id)]));
  if(!mode||!total||Object.values(inputs).some(input=>!input))return;
  const clean=value=>Math.max(0,Math.min(10000,Number(value)||0));
  const update=()=>{
    const rates=rateSets[mode.value]||rateSets.boosted;
    const estimate=Object.entries(inputs).reduce((sum,[key,input])=>sum+(clean(input.value)*rates[key]),0);
    total.textContent=estimate.toLocaleString('en-US',{style:'currency',currency:'USD'});
    if(note)note.textContent=rates.note;
  };
  Object.values(inputs).forEach(input=>input.addEventListener('input',update));
  mode.addEventListener('change',update);
  update();
})();

// cards-staging only: mobile-first affiliate layout polish.
(()=>{
  if(!document.body.classList.contains('affiliate-premium-page'))return;
  if(document.querySelector('link[data-liw-affiliate-mobile-polish]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='css/affiliate-mobile-polish-staging.css?v=20260818-mobile-1';
  link.dataset.liwAffiliateMobilePolish='true';
  document.head.appendChild(link);
})();
