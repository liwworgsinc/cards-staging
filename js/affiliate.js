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

// Boosted + standard affiliate commission estimator.
(()=>{
  const rateSets={
    boosted:{
      plus:12.25,
      pro:24.75,
      starterMonth:52.20,
      starterYear:43.50,
      proMonth:124.20,
      proYear:89.85,
      note:'Boosted mode uses 25% for Plus/Pro and 15% for Agency. Plus/Pro commission applies to the referred customer’s first eligible paid card-plan purchase. Monthly Agency estimates illustrate up to 12 eligible monthly payments inside the referral window.'
    },
    standard:{
      plus:4.90,
      pro:9.90,
      starterMonth:17.40,
      starterYear:14.50,
      proMonth:41.40,
      proYear:29.95,
      note:'Standard mode uses 10% for Plus/Pro and 5% for Agency. Plus/Pro does not pay lifetime renewal commission. Monthly Agency estimates illustrate up to 12 eligible monthly payments inside the referral window.'
    }
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
  const styles=[
    ['affiliate-mobile-polish','css/affiliate-mobile-polish-staging.css?v=20260818-mobile-1'],
    ['affiliate-mobile-conversion','css/affiliate-mobile-conversion-staging.css?v=20260818-conversion-1'],
    ['affiliate-audience-fix','css/affiliate-audience-mobile-fix-staging.css?v=20260818-audience-1'],
    ['affiliate-refresh','css/affiliate-refresh-staging.css?v=20260827-1'],
    ['affiliate-client-clarity','css/affiliate-client-clarity-staging.css?v=20260827-1']
  ];
  styles.forEach(([key,href])=>{
    if(document.querySelector(`link[data-liw-${key}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.dataset[`liw${key.split('-').map(part=>part[0].toUpperCase()+part.slice(1)).join('')}`]='true';
    document.head.appendChild(link);
  });
  if(!document.querySelector('script[data-liw-affiliate-mobile-conversion]')){
    const script=document.createElement('script');
    script.src='js/affiliate-mobile-conversion-staging.js?v=20260827-rates-1';
    script.defer=true;
    script.dataset.liwAffiliateMobileConversion='true';
    document.head.appendChild(script);
  }
})();

// cards-staging: keep the public affiliate page aligned with current plans and commission policy.
(()=>{
  if(!document.body.classList.contains('affiliate-premium-page'))return;

  const announcement=document.querySelector('.affiliate-announcement span');
  if(announcement)announcement.textContent='Affiliate access included with every account';

  const heroCopy=document.querySelector('.affiliate-hero-copy>p');
  if(heroCopy)heroCopy.textContent='Share LIW Cards with entrepreneurs and small businesses. Your referral can start Free or Lite, then move into Plus, Pro, or Agency when they need more. You earn on eligible commission-paying purchases while we handle the platform, billing, onboarding, and support.';

  const commissionIntro=document.querySelector('.affiliate-commission-copy>p:not(.affiliate-disclaimer)');
  if(commissionIntro)commissionIntro.innerHTML='<strong>Your first 12 months as an affiliate are boosted:</strong> eligible Plus and Pro first purchases pay 25%, and eligible Agency Starter and Agency Pro billing pays 15%. After your affiliate boost ends, new eligible referrals use 10% for Plus/Pro and 5% for Agency. Plus/Pro commission applies to the referred customer’s first eligible paid card-plan purchase only—there is no lifetime renewal commission. Agency billing is limited to its eligible 12-month referral window.';

  const rateList=document.querySelector('.affiliate-rate-list');
  if(rateList)rateList.innerHTML=`
    <div><span>Plus — $49/year</span><strong>$12.25 <small>first year</small></strong><em>$4.90 standard</em></div>
    <div><span>Pro — $99/year</span><strong>$24.75 <small>first year</small></strong><em>$9.90 standard</em></div>
    <div class="affiliate-rate-agency"><span>Agency Starter — $29/month</span><strong>$4.35 <small>eligible payment</small></strong><em>$1.45 standard</em></div>
    <div class="affiliate-rate-agency"><span>Agency Starter — $290/year</span><strong>$43.50 <small>first year</small></strong><em>$14.50 standard</em></div>
    <div class="affiliate-rate-agency"><span>Agency Pro — $69/month</span><strong>$10.35 <small>eligible payment</small></strong><em>$3.45 standard</em></div>
    <div class="affiliate-rate-agency"><span>Agency Pro — $599/year</span><strong>$89.85 <small>first year</small></strong><em>$29.95 standard</em></div>`;

  const disclaimer=document.querySelector('.affiliate-disclaimer');
  if(disclaimer)disclaimer.textContent='The boosted rate lasts for the first 12 months from the date your affiliate account is created. Plus/Pro commission applies only to the referred customer’s first eligible paid card-plan purchase; recurring card-plan renewals do not create lifetime affiliate commission. Agency referrals can remain commission-eligible only during the first 12 months from that referred Agency customer’s first eligible Agency commission, with no more than 12 eligible commission-bearing payments. Refunds, chargebacks, fraud, self-referrals, and ineligible transactions do not earn commission. Examples are illustrative and are not an income guarantee.';

  const examples=document.querySelector('.affiliate-earning-scenarios');
  if(examples)examples.innerHTML=`
    <article class="affiliate-earning-scenario"><span>Plus annual</span><strong>$12.25</strong><b>First year · 25%</b><p>Standard after your boost for a new eligible referral: <strong class="scenario-standard">$4.90 at 10%</strong>.</p></article>
    <article class="affiliate-earning-scenario"><span>Pro annual</span><strong>$24.75</strong><b>First year · 25%</b><p>Standard after your boost for a new eligible referral: <strong class="scenario-standard">$9.90 at 10%</strong>.</p></article>
    <article class="affiliate-earning-scenario agency"><span>Agency Starter monthly</span><strong>$4.35</strong><b>Per eligible payment while boosted</b><p>Standard after your boost: <strong class="scenario-standard">$1.45 per eligible payment at 5%</strong>.</p></article>
    <article class="affiliate-earning-scenario agency"><span>Agency Pro annual</span><strong>$89.85</strong><b>First year · 15%</b><p>Standard after your boost for a new eligible referral: <strong class="scenario-standard">$29.95 at 5%</strong>.</p></article>`;

  const proof=document.querySelector('.affiliate-proof-strip');
  if(proof){
    proof.dataset.clientClarityReady='true';
    proof.innerHTML=`
      <div class="container affiliate-proof-shell">
        <div class="affiliate-proof-intro">
          <div><span class="affiliate-proof-kicker">Commission at a glance</span><h2>Know exactly what you earn.</h2></div>
          <p>Your first 12 months include boosted commission rates. After that, new eligible referrals use the lower standard rates—without lifetime card-plan renewal commissions.</p>
        </div>
        <div class="affiliate-proof-grid" aria-label="Affiliate commission summary">
          <article class="affiliate-proof-card"><span class="affiliate-proof-label">Individual paid plans</span><strong>25%</strong><h3>First-year Plus & Pro rate</h3><p>25% on the referred customer’s first eligible paid Plus or Pro purchase while your boost is active.</p><span class="affiliate-proof-plan">Plus + Pro</span></article>
          <article class="affiliate-proof-card"><span class="affiliate-proof-label">Agency paid plans</span><strong>15%</strong><h3>First-year Agency rate</h3><p>15% on eligible Agency billing while your affiliate boost is active and the referral is inside its eligible window.</p><span class="affiliate-proof-plan">Agency Starter + Pro</span></article>
          <article class="affiliate-proof-card"><span class="affiliate-proof-label">After your first year</span><strong>10% / 5%</strong><h3>Standard commission rates</h3><p>New eligible Plus/Pro referrals use 10%. Eligible Agency billing uses 5%. Card-plan renewals do not pay lifetime commission.</p><span class="affiliate-proof-plan">10% cards · 5% Agency</span></article>
          <article class="affiliate-proof-card"><span class="affiliate-proof-label">Payout requirement</span><strong>$25</strong><h3>Minimum approved payout</h3><p>Once approved commissions reach at least $25 and payout requirements are complete, they become payable.</p><span class="affiliate-proof-plan">30-day review hold applies</span></article>
        </div>
      </div>`;
  }

  const faqItems=[...document.querySelectorAll('.faq-item')];
  const boostFaq=faqItems.find(item=>item.querySelector('summary')?.textContent.trim()==='How does the first-year commission boost work?');
  if(boostFaq){
    const p=boostFaq.querySelector('p');
    if(p)p.textContent='Your affiliate account receives boosted rates for its first 12 months: 25% on an eligible referred customer’s first paid Plus/Pro purchase and 15% on eligible Agency billing. After your 12-month affiliate anniversary, new eligible referrals use 10% for Plus/Pro and 5% for Agency. Plus/Pro renewals do not pay lifetime affiliate commission.';
  }
  const agencyFaq=faqItems.find(item=>item.querySelector('summary')?.textContent.trim()==='Can I earn on Agency plans?');
  if(agencyFaq){
    const p=agencyFaq.querySelector('p');
    if(p)p.textContent='Yes. Eligible Agency Starter and Agency Pro billing can generate commission only during the first 12 months from that referred Agency customer’s first eligible Agency commission, with no more than 12 eligible commission-bearing payments. If your personal first-year boost ends during that window, later eligible Agency payments use the 5% standard rate.';
  }

  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content='Every LIW Cards account includes affiliate access. Earn boosted first-year commissions, then 10% on eligible Plus/Pro first purchases and 5% on eligible Agency billing.';
})();
