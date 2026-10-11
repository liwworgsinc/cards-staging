/* LIW Cards staging — Super Studio V5 stable video hero + collapse behavior. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_HERO_V5__)return;
  window.__LIW_SUPER_STUDIO_HERO_V5__=true;
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
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      link.dataset.liwSuperStudioHeroV4='true';
      document.head.appendChild(link);
    }
    const href='css/super-studio-hero-v4-staging.css?v=20261011-3';
    if(!String(link.getAttribute('href')||'').includes('20261011-3'))link.href=href;
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

  function viewportTop(scroller){
    if(scroller===window)return 0;
    try{return scroller.getBoundingClientRect().top;}catch(_){return 0;}
  }

  function setCollapsed(root,meta,collapsed){
    if(collapsed===meta.collapsed)return;
    meta.collapsed=collapsed;
    root.classList.toggle('ss-hero-collapsed',collapsed);
    const video=q('.ss-hero-video',root);
    if(video&&!video.hidden){
      try{
        if(collapsed&&!video.paused)video.pause();
        else if(!collapsed&&video.paused&&document.visibilityState!=='hidden'){
          const play=video.play();
          if(play&&typeof play.catch==='function')play.catch(()=>{});
        }
      }catch(_){}
    }
  }

  function sync(root){
    const meta=mounted.get(root);
    if(!meta||!meta.sentinel?.isConnected)return;
    const top=viewportTop(meta.scroller);
    const sentinelTop=meta.sentinel.getBoundingClientRect().top;
    const collapseLine=top-84;
    const expandLine=top-18;
    if(!meta.collapsed&&sentinelTop<=collapseLine)setCollapsed(root,meta,true);
    else if(meta.collapsed&&sentinelTop>=expandLine)setCollapsed(root,meta,false);
  }

  function scheduleSync(){
    if(scrollRaf)return;
    scrollRaf=requestAnimationFrame(()=>{
      scrollRaf=0;
      roots.forEach(root=>{
        if(!root.isConnected){roots.delete(root);return;}
        sync(root);
      });
    });
  }

  function publicClient(){
    try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return null;}
  }

  function cardIdFor(root){
    if(root.closest('#super-studio-public')){
      if(lastPublicCardId)return lastPublicCardId;
      try{if(typeof publicCard!=='undefined'&&publicCard?.id)return publicCard.id;}catch(_){}
      try{if(window.publicCard?.id)return window.publicCard.id;}catch(_){}
      const params=new URLSearchParams(location.search);
      return params.get('id')||params.get('card_id')||'';
    }
    return '';
  }

  async function fetchPublicVideo(cardId){
    if(!cardId)return '';
    if(videoCache.has(cardId))return videoCache.get(cardId)||'';
    if(videoPending.has(cardId))return videoPending.get(cardId);
    const client=publicClient();
    if(!client)return '';
    const pending=(async()=>{
      try{
        const {data,error}=await client.from('super_studio_state_staging').select('data').eq('card_id',cardId).maybeSingle();
        if(error)throw error;
        const url=String(data?.data?.videoCoverUrl||'').trim();
        videoCache.set(cardId,url);
        return url;
      }catch(error){
        console.warn('[Super Studio video hero]',error);
        return '';
      }finally{
        videoPending.delete(cardId);
      }
    })();
    videoPending.set(cardId,pending);
    return pending;
  }

  function editorVideo(){
    try{return String(window.LIWSuperStudioEditor?.getState?.()?.videoCoverUrl||'').trim();}catch(_){return '';}
  }

  function wireVideo(root,video){
    if(!video||video.dataset.ssHeroVideoWired==='true')return;
    video.dataset.ssHeroVideoWired='true';
    video.muted=true;
    video.loop=true;
    video.playsInline=true;
    video.autoplay=true;
    video.preload='metadata';
    const ready=()=>{
      video.hidden=false;
      root.classList.add('ss-hero-video-ready');
      root.classList.remove('ss-hero-video-error');
      const meta=mounted.get(root);
      if(!meta?.collapsed&&document.visibilityState!=='hidden'){
        try{const play=video.play();if(play&&typeof play.catch==='function')play.catch(()=>{});}catch(_){}
      }
    };
    video.addEventListener('loadeddata',ready);
    video.addEventListener('canplay',ready);
    video.addEventListener('error',()=>{
      root.classList.add('ss-hero-video-error');
      root.classList.remove('ss-hero-video-ready');
      video.hidden=true;
    });
    if(video.readyState>=2)ready();
  }

  function ensureVideoElement(root,url){
    const hero=q('.ss-hero',root);
    if(!hero||!url)return;
    let video=q('.ss-hero-video',hero);
    if(!video){
      video=document.createElement('video');
      video.className='ss-hero-video';
      const cover=q('.ss-hero-image',hero);
      if(cover?.src)video.poster=cover.src;
      const shade=q('.ss-hero-shade',hero);
      if(shade)hero.insertBefore(video,shade);
      else hero.prepend(video);
    }
    const current=String(video.currentSrc||video.getAttribute('src')||'').trim();
    if(current!==url){
      video.hidden=false;
      video.setAttribute('src',url);
      try{video.load();}catch(_){}
    }
    wireVideo(root,video);
  }

  async function repairVideo(root){
    if(!root?.isConnected)return;
    const existing=q('.ss-hero-video',root);
    let url=String(existing?.currentSrc||existing?.getAttribute('src')||'').trim();
    if(!url)url=editorVideo();
    if(!url){
      const cardId=cardIdFor(root);
      if(cardId)url=await fetchPublicVideo(cardId);
    }
    if(url)ensureVideoElement(root,url);
  }

  function mount(root){
    if(!root)return;
    const hero=q('.ss-hero',root);
    if(!hero)return;
    const current=mounted.get(root);
    if(current&&current.hero===hero&&current.sentinel?.isConnected){
      void repairVideo(root);
      return;
    }
    const oldSentinel=current?.sentinel;
    if(oldSentinel?.isConnected)oldSentinel.remove();
    let sentinel=document.createElement('span');
    sentinel.className='ss-hero-collapse-sentinel';
    sentinel.setAttribute('aria-hidden','true');
    hero.insertAdjacentElement('beforebegin',sentinel);
    const meta={hero,sentinel,scroller:scrollParent(hero),collapsed:false};
    mounted.set(root,meta);
    roots.add(root);
    root.classList.add('ss-hero-v4-ready','ss-hero-v5-ready');
    void repairVideo(root);
    sync(root);
  }

  function scan(){
    qa('.super-studio-experience').forEach(mount);
    roots.forEach(root=>{if(!root.isConnected)roots.delete(root);});
    scheduleSync();
  }

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;scan();});
  };

  ensureStyle();
  document.addEventListener('scroll',scheduleSync,true);
  window.addEventListener('scroll',scheduleSync,{passive:true});
  window.addEventListener('resize',scheduleSync,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='hidden')roots.forEach(root=>void repairVideo(root));
  });
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-ready',event=>{
    const card=event.detail?.card;
    if(String(card?.card_experience||'').toLowerCase()==='super-studio'&&card?.id)lastPublicCardId=card.id;
  });
  document.addEventListener('liw:public-card-rendered',event=>{
    const card=event.detail?.card;
    if(String(card?.card_experience||'').toLowerCase()==='super-studio'&&card?.id){
      lastPublicCardId=card.id;
      videoCache.delete(card.id);
    }
    queue();
  });
  document.addEventListener('liw:editor-card-hydrated',queue);
  window.addEventListener('pageshow',queue);
  scan();
})();
