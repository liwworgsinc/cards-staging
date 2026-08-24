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

(function mountPremiumLitePurchasePanel(){
  const card=document.querySelector('.lite-plan-card');
  const oldActions=card?.querySelector('.lite-billing-actions');
  if(!card||!oldActions||card.querySelector('.lite-purchase-panel'))return;

  oldActions.className='lite-purchase-panel';
  oldActions.setAttribute('aria-label','Lite billing options');
  oldActions.innerHTML=`
    <div class="lite-purchase-label">Choose billing</div>
    <div class="lite-billing-selector" role="radiogroup" aria-label="Lite billing interval">
      <button type="button" class="lite-billing-choice" data-lite-billing-option="month" role="radio" aria-checked="false">
        <span>Monthly</span><strong>$2.49</strong><small>/month</small>
      </button>
      <button type="button" class="lite-billing-choice active" data-lite-billing-option="year" role="radio" aria-checked="true">
        <span>Yearly <em>BEST VALUE</em></span><strong>$24</strong><small>/year</small>
      </button>
    </div>
    <button type="button" class="btn btn-block lite-purchase-cta" data-plan="lite" data-billing-interval="year" disabled>Choose Lite</button>
    <div class="lite-purchase-meta"><span>Cancel anytime</span><span>Secure checkout</span></div>
    <p class="lite-staging-note">Checkout temporarily disabled in staging.</p>`;

  const price=card.querySelector('.price');
  const priceCopy=card.querySelector('.lite-price-copy');
  const annualValue=card.querySelector('.lite-annual-value');
  const cta=oldActions.querySelector('.lite-purchase-cta');
  const choices=[...oldActions.querySelectorAll('[data-lite-billing-option]')];

  function setLiteBilling(interval){
    const yearly=interval==='year';
    choices.forEach(choice=>{
      const selected=choice.dataset.liteBillingOption===interval;
      choice.classList.toggle('active',selected);
      choice.setAttribute('aria-checked',selected?'true':'false');
    });
    cta.dataset.billingInterval=interval;
    cta.textContent='Choose Lite';
    if(price){
      price.innerHTML=yearly?'$24 <small>/year</small>':'$2.49 <small>/month</small>';
    }
    if(priceCopy){
      priceCopy.innerHTML=yearly
        ? '<strong>$2/month equivalent</strong><span>Save $5.88 compared with 12 monthly payments.</span>'
        : '<strong>Simple monthly flexibility</strong><span>Switch to yearly anytime for the best Lite value.</span>';
    }
    if(annualValue){
      annualValue.innerHTML=yearly
        ? '<span>You save $5.88 vs. 12 monthly payments</span><b>SELECTED</b>'
        : '<span>Yearly saves $5.88 vs. 12 monthly payments</span><b>BEST VALUE</b>';
    }
  }

  choices.forEach(choice=>choice.addEventListener('click',()=>setLiteBilling(choice.dataset.liteBillingOption)));
  cta.addEventListener('click',()=>{
    if(!cta.disabled) checkout('lite',cta.dataset.billingInterval||'year');
  });
  setLiteBilling('year');
})();

