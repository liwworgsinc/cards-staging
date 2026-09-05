const menuButton=document.querySelector('[data-menu-button]');
const mobileMenu=document.querySelector('[data-mobile-menu]');
if(menuButton&&mobileMenu){menuButton.addEventListener('click',()=>mobileMenu.classList.toggle('open'));mobileMenu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>mobileMenu.classList.remove('open')))}
const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();

// Staging homepage featured-card controller.
// Launch stability mode: visitors choose featured businesses manually. We do not
// replace an interactive iframe on a timer while somebody may be scrolling/tapping it.
const featuredFrame=document.querySelector('[data-featured-card]');
const featuredName=document.querySelector('[data-featured-name]');
const featuredLink=document.querySelector('.home-frame-meta a');
const featuredWrap=document.querySelector('.home-live-frame-wrap');
const spotlightSection=document.getElementById('live-card');
const spotlightSwitcher=document.querySelector('.home-card-switcher');
const isGithubStaging=location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/');
const fallbackSpotlightCards=[
  {slug:'cgt',label:'CGT CONSULTANTS'},
  {slug:'damion-thomas-liw',label:'Damion Thomas · LIW'}
];
let spotlightCards=[];
let spotlightIndex=0;
let spotlightRotationEnabled=false;
let spotlightRotationSeconds=20;
let spotlightRotationTimer=null;
let spotlightInView=false;

function wireGuestBuilderHomeCtas(){
  if(!document.body.classList.contains('liw-home-v3'))return;
  document.querySelectorAll('a[href="register.html"]').forEach(link=>{
    link.href='guest-builder.html?from=home';
  });
}

