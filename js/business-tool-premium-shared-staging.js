/* LIW Cards — STAGING ONLY — Advanced Business Tools premium style bridge.
   Promotes Services / Booking / Leads / Products / Payment Info / Payment Link
   from local preview-only styling to the same persisted card_sections model used
   by Beef Up Your Card. The public card reads the same saved style state. */
(function(){
  'use strict';
  if(window.__LIW_BUSINESS_TOOL_PREMIUM_SHARED__) return;
  window.__LIW_BUSINESS_TOOL_PREMIUM_SHARED__=true;

  const VERSION='20260818-business-premium-1';
  const STYLE_ID='liw-business-tool-premium-shared-css';
  const TYPES=['services','booking','leads','products','payment-sharing','payment-link'];
  const APPEARANCES=[
    ['clean','Clean','Airy and simple'],
    ['luxe','Luxe','Gold detail + depth'],
    ['glass','Glass','Soft translucent surface'],
    ['bold','Bold','High-contrast statement']
  ];
  const CONFIG={
    services:{title:'Services',kicker:'How I can help',appearance:'luxe',layout:'two-column',layouts:[['list','List'],['cards','Cards'],['two-column','Two-column']]},
    booking:{title:'Book an appointment',kicker:'Schedule time',appearance:'clean',layout:'button',layouts:[['button','Button'],['card','Card'],['banner','Banner']]},
    leads:{title:'Send an inquiry',kicker:'Let’s connect',appearance:'clean',layout:'card',layouts:[['card','Card'],['compact','Compact'],['split','Split']]},
    products:{title:'Featured products',kicker:'Shop & learn more',appearance:'luxe',layout:'grid',layouts:[['grid','Grid'],['cards','Cards'],['list','List']]},
    'payment-sharing':{title:'Send a payment',kicker:'Payment information',appearance:'clean',layout:'buttons',layouts:[['buttons','Buttons'],['grid','Grid'],['compact','Compact']]},
    'payment-link':{title:'Make a payment',kicker:'Secure payment link',appearance:'clean',layout:'button',layouts:[['button','Button'],['pill','Pill'],['card','Card']]}
  };
  const TOOL_TITLE_MAP={
    'services':'services',
    'appointment booking':'booking',
    'lead capture':'leads',
    'product showcase':'products',
    'share payment information':'payment-sharing',
    'payment link':'payment-link'
  };

  const state=new Map();
  const rowIds=new Map();
  const saveTimers=new Map();
  let loadedCardId=null;
  let editorMounted=false;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function defaults(type){
    const c=CONFIG[type]||{};
    return {appearance:c.appearance||'clean',layout:c.layout||'card',accent:'brand',heading_align:'left',display_title:'',display_kicker:''};
  }

  function sanitize(type,content){
    const base=defaults(type);
    const next={...base,...(content&&typeof content==='object'?content:{})};
    if(!APPEARANCES.some(item=>item[0]===next.appearance)) next.appearance=base.appearance;
    if(!(CONFIG[type]?.layouts||[]).some(item=>item[0]===next.layout)) next.layout=base.layout;
    if(!['gold','brand','dark'].includes(next.accent)) next.accent='brand';
    if(!['left','center'].includes(next.heading_align)) next.heading_align='left';
    next.display_title=String(next.display_title||'').slice(0,80);
    next.display_kicker=String(next.display_kicker||'').slice(0,80);
    return next;
  }

  function cardKey(){
    try{
      if(typeof currentId!=='undefined'&&currentId) return String(currentId);
    }catch(_){ }
    return new URLSearchParams(location.search).get('id')||'new-card';
  }

  function legacyKey(type,key=cardKey()){
    return `liw-staging-tool-style:${key}:${type}`;
  }

  function readLegacy(type){
    try{
      const direct=JSON.parse(localStorage.getItem(legacyKey(type))||'null');
      if(direct&&typeof direct==='object') return direct;
      if(cardKey()!=='new-card'){
        const fresh=JSON.parse(localStorage.getItem(legacyKey(type,'new-card'))||'null');
        if(fresh&&typeof fresh==='object') return fresh;
      }
    }catch(_){ }
    return null;
  }

  function writeLegacy(type,next){
    try{ localStorage.setItem(legacyKey(type),JSON.stringify(next)); }catch(_){ }
  }

  function getState(type){
    if(!state.has(type)) state.set(type,sanitize(type,readLegacy(type)));
    return state.get(type);
  }

  function setState(type,patch,{save=true}={}){
    const next=sanitize(type,{...getState(type),...patch});
    state.set(type,next);
    writeLegacy(type,next);
    syncEditorControls(type);
    if(save) scheduleSave(type);
    return next;
  }

  async function resolveCardId(mode){
    for(let attempt=0;attempt<40;attempt+=1){
      try{
        if(mode==='editor'&&typeof currentId!=='undefined'&&currentId) return currentId;
        if(mode==='public'&&typeof publicCard!=='undefined'&&publicCard?.id) return publicCard.id;
      }catch(_){ }
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    return null;
  }

  async function ensureEditorCardId(){
    try{ if(typeof currentId!=='undefined'&&currentId) return currentId; }catch(_){ }
    try{
      if(typeof flushSave==='function') await flushSave({force:true,silent:true});
      else if(typeof save==='function') await save({silent:true});
    }catch(_){ }
    try{ if(typeof currentId!=='undefined'&&currentId) return currentId; }catch(_){ }
    return null;
  }

  function ownerId(){
    try{ if(typeof currentCardOwnerId!=='undefined'&&currentCardOwnerId) return currentCardOwnerId; }catch(_){ }
    try{ if(typeof user!=='undefined'&&user?.id) return user.id; }catch(_){ }
    return null;
  }

  async function loadRows(mode){
    if(typeof supabaseClient==='undefined') return null;
    const cardId=await resolveCardId(mode);
    if(!cardId) return null;
    try{
      const {data,error}=await supabaseClient.from('card_sections').select('id,section_type,content').eq('card_id',cardId);
      if(error) throw error;
      const rows=(data||[]).filter(row=>TYPES.includes(row.section_type));
      rows.forEach(row=>{
        rowIds.set(row.section_type,row.id);
        state.set(row.section_type,sanitize(row.section_type,row.content||{}));
      });
      TYPES.forEach(type=>{
        if(!state.has(type)) state.set(type,sanitize(type,readLegacy(type)));
        writeLegacy(type,state.get(type));
      });
      loadedCardId=cardId;
      return {cardId,rows};
    }catch(error){
      console.warn('LIW business premium state could not load:',error);
      TYPES.forEach(type=>{ if(!state.has(type)) state.set(type,sanitize(type,readLegacy(type))); });
      return null;
    }
  }

  function setSaveLabel(type,text){
    document.querySelectorAll(`.staging-business-premium-options[data-business-style-for="${type}"] [data-business-style-summary]`).forEach(label=>{ label.textContent=text; });
  }

  function appearanceLabel(value){
    return APPEARANCES.find(item=>item[0]===value)?.[1]||'Clean';
  }

  function idleLabel(type){
    return `${appearanceLabel(getState(type).appearance)} · saved to card`;
  }

  function scheduleSave(type,delay=550){
    if(!document.body.classList.contains('editor-page')) return;
    clearTimeout(saveTimers.get(type));
    setSaveLabel(type,'Saving style…');
    saveTimers.set(type,setTimeout(()=>saveTool(type),delay));
  }

  async function saveTool(type){
    saveTimers.delete(type);
    if(typeof supabaseClient==='undefined') return false;
    const cardId=await ensureEditorCardId();
    const agencyOwnerId=ownerId();
    if(!cardId||!agencyOwnerId){
      setSaveLabel(type,'Save card first');
      return false;
    }
    const content=sanitize(type,getState(type));
    const payload={
      card_id:cardId,
      agency_owner_id:agencyOwnerId,
      section_type:type,
      title:CONFIG[type]?.title||type,
      content,
      is_visible:false,
      sort_order:40,
      updated_at:new Date().toISOString()
    };
    try{
      let id=rowIds.get(type)||null;
      if(!id){
        const {data:existing,error:lookupError}=await supabaseClient.from('card_sections').select('id').eq('card_id',cardId).eq('section_type',type).maybeSingle();
        if(lookupError) throw lookupError;
        id=existing?.id||null;
      }
      if(id){
        const {error}=await supabaseClient.from('card_sections').update(payload).eq('id',id);
        if(error) throw error;
        rowIds.set(type,id);
      }else{
        const {data,error}=await supabaseClient.from('card_sections').insert(payload).select('id').single();
        if(error) throw error;
        rowIds.set(type,data.id);
      }
      state.set(type,content);
      writeLegacy(type,content);
      setSaveLabel(type,idleLabel(type));
      try{ window.LIWPublicCardFrameStaging?.refresh?.(); }catch(_){ }
      document.dispatchEvent(new CustomEvent('liw:business-premium-saved',{detail:{type,state:content}}));
      return true;
    }catch(error){
      console.warn(`LIW ${type} premium style save failed:`,error);
      setSaveLabel(type,'Could not save style');
      if(typeof toast==='function') toast('Style could not be saved. Try again.');
      return false;
    }
  }

  function appearanceOptions(type){
    const selected=getState(type).appearance;
    return APPEARANCES.map(([value,label,copy])=>`<label class="rich-style-choice" data-business-style-choice="${value}"><input type="radio" name="liw-business-style-${type}" data-business-tool="${type}" data-business-path="appearance" value="${value}" ${selected===value?'checked':''}><span class="rich-style-swatch rich-style-swatch-${value}"></span><span><strong>${label}</strong><small>${copy}</small></span></label>`).join('');
  }

  function layoutOptions(type){
    const selected=getState(type).layout;
    return (CONFIG[type]?.layouts||[['card','Card']]).map(([value,label])=>`<option value="${value}" ${selected===value?'selected':''}>${label}</option>`).join('');
  }

  function controlsMarkup(type){
    const s=getState(type);
    return `<details class="rich-premium-options staging-business-premium-options" data-business-style-for="${type}" data-liw-persisted-business-style="true"><summary><span><i data-lucide="sparkles" size="15"></i><strong>Style & layout</strong></span><small data-business-style-summary>${idleLabel(type)}</small></summary><div class="rich-premium-body"><div class="rich-premium-label"><strong>Section style</strong><span>Uses the same premium style engine as Beef Your Card Up.</span></div><div class="rich-style-choices">${appearanceOptions(type)}</div><div class="rich-grid-2 rich-premium-fields"><div class="rich-field"><label>Layout</label><select data-business-tool="${type}" data-business-path="layout">${layoutOptions(type)}</select></div><div class="rich-field"><label>Accent</label><select data-business-tool="${type}" data-business-path="accent"><option value="gold" ${s.accent==='gold'?'selected':''}>Gold</option><option value="brand" ${s.accent==='brand'?'selected':''}>Card brand color</option><option value="dark" ${s.accent==='dark'?'selected':''}>Deep navy</option></select></div></div><div class="rich-grid-2 rich-premium-fields"><div class="rich-field"><label>Heading alignment</label><select data-business-tool="${type}" data-business-path="heading_align"><option value="left" ${s.heading_align==='left'?'selected':''}>Left</option><option value="center" ${s.heading_align==='center'?'selected':''}>Centered</option></select></div><div class="rich-field"><label>Custom section heading</label><input data-business-tool="${type}" data-business-path="display_title" value="${esc(s.display_title)}" placeholder="Use the default heading"></div></div><div class="rich-field"><label>Small heading label</label><input data-business-tool="${type}" data-business-path="display_kicker" value="${esc(s.display_kicker)}" placeholder="Use the default label"></div></div></details>`;
  }

  function toolForCard(card){
    const title=String(card.querySelector('.tool-editor-head h3')?.textContent||'').trim().toLowerCase();
    return TOOL_TITLE_MAP[title]||null;
  }

  function syncEditorControls(type){
    const s=getState(type);
    document.querySelectorAll(`.staging-business-premium-options[data-business-style-for="${type}"]`).forEach(details=>{
      details.dataset.liwPersistedBusinessStyle='true';
      details.querySelectorAll('[data-business-path]').forEach(input=>{
        const path=input.dataset.businessPath;
        const next=s[path];
        if(input.type==='radio') input.checked=String(input.value)===String(next);
        else if(document.activeElement!==input) input.value=next??'';
      });
      const label=details.querySelector('[data-business-style-summary]');
      if(label&&!/Saving|Could not|Save card/.test(label.textContent||'')) label.textContent=idleLabel(type);
    });
    const pill=document.querySelector(`.staging-business-card[data-staging-tool-card="${type}"] .staging-tool-card-style-pill`);
    if(pill) pill.textContent=appearanceLabel(s.appearance);
  }

  function upgradeEditorControls(){
    let found=0;
    document.querySelectorAll('.tool-editor-card').forEach(card=>{
      const type=toolForCard(card);
      if(!type) return;
      let details=card.querySelector(`:scope > .staging-business-premium-options[data-business-style-for="${type}"]`);
      if(!details){
        const head=card.querySelector(':scope > .tool-editor-head');
        if(head){ head.insertAdjacentHTML('afterend',controlsMarkup(type)); details=card.querySelector(`:scope > .staging-business-premium-options[data-business-style-for="${type}"]`); }
      }
      if(details){
        details.dataset.liwPersistedBusinessStyle='true';
        details.querySelectorAll('[data-business-tool][data-business-path]').forEach(input=>{
          input.dataset.richType=type;
          input.dataset.richPath=input.dataset.businessPath;
        });
        syncEditorControls(type);
        found+=1;
      }
    });
    if(found&&window.lucide) try{lucide.createIcons();}catch(_){ }
    return found;
  }

  function wireEditor(){
    if(editorMounted) return;
    editorMounted=true;
    const handle=event=>{
      const input=event.target instanceof Element?event.target.closest('.staging-business-premium-options [data-business-tool][data-business-path]'):null;
      if(!input) return;
      const type=input.dataset.businessTool;
      const path=input.dataset.businessPath;
      if(!TYPES.includes(type)||!path) return;
      const value=input.type==='checkbox'?input.checked:input.value;
      setState(type,{[path]:value},{save:true});
    };
    document.addEventListener('input',handle,false);
    document.addEventListener('change',handle,false);
    document.addEventListener('click',event=>{
      if(event.target instanceof Element&&event.target.closest('.liw-toolkit-tile,.staging-tool-card-toggle,[data-bulk-look]')) setTimeout(upgradeEditorControls,60);
    },false);
  }

  function accentValue(value){
    if(value==='gold') return '#d4a84f';
    if(value==='dark') return '#0b1438';
    return 'var(--card-primary,#0b1438)';
  }

  function decoratePublicSection(type,section){
    if(!section||!rowIds.has(type)) return;
    const s=getState(type);
    section.dataset.liwToolStyle=s.appearance;
    section.dataset.liwToolLayout=s.layout;
    section.dataset.liwToolAlign=s.heading_align;
    section.style.setProperty('--liw-tool-accent',accentValue(s.accent));
    const heading=section.querySelector('.public-section-heading h2');
    const kicker=section.querySelector('.public-section-heading span');
    if(heading) heading.textContent=s.display_title||CONFIG[type].title;
    if(kicker) kicker.textContent=s.display_kicker||CONFIG[type].kicker;
  }

  function decoratePublicAction(type,selector){
    if(!rowIds.has(type)) return;
    const action=document.querySelector(selector);
    if(!action) return;
    const s=getState(type);
    action.dataset.liwToolStyle=s.appearance;
    action.dataset.liwToolLayout=s.layout;
    action.style.setProperty('--liw-tool-accent',accentValue(s.accent));
    const label=action.querySelector('span');
    if(label&&s.display_title) label.textContent=s.display_title;
  }

  function applyPublic(){
    if(!document.body.classList.contains('public-body')) return;
    decoratePublicSection('services',document.getElementById('services-section'));
    decoratePublicSection('products',document.getElementById('products-section'));
    decoratePublicSection('leads',document.getElementById('lead-section'));
    decoratePublicSection('payment-sharing',document.getElementById('payment-sharing-section'));
    decoratePublicAction('booking','#business-actions [data-business-event="booking_click"]');
    decoratePublicAction('payment-link','#business-actions [data-business-event="payment_click"]');
    if(rowIds.has('leads')){
      const leadAction=document.querySelector('#business-actions [data-business-event="lead_form_open"]');
      if(leadAction){
        const s=getState('leads');
        leadAction.dataset.liwToolStyle=s.appearance;
        leadAction.style.setProperty('--liw-tool-accent',accentValue(s.accent));
      }
    }
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Public Advanced Tools now use the same Clean / Luxe / Glass / Bold visual language as Beef Up. */
      .public-section[data-liw-tool-style]{position:relative;overflow:hidden;margin-top:16px;padding:16px;border:1px solid rgba(100,116,139,.16);border-radius:18px;transition:box-shadow .18s ease,border-color .18s ease,background .18s ease}
      .public-section[data-liw-tool-align="center"] .public-section-heading{flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:3px}
      .public-section[data-liw-tool-align="center"] .public-section-heading:after{content:"";width:32px;height:2px;margin-top:4px;border-radius:99px;background:var(--liw-tool-accent)}
      .public-section[data-liw-tool-style="clean"]{background:#fff;box-shadow:none}
      .public-section[data-liw-tool-style="luxe"]{border-color:color-mix(in srgb,var(--liw-tool-accent) 48%,#d9dee8);background:linear-gradient(155deg,color-mix(in srgb,var(--liw-tool-accent) 5%,#fff),#fff 58%);box-shadow:0 15px 34px rgba(15,23,42,.075)}
      .public-section[data-liw-tool-style="luxe"]:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(var(--liw-tool-accent),color-mix(in srgb,var(--liw-tool-accent) 45%,transparent))}
      .public-section[data-liw-tool-style="luxe"] .public-section-heading span{color:color-mix(in srgb,var(--liw-tool-accent) 72%,#344054);text-transform:uppercase;letter-spacing:.08em;font-size:.62rem}
      .public-section[data-liw-tool-style="glass"]{border-color:rgba(255,255,255,.58);background:color-mix(in srgb,var(--card-primary) 6%,rgba(255,255,255,.78));box-shadow:0 18px 38px rgba(15,23,42,.09);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      .public-section[data-liw-tool-style="bold"]{border-color:transparent;background:linear-gradient(145deg,var(--card-primary,#0b1438),color-mix(in srgb,var(--card-primary,#0b1438) 76%,#000));color:#fff;box-shadow:0 18px 42px color-mix(in srgb,var(--card-primary,#0b1438) 28%,transparent)}
      .public-section[data-liw-tool-style="bold"] .public-section-heading h2{color:#fff!important}
      .public-section[data-liw-tool-style="bold"] .public-section-heading span,.public-section[data-liw-tool-style="bold"] .payment-sharing-note,.public-section[data-liw-tool-style="bold"] .public-lead-form>small{color:rgba(255,255,255,.74)!important}
      .public-section[data-liw-tool-style="bold"] .public-service-card,.public-section[data-liw-tool-style="bold"] .public-product-card,.public-section[data-liw-tool-style="bold"] .payment-share-button{background:rgba(255,255,255,.09)!important;border-color:rgba(255,255,255,.16)!important;color:#fff!important;box-shadow:none!important}
      .public-section[data-liw-tool-style="bold"] .public-service-card :is(h3,p,strong,a,span,svg),.public-section[data-liw-tool-style="bold"] .public-product-card :is(h3,p,strong,a,span,svg),.public-section[data-liw-tool-style="bold"] .payment-share-button :is(span,svg){color:#fff!important}
      .public-section[data-liw-tool-style="glass"] .public-service-card,.public-section[data-liw-tool-style="glass"] .public-product-card,.public-section[data-liw-tool-style="glass"] .payment-share-button{background:rgba(255,255,255,.58);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .public-section[data-liw-tool-style="luxe"] .public-service-card,.public-section[data-liw-tool-style="luxe"] .public-product-card,.public-section[data-liw-tool-style="luxe"] .payment-share-button{background:rgba(255,255,255,.86)}
      .public-section[data-liw-tool-style] .public-lead-form .input{background:#fff;color:#0b1224}
      .public-section[data-liw-tool-style="bold"] .public-lead-form .btn-primary{background:var(--liw-tool-accent)!important;color:#0b1438!important}

      #services-section[data-liw-tool-layout="list"] #services{display:grid;grid-template-columns:1fr;gap:9px}
      #services-section[data-liw-tool-layout="cards"] #services{display:grid;grid-template-columns:1fr;gap:10px}
      #services-section[data-liw-tool-layout="cards"] .public-service-card{box-shadow:0 8px 20px rgba(15,23,42,.06)}
      #services-section[data-liw-tool-layout="two-column"] #services{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #products-section[data-liw-tool-layout="grid"] #products,#products-section[data-liw-tool-layout="cards"] #products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #products-section[data-liw-tool-layout="cards"] .public-product-card{box-shadow:0 10px 24px rgba(15,23,42,.07)}
      #products-section[data-liw-tool-layout="list"] #products{display:grid;grid-template-columns:1fr;gap:10px}
      #products-section[data-liw-tool-layout="list"] .public-product-card{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:stretch}
      #products-section[data-liw-tool-layout="list"] .public-product-card>img,#products-section[data-liw-tool-layout="list"] .product-placeholder{width:96px;height:100%;min-height:104px;border-radius:0}

      #lead-section[data-liw-tool-layout="compact"]{padding:12px}
      #lead-section[data-liw-tool-layout="compact"] .public-lead-form{gap:7px}
      #lead-section[data-liw-tool-layout="compact"] textarea.input{min-height:72px}
      #lead-section[data-liw-tool-layout="split"] .public-lead-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #lead-section[data-liw-tool-layout="split"] .lead-form-row,#lead-section[data-liw-tool-layout="split"] textarea,#lead-section[data-liw-tool-layout="split"] button,#lead-section[data-liw-tool-layout="split"] small{grid-column:1/-1}
      #lead-section[data-liw-tool-layout="split"] #lead-service[hidden]{display:none!important}

      #payment-sharing-section[data-liw-tool-layout="buttons"] #payment-sharing-methods{display:grid;grid-template-columns:1fr;gap:9px}
      #payment-sharing-section[data-liw-tool-layout="grid"] #payment-sharing-methods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      #payment-sharing-section[data-liw-tool-layout="compact"] #payment-sharing-methods{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      #payment-sharing-section[data-liw-tool-layout="compact"] .payment-share-button{min-height:42px;padding:8px 9px;font-size:.7rem}

      #business-actions .business-action[data-liw-tool-style]{border:1px solid rgba(100,116,139,.16)!important;box-shadow:none!important;transition:transform .16s ease,box-shadow .16s ease}
      #business-actions .business-action[data-liw-tool-style="clean"]{background:#fff!important;color:#0b1438!important}
      #business-actions .business-action[data-liw-tool-style="luxe"]{background:linear-gradient(145deg,color-mix(in srgb,var(--liw-tool-accent) 8%,#fff),#fff)!important;border-color:color-mix(in srgb,var(--liw-tool-accent) 48%,#d9dee8)!important;color:#0b1438!important;box-shadow:0 10px 24px rgba(15,23,42,.07)!important}
      #business-actions .business-action[data-liw-tool-style="glass"]{background:color-mix(in srgb,var(--card-primary) 7%,rgba(255,255,255,.76))!important;border-color:rgba(255,255,255,.62)!important;color:#0b1438!important;backdrop-filter:blur(12px)}
      #business-actions .business-action[data-liw-tool-style="bold"]{background:linear-gradient(135deg,var(--card-primary,#0b1438),color-mix(in srgb,var(--card-primary,#0b1438) 75%,#000))!important;border-color:transparent!important;color:#fff!important;box-shadow:0 12px 28px color-mix(in srgb,var(--card-primary,#0b1438) 24%,transparent)!important}
      #business-actions .business-action[data-liw-tool-style="bold"] :is(span,svg){color:#fff!important}
      #business-actions .business-action[data-liw-tool-layout="card"]{min-height:62px;border-radius:17px!important}
      #business-actions .business-action[data-liw-tool-layout="banner"]{width:100%;min-height:66px;border-radius:17px!important;padding-inline:18px!important}
      #business-actions .business-action[data-liw-tool-layout="pill"]{border-radius:999px!important}

      @media(max-width:420px){
        #services-section[data-liw-tool-layout="two-column"] #services{gap:7px}
        #products-section[data-liw-tool-layout="grid"] #products,#products-section[data-liw-tool-layout="cards"] #products{gap:8px}
        #products-section[data-liw-tool-layout="list"] .public-product-card{grid-template-columns:82px minmax(0,1fr)}
        #products-section[data-liw-tool-layout="list"] .public-product-card>img,#products-section[data-liw-tool-layout="list"] .product-placeholder{width:82px;min-height:92px}
        #lead-section[data-liw-tool-layout="split"] .public-lead-form{grid-template-columns:1fr}
        #payment-sharing-section[data-liw-tool-layout="grid"] #payment-sharing-methods,#payment-sharing-section[data-liw-tool-layout="compact"] #payment-sharing-methods{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  async function bootEditor(){
    injectStyles();
    await loadRows('editor');
    wireEditor();
    upgradeEditorControls();
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      upgradeEditorControls();
      if(attempts>=36) clearInterval(timer);
    },500);

    /* One-time migration of the approved staging prototype state into card_sections. */
    if(loadedCardId){
      TYPES.forEach((type,index)=>{
        if(rowIds.has(type)||!readLegacy(type)) return;
        setTimeout(()=>saveTool(type),900+(index*140));
      });
    }
  }

  async function bootPublic(){
    injectStyles();
    await loadRows('public');
    applyPublic();
    [250,700,1400,2400].forEach(delay=>setTimeout(applyPublic,delay));
    window.addEventListener('pageshow',()=>setTimeout(applyPublic,120),{passive:true});
  }

  function boot(){
    if(document.body.classList.contains('editor-page')) bootEditor();
    else if(document.body.classList.contains('public-body')) bootPublic();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.LIWBusinessToolPremium={
    version:VERSION,
    getState:type=>({...getState(type)}),
    setAppearance:(type,appearance)=>setState(type,{appearance},{save:true}),
    refresh:()=>document.body.classList.contains('public-body')?applyPublic():upgradeEditorControls(),
    save:type=>saveTool(type)
  };
})();
