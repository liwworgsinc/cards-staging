(function(){
  'use strict';
  if(window.__LIW_ARTIST_DRESSING_ROOM__)return;
  window.__LIW_ARTIST_DRESSING_ROOM__=true;

  const VERSION=2;
  const TILE_META={
    music:{label:'Music',icon:'music-2'},videos:{label:'Videos',icon:'play-square'},shows:{label:'Shows',icon:'ticket'},
    merch:{label:'Store',icon:'shopping-bag'},gallery:{label:'Gallery',icon:'image'},fan_club:{label:'Fan Club',icon:'crown'},
    epk:{label:'EPK',icon:'file-text'},book:{label:'Book Me',icon:'calendar-days'},social:{label:'Social',icon:'users'}
  };
  const DEFAULT_TILE_ORDER=Object.keys(TILE_META);
  const DEFAULTS={
    version:VERSION,stage_name:'',genre:'',location:'',
    spotify_url:'',apple_music_url:'',youtube_url:'',soundcloud_url:'',audiomack_url:'',tidal_url:'',
    inner_circle_enabled:true,inner_circle_label:'Join the Inner Circle',fan_signup_url:'',
    epk_url:'',booking_url:'',merch_url:'',gallery_url:'',
    artist_mode_badge:true,grid_labels:true,
    tiles:DEFAULT_TILE_ORDER.map(key=>({key,visible:true})),
    releases:[],shows:[],media_items:[]
  };

  let state=clone(DEFAULTS);
  let loaded=false;
  let saveTimer=null;
  let cardId=new URLSearchParams(location.search).get('id')||'';
  let root=null;
  let activePanel='home';
  let productHome=null;

  function clone(value){return JSON.parse(JSON.stringify(value));}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function uid(prefix){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function currentExperience(){return String(document.querySelector('[name="card_experience"]')?.value||'classic').toLowerCase();}
  function isMusic(){return currentExperience()==='music';}
  function icon(name,size=18){return `<i data-lucide="${name}" size="${size}"></i>`;}

  function normalizeTiles(raw){
    const seen=new Set(),rows=[];
    (Array.isArray(raw)?raw:[]).forEach(row=>{
      const key=safe(row?.key,40);if(!TILE_META[key]||seen.has(key))return;
      seen.add(key);rows.push({key,visible:row?.visible!==false});
    });
    DEFAULT_TILE_ORDER.forEach(key=>{if(!seen.has(key))rows.push({key,visible:true});});
    return rows.slice(0,9);
  }

  function normalizeReleases(data){
    let rows=(Array.isArray(data.releases)?data.releases:[]).map(row=>({
      id:safe(row?.id,80)||uid('release'),title:safe(row?.title,140),artwork_url:safe(row?.artwork_url),listen_url:safe(row?.listen_url),featured:row?.featured===true
    })).filter(row=>row.title||row.artwork_url||row.listen_url);
    if(!rows.length&&(safe(data.featured_release_title)||safe(data.release_artwork_url)||safe(data.listen_url))){
      rows=[{id:uid('release'),title:safe(data.featured_release_title,140),artwork_url:safe(data.release_artwork_url),listen_url:safe(data.listen_url),featured:true}];
    }
    if(rows.length&&!rows.some(row=>row.featured))rows[0].featured=true;
    let featuredSeen=false;rows=rows.map(row=>{if(row.featured&&!featuredSeen){featuredSeen=true;return row;}return {...row,featured:false};});
    return rows.slice(0,50);
  }

  function normalizeShows(data){
    let rows=(Array.isArray(data.shows)?data.shows:[]).map(row=>({
      id:safe(row?.id,80)||uid('show'),date:safe(row?.date,40),venue:safe(row?.venue,140),city:safe(row?.city,120),ticket_url:safe(row?.ticket_url)
    })).filter(row=>row.date||row.venue||row.city||row.ticket_url);
    if(!rows.length&&(safe(data.upcoming_show_date)||safe(data.show_venue)||safe(data.show_city)||safe(data.ticket_url))){
      rows=[{id:uid('show'),date:safe(data.upcoming_show_date,40),venue:safe(data.show_venue,140),city:safe(data.show_city,120),ticket_url:safe(data.ticket_url)}];
    }
    return rows.slice(0,80);
  }

  function normalizeMedia(data){
    return (Array.isArray(data.media_items)?data.media_items:[]).map(row=>({
      id:safe(row?.id,80)||uid('media'),type:['video','photo','press','link'].includes(row?.type)?row.type:'link',title:safe(row?.title,140),url:safe(row?.url)
    })).filter(row=>row.title||row.url).slice(0,80);
  }

  function normalize(raw){
    const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    return {
      ...DEFAULTS,...data,version:VERSION,
      stage_name:safe(data.stage_name,120),genre:safe(data.genre,80),location:safe(data.location,120),
      spotify_url:safe(data.spotify_url),apple_music_url:safe(data.apple_music_url),youtube_url:safe(data.youtube_url),soundcloud_url:safe(data.soundcloud_url),audiomack_url:safe(data.audiomack_url),tidal_url:safe(data.tidal_url),
      inner_circle_enabled:data.inner_circle_enabled!==false,inner_circle_label:safe(data.inner_circle_label,90)||'Join the Inner Circle',fan_signup_url:safe(data.fan_signup_url),
      epk_url:safe(data.epk_url),booking_url:safe(data.booking_url),merch_url:safe(data.merch_url),gallery_url:safe(data.gallery_url),
      artist_mode_badge:data.artist_mode_badge!==false,grid_labels:data.grid_labels!==false,
      tiles:normalizeTiles(data.tiles),releases:normalizeReleases(data),shows:normalizeShows(data),media_items:normalizeMedia(data)
    };
  }

  function serializedState(){
    const next=normalize(state);
    const featured=next.releases.find(row=>row.featured)||next.releases[0]||{};
    const nextShow=next.shows.slice().sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999')))[0]||{};
    return {
      ...next,
      featured_release_title:safe(featured.title,140),release_artwork_url:safe(featured.artwork_url),listen_url:safe(featured.listen_url),
      upcoming_show_date:safe(nextShow.date,40),show_venue:safe(nextShow.venue,140),show_city:safe(nextShow.city,120),ticket_url:safe(nextShow.ticket_url)
    };
  }

  function setStatus(text,stateName='ready'){
    const el=root?.querySelector('[data-artist-save-status]');if(!el)return;
    el.textContent=text;el.dataset.state=stateName;
  }

  async function resolveCardId({createIfNeeded=false}={}){
    if(cardId)return cardId;
    const urlId=new URLSearchParams(location.search).get('id');if(urlId){cardId=urlId;return cardId;}
    if(createIfNeeded){try{if(typeof flushSave==='function')await flushSave({force:true,silent:true});}catch(_){}}
    const slug=safe(document.querySelector('[name="slug"]')?.value,160);if(!slug)return '';
    try{
      const {data,error}=await supabaseClient.from('digital_cards').select('id').eq('slug',slug).maybeSingle();
      if(!error&&data?.id)cardId=data.id;
    }catch(_){ }
    return cardId;
  }

  async function loadSettings(){
    const id=await resolveCardId();
    if(!id){loaded=true;state=normalize(DEFAULTS);renderAll();setStatus('Ready for your first save');return;}
    setStatus('Loading…','saving');
    try{
      const {data,error}=await supabaseClient.from('digital_cards').select('artist_settings').eq('id',id).maybeSingle();
      if(error)throw error;
      state=normalize(data?.artist_settings||{});loaded=true;renderAll();setStatus('Saved');
    }catch(error){
      loaded=true;state=normalize(DEFAULTS);renderAll();setStatus('Could not load','error');console.warn('[LIW Artist Dressing Room]',error);
    }
  }

  async function saveSettings({manual=false}={}){
    if(!loaded)return;
    state=normalize(state);
    const id=await resolveCardId({createIfNeeded:true});
    if(!id){setStatus('Save the card once first','error');if(manual&&typeof toast==='function')toast('Save the card once, then save Artist Card settings.');return;}
    setStatus('Saving…','saving');
    try{
      const payload=serializedState();
      const {data,error}=await supabaseClient.rpc('save_artist_settings',{p_card_id:id,p_settings:payload});
      if(error)throw error;
      state=normalize(data||payload);renderSummary();setStatus('Saved');
      try{localStorage.removeItem(`liw_artist_dressing_room_${id}`);}catch(_){ }
      if(manual&&typeof toast==='function')toast('LIW Artist Card saved');
    }catch(error){
      setStatus('Save failed','error');
      try{localStorage.setItem(`liw_artist_dressing_room_${id||'new'}`,JSON.stringify(serializedState()));}catch(_){ }
      if(manual&&typeof toast==='function')toast(error?.message||'Unable to save Artist Card settings.');
      console.warn('[LIW Artist Dressing Room] save failed',error);
    }
  }

  function queueSave(){
    if(!loaded)return;setStatus('Unsaved changes','dirty');clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveSettings(),800);
  }

  function fieldMarkup(name,label,placeholder='',type='text'){
    const value=esc(state[name]||'');
    return `<label class="artist-control-field"><span>${label}</span><input class="input" type="${type}" data-artist-field="${name}" value="${value}" placeholder="${esc(placeholder)}"></label>`;
  }

  function renderSummary(){
    if(!root)return;
    const name=root.querySelector('[data-artist-summary-name]');if(name)name.textContent=state.stage_name||document.querySelector('[name="full_name"]')?.value||'Your artist card';
    const meta=root.querySelector('[data-artist-summary-meta]');if(meta)meta.textContent=[state.genre,state.location].filter(Boolean).join(' • ')||'Add your genre and location';
    const counts={music:state.releases.length,shows:state.shows.length,media:state.media_items.length,store:productCount()};
    Object.entries(counts).forEach(([key,count])=>{const el=root.querySelector(`[data-artist-count="${key}"]`);if(el)el.textContent=String(count);});
    renderProfileMedia();
  }

  function renderSingleFields(){
    if(!root)return;
    root.querySelectorAll('[data-artist-field]').forEach(el=>{
      const name=el.dataset.artistField;if(!(name in state))return;
      if(el.type==='checkbox')el.checked=Boolean(state[name]);else if(document.activeElement!==el)el.value=state[name]??'';
    });
  }

  function releaseCard(row,index){
    const bg=row.artwork_url?`style="background-image:url('${esc(row.artwork_url).replace(/'/g,'%27')}')"`:'';
    return `<article class="artist-item-card" data-release-id="${esc(row.id)}">
      <div class="artist-item-card-head"><div><small>${row.featured?'FEATURED RELEASE':`RELEASE ${index+1}`}</small><strong>${esc(row.title||'Untitled release')}</strong></div><button type="button" class="artist-remove-action" data-remove-release="${esc(row.id)}">${icon('trash-2',15)} Remove</button></div>
      <div class="artist-release-layout"><div class="artist-release-art" ${bg}>${row.artwork_url?'':icon('disc-3',25)}</div><div class="artist-item-fields">
        <label><span>Title</span><input class="input" data-release-field="title" value="${esc(row.title)}" placeholder="Song, single, EP or album"></label>
        <label><span>Listen link</span><input class="input" data-release-field="listen_url" value="${esc(row.listen_url)}" placeholder="https://..."></label>
        <div class="artist-inline-actions"><label class="btn btn-light btn-sm">${icon('upload',14)} Artwork<input hidden type="file" accept="image/png,image/jpeg,image/webp" data-release-artwork-file="${esc(row.id)}"></label>${row.artwork_url?`<button class="btn btn-ghost btn-sm" type="button" data-remove-release-art="${esc(row.id)}">Remove art</button>`:''}${row.featured?'':'<button class="btn btn-ghost btn-sm" type="button" data-feature-release="'+esc(row.id)+'">Make featured</button>'}</div>
      </div></div>
    </article>`;
  }

  function renderReleases(){
    const list=root?.querySelector('[data-release-list]');if(!list)return;
    list.innerHTML=state.releases.length?state.releases.map(releaseCard).join(''):'<div class="artist-empty-state">'+icon('music-2',22)+'<strong>No music added yet</strong><span>Add a release and it can become the featured song on the Artist Card.</span></div>';
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function showCard(row,index){
    return `<article class="artist-item-card" data-show-id="${esc(row.id)}"><div class="artist-item-card-head"><div><small>SHOW ${index+1}</small><strong>${esc(row.venue||row.city||'New show')}</strong></div><button type="button" class="artist-remove-action" data-remove-show="${esc(row.id)}">${icon('trash-2',15)} Remove</button></div><div class="artist-card-grid artist-card-grid-2">
      <label><span>Date</span><input class="input" type="date" data-show-field="date" value="${esc(row.date)}"></label>
      <label><span>Venue</span><input class="input" data-show-field="venue" value="${esc(row.venue)}" placeholder="Venue or event"></label>
      <label><span>City</span><input class="input" data-show-field="city" value="${esc(row.city)}" placeholder="Brooklyn, NY"></label>
      <label><span>Ticket link</span><input class="input" data-show-field="ticket_url" value="${esc(row.ticket_url)}" placeholder="https://..."></label>
    </div></article>`;
  }

  function renderShows(){
    const list=root?.querySelector('[data-show-list]');if(!list)return;
    list.innerHTML=state.shows.length?state.shows.map(showCard).join(''):'<div class="artist-empty-state">'+icon('ticket',22)+'<strong>No shows added yet</strong><span>Add dates one at a time. Every show can be edited or removed here.</span></div>';
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function mediaCard(row,index){
    return `<article class="artist-item-card" data-media-id="${esc(row.id)}"><div class="artist-item-card-head"><div><small>MEDIA ${index+1}</small><strong>${esc(row.title||'Media link')}</strong></div><button type="button" class="artist-remove-action" data-remove-media="${esc(row.id)}">${icon('trash-2',15)} Remove</button></div><div class="artist-card-grid artist-card-grid-3">
      <label><span>Type</span><select class="input" data-media-field="type"><option value="video" ${row.type==='video'?'selected':''}>Video</option><option value="photo" ${row.type==='photo'?'selected':''}>Photo</option><option value="press" ${row.type==='press'?'selected':''}>Press</option><option value="link" ${row.type==='link'?'selected':''}>Link</option></select></label>
      <label><span>Title</span><input class="input" data-media-field="title" value="${esc(row.title)}" placeholder="Interview, gallery, press feature"></label>
      <label><span>URL</span><input class="input" data-media-field="url" value="${esc(row.url)}" placeholder="https://..."></label>
    </div></article>`;
  }

  function renderMedia(){
    const list=root?.querySelector('[data-media-list]');if(!list)return;
    list.innerHTML=state.media_items.length?state.media_items.map(mediaCard).join(''):'<div class="artist-empty-state">'+icon('image',22)+'<strong>No extra media yet</strong><span>Add videos, photos, press links or other artist media.</span></div>';
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function tileRows(){
    return state.tiles.map((row,index)=>{const meta=TILE_META[row.key];return `<div class="artist-tile-row" data-artist-tile="${row.key}"><span class="artist-tile-icon">${icon(meta.icon,16)}</span><strong>${meta.label}</strong><label class="artist-mini-switch"><input type="checkbox" ${row.visible?'checked':''} data-artist-tile-visible="${row.key}"><span></span></label><div class="artist-tile-order-actions"><button type="button" data-artist-move="up" data-key="${row.key}" ${index===0?'disabled':''}>${icon('chevron-up',14)}</button><button type="button" data-artist-move="down" data-key="${row.key}" ${index===state.tiles.length-1?'disabled':''}>${icon('chevron-down',14)}</button></div></div>`;}).join('');
  }

  function renderTiles(){const list=root?.querySelector('[data-artist-tile-list]');if(list)list.innerHTML=tileRows();}

  function productCount(){
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products.filter(item=>safe(item?.name)).length;}catch(_){ }
    return document.querySelectorAll('#product-list .builder-row,#product-list [data-product-index],#product-list .product-builder-row').length;
  }

  function mountProductBuilder(){
    const host=root?.querySelector('[data-artist-store-host]');if(!host)return;
    const card=document.querySelector('[data-entitlement-card="product_showcase"]');if(!card||card.closest('[data-artist-store-host]')){renderSummary();return;}
    if(!productHome){productHome={card,parent:card.parentNode,next:card.nextSibling,placeholder:document.createComment('liw-product-showcase-home')};card.parentNode?.insertBefore(productHome.placeholder,card);}
    host.appendChild(card);card.classList.add('artist-mounted-product-builder');
    const toggle=card.querySelector('[name="products_enabled"]');if(toggle&&!toggle.disabled&&!toggle.checked){toggle.checked=true;toggle.dispatchEvent(new Event('change',{bubbles:true}));}
    renderSummary();
  }

  function restoreProductBuilder(){
    if(!productHome?.card)return;
    const {card,parent,next,placeholder}=productHome;card.classList.remove('artist-mounted-product-builder');
    if(placeholder?.parentNode)placeholder.parentNode.insertBefore(card,placeholder.nextSibling);
    else if(next?.parentNode===parent)parent.insertBefore(card,next);else parent?.appendChild(card);
  }

  function renderProfileMedia(){
    if(!root)return;
    const profile=safe(document.querySelector('[name="profile_image_url"]')?.value);const cover=safe(document.querySelector('[name="cover_image_url"]')?.value);
    const p=root.querySelector('[data-artist-profile-preview]');if(p){p.style.backgroundImage=profile?`url("${profile.replace(/"/g,'%22')}")`:'';p.classList.toggle('has-image',Boolean(profile));if(!profile)p.innerHTML=icon('user-round',25);}
    const c=root.querySelector('[data-artist-cover-preview]');if(c){c.style.backgroundImage=cover?`url("${cover.replace(/"/g,'%22')}")`:'';c.classList.toggle('has-image',Boolean(cover));if(!cover)c.innerHTML='<span>'+icon('image',18)+' Cover image</span>';}
  }

  function renderAll(){
    renderSingleFields();renderReleases();renderShows();renderMedia();renderTiles();renderSummary();setPanel(activePanel,false);
    if(isMusic())mountProductBuilder();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function setPanel(key,focus=true){
    if(!root)return;activePanel=['home','music','shows','store','media','profile'].includes(key)?key:'home';
    root.querySelectorAll('[data-artist-panel]').forEach(panel=>panel.hidden=panel.dataset.artistPanel!==activePanel);
    root.querySelectorAll('[data-artist-nav]').forEach(btn=>{const active=btn.dataset.artistNav===activePanel;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',active?'true':'false');});
    if(activePanel==='store')mountProductBuilder();
    if(focus)root.querySelector(`[data-artist-panel="${activePanel}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function confirmRemove(label){return window.confirm(`Remove this ${label}? This cannot be undone after the next save.`);}

  async function uploadReleaseArtwork(input,id){
    const file=input.files?.[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){if(typeof toast==='function')toast('Use a PNG, JPG, or WebP image.');input.value='';return;}
    if(file.size>5*1024*1024){if(typeof toast==='function')toast('Artwork must be smaller than 5 MB.');input.value='';return;}
    setStatus('Uploading artwork…','saving');
    try{
      const {data:{user}}=await supabaseClient.auth.getUser();if(!user)throw new Error('Sign in again to upload artwork.');
      const clean=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');const path=`${user.id}/artist-release-artwork/${id}-${Date.now()}-${clean}`;
      const {error}=await supabaseClient.storage.from('profile-images').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;
      const {data}=supabaseClient.storage.from('profile-images').getPublicUrl(path);const row=state.releases.find(item=>item.id===id);if(row)row.artwork_url=data.publicUrl;
      renderReleases();queueSave();if(typeof toast==='function')toast('Release artwork added');
    }catch(error){setStatus('Artwork upload failed','error');if(typeof toast==='function')toast(error?.message||'Unable to upload artwork.');}
    finally{input.value='';}
  }

  function bindEvents(){
    root.addEventListener('click',event=>{
      const nav=event.target.closest('[data-artist-nav]');if(nav){setPanel(nav.dataset.artistNav);return;}
      const jump=event.target.closest('[data-artist-jump]');if(jump){setPanel(jump.dataset.artistJump);return;}
      if(event.target.closest('[data-add-release]')){state.releases.push({id:uid('release'),title:'',artwork_url:'',listen_url:'',featured:state.releases.length===0});renderReleases();renderSummary();queueSave();return;}
      const removeRelease=event.target.closest('[data-remove-release]');if(removeRelease&&confirmRemove('release')){state.releases=state.releases.filter(row=>row.id!==removeRelease.dataset.removeRelease);if(state.releases.length&&!state.releases.some(row=>row.featured))state.releases[0].featured=true;renderReleases();renderSummary();queueSave();return;}
      const feature=event.target.closest('[data-feature-release]');if(feature){state.releases.forEach(row=>row.featured=row.id===feature.dataset.featureRelease);renderReleases();queueSave();return;}
      const removeArt=event.target.closest('[data-remove-release-art]');if(removeArt&&confirmRemove('artwork')){const row=state.releases.find(item=>item.id===removeArt.dataset.removeReleaseArt);if(row)row.artwork_url='';renderReleases();queueSave();return;}
      if(event.target.closest('[data-add-show]')){state.shows.push({id:uid('show'),date:'',venue:'',city:'',ticket_url:''});renderShows();renderSummary();queueSave();return;}
      const removeShow=event.target.closest('[data-remove-show]');if(removeShow&&confirmRemove('show')){state.shows=state.shows.filter(row=>row.id!==removeShow.dataset.removeShow);renderShows();renderSummary();queueSave();return;}
      if(event.target.closest('[data-add-media]')){state.media_items.push({id:uid('media'),type:'link',title:'',url:''});renderMedia();renderSummary();queueSave();return;}
      const removeMedia=event.target.closest('[data-remove-media]');if(removeMedia&&confirmRemove('media item')){state.media_items=state.media_items.filter(row=>row.id!==removeMedia.dataset.removeMedia);renderMedia();renderSummary();queueSave();return;}
      const move=event.target.closest('[data-artist-move]');if(move){const index=state.tiles.findIndex(row=>row.key===move.dataset.key);const next=move.dataset.artistMove==='up'?index-1:index+1;if(index>=0&&next>=0&&next<state.tiles.length){[state.tiles[index],state.tiles[next]]=[state.tiles[next],state.tiles[index]];renderTiles();queueSave();}return;}
      if(event.target.closest('[data-artist-save-now]')){saveSettings({manual:true});return;}
      if(event.target.closest('[data-artist-upload-profile]')){document.getElementById('profile-file')?.click();return;}
      if(event.target.closest('[data-artist-remove-profile]')){document.getElementById('remove-photo')?.click();setTimeout(renderProfileMedia,100);return;}
      if(event.target.closest('[data-artist-upload-cover]')){document.getElementById('cover-file')?.click();return;}
      if(event.target.closest('[data-artist-remove-cover]')){document.getElementById('remove-cover')?.click();setTimeout(renderProfileMedia,100);return;}
    });

    root.addEventListener('input',event=>{
      const single=event.target.closest('[data-artist-field]');if(single){const name=single.dataset.artistField;state[name]=single.type==='checkbox'?single.checked:safe(single.value,name==='genre'?80:name==='stage_name'||name==='location'?120:1800);renderSummary();queueSave();return;}
      const releaseField=event.target.closest('[data-release-field]');if(releaseField){const card=releaseField.closest('[data-release-id]');const row=state.releases.find(item=>item.id===card?.dataset.releaseId);if(row)row[releaseField.dataset.releaseField]=safe(releaseField.value,releaseField.dataset.releaseField==='title'?140:1800);queueSave();return;}
      const showField=event.target.closest('[data-show-field]');if(showField){const card=showField.closest('[data-show-id]');const row=state.shows.find(item=>item.id===card?.dataset.showId);if(row)row[showField.dataset.showField]=safe(showField.value,showField.dataset.showField==='venue'?140:showField.dataset.showField==='city'?120:1800);queueSave();return;}
      const mediaField=event.target.closest('[data-media-field]');if(mediaField){const card=mediaField.closest('[data-media-id]');const row=state.media_items.find(item=>item.id===card?.dataset.mediaId);if(row)row[mediaField.dataset.mediaField]=safe(mediaField.value,mediaField.dataset.mediaField==='title'?140:1800);queueSave();}
    });

    root.addEventListener('change',event=>{
      const art=event.target.closest('[data-release-artwork-file]');if(art){uploadReleaseArtwork(art,art.dataset.releaseArtworkFile);return;}
      const visible=event.target.closest('[data-artist-tile-visible]');if(visible){const row=state.tiles.find(item=>item.key===visible.dataset.artistTileVisible);if(row)row.visible=visible.checked;queueSave();return;}
      if(event.target.matches('[data-artist-field],[data-release-field],[data-show-field],[data-media-field]'))event.target.dispatchEvent(new Event('input',{bubbles:true}));
    });

    document.addEventListener('change',event=>{if(event.target?.matches?.('#profile-file,#cover-file,[name="profile_image_url"],[name="cover_image_url"]'))setTimeout(renderProfileMedia,350);},true);
  }

  function build(){
    if(root)return true;
    const experience=document.getElementById('card-experience-section');
    const designPanel=document.querySelector('.editor-panel[data-panel="design"]');
    if(!experience&&!designPanel)return false;
    root=document.createElement('section');root.id='artist-dressing-room';root.className='artist-dressing-room artist-control-center';
    root.innerHTML=`
      <div class="artist-control-hero"><div><span class="artist-control-kicker">LIW ARTIST CARD</span><h3>${icon('sparkles',19)} Artist Control Center</h3><p>Music, shows, store, media and artist profile — all in one mobile-friendly workspace.</p></div><span class="artist-save-status" data-artist-save-status>Loading…</span></div>
      <nav class="artist-control-nav" aria-label="Artist Card sections">
        <button type="button" data-artist-nav="home" class="active">${icon('house',17)}<span>Home</span></button>
        <button type="button" data-artist-nav="music">${icon('music-2',17)}<span>Music</span></button>
        <button type="button" data-artist-nav="shows">${icon('ticket',17)}<span>Shows</span></button>
        <button type="button" data-artist-nav="store">${icon('shopping-bag',17)}<span>Store</span></button>
        <button type="button" data-artist-nav="media">${icon('image',17)}<span>Media</span></button>
        <button type="button" data-artist-nav="profile">${icon('user-round',17)}<span>Profile</span></button>
      </nav>

      <div class="artist-control-panels">
        <section class="artist-control-panel" data-artist-panel="home">
          <div class="artist-home-card"><div><span class="artist-home-label">YOUR ARTIST CARD</span><h4 data-artist-summary-name>Your artist card</h4><p data-artist-summary-meta>Add your genre and location</p></div><span class="artist-home-badge">MUSIC</span></div>
          <div class="artist-stat-grid">
            <button type="button" data-artist-jump="music"><strong data-artist-count="music">0</strong><span>Releases</span></button>
            <button type="button" data-artist-jump="shows"><strong data-artist-count="shows">0</strong><span>Shows</span></button>
            <button type="button" data-artist-jump="store"><strong data-artist-count="store">0</strong><span>Products</span></button>
            <button type="button" data-artist-jump="media"><strong data-artist-count="media">0</strong><span>Media</span></button>
          </div>
          <div class="artist-section-card"><div class="artist-section-head"><div><strong>Backstage links</strong><span>Booking, fan club and artist destinations.</span></div>${icon('door-open',18)}</div><div class="artist-card-grid artist-card-grid-2">
            ${fieldMarkup('booking_url','Booking link','Management, booking form or calendar')}
            ${fieldMarkup('fan_signup_url','Fan club / signup','Community or signup URL')}
            ${fieldMarkup('epk_url','EPK / press kit','Press kit URL')}
            ${fieldMarkup('gallery_url','Gallery link','Photo gallery URL')}
          </div></div>
          <div class="artist-section-card"><div class="artist-section-head"><div><strong>Home buttons</strong><span>Show, hide and reorder the Artist Card rooms.</span></div>${icon('layout-grid',18)}</div><div class="artist-toggle-line"><label><input type="checkbox" data-artist-field="grid_labels"><span>Show labels under icons</span></label><label><input type="checkbox" data-artist-field="artist_mode_badge"><span>Show Artist Mode badge</span></label></div><div class="artist-tile-list" data-artist-tile-list></div></div>
        </section>

        <section class="artist-control-panel" data-artist-panel="music" hidden>
          <div class="artist-panel-title"><div><span>MUSIC</span><h4>Your releases</h4><p>Add as many songs, singles, EPs or albums as you need.</p></div><button type="button" class="btn btn-primary btn-sm" data-add-release>${icon('plus',15)} Add release</button></div>
          <div class="artist-section-card"><div class="artist-section-head"><div><strong>Streaming profiles</strong><span>These power the main Listen options.</span></div>${icon('headphones',18)}</div><div class="artist-card-grid artist-card-grid-2">
            ${fieldMarkup('spotify_url','Spotify','Spotify artist or release URL')}${fieldMarkup('apple_music_url','Apple Music','Apple Music URL')}${fieldMarkup('youtube_url','YouTube','YouTube channel or video URL')}${fieldMarkup('soundcloud_url','SoundCloud','SoundCloud URL')}${fieldMarkup('audiomack_url','Audiomack','Audiomack URL')}${fieldMarkup('tidal_url','Tidal','Tidal URL')}
          </div></div>
          <div class="artist-item-list" data-release-list></div>
        </section>

        <section class="artist-control-panel" data-artist-panel="shows" hidden>
          <div class="artist-panel-title"><div><span>SHOWS</span><h4>Live dates</h4><p>Add multiple shows. Every date can be edited or removed from here.</p></div><button type="button" class="btn btn-primary btn-sm" data-add-show>${icon('plus',15)} Add show</button></div>
          <div class="artist-item-list" data-show-list></div>
        </section>

        <section class="artist-control-panel" data-artist-panel="store" hidden>
          <div class="artist-panel-title"><div><span>STORE</span><h4>Merch & products</h4><p>The regular LIW Product Showcase lives inside the Artist workspace while Music is selected.</p></div></div>
          <div class="artist-section-card artist-external-store">${fieldMarkup('merch_url','External store link (optional)','Shopify, Bandcamp or website store')}</div>
          <div class="artist-store-host" data-artist-store-host><div class="artist-empty-state">${icon('shopping-bag',22)}<strong>Loading LIW product builder…</strong><span>Your existing products will appear here.</span></div></div>
        </section>

        <section class="artist-control-panel" data-artist-panel="media" hidden>
          <div class="artist-panel-title"><div><span>MEDIA</span><h4>Videos, photos & press</h4><p>Keep artist media together, with a Remove action on every entry.</p></div><button type="button" class="btn btn-primary btn-sm" data-add-media>${icon('plus',15)} Add media</button></div>
          <div class="artist-section-card"><div class="artist-section-head"><div><strong>Primary media destinations</strong><span>Use these for the main Artist Card rooms.</span></div>${icon('play-square',18)}</div><div class="artist-card-grid artist-card-grid-2">${fieldMarkup('gallery_url','Gallery','Gallery URL')}${fieldMarkup('epk_url','EPK / press kit','Press kit URL')}</div></div>
          <div class="artist-item-list" data-media-list></div>
        </section>

        <section class="artist-control-panel" data-artist-panel="profile" hidden>
          <div class="artist-panel-title"><div><span>PROFILE</span><h4>Artist identity</h4><p>Manage artist name, genre, location, profile photo and cover without leaving the room.</p></div></div>
          <div class="artist-profile-media"><div class="artist-profile-preview" data-artist-profile-preview>${icon('user-round',25)}</div><div class="artist-cover-preview" data-artist-cover-preview><span>${icon('image',18)} Cover image</span></div></div>
          <div class="artist-media-actions"><button type="button" class="btn btn-light btn-sm" data-artist-upload-profile>${icon('upload',14)} Profile photo</button><button type="button" class="btn btn-ghost btn-sm" data-artist-remove-profile>Remove photo</button><button type="button" class="btn btn-light btn-sm" data-artist-upload-cover>${icon('upload',14)} Cover</button><button type="button" class="btn btn-ghost btn-sm" data-artist-remove-cover>Remove cover</button></div>
          <div class="artist-section-card"><div class="artist-card-grid artist-card-grid-3">${fieldMarkup('stage_name','Stage / artist name','Nova Luxe')}${fieldMarkup('genre','Genre','R&B')}${fieldMarkup('location','Location','Brooklyn, NY')}</div></div>
          <div class="artist-section-card"><div class="artist-section-head"><div><strong>Fan connection</strong><span>Optional Inner Circle teaser on the public Artist Card.</span></div>${icon('crown',18)}</div><div class="artist-card-grid artist-card-grid-2">${fieldMarkup('inner_circle_label','Inner Circle title','Join the Inner Circle')}${fieldMarkup('fan_signup_url','Signup link','Fan signup or community URL')}</div><label class="artist-check-row"><input type="checkbox" data-artist-field="inner_circle_enabled"><span>Show Inner Circle teaser</span></label></div>
        </section>
      </div>

      <div class="artist-dressing-savebar"><div><strong>Artist Card autosaves</strong><span>Remove actions are saved the same way as edits.</span></div><button type="button" class="btn btn-primary" data-artist-save-now>${icon('save',16)} Save now</button></div>`;

    if(experience)experience.insertAdjacentElement('afterend',root);else designPanel.querySelector('.panel-heading')?.insertAdjacentElement('afterend',root);
    bindEvents();syncVisibility();loadSettings();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function syncVisibility(){
    if(!root)return;
    const active=isMusic();root.hidden=!active;
    if(active){mountProductBuilder();renderProfileMedia();renderSummary();}
    else restoreProductBuilder();
  }

  document.addEventListener('click',event=>{if(event.target.closest?.('[data-card-experience]'))setTimeout(syncVisibility,30);},true);
  setInterval(syncVisibility,900);
  let tries=0;const timer=setInterval(()=>{tries++;if(build()||tries>90)clearInterval(timer);},200);build();
})();