function mountHireDesignerHome(){
  if(!document.body.classList.contains('liw-home-v3')||document.querySelector('[data-home-hire-designer]'))return;

  const nav=document.querySelector('.home-nav .nav-links');
  if(nav&&!nav.querySelector('a[href^="hire-designer.html"]')){
    const link=document.createElement('a');
    link.href='hire-designer.html?from=home';
    link.textContent='Hire a Designer';
    const agency=nav.querySelector('a[href="agency.html"]');
    if(agency)agency.insertAdjacentElement('beforebegin',link);else nav.appendChild(link);
  }

  const mobile=document.querySelector('[data-mobile-menu]');
  if(mobile&&!mobile.querySelector('a[href^="hire-designer.html"]')){
    const link=document.createElement('a');
    link.href='hire-designer.html?from=home';
    link.textContent='Hire a Designer';
    const agency=mobile.querySelector('a[href="agency.html"]');
    if(agency)agency.insertAdjacentElement('beforebegin',link);else mobile.appendChild(link);
    link.addEventListener('click',()=>mobile.classList.remove('open'));
  }

  const style=document.createElement('style');
  style.dataset.homeHireDesigner='true';
  style.textContent=`
    .home-designer-service{padding:24px 0 72px;background:#fff}
    .home-designer-shell{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.2fr) auto;gap:30px;align-items:center;padding:34px 38px;border:1px solid rgba(11,20,56,.1);border-radius:28px;background:linear-gradient(135deg,#07102e 0%,#10224f 70%,#70531f 125%);color:#fff;box-shadow:0 24px 60px rgba(7,16,46,.16)}
    .home-designer-shell:after{content:"";position:absolute;width:300px;height:300px;border-radius:50%;right:-120px;top:-180px;background:radial-gradient(circle,rgba(242,211,130,.3),transparent 68%);pointer-events:none}
    .home-designer-copy,.home-designer-actions{position:relative;z-index:1}
    .home-designer-kicker{display:inline-flex;margin-bottom:10px;padding:6px 9px;border-radius:999px;background:rgba(242,211,130,.14);border:1px solid rgba(242,211,130,.25);color:#f2d382;font-size:.68rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}
    .home-designer-copy h2{margin:0 0 9px;font-size:clamp(1.8rem,3vw,2.75rem);line-height:1.05;letter-spacing:-.045em;color:#fff}
    .home-designer-copy p{max-width:720px;margin:0;color:#cbd4e7;line-height:1.62}
    .home-designer-points{display:flex;gap:14px;flex-wrap:wrap;margin-top:17px;color:#eef2fa;font-size:.78rem;font-weight:750}
    .home-designer-points span{display:inline-flex;align-items:center;gap:7px}.home-designer-points i{color:#f2d382}
    .home-designer-actions{display:grid;gap:9px;min-width:220px}
    .home-designer-actions .btn{white-space:nowrap}.home-designer-primary{background:linear-gradient(135deg,#d4a84f,#f2d382);color:#07102e;box-shadow:none}.home-designer-secondary{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#fff}
    @media(max-width:860px){.home-designer-shell{grid-template-columns:1fr;padding:30px}.home-designer-actions{grid-template-columns:1fr 1fr;min-width:0}}
    @media(max-width:560px){.home-designer-service{padding:10px 0 54px}.home-designer-shell{padding:25px 20px;border-radius:22px}.home-designer-points{display:grid;gap:8px}.home-designer-actions{grid-template-columns:1fr}.home-designer-actions .btn{width:100%}}
  `;
  document.head.appendChild(style);

  const section=document.createElement('section');
  section.className='home-designer-service';
  section.dataset.homeHireDesigner='true';
  section.innerHTML=`
    <div class="container">
      <div class="home-designer-shell">
        <div class="home-designer-copy">
          <span class="home-designer-kicker">Done-for-you option</span>
          <h2>Want the LIW Card, but not the setup work?</h2>
          <p>Choose a design service, the LIW plan that fits, and an optional custom domain in one guided flow. LIW builds the card, you review it, and you keep control of the finished card.</p>
          <div class="home-designer-points">
            <span><i data-lucide="wand-sparkles" size="16"></i>Professionally designed by LIW</span>
            <span><i data-lucide="badge-check" size="16"></i>One-time design service</span>
            <span><i data-lucide="globe-2" size="16"></i>Custom domain optional</span>
          </div>
        </div>
        <div class="home-designer-actions">
          <a class="btn home-designer-primary" href="hire-designer.html?from=home">Hire an LIW Designer <i data-lucide="arrow-right" size="17"></i></a>
          <a class="btn home-designer-secondary" href="pricing.html">Compare plans</a>
        </div>
      </div>
    </div>`;

  const agencySection=document.querySelector('.home-agency-lite');
  if(agencySection)agencySection.insertAdjacentElement('beforebegin',section);
  else document.querySelector('main')?.appendChild(section);

  const footerProduct=[...document.querySelectorAll('.site-footer-column')].find(column=>String(column.querySelector('h2')?.textContent||'').trim().toLowerCase()==='product');
  if(footerProduct&&!footerProduct.querySelector('a[href^="hire-designer.html"]')){
    const link=document.createElement('a');
    link.href='hire-designer.html?from=footer';
    link.textContent='Hire a Designer';
    const pricing=footerProduct.querySelector('a[href="pricing.html"]');
    if(pricing)pricing.insertAdjacentElement('afterend',link);else footerProduct.appendChild(link);
  }

  if(window.lucide)lucide.createIcons();
}

