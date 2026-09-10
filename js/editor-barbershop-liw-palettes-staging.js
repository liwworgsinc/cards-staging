/* LIW Cards staging — reuse existing LIW card color presets inside Barbershop Look. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_LIW_PALETTES__)return;
  window.__LIW_BARBER_LIW_PALETTES__=true;

  const LABELS=['Navy & Gold','Graphite','Teal','Rose','Amber','Royal Blue'];
  let observer=null;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));

  function setValue(name,value){
    const field=q(`[name="${name}"]`);
    if(field)field.value=value;
  }

  function contrast(hex){
    const value=String(hex||'').replace('#','');
    if(!/^[0-9a-f]{6}$/i.test(value))return '#ffffff';
    const r=parseInt(value.slice(0,2),16),g=parseInt(value.slice(2,4),16),b=parseInt(value.slice(4,6),16);
    return (r*299+g*587+b*114)/1000>150?'#111111':'#ffffff';
  }

  function applyColors(colors,label){
    if(colors.length<4)return;
    const [primary,secondary,background,text]=colors;
    setValue('primary_color',primary);
    setValue('secondary_color',secondary);
    setValue('background_color',background);
    setValue('text_color',text);
    setValue('button_color',primary);
    setValue('button_text_color',contrast(primary));
    setValue('gradient_background',`linear-gradient(135deg,${primary},${secondary})`);
    setValue('color_mode','barbershop');
    try{window.LIWBarbershopEditor?.refresh?.();}catch(_){ }
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    syncActive();
    if(typeof toast==='function')toast(`${label} applied to Barbershop`);
  }

  function currentKey(){
    const values=['primary_color','secondary_color','background_color','text_color']
      .map(name=>String(q(`[name="${name}"]`)?.value||'').toLowerCase());
    return values.join(',');
  }

  function syncActive(){
    const key=currentKey();
    qa('[data-barber-liw-palette]').forEach(button=>{
      button.classList.toggle('active',button.dataset.colors===key);
    });
  }

  function ensureStyle(){
    if(q('#barber-liw-palette-style'))return;
    const style=document.createElement('style');
    style.id='barber-liw-palette-style';
    style.textContent=`
      .barber-v5-palette-group{margin-top:16px;padding-top:15px;border-top:1px solid #eceff3}
      .barber-v5-palette-group-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:9px}
      .barber-v5-palette-group-head>div{display:grid;gap:2px}.barber-v5-palette-group-head strong{color:#101828;font-size:.75rem}.barber-v5-palette-group-head span{color:#667085;font-size:.61rem;line-height:1.35}
      .barber-v5-liw-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .barber-v5-liw-presets button{display:grid;gap:7px;padding:9px;border:1px solid #e2e6ec;border-radius:12px;background:#fff;color:#344054;text-align:left;cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease}
      .barber-v5-liw-presets button:hover{border-color:#b88746;transform:translateY(-1px)}
      .barber-v5-liw-presets button.active{border-color:#b88746;box-shadow:0 0 0 2px rgba(184,135,70,.11)}
      .barber-v5-liw-presets button>span{display:flex;height:30px;border-radius:8px;overflow:hidden;border:1px solid rgba(16,24,40,.06)}
      .barber-v5-liw-presets button i{flex:1;background:var(--c)}
      .barber-v5-liw-presets button strong{font-size:.62rem;line-height:1.2}
      .barber-v5-liw-badge{flex:0 0 auto;padding:4px 7px;border-radius:999px;background:#f8f5ee;color:#795d27;font-size:.52rem;font-weight:900;letter-spacing:.06em}
      @media(max-width:820px){.barber-v5-liw-presets{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.barber-v5-liw-presets{grid-template-columns:1fr 1fr}.barber-v5-palette-group-head{align-items:start}.barber-v5-liw-badge{margin-top:1px}}
    `;
    document.head.appendChild(style);
  }

  function existingPresets(){
    return qa('#color-presets .color-preset[data-colors]').map((button,index)=>{
      const colors=String(button.dataset.colors||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
      return {colors,label:LABELS[index]||`LIW Palette ${index+1}`};
    }).filter(item=>item.colors.length>=4);
  }

  function mount(){
    const look=q('#barber-control-center [data-barber-v5-panel="look"]');
    const customColors=q('.barber-v5-colors',look||document);
    if(!look||!customColors)return false;
    if(q('[data-barber-liw-palette-group]',look)){syncActive();return true;}

    const presets=existingPresets();
    if(!presets.length)return false;

    ensureStyle();
    const section=document.createElement('section');
    section.className='barber-v5-palette-group';
    section.dataset.barberLiwPaletteGroup='true';
    section.innerHTML=`
      <div class="barber-v5-palette-group-head">
        <div><strong>LIW Card Colors</strong><span>Use the same palettes already available in the main LIW editor without changing the Barbershop experience.</span></div>
        <span class="barber-v5-liw-badge">LIW COLORS</span>
      </div>
      <div class="barber-v5-liw-presets">
        ${presets.map(item=>`<button type="button" data-barber-liw-palette data-colors="${item.colors.join(',')}"><span>${item.colors.slice(0,4).map(color=>`<i style="--c:${color}"></i>`).join('')}</span><strong>${item.label}</strong></button>`).join('')}
      </div>`;
    customColors.insertAdjacentElement('beforebegin',section);

    qa('[data-barber-liw-palette]',section).forEach(button=>{
      button.addEventListener('click',()=>applyColors(button.dataset.colors.split(','),button.querySelector('strong')?.textContent||'LIW colors'));
    });
    syncActive();
    return true;
  }

  function start(){
    if(mount())return;
    const target=q('.editor-panel[data-panel="design"]')||document.body;
    if(!target)return;
    observer=new MutationObserver(()=>{
      if(mount()){
        observer.disconnect();
        observer=null;
      }
    });
    observer.observe(target,{childList:true,subtree:true});
  }

  document.addEventListener('input',event=>{
    if(['primary_color','secondary_color','background_color','text_color'].includes(event.target?.name))syncActive();
  },true);
  document.addEventListener('change',event=>{
    if(['primary_color','secondary_color','background_color','text_color'].includes(event.target?.name))syncActive();
  },true);

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
