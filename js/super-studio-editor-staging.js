/* LIW Cards staging — Super Studio editor experience.
   Independent state, shared LIW card/services/booking infrastructure. */
(function(){
  'use strict';
  if(window.__LIW_SUPER_STUDIO_EDITOR__)return;
  window.__LIW_SUPER_STUDIO_EDITOR__=true;
  if(!(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/')&&location.pathname.toLowerCase().endsWith('/editor.html')))return;

  const SS=window.LIWSuperStudio;
  if(!SS){console.warn('Super Studio config missing');return;}

  let state=SS.normalize();
  let loadedCardId=null;
  let saveTimer=null;
  let lastSavedState='';
  let activeTab='start';

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const field=name=>q(`[name="${name}"]`);
  const val=(name,fallback='')=>field(name)?String(field(name).value??''):fallback;
  const isActive=()=>val('card_experience').trim().toLowerCase()==='super-studio';
  const cardId=()=>{try{return typeof currentId!=='undefined'?currentId:null;}catch(_){return null;}};
  const ownerId=()=>{try{return (typeof currentCardOwnerId!=='undefined'&&currentCardOwnerId)||(typeof user!=='undefined'&&user?.id)||null;}catch(_){return null;}};
  const coreServices=()=>{try{return Array.isArray(services)?services:[];}catch(_){return [];}};
  const coreSocials=()=>{try{return Array.isArray(socialLinks)?socialLinks:[];}catch(_){return [];}};
  const coreProducts=()=>{try{return Array.isArray(products)?products:[];}catch(_){return [];}};
  const emit=(el,type)=>{try{el?.dispatchEvent(new Event(type,{bubbles:true}));}catch(_){}};
  const toastSafe=message=>{try{if(typeof toast==='function')toast(message);}catch(_){}};
  const setCoreDirty=()=>{try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){}};

  function ensureStyle(){
    if(q('link[data-liw-super-studio]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='css/super-studio-staging.css?v=20261011-1';
    link.dataset.liwSuperStudio='true';
    document.head.appendChild(link);
  }

  function ensureSelector(){
    const grid=q('#card-experience-section .card-experience-grid');
    if(!grid)return false;
    let button=q('[data-card-experience="super-studio"]',grid);
    if(!button){
      button=document.createElement('button');
      button.className='card-experience-option super-studio-option';
      button.type='button';
      button.dataset.cardExperience='super-studio';
      button.innerHTML='<span class="card-experience-number">SS</span><strong><i data-lucide="sparkles" size="17"></i> Super Studio</strong><span>Premium portfolio + services + native booking for beauty, grooming and personal-service professionals.</span><span class="super-studio-new">NEW</span>';
      grid.appendChild(button);
      button.addEventListener('click',activate);
    }
    button.classList.toggle('active',isActive());
    button.setAttribute('aria-pressed',isActive()?'true':'false');
    if(isActive()){
      qa('#card-experience-section [data-card-experience]').forEach(item=>{if(item!==button)item.classList.remove('active');});
    }
    return true;
  }

  function activate(){
    const input=field('card_experience');
    if(!input)return;
    input.value='super-studio';
    emit(input,'input');emit(input,'change');
    syncUi();
    setCoreDirty();
    queueStateSave();
    try{if(typeof render==='function')render();}catch(_){}
    requestAnimationFrame(()=>q('#super-studio-control-center')?.scrollIntoView({behavior:'smooth',block:'start'}));
    toastSafe('Super Studio selected — setup opened');
  }

  function professionOptions(){
    return Object.entries(SS.PROFESSIONS).map(([key,item])=>`<option value="${SS.esc(key)}">${SS.esc(item.label)}</option>`).join('');
  }
  function tabButton(key,label,icon){return `<button type="button" class="${activeTab===key?'active':''}" data-ss-tab="${key}"><i data-lucide="${icon}" size="15"></i>${label}</button>`;}

  function buildControlCenter(){
    if(q('#super-studio-control-center'))return true;
    const selector=q('#card-experience-section');
    if(!selector)return false;
    const root=document.createElement('section');
    root.id='super-studio-control-center';
    root.className='super-studio-control-center';
    root.innerHTML=`<div class="ss-editor-hero"><div class="ss-editor-hero-icon"><i data-lucide="sparkles"></i></div><div><span>LIW EXPERIENCE</span><h3>Super Studio</h3><p>Portfolio + services + booking + mini website.</p></div><em id="ss-editor-save-state">Ready</em></div>
      <nav class="ss-editor-tabs" aria-label="Super Studio editor">${tabButton('start','Start','badge-check')}${tabButton('look','Look','palette')}${tabButton('services','Services','scissors')}${tabButton('booking','Booking','calendar-check-2')}${tabButton('portfolio','Portfolio','images')}${tabButton('business','Business','store')}${tabButton('grow','Grow','trending-up')}</nav>
      <div class="ss-editor-panels"><section data-ss-panel="start"></section><section data-ss-panel="look" hidden></section><section data-ss-panel="services" hidden></section><section data-ss-panel="booking" hidden></section><section data-ss-panel="portfolio" hidden></section><section data-ss-panel="business" hidden></section><section data-ss-panel="grow" hidden></section></div>`;
    selector.insertAdjacentElement('afterend',root);
    root.addEventListener('click',handleClick);
    root.addEventListener('input',handleInput);
    root.addEventListener('change',handleChange);
    renderEditor();
    return true;
  }

  function startPanel(){
    const pro=SS.profession(state.studioProfession),suggestions=SS.starterServices(state.studioProfession);
    return `<div class="ss-editor-section"><div class="ss-editor-section-head"><div><span>START</span><h4>What type of professional are you?</h4><p>This changes suggestions and styling, not your saved business information.</p></div></div><label class="ss-field"><span>Profession</span><select class="input" data-ss-path="studioProfession">${professionOptions()}</select></label><div class="ss-profession-summary"><strong>${SS.esc(pro.label)}</strong><span>Suggested services: ${SS.esc(suggestions.join(' · '))}</span></div><div class="ss-inline-note"><i data-lucide="shield-check"></i><span>Changing profession never erases your name, contact info, services, portfolio, reviews, or booking setup.</span></div><div class="ss-shortcuts"><button class="btn btn-light btn-sm" type="button" data-ss-core-tab="content">Edit name & bio</button><button class="btn btn-light btn-sm" type="button" data-ss-core-tab="links">Edit contact & social</button></div></div>`;
  }

  function lookPanel(){
    return `<div class="ss-editor-section"><div class="ss-editor-section-head"><div><span>LOOK</span><h4>Premium cover</h4><p>Use your LIW cover image plus an optional short video cover.</p></div></div><div class="ss-video-editor"><div class="ss-video-preview">${state.videoCoverUrl?`<video src="${SS.esc(state.videoCoverUrl)}" muted loop playsinline autoplay></video>`:'<div><i data-lucide="video"></i><span>No video cover yet</span></div>'}</div><div class="ss-video-actions"><label class="btn btn-light btn-sm">Upload video<input hidden type="file" accept="video/*" data-ss-video-file></label>${state.videoCoverUrl?'<button type="button" class="btn btn-ghost btn-sm" data-ss-remove-video>Remove video</button>':''}</div><small>Short vertical or landscape clips work. LIW uses the cover image as a fallback/poster.</small></div><label class="ss-check"><input type="checkbox" data-ss-path="style.professionAccent" ${state.style.professionAccent!==false?'checked':''}><span>Use profession-based accent styling</span></label><div class="ss-shortcuts"><button class="btn btn-light btn-sm" type="button" data-ss-core-tab="design">Colors, fonts & template</button></div></div>`;
  }

  function serviceMeta(service,index){
    let meta=state.serviceMeta.find(item=>item&&item.serviceName===service.name)||state.serviceMeta[index];
    if(!meta){meta={serviceName:service.name||'',category:'',priceType:'fixed',duration:'60',bookingAvailable:true,active:true,depositType:'none',depositValue:''};state.serviceMeta[index]=meta;}
    meta.serviceName=service.name||meta.serviceName||'';return meta;
  }
  function serviceRow(service,index){
    const meta=serviceMeta(service,index);
    return `<article class="ss-service-editor" data-ss-service-index="${index}"><div class="ss-editor-row-head"><strong>${SS.esc(service.name||`Service ${index+1}`)}</strong><button type="button" class="icon-btn" data-ss-delete-service="${index}" aria-label="Delete service"><i data-lucide="trash-2"></i></button></div><div class="ss-grid-2"><label class="ss-field"><span>Service name</span><input class="input" data-ss-service-field="name" value="${SS.esc(service.name||'')}"></label><label class="ss-field"><span>Category</span><input class="input" data-ss-service-meta="category" value="${SS.esc(meta.category||'')}" placeholder="Haircuts, Full Sets, Treatments..."></label></div><label class="ss-field"><span>Description</span><textarea class="input" data-ss-service-field="description" placeholder="Short service description">${SS.esc(service.description||'')}</textarea></label><div class="ss-grid-3"><label class="ss-field"><span>Price</span><input class="input" inputmode="decimal" data-ss-service-field="price" value="${service.price_cents==null?'':(Number(service.price_cents)/100).toFixed(2)}" placeholder="180"></label><label class="ss-field"><span>Price type</span><select class="input" data-ss-service-meta="priceType"><option value="fixed">Fixed price</option><option value="starting">Starting at</option><option value="consultation">Consultation required</option><option value="contact">Contact for pricing</option></select></label><label class="ss-field"><span>Duration</span><input class="input" inputmode="numeric" data-ss-service-meta="duration" value="${SS.esc(meta.duration||'60')}" placeholder="60"></label></div><div class="ss-grid-3"><label class="ss-field"><span>Deposit</span><select class="input" data-ss-service-meta="depositType"><option value="none">No deposit</option><option value="flat">Flat deposit</option><option value="percent">Percentage</option></select></label><label class="ss-field"><span>Deposit amount</span><input class="input" data-ss-service-meta="depositValue" value="${SS.esc(meta.depositValue||'')}" placeholder="$50 or 25%"></label><label class="ss-field"><span>Image URL</span><input class="input" data-ss-service-field="image_url" value="${SS.esc(service.image_url||'')}" placeholder="Optional image"></label></div><div class="ss-toggle-row"><label class="ss-check"><input type="checkbox" data-ss-service-meta="active" ${meta.active!==false?'checked':''}><span>Active</span></label><label class="ss-check"><input type="checkbox" data-ss-service-meta="bookingAvailable" ${meta.bookingAvailable!==false?'checked':''}><span>Bookable</span></label><label class="btn btn-light btn-sm ss-upload-service">Upload image<input hidden type="file" accept="image/jpeg,image/png,image/webp" data-ss-service-image="${index}"></label></div></article>`;
  }
  function servicesPanel(){
    const suggestions=SS.starterServices(state.studioProfession),categories=SS.starterCategories(state.studioProfession),list=coreServices();
    return `<div class="ss-editor-section"><div class="ss-editor-section-head"><div><span>SERVICES</span><h4>Services & pricing</h4><p>These cards power the public Super Studio service menu and use LIW's existing service records.</p></div><button type="button" class="btn btn-primary btn-sm" data-ss-add-service><i data-lucide="plus"></i>Add service</button></div><div class="ss-suggestion-block"><strong>Starter suggestions</strong><div>${suggestions.map(name=>`<button type="button" data-ss-suggest-service="${SS.esc(name)}">+ ${SS.esc(name)}</button>`).join('')}</div><small>Suggested categories: ${SS.esc(categories.join(' · '))}</small></div><div class="ss-service-editor-list">${list.length?list.map(serviceRow).join(''):'<div class="ss-empty"><i data-lucide="scissors"></i><strong>Add your services</strong><span>Show clients what you do, how long it takes and what it costs.</span><button type="button" class="btn btn-light btn-sm" data-ss-add-service>Add first service</button></div>'}</div></div>`;
  }

  function bookingPanel(){
    return `<div class="ss-editor-section"><div class="ss-editor-section-head"><div><span>BOOKING</span><h4>Appointments</h4><p>Super Studio uses LIW native appointments first, with your existing external booking link as fallback.</p></div></div><label class="ss-check"><input type="checkbox" data-ss-path="booking.nativePreferred" ${state.booking.nativePreferred!==false?'checked':''}><span>Prefer LIW native booking</span></label><label class="ss-check"><input type="checkbox" data-ss-path="booking.inspirationEnabled" ${state.booking.inspirationEnabled?'checked':''}><span>Allow inspiration-photo request during booking setup</span></label><div class="ss-booking-actions"><a class="btn btn-primary" href="${cardId()?`appointments.html?card_id=${encodeURIComponent(cardId())}`:'appointments.html'}"><i data-lucide="calendar-range"></i>Open LIW Appointments</a><button type="button" class="btn btn-light" data-ss-core-tools><i data-lucide="link"></i>External booking fallback</button></div><div class="ss-inline-note"><i data-lucide="clock-3"></i><span>Working hours, buffers, unavailable dates, vacation dates, reminders, reschedule/cancel and Google Calendar stay in the existing LIW Appointments system.</span></div><div class="ss-inline-note"><i data-lucide="credit-card"></i><span>Deposit settings are stored per Super Studio service. Payment collection should continue through LIW/Stripe patterns—card data is never stored here.</span></div></div>`;
  }

  function portfolioItem(item,index){return `<article class="ss-media-editor" data-ss-portfolio-index="${index}"><div class="ss-media-thumb">${item.url?`<img src="${SS.esc(item.url)}" alt="">`:'<i data-lucide="image"></i>'}</div><div><input class="input" data-ss-portfolio-field="category" value="${SS.esc(item.category||'')}" placeholder="Category"><input class="input" data-ss-portfolio-field="caption" value="${SS.esc(item.caption||'')}" placeholder="Caption (optional)"><label class="ss-check"><input type="checkbox" data-ss-portfolio-field="featured" ${item.featured?'checked':''}><span>Featured Work</span></label></div><button type="button" class="icon-btn" data-ss-delete-portfolio="${index}" aria-label="Remove photo"><i data-lucide="trash-2"></i></button></article>`;}
  function beforeAfterRow(item,index){return `<article class="ss-ba-editor" data-ss-ba-index="${index}"><div><strong>Before</strong>${item.beforeUrl?`<img src="${SS.esc(item.beforeUrl)}" alt="Before">`:'<span>No photo</span>'}<label class="btn btn-light btn-sm">Upload before<input hidden type="file" accept="image/jpeg,image/png,image/webp" data-ss-ba-upload="before" data-index="${index}"></label></div><div><strong>After</strong>${item.afterUrl?`<img src="${SS.esc(item.afterUrl)}" alt="After">`:'<span>No photo</span>'}<label class="btn btn-light btn-sm">Upload after<input hidden type="file" accept="image/jpeg,image/png,image/webp" data-ss-ba-upload="after" data-index="${index}"></label></div><button type="button" class="icon-btn" data-ss-delete-ba="${index}" aria-label="Remove before and after"><i data-lucide="trash-2"></i></button></article>`;}
  function portfolioPanel(){
    const work=SS.workCategories(state.studioProfession);
    return `<div class="ss-editor-section"><div class="ss-editor-section-head"><div><span>PORTFOLIO</span><h4>My Work</h4><p>Upload real work. Featured images appear high on the card.</p></div><label class="btn btn-primary btn-sm"><i data-lucide="image-plus"></i>Add photos<input hidden multiple type="file" accept="image/jpeg,image/png,image/webp" data-ss-portfolio-upload></label></div><div class="ss-suggestion-block"><strong>Category ideas</strong><small>${SS.esc(work.join(' · '))}</small></div><div class="ss-media-list">${state.portfolio.length?state.portfolio.map(portfolioItem).join(''):'<div class="ss-empty"><i data-lucide="images"></i><strong>Show off your work</strong><span>Upload your best photos so clients see your style before booking.</span></div>'}</div><div class="ss-editor-section-head ss-subhead"><div><span>OPTIONAL</span><h4>Before & After</h4></div><button type="button" class="btn btn-light btn-sm" data-ss-add-ba><i data-lucide="plus"></i>Add pair</button></div><div class="ss-ba-editor-list">${state.beforeAfter.length?state.beforeAfter.map(beforeAfterRow).join(''):'<div class="ss-empty compact"><span>Add transformation pairs for hair, nails, skin, makeup, tattoos and more.</span></div>'}</div></div>`;
  }

  function teamEditor(member,index){return `<article class="ss-team-editor" data-ss-team-index="${index}"><div class="ss-grid-2"><input class="input" data-ss-team-field="name" value="${SS.esc(member.name||'')}" placeholder="Name"><input class="input" data-ss-team-field="title" value="${SS.esc(member.title||'')}" placeholder="Title"></div><input class="input" data-ss-team-field="specialties" value="${SS.esc(member.specialties||'')}" placeholder="Specialties"><div class="ss-editor-row-actions"><label class="btn btn-light btn-sm">Photo<input hidden type="file" accept="image/*" data-ss-team-photo="${index}"></label><button type="button" class="icon-btn" data-ss-delete-team="${index}"><i data-lucide="trash-2"></i></button></div></article>`;}
  function businessPanel(){
    return `<div class="ss-editor-section"><div class="ss-editor-section-head"><div><span>BUSINESS</span><h4>Studio information</h4><p>Keep the public card concise while storing the details clients need.</p></div></div><div class="ss-grid-2"><label class="ss-field"><span>Location type</span><select class="input" data-ss-path="studioInfo.locationType"><option>Shop/Salon</option><option>Salon Suite</option><option>Home Studio</option><option>Mobile</option><option>Travel to Client</option><option>Multiple Locations</option></select></label><label class="ss-field"><span>City / State</span><input class="input" data-ss-path="studioInfo.cityState" value="${SS.esc(state.studioInfo.cityState||'')}" placeholder="Brooklyn, NY"></label></div><div class="ss-grid-2"><label class="ss-field"><span>Suite</span><input class="input" data-ss-path="studioInfo.suite" value="${SS.esc(state.studioInfo.suite||'')}"></label><label class="ss-check align-end"><input type="checkbox" data-ss-path="studioInfo.hideExactAddress" ${state.studioInfo.hideExactAddress?'checked':''}><span>Hide exact address until booking</span></label></div><label class="ss-field"><span>Parking information</span><input class="input" data-ss-path="studioInfo.parking" value="${SS.esc(state.studioInfo.parking||'')}"></label><label class="ss-field"><span>Accessibility notes</span><input class="input" data-ss-path="studioInfo.accessibility" value="${SS.esc(state.studioInfo.accessibility||'')}"></label><label class="ss-field"><span>Service areas</span><textarea class="input" data-ss-path="serviceArea.areas" placeholder="Brooklyn, Queens, Manhattan">${SS.esc(state.serviceArea.areas||'')}</textarea></label><label class="ss-field"><span>Travel fee</span><input class="input" data-ss-path="serviceArea.travelFee" value="${SS.esc(state.serviceArea.travelFee||'')}" placeholder="$25"></label><div class="ss-editor-section-head ss-subhead"><div><span>ABOUT</span><h4>Professional details</h4></div></div><div class="ss-grid-2"><label class="ss-field"><span>Years experience</span><input class="input" data-ss-path="about.yearsExperience" value="${SS.esc(state.about.yearsExperience||'')}"></label><label class="ss-field"><span>Languages</span><input class="input" data-ss-path="about.languages" value="${SS.esc(state.about.languages||'')}"></label></div><label class="ss-field"><span>Specialties</span><input class="input" data-ss-path="about.specialties" value="${SS.esc(state.about.specialties||'')}"></label><label class="ss-field"><span>Certifications</span><input class="input" data-ss-path="about.certifications" value="${SS.esc(state.about.certifications||'')}"></label><div class="ss-editor-section-head ss-subhead"><div><span>CLIENT</span><h4>Before Your Appointment</h4></div></div><textarea class="input" data-ss-path="clientPrep" placeholder="Please arrive with hair washed and blow-dried...">${SS.esc(state.clientPrep||'')}</textarea><div class="ss-editor-section-head ss-subhead"><div><span>POLICIES</span><h4>Booking Policies</h4></div></div>${['cancellation','late','deposit','noShow','guest','children','preparation'].map(key=>`<label class="ss-field"><span>${key==='noShow'?'No-show':key.charAt(0).toUpperCase()+key.slice(1)} policy</span><textarea class="input" data-ss-path="policies.${key}">${SS.esc(state.policies[key]||'')}</textarea></label>`).join('')}<div class="ss-editor-section-head ss-subhead"><div><span>TEAM</span><h4>Solo or team</h4></div></div><label class="ss-check"><input type="checkbox" data-ss-path="teamMode" ${state.teamMode?'checked':''}><span>Enable Studio / Salon Team Mode</span></label>${state.teamMode?`<div class="ss-team-editor-list">${state.team.map((m,i)=>teamEditor(m,i)).join('')}</div><button type="button" class="btn btn-light btn-sm" data-ss-add-team><i data-lucide="user-plus"></i>Add staff member</button>`:''}</div>`;
  }

  function reviewEditor(review,index){return `<article class="ss-review-editor" data-ss-review-index="${index}"><input class="input" data-ss-review-field="name" value="${SS.esc(review.name||'')}" placeholder="Client name"><textarea class="input" data-ss-review-field="quote" placeholder="Testimonial">${SS.esc(review.quote||'')}</textarea><button type="button" class="icon-btn" data-ss-delete-review="${index}"><i data-lucide="trash-2"></i></button></article>`;}
  function specialEditor(special,index){return `<article class="ss-special-editor" data-ss-special-index="${index}"><div class="ss-grid-2"><input class="input" data-ss-special-field="title" value="${SS.esc(special.title||'')}" placeholder="New Client Special"><input class="input" data-ss-special-field="promoCode" value="${SS.esc(special.promoCode||'')}" placeholder="Promo code"></div><textarea class="input" data-ss-special-field="description" placeholder="Offer details">${SS.esc(special.description||'')}</textarea><div class="ss-grid-2"><input class="input" type="date" data-ss-special-field="expiresAt" value="${SS.esc(special.expiresAt||'')}"><label class="btn btn-light btn-sm">Image<input hidden type="file" accept="image/*" data-ss-special-photo="${index}"></label></div><button type="button" class="icon-btn" data-ss-delete-special="${index}"><i data-lucide="trash-2"></i></button></article>`;}
  function growPanel(){
    return `<div class="ss-editor-section"><div class="ss-editor-section-head"><div><span>GROW</span><h4>Reviews</h4><p>Manual testimonials plus real Google review links—no fake live Google data.</p></div><button type="button" class="btn btn-light btn-sm" data-ss-add-review><i data-lucide="plus"></i>Add review</button></div><div class="ss-review-editor-list">${state.reviews.items.length?state.reviews.items.map(reviewEditor).join(''):'<div class="ss-empty compact"><span>Add testimonials when you have them.</span></div>'}</div><div class="ss-grid-2"><label class="ss-field"><span>See reviews URL</span><input class="input" type="url" data-ss-path="reviews.seeUrl" value="${SS.esc(state.reviews.seeUrl||'')}" placeholder="Google Business reviews link"></label><label class="ss-field"><span>Leave a Google Review URL</span><input class="input" type="url" data-ss-path="reviews.leaveUrl" value="${SS.esc(state.reviews.leaveUrl||'')}"></label></div><div class="ss-editor-section-head ss-subhead"><div><span>OFFERS</span><h4>Special Offers</h4></div><button type="button" class="btn btn-light btn-sm" data-ss-add-special><i data-lucide="plus"></i>Add offer</button></div><div class="ss-special-editor-list">${state.specials.length?state.specials.map(specialEditor).join(''):'<div class="ss-empty compact"><span>Optional. Expired offers are automatically hidden on the public card.</span></div>'}</div><div class="ss-shortcuts"><button class="btn btn-light btn-sm" type="button" data-ss-core-tab="links">Social media</button><button class="btn btn-light btn-sm" type="button" data-ss-core-tools>Products</button><button class="btn btn-light btn-sm" type="button" data-ss-core-tab="share">Share / QR / Wallet / Install</button></div></div>`;
  }

  function renderEditor(){
    const root=q('#super-studio-control-center');if(!root)return;
    const panels={start:startPanel(),look:lookPanel(),services:servicesPanel(),booking:bookingPanel(),portfolio:portfolioPanel(),business:businessPanel(),grow:growPanel()};
    Object.entries(panels).forEach(([key,html])=>{const panel=q(`[data-ss-panel="${key}"]`,root);if(panel)panel.innerHTML=html;});
    qa('[data-ss-panel]',root).forEach(panel=>panel.hidden=panel.dataset.ssPanel!==activeTab);
    qa('[data-ss-tab]',root).forEach(button=>button.classList.toggle('active',button.dataset.ssTab===activeTab));
    const prof=q('[data-ss-path="studioProfession"]',root);if(prof)prof.value=state.studioProfession;
    const loc=q('[data-ss-path="studioInfo.locationType"]',root);if(loc)loc.value=state.studioInfo.locationType||'Shop/Salon';
    qa('[data-ss-service-index]',root).forEach(row=>{const index=Number(row.dataset.ssServiceIndex),meta=serviceMeta(coreServices()[index]||{},index);const price=q('[data-ss-service-meta="priceType"]',row);if(price)price.value=meta.priceType||'fixed';const dep=q('[data-ss-service-meta="depositType"]',row);if(dep)dep.value=meta.depositType||'none';});
    if(window.lucide)try{lucide.createIcons();}catch(_){}
  }

  function setPath(path,value){const parts=path.split('.');let target=state;parts.slice(0,-1).forEach(key=>{if(!target[key]||typeof target[key]!=='object')target[key]={};target=target[key];});target[parts.at(-1)]=value;}

  function handleClick(event){
    const tab=event.target.closest('[data-ss-tab]');if(tab){activeTab=tab.dataset.ssTab;renderEditor();return;}
    const coreTab=event.target.closest('[data-ss-core-tab]');if(coreTab){try{if(typeof openTab==='function')openTab(coreTab.dataset.ssCoreTab);}catch(_){}return;}
    if(event.target.closest('[data-ss-core-tools]')){try{if(typeof openTab==='function')openTab('tools');}catch(_){}const content=q('#business-tools-content');if(content)content.hidden=false;return;}
    if(event.target.closest('[data-ss-add-service]'))return addService();
    const suggested=event.target.closest('[data-ss-suggest-service]');if(suggested)return addService(suggested.dataset.ssSuggestService);
    const delService=event.target.closest('[data-ss-delete-service]');if(delService)return deleteService(Number(delService.dataset.ssDeleteService));
    if(event.target.closest('[data-ss-remove-video]')){state.videoCoverUrl='';renderEditor();refreshPreview();queueStateSave();return;}
    if(event.target.closest('[data-ss-add-ba]')){state.beforeAfter.push({id:SS.uid('ba'),beforeUrl:'',afterUrl:''});renderEditor();queueStateSave();return;}
    const delBa=event.target.closest('[data-ss-delete-ba]');if(delBa){state.beforeAfter.splice(Number(delBa.dataset.ssDeleteBa),1);renderEditor();queueStateSave();return;}
    const delPort=event.target.closest('[data-ss-delete-portfolio]');if(delPort){state.portfolio.splice(Number(delPort.dataset.ssDeletePortfolio),1);renderEditor();refreshPreview();queueStateSave();return;}
    if(event.target.closest('[data-ss-add-team]')){state.team.push({id:SS.uid('team'),name:'',title:'',specialties:'',photoUrl:''});renderEditor();queueStateSave();return;}
    const delTeam=event.target.closest('[data-ss-delete-team]');if(delTeam){state.team.splice(Number(delTeam.dataset.ssDeleteTeam),1);renderEditor();queueStateSave();return;}
    if(event.target.closest('[data-ss-add-review]')){state.reviews.items.push({id:SS.uid('review'),name:'',quote:''});renderEditor();queueStateSave();return;}
    const delReview=event.target.closest('[data-ss-delete-review]');if(delReview){state.reviews.items.splice(Number(delReview.dataset.ssDeleteReview),1);renderEditor();refreshPreview();queueStateSave();return;}
    if(event.target.closest('[data-ss-add-special]')){state.specials.push({id:SS.uid('special'),title:'',description:'',promoCode:'',expiresAt:'',imageUrl:''});renderEditor();queueStateSave();return;}
    const delSpecial=event.target.closest('[data-ss-delete-special]');if(delSpecial){state.specials.splice(Number(delSpecial.dataset.ssDeleteSpecial),1);renderEditor();refreshPreview();queueStateSave();return;}
  }

  function handleInput(event){
    const path=event.target.dataset.ssPath;
    if(path){setPath(path,event.target.type==='checkbox'?event.target.checked:event.target.value);if(path==='studioProfession'||path==='teamMode')renderEditor();refreshPreview();queueStateSave();return;}
    const serviceRow=event.target.closest('[data-ss-service-index]');
    if(serviceRow){const index=Number(serviceRow.dataset.ssServiceIndex),service=coreServices()[index],meta=serviceMeta(service||{},index);if(!service)return;const fieldKey=event.target.dataset.ssServiceField,metaKey=event.target.dataset.ssServiceMeta;if(fieldKey){if(fieldKey==='price'){const n=Number(String(event.target.value).replace(/[$,]/g,''));service.price_cents=Number.isFinite(n)&&n>=0?Math.round(n*100):null;}else service[fieldKey]=event.target.value;if(fieldKey==='name')meta.serviceName=service.name;setCoreDirty();}if(metaKey)meta[metaKey]=event.target.type==='checkbox'?event.target.checked:event.target.value;refreshPreview();queueStateSave();return;}
    const port=event.target.closest('[data-ss-portfolio-index]');if(port){const item=state.portfolio[Number(port.dataset.ssPortfolioIndex)],key=event.target.dataset.ssPortfolioField;if(item&&key)item[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;refreshPreview();queueStateSave();return;}
    const team=event.target.closest('[data-ss-team-index]');if(team){const item=state.team[Number(team.dataset.ssTeamIndex)],key=event.target.dataset.ssTeamField;if(item&&key)item[key]=event.target.value;refreshPreview();queueStateSave();return;}
    const review=event.target.closest('[data-ss-review-index]');if(review){const item=state.reviews.items[Number(review.dataset.ssReviewIndex)],key=event.target.dataset.ssReviewField;if(item&&key)item[key]=event.target.value;refreshPreview();queueStateSave();return;}
    const special=event.target.closest('[data-ss-special-index]');if(special){const item=state.specials[Number(special.dataset.ssSpecialIndex)],key=event.target.dataset.ssSpecialField;if(item&&key)item[key]=event.target.value;refreshPreview();queueStateSave();return;}
  }

  function handleChange(event){
    handleInput(event);
    if(event.target.matches('[data-ss-video-file]'))uploadVideo(event.target.files?.[0]);
    if(event.target.matches('[data-ss-portfolio-upload]'))uploadPortfolio(event.target.files);
    if(event.target.matches('[data-ss-service-image]'))uploadServiceImage(event.target.files?.[0],Number(event.target.dataset.ssServiceImage));
    if(event.target.matches('[data-ss-ba-upload]'))uploadBeforeAfter(event.target.files?.[0],Number(event.target.dataset.index),event.target.dataset.ssBaUpload);
    if(event.target.matches('[data-ss-team-photo]'))uploadTeamPhoto(event.target.files?.[0],Number(event.target.dataset.ssTeamPhoto));
    if(event.target.matches('[data-ss-special-photo]'))uploadSpecialPhoto(event.target.files?.[0],Number(event.target.dataset.ssSpecialPhoto));
  }

  function addService(name=''){
    const list=coreServices();list.push({name:name||'',description:'',price_cents:null,booking_url:'',payment_url:'',cta_label:'Book',image_url:''});state.serviceMeta.push({serviceName:name||'',category:'',priceType:'fixed',duration:'60',bookingAvailable:true,active:true,depositType:'none',depositValue:''});if(field('services_enabled'))field('services_enabled').checked=true;try{renderServiceRows();}catch(_){}setCoreDirty();renderEditor();refreshPreview();queueStateSave();setTimeout(()=>q(`[data-ss-service-index="${list.length-1}"] [data-ss-service-field="name"]`)?.focus(),0);
  }
  function deleteService(index){const list=coreServices();if(!list[index])return;list.splice(index,1);state.serviceMeta.splice(index,1);try{renderServiceRows();}catch(_){}setCoreDirty();renderEditor();refreshPreview();queueStateSave();}

  async function ensureCard(){if(cardId())return cardId();try{if(typeof save==='function')await save({silent:true});}catch(error){console.warn('Super Studio could not create card before state save',error);}return cardId();}
  async function saveState(){
    clearTimeout(saveTimer);if(!isActive())return;const id=await ensureCard(),owner=ownerId();if(!id||!owner)return;const status=q('#ss-editor-save-state');if(status)status.textContent='Saving…';
    try{const clean=SS.normalize(state),serialized=JSON.stringify(clean);const {error}=await supabaseClient.from('super_studio_state_staging').upsert({card_id:id,owner_user_id:owner,data:clean,updated_at:new Date().toISOString()},{onConflict:'card_id'});if(error)throw error;lastSavedState=serialized;if(status)status.textContent='Saved';}
    catch(error){if(status)status.textContent='Save failed';console.error('LIW Super Studio state save failed:',error);toastSafe(error?.message||'Super Studio details could not save');}
  }
  function queueStateSave(){clearTimeout(saveTimer);const status=q('#ss-editor-save-state');if(status)status.textContent='Unsaved';saveTimer=setTimeout(saveState,650);}
  async function loadState(force=false){const id=cardId();if(!id||(!force&&loadedCardId===id))return;loadedCardId=id;try{const {data,error}=await supabaseClient.from('super_studio_state_staging').select('data').eq('card_id',id).maybeSingle();if(error)throw error;state=SS.normalize(data?.data||{});lastSavedState=JSON.stringify(state);renderEditor();refreshPreview();}catch(error){console.warn('LIW Super Studio load failed:',error);}}

  async function uploadAsset(file,folder,bucket='profile-images'){
    if(!file)return '';if(bucket==='profile-images'&&file.size>8*1024*1024)throw new Error('Image must be under 8 MB.');if(bucket==='card-videos'&&file.size>20*1024*1024)throw new Error('Video must be under 20 MB. Use a shorter cover clip.');const account=ownerId();if(!account)throw new Error('Sign in again before uploading.');const safe=String(file.name||'upload').toLowerCase().replace(/[^a-z0-9.]+/g,'-'),path=`${account}/super-studio/${folder}/${Date.now()}-${safe}`;const {error}=await supabaseClient.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});if(error)throw error;return supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  async function uploadVideo(file){if(!file)return;try{state.videoCoverUrl=await uploadAsset(file,'video','card-videos');renderEditor();refreshPreview();queueStateSave();toastSafe('Super Studio video cover uploaded');}catch(error){toastSafe(error.message||'Could not upload video');}}
  async function uploadPortfolio(files){for(const file of Array.from(files||[]).slice(0,12)){try{const url=await uploadAsset(file,'portfolio');state.portfolio.push({id:SS.uid('work'),url,category:'',caption:'',featured:state.portfolio.length<3});}catch(error){toastSafe(error.message||'Could not upload portfolio image');}}renderEditor();refreshPreview();queueStateSave();}
  async function uploadServiceImage(file,index){if(!file||!coreServices()[index])return;try{coreServices()[index].image_url=await uploadAsset(file,'services');setCoreDirty();renderEditor();refreshPreview();queueStateSave();}catch(error){toastSafe(error.message||'Could not upload service image');}}
  async function uploadBeforeAfter(file,index,side){if(!file||!state.beforeAfter[index])return;try{state.beforeAfter[index][side==='before'?'beforeUrl':'afterUrl']=await uploadAsset(file,'before-after');renderEditor();refreshPreview();queueStateSave();}catch(error){toastSafe(error.message||'Could not upload image');}}
  async function uploadTeamPhoto(file,index){if(!file||!state.team[index])return;try{state.team[index].photoUrl=await uploadAsset(file,'team');renderEditor();refreshPreview();queueStateSave();}catch(error){toastSafe(error.message||'Could not upload team photo');}}
  async function uploadSpecialPhoto(file,index){if(!file||!state.specials[index])return;try{state.specials[index].imageUrl=await uploadAsset(file,'specials');renderEditor();refreshPreview();queueStateSave();}catch(error){toastSafe(error.message||'Could not upload offer image');}}

  function cardModel(){return {full_name:val('full_name','Your Name'),company_name:val('company_name','Your Studio'),job_title:val('job_title',''),biography:val('biography',''),phone:val('phone',''),sms_phone:val('sms_phone',''),email:val('email',''),website:val('website',''),business_address:val('business_address',''),profile_image_url:val('profile_image_url',''),cover_image_url:val('cover_image_url',''),primary_color:val('primary_color','#111827'),secondary_color:val('secondary_color','#c89245'),background_color:val('background_color','#fff'),text_color:val('text_color','#171821'),products_enabled:val('products_enabled')==='true'||field('products_enabled')?.checked};}
  function refreshPreview(){
    const phone=q('#phone-preview');if(!phone)return;ensureSelector();const generic=q('.preview-card-scroll',phone);if(!isActive()){phone.classList.remove('super-studio-preview-active');q('#super-studio-phone',phone)?.remove();return;}phone.classList.add('super-studio-preview-active');let host=q('#super-studio-phone',phone);if(!host){host=document.createElement('div');host.id='super-studio-phone';generic?.appendChild(host);}host.innerHTML=SS.renderExperience({card:cardModel(),state,services:coreServices(),socials:coreSocials(),products:coreProducts(),preview:true});if(window.lucide)try{lucide.createIcons({nodes:[host]});}catch(_){try{lucide.createIcons();}catch(__){}}
  }
  function syncUi(){ensureStyle();ensureSelector();buildControlCenter();q('#super-studio-control-center')?.classList.toggle('is-visible',isActive());refreshPreview();if(isActive()&&cardId())loadState();}

  try{if(typeof render==='function'){const originalRender=render;render=function(){const result=originalRender.apply(this,arguments);try{syncUi();}catch(error){console.warn('Super Studio preview refresh',error);}return result;};}}catch(_){}
  document.addEventListener('liw:editor-card-hydrated',event=>{if(String(event.detail?.cardExperience||'').toLowerCase()==='super-studio')loadState(true).then(syncUi);else syncUi();});
  document.addEventListener('input',event=>{if(event.target?.name==='card_experience')syncUi();});
  document.addEventListener('change',event=>{if(event.target?.name==='card_experience')syncUi();});
  let attempts=0;const timer=setInterval(()=>{attempts+=1;ensureStyle();ensureSelector();buildControlCenter();syncUi();if(attempts>50)clearInterval(timer);},180);
  window.LIWSuperStudioEditor={refresh:syncUi,getState:()=>SS.clone(state),save:saveState,activate};
  syncUi();
})();
