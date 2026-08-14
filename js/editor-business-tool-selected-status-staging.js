/* LIW Cards — STAGING ONLY — 2026-08-14.
   Dedicated selection-status indicator for business tools.
   Green check = enabled/selected. Grey check = not selected.
   This is intentionally separate from entitlement/Included badges so plan
   availability can never override the customer's actual checkbox state. */
(function(){
  const STYLE_ID='staging-business-tool-selected-status-style-v2';
  const CARD_SELECTOR='#business-tools-content > .tool-editor-card';
  const TOOL_FIELDS={
    'services':{type:'checked',name:'services_enabled'},
    'appointment booking':{type:'checked',name:'booking_enabled'},
    'lead capture':{type:'checked',name:'lead_form_enabled'},
    'product showcase':{type:'checked',name:'products_enabled'},
    'share payment information':{type:'checked',name:'payment_sharing_enabled'},
    'payment link':{type:'value',name:'payment_url'}
  };

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .staging-selection-status{display:none}
      @media(max-width:760px){
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-selection-entitlement-hidden:not(.locked){display:none!important}
        ${CARD_SELECTOR} > .tool-editor-head .staging-selection-status{
          grid-column:3!important;
          justify-self:end!important;
          width:27px!important;
          min-width:27px!important;
          height:27px!important;
          padding:0!important;
          display:grid!important;
          place-items:center!important;
          border-radius:999px!important;
          font:900 15px/1 system-ui,sans-serif!important;
          transition:background .16s ease,border-color .16s ease,color .16s ease!important;
        }
        ${CARD_SELECTOR} > .tool-editor-head .staging-selection-status::after{content:'✓'!important}
        ${CARD_SELECTOR} > .tool-editor-head .staging-selection-status.is-selected{
          background:#dcf8ee!important;
          border:1px solid #bfeede!important;
          color:#078a68!important;
        }
        ${CARD_SELECTOR} > .tool-editor-head .staging-selection-status.is-not-selected{
          background:#f1f3f6!important;
          border:1px solid #d9dde5!important;
          color:#98a0ae!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cardTitle(card){
    return String(card.querySelector(':scope > .tool-editor-head h3')?.textContent||'').trim().toLowerCase();
  }

  function selectedFor(card){
    const config=TOOL_FIELDS[cardTitle(card)];
    if(!config)return null;
    const field=card.querySelector(`[name="${config.name}"]`) || document.querySelector(`[name="${config.name}"]`);
    if(!field)return false;
    return config.type==='checked' ? Boolean(field.checked) : Boolean(String(field.value||'').trim());
  }

  function ensureIndicator(card){
    const head=card.querySelector(':scope > .tool-editor-head');
    if(!head)return null;
    let indicator=head.querySelector(':scope > .staging-selection-status');
    if(indicator)return indicator;
    indicator=document.createElement('span');
    indicator.className='staging-selection-status is-not-selected';
    indicator.setAttribute('aria-hidden','true');
    const chevron=head.querySelector('.staging-simple-collapse-chevron,.staging-tool-card-toggle');
    if(chevron)head.insertBefore(indicator,chevron);
    else head.appendChild(indicator);
    return indicator;
  }

  function syncCard(card){
    const selected=selectedFor(card);
    if(selected===null)return;
    const head=card.querySelector(':scope > .tool-editor-head');
    if(!head)return;

    const entitlement=head.querySelector('.entitlement-badge');
    const locked=Boolean(entitlement?.classList.contains('locked'));

    /* Keep locked/upgrade state visible. For available tools, hide the old
       Included badge on mobile and use the dedicated selection check instead. */
    if(entitlement){
      entitlement.classList.remove('staging-mobile-status-ok','staging-tool-status-on','staging-tool-status-off');
      entitlement.classList.toggle('staging-selection-entitlement-hidden',!locked);
    }

    let indicator=head.querySelector(':scope > .staging-selection-status');
    if(locked){
      indicator?.remove();
      return;
    }

    indicator=indicator || ensureIndicator(card);
    if(!indicator)return;
    indicator.classList.toggle('is-selected',selected);
    indicator.classList.toggle('is-not-selected',!selected);
    indicator.setAttribute('title',selected?'Enabled':'Not selected');
  }

  function syncAll(){
    document.querySelectorAll(CARD_SELECTOR).forEach(syncCard);
  }

  function boot(){
    injectStyles();
    syncAll();

    document.addEventListener('change',event=>{
      if(event.target.matches('[name="services_enabled"],[name="booking_enabled"],[name="lead_form_enabled"],[name="products_enabled"],[name="payment_sharing_enabled"],[name="payment_url"]')){
        requestAnimationFrame(syncAll);
      }
    });
    document.addEventListener('input',event=>{
      if(event.target.matches('[name="payment_url"]'))requestAnimationFrame(syncAll);
    });
    document.addEventListener('click',event=>{
      if(event.target.closest('#show-business-tools,.editor-tab,[data-editor-jump]'))setTimeout(syncAll,80);
    });

    const content=document.getElementById('business-tools-content');
    if(content){
      const observer=new MutationObserver(()=>requestAnimationFrame(syncAll));
      observer.observe(content,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
