/* LIW Cards staging — Studio public redesign V2.
   Clean Studio navigation + public multi-specialty presentation. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_PUBLIC_V2__)return;
  window.__LIW_STUDIO_PUBLIC_V2__=true;
  if(new URLSearchParams(location.search).get('embed')==='1')return;

  const TYPES={
    barber:'Barber',hair:'Hair Stylist',braider:'Braider',loctician:'Loctician',wig:'Wig / Install Specialist',
    nails:'Nail Tech',lashes:'Lash Artist',brows:'Brow Artist',makeup:'Makeup Artist',
    esthetician:'Esthetician',wax:'Wax Specialist',massage:'Massage Therapist',spa:'Spa / Wellness',
    spraytan:'Spray Tan Artist',pmu:'Permanent Makeup Artist',tattoo:'Tattoo Artist',piercing:'Piercer',
    toothgem:'Tooth Gem Artist',cosmetics:'Beauty / Cosmetics',salon:'Salon / Multi-Service Studio',other:'Studio Professional'
  };

  let profile=null;
  let loadedId='';
  const q=(s,scope=document)=>scope.querySelector(s);
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:{};}catch(_){return {};}};
  const room=()=>window.LIWBarberClientRoom||null;
  const studio=()=>document.documentElement.classList.contains('liw-public-studio');

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function icon(name){
    const p={
      home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
      services:'<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2"/>',
      gallery:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-4.5-4.5L8 19"/>',
      book:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 15l2 2 5-5"/>',
      info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
      close:'<path d="m7 7 10 10M17 7 7 17"/>',
      pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
      phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z"/>',
      mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
      globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
      social:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1M5 12a7 7 0 0 1 .1-1M8 5.4A7 7 0 0 1 12 5M16 18.6A7 7 0 0 1 12 19"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(p[name]||p.info)+'</svg>';
  }

  function normalizedUrl(value){
    const raw=String(value||'').trim();
    if(!raw)return '';
    return /^https?:\/\//i.test(raw)?raw:'https://'+raw;
  }

  function labels(){
    const primary=profile?.primary_type||document.documentElement.dataset.studioBusinessType||'other';
    return {
      services: primary==='nails'?'Nails':primary==='tattoo'?'Tattoo':primary==='hair'||primary==='braider'||primary==='loctician'||primary==='wig'?'Hair':'Services',
      gallery: primary==='tattoo'?'Work':primary==='makeup'?'Looks':primary==='esthetician'||primary==='lashes'||primary==='brows'?'Results':'Portfolio'
    };
  }

  function setActive(key){
    q('.studio-nav-v2')?.querySelectorAll('button').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.studioNav===key));
  }

  function openInfo(){
    const sheet=q('[data-studio-info-sheet]');
    if(!sheet)return;
    renderInfo();
    sheet.hidden=false;
    setActive('info');
  }
  function closeInfo(){
    const sheet=q('[data-studio-info-sheet]');
    if(sheet)sheet.hidden=true;
  }

  function navAction(key){
    closeInfo();
    if(key==='home'){room()?.setRoom?.('home');setActive('home');return;}
    if(key==='services'){room()?.setRoom?.('cuts');setActive('services');return;}
    if(key==='gallery'){room()?.setRoom?.('gallery');setActive('gallery');return;}
    if(key==='book'){
      room()?.openNativeAppointment?.();
      setActive('book');
      setTimeout(decorateBookingRoom,0);
      setTimeout(decorateBookingRoom,180);
      return;
    }
    if(key==='info'){openInfo();}
  }

  function renderNav(){
    const card=q('#card');
    if(!card||!studio())return false;
    let nav=q('.studio-nav-v2',card);
    if(!nav){
      nav=document.createElement('nav');
      nav.className='studio-nav-v2';
      nav.setAttribute('aria-label','Studio navigation');
      card.appendChild(nav);
      nav.addEventListener('click',e=>{
        const btn=e.target.closest?.('[data-studio-nav]');
        if(btn)navAction(btn.dataset.studioNav);
      });
    }
    const l=labels();
    const galleryReady=Boolean(room()?.sourceConfigured?.('gallery'));
    const servicesReady=Boolean(room()?.sourceConfigured?.('cuts'));
    const bookingReady=Boolean(q('#booking-v1-section')||q('[data-liw-native-booking-action]')||data().booking_enabled===true);
    const items=[
      ['home','home','Home',true],
      ['services','services',l.services,servicesReady],
      ['book','book','Book',bookingReady],
      ['gallery','gallery',l.gallery,galleryReady],
      ['info','info','Info',true]
    ].filter(item=>item[3]);
    nav.style.setProperty('--studio-nav-count',String(items.length));
    nav.innerHTML=items.map(([key,ic,label])=>
      '<button type="button" data-studio-nav="'+key+'" class="'+(key==='home'?'is-active':'')+'">'+icon(ic)+'<span>'+esc(label)+'</span></button>'
    ).join('');
    return true;
  }

  function decorateBookingRoom(){
    const host=q('.barber-booking-host');
    if(!host||host.hidden)return false;
    host.dataset.studioBookingRoom='true';
    let head=q('[data-studio-booking-head]',host);
    if(!head){
      head=document.createElement('div');
      head.className='studio-booking-head';
      head.dataset.studioBookingHead='true';
      head.innerHTML='<button type="button" class="studio-booking-back" data-studio-booking-home aria-label="Back to Studio home">←</button><div><small>STUDIO BOOKING</small><strong>Book an appointment</strong><span data-studio-booking-sub></span></div>';
      host.prepend(head);
      q('[data-studio-booking-home]',head)?.addEventListener('click',()=>{
        room()?.setRoom?.('home');
        setActive('home');
      });
    }
    const primary=profile?.primary_type||document.documentElement.dataset.studioBusinessType||'other';
    const label=specialtyLabel(primary);
    const company=String(data().company_name||'').trim();
    const sub=q('[data-studio-booking-sub]',head);
    if(sub)sub.textContent=company?company+' · '+label:label;
    const section=q('#booking-v1-section',host);
    if(section)section.dataset.studioBookingSurface='true';
    return true;
  }

  function decorateHome(){
    const home=q('.barber-client-home');
    if(!home)return false;
    home.dataset.studioHomeV2='true';
    const label=q('.barber-client-promo-label span:last-child',home);
    if(label)label.textContent='FEATURED';
    return true;
  }

  function specialtyLabel(key){
    if(key==='other'&&profile?.custom_specialty)return profile.custom_specialty;
    return TYPES[key]||'Studio Professional';
  }

  function renderSpecialties(){
    const home=q('.barber-client-home');
    if(!home||!profile)return;
    let strip=q('.studio-specialty-strip',home);
    if(!strip){
      strip=document.createElement('div');
      strip.className='studio-specialty-strip';
      const specialty=q('.barber-welcome-specialty',home);
      if(specialty)specialty.insertAdjacentElement('afterend',strip);
      else home.prepend(strip);
    }
    const primary=profile.primary_type||'other';
    const list=Array.isArray(profile.specialties)&&profile.specialties.length?profile.specialties:[primary];
    strip.innerHTML=list.map(key=>
      '<span class="studio-specialty-chip '+(key===primary?'primary':'')+'">'+esc(specialtyLabel(key))+'</span>'
    ).join('');
    const kicker=q('.barber-welcome-kicker',home);
    if(kicker){
      const company=String(data().company_name||'').trim();
      kicker.innerHTML='<span></span> '+esc(company?company.toUpperCase():'STUDIO');
    }
  }

  function infoItem(iconName,label,value,href=''){
    if(!value)return '';
    const tag=href?'a':'div';
    const hrefAttr=href?' href="'+esc(href)+'"':'';
    return '<'+tag+' class="'+(href?'studio-info-action':'studio-info-item')+'"'+hrefAttr+'><span>'+icon(iconName)+'</span><div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div><span>›</span></'+tag+'>';
  }

  function renderInfo(){
    const sheet=q('[data-studio-info-sheet]');
    const grid=q('[data-studio-info-grid]',sheet||document);
    if(!grid)return;
    const d=data();
    const phone=String(d.phone||'').trim();
    const text=String(d.sms_phone||'').trim()||phone;
    const email=String(d.email||'').trim();
    const website=String(d.website||'').trim();
    const address=String(d.business_address||'').trim();
    const rows=[];
    if(address)rows.push('<button type="button" class="studio-info-action" data-studio-info-map><span>'+icon('pin')+'</span><div><small>Location</small><strong>'+esc(address)+'</strong></div><span>›</span></button>');
    if(phone)rows.push(infoItem('phone','Call',phone,'tel:'+phone.replace(/[^+\d]/g,'')));
    if(text)rows.push(infoItem('phone','Text',text,'sms:'+text.replace(/[^+\d]/g,'')));
    if(email)rows.push(infoItem('mail','Email',email,'mailto:'+email));
    if(website)rows.push(infoItem('globe','Website',website,normalizedUrl(website)));
    if(room()?.sourceConfigured?.('social'))rows.push('<button type="button" class="studio-info-action" data-studio-info-social><span>'+icon('social')+'</span><div><small>Connect</small><strong>Social profiles</strong></div><span>›</span></button>');
    grid.innerHTML=rows.join('')||'<div class="studio-info-empty">Business information has not been added yet.</div>';
  }

  function ensureInfo(){
    const card=q('#card');
    if(!card||!studio())return;
    let sheet=q('[data-studio-info-sheet]',card);
    if(!sheet){
      sheet=document.createElement('section');
      sheet.className='studio-info-sheet';
      sheet.dataset.studioInfoSheet='true';
      sheet.hidden=true;
      sheet.innerHTML='<button type="button" class="studio-info-dismiss" data-studio-info-close aria-label="Close Studio info"></button><div class="studio-info-panel"><div class="studio-info-head"><div><small>STUDIO INFO</small><strong>Business details</strong></div><button type="button" class="studio-info-close" data-studio-info-close aria-label="Close">'+icon('close')+'</button></div><div class="studio-info-grid" data-studio-info-grid></div></div>';
      card.appendChild(sheet);
      sheet.addEventListener('click',e=>{
        if(e.target.closest?.('[data-studio-info-close]')){closeInfo();setActive('home');return;}
        if(e.target.closest?.('[data-studio-info-map]')){closeInfo();room()?.setRoom?.('map');setActive('info');return;}
        if(e.target.closest?.('[data-studio-info-social]')){closeInfo();room()?.setRoom?.('social');setActive('info');}
      });
    }
  }

  async function loadProfile(){
    const d=data();
    const id=String(d.id||'');
    if(!id||loadedId===id)return;
    loadedId=id;
    const direct={
      primary_type:String(d.studio_business_type||'').trim().toLowerCase(),
      specialties:Array.isArray(d.studio_specialties)?d.studio_specialties:[],
      custom_specialty:String(d.studio_custom_specialty||'')
    };
    if(direct.primary_type&&TYPES[direct.primary_type]){
      if(!direct.specialties.length)direct.specialties=[direct.primary_type];
      profile=direct;
      renderSpecialties();renderNav();
    }
    try{
      const client=window.supabaseClient||((typeof supabaseClient!=='undefined')?supabaseClient:null);
      if(!client?.rpc)return;
      const {data:result,error}=await client.rpc('public_studio_profile',{p_card_id:id});
      if(error)throw error;
      if(result){
        profile=result;
        if(!Array.isArray(profile.specialties)||!profile.specialties.length)profile.specialties=[profile.primary_type||'other'];
        renderSpecialties();renderNav();
      }
    }catch(error){console.warn('Studio profile lookup skipped:',error);}
  }

  function refresh(){
    if(!studio())return false;
    ensureInfo();
    renderNav();
    renderSpecialties();
    decorateHome();
    decorateBookingRoom();
    void loadProfile();
    return true;
  }

  window.addEventListener('liw:studio-ready',refresh,{passive:true});
  window.addEventListener('liw:studio-type-ready',()=>{loadedId='';refresh();},{passive:true});
  window.addEventListener('liw:barber-client-ready',refresh,{passive:true});
  window.addEventListener('liw:card-loader-ready',refresh,{passive:true});
  window.addEventListener('liw:client-room-view',event=>{
    const view=String(event.detail?.view||'home');
    if(view==='book'){setActive('book');setTimeout(decorateBookingRoom,0);return;}
    if(view==='home'){setActive('home');decorateHome();return;}
    if(view==='cuts'){setActive('services');return;}
    if(view==='gallery'){setActive('gallery');return;}
  },{passive:true});
  window.addEventListener('load',refresh,{once:true,passive:true});
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-barber-frame-home]'))setActive('home');
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
  setTimeout(refresh,180);
  setTimeout(refresh,700);

  window.LIWStudioPublicV2={refresh,get profile(){return profile;}};
})();