/* LIW Cards staging — Realtor Experience V2.
   Same LIW card engine, Realtor-specific editor + real-estate storefront preview.
   Event-driven: no background polling, no unsafe upserts, no blank-state saves during hydration. */
(function(){
  'use strict';
  if(window.__LIW_REALTOR_V2__)return;
  window.__LIW_REALTOR_V2__=true;

  const staging=location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/');
  if(!staging||!location.pathname.toLowerCase().endsWith('/editor.html'))return;

  const LEGACY_REALTOR_TEMPLATE_ID='f3cede58-2d8c-49d1-872c-2f92784b66ba';
  const STATUS={for_sale:'For Sale',new_listing:'New Listing',coming_soon:'Coming Soon',open_house:'Open House',pending:'Pending',sold:'Sold'};
  const PRESETS={
    classic:{label:'Classic',description:'Polished + timeless',dark:'#101114',accent:'#c6a15b',surface:'#f8f5ee',ink:'#15171b'},
    flow:{label:'Flow',description:'Smooth + modern',dark:'#0c2548',accent:'#4d8fd6',surface:'#f4f8fc',ink:'#11233b'},
    showtime:{label:'Showtime',description:'Bold + media-first',dark:'#160e24',accent:'#a855f7',surface:'#faf7ff',ink:'#20152e'},
    studio:{label:'Studio',description:'Clean + editorial',dark:'#24272b',accent:'#8a7353',surface:'#ffffff',ink:'#1c1f22'}
  };
  const LEGACY_PRESETS={luxury:'classic',modern:'flow',clean:'studio',music:'showtime'};
  const PROPERTY_TYPES=['Single Family','Multi-Family','Condo','Co-op','Townhouse','Rental','Land','Commercial','Other'];
  const BED_OPTIONS=[['','Beds'],['0','Studio'],['1','1 Bed'],['2','2 Beds'],['3','3 Beds'],['4','4 Beds'],['5','5 Beds'],['6','6 Beds'],['7','7 Beds'],['8','8 Beds'],['9','9 Beds'],['10','10 Beds']];
  const BATH_OPTIONS=[['','Baths'],['1','1 Bath'],['1.5','1.5 Baths'],['2','2 Baths'],['2.5','2.5 Baths'],['3','3 Baths'],['3.5','3.5 Baths'],['4','4 Baths'],['4.5','4.5 Baths'],['5','5 Baths'],['5.5','5.5 Baths'],['6','6 Baths']];

  let settings={brokerage_name:'',license_title:'',service_areas:'',tagline:'',brokerage_logo_url:'',style_preset:'classic'};
  let listings=[];
  let loadedForCard=null;
  let saveTimer=null;
  let booted=false;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const field=name=>q(`[name="${name}"]`);
  const value=(name,fallback='')=>field(name)?String(field(name).value??''):fallback;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=cents=>cents==null||cents===''?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(cents)/100);
  const toCents=v=>{const n=Number(String(v||'').replace(/[$,]/g,''));return Number.isFinite(n)?Math.round(n*100):null;};
  const currentExperience=()=>value('card_experience','classic').trim().toLowerCase();
  const isRealtor=()=>currentExperience()==='realtor';
  const cardId=()=>{try{return (typeof currentId!=='undefined'&&currentId)||new URLSearchParams(location.search).get('id');}catch(_){return new URLSearchParams(location.search).get('id');}};
  const ownerId=()=>{try{return (typeof currentCardOwnerId!=='undefined'&&currentCardOwnerId)||(typeof user!=='undefined'&&user?.id)||null;}catch(_){return null;}};
  const statusLabel=v=>STATUS[v]||'For Sale';
  const normalizePreset=v=>{const raw=String(v||'').toLowerCase();return PRESETS[raw]?raw:(LEGACY_PRESETS[raw]||'classic');};
  const preset=()=>PRESETS[normalizePreset(settings.style_preset)]||PRESETS.classic;
  const templateLayoutKey=()=>{const layout=value('card_layout','classic').trim().toLowerCase();if(['swipe','split'].includes(layout))return 'flow';if(['artist','bold','spotlight','playful'].includes(layout))return 'showtime';if(['minimal','editorial','soft','beauty'].includes(layout))return 'studio';return 'classic';};
  const selectedTemplateName=()=>{const text=String(q('#template-selected-summary')?.textContent||'').trim();return text&&text.toLowerCase()!=='custom design'?text:'Custom design';};
  const templateSkin=()=>{const base=PRESETS[templateLayoutKey()]||preset();const radius=Math.max(4,Math.min(32,Number(value('border_radius','14'))||14));return {dark:value('primary_color',base.dark)||base.dark,accent:value('secondary_color',base.accent)||base.accent,surface:value('background_color',base.surface)||base.surface,ink:value('text_color',base.ink)||base.ink,button:value('button_color',base.dark)||base.dark,buttonText:value('button_text_color','#ffffff')||'#ffffff',font:value('font_family','')||'inherit',radius};};
  const bedsLabel=v=>v===0||v==='0'?'Studio':(v!==''&&v!=null?`${v} Beds`:'');
  const emit=(el,type)=>{try{el?.dispatchEvent(new Event(type,{bubbles:true}));}catch(_){ }};
  const hydrationSafe=()=>{const safety=window.LIWExperienceStateGuard?.hydrationSafety;return !safety||safety.safe!==false;};
  const localDateTime=v=>{if(!v)return '';const d=new Date(v);if(Number.isNaN(d.getTime()))return '';const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);};
  const selected=(a,b)=>String(a??'')===String(b??'')?' selected':'';
  const optionList=(items,current)=>items.map(([v,label])=>`<option value="${esc(v)}"${selected(v,current)}>${esc(label)}</option>`).join('');
  function propertyTypeOptions(current){const value=String(current||'');const values=value&&!PROPERTY_TYPES.includes(value)?[value,...PROPERTY_TYPES]:PROPERTY_TYPES;return `<option value="">Property type</option>${values.map(v=>`<option value="${esc(v)}"${selected(v,value)}>${esc(v)}</option>`).join('')}`;}

  function injectStyles(){
    if(q('#liw-realtor-v2-styles'))return;
    const style=document.createElement('style');
    style.id='liw-realtor-v2-styles';
    style.textContent=`
      .realtor-editor-tab{display:none!important}.realtor-editor-tab.is-visible{display:flex!important}.realtor-editor-panel{display:none}.realtor-editor-panel.active{display:block}
      .card-experience-option.realtor-option{position:relative;overflow:hidden}.card-experience-option.realtor-option .realtor-new{position:absolute;right:9px;top:9px;padding:4px 7px;border-radius:999px;background:#c6a15b;color:#111;font-size:.54rem;font-weight:950;letter-spacing:.08em}.card-experience-option.realtor-option.active{border-color:#c6a15b!important;box-shadow:0 0 0 3px rgba(198,161,91,.14)!important}.card-experience-option.realtor-option .card-experience-number{background:linear-gradient(145deg,#101114,#34312b)!important;color:#f5d999!important}
      .realtor-panel-hero{display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:center;padding:17px;border-radius:18px;background:linear-gradient(145deg,#101114,#20242c);color:#fff;margin-bottom:16px}.realtor-panel-hero .icon{width:44px;height:44px;border-radius:14px;background:#c6a15b;color:#111;display:grid;place-items:center}.realtor-panel-hero small{display:block;color:#d4bc88;font-weight:900;letter-spacing:.1em;font-size:.58rem}.realtor-panel-hero h3{margin:3px 0 2px;font-size:1rem}.realtor-panel-hero p{margin:0;color:#c9ced8;font-size:.7rem;line-height:1.4}.realtor-live{font-size:.58rem;font-weight:900;padding:6px 9px;border:1px solid rgba(255,255,255,.18);border-radius:999px}
      .realtor-tool-tabs{display:flex;gap:7px;overflow:auto;padding-bottom:3px;margin:0 0 15px}.realtor-tool-tabs button{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:8px 12px;font:inherit;font-size:.68rem;font-weight:850;white-space:nowrap;cursor:pointer}.realtor-tool-tabs button.active{background:#111827;color:#fff;border-color:#111827}.realtor-tool-panel{display:none}.realtor-tool-panel.active{display:block}.realtor-v2-grid{display:grid;gap:13px}.realtor-listing-card{border:1px solid #e3e6eb;border-radius:18px;background:#fff;overflow:hidden}.realtor-listing-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:13px 14px;background:#f8fafc;border-bottom:1px solid #eef0f3}.realtor-listing-head strong{font-size:.82rem}.realtor-listing-body{padding:14px;display:grid;gap:11px}.realtor-listing-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.realtor-badge{font-size:.58rem;font-weight:900;padding:5px 8px;border-radius:999px;background:#111;color:#fff}.realtor-badge.gold{background:#c6a15b;color:#111}.realtor-check{display:flex;align-items:center;gap:6px;font-size:.7rem;font-weight:800}.realtor-status{font-size:.64rem;color:#667085}.realtor-preset-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.realtor-preset{border:1px solid #e4e7ec;border-radius:15px;padding:10px;background:#fff;cursor:pointer;text-align:left}.realtor-preset.active{border-color:#c6a15b;box-shadow:0 0 0 2px rgba(198,161,91,.14)}.realtor-preset-swatch{height:55px;border-radius:10px;margin-bottom:8px;display:flex;align-items:flex-end;padding:7px}.realtor-preset-swatch i{width:24px;height:8px;border-radius:999px}.realtor-preset strong{display:block;font-size:.72rem}.realtor-preset small{display:block;margin-top:3px;color:#667085;font-size:.58rem}.realtor-empty{padding:22px;text-align:center;border:1px dashed #d8dde5;border-radius:16px;color:#667085;font-size:.72rem}.realtor-quick-select{font-weight:750}
      .phone.realtor-experience-selected .preview-cover,.phone.realtor-experience-selected .preview-content{display:none!important}.phone.realtor-experience-selected{background:#eef0f3!important}.realtor-phone{min-height:100%;background:var(--rsurface,#f8f5ee);color:var(--rink,#15171b);font-family:var(--rfont,inherit)}.realtor-phone.realtor-style-flow{border-radius:22px;overflow:visible}.realtor-phone.realtor-style-flow .realtor-feature,.realtor-phone.realtor-style-flow .realtor-mini-card{border-radius:18px}.realtor-phone.realtor-style-showtime .realtor-phone-hero{height:185px}.realtor-phone.realtor-style-showtime .realtor-feature-photo{height:138px}.realtor-phone.realtor-style-showtime .realtor-phone-identity h3{font-size:1.12rem}.realtor-phone.realtor-style-studio .realtor-feature,.realtor-phone.realtor-style-studio .realtor-mini-card,.realtor-phone.realtor-style-studio .realtor-phone-actions span{border-radius:6px;box-shadow:none}.realtor-phone.realtor-style-studio .realtor-phone-body{gap:14px}
      .realtor-phone-hero{height:196px;position:sticky;top:0;z-index:5;background:linear-gradient(145deg,var(--rdark,#101114),#29303d);background-size:cover;background-position:center;overflow:hidden;box-shadow:0 8px 18px rgba(15,23,42,.12)}.realtor-phone-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.04),rgba(0,0,0,.68))}.realtor-phone-brand{position:absolute;z-index:2;left:12px;top:12px;display:flex;align-items:center;gap:7px;min-width:0;max-width:calc(100% - 118px);color:#fff}.realtor-phone-brand img{display:block;flex:0 0 32px;width:32px;height:32px;object-fit:contain;background:#fff;border-radius:7px;padding:3px}.realtor-phone-brand span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.realtor-phone-brand span{font-size:.58rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.realtor-phone-top-actions{position:absolute;z-index:3;right:10px;top:10px;display:flex;gap:6px}.realtor-phone-top-actions span{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.92);display:grid;place-items:center;color:#111}.realtor-phone-identity{position:absolute;z-index:2;left:14px;right:14px;bottom:12px;display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;align-items:end;color:#fff}.realtor-phone-avatar{width:96px;height:96px;border-radius:50%;border:3px solid #fff;background:#e5e7eb center/cover no-repeat;box-shadow:0 7px 20px rgba(0,0,0,.25);display:grid;place-items:center;color:#111;font-weight:900}.realtor-phone-identity h3{font-size:1rem;margin:0 0 2px}.realtor-phone-identity p{font-size:.59rem;margin:0;color:#e4e8ef}.realtor-phone-body{padding:12px;display:grid;gap:11px}.realtor-phone-license{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.57rem;color:#667085}.realtor-phone-tagline{font-size:.69rem;font-weight:750;line-height:1.35}.realtor-phone-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.realtor-phone-actions span{display:grid;place-items:center;gap:4px;padding:7px 4px;border-radius:var(--rradius,10px);background:#fff;border:1px solid rgba(17,24,39,.07);font-size:.52rem;font-weight:850}.realtor-phone-actions i{font-style:normal;font-size:.82rem;color:var(--raccent,#c6a15b)}.realtor-phone-nav{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.realtor-phone-nav span{padding:7px 3px;text-align:center;border-radius:var(--rradius,9px);background:var(--rbutton,var(--rdark,#101114));color:var(--rbuttontext,#fff);font-size:.5rem;font-weight:850}.realtor-phone-section-head{display:flex;justify-content:space-between;align-items:end;gap:8px}.realtor-phone-section-head strong{font-size:.72rem}.realtor-phone-section-head span{font-size:.5rem;color:#7b818c}.realtor-feature{background:#fff;border-radius:var(--rradius,14px);overflow:hidden;box-shadow:0 8px 22px rgba(15,23,42,.08)}.realtor-feature-photo{height:118px;background:#e7eaee center/cover no-repeat;position:relative}.realtor-feature-badge{position:absolute;left:8px;top:8px;padding:4px 7px;border-radius:999px;background:var(--raccent,#c6a15b);color:#111;font-size:.5rem;font-weight:950}.realtor-feature-copy{padding:9px;display:grid;gap:4px}.realtor-feature-copy strong{font-size:.69rem}.realtor-feature-copy b{font-size:.77rem}.realtor-feature-meta{display:flex;gap:7px;flex-wrap:wrap;font-size:.53rem;color:#68707c}.realtor-feature-buttons{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:4px}.realtor-feature-buttons span{padding:7px;border-radius:var(--rradius,8px);text-align:center;background:var(--rbutton,var(--rdark,#101114));color:var(--rbuttontext,#fff);font-size:.52rem;font-weight:900}.realtor-feature-buttons span:last-child{background:var(--raccent,#c6a15b);color:#111}.realtor-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.realtor-mini-card{background:#fff;border-radius:var(--rradius,11px);overflow:hidden;border:1px solid rgba(17,24,39,.07)}.realtor-mini-photo{height:57px;background:#e7eaee center/cover no-repeat}.realtor-mini-copy{padding:6px}.realtor-mini-copy strong{display:block;font-size:.55rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.realtor-mini-copy span{font-size:.49rem;color:#6b7280}.realtor-lead-box{padding:11px;border-radius:var(--rradius,14px);background:linear-gradient(145deg,var(--rdark,#101114),#262d38);color:#fff}.realtor-lead-box strong{font-size:.72rem}.realtor-lead-box p{font-size:.54rem;color:#d2d6de;margin:3px 0 8px}.realtor-lead-buttons{display:grid;grid-template-columns:1fr 1fr;gap:6px}.realtor-lead-buttons span{padding:7px;border-radius:var(--rradius,8px);background:#fff;color:#111;text-align:center;font-size:.51rem;font-weight:900}.realtor-lead-buttons span:last-child{background:var(--raccent,#c6a15b)}
      @media(max-width:760px){.realtor-panel-hero{grid-template-columns:auto 1fr}.realtor-live{display:none}.realtor-preset-grid{grid-template-columns:1fr 1fr}.realtor-listing-actions .btn{flex:1}.realtor-editor-tab .editor-step-tab-copy small{display:none}.card-experience-grid{grid-template-columns:1fr!important}}
      @media(max-width:460px){.realtor-preset-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function removeLegacyRealtorTemplate(){
    try{
      if(!Array.isArray(templates))return false;
      let changed=false;
      for(let i=templates.length-1;i>=0;i--){
        const item=templates[i]||{};
        if(String(item.id||'')===LEGACY_REALTOR_TEMPLATE_ID||String(item.template_key||'').toLowerCase()==='realtor'){templates.splice(i,1);changed=true;}
      }
      if(changed&&typeof renderTemplates==='function')renderTemplates();
      return true;
    }catch(_){return false;}
  }

  function ensureExperienceOption(){
    const grid=q('#card-experience-section .card-experience-grid');
    if(!grid)return false;
    let button=q('[data-card-experience="realtor"]',grid);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='card-experience-option realtor-option';
      button.dataset.cardExperience='realtor';
      button.innerHTML='<span class="realtor-new">REAL ESTATE</span><span class="card-experience-number">R</span><strong><i data-lucide="building-2" size="17"></i> Realtor</strong><span>Property-first card with listings, open houses, sold homes and buyer/seller lead tools.</span>';
      grid.appendChild(button);
    }
    if(button.dataset.realtorBound!=='true'){
      button.dataset.realtorBound='true';
      button.addEventListener('click',activateRealtor);
    }
    return true;
  }

  function ensureEditorUi(){
    const nav=q('.editor-tabs');
    const workspace=q('.editor-workspace');
    if(!nav||!workspace)return false;

    if(!q('.realtor-editor-tab')){
      const tab=document.createElement('button');
      tab.type='button';tab.className='editor-tab realtor-editor-tab';tab.dataset.tab='realtor';
      tab.innerHTML='<span class="editor-step-number">R</span><i data-lucide="building-2" size="17"></i><span class="editor-step-tab-copy"><strong>Realtor Tools</strong><small>Listings & leads</small></span>';
      const share=q('[data-tab="share"]',nav);share?nav.insertBefore(tab,share):nav.appendChild(tab);
      tab.addEventListener('click',openRealtorPanel);
    }

    if(!q('.realtor-editor-panel')){
      const panel=document.createElement('section');
      panel.className='editor-panel realtor-editor-panel';panel.dataset.panel='realtor';
      panel.innerHTML=`
        <div class="panel-heading"><div><h2>Realtor Tools</h2><p>Build a property-focused LIW Card without changing your normal profile data.</p></div><span class="eyebrow">REALTOR</span></div>
        <div class="realtor-panel-hero"><div class="icon"><i data-lucide="key-round" size="21"></i></div><div><small>LIW REAL ESTATE EXPERIENCE</small><h3>Your mobile property storefront</h3><p>Listings, open houses, sold homes and lead actions live here.</p></div><span class="realtor-live">LIVE EXPERIENCE</span></div>
        <div class="realtor-tool-tabs"><button type="button" class="active" data-realtor-tab="agent">Agent</button><button type="button" data-realtor-tab="listings">Listings</button><button type="button" data-realtor-tab="design">Card Design</button></div>
        <div class="realtor-tool-panel active" data-realtor-panel="agent">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Agent details</h3><p>These sit alongside the normal name, photo, phone and email already on your LIW Card.</p></div><span class="realtor-status" id="realtor-save-status">Autosaves</span></div>
            <div class="form-row"><div class="form-group"><label>Brokerage</label><input class="input" data-realtor-setting="brokerage_name" placeholder="Your brokerage"></div><div class="form-group"><label>License / title</label><input class="input" data-realtor-setting="license_title" placeholder="Licensed Real Estate Salesperson"></div></div>
            <div class="form-group"><label>Service areas</label><input class="input" data-realtor-setting="service_areas" placeholder="Brooklyn · Queens · NYC"></div>
            <div class="form-group"><label>Realtor tagline</label><input class="input" data-realtor-setting="tagline" placeholder="Helping you move with confidence."></div>
            <div class="form-row"><div class="form-group"><label>Brokerage logo URL <span class="muted">optional</span></label><input class="input" data-realtor-setting="brokerage_logo_url" type="url" placeholder="https://..."></div><div class="form-group"><label>Or upload logo</label><input class="input" id="realtor-logo-file" type="file" accept="image/jpeg,image/png,image/webp"></div></div>
          </div>
        </div>
        <div class="realtor-tool-panel" data-realtor-panel="listings">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Listings Manager</h3><p>Tap common property details instead of typing them. Add, feature, reorder and update properties on the go.</p></div><button class="btn btn-primary btn-sm" id="realtor-add-listing" type="button"><i data-lucide="plus" size="15"></i> Add listing</button></div><div class="realtor-v2-grid" id="realtor-listings-editor"></div></div>
        </div>
        <div class="realtor-tool-panel" data-realtor-panel="design">
          <div class="form-section"><div class="section-mini-heading"><div><h3>LIW Card Design</h3><p>Classic, Flow, Showtime and Studio control the Realtor layout. Standard and Premium templates from Design control its colors, font, buttons and finish.</p></div></div><div class="realtor-preset-grid" id="realtor-presets"></div></div>
        </div>`;
      const actions=q('#editor-step-actions');actions?workspace.insertBefore(panel,actions):workspace.appendChild(panel);

      qa('[data-realtor-tab]',panel).forEach(btn=>btn.addEventListener('click',()=>switchToolTab(btn.dataset.realtorTab)));
      qa('[data-realtor-setting]',panel).forEach(input=>input.addEventListener('input',()=>{settings[input.dataset.realtorSetting]=input.value;queueSave();renderPreview();}));
      q('#realtor-add-listing',panel)?.addEventListener('click',addListing);
      q('#realtor-logo-file',panel)?.addEventListener('change',uploadLogo);
      renderPresets();renderListings();
    }
    return true;
  }

  function switchToolTab(name){
    qa('[data-realtor-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.realtorTab===name));
    qa('[data-realtor-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.realtorPanel===name));
  }

  function openRealtorPanel(){
    if(!isRealtor())return;
    qa('.editor-tab').forEach(tab=>tab.classList.toggle('active',tab.classList.contains('realtor-editor-tab')));
    qa('.editor-panel').forEach(panel=>panel.classList.toggle('active',panel.classList.contains('realtor-editor-panel')));
    q('.realtor-editor-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function activateRealtor(){
    const input=field('card_experience');if(!input)return;
    const mode=field('color_mode');
    if(mode&&String(mode.value).toLowerCase()==='barbershop')mode.value='light';
    input.value='realtor';emit(input,'input');emit(input,'change');
    ensureEditorUi();syncUi();
    if(hydrationSafe()){
      try{if(typeof render==='function')render();}catch(_){ }
      try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    }
    if(cardId())loadRealtorData();
    requestAnimationFrame(()=>{openRealtorPanel();switchToolTab('agent');});
    if(typeof toast==='function')toast('Realtor selected — Realtor Tools are open');
  }

  function syncUi(){
    const enabled=isRealtor();
    q('.realtor-editor-tab')?.classList.toggle('is-visible',enabled);
    const realtorButton=q('[data-card-experience="realtor"]');
    realtorButton?.classList.toggle('active',enabled);
    if(enabled){
      qa('#card-experience-section [data-card-experience]').forEach(btn=>{if(btn!==realtorButton)btn.classList.remove('active');});
      q('#phone-preview')?.classList.add('realtor-experience-selected');
    }else{
      q('#phone-preview')?.classList.remove('realtor-experience-selected');
      q('#realtor-phone')?.remove();
      if(q('.realtor-editor-panel.active'))q('.editor-tab[data-tab="design"]')?.click();
    }
    renderPreview();
  }

  async function loadRealtorData(){
    const id=cardId();if(!id||!isRealtor()||loadedForCard===id)return;
    loadedForCard=id;
    try{
      const [cardResult,listResult]=await Promise.all([
        supabaseClient.from('digital_cards').select('realtor_settings').eq('id',id).single(),
        supabaseClient.from('realtor_listings').select('*').eq('card_id',id).order('sort_order').order('created_at')
      ]);
      if(cardResult.error)throw cardResult.error;if(listResult.error)throw listResult.error;
      settings={...settings,...(cardResult.data?.realtor_settings||{})};
      settings.style_preset=normalizePreset(settings.style_preset);
      listings=listResult.data||[];
      fillSettings();renderPresets();renderListings();renderPreview();
    }catch(error){loadedForCard=null;console.warn('LIW Realtor load failed:',error);}
  }

  function fillSettings(){qa('[data-realtor-setting]').forEach(input=>input.value=settings[input.dataset.realtorSetting]||'');}
  function blankListing(){return {id:null,address:'',city:'',state:'NY',zip:'',price_cents:null,status:'for_sale',property_type:'',beds:null,baths:null,square_feet:null,description:'',mls_number:'',main_image_url:'',gallery_urls:[],external_url:'',virtual_tour_url:'',is_featured:listings.length===0,is_visible:true,open_house_start:null,open_house_end:null,sold_price_cents:null,sort_order:listings.length};}
  function addListing(){listings.push(blankListing());renderListings();renderPreview();switchToolTab('listings');setTimeout(()=>q(`[data-realtor-index="${listings.length-1}"] [data-k="address"]`)?.focus(),0);}

  function renderPresets(){
    const host=q('#realtor-presets');if(!host)return;
    host.innerHTML=`<div style="grid-column:1/-1;padding:14px;border:1px solid #e4e7ec;border-radius:15px;background:#f8fafc;display:grid;gap:10px"><div><strong style="display:block;font-size:.8rem">Standard / Premium template</strong><small style="display:block;margin-top:4px;color:#667085;line-height:1.45">Realtor keeps its listings and lead tools while the shared LIW template controls layout, colors, font and buttons.</small></div><div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:11px;background:#fff;border:1px solid #e5e7eb"><span style="font-size:.64rem;color:#667085">Current design</span><b id="realtor-template-name" style="font-size:.72rem;color:#0b1438;text-align:right">${esc(selectedTemplateName())}</b></div><button class="btn btn-light btn-sm" type="button" id="realtor-browse-templates"><i data-lucide="layout-template" size="15"></i> Browse Standard / Premium templates</button></div>`;
    q('#realtor-browse-templates',host)?.addEventListener('click',()=>{q('.editor-tab[data-tab="design"]')?.click();setTimeout(()=>q('#template-grid')?.scrollIntoView({behavior:'smooth',block:'start'}),60);});
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function renderListings(){
    const host=q('#realtor-listings-editor');if(!host)return;
    if(!listings.length){host.innerHTML='<div class="realtor-empty">No properties yet. Add your first listing to build the Realtor storefront.</div>';return;}
    host.innerHTML=listings.map((l,index)=>`<article class="realtor-listing-card" data-realtor-index="${index}"><div class="realtor-listing-head"><div><strong>${esc(l.address||`Listing ${index+1}`)}</strong> ${l.is_featured?'<span class="realtor-badge gold">Featured</span>':''}</div><span class="realtor-badge">${statusLabel(l.status)}</span></div><div class="realtor-listing-body">
      <div class="form-row"><input class="input" data-k="address" placeholder="Property address" value="${esc(l.address||'')}"><input class="input" data-k="price" placeholder="Price" inputmode="decimal" value="${l.price_cents==null?'':Number(l.price_cents)/100}"></div>
      <div class="form-row"><input class="input" data-k="city" placeholder="City" value="${esc(l.city||'')}"><input class="input" data-k="state" placeholder="State" value="${esc(l.state||'')}"><input class="input" data-k="zip" placeholder="ZIP" value="${esc(l.zip||'')}"></div>
      <div class="form-row"><select class="input realtor-quick-select" data-k="status"><option value="for_sale">For Sale</option><option value="new_listing">New Listing</option><option value="coming_soon">Coming Soon</option><option value="open_house">Open House</option><option value="pending">Pending</option><option value="sold">Sold</option></select><select class="input realtor-quick-select" data-k="property_type">${propertyTypeOptions(l.property_type)}</select></div>
      <div class="form-row"><select class="input realtor-quick-select" data-k="beds">${optionList(BED_OPTIONS,l.beds)}</select><select class="input realtor-quick-select" data-k="baths">${optionList(BATH_OPTIONS,l.baths)}</select><input class="input" data-k="square_feet" placeholder="Sq ft" inputmode="numeric" value="${esc(l.square_feet??'')}"></div>
      <textarea class="input" data-k="description" maxlength="1200" placeholder="Property description">${esc(l.description||'')}</textarea>
      <div class="form-row"><input class="input" data-k="mls_number" placeholder="MLS # (optional)" value="${esc(l.mls_number||'')}"><input class="input" data-k="external_url" type="url" placeholder="External listing URL" value="${esc(l.external_url||'')}"></div>
      <div class="form-row"><input class="input" data-k="main_image_url" type="url" placeholder="Main photo URL" value="${esc(l.main_image_url||'')}"><input class="input" data-k="virtual_tour_url" type="url" placeholder="Virtual tour URL" value="${esc(l.virtual_tour_url||'')}"></div>
      <div class="form-group"><label>Or upload main property photo</label><input class="input" data-photo type="file" accept="image/jpeg,image/png,image/webp"></div>
      <div class="form-group"><label>Gallery photo URLs <span class="muted">one per line, up to 12</span></label><textarea class="input" data-k="gallery_urls_text" placeholder="https://...">${esc((Array.isArray(l.gallery_urls)?l.gallery_urls:[]).join('\n'))}</textarea></div>
      <div class="form-group"><label>Open house <span class="muted">optional</span></label><div class="form-row"><input class="input" data-k="open_house_start" type="datetime-local" value="${localDateTime(l.open_house_start)}"><input class="input" data-k="open_house_end" type="datetime-local" value="${localDateTime(l.open_house_end)}"></div></div>
      ${l.status==='sold'?`<div class="form-group"><label>Sold price</label><input class="input" data-k="sold_price" inputmode="decimal" placeholder="Sold price" value="${l.sold_price_cents==null?'':Number(l.sold_price_cents)/100}"></div>`:''}
      <div class="realtor-listing-actions"><label class="realtor-check"><input type="checkbox" data-featured ${l.is_featured?'checked':''}> Featured</label><label class="realtor-check"><input type="checkbox" data-visible ${l.is_visible!==false?'checked':''}> Show on card</label><button class="btn btn-light btn-sm" type="button" data-up>Up</button><button class="btn btn-light btn-sm" type="button" data-down>Down</button><button class="btn btn-ghost btn-sm" type="button" data-delete><i data-lucide="trash-2" size="14"></i> Delete</button></div>
    </div></article>`).join('');

    qa('[data-realtor-index]',host).forEach(row=>{
      const index=Number(row.dataset.realtorIndex),listing=listings[index];
      q('[data-k="status"]',row).value=listing.status||'for_sale';
      qa('[data-k]',row).forEach(input=>input.addEventListener('input',()=>{
        const key=input.dataset.k;
        if(key==='price')listing.price_cents=toCents(input.value);
        else if(key==='sold_price')listing.sold_price_cents=toCents(input.value);
        else if(key==='gallery_urls_text')listing.gallery_urls=input.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,12);
        else if(['beds','baths'].includes(key))listing[key]=input.value===''?null:Number(input.value);
        else if(key==='square_feet')listing[key]=input.value===''?null:Number(input.value);
        else if(['open_house_start','open_house_end'].includes(key))listing[key]=input.value?new Date(input.value).toISOString():null;
        else listing[key]=input.value;
        queueSave();renderPreview();if(key==='status')setTimeout(renderListings,0);
      }));
      q('[data-featured]',row)?.addEventListener('change',event=>{if(event.target.checked)listings.forEach((item,i)=>item.is_featured=i===index);else listing.is_featured=false;queueSave();renderListings();renderPreview();});
      q('[data-visible]',row)?.addEventListener('change',event=>{listing.is_visible=event.target.checked;queueSave();renderPreview();});
      q('[data-delete]',row)?.addEventListener('click',()=>deleteListing(index));
      q('[data-up]',row)?.addEventListener('click',()=>moveListing(index,-1));
      q('[data-down]',row)?.addEventListener('click',()=>moveListing(index,1));
      q('[data-photo]',row)?.addEventListener('change',event=>uploadListingPhoto(event,index));
    });
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function moveListing(index,direction){const next=index+direction;if(next<0||next>=listings.length)return;[listings[index],listings[next]]=[listings[next],listings[index]];listings.forEach((l,i)=>l.sort_order=i);queueSave();renderListings();renderPreview();}
  async function deleteListing(index){const listing=listings[index];if(!confirm('Delete this listing from the Realtor card?'))return;if(listing.id){const {error}=await supabaseClient.from('realtor_listings').delete().eq('id',listing.id).eq('card_id',cardId());if(error){toast(error.message);return;}}listings.splice(index,1);listings.forEach((l,i)=>l.sort_order=i);renderListings();renderPreview();toast('Listing deleted');}

  async function uploadImage(file,folder){
    if(!file)return '';if(file.size>6*1024*1024)throw new Error('Image must be under 6 MB');
    let account=null;try{account=typeof user!=='undefined'?user:null;}catch(_){ }
    if(!account?.id)throw new Error('Sign in again before uploading');
    const safe=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');const path=`${account.id}/realtor/${folder}/${Date.now()}-${safe}`;
    const {error}=await supabaseClient.storage.from('profile-images').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;
    return supabaseClient.storage.from('profile-images').getPublicUrl(path).data.publicUrl;
  }
  async function uploadListingPhoto(event,index){const file=event.target.files?.[0];if(!file)return;try{listings[index].main_image_url=await uploadImage(file,'listings');queueSave(true);renderListings();renderPreview();toast('Property photo uploaded');}catch(error){toast(error.message||'Unable to upload photo');}}
  async function uploadLogo(event){const file=event.target.files?.[0];if(!file)return;try{settings.brokerage_logo_url=await uploadImage(file,'brokerage');fillSettings();queueSave(true);renderPreview();toast('Brokerage logo uploaded');}catch(error){toast(error.message||'Unable to upload logo');}}

  function queueSave(immediate=false){
    clearTimeout(saveTimer);
    const status=q('#realtor-save-status');if(status)status.textContent='Unsaved changes';
    if(!hydrationSafe())return;
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    saveTimer=setTimeout(saveRealtor,immediate?100:900);
  }
  async function ensureSavedCard(){let id=cardId();if(id)return id;if(!hydrationSafe())return null;try{if(typeof flushSave==='function')await flushSave({force:true,silent:true});}catch(_){return null;}return cardId();}
  function payload(l,index,id,includeOwner=false){const p={card_id:id,address:l.address||'',city:l.city||null,state:l.state||null,zip:l.zip||null,price_cents:l.price_cents==null?null:Number(l.price_cents),status:l.status||'for_sale',property_type:l.property_type||null,beds:l.beds==null?null:Number(l.beds),baths:l.baths==null?null:Number(l.baths),square_feet:l.square_feet==null?null:Number(l.square_feet),description:l.description||null,mls_number:l.mls_number||null,main_image_url:l.main_image_url||null,gallery_urls:Array.isArray(l.gallery_urls)?l.gallery_urls.slice(0,12):[],external_url:l.external_url||null,virtual_tour_url:l.virtual_tour_url||null,is_featured:Boolean(l.is_featured),is_visible:l.is_visible!==false,open_house_start:l.open_house_start||null,open_house_end:l.open_house_end||null,sold_price_cents:l.sold_price_cents==null?null:Number(l.sold_price_cents),sort_order:index,updated_at:new Date().toISOString()};if(includeOwner&&ownerId())p.user_id=ownerId();return p;}
  async function saveRealtor(){
    if(!isRealtor()||!hydrationSafe())return;const id=await ensureSavedCard();if(!id)return;
    const status=q('#realtor-save-status');if(status)status.textContent='Saving…';
    try{
      settings.style_preset=normalizePreset(settings.style_preset);
      const clean={brokerage_name:settings.brokerage_name||'',license_title:settings.license_title||'',service_areas:settings.service_areas||'',tagline:settings.tagline||'',brokerage_logo_url:settings.brokerage_logo_url||'',style_preset:settings.style_preset};
      const {error:settingsError}=await supabaseClient.rpc('save_realtor_settings',{p_card_id:id,p_settings:clean});if(settingsError)throw settingsError;
      const ordered=listings.map((listing,index)=>({listing,index})).sort((a,b)=>Number(a.listing.is_featured)-Number(b.listing.is_featured));
      for(const {listing,index} of ordered){
        if(listing.id){const {error}=await supabaseClient.from('realtor_listings').update(payload(listing,index,id,false)).eq('id',listing.id).eq('card_id',id);if(error)throw error;}
        else{const {data,error}=await supabaseClient.from('realtor_listings').insert(payload(listing,index,id,true)).select().single();if(error)throw error;listing.id=data.id;}
      }
      if(status)status.textContent='Saved';
    }catch(error){console.error('LIW Realtor save failed:',error);if(status)status.textContent='Save failed';if(typeof toast==='function')toast(error.message||'Unable to save Realtor details');}
  }

  function initials(){return value('full_name','Agent').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'RE';}
  function address(l){return [l.address,l.city,l.state,l.zip].filter(Boolean).join(', ');}
  function featureCard(l){if(!l)return '<div class="realtor-empty">Add a listing in Realtor Tools to feature a property.</div>';const price=l.status==='sold'&&l.sold_price_cents?l.sold_price_cents:l.price_cents,bedText=bedsLabel(l.beds);return `<article class="realtor-feature"><div class="realtor-feature-photo" style="${l.main_image_url?`background-image:url('${esc(l.main_image_url)}')`:''}"><span class="realtor-feature-badge">${statusLabel(l.status)}</span></div><div class="realtor-feature-copy"><strong>${esc(address(l)||'Property address')}</strong><b>${money(price)||'Price on request'}</b><div class="realtor-feature-meta">${bedText?`<span>${esc(bedText)}</span>`:''}${l.baths!=null?`<span>${esc(l.baths)} Baths</span>`:''}${l.square_feet?`<span>${esc(l.square_feet)} Sq Ft</span>`:''}</div><div class="realtor-feature-buttons"><span>View Property</span><span>Schedule Showing</span></div></div></article>`;}
  function miniCard(l){return `<article class="realtor-mini-card"><div class="realtor-mini-photo" style="${l.main_image_url?`background-image:url('${esc(l.main_image_url)}')`:''}"></div><div class="realtor-mini-copy"><strong>${esc(l.address||'Property')}</strong><span>${money(l.status==='sold'&&l.sold_price_cents?l.sold_price_cents:l.price_cents)||statusLabel(l.status)}</span></div></article>`;}

  function renderPreview(){
    const phone=q('#phone-preview');if(!phone)return;
    if(!isRealtor()){phone.classList.remove('realtor-experience-selected');q('#realtor-phone')?.remove();return;}
    phone.classList.add('realtor-experience-selected');
    const scroll=q('.preview-card-scroll',phone);if(!scroll)return;
    let host=q('#realtor-phone',scroll);if(!host){host=document.createElement('section');host.id='realtor-phone';scroll.appendChild(host);}
    const styleKey=templateLayoutKey(),p=templateSkin(),templateName=selectedTemplateName(),visible=listings.filter(l=>l.is_visible!==false),featured=visible.find(l=>l.is_featured)||visible.find(l=>l.status!=='sold')||visible[0];
    host.className=`realtor-phone realtor-style-${styleKey}`;
    const open=visible.filter(l=>(l.status==='open_house'||l.open_house_start)&&l!==featured).slice(0,2),sold=visible.filter(l=>l.status==='sold'&&l!==featured).slice(0,2);
    const cover=value('cover_image_url',''),profile=value('profile_image_url',''),name=value('full_name','Your Name'),title=settings.license_title||value('job_title','Real Estate Professional'),brokerage=settings.brokerage_name||value('company_name',''),service=settings.service_areas||'',tagline=settings.tagline||value('headline','Helping you find the right move.');
    host.style.setProperty('--rdark',p.dark);host.style.setProperty('--raccent',p.accent);host.style.setProperty('--rsurface',p.surface);host.style.setProperty('--rink',p.ink);host.style.setProperty('--rbutton',p.button);host.style.setProperty('--rbuttontext',p.buttonText);host.style.setProperty('--rfont',p.font);host.style.setProperty('--rradius',`${p.radius}px`);
    host.innerHTML=`<div class="realtor-phone-hero" style="${cover?`background-image:url('${esc(cover)}')`:''}"><div class="realtor-phone-brand">${settings.brokerage_logo_url?`<img src="${esc(settings.brokerage_logo_url)}" alt="">`:''}<span>${esc(brokerage||'Real Estate')}</span></div><div class="realtor-phone-top-actions"><span title="LIW Wallet"><i data-lucide="wallet" size="14"></i></span><span title="Share"><i data-lucide="share-2" size="14"></i></span><span title="QR code"><i data-lucide="qr-code" size="14"></i></span></div><div class="realtor-phone-identity"><div class="realtor-phone-avatar" style="${profile?`background-image:url('${esc(profile)}')`:''}">${profile?'':esc(initials())}</div><div><h3>${esc(name)}</h3><p>${esc(title)}${service?` · ${esc(service)}`:''}</p></div></div></div><div class="realtor-phone-body"><div class="realtor-phone-license"><span>${esc(brokerage||'Independent Real Estate')}</span><span>${esc(templateName)} · ${visible.length} listing${visible.length===1?'':'s'}</span></div><div class="realtor-phone-tagline">${esc(tagline)}</div><div class="realtor-phone-actions"><span><i>☎</i>Call</span><span><i>✉</i>Text</span><span><i>@</i>Email</span><span><i>＋</i>Save</span></div><div class="realtor-phone-nav"><span>Listings</span><span>Buy</span><span>Sell</span><span>Open Houses</span></div><div class="realtor-phone-section-head"><strong>Featured Listing</strong><span>View all</span></div>${featureCard(featured)}${open.length?`<div class="realtor-phone-section-head"><strong>Open Houses</strong><span>Upcoming</span></div><div class="realtor-mini-grid">${open.map(miniCard).join('')}</div>`:''}${sold.length?`<div class="realtor-phone-section-head"><strong>Recently Sold</strong><span>Track record</span></div><div class="realtor-mini-grid">${sold.map(miniCard).join('')}</div>`:''}<div class="realtor-lead-box"><strong>Ready to Buy or Sell?</strong><p>Turn card visitors into real estate conversations.</p><div class="realtor-lead-buttons"><span>Buy a Home</span><span>Sell My Home</span></div></div></div>`;
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function bindGlobalEvents(){
    if(document.documentElement.dataset.realtorV2Events==='true')return;
    document.documentElement.dataset.realtorV2Events='true';
    document.addEventListener('click',event=>{
      const experienceButton=event.target instanceof Element?event.target.closest('[data-card-experience]'):null;
      if(experienceButton&&experienceButton.dataset.cardExperience!=='realtor')setTimeout(syncUi,0);
      const templateButton=event.target instanceof Element?event.target.closest('.template-card[data-template]'):null;
      if(templateButton&&isRealtor())setTimeout(()=>{renderPresets();renderPreview();},80);
    },true);
    field('card_experience')?.addEventListener('change',()=>{syncUi();if(isRealtor())loadRealtorData();});
    ['full_name','job_title','company_name','headline','profile_image_url','cover_image_url','primary_color','secondary_color','background_color','text_color','button_color','button_text_color','font_family','button_style','border_radius','card_layout','template_id'].forEach(name=>field(name)?.addEventListener('input',()=>{if(isRealtor()){renderPresets();renderPreview();}}));
  }

  function boot(){
    injectStyles();removeLegacyRealtorTemplate();const optionReady=ensureExperienceOption(),uiReady=ensureEditorUi();
    if(!optionReady||!uiReady)return false;
    bindGlobalEvents();syncUi();if(isRealtor())loadRealtorData();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    booted=true;return true;
  }

  document.addEventListener('liw:editor-card-hydrated',()=>{
    boot();
    syncUi();
    if(isRealtor()){
      loadedForCard=null;
      loadRealtorData();
      renderPreview();
    }
  });

  window.LIWRealtorV1={refresh:boot,save:saveRealtor,open:openRealtorPanel,render:renderPreview};
  const delays=[0,100,250,500,900,1500];
  delays.forEach((delay,index)=>setTimeout(()=>{if(!booted||index===delays.length-1)boot();},delay));
})();