let publicCard = null;
let ownerPreview = false;
const publicCardLoadedAt = Date.now();

window.track = async function (type, targetId = null, metadata = {}) {
  if (!publicCard || ownerPreview) return;
  try {
    await supabaseClient.from('card_events').insert({
      card_id: publicCard.id,
      event_type: type,
      target_id: targetId,
      visitor_id: getVisitor(),
      device_type: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      browser: navigator.userAgent.slice(0, 100),
      referrer: document.referrer || null,
      metadata
    });
  } catch (_) {}
};

(async function loadPublicCard() {
  const slug = new URLSearchParams(location.search).get('slug');
  const timeout = setTimeout(() => showUnavailable('Still loading', 'The card took too long to load. Refresh the page and try again.'), 12000);
  try {
    if (!slug) return showUnavailable('Card not found', 'The card address is incomplete.');

    const { data: authData } = await supabaseClient.auth.getUser();
    const signedInUser = authData?.user || null;
    const { data: card, error } = await supabaseClient.rpc('public_card_by_slug', { p_slug: slug });
    if (error || !card) return showUnavailable('Card unavailable', 'This card is private, unpublished, or no longer active.');

    ownerPreview = card.status !== 'published' && Boolean(signedInUser);
    if (card.status !== 'published' && !ownerPreview) return showUnavailable('Card not published', 'The owner is still working on this card.');
    publicCard = card;

    const [linksResult, servicesResult, productsResult, downloadsResult, featureResult] = await Promise.all([
      supabaseClient.from('social_links').select('*').eq('card_id', card.id).eq('is_enabled', true).order('sort_order'),
      supabaseClient.from('card_services').select('*').eq('card_id', card.id).eq('is_enabled', true).order('sort_order'),
      supabaseClient.from('card_products').select('*').eq('card_id', card.id).eq('is_enabled', true).order('sort_order'),
      supabaseClient.from('card_downloads').select('*').eq('card_id', card.id).eq('is_enabled', true).order('sort_order'),
      supabaseClient.rpc('public_card_feature_access', { p_card_id: card.id })
    ]);

    let featureAccess = featureResult.data && typeof featureResult.data === 'object'
      ? featureResult.data
      : {};

    // public_card_feature_access intentionally protects unpublished cards, so a
    // signed-in owner/admin draft preview can receive an empty entitlement object.
    // For that private preview only, use the signed-in editor's current access so
    // Pro/Agency/Admin Flow and other paid design features render exactly as saved.
    if (ownerPreview && signedInUser && typeof getLiwAccessContext === 'function') {
      try {
        const previewAccess = await getLiwAccessContext(signedInUser, { refresh: true });
        const ownsCard = signedInUser.id === card.user_id;
        if (ownsCard || previewAccess?.isAdmin) {
          const previewEntitlements = previewAccess?.entitlements && typeof previewAccess.entitlements === 'object'
            ? previewAccess.entitlements
            : {};
          const previewPlan = String(previewAccess?.planKey || 'starter');
          const productLimit = previewAccess?.isAdmin ? 30 : previewPlan === 'pro' ? 12 : ['agency','white_label'].includes(previewPlan) ? 24 : previewPlan === 'plus' ? 4 : 0;
          const downloadLimit = previewAccess?.isAdmin ? 30 : previewPlan === 'pro' ? 10 : ['agency','white_label'].includes(previewPlan) ? 24 : previewPlan === 'plus' ? 3 : 0;
          featureAccess = {
            ...featureAccess,
            ...previewEntitlements,
            flow_experience: previewAccess.has?.('flow_experience') === true,
            product_limit: Number(featureAccess.product_limit || productLimit),
            download_limit: Number(featureAccess.download_limit || downloadLimit)
          };
        }
      } catch (previewAccessError) {
        console.warn('Private preview entitlement fallback unavailable:', previewAccessError);
      }
    }

    globalThis.publicCardFeatureAccess = featureAccess;
    renderCard(card, linksResult.data || [], servicesResult.data || [], productsResult.data || [], downloadsResult.data || [], ownerPreview, featureAccess);
    if (!ownerPreview) await recordView(card.id);
  } catch (error) {
    console.error(error);
    showUnavailable('Unable to load card', 'Please refresh the page. If the problem continues, contact the card owner.');
  } finally {
    clearTimeout(timeout);
  }
})();


