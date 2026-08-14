let resellerStore = null;
let resellerAdminPreview = false;

(async function loadResellerPage() {
  const pageParams = new URLSearchParams(location.search);
  const storeSlug = pageParams.get('store')?.trim().toLowerCase();
  const adminPreviewRequested = pageParams.get('preview') === 'admin';

  // /reseller.html is the public reseller-program page.
  // /reseller.html?store=business-slug is an individual reseller storefront.
  if (!storeSlug) {
    if (LIW_CONFIG.resellerPlansEnabled !== true) {
      location.replace(liwUrl('pricing.html'));
      return;
    }
    showResellerProgram();
    return;
  }

  if (LIW_CONFIG.resellerPlansEnabled !== true) {
    showStoreShell();
    showStoreError('This sales page is not available yet. Stripe Connect must be configured and tested before reseller orders can open.');
    return;
  }

  showStoreShell();
  try {
    let result = null;

    if (adminPreviewRequested) {
      result = await loadAdminStorePreview(storeSlug, { requireLogin: true });
    } else {
      result = await supabaseClient.rpc('public_reseller_store', { p_store_slug: storeSlug });

      // An authenticated LIW admin may open the ordinary storefront URL from an
      // old bookmark or cached dashboard link. If live checkout is unavailable,
      // securely fall back to the admin-only preview RPC. Regular visitors cannot
      // use this path because the RPC verifies the signed-in user's admin role.
      if (result.error || !result.data || typeof result.data !== 'object') {
        const previewResult = await loadAdminStorePreview(storeSlug, { requireLogin: false });
        if (previewResult?.data && !previewResult.error) result = previewResult;
      }
    }

    const { data, error } = result || {};
    if (error) throw error;
    if (!data || typeof data !== 'object') {
      return showStoreError(resellerAdminPreview
        ? 'Save the reseller storefront settings before opening the admin preview.'
        : 'This seller is not accepting orders right now.');
    }
    resellerStore = data;
    renderResellerStore();
  } catch (error) {
    console.error(error);
    showStoreError(error.message || 'Unable to load this sales page.');
  }
})();

async function loadAdminStorePreview(storeSlug, { requireLogin = false } = {}) {
  const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !user) {
    if (requireLogin) throw new Error('Log in as an LIW administrator to open this preview.');
    return null;
  }

  const result = await supabaseClient.rpc('admin_preview_reseller_store', { p_store_slug: storeSlug });
  if (!result.error && result.data && typeof result.data === 'object') resellerAdminPreview = true;
  if (requireLogin && result.error) throw result.error;
  return result;
}

function showResellerProgram() {
  document.body.className = 'marketing-page reseller-program-body';
  document.getElementById('reseller-store-shell').hidden = true;
  document.getElementById('reseller-program-page').hidden = false;
  document.title = 'Reseller Program | LIW Digital Cards';
  document.querySelector('meta[name="description"]').content = 'Launch and grow a professional digital-card business with LIW reseller tools, branded storefronts, client management, and secure payments.';
  initResellerCalculator();
  if (window.lucide) lucide.createIcons();
}

function initResellerCalculator() {
  const priceInput = document.getElementById('reseller-client-price');
  const clientsInput = document.getElementById('reseller-monthly-clients');
  if (!priceInput || !clientsInput) return;

  const update = () => {
    const clientPrice = Math.max(0, Number(priceInput.value) || 0);
    const monthlyClients = Math.max(0, Number(clientsInput.value) || 0);
    const monthlyGross = clientPrice * monthlyClients;
    const annualGross = monthlyGross * 12;
    const monthlyOutput = document.getElementById('reseller-monthly-gross');
    const annualOutput = document.getElementById('reseller-annual-gross');
    const message = document.getElementById('reseller-calc-message');

    if (monthlyOutput) monthlyOutput.textContent = formatMoney(monthlyGross, 0);
    if (annualOutput) annualOutput.textContent = formatMoney(annualGross, 0);

    if (message) {
      const salesToCover = clientPrice > 0 ? Math.ceil(599 / clientPrice) : 0;
      const messageText = message.querySelector('span');
      if (messageText) {
        if (salesToCover > 0) {
          messageText.textContent = `At this example price, about ${salesToCover} client ${salesToCover === 1 ? 'sale' : 'sales'} would cover the $599 annual platform cost before other expenses.`;
        } else {
          messageText.textContent = 'Enter an example client price to estimate how many sales could cover the annual platform cost.';
        }
      }
    }
  };

  priceInput.addEventListener('input', update);
  clientsInput.addEventListener('input', update);
  update();
}

function formatMoney(amount, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(amount || 0));
}

function showStoreShell() {
  document.body.className = 'reseller-store-body';
  document.getElementById('reseller-program-page').hidden = true;
  document.getElementById('reseller-store-shell').hidden = false;
}

