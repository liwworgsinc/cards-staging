(function(){
  'use strict';
  if(window.__LIW_ARTIST_DRESSING_ROOM__)return;
  window.__LIW_ARTIST_DRESSING_ROOM__=true;

  const VERSION=1;
  const TILE_META={
    music:{label:'Music',icon:'music-2'},
    videos:{label:'Videos',icon:'play-square'},
    shows:{label:'Shows',icon:'ticket'},
    merch:{label:'Merch',icon:'shirt'},
    gallery:{label:'Gallery',icon:'image'},
    fan_club:{label:'Fan Club',icon:'crown'},
    epk:{label:'EPK',icon:'file-text'},
    book:{label:'Book Me',icon:'calendar-days'},
    social:{label:'Social',icon:'users'}
  };
  const DEFAULT_TILE_ORDER=Object.keys(TILE_META);
  const DEFAULTS={
    version:VERSION,
    stage_name:'',genre:'',location:'',
    featured_release_title:'',release_artwork_url:'',listen_url:'',
    spotify_url:'',apple_music_url:'',youtube_url:'',soundcloud_url:'',audiomack_url:'',tidal_url:'',
    upcoming_show_date:'',show_venue:'',show_city:'',ticket_url:'',
    inner_circle_enabled:true,inner_circle_label:'Join the Inner Circle',fan_signup_url:'',
    epk_url:'',booking_url:'',merch_url:'',gallery_url:'',
    artist_mode_badge:true,grid_labels:true,glam_preset:'nova_violet',glam_intensity:'3',
    tiles:DEFAULT_TILE_ORDER.map(key=>({key,visible:true}))
  };

  let state=structuredClone(DEFAULTS);
  let loaded=false;
  let saveTimer=null;
  let cardId=new URLSearchParams(location.search).get('id')||'';
  let root=null;

  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function normalizeTiles(raw){
    const seen=new Set();
    const rows=[];
    (Array.isArray(raw)?raw:[]).forEach(row=>{
      const key=safe(row?.key,40);
      if(!TILE_META[key]||seen.has(key))return;
      seen.add(key);rows.push({key,visible:row?.visible!==false});
    });
    DEFAULT_TILE_ORDER.forEach(key=>{if(!seen.has(key))rows.push({key,visible:true});});
    return rows.slice(0,9);
  }
  function normalize(raw){
    const data=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    return {
      ...DEFAULTS,...data,
      version:VERSION,
      stage_name:safe(data.stage_name,120),genre:safe(data.genre,80),location:safe(data.location,120),
      featured_release_title:safe(data.featured_release_title,140),release_artwork_url:safe(data.release_artwork_url),listen_url:safe(data.listen_url),
      spotify_url:safe(data.spotify_url),apple_music_url:safe(data.apple_music_url),youtube_url:safe(data.youtube_url),soundcloud_url:safe(data.soundcloud_url),audiomack_url:safe(data.audiomack_url),tidal_url:safe(data.tidal_url),
      upcoming_show_date:safe(data.upcoming_show_date,40),show_venue:safe(data.show_venue,140),show_city:safe(data.show_city,120),ticket_url:safe(data.ticket_url),
      inner_circle_enabled:data.inner_circle_enabled!==false,inner_circle_label:safe(data.inner_circle_label,90)||'Join the Inner Circle',fan_signup_url:safe(data.fan_signup_url),
      epk_url:safe(data.epk_url),booking_url:safe(data.booking_url),merch_url:safe(data.merch_url),gallery_url:safe(data.gallery_url),
      artist_mode_badge:data.artist_mode_badge!==false,
      grid_labels:data.grid_labels!==false,
      glam_preset:['nova_violet','gold_luxe','rose_chrome','ice_blue'].includes(data.glam_preset)?data.glam_preset:'nova_violet',
      glam_intensity:['1','2','3'].includes(String(data.glam_intensity))?String(data.glam_intensity):'3',
      tiles:normalizeTiles(data.tiles)
    };
  }
  function currentExperience(){return String(document.querySelector('[name="card_experience"]')?.value||'classic').toLowerCase();}
  function isMusic(){return currentExperience()==='music';}
  function setStatus(text,stateName='ready'){
    const el=root?.querySelector('[data-artist-save-status]');
    if(!el)return;el.textContent=text;el.dataset.state=stateName;
  }
  function valueOf(name){return root?.querySelector(`[data-artist-field="${name}"]`);}
  function fieldValue(name){const el=valueOf(name);if(!el)return '';return el.type==='checkbox'?el.checked:el.value;}

  function renderArtwork(){
    const preview=root?.querySelector('[data-artist-artwork-preview]');
    if(!preview)return;
    if(state.release_artwork_url){preview.style.backgroundImage=`url("${state.release_artwork_url.replace(/"/g,'%22')}")`;preview.classList.add('has-artwork');preview.innerHTML='';}
    else{preview.style.backgroundImage='';preview.classList.remove('has-artwork');preview.innerHTML='<i data-lucide="disc-3" size="24"></i><span>Release artwork</span>';}
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function tileRows(){
    return state.tiles.map((row,index)=>{
      const meta=TILE_META[row.key];
      return `<div class="artist-tile-row" data-artist-tile="${row.key}">
        <span class="artist-tile-grab"><i data-lucide="grip-vertical" size="16"></i></span>
        <span class="artist-tile-icon"><i data-lucide="${meta.icon}" size="17"></i></span>
        <strong>${meta.label}</strong>
        <label class="artist-mini-switch"><input type="checkbox" ${row.visible?'checked':''} data-artist-tile-visible="${row.key}"><span></span></label>
        <div class="artist-tile-order-actions">
          <button type="button" aria-label="Move ${meta.label} up" data-artist-move="up" data-key="${row.key}" ${index===0?'disabled':''}><i data-lucide="chevron-up" size="15"></i></button>
          <button type="button" aria-label="Move ${meta.label} down" data-artist-move="down" data-key="${row.key}" ${index===state.tiles.length-1?'disabled':''}><i data-lucide="chevron-down" size="15"></i></button>
        </div>
      </div>`;
    }).join('');
  }

  function renderTiles(){
    const list=root?.querySelector('[data-artist-tile-list]');
    if(!list)return;list.innerHTML=tileRows();wireTileControls();if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }
  function wireTileControls(){
    root?.querySelectorAll('[data-artist-tile-visible]').forEach(input=>input.addEventListener('change',()=>{
      const row=state.tiles.find(item=>item.key===input.dataset.artistTileVisible);if(row)row.visible=input.checked;queueSave();
    }));
    root?.querySelectorAll('[data-artist-move]').forEach(button=>button.addEventListener('click',()=>{
      const index=state.tiles.findIndex(item=>item.key===button.dataset.key);if(index<0)return;
      const next=button.dataset.artistMove==='up'?index-1:index+1;if(next<0||next>=state.tiles.length)return;
      [state.tiles[index],state.tiles[next]]=[state.tiles[next],state.tiles[index]];renderTiles();queueSave();
    }));
  }

  function syncFields(){
    if(!root)return;
    Object.keys(DEFAULTS).forEach(name=>{
      if(name==='tiles'||name==='version')return;
      const el=valueOf(name);if(!el)return;
      if(el.type==='checkbox')el.checked=Boolean(state[name]);else el.value=state[name]??'';
    });
    const intensity=root.querySelector('[data-glam-intensity-value]');if(intensity)intensity.textContent=({1:'Subtle',2:'Stage',3:'Headliner'})[state.glam_intensity]||'Headliner';
    renderArtwork();renderTiles();
  }

  async function resolveCardId({createIfNeeded=false}={}){
    if(cardId)return cardId;
    const urlId=new URLSearchParams(location.search).get('id');if(urlId){cardId=urlId;return cardId;}
    if(createIfNeeded){
      try{if(typeof flushSave==='function')await flushSave({force:true,silent:true});}catch(_){ }
    }
    const slug=safe(document.querySelector('[name="slug"]')?.value,160);
    if(!slug)return '';
    try{
      const {data,error}=await supabaseClient.from('digital_cards').select('id').eq('slug',slug).maybeSingle();
      if(!error&&data?.id)cardId=data.id;
    }catch(_){ }
    return cardId;
  }

  async function loadSettings(){
    const id=await resolveCardId();
    if(!id){loaded=true;state=normalize(DEFAULTS);syncFields();setStatus('Ready for your first save');return;}
    setStatus('Loading dressing room…','saving');
    try{
      const {data,error}=await supabaseClient.from('digital_cards').select('artist_settings').eq('id',id).maybeSingle();
      if(error)throw error;
      state=normalize(data?.artist_settings||{});
      loaded=true;syncFields();setStatus('Saved');
    }catch(error){
      loaded=true;state=normalize(DEFAULTS);syncFields();setStatus('Could not load settings','error');console.warn('[LIW Artist Dressing Room]',error);
    }
  }

  function collectState(){
    if(!root)return state;
    const next={...state};
    Object.keys(DEFAULTS).forEach(name=>{
      if(name==='tiles'||name==='version')return;
      const el=valueOf(name);if(!el)return;
      next[name]=el.type==='checkbox'?el.checked:safe(el.value,name==='genre'?80:name==='location'||name==='stage_name'?120:1800);
    });
    next.version=VERSION;next.tiles=normalizeTiles(state.tiles);
    return normalize(next);
  }

  async function saveSettings({manual=false}={}){
    if(!loaded)return;
    state=collectState();
    const id=await resolveCardId({createIfNeeded:true});
    if(!id){setStatus('Save the card once to create the dressing room','error');if(manual&&typeof toast==='function')toast('Save the card once, then save the Dressing Room.');return;}
    setStatus('Saving…','saving');
    try{
      const {data,error}=await supabaseClient.rpc('save_artist_settings',{p_card_id:id,p_settings:state});
      if(error)throw error;
      state=normalize(data||state);
      setStatus('Saved');
      try{localStorage.removeItem(`liw_artist_dressing_room_${id}`);}catch(_){ }
      if(manual&&typeof toast==='function')toast('Artist Dressing Room saved');
    }catch(error){
      setStatus('Save failed','error');
      try{localStorage.setItem(`liw_artist_dressing_room_${id||'new'}`,JSON.stringify(state));}catch(_){ }
      if(manual&&typeof toast==='function')toast(error?.message||'Unable to save the Dressing Room.');
      console.warn('[LIW Artist Dressing Room] save failed',error);
    }
  }
  function queueSave(){
    if(!loaded)return;
    state=collectState();setStatus('Unsaved changes','dirty');clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveSettings(),850);
  }

  async function uploadArtwork(event){
    const file=event.target.files?.[0];if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)){if(typeof toast==='function')toast('Use a PNG, JPG, or WebP image.');event.target.value='';return;}
    if(file.size>5*1024*1024){if(typeof toast==='function')toast('Release artwork must be smaller than 5 MB.');event.target.value='';return;}
    setStatus('Uploading artwork…','saving');
    try{
      const {data:{user}}=await supabaseClient.auth.getUser();if(!user)throw new Error('Sign in again to upload artwork.');
      const clean=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');
      const path=`${user.id}/artist-release-artwork/${Date.now()}-${clean}`;
      const {error}=await supabaseClient.storage.from('profile-images').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;
      const {data}=supabaseClient.storage.from('profile-images').getPublicUrl(path);
      state.release_artwork_url=data.publicUrl;const urlField=valueOf('release_artwork_url');if(urlField)urlField.value=state.release_artwork_url;
      renderArtwork();await saveSettings();if(typeof toast==='function')toast('Release artwork added');
    }catch(error){setStatus('Artwork upload failed','error');if(typeof toast==='function')toast(error?.message||'Unable to upload artwork.');}
    finally{event.target.value='';}
  }

  function bindFields(){
    root.querySelectorAll('[data-artist-field]').forEach(el=>{
      const handler=()=>{if(el.dataset.artistField==='glam_intensity'){const v=root.querySelector('[data-glam-intensity-value]');if(v)v.textContent=({1:'Subtle',2:'Stage',3:'Headliner'})[el.value]||'Headliner';}queueSave();};
      el.addEventListener('input',handler);el.addEventListener('change',handler);
    });
    root.querySelector('[data-artist-artwork-file]')?.addEventListener('change',uploadArtwork);
    root.querySelector('[data-artist-remove-artwork]')?.addEventListener('click',()=>{state.release_artwork_url='';const el=valueOf('release_artwork_url');if(el)el.value='';renderArtwork();queueSave();});
    root.querySelector('[data-artist-save-now]')?.addEventListener('click',()=>saveSettings({manual:true}));
    wireTileControls();
  }

  function build(){
    if(root)return true;
    const advanced=document.querySelector('.design-advanced-details .editor-advanced-body,.advanced-design-stack');
    if(!advanced)return false;
    root=document.createElement('section');
    root.id='artist-dressing-room';root.className='artist-dressing-room';
    root.innerHTML=`
      <div class="artist-dressing-room-hero">
        <div class="artist-dressing-room-kicker"><span class="artist-dressing-room-dot"></span>MUSIC ONLY</div>
        <div class="artist-dressing-room-heading"><div><h3><i data-lucide="sparkles" size="19"></i> Artist Dressing Room</h3><p>Set the stage before fans walk in. Releases, streaming, shows, booking and the glam of your Music card live here.</p></div><span class="artist-save-status" data-artist-save-status>Loading…</span></div>
      </div>

      <div class="artist-dressing-grid artist-dressing-grid-3">
        <label><span>Stage / artist name</span><input class="input" data-artist-field="stage_name" placeholder="Nova Luxe"></label>
        <label><span>Genre</span><input class="input" data-artist-field="genre" placeholder="R&B"></label>
        <label><span>Artist location</span><input class="input" data-artist-field="location" placeholder="Brooklyn, NY"></label>
      </div>

      <div class="artist-dressing-block">
        <div class="artist-dressing-block-head"><div><strong>Featured release</strong><span>The record fans see first on the home screen.</span></div><i data-lucide="disc-3" size="19"></i></div>
        <div class="artist-release-editor">
          <div class="artist-release-preview" data-artist-artwork-preview><i data-lucide="disc-3" size="24"></i><span>Release artwork</span></div>
          <div class="artist-release-fields">
            <label><span>Release title</span><input class="input" data-artist-field="featured_release_title" placeholder="Midnight Run"></label>
            <label><span>Listen Now link</span><input class="input" data-artist-field="listen_url" inputmode="url" placeholder="https://open.spotify.com/..."></label>
            <input type="hidden" data-artist-field="release_artwork_url">
            <div class="artist-upload-row"><label class="btn btn-light btn-sm" for="artist-release-artwork-file"><i data-lucide="upload" size="15"></i> Upload artwork</label><input hidden id="artist-release-artwork-file" data-artist-artwork-file type="file" accept="image/png,image/jpeg,image/webp"><button type="button" class="btn btn-ghost btn-sm" data-artist-remove-artwork>Remove</button></div>
          </div>
        </div>
      </div>

      <div class="artist-dressing-block">
        <div class="artist-dressing-block-head"><div><strong>Streaming room</strong><span>Add only the platforms the artist actually uses.</span></div><i data-lucide="headphones" size="19"></i></div>
        <div class="artist-dressing-grid artist-dressing-grid-2">
          <label><span>Spotify</span><input class="input" data-artist-field="spotify_url" inputmode="url" placeholder="Spotify artist or release URL"></label>
          <label><span>Apple Music</span><input class="input" data-artist-field="apple_music_url" inputmode="url" placeholder="Apple Music URL"></label>
          <label><span>YouTube</span><input class="input" data-artist-field="youtube_url" inputmode="url" placeholder="YouTube channel or video URL"></label>
          <label><span>SoundCloud</span><input class="input" data-artist-field="soundcloud_url" inputmode="url" placeholder="SoundCloud URL"></label>
          <label><span>Audiomack</span><input class="input" data-artist-field="audiomack_url" inputmode="url" placeholder="Audiomack URL"></label>
          <label><span>Tidal</span><input class="input" data-artist-field="tidal_url" inputmode="url" placeholder="Tidal URL"></label>
        </div>
      </div>

      <div class="artist-dressing-block">
        <div class="artist-dressing-block-head"><div><strong>Next show</strong><span>Dress the home screen with the next date fans can attend.</span></div><i data-lucide="ticket" size="19"></i></div>
        <div class="artist-dressing-grid artist-dressing-grid-2">
          <label><span>Date</span><input class="input" type="date" data-artist-field="upcoming_show_date"></label>
          <label><span>Venue</span><input class="input" data-artist-field="show_venue" placeholder="LIW Music Showcase"></label>
          <label><span>City</span><input class="input" data-artist-field="show_city" placeholder="Brooklyn, NY"></label>
          <label><span>Ticket link</span><input class="input" data-artist-field="ticket_url" inputmode="url" placeholder="https://..."></label>
        </div>
      </div>

      <div class="artist-dressing-block">
        <div class="artist-dressing-block-head"><div><strong>Backstage doors</strong><span>Where each full-screen artist room gets its content or destination.</span></div><i data-lucide="door-open" size="19"></i></div>
        <div class="artist-dressing-grid artist-dressing-grid-2">
          <label><span>Fan Club / Inner Circle link</span><input class="input" data-artist-field="fan_signup_url" inputmode="url" placeholder="Signup, fan club or community URL"></label>
          <label><span>EPK / press kit link</span><input class="input" data-artist-field="epk_url" inputmode="url" placeholder="EPK or press kit URL"></label>
          <label><span>Booking link</span><input class="input" data-artist-field="booking_url" inputmode="url" placeholder="Booking form or management URL"></label>
          <label><span>Merch link</span><input class="input" data-artist-field="merch_url" inputmode="url" placeholder="Merch store URL"></label>
          <label><span>Gallery link</span><input class="input" data-artist-field="gallery_url" inputmode="url" placeholder="Gallery or photos URL"></label>
          <label><span>Inner Circle title</span><input class="input" data-artist-field="inner_circle_label" maxlength="90" placeholder="Join the Inner Circle"></label>
        </div>
        <div class="artist-toggle-row"><label class="artist-wide-switch"><input type="checkbox" data-artist-field="inner_circle_enabled"><span></span><b>Show Inner Circle teaser on home screen</b></label><label class="artist-wide-switch"><input type="checkbox" data-artist-field="artist_mode_badge"><span></span><b>Show Artist Mode badge</b></label></div>
      </div>

      <div class="artist-dressing-block">
        <div class="artist-dressing-block-head"><div><strong>Glitz & glamour</strong><span>Set the visual mood without changing the artist’s content.</span></div><i data-lucide="wand-sparkles" size="19"></i></div>
        <div class="artist-glam-presets">
          <label><input type="radio" name="artist_glam_preset" value="nova_violet" data-artist-field="glam_preset"><span><i class="artist-glam-swatch glam-violet"></i><b>Nova Violet</b><small>Purple + electric blue</small></span></label>
          <label><input type="radio" name="artist_glam_preset" value="gold_luxe" data-artist-field="glam_preset"><span><i class="artist-glam-swatch glam-gold"></i><b>Gold Luxe</b><small>Black + champagne gold</small></span></label>
          <label><input type="radio" name="artist_glam_preset" value="rose_chrome" data-artist-field="glam_preset"><span><i class="artist-glam-swatch glam-rose"></i><b>Rose Chrome</b><small>Magenta + chrome pink</small></span></label>
          <label><input type="radio" name="artist_glam_preset" value="ice_blue" data-artist-field="glam_preset"><span><i class="artist-glam-swatch glam-ice"></i><b>Ice Blue</b><small>Blue + platinum glow</small></span></label>
        </div>
        <label class="artist-intensity"><span><b>Stage glow</b><em data-glam-intensity-value>Headliner</em></span><input type="range" min="1" max="3" step="1" data-artist-field="glam_intensity"></label>
      </div>

      <div class="artist-dressing-block">
        <div class="artist-dressing-block-head"><div><strong>Home buttons</strong><span>Choose what fans see and arrange the 3×3 artist controls. Each opens its own full-screen room.</span></div><i data-lucide="layout-grid" size="19"></i></div>
        <div class="artist-toggle-row artist-grid-label-toggle"><label class="artist-wide-switch"><input type="checkbox" data-artist-field="grid_labels"><span></span><b>Show text under grid icons</b></label><small>Turn this off for a cleaner app-style grid with larger icons.</small></div>
        <div class="artist-tile-list" data-artist-tile-list></div>
      </div>

      <div class="artist-dressing-savebar"><div><strong>Your Dressing Room autosaves</strong><span>Use Save now when you want immediate confirmation.</span></div><button type="button" class="btn btn-primary" data-artist-save-now><i data-lucide="sparkles" size="16"></i> Save Dressing Room</button></div>`;

    advanced.prepend(root);
    bindFields();syncVisibility();loadSettings();if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function syncVisibility(){
    if(!root)return;
    const active=isMusic();root.hidden=!active;
    document.querySelector('.design-advanced-details')?.classList.toggle('has-artist-dressing-room',active);
  }

  document.addEventListener('click',event=>{
    if(event.target.closest?.('[data-card-experience]'))setTimeout(syncVisibility,0);
  },true);
  setInterval(syncVisibility,500);

  let tries=0;const timer=setInterval(()=>{tries+=1;if(build()||tries>80)clearInterval(timer);},200);build();
})();