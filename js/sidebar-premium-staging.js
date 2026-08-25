(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  let hydrated=false;
  let observer=null;

  function pathMatches(href){
    if(!href)return false;
    try{
      const target=new URL(href,location.href);
      const current=location.pathname.replace(/\/index\.html$/,'/').replace(/\.html$/,'');
      const candidate=target.pathname.replace(/\/index\.html$/,'/').replace(/\.html$/,'');
      return current===candidate;
    }catch(_){return false;}
  }

  function ensurePremiumStyles(){
    if(document.querySelector('link[data-liw-premium-sidebar]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/sidebar-premium-staging.css?v=20260824-2';
    link.dataset.liwPremiumSidebar='true';
    document.head.appendChild(link);
  }

  function ensureProductsLink(workspaceNav){
    let link=workspaceNav?.querySelector('a[href="products-services.html"]');
    if(link)return link;
    link=document.createElement('a');
    link.href='products-services.html';
    link.dataset.liwProductsServicesLink='true';
    link.innerHTML='<i data-lucide="shopping-bag" size="18"></i> Products &amp; services';
    const leads=workspaceNav?.querySelector('a[href="leads.html"]');
    if(leads)leads.insertAdjacentElement('afterend',link);
    else workspaceNav?.appendChild(link);
    return link;
  }

  function ensureProfile(sidebar){
    let profile=sidebar.querySelector('.liw-sidebar-profile');
    if(profile)return profile;
    profile=document.createElement('a');
    profile.href='profile.html';
    profile.className='liw-sidebar-profile';
    profile.innerHTML='<span class="liw-sidebar-avatar">LIW</span><span class="liw-sidebar-profile-copy"><strong>My workspace</strong><span>Account & profile</span></span><i data-lucide="chevron-right" size="15"></i>';
    const brand=sidebar.querySelector('.brand');
    brand?.insertAdjacentElement('afterend',profile);
    return profile;
  }

  function ensureBusinessTools(sidebar,workspaceNav){
    let details=sidebar.querySelector('.liw-sidebar-tools');
    if(!details){
      details=document.createElement('details');
      details.className='liw-sidebar-tools';
      details.open=true;
      details.innerHTML='<summary><span><i data-lucide="briefcase-business" size="14"></i> Business tools</span><i data-lucide="chevron-down" size="14"></i></summary><nav></nav>';
      const accountLabel=[...sidebar.querySelectorAll('.sidebar-label')].find(item=>item.textContent.trim().toLowerCase()==='account');
      if(accountLabel)accountLabel.insertAdjacentElement('beforebegin',details);
      else sidebar.appendChild(details);
    }
    const toolNav=details.querySelector('nav');
    ['media.html','email-signature.html','virtual-background.html'].forEach(href=>{
      const link=workspaceNav?.querySelector(`a[href="${href}"]`);
      if(link)toolNav.appendChild(link);
    });
    return details;
  }

  function ensurePlanLocation(sidebar,workspaceNav){
    const labels=[...sidebar.querySelectorAll('.sidebar-label')];
    const accountLabel=labels.find(item=>item.textContent.trim().toLowerCase()==='account');
    const accountNav=accountLabel?.nextElementSibling?.matches('nav')?accountLabel.nextElementSibling:null;
    const plans=workspaceNav?.querySelector('a[data-liw-plans-billing-link],a[href="pricing.html"]');
    if(plans&&accountNav&&!accountNav.contains(plans))accountNav.insertBefore(plans,accountNav.firstChild);

    const plan=sidebar.querySelector('.sidebar-plan');
    if(plan&&!plan.querySelector('.liw-sidebar-plan-link')){
      const link=document.createElement('a');
      link.href='pricing.html';
      link.className='liw-sidebar-plan-link';
      link.innerHTML='<span>Manage plan</span><i data-lucide="arrow-up-right" size="13"></i>';
      plan.appendChild(link);
    }
  }

  function ensureCurrentCard(sidebar){
    let card=sidebar.querySelector('.liw-sidebar-card-context');
    if(card)return card;
    card=document.createElement('a');
    card.className='liw-sidebar-card-context';
    card.href='dashboard.html';
    card.hidden=true;
    card.innerHTML='<span class="liw-sidebar-card-kicker"><span>Current card</span><i data-lucide="arrow-up-right" size="12"></i></span><strong class="liw-sidebar-card-name">Your card</strong><span class="liw-sidebar-card-status">Loading</span>';
    const details=sidebar.querySelector('.liw-sidebar-tools');
    if(details)details.insertAdjacentElement('beforebegin',card);
    else{
      const accountLabel=[...sidebar.querySelectorAll('.sidebar-label')].find(item=>item.textContent.trim().toLowerCase()==='account');
      accountLabel?.insertAdjacentElement('beforebegin',card);
    }
    return card;
  }

  function markActive(sidebar){
    sidebar.querySelectorAll('nav a').forEach(link=>{
      const active=pathMatches(link.getAttribute('href'));
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');
      else if(link.getAttribute('aria-current')==='page')link.removeAttribute('aria-current');
    });
  }

  function structure(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar)return false;
    ensurePremiumStyles();
    sidebar.classList.add('liw-premium-sidebar');
    const workspaceNav=sidebar.querySelector('nav');
    if(!workspaceNav)return false;
    ensureProductsLink(workspaceNav);
    ensureProfile(sidebar);
    ensureBusinessTools(sidebar,workspaceNav);
    ensurePlanLocation(sidebar,workspaceNav);
    ensureCurrentCard(sidebar);
    markActive(sidebar);
    if(window.lucide)lucide.createIcons();
    return true;
  }

  async function hydrate(){
    if(hydrated||typeof requireUser!=='function'||typeof supabaseClient==='undefined')return;
    hydrated=true;
    try{
      const user=await requireUser();
      if(!user)return;
      const profile=document.querySelector('.liw-sidebar-profile');
      const meta=user.user_metadata||{};
      const displayName=String(meta.full_name||meta.name||'').trim()||String(user.email||'').split('@')[0]||'My workspace';
      const secondary=String(meta.liw_business_name||meta.company_name||user.email||'Account & profile').trim();
      const initials=displayName.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'LIW';
      if(profile){
        const avatar=profile.querySelector('.liw-sidebar-avatar');
        const strong=profile.querySelector('strong');
        const sub=profile.querySelector('.liw-sidebar-profile-copy span');
        if(avatar)avatar.textContent=initials;
        if(strong)strong.textContent=displayName;
        if(sub)sub.textContent=secondary;
      }

      const {data,error}=await supabaseClient.from('digital_cards')
        .select('id,slug,status,updated_at,full_name,company_name,internal_label')
        .eq('user_id',user.id)
        .order('updated_at',{ascending:false})
        .limit(1);
      if(error)throw error;
      const latest=data?.[0];
      const card=document.querySelector('.liw-sidebar-card-context');
      if(card&&latest){
        const name=latest.internal_label||latest.company_name||latest.full_name||'Untitled card';
        card.hidden=false;
        card.href=`editor.html?id=${encodeURIComponent(latest.id)}`;
        card.dataset.status=latest.status||'draft';
        card.querySelector('.liw-sidebar-card-name').textContent=name;
        card.querySelector('.liw-sidebar-card-status').textContent=latest.status==='published'?'Published · edit card':'Draft · continue editing';
      }
      if(window.lucide)lucide.createIcons();
    }catch(error){
      console.warn('Premium sidebar enhancement:',error);
      hydrated=false;
    }
  }

  function boot(){
    if(!structure())return;
    hydrate();
    if(observer)return;
    observer=new MutationObserver(()=>{
      window.requestAnimationFrame(()=>{
        structure();
      });
    });
    observer.observe(document.querySelector('.sidebar'),{childList:true,subtree:true});
    setTimeout(()=>{structure();hydrate();},450);
    setTimeout(()=>{structure();hydrate();},1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
