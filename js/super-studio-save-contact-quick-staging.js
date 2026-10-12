/* LIW Cards staging — Super Studio Save Contact quick action. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_SAVE_CONTACT_QUICK__)return;
  window.__LIW_SUPER_STUDIO_SAVE_CONTACT_QUICK__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/card\.html$/i.test(location.pathname)))return;

  const q=(selector,root=document)=>root.querySelector(selector);
  let timer=0;
  let tries=0;

  function mount(){
    const root=q('#super-studio-public .super-studio-experience')||q('.super-studio-experience');
    if(!root)return false;
    const grid=q('.ss-app-screen[data-ss-screen="home"] .ss-quick-grid',root)||q('.ss-quick-grid',root);
    if(!grid)return false;
    if(q('[data-ss-home-action="save-contact"]',grid))return true;

    const button=document.createElement('button');
    button.type='button';
    button.className='ss-quick';
    button.dataset.ssHomeAction='save-contact';
    button.setAttribute('aria-label','Save contact');
    button.innerHTML='<i data-lucide="user-round-plus" aria-hidden="true"></i><span>Save Contact</span>';
    button.addEventListener('click',event=>{
      event.preventDefault();
      const save=q('#save');
      if(save){save.click();return;}
      try{window.saveVcard?.(window.publicCard||null);}catch(_){}
    });
    grid.appendChild(button);
    grid.classList.add('ss-home-contact-grid');
    if(window.lucide)try{lucide.createIcons({nodes:[button]});}catch(_){try{lucide.createIcons();}catch(__){}}
    return true;
  }

  function schedule(){
    clearInterval(timer);
    tries=0;
    timer=setInterval(()=>{
      tries+=1;
      if(mount()||tries>80)clearInterval(timer);
    },100);
  }

  document.addEventListener('liw:public-card-rendered',event=>{
    if(String(event.detail?.card?.card_experience||'').toLowerCase()==='super-studio')schedule();
  });
  document.addEventListener('liw:public-card-ready',event=>{
    if(String(event.detail?.card?.card_experience||'').toLowerCase()==='super-studio')schedule();
  });
  new MutationObserver(()=>requestAnimationFrame(mount)).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',schedule);
  setTimeout(schedule,0);
})();
