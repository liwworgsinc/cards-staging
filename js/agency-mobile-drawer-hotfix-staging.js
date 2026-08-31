/* LIW Cards staging — Agency mobile drawer controller.
   This controller takes over after the Agency runtime settles, replaces the
   previously wired drawer controls, and becomes the single owner of open/close
   interactions without touching Agency data, cards, clients, or feature logic. */
(function(){
  'use strict';

  if(window.__LIW_AGENCY_MOBILE_DRAWER_CONTROLLER_V3__)return;
  window.__LIW_AGENCY_MOBILE_DRAWER_CONTROLLER_V3__=true;

  const mobile=window.matchMedia('(max-width:900px)');
  let menu=null;
  let closeButton=null;
  let backdrop=null;
  let shell=null;
  let sidebar=null;
  let observer=null;
  let suppressClickUntil=0;
  let takeoverDone=false;

  function ensureStyle(){
    if(!document.querySelector('link[data-agency-sidebar-font-fix]')){
      const fontLink=document.createElement('link');
      fontLink.rel='stylesheet';
      fontLink.href='css/agency-sidebar-font-fix-staging.css?v=20260830-1';
      fontLink.dataset.agencySidebarFontFix='true';
      document.head.appendChild(fontLink);
    }
    if(document.getElementById('agency-mobile-drawer-controller-style'))return;
    const style=document.createElement('style');
    style.id='agency-mobile-drawer-controller-style';
    style.textContent=`
      #agency-sidebar-close{display:none}
      @media(max-width:900px){
        /* White Work Center intentionally uses a sticky desktop sidebar with
           !important. Its selector is more specific than the base mobile CSS,
           so on phones it could remain in normal document flow above the main
           workspace. This controller loads after the runtime and owns the
           mobile drawer geometry with a stronger selector. */
        body.agency-white-workcenter #agency-workspace-shell .agency-sidebar{
          position:fixed!important;
          top:0!important;
          left:0!important;
          right:auto!important;
          bottom:auto!important;
          z-index:1200!important;
          width:272px!important;
          max-width:86vw!important;
          height:100dvh!important;
          min-height:100dvh!important;
          margin:0!important;
          overflow-y:auto!important;
          overscroll-behavior:contain!important;
          transform:translate3d(-110%,0,0)!important;
          visibility:hidden!important;
          pointer-events:none!important;
          transition:transform .22s ease,visibility .22s ease!important;
          box-shadow:20px 0 50px rgba(7,16,42,.22)!important;
        }
        body.agency-white-workcenter #agency-workspace-shell.sidebar-open .agency-sidebar{
          transform:translate3d(0,0,0)!important;
          visibility:visible!important;
          pointer-events:auto!important;
        }
        #agency-sidebar-close{
          display:grid!important;
          position:absolute!important;
          top:max(12px,env(safe-area-inset-top))!important;
          right:12px!important;
          z-index:1201!important;
          width:44px!important;
          height:44px!important;
          min-width:44px!important;
          min-height:44px!important;
          place-items:center!important;
          padding:0!important;
          margin:0!important;
          border:1px solid rgba(255,255,255,.18)!important;
          border-radius:12px!important;
          background:rgba(255,255,255,.11)!important;
          color:#fff!important;
          cursor:pointer!important;
          touch-action:manipulation!important;
          pointer-events:auto!important;
          -webkit-tap-highlight-color:transparent!important;
        }
        #agency-sidebar-close svg{
          width:22px!important;
          height:22px!important;
          pointer-events:none!important;
        }
        .agency-mobile-sidebar-backdrop{
          position:fixed!important;
          inset:0!important;
          z-index:1190!important;
          display:block!important;
          width:100vw!important;
          height:100dvh!important;
          border:0!important;
          padding:0!important;
          margin:0!important;
          background:rgba(7,16,42,.56)!important;
          opacity:0!important;
          visibility:hidden!important;
          pointer-events:none!important;
          touch-action:manipulation!important;
          -webkit-tap-highlight-color:transparent!important;
          transition:opacity .18s ease,visibility .18s ease!important;
        }
        .agency-mobile-sidebar-backdrop.is-visible{
          opacity:1!important;
          visibility:visible!important;
          pointer-events:auto!important;
        }
        body.agency-mobile-nav-open{overflow:hidden!important}
      }
    `;
    document.head.appendChild(style);
  }

  function sync(){
    if(!shell)return;
    const open=mobile.matches&&shell.classList.contains('sidebar-open');
    document.body.classList.toggle('agency-mobile-nav-open',open);
    if(backdrop)backdrop.classList.toggle('is-visible',open);
    if(menu){
      menu.setAttribute('aria-expanded',open?'true':'false');
      menu.setAttribute('aria-controls','agency-workspace-shell');
      menu.setAttribute('aria-label',open?'Close Agency navigation':'Open Agency navigation');
    }
  }

  function setOpen(open){
    if(!shell)return;
    shell.classList.toggle('sidebar-open',Boolean(open&&mobile.matches));
    sync();
  }

  function toggle(){
    if(!shell||!mobile.matches)return;
    setOpen(!shell.classList.contains('sidebar-open'));
  }

  function wireActivation(element,action){
    if(!element)return;

    const activate=event=>{
      if(!mobile.matches)return;
      const now=Date.now();

      if(event.type==='click'&&now<suppressClickUntil){
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if(event.type==='pointerup'&&event.pointerType==='touch'){
        suppressClickUntil=now+650;
      }else if(event.type==='pointerup'){
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      action();
    };

    element.addEventListener('pointerup',activate,false);
    element.addEventListener('click',activate,false);
  }

  function replaceControls(){
    shell=document.getElementById('agency-workspace-shell');
    sidebar=document.querySelector('.agency-sidebar');
    const oldMenu=document.getElementById('agency-menu-button');
    if(!shell||!sidebar||!oldMenu)return false;

    ensureStyle();

    /* Replace the hamburger itself. Cloning deliberately drops listeners that
       agency-dashboard.js and earlier bootstrap versions attached to it. */
    const freshMenu=oldMenu.cloneNode(true);
    freshMenu.removeAttribute('data-agency-mobile-state-wired');
    freshMenu.dataset.agencyMobileStateWired='true';
    freshMenu.setAttribute('aria-controls','agency-workspace-shell');
    oldMenu.replaceWith(freshMenu);
    menu=freshMenu;

    /* Remove every prior close control/backdrop so no stale listener can remain. */
    sidebar.querySelectorAll('#agency-sidebar-close,.agency-sidebar-close').forEach(node=>node.remove());
    document.querySelectorAll('.agency-mobile-sidebar-backdrop,[data-agency-runtime-backdrop],[data-agency-mobile-sidebar-backdrop]').forEach(node=>node.remove());

    closeButton=document.createElement('button');
    closeButton.id='agency-sidebar-close';
    closeButton.className='agency-sidebar-close';
    closeButton.type='button';
    closeButton.dataset.agencyCloseWired='true';
    closeButton.setAttribute('aria-label','Close Agency navigation');
    closeButton.innerHTML='<i data-lucide="x" aria-hidden="true"></i>';
    sidebar.prepend(closeButton);

    backdrop=document.createElement('button');
    backdrop.type='button';
    backdrop.className='agency-mobile-sidebar-backdrop';
    backdrop.dataset.agencyRuntimeBackdrop='true';
    backdrop.dataset.agencyMobileSidebarBackdrop='true';
    backdrop.dataset.agencyCloseWired='true';
    backdrop.setAttribute('aria-label','Close Agency navigation');
    shell.insertAdjacentElement('afterend',backdrop);

    wireActivation(menu,toggle);
    wireActivation(closeButton,()=>setOpen(false));
    wireActivation(backdrop,()=>setOpen(false));

    sidebar.querySelectorAll('a[href]').forEach(link=>{
      link.addEventListener('click',()=>{
        if(mobile.matches)setOpen(false);
      },false);
    });

    if(observer)observer.disconnect();
    observer=new MutationObserver(sync);
    observer.observe(shell,{attributes:true,attributeFilter:['class']});

    if(window.lucide){
      try{window.lucide.createIcons({nodes:[closeButton]});}
      catch(_){try{window.lucide.createIcons();}catch(__){}}
    }

    takeoverDone=true;
    setOpen(false);
    return true;
  }

  function waitForRuntime(attempt=0){
    const ready=Boolean(document.body?.dataset?.agencyRuntime);
    const maxed=attempt>=60;
    if(ready||maxed){
      /* Let the runtime finish its final synchronous mount, then replace its
         controls once. This strips all competing element-level listeners. */
      setTimeout(()=>replaceControls(),ready?80:0);
      return;
    }
    setTimeout(()=>waitForRuntime(attempt+1),100);
  }

  function onViewportChange(){
    if(!takeoverDone){waitForRuntime();return;}
    if(!mobile.matches)setOpen(false);
    else sync();
  }

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&mobile.matches&&shell?.classList.contains('sidebar-open')){
      event.preventDefault();
      setOpen(false);
      menu?.focus?.();
    }
  },true);

  if(typeof mobile.addEventListener==='function')mobile.addEventListener('change',onViewportChange);
  else if(typeof mobile.addListener==='function')mobile.addListener(onViewportChange);

  window.addEventListener('pageshow',()=>{
    if(takeoverDone)sync();
    else waitForRuntime();
  });

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>waitForRuntime(),{once:true});
  }else{
    waitForRuntime();
  }
})();