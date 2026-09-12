/* LIW Cards staging — Music-only media rooms.
   Keeps video and gallery inside LIW; upgrades streaming destinations with brand icons.
   Room enhancement is event-driven only: no document-wide observer or polling loop. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_MEDIA_ROOMS__)return;
  window.__LIW_MUSIC_MEDIA_ROOMS__=true;

  let settings=null;
  let settingsPromise=null;
  let activeLightbox=null;

  function cardData(){try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(cardData()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=2400){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function icon(name,size=18){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function closeRoom(){document.querySelector('.music-artist-room.open .music-artist-room-close')?.click();}
  function artistName(){return safe(document.getElementById('name')?.textContent||cardData()?.full_name||'Artist',120)||'Artist';}
  function roomTitle(room){return safe(room?.querySelector('[data-music-room-title]')?.textContent,40).toLowerCase();}

  async function loadSettings(){
    if(settings)return settings;
    if(settingsPromise)return settingsPromise;
    settingsPromise=(async()=>{
      const data=cardData()||{};
      const slug=safe(data.slug||new URLSearchParams(location.search).get('slug'),160);
      if(!slug||typeof supabaseClient==='undefined')return {};
      try{
        const {data:row,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});
        if(error)throw error;
        settings=row&&typeof row==='object'&&!Array.isArray(row)?row:{};
      }catch(error){
        console.warn('[LIW Music Media] artist settings unavailable',error);
        settings={};
      }
      return settings;
    })();
    return settingsPromise;
  }

  function platformIcon(key){
    try{
      if(typeof socialIconHtml==='function'){
        const aliases={spotify:'spotify',apple:'applemusic',youtube:'youtube',soundcloud:'soundcloud',audiomack:'audiomack'};
        const mapped=aliases[key];
        if(mapped)return socialIconHtml(mapped,{size:24});
      }
    }catch(_){ }
    const fallback={spotify:'circle-play',apple:'music-2',youtube:'play',soundcloud:'cloud',audiomack:'radio',tidal:'waves'};
    return icon(fallback[key]||'headphones',23);
  }

  function backBar(copy){
    const node=document.createElement('div');
    node.className='music-media-retain';
    node.innerHTML=`<span>${icon('sparkles',15)} ${esc(copy)}</span><button type="button">${icon('arrow-left',16)} Back to Artist Card</button>`;
    node.querySelector('button').addEventListener('click',closeRoom);
    return node;
  }

  function externalOpen(href,label){
    const a=document.createElement('a');
    a.href=href;a.target='_blank';a.rel='noopener';a.className='music-platform-card';
    a.setAttribute('aria-label',`${label} — opens in a new tab`);
    return a;
  }

  function musicDestinations(s){
    return [
      {key:'spotify',label:'Spotify',href:safe(s.spotify_url),color:'#1ed760'},
      {key:'apple',label:'Apple Music',href:safe(s.apple_music_url),color:'#fa2d48'},
      {key:'youtube',label:'YouTube Music',href:safe(s.youtube_url),color:'#ff0033'},
      {key:'soundcloud',label:'SoundCloud',href:safe(s.soundcloud_url),color:'#ff6800'},
      {key:'audiomack',label:'Audiomack',href:safe(s.audiomack_url),color:'#ffa200'},
      {key:'tidal',label:'TIDAL',href:safe(s.tidal_url),color:'#e7f2ff'}
    ].filter(item=>item.href);
  }

  function buildMusicRoom(s){
    const data=cardData()||{};
    const wrap=document.createElement('div');wrap.className='music-media-stage music-media-music';
    const release=safe(s.featured_release_title||data.video_title||data.headline||'Latest Release',180);
    const art=safe(s.release_artwork_url||data.cover_image_url||data.profile_image_url,1600);
    const destinations=musicDestinations(s);

    const hero=document.createElement('section');hero.className='music-listen-hero';
    hero.innerHTML=`<div class="music-listen-art"${art?` style="background-image:url('${art.replace(/'/g,'%27')}')"`:''}>${art?'':icon('disc-3',34)}<span class="music-listen-pulse">${icon('play',20)}</span></div><div class="music-listen-copy"><small>LISTEN TO ${esc(artistName()).toUpperCase()}</small><h2>${esc(release)}</h2><p>Choose where you listen. The Artist Card stays open so you can come right back.</p></div>`;
    wrap.appendChild(hero);

    if(destinations.length){
      const label=document.createElement('div');label.className='music-media-section-label';label.innerHTML='<strong>STREAMING</strong><span>Pick a platform</span>';wrap.appendChild(label);
      const grid=document.createElement('div');grid.className='music-platform-grid';
      destinations.forEach(item=>{
        const a=externalOpen(item.href,item.label);a.style.setProperty('--platform-color',item.color);
        a.innerHTML=`<span class="music-platform-icon">${platformIcon(item.key)}</span><span class="music-platform-copy"><strong>${esc(item.label)}</strong><small>Listen now</small></span><span class="music-platform-arrow">${icon('arrow-up-right',18)}</span>`;
        grid.appendChild(a);
      });
      wrap.appendChild(grid);
    }else{
      const empty=document.createElement('div');empty.className='music-media-empty';empty.innerHTML=`${icon('headphones',28)}<strong>Streaming links coming soon</strong><span>${esc(artistName())} can add Spotify, Apple Music, SoundCloud and more in Artist Dressing Room.</span>`;wrap.appendChild(empty);
    }
    wrap.appendChild(backBar('Listen, return, and keep exploring.'));
    return wrap;
  }

  function youtubeEmbed(url){
    const raw=safe(url,1800);if(!raw)return '';
    try{
      const u=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);
      let id='';
      if(/youtu\.be$/i.test(u.hostname))id=u.pathname.split('/').filter(Boolean)[0]||'';
      else if(/youtube\.com$/i.test(u.hostname)||/www\.youtube\.com$/i.test(u.hostname)||/m\.youtube\.com$/i.test(u.hostname)){
        if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
        else if(/^\/(shorts|embed)\//.test(u.pathname))id=u.pathname.split('/').filter(Boolean)[1]||'';
      }
      return /^[A-Za-z0-9_-]{6,20}$/.test(id)?`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`:'';
    }catch(_){return '';}
  }

  function videoSource(s){
    const data=cardData()||{};
    const existing=document.querySelector('#video-section iframe[src]');
    if(existing?.src)return {type:'embed',src:existing.src,title:safe(data.video_title||'Featured Video',160)};
    const raw=safe(data.video_url||s.video_url||s.youtube_url,1800);
    if(!raw)return null;
    const yt=youtubeEmbed(raw);if(yt)return {type:'embed',src:yt,title:safe(data.video_title||s.featured_release_title||'Featured Video',160)};
    if(/\.(mp4|webm|ogg)(\?|#|$)/i.test(raw))return {type:'file',src:raw,title:safe(data.video_title||'Featured Video',160)};
    try{
      const u=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);
      if(/vimeo\.com$/i.test(u.hostname)||/www\.vimeo\.com$/i.test(u.hostname)){
        const id=u.pathname.split('/').filter(Boolean).pop();
        if(/^\d+$/.test(id))return {type:'embed',src:`https://player.vimeo.com/video/${id}`,title:safe(data.video_title||'Featured Video',160)};
      }
    }catch(_){ }
    return null;
  }

  function buildVideoRoom(s){
    const wrap=document.createElement('div');wrap.className='music-media-stage music-media-video';
    const src=videoSource(s);
    const hero=document.createElement('div');hero.className='music-media-intro';hero.innerHTML=`<span>${icon('clapperboard',23)}</span><div><small>WATCH ON LIW</small><h2>${esc(artistName())} Videos</h2><p>Watch here without leaving the Artist Card.</p></div>`;wrap.appendChild(hero);
    if(src){
      const player=document.createElement('div');player.className='music-inline-video';
      if(src.type==='file')player.innerHTML=`<video controls playsinline preload="metadata" src="${esc(src.src)}"></video>`;
      else player.innerHTML=`<iframe src="${esc(src.src)}" title="${esc(src.title)}" loading="eager" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      const title=document.createElement('div');title.className='music-video-caption';title.innerHTML=`<small>FEATURED VIDEO</small><strong>${esc(src.title)}</strong>`;
      wrap.appendChild(player);wrap.appendChild(title);
    }else{
      const empty=document.createElement('div');empty.className='music-media-empty';empty.innerHTML=`${icon('video',28)}<strong>No playable video yet</strong><span>Add a YouTube video, Vimeo video, or direct video file to show it right here inside LIW.</span>`;wrap.appendChild(empty);
    }
    wrap.appendChild(backBar('Finish watching, then jump back into the Artist Card.'));
    return wrap;
  }

  function uniqueImages(s){
    const data=cardData()||{};const out=[];const seen=new Set();
    const add=(url,label='Artist photo')=>{const value=safe(url,1800);if(!value||seen.has(value))return;seen.add(value);out.push({url:value,label});};
    if(Array.isArray(s.gallery_images))s.gallery_images.forEach((url,i)=>add(url,`${artistName()} gallery photo ${i+1}`));
    document.querySelectorAll('#gallery-section img[src], [data-public-rich="gallery"] img[src], .public-gallery-grid img[src], .public-rich-gallery img[src], [data-rich-type="gallery"] img[src]').forEach((img,i)=>add(img.currentSrc||img.src,img.alt||`${artistName()} gallery photo ${i+1}`));
    add(s.release_artwork_url,'Release artwork');
    add(data.cover_image_url,'Artist cover');
    add(data.profile_image_url,'Artist portrait');
    return out.slice(0,24);
  }

  function openLightbox(images,index){
    activeLightbox?.remove();
    let current=Math.max(0,Math.min(index,images.length-1));
    const box=document.createElement('div');box.className='music-gallery-lightbox';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Gallery photo viewer');
    box.innerHTML=`<button class="music-gallery-lightbox-close" type="button" aria-label="Close photo">${icon('x',22)}</button><button class="music-gallery-lightbox-prev" type="button" aria-label="Previous photo">${icon('chevron-left',24)}</button><figure><img alt=""><figcaption></figcaption></figure><button class="music-gallery-lightbox-next" type="button" aria-label="Next photo">${icon('chevron-right',24)}</button>`;
    const img=box.querySelector('img'),caption=box.querySelector('figcaption');
    const render=()=>{img.src=images[current].url;img.alt=images[current].label;caption.textContent=`${current+1} / ${images.length}`;box.querySelector('.music-gallery-lightbox-prev').disabled=images.length<2;box.querySelector('.music-gallery-lightbox-next').disabled=images.length<2;};
    box.querySelector('.music-gallery-lightbox-close').addEventListener('click',()=>{box.remove();activeLightbox=null;});
    box.querySelector('.music-gallery-lightbox-prev').addEventListener('click',()=>{current=(current-1+images.length)%images.length;render();});
    box.querySelector('.music-gallery-lightbox-next').addEventListener('click',()=>{current=(current+1)%images.length;render();});
    box.addEventListener('click',event=>{if(event.target===box){box.remove();activeLightbox=null;}});
    document.querySelector('.music-artist-room.open')?.appendChild(box);activeLightbox=box;render();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function buildGalleryRoom(s){
    const images=uniqueImages(s);const wrap=document.createElement('div');wrap.className='music-media-stage music-media-gallery';
    const intro=document.createElement('div');intro.className='music-media-intro';intro.innerHTML=`<span>${icon('images',23)}</span><div><small>ARTIST GALLERY</small><h2>Inside ${esc(artistName())}'s world</h2><p>Tap any photo for a full-screen view — everything stays inside LIW.</p></div>`;wrap.appendChild(intro);
    if(images.length){
      const grid=document.createElement('div');grid.className='music-gallery-grid';
      images.forEach((item,index)=>{
        const button=document.createElement('button');button.type='button';button.className=`music-gallery-card${index===0?' featured':''}`;button.setAttribute('aria-label',`View ${item.label}`);
        button.innerHTML=`<img src="${esc(item.url)}" alt="${esc(item.label)}" loading="${index<4?'eager':'lazy'}"><span>${icon('maximize-2',16)}</span>`;
        button.addEventListener('click',()=>openLightbox(images,index));grid.appendChild(button);
      });
      wrap.appendChild(grid);
    }else{
      const empty=document.createElement('div');empty.className='music-media-empty';empty.innerHTML=`${icon('images',28)}<strong>Gallery coming soon</strong><span>Artist photos will appear right here inside the LIW Artist Card.</span>`;wrap.appendChild(empty);
    }
    wrap.appendChild(backBar('Stay in the gallery or head back to the artist home.'));
    return wrap;
  }

  function cleanBody(body,target){
    Array.from(body.children).forEach(child=>{
      if(child===target)return;
      child.remove();
    });
    if(target){target.hidden=true;target.style.display='none';}
  }

  async function enhance(){
    if(!isMusic())return false;
    const room=document.querySelector('.music-artist-room.open');if(!room)return false;
    const title=roomTitle(room);const mode=title==='music'?'music':title==='videos'?'video':title==='gallery'?'gallery':'';
    if(!mode)return false;
    const body=room.querySelector('[data-music-room-body]');if(!body)return false;
    if(room.dataset.musicMediaMode===mode&&body.querySelector('.music-media-stage'))return true;
    const s=await loadSettings();
    if(!room.classList.contains('open')||roomTitle(room)!==title)return false;
    const target=mode==='video'
      ?body.querySelector('#video-section')
      :mode==='gallery'
        ?body.querySelector('#gallery-section,[data-public-rich="gallery"]')
        :null;
    cleanBody(body,target);
    const view=mode==='music'?buildMusicRoom(s):mode==='video'?buildVideoRoom(s):buildGalleryRoom(s);
    body.prepend(view);room.dataset.musicMediaMode=mode;
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function refreshRoom(){
    enhance().catch(error=>console.warn('[LIW Music Media] room enhancement failed',error));
  }

  window.addEventListener('liw:showtime-room-open',refreshRoom,{passive:true});
  window.addEventListener('liw:card-loader-ready',()=>{if(isMusic())loadSettings().catch(()=>{});},{once:true,passive:true});
  loadSettings().catch(()=>{});
  refreshRoom();
})();