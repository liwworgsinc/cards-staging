/* LIW Cards staging — Super Studio V4 stable collapsing hero behavior. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_HERO_V4__)return;
  window.__LIW_SUPER_STUDIO_HERO_V4__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const state=new WeakMap();

  function ensureStyle(){
    let link=q('link[data-liw-super-studio-hero-v4]');
    if(!link){link=document.createElement('link');link.rel='stylesheet';link.dataset.liwSuperStudioHeroV4='true';document.head.appendChild(link);}
    const href='css/super-studio-hero-v4-staging.css?v=20261011-2';
    if(!String(link.getAttribute('href')||'').includes('20261011-2'))link.href=href;
  }

  function scrollParent(node){
    let parent=node?.parentElement;
    while(parent&&parent!==document.body&&parent!==document.documentElement){
      try{const style=getComputedStyle(parent);if(/(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`)&&parent.scrollHeight>parent.clientHeight+8)return parent;}catch(_){}
      parent=parent.parentElement;
    }
    return window;
  }
  function scrollTop(scroller){return scroller===window?(window.scrollY||document.documentElement.scrollTop||0):scroller.scrollTop;}

  function setCollapsed(root,meta,collapsed){
    if(collapsed===meta.collapsed)return;
    meta.collapsed=collapsed;
    root.classList.toggle('ss-hero-collapsed',collapsed);
    const video=q('.ss-hero-video',root);
    if(video){
      try{
        if(collapsed&&!video.paused)video.pause();
        else if(!collapsed&&video.paused&&document.visibilityState!=='hidden'){
          const play=video.play();if(play&&typeof play.catch==='function')play.catch(()=>{});
        }
      }catch(_){}
    }
  }

  function sync(root){
    const meta=state.get(root);if(!meta)return;
    const current=scrollTop(meta.scroller);
    if(!meta.collapsed&&current>=meta.collapseAt)setCollapsed(root,meta,true);
    else if(meta.collapsed&&current<=meta.expandAt)setCollapsed(root,meta,false);
  }

  function mount(root){
    if(!root||state.has(root))return;
    const hero=q('.ss-hero',root);if(!hero)return;
    root.classList.add('ss-hero-v4-ready');
    const scroller=scrollParent(root);
    const start=scrollTop(scroller);
    const meta={scroller,hero,collapsed:false,collapseAt:start+120,expandAt:start+20,raf:0,onScroll:null};
    meta.onScroll=()=>{if(meta.raf)return;meta.raf=requestAnimationFrame(()=>{meta.raf=0;sync(root);});};
    state.set(root,meta);
    scroller.addEventListener('scroll',meta.onScroll,{passive:true});
    sync(root);
  }

  function scan(){qa('.super-studio-experience').forEach(mount);}
  let queued=false;
  const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});};
  ensureStyle();
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-rendered',queue);
  document.addEventListener('liw:editor-card-hydrated',queue);
  window.addEventListener('pageshow',queue);
  scan();
})();
