(function(){
  function refreshHero(){
    const hero=document.querySelector('.pricing-hero');
    if(!hero)return;
    const eyebrow=hero.querySelector('.eyebrow');
    const title=hero.querySelector('h1');
    const copy=hero.querySelector(':scope > p');
    if(eyebrow)eyebrow.textContent='Simple pricing. Room to grow.';
    if(title)title.textContent='Start free. Upgrade when your business needs more.';
    if(copy)copy.textContent='Choose the level that fits today. Your card can grow with you as you add stronger branding, business tools, more cards, and advanced features.';
    if(!hero.querySelector('.pricing-hero-actions')){
      const actions=document.createElement('div');
      actions.className='pricing-hero-actions';
      actions.innerHTML='<a class="btn btn-primary" href="guest-builder.html?from=pricing">Build my card free</a><a class="btn btn-light" href="#individual-plans">Compare plans</a>';
      const trust=document.createElement('div');
      trust.className='pricing-hero-trust';
      trust.innerHTML='<span>✓ Free plan needs no credit card</span><span>✓ Secure Stripe checkout</span><span>✓ Cancel paid plans anytime</span>';
      const banner=hero.querySelector('.pricing-trial-banner');
      hero.insertBefore(actions,banner||null);
      hero.insertBefore(trust,banner||null);
    }
  }

  function simplifyPlanFeatures(){
    document.querySelectorAll('.price-card .feature-list').forEach(list=>{
      if(list.dataset.pricingSimplified==='true')return;
      list.dataset.pricingSimplified='true';
      const items=[...list.children].filter(item=>!item.classList.contains('affiliate-plan-benefit'));
      const keep=list.closest('.pro-plan-card')?7:6;
      const overflow=items.slice(keep);
      if(!overflow.length)return;
      const details=document.createElement('details');
      details.className='plan-more';
      const summary=document.createElement('summary');
      summary.textContent='See everything included';
      const extra=document.createElement('ul');
      extra.className='feature-list';
      overflow.forEach(item=>extra.appendChild(item));
      details.append(summary,extra);
      list.insertAdjacentElement('afterend',details);
    });
  }

  function refineSectionHeading(){
    const heading=document.querySelector('.pricing-section-heading');
    if(!heading)return;
    const eyebrow=heading.querySelector('.eyebrow');
    const title=heading.querySelector('h2');
    const copy=heading.querySelector('p');
    if(eyebrow)eyebrow.textContent='Pick what fits today';
    if(title)title.textContent='Four clear levels. No feature overload.';
    if(copy)copy.textContent='Start with the essentials, then unlock more business tools only when you need them.';
  }

  function run(){
    refreshHero();
    refineSectionHeading();
    requestAnimationFrame(simplifyPlanFeatures);
    setTimeout(simplifyPlanFeatures,250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();