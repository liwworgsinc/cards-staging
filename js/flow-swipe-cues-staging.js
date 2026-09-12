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
   reference to the original node (and its click handler), then move that same
   node into the top cover action cluster beside Save / Share / QR. */
(function(){
  'use strict';
  let rolodexWrap=null;
  let scheduled=false;

  function ensureFlowStyle(){
    if(document.getElementById('liw-flow-rolodex-guard-style'))return;
    const style=document.createElement('style');
    style.id='liw-flow-rolodex-guard-style';
    style.textContent=`
      .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap{
        flex:0 0 auto;
        width:auto;
        margin:0;
        display:flex;
        align-items:center;
      }
      .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap .liw-rolodex-public-button{
        width:38px;
        height:38px;
        min-width:38px;
        min-height:38px;
        padding:0;
        display:grid;
        place-items:center;
        border:1px solid rgba(15,28,52,.13);
        border-radius:50%;
        background:rgba(255,255,255,.94);
        color:var(--card-primary,#153b73);
        box-shadow:0 6px 16px rgba(15,28,52,.11),inset 0 1px 0 rgba(255,255,255,.9);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        font-size:0;
        line-height:1;
      }
      .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap .liw-rolodex-public-button svg{
        width:19px!important;
        height:19px!important;
        margin:0!important;
        stroke-width:2.15!important;
      }
      .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap .liw-rolodex-public-button:hover,
      .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap .liw-rolodex-public-button:focus-visible{
        transform:translateY(-1px);
        border-color:color-mix(in srgb,var(--card-primary,#153b73) 34%,transparent);
        box-shadow:0 8px 18px rgba(15,28,52,.15);
        outline:none;
      }
      .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap .liw-rolodex-public-button:disabled{
        opacity:.78;
        cursor:default;
      }
      .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap .liw-rolodex-public-status{
        display:none!important;
      }
      @media(max-width:560px){
        .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap .liw-rolodex-public-button{
          width:36px;
          height:36px;
          min-width:36px;
          min-height:36px;
        }
        .swipe-card-active .public-top-actions .liw-rolodex-flow-wrap .liw-rolodex-public-button svg{
          width:18px!important;
          height:18px!important;
        }
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
    const topActions=card?.querySelector('.public-top-actions');
    const wrap=capture();
    if(!card||!topActions||!wrap||!card.classList.contains('swipe-card-active'))return false;

    ensureFlowStyle();
    wrap.classList.add('liw-rolodex-flow-wrap');
    const button=wrap.querySelector('.liw-rolodex-public-button');
    if(button){
      button.setAttribute('aria-label','Save to LIW Rolodex');
      button.setAttribute('title','Save to LIW Rolodex');
    }

    const saveButton=topActions.querySelector('#save');
    const correctlyPlaced=wrap.isConnected&&wrap.parentElement===topActions&&(
      (saveButton&&wrap.previousElementSibling===saveButton)||
      (!saveButton&&wrap===topActions.firstElementChild)
    );
    if(!correctlyPlaced){
      if(saveButton)saveButton.insertAdjacentElement('afterend',wrap);
      else topActions.prepend(wrap);
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

/* Staging bridge: the Admin Scroll Lab is never loaded unless the explicit
   liwAdminScroll=1 query flag is present. The bootstrap waits for card render. */
(function(){
  'use strict';
  try{
    if(new URLSearchParams(location.search).get('liwAdminScroll')!=='1')return;
    if(document.querySelector('script[data-liw-admin-scroll-bootstrap]'))return;
    const script=document.createElement('script');
    script.src='js/public-admin-scroll-bootstrap-staging.js?v=20260912-admin-scroll-1';
    script.dataset.liwAdminScrollBootstrap='true';
    document.body.appendChild(script);
  }catch(_){}
})();