/* LIW Cards staging — Super Studio V7 mobile-safe video hero + true replacement compact header. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_HERO_V7__)return;
  window.__LIW_SUPER_STUDIO_HERO_V7__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const mounted=new WeakMap();
  const roots=new Set();
  const videoCache=new Map();
  const videoPending=new Map();
  let lastPublicCardId='';
  let scrollRaf=0;

  function ensureStyle(){
    let link=q('link[data-liw-super-studio-hero-v4]');
    if(!link){link=document.createElement('link');link.rel='stylesheet';link.dataset.liwSuperStudioHeroV4='true';document.head.appendChild(link);}
    const href='css/super-studio-hero-v4-staging.css?v=20261011-5';
    if(!String(link.getAttribute('href')||'').includes('20261011-5'))link.href=href;
  }

  function scrollParent(node){
    let parent=node?.parentElement;
    while(parent&&parent!==document.body&&parent!==document.documentElement){
      try{
        const style=getComputedStyle(parent);
        if(/(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`)&&parent.scrollHeight>parent.clientHeight+8)return parent;
      }catch(_){}
      parent=parent.parentElement;
    }
    return window;
  }
  function viewportTop(scroller){if(scroller===window)return 0;try{return scroller.getBoundingClientRect().top;}catch(_){return 0;}}

  function publicClient(){try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return null;}}
  function cardIdFor(root){
    if(!root.closest('#super-studio-public'))return '';
    if(lastPublicCardId)return lastPublicCardId;
    try{if(typeof publicCard!=='undefined'&&publicCard?.id)return publicCard.id;}catch(_){}
    try{if(window.publicCard?.id)return window.publicCard.id;}catch(_){}
    return '';
  }
  async function fetchPublicVideo(cardId){
    if(!cardId)return '';
    if(videoCache.has(cardId))return videoCache.get(cardId)||'';
    if(videoPending.has(cardId))return videoPending.get(cardId);
    const client=publicClient();if(!client)return '';
    const pending=(async()=>{
      try{
        const {data,error}=await client.from('super_studio_state_staging').select('data').eq('card_id',cardId).maybeSingle();
        if(error)throw error;
        const url=String(data?.data?.videoCoverUrl||'').trim();
        videoCache.set(cardId,url);return url;
      }catch(error){console.warn('[Super Studio video hero]',error);return '';}
      finally{videoPending.delete(cardId);}
    })();
    videoPending.set(cardId,pending);return pending;
  }
  function editorVideo(){try{return String(window.LIWSuperStudioEditor?.getState?.()?.videoCoverUrl||'').trim();}catch(_){return '';}}

  function ensurePosterLayer(root){
    const hero=q('.ss-hero',root);if(!hero)return null;
    let poster=q('.ss-hero-video-poster',hero);if(poster)return poster;
    const profile=q('.ss-avatar img',root)?.src||'';
    const cover=q('.ss-hero-image',hero)?.src||'';
    const src=cover||profile;
    if(!src)return null;
    poster=document.createElement('img');
    poster.className='ss-hero-video-poster';
    poster.src=src;
    poster.alt='';
    poster.setAttribute('aria-hidden','true');
    const video=q('.ss-hero-video',hero);
    if(video)hero.insertBefore(poster,video);else hero.prepend(poster);
    return poster;
  }

  function ensurePlayButton(root,video){
    const hero=q('.ss-hero',root);if(!hero)return null;
    let button=q('.ss-video-play-toggle',hero);
    if(!button){
      button=document.createElement('button');button.type='button';button.className='ss-video-play-toggle';
      button.setAttribute('aria-label','Play video cover');
      button.innerHTML='<i data-lucide="play"></i><span>Play cover</span>';
      hero.appendChild(button);
      button.addEventListener('click',event=>{
        event.preventDefault();event.stopPropagation();
        try{
          video.muted=true;video.defaultMuted=true;
          const promise=video.play();
          if(promise&&typeof promise.then==='function')promise.then(()=>button.classList.remove('is-visible')).catch(()=>button.classList.add('is-visible'));
        }catch(_){button.classList.add('is-visible');}
      });
      if(window.lucide)try{lucide.createIcons({nodes:[button]});}catch(_){}
    }
    return button;
  }

  function attemptPlay(root,video){
    const button=ensurePlayButton(root,video);if(!button)return;
    button.classList.add('is-visible');
    if(document.visibilityState==='hidden')return;
    try{
      const promise=video.play();
      if(promise&&typeof promise.then==='function')promise.then(()=>button.classList.remove('is-visible')).catch(()=>button.classList.add('is-visible'));
    }catch(_){button.classList.add('is-visible');}
  }

  function wireVideo(root,video){
    if(!video)return;
    ensurePosterLayer(root);
    video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.autoplay=true;video.preload='auto';
    video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('webkit-playsinline','');video.setAttribute('autoplay','');video.setAttribute('loop','');
    const profile=q('.ss-avatar img',root)?.src||'';if(!video.poster&&profile)video.poster=profile;
    const button=ensurePlayButton(root,video);button?.classList.add('is-visible');
    if(video.dataset.ssHeroVideoWired==='true'){attemptPlay(root,video);return;}
    video.dataset.ssHeroVideoWired='true';
    const ready=()=>{video.hidden=false;root.classList.add('ss-hero-video-ready');root.classList.remove('ss-hero-video-error');attemptPlay(root,video);};
    video.addEventListener('loadedmetadata',ready);video.addEventListener('loadeddata',ready);video.addEventListener('canplay',ready);
    video.addEventListener('playing',()=>{root.classList.add('ss-hero-video-ready','ss-hero-video-playing');root.classList.remove('ss-hero-video-error');q('.ss-video-play-toggle',root)?.classList.remove('is-visible');});
    video.addEventListener('pause',()=>{root.classList.remove('ss-hero-video-playing');});
    video.addEventListener('error',()=>{root.classList.add('ss-hero-video-error');root.classList.remove('ss-hero-video-playing');q('.ss-video-play-toggle',root)?.classList.add('is-visible');});
    if(video.readyState>=1)ready();else attemptPlay(root,video);
  }

  function ensureVideoElement(root,url){
    const hero=q('.ss-hero',root);if(!hero||!url)return;
    let video=q('.ss-hero-video',hero);
    if(!video){video=document.createElement('video');video.className='ss-hero-video';const shade=q('.ss-hero-shade',hero);if(shade)hero.insertBefore(video,shade);else hero.prepend(video);}
    const current=String(video.currentSrc||video.getAttribute('src')||'').trim();
    if(current!==url){video.hidden=false;video.setAttribute('src',url);try{video.load();}catch(_){}}
    wireVideo(root,video);
  }
  async function repairVideo(root){
    if(!root?.isConnected)return;
    const existing=q('.ss-hero-video',root);
    let url=String(existing?.currentSrc||existing?.getAttribute('src')||'').trim();
    if(!url)url=editorVideo();
    if(!url){const cardId=cardIdFor(root);if(cardId)url=await fetchPublicVideo(cardId);}
    if(url)ensureVideoElement(root,url);
  }

  function compactMarkup(root){
    const avatar=q('.ss-avatar',root)?.cloneNode(true);
    const name=String(q('.ss-identity h1',root)?.textContent||'').trim();
    const title=String(q('.ss-identity h2',root)?.textContent||'').trim();
    const chip=q('.ss-brand-chip',root)?.cloneNode(true);
    const wrap=document.createElement('div');wrap.className='ss-hero-compact-bar';wrap.setAttribute('aria-hidden','true');
    wrap.innerHTML='<div class="ss-hero-compact-left"></div><div class="ss-hero-compact-actions"><button type="button" data-ss-compact-share aria-label="Share card"><i data-lucide="share-2"></i></button></div>';
    const left=q('.ss-hero-compact-left',wrap);
    if(chip){chip.classList.add('ss-compact-profession');left.appendChild(chip);}
    if(avatar){avatar.classList.add('ss-compact-avatar');left.appendChild(avatar);}
    const identity=document.createElement('div');identity.className='ss-compact-identity';identity.innerHTML=`<strong>${name||'Your Name'}</strong>${title?`<span>${title}</span>`:''}`;left.appendChild(identity);
    q('[data-ss-compact-share]',wrap)?.addEventListener('click',()=>q('[data-ss-action="share"]',root)?.click());
    return wrap;
  }
  function ensureCompactBar(root){
    let bar=q(':scope > .ss-hero-compact-bar',root);if(bar)return bar;
    const hero=q('.ss-hero',root);if(!hero)return null;
    bar=compactMarkup(root);hero.insertAdjacentElement('afterend',bar);if(window.lucide)try{lucide.createIcons({nodes:[bar]});}catch(_){}return bar;
  }

  function setCollapsed(root,meta,collapsed){
    if(collapsed===meta.collapsed)return;
    meta.collapsed=collapsed;root.classList.toggle('ss-hero-collapsed',collapsed);
    const bar=ensureCompactBar(root);if(bar)bar.setAttribute('aria-hidden',collapsed?'false':'true');
    const video=q('.ss-hero-video',root);
    if(video){try{if(collapsed&&!video.paused)video.pause();else if(!collapsed)attemptPlay(root,video);}catch(_){}}
  }
  function sync(root){
    const meta=mounted.get(root);if(!meta||!meta.hero?.isConnected)return;
    const top=viewportTop(meta.scroller);
    const heroBottom=meta.hero.getBoundingClientRect().bottom;
    const collapseLine=top+78;
    const expandLine=top+138;
    if(!meta.collapsed&&heroBottom<=collapseLine)setCollapsed(root,meta,true);
    else if(meta.collapsed&&heroBottom>=expandLine)setCollapsed(root,meta,false);
  }
  function scheduleSync(){
    if(scrollRaf)return;
    scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;roots.forEach(root=>{if(!root.isConnected){roots.delete(root);return;}sync(root);});});
  }

  function mount(root){
    if(!root)return;
    const hero=q('.ss-hero',root);if(!hero)return;
    const current=mounted.get(root);
    if(current&&current.hero===hero){ensureCompactBar(root);void repairVideo(root);return;}
    root.classList.remove('ss-hero-collapsed');
    const meta={hero,scroller:scrollParent(hero),collapsed:false};mounted.set(root,meta);roots.add(root);
    root.classList.add('ss-hero-v4-ready','ss-hero-v5-ready','ss-hero-v6-ready','ss-hero-v7-ready');
    const bar=ensureCompactBar(root);if(bar)bar.setAttribute('aria-hidden','true');
    void repairVideo(root);sync(root);
  }
  function scan(){qa('.super-studio-experience').forEach(mount);roots.forEach(root=>{if(!root.isConnected)roots.delete(root);});scheduleSync();}
  let queued=false;const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};

  ensureStyle();
  document.addEventListener('scroll',scheduleSync,true);window.addEventListener('scroll',scheduleSync,{passive:true});window.addEventListener('resize',scheduleSync,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='hidden')roots.forEach(root=>void repairVideo(root));});
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-ready',event=>{const card=event.detail?.card;if(String(card?.card_experience||'').toLowerCase()==='super-studio'&&card?.id)lastPublicCardId=card.id;});
  document.addEventListener('liw:public-card-rendered',event=>{const card=event.detail?.card;if(String(card?.card_experience||'').toLowerCase()==='super-studio'&&card?.id){lastPublicCardId=card.id;videoCache.delete(card.id);}queue();});
  document.addEventListener('liw:editor-card-hydrated',queue);window.addEventListener('pageshow',queue);scan();
})();
