(function(){
  'use strict';

  let user=null;
  let access=null;
  let planKey='starter';
  let cards=[];
  let serviceRows=[];
  let productRows=[];
  let activeType='product';
  let editingItem=null;
  let dialogType='product';

  const $=selector=>document.querySelector(selector);
  const money=cents=>cents==null?'':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents||0)/100);
  const normalize=value=>String(value??'').trim().toLowerCase();
  const cleanUrl=value=>String(value||'').trim()||null;
  const priceToCents=value=>{
    if(String(value||'').trim()==='')return null;
    const amount=Number(String(value).replace(/[^0-9.]/g,''));
    return Number.isFinite(amount)&&amount>=0?Math.round(amount*100):null;
  };

  function esc(value){
    return typeof escapeHtml==='function'?escapeHtml(String(value??'')):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function cardLabel(card){return card.internal_label||card.company_name||card.full_name||'Untitled card';}
  function cardSub(card){return card.status==='published'?'Published':'Draft';}
  function rowsFor(type){return type==='product'?productRows:serviceRows;}
  function tableFor(type){return type==='product'?'card_products':'card_services';}
  function enableFieldFor(type){return type==='product'?'products_enabled':'services_enabled';}

  function contentLimit(type){
    if(access?.isAdmin&&!access?.isPlanPreview)return 30;
    if(['white_label','agency'].includes(planKey))return 24;
    if(planKey==='pro')return type==='product'?12:16;
    if(planKey==='plus')return type==='product'?4:8;
    return type==='product'?0:8;
  }

  function canUseProducts(){
    if(access?.isAdmin&&!access?.isPlanPreview)return true;
    if(['plus','pro','agency','white_label'].includes(planKey))return true;
    try{return Boolean(access?.has?.('product_showcase'));}catch(_){return false;}
  }

  function itemSignature(type,row){
    if(type==='product')return JSON.stringify([
      normalize(row.name),normalize(row.description),Number(row.price_cents??-1),
      normalize(Array.isArray(row.image_urls)?row.image_urls[0]:''),normalize(row.purchase_url)
    ]);
    return JSON.stringify([
      normalize(row.name),normalize(row.description),Number(row.price_cents??-1),normalize(row.image_url),
      normalize(row.booking_url),normalize(row.payment_url),normalize(row.cta_label||'Learn more')
    ]);
  }

  function groupRows(type){
    const groups=new Map();
    rowsFor(type).forEach(row=>{
      const key=itemSignature(type,row);
      if(!groups.has(key))groups.set(key,{type,key,rows:[],sample:row});
      groups.get(key).rows.push(row);
    });
    return [...groups.values()].sort((a,b)=>normalize(a.sample.name).localeCompare(normalize(b.sample.name)));
  }

  function cardTags(item){
    const ids=[...new Set(item.rows.map(row=>String(row.card_id)))];
    const shown=ids.slice(0,3).map(id=>{
      const card=cards.find(row=>String(row.id)===id);
      return `<span class="ps-card-tag"><i data-lucide="contact-round" size="11"></i><span>${esc(card?cardLabel(card):'Card')}</span></span>`;
    }).join('');
    const more=ids.length>3?`<span class="ps-card-tag">+${ids.length-3} more</span>`:'';
    return shown+more;
  }

  function render(){
    const products=groupRows('product');
    const services=groupRows('service');
    $('#ps-product-count').textContent=String(products.length);
    $('#ps-service-count').textContent=String(services.length);
    $('#product-tab-count').textContent=String(products.length);
    $('#service-tab-count').textContent=String(services.length);
    $('#ps-assignment-count').textContent=String(productRows.length+serviceRows.length);

    const note=$('#ps-plan-note');
    if(!canUseProducts()){
      note.hidden=false;
      note.innerHTML='<i data-lucide="lock" size="16"></i><span><strong>Products are locked on this plan.</strong> Services can still be managed here. Upgrade to Plus or Pro to add products to cards.</span>';
    }else note.hidden=true;

    const query=normalize($('#offer-search')?.value);
    const items=(activeType==='product'?products:services).filter(item=>{
      if(!query)return true;
      const sample=item.sample;
      const assigned=item.rows.map(row=>cards.find(card=>String(card.id)===String(row.card_id))).filter(Boolean).map(cardLabel).join(' ');
      return normalize(`${sample.name} ${sample.description||''} ${assigned}`).includes(query);
    });

    const library=$('#offer-library');
    if(!cards.length){
      library.innerHTML='<div class="ps-empty"><span><i data-lucide="contact-round" size="21"></i></span><strong>Create a card first</strong><p>Your products and services need at least one card to live on.</p><a class="btn btn-primary btn-sm" href="editor.html">Create a card</a></div>';
    }else if(!items.length){
      const noun=activeType==='product'?'product':'service';
      library.innerHTML=`<div class="ps-empty"><span><i data-lucide="${activeType==='product'?'package-plus':'list-plus'}" size="21"></i></span><strong>No ${noun}s here yet</strong><p>${query?'Try another search.':`Add your first ${noun} and choose which card or cards should display it.`}</p>${query?'':`<button class="btn btn-primary btn-sm" data-empty-add type="button">Add ${noun}</button>`}</div>`;
      library.querySelector('[data-empty-add]')?.addEventListener('click',()=>openCreate(activeType));
    }else{
      library.innerHTML=items.map((item,index)=>{
        const row=item.sample;
        const image=activeType==='product'&&Array.isArray(row.image_urls)?row.image_urls[0]:activeType==='service'?row.image_url:'';
        return `<article class="ps-offer-row" data-item-index="${index}">
          <div class="ps-offer-media">${image?`<img src="${esc(image)}" alt="">`:`<i data-lucide="${activeType==='product'?'package':'briefcase-business'}" size="21"></i>`}</div>
          <div class="ps-offer-copy"><div class="ps-offer-titleline"><strong>${esc(row.name||'Untitled')}</strong>${row.price_cents!=null?`<span class="ps-offer-price">${esc(money(row.price_cents))}</span>`:''}</div>${row.description?`<p class="ps-offer-description">${esc(row.description)}</p>`:'<p class="ps-offer-description">No description added.</p>'}<div class="ps-card-tags">${cardTags(item)}</div></div>
          <div class="ps-offer-actions"><button class="btn btn-light btn-sm" data-edit-item type="button"><i data-lucide="pencil" size="14"></i> Edit &amp; assign</button><button class="icon-btn ps-delete-item" data-delete-item type="button" aria-label="Delete ${esc(row.name||'item')}"><i data-lucide="trash-2" size="16"></i></button></div>
        </article>`;
      }).join('');
      library.querySelectorAll('[data-item-index]').forEach((article,index)=>{
        article.querySelector('[data-edit-item]')?.addEventListener('click',()=>openEdit(items[index]));
        article.querySelector('[data-delete-item]')?.addEventListener('click',()=>deleteItem(items[index]));
      });
    }
    if(window.lucide)lucide.createIcons();
  }

  function setDialogType(type,{allowSwitch=true}={}){
    dialogType=type==='service'?'service':'product';
    $('#product-fields').hidden=dialogType!=='product';
    $('#service-fields').hidden=dialogType!=='service';
    $('#offer-type-switch').querySelectorAll('[data-dialog-type]').forEach(button=>{
      const active=button.dataset.dialogType===dialogType;
      button.classList.toggle('active',active);
      button.disabled=!allowSwitch;
    });
    const cta=$('#offer-cta');
    cta.closest('.form-group').hidden=dialogType==='product';
    if(dialogType==='service'&&!cta.value)cta.value='Learn more';
    if(window.lucide)lucide.createIcons();
  }

  function renderCardPicker(selectedIds=new Set()){
    const picker=$('#card-picker');
    if(!cards.length){picker.innerHTML='<div class="muted">No cards available.</div>';return;}
    picker.innerHTML=cards.map(card=>`<label class="ps-card-option"><input type="checkbox" value="${esc(card.id)}" ${selectedIds.has(String(card.id))?'checked':''}><span><strong>${esc(cardLabel(card))}</strong><small>${esc(cardSub(card))}</small></span></label>`).join('');
  }

  function resetForm(){
    $('#offer-form').reset();
    $('#offer-form-error').hidden=true;
    $('#offer-form-error').textContent='';
    editingItem=null;
    renderCardPicker();
  }

  function openCreate(type=activeType){
    if(!cards.length){toast('Create a card first');return;}
    if(type==='product'&&!canUseProducts()){
      toast('Products are included with Plus and Pro.');
      return;
    }
    resetForm();
    setDialogType(type,{allowSwitch:true});
    $('#offer-dialog-title').textContent='Add item';
    $('#offer-dialog-copy').textContent='Create it once and choose the card or cards where it should appear.';
    $('#save-offer-button').innerHTML='<i data-lucide="check" size="16"></i> Save item';
    $('#offer-dialog').showModal();
    setTimeout(()=>$('#offer-name').focus(),40);
    if(window.lucide)lucide.createIcons();
  }

  function openEdit(item){
    editingItem=item;
    const row=item.sample;
    setDialogType(item.type,{allowSwitch:false});
    $('#offer-dialog-title').textContent=`Edit ${item.type}`;
    $('#offer-dialog-copy').textContent='Update the item and choose exactly which cards should show it.';
    $('#offer-name').value=row.name||'';
    $('#offer-price').value=row.price_cents==null?'':(Number(row.price_cents)/100).toFixed(2);
    $('#offer-description').value=row.description||'';
    $('#offer-cta').value=row.cta_label||'Learn more';
    $('#product-image-url').value=Array.isArray(row.image_urls)?row.image_urls[0]||'':'';
    $('#product-purchase-url').value=row.purchase_url||'';
    $('#service-booking-url').value=row.booking_url||'';
    $('#service-payment-url').value=row.payment_url||'';
    $('#offer-form-error').hidden=true;
    const selected=new Set(item.rows.map(entry=>String(entry.card_id)));
    renderCardPicker(selected);
    $('#save-offer-button').innerHTML='<i data-lucide="check" size="16"></i> Save changes';
    $('#offer-dialog').showModal();
    if(window.lucide)lucide.createIcons();
  }

  function selectedCardIds(){return [...$('#card-picker').querySelectorAll('input:checked')].map(input=>String(input.value));}

  function formPayload(type){
    const name=$('#offer-name').value.trim();
    const description=$('#offer-description').value.trim()||null;
    const price_cents=priceToCents($('#offer-price').value);
    if(type==='product')return {name,description,price_cents,currency:'usd',image_urls:cleanUrl($('#product-image-url').value)?[cleanUrl($('#product-image-url').value)]:[],purchase_url:cleanUrl($('#product-purchase-url').value),is_enabled:true};
    return {name,description,price_cents,currency:'usd',image_url:editingItem?.sample?.image_url||null,booking_url:cleanUrl($('#service-booking-url').value),payment_url:cleanUrl($('#service-payment-url').value),cta_label:$('#offer-cta').value.trim()||'Learn more',is_enabled:true};
  }

  function formError(message){const box=$('#offer-form-error');box.textContent=message;box.hidden=false;}

  function countOnCard(type,cardId,excludeIds=new Set()){
    return rowsFor(type).filter(row=>String(row.card_id)===String(cardId)&&!excludeIds.has(String(row.id))).length;
  }

  async function syncCardVisibility(type,cardIds){
    const field=enableFieldFor(type);
    const unique=[...new Set(cardIds.map(String))];
    for(const cardId of unique){
      const {count,error}=await supabaseClient.from(tableFor(type)).select('id',{count:'exact',head:true}).eq('card_id',cardId);
      if(error){console.warn('LIW offer visibility count:',error);continue;}
      const {error:updateError}=await supabaseClient.from('digital_cards').update({[field]:Number(count||0)>0}).eq('user_id',user.id).eq('id',cardId);
      if(updateError)console.warn('LIW offer visibility sync:',updateError);
    }
  }

  async function saveOffer(event){
    event.preventDefault();
    const button=$('#save-offer-button');
    const type=editingItem?.type||dialogType;
    if(type==='product'&&!canUseProducts())return formError('Products are included with Plus and Pro.');
    const payload=formPayload(type);
    if(!payload.name)return formError('Add a name for this item.');
    const selected=selectedCardIds();
    if(!selected.length)return formError('Select at least one card.');

    const existingIds=new Set((editingItem?.rows||[]).map(row=>String(row.id)));
    const existingCards=new Map((editingItem?.rows||[]).map(row=>[String(row.card_id),row]));
    const limit=contentLimit(type);
    for(const cardId of selected){
      if(existingCards.has(cardId))continue;
      if(countOnCard(type,cardId,existingIds)>=limit)return formError(`${cardLabel(cards.find(card=>String(card.id)===cardId)||{})} has reached the ${type} limit for this plan (${limit}).`);
    }

    button.disabled=true;
    button.innerHTML='<i data-lucide="loader-circle" size="16"></i> Saving…';
    $('#offer-form-error').hidden=true;
    try{
      const table=tableFor(type);
      const affected=new Set([...selected,...existingCards.keys()]);
      const removeIds=(editingItem?.rows||[]).filter(row=>!selected.includes(String(row.card_id))).map(row=>row.id).filter(Boolean);
      if(removeIds.length){const {error}=await supabaseClient.from(table).delete().in('id',removeIds);if(error)throw error;}
      const updateIds=(editingItem?.rows||[]).filter(row=>selected.includes(String(row.card_id))).map(row=>row.id).filter(Boolean);
      if(updateIds.length){const {error}=await supabaseClient.from(table).update(payload).in('id',updateIds);if(error)throw error;}
      const inserts=selected.filter(cardId=>!existingCards.has(cardId)).map(cardId=>({...payload,card_id:cardId,sort_order:countOnCard(type,cardId,existingIds)}));
      if(inserts.length){const {error}=await supabaseClient.from(table).insert(inserts);if(error)throw error;}
      await syncCardVisibility(type,[...affected]);
      $('#offer-dialog').close();
      toast(editingItem?'Item updated across your cards':'Item added to your cards');
      await loadData({quiet:true});
    }catch(error){formError(error?.message||'Unable to save this item.');}
    finally{button.disabled=false;button.innerHTML=editingItem?'<i data-lucide="check" size="16"></i> Save changes':'<i data-lucide="check" size="16"></i> Save item';if(window.lucide)lucide.createIcons();}
  }

  async function deleteItem(item){
    const name=item.sample.name||'this item';
    if(!window.confirm(`Remove “${name}” from every card where it appears?`))return;
    const ids=item.rows.map(row=>row.id).filter(Boolean);
    const affected=item.rows.map(row=>String(row.card_id));
    try{
      if(ids.length){const {error}=await supabaseClient.from(tableFor(item.type)).delete().in('id',ids);if(error)throw error;}
      await syncCardVisibility(item.type,affected);
      toast(`${item.type==='product'?'Product':'Service'} removed`);
      await loadData({quiet:true});
    }catch(error){toast(error?.message||'Unable to remove this item');}
  }

  async function loadData({quiet=false}={}){
    if(!quiet)$('#offer-library').innerHTML='<div class="ps-loading"><i data-lucide="loader-circle" size="20"></i> Loading your library…</div>';
    const cardResult=await supabaseClient.from('digital_cards').select('id,full_name,company_name,internal_label,status,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false});
    if(cardResult.error)throw cardResult.error;
    cards=cardResult.data||[];
    if(!cards.length){serviceRows=[];productRows=[];render();return;}
    const ids=cards.map(card=>card.id);
    const [servicesResult,productsResult]=await Promise.all([
      supabaseClient.from('card_services').select('*').in('card_id',ids).order('sort_order'),
      supabaseClient.from('card_products').select('*').in('card_id',ids).order('sort_order')
    ]);
    if(servicesResult.error)throw servicesResult.error;
    if(productsResult.error)throw productsResult.error;
    serviceRows=servicesResult.data||[];
    productRows=productsResult.data||[];
    render();
  }

  function wire(){
    $('#add-offer-button').addEventListener('click',()=>openCreate(activeType));
    $('#offer-search').addEventListener('input',render);
    document.querySelectorAll('[data-offer-tab]').forEach(button=>button.addEventListener('click',()=>{
      activeType=button.dataset.offerTab;
      document.querySelectorAll('[data-offer-tab]').forEach(tab=>{const active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',active?'true':'false');});
      render();
    }));
    document.querySelectorAll('[data-dialog-type]').forEach(button=>button.addEventListener('click',()=>{
      if(editingItem)return;
      if(button.dataset.dialogType==='product'&&!canUseProducts()){formError('Products are included with Plus and Pro.');return;}
      setDialogType(button.dataset.dialogType,{allowSwitch:true});
    }));
    $('#offer-form').addEventListener('submit',saveOffer);
    $('#close-offer-dialog').addEventListener('click',()=>$('#offer-dialog').close());
    $('#cancel-offer-dialog').addEventListener('click',()=>$('#offer-dialog').close());
    $('#select-all-cards').addEventListener('click',()=>{
      const checks=[...$('#card-picker').querySelectorAll('input[type="checkbox"]')];
      const shouldSelect=checks.some(input=>!input.checked);
      checks.forEach(input=>{input.checked=shouldSelect;});
      $('#select-all-cards').textContent=shouldSelect?'Clear all':'Select all';
    });
    $('#ps-user-chip').addEventListener('click',()=>location.href='profile.html');
  }

  async function init(){
    try{
      user=await requireUser();
      if(!user)return;
      const chip=$('#ps-user-chip');
      const name=String(user.user_metadata?.full_name||user.email||'U').trim();
      chip.textContent=(name[0]||'U').toUpperCase();
      chip.title='Open profile';
      try{access=await getLiwAccessContext(user,{refresh:true});}catch(error){console.warn('LIW offer hub access fallback:',error);access=null;}
      planKey=access?.planKey||'starter';
      wire();
      await loadData();
      if(window.lucide)lucide.createIcons();
    }catch(error){
      console.error('LIW products/services hub:',error);
      $('#offer-library').innerHTML=`<div class="ps-empty"><span><i data-lucide="circle-alert" size="21"></i></span><strong>Could not load your library</strong><p>${esc(error?.message||'Try refreshing the page.')}</p><button class="btn btn-light btn-sm" onclick="location.reload()">Try again</button></div>`;
      if(window.lucide)lucide.createIcons();
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
