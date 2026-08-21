(() => {
  'use strict';

  const state = {
    deferredPrompt: null,
    hydrated: false,
    installed: false,
    preferredIcon: '',
    customIcon: false,
    cardName: 'Digital Card',
    manifestUrl: ''
  };

  const slug = String(new URLSearchParams(location.search).get('slug') || '').trim().toLowerCase();
  const button = document.getElementById('save-home-screen');
  const cardElement = document.getElementById('card');
  const previewBanner = document.getElementById('preview-banner');

  const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = () => /android/i.test(navigator.userAgent);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const liwIcon = () => typeof liwUrl === 'function' ? liwUrl('assets/icons/icon-512-v1062.png') : new URL('assets/icons/icon-512-v1062.png', location.href).href;

  function configureManifest() {
    const link = document.getElementById('card-manifest');
    if (!link || !slug || !globalThis.LIW_CONFIG?.supabaseUrl) return;
    const appUrl = new URL(location.href);
    appUrl.hash = '';
    const endpoint = `${LIW_CONFIG.supabaseUrl}/functions/v1/card-manifest`;
    state.manifestUrl = `${endpoint}?slug=${encodeURIComponent(slug)}&app_url=${encodeURIComponent(appUrl.href)}`;
    link.crossOrigin = 'anonymous';
    link.href = state.manifestUrl;
  }

  function cardIsReady() {
    return Boolean(cardElement && !cardElement.hidden && String(document.getElementById('name')?.textContent || '').trim());
  }

  function customBrandingAllowed() {
    return globalThis.publicCardFeatureAccess?.custom_qr === true;
  }

  function preferredIcon() {
    if (customBrandingAllowed()) {
      const qrLogo = document.getElementById('qr-logo');
      const qrSrc = qrLogo && !qrLogo.hidden ? String(qrLogo.currentSrc || qrLogo.src || '').trim() : '';
      if (qrSrc) return { url: qrSrc, custom: true };
      const profile = document.querySelector('#avatar img');
      const profileSrc = String(profile?.currentSrc || profile?.src || '').trim();
      if (profileSrc) return { url: profileSrc, custom: true };
    }
    return { url: liwIcon(), custom: false };
  }

  function setPageInstallIdentity(iconUrl) {
    if (iconUrl) {
      const apple = document.getElementById('card-apple-touch-icon') || document.querySelector('link[rel="apple-touch-icon"]');
      if (apple) apple.href = iconUrl;

      if (state.customIcon) {
        document.querySelectorAll('link[rel="icon"]').forEach(icon => { icon.href = iconUrl; });
      }
    }

    const installTitle = state.cardName.length <= 30 ? state.cardName : `${state.cardName.slice(0, 29).trim()}…`;
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.content = installTitle;
    document.title = `${state.cardName} | LIW Cards`;

    const cardTheme = getComputedStyle(cardElement || document.documentElement).getPropertyValue('--card-primary').trim();
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta && /^#[0-9a-f]{6}$/i.test(cardTheme)) themeMeta.content = cardTheme;
  }

  function registerScopedServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    try {
      const workerUrl = typeof liwUrl === 'function'
        ? liwUrl('service-worker.js')
        : new URL('service-worker.js', location.href).href;
      const scope = new URL('.', workerUrl).pathname;
      navigator.serviceWorker.register(workerUrl, { scope, updateViaCache: 'none' }).catch(() => null);
    } catch (_) {}
  }

  function dialog() {
    let element = document.getElementById('card-home-screen-dialog');
    if (element) return element;

    element = document.createElement('dialog');
    element.id = 'card-home-screen-dialog';
    element.className = 'card-home-screen-dialog';
    element.setAttribute('aria-labelledby', 'card-home-screen-title');
    element.innerHTML = `
      <div class="card-home-screen-panel">
        <button type="button" class="card-home-screen-close" data-card-install-close aria-label="Close">×</button>
        <div class="card-home-screen-hero">
          <div class="card-home-screen-icon-wrap"><img class="card-home-screen-icon" data-card-install-icon alt=""></div>
          <div class="card-home-screen-hero-copy"><span>Keep this card one tap away</span><h2 id="card-home-screen-title" data-card-install-title>Save card to Home Screen</h2></div>
        </div>
        <div class="card-home-screen-body">
          <p data-card-install-intro></p>
          <ol class="card-home-screen-steps" data-card-install-steps></ol>
          <div class="card-home-screen-brand-note" data-card-install-brand-note></div>
          <div class="card-home-screen-actions">
            <button type="button" class="btn btn-primary" data-card-install-primary hidden><i data-lucide="download" size="17"></i><span>Install card</span></button>
            <button type="button" class="btn btn-light" data-card-install-close>Close</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(element);
    element.querySelectorAll('[data-card-install-close]').forEach(close => close.addEventListener('click', () => {
      if (typeof element.close === 'function') element.close();
      else element.removeAttribute('open');
    }));
    element.addEventListener('click', event => {
      if (event.target !== element) return;
      if (typeof element.close === 'function') element.close();
      else element.removeAttribute('open');
    });
    return element;
  }

  function stepsMarkup(items) {
    return items.map((item, index) => `<li class="card-home-screen-step"><span class="card-home-screen-step-number">${index + 1}</span><span>${item}</span></li>`).join('');
  }

  function closeDialog(element) {
    if (typeof element?.close === 'function') element.close();
    else element?.removeAttribute('open');
  }

  function showInstructions() {
    const element = dialog();
    const panel = element.querySelector('.card-home-screen-panel');
    const icon = element.querySelector('[data-card-install-icon]');
    const title = element.querySelector('[data-card-install-title]');
    const intro = element.querySelector('[data-card-install-intro]');
    const steps = element.querySelector('[data-card-install-steps]');
    const brandNote = element.querySelector('[data-card-install-brand-note]');
    const primary = element.querySelector('[data-card-install-primary]');
    const primaryText = primary?.querySelector('span');
    const theme = getComputedStyle(cardElement || document.documentElement).getPropertyValue('--card-primary').trim() || '#0b1438';

    panel?.style.setProperty('--install-primary', theme);
    if (icon) {
      icon.src = state.preferredIcon || liwIcon();
      icon.alt = `${state.cardName} Home Screen icon`;
    }
    if (title) title.textContent = `Save ${state.cardName} to Home Screen`;
    if (intro) intro.textContent = 'This keeps the exact digital card on your phone so you can reopen it without scanning the QR code again.';

    if (state.deferredPrompt) {
      steps.innerHTML = stepsMarkup([
        'Tap <strong>Install card</strong> below.',
        'Confirm the browser installation prompt.',
        'Open the new Home Screen icon anytime to return directly to this card.'
      ]);
      primary.hidden = false;
      if (primaryText) primaryText.textContent = 'Install card';
      primary.onclick = async () => {
        const prompt = state.deferredPrompt;
        if (!prompt) return;
        primary.disabled = true;
        try {
          prompt.prompt();
          const choice = await prompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
          state.deferredPrompt = null;
          if (choice.outcome === 'accepted') {
            window.track?.('home_screen_install', null, { branding: state.customIcon ? 'custom' : 'liw', method: 'native_prompt' });
            closeDialog(element);
          }
        } finally {
          primary.disabled = false;
        }
      };
    } else if (isIos()) {
      steps.innerHTML = stepsMarkup([
        'Tap the browser <strong>Share</strong> button.',
        'Choose <strong>Add to Home Screen</strong>. If you do not see it, open the card in Safari and use Share.',
        'Keep <strong>Open as Web App</strong> enabled when offered, then tap <strong>Add</strong>.'
      ]);
      primary.hidden = true;
    } else if (isAndroid()) {
      steps.innerHTML = stepsMarkup([
        'Open the browser menu <strong>⋮</strong>.',
        'Choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.',
        'Confirm <strong>Add</strong> or <strong>Install</strong>.'
      ]);
      primary.hidden = true;
    } else {
      steps.innerHTML = stepsMarkup([
        'Open your browser menu or the install icon in the address bar.',
        'Choose <strong>Install</strong> or <strong>Install page as app</strong>.',
        'Confirm to keep this card in your apps or launch area.'
      ]);
      primary.hidden = true;
    }

    brandNote.innerHTML = state.customIcon
      ? '<i data-lucide="badge-check" size="16"></i><span><strong>Pro/Agency branding:</strong> this card uses the client logo or profile image as its preferred Home Screen icon when the device supports it.</span>'
      : '<i data-lucide="badge-check" size="16"></i><span><strong>LIW Cards branding:</strong> Free and Plus cards use the LIW Cards Home Screen icon.</span>';

    window.track?.('home_screen_save_click', null, { branding: state.customIcon ? 'custom' : 'liw', native_prompt_ready: Boolean(state.deferredPrompt) });
    if (typeof element.showModal === 'function') element.showModal();
    else element.setAttribute('open', '');
    if (window.lucide) lucide.createIcons();
  }

  function hydrate() {
    if (!button || !cardIsReady()) return;
    if (previewBanner && !previewBanner.hidden) {
      button.hidden = true;
      return;
    }

    state.cardName = String(document.getElementById('name')?.textContent || 'Digital Card').trim() || 'Digital Card';
    const icon = preferredIcon();
    state.preferredIcon = icon.url;
    state.customIcon = icon.custom;
    setPageInstallIdentity(icon.url);
    state.installed = isStandalone();

    if (state.installed) {
      button.hidden = true;
      return;
    }

    button.hidden = false;
    button.disabled = false;
    state.hydrated = true;
    if (window.lucide) lucide.createIcons();
  }

  if (button) button.addEventListener('click', showInstructions);

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.deferredPrompt = event;
    document.documentElement.classList.add('card-install-ready');
  });

  window.addEventListener('appinstalled', () => {
    state.deferredPrompt = null;
    state.installed = true;
    if (button) button.hidden = true;
    window.track?.('home_screen_install', null, { branding: state.customIcon ? 'custom' : 'liw', method: 'appinstalled_event' });
    window.toast?.(`${state.cardName} was added to your device.`);
  });

  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', event => {
    if (event.matches && button) button.hidden = true;
  });

  configureManifest();
  registerScopedServiceWorker();

  if (cardElement) {
    const observer = new MutationObserver(() => hydrate());
    observer.observe(cardElement, { attributes: true, attributeFilter: ['hidden', 'class', 'style'], childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', hydrate);
  window.addEventListener('load', () => setTimeout(hydrate, 0));
})();
