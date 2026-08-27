(function(){
  const PLUS_INCLUDED_FEATURES=new Set([
    'premium_templates','expanded_fonts','cover_image','remove_branding',
    'appointment_booking','lead_capture','product_showcase','payment_sharing',
    'services_section','video_section','file_downloads','standard_analytics'
  ]);
  function access(){try{return typeof editorAccess!=='undefined'?editorAccess:null;}catch(_){return null;}}
  function isPlusFeature(feature){const a=access();return String(a?.planKey||'').toLowerCase()==='plus'&&PLUS_INCLUDED_FEATURES.has(feature);}
  function allowed(feature){const a=access();return Boolean(a&&((a.isAdmin&&!a.isPlanPreview)||isPlusFeature(feature)||a.has?.(feature)));}
  function servicesAllowed(){return allowed('services_section');}
  function paymentSharingAllowed(){
    const a=access();
    if(!a)return false;
    if(a.isAdmin&&!a.isPlanPreview)return true;
    const plan=String(a.planKey||'starter').toLowerCase();
    if(plan==='starter')return false;
    if(['lite','plus','pro','agency','white_label'].includes(plan))return true;
    return Boolean(a.has?.('payment_sharing'));
  }

  try{
    if(typeof hasEntitlement==='function'){
      const originalHasEntitlement=hasEntitlement;
      hasEntitlement=function(key){
        try{
          const plan=String(currentPlan||'').toLowerCase();
          if(key==='payment_sharing'&&plan==='starter')return false;
          if(key==='payment_sharing'&&['lite','plus','pro','agency','white_label'].includes(plan))return true;
          if(plan==='plus'&&PLUS_INCLUDED_FEATURES.has(key))return true;
        }catch(_){ }
        return originalHasEntitlement(key);
      };
    }
  }catch(_){ }

  function decoratePlusCore(){
    ['appointment_booking','lead_capture','product_showcase'].forEach(key=>{
      const badge=document.querySelector(`[data-entitlement-badge="${key}"]`);
      const card=document.querySelector(`[data-entitlement-card="${key}"]`);
      if(!badge||!card)return;
      const enabled=allowed(key);
      card.classList.toggle('locked',!enabled);
      badge.className=`entitlement-badge ${enabled?'included':'locked'}`;
      badge.innerHTML=enabled?'<i data-lucide="circle-check" size="14"></i> Included':'<i data-lucide="lock" size="14"></i> Plus+';
      const fieldName=key==='appointment_booking'?'booking_enabled':key==='lead_capture'?'lead_form_enabled':'products_enabled';
      const toggle=document.querySelector(`[name="${fieldName}"]`);
      if(toggle){toggle.disabled=!enabled;if(!enabled)toggle.checked=false;}
      if(key==='appointment_booking')card.querySelectorAll('input,select,button').forEach(el=>{el.disabled=!enabled;});
      if(key==='product_showcase'){
        const add=document.getElementById('add-product');if(add)add.disabled=!enabled;
        document.getElementById('product-list')?.querySelectorAll('input,textarea,select,button').forEach(el=>{el.disabled=!enabled;});
      }
    });
  }

  function decorateServices(){
    const list=document.getElementById('service-list');
    const card=list?.closest('.tool-editor-card');
    if(!card)return false;
    const canUse=servicesAllowed();
    card.classList.toggle('locked',!canUse);
    let badge=card.querySelector('[data-services-tier-badge]');
    if(!badge){badge=document.createElement('span');badge.dataset.servicesTierBadge='true';card.querySelector('.tool-editor-head')?.appendChild(badge);}
    badge.className=`entitlement-badge ${canUse?'included':'locked'}`;
    badge.innerHTML=canUse?'<i data-lucide="circle-check" size="14"></i> Included':'<i data-lucide="lock" size="14"></i> Plus+';
    const toggle=card.querySelector('[name="services_enabled"]');const add=document.getElementById('add-service');
    if(toggle){toggle.disabled=!canUse;if(!canUse)toggle.checked=false;}if(add)add.disabled=!canUse;
    list.querySelectorAll('input,textarea,select,button').forEach(el=>{el.disabled=!canUse;});return true;
  }

  function decoratePaymentSharing(){
    const card=document.querySelector('.payment-sharing-editor');if(!card)return false;
    const canUse=paymentSharingAllowed();card.classList.toggle('locked',!canUse);card.dataset.entitlementCard='payment_sharing';
    let badge=card.querySelector('[data-entitlement-badge="payment_sharing"]')||card.querySelector('.entitlement-badge');
    if(badge){badge.dataset.entitlementBadge='payment_sharing';badge.className=`entitlement-badge ${canUse?'included':'locked'}`;badge.innerHTML=canUse?'<i data-lucide="circle-check" size="14"></i> Included':'<i data-lucide="lock" size="14"></i> Lite+';}
    const toggle=card.querySelector('[name="payment_sharing_enabled"]');if(toggle){toggle.disabled=!canUse;if(!canUse)toggle.checked=false;}
    card.querySelectorAll('.payment-sharing-fields input,.payment-sharing-fields select,.payment-sharing-fields button').forEach(el=>{el.disabled=!canUse;});return true;
  }

  function decorate(){decoratePlusCore();const ok=decorateServices()&&decoratePaymentSharing();if(window.lucide)try{lucide.createIcons();}catch(_){ }return ok;}
  document.addEventListener('click',event=>{if(!event.target.closest('#add-service')||servicesAllowed())return;event.preventDefault();event.stopImmediatePropagation();if(typeof toast==='function')toast('Services are included with Plus, Pro, and Agency plans.');},true);
  document.addEventListener('click',event=>{if(!event.target.closest('#add-product')||allowed('product_showcase'))return;event.preventDefault();event.stopImmediatePropagation();if(typeof toast==='function')toast('Products are included with Plus, Pro, and Agency plans.');},true);
  let attempts=0;const timer=setInterval(()=>{attempts+=1;if(access()&&decorate()){const list=document.getElementById('service-list');if(list)new MutationObserver(decorateServices).observe(list,{childList:true});const productList=document.getElementById('product-list');if(productList)new MutationObserver(decoratePlusCore).observe(productList,{childList:true});clearInterval(timer);}else if(attempts>60)clearInterval(timer);},250);
})();