function renderCard(cardData, links, services, products, downloads, isPreview, featureAccess = {}) {
  const customSeoAllowed = featureAccess.custom_seo === true;
  document.title = customSeoAllowed && cardData.seo_title ? cardData.seo_title : `${cardData.full_name} | Digital Business Card`;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.content = customSeoAllowed && cardData.seo_description ? cardData.seo_description : cardData.biography || `Connect with ${cardData.full_name || 'this business'}.`;
  const card = document.getElementById('card');
  const premiumTemplateBlocked = featureAccess.template_is_premium === true && featureAccess.premium_templates !== true;
  const layout = safePublicLayout(premiumTemplateBlocked ? 'classic' : (cardData.card_layout || 'classic'));
  const colorMode = cardData.color_mode === 'dark' ? 'dark' : 'light';
  const primary = cardData.primary_color || '#5b5cf0';
  const secondary = cardData.secondary_color || '#9b5de5';
  const buttonColor = cardData.button_color || primary;
  const buttonTextColor = cardData.button_text_color || '#ffffff';
  const requestedFont = cardData.font_family || 'DM Sans';
  const coreFonts = new Set(['dm sans','inter','manrope','georgia','arial']);
  const effectiveFont = featureAccess.expanded_fonts === true || coreFonts.has(String(requestedFont).toLowerCase()) ? requestedFont : 'DM Sans';
  card.className = `public-card public-layout-${layout} public-mode-${colorMode}`;
  card.style.background = cardData.background_color || '#fff';
  card.style.color = cardData.text_color || '#111827';
  card.style.fontFamily = effectiveFont;
  card.style.setProperty('--card-primary', primary);
  card.style.setProperty('--card-secondary', secondary);
  card.style.setProperty('--card-button', buttonColor);
  card.style.setProperty('--card-button-text', buttonTextColor);
  card.style.setProperty('--card-radius', `${cardData.border_radius || 16}px`);
  card.dataset.buttonStyle = cardData.button_style || 'filled';

  applyPublicCover(document.getElementById('public-cover'), { ...cardData, cover_image_url: featureAccess.cover_image === true ? cardData.cover_image_url : '' }, primary, secondary);
  document.querySelector('meta[name="theme-color"]').content = primary;

  document.getElementById('name').textContent = cardData.full_name || '';
  document.getElementById('title').textContent = cardData.job_title || '';
  document.getElementById('company').textContent = cardData.company_name || '';
  document.getElementById('headline').textContent = cardData.headline || '';
  document.getElementById('bio').textContent = cardData.biography || '';

  const initials = (cardData.full_name || 'DC').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const avatar = document.getElementById('avatar');
  avatar.style.borderRadius = cardData.profile_image_shape === 'square' ? '10px' : cardData.profile_image_shape === 'rounded' ? '27px' : '50%';
  const requestedProfileBorder = String(cardData.profile_border_color || '').trim().toLowerCase();
  avatar.style.borderColor = featureAccess.profile_border_color === true && /^#[0-9a-f]{6}$/.test(requestedProfileBorder) ? requestedProfileBorder : primary;
  avatar.innerHTML = cardData.profile_image_url
    ? `<img src="${escapeHtml(cardData.profile_image_url)}" alt="${escapeHtml(cardData.full_name || 'Profile photo')}">`
    : `<span>${escapeHtml(initials)}</span>`;
  const profileImage = avatar.querySelector('img');
  if (profileImage) {
    const positionX = Math.max(0, Math.min(100, Number(cardData.profile_position_x ?? 50)));
    const positionY = Math.max(0, Math.min(100, Number(cardData.profile_position_y ?? 22)));
    const zoom = Math.max(1.1, Math.min(2, Number(cardData.profile_zoom ?? 125) / 100));
    const maxTranslate = ((zoom - 1) / (2 * zoom)) * 100;
    const translateX = ((positionX - 50) / 50) * maxTranslate;
    const translateY = ((positionY - 50) / 50) * maxTranslate;
    profileImage.style.objectPosition = '50% 50%';
    profileImage.style.transformOrigin = 'center center';
    profileImage.style.transform = `scale(${zoom}) translate(${translateX}%, ${translateY}%)`;
  }

  const productLimit = Math.max(0, Number(featureAccess.product_limit || 0));
  const downloadLimit = Math.max(0, Number(featureAccess.download_limit || 0));
  const gatedCardData = {
    ...cardData,
    booking_enabled: featureAccess.appointment_booking === true && cardData.booking_enabled === true,
    lead_form_enabled: featureAccess.lead_capture === true && cardData.lead_form_enabled === true,
    products_enabled: featureAccess.product_showcase === true && cardData.products_enabled === true,
    services_enabled: featureAccess.services_section === true && cardData.services_enabled === true
  };
  renderActions(gatedCardData, primary);
  renderBusinessActions(gatedCardData, primary);
  renderSocials(links, gatedCardData);
  renderPaymentSharing(featureAccess.payment_sharing === true ? gatedCardData : { ...gatedCardData, payment_sharing_enabled: false });
  renderServices(gatedCardData.services_enabled ? services : []);
  renderProducts(gatedCardData.products_enabled ? products.slice(0, productLimit) : []);
  renderVideo(featureAccess.video_section === true ? gatedCardData : { ...gatedCardData, video_enabled: false });
  renderDownloads(featureAccess.file_downloads === true ? downloads.slice(0, downloadLimit) : []);
  renderLeadCapture(gatedCardData, gatedCardData.services_enabled ? services : [], isPreview);

  renderPublicBranding(gatedCardData, featureAccess);
  const qrCustomAllowed = featureAccess.custom_qr === true;
  const qrOptions = {
    size: 512,
    foreground: qrCustomAllowed ? cardData.qr_foreground_color : '#000000',
    background: qrCustomAllowed ? cardData.qr_background_color : '#FFFFFF',
    logoUrl: qrCustomAllowed ? String(cardData.qr_logo_url || '') : ''
  };
  const qrImage = document.getElementById('qr');
  qrImage.crossOrigin = 'anonymous';
  qrImage.src = window.LIWQr?.buildImageUrl
    ? window.LIWQr.buildImageUrl(location.href, qrOptions).url
    : `https://api.qrserver.com/v1/create-qr-code/?size=512x512&color=000000&bgcolor=FFFFFF&ecc=H&qzone=4&margin=0&data=${encodeURIComponent(location.href)}`;
  const qrLogo = document.getElementById('qr-logo');
  if (window.LIWQr?.applyLogo) window.LIWQr.applyLogo(qrLogo, qrOptions.logoUrl, qrCustomAllowed);
  else {
    qrLogo.hidden = !qrOptions.logoUrl;
    if (qrOptions.logoUrl) qrLogo.src = qrOptions.logoUrl;
  }
  document.getElementById('save').onclick = () => saveVcard(cardData);
  document.getElementById('share-top').onclick = shareCard;
  document.getElementById('qr-top').onclick = () => {
    document.getElementById('qr-dialog').showModal();
    track('qr_scan');
  };
  document.getElementById('close-qr').onclick = () => document.getElementById('qr-dialog').close();
  document.getElementById('copy-link').onclick = copyLink;

  document.getElementById('preview-banner').hidden = !isPreview;
  document.getElementById('loading').hidden = true;
  card.hidden = false;
  if (window.lucide) lucide.createIcons();
}



