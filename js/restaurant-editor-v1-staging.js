/* LIW Cards staging — Restaurant Experience V1.
   First-class card_experience. Reuses core card identity, template styling and card_products as the menu. */
(function(){
  'use strict';
  if(window.__LIW_RESTAURANT_V1__) return;
  window.__LIW_RESTAURANT_V1__=true;

  const staging=location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/');
  if(!staging||!location.pathname.toLowerCase().endsWith('/editor.html')) return;

  const q=(s,scope=document)=>scope.querySelector(s);
  const qa=(s,scope=document)=>[...scope.querySelectorAll(s)];
  const field=name=>q('[name="'+name+'"]');
  const value=(name,fallback='')=>field(name)?String(field(name).value??''):fallback;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=cents=>cents==null||cents===''?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents)/100);
  const toCents=v=>{const n=Number(String(v||'').replace(/[$,]/g,''));return Number.isFinite(n)?Math.round(n*100):null;};
  const emit=(el,type)=>{try{el?.dispatchEvent(new Event(type,{bubbles:true}));}catch(_){}};
  const currentExperience=()=>value('card_experience','classic').trim().toLowerCase();
  const isRestaurant=()=>currentExperience()==='restaurant';
  const accessContext=()=>{try{return typeof editorAccess!=='undefined'?editorAccess:null;}catch(_){return null;}};
  const currentPlanKey=()=>{try{return String((accessContext()?.planKey)||(typeof currentPlan!=='undefined'?currentPlan:'starter')||'starter').toLowerCase();}catch(_){return 'starter';}};
  const canUseRestaurant=()=>{
    const access=accessContext();
    if(access?.isAdmin&&!access?.isPlanPreview) return true;
    try{if(access?.has?.('restaurant_experience')) return true;}catch(_){}
    return ['plus','pro','agency','white_label'].includes(currentPlanKey());
  };
  const cardId=()=>{try{return (typeof currentId!=='undefined'&&currentId)||new URLSearchParams(location.search).get('id');}catch(_){return new URLSearchParams(location.search).get('id');}};
  const hydrationSafe=()=>{const safety=window.LIWExperienceStateGuard?.hydrationSafety;return !safety||safety.safe!==false;};
  const productsRef=()=>{try{return Array.isArray(products)?products:[];}catch(_){return [];}};
  const templateKey=()=>{const layout=value('card_layout','classic').toLowerCase();if(['swipe','split'].includes(layout))return'flow';if(['artist','bold','spotlight','playful'].includes(layout))return'showtime';if(['minimal','editorial','soft','beauty'].includes(layout))return'studio';return'classic';};

  const RESTAURANT_NAME_FONTS={
    'Georgia':null,
    'DM Sans':'DM+Sans:wght@500;600;700',
    'Playfair Display':'Playfair+Display:wght@500;600;700',
    'Cormorant Garamond':'Cormorant+Garamond:wght@500;600;700',
    'Lora':'Lora:wght@500;600;700',
    'Montserrat':'Montserrat:wght@500;600;700',
    'Bebas Neue':'Bebas+Neue',
    'Libre Baskerville':'Libre+Baskerville:wght@400;700'
  };
  function restaurantNameFont(value){
    return Object.prototype.hasOwnProperty.call(RESTAURANT_NAME_FONTS,String(value||''))?String(value):'Georgia';
  }
  function ensureRestaurantNameFont(value){
    const font=restaurantNameFont(value),query=RESTAURANT_NAME_FONTS[font];
    if(!query)return font;
    const id='liw-restaurant-name-font-'+font.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    if(!document.getElementById(id)){
      const link=document.createElement('link');
      link.id=id;link.rel='stylesheet';
      link.href='https://fonts.googleapis.com/css2?family='+query+'&display=swap';
      document.head.appendChild(link);
    }
    return font;
  }

  let settings={cuisine:'',service_style:'',tagline:'',price_note:'',order_url:'',reservation_url:'',delivery_note:'',featured_item_name:'',video_cover_url:'',chef_name:'',chef_title:'',chef_note:'',name_font:'Georgia',deal_enabled:'',deal_title:'',deal_price:'',deal_note:'',deal_url:'',menu_category_map:{}};
  let loadedForCard=null;
  let saveTimer=null;

  function injectStyles(){
    if(q('#liw-restaurant-v1-styles')) return;
    const style=document.createElement('style');
    style.id='liw-restaurant-v1-styles';
    style.textContent=`
      .restaurant-control-center{display:none;margin-top:18px}.restaurant-control-center.is-visible{display:block}
      .card-experience-option.restaurant-option{position:relative;overflow:hidden}.restaurant-option .restaurant-new{position:absolute;right:9px;top:9px;padding:4px 7px;border-radius:999px;background:#f59e0b;color:#111;font-size:.54rem;font-weight:950;letter-spacing:.07em}.restaurant-option.active{border-color:#f59e0b!important;box-shadow:0 0 0 3px rgba(245,158,11,.14)!important}.restaurant-option.locked{border-style:dashed}.restaurant-option.locked .restaurant-new{background:#111827;color:#fff}.restaurant-option .card-experience-number{background:linear-gradient(145deg,#7c2d12,#ea580c)!important;color:#fff7ed!important}
      .restaurant-plan-lock{display:none;margin-top:16px;padding:16px;border:1px solid #fed7aa;border-radius:16px;background:linear-gradient(145deg,#fff7ed,#fff);box-shadow:0 8px 24px rgba(15,23,42,.05)}.restaurant-plan-lock.is-visible{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:center}.restaurant-plan-lock strong{display:block}.restaurant-plan-lock span{display:block;margin-top:4px;color:#667085;font-size:.7rem;line-height:1.45}
      .restaurant-panel-hero{display:grid;grid-template-columns:auto 1fr auto;gap:13px;align-items:center;padding:17px;border-radius:18px;background:linear-gradient(145deg,#2b130a,#7c2d12);color:#fff;margin-bottom:16px}.restaurant-panel-hero .icon{width:44px;height:44px;border-radius:14px;background:#fb923c;color:#2b130a;display:grid;place-items:center}.restaurant-panel-hero small{display:block;color:#fdba74;font-weight:900;letter-spacing:.1em;font-size:.58rem}.restaurant-panel-hero h3{margin:3px 0 2px;font-size:1rem}.restaurant-panel-hero p{margin:0;color:#ffedd5;font-size:.7rem;line-height:1.4}.restaurant-live{font-size:.58rem;font-weight:900;padding:6px 9px;border:1px solid rgba(255,255,255,.18);border-radius:999px}
      .restaurant-tool-tabs{display:flex;gap:7px;overflow:auto;padding-bottom:3px;margin:0 0 15px}.restaurant-tool-tabs button{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:8px 12px;font:inherit;font-size:.68rem;font-weight:850;white-space:nowrap;cursor:pointer}.restaurant-tool-tabs button.active{background:#7c2d12;color:#fff;border-color:#7c2d12}.restaurant-tool-panel{display:none}.restaurant-tool-panel.active{display:block}
      .restaurant-video-cover{margin-top:14px;padding:14px;border:1px solid #fed7aa;border-radius:16px;background:#fffaf4}.restaurant-video-cover-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.restaurant-video-cover-head strong{display:block}.restaurant-video-cover-head span{display:block;margin-top:4px;color:#7c6f64;font-size:.68rem;line-height:1.45}.restaurant-video-cover-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.restaurant-video-cover-preview{display:none;width:100%;aspect-ratio:16/9;margin-top:12px;border-radius:13px;object-fit:cover;background:#111}.restaurant-video-cover-preview.has-video{display:block}.restaurant-video-progress{display:none;margin-top:9px;font-size:.65rem;font-weight:850;color:#7c2d12}.restaurant-video-progress.is-visible{display:block}
      .restaurant-menu-list{display:grid;gap:13px}.restaurant-menu-item{display:grid;grid-template-columns:82px minmax(0,1fr) auto;gap:13px;align-items:start;border:1px solid #e7e5e4;border-radius:18px;padding:13px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.045)}.restaurant-menu-thumb{width:82px;height:82px;border-radius:14px;background:#f3f4f6 center/cover no-repeat;display:grid;place-items:center;color:#9ca3af}.restaurant-menu-fields{display:grid;gap:9px}.restaurant-menu-fields .restaurant-menu-main-row{display:grid;grid-template-columns:minmax(0,1fr) 105px;gap:8px}.restaurant-menu-category-row{display:grid;grid-template-columns:minmax(150px,220px) 1fr;gap:9px;align-items:center}.restaurant-menu-category-row select{min-width:0}.restaurant-menu-category-hint{font-size:.58rem;color:#7b818c;line-height:1.35}.restaurant-menu-photo-upload{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.restaurant-menu-photo-upload .dish-photo-name{font-size:.56rem;color:#667085;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.restaurant-menu-quick-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.restaurant-menu-more{border-top:1px solid #f0ece6;padding-top:8px}.restaurant-menu-more summary{cursor:pointer;font-size:.61rem;font-weight:850;color:#7c2d12;list-style:none}.restaurant-menu-more summary::-webkit-details-marker{display:none}.restaurant-menu-more-body{display:grid;gap:7px;margin-top:8px}.restaurant-menu-actions{display:grid;gap:5px}.restaurant-menu-actions button{border:1px solid #e5e7eb;background:#fff;border-radius:9px;padding:6px 7px;font-size:.58rem;font-weight:850;cursor:pointer}.restaurant-menu-actions button.danger{color:#b42318}.restaurant-feature-check{display:flex;align-items:center;gap:6px;font-size:.61rem;font-weight:850}.restaurant-deal-editor{display:grid;gap:10px;padding:14px;border:1px solid #f0d9a3;border-radius:16px;background:linear-gradient(145deg,#fffaf0,#fff)}
      .phone.restaurant-experience-selected .preview-cover,.phone.restaurant-experience-selected .preview-content{display:none!important}.phone.restaurant-experience-selected{background:#fff7ed!important}
      #restaurant-phone{min-height:100%;background:var(--rest-surface,#fffaf4);color:var(--rest-ink,#1f2937);font-family:var(--rest-font,inherit)}.restaurant-phone-hero{height:174px;position:relative;background:linear-gradient(145deg,var(--rest-dark,#7c2d12),#2b130a);background-size:cover;background-position:center;overflow:hidden}.restaurant-phone-hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.restaurant-phone-hero:after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(to bottom,rgba(0,0,0,.08),rgba(0,0,0,.7))}.restaurant-phone-top{position:absolute;z-index:3;left:8px;right:8px;top:8px;display:flex;justify-content:space-between;align-items:center;gap:8px}.restaurant-phone-corner-brand{max-width:52%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:6px 8px;border-radius:999px;background:rgba(9,12,10,.45);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(7px);color:#fff;font-size:.46rem;font-weight:900;letter-spacing:.02em}.restaurant-phone-top-actions{display:flex;gap:5px}.restaurant-phone-top-actions span{width:29px;height:29px;border-radius:50%;background:rgba(255,255,255,.94);display:grid;place-items:center;color:#111;font-size:.62rem;box-shadow:0 5px 14px rgba(0,0,0,.16);border:1px solid rgba(255,255,255,.28)}.restaurant-phone-top-actions span:last-child{background:linear-gradient(135deg,var(--rest-accent,#f59e0b),#f7d978)}.restaurant-phone-identity{position:absolute;z-index:2;left:12px;right:12px;bottom:11px;color:#fff}.restaurant-phone-identity h3{font-size:1.05rem;line-height:1.05;margin:0 0 4px;overflow-wrap:anywhere}.restaurant-phone-identity p{font-size:.59rem;margin:0;color:#ffedd5}.restaurant-phone-body{padding:12px;display:grid;gap:11px}.restaurant-phone-tagline{font-size:.7rem;font-weight:760;line-height:1.35}.restaurant-phone-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.restaurant-phone-actions span{display:grid;place-items:center;gap:4px;padding:8px 3px;border-radius:var(--rest-radius,11px);background:#fff;border:1px solid rgba(17,24,39,.07);font-size:.5rem;font-weight:850}.restaurant-phone-actions i{font-style:normal;font-size:.83rem;color:var(--rest-accent,#f59e0b)}.restaurant-phone-section-head{display:flex;align-items:end;justify-content:space-between;gap:8px}.restaurant-phone-section-head strong{font-size:.72rem}.restaurant-phone-section-head span{font-size:.5rem;color:#7b818c}.restaurant-feature-dish{background:#fff;border-radius:var(--rest-radius,14px);overflow:hidden;box-shadow:0 8px 22px rgba(15,23,42,.08)}.restaurant-feature-photo{height:120px;background:#f3f4f6 center/cover no-repeat;position:relative}.restaurant-chef-badge{position:absolute;left:8px;top:8px;padding:4px 7px;border-radius:999px;background:var(--rest-accent,#f59e0b);color:#111;font-size:.49rem;font-weight:950}.restaurant-feature-copy{padding:10px;display:grid;gap:4px}.restaurant-feature-copy strong{font-size:.72rem}.restaurant-feature-copy p{margin:0;color:#667085;font-size:.54rem;line-height:1.35}.restaurant-feature-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.restaurant-feature-row b{font-size:.74rem}.restaurant-feature-row span{padding:6px 8px;border-radius:8px;background:var(--rest-dark,#7c2d12);color:#fff;font-size:.5rem;font-weight:900}.restaurant-menu-mini{display:grid;grid-auto-flow:column;grid-auto-columns:72%;gap:7px;overflow-x:auto;scroll-snap-type:inline mandatory;padding-bottom:4px;scrollbar-width:none}.restaurant-menu-mini::-webkit-scrollbar{display:none}.restaurant-menu-mini article{scroll-snap-align:start;border:1px solid rgba(17,24,39,.07);border-radius:11px;overflow:hidden;background:#fff}.restaurant-menu-mini-photo{height:56px;background:#f3f4f6 center/cover no-repeat}.restaurant-menu-mini-copy{padding:6px}.restaurant-menu-mini-copy strong{display:block;font-size:.55rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.restaurant-menu-mini-copy span{font-size:.5rem;color:#6b7280}.restaurant-chef-mini{padding:10px;border:1px solid rgba(17,24,39,.07);border-radius:var(--rest-radius,12px);background:#fff}.restaurant-chef-mini small{display:block;color:var(--rest-accent,#f59e0b);font-size:.48rem;font-weight:950;letter-spacing:.08em}.restaurant-chef-mini strong{display:block;margin-top:3px;font-size:.68rem}.restaurant-chef-mini span{display:block;margin-top:2px;font-size:.52rem;color:#667085}.restaurant-chef-mini p{margin:6px 0 0;font-size:.52rem;line-height:1.35;color:#6b7280}.restaurant-phone-deal{padding:12px;border-radius:15px;background:linear-gradient(135deg,#20140a,#7c2d12);color:#fff;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;box-shadow:0 9px 22px rgba(50,25,8,.16)}.restaurant-phone-deal small{display:block;color:#f7c95e;font-size:.42rem;font-weight:950;letter-spacing:.12em}.restaurant-phone-deal strong{display:block;margin-top:3px;font-family:Georgia,'Times New Roman',serif;font-size:.8rem}.restaurant-phone-deal p{margin:3px 0 0;color:#ffead1;font-size:.5rem}.restaurant-phone-deal b{font-family:Georgia,'Times New Roman',serif;font-size:.9rem;color:#ffd76a}.restaurant-phone-cta{padding:11px;border-radius:var(--rest-radius,14px);background:linear-gradient(145deg,var(--rest-dark,#7c2d12),#2b130a);color:#fff}.restaurant-phone-cta strong{font-size:.72rem}.restaurant-phone-cta p{font-size:.54rem;color:#ffedd5;margin:3px 0 8px}.restaurant-phone-cta-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}.restaurant-phone-cta-row span{padding:7px;border-radius:8px;background:#fff;color:#111;text-align:center;font-size:.51rem;font-weight:900}.restaurant-phone-cta-row span:last-child{background:var(--rest-accent,#f59e0b)}
      .restaurant-phone-hero{height:285px!important}
      .restaurant-phone-hero:after{background:linear-gradient(to bottom,rgba(0,0,0,.06),rgba(0,0,0,.18) 35%,rgba(0,0,0,.84))!important}
      .restaurant-phone-identity{bottom:61px!important}
      .restaurant-phone-identity h3{font-family:var(--rest-name-font,Georgia),Georgia,'Times New Roman',serif;font-size:1.75rem!important;letter-spacing:-.03em;text-shadow:0 2px 10px rgba(0,0,0,.3)}
      .restaurant-phone-identity p{font-family:Georgia,'Times New Roman',serif;font-size:.63rem!important;color:#fff8ea!important}
      .restaurant-phone-kicker{display:inline-flex;margin-bottom:7px;padding:6px 9px;border-radius:999px;background:linear-gradient(135deg,var(--rest-accent,#f59e0b),#f7d978);color:#17130f;font-size:.45rem;font-weight:950;letter-spacing:.11em}
      .restaurant-phone-statuses{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.restaurant-phone-status{display:inline-flex;align-items:center;gap:4px;padding:5px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.38);background:rgba(5,7,6,.4);font-size:.43rem;font-weight:900;color:#fff}.restaurant-phone-status.open{color:#8cf2ad;border-color:#5bd47f}.restaurant-phone-status.reserve{color:#ffd86f;border-color:#e6b74a}.restaurant-phone-status-dot{width:5px;height:5px;border-radius:50%;background:currentColor}
      .restaurant-phone-body{padding:0 10px 12px!important;gap:12px!important}
      .restaurant-phone-actions{position:sticky!important;top:8px;z-index:20;margin:-39px 0 3px;padding:6px 4px;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important;border:1px solid rgba(133,94,36,.12);border-radius:22px;background:rgba(255,252,246,.97);box-shadow:0 12px 26px rgba(38,24,9,.16)}
      .restaurant-phone-actions span{position:relative;border:0!important;border-radius:0!important;background:transparent!important;padding:7px 2px!important;font-family:Georgia,'Times New Roman',serif;font-size:.48rem!important}
      .restaurant-phone-actions span:not(:last-child):after{content:'';position:absolute;right:0;top:20%;bottom:20%;width:1px;background:#e4d8c6}
      .restaurant-phone-actions i{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#f5ecdc;color:#a87312!important;font-size:.72rem!important}
      .restaurant-phone-tagline{font-family:Georgia,'Times New Roman',serif;font-size:.76rem!important;font-weight:800!important}
      .restaurant-phone-signature{display:grid;gap:6px}.restaurant-phone-signature-top{display:flex;align-items:end;justify-content:space-between;gap:8px}.restaurant-phone-signature-eyebrow{display:flex;align-items:center;gap:6px;color:#7f5a1a;font-size:.4rem;font-weight:950;letter-spacing:.15em;text-transform:uppercase}.restaurant-phone-signature-eyebrow:before{content:'';width:17px;height:2px;background:var(--rest-accent,#f59e0b)}.restaurant-phone-signature h3{margin:4px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:1.12rem;line-height:1}.restaurant-phone-signature a{font-family:Georgia,'Times New Roman',serif;color:#8a5c12;font-size:.46rem;font-weight:850;text-decoration:none;border-bottom:1px solid rgba(138,92,18,.65);padding-bottom:2px;white-space:nowrap}
      .restaurant-feature-dish{position:relative;min-height:185px;border-radius:16px!important;background:#17130f!important;box-shadow:0 10px 24px rgba(26,19,10,.16)!important}
      .restaurant-feature-photo{position:absolute!important;inset:0;height:auto!important}.restaurant-feature-photo:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(9,7,5,.88),rgba(9,7,5,.5) 48%,rgba(9,7,5,.04) 78%)}
      .restaurant-chef-badge{z-index:2;background:transparent!important;color:#fff4de!important;letter-spacing:.13em;left:12px!important;top:12px!important;padding:0!important}
      .restaurant-feature-copy{position:relative;z-index:2;width:62%;min-height:185px;padding:54px 12px 12px!important;display:flex!important;flex-direction:column;justify-content:flex-end;color:#fff}.restaurant-feature-copy strong{font-family:Georgia,'Times New Roman',serif;font-size:1rem!important;line-height:1.03}.restaurant-feature-copy p{color:#f5e9d7!important}.restaurant-feature-row b{color:#fff}.restaurant-feature-row span{background:var(--rest-accent,#f59e0b)!important;color:#18120a!important}
      @media(max-width:760px){.restaurant-menu-item{grid-template-columns:72px minmax(0,1fr);padding:11px}.restaurant-menu-thumb{width:72px;height:72px}.restaurant-menu-actions{grid-column:1/-1;display:flex;justify-content:flex-end}.restaurant-menu-category-row{grid-template-columns:1fr}.restaurant-menu-category-hint{display:none}.restaurant-menu-fields .restaurant-menu-main-row{grid-template-columns:minmax(0,1fr) 88px}.restaurant-panel-hero{grid-template-columns:auto 1fr}.restaurant-live{display:none}.restaurant-menu-item{grid-template-columns:64px minmax(0,1fr)}.restaurant-menu-thumb{width:64px;height:64px}.restaurant-menu-actions{grid-column:1/-1;display:flex}.restaurant-menu-fields .row{grid-template-columns:1fr}.restaurant-plan-lock.is-visible{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureOption(){
    const grid=q('#card-experience-section .card-experience-grid');
    if(!grid) return false;
    let button=q('[data-card-experience="restaurant"]',grid);
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='card-experience-option restaurant-option';
      button.dataset.cardExperience='restaurant';
      button.innerHTML='<span class="restaurant-new">FOOD & DINING</span><span class="card-experience-number">R</span><strong><i data-lucide="utensils" size="17"></i> Restaurant</strong><span>Menu-first experience with featured dishes, ordering, reservations, hours and location.</span>';
      grid.appendChild(button);
    }
    if(button.dataset.restaurantBound!=='true'){
      button.dataset.restaurantBound='true';
      button.addEventListener('click',activateRestaurant);
    }
    return true;
  }

  function ensureUi(){
    const experience=q('#card-experience-section');
    if(!experience) return false;
    if(!q('.restaurant-plan-lock')){
      const lock=document.createElement('div');
      lock.className='restaurant-plan-lock';
      lock.innerHTML='<div><strong>Restaurant Experience is included with Plus and Pro</strong><span>Use your LIW Card as a mobile restaurant storefront with menu items, featured dishes, order links, reservation links and restaurant info.</span></div><a class="btn btn-primary btn-sm" href="pricing.html#plan-plus">View Plus & Pro</a>';
      experience.insertAdjacentElement('afterend',lock);
    }
    if(!q('.restaurant-control-center')){
      const panel=document.createElement('section');
      panel.className='restaurant-control-center';
      panel.id='restaurant-control-center';
      panel.innerHTML=`
        <div class="panel-heading"><div><h2>Restaurant Tools</h2><p>Turn the same LIW Card layout into a food-and-dining experience.</p></div><span class="eyebrow">RESTAURANT</span></div>
        <div class="restaurant-panel-hero"><div class="icon"><i data-lucide="chef-hat" size="21"></i></div><div><small>LIW FOOD & DINING EXPERIENCE</small><h3>Your mobile restaurant storefront</h3><p>Menu, featured dishes, ordering, reservations and restaurant info live here.</p></div><span class="restaurant-live">LIVE EXPERIENCE</span></div>
        <div class="restaurant-tool-tabs"><button type="button" class="active" data-restaurant-tab="profile">Restaurant</button><button type="button" data-restaurant-tab="menu">Menu</button><button type="button" data-restaurant-tab="deals">Deals</button><button type="button" data-restaurant-tab="chef">Chef</button><button type="button" data-restaurant-tab="actions">Order & Reserve</button></div>
        <div class="restaurant-tool-panel active" data-restaurant-panel="profile">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Restaurant details</h3><p>Your normal business name, photo, cover, phone and address still come from the main LIW Card fields.</p></div><span class="restaurant-save-status" id="restaurant-save-status">Autosaves</span></div>
            <div class="form-row"><div class="form-group"><label>Cuisine</label><input class="input" data-restaurant-setting="cuisine" placeholder="Caribbean · Italian · Soul Food"></div><div class="form-group"><label>Service style</label><input class="input" data-restaurant-setting="service_style" placeholder="Dine-in · Takeout · Delivery"></div></div>
            <div class="form-group"><label>Restaurant tagline</label><input class="input" data-restaurant-setting="tagline" placeholder="Fresh flavor. Made with love."></div>
            <div class="form-group"><label>Business name font</label><select class="input" data-restaurant-setting="name_font">
              <option value="Georgia">Georgia · Elegant</option>
              <option value="DM Sans">DM Sans · Modern</option>
              <option value="Playfair Display">Playfair Display · Fine Dining</option>
              <option value="Cormorant Garamond">Cormorant Garamond · Luxury</option>
              <option value="Lora">Lora · Warm Serif</option>
              <option value="Montserrat">Montserrat · Clean</option>
              <option value="Bebas Neue">Bebas Neue · Bold</option>
              <option value="Libre Baskerville">Libre Baskerville · Classic</option>
            </select><div class="input-help">Changes only the large restaurant name on the hero.</div></div>
            <div class="form-row"><div class="form-group"><label>Price note</label><input class="input" data-restaurant-setting="price_note" placeholder="$ · $ · Family meals available"></div><div class="form-group"><label>Delivery note</label><input class="input" data-restaurant-setting="delivery_note" placeholder="Delivery within 5 miles"></div></div>
            <div class="restaurant-video-cover">
              <div class="restaurant-video-cover-head"><div><strong>Video cover</strong><span>Upload a short restaurant clip. LIW will shrink larger files for a lightweight muted looping cover. Your normal cover image stays as the fallback poster.</span></div><span class="eyebrow">RESTAURANT</span></div>
              <div class="restaurant-video-cover-actions">
                <label class="btn btn-primary btn-sm" for="restaurant-video-cover-file"><i data-lucide="video" size="15"></i> Upload video</label>
                <input id="restaurant-video-cover-file" type="file" accept="video/mp4,video/webm,video/quicktime" hidden>
                <button class="btn btn-ghost btn-sm" id="restaurant-remove-video-cover" type="button">Remove video</button>
              </div>
              <div class="restaurant-video-progress" id="restaurant-video-progress">Optimizing video…</div>
              <video class="restaurant-video-cover-preview" id="restaurant-video-cover-preview" muted loop playsinline autoplay preload="metadata"></video>
            </div>
          </div>
        </div>
        <div class="restaurant-tool-panel" data-restaurant-panel="menu">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Quick Menu</h3><p>Add the basics first. Extra details stay tucked away.</p></div><button class="btn btn-primary btn-sm" id="restaurant-add-menu" type="button"><i data-lucide="plus" size="15"></i> Add dish</button></div><div class="restaurant-menu-list" id="restaurant-menu-list"></div></div>
        </div>
        <div class="restaurant-tool-panel" data-restaurant-panel="deals">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Deal / Special</h3><p>Optional promo card for lunch deals, happy hour, bundles or weekly specials.</p></div></div>
            <div class="restaurant-deal-editor">
              <div class="form-row"><div class="form-group"><label>Show deal</label><select class="input" data-restaurant-setting="deal_enabled"><option value="">Off</option><option value="true">On</option></select></div><div class="form-group"><label>Deal price</label><input class="input" data-restaurant-setting="deal_price" placeholder="$19.99"></div></div>
              <div class="form-group"><label>Deal title</label><input class="input" data-restaurant-setting="deal_title" placeholder="Lunch Special"></div>
              <div class="form-group"><label>Short note</label><input class="input" data-restaurant-setting="deal_note" placeholder="Entrée + side + drink"></div>
              <div class="form-group"><label>Deal link</label><input class="input" type="url" data-restaurant-setting="deal_url" placeholder="https://... (optional)"></div>
            </div>
          </div>
        </div>
        <div class="restaurant-tool-panel" data-restaurant-panel="chef">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Chef Spotlight</h3><p>Optional. Use this for chef-driven restaurants, fine dining, tasting menus, or anywhere the chef is part of the brand.</p></div><span class="eyebrow">OPTIONAL</span></div>
            <div class="form-row"><div class="form-group"><label>Chef name</label><input class="input" data-restaurant-setting="chef_name" placeholder="Chef Amara Lewis"></div><div class="form-group"><label>Chef title</label><input class="input" data-restaurant-setting="chef_title" placeholder="Executive Chef · Chef-Owner"></div></div>
            <div class="form-group"><label>Chef story / note</label><textarea class="input" rows="3" data-restaurant-setting="chef_note" placeholder="A short culinary story, philosophy, or specialty."></textarea></div>
          </div>
        </div>
        <div class="restaurant-tool-panel" data-restaurant-panel="actions">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Order & reservation actions</h3><p>Use your own ordering provider, reservation page, delivery platform or website.</p></div></div>
            <div class="form-group"><label>Order online URL</label><input class="input" type="url" data-restaurant-setting="order_url" placeholder="https://..."></div>
            <div class="form-group"><label>Reserve a table URL</label><input class="input" type="url" data-restaurant-setting="reservation_url" placeholder="https://..."></div>
          </div>
        </div>`;
      experience.insertAdjacentElement('afterend',panel);
      qa('[data-restaurant-tab]',panel).forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.restaurantTab)));
      qa('[data-restaurant-setting]',panel).forEach(input=>input.addEventListener('input',()=>{settings[input.dataset.restaurantSetting]=input.value;queueSave();renderPreview();}));
      q('#restaurant-add-menu',panel)?.addEventListener('click',addMenuItem);
      q('#restaurant-video-cover-file',panel)?.addEventListener('change',uploadRestaurantVideo);
      q('#restaurant-remove-video-cover',panel)?.addEventListener('click',removeRestaurantVideo);
    }
    fillSettings();
    updateVideoCoverUi();
    renderMenu();
    if(window.lucide) try{lucide.createIcons();}catch(_){}
    return true;
  }

  function switchTab(name){
    qa('[data-restaurant-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.restaurantTab===name));
    qa('[data-restaurant-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.restaurantPanel===name));
  }

  function showUpgrade(){
    ensureUi();
    q('.restaurant-plan-lock')?.classList.add('is-visible');
    q('.restaurant-plan-lock')?.scrollIntoView({behavior:'smooth',block:'center'});
    if(typeof toast==='function') toast('Restaurant Experience is included with Plus and Pro.');
  }

  function activateRestaurant(){
    const input=field('card_experience');
    if(!input) return;
    if(!canUseRestaurant()){syncUi();showUpgrade();return;}
    const mode=field('color_mode');
    if(mode&&String(mode.value).toLowerCase()==='barbershop') mode.value='light';
    input.value='restaurant';
    document.documentElement.dataset.liwExplicitExperience='restaurant';
    emit(input,'input');emit(input,'change');
    ensureUi();syncUi();
    if(hydrationSafe()){
      try{if(typeof render==='function') render();}catch(_){}
      try{if(typeof scheduleSave==='function') scheduleSave();}catch(_){}
    }
    if(cardId()) loadSettings();
    requestAnimationFrame(()=>{q('.editor-tab[data-tab="design"]')?.click();switchTab('profile');q('.restaurant-control-center')?.scrollIntoView({behavior:'smooth',block:'start'});});
    if(typeof toast==='function') toast('Restaurant selected — tools opened in Design');
  }

  function fillSettings(){
    qa('[data-restaurant-setting]').forEach(input=>{input.value=settings[input.dataset.restaurantSetting]||'';});
  }

  const MENU_CATEGORY_OPTIONS=['Food','Starters','Mains','Cocktails','Beer & Wine','Non-Alcoholic','Desserts','Specials','Other'];
  function menuCategoryFor(item){
    const name=String(item?.name||'').trim();
    const map=settings.menu_category_map&&typeof settings.menu_category_map==='object'?settings.menu_category_map:{};
    const idKey=item?.id?'id:'+String(item.id):'';
    if(idKey&&map[idKey])return String(map[idKey]);
    return name&&map[name]?String(map[name]):'Food';
  }

  function setMenuCategory(index,value,select){
    const item=productsRef()[index];
    if(!item)return;
    const category=MENU_CATEGORY_OPTIONS.includes(String(value))?String(value):'Food';
    const name=String(item.name||'').trim();
    const idKey=item.id?'id:'+String(item.id):'';
    const map=settings.menu_category_map&&typeof settings.menu_category_map==='object'?settings.menu_category_map:{};
    const current=(idKey&&map[idKey])||(name&&map[name])||'Food';
    if(idKey)map[idKey]=category;
    if(name)map[name]=category;
    settings.menu_category_map=map;
    if(select)select.value=category;
    if(current!==category){
      queueSave(true);
      renderPreview();
    }
  }
  function menuCategoryOptions(current){
    return MENU_CATEGORY_OPTIONS.map(option=>'<option value="'+esc(option)+'"'+(option===current?' selected':'')+'>'+esc(option)+'</option>').join('');
  }

  function menuItemMarkup(item,index){
    const image=Array.isArray(item.image_urls)&&item.image_urls[0]?item.image_urls[0]:'';
    const featured=String(settings.featured_item_name||'')===String(item.name||'');
    const hasExtra=Boolean(String(item.description||'').trim()||String(item.purchase_url||'').trim());
    const category=menuCategoryFor(item);
    return `<article class="restaurant-menu-item" data-restaurant-menu-index="${index}">
      <div class="restaurant-menu-thumb" style="${image?`background-image:url('${esc(image)}')`:''}">${image?'':'<i data-lucide="image" size="18"></i>'}</div>
      <div class="restaurant-menu-fields">
        <div class="restaurant-menu-main-row"><input class="input" data-menu-field="name" value="${esc(item.name||'')}" placeholder="Dish name"><input class="input" data-menu-field="price" value="${item.price_cents==null?'':esc((Number(item.price_cents)/100).toFixed(2))}" placeholder="$ Price"></div>
        <div class="restaurant-menu-category-row"><select class="input" data-menu-category-index="${index}">${menuCategoryOptions(category)}</select><span class="restaurant-menu-category-hint">Choose Food, Cocktails, Beer & Wine, desserts and more.</span></div>
        <div class="restaurant-menu-quick-actions">
          <label class="btn btn-light btn-sm" for="restaurant-menu-photo-${index}"><i data-lucide="image-plus" size="14"></i> ${image?'Change photo':'Add photo'}</label>
          <input id="restaurant-menu-photo-${index}" data-menu-photo type="file" accept="image/jpeg,image/png,image/webp" hidden>
          <label class="restaurant-feature-check"><input type="radio" name="restaurant_featured_item" value="${esc(item.name||'')}"${featured?' checked':''}> Featured</label>
        </div>
        <details class="restaurant-menu-more"${hasExtra?' open':''}><summary>More details</summary><div class="restaurant-menu-more-body"><textarea class="input" data-menu-field="description" rows="2" placeholder="Description (optional)">${esc(item.description||'')}</textarea><input class="input" data-menu-field="purchase_url" type="url" value="${esc(item.purchase_url||'')}" placeholder="Dish order link (optional)"></div></details>
      </div>
      <div class="restaurant-menu-actions"><button type="button" data-menu-move="-1" title="Move up">↑</button><button type="button" data-menu-move="1" title="Move down">↓</button><button class="danger" type="button" data-menu-delete title="Delete">×</button></div>
    </article>`;
  }

  function renderMenu(){
    const list=q('#restaurant-menu-list');
    if(!list) return;
    const items=productsRef();
    list.innerHTML=items.length?items.map(menuItemMarkup).join(''):'<div class="realtor-empty">No menu items yet. Add your first dish.</div>';
    qa('[data-restaurant-menu-index]',list).forEach(card=>{
      const index=Number(card.dataset.restaurantMenuIndex);
      qa('[data-menu-field]',card).forEach(input=>input.addEventListener('input',()=>{
        const item=productsRef()[index];if(!item)return;
        const key=input.dataset.menuField;
        const previousName=item.name||'';
        if(key==='price') item.price_cents=toCents(input.value);
        else item[key]=input.value;
        if(key==='name'){
          if(String(settings.featured_item_name||'')===String(previousName))settings.featured_item_name=input.value;
          const map=settings.menu_category_map&&typeof settings.menu_category_map==='object'?settings.menu_category_map:{};
          const idKey=item.id?'id:'+String(item.id):'';
          const existing=(idKey&&map[idKey])||(previousName&&map[previousName])||'Food';
          if(idKey)map[idKey]=existing;
          if(String(input.value||'').trim())map[String(input.value).trim()]=existing;
          if(previousName&&input.value!==previousName)delete map[previousName];
          settings.menu_category_map=map;
          queueSave();
        }
        queueCoreSave();renderPreview();
      }));
      const categorySelect=q('[data-menu-category-index]',card);
      categorySelect?.addEventListener('input',event=>setMenuCategory(index,event.target.value,event.target));
      categorySelect?.addEventListener('change',event=>setMenuCategory(index,event.target.value,event.target));
      q('[data-menu-photo]',card)?.addEventListener('change',event=>uploadMenuPhoto(event,index));
      q('input[name="restaurant_featured_item"]',card)?.addEventListener('change',event=>{
        settings.featured_item_name=event.target.value;queueSave(true);renderPreview();
      });
      qa('[data-menu-move]',card).forEach(btn=>btn.addEventListener('click',()=>moveMenu(index,Number(btn.dataset.menuMove))));
      q('[data-menu-delete]',card)?.addEventListener('click',()=>deleteMenu(index));
    });
    if(window.lucide) try{lucide.createIcons();}catch(_){}
  }

  async function uploadMenuPhoto(event,index){
    const file=event.target.files?.[0];
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
      event.target.value='';
      return toast?.('Upload a JPG, PNG, or WebP dish photo.');
    }
    if(file.size>5*1024*1024){
      event.target.value='';
      return toast?.('Dish photo must be smaller than 5 MB.');
    }
    const item=productsRef()[index];
    if(!item)return;
    const safeName=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');
    const path=user.id+'/restaurant-menu/'+Date.now()+'-'+safeName;
    try{
      const label=event.target.closest('.restaurant-menu-photo-upload')?.querySelector('.dish-photo-name');
      if(label)label.textContent='Uploading…';
      const {error}=await supabaseClient.storage.from('profile-images').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
      if(error)throw error;
      const {data}=supabaseClient.storage.from('profile-images').getPublicUrl(path);
      item.image_urls=[data.publicUrl];
      queueCoreSave();
      try{if(typeof flushSave==='function')await flushSave({force:true,silent:true});}catch(_){}
      renderMenu();renderPreview();
      toast?.('Dish photo uploaded');
    }catch(error){
      console.error('LIW Restaurant dish photo upload failed:',error);
      toast?.(error.message||'Unable to upload dish photo');
    }finally{
      event.target.value='';
    }
  }

  function addMenuItem(){
    const items=productsRef();
    items.push({id:null,name:'',description:'',price_cents:null,currency:'usd',image_urls:[],purchase_url:'',is_enabled:true,sort_order:items.length});
    renderMenu();renderPreview();switchTab('menu');
    setTimeout(()=>q('[data-restaurant-menu-index="'+(items.length-1)+'"] [data-menu-field="name"]')?.focus(),0);
  }

  function moveMenu(index,direction){
    const items=productsRef(),next=index+direction;
    if(next<0||next>=items.length)return;
    [items[index],items[next]]=[items[next],items[index]];
    queueCoreSave();renderMenu();renderPreview();
  }

  function deleteMenu(index){
    const items=productsRef();if(!items[index])return;
    if(!confirm('Delete this menu item?'))return;
    const removed=items[index];
    const featuredName=String(removed.name||'');
    items.splice(index,1);
    if(String(settings.featured_item_name||'')===featuredName) settings.featured_item_name='';
    if(settings.menu_category_map&&typeof settings.menu_category_map==='object'){
      if(featuredName)delete settings.menu_category_map[featuredName];
      if(removed.id)delete settings.menu_category_map['id:'+String(removed.id)];
    }
    queueSave(true);queueCoreSave();renderMenu();renderPreview();
  }

  function queueCoreSave(){
    if(!hydrationSafe())return;
    try{if(typeof scheduleSave==='function') scheduleSave();}catch(_){}
  }

  function queueSave(immediate=false){
    clearTimeout(saveTimer);
    const status=q('#restaurant-save-status');if(status)status.textContent='Unsaved changes';
    queueCoreSave();
    if(!hydrationSafe())return;
    saveTimer=setTimeout(saveSettings,immediate?120:850);
  }

  async function ensureSavedCard(){
    let id=cardId();if(id)return id;
    if(!hydrationSafe())return null;
    try{if(typeof flushSave==='function') await flushSave({force:true,silent:true});}catch(_){return null;}
    return cardId();
  }

  async function saveSettings(){
    if(!isRestaurant()||!canUseRestaurant()||!hydrationSafe())return;
    const id=await ensureSavedCard();if(!id)return;
    const status=q('#restaurant-save-status');if(status)status.textContent='Saving…';
    try{
      const clean={cuisine:settings.cuisine||'',service_style:settings.service_style||'',tagline:settings.tagline||'',price_note:settings.price_note||'',order_url:settings.order_url||'',reservation_url:settings.reservation_url||'',delivery_note:settings.delivery_note||'',featured_item_name:settings.featured_item_name||'',video_cover_url:settings.video_cover_url||'',chef_name:settings.chef_name||'',chef_title:settings.chef_title||'',chef_note:settings.chef_note||'',name_font:settings.name_font||'Georgia',deal_enabled:settings.deal_enabled||'',deal_title:settings.deal_title||'',deal_price:settings.deal_price||'',deal_note:settings.deal_note||'',deal_url:settings.deal_url||'',menu_category_map:settings.menu_category_map&&typeof settings.menu_category_map==='object'?settings.menu_category_map:{}};
      const {error}=await supabaseClient.rpc('save_restaurant_settings',{p_card_id:id,p_settings:clean});
      if(error)throw error;
      if(status)status.textContent='Saved';
    }catch(error){
      console.error('LIW Restaurant settings save failed:',error);
      if(status)status.textContent='Save failed';
      if(typeof toast==='function')toast(error.message||'Unable to save Restaurant details');
    }
  }

  async function loadSettings(){
    const id=cardId();
    if(!id||loadedForCard===id)return;
    loadedForCard=id;
    try{
      const {data,error}=await supabaseClient.from('digital_cards').select('restaurant_settings').eq('id',id).single();
      if(error)throw error;
      settings={...settings,...(data?.restaurant_settings||{})};
    }catch(error){console.warn('LIW Restaurant settings load failed:',error);}
    fillSettings();updateVideoCoverUi();renderMenu();renderPreview();
  }

  function setVideoProgress(message=''){
    const el=q('#restaurant-video-progress');
    if(!el)return;
    el.textContent=message||'Optimizing video…';
    el.classList.toggle('is-visible',Boolean(message));
  }

  function updateVideoCoverUi(){
    const preview=q('#restaurant-video-cover-preview');
    const remove=q('#restaurant-remove-video-cover');
    const url=String(settings.video_cover_url||'').trim();
    if(preview){
      if(url&&preview.src!==url)preview.src=url;
      if(!url){preview.removeAttribute('src');try{preview.load();}catch(_){}}
      preview.classList.toggle('has-video',Boolean(url));
    }
    if(remove)remove.disabled=!url;
  }

  async function compressRestaurantVideo(file){
    const targetBytes=14*1024*1024;
    if(file.size<=targetBytes)return file;
    if(!window.MediaRecorder||!document.createElement('canvas').captureStream)return file;
    const mimeCandidates=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    const mimeType=mimeCandidates.find(type=>MediaRecorder.isTypeSupported?.(type));
    if(!mimeType)return file;

    const objectUrl=URL.createObjectURL(file);
    const video=document.createElement('video');
    video.muted=true;video.playsInline=true;video.preload='auto';video.src=objectUrl;
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Video could not be prepared.')),12000);
      video.onloadedmetadata=()=>{clearTimeout(timer);resolve();};
      video.onerror=()=>{clearTimeout(timer);reject(new Error('Unsupported video file.'));};
    });
    const maxSeconds=Math.min(Number.isFinite(video.duration)?video.duration:12,12);
    const maxWidth=720;
    const scale=Math.min(1,maxWidth/Math.max(1,video.videoWidth||maxWidth));
    const width=Math.max(2,Math.round((video.videoWidth||maxWidth)*scale/2)*2);
    const height=Math.max(2,Math.round((video.videoHeight||405)*scale/2)*2);
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false});
    const stream=canvas.captureStream(24);
    const chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:850000});
    recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
    const done=new Promise((resolve,reject)=>{
      recorder.onerror=e=>reject(e.error||new Error('Video optimization failed.'));
      recorder.onstop=()=>resolve(new Blob(chunks,{type:mimeType.split(';')[0]}));
    });
    let active=true;
    const draw=()=>{if(!active)return;try{ctx.drawImage(video,0,0,width,height);}catch(_){}requestAnimationFrame(draw);};
    video.currentTime=0;
    recorder.start(500);draw();
    try{await video.play();}catch(_){}
    await new Promise(resolve=>{
      const stop=()=>{active=false;try{video.pause();}catch(_){}try{recorder.stop();}catch(_){}resolve();};
      const timer=setTimeout(stop,Math.max(1000,maxSeconds*1000));
      video.onended=()=>{clearTimeout(timer);stop();};
    });
    const blob=await done;
    URL.revokeObjectURL(objectUrl);
    if(!blob?.size||blob.size>=file.size)return file;
    return new File([blob],file.name.replace(/\.[^.]+$/,'.webm'),{type:blob.type||'video/webm'});
  }

  async function uploadRestaurantVideo(event){
    const original=event.target.files?.[0];
    if(!original)return;
    if(!/^video\//i.test(original.type||'')){event.target.value='';return toast?.('Choose a video file.');}
    if(original.size>80*1024*1024){event.target.value='';return toast?.('Choose a video smaller than 80 MB. LIW will shrink it after upload selection.');}
    try{
      setVideoProgress(original.size>14*1024*1024?'Shrinking oversized video…':'Uploading video…');
      const file=await compressRestaurantVideo(original);
      if(file.size>14*1024*1024)throw new Error('This video is still too large after optimization. Try a shorter clip.');
      const safeName=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');
      const path=user.id+'/restaurant-covers/'+Date.now()+'-'+safeName;
      setVideoProgress('Uploading optimized cover…');
      const {error}=await supabaseClient.storage.from('card-videos').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||'video/webm'});
      if(error)throw error;
      const {data}=supabaseClient.storage.from('card-videos').getPublicUrl(path);
      settings.video_cover_url=data.publicUrl;
      updateVideoCoverUi();renderPreview();
      await saveSettings();
      const savedPct=Math.max(0,Math.round((1-(file.size/original.size))*100));
      toast?.(savedPct>2?'Video cover uploaded · '+savedPct+'% smaller':'Video cover uploaded');
    }catch(error){
      console.error('LIW Restaurant video cover upload failed:',error);
      toast?.(error.message||'Unable to upload video cover');
    }finally{
      setVideoProgress('');
      event.target.value='';
    }
  }

  async function removeRestaurantVideo(){
    settings.video_cover_url='';
    updateVideoCoverUi();renderPreview();
    await saveSettings();
    toast?.('Restaurant video cover removed');
  }

  function selectedFeature(items){
    const key=String(settings.featured_item_name||'');
    return items.find(item=>String(item.name||'')===key)||items[0]||null;
  }

  function renderPreview(){
    const phone=q('#phone-preview');
    if(!phone)return;
    if(!isRestaurant()){
      phone.classList.remove('restaurant-experience-selected');
      q('#restaurant-phone')?.remove();
      return;
    }
    phone.classList.add('restaurant-experience-selected');
    const scroll=q('#preview-card-scroll')||phone;
    let shell=q('#restaurant-phone');
    if(!shell){shell=document.createElement('div');shell.id='restaurant-phone';scroll.appendChild(shell);}
    const items=productsRef().filter(x=>x&&x.name);
    const featured=selectedFeature(items);
    const restName=value('company_name')||value('full_name')||'Your Restaurant';
    const owner=value('full_name')||'';
    const cover=value('cover_image_url')||'';
    const brandImage=value('profile_image_url')||'';
    const heroStyle=cover?`background-image:linear-gradient(to bottom,rgba(0,0,0,.04),rgba(0,0,0,.76)),url('${esc(cover)}')`:'';
    const videoCover=String(settings.video_cover_url||'').trim();
    const videoHero=videoCover?`<video class="restaurant-phone-hero-video" src="${esc(videoCover)}" ${cover?`poster="${esc(cover)}"`:''} muted loop playsinline autoplay preload="metadata"></video>`:'';
    const dark=value('primary_color','#7c2d12')||'#7c2d12',accent=value('secondary_color','#f59e0b')||'#f59e0b',surface=value('background_color','#fffaf4')||'#fffaf4',ink=value('text_color','#1f2937')||'#1f2937',font=value('font_family','inherit')||'inherit',radius=Math.max(6,Math.min(28,Number(value('border_radius','14'))||14));
    const nameFont=ensureRestaurantNameFont(settings.name_font||'Georgia');
    shell.style.cssText=`--rest-dark:${dark};--rest-accent:${accent};--rest-surface:${surface};--rest-ink:${ink};--rest-font:${font};--rest-name-font:"${esc(nameFont)}";--rest-radius:${radius}px`;
    const featureHtml=featured?`<article class="restaurant-feature-dish"><div class="restaurant-feature-photo" style="${featured.image_urls?.[0]?`background-image:url('${esc(featured.image_urls[0])}')`:''}"><span class="restaurant-chef-badge">CHEF'S PICK</span></div><div class="restaurant-feature-copy"><strong>${esc(featured.name)}</strong><p>${esc(featured.description||'Bold flavor, beautifully plated, and made to be remembered.')}</p><div class="restaurant-feature-row"><b>${money(featured.price_cents)||esc(settings.price_note||'')}</b><span>Order</span></div></div></article>`:'<div class="realtor-empty">Add a menu item to feature your signature dish.</div>';
    const reserveAvailable=Boolean(String(settings.reservation_url||value('booking_url')||'').trim());
    const chefMini=settings.chef_name?`<div class="restaurant-chef-mini"><small>MEET THE CHEF</small><strong>${esc(settings.chef_name)}</strong><span>${esc(settings.chef_title||'Chef')}</span>${settings.chef_note?`<p>${esc(settings.chef_note)}</p>`:''}</div>`:'';
    const mini=items.filter(x=>x!==featured).slice(0,4).map(item=>`<article data-menu-category="${esc(menuCategoryFor(item))}"><div class="restaurant-menu-mini-photo" style="${item.image_urls?.[0]?`background-image:url('${esc(item.image_urls[0])}')`:''}"></div><div class="restaurant-menu-mini-copy"><strong>${esc(item.name)}</strong><span>${esc(menuCategoryFor(item))} · ${money(item.price_cents)||'View menu'}</span></div></article>`).join('');
    const dealPreview=String(settings.deal_enabled)==='true'&&settings.deal_title?`<div class="restaurant-phone-deal"><div><small>LIMITED SPECIAL</small><strong>${esc(settings.deal_title)}</strong>${settings.deal_note?`<p>${esc(settings.deal_note)}</p>`:''}</div><b>${esc(settings.deal_price||'')}</b></div>`:'';
    const statuses=`<div class="restaurant-phone-statuses"><span class="restaurant-phone-status open"><span class="restaurant-phone-status-dot"></span>Open Now</span>${reserveAvailable?'<span class="restaurant-phone-status reserve">◷ Reservations</span>':''}</div>`;
    shell.innerHTML=`<div class="restaurant-phone-hero" style="${heroStyle}">${videoHero}<div class="restaurant-phone-top"><div class="restaurant-phone-corner-brand">${esc(restName)}</div><div class="restaurant-phone-top-actions"><span>↗</span><span>▦</span><span>▱</span></div></div><div class="restaurant-phone-identity"><span class="restaurant-phone-kicker">FOOD & DINING</span><h3>${esc(restName)}</h3><p>${esc([settings.cuisine,settings.service_style,settings.price_note].filter(Boolean).join(' · ')||owner||'Food & Dining')}</p>${statuses}</div></div><div class="restaurant-phone-body"><div class="restaurant-phone-actions"><span><i>♨</i>Menu</span><span><i>▢</i>Order</span><span><i>◷</i>Reserve</span><span><i>⌂</i>Info</span></div><div class="restaurant-phone-tagline">${esc(settings.tagline||value('headline')||'More than a meal. A reason to come back.')}</div><section class="restaurant-phone-signature"><div class="restaurant-phone-signature-top"><div><div class="restaurant-phone-signature-eyebrow">A TASTE OF ${esc(restName.toUpperCase())}</div><h3>Signature Dish</h3></div>${items.length?'<a href="javascript:void(0)">See Menu →</a>':''}</div>${featureHtml}</section>${dealPreview}${chefMini}${mini?`<div class="restaurant-phone-section-head"><strong>Menu Highlights</strong><span>Swipe · ${items.length}</span></div><div class="restaurant-menu-mini">${mini}</div>`:''}<div class="restaurant-phone-cta"><strong>Ready to dine?</strong><p>${esc(settings.delivery_note||'Order ahead or reserve your table.')}</p><div class="restaurant-phone-cta-row"><span>Order Online</span><span>Reserve Table</span></div></div></div>`;
  }

  function syncUi(){
    const enabled=isRestaurant(),unlocked=canUseRestaurant();
    ensureOption();ensureUi();
    const button=q('[data-card-experience="restaurant"]');
    button?.classList.toggle('active',enabled);
    button?.classList.toggle('locked',!unlocked);
    button?.setAttribute('aria-disabled',unlocked?'false':'true');
    const badge=q('.restaurant-new',button);if(badge)badge.textContent=unlocked?'FOOD & DINING':'PLUS+';
    q('.restaurant-control-center')?.classList.toggle('is-visible',enabled&&unlocked);
    q('.restaurant-plan-lock')?.classList.toggle('is-visible',enabled&&!unlocked);
    if(enabled){
      document.documentElement.dataset.liwExplicitExperience='restaurant';
      qa('#card-experience-section [data-card-experience]').forEach(btn=>{if(btn!==button)btn.classList.remove('active');});
      if(cardId())loadSettings();
    }
    renderPreview();
  }

  function bindGlobal(){
    document.addEventListener('liw:editor-card-hydrated',event=>{
      const exp=String(event.detail?.cardExperience||currentExperience()).toLowerCase();
      if(exp==='restaurant'){document.documentElement.dataset.liwExplicitExperience='restaurant';loadedForCard=null;setTimeout(()=>{ensureOption();ensureUi();loadSettings();syncUi();},0);}
      else setTimeout(syncUi,0);
    });
    document.addEventListener('input',event=>{
      if(event.target===field('card_experience'))setTimeout(syncUi,0);
      if(isRestaurant()&&event.target?.matches?.('[name="company_name"],[name="full_name"],[name="headline"],[name="primary_color"],[name="secondary_color"],[name="background_color"],[name="text_color"],[name="font_family"],[name="border_radius"],[name="cover_image_url"]'))requestAnimationFrame(renderPreview);
    },true);
    document.addEventListener('change',event=>{
      const categorySelect=event.target?.closest?.('[data-menu-category-index]');
      if(categorySelect&&isRestaurant()){
        setMenuCategory(Number(categorySelect.dataset.menuCategoryIndex),categorySelect.value,categorySelect);
      }
      if(event.target===field('card_experience'))setTimeout(syncUi,0);
      if(isRestaurant())requestAnimationFrame(renderPreview);
    },true);
    document.addEventListener('input',event=>{
      const categorySelect=event.target?.closest?.('[data-menu-category-index]');
      if(categorySelect&&isRestaurant()){
        setMenuCategory(Number(categorySelect.dataset.menuCategoryIndex),categorySelect.value,categorySelect);
      }
    },true);
  }

  function boot(){
    injectStyles();bindGlobal();
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      ensureOption();ensureUi();syncUi();
      if(q('#card-experience-section')&&attempts>12)clearInterval(timer);
      if(attempts>60)clearInterval(timer);
    },250);
    ensureOption();ensureUi();syncUi();
  }

  window.LIWRestaurantV1={refresh:syncUi,renderPreview,loadSettings};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();