(function mountPlusMonthlyPricing(){
  const card=document.querySelector('.plus-plan-card');
  const oldButton=card?.querySelector('button[data-plan="plus"]');
  if(!card||!oldButton||card.querySelector('.plus-purchase-panel'))return;

  const panel=document.createElement('div');
  panel.className='plus-purchase-panel';
  panel.setAttribute('aria-label','Plus billing options');
  panel.style.cssText='margin-top:18px;padding-top:17px;border-top:1px solid #ead8ad';
  panel.innerHTML=`
    <div class="lite-purchase-label">Choose billing</div>
    <div class="lite-billing-selector" role="radiogroup" aria-label="Plus billing interval">
      <button type="button" class="lite-billing-choice plus-billing-choice" data-plus-billing-option="month" role="radio" aria-checked="false">
        <span>Monthly</span><strong>$5.99</strong><small>/month</small>
      </button>
      <button type="button" class="lite-billing-choice plus-billing-choice active" data-plus-billing-option="year" role="radio" aria-checked="true">
        <span>Yearly <em>BEST VALUE</em></span><strong>$49</strong><small>/year</small>
      </button>
    </div>
    <button type="button" class="btn btn-light btn-block lite-purchase-cta plus-purchase-cta" data-plan="plus" data-billing-interval="year">Start 7-day Plus trial</button>
    <div class="lite-purchase-meta"><span>Cancel anytime</span><span>Secure checkout</span></div>
    <p class="lite-staging-note plus-staging-note">Monthly checkout is staged for QA. Annual checkout stays on the current live Plus price.</p>`;
  oldButton.replaceWith(panel);

  const price=card.querySelector('.price');
  const value=card.querySelector('.plus-value-vs-lite');
  const cta=panel.querySelector('.plus-purchase-cta');
  const choices=[...panel.querySelectorAll('[data-plus-billing-option]')];

  function setPlusBilling(interval){
    const yearly=interval==='year';
    choices.forEach(choice=>{
      const selected=choice.dataset.plusBillingOption===interval;
      choice.classList.toggle('active',selected);
      choice.setAttribute('aria-checked',selected?'true':'false');
    });
    card.dataset.plusBillingInterval=interval;
    cta.dataset.billingInterval=interval;
    if(price) price.innerHTML=yearly?'$49 <small>/year</small>':'$5.99 <small>/month</small>';
    if(value){
      value.textContent=yearly
        ? 'Save $22.88 vs. 12 monthly payments — only $25 more per year than Lite annual.'
        : 'Monthly flexibility with the full Plus feature set. Switch to yearly anytime to save $22.88.';
    }
    renderPricingButtons();
    if(window.lucide)lucide.createIcons();
  }

  choices.forEach(choice=>choice.addEventListener('click',()=>setPlusBilling(choice.dataset.plusBillingOption)));
  cta.addEventListener('click',()=>{
    if(!cta.disabled) checkout('plus',cta.dataset.billingInterval||'year');
  });

  const heroCopy=document.querySelector('.pricing-hero>p');
  if(heroCopy) heroCopy.textContent='Choose Free, Lite at $2.49/month or $24/year, Plus at $5.99/month or $49/year, or Pro at $99/year.';
  const trialBanner=document.querySelector('.pricing-trial-banner');
  const trialBannerStrong=trialBanner?.querySelector('strong');
  const trialBannerCopy=trialBanner?.querySelector('div span');
  if(trialBannerStrong) trialBannerStrong.textContent='Try annual Plus or Pro free for 7 days';
  if(trialBannerCopy) trialBannerCopy.textContent='Lite has no trial. Plus monthly also has no trial. Eligible annual Plus and Pro customers pay $0 today and annual billing begins after day 7 unless canceled.';

  const monthlyFaq=[...document.querySelectorAll('.faq-item')].find(item=>/Which plans have monthly billing\?/i.test(item.querySelector('summary')?.textContent||''));
  const monthlyFaqCopy=monthlyFaq?.querySelector('p');
  if(monthlyFaqCopy) monthlyFaqCopy.textContent='Lite offers $2.49/month or $24/year. Plus offers $5.99/month or $49/year. Pro is $99/year.';
  const plusTrialFaq=[...document.querySelectorAll('.faq-item')].find(item=>/How do the Plus and Pro trials work\?/i.test(item.querySelector('summary')?.textContent||''));
  const plusTrialCopy=plusTrialFaq?.querySelector('p');
  if(plusTrialCopy) plusTrialCopy.textContent='The 7-day trial applies to eligible first-time annual Plus and Pro customers. Plus monthly is $5.99/month with no trial. Annual Plus renews at $49/year and Pro at $99/year unless canceled before the trial ends.';
  const trialTerms=document.querySelector('.trial-terms-strip span');
  if(trialTerms) trialTerms.innerHTML='<strong>Trial terms:</strong> Lite and Plus monthly do not include a free trial. Annual Plus and Pro trials are available to eligible first-time customers only. Payment method required. Cancel before the 7-day trial ends to avoid the annual charge.';

  setPlusBilling('year');
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

  const plusMonthlyStaging=plan==='plus'&&interval==='month';
  const isTrialPlan=['plus','pro'].includes(plan)&&interval==='year';
  const trialEligible=isTrialPlan&&!trialUsed&&!paid&&!pricingIsAdmin&&!pricingIsPlanPreview;
  const card=button.closest('.trial-plan-card');
  const badge=card?.querySelector('[data-trial-badge]');
  const copy=card?.querySelector('[data-trial-eligibility]');

  if(plusMonthlyStaging){
   if(badge){
    badge.classList.add('trial-unavailable');
    badge.innerHTML='<i data-lucide="calendar-range" size="14"></i> Monthly · no trial';
   }
   if(copy) copy.innerHTML='<strong>$5.99/month</strong><span>No trial · billed monthly · cancel before the next renewal</span>';
  } else {
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
  }

  if(pricingIsPlanPreview){
   button.disabled=true;
   button.innerHTML=plan===current?'Previewing this plan':'Preview only';
   return;
  }
  if(pricingIsAdmin){
   button.disabled=true;
   button.innerHTML=plan==='lite'?'Choose Lite':'Admin included';
   return;
  }

  // Lite is deliberately staging-only while we validate the customer journey.
  // Keep the purchase surface customer-ready, but do not send checkout until approved.
  if(plan==='lite'){
   button.disabled=true;
   button.textContent='Choose Lite';
   button.dataset.label=button.textContent;
   return;
  }

  // Plus monthly is wired for the staging customer journey, but checkout stays
  // disabled until the dedicated $5.99 Stripe monthly price is approved.
  if(plusMonthlyStaging){
   button.disabled=true;
   button.textContent='$5.99/month · checkout after QA';
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

(function mountMobilePricingCarouselHeight(){
  const rail=document.querySelector('#individual-plans .liw-three-plan-pricing');
  if(!rail)return;
  const cards=[...rail.querySelectorAll('.price-card')];
  const media=window.matchMedia('(max-width:760px)');
  let raf=0;

  function nearestCard(){
    const center=rail.scrollLeft+(rail.clientWidth/2);
    return cards.reduce((best,card)=>{
      const cardCenter=card.offsetLeft+(card.offsetWidth/2);
      const distance=Math.abs(cardCenter-center);
      return !best||distance<best.distance?{card,distance}:best;
    },null)?.card||cards[0];
  }

  function resizeRail(){
    if(!media.matches){
      rail.style.height='';
      return;
    }
    const card=nearestCard();
    if(!card)return;
    const style=getComputedStyle(rail);
    const top=parseFloat(style.paddingTop)||0;
    const bottom=parseFloat(style.paddingBottom)||0;
    rail.style.height=`${Math.ceil(card.offsetHeight+top+bottom)}px`;
  }

  function scheduleResize(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(resizeRail);
  }

  rail.addEventListener('scroll',scheduleResize,{passive:true});
  window.addEventListener('resize',scheduleResize,{passive:true});
  if(media.addEventListener)media.addEventListener('change',scheduleResize);
  if('ResizeObserver' in window){
    const observer=new ResizeObserver(scheduleResize);
    cards.forEach(card=>observer.observe(card));
  }
  requestAnimationFrame(()=>requestAnimationFrame(resizeRail));
})();
