/* LIW Cards staging — restore dashboard business-tool cards only.
   Sidebar navigation is owned exclusively by sidebar-premium-staging.js. */
(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  function pageName(){return String(location.pathname.split('/').pop()||'').toLowerCase();}

  function dashboardToolMarkup(href,icon,title,copy,marker){
    const link=document.createElement('a');
    link.className='card dashboard-tool';
    link.href=href;
    if(marker)link.dataset[marker]='true';
    link.innerHTML=`<span><i data-lucide="${icon}"></i></span><div><strong>${title}</strong><p>${copy}</p></div><i data-lucide="arrow-right"></i>`;
    return link;
  }

  function ensureDashboardTools(){
    if(pageName()!=='dashboard.html')return;
    const grid=document.querySelector('.dashboard-tool-grid');
    if(!grid)return;

    const ensure=(selector,href,icon,title,copy,marker,after=null)=>{
      let link=grid.querySelector(selector);
      if(!link){
        link=dashboardToolMarkup(href,icon,title,copy,marker);
        if(after?.isConnected)after.insertAdjacentElement('afterend',link);else grid.appendChild(link);
      }
      link.hidden=false;
      link.removeAttribute('hidden');
      link.style.removeProperty('display');
      return link;
    };

    const email=ensure('a[href="email-signature.html"]','email-signature.html','signature','Create an email signature','Turn any LIW card into a professional Gmail, Outlook, or Apple Mail signature.','liwEmailSignatureTool');
    const background=ensure('a[href="virtual-background.html"]','virtual-background.html','monitor-up','Create a virtual background','Build a branded background for Zoom, Meet, Teams, and online meetings.','liwVirtualBackgroundTool',email);
    const domains=ensure('a[href="domains.html"]','domains.html','globe-2','Find a custom domain','Search live GoDaddy availability and pricing for a memorable web address.','liwCustomDomainsTool',background);
    const designer=ensure('a[data-liw-hire-designer-tool],a[href^="hire-designer.html?"]','hire-designer.html?from=dashboard','wand-sparkles','Have LIW design my card','Want the finished card without doing the setup yourself? Choose a design service and start a guided done-for-you project.','liwHireDesignerTool',domains);
    ensure('a[href="designer-orders.html"]','designer-orders.html','clipboard-list','Track designer orders','Complete your intake, follow production, message LIW, request revisions, and approve your finished design.','liwDesignerOrdersTool',designer);

    try{window.lucide?.createIcons();}catch(_){}
  }

  function mountCardLimitUpgrade(){
    if(pageName()!=='dashboard.html'||document.querySelector('script[data-liw-card-limit-upgrade]'))return;
    const script=document.createElement('script');
    script.src=typeof liwUrl==='function'?liwUrl('js/card-limit-upgrade-staging.js?v=20260829-1'):'js/card-limit-upgrade-staging.js?v=20260829-1';
    script.dataset.liwCardLimitUpgrade='true';
    document.body.appendChild(script);
  }

  function mountAdminPlanOverrides(){
    if(pageName()!=='admin.html')return;
    if(!document.querySelector('link[data-liw-admin-plan-overrides]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=typeof liwUrl==='function'?liwUrl('css/admin-plan-overrides-staging.css?v=20260904-1'):'css/admin-plan-overrides-staging.css?v=20260904-1';
      link.dataset.liwAdminPlanOverrides='true';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-liw-admin-plan-overrides]')){
      const script=document.createElement('script');
      script.src=typeof liwUrl==='function'?liwUrl('js/admin-plan-overrides-staging.js?v=20260904-1'):'js/admin-plan-overrides-staging.js?v=20260904-1';
      script.dataset.liwAdminPlanOverrides='true';
      document.body.appendChild(script);
    }
  }

  function restore(){
    ensureDashboardTools();
    mountCardLimitUpgrade();
    mountAdminPlanOverrides();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});else restore();
  [300,900,1800].forEach(delay=>setTimeout(restore,delay));
})();
