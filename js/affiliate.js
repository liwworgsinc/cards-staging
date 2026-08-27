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
  if(!document.querySelector('link[data-liw-affiliate-mobile-polish]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/affiliate-mobile-polish-staging.css?v=20260818-mobile-1';
    link.dataset.liwAffiliateMobilePolish='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-liw-affiliate-mobile-conversion]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/affiliate-mobile-conversion-staging.css?v=20260818-conversion-1';
    link.dataset.liwAffiliateMobileConversion='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-liw-affiliate-audience-fix]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/affiliate-audience-mobile-fix-staging.css?v=20260818-audience-1';
    link.dataset.liwAffiliateAudienceFix='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-liw-affiliate-mobile-conversion]')){
    const script=document.createElement('script');
    script.src='js/affiliate-mobile-conversion-staging.js?v=20260818-conversion-1';
    script.defer=true;
    script.dataset.liwAffiliateMobileConversion='true';
    document.head.appendChild(script);
  }
})();

// cards-staging: current-plan affiliate page refresh.
(()=>{
  if(!document.body.classList.contains('affiliate-premium-page'))return;

  if(!document.querySelector('link[data-liw-affiliate-refresh]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/affiliate-refresh-staging.css?v=20260827-1';
    link.dataset.liwAffiliateRefresh='true';
    document.head.appendChild(link);
  }

  const announcement=document.querySelector('.affiliate-announcement span');
  if(announcement)announcement.textContent='Affiliate access included with every account';

  const heroCopy=document.querySelector('.affiliate-hero-copy>p');
  if(heroCopy)heroCopy.textContent='Share LIW Cards with entrepreneurs and small businesses. Your referral can start Free or Lite, then move into Plus, Pro, or Agency when they need more. You earn on eligible commission-paying purchases while we handle the platform, billing, onboarding, and support.';

  const proof=document.querySelector('.affiliate-proof-strip');
  if(proof&&!document.querySelector('.affiliate-plan-path-section')){
    const section=document.createElement('section');
    section.className='section affiliate-plan-path-section';
    section.innerHTML=`
      <div class="container">
        <div class="affiliate-plan-path-head">
          <div>
            <span class="eyebrow">Current LIW Cards lineup</span>
            <h2>One referral link. A plan for every stage.</h2>
            <p>People do not have to jump straight into a high-priced plan. They can start Free, step into Lite for a polished single card, or choose Plus, Pro, or Agency when they need more business tools and capacity.</p>
          </div>
          <div class="affiliate-plan-path-note">Free and Lite are entry plans. Current affiliate commission starts on eligible Plus, Pro, Agency Starter, and Agency Pro purchases.</div>
        </div>
        <div class="affiliate-plan-path-grid" aria-label="Current LIW Cards plan path">
          <article class="affiliate-plan-path-card">
            <strong>Free</strong>
            <div class="plan-price">$0</div>
            <p>One card with the essentials and no credit card required.</p>
            <small>Affiliate access is still included with the account.</small>
          </article>
          <article class="affiliate-plan-path-card">
            <strong>Lite</strong>
            <div class="plan-price">$2.49/mo</div>
            <p>Or $24/year. One polished card with stronger visual tools and custom QR options.</p>
            <small>Low-cost entry plan · no affiliate commission on Lite today.</small>
          </article>
          <article class="affiliate-plan-path-card eligible">
            <strong>Plus</strong>
            <div class="plan-price">$49/year</div>
            <p>Premium themes, leads, products, services, content tools, analytics, and email signatures.</p>
            <span class="affiliate-plan-earn-tag">25% first 12 months</span>
            <small>$12.25 on an eligible annual referral while boosted.</small>
          </article>
          <article class="affiliate-plan-path-card eligible">
            <strong>Pro</strong>
            <div class="plan-price">$99/year</div>
            <p>More capacity plus advanced analytics, exports, team tools, Flow, and the Business Growth Suite.</p>
            <span class="affiliate-plan-earn-tag">25% first 12 months</span>
            <small>$24.75 on an eligible annual referral while boosted.</small>
          </article>
          <article class="affiliate-plan-path-card agency">
            <strong>Agency</strong>
            <div class="plan-price">From $29/mo</div>
            <p>Built for client cards, with Agency Pro adding white-label, team, and scale tools.</p>
            <span class="affiliate-plan-earn-tag">15% first 12 months</span>
            <small>Eligible Agency billing can generate commission for up to 12 months from the referred customer’s first eligible commission.</small>
          </article>
        </div>
      </div>`;
    proof.insertAdjacentElement('afterend',section);
  }

  const audienceCards=[...document.querySelectorAll('.affiliate-audience-card')];
  const existingCustomer=audienceCards.find(card=>card.querySelector('h3')?.textContent.trim()==='Existing customers');
  if(existingCustomer){
    const p=existingCustomer.querySelector('p');
    if(p)p.textContent='Recommend LIW Cards from personal experience and earn when eligible referrals purchase a commission-paying plan.';
  }

  const faqItems=[...document.querySelectorAll('.faq-item')];
  const buildFaq=faqItems.find(item=>item.querySelector('summary')?.textContent.trim()==='Do affiliates create or manage customer cards?');
  if(buildFaq){
    const p=buildFaq.querySelector('p');
    if(p)p.textContent='No. Affiliates refer customers using their tracked link. Your Free, Lite, Plus, or Pro card plan controls what you can build for yourself.';
  }

  if(buildFaq&&!document.getElementById('affiliate-lite-faq')){
    const liteFaq=document.createElement('details');
    liteFaq.className='faq-item';
    liteFaq.id='affiliate-lite-faq';
    liteFaq.innerHTML='<summary>Does the Lite plan pay affiliate commission?</summary><p>Not currently. Lite gives referrals a low-cost step between Free and Plus, but the current commission-paying individual plans are Plus and Pro. Eligible Agency Starter and Agency Pro billing can also generate commission.</p>';
    buildFaq.insertAdjacentElement('afterend',liteFaq);
  }

  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content='Every LIW Cards account includes affiliate access. Share Free, Lite, Plus, Pro, and Agency options, and earn boosted commissions on eligible Plus, Pro, and Agency purchases.';
})();
