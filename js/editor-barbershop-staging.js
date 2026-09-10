/* LIW Cards staging — Barbershop card experience + dedicated Barber Control Center.
   Barbershop is exposed as a first-class editor experience while color_mode remains
   the persisted compatibility marker, avoiding a Supabase schema migration. */
(function(){
  'use strict';
  if(window.__LIW_BARBERSHOP_EDITOR_V2_STAGING__)return;
  window.__LIW_BARBERSHOP_EDITOR_V2_STAGING__=true;
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
    booking:'booking_url',
    headline:'headline'
  };
  let root=null;
  let pickerButton=null;
  let syncing=false;
  let previewView='home';
  let pickerObserver=null;

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
  function initials(value){
    const words=String(value||'Your Barber').trim().split(/\s+/).filter(Boolean);
    return (words.slice(0,2).map(word=>word[0]).join('')||'YB').toUpperCase();
  }
  function escPreview(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function syncDerivedColors(){
    const primary=coreValue('primary_color','#111111');
    const secondary=coreValue('secondary_color','#d4a84f');
    setCore('button_color',secondary);
    setCore('button_text_color',contrast(secondary));
    setCore('gradient_background',`linear-gradient(135deg,${primary},${secondary})`);
  }
  function applyPreset(key,{announce=true}={}){
    const preset=presets[key]||presets[DEFAULT_PRESET];
    setCore('primary_color',preset.primary);
    setCore('secondary_color',preset.secondary);
    setCore('background_color',preset.background);
    setCore('text_color',preset.text);
    setCore('color_mode',MODE);
    syncDerivedColors();
    if(root)root.dataset.barberPreset=key;
    syncControls();
    syncPreview();
    callRender();
    if(announce&&typeof toast==='function')toast(`${preset.label} barber colors applied`);
  }

  function removeLegacyTemplateCard(){
    q('[data-barbershop-template-group]')?.remove();
  }

  function ensureExperienceOption(){
    const section=q('#card-experience-section');
    const grid=section?.querySelector('.card-experience-grid');
    if(!section||!grid)return false;
    removeLegacyTemplateCard();
    pickerButton=grid.querySelector('[data-card-experience="barbershop"]');
    if(!pickerButton){
      pickerButton=document.createElement('button');
      pickerButton.type='button';
      pickerButton.className='card-experience-option barber-experience-option';
      pickerButton.dataset.cardExperience='barbershop';
      pickerButton.dataset.liwBarberExperience='true';
      pickerButton.setAttribute('aria-label','Use the Barbershop card experience');
      pickerButton.innerHTML=`
        <span class="card-experience-number barber-experience-number">D</span>
        <strong><span class="barber-experience-icon" aria-hidden="true"><span></span><i data-lucide="scissors" size="17"></i></span> Barbershop</strong>
        <span>Full-screen barber card with fixed identity, Book My Chair and a revolving action dock.</span>`;
      pickerButton.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        activateBarbershop();
      });
      grid.appendChild(pickerButton);
    }
    const note=section.querySelector('.card-experience-note');
    if(note&&!note.dataset.barberCopy){
      note.dataset.barberCopy='true';
      note.innerHTML='<strong>Experience changes the whole card:</strong> Classic scrolls, Flow swipes, Showtime serves artists, and Barbershop stays full-screen while customers rotate through barber actions.';
    }
    const saveCopy=section.querySelector('.card-experience-save-copy span');
    if(saveCopy)saveCopy.textContent='Save Classic, Flow, Showtime or Barbershop immediately without scrolling back to the top.';
    if(!pickerObserver){
      pickerObserver=new MutationObserver(()=>syncPicker());
      pickerObserver.observe(grid,{subtree:true,attributes:true,attributeFilter:['class']});
    }
    syncPicker();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function syncPicker(){
    const section=q('#card-experience-section');
    if(!section)return;
    const on=active();
    pickerButton=section.querySelector('[data-card-experience="barbershop"]');
    if(on){
      section.querySelectorAll('[data-card-experience]').forEach(button=>button.classList.toggle('active',button===pickerButton));
      pickerButton?.setAttribute('aria-pressed','true');
    }else{
      pickerButton?.classList.remove('active');
      pickerButton?.setAttribute('aria-pressed','false');
    }
    section.classList.toggle('barbershop-experience-active',on);
  }

  function activateBarbershop(){
    const wasActive=active();
    if(currentExperience()!=='classic')setCore('card_experience','classic');
    setCore('color_mode',MODE);
    setCore('profile_image_shape','circle');
    setCore('button_style','filled');
    if(!wasActive)applyPreset(DEFAULT_PRESET,{announce:false});
    ensureExperienceOption();
    build();
    syncVisibility();
    syncControls();
    syncPicker();
    syncPreview();
    callRender();
    if(typeof toast==='function')toast('Barbershop selected — Barber Control Center is ready');
    setTimeout(()=>root?.scrollIntoView({behavior:'smooth',block:'start'}),80);
  }

  function leaveBarbershop(){
    if(!active())return;
    setCore('color_mode','light',{events:false});
    syncVisibility();
    syncPicker();
    syncPreview();
  }

  function build(){
    if(root)return true;
    const design=q('.editor-panel[data-panel="design"]');
    const anchor=q('#card-experience-section');
    if(!design||!anchor)return false;
    root=document.createElement('section');
    root.id='barber-control-center';
    root.className='barber-control-center';
    root.hidden=true;
    root.innerHTML=`
      <div class="barber-hero">
        <div class="barber-hero-mark"><span></span><i data-lucide="scissors" size="20"></i></div>
        <div class="barber-hero-copy">
          <span class="barber-kicker">LIW BARBER CARD</span>
          <h3>Barber Control Center</h3>
          <p>Build the fixed full-screen barber experience. Cover and profile stay in place while customer-selected information changes in the center.</p>
        </div>
        <span class="barber-live-pill"><i></i> FULL SCREEN</span>
      </div>
      <div class="barber-tabs" role="tablist" aria-label="Barbershop editor">
        <button type="button" class="active" data-barber-tab="setup"><i data-lucide="user-round" size="15"></i> Setup</button>
        <button type="button" data-barber-tab="style"><i data-lucide="palette" size="15"></i> Theme</button>
        <button type="button" data-barber-tab="actions"><i data-lucide="gallery-horizontal-end" size="15"></i> Flow Dock</button>
      </div>
      <div class="barber-panel active" data-barber-panel="setup">
        <div class="barber-panel-heading"><div><strong>Chair identity</strong><span>This identity stays anchored while customers rotate through actions.</span></div><i data-lucide="badge-check" size="19"></i></div>
        <div class="barber-form-grid">
          <label><span>Barber name</span><input type="text" data-barber-field="barber_name" placeholder="Marcus the Barber"></label>
          <label><span>Specialty / title</span><input type="text" data-barber-field="specialty" placeholder="Master Barber · Fades & Beards"></label>
          <label><span>Shop name</span><input type="text" data-barber-field="shop_name" placeholder="Legacy Cuts"></label>
          <label><span>Shop location</span><input type="text" data-barber-field="location" placeholder="Brooklyn, NY"></label>
          <label><span>Call number</span><input type="tel" data-barber-field="phone" placeholder="(555) 555-0199"></label>
          <label><span>Text number</span><input type="tel" data-barber-field="text_phone" placeholder="Use mobile number for texts"></label>
          <label><span>Booking link</span><input type="url" data-barber-field="booking" placeholder="https://..."></label>
          <label><span>Chair status</span><input type="text" data-barber-field="headline" placeholder="Walk-ins welcome · Available today"></label>
        </div>
        <div class="barber-setup-note"><i data-lucide="sparkles" size="16"></i><span><strong>Top stays put:</strong> cover + profile never move. The center changes to Book, Call, Text, Services, Social, Location or Save when the customer selects the bottom dock.</span></div>
      </div>
      <div class="barber-panel" data-barber-panel="style" hidden>
        <div class="barber-panel-heading"><div><strong>Premium barber themes</strong><span>Every preset recolors the CTA, dock, profile ring and center stage.</span></div><i data-lucide="swatch-book" size="19"></i></div>
        <div class="barber-preset-grid">
          ${Object.entries(presets).map(([key,p])=>`<button type="button" data-barber-preset="${key}"><span class="barber-preset-swatch"><i style="--c:${p.primary}"></i><i style="--c:${p.secondary}"></i><i style="--c:${p.background}"></i></span><strong>${p.label}</strong></button>`).join('')}
        </div>
        <div class="barber-color-grid">
          <label><span>Primary</span><div><input type="color" data-barber-color="primary_color"><code data-barber-color-code="primary_color"></code></div></label>
          <label><span>Accent</span><div><input type="color" data-barber-color="secondary_color"><code data-barber-color-code="secondary_color"></code></div></label>
          <label><span>Background</span><div><input type="color" data-barber-color="background_color"><code data-barber-color-code="background_color"></code></div></label>
          <label><span>Text</span><div><input type="color" data-barber-color="text_color"><code data-barber-color-code="text_color"></code></div></label>
        </div>
        <div class="barber-style-preview"><span class="barber-style-pole"></span><div><small>LIVE STYLE</small><strong data-barber-style-name>YOUR BARBER</strong><span>BOOK MY CHAIR</span></div></div>
      </div>
      <div class="barber-panel" data-barber-panel="actions" hidden>
        <div class="barber-panel-heading"><div><strong>Revolving Flow Dock</strong><span>The dock only shows actions the barber has configured.</span></div><i data-lucide="move-horizontal" size="19"></i></div>
        <div class="barber-dock-map" aria-label="Barbershop bottom dock preview">
          <span class="active"><i data-lucide="house" size="17"></i><b>Home</b></span><span><i data-lucide="calendar-days" size="17"></i><b>Book</b></span><span><i data-lucide="phone" size="17"></i><b>Call</b></span><span><i data-lucide="message-circle" size="17"></i><b>Text</b></span><span><i data-lucide="scissors" size="17"></i><b>Services</b></span><span><i data-lucide="instagram" size="17"></i><b>Social</b></span>
        </div>
        <div class="barber-tool-grid">
          <button type="button" data-barber-jump="booking"><i data-lucide="calendar-days" size="20"></i><span><strong>Book My Chair</strong><small>Set booking / appointments</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-jump="services"><i data-lucide="scissors" size="20"></i><span><strong>Services & prices</strong><small>Cuts, beard, kids, designs</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-jump="photos"><i data-lucide="images" size="20"></i><span><strong>Cover + profile</strong><small>Keep the top looking premium</small></span><i data-lucide="chevron-right" size="16"></i></button>
          <button type="button" data-barber-jump="social"><i data-lucide="instagram" size="20"></i><span><strong>Social profiles</strong><small>Instagram, TikTok and more</small></span><i data-lucide="chevron-right" size="16"></i></button>
        </div>
        <div class="barber-business-strip"><div><i data-lucide="map-pin" size="17"></i><span>Shop location</span><strong data-barber-business-location>Not set</strong></div><div><i data-lucide="calendar-check" size="17"></i><span>Booking</span><strong data-barber-business-booking>Not set</strong></div></div>
      </div>`;
    anchor.insertAdjacentElement('afterend',root);
    bind();
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
      const write=()=>{const core=proxyFields[input.dataset.barberField];setCore(core,input.value);syncControls();syncPreview();callRender();};
      input.addEventListener('input',write);input.addEventListener('change',write);
    });
    qa('[data-barber-preset]',root).forEach(button=>button.addEventListener('click',()=>applyPreset(button.dataset.barberPreset)));
    qa('[data-barber-color]',root).forEach(input=>input.addEventListener('input',()=>{
      setCore(input.dataset.barberColor,input.value);setCore('color_mode',MODE);syncDerivedColors();syncControls();syncPreview();callRender();
    }));
    qa('[data-barber-jump]',root).forEach(button=>button.addEventListener('click',()=>jumpTo(button.dataset.barberJump)));
  }

  function jumpTo(kind){
    const selectors={booking:['[name="booking_url"]','[name="booking_enabled"]'],services:['#services-list','#service-list','[name="services_enabled"]'],photos:['#cover-image-section','[name="cover_image_url"]','.profile-photo-editor'],social:['#social-links-list','#social-list','[data-social-platform]']};
    let target=null;
    for(const selector of selectors[kind]||[]){target=q(selector);if(target)break;}
    if(!target){if(typeof toast==='function')toast('Open the matching main-editor section to finish this setup.');return;}
    const panel=target.closest('.editor-panel');
    if(panel?.dataset.panel)q(`.editor-tab[data-tab="${panel.dataset.panel}"]`)?.click();
    setTimeout(()=>{const section=target.closest('.form-section')||target;section.scrollIntoView({behavior:'smooth',block:'center'});try{if(!target.matches('input[type="hidden"],[hidden]'))target.focus({preventScroll:true});}catch(_){ }},80);
  }

  function syncControls(){
    if(!root||syncing)return;syncing=true;
    try{
      Object.entries(proxyFields).forEach(([proxy,core])=>{const input=q(`[data-barber-field="${proxy}"]`,root);if(input&&input!==document.activeElement)input.value=coreValue(core,'');});
      ['primary_color','secondary_color','background_color','text_color'].forEach(name=>{
        const value=coreValue(name,name==='background_color'?'#ffffff':'#111111');
        const input=q(`[data-barber-color="${name}"]`,root);const code=q(`[data-barber-color-code="${name}"]`,root);
        if(input&&/^#[0-9a-f]{6}$/i.test(value)&&input!==document.activeElement)input.value=value;
        if(code)code.textContent=value.toUpperCase();
      });
      const name=q('[data-barber-style-name]',root);if(name)name.textContent=(coreValue('full_name','YOUR BARBER')||'YOUR BARBER').toUpperCase();
      const style=q('.barber-style-preview',root);if(style){style.style.setProperty('--barber-primary',coreValue('primary_color','#111111'));style.style.setProperty('--barber-secondary',coreValue('secondary_color','#d4a84f'));}
      const loc=q('[data-barber-business-location]',root);if(loc)loc.textContent=coreValue('business_address','').trim()||'Not set';
      const booking=q('[data-barber-business-booking]',root);if(booking)booking.textContent=coreValue('booking_url','').trim()?'Ready':'Not set';
      syncPresetSelection();
    }finally{syncing=false;}
  }

  function syncPresetSelection(){
    if(!root)return;
    const values={primary:coreValue('primary_color','').toLowerCase(),secondary:coreValue('secondary_color','').toLowerCase(),background:coreValue('background_color','').toLowerCase(),text:coreValue('text_color','').toLowerCase()};
    let match='';
    Object.entries(presets).some(([key,p])=>{const yes=p.primary===values.primary&&p.secondary===values.secondary&&p.background===values.background&&p.text===values.text;if(yes)match=key;return yes;});
    root.dataset.barberPreset=match||'custom';
    qa('[data-barber-preset]',root).forEach(button=>button.classList.toggle('active',button.dataset.barberPreset===match));
  }

  function syncVisibility(){
    if(!root)return;
    const on=active();root.hidden=!on;root.classList.toggle('is-active',on);if(on)syncControls();
  }

  function previewPanelMarkup(key){
    const name=coreValue('full_name','Your Barber')||'Your Barber';
    const title=coreValue('job_title','Master Barber')||'Master Barber';
    const company=coreValue('company_name','Your Barbershop')||'Your Barbershop';
    const headline=coreValue('headline','Fresh cuts. Your chair.')||'Fresh cuts. Your chair.';
    const phone=coreValue('phone','')||'Add a call number';
    const sms=coreValue('sms_phone','')||phone;
    const address=coreValue('business_address','')||'Add your shop location';
    const booking=coreValue('booking_url','');
    if(key==='book')return `<small>BOOKING</small><strong>Book My Chair</strong><span>${booking?'Appointments are ready to open from your card.':'Add your booking link or LIW appointments.'}</span>`;
    if(key==='call')return `<small>CALL</small><strong>${escPreview(phone)}</strong><span>One tap from the customer dock.</span>`;
    if(key==='text')return `<small>TEXT</small><strong>${escPreview(sms)}</strong><span>Fast client questions and confirmations.</span>`;
    if(key==='services')return `<small>SERVICES</small><strong>Fresh cuts &amp; grooming</strong><span>Services and pricing open here without moving the top of the card.</span>`;
    if(key==='social')return `<small>SOCIAL</small><strong>Follow my work</strong><span>Instagram, TikTok and your active profiles live here.</span>`;
    if(key==='location')return `<small>SHOP</small><strong>${escPreview(address)}</strong><span>Directions without leaving the card flow.</span>`;
    return `<small>${escPreview(company)}</small><strong>${escPreview(name)}</strong><span>${escPreview(title)}</span><em>${escPreview(headline)}</em>`;
  }

  function setPreviewView(key){previewView=key;const phone=q('#phone-preview');const shell=q('.barber-editor-phone-preview',phone);if(!shell)return;const center=q('.barber-editor-preview-center',shell);if(center)center.innerHTML=previewPanelMarkup(key);qa('[data-barber-preview-view]',shell).forEach(button=>button.classList.toggle('active',button.dataset.barberPreviewView===key));}

  function syncPreview(){
    const phone=q('#phone-preview');if(!phone)return;
    const on=active();phone.classList.toggle('preview-barbershop-selected',on);
    let shell=q('.barber-editor-phone-preview',phone);
    if(!on){if(shell)shell.hidden=true;return;}
    if(!shell){
      shell=document.createElement('div');shell.className='barber-editor-phone-preview';
      shell.innerHTML=`<div class="barber-editor-preview-cover"><span class="barber-editor-preview-badge"><i></i> BARBER CARD</span><div class="barber-editor-preview-avatar"><span>YB</span></div></div><div class="barber-editor-preview-center"></div><div class="barber-editor-preview-dock"><button type="button" class="active" data-barber-preview-view="home"><i data-lucide="house" size="13"></i><span>Home</span></button><button type="button" data-barber-preview-view="book"><i data-lucide="calendar-days" size="13"></i><span>Book</span></button><button type="button" data-barber-preview-view="call"><i data-lucide="phone" size="13"></i><span>Call</span></button><button type="button" data-barber-preview-view="text"><i data-lucide="message-circle" size="13"></i><span>Text</span></button><button type="button" data-barber-preview-view="services"><i data-lucide="scissors" size="13"></i><span>Cuts</span></button><button type="button" data-barber-preview-view="social"><i data-lucide="instagram" size="13"></i><span>Social</span></button></div>`;
      phone.appendChild(shell);
      qa('[data-barber-preview-view]',shell).forEach(button=>button.addEventListener('click',()=>setPreviewView(button.dataset.barberPreviewView)));
    }
    shell.hidden=false;
    shell.style.setProperty('--barber-primary',coreValue('primary_color','#111111'));shell.style.setProperty('--barber-secondary',coreValue('secondary_color','#d4a84f'));shell.style.setProperty('--barber-bg',coreValue('background_color','#090909'));shell.style.setProperty('--barber-text',coreValue('text_color','#f8f4e8'));
    const cover=q('.barber-editor-preview-cover',shell);const coverUrl=coreValue('cover_image_url','');const gradient=coreValue('gradient_background','')||`linear-gradient(145deg,${coreValue('primary_color','#111111')},${coreValue('secondary_color','#d4a84f')})`;
    if(cover){cover.style.backgroundImage=coverUrl?`linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.42)),url("${coverUrl.replace(/"/g,'%22')}")`:gradient;}
    const avatar=q('.barber-editor-preview-avatar',shell);const profile=coreValue('profile_image_url','');
    if(avatar){avatar.style.backgroundImage=profile?`url("${profile.replace(/"/g,'%22')}")`:'none';const span=q('span',avatar);if(span){span.textContent=initials(coreValue('full_name','Your Barber'));span.hidden=Boolean(profile);}}
    setPreviewView(previewView);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  document.addEventListener('click',event=>{
    const experience=event.target.closest?.('[data-card-experience]');
    if(experience&&experience.dataset.cardExperience!=='barbershop'&&active())leaveBarbershop();
    if(event.target.closest?.('.editor-tab[data-tab="design"]'))setTimeout(refresh,40);
  },true);
  document.addEventListener('input',event=>{const name=event.target?.name;if(!name||event.target?.closest?.('#barber-control-center'))return;if(Object.values(proxyFields).includes(name)||['primary_color','secondary_color','background_color','text_color','color_mode','card_experience','cover_image_url','profile_image_url'].includes(name))setTimeout(refresh,0);},true);
  document.addEventListener('change',event=>{const name=event.target?.name;if(['color_mode','card_experience','cover_image_url','profile_image_url'].includes(name))setTimeout(refresh,0);},true);

  function refresh(){ensureExperienceOption();build();removeLegacyTemplateCard();syncVisibility();syncControls();syncPicker();syncPreview();}
  window.LIWBarbershopEditor={activate:activateBarbershop,isActive:active,applyPreset,refresh};

  let attempts=0;
  const timer=setInterval(()=>{attempts++;refresh();if(attempts>120)clearInterval(timer);},250);
  refresh();
})();