function applyPublicCover(element, cardData, primary, secondary) {
  if (!element) return;
  const gradient = cardData.gradient_background || `linear-gradient(135deg, ${primary}, ${secondary})`;
  const imageUrl = cardData.cover_image_url || '';
  const overlay = Math.max(0, Math.min(70, Number(cardData.cover_overlay ?? 24))) / 100;
  element.style.backgroundPosition = cardData.cover_position || 'center';
  element.style.backgroundSize = 'cover';
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundImage = imageUrl
    ? `linear-gradient(rgba(0,0,0,${overlay}),rgba(0,0,0,${overlay})),url("${String(imageUrl).replace(/"/g, '%22')}")`
    : gradient;
}

function renderPublicBranding(cardData, featureAccess = {}) {
  const element = document.getElementById('branding');
  if (!element) return;
  const requestedMode = cardData.branding_mode || (cardData.show_branding === false ? 'hidden' : 'liw');
  const mode = requestedMode === 'custom' && featureAccess.custom_branding_link === true
    ? 'custom'
    : requestedMode === 'hidden' && featureAccess.remove_branding === true
      ? 'hidden'
      : 'liw';
  element.classList.toggle('custom-branding', mode === 'custom');
  element.hidden = mode === 'hidden';
  if (mode === 'custom') {
    const text = cardData.custom_branding_text || cardData.company_name || 'Visit our website';
    const url = cardData.custom_branding_url || cardData.website || '#';
    element.href = normalizeUrl(url) || '#';
    element.innerHTML = `<span>${escapeHtml(text)}</span><i data-lucide="external-link" size="13"></i>`;
    element.onclick = () => track('custom_branding_click');
  } else {
    element.href = 'https://cards.liwworgs.com';
    element.innerHTML = '<span>Powered by</span><img src="assets/liw-worgs-logo.png" alt="LIW Worgs Inc">';
    element.onclick = () => track('liw_branding_click');
  }
}

