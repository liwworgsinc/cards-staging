/* LIW Cards staging — final Super Studio public/external-preview parity behavior. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_PREVIEW_PARITY_FINAL__)return;
  window.__LIW_SUPER_STUDIO_PREVIEW_PARITY_FINAL__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ICONS={
    'barber':'scissors',
    'hair stylist':'brush',
    'braider':'waves',
    'loctician':'waves',
    'nail technician':'paintbrush',
    'makeup artist':'palette',
    'lash technician':'eye',
    'brow artist':'scan-face',
    'esthetician':'sparkles',
    'tattoo artist':'pen-tool',
    'professional piercer':'circle-dot',
    'piercer':'circle-dot',
    'massage therapist':'hand-heart',
    'salon':'scissors',
    'spa':'flower-2',
    'other':'badge-check',
    'personal service professional':'badge-check'
  };

  function professionLabel(root){
    const chip=q('.ss-brand-chip',root);
    return String(chip?.dataset.ssProfessionLabel||chip?.textContent||'').trim();
  }
  function professionIcon(label){return ICONS[String(label||'').trim().toLowerCase()]||'badge-check';}

  function syncChip(chip,label,icon){
    if(!chip)return false;
    const currentIcon=q('[data-lucide]',chip)?.getAttribute('data-lucide')||'';
    const currentLabel=String(q('span',chip)?.textContent||'').trim();
    chip.dataset.ssProfessionLabel=label;
    chip.dataset.ssProfessionIcon=icon;
    if(currentIcon===icon&&currentLabel===label)return false;
    chip.innerHTML=`<i data-lucide="${icon}" aria-hidden="true"></i><span>${esc(label)}</span>`;
    return true;
  }

  function syncProfessionIcons(root){
    const chip=q('.ss-brand-chip',root);if(!chip)return false;
    const label=professionLabel(root)||'Professional';
    const icon=professionIcon(label);
    let changed=syncChip(chip,label,icon);
    qa('.ss-compact-profession',root).forEach(compact=>{if(syncChip(compact,label,icon))changed=true;});
    return changed;
  }

  function replaceLucideIcon(node,icon){
    if(!node)return false;
    if(node.getAttribute('data-lucide')===icon)return false;
    const replacement=document.createElement('i');
    replacement.setAttribute('data-lucide',icon);
    replacement.setAttribute('aria-hidden','true');
    node.replaceWith(replacement);
    return true;
  }

  function syncScreenIcons(root){
    const label=professionLabel(root);
    const icon=professionIcon(label);
    let changed=false;
    const servicesTitle=q('[data-ss-screen="services"] .ss-screen-title>i,[data-ss-screen="services"] .ss-screen-title>svg',root);
    if(replaceLucideIcon(servicesTitle,icon))changed=true;
    const serviceNav=q('[data-ss-app-screen="services"] i,[data-ss-app-screen="services"] svg',root);
    if(replaceLucideIcon(serviceNav,icon))changed=true;
    return changed;
  }

  function makeVideoPreviewSafe(root){
    const video=q('.ss-hero-video',root);if(!video)return;
    video.muted=true;video.defaultMuted=true;video.autoplay=true;video.loop=true;video.playsInline=true;video.preload='auto';
    video.setAttribute('muted','');video.setAttribute('autoplay','');video.setAttribute('loop','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');
    const tryPlay=()=>{
      if(root.classList.contains('ss-hero-collapsed'))return;
      try{const p=video.play();if(p&&typeof p.catch==='function')p.catch(()=>{});}catch(_){}
    };
    if(video.dataset.ssPreviewParityVideo!=='true'){
      video.dataset.ssPreviewParityVideo='true';
      for(const eventName of ['loadedmetadata','loadeddata','canplay'])video.addEventListener(eventName,tryPlay,{passive:true});
      const resume=()=>tryPlay();
      document.addEventListener('pointerdown',resume,{passive:true,once:true});
      document.addEventListener('touchstart',resume,{passive:true,once:true});
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tryPlay();});
    }
    tryPlay();
  }

  function enhance(root){
    if(!root?.classList?.contains('super-studio-experience'))return;
    if(root.closest('#super-studio-public'))root.dataset.ssPublicPreviewParity='true';
    const changed=syncProfessionIcons(root)|syncScreenIcons(root);
    makeVideoPreviewSafe(root);
    if(changed&&window.lucide)try{lucide.createIcons({nodes:[root]});}catch(_){try{lucide.createIcons();}catch(__){}}
  }

  function scan(){qa('.super-studio-experience').forEach(enhance);}
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-rendered',queue);
  document.addEventListener('liw:editor-card-hydrated',queue);
  window.addEventListener('pageshow',queue);
  scan();
})();
