/* LIW Cards staging — Super Studio V3 app-shell layout. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_LAYOUT_V3__)return;
  window.__LIW_SUPER_STUDIO_LAYOUT_V3__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function ensureStyles(){
    let base=q('link[data-liw-super-studio-layout-v2-style],link[data-liw-super-studio-completion]');
    if(!base){
      base=document.createElement('link');
      base.rel='stylesheet';
      base.dataset.liwSuperStudioLayoutV2Style='true';
      document.head.appendChild(base);
    }
    const baseHref='css/super-studio-completion-staging.css?v=20261011-5';
    if(!String(base.getAttribute('href')||'').includes('20261011-5'))base.href=baseHref;

    let app=q('link[data-liw-super-studio-app-shell-style]');
    if(!app){
      app=document.createElement('link');
      app.rel='stylesheet';
      app.dataset.liwSuperStudioAppShellStyle='true';
      document.head.appendChild(app);
    }
    const appHref='css/super-studio-app-shell-staging.css?v=20261011-2';
    if(!String(app.getAttribute('href')||'').includes('20261011-2'))app.href=appHref;
  }

  function removeLegacyFooter(root){
    const footer=q('.ss-conversion-footer',root);
    if(!footer)return;
    const branding=q('#branding',footer);
    if(branding)root.appendChild(branding);
    footer.remove();
  }

  function semantic(el){
    return [el?.dataset?.ssAction,el?.dataset?.action,el?.dataset?.cardAction,el?.getAttribute?.('aria-label'),el?.getAttribute?.('title'),el?.textContent]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function enhanceServices(root){
    const section=q('[data-ss-section="services"]',root);
    if(!section)return;
    section.classList.add('ss-service-showcase','ss-service-screen-section');
    const head=q('.ss-section-head',section);
    const kicker=q('.ss-section-head span',section);
    const title=q('.ss-section-head h2',section);
    const count=q('.ss-section-head small',section);
    const cards=qa('.ss-service-card',section);
    if(kicker&&kicker.textContent!=='Services')kicker.textContent='Services';
    if(title&&title.textContent!=='Choose Your Service')title.textContent='Choose Your Service';
    if(count)count.textContent=`${cards.length} service${cards.length===1?'':'s'}`;
    if(head&&!q('.ss-service-intro',section)){
      const intro=document.createElement('p');
      intro.className='ss-service-intro';
      intro.textContent='Tap a service to see pricing, timing and booking options.';
      head.insertAdjacentElement('afterend',intro);
    }
    const categories=[...new Set(qa('.ss-service-top span',section).map(el=>String(el.textContent||'').trim()).filter(Boolean))];
    if(categories.length&&!q('.ss-service-category-rail',section)){
      const rail=document.createElement('div');
      rail.className='ss-service-category-rail';
      rail.setAttribute('aria-label','Service categories');
      rail.innerHTML=categories.map(name=>`<span>${esc(name)}</span>`).join('');
      q('.ss-service-intro',section)?.insertAdjacentElement('afterend',rail);
    }
    cards.forEach(card=>{
      card.classList.add('ss-service-card-v3');
      card.classList.remove('is-featured-service');
      if(!q(':scope > img',card)&&!q('.ss-service-mark',card)){
        const mark=document.createElement('div');
        mark.className='ss-service-mark';
        mark.innerHTML='<i data-lucide="sparkles"></i>';
        card.prepend(mark);
      }
      const book=q('[data-ss-action="book"]',card);
      if(book&&!book.dataset.ssV3Label){
        book.dataset.ssV3Label='true';
        book.innerHTML='<span>Book</span><i data-lucide="arrow-up-right"></i>';
      }
    });
  }

  function removeDuplicateQuickBook(root){
    const quick=q('.ss-quick-grid',root);
    if(!quick)return;
    const duplicate=qa('.ss-quick',quick).find(el=>/\bbook\b/.test(semantic(el)));
    if(duplicate)duplicate.classList.add('ss-quick-book-duplicate');
    quick.classList.add('ss-quick-grid-v3');
  }

  function classifyNode(node){
    if(!(node instanceof Element))return 'ignore';
    if(node.matches('.ss-app-shell,.ss-app-nav,.ss-bottom-nav,#branding,.ss-native-booking,#booking-v1-section'))return 'ignore';
    if(node.matches('dialog,[role="dialog"],[class*="modal"],[class*="drawer"],[class*="toast"]'))return 'ignore';
    if(node.matches('.ss-primary-book,.ss-quick-grid'))return 'home';
    if(node.matches('[data-ss-section="services"]')||q('[data-ss-section="services"]',node))return 'services';
    if(node.matches('[data-ss-section="featured"],[data-ss-section="work"]')||
       q('[data-ss-section="featured"],[data-ss-section="work"]',node)||
       node.matches('.ss-featured,.ss-portfolio-support,.ss-portfolio-gallery-v3')||
       q('.ss-ba-list,.ss-work-grid,.ss-featured-grid',node))return 'work';
    if(node.matches('.ss-section'))return 'more';
    return 'more';
  }

  function screenMarkup(name,label,icon){
    return `<section class="ss-app-screen" data-ss-screen="${name}" aria-label="${label}">
      <div class="ss-screen-title"><i data-lucide="${icon}"></i><div><span>Super Studio</span><h2>${label}</h2></div></div>
    </section>`;
  }

  function buildAppShell(root){
    const body=q('.ss-body',root);
    if(!body||q('.ss-app-shell',root))return;
    const originalChildren=Array.from(body.children);
    const shell=document.createElement('div');
    shell.className='ss-app-shell';
    shell.innerHTML=[screenMarkup('home','Home','home'),screenMarkup('services','Services','sparkles'),screenMarkup('work','Work','images'),screenMarkup('more','More','menu')].join('');
    body.prepend(shell);
    const screens={home:q('[data-ss-screen="home"]',shell),services:q('[data-ss-screen="services"]',shell),work:q('[data-ss-screen="work"]',shell),more:q('[data-ss-screen="more"]',shell)};
    originalChildren.forEach(node=>{
      const bucket=classifyNode(node);
      if(screens[bucket])screens[bucket].appendChild(node);
    });
    const existingNav=q('.ss-bottom-nav',root);
    if(existingNav)existingNav.classList.add('ss-bottom-nav-v3-hidden');
    const nav=document.createElement('nav');
    nav.className='ss-app-nav';
    nav.setAttribute('aria-label','Super Studio navigation');
    nav.innerHTML=`
      <button type="button" data-ss-app-screen="home"><i data-lucide="home"></i><span>Home</span></button>
      <button type="button" data-ss-app-screen="services"><i data-lucide="sparkles"></i><span>Services</span></button>
      <button type="button" class="ss-app-nav-book" data-ss-app-book><i data-lucide="calendar-check-2"></i><span>Book</span></button>
      <button type="button" data-ss-app-screen="work"><i data-lucide="images"></i><span>Work</span></button>
      <button type="button" data-ss-app-screen="more"><i data-lucide="menu"></i><span>More</span></button>`;
    root.appendChild(nav);
    setScreen(root,'home',false);
  }

  function setScreen(root,name,focus=true){
    if(!['home','services','work','more'].includes(name))name='home';
    root.dataset.ssActiveScreen=name;
    qa('.ss-app-screen',root).forEach(screen=>{
      const active=screen.dataset.ssScreen===name;
      screen.classList.toggle('is-active',active);
      screen.hidden=!active;
    });
    qa('[data-ss-app-screen]',root).forEach(button=>{
      const active=button.dataset.ssAppScreen===name;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-current',active?'page':'false');
    });
    if(focus){
      const active=q(`.ss-app-screen[data-ss-screen="${name}"]`,root);
      const top=root.getBoundingClientRect().top+window.scrollY;
      if(window.scrollY>top+120)root.scrollIntoView({behavior:'smooth',block:'start'});
      active?.setAttribute('tabindex','-1');
      setTimeout(()=>active?.focus({preventScroll:true}),50);
    }
  }

  function proxyClick(selectors){
    for(const selector of selectors){
      const target=q(selector);
      if(target&&target.offsetParent!==null){target.click();return true;}
    }
    for(const selector of selectors){
      const target=q(selector);
      if(target){target.click();return true;}
    }
    return false;
  }

  function ensureUtilityCluster(root){
    const topbar=q('.super-studio-top-actions,.ss-topbar',root);
    if(!topbar)return;
    topbar.classList.add('ss-utility-cluster');
    const share=q('[data-ss-action="share"]',topbar)||q('[data-ss-action="share"]',root);
    if(share)share.classList.add('ss-utility-action');
    if(!q('[data-ss-utility-qr]',topbar)){
      const qr=document.createElement('button');
      qr.type='button';
      qr.className='ss-round ss-utility-action';
      qr.dataset.ssUtilityQr='true';
      qr.setAttribute('aria-label','Show QR code');
      qr.innerHTML='<i data-lucide="qr-code"></i>';
      if(share?.parentElement===topbar)share.insertAdjacentElement('afterend',qr);else topbar.appendChild(qr);
    }
    try{window.LIWWalletGlobal?.sync?.();}catch(_){}
    const wallet=q('.liw-global-wallet-fallback,[data-liw-global-wallet="true"]',topbar)||qa('button,a',topbar).find(el=>/\bwallet\b/.test(semantic(el)));
    if(wallet)wallet.classList.add('ss-utility-action','ss-utility-wallet');
  }

  function ensureEvents(root){
    if(root.dataset.ssAppEvents==='true')return;
    root.dataset.ssAppEvents='true';
    root.addEventListener('click',event=>{
      const screenButton=event.target.closest('[data-ss-app-screen]');
      if(screenButton&&root.contains(screenButton)){
        event.preventDefault();
        setScreen(root,screenButton.dataset.ssAppScreen);
        return;
      }
      const bookButton=event.target.closest('[data-ss-app-book]');
      if(bookButton&&root.contains(bookButton)){
        event.preventDefault();
        const primary=q('.ss-primary-book',root);
        if(primary){primary.click();return;}
        q('[data-ss-action="book"]',root)?.click();
        return;
      }
      const qrButton=event.target.closest('[data-ss-utility-qr]');
      if(qrButton&&root.contains(qrButton)){
        event.preventDefault();
        proxyClick(['#qr-top','[data-action="qr"]','[data-card-action="qr"]','[aria-label*="QR" i]']);
      }
    });
  }

  function hidePaidBranding(root){
    document.body?.classList.add('liw-super-studio-paid');
    const branding=q('#branding');
    if(branding)branding.setAttribute('aria-hidden','true');
    removeLegacyFooter(root);
  }

  function markWork(root){
    q('[data-ss-section="featured"]',root)?.classList.add('ss-portfolio-support');
    q('[data-ss-section="work"]',root)?.classList.add('ss-portfolio-gallery-v3');
  }

  function refreshDynamicNodes(root){
    const shell=q('.ss-app-shell',root),body=q('.ss-body',root);
    if(!shell||!body)return;
    Array.from(body.children).forEach(node=>{
      if(node===shell||node.matches?.('.ss-native-booking,#booking-v1-section'))return;
      const bucket=classifyNode(node);
      const screen=bucket!=='ignore'?q(`[data-ss-screen="${bucket}"]`,shell):null;
      if(screen)screen.appendChild(node);
    });
  }

  function enhance(root){
    if(!root||!root.classList.contains('super-studio-experience'))return;
    ensureStyles();
    removeLegacyFooter(root);
    enhanceServices(root);
    removeDuplicateQuickBook(root);
    markWork(root);
    buildAppShell(root);
    refreshDynamicNodes(root);
    ensureUtilityCluster(root);
    ensureEvents(root);
    hidePaidBranding(root);
    root.dataset.ssLayoutV2='true';
    root.dataset.ssLayoutV3='true';
    if(window.lucide)try{lucide.createIcons({nodes:[root]});}catch(_){try{lucide.createIcons();}catch(__){}}
  }

  function scan(){
    const roots=qa('.super-studio-experience');
    document.body?.classList.toggle('liw-super-studio-paid',roots.length>0);
    roots.forEach(enhance);
  }

  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};
  ensureStyles();
  const observer=new MutationObserver(queue);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-rendered',queue);
  document.addEventListener('liw:editor-card-hydrated',queue);
  scan();
})();
