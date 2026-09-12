/* LIW Cards staging — Studio keeps the same internal `barbershop` experience key.
   The normal LIW Standard/Premium template grid remains the design source of truth.
   This bridge preserves the existing experience while exposing Studio to customers. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_SHOWTIME_TEMPLATE_BRIDGE__)return;
  window.__LIW_BARBER_SHOWTIME_TEMPLATE_BRIDGE__=true;

  const MODE='barbershop';
  let observer=null;
  let observerStop=0;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));
  const val=(name,fallback='')=>{const el=q(`[name="${name}"]`);const value=String(el?.value??'').trim();return value||fallback;};
  const set=(name,value)=>{const el=q(`[name="${name}"]`);if(el)el.value=String(value??'');};
  const currentExperience=()=>val('card_experience','classic').toLowerCase();
  const legacyBarberActive=()=>val('color_mode','').toLowerCase()===MODE&&currentExperience()!=='music';
  const barberActive=()=>currentExperience()==='barbershop'||legacyBarberActive();

  function templateList(){try{return Array.isArray(templates)?templates:[];}catch(_){return [];}}
  function selectedTemplate(){
    const id=val('template_id','');
    if(!id)return null;
    return templateList().find(item=>String(item.id)===id)||null;
  }
  function templateName(){
    const selected=selectedTemplate();
    if(selected?.name)return String(selected.name);
    const text=String(q('#template-selected-summary')?.textContent||'').trim();
    return text&&text.toLowerCase()!=='custom design'?text:'Custom design';
  }
  function design(){return {
    name:templateName(),
    primary:val('primary_color','#0b1438'),
    secondary:val('secondary_color','#d4a84f'),
    background:val('background_color','#ffffff'),
    font:val('font_family','DM Sans'),
    buttonStyle:val('button_style','filled')
  };}
  function icon(name,size=16){return `<i data-lucide="${name}" size="${size}"></i>`;}

  function render(node){
    if(!node)return;
    const d=design();
    const badge=q('[data-barber-template-name]',node);if(badge)badge.textContent=d.name;
    const colors=[d.primary,d.secondary,d.background];
    qa('[data-barber-template-color]',node).forEach((el,index)=>{el.style.background=colors[index]||'#fff';el.title=colors[index]||'';});
    const font=q('[data-barber-template-font]',node);if(font)font.textContent=d.font;
    const button=q('[data-barber-template-button-style]',node);if(button)button.textContent=String(d.buttonStyle||'filled').replace(/\b\w/g,m=>m.toUpperCase());
  }

  function stopObserver(){
    try{observer?.disconnect();}catch(_){ }
    observer=null;
    if(observerStop){clearTimeout(observerStop);observerStop=0;}
  }

  function mount(){
    const look=q('#barber-control-center [data-barber-v5-panel="look"]');
    if(!look)return false;

    /* Remove the two retired experience-only template/color browsers if a cached
       earlier build inserted them before this bridge loaded. */
    q('[data-barber-template-skins]',look)?.remove();
    q('[data-barber-liw-palette-group]',look)?.remove();

    let node=q('[data-barber-template-bridge]',look);
    if(!node){
      node=document.createElement('section');
      node.className='barber-template-bridge';
      node.dataset.barberTemplateBridge='true';
      node.innerHTML=`
        <div class="barber-template-bridge-head">
          <div><strong>${icon('palette',18)} Template styling</strong><p>Just like Showtime, Studio keeps the LIW Standard or Premium template you select in the main template library.</p></div>
          <span class="barber-template-badge" data-barber-template-name>Custom design</span>
        </div>
        <div class="barber-template-preview">
          <div class="barber-template-palette"><i data-barber-template-color></i><i data-barber-template-color></i><i data-barber-template-color></i></div>
          <div class="barber-template-meta">
            <div><span>Font</span><strong data-barber-template-font>DM Sans</strong></div>
            <div><span>Buttons</span><strong data-barber-template-button-style>Filled</strong></div>
          </div>
        </div>
        <div class="barber-template-note">${icon('sparkles',16)}<span><strong>Studio experience stays intact.</strong> The selected template supplies the look; Studio keeps the full-screen profile, Wallet, booking, client room and revolving dock.</span></div>
        <div class="barber-template-actions"><button class="btn btn-light btn-sm" type="button" data-barber-change-template>${icon('layout-template',15)} Change template</button></div>`;
      const firstPalette=q('.barber-v5-presets',look);
      if(firstPalette)firstPalette.insertAdjacentElement('beforebegin',node);else look.prepend(node);
      q('[data-barber-change-template]',node)?.addEventListener('click',()=>q('#template-grid')?.scrollIntoView({behavior:'smooth',block:'start'}));
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }
    render(node);
    stopObserver();
    return true;
  }

  function restoreBarberAfterTemplate(){
    /* The established internal key remains `barbershop` so existing Studio/Barber
       cards and public styling continue to work without a data migration. */
    set('card_experience','barbershop');
    set('color_mode',MODE);
    set('profile_image_shape','circle');
    try{window.LIWBarbershopEditor?.refresh?.();}catch(_){ }
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    const node=q('[data-barber-template-bridge]');
    if(node)render(node);
  }

  function reapplySelectedTemplate(templateId){
    if(!templateId){restoreBarberAfterTemplate();return;}
    const template=templateList().find(item=>String(item.id)===String(templateId));
    if(template&&typeof applyTemplate==='function'){
      try{applyTemplate(template);}catch(_){ }
    }
    restoreBarberAfterTemplate();
  }

  window.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;

    const barberChoice=target.closest('[data-card-experience="barbershop"]');
    if(barberChoice){
      const templateId=val('template_id','');
      setTimeout(()=>reapplySelectedTemplate(templateId),0);
      return;
    }

    const templateButton=target.closest('.template-card');
    if(templateButton&&barberActive())setTimeout(()=>restoreBarberAfterTemplate(),0);
  },true);

  document.addEventListener('input',event=>{
    if(event.target?.matches?.('[name="primary_color"],[name="secondary_color"],[name="background_color"],[name="font_family"],[name="button_style"]')){
      setTimeout(()=>render(q('[data-barber-template-bridge]')),0);
    }
  },true);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('.template-card'))setTimeout(()=>render(q('[data-barber-template-bridge]')),120);
  },true);

  function start(){
    if(mount())return;
    const target=q('.editor-panel[data-panel="design"]')||document.body;
    if(!target)return;
    observer=new MutationObserver(()=>mount());
    observer.observe(target,{childList:true,subtree:true});
    observerStop=setTimeout(stopObserver,4500);
  }

  window.LIWBarberTemplateBridge={refresh(){mount();render(q('[data-barber-template-bridge]'));},restoreBarberAfterTemplate};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

