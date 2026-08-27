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
  const PROGRAM_ACTIVE = 'affiliate_program_active';
  const PROGRAM_PROMPT_SEEN = 'affiliate_program_prompt_seen';

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

  function programState(user = null) {
    const metadata = user?.user_metadata || {};
    if (metadata[PROGRAM_ACTIVE] === true) return 'active';
    if (metadata[PROGRAM_ACTIVE] === false) return 'inactive';
    return 'available';
  }

  function promptWasSeen(user = null) {
    return user?.user_metadata?.[PROGRAM_PROMPT_SEEN] === true;
  }

  async function currentUser() {
    const client = globalThis.supabaseClient;
    if (!client?.auth?.getUser) return null;
    const { data } = await client.auth.getUser();
    return data?.user || null;
  }

  async function updateProgramMetadata(data) {
    const client = globalThis.supabaseClient;
    if (!client?.auth?.updateUser) throw new Error('Affiliate preferences are unavailable right now.');
    const { data: result, error } = await client.auth.updateUser({ data });
    if (error) throw error;
    const updatedUser = result?.user || await currentUser();
    renderProgramUi(updatedUser);
    document.dispatchEvent(new CustomEvent('liw:affiliate-program-change', { detail: { user: updatedUser, state: programState(updatedUser) } }));
    return updatedUser;
  }

  async function activateProgram() {
    const now = new Date().toISOString();
    return updateProgramMetadata({
      [PROGRAM_ACTIVE]: true,
      [PROGRAM_PROMPT_SEEN]: true,
      affiliate_program_activated_at: now,
      affiliate_program_updated_at: now
    });
  }

  async function optOutProgram() {
    const now = new Date().toISOString();
    return updateProgramMetadata({
      [PROGRAM_ACTIVE]: false,
      [PROGRAM_PROMPT_SEEN]: true,
      affiliate_program_opted_out_at: now,
      affiliate_program_updated_at: now
    });
  }

  async function markProgramPromptSeen() {
    const now = new Date().toISOString();
    return updateProgramMetadata({
      [PROGRAM_PROMPT_SEEN]: true,
      affiliate_program_updated_at: now
    });
  }

  function injectProgramStyles() {
    if (document.getElementById('liw-affiliate-opt-in-styles')) return;
    const style = document.createElement('style');
    style.id = 'liw-affiliate-opt-in-styles';
    style.textContent = `
      .liw-affiliate-nav-badge{margin-left:auto;padding:2px 7px;border-radius:999px;background:rgba(212,168,79,.16);color:#9a6b13;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
      .liw-affiliate-choice-dialog{width:min(92vw,560px);border:0;border-radius:24px;padding:0;background:#fff;color:#101828;box-shadow:0 28px 90px rgba(16,24,40,.34)}
      .liw-affiliate-choice-dialog::backdrop{background:rgba(7,16,46,.68);backdrop-filter:blur(5px)}
      .liw-affiliate-choice-panel{padding:28px}
      .liw-affiliate-choice-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;background:linear-gradient(135deg,#0b1438,#1f3f7f);color:#fff;margin-bottom:18px}
      .liw-affiliate-choice-panel h2{margin:0 0 8px;font-size:1.5rem}.liw-affiliate-choice-panel p{margin:0;color:#667085;line-height:1.6}
      .liw-affiliate-choice-points{display:grid;gap:10px;margin:20px 0;padding:0;list-style:none}.liw-affiliate-choice-points li{display:flex;gap:10px;align-items:flex-start;color:#344054}
      .liw-affiliate-choice-points i{color:#8b6508;flex:0 0 auto;margin-top:2px}
      .liw-affiliate-choice-actions{display:flex;gap:10px;margin-top:22px}.liw-affiliate-choice-actions .btn{flex:1}
      .liw-affiliate-choice-note{display:block;margin-top:13px;font-size:12px;color:#98a2b3;text-align:center}
      @media(max-width:560px){.liw-affiliate-choice-panel{padding:22px}.liw-affiliate-choice-actions{flex-direction:column}.liw-affiliate-choice-actions .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureDashboardAffiliateNav(user) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || document.getElementById('liw-affiliate-nav-link')) return;
    const plansLink = document.getElementById('plans-billing-link');
    const nav = plansLink?.closest('nav') || sidebar.querySelector('nav');
    if (!nav) return;
    const link = document.createElement('a');
    link.id = 'liw-affiliate-nav-link';
    link.href = 'affiliate-dashboard.html';
    link.innerHTML = '<i data-lucide="badge-dollar-sign" size="18"></i> Earn with LIW <span class="liw-affiliate-nav-badge">Earn</span>';
    if (plansLink) nav.insertBefore(link, plansLink);
    else nav.appendChild(link);
    if (globalThis.lucide) lucide.createIcons();
  }

  function renderDashboardAffiliateCards(user) {
    const cards = Array.from(document.querySelectorAll('.dashboard-tool[href="affiliate-dashboard.html"]'));
    if (!cards.length) return;
    const state = programState(user);
    const primary = cards[0];
    const strong = primary.querySelector('strong');
    const copy = primary.querySelector('p');
    if (state === 'active') {
      if (strong) strong.textContent = 'Affiliate earnings';
      if (copy) copy.textContent = 'Your earning account is active. Share your referral link and track commissions, tax status, and payouts.';
    } else if (state === 'inactive') {
      if (strong) strong.textContent = 'Affiliate program off';
      if (copy) copy.textContent = 'You opted out of earning commissions. Reactivate anytime if you want to share LIW Cards and earn.';
    } else {
      if (strong) strong.textContent = 'Earn with LIW';
      if (copy) copy.textContent = 'Affiliate earning is included with your account, but participation is optional. Activate whenever you are ready.';
    }
    cards.slice(1).forEach(card => { card.hidden = true; });
  }

  function renderProgramUi(user = null) {
    injectProgramStyles();
    ensureDashboardAffiliateNav(user);
    renderDashboardAffiliateCards(user);
  }

  function buildProgramDialog() {
    let dialog = document.getElementById('liw-affiliate-choice-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'liw-affiliate-choice-dialog';
    dialog.className = 'liw-affiliate-choice-dialog';
    dialog.innerHTML = `
      <div class="liw-affiliate-choice-panel">
        <div class="liw-affiliate-choice-icon"><i data-lucide="badge-dollar-sign" size="25"></i></div>
        <span class="eyebrow">Optional earning feature</span>
        <h2>Want to earn with LIW Cards?</h2>
        <p>Your card is live. You can also activate the LIW affiliate program and earn commissions when businesses join through your referral link.</p>
        <ul class="liw-affiliate-choice-points">
          <li><i data-lucide="check-circle-2" size="18"></i><span>Your normal LIW Cards account keeps working whether you join or not.</span></li>
          <li><i data-lucide="check-circle-2" size="18"></i><span>Tax and payout setup are only required if you activate earning.</span></li>
          <li><i data-lucide="check-circle-2" size="18"></i><span>You can turn the affiliate program off or reactivate it later.</span></li>
        </ul>
        <div class="liw-affiliate-choice-actions">
          <button class="btn btn-primary" id="liw-activate-affiliate" type="button">Activate &amp; earn</button>
          <button class="btn btn-light" id="liw-affiliate-maybe-later" type="button">Maybe later</button>
        </div>
        <small class="liw-affiliate-choice-note">Activating does not change your card plan or charge you anything.</small>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#liw-activate-affiliate')?.addEventListener('click', async () => {
      const button = dialog.querySelector('#liw-activate-affiliate');
      button.disabled = true;
      button.textContent = 'Activating…';
      try {
        await activateProgram();
        dialog.close();
        if (typeof globalThis.toast === 'function') toast('Affiliate earning activated.');
      } catch (error) {
        if (typeof globalThis.toast === 'function') toast(error?.message || 'Unable to activate affiliate earning.');
      } finally {
        button.disabled = false;
        button.textContent = 'Activate & earn';
      }
    });
    dialog.querySelector('#liw-affiliate-maybe-later')?.addEventListener('click', async () => {
      try { await markProgramPromptSeen(); } catch (_) {}
      dialog.close();
    });
    if (globalThis.lucide) lucide.createIcons();
    return dialog;
  }

  async function promptAfterPublish() {
    const user = await currentUser();
    if (!user || programState(user) === 'active' || promptWasSeen(user)) return false;
    injectProgramStyles();
    const dialog = buildProgramDialog();
    if (!dialog.open) dialog.showModal();
    return true;
  }

  function wireAuthSync() {
    const client = globalThis.supabaseClient;
    if (!client?.auth?.onAuthStateChange || globalThis.__liwReferralAuthWired) return false;
    globalThis.__liwReferralAuthWired = true;
    client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncUser(session.user).catch(() => {});
        renderProgramUi(session.user);
      }
    });
    return true;
  }

  globalThis.LIWReferral = { capture, getCode, getVisitorId, preserveLinks, syncUser, store: persist, clear: clearAnonymous };
  globalThis.LIWAffiliateOptIn = {
    state: programState,
    promptWasSeen,
    currentUser,
    activate: activateProgram,
    optOut: optOutProgram,
    markPromptSeen: markProgramPromptSeen,
    promptAfterPublish,
    render: renderProgramUi
  };
  capture();
  const initializeUi = () => {
    preserveLinks();
    currentUser().then(renderProgramUi).catch(() => {});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeUi, { once: true });
  else initializeUi();

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
    currentUser().then(renderProgramUi).catch(() => {});
  });
})();