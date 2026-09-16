(function(){
  const REALTOR_TEMPLATE_ID='f3cede58-2d8c-49d1-872c-2f92784b66ba';
  const REALTOR_TEMPLATE={id:REALTOR_TEMPLATE_ID,template_key:'realtor',name:'Realtor',category:'real estate',access_tier:'standard',is_premium:false,is_active:true,configuration:{layout:'property',color_mode:'light',text_color:'#111827',font_family:'DM Sans',button_color:'#111111',button_text_color:'#ffffff',button_style:'rounded',border_radius:18,primary_color:'#111111',secondary_color:'#d4a84f',background_color:'#ffffff',gradient_background:'linear-gradient(135deg,#111111,#d4a84f)',profile_image_shape:'circle'}};
  const STYLE_ID='liw-realtor-v1-style';
  const STATUS_LABELS={for_sale:'For Sale',new_listing:'New Listing',coming_soon:'Coming Soon',open_house:'Open House',pending:'Pending',sold:'Sold'};
  let settings={brokerage_name:'',license_title:'',service_areas:'',tagline:'',brokerage_logo_url:''};
  let listings=[];
  let loadedForCard=null;
  let realtorSaveTimer=null;
  let templateInjected=false;

  function esc(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function money(cents){if(cents==null||cents==='')return '';return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(cents)/100);}
  function toCents(value){const number=Number(String(value||'').replace(/[$,]/g,''));return Number.isFinite(number)?Math.round(number*100):null;}
  function cardId(){try{return currentId||new URLSearchParams(location.search).get('id');}catch(_){return new URLSearchParams(location.search).get('id');}}
  function authUser(){try{return user||null;}catch(_){return null;}}
  function experience(){return String(document.querySelector('[name="card_experience"]')?.value||'classic').toLowerCase();}
  function isRealtor(){return experience()==='realtor';}
  function statusLabel(value){return STATUS_LABELS[value]||'For Sale';}
  function localDateTimeValue(value){if(!value)return '';const date=new Date(value);if(Number.isNaN(date.getTime()))return '';const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}

  function injectStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      .realtor-editor-tab{display:none}.realtor-editor-tab.is-visible{display:flex}.realtor-editor-panel{display:none}.realtor-editor-panel.active{display:block}
      .card-experience-option.realtor-option{position:relative}.card-experience-option.realtor-option .realtor-new{position:absolute;right:9px;top:9px;padding:4px 7px;border-radius:999px;background:#d4a84f;color:#111;font-size:.54rem;font-weight:950;letter-spacing:.06em}
      .realtor-hero-note{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;margin-bottom:16px;border:1px solid #eadfbe;border-radius:16px;background:#fffaf0;color:#5f4a1e}.realtor-hero-note strong{display:block;color:#111827;margin-bottom:3px}.realtor-hero-note span{font-size:.78rem;line-height:1.45;color:#6b7280}
      .realtor-editor-grid{display:grid;gap:14px}.realtor-listing-card{border:1px solid #e4e7ec;border-radius:18px;background:#fff;overflow:hidden}.realtor-listing-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:13px 14px;background:#f8fafc;border-bottom:1px solid #edf0f5}.realtor-listing-head strong{font-size:.84rem}.realtor-listing-body{padding:14px;display:grid;gap:12px}.realtor-listing-actions{display:flex;gap:8px;flex-wrap:wrap}.realtor-badge{font-size:.62rem;font-weight:900;padding:5px 8px;border-radius:999px;background:#111;color:#fff}.realtor-badge.gold{background:#d4a84f;color:#111}.realtor-checkbox{display:flex;align-items:center;gap:7px;font-size:.75rem;font-weight:800}.realtor-settings-status{font-size:.66rem;color:#667085}.realtor-gallery-help{margin-top:4px;color:#667085;font-size:.66rem;line-height:1.4}
      .realtor-preview-wrap{margin-top:16px}.realtor-preview-section{display:grid;gap:10px}.realtor-preview-title{display:flex;align-items:center;justify-content:space-between;gap:8px}.realtor-preview-title strong{font-size:.82rem}.realtor-preview-title span{font-size:.58rem;color:#667085}.realtor-agent-strip{padding:9px 10px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;display:grid;gap:2px}.realtor-agent-strip strong{font-size:.7rem}.realtor-agent-strip span{font-size:.58rem;color:#667085}
      .realtor-property-card{border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;background:#fff;color:#111}.realtor-property-image{height:120px;background:#eef2f7 center/cover no-repeat;position:relative}.realtor-property-image span{position:absolute;left:8px;top:8px;background:#111;color:#fff;border-radius:999px;padding:4px 7px;font-size:.55rem;font-weight:900}.realtor-property-copy{padding:10px;display:grid;gap:5px}.realtor-property-copy strong{font-size:.78rem}.realtor-property-copy b{font-size:.76rem}.realtor-property-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:.62rem;color:#667085}.realtor-mini-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:4px}.realtor-mini-actions span{padding:7px 8px;border-radius:9px;text-align:center;font-size:.61rem;font-weight:900;background:#111;color:#fff}.realtor-mini-actions span:last-child{background:#d4a84f;color:#111}.realtor-lead-chips{display:grid;grid-template-columns:1fr 1fr;gap:7px}.realtor-lead-chips span{padding:8px;border-radius:10px;background:#f4f5f7;font-size:.61rem;font-weight:900;text-align:center}
      @media(max-width:760px){.realtor-listing-actions .btn{flex:1}.realtor-editor-tab .editor-step-tab-copy small{display:none}.card-experience-grid{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureTemplate(){
    try{
      if(!Array.isArray(templates))return false;
      if(!templates.some(template=>String(template.id)===REALTOR_TEMPLATE_ID)){
        templates.push(REALTOR_TEMPLATE);
        templateInjected=true;
        if(typeof renderTemplates==='function')renderTemplates();
      }else if(!templateInjected){templateInjected=true;}
      return true;
    }catch(_){return false;}
  }

  function selectRealtorExperience(){
    const input=document.querySelector('[name="card_experience"]');
    if(!input)return;
    input.value='realtor';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    syncUi();
    try{if(typeof render==='function')render();}catch(_){ }
    try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }
    if(typeof toast==='function')toast('Realtor selected — listing tools are now available');
  }

  function ensureExperienceOption(){
    const grid=document.querySelector('#card-experience-section .card-experience-grid');
    if(!grid)return false;
    if(!grid.querySelector('[data-card-experience="realtor"]')){
      const button=document.createElement('button');
      button.type='button';
      button.className='card-experience-option realtor-option';
      button.dataset.cardExperience='realtor';
      button.innerHTML='<span class="realtor-new">NEW</span><span class="card-experience-number">R</span><strong><i data-lucide="house" size="17"></i> Realtor</strong><span>A real-estate experience with featured listings, open houses, sold homes and agent lead actions.</span>';
      button.addEventListener('click',selectRealtorExperience);
      grid.appendChild(button);
    }
    grid.querySelector('[data-card-experience="realtor"]')?.classList.toggle('active',isRealtor());
    if(window.lucide)lucide.createIcons();
    return true;
  }

  function ensureEditorUi(){
    injectStyles();
    const nav=document.querySelector('.editor-tabs');
    const workspace=document.querySelector('.editor-workspace');
    if(!nav||!workspace)return false;
    if(!document.querySelector('.realtor-editor-tab')){
      const publish=nav.querySelector('[data-tab="share"]');
      const tab=document.createElement('button');
      tab.type='button';
      tab.className='editor-tab realtor-editor-tab';
      tab.dataset.tab='realtor';
      tab.innerHTML='<span class="editor-step-number">R</span><i data-lucide="house" size="17"></i><span class="editor-step-tab-copy"><strong>Realtor</strong><small>Listings & open houses</small></span>';
      publish?nav.insertBefore(tab,publish):nav.appendChild(tab);
      tab.addEventListener('click',openRealtorPanel);
    }
    if(!document.querySelector('.realtor-editor-panel')){
      const panel=document.createElement('section');
      panel.className='editor-panel realtor-editor-panel';
      panel.dataset.panel='realtor';
      panel.innerHTML=`<div class="panel-heading"><div><h2>Realtor Tools</h2><p>Manage the real-estate content attached to this LIW Card.</p></div><span class="eyebrow">V1</span></div>
        <div class="realtor-hero-note"><i data-lucide="building-2" size="20"></i><div><strong>Same LIW Card. Realtor-specific tools.</strong><span>Your normal profile, contacts, colors, QR, sharing and publishing stay unchanged. This section only adds real-estate content.</span></div></div>
        <div class="form-section"><div class="section-mini-heading"><div><h3>Agent details</h3><p>These details appear with your property showcase.</p></div><span class="realtor-settings-status" id="realtor-settings-status">Autosaves</span></div>
        <div class="form-row"><div class="form-group"><label>Brokerage</label><input class="input" data-realtor-setting="brokerage_name" placeholder="Your brokerage"></div><div class="form-group"><label>License / title</label><input class="input" data-realtor-setting="license_title" placeholder="Licensed Real Estate Salesperson"></div></div>
        <div class="form-group"><label>Service areas</label><input class="input" data-realtor-setting="service_areas" placeholder="Brooklyn · Queens · NYC"></div><div class="form-group"><label>Realtor tagline</label><input class="input" data-realtor-setting="tagline" placeholder="Let’s make your dream home a reality!"></div>
        <div class="form-row"><div class="form-group"><label>Brokerage logo URL <span class="muted">optional</span></label><input class="input" data-realtor-setting="brokerage_logo_url" type="url" placeholder="https://..."></div><div class="form-group"><label>Or upload logo</label><input class="input" id="realtor-brokerage-logo-file" type="file" accept="image/jpeg,image/png,image/webp"></div></div></div>
        <div class="form-section"><div class="section-mini-heading"><div><h3>Listings Manager</h3><p>Add, feature, reorder and update properties without changing your main card profile.</p></div><button class="btn btn-primary btn-sm" id="realtor-add-listing" type="button"><i data-lucide="plus" size="15"></i> Add listing</button></div><div class="realtor-editor-grid" id="realtor-listings-editor"></div></div>`;
      const actions=document.getElementById('editor-step-actions');
      actions?workspace.insertBefore(panel,actions):workspace.appendChild(panel);
      panel.querySelectorAll('[data-realtor-setting]').forEach(input=>input.addEventListener('input',()=>{settings[input.dataset.realtorSetting]=input.value;queueRealtorSave();renderPreview();}));
      panel.querySelector('#realtor-add-listing')?.addEventListener('click',addListing);
      panel.querySelector('#realtor-brokerage-logo-file')?.addEventListener('change',uploadBrokerageLogo);
    }
    syncUi();
    if(window.lucide)lucide.createIcons();
    return true;
  }

  function openRealtorPanel(){if(!isRealtor())return;document.querySelectorAll('.editor-tab').forEach(tab=>tab.classList.toggle('active',tab.classList.contains('realtor-editor-tab')));document.querySelectorAll('.editor-panel').forEach(panel=>panel.classList.toggle('active',panel.classList.contains('realtor-editor-panel')));document.querySelector('.editor-workspace')?.scrollIntoView({behavior:'smooth',block:'start'});}
  function syncUi(){const enabled=isRealtor();document.querySelector('.realtor-editor-tab')?.classList.toggle('is-visible',enabled);document.querySelector('#card-experience-section [data-card-experience="realtor"]')?.classList.toggle('active',enabled);if(enabled)document.querySelectorAll('#card-experience-section [data-card-experience="classic"],#card-experience-section [data-card-experience="flow"]').forEach(button=>button.classList.remove('active'));if(!enabled&&document.querySelector('.realtor-editor-panel.active'))document.querySelector('.editor-tab[data-tab="design"]')?.click();renderPreview();}

  async function loadRealtorData(){const id=cardId();if(!id||!isRealtor()||loadedForCard===id)return;loadedForCard=id;try{const [cardResult,listResult]=await Promise.all([supabaseClient.from('digital_cards').select('realtor_settings').eq('id',id).single(),supabaseClient.from('realtor_listings').select('*').eq('card_id',id).order('sort_order').order('created_at')]);if(cardResult.error)throw cardResult.error;if(listResult.error)throw listResult.error;settings={...settings,...(cardResult.data?.realtor_settings||{})};listings=listResult.data||[];fillSettings();renderListings();renderPreview();}catch(error){console.warn('LIW Realtor V1 load failed:',error);}}
  function fillSettings(){document.querySelectorAll('[data-realtor-setting]').forEach(input=>{input.value=settings[input.dataset.realtorSetting]||'';});}
  function blankListing(){return {id:null,address:'',city:'',state:'NY',zip:'',price_cents:null,status:'for_sale',property_type:'',beds:null,baths:null,square_feet:null,description:'',mls_number:'',main_image_url:'',gallery_urls:[],external_url:'',virtual_tour_url:'',is_featured:listings.length===0,is_visible:true,open_house_start:null,open_house_end:null,sold_price_cents:null,sort_order:listings.length};}
  function addListing(){listings.push(blankListing());renderListings();renderPreview();setTimeout(()=>document.querySelector(`[data-realtor-index="${listings.length-1}"] input[data-k="address"]`)?.focus(),0);}

  function renderListings(){
    const host=document.getElementById('realtor-listings-editor');if(!host)return;
    if(!listings.length){host.innerHTML='<div class="builder-empty"><i data-lucide="house-plus" size="20"></i><span>No listings yet. Add the first property you want to show.</span></div>';if(window.lucide)lucide.createIcons();return;}
    host.innerHTML=listings.map((listing,index)=>`<article class="realtor-listing-card" data-realtor-index="${index}"><div class="realtor-listing-head"><div><strong>${esc(listing.address||`Listing ${index+1}`)}</strong> ${listing.is_featured?'<span class="realtor-badge gold">Featured</span>':''}</div><span class="realtor-badge">${statusLabel(listing.status)}</span></div><div class="realtor-listing-body">
      <div class="form-row"><input class="input" data-k="address" placeholder="Property address" value="${esc(listing.address||'')}"><input class="input" data-k="price" placeholder="Price, e.g. 799000" inputmode="decimal" value="${listing.price_cents==null?'':Number(listing.price_cents)/100}"></div>
      <div class="form-row"><input class="input" data-k="city" placeholder="City" value="${esc(listing.city||'')}"><input class="input" data-k="state" placeholder="State" value="${esc(listing.state||'')}"><input class="input" data-k="zip" placeholder="ZIP" value="${esc(listing.zip||'')}"></div>
      <div class="form-row"><select class="input" data-k="status"><option value="for_sale">For Sale</option><option value="new_listing">New Listing</option><option value="coming_soon">Coming Soon</option><option value="open_house">Open House</option><option value="pending">Pending</option><option value="sold">Sold</option></select><input class="input" data-k="property_type" placeholder="Property type" value="${esc(listing.property_type||'')}"></div>
      <div class="form-row"><input class="input" data-k="beds" placeholder="Beds" inputmode="decimal" value="${esc(listing.beds??'')}"><input class="input" data-k="baths" placeholder="Baths" inputmode="decimal" value="${esc(listing.baths??'')}"><input class="input" data-k="square_feet" placeholder="Square feet" inputmode="numeric" value="${esc(listing.square_feet??'')}"></div>
      <textarea class="input" data-k="description" maxlength="1200" placeholder="Property description">${esc(listing.description||'')}</textarea>
      <div class="form-row"><input class="input" data-k="mls_number" placeholder="MLS # (optional)" value="${esc(listing.mls_number||'')}"><input class="input" data-k="external_url" type="url" placeholder="External listing URL" value="${esc(listing.external_url||'')}"></div>
      <div class="form-row"><input class="input" data-k="main_image_url" type="url" placeholder="Main photo URL" value="${esc(listing.main_image_url||'')}"><input class="input" data-k="virtual_tour_url" type="url" placeholder="Virtual tour URL" value="${esc(listing.virtual_tour_url||'')}"></div>
      <div class="form-group"><label>Or upload main property photo</label><input class="input" data-photo type="file" accept="image/jpeg,image/png,image/webp"></div>
      <div class="form-group"><label>Gallery photo URLs <span class="muted">optional</span></label><textarea class="input" data-k="gallery_urls_text" placeholder="Paste one image URL per line">${esc((Array.isArray(listing.gallery_urls)?listing.gallery_urls:[]).join('\n'))}</textarea><div class="realtor-gallery-help">Up to 12 gallery images. The main property photo stays separate.</div></div>
      <div class="form-group"><label>Open house <span class="muted">optional</span></label><div class="form-row"><input class="input" data-k="open_house_start" type="datetime-local" value="${localDateTimeValue(listing.open_house_start)}"><input class="input" data-k="open_house_end" type="datetime-local" value="${localDateTimeValue(listing.open_house_end)}"></div></div>
      ${listing.status==='sold'?`<div class="form-group"><label>Sold price</label><input class="input" data-k="sold_price" inputmode="decimal" placeholder="Sold price" value="${listing.sold_price_cents==null?'':Number(listing.sold_price_cents)/100}"></div>`:''}
      <div class="realtor-listing-actions"><label class="realtor-checkbox"><input type="checkbox" data-featured ${listing.is_featured?'checked':''}> Featured</label><label class="realtor-checkbox"><input type="checkbox" data-visible ${listing.is_visible!==false?'checked':''}> Show on card</label><button class="btn btn-light btn-sm" type="button" data-up>Move up</button><button class="btn btn-light btn-sm" type="button" data-down>Move down</button><button class="btn btn-ghost btn-sm" type="button" data-delete><i data-lucide="trash-2" size="14"></i> Delete</button></div></div></article>`).join('');
    host.querySelectorAll('[data-realtor-index]').forEach(row=>{const index=Number(row.dataset.realtorIndex);const listing=listings[index];row.querySelector('[data-k="status"]').value=listing.status||'for_sale';row.querySelectorAll('[data-k]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.k;if(key==='price')listing.price_cents=toCents(input.value);else if(key==='sold_price')listing.sold_price_cents=toCents(input.value);else if(key==='gallery_urls_text')listing.gallery_urls=input.value.split(/\r?\n/).map(item=>item.trim()).filter(Boolean).slice(0,12);else if(['beds','baths'].includes(key))listing[key]=input.value===''?null:Number(input.value);else if(key==='square_feet')listing[key]=input.value===''?null:Number(input.value);else if(['open_house_start','open_house_end'].includes(key))listing[key]=input.value?new Date(input.value).toISOString():null;else listing[key]=input.value;queueRealtorSave();renderPreview();if(key==='status')setTimeout(renderListings,0);}));row.querySelector('[data-featured]').addEventListener('change',event=>{if(event.target.checked)listings.forEach((item,itemIndex)=>item.is_featured=itemIndex===index);else listing.is_featured=false;queueRealtorSave();renderListings();renderPreview();});row.querySelector('[data-visible]').addEventListener('change',event=>{listing.is_visible=event.target.checked;queueRealtorSave();renderPreview();});row.querySelector('[data-delete]').addEventListener('click',()=>deleteListing(index));row.querySelector('[data-up]').addEventListener('click',()=>moveListing(index,-1));row.querySelector('[data-down]').addEventListener('click',()=>moveListing(index,1));row.querySelector('[data-photo]').addEventListener('change',event=>uploadListingPhoto(event,index));});if(window.lucide)lucide.createIcons();
  }

  function moveListing(index,direction){const destination=index+direction;if(destination<0||destination>=listings.length)return;[listings[index],listings[destination]]=[listings[destination],listings[index]];listings.forEach((listing,itemIndex)=>listing.sort_order=itemIndex);queueRealtorSave();renderListings();renderPreview();}
  async function deleteListing(index){const listing=listings[index];if(!confirm('Delete this listing from the Realtor card?'))return;if(listing.id){const {error}=await supabaseClient.from('realtor_listings').delete().eq('id',listing.id).eq('card_id',cardId());if(error)return toast(error.message);}listings.splice(index,1);listings.forEach((item,itemIndex)=>item.sort_order=itemIndex);renderListings();renderPreview();if(typeof toast==='function')toast('Listing deleted');}
  async function uploadImage(file,folder){if(!file)return '';if(file.size>6*1024*1024)throw new Error('Image must be under 6 MB');const account=authUser();if(!account)throw new Error('Sign in again before uploading');const safeName=file.name.toLowerCase().replace(/[^a-z0-9.]+/g,'-');const path=`${account.id}/realtor/${folder}/${Date.now()}-${safeName}`;const {error}=await supabaseClient.storage.from('profile-images').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;return supabaseClient.storage.from('profile-images').getPublicUrl(path).data.publicUrl;}
  async function uploadListingPhoto(event,index){const file=event.target.files?.[0];if(!file)return;try{const url=await uploadImage(file,'listings');listings[index].main_image_url=url;queueRealtorSave(true);renderListings();renderPreview();toast('Property photo uploaded');}catch(error){toast(error.message||'Unable to upload property photo');}}
  async function uploadBrokerageLogo(event){const file=event.target.files?.[0];if(!file)return;try{settings.brokerage_logo_url=await uploadImage(file,'brokerage');fillSettings();queueRealtorSave(true);renderPreview();toast('Brokerage logo uploaded');}catch(error){toast(error.message||'Unable to upload brokerage logo');}}
  function queueRealtorSave(immediate=false){clearTimeout(realtorSaveTimer);try{if(typeof scheduleSave==='function')scheduleSave();}catch(_){ }const status=document.getElementById('realtor-settings-status');if(status)status.textContent='Unsaved changes';realtorSaveTimer=setTimeout(saveRealtor,immediate?80:900);}
  async function ensureSavedCard(){let id=cardId();if(id)return id;try{if(typeof flushSave==='function')await flushSave({force:true,silent:true});}catch(_){return null;}return cardId();}
  function listingPayload(listing,index,id){return {card_id:id,address:listing.address||'',city:listing.city||null,state:listing.state||null,zip:listing.zip||null,price_cents:listing.price_cents==null?null:Number(listing.price_cents),status:listing.status||'for_sale',property_type:listing.property_type||null,beds:listing.beds==null?null:Number(listing.beds),baths:listing.baths==null?null:Number(listing.baths),square_feet:listing.square_feet==null?null:Number(listing.square_feet),description:listing.description||null,mls_number:listing.mls_number||null,main_image_url:listing.main_image_url||null,gallery_urls:Array.isArray(listing.gallery_urls)?listing.gallery_urls.slice(0,12):[],external_url:listing.external_url||null,virtual_tour_url:listing.virtual_tour_url||null,is_featured:Boolean(listing.is_featured),is_visible:listing.is_visible!==false,open_house_start:listing.open_house_start||null,open_house_end:listing.open_house_end||null,sold_price_cents:listing.sold_price_cents==null?null:Number(listing.sold_price_cents),sort_order:index,updated_at:new Date().toISOString()};}
  async function saveRealtor(){if(!isRealtor())return;const id=await ensureSavedCard();if(!id)return;const status=document.getElementById('realtor-settings-status');if(status)status.textContent='Saving…';try{const cleanSettings={brokerage_name:settings.brokerage_name||'',license_title:settings.license_title||'',service_areas:settings.service_areas||'',tagline:settings.tagline||'',brokerage_logo_url:settings.brokerage_logo_url||''};const {error:settingsError}=await supabaseClient.rpc('save_realtor_settings',{p_card_id:id,p_settings:cleanSettings});if(settingsError)throw settingsError;const ordered=listings.map((listing,index)=>({listing,index})).sort((a,b)=>Number(a.listing.is_featured)-Number(b.listing.is_featured));for(const {listing,index} of ordered){const payload=listingPayload(listing,index,id);if(listing.id){const {error}=await supabaseClient.from('realtor_listings').update(payload).eq('id',listing.id).eq('card_id',id);if(error)throw error;}else{const {data,error}=await supabaseClient.from('realtor_listings').insert(payload).select().single();if(error)throw error;listing.id=data.id;}}if(status)status.textContent='Saved';}catch(error){console.error('LIW Realtor V1 save failed:',error);if(status)status.textContent='Save failed';if(typeof toast==='function')toast(error.message||'Unable to save Realtor details');}}

  function previewCard(listing){const address=[listing.address,listing.city,listing.state,listing.zip].filter(Boolean).join(', ');const displayPrice=listing.status==='sold'&&listing.sold_price_cents?listing.sold_price_cents:listing.price_cents;return `<article class="realtor-property-card"><div class="realtor-property-image" style="${listing.main_image_url?`background-image:url('${esc(listing.main_image_url)}')`:''}"><span>${statusLabel(listing.status)}</span></div><div class="realtor-property-copy"><strong>${esc(address||'Property address')}</strong><b>${money(displayPrice)||'Price on request'}</b><div class="realtor-property-meta">${listing.beds!=null?`<span>${esc(listing.beds)} Beds</span>`:''}${listing.baths!=null?`<span>${esc(listing.baths)} Baths</span>`:''}${listing.square_feet?`<span>${esc(listing.square_feet)} Sq Ft</span>`:''}</div><div class="realtor-mini-actions"><span>View Property</span><span>Schedule Showing</span></div></div></article>`;}
  function renderPreview(){let host=document.getElementById('realtor-preview');if(!isRealtor()){host?.remove();return;}const content=document.querySelector('#phone-preview .preview-content');if(!content)return;if(!host){host=document.createElement('section');host.id='realtor-preview';host.className='preview-public-section realtor-preview-wrap';const social=document.getElementById('preview-social-section');social?content.insertBefore(host,social):content.appendChild(host);}const visible=listings.filter(listing=>listing.is_visible!==false);const featured=visible.find(listing=>listing.is_featured)||visible[0];const openHouses=visible.filter(listing=>listing.status==='open_house'||listing.open_house_start).filter(listing=>listing!==featured).slice(0,2);const sold=visible.filter(listing=>listing.status==='sold').filter(listing=>listing!==featured).slice(0,2);const agent=[settings.brokerage_name,settings.license_title,settings.service_areas].filter(Boolean);host.innerHTML=`<div class="realtor-preview-section">${agent.length?`<div class="realtor-agent-strip"><strong>${esc(settings.brokerage_name||settings.license_title||'Real Estate')}</strong><span>${esc([settings.license_title,settings.service_areas].filter(Boolean).join(' · '))}</span>${settings.tagline?`<span>${esc(settings.tagline)}</span>`:''}</div>`:''}<div class="realtor-preview-title"><strong>Featured Listing</strong><span>${visible.length?`${visible.length} listing${visible.length===1?'':'s'}`:''}</span></div>${featured?previewCard(featured):'<div class="builder-empty">Add a listing in Realtor Tools.</div>'}<div class="realtor-lead-chips"><span>Buy a Home</span><span>Sell My Home</span></div>${openHouses.length?`<div class="realtor-preview-title"><strong>Open Houses</strong></div>${openHouses.map(previewCard).join('')}`:''}${sold.length?`<div class="realtor-preview-title"><strong>Recently Sold</strong></div>${sold.map(previewCard).join('')}`:''}</div>`;if(window.lucide)lucide.createIcons();}
  function monitor(){injectStyles();ensureTemplate();ensureExperienceOption();ensureEditorUi();syncUi();if(isRealtor())loadRealtorData();}
  document.addEventListener('click',event=>{const templateButton=event.target.closest(`.template-card[data-template="${REALTOR_TEMPLATE_ID}"]`);if(templateButton)setTimeout(selectRealtorExperience,0);if(event.target.closest('[data-card-experience="classic"],[data-card-experience="flow"]'))setTimeout(syncUi,0);});
  document.addEventListener('change',event=>{if(event.target.matches('[name="card_experience"],[name="template_id"]'))setTimeout(()=>{syncUi();if(isRealtor())loadRealtorData();},20);});
  window.LIWRealtorV1={refresh:monitor,save:saveRealtor};
  const init=()=>{monitor();let attempts=0;const timer=setInterval(()=>{attempts+=1;monitor();if(attempts>80)clearInterval(timer);},250);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();