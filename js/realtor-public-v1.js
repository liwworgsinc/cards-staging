/* LIW Cards staging — Realtor Public Experience V2.
   Dedicated real-estate storefront for card_experience=realtor. No polling loop. */
(function(){
  'use strict';
  const RUNTIME_VERSION='20260918-listing-media-2';
  if(window.__LIW_REALTOR_PUBLIC_RUNTIME_VERSION__===RUNTIME_VERSION)return;
  window.__LIW_REALTOR_PUBLIC_RUNTIME_VERSION__=RUNTIME_VERSION;
  // Keep the legacy flag for older loaders. The current runtime does not trust it
  // as an ownership lock, so a stale Realtor script cannot block this version.
  window.__LIW_REALTOR_PUBLIC_V2__=true;

  const staging=(location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/'))
    || location.hostname==='localhost'
    || location.hostname==='127.0.0.1';
  if(!staging||!location.pathname.toLowerCase().endsWith('/card.html'))return;

  const PRESETS={
    classic:{label:'Classic',dark:'#101114',accent:'#c6a15b',surface:'#f7f4ed',ink:'#15171b'},
    flow:{label:'Flow',dark:'#0c2548',accent:'#4d8fd6',surface:'#f4f8fc',ink:'#11233b'},
    showtime:{label:'Showtime',dark:'#160e24',accent:'#a855f7',surface:'#faf7ff',ink:'#20152e'},
    studio:{label:'Studio',dark:'#24272b',accent:'#8a7353',surface:'#ffffff',ink:'#1c1f22'}
  };
  const LEGACY_PRESETS={luxury:'classic',modern:'flow',clean:'studio',music:'showtime'};
  const STATUS={for_sale:'For Sale',new_listing:'New Listing',coming_soon:'Coming Soon',open_house:'Open House',under_contract:'Under Contract',pending:'Pending',sold:'Sold'};
  let listings=[];
  let utilityData={socials:[],sections:[]};
  let mounted=false;
  let mounting=false;

  const q=(selector,scope=document)=>scope.querySelector(selector);
  const qa=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=cents=>cents==null||cents===''?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(cents)/100);
  const statusLabel=v=>STATUS[v]||'For Sale';
  const normalizePreset=v=>{const raw=String(v||'').toLowerCase();return PRESETS[raw]?raw:(LEGACY_PRESETS[raw]||'classic');};
  const templateLayoutKey=cardData=>{const layout=String(cardData?.card_layout||'classic').trim().toLowerCase();if(['swipe','split'].includes(layout))return 'flow';if(['artist','bold','spotlight','playful'].includes(layout))return 'showtime';if(['minimal','editorial','soft','beauty'].includes(layout))return 'studio';return 'classic';};
  const templateSkin=cardData=>{const base=PRESETS[templateLayoutKey(cardData)]||PRESETS.classic;const radius=Math.max(4,Math.min(32,Number(cardData?.border_radius||14)||14));return {dark:cardData?.primary_color||base.dark,accent:cardData?.secondary_color||base.accent,surface:cardData?.background_color||base.surface,ink:cardData?.text_color||base.ink,button:cardData?.button_color||cardData?.primary_color||base.dark,buttonText:cardData?.button_text_color||'#ffffff',font:cardData?.font_family||'inherit',radius};};
  const bedsLabel=v=>v===0||v==='0'?'Studio':(v!==''&&v!=null?`${v} Beds`:'');
  const bedsShort=v=>v===0||v==='0'?'Studio':(v!==''&&v!=null?`${v} bd`:'');
  const card=()=>{try{return typeof publicCard!=='undefined'?publicCard:null;}catch(_){return null;}};
  const address=l=>[l.address,l.city,l.state,l.zip].filter(Boolean).join(', ');
  const normalize=url=>{if(!url)return '';return /^https?:\/\//i.test(url)?url:`https://${url}`;};
  const initials=name=>String(name||'Agent').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase()||'RE';

  function injectStyles(){
    if(q('#liw-realtor-public-v2-style'))return;
    const style=document.createElement('style');style.id='liw-realtor-public-v2-style';
    style.textContent=`
      body.public-body.realtor-public-page{overflow-x:clip!important;overflow-y:visible!important}.public-shell.realtor-public-shell-host{overflow:visible!important;transform:none!important;filter:none!important;contain:none!important}#card.realtor-public-active>.public-cover,#card.realtor-public-active>.public-content{display:none!important}#card.realtor-public-active{padding:0!important;overflow:visible!important;background:transparent!important;box-shadow:none!important;border:0!important;transform:none!important;filter:none!important;contain:none!important}.realtor-public-shell{--rdark:#101114;--raccent:#c6a15b;--rsurface:#f7f4ed;--rink:#15171b;--rbutton:#101114;--rbuttontext:#fff;--rradius:14px;width:min(100%,720px);margin:0 auto;background:var(--rsurface);color:var(--rink);font-family:var(--rfont,inherit);min-height:100vh;border-radius:28px;overflow:visible!important;box-shadow:0 22px 70px rgba(15,23,42,.16);position:relative}
      .realtor-public-shell.realtor-style-flow{border-radius:32px}.realtor-public-shell.realtor-style-flow .realtor-public-hero{background-image:linear-gradient(145deg,#071a31,#245786)}.realtor-public-shell.realtor-style-showtime .realtor-public-hero{min-height:280px}.realtor-public-shell.realtor-style-showtime .realtor-public-agent h1{font-size:clamp(1.3rem,4vw,1.9rem)}.realtor-public-shell.realtor-style-studio{border-radius:16px}.realtor-public-shell.realtor-style-studio .realtor-feature-card,.realtor-public-shell.realtor-style-studio .realtor-small-card,.realtor-public-shell.realtor-style-studio .realtor-public-action{border-radius:8px;box-shadow:none}.realtor-public-shell.realtor-style-studio .realtor-public-body{gap:24px}
      .realtor-public-hero{min-height:260px;position:-webkit-sticky;position:sticky;top:0!important;z-index:20;background:linear-gradient(145deg,var(--rdark),#2a303a);background-size:cover;background-position:center;display:flex;align-items:flex-end;overflow:hidden;border-radius:28px 28px 0 0;box-shadow:0 12px 26px rgba(15,23,42,.12)}.realtor-public-shell.realtor-hero-fixed{padding-top:var(--realtor-hero-height,260px)}.realtor-public-hero.realtor-force-fixed{position:fixed!important;top:0!important;left:var(--realtor-hero-left,0)!important;width:var(--realtor-hero-width,100%)!important;z-index:999!important}.realtor-public-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.08),rgba(0,0,0,.78))}.realtor-public-top{position:absolute;z-index:3;left:18px;right:18px;top:18px;display:flex;justify-content:space-between;align-items:center}.realtor-public-brand{display:flex;align-items:center;gap:10px;min-width:0;max-width:calc(100% - 168px);color:#fff;font-size:.72rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.realtor-public-brand img{display:block;flex:0 0 42px;width:42px;height:42px;border-radius:10px;padding:4px;background:#fff;object-fit:contain}.realtor-public-brand span{min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.12;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.realtor-public-top-actions{display:flex;gap:8px}.realtor-public-icon{width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.93);color:#111;display:grid;place-items:center;cursor:pointer}
      .realtor-public-agent{position:relative;z-index:2;width:100%;display:grid;grid-template-columns:136px minmax(0,1fr);gap:18px;align-items:end;padding:20px 22px;color:#fff}.realtor-public-avatar{width:136px;height:136px;border-radius:50%;border:4px solid #fff;background:#e5e7eb center/cover no-repeat;display:grid;place-items:center;color:#111;font-size:1.35rem;font-weight:950;box-shadow:0 12px 32px rgba(0,0,0,.28)}.realtor-public-agent>div:last-child{min-width:0;align-self:end}.realtor-public-agent h1{margin:0 0 5px;max-width:100%;font-size:clamp(1.28rem,3.2vw,1.8rem);line-height:1.04;overflow-wrap:anywhere;word-break:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.realtor-public-agent p{margin:0;color:#eef1f5;font-size:.8rem;line-height:1.35;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;overflow-wrap:anywhere}.realtor-public-agent small{display:block;max-width:100%;color:#e8c978;margin-top:5px;font-size:.67rem;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.realtor-office-control{margin-top:9px}.realtor-office-toggle{display:inline-flex;align-items:center;gap:7px;min-height:30px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:rgba(255,255,255,.14);color:#fff;padding:5px 10px;font:inherit;font-size:.62rem;font-weight:850;cursor:pointer;backdrop-filter:blur(6px)}.realtor-office-toggle:hover,.realtor-office-toggle[aria-expanded="true"]{background:rgba(255,255,255,.24)}.realtor-office-toggle .chev{transition:transform .18s ease}.realtor-office-toggle[aria-expanded="true"] .chev{transform:rotate(180deg)}.realtor-office-drawer{position:fixed;z-index:1400;width:min(292px,calc(100vw - 24px));padding:10px;border:1px solid rgba(17,24,39,.1);border-radius:16px;background:#fff;color:#111827;box-shadow:0 20px 55px rgba(15,23,42,.24);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.realtor-office-drawer[hidden]{display:none!important}.realtor-office-item{min-height:48px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;color:#111827;display:flex;align-items:center;gap:8px;padding:9px 10px;text-decoration:none;font:inherit;font-size:.7rem;font-weight:850;cursor:pointer;text-align:left}.realtor-office-item svg{color:var(--raccent,#7c3aed);flex:0 0 auto}
      .realtor-public-body{position:relative;z-index:2;padding:22px;display:grid;gap:20px;background:var(--rsurface);border-radius:0 0 28px 28px}.realtor-public-tagline{font-size:1.03rem;font-weight:800;line-height:1.45}.realtor-public-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.realtor-public-action{min-height:68px;border:1px solid rgba(17,24,39,.08);background:#fff;border-radius:15px;display:grid;place-items:center;gap:5px;text-decoration:none;color:inherit;font:inherit;font-size:.68rem;font-weight:850;cursor:pointer}.realtor-public-action svg{color:var(--raccent)}
      .realtor-public-nav{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.realtor-public-nav button{border:0;border-radius:var(--rradius,12px);padding:11px 6px;background:var(--rbutton,var(--rdark));color:var(--rbuttontext,#fff);font:inherit;font-size:.68rem;font-weight:850;cursor:pointer}.realtor-info-grid{display:grid;gap:9px}.realtor-info-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid #eceff3;font-size:.8rem}.realtor-info-row:last-child{border-bottom:0}.realtor-info-row span{color:#667085}.realtor-social-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.realtor-social-link{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border:1px solid #e4e7ec;border-radius:12px;color:inherit;text-decoration:none;font-size:.76rem;font-weight:850;background:#fff}.realtor-info-actions{display:grid;gap:9px}.realtor-info-actions a{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 12px;border-radius:11px;background:var(--rdark,#101114);color:#fff;text-decoration:none;font-weight:900;font-size:.76rem}.realtor-section{display:grid;gap:11px;scroll-margin-top:20px}.realtor-section-head{display:flex;justify-content:space-between;align-items:end;gap:10px}.realtor-section-head h2{margin:0;font-size:1rem}.realtor-section-head span{font-size:.68rem;color:#6b7280}.realtor-feature-card{background:#fff;border-radius:19px;overflow:hidden;box-shadow:0 10px 32px rgba(15,23,42,.08)}.realtor-feature-photo{height:250px;background:#e7eaee center/cover no-repeat;position:relative}.realtor-status-badge{position:absolute;left:13px;top:13px;padding:7px 10px;border-radius:999px;background:var(--raccent);color:#111;font-size:.66rem;font-weight:950}.realtor-status-badge.status-under_contract{background:#f59e0b;color:#111}.realtor-feature-info{padding:16px;display:grid;gap:7px}.realtor-feature-info h3{margin:0;font-size:1.03rem}.realtor-feature-info strong{font-size:1.1rem}.realtor-meta{display:flex;gap:12px;flex-wrap:wrap;color:#657080;font-size:.76rem}.realtor-property-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:5px}.realtor-property-actions button,.realtor-property-actions a{border:0;border-radius:var(--rradius,11px);padding:11px;text-align:center;text-decoration:none;background:var(--rbutton,var(--rdark));color:var(--rbuttontext,#fff);font:inherit;font-size:.72rem;font-weight:900;cursor:pointer}.realtor-property-actions>*:last-child{background:var(--raccent);color:#111}
      .realtor-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.realtor-small-card{background:#fff;border-radius:15px;overflow:hidden;border:1px solid rgba(17,24,39,.07);cursor:pointer}.realtor-small-photo{height:118px;background:#e7eaee center/cover no-repeat;position:relative}.realtor-small-copy{padding:10px;display:grid;gap:3px}.realtor-small-copy strong{font-size:.78rem}.realtor-small-copy span{font-size:.67rem;color:#6b7280}.realtor-lead-panel{padding:18px;border-radius:19px;background:linear-gradient(145deg,var(--rdark),#292f39);color:#fff}.realtor-lead-panel h2{margin:0 0 5px;font-size:1.05rem}.realtor-lead-panel p{margin:0 0 13px;color:#d5d9e1;font-size:.78rem}.realtor-lead-buttons{display:grid;grid-template-columns:1fr 1fr;gap:9px}.realtor-lead-buttons button{border:0;border-radius:11px;padding:12px;background:#fff;color:#111;font:inherit;font-weight:900;cursor:pointer}.realtor-lead-buttons button:last-child{background:var(--raccent)}.realtor-public-footer{text-align:center;color:#7b818c;font-size:.64rem;padding:4px 0 8px}.realtor-public-footer img{height:24px;vertical-align:middle;margin-left:5px}
      .realtor-modal{border:0;border-radius:22px;padding:0;width:min(94vw,620px);max-height:88vh;box-shadow:0 28px 90px rgba(0,0,0,.28)}.realtor-modal::backdrop{background:rgba(7,10,16,.62);backdrop-filter:blur(4px)}.realtor-modal-body{padding:19px;display:grid;gap:14px}.realtor-modal-head{display:flex;justify-content:space-between;align-items:start;gap:12px}.realtor-modal-head h2{margin:0;font-size:1.15rem}.realtor-modal-close{border:0;width:36px;height:36px;border-radius:50%;background:#eef1f5;cursor:pointer}.realtor-gallery{display:grid;grid-template-columns:2fr 1fr;gap:7px}.realtor-gallery img{width:100%;height:140px;object-fit:cover;border-radius:12px}.realtor-gallery img:first-child{height:287px;grid-row:span 2}.realtor-detail-copy{display:grid;gap:8px}.realtor-detail-copy p{margin:0;line-height:1.55;color:#596170;font-size:.82rem}.realtor-lead-form{display:grid;gap:10px}.realtor-lead-form .row{display:grid;grid-template-columns:1fr 1fr;gap:9px}.realtor-lead-form input,.realtor-lead-form textarea{width:100%;box-sizing:border-box;border:1px solid #d9dde4;border-radius:11px;padding:11px;font:inherit}.realtor-lead-form button{border:0;border-radius:11px;padding:12px;background:var(--rdark,#101114);color:#fff;font:inherit;font-weight:900;cursor:pointer}
      @media(max-width:620px){.realtor-public-shell{border-radius:0;box-shadow:none}.realtor-public-hero{min-height:245px;border-radius:0}.realtor-public-top{left:14px;right:14px;top:max(14px,env(safe-area-inset-top,0px))}.realtor-public-brand{max-width:calc(100% - 124px);gap:8px}.realtor-public-brand img{flex-basis:44px;width:44px;height:44px}.realtor-public-top-actions{gap:5px}.realtor-public-icon{width:34px;height:34px}.realtor-public-agent{grid-template-columns:112px minmax(0,1fr);gap:13px;padding:16px}.realtor-public-avatar{width:112px;height:112px;border-width:4px}.realtor-public-agent h1{font-size:clamp(1.08rem,5.4vw,1.5rem);line-height:1.05}.realtor-public-agent p{font-size:.72rem}.realtor-public-agent small{font-size:.61rem}.realtor-office-control{margin-top:7px}.realtor-office-toggle{min-height:28px;padding:4px 9px;font-size:.58rem}.realtor-public-body{padding:16px}.realtor-public-actions{gap:7px}.realtor-public-action{min-height:62px}.realtor-public-nav{grid-template-columns:repeat(2,1fr)}.realtor-section,.realtor-feature-card,.realtor-card-grid{display:grid!important;visibility:visible!important;opacity:1!important}.realtor-feature-photo{height:205px}.realtor-card-grid{grid-template-columns:1fr}.realtor-gallery{grid-template-columns:1fr 1fr}.realtor-gallery img,.realtor-gallery img:first-child{height:150px;grid-row:auto}.realtor-lead-form .row{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }

  async function fetchListings(cardData){
    const {data,error}=await supabaseClient.rpc('public_realtor_listings',{p_card_id:cardData.id});
    if(error)throw error;
    return data||[];
  }

  async function fetchUtilityData(cardData){
    const [socialResult,sectionResult]=await Promise.all([
      supabaseClient.from('social_links').select('id,platform,label,url,sort_order').eq('card_id',cardData.id).eq('is_enabled',true).order('sort_order'),
      supabaseClient.from('card_sections').select('section_type,title,content,sort_order').eq('card_id',cardData.id).eq('is_visible',true).in('section_type',['hours','location']).order('sort_order')
    ]);
    if(socialResult.error)console.warn('LIW Realtor social links unavailable:',socialResult.error);
    if(sectionResult.error)console.warn('LIW Realtor info sections unavailable:',sectionResult.error);
    return {socials:socialResult.data||[],sections:sectionResult.data||[]};
  }

  async function fetchSettings(cardData){
    const slug=String(cardData?.slug||new URLSearchParams(location.search).get('slug')||'').trim();
    if(!slug)return {};
    const {data,error}=await supabaseClient.rpc('public_realtor_settings_by_slug',{p_slug:slug});
    if(error){
      console.warn('LIW Realtor public settings unavailable:',error);
      return {};
    }
    return data&&typeof data==='object'?data:{};
  }

  const sectionByType=type=>utilityData.sections.find(section=>section.section_type===type)||null;
  const formatTime=value=>{
    const raw=String(value||'').trim();
    if(!/^\d{1,2}:\d{2}$/.test(raw))return raw;
    let [hour,minute]=raw.split(':').map(Number);
    const suffix=hour>=12?'PM':'AM';
    hour=hour%12||12;
    return `${hour}:${String(minute).padStart(2,'0')} ${suffix}`;
  };
  const utilityStripMarkup=cardData=>{
    const hours=sectionByType('hours');
    const locationSection=sectionByType('location');
    const locationContent=locationSection?.content||{};
    const addressText=locationContent.address||cardData.business_address||'';
    const website=normalize(cardData.website||'');
    const items=[];
    if(website)items.push(`<a class="realtor-office-item" href="${esc(website)}" target="_blank" rel="noopener"><i data-lucide="globe-2" size="16"></i><span>Website</span></a>`);
    if(hours?.content?.days?.length)items.push('<button class="realtor-office-item" type="button" data-realtor-info="hours"><i data-lucide="clock-3" size="16"></i><span>Hours</span></button>');
    if(addressText)items.push('<button class="realtor-office-item" type="button" data-realtor-info="location"><i data-lucide="map-pin" size="16"></i><span>Location</span></button>');
    if(utilityData.socials.length)items.push('<button class="realtor-office-item" type="button" data-realtor-info="social"><i data-lucide="users-round" size="16"></i><span>Social</span></button>');
    if(!items.length)return '';
    return `<div class="realtor-office-control"><button class="realtor-office-toggle" type="button" data-office-info-toggle aria-expanded="false"><i data-lucide="building-2" size="14"></i><span>Office Info</span><i class="chev" data-lucide="chevron-down" size="13"></i></button><div class="realtor-office-drawer" data-office-info-drawer hidden>${items.join('')}</div></div>`;
  };

  function propertyCard(l,small=false){
    const price=l.status==='sold'&&l.sold_price_cents?l.sold_price_cents:l.price_cents;
    const bedText=bedsLabel(l.beds),bedShort=bedsShort(l.beds);
    if(small)return `<article class="realtor-small-card" data-realtor-property="${esc(l.id)}"><div class="realtor-small-photo" style="${l.main_image_url?`background-image:url('${esc(l.main_image_url)}')`:''}"><span class="realtor-status-badge status-${esc(l.status||'for_sale')}">${statusLabel(l.status)}</span></div><div class="realtor-small-copy"><strong>${esc(l.address||'Property')}</strong><span>${money(price)||statusLabel(l.status)}</span><span>${[bedShort,l.baths!=null?`${l.baths} ba`:'',l.square_feet?`${l.square_feet} sqft`:''].filter(Boolean).join(' · ')}</span></div></article>`;
    return `<article class="realtor-feature-card"><div class="realtor-feature-photo" style="${l.main_image_url?`background-image:url('${esc(l.main_image_url)}')`:''}"><span class="realtor-status-badge status-${esc(l.status||'for_sale')}">${statusLabel(l.status)}</span></div><div class="realtor-feature-info"><h3>${esc(address(l)||'Property address')}</h3><strong>${money(price)||'Price on request'}</strong><div class="realtor-meta">${bedText?`<span>${esc(bedText)}</span>`:''}${l.baths!=null?`<span>${esc(l.baths)} Baths</span>`:''}${l.square_feet?`<span>${esc(l.square_feet)} Sq Ft</span>`:''}${l.property_type?`<span>${esc(l.property_type)}</span>`:''}</div><div class="realtor-property-actions"><button type="button" data-realtor-property="${esc(l.id)}">View Property</button><button type="button" data-realtor-lead="showing" data-listing-id="${esc(l.id)}">Schedule Showing</button></div></div></article>`;
  }

  function shellHtml(cardData){
    const settings=cardData.realtor_settings||{},styleKey=templateLayoutKey(cardData),p=templateSkin(cardData);
    const visible=listings,featured=visible.find(l=>l.is_featured)||visible.find(l=>l.status!=='sold')||visible[0];
    const open=visible.filter(l=>(l.status==='open_house'||l.open_house_start)&&l!==featured).slice(0,4);
    const sold=visible.filter(l=>l.status==='sold'&&l!==featured).slice(0,4);
    const current=visible.filter(l=>l.status!=='sold').slice(0,6);
    const profile=cardData.profile_image_url||'',cover=cardData.cover_image_url||'',brokerage=settings.brokerage_name||cardData.company_name||'Real Estate',title=settings.license_title||cardData.job_title||'Real Estate Professional',service=settings.service_areas||'',tagline=settings.tagline||cardData.headline||'Helping you make the right move.';
    const phone=cardData.phone||'',sms=cardData.sms_phone||phone,email=cardData.email||'';
    const utilityStrip=utilityStripMarkup(cardData);
    return `<section class="realtor-public-shell realtor-style-${styleKey}" id="realtor-public-shell" style="--rdark:${p.dark};--raccent:${p.accent};--rsurface:${p.surface};--rink:${p.ink};--rbutton:${p.button};--rbuttontext:${p.buttonText};--rfont:${esc(p.font)};--rradius:${p.radius}px"><header class="realtor-public-hero" style="${cover?`background-image:url('${esc(cover)}')`:''}"><div class="realtor-public-top"><div class="realtor-public-brand">${settings.brokerage_logo_url?`<img src="${esc(settings.brokerage_logo_url)}" alt="${esc(brokerage)} logo">`:''}<span>${esc(brokerage)}</span></div><div class="realtor-public-top-actions"><button class="realtor-public-icon" type="button" data-realtor-wallet aria-label="Save to LIW Wallet" title="Save to LIW Wallet"><i data-lucide="wallet" size="19"></i></button><button class="realtor-public-icon" type="button" data-realtor-share aria-label="Share"><i data-lucide="share-2" size="19"></i></button><button class="realtor-public-icon" type="button" data-realtor-qr aria-label="QR code"><i data-lucide="qr-code" size="19"></i></button></div></div><div class="realtor-public-agent"><div class="realtor-public-avatar" style="${profile?`background-image:url('${esc(profile)}')`:''}">${profile?'':esc(initials(cardData.full_name))}</div><div><h1>${esc(cardData.full_name||'Real Estate Professional')}</h1><p>${esc(title)}${service?` · ${esc(service)}`:''}</p><small>${esc(brokerage)}</small>${utilityStrip}</div></div></header><div class="realtor-public-body"><div class="realtor-public-tagline">${esc(tagline)}</div><div class="realtor-public-actions">${phone?`<a class="realtor-public-action" href="tel:${esc(phone)}"><i data-lucide="phone" size="18"></i>Call</a>`:'<span class="realtor-public-action"><i data-lucide="phone" size="18"></i>Call</span>'}${sms?`<a class="realtor-public-action" href="sms:${esc(sms)}"><i data-lucide="message-circle" size="18"></i>Text</a>`:'<span class="realtor-public-action"><i data-lucide="message-circle" size="18"></i>Text</span>'}${email?`<a class="realtor-public-action" href="mailto:${esc(email)}"><i data-lucide="mail" size="18"></i>Email</a>`:'<span class="realtor-public-action"><i data-lucide="mail" size="18"></i>Email</span>'}<button class="realtor-public-action" type="button" data-realtor-save><i data-lucide="user-round-plus" size="18"></i>Save</button></div><nav class="realtor-public-nav"><button type="button" data-scroll="realtor-listings">Listings</button><button type="button" data-realtor-lead="buyer">Buy a Home</button><button type="button" data-realtor-lead="seller">Sell My Home</button><button type="button" data-scroll="realtor-open-houses">Open Houses</button></nav>${featured?`<section class="realtor-section" id="realtor-featured" data-realtor-listing-section><div class="realtor-section-head"><h2>Featured Listing</h2><span>${visible.length} active propert${visible.length===1?'y':'ies'}</span></div>${propertyCard(featured)}</section>`:''}${current.length?`<section class="realtor-section" id="realtor-listings" data-realtor-listing-section><div class="realtor-section-head"><h2>Available Properties</h2><span>Explore listings</span></div><div class="realtor-card-grid">${current.map(l=>propertyCard(l,true)).join('')}</div></section>`:''}${open.length?`<section class="realtor-section" id="realtor-open-houses"><div class="realtor-section-head"><h2>Open Houses</h2><span>Upcoming</span></div><div class="realtor-card-grid">${open.map(l=>propertyCard(l,true)).join('')}</div></section>`:''}${sold.length?`<section class="realtor-section" id="realtor-sold"><div class="realtor-section-head"><h2>Recently Sold</h2><span>Proven results</span></div><div class="realtor-card-grid">${sold.map(l=>propertyCard(l,true)).join('')}</div></section>`:''}<section class="realtor-lead-panel"><h2>Ready to Buy or Sell?</h2><p>Tell ${esc((cardData.full_name||'your agent').split(' ')[0])} what you need and start the conversation.</p><div class="realtor-lead-buttons"><button type="button" data-realtor-lead="buyer">Buy a Home</button><button type="button" data-realtor-lead="seller">Sell My Home</button></div></section><div class="realtor-public-footer">Powered by <img src="assets/liw-worgs-logo.png" alt="LIW Cards"></div></div></section>`;
  }

  function bindStickyHero(){
    const shell=q('#realtor-public-shell'),hero=q('.realtor-public-hero',shell);
    if(!shell||!hero||shell.dataset.stickyBound==='true')return;
    shell.dataset.stickyBound='true';
    document.body.classList.add('realtor-public-page');
    q('.public-shell')?.classList.add('realtor-public-shell-host');

    let raf=0;
    const clearFixed=()=>{
      hero.classList.remove('realtor-force-fixed');
      shell.classList.remove('realtor-hero-fixed');
      shell.style.removeProperty('--realtor-hero-height');
      shell.style.removeProperty('--realtor-hero-left');
      shell.style.removeProperty('--realtor-hero-width');
    };
    const sync=()=>{
      raf=0;
      const shellRect=shell.getBoundingClientRect();
      if(shellRect.top>=-1||shellRect.bottom<=hero.offsetHeight+1){
        clearFixed();
        return;
      }
      if(hero.classList.contains('realtor-force-fixed')){
        const rect=shell.getBoundingClientRect();
        shell.style.setProperty('--realtor-hero-left',`${rect.left}px`);
        shell.style.setProperty('--realtor-hero-width',`${rect.width}px`);
        shell.style.setProperty('--realtor-hero-height',`${hero.offsetHeight}px`);
        return;
      }
      const heroTop=hero.getBoundingClientRect().top;
      // Native sticky should hold the hero at the viewport top. If an outer
      // public-card rule defeats it, promote to a fixed fallback.
      if(heroTop<-2){
        const rect=shell.getBoundingClientRect();
        shell.style.setProperty('--realtor-hero-left',`${rect.left}px`);
        shell.style.setProperty('--realtor-hero-width',`${rect.width}px`);
        shell.style.setProperty('--realtor-hero-height',`${hero.offsetHeight}px`);
        shell.classList.add('realtor-hero-fixed');
        hero.classList.add('realtor-force-fixed');
      }
    };
    const queue=()=>{if(!raf)raf=requestAnimationFrame(sync);};
    addEventListener('scroll',queue,{passive:true});
    addEventListener('resize',queue,{passive:true});
    queue();
  }

  function ensureDialogs(){
    if(!q('#realtor-property-dialog')){
      const dialog=document.createElement('dialog');dialog.id='realtor-property-dialog';dialog.className='realtor-modal';dialog.innerHTML='<div class="realtor-modal-body" id="realtor-property-dialog-body"></div>';document.body.appendChild(dialog);
    }
    if(!q('#realtor-lead-dialog')){
      const dialog=document.createElement('dialog');dialog.id='realtor-lead-dialog';dialog.className='realtor-modal';dialog.innerHTML='<div class="realtor-modal-body" id="realtor-lead-dialog-body"></div>';document.body.appendChild(dialog);
    }
    if(!q('#realtor-info-dialog')){
      const dialog=document.createElement('dialog');dialog.id='realtor-info-dialog';dialog.className='realtor-modal';dialog.innerHTML='<div class="realtor-modal-body" id="realtor-info-dialog-body"></div>';document.body.appendChild(dialog);
    }
  }

  function openInfo(type,cardData){
    const dialog=q('#realtor-info-dialog'),body=q('#realtor-info-dialog-body');
    if(!dialog||!body)return;
    const close='<button class="realtor-modal-close" type="button" data-close-realtor-info><i data-lucide="x"></i></button>';
    if(type==='hours'){
      const hours=sectionByType('hours'),days=Array.isArray(hours?.content?.days)?hours.content.days:[];
      body.innerHTML=`<div class="realtor-modal-head"><div><h2>Business Hours</h2><p class="muted" style="margin:5px 0 0">When this agent is available.</p></div>${close}</div><div class="realtor-info-grid">${days.map(day=>`<div class="realtor-info-row"><strong>${esc(day.label||'')}</strong><span>${day.closed?'Closed':esc(formatTime(day.open))+' – '+esc(formatTime(day.close))}</span></div>`).join('')}</div>${hours?.content?.note?`<p class="muted">${esc(hours.content.note)}</p>`:''}`;
    }else if(type==='location'){
      const section=sectionByType('location'),content=section?.content||{},addressText=content.address||cardData.business_address||'',mapUrl=normalize(content.map_url||cardData.map_url||'');
      const directions=mapUrl||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;
      body.innerHTML=`<div class="realtor-modal-head"><div><h2>${esc(content.label||'Office Location')}</h2><p class="muted" style="margin:5px 0 0">${esc(addressText)}</p></div>${close}</div><div class="realtor-info-actions"><a href="${esc(directions)}" target="_blank" rel="noopener"><i data-lucide="navigation" size="16"></i> Get directions</a></div>`;
    }else if(type==='social'){
      const links=utilityData.socials.map(link=>{
        let label=String(link.label||link.platform||'Social');
        let icon='<i data-lucide="share-2" size="16"></i>';
        try{
          const meta=typeof socialMeta==='function'?socialMeta(link.platform):null;
          if(meta?.label)label=link.label||meta.label;
          if(typeof socialIconHtml==='function')icon=socialIconHtml(link.platform,{size:16});
        }catch(_){ }
        return `<a class="realtor-social-link" href="${esc(normalize(link.url))}" target="_blank" rel="noopener">${icon}<span>${esc(label)}</span></a>`;
      }).join('');
      body.innerHTML=`<div class="realtor-modal-head"><div><h2>Connect</h2><p class="muted" style="margin:5px 0 0">Follow or message this agent.</p></div>${close}</div><div class="realtor-social-grid">${links}</div>`;
    }else return;
    q('[data-close-realtor-info]',body)?.addEventListener('click',()=>dialog.close());
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    dialog.showModal();
  }

  function openProperty(id){
    const l=listings.find(item=>String(item.id)===String(id));if(!l)return;
    const dialog=q('#realtor-property-dialog'),body=q('#realtor-property-dialog-body');
    const gallery=[l.main_image_url,...(Array.isArray(l.gallery_urls)?l.gallery_urls:[])].filter(Boolean).slice(0,7),price=l.status==='sold'&&l.sold_price_cents?l.sold_price_cents:l.price_cents,bedText=bedsLabel(l.beds);
    body.innerHTML=`<div class="realtor-modal-head"><div><h2>${esc(address(l)||'Property')}</h2><div class="realtor-meta"><span>${statusLabel(l.status)}</span>${money(price)?`<strong>${money(price)}</strong>`:''}</div></div><button class="realtor-modal-close" type="button" data-close-realtor><i data-lucide="x"></i></button></div>${gallery.length?`<div class="realtor-gallery">${gallery.map(url=>`<img src="${esc(url)}" alt="Property photo" loading="lazy">`).join('')}</div>`:''}<div class="realtor-detail-copy"><div class="realtor-meta">${bedText?`<span>${esc(bedText)}</span>`:''}${l.baths!=null?`<span>${esc(l.baths)} Baths</span>`:''}${l.square_feet?`<span>${esc(l.square_feet)} Sq Ft</span>`:''}${l.property_type?`<span>${esc(l.property_type)}</span>`:''}${l.mls_number?`<span>MLS ${esc(l.mls_number)}</span>`:''}</div>${l.description?`<p>${esc(l.description)}</p>`:''}<div class="realtor-property-actions"><button type="button" data-realtor-lead="showing" data-listing-id="${esc(l.id)}">Schedule Showing</button>${l.virtual_tour_url?`<a href="${esc(normalize(l.virtual_tour_url))}" target="_blank" rel="noopener">Virtual Tour</a>`:l.external_url?`<a href="${esc(normalize(l.external_url))}" target="_blank" rel="noopener">Listing Details</a>`:`<button type="button" data-realtor-lead="info" data-listing-id="${esc(l.id)}">Ask About It</button>`}</div></div>`;
    q('[data-close-realtor]',body)?.addEventListener('click',()=>dialog.close());qa('[data-realtor-lead]',body).forEach(btn=>btn.addEventListener('click',()=>{dialog.close();openLead(btn.dataset.realtorLead,btn.dataset.listingId);}));
    if(window.lucide)lucide.createIcons();dialog.showModal();
  }

  function openLead(type,listingId=''){
    const cardData=card(),dialog=q('#realtor-lead-dialog'),body=q('#realtor-lead-dialog-body'),l=listings.find(item=>String(item.id)===String(listingId));
    const labels={buyer:['Buy a Home','Tell me what you’re looking for.'],seller:['Sell My Home','Tell me about the property you may want to sell.'],showing:['Schedule a Showing',l?`Request a time to see ${address(l)}.`:'Request a showing time.'],info:['Ask About This Property',l?`Ask a question about ${address(l)}.`:'Ask a property question.']};const [title,copy]=labels[type]||labels.buyer;
    body.innerHTML=`<div class="realtor-modal-head"><div><h2>${esc(title)}</h2><p class="muted" style="margin:5px 0 0">${esc(copy)}</p></div><button class="realtor-modal-close" type="button" data-close-realtor><i data-lucide="x"></i></button></div><form class="realtor-lead-form" id="realtor-lead-form"><div class="row"><input name="name" placeholder="Your name" required><input name="phone" placeholder="Phone" type="tel"></div><input name="email" placeholder="Email" type="email">${type==='seller'?'<input name="property_address" placeholder="Property address">':''}${type==='buyer'?'<div class="row"><input name="preferred_area" placeholder="Preferred area"><input name="budget" placeholder="Budget"></div>':''}${type==='showing'?'<input name="preferred_time" type="datetime-local">':''}<textarea name="message" maxlength="600" rows="4" placeholder="Message"></textarea><input name="website_check" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true"><button type="submit">Send to ${esc((cardData?.full_name||'Agent').split(' ')[0])}</button></form>`;
    q('[data-close-realtor]',body)?.addEventListener('click',()=>dialog.close());q('#realtor-lead-form',body)?.addEventListener('submit',event=>submitLead(event,type,l));if(window.lucide)lucide.createIcons();dialog.showModal();
  }

  async function submitLead(event,type,l){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form),button=q('button[type="submit"]',form),cardData=card();if(!cardData)return;
    if(String(data.get('website_check')||'').trim()){dialogCloseLead();return;}
    const extras=[];if(type==='seller'&&data.get('property_address'))extras.push(`Property: ${data.get('property_address')}`);if(type==='buyer'&&data.get('preferred_area'))extras.push(`Preferred area: ${data.get('preferred_area')}`);if(type==='buyer'&&data.get('budget'))extras.push(`Budget: ${data.get('budget')}`);if(type==='showing'&&data.get('preferred_time'))extras.push(`Preferred showing time: ${data.get('preferred_time')}`);if(l)extras.push(`Listing: ${address(l)}`);
    const message=[String(data.get('message')||'').trim(),...extras].filter(Boolean).join('\n');button.disabled=true;button.textContent='Sending…';
    const {error}=await supabaseClient.from('leads').insert({card_id:cardData.id,owner_user_id:cardData.user_id,name:String(data.get('name')||'').trim(),email:String(data.get('email')||'').trim()||null,phone:String(data.get('phone')||'').trim()||null,message:message||`${type} inquiry`,service_interest:type==='buyer'?'Buy a Home':type==='seller'?'Sell My Home':type==='showing'?'Schedule Showing':'Property Information'});
    button.disabled=false;button.textContent='Send';if(error){if(typeof toast==='function')toast('Unable to send. Please contact the agent directly.');return;}try{if(typeof track==='function')track('lead_submit',null,{realtor_type:type,listing_id:l?.id||null});}catch(_){ }dialogCloseLead();if(typeof toast==='function')toast('Inquiry sent successfully');
  }
  function dialogCloseLead(){q('#realtor-lead-dialog')?.close();}

  function bindShell(cardData){
    const shell=q('#realtor-public-shell');if(!shell)return;
    const officeToggle=q('[data-office-info-toggle]',shell);
    const officeDrawer=q('[data-office-info-drawer]',shell);
    const closeOfficeDrawer=()=>{
      if(!officeToggle||!officeDrawer)return;
      officeDrawer.hidden=true;
      officeToggle.setAttribute('aria-expanded','false');
    };
    const positionOfficeDrawer=()=>{
      if(!officeToggle||!officeDrawer||officeDrawer.hidden)return;
      const rect=officeToggle.getBoundingClientRect();
      const width=Math.min(292,innerWidth-24);
      const left=Math.max(12,Math.min(rect.left,innerWidth-width-12));
      officeDrawer.style.left=`${left}px`;
      officeDrawer.style.width=`${width}px`;
      officeDrawer.style.top='auto';
      officeDrawer.style.bottom='auto';
      const height=officeDrawer.offsetHeight||150;
      if(rect.bottom+8+height<=innerHeight){
        officeDrawer.style.top=`${rect.bottom+8}px`;
      }else{
        officeDrawer.style.top=`${Math.max(12,rect.top-height-8)}px`;
      }
    };
    officeToggle?.addEventListener('click',event=>{
      event.stopPropagation();
      if(!officeDrawer)return;
      const next=officeDrawer.hidden;
      officeDrawer.hidden=!next;
      officeToggle.setAttribute('aria-expanded',next?'true':'false');
      if(next)requestAnimationFrame(positionOfficeDrawer);
    });
    addEventListener('resize',positionOfficeDrawer,{passive:true});
    addEventListener('scroll',positionOfficeDrawer,{passive:true});
    document.addEventListener('click',event=>{
      if(!officeDrawer||officeDrawer.hidden)return;
      if(event.target.closest?.('[data-office-info-toggle],[data-office-info-drawer]'))return;
      closeOfficeDrawer();
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeOfficeDrawer();});
    q('[data-realtor-wallet]',shell)?.addEventListener('click',()=>{let tries=0;const save=()=>{if(typeof window.LIWRolodex?.save==='function'){window.LIWRolodex.save({source:'realtor_wallet_top'});return true;}return false;};if(save())return;const timer=setInterval(()=>{tries+=1;if(save()||tries>=24){clearInterval(timer);if(tries>=24&&typeof toast==='function')toast('LIW Wallet is still loading. Try again.');}},90);});
    q('[data-realtor-share]',shell)?.addEventListener('click',()=>{try{if(typeof shareCard==='function')shareCard();else navigator.share?.({title:cardData.full_name||'Real Estate',url:location.href});}catch(_){ }});
    q('[data-realtor-qr]',shell)?.addEventListener('click',()=>q('#qr-top')?.click());
    q('[data-realtor-save]',shell)?.addEventListener('click',()=>{try{if(typeof saveVcard==='function')saveVcard(cardData);else q('#save')?.click();}catch(_){q('#save')?.click();}});
    qa('[data-scroll]',shell).forEach(btn=>btn.addEventListener('click',()=>q(`#${btn.dataset.scroll}`)?.scrollIntoView({behavior:'smooth',block:'start'})));
    qa('[data-realtor-property]',shell).forEach(btn=>btn.addEventListener('click',()=>openProperty(btn.dataset.realtorProperty)));
    qa('[data-realtor-lead]',shell).forEach(btn=>btn.addEventListener('click',()=>openLead(btn.dataset.realtorLead,btn.dataset.listingId||'')));
    qa('[data-realtor-info]',shell).forEach(btn=>btn.addEventListener('click',()=>{closeOfficeDrawer();openInfo(btn.dataset.realtorInfo,cardData);}));
  }

  async function mount(){
    const cardData=card();
    const article=q('#card');
    if(!cardData||String(cardData.card_experience||'').toLowerCase()!=='realtor'||mounted||mounting)return Boolean(cardData);
    // Wait until the base public renderer has finished. renderCard() replaces the
    // card className, so mounting before this point would let Classic overwrite
    // Realtor ownership immediately afterward.
    if(!article||article.hidden)return false;
    mounting=true;injectStyles();ensureDialogs();
    try{
      const [publicListings,publicSettings,publicUtilityData]=await Promise.all([
        fetchListings(cardData),
        fetchSettings(cardData),
        fetchUtilityData(cardData)
      ]);
      listings=publicListings;
      utilityData=publicUtilityData;
      cardData.realtor_settings=publicSettings;
    }catch(error){
      console.warn('LIW Realtor listings unavailable; retrying:',error);
      mounting=false;
      return false;
    }
    article.classList.add('realtor-public-active');
    let shell=q('#realtor-public-shell');if(shell)shell.remove();article.insertAdjacentHTML('beforeend',shellHtml(cardData));bindShell(cardData);bindStickyHero();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
    mounted=true;mounting=false;
    return true;
  }

  document.addEventListener('liw:public-card-rendered',()=>{ if(!mounted) mount(); });
  window.LIWRealtorPublicV2={mount};

  /* Finite fallback for old/cached public-card runtimes that do not emit readiness events. */
  [0,120,280,550,900,1500,2400,3600,5200,7600,12000,18000].forEach(delay=>setTimeout(()=>{if(!mounted)mount();},delay));
})();