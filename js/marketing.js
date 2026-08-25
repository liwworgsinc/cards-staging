const menuButton=document.querySelector('[data-menu-button]');
const mobileMenu=document.querySelector('[data-mobile-menu]');
if(menuButton&&mobileMenu){menuButton.addEventListener('click',()=>mobileMenu.classList.toggle('open'));mobileMenu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>mobileMenu.classList.remove('open')))}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

// Staging homepage featured-card controller.
// The public card remains interactive inside the iframe while the selected cards,
// ordering, and rotation timing are controlled from the LIW admin portal.
const featuredFrame=document.querySelector('[data-featured-card]');
const featuredName=document.querySelector('[data-featured-name]');
const featuredLink=document.querySelector('.home-frame-meta a');
const featuredWrap=document.querySelector('.home-live-frame-wrap');
const spotlightSection=document.getElementById('live-card');
const spotlightSwitcher=document.querySelector('.home-card-switcher');
const isGithubStaging=location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/');
let spotlightCards=[];
let spotlightIndex=0;
let spotlightRotationEnabled=false;
let spotlightRotationSeconds=10;
let spotlightRotationTimer=null;

function wireGuestBuilderHomeCtas(){
  if(!document.body.classList.contains('liw-home-v3'))return;
  document.querySelectorAll('a[href="register.html"]').forEach(link=>{
    link.href='guest-builder.html?from=home';
  });
}

