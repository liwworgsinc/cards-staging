(() => {
  'use strict';
  if (window.__LIW_WALLET_BRAND_STAGING__) return;
  window.__LIW_WALLET_BRAND_STAGING__ = true;

  const replaceWalletCopy = value => String(value ?? '')
    .replace(/LIW Rolodex/g, 'LIW Wallet')
    .replace(/your Rolodex/g, 'your LIW Wallet')
    .replace(/Your Rolodex/g, 'Your LIW Wallet')
    .replace(/Rolodex contact/g, 'LIW Wallet contact')
    .replace(/Rolodex notes/g, 'LIW Wallet notes')
    .replace(/Rolodex/g, 'LIW Wallet');

  function rewriteText(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(textNode => {
      const next = replaceWalletCopy(textNode.nodeValue);
      if (next !== textNode.nodeValue) textNode.nodeValue = next;
    });
    document.title = replaceWalletCopy(document.title);
  }

  const nativeConfirm = window.confirm.bind(window);
  window.confirm = message => nativeConfirm(replaceWalletCopy(message));

  function loadOnce(src, attr) {
    if (document.querySelector(`script[${attr}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.setAttribute(attr, 'true');
    document.body.appendChild(script);
  }

  function loadImportTools() {
    loadOnce('js/rolodex-import-tools-staging.js?v=20260906-2', 'data-liw-wallet-import-tools');
    loadOnce('js/rolodex-import-qr-patch-staging.js?v=20260906-1', 'data-liw-wallet-qr-patch');
    loadOnce('js/rolodex-phone-contact-guard-staging.js?v=20260906-1', 'data-liw-wallet-phone-contact-guard');
  }

  const start = () => {
    rewriteText();
    loadImportTools();
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'characterData') {
          const next = replaceWalletCopy(mutation.target.nodeValue);
          if (next !== mutation.target.nodeValue) mutation.target.nodeValue = next;
          return;
        }
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const next = replaceWalletCopy(node.nodeValue);
            if (next !== node.nodeValue) node.nodeValue = next;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            rewriteText(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();