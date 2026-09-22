/* LIW Cards staging — global color picker UI.
   Runs only after the page has fully loaded so it cannot block editor auth/hydration. */
(function(){
  'use strict';
  if(window.__LIW_GLOBAL_COLOR_PALETTE__)return;
  window.__LIW_GLOBAL_COLOR_PALETTE__=true;

  const RECENT_KEY='liw_recent_colors_v2';
  const DEFAULT_COLORS=[
    '#0B1438','#D4A84F','#111827','#334155','#0F766E','#14B8A6',
    '#174EA6','#3B82F6','#7F1D3A','#F43F5E','#6F5948','#C8AD90',
    '#4C1D5F','#D7B66B','#FFFFFF','#F8FAFC','#000000'
  ];

  let activeInput=null;
  let observer=null;
  let wireTimer=null;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const normalize=value=>{
    const raw=String(value||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(raw))return raw.toUpperCase();
    if(/^#[0-9a-f]{3}$/i.test(raw)){
      return ('#'+raw.slice(1).split('').map(ch=>ch+ch).join('')).toUpperCase();
    }
    return '';
  };
  const unique=items=>Array.from(new Set(items.map(normalize).filter(Boolean)));

  function recentColors(){
    try{
      const value=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');
      return Array.isArray(value)?unique(value).slice(0,8):[];
    }catch(_){ return []; }
  }

  function rememberColor(value){
    const color=normalize(value);
    if(!color)return;
    try{
      const next=[color,...recentColors().filter(item=>item!==color)].slice(0,8);
      localStorage.setItem(RECENT_KEY,JSON.stringify(next));
    }catch(_){}
  }

  function currentTemplateColors(){
    const colors=[];
    qa('#color-presets [data-colors], .premium-palette-card[data-colors]').forEach(node=>{
      String(node.dataset.colors||'').split(',').forEach(value=>colors.push(value));
    });
    ['primary_color','secondary_color','background_color','text_color','button_color','button_text_color','profile_border_color','qr_foreground_color','qr_background_color'].forEach(name=>{
      const input=q(`input[type="color"][name="${name}"]`);
      if(input)colors.push(input.value);
    });
    return unique(colors);
  }

  function fieldLabel(input){
    if(!input)return 'Color';
    const group=input.closest('.form-group');
    const label=group?.querySelector('label');
    return String(label?.textContent||input.getAttribute('aria-label')||input.name||'Color').trim();
  }

  function ensureStyles(){
    if(q('#liw-global-color-palette-style'))return;
    const style=document.createElement('style');
    style.id='liw-global-color-palette-style';
    style.textContent=`
      .liw-color-control{display:flex;align-items:center;gap:10px;width:100%;min-height:46px;padding:7px 10px;border:1px solid var(--border,#dfe3ea);border-radius:12px;background:#fff;color:#111827;cursor:pointer;text-align:left}
      .liw-color-control:hover{border-color:#aeb7c5}.liw-color-control:focus-visible{outline:3px solid rgba(59,130,246,.22);outline-offset:2px}
      .liw-color-control-swatch{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background:var(--liw-color,#0B1438);box-shadow:0 0 0 1px rgba(15,23,42,.12),inset 0 0 0 2px rgba(255,255,255,.9)}
      .liw-color-control-code{font:800 12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.02em}
      .liw-color-control-copy{margin-left:auto;color:#667085;font-size:.7rem;font-weight:800}
      .liw-native-color-hidden{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}
      .liw-global-color-layer{position:fixed;inset:0;z-index:2147483000;display:none;align-items:flex-end;justify-content:center;padding:10px;background:rgba(15,23,42,.48);backdrop-filter:blur(5px)}
      .liw-global-color-layer.open{display:flex}
      .liw-global-color-sheet{width:min(560px,100%);max-height:min(84vh,760px);overflow:auto;padding:18px 18px calc(18px + env(safe-area-inset-bottom));border-radius:24px 24px 18px 18px;background:#fff;color:#111827;box-shadow:0 28px 90px rgba(15,23,42,.28)}
      .liw-global-color-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
      .liw-global-color-kicker{display:block;color:#667085;font-size:.62rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
      .liw-global-color-head h3{margin:3px 0 0;font-size:1.2rem;line-height:1.2}
      .liw-global-color-close{width:38px;height:38px;border:0;border-radius:50%;background:#f1f5f9;color:#0f172a;font-size:1.35rem;line-height:1;cursor:pointer}
      .liw-global-color-section{margin-top:17px}.liw-global-color-section-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px;color:#475467;font-size:.68rem;font-weight:900}
      .liw-global-color-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}
      .liw-global-color-swatch{position:relative;aspect-ratio:1;border:0;border-radius:50%;background:var(--swatch);box-shadow:0 0 0 1px rgba(15,23,42,.14),inset 0 0 0 2px #fff;cursor:pointer}
      .liw-global-color-swatch.active:after{content:'✓';position:absolute;inset:0;display:grid;place-items:center;border-radius:50%;background:rgba(15,23,42,.28);color:#fff;font-weight:950;text-shadow:0 1px 2px rgba(0,0,0,.35)}
      .liw-global-color-custom{display:grid;grid-template-columns:54px 1fr auto;gap:9px;align-items:center;padding:10px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}
      .liw-global-color-custom input[type="color"]{width:54px;height:44px;padding:0;border:0;background:transparent;cursor:pointer}
      .liw-global-color-custom input[type="text"]{width:100%;min-width:0;height:44px;border:1px solid #d9dee8;border-radius:10px;background:#fff;padding:0 11px;font:800 13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase}
      .liw-global-color-apply{height:44px;border:0;border-radius:10px;padding:0 14px;background:#0b1438;color:#fff;font-size:.72rem;font-weight:900;cursor:pointer}
      @media(min-width:700px){.liw-global-color-layer{align-items:center}.liw-global-color-sheet{border-radius:24px}.liw-global-color-grid{grid-template-columns:repeat(9,minmax(0,1fr))}}
      @media(max-width:390px){.liw-global-color-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.liw-global-color-custom{grid-template-columns:48px 1fr}.liw-global-color-apply{grid-column:1/-1}.liw-global-color-custom input[type="color"]{width:48px}}
    `;
    document.head.appendChild(style);
  }

  function ensureLayer(){
    if(q('#liw-global-color-layer'))return q('#liw-global-color-layer');
    const layer=document.createElement('div');
    layer.id='liw-global-color-layer';
    layer.className='liw-global-color-layer';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML=`
      <div class="liw-global-color-sheet" role="dialog" aria-modal="true" aria-labelledby="liw-global-color-title">
        <div class="liw-global-color-head">
          <div><span class="liw-global-color-kicker">LIW Brand Studio</span><h3 id="liw-global-color-title">Choose a color</h3></div>
          <button class="liw-global-color-close" type="button" aria-label="Close color palette">×</button>
        </div>
        <section class="liw-global-color-section" data-palette-section="brand">
          <div class="liw-global-color-section-title"><span>Brand & template colors</span></div>
          <div class="liw-global-color-grid" data-palette-grid="brand"></div>
        </section>
        <section class="liw-global-color-section">
          <div class="liw-global-color-section-title"><span>Suggested colors</span></div>
          <div class="liw-global-color-grid" data-palette-grid="suggested"></div>
        </section>
        <section class="liw-global-color-section" data-palette-section="recent">
          <div class="liw-global-color-section-title"><span>Recently used</span></div>
          <div class="liw-global-color-grid" data-palette-grid="recent"></div>
        </section>
        <section class="liw-global-color-section">
          <div class="liw-global-color-section-title"><span>Custom color</span><span>HEX</span></div>
          <div class="liw-global-color-custom">
            <input type="color" value="#0B1438" data-liw-custom-picker aria-label="Custom color picker">
            <input type="text" value="#0B1438" maxlength="7" data-liw-custom-hex aria-label="Custom HEX color">
            <button class="liw-global-color-apply" type="button">Use color</button>
          </div>
        </section>
      </div>`;
    document.body.appendChild(layer);

    q('.liw-global-color-close',layer)?.addEventListener('click',closePalette);
    layer.addEventListener('click',event=>{ if(event.target===layer)closePalette(); });
    document.addEventListener('keydown',event=>{ if(event.key==='Escape'&&layer.classList.contains('open'))closePalette(); });

    const picker=q('[data-liw-custom-picker]',layer);
    const hex=q('[data-liw-custom-hex]',layer);
    picker?.addEventListener('input',()=>{ if(hex)hex.value=String(picker.value||'').toUpperCase(); });
    hex?.addEventListener('input',()=>{
      const value=normalize(hex.value);
      if(value&&picker)picker.value=value;
    });
    q('.liw-global-color-apply',layer)?.addEventListener('click',()=>{
      const value=normalize(hex?.value)||normalize(picker?.value);
      if(value)applyColor(value,true);
    });
    return layer;
  }

  function swatchButton(color,current){
    const button=document.createElement('button');
    button.type='button';
    button.className='liw-global-color-swatch'+(color===current?' active':'');
    button.style.setProperty('--swatch',color);
    button.title=color;
    button.setAttribute('aria-label','Use '+color);
    button.addEventListener('click',()=>applyColor(color,true));
    return button;
  }

  function paintGrid(kind,colors,current){
    const layer=ensureLayer();
    const grid=q(`[data-palette-grid="${kind}"]`,layer);
    if(!grid)return;
    grid.innerHTML='';
    colors.forEach(color=>grid.appendChild(swatchButton(color,current)));
    const section=q(`[data-palette-section="${kind}"]`,layer);
    if(section)section.hidden=!colors.length;
  }

  function openPalette(input){
    if(!input)return;
    activeInput=input;
    const layer=ensureLayer();
    const current=normalize(input.value)||'#0B1438';
    q('#liw-global-color-title',layer).textContent=fieldLabel(input);
    const picker=q('[data-liw-custom-picker]',layer);
    const hex=q('[data-liw-custom-hex]',layer);
    if(picker)picker.value=current;
    if(hex)hex.value=current;
    paintGrid('brand',currentTemplateColors(),current);
    paintGrid('suggested',DEFAULT_COLORS,current);
    paintGrid('recent',recentColors(),current);
    layer.classList.add('open');
    layer.setAttribute('aria-hidden','false');
    setTimeout(()=>q('.liw-global-color-close',layer)?.focus(),0);
  }

  function closePalette(){
    const layer=q('#liw-global-color-layer');
    if(!layer)return;
    layer.classList.remove('open');
    layer.setAttribute('aria-hidden','true');
    const input=activeInput;
    activeInput=null;
    const trigger=input?.parentElement?.querySelector('.liw-color-control');
    trigger?.focus?.();
  }

  function applyColor(color,closeAfter){
    if(!activeInput)return;
    const value=normalize(color);
    if(!value)return;
    activeInput.value=value;
    activeInput.dispatchEvent(new Event('input',{bubbles:true}));
    activeInput.dispatchEvent(new Event('change',{bubbles:true}));
    rememberColor(value);
    syncControl(activeInput);
    try{ if(typeof render==='function')render(); }catch(_){}
    try{ if(typeof scheduleSave==='function')scheduleSave(); }catch(_){}
    try{ window.LIWBarbershopEditor?.refresh?.(); }catch(_){}
    try{ window.LIWRealtorV1?.refresh?.(); }catch(_){}
    try{ window.LIWRestaurantV1?.refresh?.(); }catch(_){}
    if(closeAfter)closePalette();
  }

  function syncControl(input){
    if(!input)return;
    const trigger=input.parentElement?.querySelector(`.liw-color-control[data-liw-color-for="${CSS.escape(input.name||input.id||'')}"]`);
    if(!trigger)return;
    const value=normalize(input.value)||'#0B1438';
    trigger.style.setProperty('--liw-color',value);
    const code=q('.liw-color-control-code',trigger);
    if(code)code.textContent=value;
  }

  function enhanceInput(input){
    if(!input||input.dataset.liwGlobalPalette==='true')return;
    const key=input.name||input.id;
    if(!key)return;
    input.dataset.liwGlobalPalette='true';
    input.classList.add('liw-native-color-hidden');

    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='liw-color-control';
    trigger.dataset.liwColorFor=key;
    trigger.innerHTML='<span class="liw-color-control-swatch" aria-hidden="true"></span><span class="liw-color-control-code"></span><span class="liw-color-control-copy">Choose color</span>';
    trigger.addEventListener('click',()=>openPalette(input));
    input.insertAdjacentElement('afterend',trigger);
    input.addEventListener('input',()=>syncControl(input));
    input.addEventListener('change',()=>syncControl(input));
    syncControl(input);
  }

  function wireInputs(){
    qa('input[type="color"]').forEach(enhanceInput);
  }

  function startObserver(){
    if(observer)return;
    observer=new MutationObserver(()=>{
      clearTimeout(wireTimer);
      wireTimer=setTimeout(wireInputs,50);
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function init(){
    ensureStyles();
    ensureLayer();
    wireInputs();
    startObserver();
    window.LIWGlobalColorPalette={
      open(target){
        const input=typeof target==='string'?q(`input[type="color"][name="${target}"],input[type="color"]#${CSS.escape(target)}`):target;
        if(input)openPalette(input);
      },
      refresh:wireInputs
    };
  }

  if(document.readyState==='complete')setTimeout(init,0);
  else window.addEventListener('load',()=>setTimeout(init,0),{once:true});
})();