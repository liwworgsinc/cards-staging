/* LIW Cards staging — Spotlight editor + premium customization studio.
   Spotlight keeps the Classic content model and template selection intact while
   giving the experience its own presentation controls. */
(function(){
  'use strict';
  if(window.__LIW_EDITOR_SPOTLIGHT_EXPERIENCE__)return;
  window.__LIW_EDITOR_SPOTLIGHT_EXPERIENCE__=true;

  const VERSION='20261019-spotlight-studio-1';
  const field=name=>document.querySelector(`[name="${name}"]`);
  const value=name=>String(field(name)?.value||'').trim();
  const bool=name=>Boolean(field(name)?.checked);
  let syncQueued=false;
  let observer=null;
  let syncingStudio=false;

  function ensureStyle(){
    if(document.getElementById('liw-editor-spotlight-style'))return;
    const style=document.createElement('style');
    style.id='liw-editor-spotlight-style';
    style.textContent=`
      .card-experience-option[data-card-experience="spotlight"] .card-experience-number{background:linear-gradient(135deg,#0b1438,#d4a84f);color:#fff}
      .card-experience-option[data-card-experience="spotlight"].active{border-color:#d4a84f;box-shadow:0 0 0 3px rgba(212,168,79,.14)}
      .card-experience-option[data-card-experience="spotlight"] .spotlight-option-icon{display:inline-grid;place-items:center;width:20px;height:20px;margin-right:2px;vertical-align:-4px}
      .spotlight-experience-note{margin-top:10px;padding:10px 12px;border:1px solid rgba(212,168,79,.28);border-radius:12px;background:#fffaf0;color:#5d4515;font-size:.72rem;line-height:1.45}
      .spotlight-experience-note strong{color:#382707}

      .spotlight-studio{display:none;margin-top:18px;border:1px solid rgba(212,168,79,.3);border-radius:22px;background:linear-gradient(145deg,#fff 0%,#fffaf0 100%);box-shadow:0 18px 45px rgba(11,20,56,.07);overflow:hidden}
      .spotlight-studio.is-active{display:block}
      .spotlight-studio-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:20px;border-bottom:1px solid rgba(11,20,56,.08);background:radial-gradient(circle at 90% 0,rgba(212,168,79,.2),transparent 34%),linear-gradient(135deg,#08112f,#15295b);color:#fff}
      .spotlight-studio-kicker{display:inline-flex;align-items:center;gap:6px;margin-bottom:7px;color:#f2d58b;font-size:.67rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .spotlight-studio-head h3{margin:0 0 5px;font-size:1.18rem;letter-spacing:-.025em}
      .spotlight-studio-head p{margin:0;max-width:590px;color:#dce4f7;font-size:.76rem;line-height:1.5}
      .spotlight-studio-badge{flex:0 0 auto;padding:6px 9px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.09);font-size:.63rem;font-weight:900;white-space:nowrap}
      .spotlight-studio-body{display:grid;gap:18px;padding:18px}
      .spotlight-control-group{display:grid;gap:10px}
      .spotlight-control-heading{display:flex;align-items:end;justify-content:space-between;gap:12px}
      .spotlight-control-heading strong{font-size:.78rem;color:#0b1438}
      .spotlight-control-heading span{font-size:.64rem;color:#667085}
      .spotlight-look-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      .spotlight-look{position:relative;min-height:92px;padding:12px;border:1px solid rgba(11,20,56,.11);border-radius:16px;background:#fff;text-align:left;cursor:pointer;transition:.18s ease}
      .spotlight-look:hover{transform:translateY(-1px);box-shadow:0 9px 20px rgba(11,20,56,.08)}
      .spotlight-look.active{border-color:#d4a84f;box-shadow:0 0 0 3px rgba(212,168,79,.12)}
      .spotlight-look-preview{display:flex;align-items:flex-end;gap:5px;height:34px;margin-bottom:9px;padding:6px;border-radius:9px;background:linear-gradient(135deg,#0b1438,#324b87)}
      .spotlight-look-preview i{display:block;background:#fff}
      .spotlight-look-preview i:first-child{width:21px;height:21px;border-radius:50%;border:2px solid #f0cc74}
      .spotlight-look-preview i:nth-child(2){width:38px;height:6px;border-radius:999px;opacity:.9}
      .spotlight-look-preview i:nth-child(3){width:23px;height:6px;border-radius:999px;opacity:.45}
      .spotlight-look strong{display:block;color:#0b1438;font-size:.72rem}
      .spotlight-look small{display:block;margin-top:2px;color:#667085;font-size:.58rem;line-height:1.3}
      .spotlight-controls-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .spotlight-control-card{display:grid;gap:7px;padding:11px;border:1px solid rgba(11,20,56,.09);border-radius:14px;background:rgba(255,255,255,.88)}
      .spotlight-control-card label{font-size:.65rem;font-weight:900;color:#0b1438}
      .spotlight-control-card .input{min-width:0}
      .spotlight-segmented{display:grid;grid-template-columns:repeat(var(--spotlight-options,3),minmax(0,1fr));gap:5px}
      .spotlight-segmented button{min-height:34px;padding:7px 5px;border:1px solid rgba(11,20,56,.11);border-radius:9px;background:#fff;color:#475467;font-size:.59rem;font-weight:850;cursor:pointer}
      .spotlight-segmented button.active{border-color:#0b1438;background:#0b1438;color:#fff}
      .spotlight-range-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:8px}
      .spotlight-range-row output{min-width:38px;color:#0b1438;font-size:.62rem;font-weight:900;text-align:right}
      .spotlight-logo-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid rgba(11,20,56,.09);border-radius:14px;background:#fff}
      .spotlight-logo-status{display:flex;align-items:center;gap:10px;min-width:0}
      .spotlight-logo-mini{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;overflow:hidden;border:2px solid #fff;border-radius:50%;background:linear-gradient(145deg,#fff,#edf1f8);box-shadow:0 5px 14px rgba(11,20,56,.13);color:#0b1438;font-size:.62rem;font-weight:900}
      .spotlight-logo-mini img{width:100%;height:100%;object-fit:cover}
      .spotlight-logo-copy{min-width:0}
      .spotlight-logo-copy strong{display:block;color:#0b1438;font-size:.7rem}
      .spotlight-logo-copy span{display:block;margin-top:2px;color:#667085;font-size:.6rem;line-height:1.35}
      .spotlight-studio-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;border-top:1px solid rgba(11,20,56,.07);background:#fff}
      .spotlight-studio-foot span{color:#667085;font-size:.62rem;line-height:1.35}

      .phone.spotlight-experience-selected{--spotlight-radius:16px;--spotlight-avatar-radius:50%;--spotlight-primary:#0b1438;--spotlight-secondary:#d4a84f;--spotlight-bg:#fff;--spotlight-text:#111827;--spotlight-button-text:#fff}
      .phone.spotlight-experience-selected .preview-cover{height:184px!important;overflow:visible!important}
      .phone.spotlight-experience-selected .preview-avatar{width:110px!important;height:110px!important;left:50%!important;bottom:-55px!important;transform:translateX(-50%)!important;border-radius:var(--spotlight-avatar-radius)!important;border:var(--spotlight-avatar-border,4px) solid var(--spotlight-avatar-border-color,#fff)!important;box-shadow:0 13px 30px rgba(15,23,42,.22)!important;z-index:3!important;overflow:hidden!important}
      .phone.spotlight-experience-selected .spotlight-preview-logo-badge{position:absolute;left:calc(50% + 27px);bottom:-47px;width:44px;height:44px;z-index:5;display:grid;place-items:center;overflow:hidden;border:3px solid #fff;border-radius:50%;background:#fff;color:var(--spotlight-primary);box-shadow:0 8px 20px rgba(15,23,42,.2);font:900 .58rem/1 Manrope,system-ui;text-align:center}
      .phone.spotlight-experience-selected .spotlight-preview-logo-badge img{width:100%;height:100%;display:block;object-fit:cover;background:#fff}
      .phone.spotlight-experience-selected .spotlight-preview-logo-badge.is-initials{background:linear-gradient(145deg,#fff,color-mix(in srgb,var(--spotlight-primary) 9%,#fff))}
      .phone.spotlight-experience-selected .preview-content{padding-top:70px!important;text-align:center!important;background:var(--spotlight-bg)!important;color:var(--spotlight-text)!important}
      .phone.spotlight-experience-selected .preview-content h2{font-size:1.38rem!important;letter-spacing:-.04em!important;color:var(--spotlight-text)!important}
      .phone.spotlight-experience-selected .preview-company{display:inline-flex!important;width:auto!important;margin:2px auto 8px!important;padding:4px 8px!important;border-radius:999px!important;background:color-mix(in srgb,var(--spotlight-primary) 9%,transparent)!important;color:var(--spotlight-primary)!important;font-size:.58rem!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.035em!important}
      .phone.spotlight-experience-selected .preview-actions{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}
      .phone.spotlight-experience-selected .preview-action{min-width:0!important;border-radius:var(--spotlight-radius)!important;box-shadow:0 5px 14px rgba(15,23,42,.055)!important;transition:none!important}
      .phone.spotlight-experience-selected[data-spotlight-button-style="soft"] .preview-action{background:color-mix(in srgb,var(--spotlight-primary) 9%,var(--spotlight-bg))!important;color:var(--spotlight-primary)!important;border:1px solid color-mix(in srgb,var(--spotlight-primary) 12%,transparent)!important}
      .phone.spotlight-experience-selected[data-spotlight-button-style="filled"] .preview-action{background:var(--spotlight-primary)!important;color:var(--spotlight-button-text)!important;border:1px solid var(--spotlight-primary)!important}
      .phone.spotlight-experience-selected[data-spotlight-button-style="outline"] .preview-action{background:transparent!important;color:var(--spotlight-primary)!important;border:1px solid color-mix(in srgb,var(--spotlight-primary) 55%,transparent)!important}
      .phone.spotlight-experience-selected .preview-public-section{border-radius:var(--spotlight-radius)!important;background:color-mix(in srgb,var(--spotlight-primary) 4%,var(--spotlight-bg))!important;border:1px solid color-mix(in srgb,var(--spotlight-primary) 8%,transparent)!important;box-shadow:0 6px 16px rgba(15,23,42,.035)!important}
      .phone.spotlight-experience-selected[data-spotlight-mode="dark"] .preview-content{--spotlight-bg:#0b1020;--spotlight-text:#f8fafc;background:#0b1020!important;color:#f8fafc!important}
      .phone.spotlight-experience-selected[data-spotlight-mode="dark"] .preview-content h2{color:#f8fafc!important}
      .phone.spotlight-experience-selected[data-spotlight-mode="dark"] .preview-title,.phone.spotlight-experience-selected[data-spotlight-mode="dark"] .preview-headline,.phone.spotlight-experience-selected[data-spotlight-mode="dark"] .preview-bio{color:#cbd5e1!important}
      .phone.spotlight-experience-selected[data-spotlight-mode="dark"] .preview-public-section{background:#131a2d!important;border-color:rgba(255,255,255,.08)!important;color:#f8fafc!important}

      @media(max-width:760px){
        .spotlight-studio{border-radius:17px}
        .spotlight-studio-head{display:block;padding:15px}
        .spotlight-studio-badge{display:inline-flex;margin-top:10px}
        .spotlight-studio-body{padding:12px;gap:14px}
        .spotlight-look-grid{grid-template-columns:1fr}
        .spotlight-look{min-height:0;display:grid;grid-template-columns:88px 1fr;column-gap:10px;align-items:center}
        .spotlight-look-preview{grid-row:1/3;margin:0}
        .spotlight-controls-grid{grid-template-columns:1fr}
        .spotlight-studio-foot{align-items:flex-start;flex-direction:column}
      }
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
      grid.insertAdjacentElement('afterend',note);
    }
    window.lucide?.createIcons?.();
    return true;
  }

  function setField(name,next,{events=true}={}){
    const input=field(name);
    if(!input)return false;
    if(input.type==='checkbox')input.checked=Boolean(next);
    else input.value=String(next);
    if(events){
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return true;
  }

  function scheduleNativeRender(){
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    setTimeout(queueSync,0);
    setTimeout(queueSync,90);
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
    scheduleNativeRender();
    if(typeof toast==='function')toast('Spotlight selected — open Spotlight Studio to shape the premium look');
  }

  function studioMarkup(){
    return `<section class="spotlight-studio" id="spotlight-studio" aria-label="Spotlight customization">
      <div class="spotlight-studio-head">
        <div><span class="spotlight-studio-kicker"><i data-lucide="sparkles" size="14"></i> Spotlight customization</span><h3>Spotlight Studio</h3><p>Shape the premium look without changing your card content or template. These controls save with the same design fields LIW Cards already uses.</p></div>
        <span class="spotlight-studio-badge">Classic core · premium shell</span>
      </div>
      <div class="spotlight-studio-body">
        <div class="spotlight-control-group">
          <div class="spotlight-control-heading"><strong>Quick looks</strong><span>Start polished, then fine-tune</span></div>
          <div class="spotlight-look-grid">
            <button class="spotlight-look" type="button" data-spotlight-preset="clean"><span class="spotlight-look-preview"><i></i><i></i><i></i></span><strong>Clean</strong><small>Bright, soft, modern and easy to scan.</small></button>
            <button class="spotlight-look" type="button" data-spotlight-preset="luxe"><span class="spotlight-look-preview"><i></i><i></i><i></i></span><strong>Luxe</strong><small>Deep contrast, framed profile and richer curves.</small></button>
            <button class="spotlight-look" type="button" data-spotlight-preset="bold"><span class="spotlight-look-preview"><i></i><i></i><i></i></span><strong>Bold</strong><small>Strong cover, tighter corners and confident actions.</small></button>
          </div>
        </div>

        <div class="spotlight-control-group">
          <div class="spotlight-control-heading"><strong>Premium details</strong><span>Changes update the live preview</span></div>
          <div class="spotlight-controls-grid">
            <div class="spotlight-control-card"><label>Appearance</label><div class="spotlight-segmented" style="--spotlight-options:2"><button type="button" data-spotlight-field="color_mode" data-value="light">Light</button><button type="button" data-spotlight-field="color_mode" data-value="dark">Dark</button></div></div>
            <div class="spotlight-control-card"><label>Profile shape</label><div class="spotlight-segmented"><button type="button" data-spotlight-field="profile_image_shape" data-value="circle">Circle</button><button type="button" data-spotlight-field="profile_image_shape" data-value="rounded">Rounded</button><button type="button" data-spotlight-field="profile_image_shape" data-value="square">Square</button></div></div>
            <div class="spotlight-control-card"><label>Action style</label><div class="spotlight-segmented"><button type="button" data-spotlight-field="button_style" data-value="soft">Soft</button><button type="button" data-spotlight-field="button_style" data-value="filled">Filled</button><button type="button" data-spotlight-field="button_style" data-value="outline">Outline</button></div></div>
            <div class="spotlight-control-card"><label for="spotlight-font">Typography</label><select class="input" id="spotlight-font" data-spotlight-select="font_family"><option value="Manrope">Manrope</option><option value="DM Sans">DM Sans</option><option value="Inter">Inter</option><option value="Georgia">Georgia</option><option value="Arial">Arial</option></select></div>
            <div class="spotlight-control-card"><label>Card curves</label><div class="spotlight-range-row"><input min="4" max="28" step="1" type="range" data-spotlight-range="border_radius"/><output data-spotlight-output="border_radius">16px</output></div></div>
            <div class="spotlight-control-card"><label>Cover mood</label><div class="spotlight-range-row"><input min="0" max="70" step="1" type="range" data-spotlight-range="cover_overlay"/><output data-spotlight-output="cover_overlay">24%</output></div></div>
            <div class="spotlight-control-card"><label>Cover focus</label><select class="input" data-spotlight-select="cover_position"><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select></div>
            <div class="spotlight-control-card"><label>Social style</label><select class="input" data-spotlight-select="social_button_style"><option value="brand">Brand cards</option><option value="circle">Icon circles</option><option value="outline">Outline pills</option><option value="solid">Solid buttons</option></select></div>
          </div>
        </div>

        <div class="spotlight-control-group">
          <div class="spotlight-control-heading"><strong>Profile finish</strong><span>Make the portrait + logo lockup feel intentional</span></div>
          <div class="spotlight-controls-grid">
            <div class="spotlight-control-card"><label>Profile frame</label><div class="spotlight-segmented" style="--spotlight-options:2"><button type="button" data-spotlight-toggle="profile_border_enabled" data-value="false">Clean edge</button><button type="button" data-spotlight-toggle="profile_border_enabled" data-value="true">Accent frame</button></div></div>
            <div class="spotlight-control-card"><label>Frame width</label><div class="spotlight-range-row"><input min="1" max="8" step="1" type="range" data-spotlight-range="profile_border_width"/><output data-spotlight-output="profile_border_width">4px</output></div></div>
          </div>
          <div class="spotlight-logo-card">
            <div class="spotlight-logo-status"><span class="spotlight-logo-mini" id="spotlight-logo-mini">LIW</span><span class="spotlight-logo-copy"><strong id="spotlight-logo-title">Logo badge</strong><span id="spotlight-logo-copy">Using initials until you upload a logo.</span></span></div>
            <button class="btn btn-light btn-sm" id="spotlight-change-logo" type="button"><i data-lucide="image-plus" size="15"></i> Change logo</button>
          </div>
        </div>
      </div>
      <div class="spotlight-studio-foot"><span>Spotlight only changes presentation. Your template, content, business tools and Classic experience remain independent.</span><button class="btn btn-primary btn-sm" id="spotlight-save-now" type="button"><i data-lucide="save" size="15"></i> Save Spotlight look</button></div>
    </section>`;
  }

  function ensureStudio(){
    if(document.getElementById('spotlight-studio'))return true;
    const experience=document.getElementById('card-experience-section');
    if(!experience)return false;
    experience.insertAdjacentHTML('afterend',studioMarkup());
    wireStudio();
    window.lucide?.createIcons?.();
    return true;
  }

  function applyPreset(name){
    const presets={
      clean:{color_mode:'light',profile_image_shape:'circle',button_style:'soft',font_family:'Manrope',border_radius:'18',cover_overlay:'18',cover_position:'center',social_button_style:'circle',profile_border_enabled:false,profile_border_width:'3'},
      luxe:{color_mode:'dark',profile_image_shape:'circle',button_style:'filled',font_family:'Georgia',border_radius:'22',cover_overlay:'30',cover_position:'center',social_button_style:'outline',profile_border_enabled:true,profile_border_width:'4'},
      bold:{color_mode:'light',profile_image_shape:'rounded',button_style:'outline',font_family:'DM Sans',border_radius:'10',cover_overlay:'42',cover_position:'center',social_button_style:'solid',profile_border_enabled:true,profile_border_width:'5'}
    };
    const preset=presets[name];
    if(!preset)return;
    syncingStudio=true;
    Object.entries(preset).forEach(([key,next])=>setField(key,next,{events:false}));
    const borderColor=field('profile_border_color');
    if(borderColor&&!String(borderColor.value||'').trim())borderColor.value=value('secondary_color')||'#d4a84f';
    Object.keys(preset).forEach(key=>{
      const target=field(key);
      if(!target)return;
      target.dispatchEvent(new Event('input',{bubbles:true}));
      target.dispatchEvent(new Event('change',{bubbles:true}));
    });
    syncingStudio=false;
    scheduleNativeRender();
    if(typeof toast==='function')toast(`Spotlight ${name.charAt(0).toUpperCase()+name.slice(1)} look applied`);
  }

  function wireStudio(){
    const studio=document.getElementById('spotlight-studio');
    if(!studio||studio.dataset.wired==='true')return;
    studio.dataset.wired='true';
    studio.addEventListener('click',event=>{
      const preset=event.target.closest('[data-spotlight-preset]');
      if(preset){applyPreset(preset.dataset.spotlightPreset);return;}
      const setter=event.target.closest('[data-spotlight-field]');
      if(setter){setField(setter.dataset.spotlightField,setter.dataset.value);scheduleNativeRender();return;}
      const toggle=event.target.closest('[data-spotlight-toggle]');
      if(toggle){setField(toggle.dataset.spotlightToggle,toggle.dataset.value==='true');scheduleNativeRender();return;}
      if(event.target.closest('#spotlight-change-logo')){document.getElementById('qr-logo-file')?.click();return;}
      if(event.target.closest('#spotlight-save-now')){
        const save=document.getElementById('save-now-button');
        if(save)save.click();
        else try{if(typeof flushSave==='function')flushSave({force:true,silent:false});}catch(_){ }
      }
    });
    studio.addEventListener('input',event=>{
      const range=event.target.closest('[data-spotlight-range]');
      if(range){setField(range.dataset.spotlightRange,range.value);scheduleNativeRender();return;}
      const select=event.target.closest('[data-spotlight-select]');
      if(select){setField(select.dataset.spotlightSelect,select.value);scheduleNativeRender();}
    });
    studio.addEventListener('change',event=>{
      const select=event.target.closest('[data-spotlight-select]');
      if(select){setField(select.dataset.spotlightSelect,select.value);scheduleNativeRender();}
    });
  }

  function syncStudio(){
    const studio=document.getElementById('spotlight-studio');
    if(!studio)return;
    const active=currentExperience()==='spotlight';
    studio.classList.toggle('is-active',active);
    if(!active)return;

    studio.querySelectorAll('[data-spotlight-field]').forEach(button=>button.classList.toggle('active',value(button.dataset.spotlightField).toLowerCase()===String(button.dataset.value).toLowerCase()));
    studio.querySelectorAll('[data-spotlight-toggle]').forEach(button=>button.classList.toggle('active',bool(button.dataset.spotlightToggle)===(button.dataset.value==='true')));
    studio.querySelectorAll('[data-spotlight-select]').forEach(select=>{
      const next=value(select.dataset.spotlightSelect);
      if(next&&select.value!==next)select.value=next;
    });
    studio.querySelectorAll('[data-spotlight-range]').forEach(range=>{
      const next=value(range.dataset.spotlightRange);
      if(next&&range.value!==next)range.value=next;
      const output=studio.querySelector(`[data-spotlight-output="${range.dataset.spotlightRange}"]`);
      if(output)output.textContent=`${range.value}${range.dataset.spotlightRange==='cover_overlay'?'%':'px'}`;
    });
    studio.querySelectorAll('[data-spotlight-preset]').forEach(button=>button.classList.remove('active'));

    const logo=value('qr_logo_url');
    const mini=document.getElementById('spotlight-logo-mini');
    const copy=document.getElementById('spotlight-logo-copy');
    if(mini){
      if(logo)mini.innerHTML=`<img alt="Business logo" src="${logo.replace(/"/g,'&quot;')}">`;
      else mini.textContent=initials(value('company_name')||value('full_name'));
    }
    if(copy)copy.textContent=logo?'Logo uploaded — shown as the small circle attached to your profile.':'Using initials until you upload a logo.';
  }

  function syncPreview(){
    const phone=document.getElementById('phone-preview');
    const cover=document.getElementById('preview-cover');
    if(!phone||!cover)return;
    const active=currentExperience()==='spotlight';
    phone.classList.toggle('spotlight-experience-selected',active);
    if(!active){cover.querySelector('.spotlight-preview-logo-badge')?.remove();return;}

    phone.dataset.cardExperience='spotlight';
    phone.dataset.spotlightButtonStyle=value('button_style')||'soft';
    phone.dataset.spotlightMode=value('color_mode')==='dark'?'dark':'light';
    const radius=Math.max(4,Math.min(28,Number(value('border_radius'))||16));
    const shape=value('profile_image_shape')||'circle';
    const shapeRadius=shape==='square'?'6px':shape==='rounded'?'24px':'50%';
    const primary=value('primary_color')||'#0b1438';
    const secondary=value('secondary_color')||'#d4a84f';
    const background=value('background_color')||'#ffffff';
    const text=value('text_color')||'#111827';
    const buttonText=value('button_text_color')||'#ffffff';
    const borderEnabled=bool('profile_border_enabled');
    const borderWidth=Math.max(1,Math.min(8,Number(value('profile_border_width'))||4));
    const borderColor=borderEnabled?(value('profile_border_color')||secondary):'#ffffff';
    phone.style.setProperty('--spotlight-radius',`${radius}px`);
    phone.style.setProperty('--spotlight-avatar-radius',shapeRadius);
    phone.style.setProperty('--spotlight-primary',primary);
    phone.style.setProperty('--spotlight-secondary',secondary);
    phone.style.setProperty('--spotlight-bg',background);
    phone.style.setProperty('--spotlight-text',text);
    phone.style.setProperty('--spotlight-button-text',buttonText);
    phone.style.setProperty('--spotlight-avatar-border',`${borderEnabled?borderWidth:4}px`);
    phone.style.setProperty('--spotlight-avatar-border-color',borderColor);

    let badge=cover.querySelector('.spotlight-preview-logo-badge');
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
      if(img.getAttribute('src')!==logo)img.src=logo;
      if(!img.isConnected)badge.replaceChildren(img);
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
    ensureStudio();
    const active=currentExperience()==='spotlight';
    document.querySelectorAll('[data-card-experience]').forEach(button=>{
      if(button.dataset.cardExperience==='spotlight')button.classList.toggle('active',active);
      else if(active)button.classList.remove('active');
    });
    syncPreview();
    syncStudio();
    syncRoadmap();
  }

  function queueSync(){
    if(syncQueued||syncingStudio)return;
    syncQueued=true;
    requestAnimationFrame(sync);
  }

  function wire(){
    const watched='[name="card_experience"],[name="company_name"],[name="full_name"],[name="qr_logo_url"],[name="color_mode"],[name="profile_image_shape"],[name="button_style"],[name="font_family"],[name="border_radius"],[name="cover_overlay"],[name="cover_position"],[name="social_button_style"],[name="profile_border_enabled"],[name="profile_border_color"],[name="profile_border_width"],[name="primary_color"],[name="secondary_color"],[name="background_color"],[name="text_color"],[name="button_text_color"]';
    document.addEventListener('input',event=>{if(event.target?.matches?.(watched))queueSync();});
    document.addEventListener('change',event=>{if(event.target?.matches?.(watched))queueSync();});
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
      if(document.getElementById('spotlight-studio')&&tries>20)clearInterval(timer);
      if(tries>=80)clearInterval(timer);
    },150);
    sync();
  }

  window.LIWSpotlightEditor={sync,select:selectSpotlight,applyPreset,version:VERSION};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
