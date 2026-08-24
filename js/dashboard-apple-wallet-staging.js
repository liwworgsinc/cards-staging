(() => {
  'use strict';

  // Apple Wallet is intentionally disabled on staging for now.
  const removeWalletUi = () => {
    document.querySelectorAll('[data-wallet-card-id], [data-dashboard-wallet-note], .dashboard-wallet-toggle, .dashboard-wallet-note').forEach(element => element.remove());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeWalletUi, { once: true });
  } else {
    removeWalletUi();
  }

  const list = document.getElementById('card-list');
  if (list) {
    new MutationObserver(removeWalletUi).observe(list, { childList: true, subtree: true });
  }
})();
