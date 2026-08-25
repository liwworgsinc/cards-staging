(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const dashboardPath=/\/dashboard(?:\.html)?$/;

  function previewPlan(){
    try{return String(localStorage.getItem('liw_admin_plan_preview')||'').toLowerCase();}catch(_){return '';}
  }

  function injectStylesheet(href,key){
    if(document.querySelector(`link[data-${key}]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=href;
    link.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]='true';
    document.head.appendChild(link);
  }

  function loadDashboardOverviewPolish(){
    if(!dashboardPath.test(location.pathname))return;
    injectStylesheet('css/dashboard-overview-premium-staging.css?v=20260821-1','dashboard-overview-polish');
    injectStylesheet('css/dashboard-premium-polish-staging.css?v=20260824-1','dashboard-premium-polish');
  }

  function loadPremiumSidebar(){
    injectStylesheet('css/sidebar-premium-staging.css?v=20260824-2','premium-sidebar');
    if(document.querySelector('script[data-premium-sidebar-script]'))return;
    const script=document.createElement('script');
    script.src='js/sidebar-premium-staging.js?v=20260824-2';
    script.dataset.premiumSidebarScript='true';
    document.body.appendChild(script);
  }

  function loadEmailSignaturePermissions(){
    if(!/\/email-signature(?:\.html)?$/.test(location.pathname))return;
    if(document.querySelector('script[data-email-signature-permissions]'))return;
    const script=document.createElement('script');
    script.src='js/email-signature-permissions.js?v=20260823-1';
    script.dataset.emailSignaturePermissions='true';
    document.body.appendChild(script);
  }

  function loadVirtualBackgroundPlanGate(){
    if(!/\/virtual-background(?:\.html)?$/.test(location.pathname))return;
    if(document.querySelector('script[data-virtual-background-plan-gate]'))return;
    const script=document.createElement('script');
    script.src='js/virtual-background-plan-gate-staging.js?v=20260823-1';
    script.dataset.virtualBackgroundPlanGate='true';
    document.body.appendChild(script);
  }

  function applyVirtualBackgroundBrandPolish(){
    if(!/\/virtual-background(?:\.html)?$/.test(location.pathname))return;
    if(document.getElementById('liw-vb-brand-polish'))return;
    const style=document.createElement('style');
    style.id='liw-vb-brand-polish';
    style.textContent=`
      .vb-download{
        border-color:var(--primary)!important;
        background:linear-gradient(135deg,var(--primary),var(--secondary))!important;
        color:#fff!important;
        box-shadow:0 10px 24px rgba(11,20,56,.24)!important;
      }
      .vb-download:hover:not(:disabled){
        background:linear-gradient(135deg,var(--primary-dark),var(--secondary))!important;
        box-shadow:0 14px 30px rgba(11,20,56,.34)!important;
        transform:translateY(-1px);
      }
      .vb-download:disabled{opacity:.58;cursor:not-allowed;transform:none;}
    `;
    document.head.appendChild(style);
  }

  function addProfileEntryPoint(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar)return;
    const labels=[...sidebar.querySelectorAll('.sidebar-label')];
    const accountLabel=labels.find(label=>label.textContent.trim().toLowerCase()==='account');
    const accountNav=accountLabel?.nextElementSibling?.matches('nav')?accountLabel.nextElementSibling:null;
    if(!accountNav||accountNav.querySelector('a[href="profile.html"]'))return;
    const link=document.createElement('a');
    link.href='profile.html';
    link.dataset.liwProfileLink='true';
    link.innerHTML='<i data-lucide="user-round" size="18"></i> Profile';
    if(/\/profile(?:\.html)?$/.test(location.pathname))link.classList.add('active');
    accountNav.insertBefore(link,accountNav.firstChild);
  }

  function addCreatorEntryPoints(){
    const workspaceNav=document.querySelector('.sidebar nav');
    const leadsLink=workspaceNav?.querySelector('a[href="leads.html"]');
    const mediaLink=workspaceNav?.querySelector('a[href="media.html"]');
    let productsLink=workspaceNav?.querySelector('a[href="products-services.html"]');
    if(workspaceNav&&!productsLink){
      productsLink=document.createElement('a');
      productsLink.href='products-services.html';
      productsLink.dataset.liwProductsServicesLink='true';
      productsLink.innerHTML='<i data-lucide="shopping-bag" size="18"></i> Products &amp; services';
      if(/\/products-services(?:\.html)?$/.test(location.pathname))productsLink.classList.add('active');
      const anchor=leadsLink||workspaceNav.querySelector('a[href="analytics.html"]');
      if(anchor)anchor.insertAdjacentElement('afterend',productsLink);
      else workspaceNav.appendChild(productsLink);
    }

    let emailLink=workspaceNav?.querySelector('a[href="email-signature.html"]');
    if(workspaceNav&&mediaLink&&!emailLink){
      emailLink=document.createElement('a');
      emailLink.href='email-signature.html';
      emailLink.dataset.liwEmailSignatureLink='true';
      emailLink.innerHTML='<i data-lucide="signature" size="18"></i> Email signature';
      mediaLink.insertAdjacentElement('afterend',emailLink);
    }

    if(workspaceNav&&!workspaceNav.querySelector('a[href="virtual-background.html"]')){
      const virtualLink=document.createElement('a');
      virtualLink.href='virtual-background.html';
      virtualLink.dataset.liwVirtualBackgroundLink='true';
      virtualLink.innerHTML='<i data-lucide="monitor-up" size="18"></i> Virtual background';
      const anchor=emailLink||mediaLink;
      if(anchor)anchor.insertAdjacentElement('afterend',virtualLink);
      else workspaceNav.appendChild(virtualLink);
    }

    addProfileEntryPoint();

    if(!dashboardPath.test(location.pathname)){
      if(window.lucide)lucide.createIcons();
      return;
    }

    const grid=document.querySelector('.dashboard-tool-grid');
    if(grid&&!grid.querySelector('[data-liw-products-services-tool]')){
      const tool=document.createElement('a');
      tool.className='card dashboard-tool';
      tool.href='products-services.html';
      tool.dataset.liwProductsServicesTool='true';
      tool.innerHTML='<span><i data-lucide="shopping-bag"></i></span><div><strong>Manage products &amp; services</strong><p>Add an offer once, then choose which of your cards should show it.</p></div><i data-lucide="arrow-right"></i>';
      const leadsTool=grid.querySelector('a[href="leads.html"]');
      if(leadsTool)leadsTool.insertAdjacentElement('afterend',tool);
      else grid.prepend(tool);
    }

    if(grid&&!grid.querySelector('[data-liw-email-signature-tool]')){
      const tool=document.createElement('a');
      tool.className='card dashboard-tool';
      tool.href='email-signature.html';
      tool.dataset.liwEmailSignatureTool='true';
      tool.innerHTML='<span><i data-lucide="signature"></i></span><div><strong>Create an email signature</strong><p>Turn any LIW card into a professional Gmail, Outlook, or Apple Mail signature.</p></div><i data-lucide="arrow-right"></i>';
      const affiliate=grid.querySelector('a[href="affiliate-dashboard.html"]');
      grid.insertBefore(tool,affiliate||null);
    }

    if(grid&&!grid.querySelector('[data-liw-virtual-background-tool]')){
      const tool=document.createElement('a');
      tool.className='card dashboard-tool';
      tool.href='virtual-background.html';
      tool.dataset.liwVirtualBackgroundTool='true';
      tool.innerHTML='<span><i data-lucide="monitor-up"></i></span><div><strong>Create a virtual background</strong><p>Promote yourself on every Zoom, Meet, or Teams call with your card details and a scan-to-card QR.</p></div><i data-lucide="arrow-right"></i>';
      const signature=grid.querySelector('[data-liw-email-signature-tool]');
      if(signature)signature.insertAdjacentElement('afterend',tool);
      else{
        const affiliate=grid.querySelector('a[href="affiliate-dashboard.html"]');
        grid.insertBefore(tool,affiliate||null);
      }
    }

    if(window.lucide)lucide.createIcons();
  }

  function profileCompleteness(user){
    const m=user?.user_metadata||{};
    const values=[m.full_name,m.liw_business_name,m.liw_job_title,m.liw_phone,m.liw_website,m.liw_location];
    return Math.round(values.filter(value=>String(value||'').trim()).length/values.length*100);
  }

  function relativeTime(date){
    if(!date)return 'Recently';
    const diff=Math.max(0,Date.now()-new Date(date).getTime());
    const minutes=Math.round(diff/60000);
    if(minutes<2)return 'Just now';
    if(minutes<60)return `${minutes}m ago`;
    const hours=Math.round(minutes/60);
    if(hours<24)return `${hours}h ago`;
    const days=Math.round(hours/24);
    if(days<7)return `${days}d ago`;
    try{return new Date(date).toLocaleDateString('en-US',{month:'short',day:'numeric'});}catch(_){return 'Recently';}
  }

  function healthForCard(card){
    const missing=[];
    if(!String(card.full_name||'').trim())missing.push('name');
    if(!card.profile_image_url)missing.push('photo');
    if(!card.phone&&!card.email&&!card.website)missing.push('contact method');
    if(!card.job_title&&!card.company_name)missing.push('business details');
    if(card.status!=='published')return {tone:'attention',label:'Draft · ready when you are'};
    if(!missing.length)return {tone:'ready',label:'Customer-ready'};
    return {tone:'attention',label:`Add ${missing[0]}`};
  }

  function decorateCards(cards){
    cards.forEach(card=>{
      const article=document.querySelector(`#card-list [data-card-id="${CSS.escape(String(card.id))}"]`);
      const meta=article?.querySelector('.card-meta');
      if(!meta||meta.querySelector('.premium-card-health'))return;
      const health=healthForCard(card);
      const row=document.createElement('div');
      row.className='premium-card-health';
      row.dataset.tone=health.tone;
      row.innerHTML=`<div class="premium-card-health-main"><span class="premium-health-dot"></span><strong>${health.label}</strong></div><time>${relativeTime(card.updated_at)}</time>`;
      meta.appendChild(row);
    });
  }

  function addProfileReadiness(user){
    const onboarding=document.querySelector('.dashboard-grid .onboarding');
    if(!onboarding||onboarding.querySelector('.premium-profile-readiness'))return;
    const percent=profileCompleteness(user);
    const row=document.createElement('div');
    row.className='premium-profile-readiness';
    row.innerHTML=`<span class="premium-profile-readiness-icon"><i data-lucide="user-round" size="17"></i></span><div class="premium-profile-readiness-copy"><strong>Account profile</strong><span>${percent===100?'Your account details are complete.':'Keep your account details current.'}</span></div><div class="premium-profile-readiness-score"><b>${percent}%</b><a href="profile.html">Edit profile</a></div>`;
    onboarding.appendChild(row);
  }

  function buildQuickBar(cards){
    const welcome=document.getElementById('dashboard-welcome');
    if(!welcome||document.querySelector('.premium-quickbar'))return;
    const latestPublished=cards.find(card=>card.status==='published');
    const bar=document.createElement('section');
    bar.className='premium-quickbar';
    bar.setAttribute('aria-label','Quick actions');
    bar.innerHTML=`
      <a class="premium-quick-action" href="editor.html"><span class="premium-quick-action-icon"><i data-lucide="plus" size="17"></i></span><span><strong>Create card</strong><small>Start a new card</small></span></a>
      <button class="premium-quick-action" type="button" data-premium-share ${latestPublished?'':'disabled'}><span class="premium-quick-action-icon"><i data-lucide="share-2" size="17"></i></span><span><strong>${latestPublished?'Share latest':'Publish to share'}</strong><small>${latestPublished?'Copy your live card link':'No live card yet'}</small></span></button>
      <a class="premium-quick-action" href="leads.html"><span class="premium-quick-action-icon"><i data-lucide="inbox" size="17"></i></span><span><strong>View leads</strong><small>Follow up quickly</small></span></a>
      <a class="premium-quick-action" href="profile.html"><span class="premium-quick-action-icon"><i data-lucide="user-round" size="17"></i></span><span><strong>Profile</strong><small>Update account details</small></span></a>`;
    welcome.insertAdjacentElement('afterend',bar);
    const share=bar.querySelector('[data-premium-share]');
    if(latestPublished)share.addEventListener('click',async()=>{
      const url=typeof liwUrl==='function'?liwUrl(`card.html?slug=${encodeURIComponent(latestPublished.slug)}`):`card.html?slug=${encodeURIComponent(latestPublished.slug)}`;
      try{await navigator.clipboard.writeText(url);if(typeof toast==='function')toast('Live card link copied');}
      catch(_){location.href=url;}
    });
  }

  function buildLowerArea(cards,newLeads){
    const upgrade=document.getElementById('upgrade-banner');
    if(!upgrade||document.querySelector('.premium-dashboard-lower'))return;
    const recent=cards.slice().sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0)).slice(0,3);
    const activities=[];
    if(Number(newLeads)>0)activities.push({icon:'inbox',title:`${newLeads} new lead${Number(newLeads)===1?'':'s'}`,copy:'Waiting for follow-up',time:'Now'});
    recent.forEach(card=>activities.push({icon:card.status==='published'?'circle-check-big':'pencil-line',title:card.internal_label||card.company_name||card.full_name||'Untitled card',copy:card.status==='published'?'Live card updated':'Draft updated',time:relativeTime(card.updated_at)}));
    const shown=activities.slice(0,3);

    const section=document.createElement('section');
    section.className='premium-dashboard-lower';
    section.innerHTML=`
      <article class="premium-lower-card">
        <div class="premium-lower-head"><div><h2>Recent activity</h2><p>The latest things worth your attention.</p></div>${Number(newLeads)>0?'<a href="leads.html">Open leads</a>':''}</div>
        <div class="premium-activity-list">${shown.length?shown.map(item=>`<div class="premium-activity-row"><span class="premium-activity-icon"><i data-lucide="${item.icon}" size="16"></i></span><div class="premium-activity-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.copy)}</span></div><time>${escapeHtml(item.time)}</time></div>`).join(''):'<div class="premium-empty-activity">Your recent card and lead activity will show here.</div>'}</div>
      </article>
      <article class="premium-lower-card">
        <div class="premium-lower-head"><div><h2>Business tools</h2><p>Useful tools, kept out of the way until you need them.</p></div></div>
        <div class="premium-tools-list">
          <a class="premium-tool-row" href="analytics.html"><span class="premium-tool-icon"><i data-lucide="chart-no-axes-combined" size="16"></i></span><span class="premium-tool-copy"><strong>Analytics</strong><span>See views, saves and actions</span></span><i data-lucide="chevron-right" size="16"></i></a>
          <a class="premium-tool-row" href="products-services.html"><span class="premium-tool-icon"><i data-lucide="shopping-bag" size="16"></i></span><span class="premium-tool-copy"><strong>Products &amp; services</strong><span>Manage offers across your cards</span></span><i data-lucide="chevron-right" size="16"></i></a>
          <a class="premium-tool-row" href="email-signature.html"><span class="premium-tool-icon"><i data-lucide="signature" size="16"></i></span><span class="premium-tool-copy"><strong>Email signature</strong><span>Turn your card into a signature</span></span><i data-lucide="chevron-right" size="16"></i></a>
          <a class="premium-tool-row" href="virtual-background.html"><span class="premium-tool-icon"><i data-lucide="monitor-up" size="16"></i></span><span class="premium-tool-copy"><strong>Virtual background</strong><span>Bring your card into calls</span></span><i data-lucide="chevron-right" size="16"></i></a>
          <a class="premium-tool-row" href="affiliate-dashboard.html"><span class="premium-tool-icon"><i data-lucide="badge-dollar-sign" size="16"></i></span><span class="premium-tool-copy"><strong>Affiliate earnings</strong><span>Track referrals and payouts</span></span><i data-lucide="chevron-right" size="16"></i></a>
        </div>
      </article>`;
    upgrade.insertAdjacentElement('beforebegin',section);
  }

  async function enhanceDashboard(){
    if(!dashboardPath.test(location.pathname)||document.body.classList.contains('dashboard-premium-polished')||document.body.dataset.dashboardPremiumLoading==='true')return;
    document.body.dataset.dashboardPremiumLoading='true';
    try{
      const user=await requireUser();
      if(!user)return;
      const [cardsResult,leadsResult]=await Promise.all([
        supabaseClient.from('digital_cards').select('id,slug,status,updated_at,full_name,job_title,company_name,phone,email,website,profile_image_url,internal_label').eq('user_id',user.id).order('updated_at',{ascending:false}),
        supabaseClient.from('leads').select('id',{count:'exact',head:true}).eq('owner_user_id',user.id).eq('status','new')
      ]);
      if(cardsResult.error)console.warn('Premium dashboard card lookup:',cardsResult.error);
      if(leadsResult.error)console.warn('Premium dashboard lead lookup:',leadsResult.error);
      const ownedCards=cardsResult.data||[];
      document.body.classList.add('dashboard-premium-polished');

      const name=String(user.user_metadata?.full_name||'').trim();
      const firstName=name.split(/\s+/)[0]||'there';
      const hour=new Date().getHours();
      const greeting=hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
      const welcome=document.getElementById('welcome');
      if(welcome)welcome.textContent=`${greeting}, ${firstName}`;

      const chip=document.getElementById('user-chip');
      if(chip){chip.title='Open profile';chip.setAttribute('role','link');chip.tabIndex=0;chip.addEventListener('click',()=>{location.href='profile.html';},{once:true});chip.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();location.href='profile.html';}});}

      addProfileReadiness(user);
      buildQuickBar(ownedCards);
      const leadCount=Number(leadsResult.count||document.getElementById('new-leads')?.textContent||0);
      buildLowerArea(ownedCards,leadCount);

      const decorate=()=>decorateCards(ownedCards);
      decorate();
      setTimeout(decorate,450);
      setTimeout(decorate,1100);
      if(window.lucide)lucide.createIcons();
    }catch(error){console.warn('Premium dashboard enhancement:',error);}
    finally{delete document.body.dataset.dashboardPremiumLoading;}
  }

  function sync(){
    const plan=previewPlan();
    if(!plan)return;
    const agencyAllowed=['agency','white_label'].includes(plan);
    const admin=document.getElementById('admin-nav-link');
    if(admin)admin.hidden=true;
    document.querySelectorAll('[data-liw-program-link="admin-white-label"]').forEach(item=>{item.hidden=true;});
    document.querySelectorAll('[data-liw-program-link="agency-workspace"]').forEach(item=>{item.hidden=!agencyAllowed;});
  }

  function boot(){
    loadDashboardOverviewPolish();
    loadPremiumSidebar();
    loadEmailSignaturePermissions();
    loadVirtualBackgroundPlanGate();
    applyVirtualBackgroundBrandPolish();
    addCreatorEntryPoints();
    enhanceDashboard();
    sync();
    setTimeout(()=>{loadPremiumSidebar();loadEmailSignaturePermissions();loadVirtualBackgroundPlanGate();applyVirtualBackgroundBrandPolish();addCreatorEntryPoints();enhanceDashboard();sync();},400);
    setTimeout(()=>{loadPremiumSidebar();loadEmailSignaturePermissions();loadVirtualBackgroundPlanGate();applyVirtualBackgroundBrandPolish();addCreatorEntryPoints();enhanceDashboard();sync();},1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
