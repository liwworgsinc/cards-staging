/* LIW Cards staging — Barbershop Experience V5.
   First-class industry experience, event-driven only. Uses existing card fields so
   previously saved barber information returns without a schema migration. */
(function(){
  'use strict';
  if(window.__LIW_BARBERSHOP_EXPERIENCE_V5__)return;
  window.__LIW_BARBERSHOP_EXPERIENCE_V5__=true;
  /* Block the retired polling implementation if another staging loader finds it later. */
  window.__LIW_BARBERSHOP_EDITOR_STAGING__=true;

  const MODE='barbershop';
  const DEFAULT_PRESET='black-gold';
  const presets={
    'black-gold':{label:'Black & Gold',primary:'#111111',secondary:'#d4a84f',background:'#090909',text:'#f8f4e8'},
    'classic-pole':{label:'Classic Pole',primary:'#123f8c',secondary:'#c82d32',background:'#f8fafc',text:'#111827'},
    'urban':{label:'Urban',primary:'#171717',secondary:'#9ca3af',background:'#0a0a0a',text:'#f5f5f5'},
    'clean-white':{label:'Clean White',primary:'#111827',secondary:'#b88746',background:'#ffffff',text:'#111827'},
    'vintage-leather':{label:'Vintage Leather',primary:'#3b2416',secondary:'#b7793e',background:'#efe3d0',text:'#2a1b12'}
  };
  const proxyFields={
    barber_name:'full_name',
    specialty:'job_title',
    shop_name:'company_name',
    location:'business_address',
    phone:'phone',
    text_phone:'sms_phone',
    promo:'headline',
    welcome:'biography'
  };

  let root=null;
  let experienceButton=null;
  let observer=null;
  let observerStop=0;
  let syncing=false;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const coreField=name=>q(`[name="${name}"]`);
  const coreValue=(name,fallback='')=>coreField(name)?String(coreField(name).value??''):fallback;
  const currentExperience=()=>coreValue('card_experience','classic').trim().toLowerCase();
  const active=()=>coreValue('color_mode','').trim().toLowerCase()===MODE&&currentExperience()!=='music';

  function emit(element,type){
    try{element.dispatchEvent(new Event(type,{bubbles:true}));}catch(_){ }
  }

  function setCore(name,value,{events=true}={}){
    const field=coreField(name);
    if(!field)return false;
    const next=String(value??'');
    if(String(field.value??'')===next)return true;
    field.value=next;
    if(events){emit(field,'input');emit(field,'change');}
    return true;
  }

  function callRenderAndSave(){
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
  }

  function contrast(hex){
    const value=String(hex||'').replace('#','');
    if(!/^[0-9a-f]{6}$/i.test(value))return '#ffffff';
    const r=parseInt(value.slice(0,2),16),g=parseInt(value.slice(2,4),16),b=parseInt(value.slice(4,6),16);
    return (r*299+g*587+b*114)/1000>150?'#111111':'#ffffff';
  }

  function syncDerivedColors(){
    const primary=coreValue('primary_color','#111111');
    const secondary=coreValue('secondary_color','#d4a84f');
    setCore('button_color',primary);
    setCore('button_text_color',contrast(primary));
    setCore('gradient_background',`linear-gradient(135deg,${primary},${secondary})`);
  }

  function applyPreset(key,{announce=true,save=true}={}){
    const preset=presets[key]||presets[DEFAULT_PRESET];
    setCore('primary_color',preset.primary);
    setCore('secondary_color',preset.secondary);
    setCore('background_color',preset.background);
    setCore('text_color',preset.text);
    syncDerivedColors();
    syncControls();
    if(save)callRenderAndSave();
    if(announce&&typeof toast==='function')toast(`${preset.label} barber colors applied`);
  }

  function ensureExperienceOption(){
    const section=q('#card-experience-section');
    const grid=q('.card-experience-grid',section||document);
    if(!section||!grid)return false;

    experienceButton=q('[data-card-experience="barbershop"]',grid);
    if(!experienceButton){
      experienceButton=document.createElement('button');
      experienceButton.type='button';
      experienceButton.className='card-experience-option barber-experience-option';
      experienceButton.dataset.cardExperience='barbershop';
      experienceButton.dataset.barbershopTemplate='true';
      experienceButton.innerHTML=`
        <span class="card-experience-number">D</span>
        <strong><span class="barber-experience-mark" aria-hidden="true"><i data-lucide="scissors" size="17"></i></span> Barbershop <em>BARBER</em></strong>
        <span>Client-first barber experience with LIW appointments, fresh cuts, shop info and the revolving action dock.</span>`;
      grid.appendChild(experienceButton);
    }
    if(experienceButton.dataset.barberBound!=='true'){
      experienceButton.dataset.barberBound='true';
      experienceButton.addEventListener('click',activateBarbershop);
    }
    section.classList.add('barbershop-experience-ready');
    const note=q('.card-experience-note',section);
    if(note&&!note.dataset.barberCopy){
      note.dataset.barberCopy='true';
      note.innerHTML='<strong>Your content stays yours:</strong> Classic, Flow, Showtime and Barbershop all use the same saved LIW card details. Barbershop opens its own Barber Control Center below.';
    }
    const saveCopy=q('.card-experience-save-copy span',section);
    if(saveCopy&&!/Barbershop/i.test(saveCopy.textContent||''))saveCopy.textContent='Save Classic, Flow, Showtime or Barbershop immediately without scrolling back to the top.';
    return true;
  }

  function activateBarbershop(){
    const wasActive=active();
    if(currentExperience()!=='classic')setCore('card_experience','classic');
    setCore('template_id','');
    setCore('color_mode',MODE);
    setCore('profile_image_shape','circle');
    setCore('button_style','filled');
    if(!wasActive)applyPreset(DEFAULT_PRESET,{announce:false,save:false});
    syncAll();
    callRenderAndSave();
    if(typeof toast==='function')toast('Barbershop selected — your Barber Control Center is ready');
    setTimeout(()=>root?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }

  function deactivateBarbershop(){
    if(coreValue('color_mode','').trim().toLowerCase()!==MODE)return;
    setCore('color_mode','light',{events:false});
    syncAll();
  }

  function buildControlCenter(){
    if(root&&document.contains(root))return true;
    const section=q('#card-experience-section');
    if(!section)return false;

    root=document.createElement('section');
    root.id='barber-control-center';
    root.className='barber-v5-control-center';
    root.hidden=true;
    root.innerHTML=`
      <div class="barber-v5-hero">
        <span class="barber-v5-pole" aria-hidden="true"></span>
        <div class="barber-v5-hero-icon"><i data-lucide="scissors" size="21"></i></div>
        <div class="barber-v5-hero-copy"><span>LIW BARBER EXPERIENCE</span><h3>Barber Control Center</h3><p>Your saved barber details, client promo, shop info and barber tools—all in one place.</p></div>
        <span class="barber-v5-live"><i></i> LIVE THEME</span>
      </div>
      <div class="barber-v5-tabs" role="tablist" aria-label="Barber Control Center">
        <button type="button" class="active" data-barber-v5-tab="info"><i data-lucide="badge-scissors" size="15"></i> Barber Info</button>
        <button type="button" data-barber-v5-tab="look"><i data-lucide="palette" size="15"></i> Look</button>
        <button type="button" data-barber-v5-tab="tools"><i data-lucide="layout-dashboard" size="15"></i> Client Tools</button>
      </div>

      <div class="barber-v5-panel active" data-barber-v5-panel="info">
        <div class="barber-v5-panel-head"><div><strong>Your chair</strong><span>These values are the same saved details used by the public card.</span></div><i data-lucide="badge-check" size="19"></i></div>
        <div class="barber-v5-grid">
          <label><span>Barber name</span><input data-barber-v5-field="barber_name" type="text" placeholder="Marcus the Barber"></label>
          <label><span>Specialty / title</span><input data-barber-v5-field="specialty" type="text" placeholder="Master Barber · Fades & Beards"></label>
          <label><span>Shop name</span><input data-barber-v5-field="shop_name" type="text" placeholder="Legacy Cuts"></label>
          <label><span>Shop location</span><input data-barber-v5-field="location" type="text" placeholder="Brooklyn, NY"></label>
          <label><span>Call number</span><input data-barber-v5-field="phone" type="tel" placeholder="(555) 555-0199"></label>
          <label><span>Text number</span><input data-barber-v5-field="text_phone" type="tel" placeholder="Same as call number if blank"></label>
          <label class="barber-v5-wide"><span>Client promo / chair status</span><input data-barber-v5-field="promo" type="text" placeholder="Walk-ins welcome · Available today"></label>
          <label class="barber-v5-wide"><span>Welcome message</span><textarea data-barber-v5-field="welcome" maxlength="320" placeholder="Fresh cuts. Sharp details. Leave the chair looking ready."></textarea></label>
        </div>
        <div class="barber-v5-note"><i data-lucide="sparkles" size="16"></i><span>The public Barbershop home uses this information for the welcome/promo experience. Nothing here creates a second copy of your data.</span></div>
      </div>

      <div class="barber-v5-panel" data-barber-v5-panel="look" hidden>
        <div class="barber-v5-panel-head"><div><strong>Shop vibe</strong><span>Choose a barber-ready palette or customize the colors below.</span></div><i data-lucide="swatch-book" size="19"></i></div>
        <div class="barber-v5-presets">
          ${Object.entries(presets).map(([key,p])=>`<button type="button" data-barber-v5-preset="${key}"><span><i style="--c:${p.primary}"></i><i style="--c:${p.secondary}"></i><i style="--c:${p.background}"></i></span><strong>${p.label}</strong></button>`).join('')}
        </div>
        <div class="barber-v5-colors">
          ${['primary_color','secondary_color','background_color','text_color'].map((name,index)=>`<label><span>${['Primary','Accent','Background','Text'][index]}</span><div><input type="color" data-barber-v5-color="${name}"><code data-barber-v5-code="${name}"></code></div></label>`).join('')}
        </div>
        <div class="barber-v5-look-preview"><span></span><div><small>CLIENT VIEW</small><strong data-barber-v5-preview-name>YOUR BARBER</strong><em>BOOK MY CHAIR</em></div></div>
      </div>

      <div class="barber-v5-panel" data-barber-v5-panel="tools" hidden>
        <div class="barber-v5-panel-head"><div><strong>Client tools</strong><span>Barber shortcuts into the LIW tools already powering the card.</span></div><i data-lucide="briefcase-business" size="19"></i></div>
        <div class="barber-v5-tools">
          <button type="button" data-barber-v5-jump="booking"><i data-lucide="calendar-check-2" size="20"></i><span><strong>LIW Appointments</strong><small>Book My Chair uses our appointment system</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-v5-jump="services"><i data-lucide="scissors" size="20"></i><span><strong>Cuts & prices</strong><small>Services, pricing and details</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-v5-jump="photos"><i data-lucide="images" size="20"></i><span><strong>Fresh Cuts gallery</strong><small>Profile, cover and visual work</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-v5-jump="social"><i data-lucide="instagram" size="20"></i><span><strong>Social profiles</strong><small>Instagram, TikTok and more</small></span><i data-lucide="chevron-right" size="16"></i></button>
        </div>
        <div class="barber-v5-status">
          <div><i data-lucide="map-pin" size="16"></i><span>Shop</span><strong data-barber-v5-location>Not set</strong></div>
          <div><i data-lucide="calendar-check" size="16"></i><span>Appointments</span><strong data-barber-v5-booking>Check setup</strong></div>
        </div>
      </div>`;
    section.insertAdjacentElement('afterend',root);
    bindControlCenter();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function bindControlCenter(){
    qa('[data-barber-v5-tab]',root).forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.barberV5Tab;
      qa('[data-barber-v5-tab]',root).forEach(item=>item.classList.toggle('active',item===button));
      qa('[data-barber-v5-panel]',root).forEach(panel=>{
        const show=panel.dataset.barberV5Panel===id;
        panel.classList.toggle('active',show);
        panel.hidden=!show;
      });
    }));

    qa('[data-barber-v5-field]',root).forEach(input=>{
      input.addEventListener('input',()=>{
        const core=proxyFields[input.dataset.barberV5Field];
        setCore(core,input.value);
        syncStatus();
      });
      input.addEventListener('change',()=>callRenderAndSave());
    });

    qa('[data-barber-v5-preset]',root).forEach(button=>button.addEventListener('click',()=>applyPreset(button.dataset.barberV5Preset)));
    qa('[data-barber-v5-color]',root).forEach(input=>input.addEventListener('input',()=>{
      setCore(input.dataset.barberV5Color,input.value);
      setCore('color_mode',MODE);
      syncDerivedColors();
      syncControls();
      callRenderAndSave();
    }));
    qa('[data-barber-v5-jump]',root).forEach(button=>button.addEventListener('click',()=>jumpTo(button.dataset.barberV5Jump)));
  }

  function jumpTo(kind){
    const selectors={
      booking:['[name="booking_enabled"]','[name="booking_url"]'],
      services:['#service-list','[name="services_enabled"]'],
      photos:['#profile-file','#cover-file','[name="cover_image_url"]'],
      social:['#social-list','[data-social-index]']
    };
    let target=null;
    for(const selector of selectors[kind]||[]){target=q(selector);if(target)break;}
    if(!target){if(typeof toast==='function')toast('That LIW tool is not available in this editor view yet.');return;}
    const panel=target.closest('.editor-panel');
    if(panel?.dataset.panel)q(`.editor-tab[data-tab="${panel.dataset.panel}"]`)?.click();
    if(panel?.dataset.panel==='tools')q('#show-business-tools')?.click();
    setTimeout(()=>{
      const section=target.closest('.tool-editor-card,.form-section')||target;
      section.scrollIntoView({behavior:'smooth',block:'center'});
      if(!target.matches('input[type="hidden"],[hidden]'))try{target.focus({preventScroll:true});}catch(_){ }
    },90);
  }

  function syncControls(){
    if(!root||syncing)return;
    syncing=true;
    try{
      Object.entries(proxyFields).forEach(([proxy,core])=>{
        const input=q(`[data-barber-v5-field="${proxy}"]`,root);
        if(input&&input!==document.activeElement)input.value=coreValue(core,'');
      });
      ['primary_color','secondary_color','background_color','text_color'].forEach(name=>{
        const value=coreValue(name,name==='background_color'?'#ffffff':'#111111');
        const input=q(`[data-barber-v5-color="${name}"]`,root);
        const code=q(`[data-barber-v5-code="${name}"]`,root);
        if(input&&/^#[0-9a-f]{6}$/i.test(value)&&input!==document.activeElement)input.value=value;
        if(code)code.textContent=value.toUpperCase();
      });
      const previewName=q('[data-barber-v5-preview-name]',root);
      if(previewName)previewName.textContent=(coreValue('full_name','YOUR BARBER')||'YOUR BARBER').toUpperCase();
      syncPreset();
      syncStatus();
    }finally{syncing=false;}
  }

  function syncPreset(){
    const values={
      primary:coreValue('primary_color','').toLowerCase(),secondary:coreValue('secondary_color','').toLowerCase(),
      background:coreValue('background_color','').toLowerCase(),text:coreValue('text_color','').toLowerCase()
    };
    let match='';
    Object.entries(presets).some(([key,p])=>{
      if(p.primary===values.primary&&p.secondary===values.secondary&&p.background===values.background&&p.text===values.text){match=key;return true;}
      return false;
    });
    qa('[data-barber-v5-preset]',root).forEach(button=>button.classList.toggle('active',button.dataset.barberV5Preset===match));
  }

  function syncStatus(){
    if(!root)return;
    const location=q('[data-barber-v5-location]',root);
    if(location)location.textContent=coreValue('business_address','').trim()||'Not set';
    const booking=q('[data-barber-v5-booking]',root);
    if(booking){
      const enabled=coreField('booking_enabled')?.checked===true;
      booking.textContent=enabled?'LIW Appointments on':'Check setup';
    }
  }

  function syncExperienceUi(){
    const section=q('#card-experience-section');
    if(!section)return;
    const on=active();
    section.classList.toggle('barbershop-selected',on);
    if(experienceButton){
      experienceButton.classList.toggle('active',on);
      experienceButton.setAttribute('aria-pressed',on?'true':'false');
    }
    if(on){
      qa('.card-experience-option',section).forEach(button=>{
        if(button!==experienceButton)button.setAttribute('aria-pressed','false');
      });
    }
    if(root){root.hidden=!on;root.classList.toggle('is-active',on);}
  }

  function syncAll(){
    ensureExperienceOption();
    buildControlCenter();
    syncExperienceUi();
    if(active())syncControls();
  }

  function stopObserver(){
    try{observer?.disconnect();}catch(_){ }
    observer=null;
    if(observerStop){clearTimeout(observerStop);observerStop=0;}
  }

  function mount(){
    const optionReady=ensureExperienceOption();
    const centerReady=buildControlCenter();
    if(optionReady&&centerReady){syncAll();stopObserver();return true;}
    return false;
  }

  function init(){
    if(mount())return;
    const target=q('.editor-panel[data-panel="design"]')||document.body;
    if(!target)return;
    observer=new MutationObserver(()=>{
      if(mount())stopObserver();
    });
    observer.observe(target,{childList:true,subtree:true});
    observerStop=setTimeout(stopObserver,4500);
  }

  document.addEventListener('click',event=>{
    const experience=event.target.closest?.('[data-card-experience]');
    if(experience&&experience.dataset.cardExperience!=='barbershop'&&active()){
      deactivateBarbershop();
      setTimeout(syncAll,0);
    }
    const template=event.target.closest?.('.template-card');
    if(template&&active()){
      deactivateBarbershop();
      setTimeout(syncAll,0);
    }
  },true);

  document.addEventListener('input',event=>{
    const name=event.target?.name;
    if(!name||event.target?.closest?.('#barber-control-center'))return;
    if(Object.values(proxyFields).includes(name)||['primary_color','secondary_color','background_color','text_color','color_mode','card_experience'].includes(name))setTimeout(syncAll,0);
  },true);
  document.addEventListener('change',event=>{
    const name=event.target?.name;
    if(['color_mode','card_experience','template_id','booking_enabled'].includes(name))setTimeout(syncAll,0);
  },true);

  window.LIWBarbershopEditor={activate:activateBarbershop,isActive:active,applyPreset,refresh:syncAll};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
