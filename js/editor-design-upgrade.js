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

  function callEditor(name){
    try{if(typeof window[name]==='function')window[name]();else if(typeof globalThis[name]==='function')globalThis[name]();}catch(_){ }
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
    syncPaletteActive();
    syncHexLabels();
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
    notifyInputs([hidden]);
    markCustomized();
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
    notifyInputs([hidden,gradient]);
    markCustomized();
    try{updateCoverPreview();}catch(_){ }
    try{render();}catch(_){ }
    try{scheduleSave();}catch(_){ }
    syncCoverActive();
  }

  function syncCoverActive(){
    const cover=String(getField('cover_image_url')?.value||'');
    const gradient=String(getField('gradient_background')?.value||'');
    all('.premium-cover-card').forEach(btn=>btn.classList.toggle('active',cover.endsWith(btn.dataset.coverUrl||'' )||cover===btn.dataset.coverUrl));
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
    buildBrandStudio();
    buildCoverStudio();
    buildPaymentTextColor();
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
