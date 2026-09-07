(() => {
  'use strict';
  if (window.__LIW_EDITOR_ROLODEX_V1__) return;
  window.__LIW_EDITOR_ROLODEX_V1__ = true;
  const PENDING_KEY = 'liw_rolodex_pending_slug';

  function appUrl(path) {
    const staged = location.pathname.includes('/cards-staging/');
    return new URL(`${staged ? '/cards-staging/' : '/'}${String(path || '').replace(/^\//, '')}`, location.origin).href;
  }

  function smartCardTarget(value) {
    try {
      const url = new URL(value, location.href);
      if (!/\/card\.html$/i.test(url.pathname) || !url.searchParams.get('slug')) return value;
      url.searchParams.set('save', 'rolodex');
      return url.href;
    } catch (_) {
      return value;
    }
  }

  function installQrOverride() {
    const original = window.buildQrImageUrl;
    if (typeof original !== 'function' || original.__liwRolodexSmartQr) return false;
    const wrapped = function(url, size) { return original.call(this, smartCardTarget(url), size); };
    wrapped.__liwRolodexSmartQr = true;
    wrapped.__liwOriginal = original;
    window.buildQrImageUrl = wrapped;
    return true;
  }

  async function resumePending() {
    let pending = '';
    try { pending = String(sessionStorage.getItem(PENDING_KEY) || '').trim(); } catch (_) {}
    if (!pending || typeof supabaseClient === 'undefined') return;
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.user) location.replace(appUrl('rolodex.html?resume=1'));
    } catch (_) {}
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (installQrOverride() || attempts >= 20) clearInterval(timer);
  }, 100);
  installQrOverride();
  setTimeout(resumePending, 80);
})();