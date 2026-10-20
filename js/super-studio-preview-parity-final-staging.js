/* LIW Cards staging — final Super Studio public/external-preview parity behavior. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_PREVIEW_PARITY_FINAL__)return;
  window.__LIW_SUPER_STUDIO_PREVIEW_PARITY_FINAL__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const CUSTOM_PROFESSION_MAX=48;
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
    'other':'sparkles',
    'personal service professional':'sparkles'
  };
  let publicProfessionState={cardId:'',studioProfession:'',customProfession:''};

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

  function cleanCustomProfession(value){
    return String(value??'').trim().replace(/\s+/g,' ').slice(0,CUSTOM_PROFESSION_MAX);
  }
  function editorProfessionState(){
    try{
      const state=window.LIWSuperStudioEditor?.getState?.();
      return state&&typeof state==='object'?state:null;
    }catch(_){return null;}
  }
  function publicClient(){
    try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return null;}
  }
  async function loadPublicProfession(card){
    if(!card||String(card.card_experience||'').toLowerCase()!=='super-studio'||!card.id)return;
    const cardId=String(card.id);
    const client=publicClient();
    if(!client)return;
    try{
      const {data,error}=await client.from('super_studio_state_staging').select('data').eq('card_id',cardId).maybeSingle();
      if(error)throw error;
      const state=data?.data||{};
      publicProfessionState={
        cardId,
        studioProfession:String(state.studioProfession||''),
        customProfession:cleanCustomProfession(state.customProfession)
      };
      queue();
    }catch(error){console.warn('[Super Studio custom profession]',error);}
  }

  function stateForRoot(root){
    const editor=editorProfessionState();
    if(editor&&root.closest('#phone-preview'))return editor;
    if(root.closest('#super-studio-public'))return publicProfessionState;
    return editor||publicProfessionState;
  }
  function professionLabel(root){
    const chip=q('.ss-brand-chip',root);
    if(!chip)return '';
    const state=stateForRoot(root)||{};
    const custom=cleanCustomProfession(state.customProfession);
    if(String(state.studioProfession||'').toLowerCase()==='other'&&custom)return custom.toUpperCase();
    if(!chip.dataset.ssBaseProfessionLabel){
      chip.dataset.ssBaseProfessionLabel=String(chip.textContent||'').trim();
    }
    return String(chip.dataset.ssBaseProfessionLabel||chip.dataset.ssProfessionLabel||chip.textContent||'').trim();
  }
  function professionIcon(label){return ICONS[String(label||'').trim().toLowerCase()]||'sparkles';}

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
    if(!chip.dataset.ssBaseProfessionLabel)chip.dataset.ssBaseProfessionLabel=String(chip.textContent||'').trim();
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

  function syncEditorCustomProfession(){
    const center=q('#super-studio-control-center');
    if(!center)return false;
    const start=q('[data-ss-panel="start"]',center);
    if(!start)return false;
    const state=editorProfessionState()||{};
    const isOther=String(state.studioProfession||'').toLowerCase()==='other';
    let field=q('[data-ss-custom-profession-field]',start);
    if(!isOther){if(field)field.remove();return false;}
    if(!field){
      const profession=q('[data-ss-path="studioProfession"]',start)?.closest('.ss-field');
      if(!profession)return false;
      field=document.createElement('label');
      field.className='ss-field ss-custom-profession-field';
      field.dataset.ssCustomProfessionField='true';
      field.innerHTML=`<span>What do you do?</span><input class="input" data-ss-path="customProfession" maxlength="${CUSTOM_PROFESSION_MAX}" placeholder="Example: Tooth Gem Artist" aria-describedby="ss-custom-profession-help"><small id="ss-custom-profession-help">Shows at the top left of your card in ALL CAPS.</small>`;
      profession.insertAdjacentElement('afterend',field);
    }
    const input=q('[data-ss-path="customProfession"]',field);
    if(input&&document.activeElement!==input){
      const value=String(state.customProfession||'');
      if(input.value!==value)input.value=value;
    }
    return true;
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

  function scan(){
    syncEditorCustomProfession();
    qa('.super-studio-experience').forEach(enhance);
  }
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};
  ensureStyle();
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-rendered',event=>{void loadPublicProfession(event.detail?.card);queue();});
  document.addEventListener('liw:public-card-ready',event=>{void loadPublicProfession(event.detail?.card);});
  document.addEventListener('liw:editor-card-hydrated',queue);
  window.addEventListener('pageshow',queue);
  setTimeout(()=>{try{const card=typeof publicCard!=='undefined'?publicCard:window.publicCard;if(card)void loadPublicProfession(card);}catch(_){}},0);
  scan();
})();
