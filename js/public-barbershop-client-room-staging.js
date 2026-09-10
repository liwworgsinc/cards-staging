/* LIW Cards staging — Barbershop client room V5.
   Lightweight startup: Home only. Rich rooms and booking surfaces are created on demand.
   No broad MutationObserver and no startup iframe work. */
(function(){
  'use strict';
  if(window.__LIW_BARBER_CLIENT_ROOM_STAGING__)return;
  window.__LIW_BARBER_CLIENT_ROOM_STAGING__=true;

  const MODE='barbershop';
  const FRAME_KEYS=new Set(['cuts','gallery','map','reviews','social','shop','inquiry']);
  const TITLES={cuts:'Cuts & Services',gallery:'Fresh Cuts Gallery',map:'Find the Shop',reviews:'Client Reviews',social:'Social',shop:'Shop',inquiry:'Inquiry'};
  let card=null;
  let content=null;
  let stage=null;
  let home=null;
  let frameShell=null;
  let frame=null;
  let bookingHost=null;
  let bookingObserver=null;
  let bookingObserverTimer=0;
  let activeRoom='home';
  let mounted=false;
  let messageBound=false;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const safe=(value,max=900)=>String(value??'').trim().slice(0,max);
  const esc=value=>safe(value,1800).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const data=()=>{try{return typeof publicCard!=='undefined'&&publicCard?publicCard:null;}catch(_){return null;}};
  const color=(value,fallback)=>/^#[0-9a-f]{3,8}$/i.test(String(value||''))?String(value):fallback;

  function isBarber(cardData){
    return String(cardData?.color_mode||'').trim().toLowerCase()===MODE&&
      String(cardData?.card_experience||'classic').trim().toLowerCase()!=='music';
  }

  function directNativeBookingReady(){
    const cardData=data()||{};
    const access=globalThis.publicCardFeatureAccess||{};
    return Boolean(
      q('#booking-v1-section')||
      q('[data-liw-native-booking-action]')||
      (cardData.booking_enabled===true&&access.appointment_booking===true)
    );
  }

  function suppressExternalBooking(){
    const cardData=data();
    if(!cardData)return;
    if(!cardData.__barberExternalBookingSuppressed){
      cardData.__barberExternalBookingSuppressed=true;
      cardData.__barberExternalBookingUrl=safe(cardData.booking_url,1200);
      cardData.booking_url='';
    }
    q('[data-event="booking_click"]')?.remove();
  }

  function rich(type){
    return q(`#public-rich-sections [data-public-rich="${type}"]`)||q(`[data-public-rich="${type}"]`);
  }

  function sourceFor(key){
    if(key==='cuts')return q('#services-section');
    if(key==='gallery')return rich('gallery');
    if(key==='map')return rich('location');
    if(key==='reviews')return rich('testimonials');
    if(key==='social')return q('#social-section');
    if(key==='shop')return q('#products-section');
    if(key==='inquiry')return q('#lead-section');
    return null;
  }

  function sourceConfigured(key){
    const source=sourceFor(key);
    if(key==='map')return Boolean(source||safe(data()?.business_address,260));
    if(!source)return false;
    if(key==='cuts')return Boolean(q('#services > *',source)||q('.public-service-item,.service-card',source));
    if(key==='social')return Boolean(q('#socials a,#socials button,.public-socials a,.public-socials button',source));
    if(key==='shop')return Boolean(q('#products > *,.public-product-card,.product-card',source));
    if(key==='inquiry')return Boolean(q('#lead-form',source));
    return Boolean(safe(source.textContent,1000)||q('img,iframe,a,button',source));
  }

  function displayBarberName(cardData){
    const raw=safe(cardData.full_name||cardData.name,120);
    if(!raw||/^untitled\s+card$/i.test(raw)){
      const shop=safe(cardData.company_name,120);
      return shop&&!/^the\s+barbershop$/i.test(shop)?shop:'Your Barber';
    }
    return raw;
  }

  function buildHome(){
    const cardData=data()||{};
    const barber=displayBarberName(cardData);
    const shop=safe(cardData.company_name,120)||'The Barbershop';
    const specialty=safe(cardData.job_title||cardData.title,140)||'Fresh cuts · clean finish';
    const promo=safe(cardData.headline,240)||'Fresh cuts. Sharp details. Leave the chair looking ready.';
    const bio=safe(cardData.biography||cardData.bio,360)||'Welcome in. Browse fresh work, find the shop, or send an inquiry from the barber rail below.';
    const signature=[barber,shop,specialty,promo,bio].join('|');
    if(home.dataset.signature===signature)return;
    home.dataset.signature=signature;
    home.innerHTML=`
      <div class="barber-welcome-kicker"><span></span> WELCOME TO ${esc(shop).toUpperCase()}</div>
      <h1>${esc(barber)}</h1>
      <p class="barber-welcome-specialty">${esc(specialty)}</p>
      <div class="barber-client-promo">
        <div class="barber-client-promo-label"><span class="barber-promo-symbol" aria-hidden="true">✦</span><span>CLIENT PROMO</span></div>
        <strong>${esc(promo)}</strong>
        <p>${esc(bio)}</p>
      </div>
      <div class="barber-client-hint"><span class="barber-hint-symbol" aria-hidden="true">✂</span><span>Call, Text, Book and Save act instantly. Cuts, Gallery, Map and more open in the client room.</span></div>`;
  }

  function ensureBaseStage(){
    if(stage?.isConnected){buildHome();return stage;}
    stage=q('.barber-client-stage',content);
    if(!stage){
      stage=document.createElement('div');
      stage.className='barber-client-stage';
      content.prepend(stage);
    }
    home=q('.barber-client-home',stage);
    if(!home){
      home=document.createElement('section');
      home.className='barber-client-home';
      home.dataset.barberRoom='home';
      stage.appendChild(home);
    }
    buildHome();
    return stage;
  }

  function ensureFrameSurface(){
    ensureBaseStage();
    if(frameShell?.isConnected&&frame)return frame;
    frameShell=q('.barber-iframe-shell',stage);
    if(!frameShell){
      frameShell=document.createElement('section');
      frameShell.className='barber-iframe-shell';
      frameShell.hidden=true;
      frameShell.innerHTML='<div class="barber-iframe-top"><button type="button" data-barber-frame-home aria-label="Back to barber welcome">←</button><div><small>CLIENT ROOM</small><strong data-barber-frame-title>Explore</strong></div><span class="barber-iframe-live">LIVE</span></div><iframe class="barber-client-iframe" title="Barbershop client content" loading="lazy" sandbox="allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox"></iframe>';
      stage.appendChild(frameShell);
      q('[data-barber-frame-home]',frameShell)?.addEventListener('click',showHome);
    }
    frame=q('.barber-client-iframe',frameShell);
    if(!messageBound){
      window.addEventListener('message',handleMessage);
      messageBound=true;
    }
    return frame;
  }

  function ensureBookingHost(){
    ensureBaseStage();
    if(bookingHost?.isConnected)return bookingHost;
    bookingHost=q('.barber-booking-host',stage);
    if(!bookingHost){
      bookingHost=document.createElement('section');
      bookingHost.className='barber-booking-host';
      bookingHost.hidden=true;
      stage.appendChild(bookingHost);
    }
    return bookingHost;
  }

  function cleanClone(source){
    if(!source)return '';
    const clone=source.cloneNode(true);
    clone.removeAttribute('hidden');
    clone.hidden=false;
    clone.removeAttribute('data-barber-source-only');
    qa('[hidden]',clone).forEach(el=>{
      if(el.matches('input[type="hidden"],[aria-hidden="true"]'))return;
      el.removeAttribute('hidden');
    });
    qa('[data-barber-legacy-middle]',clone).forEach(el=>el.removeAttribute('data-barber-legacy-middle'));
    qa('script',clone).forEach(el=>el.remove());
    return clone.outerHTML;
  }

  function fallbackMap(){
    const address=safe(data()?.business_address,260);
    if(!address)return '';
    const encoded=encodeURIComponent(address);
    return `<section class="public-rich-section"><div class="public-rich-head"><h2>Find the shop</h2><span>Map & directions</span></div><div class="public-location-card"><iframe class="public-map-frame" title="Map showing ${esc(address)}" loading="lazy" src="https://www.google.com/maps?q=${encoded}&output=embed"></iframe><div class="public-location-address">${esc(address)}</div><a class="public-rich-action" href="https://www.google.com/maps/search/?api=1&query=${encoded}" target="_blank" rel="noopener">Open directions</a></div></section>`;
  }

  function roomMarkup(key){
    const source=sourceFor(key);
    if(sourceConfigured(key))return cleanClone(source);
    if(key==='map')return fallbackMap();
    return `<div class="barber-frame-empty"><strong>${esc(TITLES[key]||'Coming soon')}</strong><span>This barber has not added this section yet.</span></div>`;
  }

  function frameDocument(key,markup){
    const cardData=data()||{};
    const primary=color(cardData.primary_color,'#111111');
    const accent=color(cardData.secondary_color,'#d4a84f');
    const background=color(cardData.background_color,'#090909');
    const text=color(cardData.text_color,'#f8f4e8');
    const inquiryScript=key==='inquiry'?`document.addEventListener('submit',function(e){var f=e.target.closest('form');if(!f)return;e.preventDefault();var o={};new FormData(f).forEach(function(v,k){o[k]=String(v)});parent.postMessage({type:'liw-barber-inquiry-submit',payload:o},'*');var b=f.querySelector('button[type="submit"]');if(b){b.disabled=true;b.textContent='Sending through LIW…';}});window.addEventListener('message',function(e){if(!e.data||e.data.type!=='liw-barber-inquiry-status')return;var b=document.querySelector('button[type="submit"]');if(b){b.disabled=false;b.textContent=e.data.ok?'Sent':'Send inquiry';}var n=document.getElementById('barber-frame-note');if(n)n.textContent=e.data.ok?'Your inquiry was handed to LIW.':'Please check the form and try again.';});`:'';
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>
      :root{--p:${primary};--a:${accent};--bg:${background};--t:${text};color-scheme:dark}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--t);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}body{overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:15px 14px 28px}a{color:inherit}.public-section,.public-rich-section{display:block!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;color:var(--t)!important}.public-section-heading,.public-rich-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:0 0 13px;padding:0 0 10px;border-bottom:1px solid color-mix(in srgb,var(--a) 22%,transparent)}.public-section-heading h2,.public-rich-head h2{margin:0;color:var(--t)!important;font-size:1.18rem;line-height:1.1}.public-section-heading span,.public-rich-head span{color:var(--a)!important;font-size:.65rem;font-weight:900;letter-spacing:.04em}.public-service-list,#services,.public-product-grid,#products,.public-socials,#socials{display:grid!important;gap:10px!important}.public-service-item,.service-card,.public-product-card,.product-card,.public-testimonial,.public-location-card{border:1px solid color-mix(in srgb,var(--a) 20%,transparent)!important;border-radius:16px!important;background:color-mix(in srgb,var(--p) 78%,var(--bg))!important;color:var(--t)!important;padding:13px!important;box-shadow:none!important}.public-gallery-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.public-gallery-grid button{padding:0;border:0;border-radius:15px;overflow:hidden;background:#111;aspect-ratio:1;cursor:pointer}.public-gallery-grid img{display:block;width:100%;height:100%;object-fit:cover}.public-testimonial-list{display:grid;gap:10px}.public-testimonial blockquote{margin:8px 0;color:var(--t);line-height:1.5}.public-testimonial-stars{color:var(--a)}.public-map-frame{display:block;width:100%;height:235px;border:0;border-radius:14px;margin-bottom:10px;background:#111}.public-location-address{margin:8px 0 12px;font-weight:750;line-height:1.4}.public-rich-action,.public-cta-link,.public-featured-link{display:flex!important;align-items:center!important;justify-content:center!important;min-height:43px;padding:10px 13px!important;border-radius:999px!important;border:1px solid color-mix(in srgb,var(--a) 48%,transparent)!important;background:var(--a)!important;color:#17120a!important;text-decoration:none!important;font-weight:900!important}.public-socials a,#socials a{display:flex!important;align-items:center!important;gap:10px!important;min-height:44px;padding:10px 12px!important;border:1px solid color-mix(in srgb,var(--a) 18%,transparent)!important;border-radius:14px!important;background:rgba(255,255,255,.04)!important;text-decoration:none!important}.lead-capture-section form,#lead-form{display:grid!important;gap:10px!important}.lead-form-row{display:grid!important;grid-template-columns:1fr!important;gap:10px!important}input,select,textarea{width:100%;border:1px solid color-mix(in srgb,var(--a) 20%,transparent);border-radius:12px;background:rgba(255,255,255,.06);color:var(--t);padding:11px 12px;font:inherit}textarea{min-height:110px;resize:vertical}button[type="submit"]{min-height:44px;border:0;border-radius:999px;background:var(--a);color:#17120a;font-weight:950}.barber-frame-empty{min-height:220px;display:grid;place-items:center;align-content:center;gap:6px;text-align:center;color:rgba(255,255,255,.62)}.barber-frame-empty strong{color:var(--t);font-size:1.05rem}.barber-frame-empty span{font-size:.78rem}.barber-frame-lightbox{position:fixed;inset:0;z-index:99;display:none;place-items:center;padding:20px;background:rgba(0,0,0,.92)}.barber-frame-lightbox.open{display:grid}.barber-frame-lightbox img{max-width:100%;max-height:78vh;border-radius:16px}.barber-frame-lightbox button{position:absolute;right:15px;top:15px;width:40px;height:40px;border:0;border-radius:50%;background:#fff;color:#111;font-size:24px}#barber-frame-note{margin-top:8px;color:var(--a);font-size:.72rem;text-align:center}
    </style></head><body><main>${markup}<div id="barber-frame-note"></div></main><div class="barber-frame-lightbox" id="barber-frame-lightbox"><button type="button" aria-label="Close">×</button><img alt=""></div><script>(function(){var l=document.getElementById('barber-frame-lightbox');document.addEventListener('click',function(e){var b=e.target.closest('[data-rich-gallery-image]');if(b){e.preventDefault();var i=l.querySelector('img');i.src=b.dataset.richGalleryImage||b.querySelector('img')?.src||'';i.alt=b.dataset.richGalleryCaption||'Gallery image';l.classList.add('open');return;}if(e.target===l||e.target.closest('#barber-frame-lightbox>button'))l.classList.remove('open');});${inquiryScript}})();<\/script></body></html>`;
  }

  function openFrame(key){
    if(!FRAME_KEYS.has(key))return;
    ensureFrameSurface();
    activeRoom=key;
    if(home)home.hidden=true;
    if(bookingHost)bookingHost.hidden=true;
    frameShell.hidden=false;
    q('[data-barber-frame-title]',frameShell).textContent=TITLES[key]||'Explore';
    frame.title=TITLES[key]||'Barbershop client content';
    if(frame.dataset.room!==key){
      frame.dataset.room=key;
      frame.srcdoc=frameDocument(key,roomMarkup(key));
    }
    card.dataset.barberClientView=key;
  }

  function showHome(){
    ensureBaseStage();
    activeRoom='home';
    if(frameShell)frameShell.hidden=true;
    if(bookingHost)bookingHost.hidden=true;
    home.hidden=false;
    card.dataset.barberClientView='home';
  }

  function showBookingSection(section){
    const host=ensureBookingHost();
    if(!section||!host)return false;
    activeRoom='book';
    if(frameShell)frameShell.hidden=true;
    home.hidden=true;
    host.hidden=false;
    if(section.parentElement!==host)host.appendChild(section);
    section.hidden=false;
    card.dataset.barberClientView='book';
    host.scrollTop=0;
    return true;
  }

  function clearBookingObserver(){
    if(bookingObserver){bookingObserver.disconnect();bookingObserver=null;}
    if(bookingObserverTimer){clearTimeout(bookingObserverTimer);bookingObserverTimer=0;}
  }

  function waitForNativeAppointment(){
    if(bookingObserver)return;
    ensureBookingHost();
    bookingObserver=new MutationObserver(()=>{
      const section=q('#booking-v1-section');
      if(!section)return;
      clearBookingObserver();
      card?.classList.add('barber-native-booking-ready');
      showBookingSection(section);
    });
    bookingObserver.observe(content,{childList:true,subtree:true});
    bookingObserverTimer=setTimeout(()=>{
      clearBookingObserver();
      showHome();
    },3000);
  }

  function openNativeAppointment(){
    const section=q('#booking-v1-section');
    if(section){showBookingSection(section);return;}
    const nativeAction=q('[data-liw-native-booking-action]');
    if(nativeAction){
      nativeAction.click();
      const after=q('#booking-v1-section');
      if(after)showBookingSection(after);else waitForNativeAppointment();
      return;
    }
    if(directNativeBookingReady())waitForNativeAppointment();
  }

  function setRoom(key){
    if(key==='home'){showHome();return;}
    if(key==='book'){openNativeAppointment();return;}
    if(FRAME_KEYS.has(key))openFrame(key);
  }

  function hideLegacyMiddleChrome(){
    card.classList.add('barber-client-room-active','barber-iframe-room-active');
    ['#about-section','#name','#title','#company','#headline','#bio','#actions','#save','#business-actions','#branding'].forEach(selector=>{
      const el=q(selector,content);
      if(el)el.dataset.barberLegacyMiddle='true';
    });
  }

  function submitInquiry(payload){
    const form=q('#lead-form');
    if(!form||!frame)return;
    Object.entries(payload||{}).forEach(([name,value])=>{
      let field=null;
      try{field=form.elements?.namedItem(name)||form.querySelector(`[name="${CSS.escape(name)}"]`);}catch(_){field=form.elements?.namedItem(name)||null;}
      if(field&&'value' in field)field.value=String(value??'');
    });
    let ok=true;
    try{
      if(typeof form.requestSubmit==='function')form.requestSubmit();
      else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    }catch(_){ok=false;}
    try{frame.contentWindow?.postMessage({type:'liw-barber-inquiry-status',ok},'*');}catch(_){ }
  }

  function handleMessage(event){
    if(!frame||event.source!==frame.contentWindow)return;
    if(event.data?.type==='liw-barber-inquiry-submit')submitInquiry(event.data.payload||{});
  }

  function mount(){
    const cardData=data();
    card=q('#card');
    if(!cardData||!card||card.hidden||!isBarber(cardData))return false;
    content=q('.public-content',card);
    if(!content)return false;
    suppressExternalBooking();
    ensureBaseStage();
    hideLegacyMiddleChrome();
    card.classList.toggle('barber-native-booking-ready',directNativeBookingReady());
    if(!mounted){
      mounted=true;
      try{window.dispatchEvent(new CustomEvent('liw:barber-client-ready'));}catch(_){ }
    }
    if(activeRoom==='home')showHome();
    return true;
  }

  window.LIWBarberClientRoom={mount,setRoom,openNativeAppointment,sourceConfigured};
  window.addEventListener('liw:card-loader-ready',mount,{passive:true});
  window.addEventListener('load',mount,{once:true,passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();