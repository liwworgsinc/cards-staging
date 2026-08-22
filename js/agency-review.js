/* LIW Cards — private Agency card review page. */
(function(){
  'use strict';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=value=>String(value??'').trim();
  const token=new URLSearchParams(location.search).get('token')||'';
  let payload=null;let busy=false;

  function toast(message){const el=$('#agency-review-toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(window.__reviewToast);window.__reviewToast=setTimeout(()=>el.classList.remove('show'),3200);}
  function initials(name){return clean(name||'DC').split(/\s+/).map(part=>part[0]||'').slice(0,2).join('').toUpperCase()||'DC';}
  function statusLabel(status){return ({sent:'Awaiting your response',approved:'Approved',changes_requested:'Changes requested'})[status]||'Ready for review';}
  async function invoke(body){
    const {data,error}=await supabaseClient.functions.invoke('review-agency-card',{body});
    if(error){let message=error.message||'Unable to process this review.';try{const context=error.context;const result=await context?.json?.();if(result?.error)message=result.error;}catch(_){}throw new Error(message);}
    if(data?.error)throw new Error(data.error);return data;
  }

  function renderBranding(){
    const brand=payload.branding||{};document.documentElement.style.setProperty('--review-primary',brand.primaryColor||'#07102e');document.documentElement.style.setProperty('--review-accent',brand.secondaryColor||'#d4a84f');
    const container=$('#agency-review-brand');
    const logo=clean(brand.logoUrl)?`<img src="${esc(brand.logoUrl)}" alt="${esc(brand.brandName||brand.agencyName||'Agency')}">`:`<strong>${esc(brand.brandName||brand.agencyName||'Agency')}</strong>`;
    container.innerHTML=`${logo}<div><strong>${esc(brand.brandName||brand.agencyName||'Agency')}</strong><small>${brand.whiteLabel?'Digital card review':`Prepared by ${esc(brand.agencyName||'your agency')}`}</small></div>`;
    const footer=$('#agency-review-footer');
    footer.innerHTML=brand.whiteLabel?`Review provided by ${esc(brand.agencyName||brand.brandName||'your agency')}`:`<span>Powered by LIW Cards</span><img src="assets/liw-worgs-logo.png" alt="LIW Worgs Inc">`;
  }

  function renderStatus(){
    const status=String(payload.approval?.status||'sent');const header=$('#agency-review-header-status');header.className=`agency-review-header-status ${status}`;header.innerHTML=`<i data-lucide="${status==='approved'?'badge-check':status==='changes_requested'?'message-square-warning':'clock-3'}" size="14"></i>${statusLabel(status)}`;
    const note=$('#agency-review-note');if(payload.approval?.message){note.hidden=false;note.innerHTML=`<strong>Note from ${esc(payload.branding?.agencyName||'the agency')}:</strong> ${esc(payload.approval.message)}`;}else note.hidden=true;
    const card=payload.preview?.card||{};
    const layout=clean(card.card_layout||'classic');
    $('#agency-review-preview-state').textContent=card.status==='published'?`Exact ${layout} card preview`:'Private draft';
  }

  function renderContact(card){
    const items=[];
    if(card.phone)items.push(['phone','Call']);if(card.sms_phone||card.phone)items.push(['message-square-text','Text']);if(card.email)items.push(['mail','Email']);if(card.website)items.push(['globe','Website']);if(card.business_address)items.push(['map-pin','Location']);
    return items.length?`<div class="agency-review-contact-grid">${items.map(([icon,label])=>`<span><i data-lucide="${icon}" size="14"></i>${label}</span>`).join('')}</div>`:'';
  }
  function renderSocials(rows){const items=(rows||[]).slice(0,10);if(!items.length)return '';return `<div class="agency-review-mini-section"><h3>Connected profiles</h3><div class="agency-review-chip-list">${items.map(row=>`<span>${esc(row.label||row.platform||'Social link')}</span>`).join('')}</div></div>`;}
  function renderServices(rows){const items=(rows||[]).slice(0,8);if(!items.length)return '';return `<div class="agency-review-mini-section"><h3>Services</h3><div class="agency-review-item-list">${items.map(row=>`<div class="agency-review-item"><strong>${esc(row.name||row.title||'Service')}</strong>${row.description?`<small>${esc(row.description)}</small>`:''}</div>`).join('')}</div></div>`;}
  function renderProducts(rows){const items=(rows||[]).slice(0,6);if(!items.length)return '';return `<div class="agency-review-mini-section"><h3>Featured products</h3><div class="agency-review-item-list">${items.map(row=>`<div class="agency-review-item"><strong>${esc(row.name||row.title||'Product')}</strong>${row.description?`<small>${esc(row.description)}</small>`:''}</div>`).join('')}</div></div>`;}
  function renderDownloads(rows){const items=(rows||[]).slice(0,6);if(!items.length)return '';return `<div class="agency-review-mini-section"><h3>Downloads</h3><div class="agency-review-chip-list">${items.map(row=>`<span>${esc(row.title||row.name||'Download')}</span>`).join('')}</div></div>`;}
  function renderRichSections(rows){const labels={hours:'Business hours',gallery:'Gallery',testimonials:'Testimonials',faq:'FAQ',location:'Location',cta:'Calls to action',credentials:'Credentials',featured_links:'Featured links'};const items=(rows||[]).filter(row=>row.section_type).slice(0,8);if(!items.length)return '';return `<div class="agency-review-mini-section"><h3>Additional card sections</h3><div class="agency-review-chip-list">${items.map(row=>`<span>${esc(row.title||labels[row.section_type]||row.section_type)}</span>`).join('')}</div></div>`;}

  function renderExactPublishedCard(card){
    if(String(card.status||'')!=='published'||!clean(card.slug))return false;
    const el=$('#agency-review-card');
    const frame=document.createElement('iframe');
    frame.title=`Preview of ${card.full_name||'digital card'}`;
    frame.loading='eager';
    frame.src=`card.html?slug=${encodeURIComponent(card.slug)}&agency_review=1`;
    frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads');
    frame.setAttribute('scrolling','yes');
    el.className='agency-review-card agency-review-card-live';
    el.removeAttribute('style');
    el.replaceChildren(frame);
    return true;
  }

  function renderCard(){
    const preview=payload.preview||{},card=preview.card||{};
    if(renderExactPublishedCard(card))return;

    const primary=card.primary_color||'#5b5cf0',secondary=card.secondary_color||'#9b5de5';const cover=clean(card.cover_image_url);const overlay=Math.max(0,Math.min(70,Number(card.cover_overlay??24)))/100;const coverStyle=cover?`background-image:linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url('${esc(cover)}');background-position:${esc(card.cover_position||'center')};`:`background:${esc(card.gradient_background||`linear-gradient(135deg,${primary},${secondary})`)};`;
    const avatar=card.profile_image_url?`<img src="${esc(card.profile_image_url)}" alt="${esc(card.full_name||'Profile photo')}">`:`<span>${esc(initials(card.full_name))}</span>`;
    const body=`<div class="agency-review-card-cover" style="${coverStyle}"><div class="agency-review-card-avatar" style="border-radius:${card.profile_image_shape==='square'?'12px':card.profile_image_shape==='rounded'?'28px':'50%'}">${avatar}</div></div><div class="agency-review-card-body"><h2>${esc(card.full_name||'Untitled card')}</h2>${card.job_title?`<p class="agency-review-card-title">${esc(card.job_title)}</p>`:''}${card.company_name?`<p class="agency-review-card-company">${esc(card.company_name)}</p>`:''}${card.headline?`<p class="agency-review-card-headline">${esc(card.headline)}</p>`:''}${card.biography?`<p class="agency-review-card-bio">${esc(card.biography)}</p>`:''}${renderContact(card)}${renderSocials(preview.socialLinks)}${card.services_enabled!==false?renderServices(preview.services):''}${card.products_enabled!==false?renderProducts(preview.products):''}${renderDownloads(preview.downloads)}${renderRichSections(preview.sections)}</div>`;
    const el=$('#agency-review-card');el.className='agency-review-card agency-review-card-draft';el.style.setProperty('--card-primary',primary);el.style.setProperty('--card-secondary',secondary);el.style.setProperty('--card-ink',card.text_color||'#111827');el.innerHTML=body;
  }

  function renderDecision(){
    const status=String(payload.approval?.status||'sent'),approve=$('#agency-review-approve'),request=$('#agency-review-request'),change=$('#agency-review-change-box'),final=$('#agency-review-final');
    change.hidden=true;final.hidden=true;approve.hidden=false;request.hidden=false;
    if(status==='approved'){approve.hidden=true;request.hidden=true;final.hidden=false;final.className='agency-review-final';final.innerHTML='<strong>Approved.</strong><br>Your agency has been notified in its dashboard and can publish the card.';}
    else if(status==='changes_requested'){approve.hidden=true;request.hidden=true;final.hidden=false;final.className='agency-review-final changes';final.innerHTML=`<strong>Changes requested.</strong><br>${esc(payload.approval?.client_feedback||'Your notes were sent to the agency.')}`;}
  }
  function renderAll(){renderBranding();renderStatus();renderCard();renderDecision();$('#agency-review-loading').hidden=true;$('#agency-review-error').hidden=true;$('#agency-review-app').hidden=false;if(window.lucide)try{lucide.createIcons();}catch(_){};}
  function showError(message){$('#agency-review-loading').hidden=true;$('#agency-review-app').hidden=true;$('#agency-review-error').hidden=false;$('#agency-review-error-copy').textContent=message||'This link may have expired or been replaced by a newer review.';if(window.lucide)try{lucide.createIcons();}catch(_){};}

  async function submitAction(action,feedback=''){
    if(busy)return;busy=true;const approve=$('#agency-review-approve'),submit=$('#agency-review-change-submit');approve.disabled=true;submit.disabled=true;
    try{const result=await invoke({token,action,feedback});payload.approval={...payload.approval,...result.approval};renderStatus();renderDecision();toast(action==='approved'?'Card approved. Thank you.':'Your requested changes were sent.');}
    catch(error){toast(error?.message||'Unable to send your response.');}
    finally{busy=false;approve.disabled=false;submit.disabled=false;if(window.lucide)try{lucide.createIcons();}catch(_){};}
  }

  function wire(){
    $('#agency-review-approve').addEventListener('click',()=>submitAction('approved'));
    $('#agency-review-request').addEventListener('click',()=>{$('#agency-review-change-box').hidden=false;$('#agency-review-feedback').focus();});
    $('#agency-review-change-cancel').addEventListener('click',()=>{$('#agency-review-change-box').hidden=true;});
    $('#agency-review-change-submit').addEventListener('click',()=>{const feedback=clean($('#agency-review-feedback').value);if(feedback.length<3){toast('Please describe the changes you need.');return;}submitAction('changes_requested',feedback);});
  }

  async function boot(){
    if(!/^[0-9a-f-]{30,80}$/i.test(token)){showError('This review link is incomplete or invalid.');return;}
    try{payload=await invoke({token,action:'load'});renderAll();wire();}
    catch(error){showError(error?.message||'This link may have expired or been replaced by a newer review.');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
