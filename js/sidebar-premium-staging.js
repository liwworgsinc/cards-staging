/* LIW Cards staging — one canonical authenticated workspace sidebar.
   This is the single source of truth for every standard .sidebar in staging.
   Page-specific scripts may manage page content, but they should not own navigation markup. */
(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;
  if(window.__LIW_UNIVERSAL_SIDEBAR_STAGING__)return;
  window.__LIW_UNIVERSAL_SIDEBAR_STAGING__=true;

  const current=(location.pathname.split('/').pop()||'dashboard.html').toLowerCase();
  const state={user:null,access:null,latest:null,hydrated:false,hydrating:false};
  let settleTimer=null;

  const icon=(name,size=18)=>`<i data-lucide="${name}" size="${size}"></i>`;
  const fileOf=href=>{
    try{return new URL(href||'',location.href).pathname.split('/').pop()?.toLowerCase()||'';}
    catch(_){return '';}
  };

  function ensureStyles(){
    let link=document.querySelector('link[data-liw-premium-sidebar],link[data-premium-sidebar]');
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      link.dataset.liwPremiumSidebar='true';
      document.head.appendChild(link);
    }
    link.href=typeof liwUrl==='function'
      ? liwUrl('css/sidebar-premium-staging.css?v=20260909-universal-sidebar-1')
      : 'css/sidebar-premium-staging.css?v=20260909-universal-sidebar-1';
  }

  function navLink(href,label,iconName,attrs={}){
    const link=document.createElement('a');
    link.href=href;
    link.innerHTML=icon(iconName)+' <span>'+label+'</span>';
    Object.entries(attrs).forEach(([key,value])=>{
      if(value===null||value===undefined||value===false)return;
      if(key==='dataset')Object.entries(value).forEach(([dataKey,dataValue])=>{link.dataset[dataKey]=String(dataValue)});
      else if(value===true)link.setAttribute(key,'');
      else link.setAttribute(key,String(value));
    });
    return link;
  }

  function button(label,iconName,handler){
    const node=document.createElement('button');
    node.type='button';
    node.innerHTML=icon(iconName)+' <span>'+label+'</span>';
    if(handler)node.addEventListener('click',handler);
    return node;
  }

  function isAdminHint(root){
    if(current==='admin.html'||current==='admin-music-ads.html')return true;
    const link=[...root.querySelectorAll('a[href="admin.html"]')].find(item=>!item.hidden&&!item.hasAttribute('hidden'));
    return Boolean(link);
  }

  function hasAgencyHint(root){
    return Boolean(root.querySelector('a[href="agency-dashboard.html"],a[data-liw-program-link="agency-workspace"]'));
  }

  function isAdmin(){
    if(state.access)return Boolean(state.access.isAdmin);
    return false;
  }

  function hasAgency(){
    if(!state.access)return false;
    return Boolean(
      state.access.isAdmin ||
      state.access.has?.('client_management') ||
      ['agency','white_label'].includes(String(state.access.planKey||''))
    );
  }

  function profileValues(){
    const user=state.user,access=state.access,latest=state.latest;
    const meta=user?.user_metadata||{};
    const display=String(access?.profile?.full_name||meta.full_name||meta.name||'').trim()
      || String(user?.email||'').split('@')[0]
      || 'My workspace';
    const secondary=String(meta.liw_business_name||meta.company_name||latest?.company_name||user?.email||'Account & profile').trim();
    const initials=display.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'LIW';
    return {display,secondary,initials};
  }

  function planValues(){
    const access=state.access;
    if(!access)return {title:'Checking plan…',copy:'Loading your workspace access.'};
    if(access.isPlanPreview)return {
      title:`${access.planName||'Plan'} preview`,
      copy:`${Number(access.cardLimit||1)} card${Number(access.cardLimit||1)===1?'':'s'} included · preview rules active.`
    };
    if(access.isAdmin)return {title:'LIW Admin workspace',copy:'100 cards included · all software features unlocked.'};
    return {
      title:`${access.planName||'Free'} plan`,
      copy:`${Number(access.cardLimit||1)} card${Number(access.cardLimit||1)===1?'':'s'} included.`
    };
  }

  function currentCardNode(){
    const latest=state.latest;
    const card=document.createElement('a');
    card.className='liw-sidebar-card-context';
    card.href=latest?.id?`editor.html?id=${encodeURIComponent(latest.id)}`:'dashboard.html';
    card.hidden=!latest;
    card.dataset.status=latest?.status||'draft';
    card.innerHTML=
      '<span class="liw-sidebar-card-kicker"><span>Current card</span>'+icon('arrow-up-right',12)+'</span>'+
      `<strong class="liw-sidebar-card-name">${escapeText(latest?.internal_label||latest?.company_name||latest?.full_name||'Your card')}</strong>`+
      `<span class="liw-sidebar-card-status">${latest?.status==='published'?'Published · edit card':'Draft · continue editing'}</span>`;
    return card;
  }

  function escapeText(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[ch]);
  }

  function buildWorkspaceNav(showAdmin,showAgency){
    const nav=document.createElement('nav');
    nav.dataset.liwCanonicalGroup='workspace';
    nav.append(
      navLink('dashboard.html','Overview','layout-dashboard'),
      navLink('editor.html','Create card','badge-plus'),
      navLink('rolodex.html','LIW Wallet','wallet',{dataset:{liwRolodexLink:'true'}}),
      navLink('products-services.html','Products & services','shopping-bag',{dataset:{liwProductsServicesLink:'true'}}),
      navLink('analytics.html','Analytics','chart-no-axes-combined')
    );
    const leads=navLink('leads.html','Leads','inbox');
    const count=document.createElement('span');count.className='nav-count';count.id='nav-lead-count';count.hidden=true;count.textContent='0';leads.appendChild(count);nav.appendChild(leads);
    if(showAdmin)nav.appendChild(navLink('admin.html','Admin overview','shield-check',{id:'admin-nav-link'}));
    if(showAgency)nav.appendChild(navLink('agency-dashboard.html','Agency workspace','briefcase-business',{dataset:{liwProgramLink:'agency-workspace'}}));
    return nav;
  }

  function buildTools(openBefore,showAdmin){
    const details=document.createElement('details');
    details.className='liw-sidebar-tools';
    const toolFiles=new Set(['appointments.html','domains.html','media.html','email-signature.html','virtual-background.html','hire-designer.html','designer-orders.html','admin-music-ads.html']);
    details.open=toolFiles.has(current)||Boolean(openBefore);
    details.innerHTML='<summary><span>'+icon('briefcase-business',14)+' Business tools</span>'+icon('chevron-down',14)+'</summary>';
    const nav=document.createElement('nav');nav.dataset.liwCanonicalGroup='tools';
    nav.append(
      navLink('appointments.html','Appointments','calendar-check-2'),
      navLink('domains.html','Custom domains','globe-2'),
      navLink('media.html','Video & downloads','files'),
      navLink('email-signature.html','Email signature','signature'),
      navLink('virtual-background.html','Virtual background','monitor-up',{dataset:{liwVirtualBackgroundLink:'true'}}),
      navLink('hire-designer.html?from=dashboard','Hire a Designer','wand-sparkles'),
      navLink('designer-orders.html','My designer orders','clipboard-list')
    );
    if(showAdmin)nav.appendChild(navLink('admin-music-ads.html','Showtime ads','badge-dollar-sign'));
    details.appendChild(nav);return details;
  }

  function buildAccountNav(){
    const nav=document.createElement('nav');nav.dataset.liwCanonicalGroup='account';
    nav.appendChild(button('Log out','log-out',()=>{
      if(typeof logout==='function')logout();
      else if(window.supabaseClient)window.supabaseClient.auth.signOut().finally(()=>{location.href=typeof liwUrl==='function'?liwUrl('login.html'):'login.html'});
    }));
    nav.append(
      navLink('profile.html','Profile','user-round'),
      navLink('earn-with-liw.html','Earn with LIW','badge-dollar-sign'),
      navLink('pricing.html','Plans & billing','credit-card',{id:'plans-billing-link',dataset:{liwPlansBillingLink:'true'}})
    );
    return nav;
  }

  function markActive(root){
    root.querySelectorAll('nav a[href]').forEach(link=>{
      const active=fileOf(link.getAttribute('href'))===current;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
  }

  function structure(){
    const root=document.querySelector('.sidebar');if(!root)return false;
    ensureStyles();
    const alreadyBuilt=root.dataset.liwUniversalSidebar==='true';
    const previousTools=root.querySelector('.liw-sidebar-tools');
    const toolsOpen=alreadyBuilt?Boolean(previousTools?.open):false;
    const adminHint=isAdminHint(root),agencyHint=hasAgencyHint(root);
    const showAdmin=state.access?isAdmin():adminHint;
    const showAgency=state.access?hasAgency():agencyHint;

    const brand=root.querySelector('.brand')||navLink('dashboard.html','LIW','home');
    if(!brand.classList.contains('brand'))brand.classList.add('brand','brand-with-logo');
    if(!brand.querySelector('img')){
      brand.innerHTML='<img alt="LIW Worgs Inc" class="brand-logo" src="assets/liw-worgs-logo.png">';
      brand.setAttribute('aria-label','LIW Worgs Inc Digital Cards');
    }
    brand.href='dashboard.html';

    const preserved=[brand];
    const cobrand=root.querySelector('.admin-white-label-cobrand');if(cobrand)preserved.push(cobrand);
    const mobileClose=root.querySelector('.liw-sidebar-mobile-close');if(mobileClose)preserved.push(mobileClose);
    [...root.children].forEach(child=>{if(!preserved.includes(child))child.remove();});

    root.classList.add('liw-premium-sidebar');
    root.dataset.liwUniversalSidebar='true';

    const {display,secondary,initials}=profileValues();
    const profile=document.createElement('a');profile.href='profile.html';profile.className='liw-sidebar-profile';
    profile.innerHTML=`<span class="liw-sidebar-avatar">${escapeText(initials)}</span><span class="liw-sidebar-profile-copy"><strong>${escapeText(display)}</strong><span>${escapeText(secondary)}</span></span>${icon('chevron-right',15)}`;

    const workspaceLabel=document.createElement('span');workspaceLabel.className='sidebar-label';workspaceLabel.textContent='Workspace';
    const workspaceNav=buildWorkspaceNav(showAdmin,showAgency);
    const currentCard=currentCardNode();
    const tools=buildTools(toolsOpen,showAdmin);
    const accountLabel=document.createElement('span');accountLabel.className='sidebar-label';accountLabel.textContent='Account';
    const accountNav=buildAccountNav();
    const {title,copy}=planValues();
    const footer=document.createElement('div');footer.className='sidebar-footer';
    footer.innerHTML=`<div class="sidebar-plan"><strong id="sidebar-plan">${escapeText(title)}</strong><small id="sidebar-plan-copy">${escapeText(copy)}</small><a class="liw-sidebar-plan-link" href="pricing.html"><span>Manage plan</span>${icon('arrow-up-right',13)}</a></div>`;

    if(cobrand&&cobrand.isConnected)brand.insertAdjacentElement('afterend',cobrand);
    const anchor=cobrand&&cobrand.isConnected?cobrand:brand;
    anchor.insertAdjacentElement('afterend',profile);
    root.insertBefore(workspaceLabel,mobileClose||null);
    root.insertBefore(workspaceNav,mobileClose||null);
    root.insertBefore(currentCard,mobileClose||null);
    root.insertBefore(tools,mobileClose||null);
    root.insertBefore(accountLabel,mobileClose||null);
    root.insertBefore(accountNav,mobileClose||null);
    root.insertBefore(footer,mobileClose||null);

    markActive(root);
    try{window.lucide?.createIcons();}catch(_){}
    return true;
  }

  async function hydrate(){
    if(state.hydrated||state.hydrating)return;
    if(typeof window.supabaseClient==='undefined'&&typeof supabaseClient==='undefined')return;
    state.hydrating=true;
    try{
      const client=window.supabaseClient||supabaseClient;
      const {data:{user}}=await client.auth.getUser();
      if(!user)return;
      state.user=user;
      const accessPromise=typeof getLiwAccessContext==='function'
        ? getLiwAccessContext(user,{refresh:false})
        : Promise.resolve(null);
      const cardPromise=client.from('digital_cards')
        .select('id,status,updated_at,full_name,company_name,internal_label')
        .eq('user_id',user.id).order('updated_at',{ascending:false}).limit(1);
      const [accessResult,cardResult]=await Promise.all([accessPromise,cardPromise]);
      state.access=accessResult||null;
      if(cardResult?.error)console.warn('Universal sidebar current card:',cardResult.error);
      state.latest=cardResult?.data?.[0]||null;
      state.hydrated=true;
      structure();
    }catch(error){console.warn('Universal sidebar hydration:',error);}finally{state.hydrating=false;}
  }

  function tryHydrate(attempt=0){
    if(state.hydrated)return;
    if(typeof getLiwAccessContext==='function'&&(typeof window.supabaseClient!=='undefined'||typeof supabaseClient!=='undefined'))hydrate();
    else if(attempt<24)setTimeout(()=>tryHydrate(attempt+1),125);
  }

  function settle(){
    structure();
    tryHydrate();
  }

  function boot(){
    if(!structure())return;
    tryHydrate();
    [350,800,1500,2800].forEach(delay=>setTimeout(settle,delay));
  }

  globalThis.LIWUniversalSidebar={refresh:settle};
  window.addEventListener('pageshow',settle,{passive:true});
  window.addEventListener('hashchange',()=>{const root=document.querySelector('.sidebar');if(root)markActive(root)},{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
