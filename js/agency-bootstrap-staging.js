/* LIW Cards — staging-only Agency runtime bootstrap.
   One entry point owns enhancement load order. Legacy section/collapse controllers
   are intentionally excluded so the white Work Center has a single UI owner. */
(function(){
  'use strict';

  if(window.__LIW_AGENCY_RUNTIME_BOOTSTRAP__)return;
  window.__LIW_AGENCY_RUNTIME_BOOTSTRAP__=true;

  const VERSION='20260830-agency-runtime-5';
  const MOBILE=window.matchMedia('(max-width:900px)');
  let mobileNavObserver=null;

  function addCss(key,href){
    if(document.querySelector(`link[data-agency-runtime-css="${key}"]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.dataset.agencyRuntimeCss=key;
    document.head.appendChild(link);
  }

  function loadJs(key,src){
    const existing=document.querySelector(`script[data-agency-runtime-js="${key}"]`);
    if(existing)return Promise.resolve(existing);
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.dataset.agencyRuntimeJs=key;
      script.addEventListener('load',()=>resolve(script),{once:true});
      script.addEventListener('error',()=>reject(new Error(`Agency module failed to load: ${key}`)),{once:true});
      document.body.appendChild(script);
    });
  }

  async function safeLoad(key,src){
    try{return await loadJs(key,src);}
    catch(error){console.error(error);return null;}
  }

  function qaPreviewPlan(){
    try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}
    catch(_){return '';}
  }

  function syncSidebar(planKey,isAdmin=false,isPlanPreview=false){
    const pro=planKey==='white_label'||(isAdmin&&!isPlanPreview);
    const team=document.getElementById('agency-team-nav');
    const branding=document.getElementById('agency-branding-nav');
    if(team)team.hidden=!pro;
    if(branding)branding.hidden=!pro;
  }

  function shouldStayOnAgency(){
    const preview=qaPreviewPlan();
    if(typeof isLiwStagingPlanQaHost==='function'&&isLiwStagingPlanQaHost()&&['starter','lite','plus','pro'].includes(preview)){
      location.replace(typeof liwUrl==='function'?liwUrl('agency.html'):'agency.html');
      return false;
    }
    return true;
  }

  function loadStyles(){
    addCss('results','css/agency-results.css?v=20260821-1');
    addCss('cards','css/agency-cards-polish.css?v=20260830-freeze-fix-1');
    addCss('settings','css/agency-settings-hub.css?v=20260821-1');
    addCss('capacity','css/agency-capacity-pack-staging.css?v=20260821-2');
    addCss('add-client-gap','css/agency-add-client-dialog-gap-fix-staging.css?v=20260821-2');
    addCss('approval','css/agency-approval-workflow-staging.css?v=20260821-6');
    addCss('approval-close','css/agency-approval-close-fix-staging.css?v=20260821-1');
    addCss('team-management',`css/agency-team-management-staging.css?v=${VERSION}`);
    addCss('white-workcenter',`css/agency-white-workcenter-staging.css?v=${VERSION}`);
    addCss('runtime-guards',`css/agency-runtime-staging.css?v=${VERSION}`);

    /* Responsive styles are media-scoped. The old mobile MutationObserver /
       accordion JavaScript is deliberately not part of this runtime. */
    addCss('mobile','css/agency-mobile-workspace-staging.css?v=20260830-agency-runtime-2');
    addCss('mobile-tight','css/agency-mobile-workspace-tight-staging.css?v=20260830-agency-runtime-2');
  }

  function ensureMobileNavStyles(){
    if(document.getElementById('agency-mobile-nav-runtime-style'))return;
    const style=document.createElement('style');
    style.id='agency-mobile-nav-runtime-style';
    style.textContent=`
      .agency-sidebar-close{display:none}
      @media(max-width:900px){
        .agency-sidebar{position:fixed!important}
        .agency-sidebar-close{
          position:absolute;top:max(12px,env(safe-area-inset-top));right:12px;z-index:4;
          width:42px;height:42px;display:grid!important;place-items:center;padding:0;
          border:1px solid rgba(255,255,255,.14);border-radius:12px;
          background:rgba(255,255,255,.09);color:#fff;cursor:pointer;
          box-shadow:0 6px 18px rgba(0,0,0,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)
        }
        .agency-sidebar-close svg{width:21px;height:21px;stroke-width:2.2}
        .agency-sidebar-close:focus-visible{outline:3px solid rgba(241,215,143,.45);outline-offset:2px}
        .agency-sidebar .brand{padding-right:54px}
      }
    `;
    document.head.appendChild(style);
  }

  function getMobileNavParts(){
    return {
      shell:document.getElementById('agency-workspace-shell'),
      sidebar:document.querySelector('.agency-sidebar'),
      menu:document.getElementById('agency-menu-button'),
      backdrop:document.querySelector('[data-agency-runtime-backdrop]'),
      close:document.getElementById('agency-sidebar-close')
    };
  }

  function syncMobileNavState(){
    const {shell,menu,backdrop}=getMobileNavParts();
    if(!shell)return;
    const open=MOBILE.matches&&shell.classList.contains('sidebar-open');
    document.body.classList.toggle('agency-mobile-nav-open',open);
    if(backdrop)backdrop.classList.toggle('is-visible',open);
    if(menu){
      menu.setAttribute('aria-expanded',open?'true':'false');
      menu.setAttribute('aria-label',open?'Close Agency navigation':'Open Agency navigation');
    }
  }

  function closeMobileNav(){
    const {shell}=getMobileNavParts();
    shell?.classList.remove('sidebar-open');
    syncMobileNavState();
  }

  function toggleMobileNav(){
    const {shell}=getMobileNavParts();
    if(!shell||!MOBILE.matches)return;
    shell.classList.toggle('sidebar-open');
    syncMobileNavState();
  }

  function mountMobileNav(){
    ensureMobileNavStyles();
    const shell=document.getElementById('agency-workspace-shell');
    const sidebar=document.querySelector('.agency-sidebar');
    const menu=document.getElementById('agency-menu-button');
    if(!shell||!sidebar)return;

    let backdrop=document.querySelector('[data-agency-runtime-backdrop]');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='agency-mobile-sidebar-backdrop';
      backdrop.dataset.agencyRuntimeBackdrop='true';
      backdrop.setAttribute('aria-label','Close Agency navigation');
      shell.insertAdjacentElement('afterend',backdrop);
    }
    if(!backdrop.dataset.agencyCloseWired){
      backdrop.dataset.agencyCloseWired='true';
      backdrop.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        closeMobileNav();
      });
    }

    let close=document.getElementById('agency-sidebar-close');
    if(!close){
      close=document.createElement('button');
      close.id='agency-sidebar-close';
      close.className='agency-sidebar-close';
      close.type='button';
      close.setAttribute('aria-label','Close Agency navigation');
      close.innerHTML='<i data-lucide="x"></i>';
      sidebar.prepend(close);
      if(window.lucide)lucide.createIcons({nodes:[close]});
    }
    if(!close.dataset.agencyCloseWired){
      close.dataset.agencyCloseWired='true';
      close.addEventListener('click',event=>{
        event.preventDefault();
        event.stopImmediatePropagation();
        closeMobileNav();
      },true);
    }

    /* Own the mobile menu in capture phase. agency-dashboard.js also has a
       historical bubble-phase toggle; stopping it here prevents a second handler
       from immediately reversing the state we just set. */
    if(menu&&!menu.dataset.agencyMobileStateWired){
      menu.dataset.agencyMobileStateWired='true';
      menu.setAttribute('aria-controls','agency-workspace-shell');
      menu.setAttribute('aria-expanded','false');
      menu.addEventListener('click',event=>{
        if(!MOBILE.matches)return;
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleMobileNav();
      },true);
    }

    sidebar.querySelectorAll('a').forEach(link=>{
      if(link.dataset.agencyMobileCloseWired)return;
      link.dataset.agencyMobileCloseWired='true';
      link.addEventListener('click',()=>{
        if(MOBILE.matches)closeMobileNav();
      });
    });

    if(!mobileNavObserver){
      mobileNavObserver=new MutationObserver(syncMobileNavState);
      mobileNavObserver.observe(shell,{attributes:true,attributeFilter:['class']});
    }

    syncMobileNavState();
  }

  function handleMobileChange(){
    mountMobileNav();
    if(!MOBILE.matches)closeMobileNav();
    else syncMobileNavState();
  }

  function onMobileNavKeydown(event){
    if(event.key==='Escape'&&MOBILE.matches)closeMobileNav();
  }

  async function loadCoreEnhancements(){
    /* Security guard first: this is the fixed, idempotent version. Mark it with
       the legacy selector too so agency-hosting-ui-v2 does not inject an older
       cached copy of the same guard. */
    const guard=await safeLoad('owner-data-guard',`js/agency-owner-data-guard-staging.js?v=${VERSION}`);
    if(guard)guard.dataset.liwAgencyOwnerDataGuard='true';

    await safeLoad('hosting-ui',`js/agency-hosting-ui-v2.js?v=${VERSION}`);
    await safeLoad('hosting-download',`js/agency-hosting-download-v2.js?v=${VERSION}`);
    await safeLoad('hosting-file',`js/agency-hosting-file-v2.js?v=${VERSION}`);
    await safeLoad('launch-ui',`js/agency-launch-ui.js?v=${VERSION}`);
    await safeLoad('client-delete',`js/agency-client-delete.js?v=${VERSION}`);
  }

  async function syncAccess(){
    try{
      if(typeof getLiwAccessContext!=='function')return;
      const access=await getLiwAccessContext(null,{refresh:true});
      syncSidebar(String(access?.planKey||''),Boolean(access?.isAdmin),Boolean(access?.isPlanPreview));
    }catch(error){console.warn('Agency access sync:',error);}
  }

  async function boot(){
    if(!shouldStayOnAgency())return;

    loadStyles();
    mountMobileNav();
    document.addEventListener('keydown',onMobileNavKeydown);
    if(typeof MOBILE.addEventListener==='function')MOBILE.addEventListener('change',handleMobileChange);
    else if(typeof MOBILE.addListener==='function')MOBILE.addListener(handleMobileChange);
    await loadCoreEnhancements();

    /* White Work Center owns navigation/screen presentation. Every module after
       it owns a distinct feature area; none owns global section collapsing. */
    await safeLoad('white-workcenter',`js/agency-white-workcenter-staging.js?v=${VERSION}`);
    await safeLoad('team-management',`js/agency-team-management-staging.js?v=${VERSION}`);
    await safeLoad('results','js/agency-results.js?v=20260821-1');
    await safeLoad('settings','js/agency-settings-hub.js?v=20260821-1');
    await safeLoad('settings-display','js/agency-settings-display-sync.js?v=20260826-white-1');
    await safeLoad('capacity','js/agency-capacity-pack-staging.js?v=20260821-2');
    await safeLoad('approval','js/agency-approval-workflow-staging.js?v=20260821-5');
    await safeLoad('approval-live-guard','js/agency-approval-live-card-guard-staging.js?v=20260821-1');
    await safeLoad('approval-close','js/agency-approval-close-fix-staging.js?v=20260821-1');
    await safeLoad('domains',`js/agency-domain-entrypoints-staging.js?v=${VERSION}`);

    await syncAccess();
    document.body.dataset.agencyRuntime=VERSION;
    mountMobileNav();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();