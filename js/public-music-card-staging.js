(function(){
  'use strict';
  const MUSIC_VALUE='music';
  let starting=false;
  let activeRoomKey='';
  let activeRoomNode=null;
  let parking=null;
  let artistSettings={};

  function ensureRoomStyles(){
    if(document.querySelector('link[data-liw-music-artist-rooms]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/music-artist-rooms-staging.css?v=20260904-rooms-1';
    link.dataset.liwMusicArtistRooms='true';
    document.head.appendChild(link);
  }
  ensureRoomStyles();

  function cardData(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function shouldActivate(data){return String(data?.card_experience||'').toLowerCase()===MUSIC_VALUE;}
  function visible(element){return Boolean(element&&!element.hidden);}
  function track(name,target,meta){try{if(typeof window.track==='function')window.track(name,target,meta);}catch(_){}}
  function esc(value=''){try{return typeof escapeHtml==='function'?escapeHtml(value):String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}catch(_){return String(value);}}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function icon(name,size=24){return `<i data-lucide="${name}" size="${size}"></i>`;}

  async function loadArtistSettings(data){
    const slug=safe(data?.slug||new URLSearchParams(location.search).get('slug'),160);
    if(!slug||typeof supabaseClient==='undefined')return {};
    try{
      const {data:settings,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});
      if(error)throw error;
      return settings&&typeof settings==='object'&&!Array.isArray(settings)?settings:{};
    }catch(error){console.warn('[LIW Music] Dressing Room settings unavailable:',error);return {};}
  }

  function streamingLinksFromDom(){
    return Array.from(document.querySelectorAll('#socials a[href]')).filter(link=>/spotify|music\.apple|soundcloud|youtube|tidal|audiomack|bandcamp|deezer|amazon.*music/i.test(link.href));
  }
  function streamingDestinations(){
    const configured=[
      ['Spotify','spotify',artistSettings.spotify_url],['Apple Music','music',artistSettings.apple_music_url],['YouTube','youtube',artistSettings.youtube_url],
      ['SoundCloud','cloud',artistSettings.soundcloud_url],['Audiomack','radio',artistSettings.audiomack_url],['Tidal','waves',artistSettings.tidal_url]
    ].filter(([, ,href])=>safe(href));
    if(configured.length)return configured;
    return streamingLinksFromDom().map(link=>[safe(link.textContent)||'Listen','headphones',link.href]);
  }
  function listenHref(data){return safe(artistSettings.listen_url)||safe(streamingDestinations()[0]?.[2])||safe(data?.website);}

  function applyDressingRoomIdentity(data,card){
    const name=document.getElementById('name');
    const title=document.getElementById('title');
    const company=document.getElementById('company');
    if(name&&safe(artistSettings.stage_name))name.textContent=safe(artistSettings.stage_name,120);
    const identity=[safe(artistSettings.genre,80),safe(artistSettings.location,120)].filter(Boolean).join(' • ');
    if(title&&identity){title.textContent=identity;title.hidden=false;if(company)company.hidden=true;}
    const preset=['nova_violet','gold_luxe','rose_chrome','ice_blue'].includes(artistSettings.glam_preset)?artistSettings.glam_preset:'nova_violet';
    card.classList.remove('glam-nova-violet','glam-gold-luxe','glam-rose-chrome','glam-ice-blue');
    card.classList.add(`glam-${preset.replace(/_/g,'-')}`);
    card.dataset.glamIntensity=['1','2','3'].includes(String(artistSettings.glam_intensity))?String(artistSettings.glam_intensity):'3';
  }

  function buildCoverChrome(data,cover){
    if(cover.querySelector('.music-brand-lockup'))return;
    const brand=document.createElement('div');brand.className='music-brand-lockup';brand.innerHTML='<strong>LIW</strong><span>ARTIST CARD</span>';cover.prepend(brand);
    const mode=document.createElement('div');mode.className='music-mode-pill';mode.innerHTML='<span></span> ARTIST MODE';mode.hidden=artistSettings.artist_mode_badge===false;cover.appendChild(mode);
    const aura=document.createElement('div');aura.className='music-hero-aura';cover.appendChild(aura);
  }

  function createRoom(){
    if(document.querySelector('.music-artist-room'))return document.querySelector('.music-artist-room');
    const room=document.createElement('section');
    room.className='music-artist-room';room.setAttribute('role','dialog');room.setAttribute('aria-modal','true');room.setAttribute('aria-hidden','true');
    room.innerHTML=`<header class="music-artist-room-head"><div class="music-artist-room-title"><span class="music-artist-room-mark">${icon('sparkles',18)}</span><div><small>LIW ARTIST CARD</small><strong data-music-room-title>Artist Room</strong></div></div><button class="music-artist-room-close" type="button" aria-label="Close artist room">${icon('x',21)}</button></header><div class="music-artist-room-body" data-music-room-body></div>`;
    room.querySelector('.music-artist-room-close').addEventListener('click',closeRoom);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&room.classList.contains('open'))closeRoom();});
    document.body.appendChild(room);return room;
  }

  const ROOM_META={
    music:{title:'Music',icon:'music-2',target:''},videos:{title:'Videos',icon:'play-square',target:'video-section'},shows:{title:'Shows',icon:'ticket',target:'services-section'},
    merch:{title:'Merch',icon:'shirt',target:'products-section'},gallery:{title:'Gallery',icon:'image',target:'gallery-section'},fan_club:{title:'Fan Club',icon:'crown',target:'lead-section'},
    epk:{title:'EPK',icon:'file-text',target:'downloads-section'},book:{title:'Book Me',icon:'calendar-days',target:'lead-section'},social:{title:'Social',icon:'users',target:'social-section'}
  };
  function roomLinkFor(key){return ({videos:artistSettings.youtube_url,shows:artistSettings.ticket_url,merch:artistSettings.merch_url,gallery:artistSettings.gallery_url,fan_club:artistSettings.fan_signup_url,epk:artistSettings.epk_url,book:artistSettings.booking_url})[key]||'';}
  function roomEmpty(key,link=''){
    const meta=ROOM_META[key]||{title:'Artist',icon:'sparkles'};
    return `<div class="music-room-empty"><div><span class="music-room-empty-icon">${icon(meta.icon,27)}</span><h3>${esc(meta.title)}</h3><p>This room is ready for the artist to dress with content in Artist Dressing Room.</p>${link?`<a class="music-room-link" href="${esc(link)}" target="_blank" rel="noopener">Open ${esc(meta.title)} ${icon('external-link',16)}</a>`:''}</div></div>`;
  }
  function musicRoomMarkup(data){
    const destinations=streamingDestinations();
    const release=safe(artistSettings.featured_release_title)||safe(data?.video_title)||safe(data?.headline)||'Latest Release';
    if(!destinations.length&&!listenHref(data))return roomEmpty('music');
    const primary=listenHref(data);
    const rows=destinations.map(([label,iconName,href])=>`<a href="${esc(href)}" target="_blank" rel="noopener"><span>${icon(iconName,18)} ${esc(label)}</span>${icon('arrow-up-right',17)}</a>`).join('');
    return `<div class="music-streaming-room"><div class="music-streaming-hero"><small>NOW PLAYING</small><h2>${esc(release)}</h2>${primary?`<a class="music-room-link" href="${esc(primary)}" target="_blank" rel="noopener">Listen now ${icon('play',16)}</a>`:''}</div>${rows?`<div class="music-streaming-links">${rows}</div>`:''}</div>`;
  }

  function parkSections(content){
    if(parking)return;
    parking=document.createElement('div');parking.className='music-section-parking';parking.setAttribute('aria-hidden','true');
    const branding=document.getElementById('branding');content.insertBefore(parking,branding||null);
    ['video-section','services-section','products-section','gallery-section','social-section','downloads-section','lead-section','payment-sharing-section'].forEach(id=>{const section=document.getElementById(id);if(section)parking.appendChild(section);});
  }
  function returnActiveRoomNode(){if(activeRoomNode&&parking){parking.appendChild(activeRoomNode);activeRoomNode=null;}}
  function appendExternalCta(body,key){
    const href=safe(roomLinkFor(key));if(!href)return;
    const meta=ROOM_META[key];const wrap=document.createElement('div');wrap.style.cssText='padding:14px 0 2px;text-align:center';wrap.innerHTML=`<a class="music-room-link" href="${esc(href)}" target="_blank" rel="noopener">Open ${esc(meta.title)} ${icon('external-link',16)}</a>`;body.appendChild(wrap);
  }
  function openRoom(key){
    const data=cardData()||{};const meta=ROOM_META[key]||ROOM_META.music;const room=createRoom();const body=room.querySelector('[data-music-room-body]');
    returnActiveRoomNode();body.innerHTML='';room.querySelector('[data-music-room-title]').textContent=meta.title;room.querySelector('.music-artist-room-mark').innerHTML=icon(meta.icon,18);
    if(key==='music')body.innerHTML=musicRoomMarkup(data);
    else{
      const target=meta.target?document.getElementById(meta.target):null;
      if(target){activeRoomNode=target;target.hidden=false;body.appendChild(target);appendExternalCta(body,key);}
      else body.innerHTML=roomEmpty(key,safe(roomLinkFor(key)));
    }
    activeRoomKey=key;room.classList.add('open');room.setAttribute('aria-hidden','false');document.documentElement.classList.add('music-room-open');
    room.querySelector('.music-artist-room-close')?.focus();track('music_room_open',key,{experience:'music'});if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }
  function closeRoom(){
    const room=document.querySelector('.music-artist-room');if(!room)return;
    returnActiveRoomNode();room.classList.remove('open');room.setAttribute('aria-hidden','true');document.documentElement.classList.remove('music-room-open');track('music_room_close',activeRoomKey,{experience:'music'});activeRoomKey='';
  }

  function buildPrimaryCta(data,content){
    if(content.querySelector('.music-primary-cta'))return;
    const cta=document.createElement('button');cta.type='button';cta.className='music-primary-cta';cta.innerHTML=`${icon('play',19)}<span>LISTEN NOW</span>`;cta.addEventListener('click',()=>openRoom('music'));
    const company=document.getElementById('company');const title=document.getElementById('title');const anchor=(company&&!company.hidden?company:title)||document.getElementById('name');anchor?.insertAdjacentElement('afterend',cta);
  }
  function buildReleaseCard(data,content){
    if(content.querySelector('.music-release-card'))return;
    const title=safe(artistSettings.featured_release_title)||safe(data?.video_title)||safe(data?.headline)||'Latest Release';const artwork=safe(artistSettings.release_artwork_url)||safe(data?.cover_image_url)||safe(data?.profile_image_url);
    const card=document.createElement('button');card.type='button';card.className='music-release-card';
    const bars=Array.from({length:34},(_,i)=>`<span style="--h:${22+((i*17)%58)}%"></span>`).join('');
    card.innerHTML=`<div class="music-release-art"${artwork?` style="background-image:url('${artwork.replace(/'/g,'%27')}')"`:''}>${artwork?'':icon('disc-3',26)}</div><div class="music-release-copy"><small>LATEST RELEASE</small><strong>${esc(title)}</strong><div class="music-waveform">${bars}</div></div><span class="music-release-play">${icon('play',19)}</span>`;
    card.addEventListener('click',()=>openRoom('music'));content.querySelector('.music-primary-cta')?.insertAdjacentElement('afterend',card);
  }
  function tile(key,index){
    const meta=ROOM_META[key]||ROOM_META.music;const node=document.createElement('button');node.type='button';node.className=`music-luxe-tile music-accent-${index%2?'blue':'violet'}`;node.innerHTML=`<span class="music-luxe-icon">${icon(meta.icon,27)}</span><strong>${meta.title}</strong>`;node.addEventListener('click',()=>openRoom(key));return node;
  }
  function normalizedTiles(){
    const configured=Array.isArray(artistSettings.tiles)?artistSettings.tiles:[];const seen=new Set();const rows=[];
    configured.forEach(row=>{const key=safe(row?.key,40);if(ROOM_META[key]&&!seen.has(key)){seen.add(key);if(row?.visible!==false)rows.push(key);}});
    Object.keys(ROOM_META).forEach(key=>{if(!seen.has(key))rows.push(key);});return rows.slice(0,9);
  }
  function buildLauncher(data,content){
    if(content.querySelector('.music-luxe-launcher'))return;
    const launcher=document.createElement('section');launcher.className='music-luxe-launcher';launcher.setAttribute('aria-label','Artist rooms');const grid=document.createElement('div');grid.className='music-luxe-grid';normalizedTiles().forEach((key,index)=>grid.appendChild(tile(key,index)));launcher.appendChild(grid);content.querySelector('.music-release-card')?.insertAdjacentElement('afterend',launcher);
  }
  function buildInnerCircle(content){
    if(content.querySelector('.music-inner-circle')||artistSettings.inner_circle_enabled===false)return;
    const panel=document.createElement('section');panel.className='music-inner-circle';panel.innerHTML=`<div class="music-inner-copy"><span class="music-diamond">${icon('gem',22)}</span><div><strong>${esc(safe(artistSettings.inner_circle_label,90)||'Join the Inner Circle')}</strong><small>Be the first to hear updates, drops & more.</small></div></div><div class="music-inner-action"><span>Email or Phone Number</span><button type="button">JOIN</button></div>`;panel.querySelector('button').addEventListener('click',()=>openRoom('fan_club'));content.querySelector('.music-luxe-launcher')?.insertAdjacentElement('afterend',panel);
  }
  function showLabel(){
    const date=safe(artistSettings.upcoming_show_date,40);const venue=safe(artistSettings.show_venue,140);const city=safe(artistSettings.show_city,120);
    let displayDate=date;if(/^\d{4}-\d{2}-\d{2}$/.test(date)){try{displayDate=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00`));}catch(_){}}
    return [displayDate,venue,city].filter(Boolean).join(' • ');
  }
  function buildUpcomingShow(content){
    if(content.querySelector('.music-upcoming-show'))return;
    const configured=showLabel();const firstCard=document.querySelector('#services .public-service-card,#services > *');const raw=safe(firstCard?.textContent).replace(/\s+/g,' ').trim();const label=configured||raw.slice(0,70);if(!label&&!safe(artistSettings.ticket_url))return;
    const strip=document.createElement('button');strip.type='button';strip.className='music-upcoming-show';strip.innerHTML=`<span class="music-show-icon">${icon('calendar-days',20)}</span><span class="music-show-copy"><small>UPCOMING SHOW</small><strong>${esc(label||'View upcoming dates')}</strong></span><span class="music-show-link">Get tickets</span>${icon('chevron-right',18)}`;strip.addEventListener('click',()=>openRoom('shows'));const inner=content.querySelector('.music-inner-circle')||content.querySelector('.music-luxe-launcher');inner?.insertAdjacentElement('afterend',strip);
  }
  function renameSections(){
    const names={'video-section':['Featured video','Watch'],'services-section':['Shows & Tour','Live dates'],'products-section':['Merch & Drops','Shop the artist'],'social-section':['Follow the Artist','Stay connected'],'downloads-section':['EPK & Press Kit','Media & downloads'],'lead-section':['Book the Artist','Management & bookings']};
    Object.entries(names).forEach(([id,[title,sub]])=>{const section=document.getElementById(id);if(!section)return;const h=section.querySelector('.public-section-heading h2,.public-rich-head h2');const s=section.querySelector('.public-section-heading span,.public-rich-head span');if(h)h.textContent=title;if(s)s.textContent=sub;});
  }
  function buildFooter(content){
    const branding=document.getElementById('branding');if(!branding||branding.dataset.musicLuxe==='true')return;branding.dataset.musicLuxe='true';branding.classList.add('music-luxe-footer');branding.innerHTML='<strong>LIW</strong><span>LINK IN WORLDWIDE</span>';
  }

  async function activate(){
    const data=cardData();const card=document.getElementById('card');const content=card?.querySelector('.public-content');
    if(!data||!card||!content||card.hidden||card.dataset.musicReady==='dressing-room-v1'||!shouldActivate(data)||starting)return false;if(card.classList.contains('swipe-card-active'))return false;
    starting=true;
    try{
      artistSettings=await loadArtistSettings(data);
      card.dataset.musicReady='dressing-room-v1';card.dataset.cardExperience='music';card.classList.add('music-card-active');document.body.classList.add('music-page-active');
      applyDressingRoomIdentity(data,card);buildCoverChrome(data,document.getElementById('public-cover'));renameSections();buildPrimaryCta(data,content);buildReleaseCard(data,content);buildLauncher(data,content);buildInnerCircle(content);buildUpcomingShow(content);buildFooter(content);parkSections(content);createRoom();
      const save=document.getElementById('save');if(save){save.classList.add('music-save-artist');save.innerHTML=`${icon('user-round-plus',18)} Save Artist`;}
      if(window.lucide)try{lucide.createIcons();}catch(_){ }
      return true;
    }finally{starting=false;}
  }

  let attempts=0;const timer=setInterval(()=>{attempts+=1;activate().then(done=>{if(done||attempts>90)clearInterval(timer);}).catch(error=>{console.warn('[LIW Music] activation failed',error);if(attempts>90)clearInterval(timer);});},175);
})();
