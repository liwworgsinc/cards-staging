/* LIW Cards staging — Music-only inline Spotify + SoundCloud players.
   Event-driven, tap-to-play and mobile-safe; no document-wide observer. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_INLINE_AUDIO__)return;
  window.__LIW_MUSIC_INLINE_AUDIO__=true;

  let settings=null;
  let settingsPromise=null;
  let scheduled=false;

  function cardData(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(cardData()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function artistName(){return safe(document.getElementById('name')?.textContent||cardData()?.full_name||'Artist',120)||'Artist';}
  function currentRoom(){return document.querySelector('.music-artist-room.open');}
  function roomTitle(room=currentRoom()){return safe(room?.querySelector('[data-music-room-title]')?.textContent,40).toLowerCase();}

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
        console.warn('[LIW Inline Audio] artist settings unavailable',error);
        settings={};
      }
      return settings;
    })();
    return settingsPromise;
  }

  function spotifyPlayer(raw){
    const value=safe(raw);if(!value)return null;
    try{
      const u=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`);
      const host=u.hostname.toLowerCase().replace(/^www\./,'');
      if(host!=='open.spotify.com')return null;
      const parts=u.pathname.split('/').filter(Boolean);
      if(parts[0]==='embed')parts.shift();
      if(/^intl-[a-z-]+$/i.test(parts[0]||''))parts.shift();
      const type=String(parts[0]||'').toLowerCase();
      const id=String(parts[1]||'');
      const allowed=new Set(['track','album','playlist','artist','episode','show']);
      if(!allowed.has(type)||!/^[A-Za-z0-9]{8,64}$/.test(id))return null;
      return {
        provider:'spotify',
        label:'Spotify',
        height:(type==='track'||type==='episode')?152:352,
        src:`https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator`
      };
    }catch(_){return null;}
  }

  function soundcloudPlayer(raw){
    const value=safe(raw);if(!value)return null;
    try{
      const u=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`);
      const host=u.hostname.toLowerCase();
      if(!/^(www\.|m\.)?soundcloud\.com$/.test(host))return null;
      const parts=u.pathname.split('/').filter(Boolean);
      if(parts.length<2)return null;
      const page=parts[0].toLowerCase();
      if(['discover','stream','you','search','charts'].includes(page))return null;
      u.hash='';
      return {
        provider:'soundcloud',
        label:'SoundCloud',
        height:166,
        src:`https://w.soundcloud.com/player/?url=${encodeURIComponent(u.toString())}&color=%238b5cf6&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=false`
      };
    }catch(_){return null;}
  }

  function playersFromSettings(s){
    return [spotifyPlayer(s?.spotify_url),soundcloudPlayer(s?.soundcloud_url)].filter(Boolean);
  }

  function stopPlayers(){
    document.querySelectorAll('.music-inline-audio iframe').forEach(frame=>{
      try{frame.src='about:blank';}catch(_){ }
    });
  }

  function renderPlayer(shell,frame,player){
    shell.dataset.provider=player.provider;
    shell.style.setProperty('--music-inline-audio-height',`${player.height}px`);
    frame.title=`${player.label} player for ${artistName()}`;
    frame.src=player.src;
    shell.querySelectorAll('.music-inline-audio-tab').forEach(button=>{
      const active=button.dataset.provider===player.provider;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
      button.tabIndex=active?0:-1;
    });
    const current=shell.querySelector('.music-inline-audio-current');
    if(current)current.textContent=`Playing here with ${player.label}`;
  }

  function buildInlineAudio(players){
    const shell=document.createElement('section');
    shell.className='music-inline-audio';
    shell.setAttribute('aria-label','Play music inside this Artist Card');

    const head=document.createElement('div');
    head.className='music-inline-audio-head';
    head.innerHTML='<div><small>PLAY INSIDE LIW</small><strong>Featured audio</strong></div><span class="music-inline-audio-live"><i data-lucide="headphones" size="14"></i> Tap play</span>';
    shell.appendChild(head);

    if(players.length>1){
      const tabs=document.createElement('div');
      tabs.className='music-inline-audio-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Audio player provider');
      players.forEach((player,index)=>{
        const button=document.createElement('button');button.type='button';button.className='music-inline-audio-tab';button.dataset.provider=player.provider;button.setAttribute('role','tab');
        button.innerHTML=`<span class="music-inline-audio-dot"></span>${player.label}`;
        button.addEventListener('click',()=>renderPlayer(shell,frame,player));
        tabs.appendChild(button);
      });
      shell.appendChild(tabs);
    }

    const frameWrap=document.createElement('div');frameWrap.className='music-inline-audio-frame';
    const frame=document.createElement('iframe');
    frame.loading='eager';frame.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('allowfullscreen','');
    frameWrap.appendChild(frame);shell.appendChild(frameWrap);

    const foot=document.createElement('div');foot.className='music-inline-audio-foot';
    foot.innerHTML='<span class="music-inline-audio-current"></span><small>Audio starts only when the fan taps the embedded player.</small>';
    shell.appendChild(foot);

    renderPlayer(shell,frame,players[0]);
    return shell;
  }

  async function enhance(){
    if(!isMusic())return false;
    const room=currentRoom();if(!room||roomTitle(room)!=='music')return false;
    const stage=room.querySelector('.music-media-stage.music-media-music');if(!stage)return false;
    if(stage.querySelector('.music-inline-audio'))return true;
    const s=await loadSettings();
    if(!room.classList.contains('open')||roomTitle(room)!=='music')return false;
    const players=playersFromSettings(s);
    if(!players.length)return false;
    const hero=stage.querySelector('.music-listen-hero');
    const player=buildInlineAudio(players);
    if(hero)hero.insertAdjacentElement('afterend',player);else stage.prepend(player);
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return true;
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    [0,90,220,500,950,1600,2600].forEach((delay,index)=>setTimeout(()=>{
      enhance().catch(error=>console.warn('[LIW Inline Audio] enhancement failed',error));
      if(index===6)scheduled=false;
    },delay));
  }

  document.addEventListener('click',event=>{
    const tile=event.target?.closest?.('.music-luxe-tile');
    if(tile&&safe(tile.querySelector('strong')?.textContent,40).toLowerCase()==='music')schedule();
    if(event.target?.closest?.('.music-artist-room-close'))stopPlayers();
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')stopPlayers();},true);

  loadSettings().catch(()=>{});
  setTimeout(()=>{if(roomTitle()==='music')schedule();},0);
})();
