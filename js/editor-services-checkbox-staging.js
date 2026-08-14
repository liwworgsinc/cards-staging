/* LIW Cards — STAGING ONLY — 2026-08-14.
   Makes Services match the other business-tool cards: no header slider,
   a normal checkbox inside the opened card, and a compact availability badge
   in the header. The original services_enabled input is moved, not duplicated,
   so existing save/render listeners keep working. */
(function(){
  const CARD_SELECTOR='#business-tools-content > .tool-editor-card';

  function findServicesCard(){
    return [...document.querySelectorAll(CARD_SELECTOR)].find(card=>
      String(card.querySelector(':scope > .tool-editor-head h3')?.textContent||'').trim().toLowerCase()==='services'
    )||null;
  }

  function mount(){
    const card=findServicesCard();
    if(!card)return;
    const head=card.querySelector(':scope > .tool-editor-head');
    if(!head)return;

    if(!head.querySelector('.staging-services-status')){
      const badge=document.createElement('span');
      badge.className='entitlement-badge included staging-services-status';
      badge.innerHTML='<i data-lucide="check-circle-2" size="15"></i><span>Enabled</span>';
      const chevron=head.querySelector('.staging-simple-collapse-chevron,.staging-tool-card-toggle');
      if(chevron)head.insertBefore(badge,chevron);
      else head.appendChild(badge);
    }

    if(!card.querySelector(':scope > .staging-services-checkbox')){
      const oldSwitch=head.querySelector(':scope > label.switch');
      const input=oldSwitch?.querySelector('input[name="services_enabled"]') || head.querySelector('input[name="services_enabled"]');
      if(input){
        const label=document.createElement('label');
        label.className='checkbox staging-services-checkbox';
        label.appendChild(input);
        label.appendChild(document.createTextNode(' Show services on public card'));

        const premium=card.querySelector(':scope > .staging-business-premium-options');
        if(premium)card.insertBefore(label,premium);
        else head.insertAdjacentElement('afterend',label);

        if(oldSwitch && oldSwitch.isConnected)oldSwitch.remove();
      }
    }

    if(window.lucide)window.lucide.createIcons();
  }

  function boot(){
    mount();
    const content=document.getElementById('business-tools-content');
    if(content){
      const observer=new MutationObserver(()=>mount());
      observer.observe(content,{childList:true,subtree:false});
    }
    document.addEventListener('click',event=>{
      if(event.target.closest('#show-business-tools,.editor-tab,[data-editor-jump]'))setTimeout(mount,40);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
