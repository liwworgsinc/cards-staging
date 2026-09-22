/* LIW staging global color palette — one UI for every experience */
(() => {
  const FIELDS = {
    primary_color: 'Primary color',
    secondary_color: 'Secondary color',
    background_color: 'Card background',
    text_color: 'Text color',
    button_text_color: 'Button text color'
  };
  const SUGGESTED = ['#0b1438','#d4a84f','#111827','#334155','#0f766e','#14b8a6','#9f1239','#f43f5e','#b7791f','#f6ad55','#1e3a8a','#3b82f6','#ffffff','#f8fafc'];
  const key='liw_recent_colors_v1';
  const norm=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v.toLowerCase():null;
  const recent=()=>{try{return JSON.parse(localStorage.getItem(key)||'[]').filter(norm).slice(0,8)}catch{return[]}};
  const remember=v=>{v=norm(v);if(!v)return;localStorage.setItem(key,JSON.stringify([v,...recent().filter(x=>x!==v)].slice(0,8)))};
  const fire=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));remember(v)};
  const css=document.createElement('style');
  css.textContent=`
  .liw-color-trigger{display:flex;align-items:center;gap:10px;min-height:44px;cursor:pointer}
  .liw-color-trigger .liw-color-dot{width:28px;height:28px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1;background:var(--liw-c)}
  .liw-color-trigger .liw-color-hex{font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase}
  .liw-global-palette{position:fixed;inset:0;z-index:2147483000;display:none;align-items:flex-end;justify-content:center;background:rgba(2,6,23,.42);backdrop-filter:blur(3px);padding:12px}
  .liw-global-palette.open{display:flex}.liw-palette-sheet{width:min(560px,100%);max-height:82vh;overflow:auto;background:#fff;color:#111827;border-radius:24px 24px 18px 18px;padding:20px;box-shadow:0 24px 80px rgba(2,6,23,.3)}
  .liw-palette-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.liw-palette-head h3{margin:0;font-size:20px}.liw-palette-head p{margin:3px 0 0;color:#64748b;font-size:13px}
  .liw-palette-close{border:0;background:#f1f5f9;border-radius:50%;width:38px;height:38px;font-size:22px;cursor:pointer}.liw-palette-label{display:block;margin:18px 0 9px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
  .liw-palette-swatches{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}.liw-swatch{aspect-ratio:1;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #cbd5e1;cursor:pointer;background:var(--sw)}
  .liw-swatch.active{box-shadow:0 0 0 3px #0f172a}.liw-custom-color{display:flex;align-items:center;gap:10px;margin-top:10px;padding:12px;border:1px solid #e2e8f0;border-radius:14px}
  .liw-custom-color input[type=color]{width:46px;height:40px;padding:0;border:0;background:none}.liw-custom-color input[type=text]{flex:1;min-width:0;border:0;outline:0;font:700 14px ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase}
  @media(min-width:700px){.liw-global-palette{align-items:center}.liw-palette-sheet{border-radius:24px}.liw-palette-swatches{grid-template-columns:repeat(8,1fr)}}`;
  document.head.appendChild(css);

  let active=null;
  const modal=document.createElement('div');
  modal.className='liw-global-palette';
  modal.innerHTML=`<div class="liw-palette-sheet" role="dialog" aria-modal="true" aria-label="LIW color palette"><div class="liw-palette-head"><div><h3>Choose a color</h3><p id="liw-palette-target">LIW global palette</p></div><button class="liw-palette-close" type="button" aria-label="Close">×</button></div><span class="liw-palette-label">Brand & template colors</span><div class="liw-palette-swatches" data-kind="brand"></div><span class="liw-palette-label">Suggested colors</span><div class="liw-palette-swatches" data-kind="suggested"></div><div data-recent-wrap><span class="liw-palette-label">Recent colors</span><div class="liw-palette-swatches" data-kind="recent"></div></div><span class="liw-palette-label">Custom color</span><div class="liw-custom-color"><input type="color" data-custom-picker><input type="text" maxlength="7" data-custom-hex aria-label="Hex color"></div></div>`;
  document.body.appendChild(modal);
  const uniq=a=>[...new Set(a.map(norm).filter(Boolean))];
  const brand=()=>uniq([...document.querySelectorAll('#color-presets [data-colors]')].flatMap(b=>(b.dataset.colors||'').split(',')));
  const paint=(kind,arr)=>{const box=modal.querySelector('[data-kind="'+kind+'"]');box.innerHTML='';arr.forEach(v=>{const b=document.createElement('button');b.type='button';b.className='liw-swatch'+(active&&norm(active.value)===v?' active':'');b.style.setProperty('--sw',v);b.title=v;b.setAttribute('aria-label',v);b.onclick=()=>{fire(active,v);syncTriggers();close()};box.appendChild(b)})};
  const open=el=>{active=el;modal.querySelector('#liw-palette-target').textContent=FIELDS[el.name]||'Color';const v=norm(el.value)||'#0b1438';modal.querySelector('[data-custom-picker]').value=v;modal.querySelector('[data-custom-hex]').value=v;paint('brand',brand());paint('suggested',SUGGESTED);const r=recent();paint('recent',r);modal.querySelector('[data-recent-wrap]').hidden=!r.length;modal.classList.add('open')};
  const close=()=>modal.classList.remove('open');
  modal.querySelector('.liw-palette-close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
  const picker=modal.querySelector('[data-custom-picker]'), hex=modal.querySelector('[data-custom-hex]');
  picker.oninput=()=>{hex.value=picker.value;if(active){fire(active,picker.value);syncTriggers()}};
  hex.addEventListener('change',()=>{let v=hex.value.trim();if(!v.startsWith('#'))v='#'+v;if(norm(v)&&active){picker.value=v;fire(active,v);syncTriggers();close()}else hex.value=active?.value||'#0b1438'});
  function syncTriggers(){document.querySelectorAll('.liw-color-trigger').forEach(b=>{const el=document.querySelector('input[type="color"][name="'+b.dataset.for+'"]');if(el){b.style.setProperty('--liw-c',el.value);b.querySelector('.liw-color-hex').textContent=el.value}})}
  function wire(){
    document.querySelectorAll('input[type="color"][name]').forEach(el=>{
      if(!FIELDS[el.name]||el.dataset.liwPaletteWired)return;el.dataset.liwPaletteWired='1';el.style.display='none';
      const b=document.createElement('button');b.type='button';b.className='input liw-color-trigger';b.dataset.for=el.name;b.innerHTML='<span class="liw-color-dot"></span><span class="liw-color-hex"></span><span style="margin-left:auto">Choose color</span>';b.onclick=()=>open(el);el.insertAdjacentElement('afterend',b);
    });syncTriggers();
  }
  wire();new MutationObserver(wire).observe(document.body,{childList:true,subtree:true});
  window.LIWGlobalColorPalette={openFor:name=>{const el=document.querySelector('input[type="color"][name="'+name+'"]');if(el)open(el)},refresh:wire};
})();