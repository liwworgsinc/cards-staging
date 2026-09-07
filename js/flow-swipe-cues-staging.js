(function(){
  const THEME_STYLESHEET='css/flow-theme-system-staging.css?v=20260902-flow-theme-1';
  const attached=new WeakSet();
  const configs=[
    {card:'.swipe-card-active',viewport:'.swipe-viewport',track:'.swipe-track',tabs:'.swipe-section-tab',next:'.swipe-edge.next'},
    {card:'.flow-live-card',viewport:'.flow-viewport',track:'[data-flow-live-track]',tabs:'[data-flow-live-tab]',next:null}
  ];

  function ensureThemeStyles(){
    if(document.querySelector('link[data-flow-theme-system]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=THEME_STYLESHEET;
    link.dataset.flowThemeSystem='true';
    document.head.appendChild(link);
  }

  function attach(card,config){
    if(attached.has(card))return;
    const viewport=card.querySelector(config.viewport);
    const track=card.querySelector(config.track);
    if(!viewport||!track||track.children.length<2)return;

    attached.add(card);
    viewport.classList.add('flow-swipe-cue-active');

    let dismissed=false;
    let startX=null;
    let startY=null;
    let initialScroll=track.scrollLeft;
    let autoTimer=null;

    const dismiss=()=>{
      if(dismissed)return;
      dismissed=true;
      viewport.classList.remove('flow-swipe-cue-active');
      viewport.classList.add('flow-swipe-cue-used');
      if(autoTimer)clearTimeout(autoTimer);
    };

    const onTouchStart=event=>{
      const touch=event.touches&&event.touches[0];
      if(!touch)return;
      startX=touch.clientX;
      startY=touch.clientY;
    };

    const onTouchMove=event=>{
      const touch=event.touches&&event.touches[0];
      if(!touch||startX===null||startY===null)return;
      const dx=touch.clientX-startX;
      const dy=touch.clientY-startY;
      if(Math.abs(dx)>=12&&Math.abs(dx)>Math.abs(dy))dismiss();
    };

    track.addEventListener('touchstart',onTouchStart,{passive:true});
    track.addEventListener('touchmove',onTouchMove,{passive:true});
    track.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse')return;
      startX=event.clientX;
      startY=event.clientY;
    },{passive:true});
    track.addEventListener('pointermove',event=>{
      if(event.pointerType==='mouse'||startX===null||startY===null)return;
      const dx=event.clientX-startX;
      const dy=event.clientY-startY;
      if(Math.abs(dx)>=12&&Math.abs(dx)>Math.abs(dy))dismiss();
    },{passive:true});
    track.addEventListener('wheel',event=>{
      if(Math.abs(event.deltaX)>4&&Math.abs(event.deltaX)>Math.abs(event.deltaY))dismiss();
    },{passive:true});
    track.addEventListener('scroll',()=>{
      if(Math.abs(track.scrollLeft-initialScroll)>5)dismiss();
    },{passive:true});

    card.querySelectorAll(config.tabs).forEach(tab=>tab.addEventListener('click',dismiss,{passive:true}));
    if(config.next)card.querySelector(config.next)?.addEventListener('click',dismiss,{passive:true});
    card.addEventListener('keydown',event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight')dismiss();
    });

    autoTimer=setTimeout(dismiss,6500);
  }

  function scan(){
    configs.forEach(config=>document.querySelectorAll(config.card).forEach(card=>attach(card,config)));
  }

  ensureThemeStyles();
  scan();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setTimeout(()=>observer.disconnect(),15000);
})();

/* Flow rebuilds .public-content after the Rolodex button is mounted. Keep a
   reference to the original node (and its click handler), then reinsert that
   same node into Flow's rebuilt fixed area instead of creating a duplicate. */
(function(){
  'use strict';
  let rolodexWrap=null;
  let scheduled=false;

  function ensureFlowStyle(){
    if(document.getElementById('liw-flow-rolodex-guard-style'))return;
    const style=document.createElement('style');
    style.id='liw-flow-rolodex-guard-style';
    style.textContent=`
      .swipe-card-active .liw-rolodex-flow-wrap{
        flex:0 0 auto;
        width:min(100%,320px);
        margin:0 auto 5px;
      }
      .swipe-card-active .liw-rolodex-flow-wrap .liw-rolodex-public-button{
        min-height:34px;
        padding:6px 10px;
        border-radius:11px;
        font-size:.72rem;
      }
      .swipe-card-active .liw-rolodex-flow-wrap .liw-rolodex-public-status{
        min-height:0;
        margin-top:2px;
        font-size:.6rem;
      }
      @media(max-width:560px){
        .swipe-card-active .liw-rolodex-flow-wrap{max-width:320px;margin-bottom:4px}
        .swipe-card-active .liw-rolodex-flow-wrap .liw-rolodex-public-button{min-height:31px;padding:4px 8px;font-size:.67rem}
      }
    `;
    document.head.appendChild(style);
  }

  function capture(){
    const current=document.querySelector('.liw-rolodex-public-wrap');
    if(current)rolodexWrap=current;
    return rolodexWrap;
  }

  function restore(){
    scheduled=false;
    const card=document.getElementById('card');
    const content=card?.querySelector('.public-content');
    const wrap=capture();
    if(!card||!content||!wrap||!card.classList.contains('swipe-card-active'))return false;

    ensureFlowStyle();
    wrap.classList.add('liw-rolodex-flow-wrap');
    const fixed=content.querySelector('.swipe-fixed-actions');
    const nav=content.querySelector('.swipe-nav-shell');
    const correctlyPlaced=wrap.isConnected&&wrap.parentElement===content&&wrap.previousElementSibling===fixed;
    if(!correctlyPlaced){
      if(fixed)fixed.insertAdjacentElement('afterend',wrap);
      else if(nav)content.insertBefore(wrap,nav);
      else content.prepend(wrap);
    }
    return true;
  }

  function scheduleRestore(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>requestAnimationFrame(restore));
  }

  const observer=new MutationObserver(()=>{
    capture();
    scheduleRestore();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-swipe-ready']});

  let attempts=0;
  const timer=setInterval(()=>{
    attempts+=1;
    capture();
    restore();
    if(attempts>=80)clearInterval(timer);
  },125);

  setTimeout(()=>{
    restore();
    observer.disconnect();
  },15000);
})();