/* Customer-facing Studio industry selector. `barbershop` remains the internal
   experience key; studio_business_type controls the adaptive personality. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_BUSINESS_TYPES__)return;
  window.__LIW_STUDIO_BUSINESS_TYPES__=true;

  const TYPES={
    barber:{label:'Barber',hint:'Cuts · fades · grooming'},
    hair:{label:'Hair Stylist',hint:'Cuts · color · styling'},
    nails:{label:'Nail Tech',hint:'Sets · fills · nail art'},
    lashes:{label:'Lash / Brow',hint:'Lashes · brows · fills'},
    makeup:{label:'Makeup Artist',hint:'Beauty · bridal · events'},
    esthetician:{label:'Esthetician',hint:'Facials · skin · treatments'},
    spa:{label:'Spa',hint:'Massage · facials · wellness'},
    cosmetics:{label:'Cosmetics',hint:'Products · beauty · consults'}
  };
  let selectedType='barber';
  let loadingType=false;
  let persistBusy=false;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));
  const experience=()=>String(q('[name="card_experience"]')?.value||'classic').toLowerCase();
  const colorMode=()=>String(q('[name="color_mode"]')?.value||'').toLowerCase();
  const studioActive=()=>experience()==='barbershop'||(colorMode()==='barbershop'&&experience()!=='music');

  function businessIcon(type,size=24){
    const open=`<svg class="studio-business-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;
    const close='</svg>';
    const paths={
      barber:'<path d="M8 3h8l1 4-1.2 2.2V20H8.2V9.2L7 7l1-4Z"/><path d="M10 6h4M10.2 11.5h3.6M10.2 15h3.6"/><path d="M9 20h6"/>',
      hair:'<path d="M4 9c0-3.1 2.6-5 6.3-5h2.2c3.6 0 6.5 2.2 6.5 5.2 0 2.6-2.2 4.8-5 4.8H9"/><path d="M9 14v6M6.5 20h5"/><path d="M18.5 7.5 22 6v6l-3.4-1.4"/>',
      nails:'<path d="M9 3h6v4H9z"/><path d="M8 7h8l1 3v10H7V10l1-3Z"/><path d="M10 12h4v5h-4z"/>',
      lashes:'<path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z"/><circle cx="12" cy="12" r="2.1"/><path d="m5.2 8.4-1.3-2M8.1 7.1 7.5 4.7M12 6.6V4M15.9 7.1l.6-2.4M18.8 8.4l1.3-2"/>',
      makeup:'<path d="m5 19 8.8-8.8 2 2L7 21H5v-2Z"/><path d="m14.4 9.6 3.8-5.3c.7-1 2.2-.9 2.8.1.4.7.3 1.5-.2 2.1l-4.7 4.4"/><path d="M5 14c2.7-.3 4.7 1.6 5 4.2"/>',
      esthetician:'<circle cx="11" cy="12" r="7"/><path d="M8.5 11h.01M13.5 11h.01M9 15c1.1.9 2.9.9 4 0"/><path d="m18 4 .6 1.4L20 6l-1.4.6L18 8l-.6-1.4L16 6l1.4-.6L18 4Z"/>',
      spa:'<path d="M12 20c-4.6 0-8-2.4-8-5.8 2.6-.4 4.8.1 6.5 1.5C9 12.1 9.8 8.7 12 5c2.2 3.7 3 7.1 1.5 10.7 1.7-1.4 3.9-1.9 6.5-1.5 0 3.4-3.4 5.8-8 5.8Z"/>',
      cosmetics:'<path d="M9 3h6v5H9z"/><path d="M8 8h8v13H8z"/><path d="M10 8V5h4v3"/><path d="M10 13h4"/>'
    };
    return open+(paths[type]||paths.barber)+close;
  }

  function injectStyles(){
    if(q('#liw-studio-business-type-style'))return;
    const style=document.createElement('style');
    style.id='liw-studio-business-type-style';
    style.textContent=`
      .studio-business-picker{margin:0 0 14px;padding:15px;border:1px solid rgba(11,20,56,.12);border-radius:18px;background:linear-gradient(180deg,#fff,#f8f9fc);box-shadow:0 10px 30px rgba(11,20,56,.05)}
      .studio-business-picker__head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.studio-business-picker__head strong{display:block;color:#0b1438;font-size:.9rem}.studio-business-picker__head p{margin:4px 0 0;color:#737b8f;font-size:.72rem;line-height:1.4}.studio-business-picker__tag{flex:0 0 auto;padding:5px 8px;border-radius:999px;background:#0b1438;color:#fff;font-size:.58rem;font-weight:850;letter-spacing:.05em;text-transform:uppercase}
      .studio-business-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.studio-business-choice{appearance:none;border:1px solid rgba(11,20,56,.1);border-radius:13px;background:#fff;color:#17213f;padding:10px 7px;min-height:86px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;cursor:pointer;transition:.16s ease}.studio-business-choice:hover{transform:translateY(-1px);border-color:rgba(11,20,56,.3)}.studio-business-choice.is-active{border-color:var(--card-primary,#0b1438);box-shadow:0 0 0 2px color-mix(in srgb,var(--card-primary,#0b1438) 20%,transparent);background:color-mix(in srgb,var(--card-primary,#0b1438) 5%,#fff)}.studio-business-choice__icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#f2f4f8;color:#0b1438}.studio-business-choice.is-active .studio-business-choice__icon{background:#0b1438;color:#fff}.studio-business-choice strong{font-size:.68rem;line-height:1.1}.studio-business-choice small{font-size:.55rem;line-height:1.15;color:#8a91a3}
      #preview-cover{position:relative}.studio-preview-industry{position:absolute;right:10px;bottom:10px;z-index:8;display:flex;align-items:center;gap:6px;max-width:128px;padding:6px 8px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(8,12,24,.7);backdrop-filter:blur(8px);color:#fff;box-shadow:0 5px 16px rgba(0,0,0,.16)}.studio-preview-industry svg{width:16px;height:16px;flex:0 0 auto}.studio-preview-industry span{font-size:.58rem;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:760px){.studio-business-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.studio-business-choice{min-height:76px}.studio-business-choice small{display:none}}
    `;
    document.head.appendChild(style);
  }

  function rebrandStudio(){
    const option=q('[data-card-experience="barbershop"]');
    if(option){
      const eyebrow=option.querySelector(':scope > span');
      const title=option.querySelector(':scope > strong');
      const copy=option.querySelector(':scope > small');
      if(eyebrow)eyebrow.textContent='Studio';
      if(title)title.textContent='Beauty & grooming studio';
      if(copy)copy.textContent='Barber, hair, nails, lashes, makeup, skin, spa and cosmetics.';
      option.setAttribute('aria-label','Choose Studio experience');
    }

    const center=q('#barber-control-center');
    if(!center)return;
    center.querySelectorAll('h1,h2,h3,strong,p,span,small').forEach(node=>{
      if(node.children.length)return;
      const original=String(node.textContent||'');
      const replacement=original
        .replace(/Barber Control Center/g,'Studio Control Center')
        .replace(/Barbershop editor mode/g,'Studio editor mode')
        .replace(/Barbershop/g,'Studio')
        .replace(/barbershop/g,'Studio')
        .replace(/Barber experience/g,'Studio experience')
        .replace(/barber experience/g,'Studio experience');
      if(replacement!==original)node.textContent=replacement;
    });
  }

  function renderPreviewBadge(){
    const cover=q('#preview-cover');
    if(!cover)return;
    let badge=q('.studio-preview-industry',cover);
    if(!studioActive()){
      badge?.remove();
      delete document.body.dataset.studioBusinessType;
      return;
    }
    if(!badge){
      badge=document.createElement('div');
      badge.className='studio-preview-industry';
      cover.appendChild(badge);
    }
    const meta=TYPES[selectedType]||TYPES.barber;
    badge.innerHTML=`${businessIcon(selectedType,16)}<span>${meta.label}</span>`;
    document.body.dataset.studioBusinessType=selectedType;
  }

  function syncButtons(){
    qa('[data-studio-business-type]').forEach(button=>{
      const active=button.dataset.studioBusinessType===selectedType;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
    renderPreviewBadge();
  }

  async function persistType(){
    if(!studioActive()||persistBusy)return;
    let id=null;
    try{id=typeof currentId!=='undefined'?currentId:null;}catch(_){ }
    if(!id||!window.supabaseClient?.rpc)return;
    persistBusy=true;
    try{
      const {error}=await window.supabaseClient.rpc('set_studio_business_type',{p_card_id:id,p_business_type:selectedType});
      if(error)throw error;
    }catch(error){
      console.warn('Studio business type save failed:',error);
      try{window.toast?.('Studio type will retry with your next save.');}catch(_){ }
    }finally{persistBusy=false;}
  }

  function chooseType(type,{persist=true}={}){
    if(!TYPES[type])type='barber';
    selectedType=type;
    syncButtons();
    if(persist)void persistType();
    try{if(typeof render==='function')render();}catch(_){ }
  }

  function mountPicker(){
    rebrandStudio();
    const look=q('#barber-control-center [data-barber-v5-panel="look"]');
    if(!look)return false;
    let picker=q('[data-studio-business-picker]',look);
    if(!picker){
      picker=document.createElement('section');
      picker.className='studio-business-picker';
      picker.dataset.studioBusinessPicker='true';
      picker.innerHTML=`<div class="studio-business-picker__head"><div><strong>What kind of Studio is this?</strong><p>Pick the business type and Studio adapts its icon and customer wording. You can change this anytime.</p></div><span class="studio-business-picker__tag">Adaptive</span></div><div class="studio-business-grid">${Object.entries(TYPES).map(([key,meta])=>`<button type="button" class="studio-business-choice" data-studio-business-type="${key}" aria-pressed="false"><span class="studio-business-choice__icon">${businessIcon(key,22)}</span><strong>${meta.label}</strong><small>${meta.hint}</small></button>`).join('')}</div>`;
      const bridge=q('[data-barber-template-bridge]',look);
      if(bridge)bridge.insertAdjacentElement('beforebegin',picker);else look.prepend(picker);
      picker.addEventListener('click',event=>{
        const button=event.target.closest('[data-studio-business-type]');
        if(!button)return;
        chooseType(button.dataset.studioBusinessType);
      });
    }
    syncButtons();
    return true;
  }

  async function loadSavedType(){
    if(loadingType)return;
    let id=null;
    try{id=typeof currentId!=='undefined'?currentId:null;}catch(_){ }
    if(!id||!window.supabaseClient)return;
    loadingType=true;
    try{
      const {data,error}=await window.supabaseClient.from('digital_cards').select('studio_business_type').eq('id',id).maybeSingle();
      if(!error&&data?.studio_business_type)chooseType(String(data.studio_business_type),{persist:false});
    }catch(error){console.warn('Studio business type load skipped:',error);}
    finally{loadingType=false;}
  }

  function refresh(){
    injectStyles();
    rebrandStudio();
    mountPicker();
    syncButtons();
    void loadSavedType();
  }

  const priorPerformSave=typeof performSave==='function'?performSave:null;
  if(priorPerformSave){
    performSave=async function(...args){
      const result=await priorPerformSave.apply(this,args);
      if(studioActive())await persistType();
      return result;
    };
  }

  document.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-card-experience="barbershop"]'))setTimeout(refresh,0);
  },true);
  document.addEventListener('change',event=>{
    if(event.target?.matches?.('[name="card_experience"],[name="color_mode"]'))setTimeout(refresh,0);
  },true);

  const observer=new MutationObserver(()=>{
    if(q('[data-card-experience="barbershop"]')||q('#barber-control-center'))refresh();
  });

  function start(){
    injectStyles();
    refresh();
    const design=q('.editor-panel[data-panel="design"]')||document.body;
    observer.observe(design,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),6000);
  }

  window.LIWStudio={
    types:TYPES,
    get businessType(){return selectedType;},
    setBusinessType:type=>chooseType(type),
    refresh
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
