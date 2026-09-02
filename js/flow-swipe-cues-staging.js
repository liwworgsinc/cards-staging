(function(){
  const THEME_STYLESHEET='css/flow-theme-system-staging.css?v=20260902-flow-theme-1';
  const CONTACT_STYLESHEET='css/flow-contact-destination-staging.css?v=20260902-flow-contact-2';
  const CONTACT_SCRIPT='js/flow-contact-destination-staging.js?v=20260902-flow-contact-2';
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

  function ensureContactEnhancement(){
    if(!document.querySelector('link[data-flow-contact-destination]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=CONTACT_STYLESHEET;
      link.dataset.flowContactDestination='true';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-flow-contact-destination]')){
      const script=document.createElement('script');
      script.src=CONTACT_SCRIPT;
      script.defer=true;
      script.dataset.flowContactDestination='true';
      document.head.appendChild(script);
    }
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
  ensureContactEnhancement();
  scan();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});
  const observer=new MutationObserver(scan);
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setTimeout(()=>observer.disconnect(),15000);
})();