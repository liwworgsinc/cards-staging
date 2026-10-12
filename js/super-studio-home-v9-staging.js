/* LIW Cards staging — Super Studio V9 home landing.
   Uses saved card/state data to keep Home useful without duplicating full tabs. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_HOME_V9__)return;
  window.__LIW_SUPER_STUDIO_HOME_V9__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&/\/card\.html$/i.test(location.pathname)))return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
  let activeCard=null;
  let activeState=null;
  let timer=null;
  let tries=0;

  function ensureStyle(){
    let link=q('link[data-liw-super-studio-home-v9]');
    if(!link){
      link=document.createElement('link');
      link.rel='stylesheet';
      link.dataset.liwSuperStudioHomeV9='true';
      document.head.appendChild(link);
    }
    const href='css/super-studio-home-v9-staging.css?v=20261012-home-1';
    if(!String(link.getAttribute('href')||'').includes('20261012-home-1'))link.href=href;
  }

  function client(){
    try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||null;}
  }

  function normalizeWebsite(raw){
    const value=String(raw||'').trim();
    if(!value)return '';
    return /^https?:\/\//i.test(value)?value:`https://${value}`;
  }

  function addAction(grid,key,href,icon,label,target){
    if(!grid||!href||q(`[data-ss-home-action="${key}"]`,grid))return false;
    const a=document.createElement('a');
    a.className='ss-quick';
    a.dataset.ssHomeAction=key;
    a.href=href;
    if(target){a.target=target;a.rel='noopener';}
    a.innerHTML=`<i data-lucide="${icon}" aria-hidden="true"></i><span>${esc(label)}</span>`;
    grid.appendChild(a);
    return true;
  }

  function ensureContactActions(root,card){
    const grid=q('.ss-app-screen[data-ss-screen="home"] .ss-quick-grid',root)||q('.ss-quick-grid',root);
    if(!grid)return false;
    grid.classList.add('ss-home-contact-grid');
    let changed=false;
    const email=String(card?.email||'').trim();
    const website=normalizeWebsite(card?.website);
    const whatsapp=String(card?.whatsapp_number||'').replace(/[^0-9+]/g,'');
    if(email)changed=addAction(grid,'email',`mailto:${email}`,'mail','Email')||changed;
    if(website)changed=addAction(grid,'website',website,'globe-2','Website','_blank')||changed;
    if(whatsapp)changed=addAction(grid,'whatsapp',`https://wa.me/${whatsapp.replace(/^\+/,'')}`,'message-circle','WhatsApp','_blank')||changed;
    return true;
  }

  function servicePreview(root){
    return qa('.ss-app-screen[data-ss-screen="services"] .ss-service-card-v3,.ss-app-screen[data-ss-screen="services"] .ss-service-card',root)
      .slice(0,2)
      .map(card=>({
        name:String(q('h3',card)?.textContent||'').trim(),
        price:String(q('.ss-service-bottom strong',card)?.textContent||'').trim()
      }))
      .filter(item=>item.name);
  }

  function navigate(root,name){
    const button=q(`.ss-app-nav [data-ss-app-screen="${name}"]`,root)||q(`[data-ss-app-screen="${name}"]`,root);
    if(button){button.click();return true;}
    return false;
  }

  function buildHomeStory(root,card,state){
    const home=q('.ss-app-screen[data-ss-screen="home"]',root);
    if(!home)return false;
    const existing=q('.ss-home-story',home);
    if(existing)existing.remove();

    const services=servicePreview(root);
    const pair=(Array.isArray(state?.beforeAfter)?state.beforeAfter:[]).find(item=>item?.beforeUrl&&item?.afterUrl);
    const review=(Array.isArray(state?.reviews?.items)?state.reviews.items:[]).find(item=>String(item?.quote||'').trim());
    const bio=String(card?.biography||'').trim();
    const proof=review?.quote||bio;
    const proofBy=review?.name?`— ${review.name}`:(bio?'About the professional':'');

    if(!services.length&&!pair&&!proof)return true;

    const story=document.createElement('div');
    story.className='ss-home-story';
    story.dataset.ssHomeStory='true';
    story.innerHTML=`
      <div class="ss-home-story-head">
        <div><span>At a glance</span><h2>Why book here</h2></div>
        <small>Tap to explore</small>
      </div>`;

    if(services.length){
      const panel=document.createElement('div');
      panel.className='ss-home-panel';
      panel.innerHTML=`
        <div class="ss-home-panel-head"><strong><i data-lucide="sparkles"></i>Popular services</strong><button class="ss-home-link" type="button" data-ss-home-jump="services">See all</button></div>
        <div class="ss-home-services">${services.map(item=>`<div class="ss-home-service"><span>${esc(item.name)}</span><small>${esc(item.price||'Tap Services for details')}</small></div>`).join('')}</div>`;
      story.appendChild(panel);
    }

    if(pair){
      const panel=document.createElement('div');
      panel.className='ss-home-panel';
      panel.innerHTML=`
        <div class="ss-home-panel-head"><strong><i data-lucide="images"></i>Featured transformation</strong><button class="ss-home-link" type="button" data-ss-home-jump="work">See work</button></div>
        <div class="ss-home-transformation">
          <figure><img src="${esc(pair.beforeUrl)}" alt="Before"><figcaption>Before</figcaption></figure>
          <figure><img src="${esc(pair.afterUrl)}" alt="After"><figcaption>After</figcaption></figure>
        </div>`;
      story.appendChild(panel);
    }

    if(proof){
      const panel=document.createElement('div');
      panel.className='ss-home-panel';
      panel.innerHTML=`
        <div class="ss-home-panel-head"><strong><i data-lucide="${review?'star':'badge-check'}"></i>${review?'Client love':'Meet your professional'}</strong><button class="ss-home-link" type="button" data-ss-home-jump="more">More</button></div>
        <div class="ss-home-proof"><span class="ss-home-proof-icon"><i data-lucide="${review?'quote':'user-round'}"></i></span><div class="ss-home-proof-copy"><p>${esc(proof)}</p>${proofBy?`<strong>${esc(proofBy)}</strong>`:''}</div></div>`;
      story.appendChild(panel);
    }

    home.appendChild(story);
    if(story.dataset.ssHomeEvents!=='true'){
      story.dataset.ssHomeEvents='true';
      story.addEventListener('click',event=>{
        const jump=event.target.closest('[data-ss-home-jump]');
        if(jump){event.preventDefault();navigate(root,jump.dataset.ssHomeJump);}
      });
    }
    return true;
  }

  function apply(){
    if(!activeCard||String(activeCard.card_experience||'').toLowerCase()!=='super-studio')return true;
    const root=q('#super-studio-public .super-studio-experience')||q('.super-studio-experience');
    if(!root)return false;
    const home=q('.ss-app-screen[data-ss-screen="home"]',root);
    const services=q('.ss-app-screen[data-ss-screen="services"]',root);
    if(!home||!services)return false;

    ensureContactActions(root,activeCard);
    buildHomeStory(root,activeCard,activeState||{});
    root.dataset.ssHomeV9='true';
    if(window.lucide)try{lucide.createIcons({nodes:[root]});}catch(_){try{lucide.createIcons();}catch(__){}}
    return true;
  }

  function scheduleApply(){
    clearInterval(timer);
    tries=0;
    timer=setInterval(()=>{
      tries+=1;
      if(apply()||tries>80)clearInterval(timer);
    },100);
  }

  async function load(card){
    if(!card||String(card.card_experience||'').toLowerCase()!=='super-studio')return;
    activeCard=card;
    activeState={};
    ensureStyle();
    const c=client();
    if(c&&card.id){
      try{
        const {data,error}=await c.from('super_studio_state_staging').select('data').eq('card_id',card.id).maybeSingle();
        if(!error)activeState=data?.data||{};
      }catch(_){}
    }
    scheduleApply();
  }

  document.addEventListener('liw:public-card-rendered',event=>void load(event.detail?.card));
  document.addEventListener('liw:public-card-ready',event=>{if(event.detail?.card)activeCard=event.detail.card;});
  new MutationObserver(()=>{if(activeCard)requestAnimationFrame(apply);}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pageshow',()=>{if(activeCard)scheduleApply();});
  setTimeout(()=>{try{const card=typeof publicCard!=='undefined'?publicCard:null;if(card)void load(card);}catch(_){}},0);
})();