function safePublicLayout(value) {
  const layout = String(value || 'classic').toLowerCase().replace(/[^a-z0-9-]/g, '');
  return ['classic', 'swipe', 'executive', 'minimal', 'spotlight', 'luxe', 'split', 'bold', 'soft', 'playful', 'editorial', 'diamond', 'property', 'beauty', 'automotive', 'artist', 'dining'].includes(layout) ? layout : 'classic';
}

function renderActions(cardData, primary) {
  const callNumber = String(cardData.phone || '').trim();
  const textNumber = String(cardData.sms_phone || '').trim() || callNumber;
  const actions = [
    { label: 'Call', icon: 'phone', href: callNumber && `tel:${callNumber}`, event: 'phone_click' },
    { label: 'Text', icon: 'message-square-text', href: textNumber && `sms:${textNumber}`, event: 'text_click' },
    { label: 'Email', icon: 'mail', href: cardData.email && `mailto:${cardData.email}`, event: 'email_click' },
    { label: 'Website', icon: 'globe', href: normalizeUrl(cardData.website), event: 'website_click' },
    { label: 'Directions', icon: 'map-pin', href: cardData.business_address && `https://maps.google.com/?q=${encodeURIComponent(cardData.business_address)}`, event: 'location_click' }
  ].filter(action => action.href);

  const area = document.getElementById('actions');
  area.innerHTML = actions.map(action => `<a class="action-tile" href="${escapeHtml(action.href)}" target="${action.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener" data-event="${action.event}" style="color:var(--card-primary);background:color-mix(in srgb,var(--card-primary) 9%,transparent)"><i data-lucide="${action.icon}" size="19"></i><span>${action.label}</span></a>`).join('');
  area.querySelectorAll('[data-event]').forEach(link => link.addEventListener('click', () => track(link.dataset.event)));
}

function renderBusinessActions(cardData, primary) {
  const actions = [];
  if (cardData.booking_enabled && cardData.booking_url) actions.push({ label: 'Book an appointment', icon: 'calendar-check-2', href: normalizeUrl(cardData.booking_url), event: 'booking_click' });
  if (cardData.payment_url) actions.push({ label: 'Make a payment', icon: 'badge-dollar-sign', href: normalizeUrl(cardData.payment_url), event: 'payment_click' });
  if (cardData.lead_form_enabled) actions.push({ label: 'Send an inquiry', icon: 'inbox', href: '#lead-section', event: 'lead_form_open' });
  const area = document.getElementById('business-actions');
  area.innerHTML = actions.map((action, index) => {
    const paymentClass = action.event === 'payment_click' ? 'payment-action' : '';
    return `<a class="business-action ${index === 0 ? 'primary' : ''} ${paymentClass}" href="${escapeHtml(action.href)}" ${action.href.startsWith('#') ? '' : 'target="_blank" rel="noopener"'} data-business-event="${action.event}" style="--action-color:${primary}"><i data-lucide="${action.icon}" size="19"></i><span>${action.label}</span><i data-lucide="arrow-up-right" size="17"></i></a>`;
  }).join('');
  area.querySelectorAll('[data-business-event]').forEach(link => link.addEventListener('click', () => track(link.dataset.businessEvent)));
}


