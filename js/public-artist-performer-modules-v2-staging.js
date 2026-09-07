/* LIW Cards staging — public Music/Artist performer modules v2.
   Mobile-safe bounded mounting: no document-wide MutationObserver. Adds Podcast,
   Call and Text while keeping the main launcher at 2x3 and overflow in More/Swipe. */
(function(){
  'use strict';
  if(window.__LIW_PUBLIC_ARTIST_PERFORMER_MODULES__)return;
  window.__LIW_PUBLIC_ARTIST_PERFORMER_MODULES__=true;

  const TYPE_LABELS={rapper:'RAPPER',singer:'SINGER',musician:'MUSICIAN',band:'BAND',dj:'DJ',producer:'PRODUCER',comedian:'COMEDIAN',podcaster:'PODCASTER',actor:'PERFORMER',creator:'CREATOR',other:'ARTIST'};
  let settings=null;

  function data(){try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}}
  function isMusic(){return String(data()?.card_experience||'').toLowerCase()==='music';}
  function safe(value,max=1800){return String(value??'').trim().slice(0,max);}
  function esc(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function icon(name,size=25){return `<i data-lucide="${name}" size="${size}"></i>`;}
  function track(name,target){try{window.track?.(name,target,{experience:'music'});}catch(_){ }}
  function httpUrl(value){try{const url=new URL(safe(value));return /^https?:$/.test(url.protocol)?url.href:'';}catch(_){return '';}}

  function styles(){
    if(document.getElementById('liw-public-performer-v2-style'))return;
    const style=document.createElement('style');style.id='liw-public-performer-v2-style';
    style.textContent=`
      #card.music-card-active .music-luxe-tile[data-liw-artist-module]{position:relative}
      .liw-podcast-room-v2{position:fixed;inset:0;z-index:2147482400;display:none;flex-direction:column;background:var(--music-template-bg,var(--music-bg,#fff));color:var(--music-text,var(--card-text,#111827));overflow:auto;-webkit-overflow-scrolling:touch}
      .liw-podcast-room-v2.open{display:flex}.liw-podcast-v2-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid color-mix(in srgb,currentColor 13%,transparent);background:color-mix(in srgb,var(--music-template-bg,var(--music-bg,#fff)) 94%,transparent);backdrop-filter:blur(16px)}
      .liw-podcast-v2-title{display:flex;align-items:center;gap:10px;min-width:0}.liw-podcast-v2-mark{width:38px;height:38px;display:grid;place-items:center;flex:0 0 38px;border-radius:12px;color:var(--music-template-button-text,#fff);background:var(--music-template-gradient,linear-gradient(135deg,#7c3aed,#2563eb))}.liw-podcast-v2-title small{display:block;font-size:.52rem;font-weight:900;letter-spacing:.12em;opacity:.62}.liw-podcast-v2-title strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.95rem}.liw-podcast-v2-close{width:40px;height:40px;display:grid;place-items:center;border:1px solid color-mix(in srgb,currentColor 14%,transparent);border-radius:12px;background:transparent;color:inherit}
      .liw-podcast-v2-body{width:min(680px,100%);margin:0 auto;padding:22px 16px 34px}.liw-podcast-v2-hero{padding:22px;border:1px solid color-mix(in srgb,var(--music-template-primary,var(--music-primary,#7c3aed)) 24%,transparent);border-radius:22px;background:linear-gradient(145deg,color-mix(in srgb,var(--music-template-primary,var(--music-primary,#7c3aed)) 9%,transparent),color-mix(in srgb,var(--music-template-bg,var(--music-bg,#fff)) 96%,transparent));box-shadow:0 18px 45px rgba(15,23,42,.08)}
      .liw-podcast-v2-icon{width:58px;height:58px;display:grid;place-items:center;border-radius:18px;color:var(--music-template-button-text,#fff);background:var(--music-template-gradient,linear-gradient(135deg,#7c3aed,#2563eb))}.liw-podcast-v2-hero small{display:block;margin-top:18px;font-size:.56rem;font-weight:950;letter-spacing:.14em;opacity:.62}.liw-podcast-v2-hero h2{margin:5px 0 8px;font-size:clamp(1.35rem,6vw,2rem);line-height:1.05}.liw-podcast-v2-hero p{margin:0;font-size:.82rem;line-height:1.55;opacity:.78}.liw-podcast-v2-open{min-height:48px;display:flex;align-items:center;justify-content:center;gap:7px;margin-top:18px;border-radius:14px;color:var(--music-template-button-text,#fff);background:var(--music-template-button,var(--music-primary,#7c3aed));text-decoration:none;font-size:.8rem;font-weight:900}
      @media(min-width:780px){.liw-podcast-room-v2{inset:50% auto auto 50%;width:min(720px,calc(100vw - 40px));height:min(760px,calc(100vh - 40px));transform:translate(-50%,-50%);border-radius:24px;box-shadow:0 28px 90px rgba(7,13,35,.35)}}
    `;document.head.appendChild(style);
  }

  async function loadSettings(){
    const slug=safe(data()?.slug||new URLSearchParams(location.search).get('slug'),160);if(!slug||typeof supabaseClient==='undefined'||!supabaseClient)return {};
    try{const {data:result,error}=await supabaseClient.rpc('public_artist_settings_by_slug',{p_slug:slug});if(error)throw error;return result&&typeof result==='object'&&!Array.isArray(result)?result:{};}
    catch(error){console.warn('[LIW Artist performer v2]',error);return {};}
  }

  function phone(value){const raw=safe(value,80);if(!raw)return '';const plus=raw.startsWith('+')?'+':'';return plus+raw.replace(/[^0-9*#]/g,'');}
  function tile(label,iconName,key,handler){const node=document.createElement('button');node.type='button';node.className='music-luxe-tile music-accent-blue';node.dataset.liwArtistModule=key;node.setAttribute('aria-label',label);node.innerHTML=`<span class="music-luxe-icon">${icon(iconName,27)}</span><strong>${esc(label)}</strong>`;node.addEventListener('click',handler);return node;}

  function closePodcast(){const room=document.querySelector('.liw-podcast-room-v2');if(!room)return;room.classList.remove('open');room.setAttribute('aria-hidden','true');if(!document.querySelector('.music-artist-room.open'))document.documentElement.classList.remove('music-room-open');track('music_room_close','podcast');}
  function room(){
    let node=document.querySelector('.liw-podcast-room-v2');if(node)return node;
    node=document.createElement('section');node.className='liw-podcast-room-v2';node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-hidden','true');
    node.innerHTML=`<header class="liw-podcast-v2-head"><div class="liw-podcast-v2-title"><span class="liw-podcast-v2-mark">${icon('podcast',20)}</span><div><small>LIW ARTIST CARD</small><strong data-liw-podcast-title>Podcast</strong></div></div><button class="liw-podcast-v2-close" type="button" aria-label="Close Podcast room">${icon('x',21)}</button></header><div class="liw-podcast-v2-body" data-liw-podcast-body></div>`;
    node.querySelector('.liw-podcast-v2-close')?.addEventListener('click',closePodcast);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&node.classList.contains('open'))closePodcast();});document.body.appendChild(node);return node;
  }
  function openPodcast(){
    const title=safe(settings?.podcast_title,140)||'Podcast';const description=safe(settings?.podcast_description,1000)||'Listen to the latest conversations, stories and episodes from this creator.';const href=httpUrl(settings?.podcast_url);const node=room();
    node.querySelector('[data-liw-podcast-title]').textContent=title;node.querySelector('[data-liw-podcast-body]').innerHTML=`<div class="liw-podcast-v2-hero"><span class="liw-podcast-v2-icon">${icon('mic-2',29)}</span><small>PODCAST / AUDIO SHOW</small><h2>${esc(title)}</h2><p>${esc(description)}</p>${href?`<a class="liw-podcast-v2-open" href="${esc(href)}" target="_blank" rel="noopener">Listen to the podcast ${icon('arrow-up-right',17)}</a>`:'<p style="margin-top:16px;font-weight:800">Listening link coming soon.</p>'}</div>`;
    node.classList.add('open');node.setAttribute('aria-hidden','false');document.documentElement.classList.add('music-room-open');track('music_room_open','podcast');if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  function coreVisible(key){const row=Array.isArray(settings?.tiles)?settings.tiles.find(item=>String(item?.key||'')===key):null;return row?row.visible!==false:true;}
  function swipeRail(card){
    const more=card?.querySelector('.music-luxe-launcher .music-hub-more');const source=more?.querySelector('.music-hub-more-grid');if(!more||!source)return null;
    more.hidden=false;more.classList.add('music-bottom-swipe');document.body.classList.add('music-bottom-swipe-page');source.classList.add('music-bottom-swipe-source');
    let head=more.querySelector(':scope > .music-bottom-swipe-head');const title=more.querySelector('.music-hub-more-title');if(!head){head=document.createElement('div');head.className='music-bottom-swipe-head';if(title)more.insertBefore(head,title);else more.prepend(head);}if(title&&title.parentNode!==head)head.appendChild(title);if(title)title.textContent='More';
    if(!head.querySelector('.music-bottom-swipe-hint')){const hint=document.createElement('span');hint.className='music-bottom-swipe-hint';hint.setAttribute('aria-hidden','true');hint.innerHTML='Swipe <span>→</span>';head.appendChild(hint);}
    let rail=more.querySelector(':scope > .music-bottom-swipe-rail');if(!rail){rail=document.createElement('div');rail.className='music-bottom-swipe-rail';rail.setAttribute('role','group');rail.setAttribute('aria-label','More artist actions. Swipe left or right.');rail.tabIndex=0;more.appendChild(rail);}
    card.classList.add('music-bottom-swipe-mounted');return rail;
  }

  function route(grid){
    const card=grid.closest('#card.music-card-active');const rail=swipeRail(card);if(!rail)return;
    const modules=['podcast','call','text'].map(key=>card.querySelector(`[data-liw-artist-module="${key}"]`)).filter(Boolean);const type=safe(settings?.performer_type,40).toLowerCase();const podcast=modules.find(n=>n.dataset.liwArtistModule==='podcast');const podcastPrimary=Boolean(podcast&&settings?.podcast_enabled===true&&(!coreVisible('music')||type==='podcaster'||type==='comedian'));
    if(podcastPrimary&&podcast.parentNode!==grid)grid.prepend(podcast);
    let count=grid.querySelectorAll(':scope > .music-luxe-tile').length;
    ['text','call','podcast'].forEach(key=>{if(count<=6)return;const node=modules.find(n=>n.dataset.liwArtistModule===key);if(!node||node.parentNode!==grid||(key==='podcast'&&podcastPrimary))return;node.classList.add('music-bottom-swipe-item');rail.appendChild(node);count--;});
    if(count<6){['podcast','call','text'].forEach(key=>{if(count>=6)return;const node=modules.find(n=>n.dataset.liwArtistModule===key);if(!node||node.parentNode===grid)return;node.classList.remove('music-bottom-swipe-item');grid.appendChild(node);count++;});}
    modules.forEach(node=>{if(node.parentNode===rail)node.classList.add('music-bottom-swipe-item');});rail.dataset.itemCount=String(rail.children.length);
  }

  function adaptPrimary(){
    const type=safe(settings?.performer_type,40).toLowerCase();const podcastPrimary=settings?.podcast_enabled===true&&(!coreVisible('music')||type==='podcaster'||type==='comedian');const primary=document.querySelector('#card.music-card-active .music-primary-cta');const release=document.querySelector('#card.music-card-active .music-release-card');
    if(podcastPrimary){if(primary&&primary.dataset.liwPodcastPrimary!=='true'){const clone=primary.cloneNode(false);clone.dataset.liwPodcastPrimary='true';clone.innerHTML=`${icon('podcast',19)}<span>OPEN PODCAST</span>`;clone.addEventListener('click',openPodcast);primary.replaceWith(clone);}if(release)release.style.setProperty('display','none','important');}
    else if(!coreVisible('music')){if(primary)primary.style.setProperty('display','none','important');if(release)release.style.setProperty('display','none','important');}
  }

  function labels(){const type=safe(settings?.performer_type,40).toLowerCase();const mode=document.querySelector('#card.music-card-active .music-mode-pill');const label=TYPE_LABELS[type];if(mode&&label)mode.innerHTML=`<span></span> ${esc(label)} MODE`;}

  function mount(){
    if(!isMusic()||!settings)return false;const grid=document.querySelector('#card.music-card-active .music-luxe-grid');if(!grid)return false;styles();
    if(settings.podcast_enabled===true&&!document.querySelector('[data-liw-artist-module="podcast"]'))grid.prepend(tile('Podcast','podcast','podcast',openPodcast));
    const card=data()||{};const call=phone(card.phone);const text=phone(card.sms_phone)||call;
    if(settings.call_enabled===true&&call&&!document.querySelector('[data-liw-artist-module="call"]'))grid.appendChild(tile('Call','phone','call',()=>{track('music_home_action','call');location.href=`tel:${call}`;}));
    if(settings.text_enabled===true&&text&&!document.querySelector('[data-liw-artist-module="text"]'))grid.appendChild(tile('Text','message-square-text','text',()=>{track('music_home_action','text');location.href=`sms:${text}`;}));
    route(grid);adaptPrimary();labels();if(window.lucide)try{lucide.createIcons();}catch(_){ }return true;
  }

  async function start(){if(!isMusic())return;if(settings===null)settings=await loadSettings();mount();}
  [0,100,220,450,800,1300,2100,3200,4800,7000].forEach(delay=>setTimeout(start,delay));
  document.addEventListener('liw:card-loader-ready',()=>setTimeout(start,60));window.addEventListener('pageshow',()=>setTimeout(start,80),{once:true});
})();
