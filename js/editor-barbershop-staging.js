/* LIW Cards staging — Barbershop template + dedicated Barber Control Center.
   Uses existing saved card fields so staging does not need a new Supabase schema value. */
(function(){
  'use strict';
  if(window.__LIW_BARBERSHOP_EDITOR_STAGING__)return;
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
    booking:'booking_url',
    headline:'headline'
  };
  let root=null;
  let templateCard=null;
  let syncing=false;

  function q(sel,scope=document){return scope.querySelector(sel);}
  function qa(sel,scope=document){return [...scope.querySelectorAll(sel)];}
  function coreField(name){return q(`[name="${name}"]`);}
  function coreValue(name,fallback=''){const el=coreField(name);return el?String(el.value??''):fallback;}
  function currentExperience(){return coreValue('card_experience','classic').trim().toLowerCase();}
  function active(){return coreValue('color_mode','').trim().toLowerCase()===MODE&&currentExperience()!=='music';}
  function emit(el,type){try{el.dispatchEvent(new Event(type,{bubbles:true}));}catch(_){ }}
  function setCore(name,value,{events=true}={}){
    const el=coreField(name);if(!el)return false;
    const next=String(value??'');
    if(String(el.value??'')===next)return true;
    el.value=next;
    if(events){emit(el,'input');emit(el,'change');}
    return true;
  }
  function callRender(){
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
  function applyPreset(key,{announce=true}={}){
    const preset=presets[key]||presets[DEFAULT_PRESET];
    setCore('primary_color',preset.primary);
    setCore('secondary_color',preset.secondary);
    setCore('background_color',preset.background);
    setCore('text_color',preset.text);
    syncDerivedColors();
    if(root)root.dataset.barberPreset=key;
    syncControls();
    syncPreview();
    if(announce&&typeof toast==='function')toast(`${preset.label} barber colors applied`);
  }

  function activateBarbershop(){
    const wasActive=coreValue('color_mode','').trim().toLowerCase()===MODE;
    if(currentExperience()==='music')setCore('card_experience','classic');
    setCore('template_id','');
    setCore('color_mode',MODE);
    setCore('profile_image_shape','circle');
    setCore('button_style','filled');
    if(!wasActive)applyPreset(DEFAULT_PRESET,{announce:false});
    const summary=q('#template-selected-summary');if(summary)summary.textContent='Barbershop';
    syncVisibility();
    syncTemplateCard();
    syncControls();
    syncPreview();
    callRender();
    if(typeof toast==='function')toast('Barbershop selected — Barber Control Center is ready');
    setTimeout(()=>root?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }

  function deactivateForStandardTemplate(card){
    if(!active()||!card||card===templateCard)return;
    if(card.matches('[disabled],[aria-disabled="true"],.locked'))return;
    setCore('color_mode','light',{events:false});
    setTimeout(()=>{syncVisibility();syncTemplateCard();syncPreview();},80);
  }

  function injectTemplate(){
    const grid=q('#template-grid');if(!grid)return false;
    let group=q('[data-barbershop-template-group]',grid);
    if(!group){
      group=document.createElement('section');
      group.className='template-tier-group barber-template-group';
      group.dataset.barbershopTemplateGroup='true';
      group.innerHTML=`
        <div class="barber-template-heading">
          <div><span class="barber-template-kicker">INDUSTRY THEME</span><strong>Built for the chair</strong></div>
          <span>Barbershop</span>
        </div>
        <div class="barber-template-grid"></div>`;
      grid.prepend(group);
    }
    const holder=q('.barber-template-grid',group);
    templateCard=q('[data-barbershop-template]',holder);
    if(!templateCard){
      templateCard=document.createElement('button');
      templateCard.type='button';
      templateCard.className='template-card barber-template-card';
      templateCard.dataset.barbershopTemplate='true';
      templateCard.setAttribute('aria-label','Use Barbershop template');
      templateCard.innerHTML=`
        <span class="barber-template-preview" aria-hidden="true">
          <span class="barber-pole-mini"></span>
          <span class="barber-template-avatar">✂</span>
          <span class="barber-template-name">MARCUS</span>
          <span class="barber-template-cta">BOOK MY CHAIR</span>
          <span class="barber-template-tools"><i></i><i></i><i></i></span>
        </span>
        <span class="barber-template-copy"><strong>Barbershop</strong><small>Booking · services · cuts · shop info</small></span>
        <span class="barber-template-badge">NEW</span>`;
      holder.appendChild(templateCard);
      templateCard.addEventListener('click',activateBarbershop);
    }
    syncTemplateCard();
    return true;
  }

  function build(){
    if(root)return true;
    const design=q('.editor-panel[data-panel="design"]');if(!design)return false;
    const anchor=q('#card-experience-section')||design.querySelector('.form-section');if(!anchor)return false;
    root=document.createElement('section');
    root.id='barber-control-center';
    root.className='barber-control-center';
    root.hidden=true;
    root.innerHTML=`
      <div class="barber-hero">
        <div class="barber-hero-mark"><span></span><i data-lucide="scissors" size="20"></i></div>
        <div class="barber-hero-copy">
          <span class="barber-kicker">LIW BARBERSHOP</span>
          <h3>Barber Control Center</h3>
          <p>Run the barber-facing parts of this card from one place. Your changes still use LIW's normal save and preview system.</p>
        </div>
        <span class="barber-live-pill"><i></i> BARBER THEME</span>
      </div>

      <div class="barber-tabs" role="tablist" aria-label="Barbershop editor">
        <button type="button" class="active" data-barber-tab="setup"><i data-lucide="user-round" size="15"></i> Setup</button>
        <button type="button" data-barber-tab="style"><i data-lucide="palette" size="15"></i> Theme</button>
        <button type="button" data-barber-tab="business"><i data-lucide="briefcase-business" size="15"></i> Business</button>
      </div>

      <div class="barber-panel active" data-barber-panel="setup">
        <div class="barber-panel-heading"><div><strong>Chair identity</strong><span>The essentials customers see before they book.</span></div><i data-lucide="badge-check" size="19"></i></div>
        <div class="barber-form-grid">
          <label><span>Barber name</span><input type="text" data-barber-field="barber_name" placeholder="Marcus the Barber"></label>
          <label><span>Specialty / title</span><input type="text" data-barber-field="specialty" placeholder="Master Barber · Fades & Beards"></label>
          <label><span>Shop name</span><input type="text" data-barber-field="shop_name" placeholder="Legacy Cuts"></label>
          <label><span>Shop location</span><input type="text" data-barber-field="location" placeholder="Brooklyn, NY"></label>
          <label><span>Phone</span><input type="tel" data-barber-field="phone" placeholder="(555) 555-0199"></label>
          <label><span>Booking link</span><input type="url" data-barber-field="booking" placeholder="https://..."></label>
          <label class="barber-field-wide"><span>Chair status / headline</span><input type="text" data-barber-field="headline" placeholder="Walk-ins welcome · Available today"></label>
        </div>
        <div class="barber-setup-note"><i data-lucide="sparkles" size="16"></i><span>Tip: use the headline for a live-looking message such as <strong>Walk-ins welcome</strong>, <strong>Available today</strong>, or <strong>Appointments preferred</strong>.</span></div>
      </div>

      <div class="barber-panel" data-barber-panel="style" hidden>
        <div class="barber-panel-heading"><div><strong>Barber theme colors</strong><span>Start with a shop vibe, then make every color your own.</span></div><i data-lucide="swatch-book" size="19"></i></div>
        <div class="barber-preset-grid">
          ${Object.entries(presets).map(([key,p])=>`<button type="button" data-barber-preset="${key}"><span class="barber-preset-swatch"><i style="--c:${p.primary}"></i><i style="--c:${p.secondary}"></i><i style="--c:${p.background}"></i></span><strong>${p.label}</strong></button>`).join('')}
        </div>
        <div class="barber-color-grid">
          <label><span>Primary</span><div><input type="color" data-barber-color="primary_color"><code data-barber-color-code="primary_color"></code></div></label>
          <label><span>Accent</span><div><input type="color" data-barber-color="secondary_color"><code data-barber-color-code="secondary_color"></code></div></label>
          <label><span>Background</span><div><input type="color" data-barber-color="background_color"><code data-barber-color-code="background_color"></code></div></label>
          <label><span>Text</span><div><input type="color" data-barber-color="text_color"><code data-barber-color-code="text_color"></code></div></label>
        </div>
        <div class="barber-style-preview">
          <span class="barber-style-pole"></span>
          <div><small>LIVE STYLE</small><strong data-barber-style-name>YOUR BARBER</strong><span>BOOK MY CHAIR</span></div>
        </div>
      </div>

      <div class="barber-panel" data-barber-panel="business" hidden>
        <div class="barber-panel-heading"><div><strong>Barber business tools</strong><span>Jump straight to the LIW tools a barber uses most.</span></div><i data-lucide="layout-dashboard" size="19"></i></div>
        <div class="barber-tool-grid">
          <button type="button" data-barber-jump="booking"><i data-lucide="calendar-days" size="20"></i><span><strong>Book My Chair</strong><small>Booking link / appointments</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-jump="services"><i data-lucide="scissors" size="20"></i><span><strong>Services & prices</strong><small>Cuts, beard, kids, designs</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-jump="photos"><i data-lucide="images" size="20"></i><span><strong>Fresh Cuts look</strong><small>Profile + cover photos</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-jump="social"><i data-lucide="instagram" size="20"></i><span><strong>Social proof</strong><small>Instagram, TikTok and more</small></span><i data-lucide="chevron-right" size="16"></i></button>
        </div>
        <div class="barber-business-strip">
          <div><i data-lucide="map-pin" size="17"></i><span>Shop location</span><strong data-barber-business-location>Not set</strong></div>
          <div><i data-lucide="calendar-check" size="17"></i><span>Booking</span><strong data-barber-business-booking>Not set</strong></div>
        </div>
      </div>`;
    anchor.insertAdjacentElement('afterend',root);
    bind();
    syncControls();
    syncVisibility();
    syncPreview();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function bind(){
    qa('[data-barber-tab]',root).forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.barberTab;
      qa('[data-barber-tab]',root).forEach(item=>item.classList.toggle('active',item===button));
      qa('[data-barber-panel]',root).forEach(panel=>{const on=panel.dataset.barberPanel===id;panel.classList.toggle('active',on);panel.hidden=!on;});
    }));

    qa('[data-barber-field]',root).forEach(input=>{
      input.addEventListener('input',()=>{
        const core=proxyFields[input.dataset.barberField];
        setCore(core,input.value);
        syncPreview();
        syncBusinessStatus();
      });
      input.addEventListener('change',()=>{const core=proxyFields[input.dataset.barberField];setCore(core,input.value);});
    });

    qa('[data-barber-preset]',root).forEach(button=>button.addEventListener('click',()=>{
      setCore('color_mode',MODE);
      applyPreset(button.dataset.barberPreset);
      callRender();
    }));

    qa('[data-barber-color]',root).forEach(input=>{
      input.addEventListener('input',()=>{
        setCore(input.dataset.barberColor,input.value);
        setCore('color_mode',MODE);
        syncDerivedColors();
        syncControls();
        syncPreview();
        callRender();
      });
    });

    qa('[data-barber-jump]',root).forEach(button=>button.addEventListener('click',()=>jumpTo(button.dataset.barberJump)));
  }

  function jumpTo(kind){
    const selectors={
      booking:['[name="booking_url"]','[name="booking_enabled"]'],
      services:['#services-list','#service-list','[name="services_enabled"]'],
      photos:['#cover-dropzone','#profile-dropzone','[name="cover_image_url"]'],
      social:['#social-links-list','#social-list','[data-social-platform]']
    };
    let target=null;
    for(const selector of selectors[kind]||[]){target=q(selector);if(target)break;}
    if(!target){if(typeof toast==='function')toast('Open the matching section in the main editor to finish this setup.');return;}
    const panel=target.closest('.editor-panel');
    if(panel?.dataset.panel){
      q(`.editor-tab[data-tab="${panel.dataset.panel}"]`)?.click();
    }
    setTimeout(()=>{
      const section=target.closest('.form-section')||target;
      section.scrollIntoView({behavior:'smooth',block:'center'});
      if(!target.matches('input[type="hidden"],[hidden]'))try{target.focus({preventScroll:true});}catch(_){ }
    },80);
  }

  function syncControls(){
    if(!root||syncing)return;syncing=true;
    try{
      Object.entries(proxyFields).forEach(([proxy,core])=>{const input=q(`[data-barber-field="${proxy}"]`,root);if(input&&input!==document.activeElement)input.value=coreValue(core,'');});
      ['primary_color','secondary_color','background_color','text_color'].forEach(name=>{
        const value=coreValue(name,name==='background_color'?'#ffffff':'#111111');
        const input=q(`[data-barber-color="${name}"]`,root);
        const code=q(`[data-barber-color-code="${name}"]`,root);
        if(input&&/^#[0-9a-f]{6}$/i.test(value)&&input!==document.activeElement)input.value=value;
        if(code)code.textContent=value.toUpperCase();
      });
      const name=q('[data-barber-style-name]',root);if(name)name.textContent=(coreValue('full_name','YOUR BARBER')||'YOUR BARBER').toUpperCase();
      const style=q('.barber-style-preview',root);if(style){style.style.setProperty('--barber-primary',coreValue('primary_color','#111111'));style.style.setProperty('--barber-secondary',coreValue('secondary_color','#d4a84f'));}
      syncBusinessStatus();
      syncPresetSelection();
    }finally{syncing=false;}
  }

  function syncBusinessStatus(){
    if(!root)return;
    const loc=q('[data-barber-business-location]',root);if(loc)loc.textContent=coreValue('business_address','').trim()||'Not set';
    const booking=q('[data-barber-business-booking]',root);if(booking)booking.textContent=coreValue('booking_url','').trim()?'Ready':'Not set';
  }

  function syncPresetSelection(){
    if(!root)return;
    const values={
      primary:coreValue('primary_color','').toLowerCase(),
      secondary:coreValue('secondary_color','').toLowerCase(),
      background:coreValue('background_color','').toLowerCase(),
      text:coreValue('text_color','').toLowerCase()
    };
    let match='';
    Object.entries(presets).some(([key,p])=>{
      const yes=p.primary===values.primary&&p.secondary===values.secondary&&p.background===values.background&&p.text===values.text;
      if(yes)match=key;return yes;
    });
    root.dataset.barberPreset=match||'custom';
    qa('[data-barber-preset]',root).forEach(button=>button.classList.toggle('active',button.dataset.barberPreset===match));
  }

  function syncTemplateCard(){
    if(!templateCard)return;
    const on=coreValue('color_mode','').trim().toLowerCase()===MODE;
    templateCard.classList.toggle('active',on);
    templateCard.setAttribute('aria-pressed',on?'true':'false');
  }

  function syncVisibility(){
    if(!root)return;
    const on=active();
    root.hidden=!on;
    root.classList.toggle('is-active',on);
    if(on)syncControls();
  }

  function syncPreview(){
    const phone=q('#phone-preview');if(!phone)return;
    const on=active();
    phone.classList.toggle('preview-barbershop-selected',on);
    if(!on){
      const save=q('.preview-save-contact span',phone);if(save&&save.dataset.barberOriginal){save.textContent=save.dataset.barberOriginal;delete save.dataset.barberOriginal;}
      q('.barber-preview-ribbon',phone)?.remove();
      return;
    }
    phone.style.setProperty('--barber-primary',coreValue('primary_color','#111111'));
    phone.style.setProperty('--barber-secondary',coreValue('secondary_color','#d4a84f'));
    phone.style.setProperty('--barber-bg',coreValue('background_color','#090909'));
    phone.style.setProperty('--barber-text',coreValue('text_color','#f8f4e8'));
    const save=q('.preview-save-contact span',phone);
    if(save){if(!save.dataset.barberOriginal)save.dataset.barberOriginal=save.textContent||'Save to contacts';save.textContent='Save My Barber';}
    let ribbon=q('.barber-preview-ribbon',phone);
    if(!ribbon){
      ribbon=document.createElement('div');
      ribbon.className='barber-preview-ribbon';
      ribbon.innerHTML='<span class="barber-preview-pole"></span><strong>BARBERSHOP</strong><em>Book · Cuts · Shop</em>';
      q('.preview-content',phone)?.prepend(ribbon);
    }
  }

  document.addEventListener('click',event=>{
    const card=event.target.closest?.('.template-card');
    if(card&&!card.matches('[data-barbershop-template]'))deactivateForStandardTemplate(card);
    if(event.target.closest?.('[data-card-experience="music"]'))setTimeout(()=>{syncVisibility();syncPreview();},50);
  },true);

  document.addEventListener('input',event=>{
    const name=event.target?.name;
    if(!name||event.target?.closest?.('#barber-control-center'))return;
    if(Object.values(proxyFields).includes(name)||['primary_color','secondary_color','background_color','text_color','color_mode','card_experience'].includes(name)){
      setTimeout(()=>{syncControls();syncVisibility();syncTemplateCard();syncPreview();},0);
    }
  },true);
  document.addEventListener('change',event=>{
    const name=event.target?.name;
    if(['color_mode','card_experience','template_id'].includes(name))setTimeout(()=>{syncVisibility();syncTemplateCard();syncPreview();},0);
  },true);

  window.LIWBarbershopEditor={
    activate:activateBarbershop,
    isActive:active,
    applyPreset,
    refresh(){injectTemplate();build();syncVisibility();syncTemplateCard();syncControls();syncPreview();}
  };

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    injectTemplate();
    build();
    syncVisibility();
    syncTemplateCard();
    if(attempts>100)clearInterval(timer);
  },250);
  injectTemplate();build();
})();