function renderPaymentSharing(cardData) {
  const section = document.getElementById('payment-sharing-section');
  const container = document.getElementById('payment-sharing-methods');
  const qrWrap = document.getElementById('payment-sharing-qr-wrap');
  const qr = document.getElementById('payment-sharing-qr');
  if (!section || !container) return;

  const enabled = cardData.payment_sharing_enabled === true;
  const methods = [];
  const cashtag = String(cardData.cash_app_cashtag || '').trim().replace(/^\$/, '').replace(/[^a-zA-Z0-9_]/g, '');
  const venmo = String(cardData.venmo_username || '').trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_.-]/g, '');
  const paypal = String(cardData.paypal_url || '').trim();
  const zelle = String(cardData.zelle_contact || '').trim();

  if (cashtag) methods.push({
    key: 'cash_app',
    label: cardData.cash_app_label || 'Pay with Cash App',
    icon: 'badge-dollar-sign',
    href: `https://cash.app/$${encodeURIComponent(cashtag)}`
  });
  if (venmo) methods.push({
    key: 'venmo',
    label: cardData.venmo_label || 'Pay with Venmo',
    icon: 'wallet-cards',
    href: `https://venmo.com/u/${encodeURIComponent(venmo)}`
  });
  if (paypal) methods.push({
    key: 'paypal',
    label: cardData.paypal_label || 'Pay with PayPal',
    icon: 'credit-card',
    href: normalizeUrl(paypal)
  });
  if (zelle) methods.push({
    key: 'zelle',
    label: cardData.zelle_label || 'Copy Zelle info',
    icon: 'copy',
    copy: zelle
  });

  const qrUrl = String(cardData.payment_qr_url || '').trim();
  section.hidden = !enabled || (!methods.length && !qrUrl);
  if (section.hidden) {
    container.innerHTML = '';
    if (qrWrap) qrWrap.hidden = true;
    return;
  }

  container.innerHTML = methods.map(method => method.copy
    ? `<button class="payment-share-button" type="button" data-payment-copy="${escapeHtml(method.copy)}" data-payment-key="${method.key}"><i data-lucide="${method.icon}" size="19"></i><span>${escapeHtml(method.label)}</span></button>`
    : `<a class="payment-share-button" href="${escapeHtml(method.href)}" target="_blank" rel="noopener" data-payment-key="${method.key}"><i data-lucide="${method.icon}" size="19"></i><span>${escapeHtml(method.label)}</span></a>`
  ).join('');

  container.querySelectorAll('[data-payment-key]').forEach(element => {
    element.addEventListener('click', async () => {
      const copyValue = element.dataset.paymentCopy;
      if (copyValue) {
        try {
          await navigator.clipboard.writeText(copyValue);
          toast('Zelle payment information copied');
        } catch (_) {
          window.prompt('Copy this Zelle payment information:', copyValue);
        }
      }
      track('payment_share_click', element.dataset.paymentKey || null);
    });
  });

  if (qrWrap && qr) {
    qrWrap.hidden = !qrUrl;
    if (qrUrl) {
      qr.src = normalizeUrl(qrUrl);
      qr.onerror = () => { qrWrap.hidden = true; };
      qr.onclick = () => track('payment_share_click', 'payment_qr');
    }
  }
  if (window.lucide) lucide.createIcons();
}

