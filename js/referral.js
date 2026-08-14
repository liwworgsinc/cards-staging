(function () {
  const STORAGE_CODE = 'liw_affiliate_code';
  const STORAGE_SEEN = 'liw_affiliate_seen_at';
  const STORAGE_VISITOR = 'liw_affiliate_visitor_id';
  const STORAGE_LANDING = 'liw_affiliate_landing_url';
  const STORAGE_REFERRER = 'liw_affiliate_referrer_url';
  const SESSION_CODE = 'liw_affiliate_session_code';
  const COOKIE_CODE = 'liw_affiliate_code';
  const ATTRIBUTION_MS = 30 * 86400000;
  const CODE_PATTERN = /^[A-Z0-9_-]{4,40}$/;

  function safeStorageGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function safeStorageSet(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  function safeStorageRemove(key) { try { localStorage.removeItem(key); } catch (_) {} }
  function safeSessionGet(key) { try { return sessionStorage.getItem(key); } catch (_) { return null; } }
  function safeSessionSet(key, value) { try { sessionStorage.setItem(key, value); } catch (_) {} }
  function safeSessionRemove(key) { try { sessionStorage.removeItem(key); } catch (_) {} }

  function cookieValue(name) {
    const prefix = `${name}=`;
    return document.cookie.split(';').map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length) || '';
  }

  function writeCookie(code) {
    document.cookie = `${COOKIE_CODE}=${encodeURIComponent(code)}; Max-Age=${30 * 86400}; Path=/; SameSite=Lax; Secure`;
  }

  function clearCookie() {
    document.cookie = `${COOKIE_CODE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
  }

  function normalizeCode(value) {
    const code = String(value || '').trim().toUpperCase();
    return CODE_PATTERN.test(code) ? code : '';
  }

  function pathCode() {
    const path = decodeURIComponent(location.pathname || '/').replace(/^\/+|\/+$/g, '');
    if (!path || path.includes('/') || path.includes('.')) return '';
    const reserved = new Set(['INDEX','LOGIN','REGISTER','PRICING','DASHBOARD','EDITOR','CARD','AFFILIATE','ADDONS','ADMIN','INSTALL','MEDIA','ANALYTICS','LEADS','PRIVACY','TERMS','OFFLINE']);
    const code = normalizeCode(path);
    return code && !reserved.has(code) ? code : '';
  }

  function queryCode() {
    const params = new URLSearchParams(location.search);
    return normalizeCode(params.get('ref') || params.get('refcode') || params.get('affiliate'));
  }

  function isExpired() {
    const seen = safeStorageGet(STORAGE_SEEN);
    const time = seen ? new Date(seen).getTime() : 0;
    return !time || !Number.isFinite(time) || Date.now() - time > ATTRIBUTION_MS;
  }

  function getVisitorId() {
    let id = safeStorageGet(STORAGE_VISITOR);
    if (id) return id;
    id = globalThis.crypto?.randomUUID?.() || `liw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    safeStorageSet(STORAGE_VISITOR, id);
    return id;
  }

  function clearAnonymous() {
    [STORAGE_CODE, STORAGE_SEEN, STORAGE_LANDING, STORAGE_REFERRER].forEach(safeStorageRemove);
    safeSessionRemove(SESSION_CODE);
    clearCookie();
  }

  function storedAnonymousCode() {
    if (isExpired()) clearAnonymous();
    return normalizeCode(safeStorageGet(STORAGE_CODE))
      || normalizeCode(safeSessionGet(SESSION_CODE))
      || normalizeCode(decodeURIComponent(cookieValue(COOKIE_CODE) || ''))
      || '';
  }

  function persist(code, force = false) {
    const normalized = normalizeCode(code);
    if (!normalized) return '';
    const existing = storedAnonymousCode();
    const chosen = force ? normalized : (existing || normalized);
    safeStorageSet(STORAGE_CODE, chosen);
    if (!safeStorageGet(STORAGE_SEEN) || force) safeStorageSet(STORAGE_SEEN, new Date().toISOString());
    safeSessionSet(SESSION_CODE, chosen);
    if (!safeStorageGet(STORAGE_LANDING)) safeStorageSet(STORAGE_LANDING, location.href.slice(0, 1500));
    if (!safeStorageGet(STORAGE_REFERRER) && document.referrer) safeStorageSet(STORAGE_REFERRER, document.referrer.slice(0, 1500));
    writeCookie(chosen);
    getVisitorId();
    return chosen;
  }

  function getCode(user = null) {
    // Once signup has stored the code in auth metadata, that account attribution
    // outranks any later URL, cookie, tab, or device-local value.
    const metadataCode = normalizeCode(user?.user_metadata?.affiliate_code);
    if (metadataCode) return persist(metadataCode, true);
    return storedAnonymousCode();
  }

  function cleanVisibleUrl() {
    try {
      const url = new URL(location.href);
      let changed = false;
      ['ref','refcode','affiliate'].forEach(key => { if (url.searchParams.has(key)) { url.searchParams.delete(key); changed = true; } });
      if (changed) history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    } catch (_) {}
  }

  function capture() {
    const existing = storedAnonymousCode();
    const incoming = queryCode() || pathCode();
    if (incoming) {
      const chosen = existing || persist(incoming);
      cleanVisibleUrl();
      return chosen;
    }
    return existing;
  }

  function preserveLinks(root = document) {
    const code = getCode();
    if (!code) return;
    root.querySelectorAll?.('a[href]').forEach(link => {
      try {
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        const file = (url.pathname.split('/').pop() || '').toLowerCase();
        if (!['register.html','login.html','pricing.html'].includes(file)) return;
        if (!url.searchParams.has('ref')) url.searchParams.set('ref', code);
        link.href = url.href;
      } catch (_) {}
    });
  }

  async function syncUser(user = null) {
    const client = globalThis.supabaseClient;
    if (!client?.rpc) return null;
    if (!user) {
      const result = await client.auth.getUser();
      user = result?.data?.user || null;
    }
    if (!user) return null;
    const code = getCode(user);
    if (!code) return null;
    const { data, error } = await client.rpc('record_affiliate_referral', {
      p_referral_code: code,
      p_visitor_id: getVisitorId(),
      p_landing_url: safeStorageGet(STORAGE_LANDING) || location.href.slice(0, 1500),
      p_referrer_url: safeStorageGet(STORAGE_REFERRER) || document.referrer.slice(0, 1500) || null
    });
    if (error) throw error;
    const lockedCode = normalizeCode(data?.referral_code || code);
    if (lockedCode) persist(lockedCode, true);
    return data || null;
  }

  function wireAuthSync() {
    const client = globalThis.supabaseClient;
    if (!client?.auth?.onAuthStateChange || globalThis.__liwReferralAuthWired) return false;
    globalThis.__liwReferralAuthWired = true;
    client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) syncUser(session.user).catch(() => {});
    });
    return true;
  }

  globalThis.LIWReferral = { capture, getCode, getVisitorId, preserveLinks, syncUser, store: persist, clear: clearAnonymous };
  capture();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => preserveLinks(), { once: true });
  else preserveLinks();

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node?.nodeType === 1) preserveLinks(node);
    }));
  });
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });

  let authAttempts = 0;
  const authTimer = setInterval(() => {
    authAttempts += 1;
    if (wireAuthSync() || authAttempts > 30) clearInterval(authTimer);
  }, 200);

  window.addEventListener('pageshow', () => {
    capture();
    preserveLinks();
    syncUser().catch(() => {});
  });
})();