function installSpotlightRotationStyles(){
  if(document.querySelector('link[data-liw-home-spotlight-rotation]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='css/home-spotlight-rotation.css?v=20260824-1';
  link.dataset.liwHomeSpotlightRotation='true';
  document.head.appendChild(link);
}

function stagingCardUrl(slug,embed=true){
  const base=`card.html?slug=${encodeURIComponent(String(slug||'').trim())}`;
  return embed?`${base}&embed=1`:base;
}

// Homepage-only polish. Because the iframe is same-origin on staging, we can hide
// its browser scrollbar without touching the standalone public card CSS or renderer.
// Scrolling itself remains fully enabled by touch, wheel and trackpad.
function polishEmbeddedCardPreview(){
  if(!featuredFrame)return;
  try{
    const doc=featuredFrame.contentDocument;
    if(!doc?.documentElement)return;
    doc.documentElement.classList.add('liw-home-embed-preview');
    if(doc.getElementById('liw-home-embed-scrollbar-style'))return;
    const style=doc.createElement('style');
    style.id='liw-home-embed-scrollbar-style';
    style.textContent=`
html.liw-home-embed-preview,
html.liw-home-embed-preview body{
  scrollbar-width:none!important;
  -ms-overflow-style:none!important;
}
html.liw-home-embed-preview::-webkit-scrollbar,
html.liw-home-embed-preview body::-webkit-scrollbar{
  width:0!important;
  height:0!important;
  display:none!important;
}
`;
    doc.head.appendChild(style);
  }catch(_){
    // If the iframe ever becomes cross-origin, fail open: the card still works.
  }
}

featuredFrame?.addEventListener('load',polishEmbeddedCardPreview);

function fallbackFeaturedCard(){
  if(!featuredFrame)return;
  spotlightCards=fallbackSpotlightCards.map(card=>({...card}));
  spotlightRotationEnabled=false;
  spotlightIndex=0;
  renderSpotlightSwitcher();
  showSpotlightCard(0,false,false);
}

function clearSpotlightRotation(){
  if(spotlightRotationTimer){
    window.clearTimeout(spotlightRotationTimer);
    spotlightRotationTimer=null;
  }
}

function scheduleSpotlightRotation(){
  clearSpotlightRotation();
  if(!spotlightRotationEnabled||spotlightCards.length<2||!spotlightInView||document.hidden)return;
  spotlightRotationTimer=window.setTimeout(()=>{
    if(!spotlightInView||document.hidden)return;
    const nextIndex=(spotlightIndex+1)%spotlightCards.length;
    showSpotlightCard(nextIndex,true,true);
  },spotlightRotationSeconds*1000);
}

function restoreScrollIfIframePulledFocus(scrollY){
  const restore=()=>{
    const current=window.scrollY||window.pageYOffset||0;
    if(Math.abs(current-scrollY)>120)window.scrollTo({top:scrollY,left:0,behavior:'auto'});
  };
  window.requestAnimationFrame(restore);
  window.setTimeout(restore,80);
  window.setTimeout(restore,240);
}

function showSpotlightCard(index,animate=false,isAutomatic=false){
  if(!spotlightCards.length||!featuredFrame)return;
  spotlightIndex=Math.max(0,Math.min(Number(index)||0,spotlightCards.length-1));
  const card=spotlightCards[spotlightIndex];
  const url=stagingCardUrl(card.slug,true);
  const fullUrl=stagingCardUrl(card.slug,false);
  const scrollBefore=window.scrollY||window.pageYOffset||0;

  const commit=()=>{
    featuredFrame.src=url;
    featuredFrame.title=`Live LIW Card — ${card.label||card.slug}`;
    if(featuredName)featuredName.textContent=card.label||card.slug;
    if(featuredLink)featuredLink.href=fullUrl;
    spotlightSwitcher?.querySelectorAll('[data-home-featured-index]').forEach((button,buttonIndex)=>{
      const active=buttonIndex===spotlightIndex;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
    if(isAutomatic)restoreScrollIfIframePulledFocus(scrollBefore);
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
  status.textContent=spotlightCards.length>1?'Choose a featured business':'Featured business';
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

  // Launch rule: admin can choose/order cards, but automatic replacement stays off.
  spotlightRotationEnabled=false;
  spotlightIndex=0;
  renderSpotlightSwitcher();
  showSpotlightCard(0,false,false);
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
    await loadScriptOnce('js/config.js?v=20260827-home-rotation-2',()=>typeof supabaseClient!=='undefined');
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

function mountHomepageAnalytics(){
  if(!isGithubStaging||document.querySelector('script[data-liw-site-analytics]'))return;
  const script=document.createElement('script');
  script.src='js/site-analytics-staging.js?v=20260827-2';
  script.dataset.liwSiteAnalytics='true';
  document.head.appendChild(script);
}

spotlightSwitcher?.addEventListener('click',event=>{
  const button=event.target.closest('[data-home-featured-index]');
  if(!button)return;
  showSpotlightCard(Number(button.dataset.homeFeaturedIndex||0),true,false);
});

if(spotlightSection&&'IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{
    const entry=entries[0];
    spotlightInView=Boolean(entry&&entry.isIntersecting);
    if(spotlightInView)scheduleSpotlightRotation();
    else clearSpotlightRotation();
  },{threshold:[0,.01,.12,.35]});
  observer.observe(spotlightSection);
}else if(spotlightSection){
  spotlightInView=true;
}

document.addEventListener('visibilitychange',()=>{
  if(document.hidden)clearSpotlightRotation();
  else scheduleSpotlightRotation();
});

wireGuestBuilderHomeCtas();
mountHireDesignerHome();
installSpotlightRotationStyles();
fallbackFeaturedCard();
loadHomepageSpotlightConfig();
window.setTimeout(mountHomepageAnalytics,1500);

if(window.lucide)lucide.createIcons();