function renderSocials(links, cardData = {}) {
  const section = document.getElementById('social-section');
  if (!links.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  const style = ['brand', 'circle', 'outline', 'solid'].includes(cardData.social_button_style) ? cardData.social_button_style : 'brand';
  const size = ['small', 'large'].includes(cardData.social_button_size) ? cardData.social_button_size : 'small';
  const area = document.getElementById('socials');
  area.dataset.socialStyle = style;
  area.dataset.socialSize = size;
  area.innerHTML = links.map(link => {
    const meta = socialMeta(link.platform);
    return `<a class="social-chip social-chip-${meta.key}" href="${escapeHtml(normalizeUrl(link.url))}" target="_blank" rel="noopener" data-id="${link.id}">${socialIconHtml(meta.key, { size: size === 'small' ? 14 : 17 })}<span>${escapeHtml(link.label || meta.label)}</span></a>`;
  }).join('');
  area.querySelectorAll('.social-chip').forEach(link => link.addEventListener('click', () => track('social_click', link.dataset.id)));
}

function renderServices(services) {
  const section = document.getElementById('services-section');
  if (!services.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  document.getElementById('services').innerHTML = services.map(service => {
    const url = service.booking_url || service.payment_url || '';
    return `<article class="public-service-card"><div class="service-card-main"><div><h3>${escapeHtml(service.name)}</h3>${service.description ? `<p>${escapeHtml(service.description)}</p>` : ''}</div>${service.price_cents != null ? `<strong>${formatMoney(service.price_cents)}</strong>` : ''}</div>${url ? `<a href="${escapeHtml(normalizeUrl(url))}" target="_blank" rel="noopener" data-service-id="${service.id}">${escapeHtml(service.cta_label || (service.booking_url ? 'Book now' : 'Pay now'))}<i data-lucide="arrow-right" size="16"></i></a>` : ''}</article>`;
  }).join('');
  document.querySelectorAll('[data-service-id]').forEach(link => link.addEventListener('click', () => track('service_click', link.dataset.serviceId)));
}

function renderProducts(products) {
  const section = document.getElementById('products-section');
  if (!products.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  document.getElementById('products').innerHTML = products.map(product => {
    const image = Array.isArray(product.image_urls) ? product.image_urls[0] : null;
    return `<article class="public-product-card">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}" loading="lazy">` : `<div class="product-placeholder"><i data-lucide="package" size="24"></i></div>`}<div class="public-product-copy"><h3>${escapeHtml(product.name)}</h3>${product.description ? `<p>${escapeHtml(product.description)}</p>` : ''}<div>${product.price_cents != null ? `<strong>${formatMoney(product.price_cents)}</strong>` : '<span></span>'}${product.purchase_url ? `<a href="${escapeHtml(normalizeUrl(product.purchase_url))}" target="_blank" rel="noopener" data-product-id="${product.id}">Buy <i data-lucide="arrow-up-right" size="15"></i></a>` : ''}</div></div></article>`;
  }).join('');
  document.querySelectorAll('[data-product-id]').forEach(link => link.addEventListener('click', () => track('product_click', link.dataset.productId)));
}


function videoEmbedUrl(url='') {
  try {
    const parsed = new URL(normalizeUrl(url));
    if (parsed.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${parsed.pathname.replace('/','')}`;
    if (parsed.hostname.includes('youtube.com')) return `https://www.youtube.com/embed/${parsed.searchParams.get('v') || parsed.pathname.split('/').pop()}`;
    if (parsed.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video/${parsed.pathname.split('/').filter(Boolean).pop()}`;
  } catch (_) {}
  return '';
}

function renderVideo(cardData) {
  const section=document.getElementById('video-section');
  if (!section || !cardData.video_enabled || !cardData.video_url) { if(section)section.hidden=true; return; }
  section.hidden=false;
  document.getElementById('video-heading').textContent=cardData.video_title||'Featured video';
  const embed=videoEmbedUrl(cardData.video_url);
  document.getElementById('public-video').innerHTML=embed
    ? `<div class="public-video-frame"><iframe src="${escapeHtml(embed)}" title="${escapeHtml(cardData.video_title||'Featured video')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : `<a class="public-download-row" href="${escapeHtml(normalizeUrl(cardData.video_url))}" target="_blank" rel="noopener" data-video-link><i data-lucide="circle-play"></i><span><strong>${escapeHtml(cardData.video_title||'Watch video')}</strong><small>Open video</small></span><i data-lucide="arrow-up-right"></i></a>`;
  section.querySelector('[data-video-link]')?.addEventListener('click',()=>track('video_click'));
}

function renderDownloads(downloads=[]) {
  const section=document.getElementById('downloads-section');
  if(!section||!downloads.length){if(section)section.hidden=true;return;}
  section.hidden=false;
  document.getElementById('downloads').innerHTML=downloads.map(item=>`<a class="public-download-row" href="${escapeHtml(normalizeUrl(item.file_url))}" target="_blank" rel="noopener" data-download-id="${item.id}"><i data-lucide="file-down"></i><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description||'Download file')}</small></span><i data-lucide="download"></i></a>`).join('');
  section.querySelectorAll('[data-download-id]').forEach(link=>link.addEventListener('click',()=>track('file_download',link.dataset.downloadId)));
}

function renderLeadCapture(cardData, services, isPreview) {
  const section = document.getElementById('lead-section');
  section.hidden = !cardData.lead_form_enabled;
  if (!cardData.lead_form_enabled) return;
  const form = document.getElementById('lead-form');
  const serviceSelect = document.getElementById('lead-service');
  const serviceNames = (services || []).map(service => service.name).filter(Boolean);
  if (serviceNames.length) {
    serviceSelect.hidden = false;
    serviceSelect.innerHTML = '<option value="">What are you interested in?</option>' + serviceNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  } else {
    serviceSelect.hidden = true;
  }
  if (isPreview) {
    form.querySelector('button[type="submit"]').disabled = true;
    form.querySelector('button[type="submit"]').innerHTML = '<i data-lucide="eye" size="17"></i> Disabled in draft preview';
    return;
  }
  form.addEventListener('submit', submitLead);
}

async function submitLead(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<span class="button-spinner"></span> Sending…';
  const data = new FormData(form);
  if (String(data.get('website_check') || '').trim()) {
    form.reset();
    button.disabled = false;
    button.innerHTML = original;
    return toast('Inquiry sent successfully');
  }
  if (Date.now() - publicCardLoadedAt < 900) {
    button.disabled = false;
    button.innerHTML = original;
    return toast('Please wait a moment and try again.');
  }
  const { error } = await supabaseClient.from('leads').insert({
    card_id: publicCard.id,
    owner_user_id: publicCard.user_id,
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim() || null,
    phone: String(data.get('phone') || '').trim() || null,
    message: String(data.get('message') || '').trim(),
    service_interest: String(data.get('service_interest') || '').trim() || null
  });
  button.disabled = false;
  button.innerHTML = original;
  if (error) return toast('Unable to send. Please contact the business directly.');
  form.reset();
  track('lead_submit');
  toast('Inquiry sent successfully');
}

async function shareCard() {
  const data = { title: publicCard?.full_name || 'Digital business card', text: `Connect with ${publicCard?.full_name || 'me'}`, url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(location.href);
    track('share_click');
    toast(navigator.share ? 'Share sheet opened' : 'Card link copied');
  } catch (_) {}
}

async function copyLink() {
  await navigator.clipboard.writeText(location.href);
  track('share_click');
  toast('Card link copied');
}

async function recordView(cardId) {
  try {
    await supabaseClient.from('card_views').insert({
      card_id: cardId,
      visitor_id: getVisitor(),
      device_type: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      browser: navigator.userAgent.slice(0, 100),
      referrer: document.referrer || null
    });
  } catch (_) {}
}

function getVisitor() {
  let id = localStorage.liwCardsVisitor;
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.liwCardsVisitor = id;
  }
  return id;
}

function normalizeUrl(url) {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);
}

function vcardEscape(value = '') {
  return String(value).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
}

function saveVcard(cardData) {
  const names = (cardData.full_name || '').trim().split(/\s+/);
  const last = names.length > 1 ? names.pop() : '';
  const first = names.join(' ');
  const vcard = `BEGIN:VCARD\r\nVERSION:3.0\r\nN:${vcardEscape(last)};${vcardEscape(first)};;;\r\nFN:${vcardEscape(cardData.full_name || '')}\r\nORG:${vcardEscape(cardData.company_name || '')}\r\nTITLE:${vcardEscape(cardData.job_title || '')}\r\nTEL;TYPE=CELL:${vcardEscape(cardData.phone || '')}\r\nEMAIL;TYPE=INTERNET:${vcardEscape(cardData.email || '')}\r\nURL:${vcardEscape(cardData.website || '')}\r\nADR;TYPE=WORK:;;${vcardEscape(cardData.business_address || '')};;;;\r\nNOTE:${vcardEscape(cardData.biography || '')}\r\nEND:VCARD\r\n`;
  const url = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${cardData.slug || 'contact'}.vcf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  track('contact_save');
  toast('Contact downloaded');
}

function showUnavailable(title, message) {
  const loading = document.getElementById('loading');
  document.getElementById('card').hidden = true;
  loading.hidden = false;
  loading.innerHTML = `<span class="empty-icon"><i data-lucide="link-2-off" size="28"></i></span><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(message)}</p><a class="btn btn-light" href="index.html">Visit LIW Digital Cards</a>`;
  if (window.lucide) lucide.createIcons();
}
