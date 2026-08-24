(function(){
  'use strict';

  const TABLE='staging_homepage_spotlight_config';
  const panelId='homepage-spotlight-panel';
  const defaultConfig={
    enabled:true,
    rotation_enabled:true,
    rotation_seconds:10,
    cards:[]
  };

  let config={...defaultConfig};
  let publishedCards=[];
  let dirty=false;
  let initialized=false;

  function byId(id){return document.getElementById(id)}
  function text(value){return String(value??'')}
  function escapeHtml(value){
    return text(value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }
  function notify(message){
    if(typeof toast==='function')toast(message);
    else console.info(message);
  }
  function setStatus(label,tone='saved'){
    const status=byId('admin-home-spotlight-status');
    if(!status)return;
    status.textContent=label;
    status.dataset.tone=tone;
  }
  function markDirty(){
    dirty=true;
    setStatus('Unsaved changes','dirty');
  }
  function cardLabel(card){
    return text(card?.company_name||card?.full_name||card?.label||card?.slug||'Published card').trim();
  }
  function normalizeSlug(value){
    let raw=text(value).trim();
    if(!raw)return '';
    try{
      const parsed=new URL(raw,location.href);
      const fromQuery=parsed.searchParams.get('slug');
      if(fromQuery)raw=fromQuery;
    }catch(_error){}
    raw=raw.replace(/^\/+|\/+$/g,'');
    if(raw.includes('?slug='))raw=raw.split('?slug=').pop();
    return raw.trim();
  }
  function stagingCardUrl(slug){
    return `card.html?slug=${encodeURIComponent(text(slug).trim())}`;
  }

  function populatePublishedSelect(){
    const select=byId('admin-home-card-select');
    if(!select)return;
    const current=select.value;
    select.innerHTML='<option value="">Select a published card…</option>'+
      publishedCards.map(card=>`<option value="${escapeHtml(card.slug)}">${escapeHtml(cardLabel(card))} · /${escapeHtml(card.slug)}</option>`).join('');
    if(current&&publishedCards.some(card=>card.slug===current))select.value=current;
  }

  function syncSettingsControls(){
    if(byId('admin-home-spotlight-enabled'))byId('admin-home-spotlight-enabled').checked=config.enabled!==false;
    if(byId('admin-home-rotation-enabled'))byId('admin-home-rotation-enabled').checked=config.rotation_enabled!==false;
    if(byId('admin-home-rotation-seconds'))byId('admin-home-rotation-seconds').value=String(config.rotation_seconds||10);
  }

  function renderList(){
    const list=byId('admin-home-featured-list');
    const count=byId('admin-home-featured-count');
    if(count)count.textContent=String(config.cards.length);
    if(!list)return;

    if(!config.cards.length){
      list.innerHTML='<div class="admin-home-empty"><i data-lucide="gallery-horizontal-end"></i><div><strong>No featured cards yet</strong><span>Select a published card or enter its slug above.</span></div></div>';
      if(window.lucide)lucide.createIcons();
      renderPreview();
      return;
    }

    list.innerHTML=config.cards.map((card,index)=>`
      <article class="admin-home-card-row" data-featured-row="${index}">
        <div class="admin-home-card-order">${index+1}</div>
        <div class="admin-home-card-main">
          <strong>${escapeHtml(card.label||card.slug)}</strong>
          <span>/${escapeHtml(card.slug)}</span>
        </div>
        <label class="admin-home-card-active">
          <input type="checkbox" data-home-action="toggle" data-index="${index}" ${card.enabled!==false?'checked':''}/>
          <span>Active</span>
        </label>
        <div class="admin-home-card-actions">
          <button class="icon-btn" type="button" title="Move up" aria-label="Move card up" data-home-action="up" data-index="${index}" ${index===0?'disabled':''}><i data-lucide="arrow-up"></i></button>
          <button class="icon-btn" type="button" title="Move down" aria-label="Move card down" data-home-action="down" data-index="${index}" ${index===config.cards.length-1?'disabled':''}><i data-lucide="arrow-down"></i></button>
          <button class="icon-btn danger" type="button" title="Remove" aria-label="Remove card" data-home-action="remove" data-index="${index}"><i data-lucide="trash-2"></i></button>
        </div>
      </article>`).join('');

    if(window.lucide)lucide.createIcons();
    renderPreview();
  }

  function renderPreview(){
    const iframe=byId('admin-home-spotlight-preview-frame');
    const name=byId('admin-home-spotlight-preview-name');
    const rotation=byId('admin-home-spotlight-preview-rotation');
    const empty=byId('admin-home-spotlight-preview-empty');
    if(!iframe||!name||!rotation)return;
    const first=config.cards.find(card=>card.enabled!==false);
    const sectionEnabled=byId('admin-home-spotlight-enabled')?.checked??(config.enabled!==false);
    const rotationEnabled=byId('admin-home-rotation-enabled')?.checked??(config.rotation_enabled!==false);
    const seconds=Number(byId('admin-home-rotation-seconds')?.value||config.rotation_seconds||10);
    const activeCount=config.cards.filter(card=>card.enabled!==false).length;

    if(!sectionEnabled||!first){
      iframe.src='about:blank';
      iframe.hidden=true;
      if(empty){
        empty.hidden=false;
        empty.textContent=!sectionEnabled?'Homepage spotlight is turned off.':'Add or activate a card to preview it.';
      }
      name.textContent='No active preview';
    }else{
      iframe.hidden=false;
      iframe.src=stagingCardUrl(first.slug);
      if(empty)empty.hidden=true;
      name.textContent=first.label||first.slug;
    }

    rotation.textContent=rotationEnabled&&activeCount>1
      ? `${activeCount} cards · auto change every ${seconds}s`
      : `${activeCount} active card${activeCount===1?'':'s'} · rotation ${rotationEnabled?'ready':'off'}`;
  }

  function readControlsIntoConfig(){
    config.enabled=Boolean(byId('admin-home-spotlight-enabled')?.checked);
    config.rotation_enabled=Boolean(byId('admin-home-rotation-enabled')?.checked);
    const seconds=Number(byId('admin-home-rotation-seconds')?.value||10);
    config.rotation_seconds=Math.max(5,Math.min(120,Number.isFinite(seconds)?seconds:10));
  }

  async function findPublishedCard(slug){
    const cached=publishedCards.find(card=>card.slug===slug);
    if(cached)return cached;
    const {data,error}=await supabaseClient
      .from('digital_cards')
      .select('slug,full_name,company_name,status')
      .eq('slug',slug)
      .eq('status','published')
      .maybeSingle();
    if(error)throw error;
    return data||null;
  }

  async function addSlug(value){
    const slug=normalizeSlug(value);
    if(!slug)return notify('Enter a published card slug first.');
    if(config.cards.some(card=>card.slug===slug))return notify('That card is already in the homepage rotation.');
    try{
      const card=await findPublishedCard(slug);
      if(!card)return notify('Published card not found for that slug.');
      config.cards.push({slug:card.slug,label:cardLabel(card),enabled:true});
      markDirty();
      renderList();
      const manual=byId('admin-home-card-slug');
      if(manual)manual.value='';
      const select=byId('admin-home-card-select');
      if(select)select.value='';
    }catch(error){
      console.warn('Unable to validate featured card:',error);
      notify('Could not validate that card right now.');
    }
  }

  async function saveConfig(){
    readControlsIntoConfig();
    const activeCards=config.cards.filter(card=>card.enabled!==false);
    if(config.enabled&&activeCards.length===0){
      notify('Add at least one active card, or turn the homepage spotlight off.');
      return;
    }

    const saveButton=byId('admin-home-spotlight-save');
    if(saveButton){saveButton.disabled=true;saveButton.dataset.originalText=saveButton.textContent;saveButton.textContent='Saving…'}
    try{
      const {data:{user}}=await supabaseClient.auth.getUser();
      const payload={
        enabled:config.enabled,
        rotation_enabled:config.rotation_enabled,
        rotation_seconds:config.rotation_seconds,
        cards:config.cards.map(card=>({slug:card.slug,label:card.label||card.slug,enabled:card.enabled!==false})),
        updated_by:user?.id||null,
        updated_at:new Date().toISOString()
      };
      const {data,error}=await supabaseClient
        .from(TABLE)
        .update(payload)
        .eq('id',1)
        .select('enabled,rotation_enabled,rotation_seconds,cards,updated_at')
        .maybeSingle();
      if(error)throw error;
      if(!data)throw new Error('No spotlight settings row was updated.');
      config={...defaultConfig,...data,cards:Array.isArray(data.cards)?data.cards:[]};
      dirty=false;
      syncSettingsControls();
      renderList();
      setStatus('Saved · live on staging','saved');
      notify('Homepage featured cards updated on staging.');
    }catch(error){
      console.error('Unable to save homepage spotlight:',error);
      setStatus('Save failed','error');
      notify(error?.message||'Could not save homepage spotlight settings.');
    }finally{
      if(saveButton){saveButton.disabled=false;saveButton.textContent='Save homepage spotlight'}
    }
  }

  function bindControls(){
    byId('admin-home-add-selected')?.addEventListener('click',()=>addSlug(byId('admin-home-card-select')?.value));
    byId('admin-home-add-slug')?.addEventListener('click',()=>addSlug(byId('admin-home-card-slug')?.value));
    byId('admin-home-card-slug')?.addEventListener('keydown',event=>{
      if(event.key==='Enter'){
        event.preventDefault();
        addSlug(event.currentTarget.value);
      }
    });

    ['admin-home-spotlight-enabled','admin-home-rotation-enabled','admin-home-rotation-seconds'].forEach(id=>{
      byId(id)?.addEventListener('change',()=>{
        readControlsIntoConfig();
        markDirty();
        renderPreview();
      });
    });

    byId('admin-home-featured-list')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-home-action]');
      if(!button||button.matches('input'))return;
      const index=Number(button.dataset.index);
      const action=button.dataset.homeAction;
      if(!Number.isInteger(index)||!config.cards[index])return;
      if(action==='remove')config.cards.splice(index,1);
      if(action==='up'&&index>0)[config.cards[index-1],config.cards[index]]=[config.cards[index],config.cards[index-1]];
      if(action==='down'&&index<config.cards.length-1)[config.cards[index+1],config.cards[index]]=[config.cards[index],config.cards[index+1]];
      markDirty();
      renderList();
    });

    byId('admin-home-featured-list')?.addEventListener('change',event=>{
      const input=event.target.closest('input[data-home-action="toggle"]');
      if(!input)return;
      const index=Number(input.dataset.index);
      if(!config.cards[index])return;
      config.cards[index].enabled=input.checked;
      markDirty();
      renderPreview();
    });

    byId('admin-home-spotlight-save')?.addEventListener('click',saveConfig);
    byId('admin-home-spotlight-reload')?.addEventListener('click',()=>loadData(true));
  }

  async function loadData(force=false){
    if(initialized&&!force)return;
    setStatus('Loading…','loading');
    try{
      const [configResult,cardsResult]=await Promise.all([
        supabaseClient.from(TABLE).select('enabled,rotation_enabled,rotation_seconds,cards,updated_at').eq('id',1).maybeSingle(),
        supabaseClient.from('digital_cards').select('slug,full_name,company_name,status').eq('status','published').order('updated_at',{ascending:false})
      ]);
      if(configResult.error)throw configResult.error;
      if(cardsResult.error)console.warn('Published card picker unavailable:',cardsResult.error);
      publishedCards=(cardsResult.data||[]).filter(card=>card.slug);
      config={...defaultConfig,...(configResult.data||{}),cards:Array.isArray(configResult.data?.cards)?configResult.data.cards:[]};
      dirty=false;
      initialized=true;
      populatePublishedSelect();
      syncSettingsControls();
      renderList();
      setStatus('Saved · live on staging','saved');
    }catch(error){
      console.error('Unable to load homepage spotlight admin:',error);
      setStatus('Unable to load','error');
      notify(error?.message||'Homepage spotlight settings could not load.');
    }
  }

  function waitForPanel(){
    const panel=byId(panelId);
    if(panel){
      bindControls();
      loadData();
      return;
    }
    window.setTimeout(waitForPanel,60);
  }

  waitForPanel();
})();