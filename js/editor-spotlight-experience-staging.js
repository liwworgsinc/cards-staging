/* LIW Cards staging — Spotlight editor adapter.
   Adds Spotlight beside Classic without changing Classic or template selection. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_SPOTLIGHT_EXPERIENCE__)return;
  window.__LIW_EDITOR_SPOTLIGHT_EXPERIENCE__=true;

  const VERSION='20261018-spotlight-1';
  const field=name=>document.querySelector(`[name="${name}"]`);
  const value=name=>String(field(name)?.value||'').trim();
  let syncQueued=false;
  let observer=null;

  function ensureStyle(){
    if(document.getElementById('liw-editor-spotlight-style'))return;
    const style=document.createElement('style');
    style.id='liw-editor-spotlight-style';
    style.textContent=`
      .card-experience-option[data-card-experience="spotlight"] .card-experience-number{background:linear-gradient(135deg,#0b1438,#d4a84f);color:#fff}
      .card-experience-option[data-card-experience="spotlight"].active{border-color:#d4a84f;box-shadow:0 0 0 3px rgba(212,168,79,.14)}
      .card-experience-option[data-card-experience="spotlight"] .spotlight-option-icon{display:inline-grid;place-items:center;width:20px;height:20px;margin-right:2px;vertical-align:-4px}
      .phone.spotlight-experience-selected .preview-cover{height:184px!important;overflow:visible!important}
      .phone.spotlight-experience-selected .preview-avatar{width:110px!important;height:110px!important;left:50%!important;bottom:-55px!important;transform:translateX(-50%)!important;border:4px solid #fff!important;border-radius:50%!important;box-shadow:0 12px 28px rgba(15,23,42,.22)!important;z-index:3!important}
      .phone.spotlight-experience-selected .spotlight-preview-logo-badge{position:absolute;left:calc(50% + 26px);bottom:-46px;width:44px;height:44px;z-index:5;display:grid;place-items:center;overflow:hidden;border:3px solid #fff;border-radius:50%;background:#fff;color:var(--preview-primary,#0b1438);box-shadow:0 8px 20px rgba(15,23,42,.2);font:900 .58rem/1 Manrope,system-ui;text-align:center}
      .phone.spotlight-experience-selected .spotlight-preview-logo-badge img{width:100%;height:100%;display:block;object-fit:cover;background:#fff}
      .phone.spotlight-experience-selected .spotlight-preview-logo-badge.is-initials{background:linear-gradient(145deg,#fff,color-mix(in srgb,var(--preview-primary,#0b1438) 9%,#fff))}
      .phone.spotlight-experience-selected .preview-content{padding-top:70px!important;text-align:center!important}
      .phone.spotlight-experience-selected .preview-content h2{font-size:1.38rem!important;letter-spacing:-.04em!important}
      .phone.spotlight-experience-selected .preview-company{display:inline-flex!important;width:auto!important;margin:2px auto 8px!important;padding:4px 8px!important;border-radius:999px!important;background:color-mix(in srgb,var(--preview-primary,#0b1438) 9%,transparent)!important;color:var(--preview-primary,#0b1438)!important;font-size:.58rem!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.035em!important}
      .phone.spotlight-experience-selected .preview-actions{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}
      .phone.spotlight-experience-selected .preview-action{min-width:0!important;border-radius:12px!important;background:linear-gradient(180deg,#fff,color-mix(in srgb,var(--preview-primary,#0b1438) 5%,#fff))!important;box-shadow:0 4px 12px rgba(15,23,42,.05)!important}
      .phone.spotlight-experience-selected .preview-public-section{border-radius:14px!important;background:color-mix(in srgb,var(--preview-primary,#0b1438) 4%,#fff)!important;box-shadow:0 5px 14px rgba(15,23,42,.035)!important}
      .spotlight-experience-note{margin-top:10px;padding:10px 12px;border:1px solid rgba(212,168,79,.28);border-radius:12px;background:#fffaf0;color:#5d4515;font-size:.72rem;line-height:1.45}
      .spotlight-experience-note strong{color:#382707}
    `;
    document.head.appendChild(style);
  }

  function currentExperience(){return value('card_experience').toLowerCase()||'classic';}

  function initials(text){
    const parts=String(text||'').trim().split(/\s+/).filter(Boolean);
    return parts.length?parts.slice(0,2).map(part=>part[0]).join('').toUpperCase():'LIW';
  }

  function ensureOption(){
    const section=document.getElementById('card-experience-section');
    if(!section)return false;
    const grid=section.querySelector('.card-experience-grid');
    if(!grid)return false;
    if(!grid.querySelector('[data-card-experience="spotlight"]')){
      const button=document.createElement('button');
      button.className='card-experience-option';
      button.type='button';
      button.dataset.cardExperience='spotlight';
      button.innerHTML=`
        <span class="card-experience-number">S</span>
        <strong><span class="spotlight-option-icon" aria-hidden="true"><i data-lucide="sparkles" size="17"></i></span> Spotlight</strong>
        <span>Classic with a twist — elevated cover, centered profile, attached logo badge and polished sections.</span>`;
      const classic=grid.querySelector('[data-card-experience="classic"]');
      if(classic?.nextSibling)grid.insertBefore(button,classic.nextSibling);
      else grid.prepend(button);
      button.addEventListener('click',selectSpotlight);
    }
    if(!section.querySelector('.spotlight-experience-note')){
      const note=document.createElement('p');
      note.className='spotlight-experience-note';
      note.innerHTML='<strong>Spotlight keeps Classic underneath.</strong> Your same contact actions, services, products, appointments, Share/QR and Wallet tools stay intact; only the presentation changes.';
      const gridNode=section.querySelector('.card-experience-grid');
      gridNode?.insertAdjacentElement('afterend',note);
    }
    window.lucide?.createIcons?.();
    return true;
  }

  function selectSpotlight(event){
    event?.preventDefault?.();
    const input=field('card_experience');
    if(!input)return;
    input.value='spotlight';
    const mode=field('color_mode');
    if(mode&&String(mode.value||'').toLowerCase()==='barbershop')mode.value='light';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    setTimeout(sync,0);
    setTimeout(sync,80);
    if(typeof toast==='function')toast('Spotlight selected — Classic core, fresh layout');
  }

  function syncPreviewBadge(){
    const phone=document.getElementById('phone-preview');
    const cover=document.getElementById('preview-cover');
    if(!phone||!cover)return;
    const active=currentExperience()==='spotlight';
    phone.classList.toggle('spotlight-experience-selected',active);
    phone.dataset.cardExperience=active?'spotlight':(phone.dataset.cardExperience||'classic');
    let badge=cover.querySelector('.spotlight-preview-logo-badge');
    if(!active){badge?.remove();return;}
    if(!badge){
      badge=document.createElement('div');
      badge.className='spotlight-preview-logo-badge';
      badge.setAttribute('aria-label','Business logo preview');
      cover.appendChild(badge);
    }
    const logo=value('qr_logo_url');
    if(logo){
      badge.classList.remove('is-initials');
      const img=badge.querySelector('img')||document.createElement('img');
      img.alt='Business logo';
      if(img.src!==logo)img.src=logo;
      if(!img.isConnected){badge.replaceChildren(img);}
    }else{
      badge.classList.add('is-initials');
      badge.textContent=initials(value('company_name')||value('full_name'));
    }
  }

  function syncRoadmap(){
    if(currentExperience()!=='spotlight')return;
    const copy=document.getElementById('roadmap-experience-copy');
    if(copy)copy.textContent='Spotlight selected';
    const step=document.querySelector('[data-design-jump="experience"] strong');
    if(step)step.textContent='Choose experience';
    const status=document.getElementById('design-roadmap-status');
    if(status&&value('template_id'))status.textContent='Spotlight · template selected';
    const badge=document.querySelector('#card-experience-section .entitlement-badge');
    if(badge){badge.classList.add('included');badge.textContent='Spotlight selected · Classic core';}
  }

  function sync(){
    syncQueued=false;
    ensureStyle();
    ensureOption();
    const active=currentExperience()==='spotlight';
    document.querySelectorAll('[data-card-experience]').forEach(button=>{
      if(button.dataset.cardExperience==='spotlight')button.classList.toggle('active',active);
      else if(active)button.classList.remove('active');
    });
    syncPreviewBadge();
    syncRoadmap();
  }

  function queueSync(){
    if(syncQueued)return;
    syncQueued=true;
    requestAnimationFrame(sync);
  }

  function wire(){
    document.addEventListener('input',event=>{
      if(event.target?.matches?.('[name="card_experience"],[name="company_name"],[name="full_name"],[name="qr_logo_url"]'))queueSync();
    });
    document.addEventListener('change',event=>{
      if(event.target?.matches?.('[name="card_experience"],[name="company_name"],[name="full_name"],[name="qr_logo_url"]'))queueSync();
    });
    document.addEventListener('liw:editor-card-hydrated',()=>{setTimeout(sync,0);setTimeout(sync,120);});
    document.addEventListener('click',event=>{
      if(event.target.closest?.('[data-card-experience]'))setTimeout(sync,0);
      if(event.target.closest?.('#qr-logo-file,#remove-qr-logo')){setTimeout(sync,350);setTimeout(sync,1200);}
    });

    const phone=document.getElementById('phone-preview');
    if(phone&&!observer){
      observer=new MutationObserver(()=>{
        if(currentExperience()==='spotlight'&&!phone.classList.contains('spotlight-experience-selected'))queueSync();
      });
      observer.observe(phone,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});
    }
  }

  function boot(){
    ensureStyle();
    wire();
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      sync();
      if(document.getElementById('card-experience-section')&&tries>20)clearInterval(timer);
      if(tries>=80)clearInterval(timer);
    },150);
    sync();
  }

  window.LIWSpotlightEditor={sync,select:selectSpotlight,version:VERSION};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
