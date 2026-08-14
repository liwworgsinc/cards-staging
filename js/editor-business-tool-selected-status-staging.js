/* LIW Cards — STAGING ONLY — 2026-08-14.
   Makes business-tool header status reflect the customer's actual selection:
   green check when enabled, grey check when not selected. Locked entitlement
   badges retain their existing locked styling. */
(function(){
  const STYLE_ID='staging-business-tool-selected-status-style';
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
      @media(max-width:760px){
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-tool-status-on:not(.locked){
          width:27px!important;
          min-width:27px!important;
          height:27px!important;
          padding:0!important;
          display:grid!important;
          place-items:center!important;
          border-radius:999px!important;
          font-size:0!important;
          overflow:hidden!important;
          background:#dcf8ee!important;
          border:1px solid #bfeede!important;
          color:#078a68!important;
        }
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-tool-status-off:not(.locked){
          width:27px!important;
          min-width:27px!important;
          height:27px!important;
          padding:0!important;
          display:grid!important;
          place-items:center!important;
          border-radius:999px!important;
          font-size:0!important;
          overflow:hidden!important;
          background:#f1f3f6!important;
          border:1px solid #d9dde5!important;
          color:#98a0ae!important;
        }
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-tool-status-on:not(.locked) > *,
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-tool-status-off:not(.locked) > *{display:none!important}
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-tool-status-on:not(.locked)::after,
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-tool-status-off:not(.locked)::after{
          content:'✓'!important;
          font:900 15px/1 system-ui,sans-serif!important;
        }
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-tool-status-on:not(.locked)::after{color:#078a68!important}
        ${CARD_SELECTOR} > .tool-editor-head .entitlement-badge.staging-tool-status-off:not(.locked)::after{color:#98a0ae!important}
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
    if(config.type==='checked')return Boolean(field.checked);
    return Boolean(String(field.value||'').trim());
  }

  function ensureServicesBadge(card){
    if(cardTitle(card)!=='services')return null;
    const head=card.querySelector(':scope > .tool-editor-head');
    if(!head)return null;
    let badge=head.querySelector('.staging-services-status');
    if(!badge){
      badge=document.createElement('span');
      badge.className='entitlement-badge included staging-services-status';
      badge.innerHTML='<i data-lucide="check-circle-2" size="15"></i><span>Enabled</span>';
      const chevron=head.querySelector('.staging-simple-collapse-chevron,.staging-tool-card-toggle');
      if(chevron)head.insertBefore(badge,chevron);
      else head.appendChild(badge);
    }
    return badge;
  }

  function syncCard(card){
    const selected=selectedFor(card);
    if(selected===null)return;
    const head=card.querySelector(':scope > .tool-editor-head');
    if(!head)return;
    const badge=ensureServicesBadge(card) || head.querySelector('.entitlement-badge');
    if(!badge || badge.classList.contains('locked'))return;

    badge.classList.toggle('staging-tool-status-on',selected);
    badge.classList.toggle('staging-tool-status-off',!selected);
    badge.setAttribute('aria-label',selected?'Enabled':'Not selected');
    badge.setAttribute('title',selected?'Enabled':'Not selected');
  }

  function syncAll(){
    document.querySelectorAll(CARD_SELECTOR).forEach(syncCard);
    if(window.lucide)window.lucide.createIcons();
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
      if(event.target.closest('#show-business-tools,.editor-tab,[data-editor-jump]'))setTimeout(syncAll,60);
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
