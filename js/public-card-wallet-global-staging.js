/* LIW Cards staging — global LIW Wallet visibility rule.
   Experience owns Wallet availability; templates only change presentation. */
(() => {
  'use strict';
  if (window.__LIW_GLOBAL_WALLET_RULE__) return;
  window.__LIW_GLOBAL_WALLET_RULE__ = true;

  const VERSION = '20260922-global-wallet-1';
  const FALLBACK_CLASS = 'liw-global-wallet-fallback';
  const NATIVE_WALLET_SELECTOR = [
    '[data-realtor-wallet]',
    '[data-rest-wallet]',
    '#barber-wallet-top',
    '#music-save-home-top[data-liw-wallet-top="true"]',
    '.liw-rolodex-public-button'
  ].join(',');

  let repairQueued = false;
  let observer = null;

  function cardData() {
    try {
      return typeof publicCard !== 'undefined' && publicCard ? publicCard : null;
    } catch (_) {
      return null;
    }
  }

  function experienceKey() {
    const data = cardData() || {};
    const experience = String(data.card_experience || 'classic').trim().toLowerCase();
    const mode = String(data.color_mode || '').trim().toLowerCase();
    if (mode === 'barbershop' && experience !== 'music') return 'barbershop';
    return experience || 'classic';
  }

  function isVisible(element) {
    if (!element || !element.isConnected || element.hidden) return false;
    try {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) <= 0.01) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch (_) {
      return true;
    }
  }

  function markGlobalWallet(element) {
    if (!element) return null;
    if (element.dataset.liwGlobalWallet !== 'true') element.dataset.liwGlobalWallet = 'true';
    if (!element.getAttribute('aria-label')) element.setAttribute('aria-label', 'Save to LIW Wallet');
    if (element.tagName === 'BUTTON' && !element.getAttribute('type')) element.setAttribute('type', 'button');
    return element;
  }

  function removeFallbacks(except = null) {
    document.querySelectorAll(`.${FALLBACK_CLASS}`).forEach(node => {
      if (node !== except) node.remove();
    });
  }

  function nativeWallet() {
    const triggers = Array.from(document.querySelectorAll(NATIVE_WALLET_SELECTOR));
    triggers.forEach(markGlobalWallet);
    return triggers.find(isVisible) || null;
  }

  function visibleTopHost() {
    const experience = experienceKey();
    const selectors = experience === 'realtor'
      ? ['.realtor-public-top-actions']
      : experience === 'restaurant'
        ? ['.restaurant-public-top-actions']
        : experience === 'music'
          ? ['.music-classic-top-actions', '#public-cover .public-top-actions']
          : experience === 'barbershop'
            ? ['#public-cover .public-top-actions']
            : ['#public-cover .public-top-actions'];

    for (const selector of selectors) {
      const host = document.querySelector(selector);
      if (host && isVisible(host)) return host;
    }

    const custom = Array.from(document.querySelectorAll('#card [class*="top-actions"]')).find(isVisible);
    return custom || null;
  }

  function invokeWallet(source) {
    try {
      if (typeof window.LIWRolodex?.save === 'function') {
        window.LIWRolodex.save({ source });
        return true;
      }
      if (typeof window.LIWRolodexPublicSave === 'function') {
        window.LIWRolodexPublicSave();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function openWallet() {
    const source = `${experienceKey()}_wallet_global`;
    if (invokeWallet(source)) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (invokeWallet(source) || tries >= 30) {
        window.clearInterval(timer);
        if (tries >= 30) window.toast?.('LIW Wallet is still loading. Try again.');
      }
    }, 90);
  }

  function ensureFallback(host) {
    if (!host) return null;

    let button = host.querySelector(`.${FALLBACK_CLASS}`);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = FALLBACK_CLASS;

      const styleSource = Array.from(host.querySelectorAll('button')).find(item => !item.classList.contains(FALLBACK_CLASS));
      if (styleSource?.className) button.className = `${styleSource.className} ${FALLBACK_CLASS}`;

      button.innerHTML = '<i data-lucide="wallet" size="19"></i>';
      button.setAttribute('aria-label', 'Save to LIW Wallet');
      button.title = 'Save to LIW Wallet';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openWallet();
      });
      host.appendChild(button);
    }

    button.dataset.liwGlobalWallet = 'true';
    button.dataset.liwWalletExperience = experienceKey();
    if (window.lucide) {
      try { window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } }); } catch (_) {}
    }
    return button;
  }

  function syncWallet() {
    const data = cardData();
    const card = document.getElementById('card');
    if (!data || !card || card.hidden) return false;

    const native = nativeWallet();
    if (native) {
      removeFallbacks();
      return true;
    }

    const host = visibleTopHost();
    if (!host) return false;

    const fallback = ensureFallback(host);
    removeFallbacks(fallback);
    return Boolean(fallback && isVisible(fallback));
  }

  function queueRepair() {
    if (repairQueued) return;
    repairQueued = true;
    window.requestAnimationFrame(() => {
      repairQueued = false;
      syncWallet();
    });
  }

  function startObserver() {
    if (observer) return;
    const card = document.getElementById('card');
    if (!card) return;
    observer = new MutationObserver(queueRepair);
    observer.observe(card, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'style']
    });
  }

  function boot() {
    syncWallet();
    startObserver();
  }

  window.LIWWalletGlobal = Object.freeze({
    sync: syncWallet,
    getExperience: experienceKey,
    version: VERSION
  });

  document.addEventListener('liw:public-card-rendered', queueRepair);
  document.addEventListener('liw:card-loader-ready', queueRepair);
  window.addEventListener('pageshow', queueRepair);

  [0, 80, 180, 360, 700, 1200, 2000, 3200, 5000].forEach(delay => window.setTimeout(boot, delay));
})();
