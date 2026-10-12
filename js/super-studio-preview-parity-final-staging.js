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

  function ensureStyle(){
    let link=q('link[data-liw-super-studio-preview-parity-final]');
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      link.dataset.liwSuperStudioPreviewParityFinal='true';
      document.head.appendChild(link);
    }
    const href='css/super-studio-preview-parity-final-staging.css?v=20261012-2';
    if(!String(link.getAttribute('href')||'').includes('20261012-2'))link.href=href;
  }

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

  function syncRoleIconTargets(root){
    const label=professionLabel(root);
    const icon=professionIcon(label);
    let changed=false;
    const selectors=[
      '[data-ss-screen="services"] .ss-screen-title>i',
      '[data-ss-screen="services"] .ss-screen-title>svg',
      '[data-ss-app-screen="services"] i',
      '[data-ss-app-screen="services"] svg',
      '[data-ss-nav="services"] i',
      '[data-ss-nav="services"] svg',
      '.ss-service-mark i',
      '.ss-service-mark svg'
    ];
    const seen=new Set();
    selectors.forEach(selector=>qa(selector,root).forEach(node=>{
      if(seen.has(node))return;
      seen.add(node);
      if(replaceLucideIcon(node,icon))changed=true;
    }));
    qa('.ss-service-mark',root).forEach(mark=>{
      mark.dataset.ssProfessionIcon=icon;
      if(!q('i,svg',mark)){
        mark.innerHTML=`<i data-lucide="${icon}" aria-hidden="true"></i>`;
        changed=true;
      }
    });
    return changed;
  }

  function parseColor(value){
    const raw=String(value||'').trim().toLowerCase();
    if(/^#[0-9a-f]{3}$/.test(raw))return raw.slice(1).split('').map(ch=>parseInt(ch+ch,16));
    if(/^#[0-9a-f]{6}$/.test(raw))return [parseInt(raw.slice(1,3),16),parseInt(raw.slice(3,5),16),parseInt(raw.slice(5,7),16)];
    const rgb=raw.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/);
    return rgb?[Number(rgb[1]),Number(rgb[2]),Number(rgb[3])]:null;
  }
  function onTheme(color){
    const rgb=parseColor(color);if(!rgb)return '#fff';
    const channels=rgb.map(value=>{const c=Math.max(0,Math.min(255,value))/255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);});
    const luminance=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];
    return luminance>.56?'#111318':'#fff';
  }
  function syncTheme(root){
    let primary=String(root.style.getPropertyValue('--ss-primary')||'').trim();
    if(!primary){try{primary=String(getComputedStyle(root).getPropertyValue('--ss-primary')||'').trim();}catch(_){}}
    if(!primary)return false;
    const foreground=onTheme(primary);
    const changed=root.dataset.ssThemeSynced!=='true'||root.style.getPropertyValue('--ss-accent').trim()!==primary||root.style.getPropertyValue('--ss-on-theme').trim()!==foreground;
    root.style.setProperty('--ss-accent',primary);
    root.style.setProperty('--ss-theme',primary);
    root.style.setProperty('--ss-on-theme',foreground);
    root.dataset.ssThemeSynced='true';
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
    let changed=syncTheme(root);
    if(syncProfessionIcons(root))changed=true;
    if(syncRoleIconTargets(root))changed=true;
    makeVideoPreviewSafe(root);
    if(changed&&window.lucide)try{lucide.createIcons({nodes:[root]});}catch(_){try{lucide.createIcons();}catch(__){}}
  }

  function scan(){qa('.super-studio-experience').forEach(enhance);}
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};
  ensureStyle();
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-rendered',queue);
  document.addEventListener('liw:editor-card-hydrated',queue);
  window.addEventListener('pageshow',queue);
  scan();
})();
