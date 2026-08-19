(function(){
  'use strict';
  if(!document.body.classList.contains('affiliate-premium-page')) return;
  const mobile=window.matchMedia('(max-width:760px)');
  if(!mobile.matches) return;

  function addMidCta(){
    if(document.querySelector('[data-affiliate-mobile-mid-cta]')) return;
    const audience=document.querySelector('.affiliate-audience-section');
    if(!audience) return;
    const wrap=document.createElement('div');
    wrap.className='affiliate-mobile-mid-cta-wrap container';
    wrap.dataset.affiliateMobileMidCta='true';
    wrap.innerHTML='<div class="affiliate-mobile-mid-cta"><div><span>Ready when you are</span><strong>Get your referral link free.</strong><small>No joining fee · included with every LIW Cards account</small></div><a class="btn btn-primary" href="register.html">Join free</a></div>';
    audience.insertAdjacentElement('afterend',wrap);
  }

  function installCommissionDisclosure(){
    const section=document.querySelector('.affiliate-commission-section');
    const copy=section?.querySelector('.affiliate-commission-copy');
    if(!section||!copy||section.dataset.mobileDisclosureReady==='true') return;
    section.dataset.mobileDisclosureReady='true';
    section.classList.add('affiliate-mobile-details-collapsed');

    const summary=document.createElement('div');
    summary.className='affiliate-mobile-commission-summary';
    summary.innerHTML='<strong>25% Plus/Pro · 15% Agency</strong><span>Boosted for your first 12 months. Standard rates after that are 20% and 10%.</span>';

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='affiliate-mobile-disclosure-toggle affiliate-mobile-only-control';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<span>See commission details & calculator</span><b>＋</b>';

    const intro=Array.from(copy.children).find(el=>el.tagName==='P'&&!el.classList.contains('affiliate-disclaimer'));
    if(intro) intro.insertAdjacentElement('afterend',summary);
    else copy.prepend(summary);
    summary.insertAdjacentElement('afterend',toggle);

    toggle.addEventListener('click',()=>{
      const opening=section.classList.contains('affiliate-mobile-details-collapsed');
      section.classList.toggle('affiliate-mobile-details-collapsed',!opening);
      toggle.setAttribute('aria-expanded',String(opening));
      toggle.querySelector('span').textContent=opening?'Hide commission details':'See commission details & calculator';
      toggle.querySelector('b').textContent=opening?'−':'＋';
    });
  }

  function installExampleDisclosure(){
    const grid=document.querySelector('.affiliate-earning-scenarios');
    if(!grid||grid.dataset.mobileDisclosureReady==='true') return;
    grid.dataset.mobileDisclosureReady='true';
    const cards=Array.from(grid.querySelectorAll('.affiliate-earning-scenario'));
    if(cards.length<=2) return;

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='affiliate-mobile-example-toggle affiliate-mobile-only-control';
    toggle.setAttribute('aria-expanded','false');
    toggle.textContent='See all earning examples';
    grid.insertAdjacentElement('afterend',toggle);

    toggle.addEventListener('click',()=>{
      const opening=!grid.classList.contains('affiliate-mobile-examples-expanded');
      grid.classList.toggle('affiliate-mobile-examples-expanded',opening);
      toggle.setAttribute('aria-expanded',String(opening));
      toggle.textContent=opening?'Show fewer examples':'See all earning examples';
    });
  }

  function installShareMessageDisclosure(){
    const shell=document.querySelector('.affiliate-share-example-shell');
    if(!shell||shell.dataset.mobileDisclosureReady==='true') return;
    shell.dataset.mobileDisclosureReady='true';
    shell.classList.add('affiliate-mobile-share-collapsed');

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='affiliate-mobile-share-toggle affiliate-mobile-only-control';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='<span><strong>Ready-to-share messages</strong><small>WhatsApp · Instagram · Client message</small></span><b>＋</b>';
    shell.insertAdjacentElement('beforebegin',toggle);

    toggle.addEventListener('click',()=>{
      const opening=shell.classList.contains('affiliate-mobile-share-collapsed');
      shell.classList.toggle('affiliate-mobile-share-collapsed',!opening);
      toggle.setAttribute('aria-expanded',String(opening));
      toggle.querySelector('strong').textContent=opening?'Hide ready-to-share messages':'Ready-to-share messages';
      toggle.querySelector('b').textContent=opening?'−':'＋';
    });
  }

  addMidCta();
  installCommissionDisclosure();
  installExampleDisclosure();
  installShareMessageDisclosure();
})();
