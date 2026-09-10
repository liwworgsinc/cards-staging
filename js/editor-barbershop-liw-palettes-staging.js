/* LIW Cards staging — Standard/Premium LIW template skins inside Barbershop Look.
   Uses the live template library and entitlement rules. The template's visual tokens
   apply, while Barbershop keeps its own layout, left-cover profile, dock and client room. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_TEMPLATE_SKINS__)return;
  window.__LIW_BARBER_TEMPLATE_SKINS__=true;

  const VISUAL_KEYS=[
    'primary_color','secondary_color','background_color','text_color',
    'button_color','button_text_color','font_family','button_style',
    'border_radius','gradient_background'
  ];
  let observer=null;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>Array.from(scope.querySelectorAll(selector));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const getField=name=>q(`[name="${name}"]`);
  const getValue=name=>String(getField(name)?.value||'');
  const setValue=(name,value)=>{const field=getField(name);if(field)field.value=String(value??'');};

  function library(){
    try{return Array.isArray(templates)?templates:[];}catch(_){return [];}
  }

  function tierOf(template){
    try{if(typeof templateTier==='function')return templateTier(template);}catch(_){ }
    return template?.access_tier||(template?.is_premium?'premium':'standard');
  }

  function hasAccess(template){
    try{if(typeof hasTemplateAccess==='function')return hasTemplateAccess(template);}catch(_){ }
    return tierOf(template)==='standard';
  }

  function gradientFor(config){
    return config.gradient_background||`linear-gradient(135deg,${config.primary_color||'#0b1438'},${config.secondary_color||'#d4a84f'})`;
  }

  function applySkin(template){
    if(!template)return;
    if(!hasAccess(template)){
      if(typeof toast==='function')toast('This Premium template requires Premium Templates access.');
      try{if(typeof liwUrl==='function')location.href=liwUrl('addons.html?feature=premium_templates');}catch(_){ }
      return;
    }

    const config=template.configuration||{};
    VISUAL_KEYS.forEach(key=>{
      if(config[key]!==undefined&&config[key]!==null)setValue(key,config[key]);
    });
    if(!config.gradient_background)setValue('gradient_background',gradientFor(config));

    /* Preserve the Barber experience architecture. Templates are visual skins here,
       not alternate page layouts. */
    setValue('template_id',template.id);
    setValue('card_layout','classic');
    setValue('card_experience','classic');
    setValue('color_mode','barbershop');
    setValue('profile_image_shape','circle');

    qa('.template-card').forEach(item=>item.classList.toggle('active',item.dataset.template===String(template.id)));
    qa('.color-preset').forEach(item=>item.classList.remove('active'));
    const summary=q('#template-selected-summary');
    if(summary)summary.textContent=`${template.name} · Barbershop`;

    try{if(typeof updateCoverPreview==='function')updateCoverPreview();}catch(_){ }
    try{window.LIWBarbershopEditor?.refresh?.();}catch(_){ }
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    syncActive();
    if(typeof toast==='function')toast(`${template.name} applied to Barbershop`);
  }

  function syncActive(){
    const current=getValue('template_id');
    const barber=getValue('color_mode').toLowerCase()==='barbershop';
    qa('[data-barber-template-skin]').forEach(button=>{
      button.classList.toggle('active',barber&&button.dataset.barberTemplateSkin===current);
    });
  }

  function templateCard(template){
    const config=template.configuration||{};
    const tier=tierOf(template);
    const locked=!hasAccess(template);
    const gradient=gradientFor(config);
    const bg=config.background_color||'#ffffff';
    const text=config.text_color||'#111827';
    const accent=config.button_color||config.primary_color||'#0b1438';
    const badge=tier==='premium'?(locked?'Premium':'Premium · Included'):'Standard';
    return `<button type="button" class="barber-template-skin ${locked?'locked':''}" data-barber-template-skin="${esc(template.id)}" data-tier="${esc(tier)}" ${locked?'aria-label="Premium template — upgrade required"':''}>
      <span class="barber-template-mini" style="--skin-gradient:${esc(gradient)};--skin-bg:${esc(bg)};--skin-text:${esc(text)};--skin-accent:${esc(accent)}">
        <i class="barber-template-cover"></i><i class="barber-template-avatar"></i><i class="barber-template-line one"></i><i class="barber-template-line two"></i><i class="barber-template-action"></i>
      </span>
      <span class="barber-template-copy"><strong>${esc(template.name||'LIW Template')}</strong><small>${esc(template.category||'LIW design')}</small></span>
      <em class="${tier==='standard'?'standard':'premium'}">${esc(badge)}</em>
      ${locked?'<span class="barber-template-lock" aria-hidden="true">🔒</span>':''}
    </button>`;
  }

  function group(title,copy,tier,rows){
    if(!rows.length)return '';
    return `<section class="barber-template-tier" data-barber-template-tier="${tier}">
      <div class="barber-template-tier-head"><div><strong>${title}</strong><span>${copy}</span></div><em>${rows.length}</em></div>
      <div class="barber-template-grid">${rows.map(templateCard).join('')}</div>
    </section>`;
  }

  function ensureStyle(){
    if(q('#barber-template-skins-style'))return;
    const style=document.createElement('style');
    style.id='barber-template-skins-style';
    style.textContent=`
      .barber-template-skins{margin-top:16px;padding-top:15px;border-top:1px solid #eceff3}
      .barber-template-skins-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
      .barber-template-skins-head>div{display:grid;gap:3px}.barber-template-skins-head strong{color:#101828;font-size:.8rem}.barber-template-skins-head span{max-width:560px;color:#667085;font-size:.64rem;line-height:1.45}
      .barber-template-skins-head>em{flex:0 0 auto;padding:5px 8px;border-radius:999px;background:#111;color:#e7c46e;font-size:.52rem;font-style:normal;font-weight:950;letter-spacing:.07em}
      .barber-template-tier{margin-top:13px}.barber-template-tier-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:7px}.barber-template-tier-head>div{display:grid;gap:2px}.barber-template-tier-head strong{color:#182230;font-size:.7rem}.barber-template-tier-head span{color:#667085;font-size:.59rem}.barber-template-tier-head>em{color:#98a2b3;font-size:.56rem;font-style:normal;font-weight:850}
      .barber-template-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
      .barber-template-skin{position:relative;display:grid;grid-template-columns:72px minmax(0,1fr);grid-template-rows:auto auto;align-items:center;gap:3px 9px;min-width:0;padding:8px;border:1px solid #e1e5eb;border-radius:13px;background:#fff;color:#182230;text-align:left;cursor:pointer;transition:border-color .16s ease,box-shadow .16s ease,transform .16s ease}
      .barber-template-skin:hover{border-color:#b88746;transform:translateY(-1px)}.barber-template-skin.active{border-color:#b88746;box-shadow:0 0 0 3px rgba(184,135,70,.11)}.barber-template-skin.locked{opacity:.72}
      .barber-template-mini{position:relative;grid-row:1/3;width:72px;height:58px;overflow:hidden;border:1px solid rgba(16,24,40,.08);border-radius:9px;background:var(--skin-bg)}
      .barber-template-cover{position:absolute;inset:0 0 auto;height:20px;background:var(--skin-gradient)}.barber-template-avatar{position:absolute;left:7px;top:13px;width:18px;height:18px;border:2px solid #fff;border-radius:50%;background:var(--skin-accent)}
      .barber-template-line{position:absolute;left:30px;height:3px;border-radius:999px;background:var(--skin-text);opacity:.72}.barber-template-line.one{top:27px;width:31px}.barber-template-line.two{top:34px;width:22px;opacity:.35}.barber-template-action{position:absolute;left:8px;right:8px;bottom:7px;height:6px;border-radius:999px;background:var(--skin-accent);opacity:.9}
      .barber-template-copy{display:grid;gap:2px;min-width:0}.barber-template-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.65rem}.barber-template-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#667085;font-size:.55rem;text-transform:capitalize}
      .barber-template-skin>em{align-self:start;width:max-content;padding:3px 6px;border-radius:999px;font-size:.47rem;font-style:normal;font-weight:950;letter-spacing:.04em}.barber-template-skin>em.standard{background:#eef4ff;color:#25488d}.barber-template-skin>em.premium{background:#fbf3df;color:#7b5b19}
      .barber-template-lock{position:absolute;right:7px;top:7px;font-size:.58rem}
      .barber-template-note{display:flex;gap:7px;align-items:flex-start;margin-top:11px;padding:9px 10px;border-radius:11px;background:#f8f5ee;color:#604c2b;font-size:.6rem;line-height:1.45}.barber-template-note strong{font-weight:900}
      @media(max-width:900px){.barber-template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:560px){.barber-template-grid{grid-template-columns:1fr}.barber-template-skin{grid-template-columns:78px minmax(0,1fr)}.barber-template-mini{width:78px}.barber-template-skins-head>em{display:none}}
    `;
    document.head.appendChild(style);
  }

  function mount(){
    const look=q('#barber-control-center [data-barber-v5-panel="look"]');
    const customColors=q('.barber-v5-colors',look||document);
    if(!look||!customColors)return false;

    /* Remove the rejected color-only bridge if it exists from an earlier cached run. */
    q('[data-barber-liw-palette-group]',look)?.remove();

    const rows=library();
    if(!rows.length)return false;
    if(q('[data-barber-template-skins]',look)){syncActive();return true;}

    ensureStyle();
    const standard=rows.filter(template=>tierOf(template)==='standard');
    const premium=rows.filter(template=>tierOf(template)==='premium');
    const section=document.createElement('section');
    section.className='barber-template-skins';
    section.dataset.barberTemplateSkins='true';
    section.innerHTML=`
      <div class="barber-template-skins-head"><div><strong>LIW Template Styles</strong><span>Use an existing Standard or Premium LIW template as the visual skin. Barbershop keeps its own profile placement, client room, appointments and revolving dock.</span></div><em>TEMPLATE SKINS</em></div>
      ${group('Standard Templates','Included LIW designs you can apply to Barbershop.','standard',standard)}
      ${group('Premium Templates','Premium LIW designs use the same access rules as the main template library.','premium',premium)}
      <div class="barber-template-note"><span>✂</span><span><strong>Barber structure stays locked:</strong> templates change the design treatment, not the Barbershop navigation or client experience.</span></div>`;
    customColors.insertAdjacentElement('beforebegin',section);

    qa('[data-barber-template-skin]',section).forEach(button=>button.addEventListener('click',()=>{
      const template=library().find(item=>String(item.id)===button.dataset.barberTemplateSkin);
      applySkin(template);
    }));
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

  document.addEventListener('change',event=>{
    if(['template_id','color_mode'].includes(event.target?.name))syncActive();
  },true);

  window.LIWBarberTemplateSkins={applyById(id){applySkin(library().find(item=>String(item.id)===String(id)));},refresh:syncActive};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
