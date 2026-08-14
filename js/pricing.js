let currentPricingSubscription = null;
let pricingIsAdmin = false;
let pricingIsPlanPreview = false;
let pricingPreviewPlanKey = null;
let pricingPlanDefinitions = [];
const planRanks = { starter: 1, plus: 2, pro: 3, agency: 4, white_label: 5 };

document.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => checkout(button.dataset.plan, button.dataset.billingInterval || 'month')));

(async function loadPricingState(){
  const [{subscription,isAdmin,isPlanPreview,previewPlanKey}, planResult] = await Promise.all([getCurrentSubscription(), supabaseClient.from('plan_definitions').select('plan_key,stripe_monthly_price_id,stripe_yearly_price_id').eq('is_active',true).in('plan_key',['starter','plus','pro'])]);
  currentPricingSubscription=subscription; pricingIsAdmin=isAdmin; pricingIsPlanPreview=isPlanPreview; pricingPreviewPlanKey=previewPlanKey; pricingPlanDefinitions=planResult.data||[]; renderPricingButtons(); if(window.lucide) lucide.createIcons();
})();

function displayPlan(plan){ return ({starter:'Free',plus:'Plus',pro:'Pro',agency:'Starter Reseller',white_label:'Pro Reseller'})[plan] || titleCase(plan); }
function renderPricingButtons(){
 const active=currentPricingSubscription&&['active','trialing','past_due'].includes(currentPricingSubscription.status);
 const paid=active&&Boolean(currentPricingSubscription.stripe_subscription_id);
 const trialUsed=Boolean(currentPricingSubscription?.trial_used_at);
 const current=pricingIsPlanPreview?pricingPreviewPlanKey:(currentPricingSubscription?.plan_key||null); const currentRank=planRanks[current]||0;
 document.querySelectorAll('[data-plan]').forEach(button=>{
  const plan=button.dataset.plan, interval=button.dataset.billingInterval||'month';
  if (['agency','white_label'].includes(plan) && LIW_CONFIG.resellerPlansEnabled !== true) {
   const resellerCard = button.closest('[data-reseller-plan-card], .price-card');
   if (resellerCard) resellerCard.hidden = true;
   button.disabled = true;
   return;
  }
  const isTrialPlan=['plus','pro'].includes(plan)&&interval==='year';
  const trialEligible=isTrialPlan&&!trialUsed&&!paid&&!pricingIsAdmin&&!pricingIsPlanPreview;
  const card=button.closest('.trial-plan-card');
  const badge=card?.querySelector('[data-trial-badge]');
  const copy=card?.querySelector('[data-trial-eligibility]');

  if(badge){
   badge.classList.toggle('trial-unavailable',!trialEligible);
   badge.innerHTML=trialEligible?'<i data-lucide="clock-3" size="14"></i> 7-day free trial':'<i data-lucide="badge-check" size="14"></i> Annual plan';
  }
  if(copy){
   copy.innerHTML=trialEligible
    ? `<strong>$0 today for 7 days</strong><span>Then ${plan==='plus'?'$49':'$99'}/year unless canceled</span>`
    : trialUsed
      ? `<strong>Annual plan</strong><span>Your account has already used its free trial</span>`
      : `<strong>Annual plan</strong><span>${plan==='plus'?'$49':'$99'}/year</span>`;
  }

  if(pricingIsPlanPreview){button.disabled=true;button.innerHTML=plan===current?'Previewing this plan':'Preview only';return;}
  if(pricingIsAdmin){button.disabled=true;button.innerHTML='Admin included';return;}
  const def=pricingPlanDefinitions.find(x=>x.plan_key===plan);
  const ready=plan==='starter'||Boolean(interval==='year'?def?.stripe_yearly_price_id:def?.stripe_monthly_price_id);
  const exact=active&&current===plan&&(plan==='starter'||currentPricingSubscription.billing_interval===interval);
  button.disabled=exact||!ready;
  if(!ready) button.textContent='Price connection pending';
  else if(exact) button.textContent='Current plan';
  else if(plan==='starter'&&paid) button.textContent='Move to Free at renewal';
  else if(trialEligible) button.textContent=`Start 7-day ${displayPlan(plan)} trial`;
  else if(isTrialPlan&&!paid) button.textContent=`Choose ${displayPlan(plan)}`;
  else if(active&&(planRanks[plan]||0)>currentRank) button.textContent=`Upgrade to ${displayPlan(plan)}`;
  button.dataset.label=button.innerHTML;
 });
}
