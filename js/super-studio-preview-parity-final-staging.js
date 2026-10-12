/* LIW Cards staging — final Super Studio public/external-preview parity behavior. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_PREVIEW_PARITY_FINAL__)return;
  window.__LIW_SUPER_STUDIO_PREVIEW_PARITY_FINAL__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
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

  function syncProfessionIcon(root){
    const chip=q('.ss-brand-chip',root);if(!chip)return;
    const label=professionLabel(root)||'Professional';
    const icon=professionIcon(label);
    chip.dataset.ssProfessionLabel=label;
    chip.dataset.ssProfessionIcon=icon;
    chip.innerHTML=`<i data-lucide="${icon}" aria-hidden="true"></i><span>${label.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>`;
    qa('.ss-compact-profession',root).forEach(compact=>{
      compact.dataset.ssProfessionLabel=label;
      compact.dataset.ssProfessionIcon=icon;
      compact.innerHTML=`<i data-lucide="${icon}" aria-hidden="true"></i><span>${label.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</span>`;
    });
  }

  function syncScreenIcons(root){
    const label=professionLabel(root);
    const icon=professionIcon(label);
    const servicesTitle=q('[data-ss-screen="services"] .ss-screen-title>i,[data-ss-screen="services"] .ss-screen-title>svg',root);
    if(servicesTitle?.tagName?.toLowerCase()==='i')servicesTitle.setAttribute('data-lucide',icon);
    const serviceNav=q('[data-ss-app-screen="services"] i',root);
    if(serviceNav)serviceNav.setAttribute('data-lucide',icon);
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
      for(const eventName of ['loadedmetadata','loadeddata','canplay','pageshow'])video.addEventListener(eventName,tryPlay,{passive:true});
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
    syncProfessionIcon(root);
    syncScreenIcons(root);
    makeVideoPreviewSafe(root);
    if(window.lucide)try{lucide.createIcons({nodes:[root]});}catch(_){try{lucide.createIcons();}catch(__){}}
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
