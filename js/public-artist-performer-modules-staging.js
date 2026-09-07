/* LIW Cards staging — Music/Artist performer modules.
   Adds explicit performer-type behavior plus optional Podcast, Call and Text
   home actions. Classic and Flow are untouched. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_ARTIST_PERFORMER_MODULES__)return;
  window.__LIW_PUBLIC_ARTIST_PERFORMER_MODULES__=true;

  const TYPE_LABELS={rapper:'RAPPER',singer:'SINGER',musician:'MUSICIAN',band:'BAND',dj:'DJ',producer:'PRODUCER',comedian:'COMEDIAN',podcaster:'PODCASTER',actor:'PERFORMER',creator:'CREATOR',other:'ARTIST'};
  let settings=null;
  let mounted=false;

  function cardData(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(cardData()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function icon(name,size=26){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function track(name,target,meta={}){try{window.track?.(name,target,{experience:'music',...meta});}catch(_){ }}
  function validHttpUrl(value){try{const url=new URL(safe(value,1800));return /^https?:$/.test(url.protocol)?url.href:'';}catch(_){return '';}}

  function ensureStyles(){
    if(document.getElementById('liw-public-performer-modules-style'))return;
    const style=document.createElement('style');style.id='liw-public-performer-modules-style';
    style.textContent=`
      #card.music-card-active .music-luxe-tile[data-liw-artist-module]{position:relative}
      .liw-podcast-room{position:fixed;inset:0;z-index:2147482400;display:none;flex-direction:column;background:var(--music-template-bg,var(--music-bg,#fff));color:var(--music-text,var(--card-text,#111827));overflow:auto;-webkit-overflow-scrolling:touch}
      .liw-podcast-room.open{display:flex}.liw-podcast-room-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 13%,transparent);background:color-mix(in srgb,var(--music-template-bg,var(--music-bg,#fff)) 94%,transparent);backdrop-filter:blur(16px)}
      .liw-podcast-room-title{display:flex;align-items:center;gap:10px;min-width:0}.liw-podcast-room-mark{width:38px;height:38px;display:grid;place-items:center;flex:0 0 38px;border-radius:12px;color:var(--music-template-button-text,#fff);background:var(--music-template-gradient,linear-gradient(135deg,#7c3aed,#2563eb))}.liw-podcast-room-title small{display:block;font-size:.52rem;font-weight:900;letter-spacing:.12em;opacity:.62}.liw-podcast-room-title strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.95rem}.liw-podcast-room-close{width:40px;height:40px;display:grid;place-items:center;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:12px;background:transparent;color:inherit;cursor:pointer}
      .liw-podcast-room-body{width:min(680px,100%);margin:0 auto;padding:22px 16px 34px}.liw-podcast-hero{padding:22px;border:1px solid color-mix(in srgb,var(--music-template-primary,var(--music-primary,#7c3aed)) 24%,transparent);border-radius:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--music-template-primary,var(--music-primary,#7c3aed)) 9%,transparent),color-mix(in srgb,var(--music-template-bg,var(--music-bg,#fff)) 96%,transparent));box-shadow:0 18px 45px rgba(15,23,42,.08)}
      .liw-podcast-hero-icon{width:58px;height:58px;display:grid;place-items:center;border-radius:18px;color:var(--music-template-button-text,#fff);background:var(--music-template-gradient,linear-gradient(135deg,#7c3aed,#2563eb));box-shadow:0 12px 28px color-mix(in srgb,var(--music-template-primary,#7c3aed) 28%,transparent)}.liw-podcast-hero small{display:block;margin-top:18px;font-size:.56rem;font-weight:950;letter-spacing:.14em;opacity:.62}.liw-podcast-hero h2{margin:5px 0 8px;font-size:clamp(1.35rem,6vw,2rem);line-height:1.05}.liw-podcast-hero p{margin:0;color:color-mix(in srgb,currentColor 72%,transparent);font-size:.82rem;line-height:1.55}.liw-podcast-open{min-height:48px;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:18px;border-radius:14px;color:var(--music-template-button-text,#fff);background:var(--music-template-button,var(--music-primary,#7c3aed));text-decoration:none;font-size:.8rem;font-weight:900}
      @media(min-width:780px){.liw-podcast-room{inset:50% auto auto 50%;width:min(720px,calc(100vw - 40px));height:min(760px,calc(100vh - 40px));transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.24);border-radius:24px;box-shadow:0 28px 90px rgba(7,13,35,.35)}html.music-room-open body:has(.liw-podcast-room.open)::before{content:'';position:fixed;inset:0;z-index:2147482300;background:rgba(7,13,35,.58);backdrop-filter:blur(5px)}}
    `;document.head.appendChild(style);
  }

  async function loadSettings(){
    const data=cardData();const slug=safe(data?.slug||new URLSearchParams(location.search).get('slug'),160);
    if(!slug||typeof supabaseClient==='undefined'||!supabaseClient)return {};
    try{const {data:result,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});if(error)throw error;return result&&typeof result==='object'&&!Array.isArray(result)?result:{};}
    catch(error){console.warn('[LIW Artist performer modules] public settings',error);return {};}
  }

  function normalizePhone(value){
    const raw=safe(value,80);if(!raw)return '';
    const plus=raw.trim().startsWith('+')?'+':'';const digits=raw.replace(/[^0-9*#]/g,'');return plus+digits;
  }

  function tile(label,iconName,key,handler){
    const node=document.createElement('button');node.type='button';node.className='music-luxe-tile music-accent-blue';node.dataset.liwArtistModule=key;node.setAttribute('aria-label',label);
    node.innerHTML=`<span class="music-luxe-icon">${icon(iconName,27)}</span><strong>${esc(label)}</strong>`;node.addEventListener('click',handler);return node;
  }

  function closePodcast(){
    const room=document.querySelector('.liw-podcast-room');if(!room)return;
    room.classList.remove('open');room.setAttribute('aria-hidden','true');
    if(!document.querySelector('.music-artist-room.open'))document.documentElement.classList.remove('music-room-open');
    track('music_room_close','podcast');
  }

  function podcastRoom(){
    let room=document.querySelector('.liw-podcast-room');if(room)return room;
    room=document.createElement('section');room.className='liw-podcast-room';room.setAttribute('role','dialog');room.setAttribute('aria-modal','true');room.setAttribute('aria-hidden','true');
    room.innerHTML=`<header class="liw-podcast-room-head"><div class="liw-podcast-room-title"><span class="liw-podcast-room-mark">${icon('podcast',20)}</span><div><small>LIW ARTIST CARD</small><strong data-liw-podcast-room-title>Podcast</strong></div></div><button class="liw-podcast-room-close" type="button" aria-label="Close Podcast room">${icon('x',21)}</button></header><div class="liw-podcast-room-body" data-liw-podcast-room-body></div>`;
    room.querySelector('.liw-podcast-room-close')?.addEventListener('click',closePodcast);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&room.classList.contains('open'))closePodcast();});document.body.appendChild(room);return room;
  }

  function openPodcast(){
    const title=safe(settings?.podcast_title,140)||'Podcast';const description=safe(settings?.podcast_description,1000)||'Listen to the latest conversations, stories and episodes from this creator.';const href=validHttpUrl(settings?.podcast_url);
    const room=podcastRoom();room.querySelector('[data-liw-podcast-room-title]').textContent=title;const body=room.querySelector('[data-liw-podcast-room-body]');
    body.innerHTML=`<div class="liw-podcast-hero"><span class="liw-podcast-hero-icon">${icon('mic-2',29)}</span><small>PODCAST / AUDIO SHOW</small><h2>${esc(title)}</h2><p>${esc(description)}</p>${href?`<a class="liw-podcast-open" href="${esc(href)}" target="_blank" rel="noopener">Listen to the podcast ${icon('arrow-up-right',17)}</a>`:'<p style="margin-top:16px;font-weight:800">New episodes and listening links are coming soon.</p>'}</div>`;
    room.classList.add('open');room.setAttribute('aria-hidden','false');document.documentElement.classList.add('music-room-open');room.querySelector('.liw-podcast-room-close')?.focus();track('music_room_open','podcast');if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function visibleCoreTile(key){
    const rows=Array.isArray(settings?.tiles)?settings.tiles:[];const row=rows.find(item=>String(item?.key||'')===key);return row?row.visible!==false:true;
  }

  function adaptPrimaryExperience(){
    const podcastOn=settings?.podcast_enabled===true;const musicOn=visibleCoreTile('music');
    const primary=document.querySelector('#card.music-card-active .music-primary-cta');const release=document.querySelector('#card.music-card-active .music-release-card');
    if(podcastOn){
      if(primary&&primary.dataset.liwPodcastPrimary!=='true'){
        const clone=primary.cloneNode(false);clone.dataset.liwPodcastPrimary='true';clone.innerHTML=`${icon('podcast',19)}<span>OPEN PODCAST</span>`;clone.addEventListener('click',openPodcast);primary.replaceWith(clone);
      }
      if(release&&release.style.display!=='none')release.style.setProperty('display','none','important');
    }else if(!musicOn){
      if(primary&&primary.style.display!=='none')primary.style.setProperty('display','none','important');
      if(release&&release.style.display!=='none')release.style.setProperty('display','none','important');
    }
  }

  function applyRoleLabels(){
    const type=safe(settings?.performer_type,40).toLowerCase();if(!type)return;
    const map={
      comedian:{music:'Audio',shows:'Dates',book:'Book'},podcaster:{music:'Audio',shows:'Live',book:'Book'},
      dj:{music:'Mixes',shows:'Dates',book:'Book DJ'},producer:{music:'Beats',merch:'Shop',book:'Sessions'},
      actor:{shows:'Dates',book:'Book Me'},creator:{book:'Collaborate'}
    }[type]||{};
    document.querySelectorAll('.music-luxe-tile').forEach(node=>{
      if(node.dataset.liwArtistModule)return;
      const strong=node.querySelector('strong');const text=safe(strong?.textContent,40).toLowerCase();
      const inferred=text.includes('music')||text.includes('audio')||text.includes('mix')||text.includes('beat')?'music':text.includes('show')||text.includes('date')||text==='live'?'shows':text.includes('store')||text.includes('merch')||text==='shop'?'merch':text.includes('book')||text.includes('session')||text.includes('collaborate')?'book':'';
      const next=inferred?map[inferred]:'';
      if(strong&&next&&strong.textContent!==next){strong.textContent=next;node.setAttribute('aria-label',next);}
    });
    const mode=document.querySelector('#card.music-card-active .music-mode-pill');const label=TYPE_LABELS[type];const nextMode=label?`${label} MODE`:'';
    if(mode&&nextMode&&safe(mode.textContent,60)!==nextMode)mode.innerHTML=`<span></span> ${esc(nextMode)}`;
  }

  function mountTiles(){
    if(!isMusic()||!settings)return false;
    const grid=document.querySelector('#card.music-card-active .music-luxe-grid');if(!grid)return false;
    ensureStyles();
    if(settings.podcast_enabled===true&&!grid.querySelector('[data-liw-artist-module="podcast"]')){
      grid.prepend(tile('Podcast','podcast','podcast',openPodcast));
    }
    const data=cardData()||{};const callNumber=normalizePhone(data.phone);const textNumber=normalizePhone(data.sms_phone)||callNumber;
    if(settings.call_enabled===true&&callNumber&&!grid.querySelector('[data-liw-artist-module="call"]')){
      grid.appendChild(tile('Call','phone','call',()=>{track('music_home_action','call');location.href=`tel:${callNumber}`;}));
    }
    if(settings.text_enabled===true&&textNumber&&!grid.querySelector('[data-liw-artist-module="text"]')){
      grid.appendChild(tile('Text','message-square-text','text',()=>{track('music_home_action','text');location.href=`sms:${textNumber}`;}));
    }
    adaptPrimaryExperience();applyRoleLabels();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    mounted=true;return true;
  }

  async function start(){
    if(!isMusic())return false;if(settings===null)settings=await loadSettings();return mountTiles();
  }

  let attempts=0;const timer=setInterval(async()=>{attempts+=1;const done=await start();if(done&&attempts>20)clearInterval(timer);if(attempts>160)clearInterval(timer);},100);
  const observer=new MutationObserver(()=>{if(settings&&isMusic())mountTiles();});observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(start,0);
})();