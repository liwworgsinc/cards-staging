/* LIW Cards staging — Super Studio V4 collapsing hero behavior. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_HERO_V4__)return;
  window.__LIW_SUPER_STUDIO_HERO_V4__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const state=new WeakMap();

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

  function scrollTop(scroller){
    return scroller===window ? (window.scrollY||document.documentElement.scrollTop||0) : scroller.scrollTop;
  }

  function contentTop(el,scroller){
    const rect=el.getBoundingClientRect();
    if(scroller===window)return rect.top+scrollTop(window);
    const parentRect=scroller.getBoundingClientRect();
    return rect.top-parentRect.top+scrollTop(scroller);
  }

  function sync(root){
    const meta=state.get(root);
    if(!meta)return;
    const current=scrollTop(meta.scroller);
    const collapse=current>meta.threshold;
    if(collapse===meta.collapsed)return;
    meta.collapsed=collapse;
    root.classList.toggle('ss-hero-collapsed',collapse);
    const video=q('.ss-hero-video',root);
    if(video){
      try{
        if(collapse&&!video.paused)video.pause();
        else if(!collapse&&video.paused&&document.visibilityState!=='hidden'){
          const play=video.play();
          if(play&&typeof play.catch==='function')play.catch(()=>{});
        }
      }catch(_){}
    }
  }

  function mount(root){
    if(!root||state.has(root))return;
    const hero=q('.ss-hero',root);
    if(!hero)return;
    root.classList.add('ss-hero-v4-ready');
    const scroller=scrollParent(root);
    const heroTop=contentTop(hero,scroller);
    const threshold=heroTop+Math.max(54,Math.min(86,hero.clientHeight*.18));
    const meta={scroller,hero,threshold,collapsed:false,raf:0,onScroll:null,onResize:null};
    meta.onScroll=()=>{
      if(meta.raf)return;
      meta.raf=requestAnimationFrame(()=>{meta.raf=0;sync(root);});
    };
    meta.onResize=()=>{
      meta.threshold=contentTop(meta.hero,meta.scroller)+Math.max(54,Math.min(86,meta.hero.clientHeight*.18));
      sync(root);
    };
    state.set(root,meta);
    scroller.addEventListener('scroll',meta.onScroll,{passive:true});
    window.addEventListener('resize',meta.onResize,{passive:true});
    sync(root);
  }

  function scan(){qa('.super-studio-experience').forEach(mount);}

  let queued=false;
  const queue=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;scan();});
  };
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('liw:public-card-rendered',queue);
  document.addEventListener('liw:editor-card-hydrated',queue);
  window.addEventListener('pageshow',queue);
  scan();
})();
