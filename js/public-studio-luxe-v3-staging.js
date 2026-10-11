/* LIW Cards staging — Studio Luxe V3.
   Editorial Studio layer: profession-aware moods, luxe room language, social,
   portfolio and service polish. Keeps V2/stable room engine underneath. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_LUXE_V3__)return;
  window.__LIW_STUDIO_LUXE_V3__=true;
  if(new URLSearchParams(location.search).get('embed')==='1')return;

  const q=(s,scope=document)=>scope.querySelector(s);
  const qa=(s,scope=document)=>Array.from(scope.querySelectorAll(s));
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:{};}catch(_){return {};}};
  const room=()=>window.LIWBarberClientRoom||null;
  const isStudio=()=>document.documentElement.classList.contains('liw-public-studio');

  const GLAM=new Set(['nails','lashes','brows','makeup','spraytan','pmu','cosmetics']);
  const SOFT=new Set(['hair','braider','loctician','wig','esthetician','wax','massage','spa','salon']);
  const CREATIVE=new Set(['tattoo','piercing','toothgem']);

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function type(){
    const profile=window.LIWStudioPublicV2?.profile;
    return String(profile?.primary_type||document.documentElement.dataset.studioBusinessType||q('#card')?.dataset.studioBusinessType||'other').toLowerCase();
  }
  function moodFor(t){
    if(GLAM.has(t))return 'glam';
    if(SOFT.has(t))return 'soft';
    if(CREATIVE.has(t))return 'creative';
    return 'pro';
  }
  function typeLabel(){
    const profile=window.LIWStudioPublicV2?.profile;
    const key=type();
    if(key==='other'&&profile?.custom_specialty)return String(profile.custom_specialty);
    const map={
      barber:'Barber',hair:'Hair Stylist',braider:'Braider',loctician:'Loctician',wig:'Wig / Install Specialist',
      nails:'Nail Tech',lashes:'Lash Artist',brows:'Brow Artist',makeup:'Makeup Artist',
      esthetician:'Esthetician',wax:'Wax Specialist',massage:'Massage Therapist',spa:'Spa / Wellness',
      spraytan:'Spray Tan Artist',pmu:'Permanent Makeup Artist',tattoo:'Tattoo Artist',piercing:'Piercer',
      toothgem:'Tooth Gem Artist',cosmetics:'Beauty / Cosmetics',salon:'Salon / Multi-Service Studio',other:'Studio Professional'
    };
    return map[key]||'Studio Professional';
  }
  function tagline(){
    const mood=moodFor(type());
    if(mood==='glam')return 'Your look. Elevated.';
    if(mood==='creative')return 'Original work. Made personal.';
    if(mood==='soft')return 'Crafted care. Signature results.';
    return 'Professional service. Personal style.';
  }
  function setImportant(el,name,value){
    if(el)try{el.style.setProperty(name,value,'important');}catch(_){}
  }
  function theme(){
    const d=data();
    return {
      bg:String(d.background_color||'#ffffff'),
      text:String(d.text_color||'#111827'),
      accent:String(d.secondary_color||'#d4a84f')
    };
  }

  function applyMood(){
    if(!isStudio())return;
    const mood=moodFor(type());
    document.documentElement.dataset.studioMood=mood;
    if(document.body)document.body.dataset.studioMood=mood;
  }

  function decorateHome(){
    if(!isStudio())return false;
    const home=q('.barber-client-home');
    if(!home)return false;
    home.dataset.studioHomeV2='true';

    let brand=q('.studio-luxe-brandline',home);
    if(!brand){
      brand=document.createElement('div');
      brand.className='studio-luxe-brandline';
      const h1=q('h1',home);
      if(h1)h1.insertAdjacentElement('beforebegin',brand);
      else home.prepend(brand);
    }
    brand.textContent='LIW STUDIO · '+typeLabel();

    let line=q('.studio-luxe-tagline',home);
    if(!line){
      line=document.createElement('p');
      line.className='studio-luxe-tagline';
      const h1=q('h1',home);
      if(h1)h1.insertAdjacentElement('afterend',line);
      else home.appendChild(line);
    }
    line.textContent=tagline();

    const promoLabel=q('.barber-client-promo-label span:last-child',home);
    if(promoLabel)promoLabel.textContent=moodFor(type())==='creative'?'FEATURED WORK':'STUDIO SPOTLIGHT';

    const book=q('[data-studio-home-book]',home);
    if(book){
      const span=q('span',book);
      if(span){
        const mood=moodFor(type());
        span.textContent=mood==='glam'?'Reserve Your Session':mood==='creative'?'Request Your Session':'Book Your Appointment';
      }
    }
    return true;
  }

  function roomWords(view){
    const t=type();
    const mood=moodFor(t);
    const map={
      home:['LIW STUDIO','Home'],
      cuts:['SIGNATURE SERVICES',t==='tattoo'?'Tattoo Services':t==='nails'?'Nail Services':'Services'],
      gallery:[mood==='creative'?'FEATURED WORK':'THE LOOKBOOK',t==='makeup'?'Looks':t==='esthetician'||t==='lashes'||t==='brows'?'Results':'Portfolio'],
      social:['STUDIO SOCIAL','Connect'],
      map:['VISIT THE STUDIO','Location'],
      reviews:['CLIENT LOVE','Reviews'],
      shop:['SHOP THE STUDIO','Shop'],
      inquiry:['LET’S CONNECT','Inquiry'],
      book:['STUDIO BOOKING',mood==='glam'?'Reserve Your Session':mood==='creative'?'Request Your Session':'Book Your Appointment']
    };
    return map[view]||['LIW STUDIO','Explore'];
  }

  function decorateChrome(view){
    if(!isStudio())return;
    const top=q('.barber-iframe-top');
    if(top){
      const [eyebrow,title]=roomWords(view);
      const small=q('small',top);if(small)small.textContent=eyebrow;
      const strong=q('[data-barber-frame-title]',top);if(strong)strong.textContent=title;
      const live=q('.barber-iframe-live',top);if(live)live.textContent='LIW STUDIO';
      const back=q('[data-barber-frame-home]',top);if(back)back.setAttribute('aria-label','Back to Studio home');
    }
    const booking=q('.studio-booking-head');
    if(view==='book'&&booking){
      const [eyebrow,title]=roomWords('book');
      const small=q('small',booking);if(small)small.textContent=eyebrow;
      const strong=q('strong',booking);if(strong)strong.textContent=title;
      const sub=q('[data-studio-booking-sub]',booking);
      if(sub){
        const company=String(data().company_name||'').trim();
        sub.textContent=(company?company+' · ':'')+typeLabel();
      }
    }
  }

  const SOCIAL_NOTES={
    instagram:'Portfolio drops · transformations · openings',
    tiktok:'Behind the scenes · trends · transformations',
    threads:'Studio updates · conversations · availability',
    x:'Announcements · drops · updates',
    facebook:'Updates · reviews · community',
    youtube:'Tutorials · transformations · long-form',
    pinterest:'Inspiration · looks · saved ideas',
    linkedin:'Professional updates · brand news'
  };

  function platformName(anchor){
    const spans=qa('span',anchor);
    const label=spans.find(s=>!s.classList.contains('social-brand-icon')&&!s.dataset.barberSocialArrow);
    return String(label?.textContent||anchor.textContent||'Social').trim().replace(/\s+/g,' ').slice(0,40);
  }

  function decorateSocial(){
    const section=q('#social-section');
    const list=q('#socials',section)||q('.public-socials',section);
    if(!section||!list)return false;
    const t=theme();
    const hero=q('[data-barber-social-premium-hero]',section);
    if(hero){
      const kicker=q('span',hero),title=q('strong',hero),copy=q('p',hero);
      if(kicker)kicker.textContent='STUDIO SOCIAL';
      if(title)title.textContent='Stay in the look';
      if(copy)copy.textContent='Fresh work, openings and behind-the-scenes moments — follow the Studio where you spend your time.';
      setImportant(hero,'border-radius','24px');
      setImportant(hero,'padding','19px 18px');
      setImportant(hero,'border','1px solid color-mix(in srgb,'+t.accent+' 22%,transparent)');
      setImportant(hero,'background','radial-gradient(circle at 96% 0,color-mix(in srgb,var(--studio-luxe-glow) 18%,transparent),transparent 34%),linear-gradient(145deg,color-mix(in srgb,'+t.bg+' 92%,'+t.text+' 8%),'+t.bg+')');
      setImportant(title,'color',t.text);
      setImportant(copy,'color','color-mix(in srgb,'+t.text+' 64%,transparent)');
      setImportant(kicker,'color',t.accent);
    }

    const links=qa('a,button',list).filter(el=>!el.hidden);
    links.forEach((anchor,index)=>{
      const name=platformName(anchor);
      const key=name.toLowerCase();
      const noteText=Object.entries(SOCIAL_NOTES).find(([k])=>key.includes(k))?.[1]||'Latest work · Studio updates · availability';
      anchor.dataset.studioLuxeSocial='true';
      setImportant(anchor,'min-height','82px');
      setImportant(anchor,'padding','12px 14px');
      setImportant(anchor,'border-radius','22px');
      setImportant(anchor,'border','1px solid color-mix(in srgb,'+t.text+' 10%,var(--studio-luxe-glow) 10%)');
      setImportant(anchor,'background','linear-gradient(135deg,color-mix(in srgb,'+t.bg+' 93%,'+t.text+' 7%),color-mix(in srgb,'+t.bg+' 96%,var(--studio-luxe-glow) 4%))');
      setImportant(anchor,'box-shadow','0 14px 28px color-mix(in srgb,'+t.text+' 10%,transparent),inset 0 1px 0 rgba(255,255,255,.14)');
      const label=qa('span',anchor).find(s=>!s.classList.contains('social-brand-icon')&&!s.dataset.barberSocialArrow&&!s.dataset.studioSocialNote);
      if(label){
        setImportant(label,'grid-column','2');
        setImportant(label,'grid-row','1');
        setImportant(label,'align-self','end');
        setImportant(label,'font-size','.92rem');
        setImportant(label,'font-weight','900');
        setImportant(label,'color',t.text);
      }
      let note=q('[data-studio-social-note]',anchor);
      if(!note){
        note=document.createElement('small');
        note.dataset.studioSocialNote='true';
        anchor.appendChild(note);
      }
      note.textContent=noteText;
      setImportant(note,'grid-column','2');
      setImportant(note,'grid-row','2');
      setImportant(note,'align-self','start');
      setImportant(note,'font-size','.56rem');
      setImportant(note,'font-weight','700');
      setImportant(note,'line-height','1.35');
      setImportant(note,'color','color-mix(in srgb,'+t.text+' 56%,transparent)');
      const arrow=q('[data-barber-social-arrow]',anchor);
      if(arrow){setImportant(arrow,'grid-column','3');setImportant(arrow,'grid-row','1 / span 2');}
      anchor.style.setProperty('--studio-card-index',String(index));
    });
    const note=q('[data-barber-social-premium-note]',section);
    if(note)note.textContent='Follow the Studio for new work, openings and updates.';
    return true;
  }

  function ensureRoomHero(section,typeName,title,copy){
    if(!section)return;
    let hero=q('[data-studio-room-hero]',section);
    if(!hero){
      hero=document.createElement('div');
      hero.dataset.studioRoomHero='true';
      hero.style.cssText='display:grid;gap:5px;margin:0 0 15px;padding:16px 16px 15px;border-radius:22px;';
      section.prepend(hero);
    }
    const t=theme();
    hero.innerHTML='<small>'+esc(typeName)+'</small><strong>'+esc(title)+'</strong><p>'+esc(copy)+'</p>';
    setImportant(hero,'border','1px solid color-mix(in srgb,'+t.text+' 10%,var(--studio-luxe-glow) 10%)');
    setImportant(hero,'background','radial-gradient(circle at 94% 0,color-mix(in srgb,var(--studio-luxe-glow) 14%,transparent),transparent 36%),linear-gradient(145deg,color-mix(in srgb,'+t.bg+' 93%,'+t.text+' 7%),'+t.bg+')');
    setImportant(q('small',hero),'color',t.accent);
    setImportant(q('small',hero),'font-size','.55rem');
    setImportant(q('small',hero),'font-weight','950');
    setImportant(q('small',hero),'letter-spacing','.14em');
    setImportant(q('strong',hero),'color',t.text);
    setImportant(q('strong',hero),'font-size','1.18rem');
    setImportant(q('strong',hero),'letter-spacing','-.025em');
    setImportant(q('p',hero),'margin','0');
    setImportant(q('p',hero),'color','color-mix(in srgb,'+t.text+' 62%,transparent)');
    setImportant(q('p',hero),'font-size','.68rem');
    setImportant(q('p',hero),'line-height','1.45');
  }

  function decorateGallery(){
    const section=q('#public-rich-sections [data-public-rich="gallery"]')||q('[data-public-rich="gallery"]');
    if(!section)return false;
    ensureRoomHero(section,'THE LOOKBOOK','See the work','Signature looks, transformations and recent Studio work.');
    const grid=q('.public-gallery-grid',section)||section;
    qa('img',grid).forEach(img=>{
      setImportant(img,'border-radius','18px');
      setImportant(img,'box-shadow','0 12px 28px rgba(15,23,42,.13)');
      setImportant(img,'border','1px solid rgba(255,255,255,.16)');
      setImportant(img,'object-fit','cover');
    });
    return true;
  }

  function decorateServices(){
    const section=q('#services-section');
    if(!section)return false;
    const creative=moodFor(type())==='creative';
    ensureRoomHero(section,'SIGNATURE SERVICES',creative?'Choose your work':'Choose your service',creative?'Explore available work, options and appointment details.':'Explore services, pricing and appointment options.');
    const t=theme();
    qa('.public-service-item,.service-card,#services > *',section).forEach(card=>{
      setImportant(card,'border-radius','20px');
      setImportant(card,'border','1px solid color-mix(in srgb,'+t.text+' 10%,var(--studio-luxe-glow) 8%)');
      setImportant(card,'background','linear-gradient(145deg,color-mix(in srgb,'+t.bg+' 94%,'+t.text+' 6%),'+t.bg+')');
      setImportant(card,'box-shadow','0 11px 25px color-mix(in srgb,'+t.text+' 8%,transparent)');
    });
    return true;
  }

  function decorateBooking(){
    const host=q('.barber-booking-host');
    if(!host||host.hidden)return false;
    host.dataset.studioBookingRoom='true';
    const section=q('#booking-v1-section',host);
    if(section)section.dataset.studioBookingSurface='true';
    decorateChrome('book');
    return true;
  }

  function decorateSource(key){
    if(key==='social')decorateSocial();
    if(key==='gallery')decorateGallery();
    if(key==='cuts')decorateServices();
  }

  function wrapRoom(){
    const api=room();
    if(!api||typeof api.setRoom!=='function'||api.setRoom.__liwStudioLuxeWrapped)return false;
    const original=api.setRoom.bind(api);
    const wrapped=function(key){
      const result=original(key);
      decorateSource(key);
      setTimeout(()=>decorateChrome(key),0);
      if(key==='book'){setTimeout(decorateBooking,0);setTimeout(decorateBooking,180);}
      return result;
    };
    wrapped.__liwStudioLuxeWrapped=true;
    api.setRoom=wrapped;
    return true;
  }

  function refresh(){
    if(!isStudio())return false;
    applyMood();
    decorateHome();
    decorateSocial();
    decorateGallery();
    decorateServices();
    decorateBooking();
    wrapRoom();
    const view=String(q('#card')?.dataset.barberClientView||'home');
    decorateChrome(view);
    return true;
  }

  window.addEventListener('liw:studio-type-ready',refresh,{passive:true});
  window.addEventListener('liw:barber-client-ready',refresh,{passive:true});
  window.addEventListener('liw:card-loader-ready',refresh,{passive:true});
  window.addEventListener('liw:client-room-view',e=>{
    const view=String(e.detail?.view||'home');
    applyMood();
    decorateSource(view);
    setTimeout(()=>decorateChrome(view),0);
    if(view==='book'){setTimeout(decorateBooking,30);setTimeout(decorateBooking,180);}
    if(view==='home')setTimeout(decorateHome,0);
  },{passive:true});
  window.addEventListener('load',refresh,{once:true,passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});
  else refresh();
  setTimeout(refresh,220);
  setTimeout(refresh,800);

  window.LIWStudioLuxeV3={refresh};
})();