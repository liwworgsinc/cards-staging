/* LIW Cards staging — Restaurant public experience V1. */
(function(){
  'use strict';
  if(window.__LIW_RESTAURANT_PUBLIC_V1__)return;
  window.__LIW_RESTAURANT_PUBLIC_V1__=true;

  const staging=location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/');
  if(!staging)return;

  const q=(s,scope=document)=>scope.querySelector(s);
  const qa=(s,scope=document)=>[...scope.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=cents=>cents==null||cents===''?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents)/100);
  const normalize=url=>{const v=String(url||'').trim();if(!v)return'';return /^https?:\/\//i.test(v)?v:'https://'+v;};
  const dataClient=()=>window.__LIW_PUBLIC_CARD_DATA_CLIENT__||window.supabaseClient||(typeof supabaseClient!=='undefined'?supabaseClient:null);
  const card=()=>{try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}};
  let mounted=false,mounting=false,items=[],settings={},utility={socials:[],sections:[]};

  function injectStyles(){
    if(q('#liw-restaurant-public-v1-styles'))return;
    const style=document.createElement('style');
    style.id='liw-restaurant-public-v1-styles';
    style.textContent=`
      #card.restaurant-public-active>*:not(#restaurant-public-shell){display:none!important}
      #restaurant-public-shell{--rest-dark:#7c2d12;--rest-accent:#f59e0b;--rest-surface:#fffaf4;--rest-ink:#1f2937;--rest-font:inherit;--rest-radius:16px;width:100%;max-width:760px;margin:0 auto;background:var(--rest-surface);color:var(--rest-ink);font-family:var(--rest-font);overflow:hidden;border-radius:28px;box-shadow:0 22px 70px rgba(15,23,42,.16)}
      .restaurant-public-hero{min-height:315px;position:relative;background:linear-gradient(145deg,var(--rest-dark),#2b130a);background-size:cover;background-position:center;color:#fff;overflow:hidden}.restaurant-public-hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.restaurant-public-hero:after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(to bottom,rgba(0,0,0,.05),rgba(0,0,0,.76))}
      .restaurant-public-top{position:absolute;z-index:2;left:18px;right:18px;top:18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.restaurant-public-brand{max-width:72%;font-size:.72rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase;line-height:1.2}.restaurant-public-top-actions{display:flex;gap:7px}.restaurant-public-icon{width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,255,255,.94);color:#111;display:grid;place-items:center;cursor:pointer}
      .restaurant-public-identity{position:absolute;z-index:2;left:20px;right:20px;bottom:20px}.restaurant-public-identity h1{margin:0 0 6px;font-size:clamp(1.7rem,5vw,2.5rem);line-height:1}.restaurant-public-identity p{margin:0;color:#ffedd5;font-size:.85rem}.restaurant-public-kicker{display:inline-flex;margin-bottom:9px;padding:5px 8px;border-radius:999px;background:var(--rest-accent);color:#111;font-size:.62rem;font-weight:950;letter-spacing:.08em}
      .restaurant-public-body{padding:18px;display:grid;gap:18px}.restaurant-public-tagline{font-size:1rem;line-height:1.5;font-weight:750}.restaurant-public-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.restaurant-public-action{border:1px solid rgba(17,24,39,.08);background:#fff;border-radius:var(--rest-radius);min-height:70px;display:grid;place-items:center;gap:5px;padding:9px;color:var(--rest-ink);text-decoration:none;font:inherit;font-size:.68rem;font-weight:900;cursor:pointer}.restaurant-public-action svg{color:var(--rest-accent)}
      .restaurant-info-control{position:relative}.restaurant-info-kicker{font-size:.58rem;font-weight:950;letter-spacing:.1em;color:#7c2d12;margin-bottom:5px}.restaurant-info-copy{font-size:.67rem;color:#7b818c;margin:0 0 9px}.restaurant-info-toggle{width:100%;border:1px solid rgba(17,24,39,.08);background:#fff;border-radius:var(--rest-radius);padding:11px 13px;display:flex;align-items:center;justify-content:space-between;gap:10px;font:inherit;font-size:.72rem;font-weight:900;cursor:pointer}.restaurant-info-drawer{margin-top:7px;border:1px solid rgba(17,24,39,.08);background:#fff;border-radius:var(--rest-radius);padding:8px;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.restaurant-info-item{border:0;background:#fff7ed;border-radius:12px;padding:11px 8px;display:grid;place-items:center;gap:6px;color:#7c2d12;text-decoration:none;font:inherit;font-size:.62rem;font-weight:900;cursor:pointer;text-align:center}.restaurant-info-item svg{color:var(--rest-accent)}
      .restaurant-section-head{display:flex;justify-content:space-between;align-items:end;gap:10px}.restaurant-section-head h2{margin:0;font-size:1.05rem}.restaurant-section-head span{font-size:.7rem;color:#667085}
      .restaurant-feature-card{background:#fff;border-radius:calc(var(--rest-radius) + 3px);overflow:hidden;box-shadow:0 10px 32px rgba(15,23,42,.09)}.restaurant-feature-photo{height:260px;background:#f3f4f6 center/cover no-repeat;position:relative}.restaurant-feature-badge{position:absolute;left:13px;top:13px;padding:7px 10px;border-radius:999px;background:var(--rest-accent);color:#111;font-size:.64rem;font-weight:950}.restaurant-feature-copy{padding:16px;display:grid;gap:7px}.restaurant-feature-copy h3{margin:0;font-size:1.05rem}.restaurant-feature-copy p{margin:0;color:#667085;line-height:1.5;font-size:.78rem}.restaurant-feature-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.restaurant-feature-row strong{font-size:1.02rem}.restaurant-feature-row a{padding:10px 14px;border-radius:11px;background:var(--rest-dark);color:#fff;text-decoration:none;font-size:.7rem;font-weight:900}
      .restaurant-menu-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.restaurant-menu-card{background:#fff;border:1px solid rgba(17,24,39,.08);border-radius:var(--rest-radius);overflow:hidden}.restaurant-menu-photo{height:145px;background:#f3f4f6 center/cover no-repeat}.restaurant-menu-copy{padding:11px;display:grid;gap:5px}.restaurant-menu-copy strong{font-size:.82rem}.restaurant-menu-copy p{margin:0;color:#667085;font-size:.7rem;line-height:1.4;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.restaurant-menu-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}.restaurant-menu-meta span{font-size:.72rem;font-weight:900}.restaurant-menu-meta a{font-size:.65rem;font-weight:900;color:#7c2d12;text-decoration:none}
      .restaurant-chef-card{padding:18px;border:1px solid rgba(17,24,39,.08);border-radius:calc(var(--rest-radius) + 2px);background:#fff;display:grid;gap:6px}.restaurant-chef-card small{color:var(--rest-accent);font-size:.62rem;font-weight:950;letter-spacing:.1em}.restaurant-chef-card h3{margin:0;font-size:1.05rem}.restaurant-chef-card strong{font-size:.75rem;color:#7c2d12}.restaurant-chef-card p{margin:2px 0 0;color:#667085;font-size:.75rem;line-height:1.55}.restaurant-public-cta{padding:18px;border-radius:calc(var(--rest-radius) + 3px);background:linear-gradient(145deg,var(--rest-dark),#2b130a);color:#fff}.restaurant-public-cta h2{margin:0 0 5px;font-size:1.08rem}.restaurant-public-cta p{margin:0 0 13px;color:#ffedd5;font-size:.78rem}.restaurant-public-cta-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}.restaurant-public-cta-row a{padding:12px;border-radius:11px;background:#fff;color:#111;text-align:center;text-decoration:none;font-size:.72rem;font-weight:900}.restaurant-public-cta-row a:last-child{background:var(--rest-accent)}
      .restaurant-info-sheet[hidden]{display:none!important}.restaurant-info-sheet{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.56);display:flex;align-items:flex-end;justify-content:center;padding:16px}.restaurant-info-sheet-panel{width:min(680px,100%);max-height:78vh;overflow:auto;background:#fffaf4;border-radius:24px 24px 18px 18px;padding:18px;box-shadow:0 24px 80px rgba(15,23,42,.28)}.restaurant-info-sheet-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}.restaurant-info-sheet-head small{display:block;color:#7c2d12;font-size:.58rem;font-weight:950;letter-spacing:.1em}.restaurant-info-sheet-head h3{margin:3px 0 0;font-size:1.1rem}.restaurant-info-sheet-close{width:38px;height:38px;border:0;border-radius:50%;background:#fff;border:1px solid #eadfce;display:grid;place-items:center;cursor:pointer}.restaurant-hours-list{display:grid;gap:8px}.restaurant-hours-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px 12px;border-radius:12px;background:#fff;border:1px solid #eee2d0}.restaurant-hours-row strong{font-size:.74rem}.restaurant-hours-row span{font-size:.72rem;color:#6b7280;font-weight:800}.restaurant-detail-card{padding:14px;border-radius:14px;background:#fff;border:1px solid #eee2d0}.restaurant-detail-card p{margin:0;color:#667085;font-size:.76rem;line-height:1.55}.restaurant-detail-action{display:inline-flex;align-items:center;gap:7px;margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--rest-dark);color:#fff;text-decoration:none;font-size:.7rem;font-weight:900}.restaurant-social-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.restaurant-social-link{padding:11px;border-radius:11px;background:#fff;border:1px solid #eee2d0;color:#7c2d12;text-decoration:none;font-size:.7rem;font-weight:900;text-align:center}.restaurant-about-box{padding:15px;border:1px solid rgba(17,24,39,.08);border-radius:var(--rest-radius);background:#fff}.restaurant-about-box h3{margin:0 0 6px;font-size:.9rem}.restaurant-about-box p{margin:0;color:#667085;font-size:.75rem;line-height:1.55}.restaurant-footer{text-align:center;color:#7b818c;font-size:.64rem;padding:2px 0 8px}
      @media(max-width:620px){#restaurant-public-shell{border-radius:0;box-shadow:none}.restaurant-public-hero{min-height:265px}.restaurant-public-top{top:max(14px,env(safe-area-inset-top,0px));left:14px;right:14px}.restaurant-public-body{padding:15px}.restaurant-public-actions{grid-template-columns:repeat(2,1fr)}.restaurant-menu-grid{grid-template-columns:1fr}.restaurant-feature-photo{height:205px}.restaurant-info-drawer{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  const templateKey=cardData=>{const layout=String(cardData?.card_layout||'classic').toLowerCase();if(['swipe','split'].includes(layout))return'flow';if(['artist','bold','spotlight','playful'].includes(layout))return'showtime';if(['minimal','editorial','soft','beauty'].includes(layout))return'studio';return'classic';};
  const skin=cardData=>({dark:cardData.primary_color||'#7c2d12',accent:cardData.secondary_color||'#f59e0b',surface:cardData.background_color||'#fffaf4',ink:cardData.text_color||'#1f2937',font:cardData.font_family||'inherit',radius:Math.max(6,Math.min(28,Number(cardData.border_radius||16)||16)),style:templateKey(cardData)});

  async function fetchData(cardData){
    const client=dataClient();if(!client)throw new Error('Card data connection unavailable');
    const slug=String(cardData.slug||new URLSearchParams(location.search).get('slug')||'').trim();
    const [settingsResult,productsResult,socialResult,sectionResult]=await Promise.all([
      client.rpc('public_restaurant_settings_by_slug',{p_slug:slug}),
      client.from('card_products').select('id,name,description,price_cents,currency,image_urls,purchase_url,is_enabled,sort_order').eq('card_id',cardData.id).eq('is_enabled',true).order('sort_order'),
      client.from('social_links').select('platform,label,url,sort_order').eq('card_id',cardData.id).eq('is_enabled',true).order('sort_order'),
      client.from('card_sections').select('section_type,title,content,sort_order').eq('card_id',cardData.id).eq('is_visible',true).in('section_type',['hours','location']).order('sort_order')
    ]);
    if(settingsResult.error)console.warn('Restaurant settings unavailable',settingsResult.error);
    if(productsResult.error)console.warn('Restaurant menu unavailable',productsResult.error);
    settings=settingsResult.data&&typeof settingsResult.data==='object'?settingsResult.data:{};
    items=productsResult.data||[];
    utility={socials:socialResult.data||[],sections:sectionResult.data||[]};
  }

  function section(type){return utility.sections.find(x=>x.section_type===type)||null;}
  function infoDrawer(cardData){
    const hours=section('hours'),loc=section('location'),address=loc?.content?.address||cardData.business_address||'';
    const website=normalize(cardData.website||''),phone=String(cardData.phone||'').trim();
    const buttons=[];
    if(phone)buttons.push('<a class="restaurant-info-item" href="tel:'+esc(phone.replace(/[^+\d]/g,''))+'"><i data-lucide="phone" size="16"></i><span>Call</span></a>');
    if(String(cardData.biography||'').trim())buttons.push('<button class="restaurant-info-item" data-rest-info="about"><i data-lucide="book-open-text" size="16"></i><span>Our Story</span></button>');
    if(hours?.content)buttons.push('<button class="restaurant-info-item" data-rest-info="hours"><i data-lucide="clock-3" size="16"></i><span>Hours</span></button>');
    if(address)buttons.push('<button class="restaurant-info-item" data-rest-info="location"><i data-lucide="map-pin" size="16"></i><span>Find Us</span></button>');
    if(website)buttons.push('<a class="restaurant-info-item" href="'+esc(website)+'" target="_blank" rel="noopener"><i data-lucide="globe-2" size="16"></i><span>Website</span></a>');
    if(utility.socials.length)buttons.push('<button class="restaurant-info-item" data-rest-info="social"><i data-lucide="instagram" size="16"></i><span>Follow Us</span></button>');
    if(!buttons.length)return'';
    return '<div class="restaurant-info-control"><div class="restaurant-info-kicker">PLAN YOUR VISIT</div><p class="restaurant-info-copy">Everything guests need before they arrive.</p><button class="restaurant-info-toggle" type="button" data-rest-info-toggle><span><i data-lucide="utensils-crossed" size="15"></i> Dine With Us</span><i data-lucide="chevron-down" size="15"></i></button><div class="restaurant-info-drawer" data-rest-info-drawer hidden>'+buttons.join('')+'</div></div>';
  }

  function feature(cardData){
    const nameKey=String(settings.featured_item_name||'');
    const legacyId=String(settings.featured_item_id||'');
    const item=items.find(x=>nameKey&&String(x.name||'')===nameKey)||items.find(x=>legacyId&&String(x.id)===legacyId)||items[0];
    if(!item)return'<div class="restaurant-about-box"><h3>Menu coming soon</h3><p>This restaurant has not added menu items yet.</p></div>';
    const order=normalize(item.purchase_url||settings.order_url||cardData.website||'');
    return '<article class="restaurant-feature-card"><div class="restaurant-feature-photo" style="'+(item.image_urls?.[0]?"background-image:url('"+esc(item.image_urls[0])+"')":'')+'"><span class="restaurant-feature-badge">CHEF\'S SPECIAL</span></div><div class="restaurant-feature-copy"><h3>'+esc(item.name)+'</h3><p>'+esc(item.description||'Freshly prepared and ready to enjoy.')+'</p><div class="restaurant-feature-row"><strong>'+esc(money(item.price_cents)||settings.price_note||'')+'</strong>'+(order?'<a href="'+esc(order)+'" target="_blank" rel="noopener">Order now</a>':'')+'</div></div></article>';
  }

  function menuGrid(){
    if(!items.length)return'';
    return '<div class="restaurant-menu-grid">'+items.map(item=>{const order=normalize(item.purchase_url||settings.order_url||'');return '<article class="restaurant-menu-card"><div class="restaurant-menu-photo" style="'+(item.image_urls?.[0]?"background-image:url('"+esc(item.image_urls[0])+"')":'')+'"></div><div class="restaurant-menu-copy"><strong>'+esc(item.name||'Menu item')+'</strong><p>'+esc(item.description||'')+'</p><div class="restaurant-menu-meta"><span>'+esc(money(item.price_cents)||'')+'</span>'+(order?'<a href="'+esc(order)+'" target="_blank" rel="noopener">Order</a>':'')+'</div></div></article>';}).join('')+'</div>';
  }

  function shell(cardData){
    const p=skin(cardData),name=cardData.company_name||cardData.full_name||'Restaurant',cover=cardData.cover_image_url||'',hero=cover?"background-image:url('"+esc(cover)+"')":'',videoCover=String(settings.video_cover_url||'').trim(),videoHero=videoCover?'<video class="restaurant-public-hero-video" src="'+esc(videoCover)+'" '+(cover?'poster="'+esc(cover)+'" ':'')+'muted loop playsinline autoplay preload="metadata"></video>':'',order=normalize(settings.order_url||cardData.payment_url||cardData.website||''),reserve=normalize(settings.reservation_url||cardData.booking_url||'');
    const info=infoDrawer(cardData),about=String(cardData.biography||'').trim(),chef=settings.chef_name?'<section class="restaurant-chef-card"><small>MEET THE CHEF</small><h3>'+esc(settings.chef_name)+'</h3><strong>'+esc(settings.chef_title||'Chef')+'</strong>'+(settings.chef_note?'<p>'+esc(settings.chef_note)+'</p>':'')+'</section>':'';
    return '<div id="restaurant-public-shell" data-template-style="'+esc(p.style)+'" style="--rest-dark:'+esc(p.dark)+';--rest-accent:'+esc(p.accent)+';--rest-surface:'+esc(p.surface)+';--rest-ink:'+esc(p.ink)+';--rest-font:'+esc(p.font)+';--rest-radius:'+p.radius+'px"><section class="restaurant-public-hero" style="'+hero+'">'+videoHero+'<div class="restaurant-public-top"><div class="restaurant-public-brand">'+esc(name)+'</div><div class="restaurant-public-top-actions"><button class="restaurant-public-icon" type="button" data-rest-share aria-label="Share"><i data-lucide="share-2" size="17"></i></button><button class="restaurant-public-icon" type="button" data-rest-qr aria-label="QR code"><i data-lucide="qr-code" size="17"></i></button></div></div><div class="restaurant-public-identity"><span class="restaurant-public-kicker">FOOD & DINING</span><h1>'+esc(name)+'</h1><p>'+esc([settings.cuisine,settings.service_style,settings.price_note].filter(Boolean).join(' · ')||cardData.headline||'Restaurant')+'</p></div></section><div class="restaurant-public-body"><div class="restaurant-public-tagline">'+esc(settings.tagline||cardData.headline||'Fresh flavor, easy ordering, and everything you need in one card.')+'</div><div class="restaurant-public-actions"><button class="restaurant-public-action" type="button" data-rest-scroll="restaurant-menu"><i data-lucide="utensils" size="19"></i><span>Menu</span></button>'+(order?'<a class="restaurant-public-action" href="'+esc(order)+'" target="_blank" rel="noopener"><i data-lucide="shopping-bag" size="19"></i><span>Order</span></a>':'<button class="restaurant-public-action" type="button" disabled><i data-lucide="shopping-bag" size="19"></i><span>Order</span></button>')+(reserve?'<a class="restaurant-public-action" href="'+esc(reserve)+'" target="_blank" rel="noopener"><i data-lucide="calendar-check-2" size="19"></i><span>Reserve</span></a>':'<button class="restaurant-public-action" type="button" disabled><i data-lucide="calendar-check-2" size="19"></i><span>Reserve</span></button>')+'<button class="restaurant-public-action" type="button" data-rest-info-main><i data-lucide="store" size="19"></i><span>Info</span></button></div>'+info+'<div class="restaurant-section-head"><h2>Featured Dish</h2><span>'+esc(settings.delivery_note||'Chef selected')+'</span></div>'+feature(cardData)+chef+(items.length?'<section id="restaurant-menu"><div class="restaurant-section-head"><h2>Menu</h2><span>'+items.length+' item'+(items.length===1?'':'s')+'</span></div>'+menuGrid()+'</section>':'')+(about?'<div class="restaurant-about-box" id="restaurant-about"><h3>About '+esc(name)+'</h3><p>'+esc(about)+'</p></div>':'')+((order||reserve)?'<div class="restaurant-public-cta"><h2>Ready to eat?</h2><p>'+esc(settings.delivery_note||'Order ahead or reserve your table.')+'</p><div class="restaurant-public-cta-row">'+(order?'<a href="'+esc(order)+'" target="_blank" rel="noopener">Order Online</a>':'<span></span>')+(reserve?'<a href="'+esc(reserve)+'" target="_blank" rel="noopener">Reserve Table</a>':'')+'</div></div>':'')+'<div class="restaurant-footer">LIW Restaurant Experience</div></div><div class="restaurant-info-sheet" data-rest-sheet hidden><div class="restaurant-info-sheet-panel"><div class="restaurant-info-sheet-head"><div><small data-rest-sheet-kicker>DINING DETAILS</small><h3 data-rest-sheet-title>Restaurant Info</h3></div><button class="restaurant-info-sheet-close" type="button" data-rest-sheet-close aria-label="Close"><i data-lucide="x" size="18"></i></button></div><div data-rest-sheet-body></div></div></div></div>';
  }

  function sheetParts(){
    return {
      sheet:q('[data-rest-sheet]'),
      title:q('[data-rest-sheet-title]'),
      kicker:q('[data-rest-sheet-kicker]'),
      body:q('[data-rest-sheet-body]')
    };
  }

  function openInfoSheet(type,cardData){
    const {sheet,title,kicker,body}=sheetParts();
    if(!sheet||!body)return;
    let heading='Restaurant Info',eyebrow='DINING DETAILS',html='';
    if(type==='hours'){
      heading='Hours';
      eyebrow='WHEN TO DINE';
      const hours=section('hours');
      const days=Array.isArray(hours?.content?.days)?hours.content.days:[];
      html=days.length?'<div class="restaurant-hours-list">'+days.map(d=>'<div class="restaurant-hours-row"><strong>'+esc(d.day||d.label||'')+'</strong><span>'+esc((d.open||'')+(d.close?'–'+d.close:''))+'</span></div>').join('')+'</div>':'<div class="restaurant-detail-card"><p>Hours have not been added yet.</p></div>';
    }else if(type==='location'){
      heading='Find Us';
      eyebrow='COME DINE WITH US';
      const loc=section('location'),address=loc?.content?.address||cardData.business_address||'';
      html='<div class="restaurant-detail-card"><p>'+esc(address||'Location details have not been added yet.')+'</p>'+(address?'<a class="restaurant-detail-action" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address)+'" target="_blank" rel="noopener"><i data-lucide="navigation" size="15"></i> Get directions</a>':'')+'</div>';
    }else if(type==='about'){
      heading='Our Story';
      eyebrow='ABOUT THE RESTAURANT';
      html='<div class="restaurant-detail-card"><p>'+esc(cardData.biography||'Our story is coming soon.')+'</p></div>';
    }else if(type==='social'){
      heading='Follow Us';
      eyebrow='STAY CONNECTED';
      html=utility.socials.length?'<div class="restaurant-social-list">'+utility.socials.filter(x=>x.url).map(x=>'<a class="restaurant-social-link" href="'+esc(normalize(x.url))+'" target="_blank" rel="noopener">'+esc(x.label||x.platform||'Social')+'</a>').join('')+'</div>':'<div class="restaurant-detail-card"><p>Social links have not been added yet.</p></div>';
    }
    if(title)title.textContent=heading;
    if(kicker)kicker.textContent=eyebrow;
    body.innerHTML=html;
    sheet.hidden=false;
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function closeInfoSheet(){
    const {sheet}=sheetParts();
    if(sheet)sheet.hidden=true;
  }

  function bind(cardData){
    const shellEl=q('#restaurant-public-shell');if(!shellEl)return;
    q('[data-rest-share]',shellEl)?.addEventListener('click',()=>{try{if(typeof window.LIWCardShare?.open==='function')window.LIWCardShare.open();else if(typeof shareCard==='function')shareCard();else navigator.share?.({title:cardData.company_name||cardData.full_name||'Restaurant',url:location.href});}catch(_){}});
    q('[data-rest-qr]',shellEl)?.addEventListener('click',()=>q('#qr-top')?.click()||q('#qr-dialog')?.showModal?.());
    q('[data-rest-scroll]',shellEl)?.addEventListener('click',event=>q('#'+event.currentTarget.dataset.restScroll)?.scrollIntoView({behavior:'smooth',block:'start'}));
    const toggle=q('[data-rest-info-toggle]',shellEl),drawer=q('[data-rest-info-drawer]',shellEl);
    const toggleDrawer=()=>{if(!drawer)return;const next=drawer.hidden;drawer.hidden=!next;toggle?.setAttribute('aria-expanded',String(next));};
    toggle?.addEventListener('click',toggleDrawer);
    q('[data-rest-info-main]',shellEl)?.addEventListener('click',()=>{if(drawer&&drawer.hidden)toggleDrawer();toggle?.scrollIntoView({behavior:'smooth',block:'center'});});
    qa('[data-rest-info]',shellEl).forEach(btn=>btn.addEventListener('click',()=>openInfoSheet(btn.dataset.restInfo,cardData)));
    q('[data-rest-sheet-close]',shellEl)?.addEventListener('click',closeInfoSheet);
    q('[data-rest-sheet]',shellEl)?.addEventListener('click',event=>{if(event.target===event.currentTarget)closeInfoSheet();});
  }

  async function mount(){
    const cardData=card(),article=q('#card');
    if(!cardData||String(cardData.card_experience||'').toLowerCase()!=='restaurant'||mounted||mounting)return Boolean(cardData);
    if(!article||article.hidden)return false;
    mounting=true;injectStyles();
    try{await fetchData(cardData);}catch(error){console.warn('LIW Restaurant data unavailable; retrying:',error);mounting=false;return false;}
    article.classList.add('restaurant-public-active');
    q('#restaurant-public-shell')?.remove();
    article.insertAdjacentHTML('beforeend',shell(cardData));
    bind(cardData);
    if(window.lucide)try{lucide.createIcons();}catch(_){}
    mounted=true;mounting=false;
    return true;
  }

  document.addEventListener('liw:public-card-rendered',()=>{if(!mounted)mount();});
  document.addEventListener('liw:public-card-ready',()=>{if(!mounted)mount();});
  window.LIWRestaurantPublicV1={mount};
  [0,120,280,550,900,1500,2400,3600,5200,7600,12000].forEach(delay=>setTimeout(()=>{if(!mounted)mount();},delay));
})();