(function(){
  function loadArtistDressingRoom(){
    if(!document.querySelector('link[data-liw-artist-dressing-room]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='css/editor-artist-dressing-room-staging.css?v=20260904-dressing-room-2';
      link.dataset.liwArtistDressingRoom='true';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-liw-artist-dressing-room]')){
      const script=document.createElement('script');
      script.src='js/editor-artist-dressing-room-staging.js?v=20260904-dressing-room-1';
      script.defer=true;
      script.dataset.liwArtistDressingRoom='true';
      document.body.appendChild(script);
    }
    if(!document.querySelector('script[data-liw-artist-native-merch]')){
      const script=document.createElement('script');
      script.src='js/editor-artist-merch-staging.js?v=20260904-native-merch-1';
      script.defer=true;
      script.dataset.liwArtistNativeMerch='true';
      document.body.appendChild(script);
    }
    if(!window.__LIW_ARTIST_GLAM_RADIO_FIX__){
      window.__LIW_ARTIST_GLAM_RADIO_FIX__=true;
      const glamIndex={nova_violet:0,gold_luxe:1,rose_chrome:2,ice_blue:3};
      const syncGlamRadios=()=>{
        const radios=Array.from(document.querySelectorAll('#artist-dressing-room [data-artist-field="glam_preset"]'));
        if(radios.length<4)return;
        const index=glamIndex[radios[0].value]??0;
        radios.forEach((radio,i)=>{radio.checked=i===index;});
      };
      document.addEventListener('input',event=>{
        const radio=event.target?.closest?.('#artist-dressing-room [data-artist-field="glam_preset"]');
        if(!radio)return;
        const radios=Array.from(document.querySelectorAll('#artist-dressing-room [data-artist-field="glam_preset"]'));
        if(radios[0])radios[0].value=radio.value;
        const index=glamIndex[radio.value]??0;
        radios.forEach((item,i)=>{item.checked=i===index;});
      },true);
      setInterval(syncGlamRadios,500);
    }
  }
  loadArtistDressingRoom();

  function getAccess(){
    try{return typeof editorAccess!=='undefined'?editorAccess:null;}catch(_){return null;}
  }

  function allowed(){
    const access=getAccess();
    if(!access)return false;
    return Boolean(access.has?.('flow_experience')||(access.isAdmin&&!access.isPlanPreview));
  }

  function currentValue(){
    const experience=document.querySelector('[name="card_experience"]');
    const stored=String(experience?.value||'').toLowerCase();
    if(stored==='music')return 'music';
    if(stored==='flow')return 'flow';
    const legacyLayout=String(document.querySelector('[name="card_layout"]')?.value||'').toLowerCase();
    return legacyLayout==='swipe'?'flow':'classic';
  }

  function ensurePreviewStyle(){
    if(document.getElementById('liw-flow-editor-preview-style'))return;
    const style=document.createElement('style');
    style.id='liw-flow-editor-preview-style';
    style.textContent=`
      .preview-swipe-note,.preview-music-note{display:none;margin:8px 12px 0;padding:9px 10px;border-radius:12px;color:#fff;box-shadow:0 8px 18px rgba(7,16,46,.18);font-size:.66rem;text-align:left}
      .preview-swipe-note{background:linear-gradient(135deg,#07102e,#132552)}
      .preview-music-note{background:radial-gradient(circle at 88% 10%,rgba(124,58,237,.35),transparent 30%),linear-gradient(145deg,#05060c,#111329)}
      .phone.preview-swipe-selected .preview-swipe-note,.phone.preview-music-selected .preview-music-note{display:grid;gap:7px}
      .preview-flow-state-row,.preview-music-state-row{display:flex;align-items:center;gap:5px;overflow:hidden}
      .preview-flow-state-row strong,.preview-music-state-row strong{flex:0 0 auto;padding:4px 7px;border-radius:999px;font-size:.57rem;letter-spacing:.06em}
      .preview-flow-state-row strong{background:#d4a84f;color:#07102e}
      .preview-music-state-row strong{background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff}
      .preview-flow-state-row span,.preview-music-state-row span{flex:0 0 auto;padding:4px 7px;border-radius:999px;background:rgba(255,255,255,.10);font-size:.57rem;font-weight:800}
      .preview-flow-state-row span:first-of-type,.preview-music-state-row span:first-of-type{background:#fff;color:#07102e}
      .preview-flow-state-copy,.preview-music-state-copy{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#d9deef;font-size:.58rem;line-height:1.3}
      .preview-flow-state-copy b{color:#f0cf78;font-weight:900;white-space:nowrap}
      .preview-music-state-copy b{color:#c4b5fd;font-weight:900;white-space:nowrap}
      .phone.preview-swipe-selected .preview-content,.phone.preview-music-selected .preview-content{position:relative}
      .phone.preview-swipe-selected .preview-public-section{border-radius:12px;box-shadow:inset 0 0 0 1px rgba(11,20,56,.05)}
      .phone.preview-music-selected{background:#070911!important;color:#fff!important}
      .phone.preview-music-selected .preview-cover{box-shadow:inset 0 -58px 64px rgba(4,5,12,.48)}
      .phone.preview-music-selected .preview-name{color:#fff!important}
      .phone.preview-music-selected .preview-title,.phone.preview-music-selected .preview-company{color:#c4b5fd!important}
      .phone.preview-music-selected .preview-action,.phone.preview-music-selected .preview-public-section{background:#10131d!important;border-color:rgba(255,255,255,.08)!important;color:#f7f7fb!important}
      .card-experience-save-row{display:none}
      .card-experience-section .card-experience-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      .card-experience-option[data-card-experience="music"] .card-experience-number{background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff}
      .card-experience-option[data-card-experience="music"].active{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.10)}
      @media(max-width:720px){.card-experience-section .card-experience-grid{grid-template-columns:1fr}}
      @media (min-width:901px){
        .card-experience-section{margin-top:22px!important}
        .card-experience-save-row{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:18px;padding:15px 0 2px;border-top:1px solid rgba(11,20,56,.08)}
        .card-experience-save-copy{display:grid;gap:3px;min-width:0}
        .card-experience-save-copy strong{color:#0b1438;font-size:.78rem;font-weight:900}
        .card-experience-save-copy span{color:#667085;font-size:.68rem;line-height:1.4}
        .card-experience-save-now{flex:0 0 auto;min-width:126px;justify-content:center}
        .card-experience-save-now.is-saved{background:#eef8f1!important;border-color:#b9ddc3!important;color:#176c38!important}
      }
    `;
    document.head.appendChild(style);
  }

  function syncPreview(value){
    const phone=document.getElementById('phone-preview');
    if(!phone)return;
    ensurePreviewStyle();
    const isFlow=value==='flow';
    const isMusic=value==='music';
    phone.classList.toggle('preview-swipe-selected',isFlow);
    phone.classList.toggle('preview-music-selected',isMusic);
    phone.dataset.cardExperience=value;
    let flowNote=phone.querySelector('.preview-swipe-note');
    if(!flowNote){
      flowNote=document.createElement('div');
      flowNote.className='preview-swipe-note';
      phone.querySelector('.preview-card-scroll')?.prepend(flowNote);
    }
    flowNote.innerHTML=isFlow
      ? '<div class="preview-flow-state-row"><strong>FLOW</strong><span>About</span><span>Services</span><span>Connect</span></div><div class="preview-flow-state-copy"><span>Fixed identity + swipe-style sections</span><b>Flow active</b></div>'
      : '';
    flowNote.hidden=!isFlow;

    let musicNote=phone.querySelector('.preview-music-note');
    if(!musicNote){
      musicNote=document.createElement('div');
      musicNote.className='preview-music-note';
      phone.querySelector('.preview-card-scroll')?.prepend(musicNote);
    }
    musicNote.innerHTML=isMusic
      ? '<div class="preview-music-state-row"><strong>MUSIC</strong><span>Listen</span><span>Shows</span><span>Merch</span></div><div class="preview-music-state-copy"><span>Nova Luxe artist experience + Dressing Room controls</span><b>Music active</b></div>'
      : '';
    musicNote.hidden=!isMusic;
  }

  function syncAccessUi(){
    const canFlow=allowed();
    const section=document.getElementById('card-experience-section');
    const flowButton=section?.querySelector('[data-card-experience="flow"]');
    const badge=section?.querySelector('.entitlement-badge');
    if(flowButton){
      flowButton.disabled=!canFlow;
      flowButton.classList.toggle('locked',!canFlow);
      flowButton.setAttribute('aria-disabled',canFlow?'false':'true');
      flowButton.title=canFlow?'Use the Flow card experience':'Flow is included with Pro and Agency plans';
    }
    if(badge){
      badge.className=`entitlement-badge ${canFlow?'included':'locked'}`;
      badge.textContent=canFlow?'Flow Pro+ · Music available':'Music available · Flow Pro+';
    }
    section?.classList.toggle('flow-unlocked',canFlow);
    return canFlow;
  }

  function refresh(){
    let value=currentValue();
    const canFlow=syncAccessUi();
    if(value==='flow'&&!canFlow){
      const input=document.querySelector('[name="card_experience"]');
      if(input)input.value='classic';
      value='classic';
    }
    document.querySelectorAll('[data-card-experience]').forEach(button=>button.classList.toggle('active',button.dataset.cardExperience===value));
    syncPreview(value);
  }

  function selectExperience(value){
    const input=document.querySelector('[name="card_experience"]');
    if(!input)return;
    if(value==='flow'&&!allowed()){
      if(typeof toast==='function')toast('Flow is included with Pro and Agency plans.');
      syncAccessUi();
      return;
    }
    if(!['classic','flow','music'].includes(value))return;
    input.value=value;
    refresh();
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    const label=value==='flow'?'Flow':value==='music'?'Music':'Classic';
    if(typeof toast==='function')toast(`${label} selected — autosave started`);
  }

  async function saveExperienceNow(button){
    if(!button||button.disabled)return;
    const normal='<i data-lucide="save" size="15"></i> Save now';
    button.disabled=true;
    button.classList.remove('is-saved');
    button.innerHTML='<i data-lucide="loader-circle" size="15"></i> Saving…';
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    try{
      if(typeof flushSave==='function'){
        await flushSave({force:true,silent:false});
      }else{
        const topSave=document.getElementById('save-now-button');
        if(topSave)topSave.click();
      }
      button.classList.add('is-saved');
      button.innerHTML='<i data-lucide="check" size="15"></i> Saved';
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
      setTimeout(()=>{
        button.classList.remove('is-saved');
        button.innerHTML=normal;
        if(window.lucide)try{lucide.createIcons();}catch(_){ }
      },1200);
    }catch(error){
      button.innerHTML=normal;
      if(typeof toast==='function')toast(error?.message||'Unable to save right now. Your change is still in the editor.');
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }finally{
      button.disabled=false;
    }
  }

  function build(){
    if(document.getElementById('card-experience-section'))return true;
    const design=document.querySelector('.editor-panel[data-panel="design"]');
    if(!design)return false;
    const templateSection=design.querySelector('.form-section');
    if(!templateSection)return false;

    ensurePreviewStyle();
    const section=document.createElement('div');
    section.className='form-section card-experience-section';
    section.id='card-experience-section';
    section.innerHTML=`
      <div class="feature-section-heading">
        <div><h3>Choose the card experience</h3><p class="muted">Keep the selected template design and choose how customers move through it.</p></div>
        <span class="entitlement-badge">Checking</span>
      </div>
      <div class="card-experience-grid">
        <button class="card-experience-option" type="button" data-card-experience="classic">
          <span class="card-experience-number">A</span>
          <strong><i data-lucide="rows-3" size="17"></i> Classic</strong>
          <span>The familiar vertical card. Customers scroll naturally from top to bottom.</span>
        </button>
        <button class="card-experience-option" type="button" data-card-experience="flow">
          <span class="card-experience-pro">PRO+</span>
          <span class="card-experience-number">B</span>
          <strong><i data-lucide="gallery-horizontal-end" size="17"></i> Flow</strong>
          <span>Your app-like premium experience. Identity stays fixed while business sections move left and right.</span>
        </button>
        <button class="card-experience-option" type="button" data-card-experience="music">
          <span class="card-experience-number">C</span>
          <strong><i data-lucide="music-2" size="17"></i> Music</strong>
          <span>Artist-first Nova Luxe experience for releases, videos, shows, merch, fan club, EPK, booking and socials.</span>
        </button>
      </div>
      <p class="card-experience-note"><strong>Template stays intact:</strong> your cover, colors, profile photo and content remain yours. Music adds its own Artist Dressing Room inside Advanced Design.</p>
      <div class="card-experience-save-row">
        <div class="card-experience-save-copy"><strong>Done choosing your experience?</strong><span>Save Classic, Flow or Music immediately without scrolling back to the top.</span></div>
        <button class="btn btn-primary btn-sm card-experience-save-now" id="card-experience-save-now" type="button"><i data-lucide="save" size="15"></i> Save now</button>
      </div>`;
    templateSection.insertAdjacentElement('afterend',section);

    section.querySelectorAll('[data-card-experience]').forEach(button=>button.addEventListener('click',()=>selectExperience(button.dataset.cardExperience)));
    section.querySelector('#card-experience-save-now')?.addEventListener('click',event=>saveExperienceNow(event.currentTarget));
    document.querySelector('[name="card_experience"]')?.addEventListener('change',refresh);
    document.querySelector('[name="card_experience"]')?.addEventListener('input',refresh);

    refresh();
    if(window.lucide)lucide.createIcons();
    return true;
  }

  window.LIWFlowExperience={refresh,currentValue,syncAccessUi};

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    build();
    refresh();
    if(getAccess()&&attempts>8)clearInterval(timer);
    if(attempts>80)clearInterval(timer);
  },250);
  build();
})();