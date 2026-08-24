/* LIW Cards — STAGING ONLY: compact premium social platform selector. */
(function(){
  'use strict';

  const LABELS={instagram:'Instagram',facebook:'Facebook',whatsapp:'WhatsApp',linkedin:'LinkedIn',tiktok:'TikTok',youtube:'YouTube'};

  function injectStyles(){
    if(document.getElementById('liw-social-clean-staging-style'))return;
    const style=document.createElement('style');
    style.id='liw-social-clean-staging-style';
    style.textContent=`
      body.liw-social-clean-staging .social-quick-section{
        margin-top:18px!important;
        padding-top:18px!important;
        border-top:1px solid #e5e9f0!important;
      }
      body.liw-social-clean-staging .social-quick-section>.section-mini-heading{margin:0 0 11px!important}
      body.liw-social-clean-staging .social-quick-section>.section-mini-heading>div{display:flex!important;align-items:baseline!important;gap:9px!important;flex-wrap:wrap!important}
      body.liw-social-clean-staging .social-quick-section>.section-mini-heading h3{margin:0!important;color:#0b1438!important;font-size:1.03rem!important;line-height:1.2!important;letter-spacing:-.025em!important}
      body.liw-social-clean-staging .social-quick-section>.section-mini-heading h3 span{display:inline-flex!important;margin-left:5px!important;padding:3px 7px!important;border:1px solid #e8dcc0!important;border-radius:999px!important;background:#fff9ea!important;color:#806125!important;font-size:.55rem!important;line-height:1!important;font-weight:900!important;letter-spacing:.05em!important;text-transform:uppercase!important;vertical-align:middle!important}
      body.liw-social-clean-staging .social-quick-section>.section-mini-heading p{width:100%!important;margin:3px 0 0!important;color:#778095!important;font-size:.72rem!important;line-height:1.35!important}

      body.liw-social-clean-staging #social-quick-add{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:7px!important;margin:0!important}
      body.liw-social-clean-staging #social-quick-add button{position:relative!important;min-width:0!important;min-height:52px!important;padding:8px 7px!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:6px!important;border:1px solid #e0e5ed!important;border-radius:13px!important;background:linear-gradient(180deg,#fff,#fbfcfe)!important;color:#263249!important;box-shadow:0 4px 12px rgba(11,20,56,.035)!important;font-size:.64rem!important;font-weight:850!important;line-height:1!important;cursor:pointer!important;transition:.14s ease!important}
      body.liw-social-clean-staging #social-quick-add button:hover{transform:translateY(-1px)!important;border-color:#cfb46e!important;box-shadow:0 7px 16px rgba(11,20,56,.07)!important}
      body.liw-social-clean-staging #social-quick-add button:focus-visible{outline:3px solid rgba(212,168,79,.18)!important;outline-offset:2px!important}
      body.liw-social-clean-staging #social-quick-add button>.social-brand-icon,
      body.liw-social-clean-staging #social-quick-add button>.quick-social-brand-icon,
      body.liw-social-clean-staging #social-quick-add button>.liw-supericon-mark,
      body.liw-social-clean-staging #social-quick-add button>svg{width:19px!important;height:19px!important;flex:0 0 19px!important}
      body.liw-social-clean-staging #social-quick-add button>span:last-child{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}

      body.liw-social-clean-staging #social-more-trigger{width:auto!important;min-height:34px!important;margin:9px 0 0!important;padding:7px 10px!important;display:inline-flex!important;justify-content:flex-start!important;border-style:solid!important;border-color:#dde3ec!important;border-radius:10px!important;background:#f8fafc!important;color:#0b1438!important;box-shadow:none!important;font-size:.68rem!important}
      body.liw-social-clean-staging #social-more-trigger:hover{background:#fff9ea!important;border-color:#d8c58d!important;transform:none!important}
      body.liw-social-clean-staging #social-more-trigger small{color:#7c8495!important;font-size:.6rem!important}
      body.liw-social-clean-staging #add-social{display:none!important}
      body.liw-social-clean-staging .social-appearance-details{margin-top:10px!important}
      body.liw-social-clean-staging #social-list:not(:empty){margin-top:12px!important}
      body.liw-social-clean-staging .social-quick-section+.social-appearance-details~.input-help{color:#8a92a3!important;font-size:.68rem!important}

      @media(max-width:900px){body.liw-social-clean-staging #social-quick-add{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(max-width:560px){
        body.liw-social-clean-staging .social-quick-section{margin-top:14px!important;padding-top:14px!important}
        body.liw-social-clean-staging #social-quick-add{display:flex!important;gap:7px!important;overflow-x:auto!important;scroll-snap-type:x proximity!important;scrollbar-width:none!important;padding:0 1px 4px!important}
        body.liw-social-clean-staging #social-quick-add::-webkit-scrollbar{display:none!important}
        body.liw-social-clean-staging #social-quick-add button{flex:0 0 88px!important;min-width:88px!important;min-height:54px!important;scroll-snap-align:start!important}
        body.liw-social-clean-staging #social-more-trigger small{display:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function cleanQuickButtons(){
    const grid=document.getElementById('social-quick-add');
    if(!grid)return false;

    grid.querySelectorAll('[data-quick-social]').forEach(button=>{
      const key=String(button.dataset.quickSocial||'').toLowerCase();
      const label=LABELS[key]||key;
      const supericons=window.LIWSupericons;
      const hasVerifiedSupericon=Boolean(supericons?.brands?.[key]&&typeof supericons.brandMark==='function');

      /* Stay idempotent so the Supericons and layout observers never fight. */
      if(button.dataset.liwQuickClean==='true'){
        if(!hasVerifiedSupericon||button.querySelector(':scope > .liw-supericon-mark'))return;
      }

      let icon='';
      try{
        if(hasVerifiedSupericon){
          icon=supericons.brandMark(key,19);
          button.dataset.supericonProfessional='true';
          button.style.setProperty('--brand',supericons.brands[key].color||'currentColor');
        }else if(typeof window.socialIconHtml==='function'){
          icon=window.socialIconHtml(key,{size:19});
        }
      }catch(_){ }
      if(!icon){
        const meta=typeof window.socialMeta==='function'?window.socialMeta(key):null;
        if(meta?.paths?.length){
          const paths=meta.paths.map(path=>`<path d="${path}"></path>`).join('');
          icon=`<svg class="quick-social-brand-icon" viewBox="${meta.viewBox}" aria-hidden="true" focusable="false" style="color:${meta.color};fill:currentColor">${paths}</svg>`;
        }
      }
      if(!icon)return;
      button.innerHTML=`${icon}<span>${label}</span>`;
      button.setAttribute('aria-label',`Add ${label}`);
      button.dataset.liwQuickClean='true';
    });
    return true;
  }

  function polishHeading(){
    const section=document.querySelector('.social-quick-section');
    if(!section)return;
    const h3=section.querySelector('.section-mini-heading h3');
    const p=section.querySelector('.section-mini-heading p');
    if(h3)h3.innerHTML='Connect your platforms <span>Optional</span>';
    if(p)p.textContent='Choose the platforms you actually use. Add the profile link after you select one.';
  }

  function polishMoreButton(){
    const button=document.getElementById('social-more-trigger');
    if(!button)return;
    if(button.dataset.liwMorePolished==='true')return;
    button.innerHTML='<i data-lucide="grid-3x3" size="15"></i><span>More platforms</span><small>Music, creator, developer + more</small>';
    button.dataset.liwMorePolished='true';
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function apply(){
    document.body.classList.add('liw-social-clean-staging');
    injectStyles();
    polishHeading();
    cleanQuickButtons();
    polishMoreButton();
    window.LIWSupericons?.refresh?.();
  }

  function init(){
    apply();
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      apply();
      if(tries>=24)clearInterval(timer);
    },250);

    const grid=document.getElementById('social-quick-add');
    if(grid){
      const observer=new MutationObserver(()=>requestAnimationFrame(cleanQuickButtons));
      observer.observe(grid,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();