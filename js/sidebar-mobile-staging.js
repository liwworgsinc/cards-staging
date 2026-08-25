(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  let sidebarObserver=null;
  let documentBound=false;

  function isMobile(){
    return window.matchMedia('(max-width:820px)').matches;
  }

  function getSidebar(){
    return document.querySelector('.sidebar');
  }

  function getToggle(){
    return document.getElementById('sidebar-toggle')||document.querySelector('.mobile-sidebar-toggle');
  }

  function ensureBackdrop(){
    let backdrop=document.querySelector('.liw-sidebar-mobile-backdrop');
    if(backdrop)return backdrop;
    backdrop=document.createElement('div');
    backdrop.className='liw-sidebar-mobile-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function ensureCloseButton(sidebar){
    let button=sidebar.querySelector('.liw-sidebar-mobile-close');
    if(button)return button;
    button=document.createElement('button');
    button.type='button';
    button.className='liw-sidebar-mobile-close';
    button.setAttribute('aria-label','Close navigation');
    button.innerHTML='<i data-lucide="x" size="20"></i>';
    sidebar.appendChild(button);
    return button;
  }

  function syncState(){
    const sidebar=getSidebar();
    if(!sidebar)return;
    const backdrop=ensureBackdrop();
    const toggle=getToggle();
    const open=isMobile()&&sidebar.classList.contains('open');

    backdrop.classList.toggle('is-open',open);
    document.body.classList.toggle('liw-mobile-sidebar-open',open);
    if(toggle){
      toggle.setAttribute('aria-controls',sidebar.id||'sidebar');
      toggle.setAttribute('aria-expanded',open?'true':'false');
    }
  }

  function closeSidebar({restoreFocus=false}={}){
    const sidebar=getSidebar();
    if(!sidebar)return;
    sidebar.classList.remove('open');
    syncState();
    if(restoreFocus)getToggle()?.focus?.();
  }

  function bindSidebar(sidebar){
    const closeButton=ensureCloseButton(sidebar);
    const backdrop=ensureBackdrop();

    if(!closeButton.dataset.liwBound){
      closeButton.dataset.liwBound='true';
      closeButton.addEventListener('click',()=>closeSidebar({restoreFocus:true}));
    }
    if(!backdrop.dataset.liwBound){
      backdrop.dataset.liwBound='true';
      backdrop.addEventListener('click',()=>closeSidebar({restoreFocus:true}));
    }
    if(!sidebar.dataset.liwMobileCloseBound){
      sidebar.dataset.liwMobileCloseBound='true';
      sidebar.addEventListener('click',event=>{
        if(!isMobile())return;
        const target=event.target instanceof Element?event.target:null;
        if(target?.closest('a[href]'))setTimeout(()=>closeSidebar(),0);
      });
    }

    if(!sidebarObserver){
      sidebarObserver=new MutationObserver(mutations=>{
        if(mutations.some(mutation=>mutation.type==='attributes'&&mutation.attributeName==='class'))syncState();
      });
      sidebarObserver.observe(sidebar,{attributes:true,attributeFilter:['class']});
    }

    if(!documentBound){
      documentBound=true;
      document.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&isMobile()&&getSidebar()?.classList.contains('open')){
          event.preventDefault();
          closeSidebar({restoreFocus:true});
        }
      });

      document.addEventListener('click',event=>{
        const target=event.target instanceof Element?event.target:null;
        const toggle=target?.closest('#sidebar-toggle,.mobile-sidebar-toggle');
        if(!toggle||!isMobile())return;
        const sidebarNow=getSidebar();
        if(!sidebarNow)return;
        const wasOpen=sidebarNow.classList.contains('open');
        // Let each page's existing toggle handler run first. If it did nothing,
        // provide a shared staging fallback so every workspace page can still open it.
        setTimeout(()=>{
          const current=getSidebar();
          if(!current)return;
          if(current.classList.contains('open')===wasOpen)current.classList.toggle('open');
          syncState();
        },0);
      },true);

      window.addEventListener('resize',()=>{
        if(!isMobile())closeSidebar();
        else syncState();
      });
    }

    syncState();
    if(window.lucide)window.lucide.createIcons();
  }

  function mount(){
    const sidebar=getSidebar();
    if(!sidebar)return false;
    bindSidebar(sidebar);
    return true;
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',mount,{once:true});
  }else{
    mount();
  }
  setTimeout(mount,350);
  setTimeout(mount,1000);
})();
