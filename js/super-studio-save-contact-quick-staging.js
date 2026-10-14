/* LIW Cards staging — Super Studio top Save + More client/business hub. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_SAVE_CONTACT_QUICK__)return;
  window.__LIW_SUPER_STUDIO_SAVE_CONTACT_QUICK__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/card\.html$/i.test(location.pathname)))return;

  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const text=value=>String(value||'').replace(/\s+/g,' ').trim();
  const enabled=node=>!!node&&node.hidden!==true&&node.getAttribute('aria-hidden')!=='true';
  let timer=0;
  let tries=0;
  let observerTimer=0;
  let mounting=false;

  function renderIcons(node){
    if(!node||!window.lucide)return;
    requestAnimationFrame(()=>{
      try{lucide.createIcons({nodes:[node]});}catch(_){try{lucide.createIcons();}catch(__){}}
    });
  }

  function ensureStyles(){
    if(q('#liw-super-studio-more-hub-style'))return;
    const style=document.createElement('style');
    style.id='liw-super-studio-more-hub-style';
    style.textContent=`
      .super-studio-experience .ss-app-screen[data-ss-screen="more"]{gap:14px}
      .super-studio-experience .ss-app-screen[data-ss-screen="more"]>.ss-screen-title{margin-bottom:2px}
      .super-studio-experience .ss-more-feature-card{position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--ss-accent,#745bd6) 18%,rgba(17,24,39,.12));border-radius:22px;padding:18px;background:linear-gradient(145deg,color-mix(in srgb,var(--ss-accent,#745bd6) 7%,#fff),#fff 48%);box-shadow:0 14px 34px rgba(15,23,42,.08)}
      .super-studio-experience .ss-more-feature-card:before{content:"";position:absolute;right:-34px;top:-42px;width:110px;height:110px;border-radius:999px;background:color-mix(in srgb,var(--ss-accent,#745bd6) 12%,transparent);pointer-events:none}
      .super-studio-experience .ss-more-feature-head{display:flex;align-items:center;gap:12px;position:relative}
      .super-studio-experience .ss-more-feature-icon{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;border-radius:14px;background:var(--ss-accent,#745bd6);color:#fff;box-shadow:0 8px 20px color-mix(in srgb,var(--ss-accent,#745bd6) 28%,transparent)}
      .super-studio-experience .ss-more-feature-icon svg{width:20px;height:20px}
      .super-studio-experience .ss-more-feature-head h3{margin:0;font-size:1.04rem;line-height:1.2;color:var(--ss-ink,#171821)}
      .super-studio-experience .ss-more-feature-head p{margin:4px 0 0;font-size:.84rem;line-height:1.4;color:color-mix(in srgb,var(--ss-ink,#171821) 65%,transparent)}
      .super-studio-experience .ss-more-payment-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;position:relative}
      .super-studio-experience .ss-more-pay-action,.super-studio-experience .ss-more-inquiry-action{display:flex;align-items:center;justify-content:center;gap:8px;min-height:46px;border:0;border-radius:14px;padding:11px 13px;font:inherit;font-weight:800;text-decoration:none;cursor:pointer;background:var(--ss-primary,#111827);color:#fff;box-shadow:0 8px 18px rgba(15,23,42,.12)}
      .super-studio-experience .ss-more-pay-action:nth-child(even){background:color-mix(in srgb,var(--ss-accent,#745bd6) 88%,#111827)}
      .super-studio-experience .ss-more-pay-action svg,.super-studio-experience .ss-more-inquiry-action svg{width:17px;height:17px}
      .super-studio-experience .ss-more-payment-note{display:block;margin-top:10px;font-size:.73rem;line-height:1.45;color:color-mix(in srgb,var(--ss-ink,#171821) 58%,transparent)}
      .super-studio-experience .ss-more-inquiry-action{width:100%;margin-top:14px;background:var(--ss-accent,#745bd6)}
      .super-studio-experience .ss-more-business-info .ss-info summary b{font-size:1rem}
      body.liw-super-studio-more-active #payment-sharing-section[data-ss-more-source="payment"]{display:none!important}
      body.liw-super-studio-more-active #business-actions [data-ss-more-source="payment-link"]{display:none!important}
      body.liw-super-studio-more-active #lead-section[data-ss-more-source="inquiry"]:not(.ss-more-overlay-open){display:none!important}
      .ss-more-overlay-backdrop{position:fixed;inset:0;z-index:10010;background:rgba(2,6,23,.68);backdrop-filter:blur(7px)}
      body.liw-super-studio-more-active #lead-section[data-ss-more-source="inquiry"].ss-more-overlay-open{display:block!important;position:fixed!important;z-index:10020;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;margin:0!important;padding:24px!important;border-radius:24px!important;background:#fff!important;color:#111827!important;box-shadow:0 28px 80px rgba(2,6,23,.35)!important}
      #lead-section.ss-more-overlay-open .ss-more-overlay-close{display:grid}
      .ss-more-overlay-close{display:none;position:absolute;right:14px;top:14px;z-index:2;place-items:center;width:38px;height:38px;border:0;border-radius:999px;background:#eef2f7;color:#111827;cursor:pointer}
      .ss-more-overlay-close svg{width:18px;height:18px}
      @media(max-width:520px){.super-studio-experience .ss-more-payment-actions{grid-template-columns:1fr}.super-studio-experience .ss-more-feature-card{padding:16px;border-radius:19px}}
    `;
    document.head.appendChild(style);
  }

  function rootFor(){
    return q('#super-studio-public .super-studio-experience')||q('.super-studio-experience');
  }

  function saveContact(){
    const save=q('#save');
    if(save){save.click();return;}
    try{window.saveVcard?.(window.publicCard||null);}catch(_){}
  }

  function ensureTopSave(root){
    const topbar=q('.super-studio-top-actions,.ss-topbar',root);
    if(!topbar)return false;

    qa('[data-ss-home-action="save-contact"]',root).forEach(node=>node.remove());
    let button=q('[data-ss-utility-save]',topbar);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='ss-round ss-utility-action';
      button.dataset.ssUtilitySave='true';
      button.setAttribute('aria-label','Save contact');
      button.innerHTML='<i data-lucide="user-round-plus" aria-hidden="true"></i>';
      button.addEventListener('click',event=>{event.preventDefault();saveContact();});
      const share=q('[data-ss-action="share"]',topbar);
      if(share)share.insertAdjacentElement('afterend',button);else topbar.appendChild(button);
      renderIcons(button);
    }
    return true;
  }

  function paymentSources(){
    const sources=[];
    const direct=q('#business-actions [data-event="payment_click"]');
    if(enabled(direct))sources.push(direct);

    const sharing=q('#payment-sharing-section');
    const methods=q('#payment-sharing-methods',sharing||document);
    if(enabled(sharing)&&methods){
      qa('a,button',methods).forEach(node=>{if(enabled(node))sources.push(node);});
    }

    const seen=new Set();
    return sources.filter(node=>{
      const href=node.getAttribute('href')||'';
      const key=`${href}|${text(node.textContent)||node.getAttribute('aria-label')||node.getAttribute('title')||''}`;
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }

  function paymentLabel(node,index){
    let label=text(node.textContent)||text(node.getAttribute('aria-label'))||text(node.getAttribute('title'));
    label=label.replace(/\b(open|visit|pay now)\b/ig,'').replace(/\s+/g,' ').trim();
    if(node.matches('[data-event="payment_click"]'))return label?`Pay Online · ${label}`:'Pay Online';
    return label||`Payment Option ${index+1}`;
  }

  function makePaymentAction(node,index){
    const href=node.getAttribute('href');
    const action=document.createElement(href?'a':'button');
    action.className='ss-more-pay-action';
    action.innerHTML=`<i data-lucide="credit-card" aria-hidden="true"></i><span>${paymentLabel(node,index)}</span>`;
    if(href){
      action.href=href;
      action.target=node.getAttribute('target')||'_blank';
      action.rel='noopener';
    }else{
      action.type='button';
      action.addEventListener('click',event=>{event.preventDefault();node.click();});
    }
    return action;
  }

  function ensurePaymentCard(more){
    const sources=paymentSources();
    let card=q('[data-ss-more-payment]',more);
    const sharing=q('#payment-sharing-section');
    const direct=q('#business-actions [data-event="payment_click"]');

    if(enabled(sharing)&&sources.some(node=>sharing.contains(node)))sharing.dataset.ssMoreSource='payment';
    if(enabled(direct))direct.dataset.ssMoreSource='payment-link';

    if(!sources.length){
      card?.remove();
      return null;
    }

    let changed=false;
    if(!card){
      card=document.createElement('section');
      card.className='ss-section ss-more-feature-card ss-more-payment-card';
      card.dataset.ssMorePayment='true';
      card.innerHTML=`<div class="ss-more-feature-head"><span class="ss-more-feature-icon"><i data-lucide="wallet-cards"></i></span><div><h3>Payment Info</h3><p>Use the payment option provided by this business.</p></div></div><div class="ss-more-payment-actions"></div><small class="ss-more-payment-note">Payment links go directly to the business. Confirm the recipient before sending money.</small>`;
      changed=true;
    }

    const signature=sources.map((node,index)=>`${node.getAttribute('href')||'button'}:${paymentLabel(node,index)}`).join('|');
    if(card.dataset.ssPaymentSignature!==signature){
      const actions=q('.ss-more-payment-actions',card);
      actions.replaceChildren(...sources.map(makePaymentAction));
      card.dataset.ssPaymentSignature=signature;
      changed=true;
    }
    if(changed)renderIcons(card);
    return card;
  }

  function closeInquiry(){
    const source=q('#lead-section[data-ss-more-source="inquiry"]');
    source?.classList.remove('ss-more-overlay-open');
    q('.ss-more-overlay-backdrop')?.remove();
    document.body?.classList.remove('ss-more-inquiry-open');
  }

  function openInquiry(){
    const source=q('#lead-section');
    if(!enabled(source))return;
    source.dataset.ssMoreSource='inquiry';
    let addedClose=false;
    if(!q('.ss-more-overlay-close',source)){
      const close=document.createElement('button');
      close.type='button';
      close.className='ss-more-overlay-close';
      close.setAttribute('aria-label','Close inquiry');
      close.innerHTML='<i data-lucide="x" aria-hidden="true"></i>';
      close.addEventListener('click',closeInquiry);
      source.prepend(close);
      addedClose=true;
    }
    let backdrop=q('.ss-more-overlay-backdrop');
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.className='ss-more-overlay-backdrop';
      backdrop.addEventListener('click',closeInquiry);
      document.body.appendChild(backdrop);
    }
    source.classList.add('ss-more-overlay-open');
    document.body.classList.add('ss-more-inquiry-open');
    if(addedClose)renderIcons(source);
    setTimeout(()=>q('input:not([type="hidden"]),textarea,select',source)?.focus({preventScroll:true}),60);
  }

  function ensureInquiryCard(more){
    const source=q('#lead-section');
    let card=q('[data-ss-more-inquiry]',more);
    if(!enabled(source)){
      card?.remove();
      return null;
    }
    source.dataset.ssMoreSource='inquiry';
    if(!card){
      card=document.createElement('section');
      card.className='ss-section ss-more-feature-card ss-more-inquiry-card';
      card.dataset.ssMoreInquiry='true';
      card.innerHTML=`<div class="ss-more-feature-head"><span class="ss-more-feature-icon"><i data-lucide="message-square-more"></i></span><div><h3>Send Inquiry</h3><p>Have a question before booking? Send the business a message.</p></div></div><button type="button" class="ss-more-inquiry-action" data-ss-open-inquiry><i data-lucide="send"></i><span>Send Inquiry</span></button>`;
      q('[data-ss-open-inquiry]',card).addEventListener('click',openInquiry);
      renderIcons(card);
    }
    return card;
  }

  function nativeMoreSections(more){
    const sections=qa(':scope > .ss-section',more).filter(section=>!section.matches('[data-ss-more-payment],[data-ss-more-inquiry]'));
    const business=sections.find(section=>q('.ss-info',section))||null;
    const social=sections.find(section=>section.classList.contains('ss-social-section'))||null;
    const policies=sections.find(section=>section.classList.contains('ss-policy-actions'))||null;
    if(business){
      business.classList.add('ss-more-business-info');
      business.dataset.ssMoreBusiness='true';
      const label=q('.ss-info summary b',business);
      if(label&&label.textContent!=='Business Info')label.textContent='Business Info';
    }
    if(social)social.dataset.ssMoreSocial='true';
    if(policies)policies.dataset.ssMorePolicies='true';
    return {business,social,policies};
  }

  function reorderMore(more,nodes){
    const title=q(':scope > .ss-screen-title',more);
    let cursor=title;
    nodes.filter(Boolean).forEach(node=>{
      const expected=cursor?cursor.nextElementSibling:more.firstElementChild;
      if(expected!==node){
        if(cursor)more.insertBefore(node,cursor.nextElementSibling);
        else more.prepend(node);
      }
      cursor=node;
    });
  }

  function ensureMoreHub(root){
    const more=q('.ss-app-screen[data-ss-screen="more"]',root);
    if(!more)return false;
    more.classList.add('ss-more-hub');
    const screenKicker=q(':scope > .ss-screen-title span',more);
    if(screenKicker&&screenKicker.textContent!=='Client Center')screenKicker.textContent='Client Center';

    const payment=ensurePaymentCard(more);
    const inquiry=ensureInquiryCard(more);
    const native=nativeMoreSections(more);
    reorderMore(more,[payment,native.business,inquiry,native.social,native.policies]);
    return true;
  }

  function hideDuplicateGlobalSocial(root){
    if(!q('.ss-social-section',root))return;
    const globalSocial=q('#social-section');
    if(enabled(globalSocial)&&globalSocial.dataset.ssMoreSource!=='global-social'){
      globalSocial.dataset.ssMoreSource='global-social';
      globalSocial.style.setProperty('display','none','important');
    }
  }

  function mount(){
    if(mounting)return false;
    const root=rootFor();
    if(!root)return false;
    mounting=true;
    try{
      ensureStyles();
      document.body?.classList.add('liw-super-studio-more-active');
      ensureTopSave(root);
      ensureMoreHub(root);
      hideDuplicateGlobalSocial(root);
      return true;
    }finally{
      mounting=false;
    }
  }

  function schedule(){
    clearInterval(timer);
    tries=0;
    timer=setInterval(()=>{
      tries+=1;
      if(mount()||tries>80)clearInterval(timer);
    },100);
  }

  function scheduleObservedMount(){
    if(mounting)return;
    clearTimeout(observerTimer);
    observerTimer=setTimeout(()=>{
      observerTimer=0;
      mount();
    },80);
  }

  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeInquiry();});
  document.addEventListener('liw:public-card-rendered',event=>{
    if(String(event.detail?.card?.card_experience||'').toLowerCase()==='super-studio')schedule();
  });
  document.addEventListener('liw:public-card-ready',event=>{
    if(String(event.detail?.card?.card_experience||'').toLowerCase()==='super-studio')schedule();
  });
  new MutationObserver(scheduleObservedMount).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-hidden','href']});
  window.addEventListener('pageshow',schedule);
  setTimeout(schedule,0);
})();
