/* LIW Cards staging — shared sidebar collapse controller. */
(function(){
  if(window.__LIW_SHARED_SIDEBAR_COLLAPSE__)return;
  window.__LIW_SHARED_SIDEBAR_COLLAPSE__=true;

  const STORAGE_KEY='liw:dashboard-sidebar-collapsed:v1';
  const ROOT_CLASS='liw-sidebar-collapsed';
  const desktop=window.matchMedia('(min-width:821px)');

  function readCollapsed(){
    try{return localStorage.getItem(STORAGE_KEY)==='1';}catch(_){return false;}
  }

  function saveCollapsed(value){
    try{localStorage.setItem(STORAGE_KEY,value?'1':'0');}catch(_){ }
  }

  function setCollapsed(value,{save=true}={}){
    document.documentElement.classList.toggle(ROOT_CLASS,Boolean(value));
    if(save)saveCollapsed(Boolean(value));
    updateToggleUi();
  }

  function getShell(){
    const dashboard=document.querySelector('.dashboard');
    const sidebar=dashboard?.querySelector(':scope > .sidebar')||null;
    return {dashboard,sidebar};
  }

  function ensureToggle(dashboard){
    let toggle=dashboard?.querySelector('#sidebar-toggle, .mobile-sidebar-toggle')||null;
    if(toggle)return toggle;

    const topbar=dashboard?.querySelector('.topbar');
    if(!topbar)return null;

    toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='mobile-sidebar-toggle icon-btn';
    toggle.id='sidebar-toggle';
    toggle.dataset.liwSidebarInjected='true';
    toggle.setAttribute('aria-label','Toggle navigation');
    toggle.innerHTML='<i data-lucide="menu"></i>';

    const firstGroup=topbar.firstElementChild;
    if(firstGroup)firstGroup.prepend(toggle); else topbar.prepend(toggle);
    return toggle;
  }

  function labelSidebarItems(sidebar){
    sidebar?.querySelectorAll('nav a, nav button').forEach(item=>{
      if(item.hasAttribute('title'))return;
      const label=String(item.textContent||'').replace(/\s+/g,' ').trim();
      if(label)item.setAttribute('title',label);
    });
  }

  function updateToggleUi(){
    const {dashboard}=getShell();
    if(!dashboard)return;
    const toggle=dashboard.querySelector('#sidebar-toggle, .mobile-sidebar-toggle');
    if(!toggle)return;

    const collapsed=document.documentElement.classList.contains(ROOT_CLASS);
    const desktopNow=desktop.matches;
    const iconName=desktopNow?(collapsed?'panel-left-open':'panel-left-close'):'menu';
    toggle.setAttribute('aria-expanded',desktopNow?String(!collapsed):'false');
    toggle.setAttribute('aria-label',desktopNow?(collapsed?'Expand sidebar':'Collapse sidebar'):'Open navigation');
    toggle.title=desktopNow?(collapsed?'Expand sidebar':'Collapse sidebar'):'Open navigation';

    if(toggle.dataset.liwSidebarIcon!==iconName){
      toggle.dataset.liwSidebarIcon=iconName;
      toggle.innerHTML=`<i data-lucide="${iconName}"></i>`;
      if(window.lucide){try{window.lucide.createIcons();}catch(_){ }}
    }
  }

  function bindToggle(toggle,sidebar){
    if(!toggle||toggle.dataset.liwSidebarCollapseBound==='true')return;
    toggle.dataset.liwSidebarCollapseBound='true';

    toggle.addEventListener('click',event=>{
      if(desktop.matches){
        event.preventDefault();
        event.stopImmediatePropagation();
        sidebar?.classList.remove('open');
        setCollapsed(!document.documentElement.classList.contains(ROOT_CLASS));
        return;
      }

      if(toggle.dataset.liwSidebarInjected==='true'){
        event.preventDefault();
        event.stopImmediatePropagation();
        sidebar?.classList.toggle('open');
      }
    },true);
  }

  function mount(){
    const {dashboard,sidebar}=getShell();
    if(!dashboard||!sidebar)return false;

    labelSidebarItems(sidebar);
    const toggle=ensureToggle(dashboard);
    bindToggle(toggle,sidebar);
    updateToggleUi();
    return true;
  }

  if(readCollapsed())document.documentElement.classList.add(ROOT_CLASS);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',mount,{once:true});
  }else{
    mount();
  }

  [120,400,900,1600].forEach(delay=>setTimeout(mount,delay));

  desktop.addEventListener?.('change',()=>{
    const {sidebar}=getShell();
    if(desktop.matches)sidebar?.classList.remove('open');
    updateToggleUi();
  });
})();
