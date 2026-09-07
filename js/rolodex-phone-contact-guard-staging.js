(() => {
  'use strict';
  if (window.__LIW_WALLET_PHONE_CONTACT_GUARD__) return;
  window.__LIW_WALLET_PHONE_CONTACT_GUARD__ = true;

  function notify(message) {
    try {
      if (typeof toast === 'function') return toast(message);
    } catch (_) {}
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(node._phoneContactGuardTimer);
    node._phoneContactGuardTimer = setTimeout(() => node.classList.remove('show'), 4200);
  }

  function directContactPickerSupported() {
    return Boolean(
      window.isSecureContext &&
      window.top === window.self &&
      navigator.contacts &&
      typeof navigator.contacts.select === 'function'
    );
  }

  function refreshPhoneTile() {
    const tile = document.querySelector('[data-wallet-method="phone"]');
    if (!tile) return;
    const small = tile.querySelector('small');
    if (!small) return;
    small.textContent = directContactPickerSupported()
      ? 'Choose contacts directly from your phone.'
      : 'Open LIW Wallet in a supported Android browser to choose phone contacts.';
  }

  document.addEventListener('click', event => {
    const tile = event.target.closest?.('[data-wallet-method="phone"]');
    if (!tile || directContactPickerSupported()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    notify('This browser cannot open your phone contacts directly. Open LIW Wallet in Chrome on Android, or use Import VCF separately.');
  }, true);

  const observer = new MutationObserver(refreshPhoneTile);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 15000);
  refreshPhoneTile();
})();