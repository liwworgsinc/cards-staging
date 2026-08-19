(() => {
  'use strict';

  const state = {
    deferredPrompt: null,
    installed: false,
    registration: null
  };

  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = () => /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|chrome|android/i.test(navigator.userAgent);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  function ensureLaunchFixStyles() {
    if (document.querySelector('link[data-liw-launch-fixes]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'css/launch-fixes.css?v=20260818-flow-mobile-2';
    link.dataset.liwLaunchFixes = 'true';
    document.head.appendChild(link);
  }

  function setInstalled(value) {
    state.installed = Boolean(value);
    document.documentElement.classList.toggle('pwa-installed', state.installed);
    document.querySelectorAll('[data-pwa-install]').forEach(button => {
      button.hidden = state.installed;
      button.setAttribute('aria-hidden', String(state.installed));
    });
  }

  function installButtonMarkup(extraClass = '') {
    return `<button type="button" class="btn btn-light pwa-install-button ${extraClass}" data-pwa-install>
      <i data-lucide="download" size="17" aria-hidden="true"></i>
      <span>Install LIW Cards</span>
    </button>`;
  }

  function maybeInjectPublicInstallButton() {
    return;
  }

  function ensureDialog() {
    let dialog = document.getElementById('pwa-install-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'pwa-install-dialog';
    dialog.className = 'pwa-install-dialog';
    dialog.setAttribute('aria-labelledby', 'pwa-install-title');
    dialog.innerHTML = `
      <div class="pwa-install-panel">
        <button type="button" class="pwa-install-close" data-pwa-close aria-label="Close installation instructions">×</button>
        <img class="pwa-install-icon" src="assets/icons/icon-192.png" alt="LIW Cards app icon">
        <span class="eyebrow">Install on this device</span>
        <h2 id="pwa-install-title">Add LIW Cards to your device</h2>
        <div id="pwa-install-copy" class="pwa-install-copy"></div>
        <div class="pwa-install-actions">
          <button type="button" class="btn btn-primary" data-pwa-primary>Got it</button>
          <button type="button" class="btn btn-light" data-pwa-close>Close</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-pwa-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    return dialog;
  }

  function showInstructions() {
    const dialog = ensureDialog();
    const copy = dialog.querySelector('#pwa-install-copy');
    const primary = dialog.querySelector('[data-pwa-primary]');

    if (isIos()) {
      copy.innerHTML = isSafari()
        ? `<ol><li>Tap the <strong>Share</strong> button in Safari.</li><li>Scroll and choose <strong>Add to Home Screen</strong>.</li><li>Turn on <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</li></ol>`
        : `<p>For iPhone or iPad installation, open this page in <strong>Safari</strong>, then use Share → Add to Home Screen.</p>`;
    } else if (/android/i.test(navigator.userAgent)) {
      copy.innerHTML = `<ol><li>Open the browser menu <strong>⋮</strong>.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Confirm by tapping <strong>Install</strong>.</li></ol>`;
    } else {
      copy.innerHTML = `<p>Open your browser menu and choose <strong>Install LIW Digital Cards</strong> or <strong>Install page as app</strong>. In Chrome or Edge, an install icon may also appear in the address bar.</p>`;
    }

    primary.onclick = () => dialog.close();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  async function promptInstall() {
    if (state.installed || isStandalone()) {
      setInstalled(true);
      window.toast?.('LIW Cards is already installed on this device.');
      return false;
    }

    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      const choice = await state.deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
      state.deferredPrompt = null;
      if (choice.outcome === 'accepted') {
        window.toast?.('LIW Cards is being installed.');
        return true;
      }
      return false;
    }

    showInstructions();
    return false;
  }

  function bindButtons() {
    document.querySelectorAll('[data-pwa-install],#install-liw-app').forEach(button => {
      button.dataset.pwaInstall = 'true';
      if (button.dataset.pwaBound === 'true') return;
      button.dataset.pwaBound = 'true';
      button.addEventListener('click', promptInstall);
    });
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    try {
      state.registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/', updateViaCache: 'none' });
      await state.registration.update().catch(() => null);
      state.registration.addEventListener('updatefound', () => {
        const worker = state.registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            document.dispatchEvent(new CustomEvent('liw:pwa-update-ready', { detail: state.registration }));
          }
        });
      });
    } catch (error) {
      console.warn('LIW PWA service worker registration failed:', error);
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.deferredPrompt = event;
    document.documentElement.classList.add('pwa-install-ready');
    bindButtons();
  });

  window.addEventListener('appinstalled', () => {
    state.deferredPrompt = null;
    setInstalled(true);
    window.toast?.('LIW Cards was installed successfully.');
  });

  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', event => setInstalled(event.matches));

  document.addEventListener('DOMContentLoaded', () => {
    ensureLaunchFixStyles();
    maybeInjectPublicInstallButton();
    setInstalled(isStandalone());
    bindButtons();
    registerServiceWorker();
  });

  window.LIWPWA = {
    install: promptInstall,
    isInstalled: () => state.installed || isStandalone(),
    registration: () => state.registration
  };
})();