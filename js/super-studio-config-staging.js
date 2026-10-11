(function(){
  'use strict';
  if(window.LIWSuperStudio)return;

  const PROFESSIONS = {
    barber:{label:'Barber',title:'Barber',accent:'#C89245',tone:'bold',categories:['Haircuts','Beard','Combos','Premium Services'],services:['Haircut','Shape Up','Beard Service','Hot Towel','Hair Design'],work:['Fades','Beards','Designs','Kids']},
    'hair-stylist':{label:'Hair Stylist',title:'Hair Stylist',accent:'#B884A7',tone:'luxury',categories:['Cut & Style','Color','Extensions','Treatments'],services:['Silk Press','Wash & Style','Coloring','Extensions','Treatment'],work:['Natural Hair','Color','Extensions','Styles']},
    braider:{label:'Braider',title:'Braider',accent:'#B4775D',tone:'luxury',categories:['Braids','Protective Styles','Kids','Add-ons'],services:['Knotless Braids','Box Braids','Cornrows','Kids Braids','Feed-In Braids'],work:['Knotless','Box Braids','Cornrows','Kids']},
    loctician:{label:'Loctician',title:'Loctician',accent:'#7C6A4E',tone:'earth',categories:['Loc Care','Retwist','Styles','Treatments'],services:['Starter Locs','Retwist','Loc Style','Interlocking','Loc Treatment'],work:['Starter Locs','Retwists','Styles','Color']},
    'nail-tech':{label:'Nail Technician',title:'Nail Technician',accent:'#D05A98',tone:'editorial',categories:['Full Sets','Manicures','Nail Art','Add-ons'],services:['Full Set','Acrylic','Gel Manicure','Nail Art','Soak Off'],work:['Acrylic','Gel','French','Nail Art']},
    'makeup-artist':{label:'Makeup Artist',title:'Makeup Artist',accent:'#BB6B74',tone:'editorial',categories:['Makeup','Bridal','Events','Add-ons'],services:['Natural Glam','Full Glam','Bridal Makeup','Event Makeup','Lashes'],work:['Natural Glam','Full Glam','Bridal','Editorial']},
    'lash-tech':{label:'Lash Technician',title:'Lash Technician',accent:'#8F5C82',tone:'editorial',categories:['Full Sets','Fills','Removal','Add-ons'],services:['Classic Set','Hybrid Set','Volume Set','Fill-In','Lash Removal'],work:['Classic','Hybrid','Volume','Wispy']},
    'brow-artist':{label:'Brow Artist',title:'Brow Artist',accent:'#805E4D',tone:'editorial',categories:['Shaping','Tinting','Lamination','Add-ons'],services:['Brow Shaping','Brow Tint','Brow Lamination','Wax & Tint','Consultation'],work:['Shaping','Tint','Lamination','Transformations']},
    esthetician:{label:'Esthetician',title:'Esthetician',accent:'#72998C',tone:'wellness',categories:['Facials','Skin Treatments','Waxing','Add-ons'],services:['Signature Facial','Deep Cleanse Facial','Chemical Peel','Waxing','Skin Consultation'],work:['Facials','Skin Results','Treatments','Glow']},
    'tattoo-artist':{label:'Tattoo Artist',title:'Tattoo Artist',accent:'#8056A8',tone:'dark',categories:['Consultations','Custom Work','Flash','Touch-Ups'],services:['Consultation','Small Tattoo','Custom Tattoo','Touch-Up','Flash Design'],work:['Black & Grey','Color','Lettering','Portraits']},
    piercer:{label:'Piercer',title:'Professional Piercer',accent:'#52718E',tone:'dark',categories:['Ear','Face','Body','Aftercare'],services:['Ear Piercing','Nose Piercing','Body Piercing','Jewelry Change','Aftercare Check'],work:['Ear Styling','Nose','Body','Jewelry']},
    'massage-therapist':{label:'Massage Therapist',title:'Massage Therapist',accent:'#5D8D83',tone:'wellness',categories:['Massage','Recovery','Wellness','Add-ons'],services:['Swedish Massage','Deep Tissue','Sports Massage','Hot Stone','Stretch Session'],work:['Studio','Wellness','Recovery','Client Care']},
    salon:{label:'Salon',title:'Salon',accent:'#B18452',tone:'luxury',categories:['Hair','Color','Treatments','Specialty'],services:['Cut & Style','Color Service','Silk Press','Extensions','Treatment'],work:['Styles','Color','Extensions','Transformations']},
    spa:{label:'Spa',title:'Spa',accent:'#6B9489',tone:'wellness',categories:['Facials','Massage','Body','Packages'],services:['Signature Facial','Massage','Body Treatment','Wellness Package','Consultation'],work:['Spa','Facials','Wellness','Results']},
    other:{label:'Other',title:'Personal Service Professional',accent:'#745BD6',tone:'modern',categories:['Signature Services','Popular','Premium','Add-ons'],services:['Signature Service','Consultation','Premium Service'],work:['Featured','Recent','Favorites']}
  };

  const BASE = {
    version:1,
    studioProfession:'other',
    availabilityStatus:'accepting',
    availabilityLabel:'Accepting Appointments',
    videoCoverUrl:'',
    videoPosterUrl:'',
    serviceCategories:[],
    serviceMeta:[],
    portfolio:[],
    beforeAfter:[],
    about:{yearsExperience:'',certifications:'',specialties:'',languages:''},
    reviews:{items:[],seeUrl:'',leaveUrl:''},
    studioInfo:{
      locationType:'Shop/Salon',suite:'',cityState:'',parking:'',accessibility:'',
      hideExactAddress:false,locationNote:''
    },
    serviceArea:{areas:'',travelFee:''},
    policies:{cancellation:'',late:'',deposit:'',noShow:'',guest:'',children:'',preparation:''},
    clientPrep:'',
    teamMode:false,
    team:[],
    specials:[],
    booking:{nativePreferred:true,inspirationEnabled:false},
    style:{professionAccent:true},
    sectionVisibility:{
      featured:true,services:true,portfolio:true,beforeAfter:true,about:true,reviews:true,
      specials:true,studioInfo:true,social:true
    }
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const asArray = value => Array.isArray(value) ? value : [];
  function profession(key){ return PROFESSIONS[key] || PROFESSIONS.other; }
  function uid(prefix='ss'){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function normalize(raw={}){
    const out = clone(BASE);
    const input = raw && typeof raw === 'object' ? raw : {};
    Object.assign(out,input);
    out.about={...BASE.about,...(input.about||{})};
    out.reviews={...BASE.reviews,...(input.reviews||{}),items:asArray(input.reviews?.items)};
    out.studioInfo={...BASE.studioInfo,...(input.studioInfo||{})};
    out.serviceArea={...BASE.serviceArea,...(input.serviceArea||{})};
    out.policies={...BASE.policies,...(input.policies||{})};
    out.booking={...BASE.booking,...(input.booking||{})};
    out.style={...BASE.style,...(input.style||{})};
    out.sectionVisibility={...BASE.sectionVisibility,...(input.sectionVisibility||{})};
    out.serviceCategories=asArray(input.serviceCategories);
    out.serviceMeta=asArray(input.serviceMeta);
    out.portfolio=asArray(input.portfolio);
    out.beforeAfter=asArray(input.beforeAfter);
    out.team=asArray(input.team);
    out.specials=asArray(input.specials);
    if(!PROFESSIONS[out.studioProfession])out.studioProfession='other';
    return out;
  }
  function starterCategories(key){ return clone(profession(key).categories); }
  function starterServices(key){ return clone(profession(key).services); }
  function workCategories(key){ return clone(profession(key).work); }
  function styleFor(key){
    const p=profession(key);
    return {accent:p.accent,tone:p.tone,label:p.label,title:p.title};
  }

  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = cents => cents==null||cents===''?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(cents)/100);
  function servicePrice(service,meta={}){
    const type=meta.priceType||'fixed';
    if(type==='consultation')return 'Consultation required';
    if(type==='contact')return 'Contact for pricing';
    const base=money(service?.price_cents);
    if(!base)return '';
    return type==='starting' ? `Starting at ${base}` : base;
  }
  function socialMarkup(link){
    const key=String(link?.platform||'').toLowerCase();
    const label=link?.label||key;
    let icon='';
    try{ if(typeof window.socialIconHtml==='function')icon=window.socialIconHtml(key,{size:18}); }catch(_){}
    if(!icon)icon=`<span aria-hidden="true">${esc(label.slice(0,2).toUpperCase())}</span>`;
    return `<a class="ss-social" href="${esc(link.url||'#')}" target="_blank" rel="noopener" aria-label="${esc(label)}">${icon}</a>`;
  }
  function renderExperience({card={},state:rawState={},services=[],socials=[],products=[],preview=false}={}){
    const state=normalize(rawState);
    const pro=profession(state.studioProfession);
    const accent=state.style?.professionAccent===false?(card.secondary_color||pro.accent):pro.accent;
    const primary=card.primary_color||'#111827';
    const bg=card.background_color||'#fff';
    const ink=card.text_color||'#171821';
    const profile=card.profile_image_url||'';
    const cover=card.cover_image_url||'';
    const video=state.videoCoverUrl||'';
    const fullName=card.full_name&&String(card.full_name).toLowerCase()!=='untitled card'?card.full_name:'Your Name';
    const business=card.company_name||'Your Studio';
    const title=card.job_title||pro.title||'Beauty Professional';
    const city=state.studioInfo?.cityState||'';
    const location=city||(!state.studioInfo?.hideExactAddress?card.business_address:'')||'';
    const accepting=state.availabilityStatus!=='unavailable';
    const initials=fullName.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'SS';
    const metaFor=(service,index)=>state.serviceMeta.find(item=>item.serviceName===service.name)||state.serviceMeta[index]||{};
    const activeServices=services.map((service,index)=>({service,meta:metaFor(service,index)})).filter(x=>x.service?.name&&x.meta.active!==false);
    const featured=state.portfolio.filter(item=>item?.url&&item.featured).slice(0,4);
    const portfolio=state.portfolio.filter(item=>item?.url);
    const beforeAfter=state.beforeAfter.filter(item=>item?.beforeUrl&&item?.afterUrl);
    const reviews=state.reviews.items.filter(item=>item?.quote||item?.name);
    const specials=state.specials.filter(item=>{
      if(!item?.title)return false;
      if(!item.expiresAt)return true;
      const end=new Date(item.expiresAt+'T23:59:59');
      return !Number.isNaN(end.getTime())&&end.getTime()>=Date.now();
    });
    const team=state.teamMode?state.team.filter(item=>item?.name):[];
    const categories=[...new Set(activeServices.map(x=>x.meta.category).filter(Boolean))];
    const heroMedia=video
      ? `<video class="ss-hero-video" src="${esc(video)}" ${cover?`poster="${esc(cover)}"`:''} muted loop playsinline autoplay preload="metadata"></video>`
      : cover ? `<img class="ss-hero-image" src="${esc(cover)}" alt="">` : `<div class="ss-hero-gradient"></div>`;
    const actions=[
      `<button class="ss-quick ss-book" type="button" data-ss-action="book"><i data-lucide="calendar-check-2"></i><span>Book</span></button>`,
      card.phone?`<a class="ss-quick" href="tel:${esc(card.phone)}"><i data-lucide="phone"></i><span>Call</span></a>`:'',
      (card.sms_phone||card.phone)?`<a class="ss-quick" href="sms:${esc(card.sms_phone||card.phone)}"><i data-lucide="message-square-text"></i><span>Text</span></a>`:'',
      card.business_address?`<a class="ss-quick" href="https://maps.google.com/?q=${encodeURIComponent(card.business_address)}" target="_blank" rel="noopener"><i data-lucide="map-pin"></i><span>Directions</span></a>`:''
    ].filter(Boolean).join('');
    const serviceCards=activeServices.map(({service,meta},index)=>`<article class="ss-service-card" data-ss-service="${index}">
      ${service.image_url?`<img src="${esc(service.image_url)}" alt="${esc(service.name)}">`:''}
      <div class="ss-service-copy"><div class="ss-service-top"><span>${esc(meta.category||'Service')}</span>${meta.duration?`<small>${esc(meta.duration)} min</small>`:''}</div>
      <h3>${esc(service.name)}</h3>${service.description?`<p>${esc(service.description)}</p>`:''}
      <div class="ss-service-bottom"><strong>${esc(servicePrice(service,meta)||'Pricing on request')}</strong>${meta.bookingAvailable===false?'':`<button type="button" data-ss-action="book" data-service-name="${esc(service.name)}">Book</button>`}</div></div>
    </article>`).join('');
    const gallery=portfolio.map((item,index)=>`<button class="ss-work-item" type="button" data-ss-gallery-index="${index}"><img src="${esc(item.url)}" alt="${esc(item.caption||`${pro.label} work`)}">${item.category?`<span>${esc(item.category)}</span>`:''}</button>`).join('');
    const featuredMarkup=featured.map((item,index)=>`<button class="ss-featured-item" type="button" data-ss-featured-index="${index}"><img src="${esc(item.url)}" alt="${esc(item.caption||'Featured work')}"></button>`).join('');
    const baMarkup=beforeAfter.map((item,index)=>`<article class="ss-ba" data-ss-ba="${index}"><div class="ss-ba-stage"><img src="${esc(item.beforeUrl)}" alt="Before"><div class="ss-ba-after"><img src="${esc(item.afterUrl)}" alt="After"></div><span class="ss-ba-label before">Before</span><span class="ss-ba-label after">After</span></div><input type="range" min="0" max="100" value="50" aria-label="Compare before and after"></article>`).join('');
    const aboutBits=[
      state.about.yearsExperience?`${esc(state.about.yearsExperience)} years experience`:'',
      state.about.specialties?esc(state.about.specialties):'',
      state.about.languages?`Languages: ${esc(state.about.languages)}`:''
    ].filter(Boolean).join(' · ');
    const reviewMarkup=reviews.slice(0,4).map(r=>`<blockquote class="ss-review"><div aria-label="5 stars">★★★★★</div><p>${esc(r.quote||'')}</p><footer>${esc(r.name||'Client')}</footer></blockquote>`).join('');
    const specialMarkup=specials.map(s=>`<article class="ss-special">${s.imageUrl?`<img src="${esc(s.imageUrl)}" alt="">`:''}<div><span>Special Offer</span><h3>${esc(s.title)}</h3>${s.description?`<p>${esc(s.description)}</p>`:''}${s.promoCode?`<strong>Code: ${esc(s.promoCode)}</strong>`:''}</div></article>`).join('');
    const teamMarkup=team.map((m,index)=>`<article class="ss-team-card">${m.photoUrl?`<img src="${esc(m.photoUrl)}" alt="${esc(m.name)}">`:`<div class="ss-team-avatar">${esc(m.name.slice(0,1))}</div>`}<div><h3>${esc(m.name)}</h3><p>${esc(m.title||'')}</p>${m.specialties?`<small>${esc(m.specialties)}</small>`:''}<button type="button" data-ss-action="book" data-staff-name="${esc(m.name)}">Book with ${esc(m.name.split(/\s+/)[0])}</button></div></article>`).join('');
    const studioInfoBits=[
      state.studioInfo.locationType,
      state.studioInfo.suite?`Suite ${state.studioInfo.suite}`:'',
      state.studioInfo.parking?`Parking: ${state.studioInfo.parking}`:'',
      state.studioInfo.accessibility?`Accessibility: ${state.studioInfo.accessibility}`:'',
      state.studioInfo.locationNote
    ].filter(Boolean);
    const serviceArea=String(state.serviceArea.areas||'').split(/[\n,]+/).map(x=>x.trim()).filter(Boolean);
    return `<section class="super-studio-experience tone-${esc(pro.tone)}" style="--ss-accent:${esc(accent)};--ss-primary:${esc(primary)};--ss-bg:${esc(bg)};--ss-ink:${esc(ink)}">
      <header class="ss-hero" data-ss-section="home">${heroMedia}<div class="ss-hero-shade"></div>
        <div class="ss-topbar super-studio-top-actions"><span class="ss-brand-chip">${esc(pro.label)}</span><button type="button" class="ss-round" data-ss-action="share" aria-label="Share card"><i data-lucide="share-2"></i></button></div>
        <div class="ss-hero-content"><div class="ss-avatar">${profile?`<img src="${esc(profile)}" alt="${esc(fullName)}">`:`<span>${esc(initials)}</span>`}</div>
          <div class="ss-identity"><p>${esc(business)}</p><h1>${esc(fullName)}</h1><h2>${esc(title)}</h2>${location?`<span><i data-lucide="map-pin"></i>${esc(location)}</span>`:''}
          <em class="${accepting?'is-open':'is-closed'}"><b></b>${esc(state.availabilityLabel||(accepting?'Accepting Appointments':'Currently Unavailable'))}</em></div>
        </div>
      </header>
      <div class="ss-body">
        <button class="ss-primary-book" type="button" data-ss-action="book"><span>Book Now</span><i data-lucide="arrow-right"></i></button>
        <div class="ss-quick-grid">${actions}</div>
        ${featured.length&&state.sectionVisibility.featured!==false?`<section class="ss-section ss-featured" data-ss-section="featured"><div class="ss-section-head"><div><span>Signature</span><h2>Featured Work</h2></div></div><div class="ss-featured-grid">${featuredMarkup}</div></section>`:''}
        ${activeServices.length&&state.sectionVisibility.services!==false?`<section class="ss-section" data-ss-section="services"><div class="ss-section-head"><div><span>Choose your service</span><h2>Services</h2></div><small>${categories.length?esc(categories.join(' · ')):''}</small></div><div class="ss-services">${serviceCards}</div></section>`:''}
        ${portfolio.length&&state.sectionVisibility.portfolio!==false?`<section class="ss-section" data-ss-section="work"><div class="ss-section-head"><div><span>Portfolio</span><h2>My Work</h2></div><small>${portfolio.length} look${portfolio.length===1?'':'s'}</small></div><div class="ss-work-grid">${gallery}</div></section>`:''}
        ${beforeAfter.length&&state.sectionVisibility.beforeAfter!==false?`<section class="ss-section"><div class="ss-section-head"><div><span>Transformations</span><h2>Before & After</h2></div></div><div class="ss-ba-list">${baMarkup}</div></section>`:''}
        ${(card.biography||aboutBits)&&state.sectionVisibility.about!==false?`<section class="ss-section ss-about"><div class="ss-section-head"><div><span>Meet your professional</span><h2>About</h2></div></div>${card.biography?`<p>${esc(card.biography)}</p>`:''}${aboutBits?`<small>${aboutBits}</small>`:''}${state.about.certifications?`<div class="ss-cert"><i data-lucide="badge-check"></i>${esc(state.about.certifications)}</div>`:''}</section>`:''}
        ${team.length?`<section class="ss-section"><div class="ss-section-head"><div><span>Your team</span><h2>Choose a Professional</h2></div></div><div class="ss-team-grid">${teamMarkup}</div></section>`:''}
        ${reviews.length&&state.sectionVisibility.reviews!==false?`<section class="ss-section"><div class="ss-section-head"><div><span>Client love</span><h2>Reviews</h2></div></div><div class="ss-reviews">${reviewMarkup}</div><div class="ss-link-row">${state.reviews.seeUrl?`<a href="${esc(state.reviews.seeUrl)}" target="_blank" rel="noopener">See More Reviews</a>`:''}${state.reviews.leaveUrl?`<a href="${esc(state.reviews.leaveUrl)}" target="_blank" rel="noopener">Leave a Google Review</a>`:''}</div></section>`:''}
        ${specials.length&&state.sectionVisibility.specials!==false?`<section class="ss-section"><div class="ss-section-head"><div><span>Limited time</span><h2>Special Offers</h2></div></div><div class="ss-specials">${specialMarkup}</div></section>`:''}
        ${card.products_enabled&&products.filter(p=>p?.name).length?`<section class="ss-section"><div class="ss-section-head"><div><span>Take it home</span><h2>Shop / Products</h2></div></div><div class="ss-products">${products.filter(p=>p?.name).slice(0,6).map(p=>`<a class="ss-product" href="${esc(p.purchase_url||'#')}" ${p.purchase_url?'target="_blank" rel="noopener"':''}>${Array.isArray(p.image_urls)&&p.image_urls[0]?`<img src="${esc(p.image_urls[0])}" alt="${esc(p.name)}">`:'<span class="ss-product-placeholder">LIW</span>'}<div><strong>${esc(p.name)}</strong>${p.price_cents!=null?`<small>${esc(money(p.price_cents))}</small>`:''}</div></a>`).join('')}</div></section>`:''}
        ${(card.business_address||studioInfoBits.length||serviceArea.length)&&state.sectionVisibility.studioInfo!==false?`<section class="ss-section"><details class="ss-info"><summary><span><i data-lucide="map-pinned"></i><b>Studio Info</b></span><i data-lucide="chevron-down"></i></summary><div>${!state.studioInfo.hideExactAddress&&card.business_address?`<p>${esc(card.business_address)}</p>`:location?`<p>${esc(location)} — Exact address provided after booking.</p>`:''}${studioInfoBits.map(x=>`<p>${esc(x)}</p>`).join('')}${serviceArea.length?`<div class="ss-service-area"><strong>Service Area</strong>${serviceArea.map(x=>`<span>${esc(x)}</span>`).join('')}${state.serviceArea.travelFee?`<small>Travel fee starting at ${esc(state.serviceArea.travelFee)}</small>`:''}</div>`:''}</div></details></section>`:''}
        ${(Object.values(state.policies).some(Boolean)||state.clientPrep)?`<section class="ss-section ss-policy-actions">${state.clientPrep?`<button type="button" data-ss-action="prep"><i data-lucide="sparkles"></i>Before Your Appointment</button>`:''}${Object.values(state.policies).some(Boolean)?`<button type="button" data-ss-action="policies"><i data-lucide="scroll-text"></i>Booking Policies</button>`:''}</section>`:''}
        ${socials.length&&state.sectionVisibility.social!==false?`<section class="ss-section ss-social-section"><div class="ss-section-head"><div><span>Stay connected</span><h2>Follow</h2></div></div><div class="ss-socials">${socials.map(socialMarkup).join('')}</div></section>`:''}
      </div>
      <nav class="ss-bottom-nav" aria-label="Super Studio"><button type="button" data-ss-nav="home"><i data-lucide="home"></i><span>Home</span></button><button type="button" data-ss-nav="services"><i data-lucide="sparkles"></i><span>Services</span></button><button class="ss-nav-book" type="button" data-ss-action="book"><i data-lucide="calendar-check-2"></i><span>Book</span></button><button type="button" data-ss-nav="work"><i data-lucide="images"></i><span>Work</span></button><button type="button" data-ss-action="more"><i data-lucide="menu"></i><span>More</span></button></nav>
    </section>`;
  }

  window.LIWSuperStudio={
    id:'super-studio',
    PROFESSIONS,
    BASE,
    clone,
    normalize,
    profession,
    starterCategories,
    starterServices,
    workCategories,
    styleFor,
    uid,
    esc,
    money,
    servicePrice,
    renderExperience
  };
})();