function renderResellerStore() {
  const primary = resellerStore.primary_color || '#0b1438';
  const secondary = resellerStore.secondary_color || '#d4a84f';
  const brandName = resellerStore.brand_name || 'Digital Card Studio';
  const offerName = resellerStore.offer_name || 'Professional Digital Card';
  const offerDescription = resellerStore.offer_description || 'A professionally prepared digital business card built around your business information and brand.';
  const priceText = formatMoney(Number(resellerStore.price_cents || 0) / 100);

  document.documentElement.style.setProperty('--store-primary', primary);
  document.documentElement.style.setProperty('--store-secondary', secondary);
  document.querySelector('meta[name="theme-color"]').content = primary;
  document.title = resellerAdminPreview ? `Preview: ${brandName} | LIW Cards` : `${brandName} | Order a Digital Card`;
  document.querySelector('meta[name="description"]').content = `Order a professional digital business card from ${brandName}.`;

  document.querySelectorAll('[data-reseller-brand]').forEach(element => { element.textContent = brandName; });
  document.querySelectorAll('[data-reseller-price]').forEach(element => { element.textContent = priceText; });
  document.getElementById('reseller-store-brand').textContent = brandName;
  document.getElementById('reseller-offer-name').textContent = offerName;
  document.getElementById('reseller-offer-description').textContent = offerDescription;
  document.getElementById('reseller-offer-price').textContent = priceText;

  renderSellerSupport();

  const logo = document.getElementById('reseller-store-logo');
  if (resellerStore.logo_url) {
    logo.innerHTML = `<img src="${escapeHtml(resellerStore.logo_url)}" alt="${escapeHtml(brandName)} logo">`;
  } else {
    const initials = brandName.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'DC';
    logo.innerHTML = `<span class="reseller-store-initials">${escapeHtml(initials)}</span>`;
  }

  const checkoutForm = document.getElementById('reseller-checkout-form');
  if (resellerAdminPreview) {
    const banner = document.getElementById('reseller-admin-preview-banner');
    if (banner) banner.hidden = false;
    checkoutForm.querySelectorAll('input,textarea,button').forEach(control => {
      control.disabled = true;
      control.setAttribute('aria-disabled', 'true');
    });
    const checkoutButton = checkoutForm.querySelector('button[type="submit"]');
    if (checkoutButton) checkoutButton.innerHTML = '<i data-lucide="eye" size="18"></i> Admin preview — checkout disabled';
  } else {
    checkoutForm.addEventListener('submit', startResellerCheckout);
  }

  document.getElementById('reseller-store-loading').hidden = true;
  document.getElementById('reseller-store-card').hidden = false;
  if (new URLSearchParams(location.search).get('checkout') === 'cancelled') toast('Checkout was canceled. No payment was made.');
  if (window.lucide) lucide.createIcons();
}

function renderSellerSupport() {
  const supportContainer = document.getElementById('reseller-store-support');
  const helpCopy = document.getElementById('reseller-store-help-copy');
  if (!supportContainer) return;

  supportContainer.replaceChildren();
  const supportItems = [];

  if (resellerStore.support_email) {
    const emailLink = document.createElement('a');
    emailLink.href = `mailto:${resellerStore.support_email}`;
    emailLink.innerHTML = '<i data-lucide="mail" size="15"></i>';
    emailLink.append(document.createTextNode(resellerStore.support_email));
    supportItems.push(emailLink);
  }

  if (resellerStore.support_phone) {
    const phoneLink = document.createElement('a');
    phoneLink.href = `tel:${String(resellerStore.support_phone).replace(/[^+\d]/g, '')}`;
    phoneLink.innerHTML = '<i data-lucide="phone" size="15"></i>';
    phoneLink.append(document.createTextNode(resellerStore.support_phone));
    supportItems.push(phoneLink);
  }

  supportItems.forEach(item => supportContainer.append(item));
  if (!supportItems.length) supportContainer.textContent = 'Professional digital-card services';

  if (helpCopy) {
    if (resellerStore.support_email || resellerStore.support_phone) {
      helpCopy.textContent = 'Use the seller contact information above for service, timing, or order questions.';
    } else {
      helpCopy.textContent = 'Submit your order details and the seller will follow up with the next steps.';
    }
  }
}

async function startResellerCheckout(event) {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  button.dataset.original = button.innerHTML;
  button.innerHTML = '<span class="button-spinner"></span> Opening secure checkout…';
  try {
    const response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/create-reseller-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': LIW_CONFIG.supabaseKey },
      body: JSON.stringify({
        storeSlug: resellerStore.store_slug,
        buyerName: document.getElementById('buyer-name').value,
        buyerEmail: document.getElementById('buyer-email').value,
        buyerPhone: document.getElementById('buyer-phone').value,
        buyerNotes: document.getElementById('buyer-notes').value
      })
    });
    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) throw new Error(data.error || 'Unable to start checkout.');
    if (!data.url) throw new Error('Stripe did not return a checkout page.');
    location.href = data.url;
  } catch (error) {
    toast(error.message || 'Unable to open checkout.');
    button.disabled = false;
    button.innerHTML = button.dataset.original;
    if (window.lucide) lucide.createIcons();
  }
}

function showStoreError(message) {
  document.getElementById('reseller-store-loading').hidden = true;
  document.getElementById('reseller-store-card').hidden = true;
  document.getElementById('reseller-store-error').hidden = false;
  document.getElementById('reseller-store-error-copy').textContent = message;
  if (window.lucide) lucide.createIcons();
}
