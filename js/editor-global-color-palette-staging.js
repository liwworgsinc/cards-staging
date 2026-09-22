/* LIW Cards staging — simplified global color picker.
   One LIW picker for every editor color field. Loads after the editor is ready. */
(function(){
  'use strict';
  if(window.__LIW_GLOBAL_COLOR_PALETTE__)return;
  window.__LIW_GLOBAL_COLOR_PALETTE__=true;

  const RECENT_KEY='liw_recent_colors_v3';
  const QUICK_DEFAULTS=[
    '#0B1438','#D4A84F','#111827','#FFFFFF','#0F766E','#174EA6',
    '#7F1D3A','#F43F5E','#6F5948','#4C1D5F','#000000'
  ];

  let activeInput=null;
  let observer=null;
  let wireTimer=null;
  let draftHue=220;
  let draftSat=.6;
  let draftVal=.4;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));

  function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }

  function normalize(value){
    const raw=String(value||'').trim();
    if(/^#[0-9a-f]{6}$/i.test(raw))return raw.toUpperCase();
    if(/^#[0-9a-f]{3}$/i.test(raw)){
      return ('#'+raw.slice(1).split('').map(ch=>ch+ch).join('')).toUpperCase();
    }
    return '';
  }

  function unique(items){
    return Array.from(new Set(items.map(normalize).filter(Boolean)));
  }

  function hexToRgb(hex){
    const value=normalize(hex);
    if(!value)return {r:11,g:20,b:56};
    const n=parseInt(value.slice(1),16);
    return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
  }

  function rgbToHex(r,g,b){
    const toHex=n=>Math.round(clamp(n,0,255)).toString(16).padStart(2,'0');
    return ('#'+toHex(r)+toHex(g)+toHex(b)).toUpperCase();
  }

  function rgbToHsv(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
    let h=0;
    if(d){
      if(max===r)h=((g-b)/d)%6;
      else if(max===g)h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h*=60;
      if(h<0)h+=360;
    }
    return {h,s:max===0?0:d/max,v:max};
  }

  function hsvToRgb(h,s,v){
    h=((h%360)+360)%360;
    s=clamp(s,0,1);v=clamp(v,0,1);
    const c=v*s;
    const x=c*(1-Math.abs((h/60)%2-1));
    const m=v-c;
    let rp=0,gp=0,bp=0;
    if(h<60){rp=c;gp=x;}
    else if(h<120){rp=x;gp=c;}
    else if(h<180){gp=c;bp=x;}
    else if(h<240){gp=x;bp=c;}
    else if(h<300){rp=x;bp=c;}
    else{rp=c;bp=x;}
    return {r:(rp+m)*255,g:(gp+m)*255,b:(bp+m)*255};
  }

  function hsvHex(){
    const rgb=hsvToRgb(draftHue,draftSat,draftVal);
    return rgbToHex(rgb.r,rgb.g,rgb.b);
  }

  function setDraftFromHex(hex){
    const value=normalize(hex);
    if(!value)return false;
    const rgb=hexToRgb(value);
    const hsv=rgbToHsv(rgb.r,rgb.g,rgb.b);
    draftHue=hsv.h;
    draftSat=hsv.s;
    draftVal=hsv.v;
    syncPickerUI();
    return true;
  }

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
    return unique([...colors,...QUICK_DEFAULTS]).slice(0,12);
  }

  function fieldLabel(input){
    if(!input)return 'Choose color';
    const group=input.closest('.form-group');
    const label=group?.querySelector('label');
    return String(label?.textContent||input.getAttribute('aria-label')||input.name||'Choose color').trim();
  }

  function ensureStyles(){
    if(q('#liw-global-color-palette-style'))return;
    const style=document.createElement('style');
    style.id='liw-global-color-palette-style';
    style.textContent=`
      .liw-color-control{display:flex;align-items:center;gap:10px;width:100%;min-height:46px;padding:7px 10px;border:1px solid var(--border,#dfe3ea);border-radius:12px;background:#fff;color:#111827;cursor:pointer;text-align:left;box-sizing:border-box}
      .liw-color-control:hover{border-color:#aeb7c5}.liw-color-control:focus-visible{outline:3px solid rgba(59,130,246,.22);outline-offset:2px}
      .liw-color-control-swatch{width:30px;height:30px;flex:0 0 30px;border-radius:8px;background:var(--liw-color,#0B1438);box-shadow:0 0 0 1px rgba(15,23,42,.14),inset 0 0 0 2px rgba(255,255,255,.88)}
      .liw-color-control-code{font:800 12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.02em;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .liw-color-control-copy{margin-left:auto;color:#667085;font-size:.68rem;font-weight:850;white-space:nowrap}
      .liw-native-color-hidden{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}

      .liw-global-color-layer{position:fixed;inset:0;z-index:2147483000;display:none;align-items:flex-end;justify-content:center;padding:10px;background:rgba(15,23,42,.48);backdrop-filter:blur(5px)}
      .liw-global-color-layer.open{display:flex}
      .liw-global-color-sheet{width:min(560px,100%);max-height:min(91vh,820px);overflow:auto;padding:17px 17px calc(18px + env(safe-area-inset-bottom));border-radius:24px 24px 18px 18px;background:#fff;color:#111827;box-shadow:0 28px 90px rgba(15,23,42,.28);box-sizing:border-box}
      .liw-global-color-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
      .liw-global-color-kicker{display:block;color:#667085;font-size:.6rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
      .liw-global-color-head h3{margin:3px 0 0;font-size:1.16rem;line-height:1.2}
      .liw-global-color-close{width:38px;height:38px;flex:0 0 38px;border:0;border-radius:50%;background:#f1f5f9;color:#0f172a;font-size:1.35rem;line-height:1;cursor:pointer}

      .liw-picker-box{position:relative;width:100%;aspect-ratio:1.85/1;min-height:180px;border-radius:16px;overflow:hidden;background:hsl(var(--liw-hue,220) 100% 50%);box-shadow:inset 0 0 0 1px rgba(15,23,42,.12);touch-action:none;cursor:crosshair}
      .liw-picker-box:before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#fff,rgba(255,255,255,0))}
      .liw-picker-box:after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,#000,rgba(0,0,0,0))}
      .liw-picker-dot{position:absolute;z-index:2;left:var(--liw-s,60%);top:var(--liw-v,40%);width:22px;height:22px;border:4px solid #fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 1px 5px rgba(0,0,0,.42);pointer-events:none}

      .liw-hue-wrap{margin:14px 1px 13px}
      .liw-hue-range{appearance:none;-webkit-appearance:none;width:100%;height:16px;border-radius:999px;background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);outline:0}
      .liw-hue-range::-webkit-slider-thumb{-webkit-appearance:none;width:30px;height:30px;border:4px solid #fff;border-radius:50%;background:hsl(var(--liw-hue,220) 100% 50%);box-shadow:0 1px 5px rgba(0,0,0,.25)}
      .liw-hue-range::-moz-range-thumb{width:24px;height:24px;border:4px solid #fff;border-radius:50%;background:hsl(var(--liw-hue,220) 100% 50%);box-shadow:0 1px 5px rgba(0,0,0,.25)}

      .liw-hex-row{display:grid;grid-template-columns:1fr 52px;gap:10px;align-items:center}
      .liw-hex-row input{width:100%;height:50px;min-width:0;border:1px solid #d9dee8;border-radius:13px;background:#fff;padding:0 13px;color:#111827;font:800 17px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase;box-sizing:border-box}
      .liw-hex-preview{width:52px;height:50px;border-radius:11px;background:var(--liw-selected,#0B1438);box-shadow:inset 0 0 0 1px rgba(15,23,42,.14)}

      .liw-palette-label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:17px 0 9px;color:#475467;font-size:.7rem;font-weight:900}
      .liw-quick-row,.liw-recent-row{display:flex;gap:9px;overflow-x:auto;padding:2px 1px 5px;scrollbar-width:none}
      .liw-quick-row::-webkit-scrollbar,.liw-recent-row::-webkit-scrollbar{display:none}
      .liw-mini-swatch{width:38px;height:38px;flex:0 0 38px;border:2px solid #fff;border-radius:50%;background:var(--swatch);box-shadow:0 0 0 1px rgba(15,23,42,.15);cursor:pointer}
      .liw-mini-swatch.active{box-shadow:0 0 0 3px #0b1438}
      .liw-recent-empty{padding:10px 12px;border-radius:11px;background:#f8fafc;color:#667085;font-size:.68rem}

      .liw-global-color-apply{width:100%;height:52px;margin-top:16px;border:0;border-radius:14px;background:#0b1438;color:#fff;font-size:.88rem;font-weight:950;cursor:pointer;box-shadow:0 10px 22px rgba(11,20,56,.18)}
      .liw-global-color-apply:active{transform:translateY(1px)}

      @media(min-width:700px){.liw-global-color-layer{align-items:center}.liw-global-color-sheet{border-radius:24px}}
      @media(max-width:390px){
        .liw-global-color-sheet{padding:15px 14px calc(16px + env(safe-area-inset-bottom))}
        .liw-picker-box{min-height:155px}
        .liw-hex-row input{font-size:15px}
        .liw-color-control-copy{font-size:.61rem}
      }
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
          <div><span class="liw-global-color-kicker">LIW Color Picker</span><h3 id="liw-global-color-title">Choose color</h3></div>
          <button class="liw-global-color-close" type="button" aria-label="Close color picker">×</button>
        </div>

        <div class="liw-picker-box" data-liw-picker-box>
          <span class="liw-picker-dot" data-liw-picker-dot></span>
        </div>

        <div class="liw-hue-wrap">
          <input class="liw-hue-range" data-liw-hue type="range" min="0" max="360" step="1" value="220" aria-label="Color hue">
        </div>

        <div class="liw-hex-row">
          <input type="text" value="#0B1438" maxlength="7" data-liw-hex aria-label="HEX color">
          <span class="liw-hex-preview" data-liw-hex-preview aria-hidden="true"></span>
        </div>

        <div class="liw-palette-label"><span>Quick colors</span></div>
        <div class="liw-quick-row" data-liw-quick-row></div>

        <div class="liw-palette-label"><span>Recently used</span></div>
        <div class="liw-recent-row" data-liw-recent-row></div>

        <button class="liw-global-color-apply" type="button">Use color</button>
      </div>`;
    document.body.appendChild(layer);

    q('.liw-global-color-close',layer)?.addEventListener('click',closePalette);
    layer.addEventListener('click',event=>{ if(event.target===layer)closePalette(); });
    document.addEventListener('keydown',event=>{ if(event.key==='Escape'&&layer.classList.contains('open'))closePalette(); });

    const hue=q('[data-liw-hue]',layer);
    hue?.addEventListener('input',()=>{
      draftHue=Number(hue.value)||0;
      syncPickerUI();
    });

    const hex=q('[data-liw-hex]',layer);
    hex?.addEventListener('input',()=>{
      const value=normalize(hex.value);
      if(value)setDraftFromHex(value);
    });
    hex?.addEventListener('change',()=>{
      const value=normalize(hex.value);
      if(value)setDraftFromHex(value);
      else hex.value=hsvHex();
    });

    const box=q('[data-liw-picker-box]',layer);
    const setFromPointer=event=>{
      const rect=box.getBoundingClientRect();
      draftSat=clamp((event.clientX-rect.left)/rect.width,0,1);
      draftVal=1-clamp((event.clientY-rect.top)/rect.height,0,1);
      syncPickerUI();
    };
    box?.addEventListener('pointerdown',event=>{
      box.setPointerCapture?.(event.pointerId);
      setFromPointer(event);
    });
    box?.addEventListener('pointermove',event=>{
      if(event.buttons===1||event.pressure>0)setFromPointer(event);
    });

    q('.liw-global-color-apply',layer)?.addEventListener('click',()=>{
      applyColor(hsvHex(),true);
    });

    return layer;
  }

  function syncPickerUI(){
    const layer=ensureLayer();
    const selected=hsvHex();
    const box=q('[data-liw-picker-box]',layer);
    const hue=q('[data-liw-hue]',layer);
    const hex=q('[data-liw-hex]',layer);
    const preview=q('[data-liw-hex-preview]',layer);

    box?.style.setProperty('--liw-hue',String(draftHue));
    box?.style.setProperty('--liw-s',(draftSat*100)+'%');
    box?.style.setProperty('--liw-v',((1-draftVal)*100)+'%');
    hue?.style.setProperty('--liw-hue',String(draftHue));
    if(hue)hue.value=String(Math.round(draftHue));
    if(hex&&document.activeElement!==hex)hex.value=selected;
    preview?.style.setProperty('--liw-selected',selected);

    qa('.liw-mini-swatch',layer).forEach(button=>{
      button.classList.toggle('active',normalize(button.dataset.color)===selected);
    });
  }

  function swatchButton(color){
    const button=document.createElement('button');
    button.type='button';
    button.className='liw-mini-swatch';
    button.dataset.color=color;
    button.style.setProperty('--swatch',color);
    button.title=color;
    button.setAttribute('aria-label','Select '+color);
    button.addEventListener('click',()=>setDraftFromHex(color));
    return button;
  }

  function paintSwatches(){
    const layer=ensureLayer();
    const quick=q('[data-liw-quick-row]',layer);
    const recent=q('[data-liw-recent-row]',layer);

    if(quick){
      quick.innerHTML='';
      currentTemplateColors().forEach(color=>quick.appendChild(swatchButton(color)));
    }

    if(recent){
      recent.innerHTML='';
      const items=recentColors();
      if(items.length)items.forEach(color=>recent.appendChild(swatchButton(color)));
      else{
        const empty=document.createElement('div');
        empty.className='liw-recent-empty';
        empty.textContent='Your recently used colors will appear here.';
        recent.appendChild(empty);
      }
    }
    syncPickerUI();
  }

  function openPalette(input){
    if(!input)return;
    activeInput=input;
    const layer=ensureLayer();
    const current=normalize(input.value)||'#0B1438';
    q('#liw-global-color-title',layer).textContent=fieldLabel(input);
    setDraftFromHex(current);
    paintSwatches();
    layer.classList.add('open');
    layer.setAttribute('aria-hidden','false');
  }

  function closePalette(){
    const layer=q('#liw-global-color-layer');
    if(!layer)return;
    layer.classList.remove('open');
    layer.setAttribute('aria-hidden','true');
    const input=activeInput;
    activeInput=null;
    input?.parentElement?.querySelector('.liw-color-control')?.focus?.();
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
    const key=input.name||input.id||'';
    const trigger=input.parentElement?.querySelector(`.liw-color-control[data-liw-color-for="${CSS.escape(key)}"]`);
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

    input.addEventListener('click',event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      openPalette(input);
    },true);

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
        const input=typeof target==='string'
          ? q(`input[type="color"][name="${target}"],input[type="color"]#${CSS.escape(target)}`)
          : target;
        if(input)openPalette(input);
      },
      refresh:wireInputs
    };
  }

  if(document.readyState==='complete')setTimeout(init,0);
  else window.addEventListener('load',()=>setTimeout(init,0),{once:true});
})();