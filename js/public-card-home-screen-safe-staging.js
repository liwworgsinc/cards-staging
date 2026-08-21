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
      return Boolean(card && !card.hidden && name);
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

    function makeDialog(name, preferred) {
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

      const close = () => {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      };
      dialog.querySelector('.safe-card-home-close')?.addEventListener('click', close);
      dialog.querySelector('.safe-card-home-dismiss')?.addEventListener('click', close);
      dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
      return dialog;
    }

    function openInstallUi(name, preferred) {
      const dialog = makeDialog(name, preferred);
      const icon = dialog.querySelector('.safe-card-home-icon');
      const title = dialog.querySelector('.safe-card-home-title');
      const copy = dialog.querySelector('.safe-card-home-copy');
      const steps = dialog.querySelector('.safe-card-home-steps');
      const brand = dialog.querySelector('.safe-card-home-brand');
      const primary = dialog.querySelector('.safe-card-home-primary');

      if (icon) {
        icon.src = preferred.url;
        icon.alt = `${name} Home Screen icon`;
      }
      if (title) title.textContent = `Save ${name} to Home Screen`;
      if (copy) copy.textContent = 'Open this exact digital card later without scanning the QR code again.';
      if (brand) brand.textContent = preferred.custom
        ? 'Custom Home Screen branding is active for this card.'
        : 'This plan uses LIW Cards Home Screen branding.';

      const setSteps = items => {
        if (!steps) return;
        steps.innerHTML = items.map(item => `<li>${item}</li>`).join('');
      };

      if (deferredPrompt) {
        setSteps([
          'Tap Install card below.',
          'Confirm the browser prompt.',
          'Use the new icon anytime to reopen this card.'
        ]);
        if (primary) {
          primary.hidden = false;
          primary.onclick = async () => {
            const prompt = deferredPrompt;
            if (!prompt) return;
            primary.disabled = true;
            try {
              prompt.prompt();
              const choice = await prompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
              deferredPrompt = null;
              if (choice.outcome === 'accepted') {
                window.track?.('home_screen_install', null, { branding: preferred.custom ? 'custom' : 'liw', safe_flow: true });
                if (typeof dialog.close === 'function') dialog.close();
              }
            } finally {
              primary.disabled = false;
            }
          };
        }
      } else if (isIos()) {
        setSteps([
          'Tap Share in Safari.',
          'Choose Add to Home Screen.',
          'Keep Open as Web App enabled when shown, then tap Add.'
        ]);
        if (primary) primary.hidden = true;
      } else if (isAndroid()) {
        setSteps([
          'Open the browser menu (⋮).',
          'Choose Add to Home screen or Install app.',
          'Confirm Add or Install.'
        ]);
        if (primary) primary.hidden = true;
      } else {
        setSteps([
          'Open your browser install menu.',
          'Choose Install or Install page as app.',
          'Confirm the installation.'
        ]);
        if (primary) primary.hidden = true;
      }

      window.track?.('home_screen_save_click', null, { branding: preferred.custom ? 'custom' : 'liw', safe_flow: true });
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }

    function injectButton(name, preferred) {
      if (isStandalone()) return;
      if (document.getElementById('safe-save-home-screen')) return;
      const saveContact = document.getElementById('save');
      if (!saveContact) return;

      const button = document.createElement('button');
      button.id = 'safe-save-home-screen';
      button.type = 'button';
      button.className = 'safe-save-home-screen';
      button.innerHTML = `
        <span class="safe-save-home-screen-icon"></span>
        <span class="safe-save-home-screen-copy"><strong>Save Card to Home Screen</strong><small>Keep this card one tap away</small></span>
        <i data-lucide="chevron-right" size="18"></i>`;

      const iconWrap = button.querySelector('.safe-save-home-screen-icon');
      if (iconWrap) {
        const image = document.createElement('img');
        image.src = preferred.url;
        image.alt = preferred.custom ? `${name} logo` : 'LIW Cards logo';
        image.loading = 'eager';
        image.decoding = 'async';
        image.style.cssText = 'width:100%;height:100%;display:block;object-fit:contain;border-radius:9px;background:#fff;';
        iconWrap.style.padding = '4px';
        iconWrap.style.overflow = 'hidden';
        iconWrap.style.background = '#fff';
        image.addEventListener('error', () => {
          iconWrap.style.padding = '0';
          iconWrap.style.background = 'var(--card-button, var(--card-primary, #0b1438))';
          iconWrap.innerHTML = '<i data-lucide="smartphone" size="20"></i>';
          if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
        }, { once: true });
        iconWrap.appendChild(image);
      }

      button.addEventListener('click', () => openInstallUi(name, preferred));
      saveContact.insertAdjacentElement('afterend', button);
      if (window.lucide) window.lucide.createIcons({ attrs: { 'aria-hidden': 'true' } });
    }

    function initialize() {
      if (initialized || !cardReady()) return false;
      const preview = document.getElementById('preview-banner');
      if (preview && !preview.hidden) return false;

      const name = getCardName();
      const preferred = getPreferredIcon();
      attachInstallMetadata(name, preferred);
      injectButton(name, preferred);
      initialized = true;
      document.documentElement.classList.add('safe-card-home-active');
      return true;
    }

    const timer = window.setInterval(() => {
      attempts += 1;
      try {
        if (initialize() || attempts >= MAX_ATTEMPTS) window.clearInterval(timer);
      } catch (error) {
        console.warn('LIW safe Home Screen enhancer skipped:', error);
        window.clearInterval(timer);
      }
    }, 250);

    window.addEventListener('appinstalled', () => {
      document.getElementById('safe-save-home-screen')?.remove();
    });
  } catch (error) {
    console.warn('LIW safe Home Screen enhancer unavailable:', error);
  }
})();