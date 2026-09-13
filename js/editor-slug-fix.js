(function(){
  'use strict';
  const input=document.getElementById('slug');
  if(!input||typeof slugify!=='function'||typeof scheduleSave!=='function')return;

  const finalSlugify=slugify;
  const normalScheduleSave=scheduleSave;
  const normalImmediateAutosave=typeof requestImmediateAutosave==='function'?requestImmediateAutosave:null;
  const normalPerformSave=typeof performSave==='function'?performSave:null;
  const normalCollect=typeof collectCardPayload==='function'?collectCardPayload:null;

  let editGeneration=0;
  let pendingSlugValue=input.value||'';
  let slugEditPending=false;

  const isEditingSlug=()=>document.activeElement===input;

  function rememberSlugEdit(value=input.value){
    pendingSlugValue=String(value??'');
    slugEditPending=true;
    editGeneration+=1;
  }

  function restorePendingSlug(){
    if(!slugEditPending)return;
    const start=input.selectionStart;
    const end=input.selectionEnd;
    if(input.value!==pendingSlugValue)input.value=pendingSlugValue;
    if(typeof render==='function')render();
    if(isEditingSlug()&&typeof input.setSelectionRange==='function'){
      try{
        const length=input.value.length;
        input.setSelectionRange(Math.min(start??length,length),Math.min(end??length,length));
      }catch(_){ }
    }
  }

  function showSlugSaved(){
    const status=document.getElementById('slug-status');
    if(!status||status.classList.contains('warning'))return;
    status.textContent='Card address saved.';
    status.className='input-help slug-status success';
  }

  slugify=function(text){
    if(isEditingSlug()){
      return String(text||'').toLowerCase().replace(/[^a-z0-9 -]/g,'').slice(0,60);
    }
    return finalSlugify(text);
  };

  scheduleSave=function(){
    if(isEditingSlug()){
      if(typeof markDirty==='function')markDirty();
      if(typeof persistLocalDraft==='function')persistLocalDraft();
      if(typeof setSaveState==='function')setSaveState('saving','Finish typing your card address…');
      return;
    }
    return normalScheduleSave();
  };

  if(normalImmediateAutosave){
    requestImmediateAutosave=function(){
      if(isEditingSlug()){
        if(typeof setSaveState==='function')setSaveState('saving','Finish typing your card address…');
        return;
      }
      return normalImmediateAutosave();
    };
  }

  /* A save that started before the user began editing can finish later and
     write the old server slug back into the input. Keep the user's newest
     typing authoritative until a save that started with that edit completes. */
  if(normalPerformSave){
    performSave=async function(...args){
      const generationAtStart=editGeneration;
      const pendingAtStart=slugEditPending;
      const editingAtStart=isEditingSlug();
      try{
        const result=await normalPerformSave.apply(this,args);
        const changedDuringSave=editGeneration!==generationAtStart;
        if(changedDuringSave||isEditingSlug()||editingAtStart){
          restorePendingSlug();
          if(typeof setSaveState==='function')setSaveState('saving','Finish typing your card address…');
        }else if(pendingAtStart){
          slugEditPending=false;
          pendingSlugValue=input.value||'';
          showSlugSaved();
        }
        return result;
      }catch(error){
        if(editGeneration!==generationAtStart||isEditingSlug())restorePendingSlug();
        throw error;
      }
    };
  }

  if(normalCollect){
    collectCardPayload=function(){
      const payload=normalCollect();
      if(payload.slug)payload.slug=finalSlugify(payload.slug);
      return payload;
    };
  }

  input.addEventListener('focus',()=>{
    /* Cancel a normal pending debounce so it cannot fire midway through the
       address edit. An already-running request is handled by performSave above. */
    try{
      if(typeof saveTimer!=='undefined'&&saveTimer){
        clearTimeout(saveTimer);
        saveTimer=null;
      }
    }catch(_){ }
    rememberSlugEdit(input.value);
  });

  input.addEventListener('input',()=>{
    rememberSlugEdit(input.value);
    const status=document.getElementById('slug-status');
    if(status){
      status.textContent='Keep typing. Your card address will save when you finish this field.';
      status.className='input-help slug-status';
    }
  });

  input.addEventListener('blur',()=>{
    const formatted=finalSlugify(input.value);
    input.value=formatted;
    rememberSlugEdit(formatted);
    if(typeof render==='function')render();
    normalScheduleSave();
    const status=document.getElementById('slug-status');
    if(status){
      status.textContent=input.value?'Card address formatted and saving…':'Enter a short public card address.';
      status.className=`input-help slug-status${input.value?' success':''}`;
    }
  });
})();

