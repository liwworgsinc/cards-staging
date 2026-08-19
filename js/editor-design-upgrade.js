(function(){
  const palettes=[
    {name:'Navy Gold',colors:['#0b1438','#d4a84f','#ffffff','#111827']},
    {name:'Midnight Silver',colors:['#111827','#94a3b8','#f8fafc','#0f172a']},
    {name:'Emerald Cream',colors:['#0f5d55','#d6b56c','#fffdf7','#15332f']},
    {name:'Royal Blue',colors:['#174ea6','#8ab4f8','#f8fbff','#102a43']},
    {name:'Burgundy',colors:['#7f1d3a','#d6aa73','#fff9f7','#35131d']},
    {name:'Soft Neutral',colors:['#6f5948','#c8ad90','#fbf8f3','#312820']},
    {name:'Modern Teal',colors:['#0f766e','#5eead4','#f7fffd','#102a2a']},
    {name:'Plum Gold',colors:['#4c1d5f','#d7b66b','#fffaff','#28112f']}
  ];

  const covers=[
    {name:'Luxury Marble',url:'assets/covers/luxury-marble.svg'},
    {name:'City Glass',url:'assets/covers/city-glass.svg'},
    {name:'Emerald Wave',url:'assets/covers/emerald-wave.svg'},
    {name:'Warm Studio',url:'assets/covers/warm-studio.svg'},
    {name:'Blueprint',url:'assets/covers/blueprint-lines.svg'},
    {name:'Soft Arches',url:'assets/covers/soft-arches.svg'}
  ];

  const gradients=[
    {name:'Navy Gold',value:'linear-gradient(135deg,#071127 0%,#0b1438 48%,#d4a84f 145%)'},
    {name:'Midnight',value:'linear-gradient(135deg,#020617 0%,#1e293b 52%,#475569 120%)'},
    {name:'Emerald',value:'linear-gradient(135deg,#052e2b 0%,#0f766e 58%,#8ad9ca 135%)'},
    {name:'Champagne',value:'linear-gradient(135deg,#5b4034 0%,#a98467 50%,#f0dfc8 125%)'},
    {name:'Royal',value:'linear-gradient(135deg,#172554 0%,#1d4ed8 57%,#93c5fd 135%)'},
    {name:'Plum',value:'linear-gradient(135deg,#2e1065 0%,#6b21a8 55%,#d8b4fe 135%)'}
  ];

  const $=s=>document.querySelector(s);
  const all=s=>[...document.querySelectorAll(s)];
  const getField=name=>document.querySelector(`[name="${name}"]`);

  function notifyInputs(elements){
    elements.filter(Boolean).forEach(el=>{
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    });
  }

  function markCustomized(){
    const summary=$('#template-selected-summary');
    if(summary)summary.textContent='Customized';
  }

  function applyPalette(palette){
    const [primary,secondary,background,text]=palette.colors;
    const p=getField('primary_color'),s=getField('secondary_color'),b=getField('background_color'),t=getField('text_color');
    const button=getField('button_color'),gradient=getField('gradient_background');
    if(p)p.value=primary;if(s)s.value=secondary;if(b)b.value=background;if(t)t.value=text;
    if(button)button.value=primary;
    if(gradient)gradient.value=`linear-gradient(135deg,${primary},${secondary})`;
    notifyInputs([p,s,b,t,button,gradient]);
    markCustomized();
    syncPaletteActive();syncHexLabels();
    try{render();}catch(_){ }
    try{scheduleSave();}catch(_){ }
  }

  function syncPaletteActive(){
    const current=[getField('primary_color')?.value,getField('secondary_color')?.value,getField('background_color')?.value,getField('text_color')?.value].map(v=>String(v||'').toLowerCase());
    all('.premium-palette-card').forEach(btn=>{
      const colors=String(btn.dataset.colors||'').split(',').map(v=>v.toLowerCase());
      btn.classList.toggle('active',colors.length===4&&colors.every((v,i)=>v===current[i]));
    });
  }

  function syncHexLabels(){
    ['primary_color','secondary_color','background_color','text_color'].forEach(name=>{
      const input=getField(name);const out=document.querySelector(`[data-color-hex="${name}"]`);
      if(input&&out)out.textContent=String(input.value||'').toUpperCase();
    });
  }

  function buildBrandStudio(){
    const legacy=$('#color-presets');
    if(!legacy||$('#premium-palette-grid'))return;
    const section=legacy.closest('.form-section');
    if(!section)return;
    section.classList.add('premium-brand-studio');
    const heading=section.querySelector(':scope > h3');
    if(heading)heading.textContent='Brand colors';

    const intro=document.createElement('div');
    intro.className='premium-design-kicker';
    intro.innerHTML='<strong>Premium palette presets</strong><span>Tap a palette, then fine-tune any color below.</span>';
    legacy.before(intro);

    const grid=document.createElement('div');
    grid.className='premium-palette-grid';
    grid.id='premium-palette-grid';
    grid.innerHTML=palettes.map(p=>`<button type="button" class="premium-palette-card" data-colors="${p.colors.join(',')}" aria-label="Apply ${p.name} palette"><span class="premium-palette-swatch"><i style="background:${p.colors[0]}"></i><i style="background:${p.colors[1]}"></i><i style="background:${p.colors[2]}"></i></span><strong>${p.name}</strong></button>`).join('');
    legacy.before(grid);
    grid.querySelectorAll('.premium-palette-card').forEach((btn,i)=>btn.addEventListener('click',()=>applyPalette(palettes[i])));

    const customRow=legacy.nextElementSibling;
    if(customRow?.classList.contains('form-row')){
      customRow.querySelectorAll('.form-group').forEach(group=>{
        const input=group.querySelector('input[type="color"]');
        if(!input)return;
        const out=document.createElement('span');
        out.className='premium-color-hex';
        out.dataset.colorHex=input.name;
        out.textContent=String(input.value||'').toUpperCase();
        group.append(out);
        input.addEventListener('input',()=>{syncHexLabels();syncPaletteActive();markCustomized();});
        input.addEventListener('change',()=>{syncHexLabels();syncPaletteActive();});
      });
    }
    syncPaletteActive();syncHexLabels();
  }

  function coverAllowed(){return !$('#cover-image-section')?.classList.contains('locked');}

  function setCoverImage(url){
    if(!coverAllowed())return;
    const hidden=getField('cover_image_url');
    try{coverUrl=url;}catch(_){ }
    if(hidden)hidden.value=url;
    notifyInputs([hidden]);markCustomized();
    try{updateCoverPreview();}catch(_){ }
    try{render();}catch(_){ }
    try{scheduleSave();}catch(_){ }
    syncCoverActive();
  }

  function setCoverGradient(value){
    if(!coverAllowed())return;
    const hidden=getField('cover_image_url');const gradient=getField('gradient_background');
    try{coverUrl='';}catch(_){ }
    if(hidden)hidden.value='';
    if(gradient)gradient.value=value;
    notifyInputs([hidden,gradient]);markCustomized();
    try{updateCoverPreview();}catch(_){ }
    try{render();}catch(_){ }
    try{scheduleSave();}catch(_){ }
    syncCoverActive();
  }

  function syncCoverActive(){
    const cover=String(getField('cover_image_url')?.value||'');
    const gradient=String(getField('gradient_background')?.value||'');
    all('.premium-cover-card').forEach(btn=>btn.classList.toggle('active',cover.endsWith(btn.dataset.coverUrl||'')||cover===btn.dataset.coverUrl));
    all('.premium-gradient-card').forEach(btn=>btn.classList.toggle('active',!cover&&gradient===btn.dataset.gradient));
  }

  function buildCoverStudio(){
    const section=$('#cover-image-section');
    const upload=section?.querySelector('.cover-upload-editor');
    if(!section||!upload||$('#premium-cover-studio'))return;
    const studio=document.createElement('div');
    studio.className='premium-cover-studio';studio.id='premium-cover-studio';
    studio.innerHTML=`<div class="premium-cover-head"><strong>Cover gallery</strong><span>Choose a preset or upload your own.</span></div>
      <div class="premium-cover-label">Artwork</div>
      <div class="premium-cover-gallery">${covers.map(c=>`<button type="button" class="premium-cover-card" data-cover-url="${c.url}" aria-label="Use ${c.name} cover"><span class="premium-cover-art" style="background-image:url('${c.url}')"></span><strong>${c.name}</strong></button>`).join('')}</div>
      <div class="premium-cover-label">Premium gradients</div>
      <div class="premium-gradient-grid">${gradients.map(g=>`<button type="button" class="premium-gradient-card" data-gradient="${g.value}" aria-label="Use ${g.name} gradient"><span class="premium-gradient-art" style="background:${g.value}"></span><strong>${g.name}</strong></button>`).join('')}</div>`;
    upload.before(studio);
    studio.querySelectorAll('.premium-cover-card').forEach((btn,i)=>btn.addEventListener('click',()=>setCoverImage(covers[i].url)));
    studio.querySelectorAll('.premium-gradient-card').forEach((btn,i)=>btn.addEventListener('click',()=>setCoverGradient(gradients[i].value)));

    const observer=new MutationObserver(()=>{
      const disabled=!coverAllowed();
      studio.querySelectorAll('button').forEach(btn=>btn.disabled=disabled);
      syncCoverActive();
    });
    observer.observe(section,{attributes:true,attributeFilter:['class']});
    studio.querySelectorAll('button').forEach(btn=>btn.disabled=!coverAllowed());
    $('#remove-cover')?.addEventListener('click',()=>setTimeout(syncCoverActive,0));
    $('#cover-file')?.addEventListener('change',()=>setTimeout(syncCoverActive,1200));
    syncCoverActive();
  }

  function buildPaymentTextColor(){
    const input=getField('button_text_color');
    const group=input?.closest('.form-group');
    if(!input||!group||group.dataset.premiumPaymentText==='true')return;
    group.dataset.premiumPaymentText='true';
    group.classList.add('premium-payment-text-color');
    const preview=document.createElement('div');
    preview.className='premium-payment-color-preview';
    preview.innerHTML='<span class="premium-payment-sample"><i data-lucide="badge-dollar-sign" size="14"></i> Pay</span><code></code>';
    input.insertAdjacentElement('afterend',preview);
    const sync=()=>{
      const color=String(input.value||'#ffffff').toUpperCase();
      const button=String(getField('button_color')?.value||getField('primary_color')?.value||'#0B1438');
      preview.querySelector('code').textContent=color;
      const sample=preview.querySelector('.premium-payment-sample');
      sample.style.background=button;sample.style.color=color;
    };
    input.addEventListener('input',sync);input.addEventListener('change',sync);
    getField('primary_color')?.addEventListener('input',sync);
    getField('button_color')?.addEventListener('input',sync);
    sync();
  }

  function init(){
    buildBrandStudio();buildCoverStudio();buildPaymentTextColor();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    let ticks=0;
    const timer=setInterval(()=>{
      ticks++;
      buildBrandStudio();buildCoverStudio();buildPaymentTextColor();syncPaletteActive();syncHexLabels();syncCoverActive();
      if(ticks>20)clearInterval(timer);
    },500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

/* cards-staging desktop only: compact Design/Themes workspace */
(function(){
  const desktop=window.matchMedia('(min-width: 901px)');
  let initialized=false;

  function injectStyles(){
    if(document.getElementById('liw-desktop-design-compact-style'))return;
    const style=document.createElement('style');
    style.id='liw-desktop-design-compact-style';
    style.textContent=`
      .desktop-design-switcher,.desktop-theme-selected-bar,.desktop-theme-preview-grid,.desktop-theme-browse-wrap{display:none}
      #desktop-theme-browser{display:none}
      @media (min-width:901px){
        .editor-panel[data-panel="design"].desktop-design-compact-ready .desktop-design-switcher{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:2px 0 16px;padding:7px;border:1px solid rgba(11,20,56,.08);border-radius:16px;background:#f7f9fc;box-shadow:0 8px 24px rgba(11,20,56,.035)}
        .desktop-design-switcher button{appearance:none;border:0;background:transparent;border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:center;gap:8px;color:#667085;font-size:.78rem;font-weight:850;cursor:pointer;transition:.16s ease}
        .desktop-design-switcher button:hover{background:#fff;color:#0b1438}
        .desktop-design-switcher button.active{background:#0b1438;color:#fff;box-shadow:0 8px 18px rgba(11,20,56,.16)}
        .desktop-design-switcher svg{width:16px;height:16px}
        .editor-panel[data-panel="design"].desktop-design-compact-ready .desktop-design-pane{display:none!important}
        .editor-panel[data-panel="design"].desktop-design-compact-ready .desktop-design-pane.is-active{display:block!important}
        .editor-panel[data-panel="design"].desktop-design-compact-ready .template-section-head #template-selected-summary{display:none!important}
        .editor-panel[data-panel="design"].desktop-design-compact-ready #template-grid{display:none!important}
        .desktop-theme-selected-bar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:12px 0 14px;padding:12px 14px;border:1px solid rgba(11,20,56,.09);border-radius:14px;background:linear-gradient(180deg,#fbfcff,#f7f9fc)}
        .desktop-theme-selected-copy{display:flex;align-items:center;gap:10px;min-width:0}
        .desktop-theme-selected-copy>span{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#0b1438;color:#fff;flex:0 0 auto}
        .desktop-theme-selected-copy small{display:block;color:#7b8498;font-size:.64rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px}
        .desktop-theme-selected-copy strong{display:block;color:#0b1438;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .desktop-theme-selected-bar>span{font-size:.67rem;color:#667085;white-space:nowrap}
        .desktop-theme-preview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
        .desktop-theme-preview-grid .template-card{min-width:0;padding:8px;border-radius:14px;box-shadow:0 6px 18px rgba(11,20,56,.045)}
        .desktop-theme-preview-grid .template-mini{min-height:92px}
        .desktop-theme-preview-grid .template-card-label{padding-top:7px}
        .desktop-theme-browse-wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;padding-top:12px;border-top:1px solid rgba(11,20,56,.07)}
        .desktop-theme-browse-wrap span{font-size:.68rem;color:#667085}
        .desktop-theme-browse{appearance:none;border:1px solid rgba(11,20,56,.12);background:#fff;color:#0b1438;border-radius:11px;padding:9px 13px;font-size:.72rem;font-weight:900;cursor:pointer;box-shadow:0 5px 14px rgba(11,20,56,.05)}
        .desktop-theme-browse:hover{border-color:rgba(11,20,56,.28);transform:translateY(-1px)}
        .editor-panel[data-panel="design"].desktop-design-compact-ready .desktop-design-pane{margin-top:0}
        .editor-panel[data-panel="design"].desktop-design-compact-ready .desktop-design-pane.is-active{animation:liwDesignPaneIn .16s ease}
        @keyframes liwDesignPaneIn{from{opacity:.55;transform:translateY(4px)}to{opacity:1;transform:none}}
        #desktop-theme-browser[open]{display:block;width:min(1080px,calc(100vw - 70px));max-width:none;height:min(760px,calc(100vh - 70px));max-height:none;padding:0;border:0;border-radius:22px;background:#f7f9fc;box-shadow:0 28px 80px rgba(11,20,56,.28);overflow:hidden}
        #desktop-theme-browser::backdrop{background:rgba(5,10,28,.58);backdrop-filter:blur(3px)}
        .desktop-theme-browser-shell{height:100%;display:grid;grid-template-rows:auto auto minmax(0,1fr);background:#f7f9fc}
        .desktop-theme-browser-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:20px 22px 14px;background:#fff;border-bottom:1px solid rgba(11,20,56,.08)}
        .desktop-theme-browser-head h3{margin:0 0 4px;color:#0b1438;font-size:1.08rem}
        .desktop-theme-browser-head p{margin:0;color:#667085;font-size:.75rem}
        .desktop-theme-browser-close{appearance:none;border:1px solid rgba(11,20,56,.09);background:#f8fafc;color:#0b1438;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;cursor:pointer}
        .desktop-theme-browser-filters{display:flex;gap:8px;padding:12px 22px;background:#fff;border-bottom:1px solid rgba(11,20,56,.06)}
        .desktop-theme-browser-filters button{appearance:none;border:1px solid rgba(11,20,56,.09);background:#fff;color:#667085;border-radius:999px;padding:7px 12px;font-size:.69rem;font-weight:850;cursor:pointer}
        .desktop-theme-browser-filters button.active{background:#0b1438;border-color:#0b1438;color:#fff}
        .desktop-theme-browser-scroll{overflow:auto;padding:18px 22px 24px}
        #desktop-theme-library .template-tier-group{margin:0 0 22px}
        #desktop-theme-library .template-tier-heading{margin-bottom:10px}
        #desktop-theme-library .template-tier-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        #desktop-theme-library .template-card{min-width:0}
        #desktop-theme-library .desktop-filter-hidden{display:none!important}
      }
      @media (min-width:901px) and (max-width:1180px){#desktop-theme-library .template-tier-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function originalCard(grid,id){
    return [...grid.querySelectorAll('.template-card')].find(btn=>String(btn.dataset.template||'')===String(id||''));
  }

  function initDesktop(){
    if(initialized||!desktop.matches)return;
    const panel=document.querySelector('.editor-panel[data-panel="design"]');
    const grid=document.getElementById('template-grid');
    if(!panel||!grid)return;
    const templateSection=grid.closest('.form-section');
    const colorSection=document.querySelector('#color-presets')?.closest('.form-section');
    const coverSection=document.getElementById('cover-image-section');
    const advanced=panel.querySelector('.design-advanced-details');
    if(!templateSection||!colorSection||!coverSection||!advanced)return;
    initialized=true;
    injectStyles();
    panel.classList.add('desktop-design-compact-ready');
    templateSection.classList.add('desktop-design-pane','is-active');templateSection.dataset.desktopDesignPane='themes';
    colorSection.classList.add('desktop-design-pane');colorSection.dataset.desktopDesignPane='colors';
    coverSection.classList.add('desktop-design-pane');coverSection.dataset.desktopDesignPane='cover';
    advanced.classList.add('desktop-design-pane');advanced.dataset.desktopDesignPane='advanced';

    const heading=panel.querySelector(':scope > .panel-heading');
    const nav=document.createElement('nav');
    nav.className='desktop-design-switcher';
    nav.setAttribute('aria-label','Design sections');
    nav.innerHTML=`
      <button type="button" class="active" data-design-target="themes"><i data-lucide="layout-template"></i><span>Themes</span></button>
      <button type="button" data-design-target="colors"><i data-lucide="palette"></i><span>Colors</span></button>
      <button type="button" data-design-target="cover"><i data-lucide="image"></i><span>Cover</span></button>
      <button type="button" data-design-target="advanced"><i data-lucide="sliders-horizontal"></i><span>Advanced</span></button>`;
    heading?.insertAdjacentElement('afterend',nav);

    const selectedBar=document.createElement('div');
    selectedBar.className='desktop-theme-selected-bar';
    selectedBar.innerHTML=`<div class="desktop-theme-selected-copy"><span><i data-lucide="check"></i></span><div><small>Current design</small><strong id="desktop-selected-theme-name">Custom design</strong></div></div><span>Pick from 6 quick choices or browse the full library.</span>`;
    const sectionHead=templateSection.querySelector('.template-section-head');
    sectionHead?.insertAdjacentElement('afterend',selectedBar);

    const preview=document.createElement('div');
    preview.className='desktop-theme-preview-grid';preview.id='desktop-theme-preview-grid';
    selectedBar.insertAdjacentElement('afterend',preview);

    const browseWrap=document.createElement('div');
    browseWrap.className='desktop-theme-browse-wrap';
    browseWrap.innerHTML='<span id="desktop-theme-count">Loading themes…</span><button type="button" class="desktop-theme-browse">Browse all themes</button>';
    preview.insertAdjacentElement('afterend',browseWrap);

    const dialog=document.createElement('dialog');
    dialog.id='desktop-theme-browser';
    dialog.innerHTML=`<div class="desktop-theme-browser-shell"><div class="desktop-theme-browser-head"><div><h3>Theme library</h3><p>Preview every available LIW Cards layout without making the editor page longer.</p></div><button type="button" class="desktop-theme-browser-close" aria-label="Close theme browser"><i data-lucide="x"></i></button></div><div class="desktop-theme-browser-filters"><button type="button" class="active" data-theme-filter="all">All</button><button type="button" data-theme-filter="standard">Standard</button><button type="button" data-theme-filter="premium">Premium</button></div><div class="desktop-theme-browser-scroll"><div id="desktop-theme-library"></div></div></div>`;
    document.body.appendChild(dialog);

    let activeFilter='all';
    function syncSelectedName(){
      const source=document.getElementById('template-selected-summary');
      const out=document.getElementById('desktop-selected-theme-name');
      if(out)out.textContent=String(source?.textContent||'Custom design').trim()||'Custom design';
    }

    function bindCloneButtons(root,closeAfter){
      root.querySelectorAll('.template-card').forEach(clone=>{
        clone.addEventListener('click',()=>{
          const source=originalCard(grid,clone.dataset.template);
          if(!source)return;
          const locked=source.classList.contains('locked');
          source.click();
          setTimeout(()=>{syncAll();if(closeAfter&&!locked&&dialog.open)dialog.close();},60);
        });
      });
    }

    function buildPreview(){
      const cards=[...grid.querySelectorAll('.template-card')];
      const active=cards.find(card=>card.classList.contains('active'));
      let chosen=cards.slice(0,6);
      if(active&&!chosen.includes(active))chosen=[active,...cards.filter(card=>card!==active).slice(0,5)];
      preview.innerHTML='';
      chosen.forEach(card=>preview.appendChild(card.cloneNode(true)));
      bindCloneButtons(preview,false);
      const count=document.getElementById('desktop-theme-count');
      if(count)count.textContent=cards.length?`${cards.length} themes available`:'Loading themes…';
      if(window.lucide)try{lucide.createIcons({attrs:{'stroke-width':2}});}catch(_){ }
    }

    function applyFilter(){
      dialog.querySelectorAll('[data-theme-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.themeFilter===activeFilter));
      dialog.querySelectorAll('#desktop-theme-library .template-tier-group').forEach(group=>group.classList.toggle('desktop-filter-hidden',activeFilter!=='all'&&group.dataset.templateTier!==activeFilter));
    }

    function buildLibrary(){
      const library=document.getElementById('desktop-theme-library');
      if(!library)return;
      library.innerHTML=grid.innerHTML;
      bindCloneButtons(library,true);
      applyFilter();
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
    }

    function syncAll(){syncSelectedName();buildPreview();if(dialog.open)buildLibrary();}

    nav.querySelectorAll('[data-design-target]').forEach(btn=>btn.addEventListener('click',()=>{
      const target=btn.dataset.designTarget;
      nav.querySelectorAll('[data-design-target]').forEach(item=>item.classList.toggle('active',item===btn));
      panel.querySelectorAll('.desktop-design-pane').forEach(pane=>pane.classList.toggle('is-active',pane.dataset.desktopDesignPane===target));
      if(target==='advanced')advanced.open=true;
    }));

    browseWrap.querySelector('.desktop-theme-browse')?.addEventListener('click',()=>{
      buildLibrary();
      if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    });
    dialog.querySelector('.desktop-theme-browser-close')?.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    dialog.querySelectorAll('[data-theme-filter]').forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.themeFilter;applyFilter();}));

    const gridObserver=new MutationObserver(()=>syncAll());
    gridObserver.observe(grid,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    const summary=document.getElementById('template-selected-summary');
    if(summary)new MutationObserver(syncSelectedName).observe(summary,{childList:true,subtree:true,characterData:true});
    desktop.addEventListener?.('change',event=>{if(!event.matches&&dialog.open)dialog.close();});
    syncAll();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function boot(){
    injectStyles();
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      initDesktop();
      if(initialized||tries>30)clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
