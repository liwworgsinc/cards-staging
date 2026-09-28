(() => {
  'use strict';

  try {
    if (!/\/card\.html$/i.test(location.pathname)) return;

    const slug = String(new URLSearchParams(location.search).get('slug') || '').trim().toLowerCase();
    if (!slug) return;

    let deferredPrompt = window.__LIW_CARD_INSTALL_PROMPT__ || null;
    let initialized = false;
    let attempts = 0;
    let cardName = 'Digital Card';
    let preferredIcon = null;
    const MAX_ATTEMPTS = 80;
    const SHARE_TRIGGER_SELECTOR = '#share-top,[data-liw-share-card],[data-liw-global-share],[data-realtor-share]';
    let shareObserver = null;
    let shareRepairQueued = false;

    const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = () => /android/i.test(navigator.userAgent);
    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isEmbedded = () => {
      try { return window.self !== window.top; } catch (_) { return true; }
    };

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
      window.__LIW_CARD_INSTALL_PROMPT__ = event;
      document.documentElement.classList.add('card-home-install-ready');
    });

    function absoluteAsset(path) {
      try {
        return typeof liwUrl === 'function' ? liwUrl(path) : new URL(path, location.href).href;
      } catch (_) {
        return path;
      }
    }

    function cardReady() {
      const card = document.getElementById('card');
      const name = String(document.getElementById('name')?.textContent || '').trim();
      return Boolean(card && !card.hidden && name);
    }

    function getCardName() {
      return String(document.getElementById('name')?.textContent || 'Digital Card').trim() || 'Digital Card';
    }

    function isVisibleShareTrigger(element) {
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

    function markShareTrigger(element) {
      if (!element) return null;
      element.dataset.liwGlobalShare = 'true';
      if (!element.getAttribute('aria-label')) element.setAttribute('aria-label', 'Share card');
      if (element.tagName === 'BUTTON' && !element.getAttribute('type')) element.setAttribute('type', 'button');
      return element;
    }

    function syncExistingShareTriggers() {
      document.querySelectorAll('.liw-global-share-fallback').forEach(node => node.remove());

      const triggers = Array.from(document.querySelectorAll(SHARE_TRIGGER_SELECTOR))
        .filter(element => !element.classList.contains('liw-global-share-fallback'));

      triggers.forEach(markShareTrigger);
      return triggers.find(isVisibleShareTrigger) || triggers[0] || null;
    }

    function queueShareRepair() {
      if (!initialized || shareRepairQueued) return;
      shareRepairQueued = true;
      window.requestAnimationFrame(() => {
        shareRepairQueued = false;
        const preview = document.getElementById('preview-banner');
        if (preview && !preview.hidden) return;
        syncExistingShareTriggers();
      });
    }

    function startShareObserver() {
      if (shareObserver) return;
      const card = document.getElementById('card');
      if (!card) return;
      shareObserver = new MutationObserver(queueShareRepair);
      shareObserver.observe(card, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'hidden']
      });
      document.addEventListener('liw:public-card-rendered', queueShareRepair);
    }

    function getPreferredIcon() {
      // Start with a safe placeholder until the server confirms the card plan.
      // QR-logo entitlement is not Home Screen branding entitlement.
      return { url: absoluteAsset('assets/icons/icon-512-v1062.png'), custom: false, source: 'liw' };
    }

    async function refreshPreferredInstallIcon() {
      const manifestLink = document.querySelector('link[data-liw-card-manifest]');
      if (!manifestLink) return;
      try {
        const response = await fetch(manifestLink.href, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) return;
        const manifest = await response.json();
        const source = String(manifest.liw_icon_source || '');
        const icon = manifest.icons?.find(item => item.sizes === '192x192' && item.type === 'image/png');
        if (!icon || !/^https:\/\//i.test(String(icon.src || ''))) return;
        preferredIcon = {
          url: icon.src,
          custom: source === 'profile' || source === 'profile-placeholder',
          source: source || 'liw'
        };
        const apple = document.querySelector('link[rel="apple-touch-icon"]');
        if (apple) apple.href = preferredIcon.url;
        const shareDialog = document.getElementById('card-share-dialog');
        if (shareDialog?.open) setShareHomeIcon(shareDialog);
        const installIcon = document.querySelector('#card-home-dialog .safe-card-home-icon');
        if (installIcon) installIcon.src = preferredIcon.url;
      } catch (error) {
        console.warn('Card installation branding metadata could not be loaded:', error);
      }
    }

    function getShareUrl() {
      const url = new URL(location.href);
      url.hash = '';
      url.search = '';
      url.searchParams.set('slug', slug);
      return url.href;
    }

    async function copyText(value) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (_) {
        try {
          const input = document.createElement('textarea');
          input.value = value;
          input.setAttribute('readonly', '');
          input.style.position = 'fixed';
          input.style.opacity = '0';
          document.body.appendChild(input);
          input.select();
          const copied = document.execCommand('copy');
          input.remove();
          return copied;
        } catch (_) {
          return false;
        }
      }
    }

    function attachInstallMetadata(name, preferred) {
      try {
        // Preserve the per-card manifest loaded early in card.html. Replacing it
        // after asynchronous rendering can lose Chrome's install opportunity.
        if (typeof LIW_CONFIG !== 'undefined' && LIW_CONFIG?.supabaseUrl) {
          const appUrl = new URL(getShareUrl());
          const url = new URL(`${LIW_CONFIG.supabaseUrl}/functions/v1/card-manifest-staging`);
          url.searchParams.set('slug', slug);
          url.searchParams.set('app_url', appUrl.href);
          let manifest = document.querySelector('link[data-liw-card-manifest]');
          if (!manifest) {
            manifest = document.createElement('link');
            manifest.rel = 'manifest';
            manifest.crossOrigin = 'anonymous';
            manifest.dataset.liwCardManifest = 'true';
            document.head.appendChild(manifest);
          }
          if (manifest.href !== url.href) manifest.href = url.href;
        }

        let apple = document.querySelector('link[rel="apple-touch-icon"]');
        if (!apple) {
          apple = document.createElement('link');
          apple.rel = 'apple-touch-icon';
          document.head.appendChild(apple);
        }
        apple.href = preferred.url || absoluteAsset('assets/icons/apple-touch-icon-v1062.png');

        let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (!appleTitle) {
          appleTitle = document.createElement('meta');
          appleTitle.name = 'apple-mobile-web-app-title';
          document.head.appendChild(appleTitle);
        }
        appleTitle.content = name.length <= 30 ? name : `${name.slice(0, 29).trim()}…`;
      } catch (error) {
        console.warn('LIW card Home Screen metadata skipped:', error);
      }
    }

    function closeDialog(dialog) {
      if (!dialog) return;
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    }

    function makeInstallDialog() {
      let dialog = document.getElementById('card-home-dialog');
      if (dialog) return dialog;

      dialog = document.createElement('dialog');
      dialog.id = 'card-home-dialog';
      dialog.className = 'safe-card-home-dialog';
      dialog.innerHTML = `
        <div class="safe-card-home-panel">
          <button class="safe-card-home-close" type="button" aria-label="Close">×</button>
          <div class="safe-card-home-icon-wrap"><img class="safe-card-home-icon" alt=""></div>
          <div class="safe-card-home-kicker">Keep this card one tap away</div>
          <h2 class="safe-card-home-title"></h2>
          <p class="safe-card-home-copy"></p>
          <ol class="safe-card-home-steps"></ol>
          <div class="safe-card-home-brand"></div>
          <button class="btn btn-primary btn-block safe-card-home-primary" type="button" hidden>Copy card link for Chrome</button>
          <button class="btn btn-light btn-block safe-card-home-dismiss" type="button">Close</button>
        </div>`;
      document.body.appendChild(dialog);

      const close = () => closeDialog(dialog);
      dialog.querySelector('.safe-card-home-close')?.addEventListener('click', close);
      dialog.querySelector('.safe-card-home-dismiss')?.addEventListener('click', close);
      dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
      return dialog;
    }

    function openInstallInstructions() {
      const dialog = makeInstallDialog();
      const icon = dialog.querySelector('.safe-card-home-icon');
      const title = dialog.querySelector('.safe-card-home-title');
      const copy = dialog.querySelector('.safe-card-home-copy');
      const steps = dialog.querySelector('.safe-card-home-steps');
      const brand = dialog.querySelector('.safe-card-home-brand');
      const primary = dialog.querySelector('.safe-card-home-primary');

      if (icon) {
        icon.src = preferredIcon?.url || absoluteAsset('assets/icons/icon-512-v1062.png');
        icon.alt = `${cardName} Home Screen icon`;
      }
      if (title) title.textContent = `Add ${cardName} to Home Screen`;
      if (copy) copy.textContent = 'Open this exact digital card later without scanning the QR code again.';
      if (brand) brand.textContent = preferredIcon?.custom
        ? 'Custom Home Screen branding is active for this card.'
        : 'This plan uses LIW Cards Home Screen branding.';
      if (primary) {
        primary.hidden = !(isAndroid() || isEmbedded());
        primary.textContent = isAndroid() ? 'Copy card link for Chrome' : 'Copy card link for browser';
        primary.onclick = async () => {
          const copied = await copyText(getShareUrl());
          if (copied) {
            primary.textContent = 'Copied — open Chrome app';
            window.toast?.('Card link copied. Open Chrome from your phone and paste it in the address bar.');
          } else {
            primary.textContent = 'Copy failed — use Share → Copy link';
          }
        };
      }

      const setSteps = items => {
        if (!steps) return;
        steps.innerHTML = items.map(item => `<li>${item}</li>`).join('');
      };

      if (isIos()) {
        setSteps([
          'Open this card in Safari.',
          'Tap Safari Share, then Add to Home Screen.',
          'Keep Open as Web App enabled when shown, then tap Add.'
        ]);
      } else if (isAndroid()) {
        setSteps([
          'This app window has no Chrome browser menu. Do not use Open in Chrome here; it can reopen the installed LIW app.',
          'Tap Copy card link for Chrome below, leave this app, and launch the separate Chrome app from your phone.',
          'Paste the link into Chrome’s address bar. In a regular Chrome tab use ⋮ → Install app or Add to Home screen, if offered.',
          'If Chrome says it is already installed, check Android Settings → Apps for that card’s name. An accepted install prompt does not guarantee a new Home screen icon.'
        ]);
      } else {
        setSteps([
          'Open your browser install menu.',
          'Choose Install or Install page as app.',
          'Confirm the installation.'
        ]);
      }

      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
    }

    async function promptHomeInstall(shareDialog) {
      closeDialog(shareDialog);
      window.track?.('home_screen_save_click', null, {
        branding: preferredIcon?.custom ? 'custom' : 'liw',
        entry: 'share_menu'
      });

      // Chrome only allows a native install prompt after beforeinstallprompt.
      // Do not force Android intents here: the installed root-scope LIW app can
      // capture those URLs and reopen another app window with no ⋮ menu.
      const prompt = deferredPrompt || window.__LIW_CARD_INSTALL_PROMPT__;
      if (prompt && !isStandalone() && !isEmbedded()) {
        deferredPrompt = null;
        window.__LIW_CARD_INSTALL_PROMPT__ = null;
        try {
          prompt.prompt();
          const choice = await prompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
          if (choice.outcome === 'accepted') {
            window.track?.('home_screen_install', null, {
              branding: preferredIcon?.custom ? 'custom' : 'liw',
              entry: 'share_menu',
              method: 'native_prompt'
            });
          }
        } catch (_) {
          openInstallInstructions();
        }
        return;
      }

      // No native prompt means no programmatic install. Offer a copyable link
      // and real Chrome steps without any automatic navigation/redirect loop.
      openInstallInstructions();
    }

    function makeShareDialog() {
      let dialog = document.getElementById('card-share-dialog');
      if (dialog) return dialog;

      dialog = document.createElement('dialog');
      dialog.id = 'card-share-dialog';
      dialog.className = 'safe-card-share-dialog';
      dialog.innerHTML = `
        <div class="safe-card-share-panel">
          <div class="safe-card-share-head">
            <div>
              <span>Share card</span>
              <h2 class="safe-card-share-title">Share this card</h2>
            </div>
            <button class="safe-card-share-close" type="button" aria-label="Close">×</button>
          </div>
          <div class="safe-card-share-actions">
            <button type="button" class="safe-card-share-action" data-card-share-native>
              <span class="safe-card-share-action-icon"><i data-lucide="share-2" size="20"></i></span>
              <span><strong>Share card</strong><small>Send by text, email, apps & more</small></span>
              <i data-lucide="chevron-right" size="18"></i>
            </button>
            <button type="button" class="safe-card-share-action" data-card-share-copy>
              <span class="safe-card-share-action-icon"><i data-lucide="copy" size="20"></i></span>
              <span><strong>Copy link</strong><small>Copy the card link to your clipboard</small></span>
              <i data-lucide="chevron-right" size="18"></i>
            </button>
            <button type="button" class="safe-card-share-action safe-card-share-home" data-card-share-home>
              <span class="safe-card-share-action-icon safe-card-share-home-icon"></span>
              <span><strong>Install this card</strong><small>Give this card its own home-screen icon</small></span>
              <i data-lucide="chevron-right" size="18"></i>
            </button>
          </div>
        </div>`;
      document.body.appendChild(dialog);

      const close = () => closeDialog(dialog);
      dialog.querySelector('.safe-card-share-close')?.addEventListener('click', close);
      dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
      return dialog;
    }

    function setShareHomeIcon(dialog) {
      const wrap = dialog.querySelector('.safe-card-share-home-icon');
      if (!wrap) return;
      wrap.innerHTML = '';

      const image = document.createElement('img');
      image.src = preferredIcon?.url || absoluteAsset('assets/icons/icon-512-v1062.png');
      image.alt = preferredIcon?.custom ? `${cardName} logo` : 'LIW Cards logo';
      image.addEventListener('error', () => {
        wrap.innerHTML = '<i data-lucide="smartphone" size="20"></i>';
        if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
      }, { once: true });
      wrap.appendChild(image);
    }

    function openShareMenu() {
      const dialog = makeShareDialog();
      const title = dialog.querySelector('.safe-card-share-title');
      const nativeButton = dialog.querySelector('[data-card-share-native]');
      const copyButton = dialog.querySelector('[data-card-share-copy]');
      const homeButton = dialog.querySelector('[data-card-share-home]');
      const shareUrl = getShareUrl();

      if (title) title.textContent = `Share ${cardName}`;
      setShareHomeIcon(dialog);
      if (homeButton) homeButton.hidden = false;

      if (nativeButton) {
        nativeButton.onclick = async () => {
          closeDialog(dialog);
          try {
            if (navigator.share) {
              await navigator.share({
                title: cardName,
                text: `Connect with ${cardName}`,
                url: shareUrl
              });
              window.track?.('share_click', null, { method: 'native_share', share_menu: true });
            } else {
              const copied = await copyText(shareUrl);
              if (copied) {
                window.track?.('share_click', null, { method: 'copy_fallback', share_menu: true });
                window.toast?.('Card link copied');
              }
            }
          } catch (_) {}
        };
      }

      if (copyButton) {
        copyButton.onclick = async () => {
          const copied = await copyText(shareUrl);
          if (copied) {
            window.track?.('share_click', null, { method: 'copy_link', share_menu: true });
            window.toast?.('Card link copied');
            closeDialog(dialog);
          }
        };
      }

      if (homeButton) homeButton.onclick = () => promptHomeInstall(dialog);

      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
    }

    function interceptShare(event) {
      if (!initialized) return;
      const share = event.target instanceof Element ? event.target.closest(SHARE_TRIGGER_SELECTOR) : null;
      if (!share) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openShareMenu();
    }

    document.addEventListener('click', interceptShare, true);

    function initialize() {
      if (initialized || !cardReady()) return false;
      const preview = document.getElementById('preview-banner');
      if (preview && !preview.hidden) return false;

      cardName = getCardName();
      preferredIcon = getPreferredIcon();
      attachInstallMetadata(cardName, preferredIcon);
      refreshPreferredInstallIcon();
      syncExistingShareTriggers();
      initialized = true;
      window.LIWCardShare = Object.freeze({
        open: openShareMenu,
        syncExistingButtons: syncExistingShareTriggers,
        getShareUrl
      });
      startShareObserver();
      document.documentElement.classList.add('card-share-home-active');
      document.dispatchEvent(new CustomEvent('liw:card-share-ready', {
        detail: { slug, version: 'global-share-v3-existing-drawer' }
      }));
      return true;
    }

    const timer = window.setInterval(() => {
      attempts += 1;
      try {
        if (initialize() || attempts >= MAX_ATTEMPTS) window.clearInterval(timer);
      } catch (error) {
        console.warn('LIW card Share/Home Screen enhancer skipped:', error);
        window.clearInterval(timer);
      }
    }, 250);

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      window.__LIW_CARD_INSTALL_PROMPT__ = null;
      closeDialog(document.getElementById('card-share-dialog'));
      closeDialog(document.getElementById('card-home-dialog'));
    });
  } catch (error) {
    console.warn('LIW card Share/Home Screen enhancer unavailable:', error);
  }
})();