/* STAGING ONLY: isolated editor UX experiments. */
(function loadWholeCardStagingTest(){
  if(document.querySelector('script[data-whole-card-staging-test]'))return;
  const script=document.createElement('script');
  script.src='js/editor-whole-card-staging-test.js?v=20260814-2';
  script.dataset.wholeCardStagingTest='true';
  document.body.appendChild(script);
})();

(function loadBusinessToolsCollapseStaging(){
  if(document.querySelector('script[data-business-tools-collapse-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-business-tools-collapse-staging.js?v=20260814-2';
  script.dataset.businessToolsCollapseStaging='true';
  document.body.appendChild(script);
})();

(function loadBusinessToolsMobilePolishStaging(){
  if(document.querySelector('script[data-business-tools-mobile-polish-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-business-tools-mobile-polish-staging.js?v=20260814-3';
  script.dataset.businessToolsMobilePolishStaging='true';
  document.body.appendChild(script);
})();

(function loadBusinessToolsMobileRefineStaging(){
  if(document.querySelector('script[data-business-tools-mobile-refine-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-business-tools-mobile-refine-staging.js?v=20260814-1';
  script.dataset.businessToolsMobileRefineStaging='true';
  document.body.appendChild(script);
})();

(function loadSimpleBusinessCollapseStaging(){
  if(document.querySelector('script[data-simple-business-collapse-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-business-tools-simple-collapse-staging.js?v=20260814-2';
  script.dataset.simpleBusinessCollapseStaging='true';
  document.body.appendChild(script);
})();

(function loadServicesCheckboxStaging(){
  if(document.querySelector('script[data-services-checkbox-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-services-checkbox-staging.js?v=20260814-1';
  script.dataset.servicesCheckboxStaging='true';
  document.body.appendChild(script);
})();

(function loadEditorFocusStaging(){
  if(document.querySelector('script[data-editor-focus-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-focus-staging.js?v=20260824-2';
  script.dataset.editorFocusStaging='true';
  document.body.appendChild(script);
})();

/* Brand logos load first; the compact social UI then consumes those marks.
   This prevents generic category glyphs from overwriting verified brand icons. */
(function loadStagingPlatformIcons(){
  function loadSocialClean(){
    if(document.querySelector('script[data-social-clean-staging]'))return;
    const social=document.createElement('script');
    social.src='js/editor-social-clean-staging.js?v=20260824-2';
    social.dataset.socialCleanStaging='true';
    document.body.appendChild(social);
  }

  if(window.LIWSupericons){loadSocialClean();return;}

  const existing=document.querySelector('script[data-supericons-staging]');
  if(existing){
    existing.addEventListener('load',loadSocialClean,{once:true});
    setTimeout(loadSocialClean,900);
    return;
  }

  const script=document.createElement('script');
  script.src='js/supericons-staging.js?v=20260824-2';
  script.dataset.supericonsStaging='true';
  script.async=false;
  script.addEventListener('load',loadSocialClean,{once:true});
  document.body.appendChild(script);
  setTimeout(loadSocialClean,1200);
})();

/* Emergency rollback 2026-08-14: selected-status experiment disabled because
   its DOM observer could repeatedly mutate the editor and freeze the page. */

(function loadEditorNameFontStaging(){
  if(document.querySelector('script[data-editor-name-font-staging]'))return;
  const script=document.createElement('script');
  script.src='js/editor-name-font-staging.js?v=20260830-name-font-2';
  script.dataset.editorNameFontStaging='true';
  document.body.appendChild(script);
})();

/* Music Dressing Room switches must persist immediately. The Dressing Room's
   own Save now action remains the single source of truth for its RPC payload. */
(function saveArtistTilesImmediately(){
  let timer=0;
  document.addEventListener('change',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target?.matches?.('[data-artist-tile-visible]'))return;
    clearTimeout(timer);
    timer=setTimeout(()=>document.querySelector('[data-artist-save-now]')?.click(),60);
  },true);
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('[data-artist-move]'):null;
    if(!target)return;
    clearTimeout(timer);
    timer=setTimeout(()=>document.querySelector('[data-artist-save-now]')?.click(),80);
  },true);
})();

/* Barbershop V5 is mounted explicitly from a file the editor already loads.
   Template selection now follows Showtime: the normal LIW template grid remains
   the single Standard/Premium picker, while Barber keeps its own experience. */
(function loadSafeBarbershopExperience(){
  'use strict';
  if(!/\/editor(?:\.html)?$/i.test(location.pathname))return;
  const version='20260912-studio-v3';
  if(!document.querySelector('link[data-liw-barber-v5-editor]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href=`css/editor-barbershop-experience-staging.css?v=${version}`;
    style.dataset.liwBarberV5Editor='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('link[data-liw-barber-template-bridge]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href=`css/editor-barbershop-template-bridge-staging.css?v=${version}`;
    style.dataset.liwBarberTemplateBridge='true';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-liw-barber-v5-editor]')){
    const script=document.createElement('script');
    script.src=`js/editor-barbershop-experience-staging.js?v=${version}`;
    script.async=false;
    script.dataset.liwBarberV5Editor='true';
    document.body.appendChild(script);
  }
  if(!document.querySelector('script[data-liw-barber-template-bridge]')){
    const bridge=document.createElement('script');
    bridge.src=`js/editor-barbershop-template-bridge-staging.js?v=${version}`;
    bridge.async=false;
    bridge.dataset.liwBarberTemplateBridge='true';
    document.body.appendChild(bridge);
  }
})();

/* Studio V3: keep the inherited Barbershop editor shell, but make the visible
   CLIENT VIEW and shortcut copy follow the Studio business type immediately. */
(function adaptStudioEditorPreview(){
  'use strict';
  if(window.__LIW_STUDIO_EDITOR_PREVIEW_V3__)return;
  window.__LIW_STUDIO_EDITOR_PREVIEW_V3__=true;

  const TYPES={
    barber:{booking:'BOOK MY CHAIR',service:'Cuts & prices',gallery:'Fresh Cuts gallery',bookingHelp:'Book My Chair uses our appointment system'},
    hair:{booking:'BOOK HAIR',service:'Hair services',gallery:'Style gallery',bookingHelp:'Book Hair uses our appointment system'},
    nails:{booking:'BOOK NAILS',service:'Nail services',gallery:'Nail gallery',bookingHelp:'Book Nails uses our appointment system'},
    lashes:{booking:'BOOK LASH / BROW',service:'Lash & brow services',gallery:'Lash / Brow gallery',bookingHelp:'Book Lash / Brow uses our appointment system'},
    makeup:{booking:'BOOK MAKEUP',service:'Makeup services',gallery:'Makeup portfolio',bookingHelp:'Book Makeup uses our appointment system'},
    esthetician:{booking:'BOOK SKIN',service:'Skin treatments',gallery:'Skin results',bookingHelp:'Book Skin uses our appointment system'},
    spa:{booking:'BOOK SPA',service:'Spa services',gallery:'Spa gallery',bookingHelp:'Book Spa uses our appointment system'},
    cosmetics:{booking:'BOOK CONSULT',service:'Products & consults',gallery:'Product gallery',bookingHelp:'Book Consult uses our appointment system'}
  };

  function businessIcon(type,size=20){
    const open=`<svg class="studio-business-svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">`;
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
    return open+(paths[type]||paths.barber)+'</svg>';
  }

  function currentType(){
    const fromApi=window.LIWStudio?.businessType;
    if(fromApi&&TYPES[fromApi])return fromApi;
    const selected=document.querySelector('[data-studio-business-type].is-active');
    return selected&&TYPES[selected.dataset.studioBusinessType]?selected.dataset.studioBusinessType:'barber';
  }

  function ensureStyle(){
    if(document.getElementById('liw-studio-editor-preview-v3-style'))return;
    const style=document.createElement('style');
    style.id='liw-studio-editor-preview-v3-style';
    style.textContent=`
      .barber-v5-look-preview>span[data-studio-preview-icon]{width:36px!important;min-width:36px;height:36px;align-self:center;display:grid;place-items:center;border-radius:11px;background:rgba(212,168,79,.14)!important;color:#e7c46e}
      .barber-v5-look-preview>span[data-studio-preview-icon] svg{width:20px;height:20px}
      #barber-control-center[data-studio-business-type]:not([data-studio-business-type="barber"]) .barber-v5-pole{background:#d4a84f}
    `;
    document.head.appendChild(style);
  }

  function update(type=currentType()){
    const center=document.getElementById('barber-control-center');
    if(!center)return false;
    type=TYPES[type]?type:'barber';
    const meta=TYPES[type];
    center.dataset.studioBusinessType=type;
    ensureStyle();

    const preview=center.querySelector('.barber-v5-look-preview');
    if(preview){
      const mark=preview.querySelector(':scope > span');
      if(mark){
        if(type==='barber'){
          delete mark.dataset.studioPreviewIcon;
          mark.innerHTML='';
        }else{
          mark.dataset.studioPreviewIcon=type;
          mark.innerHTML=businessIcon(type,20);
        }
      }
      const cta=preview.querySelector('em');
      if(cta)cta.textContent=meta.booking;
    }

    const lookHead=center.querySelector('[data-barber-v5-panel="look"] .barber-v5-panel-head');
    if(lookHead){
      const title=lookHead.querySelector('strong');if(title)title.textContent='Studio vibe';
      const sub=lookHead.querySelector('span');if(sub)sub.textContent='Choose a Studio-ready palette or customize the colors below.';
    }

    const booking=center.querySelector('[data-barber-v5-jump="booking"]');
    const bookingHelp=booking?.querySelector('small');if(bookingHelp)bookingHelp.textContent=meta.bookingHelp;
    const services=center.querySelector('[data-barber-v5-jump="services"]');
    const serviceTitle=services?.querySelector('strong');if(serviceTitle)serviceTitle.textContent=meta.service;
    const serviceIcon=services?.querySelector('svg');if(serviceIcon)serviceIcon.outerHTML=businessIcon(type,20);
    const photos=center.querySelector('[data-barber-v5-jump="photos"]');
    const galleryTitle=photos?.querySelector('strong');if(galleryTitle)galleryTitle.textContent=meta.gallery;
    const toolsSub=center.querySelector('[data-barber-v5-panel="tools"] .barber-v5-panel-head span');
    if(toolsSub)toolsSub.textContent='Studio shortcuts into the LIW tools already powering the card.';
    const shopLabel=center.querySelector('.barber-v5-status>div:first-child span');if(shopLabel)shopLabel.textContent='Studio';
    return true;
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-studio-business-type]');
    if(button)setTimeout(()=>update(button.dataset.studioBusinessType),0);
  },true);
  document.addEventListener('change',event=>{
    if(event.target?.matches?.('[name="color_mode"],[name="card_experience"]'))setTimeout(()=>update(),0);
  },true);
  [80,300,800,1500].forEach(delay=>setTimeout(()=>update(),delay));
  window.LIWStudioEditorPreview={refresh:update};
})();
