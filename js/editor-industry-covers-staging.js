/* cards-staging cleanup: industry covers removed; purge legacy staging template-lab cards and load staging design fixes directly. */
(function(){
  function isStagingTemplate(template){
    return Boolean(template && (template.staging_only === true || String(template.id || '').startsWith('staging-')));
  }

  function purgeStagingTemplates(){
    try{
      if(Array.isArray(templates)){
        for(let i=templates.length-1;i>=0;i--){
          if(isStagingTemplate(templates[i]))templates.splice(i,1);
        }
      }
    }catch(_){ }

    const grid=document.getElementById('template-grid');
    if(!grid)return false;
    grid.querySelectorAll('.template-card').forEach(card=>{
      const id=String(card.dataset.template||'');
      if(card.dataset.stagingOnly==='true'||id.startsWith('staging-'))card.remove();
    });
    grid.querySelectorAll('.template-tier-group').forEach(group=>{
      if(!group.querySelector('.template-card'))group.remove();
    });
    grid.parentElement?.querySelectorAll('.editor-step-note').forEach(note=>{
      if(/staging template lab/i.test(note.textContent||''))note.remove();
    });
    return true;
  }

  function purgeNoopBusinessStyleSeeds(){
    const defaults={
      services:{appearance:'clean',layout:'list',accent:'brand',heading_align:'left',display_title:'',display_kicker:''},
      booking:{appearance:'clean',layout:'button',accent:'brand',heading_align:'left',display_title:'',display_kicker:''},
      leads:{appearance:'clean',layout:'card',accent:'brand',heading_align:'left',display_title:'',display_kicker:''},
      products:{appearance:'clean',layout:'grid',accent:'brand',heading_align:'left',display_title:'',display_kicker:''},
      'payment-sharing':{appearance:'clean',layout:'buttons',accent:'brand',heading_align:'left',display_title:'',display_kicker:''},
      'payment-link':{appearance:'clean',layout:'button',accent:'brand',heading_align:'left',display_title:'',display_kicker:''}
    };
    const allowed=['appearance','layout','accent','heading_align','display_title','display_kicker'];
    const ids=new Set(['new-card',new URLSearchParams(location.search).get('id')||'new-card']);
    ids.forEach(id=>Object.entries(defaults).forEach(([type,expected])=>{
      const key=`liw-staging-tool-style:${id}:${type}`;
      try{
        const parsed=JSON.parse(localStorage.getItem(key)||'null');
        if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return;
        if(Object.keys(parsed).some(name=>!allowed.includes(name)))return;
        const normalized={};allowed.forEach(name=>{normalized[name]=parsed[name]??expected[name];});
        if(allowed.every(name=>String(normalized[name])===String(expected[name])))localStorage.removeItem(key);
      }catch(_){ }
    }));
  }

  function loadScript(src,datasetKey){
    if(document.querySelector(`script[${datasetKey}]`))return;
    const script=document.createElement('script');
    script.src=src;
    script.defer=true;
    script.setAttribute(datasetKey,'true');
    document.head.appendChild(script);
  }

  function loadStylesheet(href,datasetKey){
    if(document.querySelector(`link[${datasetKey}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.setAttribute(datasetKey,'true');
    document.head.appendChild(link);
  }

  function expandedFontsAllowed(){
    try{
      if(typeof hasEntitlement==='function')return hasEntitlement('expanded_fonts')===true;
      if(typeof editorAccess!=='undefined'&&editorAccess){
        if(editorAccess.isAdmin&&!editorAccess.isPlanPreview)return true;
        return editorAccess.has?.('expanded_fonts')===true;
      }
    }catch(_){ }
    return false;
  }

  function expandFontLibrary(){
    loadStylesheet('css/card-fonts-staging.css?v=20260829-fonts-1','data-liw-card-fonts-staging');
    const select=document.querySelector('select[name="font_family"]');
    if(!select)return false;
    const fonts=[
      'Sora','Rubik','Work Sans','Archivo','Josefin Sans','Barlow Condensed',
      'Cinzel','Abril Fatface','Anton','Comfortaa','Dancing Script','Great Vibes'
    ];
    let group=[...select.querySelectorAll('optgroup')].find(item=>/Plus\s*&\s*Pro/i.test(item.label||''));
    if(!group){
      group=document.createElement('optgroup');
      group.label='Plus & Pro fonts';
      select.appendChild(group);
    }
    const existing=new Set([...select.options].map(option=>String(option.value||'').toLowerCase()));
    fonts.forEach(font=>{
      if(existing.has(font.toLowerCase()))return;
      const option=document.createElement('option');
      option.value=font;
      option.textContent=font;
      option.dataset.premiumFont='true';
      group.appendChild(option);
      existing.add(font.toLowerCase());
    });
    const canUse=expandedFontsAllowed();
    fonts.forEach(font=>{
      const option=[...select.options].find(item=>item.value===font);
      if(option)option.disabled=!canUse;
    });
    return true;
  }

  purgeNoopBusinessStyleSeeds();
  expandFontLibrary();
  loadScript('js/editor-button-style-staging.js?v=20260816-button-style-2','data-liw-button-style-staging');
  loadScript('js/editor-bulk-style-visible-preview-staging.js?v=20260816-bulk-visible-1','data-liw-bulk-visible-staging');
  loadScript('js/editor-profile-crop-staging.js?v=20260817-profile-crop-1','data-liw-profile-crop-staging');
  loadScript('js/editor-social-handle-ux-staging.js?v=20260817-social-handle-1','data-liw-social-handle-ux-staging');
  loadScript('js/editor-public-card-frame-stable-staging.js?v=20260818-public-frame-stable-1','data-liw-public-card-frame-staging');
  loadScript('js/editor-public-preview-interactive-staging.js?v=20260818-preview-interactive-1','data-liw-public-preview-interactive-staging');
  loadScript('js/editor-save-ux-staging.js?v=20260818-save-ux-2','data-liw-editor-save-ux-staging');
  loadScript('js/editor-experience-autosave-staging.js?v=20260818-experience-autosave-1','data-liw-experience-autosave-staging');
  loadScript('js/editor-mobile-public-preview-launcher-staging.js?v=20260818-mobile-launcher-2','data-liw-mobile-public-preview-launcher-staging');
  loadScript('js/business-tool-premium-shared-staging.js?v=20260818-business-premium-2','data-liw-business-tool-premium-staging');
  loadScript('js/editor-business-premium-frame-injector-staging.js?v=20260818-business-frame-2','data-liw-business-premium-frame-injector-staging');

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    purgeStagingTemplates();
    expandFontLibrary();
    if(attempts>=60)clearInterval(timer);
  },250);
  document.addEventListener('click',event=>{
    if(event.target.closest('.editor-tab[data-tab="design"],#template-grid,.design-advanced-details')){
      setTimeout(purgeStagingTemplates,0);
      setTimeout(expandFontLibrary,0);
      setTimeout(()=>window.LIWButtonStyleStaging?.refresh?.(),30);
      setTimeout(()=>window.LIWBulkStyleVisiblePreview?.refresh?.(),40);
    }
  });
})();
