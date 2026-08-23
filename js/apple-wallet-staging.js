(() => {
  const STYLE_ID = 'liw-apple-wallet-staging-style';
  const WRAP_ID = 'apple-wallet-wrap';
  const BUTTON_ID = 'apple-wallet-add';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .apple-wallet-wrap{margin:10px 0 0;text-align:center}
      .apple-wallet-cta{width:100%;min-height:50px;border:0;border-radius:14px;background:#050505;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px 16px;font:700 15px/1.1 inherit;letter-spacing:-.01em;cursor:pointer;box-shadow:0 9px 24px rgba(15,23,42,.14);transition:transform .16s ease,box-shadow .16s ease,opacity .16s ease}
      .apple-wallet-cta:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 12px 28px rgba(15,23,42,.18)}
      .apple-wallet-cta:active:not(:disabled){transform:translateY(0)}
      .apple-wallet-cta:focus-visible{outline:3px solid color-mix(in srgb,var(--card-primary,#5b5cf0) 38%,transparent);outline-offset:3px}
      .apple-wallet-cta:disabled{cursor:not-allowed;opacity:.56;box-shadow:none}
      .apple-wallet-cta svg{width:20px;height:20px;stroke-width:2}
      .apple-wallet-helper{display:block;margin:7px 8px 0;color:color-mix(in srgb,currentColor 62%,transparent);font-size:11px;line-height:1.35}
      .apple-wallet-wrap[data-ready="true"] .apple-wallet-helper{color:color-mix(in srgb,var(--card-primary,#5b5cf0) 76%,#334155)}
      @media (max-width:520px){.apple-wallet-cta{min-height:49px;border-radius:13px}}
    `;
    document.head.appendChild(style);
  }

  function walletEndpoint(statusOnly = false) {
    const slug = String(new URLSearchParams(location.search).get('slug') || '').trim().toLowerCase();
    const supabaseUrl = typeof LIW_CONFIG !== 'undefined' ? String(LIW_CONFIG.supabaseUrl || '') : '';
    if (!slug || !supabaseUrl) return '';
    const url = new URL('/functions/v1/apple-wallet-pass', supabaseUrl);
    url.searchParams.set('slug', slug);
    url.searchParams.set('app_url', location.href);
    if (statusOnly) url.searchParams.set('status', '1');
    return url.href;
  }

  function isAppleDevice() {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod|Macintosh/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function setState(wrap, button, helper, state, message) {
    wrap.dataset.ready = state === 'ready' ? 'true' : 'false';
    button.disabled = state !== 'ready';
    button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
    helper.textContent = message;
  }

  async function probeAvailability(wrap, button, helper) {
    const statusUrl = walletEndpoint(true);
    if (!statusUrl) {
      wrap.hidden = true;
      return;
    }

    try {
      const response = await fetch(statusUrl, { method: 'GET', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));

      if (data.enabled === false) {
        wrap.hidden = true;
        return;
      }

      wrap.hidden = false;
      setState(wrap, button, helper, 'checking', 'Checking Apple Wallet availability…');

      if (!response.ok || data.available !== true) {
        setState(wrap, button, helper, 'unavailable', 'Apple Wallet signing setup pending on staging.');
        return;
      }

      if (!isAppleDevice()) {
        setState(wrap, button, helper, 'unavailable', 'Open this card on an iPhone to add it to Apple Wallet.');
        return;
      }

      setState(wrap, button, helper, 'ready', 'Keep this digital card one tap away in Apple Wallet.');
    } catch (error) {
      console.warn('Apple Wallet availability check failed:', error);
      wrap.hidden = false;
      setState(wrap, button, helper, 'unavailable', 'Apple Wallet is temporarily unavailable.');
    }
  }

  function mountWalletAction() {
    const saveButton = document.getElementById('save');
    if (!saveButton || document.getElementById(WRAP_ID)) return;

    ensureStyles();
    const wrap = document.createElement('div');
    wrap.className = 'apple-wallet-wrap';
    wrap.id = WRAP_ID;
    wrap.dataset.ready = 'false';
    wrap.hidden = true;
    wrap.innerHTML = `
      <button class="apple-wallet-cta" id="${BUTTON_ID}" type="button" disabled aria-disabled="true">
        <i data-lucide="wallet-cards" size="20" aria-hidden="true"></i>
        <span>Add to Apple Wallet</span>
      </button>
      <small class="apple-wallet-helper" id="apple-wallet-helper">Checking Apple Wallet availability…</small>
    `;
    saveButton.insertAdjacentElement('afterend', wrap);

    const button = document.getElementById(BUTTON_ID);
    const helper = document.getElementById('apple-wallet-helper');
    if (!button || !helper) return;

    button.addEventListener('click', async () => {
      if (button.disabled) return;
      const passUrl = walletEndpoint(false);
      if (!passUrl) return;
      button.disabled = true;
      helper.textContent = 'Opening Apple Wallet…';
      try {
        if (typeof globalThis.track === 'function') await globalThis.track('apple_wallet_click');
      } catch (_) {}
      location.assign(passUrl);
      window.setTimeout(() => { button.disabled = false; }, 2500);
    });

    if (globalThis.lucide) globalThis.lucide.createIcons();
    probeAvailability(wrap, button, helper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWalletAction, { once: true });
  } else {
    mountWalletAction();
  }
})();
