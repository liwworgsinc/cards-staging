/* LIW Cards — STAGING ONLY — full advanced-content live preview mirror.
   Mirrors Advanced Business Tools + Beef Up sections inside the editor phone
   using the same public-card visual structures. No observers are used. */
(function(){
  'use strict';
  if(window.__LIW_STAGING_FULL_PREVIEW_MIRROR__)return;
  window.__LIW_STAGING_FULL_PREVIEW_MIRROR__=true;

  const RICH_ORDER=['hours','gallery','testimonials','faq','location','cta','credentials','featured_links'];
  const RICH_META={
    hours:['Business hours','Availability'],gallery:['Gallery','Photos'],testimonials:['What clients say','Reviews'],
    faq:['Frequently asked questions','Helpful answers'],location:['Location','Find us'],cta:['Take the next step','Quick actions'],
    credentials:['Credentials','Trust & qualifications'],featured_links:['Featured links','Explore more']
  };

  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const field=name=>document.querySelector(`[name="${name}"]`);
  const val=name=>{const el=field(name);return !el?'':el.type==='checkbox'?el.checked:(el.value||'');};
  const money=cents=>{try{return typeof formatMoney==='function'?formatMoney(cents):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents||0)/100);}catch(_){return `$${(Number(cents||0)/100).toFixed(2)}`;}};
  const icon=(name,size=15)=>`<i data-lucide="${name}" size="${size}"></i>`;

  function globalList(name){
    try{
      if(name==='services'&&typeof services!=='undefined')return Array.isArray(services)?services:[];
      if(name==='products'&&typeof products!=='undefined')return Array.isArray(products)?products:[];
    }catch(_){ }
    return [];
  }

  function setPath(target,path,value){
    const parts=String(path||'').split('.').filter(Boolean);let cursor=target;
    parts.forEach((part,index)=>{
      const key=/^\d+$/.test(part)?Number(part):part;
      if(index===parts.length-1){cursor[key]=value;return;}
      const next=parts[index+1];
      if(cursor[key]==null)cursor[key]=/^\d+$/.test(next)?[]:{};
      cursor=cursor[key];
    });
  }

  function collectRichSections(){
    return RICH_ORDER.map(type=>{
      const editor=document.querySelector(`.rich-section-editor[data-rich-section="${type}"]`);
      if(!editor)return null;
      const enabled=editor.dataset.enabled==='true'||Boolean(editor.querySelector(`[data-rich-enable="${type}"]`)?.checked);
      const content={};
      editor.querySelectorAll(`[data-rich-type="${type}"][data-rich-path]`).forEach(input=>{
        const value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;
        setPath(content,input.dataset.richPath,value);
      });
      if(type==='gallery'){
        const images=[...editor.querySelectorAll('.rich-gallery-item img')];
        if(images.length){
          if(!Array.isArray(content.items))content.items=[];
          images.forEach((img,index)=>{
            if(!content.items[index])content.items[index]={};
            content.items[index].url=img.getAttribute('src')||'';
            const shownCaption=img.closest('.rich-gallery-item')?.querySelector('.rich-gallery-caption')?.textContent||'';
            if(!content.items[index].caption)content.items[index].caption=shownCaption;
          });
        }
      }
      const title=editor.querySelector('.rich-section-summary-copy strong')?.textContent?.trim()||RICH_META[type]?.[0]||type;
      return {type,title,enabled,content};
    }).filter(Boolean);
  }

  function formatTime(value){
    const match=String(value||'').match(/^(\d{1,2}):(\d{2})$/);if(!match)return value||'';
    let hour=Number(match[1]);const suffix=hour>=12?'PM':'AM';hour=hour%12||12;return `${hour}:${match[2]} ${suffix}`;
  }
  function richShell(section,body){
    const kicker=RICH_META[section.type]?.[1]||'Details';
    return `<section class="public-rich-section" data-preview-rich="${section.type}"><div class="public-rich-head"><h2>${esc(section.title)}</h2><span>${esc(kicker)}</span></div>${body}</section>`;
  }
  function renderRich(section){
    if(!section.enabled)return '';
    const c=section.content||{};
    if(section.type==='hours'){
      const days=(Array.isArray(c.days)?c.days:[]).filter(day=>day?.label);
      if(!days.length)return '';
      const rows=days.map(day=>`<div class="public-hours-row"><strong>${esc(day.label)}</strong><span>${day.closed?'Closed':`${esc(formatTime(day.open))} – ${esc(formatTime(day.close))}`}</span></div>`).join('');
      return richShell(section,`<div class="public-hours">${rows}</div>${c.note?`<p class="preview-rich-note">${esc(c.note)}</p>`:''}`);
    }
    if(section.type==='gallery'){
      const items=(Array.isArray(c.items)?c.items:[]).filter(item=>item?.url).slice(0,8);if(!items.length)return '';
      return richShell(section,`<div class="public-gallery-grid">${items.map((item,i)=>`<button type="button" tabindex="-1"><img src="${esc(item.url)}" alt="${esc(item.caption||`Gallery photo ${i+1}`)}"></button>`).join('')}</div>`);
    }
    if(section.type==='testimonials'){
      const items=(Array.isArray(c.items)?c.items:[]).filter(item=>item?.quote).slice(0,6);if(!items.length)return '';
      return richShell(section,`<div class="public-testimonial-list">${items.map(item=>{const rating=Math.max(1,Math.min(5,Number(item.rating||5)));return `<article class="public-testimonial"><div class="public-testimonial-stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</div><blockquote>“${esc(item.quote)}”</blockquote><footer>${item.name?`<strong>${esc(item.name)}</strong>`:'Customer'}${item.role?` · ${esc(item.role)}`:''}</footer></article>`;}).join('')}</div>`);
    }
    if(section.type==='faq'){
      const items=(Array.isArray(c.items)?c.items:[]).filter(item=>item?.question&&item?.answer).slice(0,8);if(!items.length)return '';
      return richShell(section,`<div class="public-faq-list">${items.map(item=>`<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join('')}</div>`);
    }
    if(section.type==='location'){
      const address=String(c.address||'').trim(),map=String(c.map_url||'').trim();if(!address&&!map)return '';
      return richShell(section,`<div class="public-location-card preview-location-card">${address?`<div class="preview-map-placeholder">${icon('map-pinned',20)}<span>Map preview</span></div><div class="public-location-address">${esc(address)}</div>`:''}<span class="public-rich-action">${icon('navigation',14)}${esc(c.label||'Get directions')}</span></div>`);
    }
    if(section.type==='cta'){
      const items=(Array.isArray(c.items)?c.items:[]).filter(item=>item?.label&&item?.url).slice(0,4);if(!items.length)return '';
      return richShell(section,`<div class="public-cta-grid">${items.map(item=>`<span class="public-cta-link ${item.style==='primary'?'primary':''}"><strong>${esc(item.label)}</strong>${icon('arrow-up-right',14)}</span>`).join('')}</div>`);
    }
    if(section.type==='credentials'){
      const items=(Array.isArray(c.items)?c.items:[]).filter(item=>item?.title).slice(0,6);if(!items.length)return '';
      return richShell(section,`<div class="public-credential-grid">${items.map(item=>`<article class="public-credential"><span class="public-credential-icon">${icon('badge-check',15)}</span><strong>${esc(item.title)}</strong>${item.issuer?`<small>${esc(item.issuer)}</small>`:''}${item.detail?`<small>${esc(item.detail)}</small>`:''}</article>`).join('')}</div>`);
    }
    if(section.type==='featured_links'){
      const items=(Array.isArray(c.items)?c.items:[]).filter(item=>item?.label&&item?.url).slice(0,6);if(!items.length)return '';
      return richShell(section,`<div class="public-featured-links">${items.map(item=>`<span class="public-featured-link"><span><strong>${esc(item.label)}</strong>${item.description?`<small>${esc(item.description)}</small>`:''}</span>${icon('arrow-up-right',14)}</span>`).join('')}</div>`);
    }
    return '';
  }

  function renderBusinessActions(){
    const actions=[];
    if(val('booking_enabled')&&String(val('booking_url')).trim())actions.push(['calendar-check-2','Book an appointment']);
    if(String(val('payment_url')).trim())actions.push(['badge-dollar-sign','Make a payment']);
    if(val('lead_form_enabled'))actions.push(['inbox','Send an inquiry']);
    if(!actions.length)return '';
    return `<div class="business-action-stack preview-mirror-actions">${actions.map((item,index)=>`<span class="business-action ${index===0?'primary':''}">${icon(item[0],17)}<span>${esc(item[1])}</span>${icon('arrow-up-right',15)}</span>`).join('')}</div>`;
  }

  function renderPaymentSharing(){
    if(!val('payment_sharing_enabled'))return '';
    const methods=[];
    if(String(val('cash_app_cashtag')).trim())methods.push(['badge-dollar-sign',val('cash_app_label')||'Pay with Cash App']);
    if(String(val('venmo_username')).trim())methods.push(['wallet-cards',val('venmo_label')||'Pay with Venmo']);
    if(String(val('paypal_url')).trim())methods.push(['credit-card',val('paypal_label')||'Pay with PayPal']);
    if(String(val('zelle_contact')).trim())methods.push(['copy',val('zelle_label')||'Copy Zelle info']);
    const qr=String(val('payment_qr_url')).trim();if(!methods.length&&!qr)return '';
    return `<section class="public-section payment-sharing-section"><div class="public-section-heading"><h2>Send a payment</h2><span>Payment information</span></div><div class="payment-sharing-grid">${methods.map(item=>`<span class="payment-share-button">${icon(item[0],17)}<span>${esc(item[1])}</span></span>`).join('')}</div>${qr?`<div class="payment-sharing-qr"><img src="${esc(qr)}" alt="Payment QR code"><small>Payment QR</small></div>`:''}</section>`;
  }

  function renderServices(){
    if(!val('services_enabled'))return '';
    const rows=globalList('services').filter(item=>item?.name?.trim()).slice(0,8);if(!rows.length)return '';
    return `<section class="public-section"><div class="public-section-heading"><h2>Services</h2><span>How I can help</span></div><div class="public-service-list">${rows.map(service=>`<article class="public-service-card"><div class="service-card-main"><div><h3>${esc(service.name)}</h3>${service.description?`<p>${esc(service.description)}</p>`:''}</div>${service.price_cents!=null?`<strong>${esc(money(service.price_cents))}</strong>`:''}</div>${service.booking_url||service.payment_url?`<span class="preview-public-row-link">${esc(service.cta_label||(service.booking_url?'Book now':'Pay now'))}${icon('arrow-right',14)}</span>`:''}</article>`).join('')}</div></section>`;
  }

  function renderProducts(){
    if(!val('products_enabled'))return '';
    const rows=globalList('products').filter(item=>item?.name?.trim()).slice(0,6);if(!rows.length)return '';
    return `<section class="public-section"><div class="public-section-heading"><h2>Featured products</h2><span>Shop & learn more</span></div><div class="public-product-grid">${rows.map(product=>{const image=Array.isArray(product.image_urls)?product.image_urls[0]:'';return `<article class="public-product-card">${image?`<img src="${esc(image)}" alt="${esc(product.name)}">`:`<div class="product-placeholder">${icon('package',20)}</div>`}<div class="public-product-copy"><h3>${esc(product.name)}</h3>${product.description?`<p>${esc(product.description)}</p>`:''}<div>${product.price_cents!=null?`<strong>${esc(money(product.price_cents))}</strong>`:'<span></span>'}${product.purchase_url?`<span class="preview-public-buy">Buy ${icon('arrow-up-right',13)}</span>`:''}</div></div></article>`;}).join('')}</div></section>`;
  }

  function renderLead(){
    if(!val('lead_form_enabled'))return '';
    return `<section class="public-section lead-capture-section"><div class="public-section-heading"><h2>Send an inquiry</h2><span>Let’s connect</span></div><div class="public-lead-form preview-lead-form"><div class="lead-form-row"><span class="preview-form-field">Your name</span><span class="preview-form-field">Phone number</span></div><span class="preview-form-field">Email address</span><span class="preview-form-field preview-form-message">How can I help you?</span><span class="btn btn-primary btn-block preview-disabled-submit">${icon('send',14)} Send inquiry</span></div></section>`;
  }

  function ensureContainer(){
    const content=document.querySelector('#phone-preview .preview-content');if(!content)return null;
    let container=document.getElementById('preview-public-mirror');
    if(!container){container=document.createElement('div');container.id='preview-public-mirror';container.className='preview-public-mirror';const branding=document.getElementById('preview-branding');if(branding)branding.insertAdjacentElement('beforebegin',container);else content.appendChild(container);}
    return container;
  }

  function hideLegacyAdvancedPreview(){
    ['preview-business-actions','preview-tools','preview-services-section','preview-products-section','preview-lead-section'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
    const chips=document.getElementById('rich-preview-chips');if(chips)chips.hidden=true;
  }

  function refresh(){
    const container=ensureContainer();if(!container)return;
    hideLegacyAdvancedPreview();
    const phone=document.getElementById('phone-preview');
    const primary=String(val('primary_color')||'#0b1438'),button=String(val('button_color')||primary),buttonText=String(val('button_text_color')||'#ffffff');
    phone?.style.setProperty('--card-primary',primary);phone?.style.setProperty('--card-secondary',String(val('secondary_color')||'#d4a84f'));phone?.style.setProperty('--card-button',button);phone?.style.setProperty('--card-button-text',buttonText);phone?.style.setProperty('--card-radius',`${val('border_radius')||16}px`);
    const rich=collectRichSections().map(renderRich).join('');
    const html=[renderBusinessActions(),renderPaymentSharing(),renderServices(),renderProducts(),renderLead(),rich].join('');
    container.innerHTML=html;container.hidden=!html.trim();
    if(window.lucide)try{lucide.createIcons();}catch(_){ }
  }

  window.LIWStagingPreviewMirror={refresh};
  document.addEventListener('change',event=>{
    if(event.target?.matches?.('[data-gallery-upload],#payment-qr-file')){setTimeout(refresh,1200);setTimeout(refresh,2800);}
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(refresh,500);setTimeout(refresh,1400);},{once:true});
  else {setTimeout(refresh,250);setTimeout(refresh,1200);}
})();