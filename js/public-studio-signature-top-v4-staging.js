/* LIW Cards staging — Studio Signature Top V4.
   Experience composition only; selected LIW template remains the visual skin. */
(function(){
  'use strict';
  if(window.__LIW_STUDIO_SIGNATURE_TOP_V4__)return;
  window.__LIW_STUDIO_SIGNATURE_TOP_V4__=true;
  if(new URLSearchParams(location.search).get('embed')==='1')return;

  const LABELS={
    barber:'Barber',hair:'Hair Stylist',braider:'Braider',loctician:'Loctician',
    wig:'Wig / Install Specialist',nails:'Nail Tech',lashes:'Lash Artist',
    brows:'Brow Artist',makeup:'Makeup Artist',esthetician:'Esthetician',
    wax:'Wax Specialist',massage:'Massage Therapist',spa:'Spa / Wellness',
    spraytan:'Spray Tan Artist',pmu:'Permanent Makeup Artist',tattoo:'Tattoo Artist',
    piercing:'Piercer',toothgem:'Tooth Gem Artist',cosmetics:'Beauty / Cosmetics',
    salon:'Salon / Multi-Service Studio',other:'Studio Professional'
  };

  let lastSignature='';
  const q=(s,scope=document)=>scope.querySelector(s);
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:{};}catch(_){return {};}};
  const room=()=>window.LIWBarberClientRoom||null;
  const profile=()=>window.LIWStudioPublicV2?.profile||null;
  const isStudio=()=>document.documentElement.classList.contains('liw-public-studio');

  function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
  function primary(){
    const p=profile();
    return String(p?.primary_type||document.documentElement.dataset.studioBusinessType||q('#card')?.dataset.studioBusinessType||data().studio_business_type||'other').toLowerCase();
  }
  function label(key){
    const p=profile();
    if(key==='other'&&p?.custom_specialty)return String(p.custom_specialty).trim()||LABELS.other;
    return LABELS[key]||LABELS.other;
  }
  function specialtyList(){
    const p=profile();
    const first=primary();
    const arr=Array.isArray(p?.specialties)?p.specialties.filter(Boolean):Array.isArray(data().studio_specialties)?data().studio_specialties.filter(Boolean):[];
    const unique=[first,...arr].filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,6);
    return unique.length?unique:[first];
  }
  function name(){
    const d=data();
    const raw=String(d.full_name||d.name||'').trim();
    return raw&&!/^untitled\s+card$/i.test(raw)?raw:String(d.company_name||label(primary())).trim();
  }
  function company(){return String(data().company_name||'').trim();}
  function titleLine(){
    const d=data();
    const job=String(d.job_title||d.title||'').trim();
    const specs=specialtyList().map(label);
    if(job&&!specs.some(v=>v.toLowerCase()===job.toLowerCase()))specs.unshift(job);
    return specs.slice(0,4).join(' · ')||label(primary());
  }
  function bookingReady(){
    const d=data();
    return Boolean(
      d.booking_enabled===true ||
      String(d.booking_url||d.__barberExternalBookingUrl||'').trim() ||
      q('#booking-v1-section') ||
      q('[data-liw-native-booking-action]')
    );
  }
  function servicesReady(){
    try{return Boolean(room()?.sourceConfigured?.('cuts'));}catch(_){return Boolean(q('#services > *'));}
  }
  function locationText(){
    const raw=String(data().business_address||'').trim();
    if(!raw)return '';
    const parts=raw.split(',').map(x=>x.trim()).filter(Boolean);
    return parts.length>1?parts.slice(-2).join(', '):raw;
  }
  function metaHtml(){
    const items=[];
    const loc=locationText();
    if(loc)items.push('<span>'+esc(loc)+'</span>');
    if(bookingReady())items.push('<span>Appointments available</span>');
    return items.join('');
  }

  function bind(identity){
    if(identity.dataset.bound==='1')return;
    identity.dataset.bound='1';
    identity.addEventListener('click',event=>{
      const btn=event.target.closest?.('[data-studio-signature-action]');
      if(!btn)return;
      const action=btn.dataset.studioSignatureAction;
      if(action==='book'){room()?.openNativeAppointment?.();return;}
      if(action==='services'){room()?.setRoom?.('cuts');}
    });
  }

  function render(){
    if(!isStudio())return false;
    const card=q('#card');
    const cover=q('.public-cover',card||document);
    const content=q('.public-content',card||document);
    const home=q('.barber-client-home',card||document);
    if(!card||!cover||!content||!home)return false;

    let identity=q('.studio-signature-identity',card);
    if(!identity){
      identity=document.createElement('section');
      identity.className='studio-signature-identity';
      identity.setAttribute('aria-label','Studio identity');
      bind(identity);
    }
    if(identity.parentElement!==home)home.prepend(identity);

    const specs=specialtyList();
    const signature=[
      name(),company(),titleLine(),specs.join('|'),
      locationText(),bookingReady(),servicesReady()
    ].join('::');
    if(signature===lastSignature&&identity.dataset.rendered==='1')return true;
    lastSignature=signature;

    const chips=specs.map((key,index)=>
      '<span class="studio-signature-chip '+(index===0?'is-primary':'')+'">'+esc(label(key))+'</span>'
    ).join('');

    const actions=[];
    if(bookingReady())actions.push('<button type="button" class="studio-signature-action primary" data-studio-signature-action="book">Book Appointment</button>');
    if(servicesReady())actions.push('<button type="button" class="studio-signature-action secondary" data-studio-signature-action="services">View Services</button>');

    const eyebrow=company()||'LIW Studio';
    identity.innerHTML=
      '<div class="studio-signature-eyebrow">'+esc(eyebrow)+'</div>'+
      '<h1 class="studio-signature-name">'+esc(name())+'</h1>'+
      '<p class="studio-signature-title">'+esc(titleLine())+'</p>'+
      '<div class="studio-signature-specialties" aria-label="Studio specialties">'+chips+'</div>'+
      (actions.length?'<div class="studio-signature-actions" style="grid-template-columns:'+(actions.length===1?'1fr':'minmax(0,1.3fr) minmax(0,1fr)')+'">'+actions.join('')+'</div>':'')+
      '<div class="studio-signature-meta">'+metaHtml()+'</div>';
    identity.dataset.rendered='1';

    const industry=q('.studio-public-industry',cover);
    if(industry){
      const text=q('span',industry);
      if(text)text.textContent=label(primary());
    }

    card.classList.remove('studio-signature-ready');
    requestAnimationFrame(()=>card.classList.add('studio-signature-ready'));
    return true;
  }

  function syncView(event){
    const card=q('#card');
    if(!card)return;
    const view=String(event?.detail?.view||card.dataset.barberClientView||'home');
    card.dataset.barberClientView=view;
    if(view==='home')setTimeout(render,0);
  }

  window.addEventListener('liw:studio-ready',render,{passive:true});
  window.addEventListener('liw:studio-type-ready',()=>{lastSignature='';render();},{passive:true});
  window.addEventListener('liw:barber-client-ready',render,{passive:true});
  window.addEventListener('liw:card-loader-ready',render,{passive:true});
  window.addEventListener('liw:client-room-view',syncView,{passive:true});
  window.addEventListener('load',render,{once:true,passive:true});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});
  else render();
  setTimeout(render,160);
  setTimeout(render,520);
  setTimeout(render,1200);

  window.LIWStudioSignatureTopV4={refresh(){lastSignature='';return render();}};
})();