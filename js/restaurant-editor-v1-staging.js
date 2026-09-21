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

  let settings={cuisine:'',service_style:'',tagline:'',price_note:'',order_url:'',reservation_url:'',delivery_note:'',featured_item_id:''};
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
      .restaurant-menu-list{display:grid;gap:11px}.restaurant-menu-item{display:grid;grid-template-columns:78px minmax(0,1fr) auto;gap:11px;align-items:start;border:1px solid #e5e7eb;border-radius:16px;padding:11px;background:#fff}.restaurant-menu-thumb{width:78px;height:78px;border-radius:12px;background:#f3f4f6 center/cover no-repeat;display:grid;place-items:center;color:#9ca3af}.restaurant-menu-fields{display:grid;gap:7px}.restaurant-menu-fields .row{display:grid;grid-template-columns:1fr 110px;gap:7px}.restaurant-menu-actions{display:grid;gap:6px}.restaurant-menu-actions button{border:1px solid #e5e7eb;background:#fff;border-radius:9px;padding:7px;font-size:.6rem;font-weight:850;cursor:pointer}.restaurant-menu-actions button.danger{color:#b42318}.restaurant-feature-check{display:flex;align-items:center;gap:6px;font-size:.63rem;font-weight:850}
      .phone.restaurant-experience-selected .preview-cover,.phone.restaurant-experience-selected .preview-content{display:none!important}.phone.restaurant-experience-selected{background:#fff7ed!important}
      #restaurant-phone{min-height:100%;background:var(--rest-surface,#fffaf4);color:var(--rest-ink,#1f2937);font-family:var(--rest-font,inherit)}.restaurant-phone-hero{height:174px;position:relative;background:linear-gradient(145deg,var(--rest-dark,#7c2d12),#2b130a);background-size:cover;background-position:center;overflow:hidden}.restaurant-phone-hero:after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.08),rgba(0,0,0,.7))}.restaurant-phone-top{position:absolute;z-index:2;left:10px;right:10px;top:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.restaurant-phone-brand{max-width:70%;color:#fff;font-size:.58rem;font-weight:950;letter-spacing:.07em;text-transform:uppercase;line-height:1.2}.restaurant-phone-top-actions{display:flex;gap:6px}.restaurant-phone-top-actions span{width:29px;height:29px;border-radius:50%;background:rgba(255,255,255,.93);display:grid;place-items:center;color:#111}.restaurant-phone-identity{position:absolute;z-index:2;left:12px;right:12px;bottom:11px;color:#fff}.restaurant-phone-identity h3{font-size:1.05rem;line-height:1.05;margin:0 0 4px;overflow-wrap:anywhere}.restaurant-phone-identity p{font-size:.59rem;margin:0;color:#ffedd5}.restaurant-phone-body{padding:12px;display:grid;gap:11px}.restaurant-phone-tagline{font-size:.7rem;font-weight:760;line-height:1.35}.restaurant-phone-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.restaurant-phone-actions span{display:grid;place-items:center;gap:4px;padding:8px 3px;border-radius:var(--rest-radius,11px);background:#fff;border:1px solid rgba(17,24,39,.07);font-size:.5rem;font-weight:850}.restaurant-phone-actions i{font-style:normal;font-size:.83rem;color:var(--rest-accent,#f59e0b)}.restaurant-phone-section-head{display:flex;align-items:end;justify-content:space-between;gap:8px}.restaurant-phone-section-head strong{font-size:.72rem}.restaurant-phone-section-head span{font-size:.5rem;color:#7b818c}.restaurant-feature-dish{background:#fff;border-radius:var(--rest-radius,14px);overflow:hidden;box-shadow:0 8px 22px rgba(15,23,42,.08)}.restaurant-feature-photo{height:120px;background:#f3f4f6 center/cover no-repeat;position:relative}.restaurant-chef-badge{position:absolute;left:8px;top:8px;padding:4px 7px;border-radius:999px;background:var(--rest-accent,#f59e0b);color:#111;font-size:.49rem;font-weight:950}.restaurant-feature-copy{padding:10px;display:grid;gap:4px}.restaurant-feature-copy strong{font-size:.72rem}.restaurant-feature-copy p{margin:0;color:#667085;font-size:.54rem;line-height:1.35}.restaurant-feature-row{display:flex;align-items:center;justify-content:space-between;gap:8px}.restaurant-feature-row b{font-size:.74rem}.restaurant-feature-row span{padding:6px 8px;border-radius:8px;background:var(--rest-dark,#7c2d12);color:#fff;font-size:.5rem;font-weight:900}.restaurant-menu-mini{display:grid;grid-template-columns:1fr 1fr;gap:7px}.restaurant-menu-mini article{border:1px solid rgba(17,24,39,.07);border-radius:11px;overflow:hidden;background:#fff}.restaurant-menu-mini-photo{height:56px;background:#f3f4f6 center/cover no-repeat}.restaurant-menu-mini-copy{padding:6px}.restaurant-menu-mini-copy strong{display:block;font-size:.55rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.restaurant-menu-mini-copy span{font-size:.5rem;color:#6b7280}.restaurant-phone-cta{padding:11px;border-radius:var(--rest-radius,14px);background:linear-gradient(145deg,var(--rest-dark,#7c2d12),#2b130a);color:#fff}.restaurant-phone-cta strong{font-size:.72rem}.restaurant-phone-cta p{font-size:.54rem;color:#ffedd5;margin:3px 0 8px}.restaurant-phone-cta-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}.restaurant-phone-cta-row span{padding:7px;border-radius:8px;background:#fff;color:#111;text-align:center;font-size:.51rem;font-weight:900}.restaurant-phone-cta-row span:last-child{background:var(--rest-accent,#f59e0b)}
      @media(max-width:760px){.restaurant-panel-hero{grid-template-columns:auto 1fr}.restaurant-live{display:none}.restaurant-menu-item{grid-template-columns:64px minmax(0,1fr)}.restaurant-menu-thumb{width:64px;height:64px}.restaurant-menu-actions{grid-column:1/-1;display:flex}.restaurant-menu-fields .row{grid-template-columns:1fr}.restaurant-plan-lock.is-visible{grid-template-columns:1fr}}
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
        <div class="restaurant-tool-tabs"><button type="button" class="active" data-restaurant-tab="profile">Restaurant</button><button type="button" data-restaurant-tab="menu">Menu</button><button type="button" data-restaurant-tab="actions">Order & Reserve</button></div>
        <div class="restaurant-tool-panel active" data-restaurant-panel="profile">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Restaurant details</h3><p>Your normal business name, photo, cover, phone and address still come from the main LIW Card fields.</p></div><span class="restaurant-save-status" id="restaurant-save-status">Autosaves</span></div>
            <div class="form-row"><div class="form-group"><label>Cuisine</label><input class="input" data-restaurant-setting="cuisine" placeholder="Caribbean · Italian · Soul Food"></div><div class="form-group"><label>Service style</label><input class="input" data-restaurant-setting="service_style" placeholder="Dine-in · Takeout · Delivery"></div></div>
            <div class="form-group"><label>Restaurant tagline</label><input class="input" data-restaurant-setting="tagline" placeholder="Fresh flavor. Made with love."></div>
            <div class="form-row"><div class="form-group"><label>Price note</label><input class="input" data-restaurant-setting="price_note" placeholder="$ · $$ · Family meals available"></div><div class="form-group"><label>Delivery note</label><input class="input" data-restaurant-setting="delivery_note" placeholder="Delivery within 5 miles"></div></div>
          </div>
        </div>
        <div class="restaurant-tool-panel" data-restaurant-panel="menu">
          <div class="form-section"><div class="section-mini-heading"><div><h3>Menu Manager</h3><p>Menu items use the existing LIW product system, but Restaurant presents them as dishes instead of products.</p></div><button class="btn btn-primary btn-sm" id="restaurant-add-menu" type="button"><i data-lucide="plus" size="15"></i> Add dish</button></div><div class="restaurant-menu-list" id="restaurant-menu-list"></div></div>
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
    }
    fillSettings();
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

  function menuItemMarkup(item,index){
    const image=Array.isArray(item.image_urls)&&item.image_urls[0]?item.image_urls[0]:'';
    const featured=String(settings.featured_item_id||'')===String(item.id||'local-'+index);
    return `<article class="restaurant-menu-item" data-restaurant-menu-index="${index}">
      <div class="restaurant-menu-thumb" style="${image?`background-image:url('${esc(image)}')`:''}">${image?'':'<i data-lucide="image" size="20"></i>'}</div>
      <div class="restaurant-menu-fields">
        <div class="row"><input class="input" data-menu-field="name" value="${esc(item.name||'')}" placeholder="Dish name"><input class="input" data-menu-field="price" value="${item.price_cents==null?'':esc((Number(item.price_cents)/100).toFixed(2))}" placeholder="Price"></div>
        <textarea class="input" data-menu-field="description" rows="2" placeholder="Short description">${esc(item.description||'')}</textarea>
        <div class="row"><input class="input" data-menu-field="image" type="url" value="${esc(image)}" placeholder="Dish photo URL"><input class="input" data-menu-field="purchase_url" type="url" value="${esc(item.purchase_url||'')}" placeholder="Order link"></div>
        <label class="restaurant-feature-check"><input type="radio" name="restaurant_featured_item" value="${esc(item.id||'local-'+index)}"${featured?' checked':''}> Chef's Special / Featured dish</label>
      </div>
      <div class="restaurant-menu-actions"><button type="button" data-menu-move="-1">↑ Up</button><button type="button" data-menu-move="1">↓ Down</button><button class="danger" type="button" data-menu-delete>Delete</button></div>
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
        if(key==='price') item.price_cents=toCents(input.value);
        else if(key==='image') item.image_urls=input.value.trim()?[input.value.trim()]:[];
        else item[key]=input.value;
        queueCoreSave();renderPreview();
      }));
      q('input[name="restaurant_featured_item"]',card)?.addEventListener('change',event=>{
        settings.featured_item_id=event.target.value;queueSave(true);renderPreview();
      });
      qa('[data-menu-move]',card).forEach(btn=>btn.addEventListener('click',()=>moveMenu(index,Number(btn.dataset.menuMove))));
      q('[data-menu-delete]',card)?.addEventListener('click',()=>deleteMenu(index));
    });
    if(window.lucide) try{lucide.createIcons();}catch(_){}
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
    const featuredKey=String(removed.id||'local-'+index);
    items.splice(index,1);
    if(String(settings.featured_item_id||'')===featuredKey) settings.featured_item_id='';
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
      const clean={cuisine:settings.cuisine||'',service_style:settings.service_style||'',tagline:settings.tagline||'',price_note:settings.price_note||'',order_url:settings.order_url||'',reservation_url:settings.reservation_url||'',delivery_note:settings.delivery_note||'',featured_item_id:settings.featured_item_id||''};
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
    fillSettings();renderMenu();renderPreview();
  }

  function selectedFeature(items){
    const key=String(settings.featured_item_id||'');
    return items.find((item,index)=>String(item.id||'local-'+index)===key)||items[0]||null;
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
    const heroStyle=cover?`background-image:linear-gradient(to bottom,rgba(0,0,0,.05),rgba(0,0,0,.72)),url('${esc(cover)}')`:'';
    const dark=value('primary_color','#7c2d12')||'#7c2d12',accent=value('secondary_color','#f59e0b')||'#f59e0b',surface=value('background_color','#fffaf4')||'#fffaf4',ink=value('text_color','#1f2937')||'#1f2937',font=value('font_family','inherit')||'inherit',radius=Math.max(6,Math.min(28,Number(value('border_radius','14'))||14));
    shell.style.cssText=`--rest-dark:${dark};--rest-accent:${accent};--rest-surface:${surface};--rest-ink:${ink};--rest-font:${font};--rest-radius:${radius}px`;
    const featureHtml=featured?`<article class="restaurant-feature-dish"><div class="restaurant-feature-photo" style="${featured.image_urls?.[0]?`background-image:url('${esc(featured.image_urls[0])}')`:''}"><span class="restaurant-chef-badge">CHEF'S SPECIAL</span></div><div class="restaurant-feature-copy"><strong>${esc(featured.name)}</strong><p>${esc(featured.description||'Freshly prepared and ready to enjoy.')}</p><div class="restaurant-feature-row"><b>${money(featured.price_cents)||esc(settings.price_note||'')}</b><span>Order</span></div></div></article>`:'<div class="realtor-empty">Add a menu item to feature a dish.</div>';
    const mini=items.filter(x=>x!==featured).slice(0,4).map(item=>`<article><div class="restaurant-menu-mini-photo" style="${item.image_urls?.[0]?`background-image:url('${esc(item.image_urls[0])}')`:''}"></div><div class="restaurant-menu-mini-copy"><strong>${esc(item.name)}</strong><span>${money(item.price_cents)||'View menu'}</span></div></article>`).join('');
    shell.innerHTML=`<div class="restaurant-phone-hero" style="${heroStyle}"><div class="restaurant-phone-top"><div class="restaurant-phone-brand">${esc(restName)}</div><div class="restaurant-phone-top-actions"><span>↗</span><span>▦</span></div></div><div class="restaurant-phone-identity"><h3>${esc(restName)}</h3><p>${esc([settings.cuisine,settings.service_style].filter(Boolean).join(' · ')||owner||'Food & Dining')}</p></div></div><div class="restaurant-phone-body"><div class="restaurant-phone-tagline">${esc(settings.tagline||value('headline')||'Fresh food. Easy ordering. One beautiful card.')}</div><div class="restaurant-phone-actions"><span><i>☰</i>Menu</span><span><i>🛍</i>Order</span><span><i>◷</i>Reserve</span><span><i>⌖</i>Info</span></div><div class="restaurant-phone-section-head"><strong>Featured Dish</strong><span>${esc(settings.price_note||'Chef selected')}</span></div>${featureHtml}${mini?`<div class="restaurant-phone-section-head"><strong>Menu Highlights</strong><span>${items.length} items</span></div><div class="restaurant-menu-mini">${mini}</div>`:''}<div class="restaurant-phone-cta"><strong>Hungry?</strong><p>${esc(settings.delivery_note||'Order ahead or reserve your table.')}</p><div class="restaurant-phone-cta-row"><span>Order Online</span><span>Reserve Table</span></div></div></div>`;
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
      if(event.target===field('card_experience'))setTimeout(syncUi,0);
      if(isRestaurant())requestAnimationFrame(renderPreview);
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