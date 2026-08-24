let currentPricingSubscription = null;
let pricingIsAdmin = false;
let pricingIsPlanPreview = false;
let pricingPreviewPlanKey = null;
let pricingPlanDefinitions = [];
const planRanks = { starter: 1, lite: 2, plus: 3, pro: 4, agency: 5, white_label: 6 };

document.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => checkout(button.dataset.plan, button.dataset.billingInterval || 'month')));

(async function loadPricingState(){
  const [{subscription,isAdmin,isPlanPreview,previewPlanKey}, planResult] = await Promise.all([
    getCurrentSubscription(),
    supabaseClient.from('plan_definitions').select('plan_key,stripe_monthly_price_id,stripe_yearly_price_id').eq('is_active',true).in('plan_key',['starter','lite','plus','pro'])
  ]);
  currentPricingSubscription=subscription;
  pricingIsAdmin=isAdmin;
  pricingIsPlanPreview=isPlanPreview;
  pricingPreviewPlanKey=previewPlanKey;
  pricingPlanDefinitions=planResult.data||[];
  renderPricingButtons();
  if(window.lucide) lucide.createIcons();
})();

function displayPlan(plan){
  return ({starter:'Free',lite:'Lite',plus:'Plus',pro:'Pro',agency:'Starter Reseller',white_label:'Pro Reseller'})[plan] || titleCase(plan);
}

function renderPricingButtons(){
 const active=currentPricingSubscription&&['active','trialing','past_due'].includes(currentPricingSubscription.status);
 const paid=active&&Boolean(currentPricingSubscription.stripe_subscription_id);
 const trialUsed=Boolean(currentPricingSubscription?.trial_used_at);
 const current=pricingIsPlanPreview?pricingPreviewPlanKey:(currentPricingSubscription?.plan_key||null);
 const currentRank=planRanks[current]||0;

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

  if(pricingIsPlanPreview){
   button.disabled=true;
   button.innerHTML=plan===current?'Previewing this plan':'Preview only';
   return;
  }
  if(pricingIsAdmin){
   button.disabled=true;
   button.innerHTML=plan==='lite'?'Use QA bar to preview Lite':'Admin included';
   return;
  }

  // Lite is deliberately staging-only while we validate the customer journey.
  // Do not send a Lite checkout request until its Stripe price + backend plan are approved.
  if(plan==='lite'){
   button.disabled=true;
   button.textContent='Lite checkout after QA';
   button.dataset.label=button.textContent;
   return;
  }

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

(function mountVirtualBackgroundPricing(){
  function insertBeforeAffiliate(cardSelector,html,key){
    const card=document.querySelector(cardSelector);
    const list=card?.querySelector('.feature-list');
    if(!list||list.querySelector(`[data-pricing-vb="${key}"]`))return;
    const wrap=document.createElement('div');
    wrap.innerHTML=html.trim();
    const item=wrap.firstElementChild;
    const affiliate=list.querySelector('.affiliate-plan-benefit');
    list.insertBefore(item,affiliate||null);
  }

  insertBeforeAffiliate('.starter-card',`
    <li class="pricing-feature-new" data-pricing-vb="starter"><span>✓ LIW Basic Virtual Background <b>NEW</b></span><small>Free LIW navy + gold background with your card details</small></li>
  `,'starter');

  insertBeforeAffiliate('.lite-plan-card',`
    <li class="pricing-feature-new" data-pricing-vb="lite"><span>✓ LIW Basic Virtual Background</span><small>Same LIW navy + gold background included with Free</small></li>
  `,'lite');

  insertBeforeAffiliate('.plus-plan-card',`
    <li class="pricing-feature-new" data-pricing-vb="plus"><span>✓ Virtual Background Generator <b>NEW</b></span><small>LIW Basic + Executive, Studio & Spotlight styles</small></li>
  `,'plus');

  insertBeforeAffiliate('.pro-plan-card',`
    <li class="pricing-feature-new" data-pricing-vb="pro"><span>✓ Custom virtual background upload <b>NEW</b></span><small>Upload your own JPG, PNG or WebP and keep your LIW card overlay</small></li>
  `,'pro');

  const signatureSpotlight=document.querySelector('.pricing-signature-spotlight');
  if(signatureSpotlight&&!document.querySelector('[data-pricing-vb-spotlight]')){
    const spotlight=document.createElement('div');
    spotlight.className='pricing-signature-spotlight';
    spotlight.dataset.pricingVbSpotlight='true';
    spotlight.setAttribute('role','note');
    spotlight.setAttribute('aria-label','Virtual Background Generator plan access');
    spotlight.innerHTML='<span class="pricing-signature-icon"><i data-lucide="monitor-up" size="21"></i></span><div><span class="pricing-new-label">NEW BUSINESS TOOL</span><strong>Virtual Background Generator</strong><p>Free and Lite include LIW Basic. Plus adds Executive, Studio, and Spotlight. Pro adds custom background uploads. Agency plans include custom backgrounds for client cards.</p></div><a href="virtual-background.html">Preview the tool <i data-lucide="arrow-right" size="15"></i></a>';
    signatureSpotlight.insertAdjacentElement('afterend',spotlight);
  }

  const clientPromo=[...document.querySelectorAll('main strong')].find(node=>node.textContent.trim()==='Creating cards for clients?');
  const clientCopy=clientPromo?.nextElementSibling;
  if(clientCopy){
    clientCopy.textContent='Agency Starter begins with 15 client cards. Both Agency plans include the Email Signature Generator and custom Virtual Backgrounds for client cards, while Agency Pro adds white-label, team, and scale tools.';
  }

  if(window.lucide)lucide.createIcons();
})();
