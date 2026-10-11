/* LIW Cards staging — Super Studio service-first layout + conversion footer. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_LAYOUT_V2__)return;
  window.__LIW_SUPER_STUDIO_LAYOUT_V2__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const text=(s,r)=>String(q(s,r)?.textContent||'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function ensureStyles(){
    if(q('link[data-liw-super-studio-layout-v2-style]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/super-studio-completion-staging.css?v=20261011-3';
    link.dataset.liwSuperStudioLayoutV2Style='true';
    document.head.appendChild(link);
  }

  function serviceCategories(section){
    return [...new Set(qa('.ss-service-top span',section).map(el=>String(el.textContent||'').trim()).filter(Boolean))];
  }

  function enhanceServices(root){
    const section=q('[data-ss-section="services"]',root);
    const quick=q('.ss-quick-grid',root);
    if(!section||!quick)return;

    if(quick.nextElementSibling!==section)quick.insertAdjacentElement('afterend',section);
    section.classList.add('ss-service-showcase');

    const head=q('.ss-section-head',section);
    const kicker=q('.ss-section-head span',section);
    const title=q('.ss-section-head h2',section);
    const count=q('.ss-section-head small',section);
    const cards=qa('.ss-service-card',section);
    if(kicker)kicker.textContent='Services & booking';
    if(title)title.textContent='Choose Your Service';
    if(count)count.textContent=`${cards.length} service${cards.length===1?'':'s'}`;

    if(head&&!q('.ss-service-intro',section)){
      const intro=document.createElement('p');
      intro.className='ss-service-intro';
      intro.textContent='See what I offer, compare pricing and book the service that fits you.';
      head.insertAdjacentElement('afterend',intro);
    }

    const categories=serviceCategories(section);
    if(categories.length&&!q('.ss-service-category-rail',section)){
      const rail=document.createElement('div');
      rail.className='ss-service-category-rail';
      rail.setAttribute('aria-label','Service categories');
      rail.innerHTML=categories.map(name=>`<span>${esc(name)}</span>`).join('');
      q('.ss-service-intro',section)?.insertAdjacentElement('afterend',rail);
    }

    cards.forEach((card,index)=>{
      card.classList.add('ss-service-card-v2');
      if(index<2)card.classList.add('is-featured-service');
      if(!q(':scope > img',card)&&!q('.ss-service-mark',card)){
        const mark=document.createElement('div');
        mark.className='ss-service-mark';
        mark.innerHTML='<i data-lucide="sparkles"></i>';
        card.prepend(mark);
      }
      const book=q('[data-ss-action="book"]',card);
      if(book)book.innerHTML='<span>Book</span><i data-lucide="arrow-up-right"></i>';
    });
  }

  function buildFooter(root){
    const body=q('.ss-body',root);
    if(!body||q('.ss-conversion-footer',root))return;

    const business=text('.ss-identity > p',root)||'Your Studio';
    const name=text('.ss-identity h1',root)||'Your Professional';
    const title=text('.ss-identity h2',root)||'Service Professional';
    const location=text('.ss-identity > span',root);
    const availability=text('.ss-identity em',root);
    const firstName=(name.split(/\s+/)[0]||name).trim();
    const call=q('.ss-quick[href^="tel:"]',root);
    const sms=q('.ss-quick[href^="sms:"]',root);
    const directions=q('.ss-quick[href*="maps.google"]',root);
    const socials=qa('.ss-social',root).slice(0,6);

    const footer=document.createElement('footer');
    footer.className='ss-conversion-footer';
    footer.innerHTML=`
      <div class="ss-footer-eyebrow">Ready when you are</div>
      <div class="ss-footer-heading"><div><h2>Book with ${esc(firstName)}</h2><p>${esc(title)}${business&&business!==name?` · ${esc(business)}`:''}</p></div><span class="ss-footer-status"><b></b>${esc(availability||'Appointments available')}</span></div>
      ${location?`<div class="ss-footer-location"><i data-lucide="map-pin"></i><span>${esc(location)}</span></div>`:''}
      <button type="button" class="ss-footer-book" data-ss-footer-book><span>Book an Appointment</span><i data-lucide="calendar-check-2"></i></button>
      <div class="ss-footer-contact-row">
        ${call?`<a href="${esc(call.getAttribute('href'))}"><i data-lucide="phone"></i><span>Call</span></a>`:''}
        ${sms?`<a href="${esc(sms.getAttribute('href'))}"><i data-lucide="message-circle"></i><span>Text</span></a>`:''}
        ${directions?`<a href="${esc(directions.getAttribute('href'))}" target="_blank" rel="noopener"><i data-lucide="navigation"></i><span>Directions</span></a>`:''}
        <button type="button" data-ss-footer-share><i data-lucide="share-2"></i><span>Share</span></button>
        <button type="button" data-ss-footer-save><i data-lucide="contact-round"></i><span>Save</span></button>
      </div>
      ${socials.length?`<div class="ss-footer-socials" aria-label="Social links">${socials.map(link=>`<a href="${esc(link.getAttribute('href')||'#')}" target="_blank" rel="noopener" aria-label="${esc(link.getAttribute('aria-label')||'Social profile')}">${link.innerHTML}</a>`).join('')}</div>`:''}
      <div class="ss-footer-divider"></div>
      <div class="ss-footer-bottom"><div><strong>${esc(business)}</strong><span>${esc(title)}</span></div><span>Book · Connect · Come back anytime</span></div>
      <div class="ss-footer-branding"></div>`;

    const bottomNav=q('.ss-bottom-nav',root);
    if(bottomNav)bottomNav.insertAdjacentElement('beforebegin',footer);else body.appendChild(footer);

    const branding=q('#branding');
    const brandSlot=q('.ss-footer-branding',footer);
    if(branding&&brandSlot)brandSlot.appendChild(branding);

    q('[data-ss-footer-book]',footer)?.addEventListener('click',()=>q('.ss-primary-book',root)?.click());
    q('[data-ss-footer-share]',footer)?.addEventListener('click',()=>q('[data-ss-action="share"]',root)?.click());
    q('[data-ss-footer-save]',footer)?.addEventListener('click',()=>{
      const save=document.querySelector('#save');
      if(save)save.click();
      else window.LIWPWA?.saveContact?.();
    });
  }

  function addSectionRhythm(root){
    const featured=q('[data-ss-section="featured"]',root);
    const services=q('[data-ss-section="services"]',root);
    const work=q('[data-ss-section="work"]',root);
    if(featured)featured.classList.add('ss-portfolio-support');
    if(work)work.classList.add('ss-portfolio-gallery-v2');
    if(services&&featured&&services.nextElementSibling!==featured){
      services.insertAdjacentElement('afterend',featured);
    }
  }

  function enhance(root){
    if(!root||!root.classList.contains('super-studio-experience')||root.dataset.ssLayoutV2==='true')return;
    ensureStyles();
    enhanceServices(root);
    addSectionRhythm(root);
    buildFooter(root);
    root.dataset.ssLayoutV2='true';
    if(window.lucide)try{lucide.createIcons({nodes:[root]});}catch(_){try{lucide.createIcons();}catch(__){}}
  }

  function scan(){qa('.super-studio-experience').forEach(enhance);}
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};
  const observer=new MutationObserver(queue);
  ensureStyles();
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-rendered',queue);
  document.addEventListener('liw:editor-card-hydrated',queue);
  scan();
})();
