(() => {
  'use strict';
  if (window.__LIW_PUBLIC_ROLODEX_V1__) return;
  window.__LIW_PUBLIC_ROLODEX_V1__ = true;

  const PENDING_KEY = 'liw_rolodex_pending_slug';
  let mounted = false;
  let saving = false;

  function cardData() {
    try { return typeof publicCard !== 'undefined' && publicCard ? publicCard : null; } catch (_) { return null; }
  }

  function safe(value, max = 500) { return String(value ?? '').trim().slice(0, max); }

  function appUrl(path) {
    const staged = location.pathname.includes('/cards-staging/');
    return new URL(`${staged ? '/cards-staging/' : '/'}${String(path || '').replace(/^\//, '')}`, location.origin).href;
  }

  function slug() {
    return safe(cardData()?.slug || new URLSearchParams(location.search).get('slug'), 160);
  }

  function smartCardUrl() {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('slug', slug());
    url.searchParams.set('save', 'rolodex');
    return url.href;
  }

  function message(text, type = '') {
    const node = document.getElementById('liw-rolodex-public-status');
    if (node) {
      node.textContent = text || '';
      node.dataset.type = type;
    }
    try { if (typeof toast === 'function' && text) toast(text); } catch (_) {}
  }

  function pending(value) {
    try {
      if (value) sessionStorage.setItem(PENDING_KEY, value);
      else sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
  }

  function ensureStyle() {
    if (document.getElementById('liw-public-rolodex-style')) return;
    const style = document.createElement('style');
    style.id = 'liw-public-rolodex-style';
    style.textContent = `
      .liw-rolodex-public-wrap{display:grid;gap:7px;margin-top:9px}
      .liw-rolodex-public-button{width:100%;min-height:48px;display:flex;align-items:center;justify-content:center;gap:8px;border:1px solid color-mix(in srgb,var(--card-primary) 35%,#d0d5dd);border-radius:13px;background:color-mix(in srgb,var(--card-primary) 8%,#fff);color:var(--card-primary);font:inherit;font-size:.82rem;font-weight:850;cursor:pointer}
      .liw-rolodex-public-button:disabled{opacity:.62;cursor:wait}.liw-rolodex-public-status{min-height:16px;margin:0;text-align:center;color:color-mix(in srgb,currentColor 68%,transparent);font-size:.66rem;line-height:1.35}.liw-rolodex-public-status[data-type="success"]{color:#167746}.liw-rolodex-public-status[data-type="error"]{color:#b42318}
      .liw-rolodex-gate{width:min(430px,calc(100vw - 24px));max-width:none;padding:0;border:0;border-radius:24px;background:#fff;color:#101828;box-shadow:0 28px 90px rgba(7,13,35,.34)}.liw-rolodex-gate::backdrop{background:rgba(7,13,35,.66);backdrop-filter:blur(4px)}
      .liw-rolodex-gate-panel{padding:24px}.liw-rolodex-gate-mark{width:52px;height:52px;display:grid;place-items:center;margin-bottom:14px;border-radius:16px;background:#0b1438;color:#d4a84f}.liw-rolodex-gate h2{margin:0 0 7px;color:#0b1438;font-size:1.25rem}.liw-rolodex-gate p{margin:0;color:#667085;font-size:.83rem;line-height:1.55}.liw-rolodex-gate-card{display:flex;align-items:center;gap:10px;margin:16px 0;padding:11px 12px;border:1px solid #e4e7ec;border-radius:14px;background:#f8f9fb}.liw-rolodex-gate-avatar{width:40px;height:40px;display:grid;place-items:center;overflow:hidden;flex:0 0 40px;border-radius:50%;background:linear-gradient(135deg,#0b1438,#d4a84f);color:#fff;font-size:.72rem;font-weight:900}.liw-rolodex-gate-avatar img{width:100%;height:100%;object-fit:cover}.liw-rolodex-gate-card strong{display:block;color:#101828;font-size:.84rem}.liw-rolodex-gate-card span{display:block;margin-top:2px;color:#667085;font-size:.7rem}.liw-rolodex-gate-actions{display:grid;grid-template-columns:1fr;gap:8px}.liw-rolodex-gate-actions a,.liw-rolodex-gate-actions button{min-height:45px;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;text-decoration:none;font:inherit;font-size:.8rem;font-weight:850;cursor:pointer}.liw-rolodex-gate-primary{border:1px solid #0b1438;background:#0b1438;color:#fff}.liw-rolodex-gate-secondary{border:1px solid #d0d5dd;background:#fff;color:#344054}.liw-rolodex-gate-close{width:100%;margin-top:9px;border:0;background:transparent;color:#667085;font:inherit;font-size:.74rem;font-weight:750;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function refreshQr() {
    const data = cardData();
    const image = document.getElementById('qr');
    if (!data || !image || !slug()) return;
    const featureAccess = globalThis.publicCardFeatureAccess || {};
    const custom = featureAccess.custom_qr === true;
    const options = {
      size: 512,
      foreground: custom ? data.qr_foreground_color : '#000000',
      background: custom ? data.qr_background_color : '#FFFFFF',
      logoUrl: custom ? safe(data.qr_logo_url, 1000) : ''
    };
    try {
      image.src = window.LIWQr?.buildImageUrl
        ? window.LIWQr.buildImageUrl(smartCardUrl(), options).url
        : `https://api.qrserver.com/v1/create-qr-code/?size=512x512&color=000000&bgcolor=FFFFFF&ecc=H&qzone=4&margin=0&data=${encodeURIComponent(smartCardUrl())}`;
    } catch (_) {}
  }

  function gate() {
    ensureStyle();
    const data = cardData() || {};
    let dialog = document.getElementById('liw-rolodex-gate');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'liw-rolodex-gate';
      dialog.className = 'liw-rolodex-gate';
      document.body.appendChild(dialog);
    }
    const name = safe(data.full_name, 120) || 'this LIW Card';
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'LIW';
    const photo = safe(data.profile_image_url, 1000);
    dialog.innerHTML = `<div class="liw-rolodex-gate-panel">
      <span class="liw-rolodex-gate-mark"><i data-lucide="contact-round" size="25"></i></span>
      <h2>Save to your LIW Rolodex</h2>
      <p>Sign in or create a free LIW account. This card will be added automatically after you continue.</p>
      <div class="liw-rolodex-gate-card"><span class="liw-rolodex-gate-avatar">${photo ? `<img src="${photo.replace(/"/g, '&quot;')}" alt="">` : initials}</span><div><strong>${name.replace(/</g, '&lt;')}</strong><span>${safe(data.company_name || data.job_title, 160).replace(/</g, '&lt;') || 'LIW Digital Card'}</span></div></div>
      <div class="liw-rolodex-gate-actions"><a class="liw-rolodex-gate-primary" href="${appUrl('login.html')}"><i data-lucide="log-in" size="16"></i> Sign in & save</a><a class="liw-rolodex-gate-secondary" href="${appUrl('register.html')}"><i data-lucide="user-round-plus" size="16"></i> Create free account</a></div>
      <button class="liw-rolodex-gate-close" type="button">Not now</button>
    </div>`;
    dialog.querySelector('.liw-rolodex-gate-close')?.addEventListener('click', () => dialog.close());
    if (window.lucide) lucide.createIcons();
    if (!dialog.open) dialog.showModal();
  }

  async function currentUser() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    return data?.session?.user || null;
  }

  async function save(options = {}) {
    if (saving) return;
    const cardSlug = slug();
    if (!cardSlug) return;
    saving = true;
    const button = document.getElementById('liw-rolodex-public-button');
    if (button) button.disabled = true;
    message('Saving to your LIW Rolodex…');
    try {
      const signedIn = await currentUser();
      if (!signedIn) {
        pending(cardSlug);
        message('Sign in once and we’ll finish saving this card.');
        gate();
        return;
      }
      const { data, error } = await supabaseClient.rpc('rolodex_save_liw_card', { p_slug: cardSlug });
      if (error) throw error;
      const result = data || {};
      if (!result.ok) {
        if (result.reason === 'own_card') {
          message('This is your own LIW Card.', 'error');
          return;
        }
        if (result.reason === 'not_found') throw new Error('This LIW Card is not available to save.');
        throw new Error('This card could not be saved.');
      }
      pending('');
      message(result.already_saved ? 'Already in your Rolodex ✓' : 'Saved to your Rolodex ✓', 'success');
      if (button) {
        button.innerHTML = '<i data-lucide="check" size="17"></i> Saved to LIW Rolodex';
        button.disabled = true;
      }
      if (window.lucide) lucide.createIcons();
      try { if (typeof window.track === 'function') window.track('rolodex_save', cardSlug, { source: options.auto ? 'smart_qr' : 'card_button' }); } catch (_) {}
      if (options.auto) setTimeout(() => location.replace(appUrl('rolodex.html?scan=saved')), 260);
    } catch (error) {
      console.warn('[LIW Rolodex public save]', error);
      message(error?.message || 'Could not save to Rolodex. Try again.', 'error');
    } finally {
      saving = false;
      if (button && !button.textContent.includes('Saved to')) button.disabled = false;
    }
  }

  function mount() {
    if (mounted) return true;
    const data = cardData();
    const saveContact = document.getElementById('save');
    if (!data || !saveContact || !slug()) return false;
    mounted = true;
    ensureStyle();
    const wrap = document.createElement('div');
    wrap.className = 'liw-rolodex-public-wrap';
    wrap.innerHTML = `<button class="liw-rolodex-public-button" id="liw-rolodex-public-button" type="button"><i data-lucide="contact-round" size="17"></i> Save to LIW Rolodex</button><p class="liw-rolodex-public-status" id="liw-rolodex-public-status">Live LIW details stay updated in your Rolodex.</p>`;
    const businessActions = document.getElementById('business-actions');
    if (businessActions?.parentElement) businessActions.insertAdjacentElement('beforebegin', wrap);
    else saveContact.insertAdjacentElement('afterend', wrap);
    wrap.querySelector('button')?.addEventListener('click', () => save({ auto: false }));
    refreshQr();
    if (window.lucide) lucide.createIcons();
    if (new URLSearchParams(location.search).get('save') === 'rolodex') setTimeout(() => save({ auto: true }), 60);
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (mount() || attempts >= 40) clearInterval(timer);
  }, 125);
  setTimeout(mount, 0);
})();