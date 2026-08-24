(() => {
  const PENDING_KEY = 'liw_guest_product_pending_v1';
  const accountKey = userId => `liw_saved_guest_product_${userId}`;
  const styleId = 'liw-guest-product-editor-styles';

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function currentUser() {
    try { return typeof user !== 'undefined' ? user : null; } catch (_) { return null; }
  }

  function authClient() {
    try { return typeof supabaseClient !== 'undefined' ? supabaseClient : null; } catch (_) { return null; }
  }

  function canUseProducts() {
    try { return typeof hasEntitlement === 'function' && hasEntitlement('product_showcase'); } catch (_) { return false; }
  }

  function cleanProduct(product) {
    if (!product || !String(product.name || '').trim()) return null;
    return {
      name: String(product.name || '').trim(),
      description: product.description ? String(product.description).trim() : null,
      price_cents: product.price_cents == null ? null : Number(product.price_cents),
      currency: 'usd',
      image_urls: Array.isArray(product.image_urls) ? product.image_urls.filter(Boolean).slice(0, 1) : [],
      purchase_url: product.purchase_url ? String(product.purchase_url).trim() : null,
      is_enabled: true,
      sort_order: 0
    };
  }

  function injectStyles() {
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .liw-guest-product-saved{margin:0 0 14px;border:1px solid #eadba7;border-radius:16px;background:linear-gradient(135deg,#fffdf5,#fff8dc);padding:13px 14px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
      .liw-guest-product-saved.is-unlocked{border-color:#c8dfcf;background:linear-gradient(135deg,#f8fff9,#f1fbf4)}
      .liw-guest-product-saved-copy{min-width:0}.liw-guest-product-saved-kicker{display:inline-flex;align-items:center;gap:6px;font-size:.68rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:#775900;margin-bottom:4px}.liw-guest-product-saved.is-unlocked .liw-guest-product-saved-kicker{color:#246b3c}.liw-guest-product-saved strong{display:block;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.liw-guest-product-saved p{margin:4px 0 0;color:#667085;font-size:.78rem;line-height:1.4}.liw-guest-product-saved-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.liw-guest-product-saved .btn{white-space:nowrap}
      @media(max-width:700px){.liw-guest-product-saved{grid-template-columns:1fr}.liw-guest-product-saved-actions{justify-content:flex-start}.liw-guest-product-saved .btn{width:100%;justify-content:center}}
    `;
    document.head.appendChild(style);
  }

  async function persistToAccountMetadata(authUser, product) {
    const client = authClient();
    if (!authUser?.id || !product || !client) return false;
    try {
      const { data, error } = await client.auth.updateUser({ data: { liw_guest_saved_product: product } });
      if (error) return false;
      if (data?.user) {
        try { user = data.user; } catch (_) {}
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function clearAccountMetadata() {
    const client = authClient();
    if (!client) return;
    try {
      const { data, error } = await client.auth.updateUser({ data: { liw_guest_saved_product: null } });
      if (!error && data?.user) {
        try { user = data.user; } catch (_) {}
      }
    } catch (_) {}
  }

  function claimPendingProduct(authUser) {
    if (!authUser?.id) return null;
    const pending = readJson(PENDING_KEY);
    const pendingProduct = cleanProduct(pending?.product);
    const local = readJson(accountKey(authUser.id));
    const localProduct = cleanProduct(local?.product);
    const metadataProduct = cleanProduct(authUser.user_metadata?.liw_guest_saved_product);
    const product = pendingProduct || localProduct || metadataProduct;
    if (!product) return null;

    const record = { version: 1, savedAt: Date.now(), product };
    writeJson(accountKey(authUser.id), record);
    try { localStorage.removeItem(PENDING_KEY); } catch (_) {}
    if (pendingProduct) persistToAccountMetadata(authUser, product);
    return product;
  }

  function savedProduct(authUser) {
    if (!authUser?.id) return null;
    const local = cleanProduct(readJson(accountKey(authUser.id))?.product);
    const metadata = cleanProduct(authUser.user_metadata?.liw_guest_saved_product);
    return local || metadata;
  }

  function productCardHost() {
    const list = document.getElementById('product-list');
    if (!list) return null;
    return list.closest('.tool-editor-card') || list.parentElement;
  }

  function restoreProduct(authUser, product) {
    const cleaned = cleanProduct(product);
    if (!cleaned || !canUseProducts()) return;
    try {
      if (!Array.isArray(products)) return;
      const limit = typeof contentLimit === 'function' ? contentLimit('products') : 4;
      if (products.length >= limit) {
        if (typeof toast === 'function') toast(`Your plan supports up to ${limit} products per card.`);
        return;
      }
      const exists = products.some(item => String(item.name || '').trim().toLowerCase() === cleaned.name.toLowerCase() && String(item.purchase_url || '') === String(cleaned.purchase_url || ''));
      if (!exists) products.push(cleaned);
      const toggle = typeof field === 'function' ? field('products_enabled') : document.querySelector('[name="products_enabled"]');
      if (toggle) toggle.checked = true;
      if (typeof renderProductRows === 'function') renderProductRows();
      if (typeof render === 'function') render();
      if (typeof scheduleSave === 'function') scheduleSave();
      try { localStorage.removeItem(accountKey(authUser.id)); } catch (_) {}
      clearAccountMetadata();
      document.querySelector('[data-liw-guest-product-saved]')?.remove();
      if (typeof toast === 'function') toast('Your saved guest product is now on this card.');
    } catch (_) {}
  }

  function renderNotice(authUser, product) {
    const host = productCardHost();
    const list = document.getElementById('product-list');
    if (!host || !list || !product) return false;
    injectStyles();
    let notice = host.querySelector('[data-liw-guest-product-saved]');
    if (!notice) {
      notice = document.createElement('div');
      notice.dataset.liwGuestProductSaved = 'true';
      list.before(notice);
    }
    const unlocked = canUseProducts();
    notice.className = `liw-guest-product-saved${unlocked ? ' is-unlocked' : ''}`;
    notice.innerHTML = `
      <div class="liw-guest-product-saved-copy">
        <span class="liw-guest-product-saved-kicker"><i data-lucide="${unlocked ? 'circle-check' : 'lock'}" size="14"></i>${unlocked ? 'PLUS UNLOCKED' : 'SAVED FROM GUEST PREVIEW'}</span>
        <strong>${escapeHtmlSafe(product.name)}</strong>
        <p>${unlocked ? 'Your one-product preview is ready to add to this card.' : 'This product is saved to your LIW account, but it will not appear on a Free card. Upgrade to Plus when you want to publish it.'}</p>
      </div>
      <div class="liw-guest-product-saved-actions">
        ${unlocked ? '<button class="btn btn-primary btn-sm" type="button" data-restore-guest-product><i data-lucide="package-plus" size="15"></i> Add saved product</button>' : '<a class="btn btn-light btn-sm" href="pricing.html#individual-plans"><i data-lucide="sparkles" size="15"></i> See Plus</a>'}
      </div>`;
    notice.querySelector('[data-restore-guest-product]')?.addEventListener('click', () => restoreProduct(authUser, product));
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    return true;
  }

  function escapeHtmlSafe(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const authUser = currentUser();
    if (!authUser?.id || !document.getElementById('product-list')) {
      if (attempts > 80) clearInterval(timer);
      return;
    }
    claimPendingProduct(authUser);
    const product = savedProduct(authUser);
    if (!product) {
      clearInterval(timer);
      return;
    }
    if (renderNotice(authUser, product)) clearInterval(timer);
  }, 250);
})();
