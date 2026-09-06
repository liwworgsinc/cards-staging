/* LIW Cards staging — Music home quick player + front-room routing.
   Featured audio stays on the Artist home; Upcoming Show uses the upgraded Shows route. */
(function(){
  'use strict';
  if(window.__LIW_MUSIC_HOME_AUDIO__)return;
  window.__LIW_MUSIC_HOME_AUDIO__=true;

  let settings=null;
  let settingsPromise=null;
  let panel=null;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function icon(name,size=18){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function artistName(){return safe(document.getElementById('name')?.textContent||data()?.full_name||'Artist',120)||'Artist';}
  function releaseTitle(){return safe(settings?.featured_release_title||data()?.video_title||data()?.headline||'Featured audio',160);}

  async function loadSettings(){
    if(settings)return settings;
    if(settingsPromise)return settingsPromise;
    settingsPromise=(async()=>{
      const d=data()||{};
      const slug=safe(d.slug||new URLSearchParams(location.search).get('slug'),160);
      if(!slug||typeof supabaseClient==='undefined')return {};
      try{
        const {data:row,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});
        if(error)throw error;
        settings=row&&typeof row==='object'&&!Array.isArray(row)?row:{};
      }catch(error){console.warn('[LIW Home Audio] settings unavailable',error);settings={};}
      return settings;
    })();
    return settingsPromise;
  }

  function spotify(raw){
    const value=safe(raw);if(!value)return null;
    try{
      const u=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`);
      if(u.hostname.toLowerCase().replace(/^www\./,'')!=='open.spotify.com')return null;
      const parts=u.pathname.split('/').filter(Boolean);
      if(parts[0]==='embed')parts.shift();
      if(/^intl-[a-z-]+$/i.test(parts[0]||''))parts.shift();
      const type=String(parts[0]||'').toLowerCase(),id=String(parts[1]||'');
      if(!['track','album','playlist','artist','episode','show'].includes(type)||!/^[A-Za-z0-9]{8,64}$/.test(id))return null;
      return {provider:'spotify',label:'Spotify',height:(type==='track'||type==='episode')?152:300,src:`https://open.spotify.com/embed/${type}/${encodeURIComponent(id)}?utm_source=generator`};
    }catch(_){return null;}
  }

  function soundcloud(raw){
    const value=safe(raw);if(!value)return null;
    try{
      const u=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`);
      if(!/^(www\.|m\.)?soundcloud\.com$/i.test(u.hostname))return null;
      const parts=u.pathname.split('/').filter(Boolean);if(parts.length<2)return null;
      if(['discover','stream','you','search','charts'].includes(parts[0].toLowerCase()))return null;
      u.hash='';
      const isSet=parts.includes('sets');
      return {provider:'soundcloud',label:'SoundCloud',height:isSet?300:166,src:`https://w.soundcloud.com/player/?url=${encodeURIComponent(u.toString())}&color=%23ff6800&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&show_teaser=true&visual=false`};
    }catch(_){return null;}
  }

  function players(){return [spotify(settings?.spotify_url),soundcloud(settings?.soundcloud_url)].filter(Boolean);}

  function syncTheme(node){
    const card=document.querySelector('#card.music-card-active');if(!card)return;
    const cs=getComputedStyle(card);
    const read=(...names)=>{for(const name of names){const v=cs.getPropertyValue(name).trim();if(v)return v;}return '';};
    node.style.setProperty('--home-audio-primary',read('--music-template-primary','--music-primary','--card-primary')||'#7c3aed');
    node.style.setProperty('--home-audio-secondary',read('--music-template-secondary','--music-secondary','--card-secondary')||'#2563eb');
    node.style.setProperty('--home-audio-bg',read('--music-template-bg','--music-bg')||'#0b1020');
    node.style.setProperty('--home-audio-text',read('--music-template-text','--music-text')||'#ffffff');
  }

  function renderPlayer(node,frame,player){
    node.dataset.provider=player.provider;
    node.style.setProperty('--home-audio-height',`${player.height}px`);
    frame.title=`${player.label} player for ${artistName()}`;
    frame.src=player.src;
    node.querySelectorAll('.music-home-audio-tab').forEach(button=>{
      const active=button.dataset.provider===player.provider;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
    });
  }

  function closePanel(){
    if(!panel)return;
    const frame=panel.querySelector('iframe');if(frame)try{frame.src='about:blank';}catch(_){ }
    panel.remove();panel=null;
  }

  function buildPanel(list){
    closePanel();
    const node=document.createElement('section');node.className='music-home-audio-panel';node.setAttribute('role','dialog');node.setAttribute('aria-label','Featured music player');
    node.innerHTML=`<div class="music-home-audio-head"><div><small>PLAYING ON LIW</small><strong>${esc(releaseTitle())}</strong><span>${esc(artistName())}</span></div><button type="button" class="music-home-audio-close" aria-label="Close music player">${icon('x',19)}</button></div><div class="music-home-audio-tabs" role="tablist"></div><div class="music-home-audio-frame"><iframe loading="eager" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><div class="music-home-audio-foot"><span>${icon('headphones',14)} Stay on the Artist Card</span><small>Tap play in the player.</small></div>`;
    const tabs=node.querySelector('.music-home-audio-tabs'),frame=node.querySelector('iframe');
    if(list.length>1){
      list.forEach(item=>{
        const button=document.createElement('button');button.type='button';button.className='music-home-audio-tab';button.dataset.provider=item.provider;button.setAttribute('role','tab');button.textContent=item.label;button.addEventListener('click',()=>renderPlayer(node,frame,item));tabs.appendChild(button);
      });
    }else tabs.hidden=true;
    node.querySelector('.music-home-audio-close').addEventListener('click',closePanel);
    syncTheme(node);renderPlayer(node,frame,list[0]);document.body.appendChild(node);panel=node;
    requestAnimationFrame(()=>node.classList.add('open'));
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    return node;
  }

  function findTile(label){
    const wanted=safe(label,40).toLowerCase();
    return [...document.querySelectorAll('.music-luxe-tile')].find(tile=>safe(tile.querySelector('strong')?.textContent,40).toLowerCase()===wanted)||null;
  }

  async function openFromHome(){
    await loadSettings();
    const list=players();
    if(!list.length){findTile('music')?.click();return;}
    buildPanel(list);
  }

  document.addEventListener('click',event=>{
    if(!isMusic())return;

    const release=event.target?.closest?.('.music-release-card');
    if(release){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      openFromHome().catch(error=>console.warn('[LIW Home Audio] open failed',error));
      return;
    }

    const upcoming=event.target?.closest?.('.music-upcoming-show');
    if(upcoming){
      const shows=findTile('shows');
      if(shows){
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
        closePanel();shows.click();
        return;
      }
    }

    const tile=event.target?.closest?.('.music-luxe-tile');if(tile)closePanel();
  },true);

  document.addEventListener('keydown',event=>{if(event.key==='Escape')closePanel();},true);
  loadSettings().catch(()=>{});
})();
