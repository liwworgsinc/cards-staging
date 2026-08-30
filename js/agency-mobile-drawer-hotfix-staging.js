/* LIW Cards staging — isolated Agency mobile drawer hotfix.
   This file intentionally owns only mobile drawer open/close interactions. */
(function(){
  'use strict';

  if(window.__LIW_AGENCY_MOBILE_DRAWER_HOTFIX__)return;
  window.__LIW_AGENCY_MOBILE_DRAWER_HOTFIX__=true;

  const mobile=window.matchMedia('(max-width:900px)');
  let observer=null;
  let lastPointerAction=0;

  function parts(){
    return {
      shell:document.getElementById('agency-workspace-shell'),
      sidebar:document.querySelector('.agency-sidebar'),
      menu:document.getElementById('agency-menu-button'),
      close:document.getElementById('agency-sidebar-close'),
      backdrop:document.querySelector('[data-agency-runtime-backdrop]')
    };
  }

  function ensureStyle(){
    if(document.getElementById('agency-mobile-drawer-hotfix-style'))return;
    const style=document.createElement('style');
    style.id='agency-mobile-drawer-hotfix-style';
    style.textContent=`
      #agency-sidebar-close{display:none}
      @media(max-width:900px){
        #agency-sidebar-close{
          display:grid!important;position:absolute!important;
          top:max(12px,env(safe-area-inset-top))!important;right:12px!important;
          z-index:2147483001!important;width:44px!important;height:44px!important;
          min-width:44px!important;min-height:44px!important;place-items:center!important;
          padding:0!important;margin:0!important;border:1px solid rgba(255,255,255,.18)!important;
          border-radius:12px!important;background:rgba(255,255,255,.11)!important;color:#fff!important;
          cursor:pointer!important;touch-action:manipulation!important;pointer-events:auto!important
        }
        #agency-sidebar-close svg{width:22px!important;height:22px!important;pointer-events:none!important}
        .agency-mobile-sidebar-backdrop{
          position:fixed!important;inset:0!important;z-index:1090!important;display:block!important;
          border:0!important;padding:0!important;margin:0!important;background:rgba(7,16,42,.56)!important;
          opacity:0!important;visibility:hidden!important;pointer-events:none!important;
          touch-action:manipulation!important;transition:opacity .18s ease,visibility .18s ease!important
        }
        .agency-mobile-sidebar-backdrop.is-visible{
          opacity:1!important;visibility:visible!important;pointer-events:auto!important
        }
        body.agency-mobile-nav-open{overflow:hidden!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureElements(){
    ensureStyle();
    const {shell,sidebar}=parts();
    if(!shell||!sidebar)return false;

    let close=document.getElementById('agency-sidebar-close');
    if(!close){
      close=document.createElement('button');
      close.id='agency-sidebar-close';
      close.className='agency-sidebar-close';
      close.type='button';
      close.setAttribute('aria-label','Close Agency navigation');
      close.innerHTML='<i data-lucide="x"></i>';
      sidebar.prepend(close);
    }

    let backdrop=document.querySelector('[data-agency-runtime-backdrop]');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='agency-mobile-sidebar-backdrop';
      backdrop.dataset.agencyRuntimeBackdrop='true';
      backdrop.setAttribute('aria-label','Close Agency navigation');
      shell.insertAdjacentElement('afterend',backdrop);
    }

    if(window.lucide)window.lucide.createIcons();
    sync();
    return true;
  }

  function sync(){
    const {shell,menu,backdrop}=parts();
    if(!shell)return;
    const open=mobile.matches&&shell.classList.contains('sidebar-open');
    document.body.classList.toggle('agency-mobile-nav-open',open);
    backdrop?.classList.toggle('is-visible',open);
    if(menu){
      menu.setAttribute('aria-expanded',open?'true':'false');
      menu.setAttribute('aria-controls','agency-workspace-shell');
      menu.setAttribute('aria-label',open?'Close Agency navigation':'Open Agency navigation');
    }
  }

  function openDrawer(){
    const {shell}=parts();
    if(!shell||!mobile.matches)return;
    shell.classList.add('sidebar-open');
    sync();
  }

  function closeDrawer(){
    const {shell}=parts();
    if(!shell)return;
    shell.classList.remove('sidebar-open');
    sync();
  }

  function toggleDrawer(){
    const {shell}=parts();
    if(!shell||!mobile.matches)return;
    shell.classList.contains('sidebar-open')?closeDrawer():openDrawer();
  }

  function actionTarget(event){
    const target=event.target instanceof Element?event.target:null;
    if(!target)return null;
    const {sidebar,menu,close,backdrop,shell}=parts();
    if(!shell||!sidebar)return null;
    if(menu&&(target===menu||target.closest('#agency-menu-button')))return 'menu';
    if(close&&(target===close||target.closest('#agency-sidebar-close')))return 'close';
    if(backdrop&&(target===backdrop||target.closest('[data-agency-runtime-backdrop]')))return 'outside';
    if(mobile.matches&&shell.classList.contains('sidebar-open')&&!target.closest('.agency-sidebar'))return 'outside';
    return null;
  }

  function handlePrimaryAction(event){
    if(!mobile.matches)return;
    const action=actionTarget(event);
    if(!action)return;

    const now=performance.now();
    if(event.type==='click'&&now-lastPointerAction<700){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if(event.type==='pointerup')lastPointerAction=now;

    event.preventDefault();
    event.stopImmediatePropagation();
    if(action==='menu')toggleDrawer();
    else closeDrawer();
  }

  function handleSidebarLink(event){
    if(!mobile.matches)return;
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest('.agency-sidebar a[href]'))closeDrawer();
  }

  function mount(){
    if(!ensureElements())return;
    const {shell}=parts();
    if(shell&&!observer){
      observer=new MutationObserver(sync);
      observer.observe(shell,{attributes:true,attributeFilter:['class']});
    }
  }

  document.addEventListener('pointerup',handlePrimaryAction,true);
  document.addEventListener('click',handlePrimaryAction,true);
  document.addEventListener('click',handleSidebarLink,false);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&mobile.matches)closeDrawer();
  },true);

  const onViewportChange=()=>{
    mount();
    if(!mobile.matches)closeDrawer();
    else sync();
  };
  if(typeof mobile.addEventListener==='function')mobile.addEventListener('change',onViewportChange);
  else if(typeof mobile.addListener==='function')mobile.addListener(onViewportChange);

  window.addEventListener('pageshow',mount);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  setTimeout(mount,250);
  setTimeout(mount,900);
})();
