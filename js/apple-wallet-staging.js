(() => {
  'use strict';

  // Apple Wallet is intentionally disabled on staging for now.
  // Keep the file as a harmless no-op so existing cached HTML references do not break.
  const removeWalletUi = () => {
    document.getElementById('apple-wallet-wrap')?.remove();
    document.getElementById('apple-wallet-add')?.remove();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeWalletUi, { once: true });
  } else {
    removeWalletUi();
  }
})();
