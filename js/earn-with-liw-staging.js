(function(){
  'use strict';
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')))return;

  const STATE_KEY='liw_earn_with_liw_state';
  const SEEN_KEY='liw_earn_with_liw_prompt_seen';
  const RELOAD_KEY='liw_earn_with_liw_reload_state';
  const VALID_STATES=new Set(['available','active','opted_out']);
  let cacheState=readState();
  let cachePromptSeen=readSeen();
  let hydratePromise=null;
  let publishWatchTimer=null;

  function safeGet(storage,key){try{return storage.getItem(key);}catch(_){return null;}}
  function safeSet(storage,key,value){try{storage.setItem(key,value);}catch(_){}}
  function safeRemove(storage,key){try{storage.removeItem(key);}catch(_){}}
  function normalizeState(value){const state=String(value||'').trim().toLowerCase();return VALID_STATES.has(state)?state:'available';}
  function readState(){return normalizeState(safeGet(localStorage,STATE_KEY));}
  function readSeen(){return safeGet(localStorage,SEEN_KEY)==='1';}
  function persistPreference(preference){
    if(!preference)return null;
    cacheState=normalizeState(preference.program_state||preference.state);
    cachePromptSeen=Boolean(preference.program_prompt_seen_at||preference.promptSeen);
    safeSet(localStorage,STATE_KEY,cacheState);
    safeSet(localStorage,SEEN_KEY,cachePromptSeen?'1':'0');
    return {state:cacheState,promptSeen:cachePromptSeen,...preference};
  }
  function client(){return globalThis.supabaseClient||null;}

  async function currentUser(){
    const c=client();
    if(!c?.auth?.getUser)return null;
    const {data,error}=await c.auth.getUser();
    if(error)throw error;
    return data?.user||null;
  }

  async function getPreference(force=false){
    if(hydratePromise&&!force)return hydratePromise;
    const run=(async()=>{
      const c=client();
      if(!c?.from)throw new Error('Earn with LIW is still loading. Please try again.');
      const user=await currentUser();
      if(!user)return null;
      const {data,error}=await c.from('affiliates')
        .select('program_state,program_prompt_seen_at,program_activated_at,program_opted_out_at')
        .eq('user_id',user.id)
        .maybeSingle();
      if(error)throw error;
      if(!data)throw new Error('Your Earn with LIW account could not be found.');
      return persistPreference(data);
    })();
    hydratePromise=run.finally(()=>{hydratePromise=null;});
    return hydratePromise;
  }

  async function saveAction(action){
    const c=client();
    if(!c?.rpc)throw new Error('Earn with LIW is still loading. Please try again.');
    const {data,error}=await c.rpc('set_my_affiliate_program_preference',{p_action:action});
    if(error)throw error;
    const preference=persistPreference(data||{});
    renderDashboardEntry();
    document.dispatchEvent(new CustomEvent('liw:affiliate-program-change',{detail:{state:cacheState,preference}}));
    return preference;
  }

  function state(){return cacheState;}
  function promptWasSeen(){return cachePromptSeen;}
  function activate(){return saveAction('activate');}
  function optOut(){return saveAction('opt_out');}
  function markPromptSeen(){return saveAction('dismiss');}

  function setEarnLinkContent(link){
    if(!link)return;
    link.href='earn-with-liw.html';
    link.id='liw-affiliate-nav-link';
    link.innerHTML='<i data-lucide="badge-dollar-sign" size="18"></i> Earn with LIW <span class="liw-affiliate-nav-badge">Earn</span>';
  }

  function ensureSingleSidebarEntry(){
    const sidebar=document.getElementById('sidebar');
    if(!sidebar)return null;
    const existing=[...sidebar.querySelectorAll('a[href="affiliate-dashboard.html"],a[href="earn-with-liw.html"],#liw-affiliate-nav-link')];
    let keep=existing[0]||null;
    existing.slice(1).forEach(link=>link.remove());
    if(!keep){
      const plans=document.getElementById('plans-billing-link');
      const nav=plans?.closest('nav')||sidebar.querySelector('nav');
      if(!nav)return null;
      keep=document.createElement('a');
      if(plans)nav.insertBefore(keep,plans);else nav.appendChild(keep);
    }
    setEarnLinkContent(keep);
    if(/\/earn-with-liw(?:\.html)?$/.test(location.pathname)){
      keep.classList.add('active');
      keep.setAttribute('aria-current','page');
    }
    return keep;
  }

  function renderDashboardEntry(){
    ensureSingleSidebarEntry();
    const grid=document.querySelector('.dashboard-tool-grid');
    if(grid){
      const cards=[...grid.querySelectorAll('a[href="affiliate-dashboard.html"],a[href="earn-with-liw.html"]')];
      const primary=cards[0]||null;
      cards.slice(1).forEach(card=>card.remove());
      if(primary){
        primary.href='earn-with-liw.html';
        const title=primary.querySelector('strong');
        const copy=primary.querySelector('p');
        if(title)title.textContent='Earn with LIW';
        if(cacheState==='active'){
          primary.hidden=true;
        }else{
          primary.hidden=false;
          if(copy)copy.textContent=cacheState==='opted_out'
            ? 'Earning is turned off. You can reactivate anytime without changing your LIW Cards plan.'
            : 'Activate earning when you are ready, share your referral link, and earn on qualifying LIW Cards purchases.';
        }
      }
    }
    if(globalThis.lucide)lucide.createIcons();
  }

  function buildEarnDialog(){
    let dialog=document.getElementById('liw-earn-with-liw-dialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='liw-earn-with-liw-dialog';
    dialog.className='liw-affiliate-choice-dialog';
    dialog.innerHTML=`
      <div class="liw-affiliate-choice-panel">
        <div class="liw-affiliate-choice-icon"><i data-lucide="badge-dollar-sign" size="25"></i></div>
        <span class="eyebrow">Optional earning feature</span>
        <h2>Want to Earn with LIW?</h2>
        <p>Your card is live. You can also earn commissions when businesses join LIW Cards through your referral link.</p>
        <ul class="liw-affiliate-choice-points">
          <li><i data-lucide="check-circle-2" size="18"></i><span>Your card and plan work the same whether you activate earning or not.</span></li>
          <li><i data-lucide="check-circle-2" size="18"></i><span>Tax and payout setup only appear after you activate.</span></li>
          <li><i data-lucide="check-circle-2" size="18"></i><span>You can turn earning off or reactivate it later.</span></li>
        </ul>
        <div class="liw-affiliate-choice-actions">
          <button class="btn btn-primary" id="liw-earn-activate" type="button">Activate &amp; earn</button>
          <button class="btn btn-light" id="liw-earn-later" type="button">Maybe later</button>
        </div>
        <small class="liw-affiliate-choice-note">No extra charge. Your LIW Cards plan does not change.</small>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#liw-earn-activate')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      button.disabled=true;
      button.textContent='Activating…';
      try{
        await activate();
        dialog.close();
        if(typeof globalThis.toast==='function')toast('Earn with LIW activated.');
      }catch(error){
        if(typeof globalThis.toast==='function')toast(error?.message||'Unable to activate Earn with LIW.');
      }finally{
        button.disabled=false;
        button.textContent='Activate & earn';
      }
    });
    dialog.querySelector('#liw-earn-later')?.addEventListener('click',async()=>{
      try{await markPromptSeen();}catch(_){}
      dialog.close();
    });
    if(globalThis.lucide)lucide.createIcons();
    return dialog;
  }

  async function promptAfterPublish(){
    const preference=await getPreference(true);
    if(!preference||preference.state==='active'||preference.promptSeen)return false;
    const dialog=buildEarnDialog();
    if(!dialog.open)dialog.showModal();
    return true;
  }

  function wirePublishPrompt(){
    if(!/\/editor(?:\.html)?$/.test(location.pathname)||globalThis.__liwEarnPublishPromptWired)return;
    globalThis.__liwEarnPublishPromptWired=true;
    document.addEventListener('click',event=>{
      const target=event.target instanceof Element?event.target:null;
      const button=target?.closest('#publish-button,#panel-publish-button');
      if(!button)return;
      const status=document.querySelector('[name="status"]');
      if(!status||String(status.value).toLowerCase()==='published')return;
      if(publishWatchTimer)clearInterval(publishWatchTimer);
      let attempts=0;
      publishWatchTimer=setInterval(()=>{
        attempts+=1;
        if(String(status.value).toLowerCase()==='published'){
          clearInterval(publishWatchTimer);
          publishWatchTimer=null;
          promptAfterPublish().catch(error=>console.warn('Earn with LIW publish prompt:',error));
        }else if(attempts>=40){
          clearInterval(publishWatchTimer);
          publishWatchTimer=null;
        }
      },250);
    },true);
  }

  function installApi(){
    const existing=globalThis.LIWAffiliateOptIn||{};
    globalThis.LIWAffiliateOptIn={
      ...existing,
      state,
      promptWasSeen,
      currentUser,
      getPreference,
      activate,
      optOut,
      markPromptSeen,
      promptAfterPublish,
      render:renderDashboardEntry
    };
  }

  async function hydrate(){
    const before=cacheState;
    try{
      const preference=await getPreference(true);
      renderDashboardEntry();
      if(/\/(?:affiliate-dashboard|earn-with-liw)(?:\.html)?$/.test(location.pathname)&&preference&&preference.state!==before){
        const already=safeGet(sessionStorage,RELOAD_KEY);
        if(already!==preference.state){
          safeSet(sessionStorage,RELOAD_KEY,preference.state);
          location.reload();
          return;
        }
      }
      safeRemove(sessionStorage,RELOAD_KEY);
    }catch(error){
      console.warn('Earn with LIW preference hydration:',error);
      renderDashboardEntry();
    }
  }

  function boot(){
    renderDashboardEntry();
    wirePublishPrompt();
    let tries=0;
    const timer=setInterval(()=>{
      tries+=1;
      if(client()?.auth){clearInterval(timer);hydrate();}
      else if(tries>40)clearInterval(timer);
    },100);
    setTimeout(renderDashboardEntry,300);
    setTimeout(renderDashboardEntry,900);
  }

  installApi();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();