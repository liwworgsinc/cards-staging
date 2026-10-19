/* LIW Cards staging — Spotlight mockup parity layer.
   Visual-only adapter scoped to Spotlight. It corrects the preview composition to
   the approved mockups without changing Classic or the shared editor data model. */
(function(){
  'use strict';
  if(window.__LIW_SPOTLIGHT_MOCKUP_PARITY__)return;
  window.__LIW_SPOTLIGHT_MOCKUP_PARITY__=true;

  const VERSION='20261019-spotlight-mockup-parity-1';
  const field=name=>document.querySelector(`[name="${name}"]`);
  const active=()=>String(field('card_experience')?.value||'').toLowerCase()==='spotlight';
  let queued=false;

  function ensureStyle(){
    if(document.getElementById('liw-spotlight-mockup-parity-style'))return;
    const style=document.createElement('style');
    style.id='liw-spotlight-mockup-parity-style';
    style.textContent=`
      /* Approved mockup direction: tall cover, offset profile, left identity, app-like content. */
      .phone.spotlight-experience-selected.spotlight-mockup-parity{--spotlight-mockup-gold:#d6aa52;--spotlight-mockup-ink:#0d1326;--spotlight-mockup-muted:#687083}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-card-scroll{background:var(--spotlight-bg,#fff)!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-cover{height:230px!important;overflow:visible!important;border-radius:0!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-cover:after{content:"";position:absolute;inset:auto 0 0;height:92px;background:linear-gradient(to bottom,transparent,rgba(3,7,18,.34));pointer-events:none}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-avatar{width:108px!important;height:108px!important;left:18px!important;bottom:-54px!important;transform:none!important;border:5px solid var(--spotlight-avatar-border-color,#fff)!important;box-shadow:0 15px 30px rgba(5,12,31,.28)!important;z-index:6!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .spotlight-preview-logo-badge{left:88px!important;bottom:-47px!important;width:39px!important;height:39px!important;border-width:3px!important;z-index:8!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-content{display:flex!important;flex-direction:column!important;padding:66px 14px 70px!important;text-align:left!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-content h2{order:1;margin:0!important;font-size:1.58rem!important;line-height:1.02!important;letter-spacing:-.045em!important;text-align:left!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-title{order:2;margin:4px 0 1px!important;font-size:.72rem!important;font-weight:800!important;text-align:left!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-company{order:3;display:block!important;width:auto!important;margin:0 0 6px!important;padding:0!important;background:transparent!important;color:var(--spotlight-primary)!important;font-size:.58rem!important;font-weight:900!important;letter-spacing:.07em!important;text-align:left!important;text-transform:uppercase!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-headline{order:4;margin:0 0 8px!important;color:var(--spotlight-mockup-muted)!important;font-size:.66rem!important;font-weight:700!important;text-align:left!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-actions{order:5;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;margin:7px 0 9px!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-action{min-height:50px!important;padding:7px 3px!important;border:0!important;border-radius:12px!important;color:#fff!important;box-shadow:0 7px 15px rgba(8,15,38,.12)!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-action:nth-child(1){background:#16a34a!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-action:nth-child(2){background:#2563eb!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-action:nth-child(3){background:#7c3aed!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-action:nth-child(4){background:var(--spotlight-mockup-gold)!important;color:#20170a!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-save-contact{display:none!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-business-actions{order:6;margin:0 0 7px!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-tools{order:7}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-social-section{order:8!important;margin:3px 0 8px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-social-section .preview-section-heading{display:none!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-socials{justify-content:flex-start!important;gap:6px!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-socials a,.phone.spotlight-experience-selected.spotlight-mockup-parity .preview-socials span{border-radius:50%!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-bio{order:9!important;display:block!important;margin:4px 0 10px!important;padding:14px 14px 15px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:16px!important;background:linear-gradient(145deg,#10172b,#080d1b)!important;color:#dce2ef!important;font-size:.67rem!important;line-height:1.5!important;box-shadow:0 10px 22px rgba(7,13,30,.16)!important;text-align:left!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-bio:before{content:"About Me";display:block;margin-bottom:5px;color:#fff;font-size:.78rem;font-weight:900;letter-spacing:-.01em}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-services-section{order:10!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-products-section{order:11!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-lead-section{order:12!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-public-section{border-radius:16px!important;text-align:left!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-services-section{padding:14px!important;background:#fff!important;border:1px solid rgba(14,24,52,.08)!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-services-section .preview-section-heading{margin-bottom:9px!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-services-section .preview-section-heading:after{content:"View All  ›";margin-left:auto;color:var(--spotlight-primary);font-size:.55rem;font-weight:900}
      .phone.spotlight-experience-selected.spotlight-mockup-parity #preview-services-section .preview-section-heading{display:flex!important;align-items:center!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .preview-branding{order:98!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .spotlight-preview-nav{order:99;position:sticky;bottom:0;z-index:20;display:grid;grid-template-columns:repeat(4,1fr);margin:14px -14px -70px;padding:7px 8px calc(8px + env(safe-area-inset-bottom));border-top:1px solid rgba(13,19,38,.09);background:color-mix(in srgb,var(--spotlight-bg,#fff) 94%,transparent);backdrop-filter:blur(14px);box-shadow:0 -8px 20px rgba(8,15,38,.06)}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .spotlight-preview-nav button{display:grid;place-items:center;gap:2px;padding:4px 1px;border:0;background:transparent;color:#7b8291;font-size:.46rem;font-weight:800}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .spotlight-preview-nav button:first-child{color:var(--spotlight-mockup-gold)}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .spotlight-preview-nav svg{width:14px;height:14px}
      .phone.spotlight-experience-selected.spotlight-mockup-parity .spotlight-preview-play{position:absolute;right:18px;bottom:18px;z-index:8;width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.65);border-radius:50%;background:rgba(7,13,30,.52);color:#fff;backdrop-filter:blur(8px);box-shadow:0 8px 20px rgba(0,0,0,.2)}
      .phone.spotlight-experience-selected.spotlight-mockup-parity[data-spotlight-mode="dark"] #preview-services-section{background:#131a2d!important;border-color:rgba(255,255,255,.08)!important}
      .phone.spotlight-experience-selected.spotlight-mockup-parity[data-spotlight-mode="dark"] .spotlight-preview-nav{background:rgba(11,16,32,.94);border-color:rgba(255,255,255,.08)}
      .phone.spotlight-experience-selected.spotlight-mockup-parity[data-spotlight-mode="dark"] .spotlight-preview-nav button{color:#aab3c4}
      .phone.spotlight-experience-selected.spotlight-mockup-parity[data-spotlight-mode="dark"] .spotlight-preview-nav button:first-child{color:var(--spotlight-mockup-gold)}
    `;
    document.head.appendChild(style);
  }

  function ensureNav(phone){
    const content=phone.querySelector('.preview-content');
    if(!content)return;
    let nav=content.querySelector('.spotlight-preview-nav');
    if(!nav){
      nav=document.createElement('div');
      nav.className='spotlight-preview-nav';
      nav.innerHTML=`
        <button type="button"><i data-lucide="home"></i><span>Home</span></button>
        <button type="button"><i data-lucide="briefcase-business"></i><span>Services</span></button>
        <button type="button"><i data-lucide="images"></i><span>Gallery</span></button>
        <button type="button"><i data-lucide="contact"></i><span>Contact</span></button>`;
      content.appendChild(nav);
    }
  }

  function ensurePlay(phone){
    const cover=phone.querySelector('.preview-cover');
    if(!cover)return;
    let play=cover.querySelector('.spotlight-preview-play');
    const hasVideo=Boolean(String(field('video_url')?.value||field('cover_video_url')?.value||'').trim());
    if(!hasVideo){play?.remove();return;}
    if(!play){
      play=document.createElement('span');
      play.className='spotlight-preview-play';
      play.innerHTML='<i data-lucide="play" size="17"></i>';
      cover.appendChild(play);
    }
  }

  function sync(){
    queued=false;
    ensureStyle();
    const phone=document.getElementById('phone-preview');
    if(!phone)return;
    const on=active();
    phone.classList.toggle('spotlight-mockup-parity',on);
    if(on){
      ensureNav(phone);
      ensurePlay(phone);
      const option=document.querySelector('[data-card-experience="spotlight"] > span:last-child');
      if(option)option.textContent='Classic with a twist — visual cover, offset profile, colored actions and premium app-style sections.';
      window.lucide?.createIcons?.();
    }else{
      phone.querySelector('.spotlight-preview-nav')?.remove();
      phone.querySelector('.spotlight-preview-play')?.remove();
    }
  }

  function queue(){if(queued)return;queued=true;requestAnimationFrame(sync)}

  function boot(){
    ensureStyle();
    document.addEventListener('input',event=>{if(event.target?.matches?.('[name="card_experience"],[name="video_url"],[name="cover_video_url"]'))queue()});
    document.addEventListener('change',event=>{if(event.target?.matches?.('[name="card_experience"],[name="video_url"],[name="cover_video_url"]'))queue()});
    document.addEventListener('liw:editor-card-hydrated',()=>setTimeout(sync,40));
    const root=document.body;
    new MutationObserver(queue).observe(root,{childList:true,subtree:true});
    [0,100,300,700,1400,2600].forEach(delay=>setTimeout(sync,delay));
  }

  window.LIWSpotlightMockupParity={sync,version:VERSION};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
