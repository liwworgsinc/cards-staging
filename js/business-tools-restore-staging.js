(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const toolSpecs=[
    {href:'media.html',icon:'files',label:'Video & downloads'},
    {href:'email-signature.html',icon:'signature',label:'Email signature'},
    {href:'virtual-background.html',icon:'monitor-up',label:'Virtual background',dataset:'liwVirtualBackgroundLink'}
  ];
  let affiliateObserver=null;

  function removeLegacyAffiliateSidebarLink(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar)return false;
    sidebar.querySelectorAll('a[data-liw-program-link="affiliate"],a[href="affiliate-dashboard.html"]').forEach(link=>{
      if(link.id==='liw-affiliate-nav-link'||String(link.getAttribute('href')||'')==='earn-with-liw.html')return;
      link.remove();
    });
    return true;
  }

  function ensureToolContainer(sidebar){
    let details=sidebar.querySelector('.liw-sidebar-tools');
    if(!details){
      details=document.createElement('details');
      details.className='liw-sidebar-tools';
      details.open=true;
      details.innerHTML='<summary><span><i data-lucide="briefcase-business" size="14"></i> Business tools</span><i data-lucide="chevron-down" size="14"></i></summary><nav></nav>';
      const accountLabel=[...sidebar.querySelectorAll('.sidebar-label')].find(item=>String(item.textContent||'').trim().toLowerCase()==='account');
      if(accountLabel)accountLabel.insertAdjacentElement('beforebegin',details);
      else sidebar.appendChild(details);
    }
    details.open=true;
    return details.querySelector('nav');
  }

  function ensureSidebarTools(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar)return false;
    const nav=ensureToolContainer(sidebar);
    if(!nav)return false;

    toolSpecs.forEach(spec=>{
      const matches=[...sidebar.querySelectorAll(`a[href="${spec.href}"]`)];
      let link=matches[0]||null;
      matches.slice(1).forEach(item=>item.remove());
      if(!link){
        link=document.createElement('a');
        link.href=spec.href;
        link.innerHTML=`<i data-lucide="${spec.icon}" size="18"></i> ${spec.label}`;
      }
      link.hidden=false;
      link.removeAttribute('hidden');
      link.style.removeProperty('display');
      if(spec.dataset)link.dataset[spec.dataset]='true';
      if(!nav.contains(link))nav.appendChild(link);
    });

    if(globalThis.lucide)lucide.createIcons();
    return true;
  }

  function dashboardToolMarkup(href,icon,title,copy,marker){
    const link=document.createElement('a');
    link.className='card dashboard-tool';
    link.href=href;
    if(marker)link.dataset[marker]='true';
    link.innerHTML=`<span><i data-lucide="${icon}"></i></span><div><strong>${title}</strong><p>${copy}</p></div><i data-lucide="arrow-right"></i>`;
    return link;
  }

  function ensureDashboardTools(){
    if(String(location.pathname.split('/').pop()||'').toLowerCase()!=='dashboard.html')return;
    const grid=document.querySelector('.dashboard-tool-grid');
    if(!grid)return;

    let email=grid.querySelector('a[href="email-signature.html"]');
    if(!email){
      email=dashboardToolMarkup('email-signature.html','signature','Create an email signature','Turn any LIW card into a professional Gmail, Outlook, or Apple Mail signature.','liwEmailSignatureTool');
      const leads=grid.querySelector('a[href="leads.html"]');
      if(leads)leads.insertAdjacentElement('afterend',email); else grid.appendChild(email);
    }
    email.hidden=false;
    email.removeAttribute('hidden');
    email.style.removeProperty('display');

    let background=grid.querySelector('a[href="virtual-background.html"]');
    if(!background){
      background=dashboardToolMarkup('virtual-background.html','monitor-up','Create a virtual background','Build a branded background for Zoom, Meet, Teams, and online meetings.','liwVirtualBackgroundTool');
      email.insertAdjacentElement('afterend',background);
    }
    background.hidden=false;
    background.removeAttribute('hidden');
    background.style.removeProperty('display');

    if(globalThis.lucide)lucide.createIcons();
  }

  function watchLegacyAffiliateSidebarLink(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar||affiliateObserver)return;
    affiliateObserver=new MutationObserver(()=>removeLegacyAffiliateSidebarLink());
    affiliateObserver.observe(sidebar,{childList:true,subtree:true});
  }

  function restore(){
    removeLegacyAffiliateSidebarLink();
    ensureSidebarTools();
    ensureDashboardTools();
    removeLegacyAffiliateSidebarLink();
    watchLegacyAffiliateSidebarLink();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});
  else restore();

  [150,450,1000,1800].forEach(delay=>setTimeout(restore,delay));
})();