/* cards-staging only: keep the live preview visible while the form moves. */
(function(){
  const version='20260816-preview-sticky-3';
  if(!document.querySelector('link[data-liw-preview-sticky]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`css/editor-preview-sticky-staging.css?v=${version}`;
    link.dataset.liwPreviewSticky='true';
    document.head.appendChild(link);
  }
})();

/* cards-staging only: make the real preview viewport-fixed on desktop and mobile. */
(function(){
  const version='20260816-preview-follow-2';
  if(!document.querySelector('script[data-liw-preview-follow]')){
    const script=document.createElement('script');
    script.src=`js/editor-preview-follow-staging.js?v=${version}`;
    script.defer=true;
    script.dataset.liwPreviewFollow='true';
    document.head.appendChild(script);
  }
})();

/* cards-staging GitHub Pages: load the redesigned Advanced Business Toolkit. */
(function(){
  const version='20260816-toolkit-freeze-fix-1';
  if(!document.querySelector('link[data-liw-business-toolkit]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href=`css/editor-business-toolkit.css?v=${version}`;link.dataset.liwBusinessToolkit='true';document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-liw-business-toolkit]')){
    const script=document.createElement('script');script.src=`js/editor-business-toolkit.js?v=${version}`;script.defer=true;script.dataset.liwBusinessToolkit='true';document.head.appendChild(script);
  }
})();

/* cards-staging only: compact the duplicated mobile editor intro. */
(function(){
  const version='20260816-mobile-intro-1';
  if(!document.querySelector('link[data-liw-mobile-editor-intro]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`css/editor-mobile-intro-staging.css?v=${version}`;
    link.dataset.liwMobileEditorIntro='true';
    document.head.appendChild(link);
  }
})();

/* cards-staging only: mirror the real Advanced + Beef Up card sections. */
(function(){
  const version='20260816-full-preview-mirror-2';
  if(!document.querySelector('link[data-liw-full-preview-mirror]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`css/editor-preview-full-mirror-staging.css?v=${version}`;
    link.dataset.liwFullPreviewMirror='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('script[data-liw-full-preview-mirror]')){
    const script=document.createElement('script');
    script.src=`js/editor-preview-full-mirror-staging.js?v=${version}`;
    script.defer=true;
    script.dataset.liwFullPreviewMirror='true';
    document.head.appendChild(script);
  }
})();

/* cards-staging only: guarantee the live card refreshes after every editor action. */
(function(){
  const version='20260816-preview-action-sync-2';
  if(!document.querySelector('script[data-liw-preview-action-sync]')){
    const script=document.createElement('script');
    script.src=`js/editor-live-preview-sync-staging.js?v=${version}`;
    script.defer=true;
    script.dataset.liwPreviewActionSync='true';
    document.head.appendChild(script);
  }
})();

/* cards-staging only: remove dark mode from the Connect & Platforms social picker. */
(function(){
  const version='20260816-social-light-1';
  if(!document.querySelector('link[data-liw-social-light]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`css/editor-social-light-staging.css?v=${version}`;
    link.dataset.liwSocialLight='true';
    document.head.appendChild(link);
  }
})();

/* cards-staging only: keep internal/test templates out of the customer template picker. */
(function(){
  const testName=/(^|[\s_-])test([\s_-]|$)/i;
  function removeTestTemplates(){
    const grid=document.getElementById('template-grid');
    if(!grid)return false;
    grid.querySelectorAll('.template-card').forEach(card=>{
      const name=String(card.querySelector('.template-card-label strong')?.textContent||'').trim();
      if(testName.test(name))card.remove();
    });
    grid.querySelectorAll('.template-tier-group').forEach(group=>{
      if(!group.querySelector('.template-card'))group.remove();
    });
    return true;
  }
  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    removeTestTemplates();
    if(attempts>=40)clearInterval(timer);
  },250);
  document.addEventListener('click',event=>{
    if(event.target.closest('.editor-tab[data-tab="design"],#template-grid'))setTimeout(removeTestTemplates,0);
  });
})();

/* cards-staging only: load the staging cleanup/fix bundle. */
(function(){
  const version='20260818-staging-fixes-9';
  if(!document.querySelector('script[data-liw-industry-covers]')){
    const script=document.createElement('script');
    script.src=`js/editor-industry-covers-staging.js?v=${version}`;
    script.defer=true;
    script.dataset.liwIndustryCovers='true';
    document.head.appendChild(script);
  }
})();

/* cards-staging only: preserve the optional one-product guest preview until Plus is activated. */
(function(){
  const version='20260824-guest-product-1';
  if(!document.querySelector('script[data-liw-guest-product]')){
    const script=document.createElement('script');
    script.src=`js/editor-guest-product-staging.js?v=${version}`;
    script.defer=true;
    script.dataset.liwGuestProduct='true';
    document.head.appendChild(script);
  }
})();

/* cards-staging only: upload the guest profile photo after account authentication. */
(function(){
  const version='20260825-guest-photo-1';
  if(!document.querySelector('script[data-liw-guest-photo]')){
    const script=document.createElement('script');
    script.src=`js/editor-guest-photo-staging.js?v=${version}`;
    script.defer=true;
    script.dataset.liwGuestPhoto='true';
    document.head.appendChild(script);
  }
})();
