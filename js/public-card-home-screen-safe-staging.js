(() => {
  'use strict';

  try {
    const params = new URLSearchParams(location.search);
    if (params.get('homeinstall') !== '1') return;
    if (!/\/card\.html$/i.test(location.pathname)) return;

    const slug = String(params.get('slug') || '').trim().toLowerCase();
    if (!slug) return;

    let deferredPrompt = null;
    let initialized = false;
    let attempts = 0;
    let cardName = 'Digital Card';
    let preferredIcon = null;
    const MAX_ATTEMPTS = 80;

    const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isAndroid = () => /android/i.test(navigator.userAgent);
    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredPrompt = event;
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
      return Boolean(card && !card.hidden && name && document.getElementById('share-top'));
    }

    function getCardName() {
      return String(document.getElementById('name')?.textContent || 'Digital Card').trim() || 'Digital Card';
    }

    function customBrandingAllowed() {
      return globalThis.publicCardFeatureAccess?.custom_qr === true;
    }

    function getPreferredIcon() {
      const liw = absoluteAsset('assets/icons/icon-512-v1062.png');
      if (!customBrandingAllowed()) return { url: liw, custom: false, source: 'liw' };

      const qrLogo = document.getElementById('qr-logo');
      const qrUrl = qrLogo && !qrLogo.hidden ? String(qrLogo.currentSrc || qrLogo.src || '').trim() : '';
      if (qrUrl) return { url: qrUrl, custom: true, source: 'qr_logo' };

      const profile = document.querySelector('#avatar img');
      const profileUrl = String(profile?.currentSrc || profile?.src || '').trim();
      if (profileUrl) return { url: profileUrl, custom: true, source: 'profile' };

      return { url: liw, custom: false, source: 'liw_fallback' };
    }

    function getShareUrl() {
      const rawReferrer = String(document.referrer || '').trim();
      if (rawReferrer) {
        try {
          const parsed = new URL(rawReferrer);
          if (['http:', 'https:'].includes(parsed.protocol) && parsed.origin !== location.origin) {
            parsed.hash = '';
            return parsed.href;
          }
        } catch (_) {}
      }

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
        document.querySelectorAll('link[rel="manifest"]').forEach(link => link.remove());

        if (globalThis.LIW_CONFIG?.supabaseUrl) {
          const appUrl = new URL(location.href);
          appUrl.hash = '';
          appUrl.search = '';
          appUrl.searchParams.set('slug', slug);
          const manifest = document.createElement('link');
          manifest.rel = 'manifest';
          manifest.crossOrigin = 'anonymous';
          manifest.dataset.cardManifest = 'safe';
          manifest.href = `${LIW_CONFIG.supabaseUrl}/functions/v1/card-manifest?slug=${encodeURIComponent(slug)}&app_url=${encodeURIComponent(appUrl.href)}`;
          document.head.appendChild(manifest);
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
        console.warn('LIW safe Home Screen metadata skipped:', error);
      }
    }

    function closeDialog(dialog) {
      if (!dialog) return;
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    }

    function makeInstallDialog() {
      let dialog = document.getElementById('safe-card-home-dialog');
      if (dialog) return dialog;

      dialog = document.createElement('dialog');
      dialog.id = 'safe-card-home-dialog';
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
          <button class="btn btn-primary btn-block safe-card-home-primary" type="button" hidden>Install card</button>
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
      if (primary) primary.hidden = true;

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
          'Open the browser menu (⋮).',
          'Choose Add to Home screen or Install app.',
          'Confirm Add or Install.'
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
        safe_flow: true,
        entry: 'share_menu'
      });

      if (isStandalone()) {
        window.toast?.(`${cardName} is already on this device.`);
        return;
      }

      if (deferredPrompt) {
        const prompt = deferredPrompt;
        try {
          prompt.prompt();
          const choice = await prompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
          deferredPrompt = null;
          if (choice.outcome === 'accepted') {
            window.track?.('home_screen_install', null, {
              branding: preferredIcon?.custom ? 'custom' : 'liw',
              safe_flow: true,
              entry: 'share_menu',
              method: 'native_prompt'
            });
          }
        } catch (_) {
          openInstallInstructions();
        }
        return;
      }

      openInstallInstructions();
    }

    function makeShareDialog() {
      let dialog = document.getElementById('safe-card-share-dialog');
      if (dialog) return dialog;

      dialog = document.createElement('dialog');
      dialog.id = 'safe-card-share-dialog';
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
            <button type="button" class="safe-card-share-action" data-safe-share-native>
              <span class="safe-card-share-action-icon"><i data-lucide="share-2" size="20"></i></span>
              <span><strong>Share card</strong><small>Send by text, email, apps & more</small></span>
              <i data-lucide="chevron-right" size="18"></i>
            </button>
            <button type="button" class="safe-card-share-action" data-safe-share-copy>
              <span class="safe-card-share-action-icon"><i data-lucide="copy" size="20"></i></span>
              <span><strong>Copy link</strong><small>Copy the card link to your clipboard</small></span>
              <i data-lucide="chevron-right" size="18"></i>
            </button>
            <button type="button" class="safe-card-share-action safe-card-share-home" data-safe-share-home>
              <span class="safe-card-share-action-icon safe-card-share-home-icon"></span>
              <span><strong>Add to Home Screen</strong><small>Keep this card one tap away</small></span>
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
      const nativeButton = dialog.querySelector('[data-safe-share-native]');
      const copyButton = dialog.querySelector('[data-safe-share-copy]');
      const homeButton = dialog.querySelector('[data-safe-share-home]');
      const shareUrl = getShareUrl();

      if (title) title.textContent = `Share ${cardName}`;
      setShareHomeIcon(dialog);
      if (homeButton) homeButton.hidden = isStandalone();

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
              window.track?.('share_click', null, { method: 'native_share', safe_share_menu: true });
            } else {
              const copied = await copyText(shareUrl);
              if (copied) {
                window.track?.('share_click', null, { method: 'copy_fallback', safe_share_menu: true });
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
            window.track?.('share_click', null, { method: 'copy_link', safe_share_menu: true });
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
      const share = event.target instanceof Element ? event.target.closest('#share-top') : null;
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

      document.getElementById('safe-save-home-screen')?.remove();
      cardName = getCardName();
      preferredIcon = getPreferredIcon();
      attachInstallMetadata(cardName, preferredIcon);
      initialized = true;
      document.documentElement.classList.add('safe-card-share-home-active');
      return true;
    }

    const timer = window.setInterval(() => {
      attempts += 1;
      try {
        if (initialize() || attempts >= MAX_ATTEMPTS) window.clearInterval(timer);
      } catch (error) {
        console.warn('LIW safe Home Screen share enhancer skipped:', error);
        window.clearInterval(timer);
      }
    }, 250);

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      closeDialog(document.getElementById('safe-card-share-dialog'));
      closeDialog(document.getElementById('safe-card-home-dialog'));
      window.toast?.(`${cardName} was added to your device.`);
    });
  } catch (error) {
    console.warn('LIW safe Home Screen share enhancer unavailable:', error);
  }
})();