function installSpotlightRotationStyles(){
  if(document.querySelector('link[data-liw-home-spotlight-rotation]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='css/home-spotlight-rotation.css?v=20260824-1';
  link.dataset.liwHomeSpotlightRotation='true';
  document.head.appendChild(link);
}

function stagingCardUrl(slug){
  return `card.html?slug=${encodeURIComponent(String(slug||'').trim())}`;
}

function fallbackFeaturedCard(){
  if(!featuredFrame)return;
  const fallbackSlug='damion-thomas-liw';
  const fallbackUrl=stagingCardUrl(fallbackSlug);
  featuredFrame.src=fallbackUrl;
  if(featuredLink)featuredLink.href=fallbackUrl;
  document.querySelectorAll('[data-card-url]').forEach(button=>{
    if(isGithubStaging||(button.getAttribute('data-card-url')||'').includes('cards.liwworgs.com/card.html')){
      button.setAttribute('data-card-url',fallbackUrl);
    }
  });
}

function clearSpotlightRotation(){
  if(spotlightRotationTimer){
    window.clearTimeout(spotlightRotationTimer);
    spotlightRotationTimer=null;
  }
}

function scheduleSpotlightRotation(){
  clearSpotlightRotation();
  if(!spotlightRotationEnabled||spotlightCards.length<2)return;
  spotlightRotationTimer=window.setTimeout(()=>{
    const nextIndex=(spotlightIndex+1)%spotlightCards.length;
    showSpotlightCard(nextIndex,true);
  },spotlightRotationSeconds*1000);
}

function showSpotlightCard(index,animate=false){
  if(!spotlightCards.length||!featuredFrame)return;
  spotlightIndex=Math.max(0,Math.min(Number(index)||0,spotlightCards.length-1));
  const card=spotlightCards[spotlightIndex];
  const url=stagingCardUrl(card.slug);

  const commit=()=>{
    featuredFrame.src=url;
    featuredFrame.title=`Live LIW Card — ${card.label||card.slug}`;
    if(featuredName)featuredName.textContent=card.label||card.slug;
    if(featuredLink)featuredLink.href=url;
    spotlightSwitcher?.querySelectorAll('[data-home-featured-index]').forEach((button,buttonIndex)=>{
      const active=buttonIndex===spotlightIndex;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
  };

  if(animate&&featuredWrap){
    featuredWrap.classList.add('is-switching');
    window.setTimeout(commit,110);
    window.setTimeout(()=>featuredWrap.classList.remove('is-switching'),360);
  }else{
    commit();
  }
  scheduleSpotlightRotation();
}

function renderSpotlightSwitcher(){
  if(!spotlightSwitcher)return;
  const fragment=document.createDocumentFragment();
  spotlightCards.forEach((card,index)=>{
    const button=document.createElement('button');
    button.type='button';
    button.dataset.homeFeaturedIndex=String(index);
    button.textContent=card.label||card.slug;
    button.setAttribute('aria-pressed',index===0?'true':'false');
    if(index===0)button.classList.add('active');
    fragment.appendChild(button);
  });

  const status=document.createElement('span');
  status.className='home-card-rotation-status';
  if(spotlightRotationEnabled&&spotlightCards.length>1){
    status.textContent=`Auto rotates every ${spotlightRotationSeconds}s`;
  }else if(spotlightCards.length>1){
    status.textContent='Choose a featured business';
  }else{
    status.textContent='Featured business';
  }
  fragment.appendChild(status);
  spotlightSwitcher.replaceChildren(fragment);
}

function applySpotlightConfig(config){
  if(!spotlightSection)return;
  if(config?.enabled===false){
    spotlightSection.hidden=true;
    clearSpotlightRotation();
    return;
  }
  spotlightSection.hidden=false;
  const cards=Array.isArray(config?.cards)?config.cards:[];
  spotlightCards=cards
    .filter(card=>card&&card.enabled!==false&&String(card.slug||'').trim())
    .slice(0,20)
    .map(card=>({slug:String(card.slug).trim(),label:String(card.label||card.slug).trim()}));

  if(!spotlightCards.length){
    fallbackFeaturedCard();
    return;
  }

  spotlightRotationEnabled=config?.rotation_enabled!==false;
  const seconds=Number(config?.rotation_seconds||10);
  spotlightRotationSeconds=Math.max(5,Math.min(120,Number.isFinite(seconds)?seconds:10));
  spotlightIndex=0;
  renderSpotlightSwitcher();
  showSpotlightCard(0,false);
}

function loadScriptOnce(src,readyCheck){
  return new Promise((resolve,reject)=>{
    if(readyCheck())return resolve();
    const existing=Array.from(document.scripts).find(script=>script.src&&script.src.includes(src.split('?')[0]));
    if(existing){
      existing.addEventListener('load',()=>resolve(),{once:true});
      existing.addEventListener('error',()=>reject(new Error(`Unable to load ${src}`)),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=src;
    script.onload=()=>resolve();
    script.onerror=()=>reject(new Error(`Unable to load ${src}`));
    document.head.appendChild(script);
  });
}

async function ensureHomepageSupabase(){
  if(typeof supabaseClient!=='undefined')return supabaseClient;
  if(!window.supabase){
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',()=>Boolean(window.supabase));
  }
  if(typeof supabaseClient==='undefined'){
    await loadScriptOnce('js/config.js?v=20260731-1066',()=>typeof supabaseClient!=='undefined');
  }
  return supabaseClient;
}

async function loadHomepageSpotlightConfig(){
  try{
    const client=await ensureHomepageSupabase();
    const {data,error}=await client
      .from('staging_homepage_spotlight_config')
      .select('enabled,rotation_enabled,rotation_seconds,cards')
      .eq('id',1)
      .maybeSingle();
    if(error)throw error;
    if(data)applySpotlightConfig(data);
  }catch(error){
    console.warn('Staging homepage spotlight settings unavailable:',error);
    fallbackFeaturedCard();
  }
}

spotlightSwitcher?.addEventListener('click',event=>{
  const button=event.target.closest('[data-home-featured-index]');
  if(!button)return;
  showSpotlightCard(Number(button.dataset.homeFeaturedIndex||0),true);
});

document.addEventListener('visibilitychange',()=>{
  if(document.hidden)clearSpotlightRotation();
  else scheduleSpotlightRotation();
});

wireGuestBuilderHomeCtas();
installSpotlightRotationStyles();
fallbackFeaturedCard();
loadHomepageSpotlightConfig();

if(window.lucide)lucide.createIcons();