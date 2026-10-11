/* LIW Cards staging — Super Studio public renderer. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_PUBLIC__)return;
  window.__LIW_SUPER_STUDIO_PUBLIC__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&location.pathname.toLowerCase().endsWith('/card.html')))return;

  const SS=window.LIWSuperStudio;
  if(!SS){console.warn('Super Studio config missing');return;}
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let activeCard=null;
  let activeState=null;
  let galleryItems=[];
  let galleryIndex=0;
  let renderToken=0;

  function ensureStyle(){
    if(q('link[data-liw-super-studio]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/super-studio-staging.css?v=20261011-1';
    link.dataset.liwSuperStudio='true';
    document.head.appendChild(link);
  }

  function client(){
    try{return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);}catch(_){return window.__LIW_PUBLIC_CARD_DATA_CLIENT__||null;}
  }

  async function fetchSupport(cardId){
    const c=client();
    if(!c)return {state:SS.normalize(),services:[],socials:[],products:[]};
    const [stateResult,servicesResult,socialResult,productResult]=await Promise.all([
      c.from('super_studio_state_staging').select('data').eq('card_id',cardId).maybeSingle(),
      c.from('card_services').select('*').eq('card_id',cardId).eq('is_enabled',true).order('sort_order'),
      c.from('social_links').select('*').eq('card_id',cardId).eq('is_enabled',true).order('sort_order'),
      c.from('card_products').select('*').eq('card_id',cardId).eq('is_enabled',true).order('sort_order')
    ]);
    if(stateResult.error)console.warn('Super Studio state public load:',stateResult.error);
    return {
      state:SS.normalize(stateResult.data?.data||{}),
      services:servicesResult.data||[],
      socials:socialResult.data||[],
      products:productResult.data||[]
    };
  }

  function ensureDialogs(){
    if(!q('#ss-gallery-dialog')){
      const gallery=document.createElement('dialog');
      gallery.id='ss-gallery-dialog';
      gallery.className='ss-modal';
      gallery.innerHTML='<div class="ss-modal-head"><h3>My Work</h3><button type="button" aria-label="Close gallery" data-ss-close><i data-lucide="x"></i></button></div><div class="ss-gallery-stage"><img alt="Portfolio image" data-ss-gallery-image></div><div class="ss-gallery-controls"><button type="button" data-ss-prev>Previous</button><button type="button" data-ss-next>Next</button></div>';
      document.body.appendChild(gallery);
      gallery.querySelector('[data-ss-close]')?.addEventListener('click',()=>gallery.close());
      gallery.querySelector('[data-ss-prev]')?.addEventListener('click',()=>showGallery(galleryIndex-1));
      gallery.querySelector('[data-ss-next]')?.addEventListener('click',()=>showGallery(galleryIndex+1));
      gallery.addEventListener('click',event=>{if(event.target===gallery)gallery.close();});
      let touchX=0;
      gallery.addEventListener('touchstart',event=>{touchX=event.changedTouches?.[0]?.clientX||0;},{passive:true});
      gallery.addEventListener('touchend',event=>{const end=event.changedTouches?.[0]?.clientX||touchX,delta=end-touchX;if(Math.abs(delta)>45)showGallery(galleryIndex+(delta<0?1:-1));},{passive:true});
    }
    if(!q('#ss-info-dialog')){
      const info=document.createElement('dialog');
      info.id='ss-info-dialog';
      info.className='ss-modal';
      info.innerHTML='<div class="ss-modal-head"><h3 data-ss-info-title>Details</h3><button type="button" aria-label="Close details" data-ss-close><i data-lucide="x"></i></button></div><div class="ss-modal-body" data-ss-info-body></div>';
      document.body.appendChild(info);
      info.querySelector('[data-ss-close]')?.addEventListener('click',()=>info.close());
      info.addEventListener('click',event=>{if(event.target===info)info.close();});
    }
    if(!q('#ss-more-dialog')){
      const more=document.createElement('dialog');
      more.id='ss-more-dialog';
      more.className='ss-modal';
      more.innerHTML='<div class="ss-modal-head"><h3>More</h3><button type="button" aria-label="Close menu" data-ss-close><i data-lucide="x"></i></button></div><div class="ss-modal-body ss-more-actions"></div>';
      document.body.appendChild(more);
      more.querySelector('[data-ss-close]')?.addEventListener('click',()=>more.close());
      more.addEventListener('click',event=>{if(event.target===more)more.close();});
    }
  }

  function showGallery(index){
    if(!galleryItems.length)return;
    galleryIndex=(index+galleryItems.length)%galleryItems.length;
    const dialog=q('#ss-gallery-dialog'),image=q('[data-ss-gallery-image]',dialog);
    if(image)image.src=galleryItems[galleryIndex].url;
    if(!dialog.open)dialog.showModal();
  }

  function showInfo(kind){
    const dialog=q('#ss-info-dialog');if(!dialog||!activeState)return;
    const title=q('[data-ss-info-title]',dialog),body=q('[data-ss-info-body]',dialog);
    if(kind==='prep'){
      title.textContent='Before Your Appointment';
      body.innerHTML=`<div class="ss-policy-list"><article><p>${SS.esc(activeState.clientPrep||'No preparation instructions have been added.')}</p></article></div>`;
    }else{
      title.textContent='Booking Policies';
      const labels={cancellation:'Cancellation',late:'Late',deposit:'Deposit',noShow:'No-show',guest:'Guest',children:'Children',preparation:'Preparation'};
      const rows=Object.entries(activeState.policies||{}).filter(([,value])=>String(value||'').trim());
      body.innerHTML=`<div class="ss-policy-list">${rows.map(([key,value])=>`<article><h4>${labels[key]||key}</h4><p>${SS.esc(value)}</p></article>`).join('')||'<article><p>No booking policies have been added.</p></article>'}</div>`;
    }
    dialog.showModal();
  }

  function openMore(){
    const dialog=q('#ss-more-dialog'),body=q('.ss-more-actions',dialog);if(!dialog||!body||!activeCard)return;
    const website=activeCard.website?`<a class="btn btn-light btn-block" href="${SS.esc(activeCard.website)}" target="_blank" rel="noopener"><i data-lucide="globe"></i>Website</a>`:'';
    body.innerHTML=`<button class="btn btn-light btn-block" type="button" data-more-action="save"><i data-lucide="user-round-plus"></i>Save Contact</button><button class="btn btn-light btn-block" type="button" data-more-action="qr"><i data-lucide="qr-code"></i>QR Code</button><button class="btn btn-light btn-block" type="button" data-more-action="share"><i data-lucide="share-2"></i>Share</button><button class="btn btn-light btn-block" type="button" data-more-action="install"><i data-lucide="download"></i>Install / Add to Home Screen</button>${website}`;
    body.querySelector('[data-more-action="save"]')?.addEventListener('click',()=>q('#save')?.click());
    body.querySelector('[data-more-action="qr"]')?.addEventListener('click',()=>q('#qr-top')?.click());
    body.querySelector('[data-more-action="share"]')?.addEventListener('click',()=>q('#share-top')?.click());
    body.querySelector('[data-more-action="install"]')?.addEventListener('click',()=>{try{window.LIWPWA?.install?.();}catch(_){}});
    if(window.lucide)try{lucide.createIcons({nodes:[dialog]});}catch(_){}
    dialog.showModal();
  }

  function selectNativeService(name){
    if(!name)return;
    const section=q('#booking-v1-section');
    const select=section?.querySelector('select');
    if(!select)return;
    const option=Array.from(select.options||[]).find(opt=>String(opt.textContent||'').trim().toLowerCase()===String(name).trim().toLowerCase());
    if(option){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));}
  }

  function mountNativeBooking(native){
    const body=q('#super-studio-public .ss-body');
    if(!native||!body)return false;
    if(native.parentElement!==body)body.appendChild(native);
    native.classList.add('ss-native-booking');
    return true;
  }

  function openBooking(serviceName='',staffName=''){
    const native=q('#booking-v1-section');
    if(activeState?.booking?.nativePreferred!==false&&native&&!native.hidden&&native.textContent.trim()){
      mountNativeBooking(native);
      selectNativeService(serviceName);
      native.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>native.querySelector('button,input,select,textarea')?.focus(),350);
      return;
    }
    const hiddenNative=q('#business-actions [data-liw-native-booking-action]');
    if(hiddenNative){hiddenNative.click();return;}
    const external=q('#business-actions [data-business-event="booking_click"],#business-actions [data-event="booking_click"]');
    if(external?.href){window.open(external.href,'_blank','noopener');return;}
    if(activeCard?.booking_url){window.open(activeCard.booking_url,'_blank','noopener');return;}
    const services=q('#super-studio-public [data-ss-section="services"]');
    services?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function wire(root,state){
    root.querySelectorAll('[data-ss-action="book"]').forEach(button=>button.addEventListener('click',()=>openBooking(button.dataset.serviceName||'',button.dataset.staffName||'')));
    root.querySelector('[data-ss-action="share"]')?.addEventListener('click',()=>q('#share-top')?.click());
    root.querySelector('[data-ss-action="more"]')?.addEventListener('click',openMore);
    root.querySelector('[data-ss-action="prep"]')?.addEventListener('click',()=>showInfo('prep'));
    root.querySelector('[data-ss-action="policies"]')?.addEventListener('click',()=>showInfo('policies'));
    root.querySelectorAll('[data-ss-nav]').forEach(button=>button.addEventListener('click',()=>{
      const target=root.querySelector(`[data-ss-section="${button.dataset.ssNav}"]`);
      target?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
    galleryItems=state.portfolio.filter(item=>item?.url);
    root.querySelectorAll('[data-ss-gallery-index]').forEach(button=>button.addEventListener('click',()=>showGallery(Number(button.dataset.ssGalleryIndex))));
    const featured=state.portfolio.filter(item=>item?.url&&item.featured).slice(0,4);
    root.querySelectorAll('[data-ss-featured-index]').forEach(button=>button.addEventListener('click',()=>{
      const item=featured[Number(button.dataset.ssFeaturedIndex)];
      const index=galleryItems.findIndex(row=>row.id===item?.id||row.url===item?.url);
      showGallery(Math.max(0,index));
    }));
    root.querySelectorAll('.ss-ba').forEach(card=>{
      const range=card.querySelector('input[type="range"]'),after=card.querySelector('.ss-ba-after');
      range?.addEventListener('input',()=>{if(after)after.style.clipPath=`inset(0 0 0 ${range.value}%)`;});
    });
  }

  async function render(card){
    if(!card||String(card.card_experience||'').toLowerCase()!=='super-studio')return false;
    const token=++renderToken;
    activeCard=card;
    ensureStyle();ensureDialogs();
    const support=await fetchSupport(card.id);
    if(token!==renderToken)return false;
    activeState=support.state;
    const hostCard=q('#card'),loading=q('#loading');if(!hostCard)return false;
    const access=globalThis.publicCardFeatureAccess||{};
    const effectiveCard={...card,cover_image_url:access.cover_image===true?card.cover_image_url:'',products_enabled:access.product_showcase===true&&card.products_enabled===true};
    const serviceRows=access.services_section===true?support.services:[];
    const productLimit=Math.max(0,Number(access.product_limit||0));
    const productRows=access.product_showcase===true?support.products.slice(0,productLimit):[];
    let host=q('#super-studio-public',hostCard);
    if(!host){host=document.createElement('div');host.id='super-studio-public';hostCard.appendChild(host);}
    host.innerHTML=SS.renderExperience({card:effectiveCard,state:support.state,services:serviceRows,socials:support.socials,products:productRows,preview:card.status!=='published'});
    hostCard.classList.add('super-studio-public-active');
    hostCard.hidden=false;
    hostCard.style.visibility='';
    if(loading)loading.hidden=true;
    document.documentElement.classList.remove('liw-preload-super-studio');
    const branding=q('#branding'),body=q('.ss-body',host);
    if(branding&&body)body.appendChild(branding);
    wire(host,support.state);
    if(window.lucide)try{lucide.createIcons({nodes:[host]});}catch(_){try{lucide.createIcons();}catch(__){}}
    return true;
  }

  document.addEventListener('liw:public-card-ready',event=>{
    const card=event.detail?.card;
    if(String(card?.card_experience||'').toLowerCase()==='super-studio'){
      ensureStyle();
      document.documentElement.classList.add('liw-preload-super-studio');
    }
  });

  document.addEventListener('liw:public-card-rendered',event=>{void render(event.detail?.card);});

  // Fallback if network was unusually fast and the event fired before this script loaded.
  setTimeout(()=>{
    try{
      const card=typeof publicCard!=='undefined'?publicCard:null;
      if(card&&String(card.card_experience||'').toLowerCase()==='super-studio')void render(card);
    }catch(_){}
  },0);
})();
