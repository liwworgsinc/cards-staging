(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  let hydrated=false;
  let observer=null;
  let structuring=false;

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

  function navLinks(sidebar,href){
    return [...sidebar.querySelectorAll(`nav a[href="${href}"]`)];
  }

  function keepSingleLink(sidebar,href,preferredParent){
    const links=navLinks(sidebar,href);
    if(!links.length)return null;
    const keep=(preferredParent&&links.find(link=>preferredParent.contains(link)))||links[0];
    links.forEach(link=>{if(link!==keep)link.remove();});
    return keep;
  }

  function ensureProductsLink(sidebar,workspaceNav){
    let link=keepSingleLink(sidebar,'products-services.html',workspaceNav);
    if(!link){
      link=document.createElement('a');
      link.href='products-services.html';
      link.dataset.liwProductsServicesLink='true';
      link.innerHTML='<i data-lucide="shopping-bag" size="18"></i> Products &amp; services';
      const leads=workspaceNav?.querySelector('a[href="leads.html"]');
      if(leads)leads.insertAdjacentElement('afterend',link);
      else workspaceNav?.appendChild(link);
    }else if(workspaceNav&&!workspaceNav.contains(link)){
      const leads=workspaceNav.querySelector('a[href="leads.html"]');
      if(leads)leads.insertAdjacentElement('afterend',link);
      else workspaceNav.appendChild(link);
    }
    return link;
  }

  function ensureProfile(sidebar){
    let profile=sidebar.querySelector('.liw-sidebar-profile');
    sidebar.querySelectorAll('.liw-sidebar-profile').forEach(item=>{if(profile&&item!==profile)item.remove();});
    if(profile)return profile;
    profile=document.createElement('a');
    profile.href='profile.html';
    profile.className='liw-sidebar-profile';
    profile.innerHTML='<span class="liw-sidebar-avatar">LIW</span><span class="liw-sidebar-profile-copy"><strong>My workspace</strong><span>Account & profile</span></span><i data-lucide="chevron-right" size="15"></i>';
    const brand=sidebar.querySelector('.brand');
    brand?.insertAdjacentElement('afterend',profile);
    return profile;
  }

  function ensureBusinessTools(sidebar){
    let details=sidebar.querySelector('.liw-sidebar-tools');
    sidebar.querySelectorAll('.liw-sidebar-tools').forEach(item=>{if(details&&item!==details)item.remove();});
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
      let link=keepSingleLink(sidebar,href,toolNav);
      if(link&&!toolNav.contains(link))toolNav.appendChild(link);
      link=keepSingleLink(sidebar,href,toolNav);
      if(link&&href==='virtual-background.html')link.dataset.liwVirtualBackgroundLink='true';
    });
    return details;
  }

  function ensurePlanLocation(sidebar){
    const labels=[...sidebar.querySelectorAll('.sidebar-label')];
    const accountLabel=labels.find(item=>item.textContent.trim().toLowerCase()==='account');
    const accountNav=accountLabel?.nextElementSibling?.matches('nav')?accountLabel.nextElementSibling:null;
    if(accountNav){
      const candidates=[...sidebar.querySelectorAll('nav a[data-liw-plans-billing-link], nav a[href="pricing.html"]')];
      let plans=candidates.find(link=>accountNav.contains(link))||candidates.find(link=>link.hasAttribute('data-liw-plans-billing-link'))||candidates[0]||null;
      candidates.forEach(link=>{if(link!==plans)link.remove();});
      if(plans&&!accountNav.contains(plans))accountNav.insertBefore(plans,accountNav.firstChild);
      if(plans){
        plans.dataset.liwPlansBillingLink='true';
        plans.id=plans.id||'plans-billing-link';
      }
    }

    const plan=sidebar.querySelector('.sidebar-plan');
    if(plan){
      const footerLinks=[...plan.querySelectorAll('.liw-sidebar-plan-link')];
      footerLinks.slice(1).forEach(link=>link.remove());
      if(!footerLinks[0]){
        const link=document.createElement('a');
        link.href='pricing.html';
        link.className='liw-sidebar-plan-link';
        link.innerHTML='<span>Manage plan</span><i data-lucide="arrow-up-right" size="13"></i>';
        plan.appendChild(link);
      }
    }
  }

  function ensureCurrentCard(sidebar){
    let card=sidebar.querySelector('.liw-sidebar-card-context');
    sidebar.querySelectorAll('.liw-sidebar-card-context').forEach(item=>{if(card&&item!==card)item.remove();});
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

  function cleanKnownDuplicates(sidebar){
    const workspaceNav=sidebar.querySelector('nav');
    const details=sidebar.querySelector('.liw-sidebar-tools');
    const toolNav=details?.querySelector('nav');
    const labels=[...sidebar.querySelectorAll('.sidebar-label')];
    const accountLabel=labels.find(item=>item.textContent.trim().toLowerCase()==='account');
    const accountNav=accountLabel?.nextElementSibling?.matches('nav')?accountLabel.nextElementSibling:null;

    keepSingleLink(sidebar,'products-services.html',workspaceNav);
    keepSingleLink(sidebar,'media.html',toolNav);
    keepSingleLink(sidebar,'email-signature.html',toolNav);
    keepSingleLink(sidebar,'virtual-background.html',toolNav);

    if(accountNav){
      const pricing=[...sidebar.querySelectorAll('nav a[href="pricing.html"]')];
      const keep=pricing.find(link=>accountNav.contains(link))||pricing[0];
      pricing.forEach(link=>{if(link!==keep)link.remove();});
    }
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
    if(structuring)return true;
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar)return false;
    structuring=true;
    try{
      ensurePremiumStyles();
      sidebar.classList.add('liw-premium-sidebar');
      const workspaceNav=sidebar.querySelector('nav');
      if(!workspaceNav)return false;
      cleanKnownDuplicates(sidebar);
      ensureProductsLink(sidebar,workspaceNav);
      ensureProfile(sidebar);
      ensureBusinessTools(sidebar);
      ensurePlanLocation(sidebar);
      ensureCurrentCard(sidebar);
      cleanKnownDuplicates(sidebar);
      markActive(sidebar);
      if(window.lucide)lucide.createIcons();
      return true;
    }finally{
      structuring=false;
    }
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
      window.requestAnimationFrame(()=>structure());
    });
    observer.observe(document.querySelector('.sidebar'),{childList:true,subtree:true});
    setTimeout(()=>{structure();hydrate();},450);
    setTimeout(()=>{structure();hydrate();},1200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
