(function(){
  const FUNNEL_PAID_DRAFT_KEY='liw_funnel_paid_draft_v1';
  const FUNNEL_RESUME_GUARD='liw_funnel_checkout_resume_guard_v1';

  function finalizePricingRedesign(){
    const hero=document.querySelector('.pricing-hero');
    if(hero){
      const title=hero.querySelector('h1');
      const copy=hero.querySelector('.pricing-hero-inner > p');
      const eyebrow=hero.querySelector('.eyebrow');
      if(eyebrow) eyebrow.textContent='PRICING FOR EVERY STAGE';
      if(title) title.innerHTML='Simple pricing. <span>Room to grow.</span>';
      if(copy) copy.textContent='Start free and get the essentials. Upgrade when your business needs more cards, stronger branding, business tools, and advanced features.';
    }
    if(window.lucide) lucide.createIcons();
  }

  async function restoreFunnelDraft(){
    let raw='';
    try{ raw=localStorage.getItem(FUNNEL_PAID_DRAFT_KEY)||''; }catch(_){ return false; }
    if(!raw||!window.supabaseClient) return false;
    try{
      const draft=JSON.parse(raw);
      const {data}=await supabaseClient.auth.getSession();
      const user=data?.session?.user;
      if(!user?.id||!draft?.card) return false;
      draft.version=1;
      draft.cardId=null;
      draft.savedAt=Date.now();
      draft.card.status='draft';
      localStorage.setItem(`liw_editor_draft_${user.id}_new`,JSON.stringify(draft));
      localStorage.removeItem(FUNNEL_PAID_DRAFT_KEY);
      sessionStorage.setItem('liw_guest_claim_ready','1');
      return true;
    }catch(error){
      console.warn('LIW funnel draft restore deferred:',error);
      return false;
    }
  }

  async function resumeSelectedPlan(){
    const params=new URLSearchParams(location.search);
    const plan=String(params.get('resume_plan')||'').trim().toLowerCase();
    const interval=String(params.get('interval')||'year').trim().toLowerCase();
    if(!['lite','plus','pro'].includes(plan)||!['month','year'].includes(interval)) return;

    await restoreFunnelDraft();

    let guard='';
    try{ guard=sessionStorage.getItem(FUNNEL_RESUME_GUARD)||''; }catch(_){}
    const signature=`${plan}:${interval}`;
    if(guard===signature) return;

    try{ sessionStorage.setItem(FUNNEL_RESUME_GUARD,signature); }catch(_){}
    const url=new URL(location.href);
    url.searchParams.delete('resume_plan');
    url.searchParams.delete('interval');
    url.searchParams.delete('from');
    history.replaceState({},document.title,url.href);

    if(typeof window.checkout!=='function') return;
    setTimeout(()=>{
      try{ window.checkout(plan,interval); }
      catch(error){
        console.warn('LIW funnel checkout resume deferred:',error);
        try{ sessionStorage.removeItem(FUNNEL_RESUME_GUARD); }catch(_){}
      }
    },500);
  }

  async function boot(){
    finalizePricingRedesign();
    await restoreFunnelDraft();
    await resumeSelectedPlan();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
  }else{
    setTimeout(boot,0);
  }
})();