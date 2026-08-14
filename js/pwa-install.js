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
    link.href = 'css/launch-fixes.css?v=20260813-2';
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

/*
 * STAGING ONLY — LIW Cards niche template lab.
 * This code lives in the public cards-staging test repo only. It never inserts
 * or updates rows in public.templates. Test templates apply design values to
 * the card, then intentionally clear template_id so Supabase never receives
 * a fake template ID.
 */
(() => {
  'use strict';

  if (typeof renderTemplates !== 'function' || typeof applyTemplate !== 'function') return;

  const stagingTemplates = [
    {
      id: 'staging-executive-barber', name: 'Executive Barber', category: 'Barbershop',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'bold', primary_color: '#111111', secondary_color: '#D4AF37',
        background_color: '#090909', text_color: '#F9FAFB', button_color: '#D4AF37',
        button_text_color: '#111111', font_family: 'Manrope', button_style: 'filled',
        profile_image_shape: 'circle', border_radius: '18', color_mode: 'dark',
        gradient_background: 'linear-gradient(135deg,#050505 0%,#171717 64%,#D4AF37 140%)'
      }
    },
    {
      id: 'staging-luxury-realtor', name: 'Luxury Realtor', category: 'Real Estate',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'property', primary_color: '#18181B', secondary_color: '#C9A227',
        background_color: '#FAF7F0', text_color: '#27272A', button_color: '#18181B',
        button_text_color: '#FFFFFF', font_family: 'Georgia', button_style: 'filled',
        profile_image_shape: 'rounded', border_radius: '12', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#18181B 0%,#3F3F46 65%,#C9A227 135%)'
      }
    },
    {
      id: 'staging-brooklyn-realtor', name: 'Brooklyn Realtor', category: 'Real Estate',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'split', primary_color: '#0B1438', secondary_color: '#D4A84F',
        background_color: '#FFFFFF', text_color: '#111827', button_color: '#0B1438',
        button_text_color: '#FFFFFF', font_family: 'DM Sans', button_style: 'filled',
        profile_image_shape: 'circle', border_radius: '16', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#0B1438 0%,#182A62 65%,#D4A84F 140%)'
      }
    },
    {
      id: 'staging-tax-pro-trust', name: 'Tax Pro Trust', category: 'Tax Professional',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'executive', primary_color: '#16324F', secondary_color: '#2F855A',
        background_color: '#F8FAFC', text_color: '#172033', button_color: '#16324F',
        button_text_color: '#FFFFFF', font_family: 'Inter', button_style: 'filled',
        profile_image_shape: 'rounded', border_radius: '10', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#16324F 0%,#23537B 58%,#2F855A 130%)'
      }
    },
    {
      id: 'staging-clean-fresh', name: 'Clean & Fresh', category: 'Cleaning Service',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'soft', primary_color: '#0F766E', secondary_color: '#5EEAD4',
        background_color: '#F6FFFD', text_color: '#123B38', button_color: '#0F766E',
        button_text_color: '#FFFFFF', font_family: 'DM Sans', button_style: 'soft',
        profile_image_shape: 'circle', border_radius: '24', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#0F766E 0%,#14B8A6 62%,#99F6E4 125%)'
      }
    },
    {
      id: 'staging-mobile-mechanic', name: 'Mobile Mechanic', category: 'Automotive',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'automotive', primary_color: '#1F2937', secondary_color: '#F97316',
        background_color: '#111827', text_color: '#F9FAFB', button_color: '#F97316',
        button_text_color: '#111827', font_family: 'Manrope', button_style: 'filled',
        profile_image_shape: 'square', border_radius: '8', color_mode: 'dark',
        gradient_background: 'linear-gradient(135deg,#111827 0%,#374151 62%,#F97316 135%)'
      }
    },
    {
      id: 'staging-salon-luxe', name: 'Salon Luxe', category: 'Beauty & Salon',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'beauty', primary_color: '#6B214E', secondary_color: '#D7A6B8',
        background_color: '#FFF8FB', text_color: '#3E1B30', button_color: '#6B214E',
        button_text_color: '#FFFFFF', font_family: 'Georgia', button_style: 'soft',
        profile_image_shape: 'circle', border_radius: '24', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#6B214E 0%,#A64D79 62%,#E8B4C8 128%)'
      }
    },
    {
      id: 'staging-optical-modern', name: 'Optical Modern', category: 'Optical & Eyewear',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'minimal', primary_color: '#1D4ED8', secondary_color: '#06B6D4',
        background_color: '#F8FBFF', text_color: '#0F172A', button_color: '#1D4ED8',
        button_text_color: '#FFFFFF', font_family: 'Inter', button_style: 'outline',
        profile_image_shape: 'rounded', border_radius: '14', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#1D4ED8 0%,#2563EB 58%,#06B6D4 125%)'
      }
    },
    {
      id: 'staging-restaurant-reserve', name: 'Restaurant Reserve', category: 'Restaurant',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'dining', primary_color: '#7F1D1D', secondary_color: '#D6B36A',
        background_color: '#FFF9F0', text_color: '#3A201C', button_color: '#7F1D1D',
        button_text_color: '#FFF9F0', font_family: 'Georgia', button_style: 'filled',
        profile_image_shape: 'rounded', border_radius: '14', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#521313 0%,#7F1D1D 62%,#D6B36A 135%)'
      }
    },
    {
      id: 'staging-contractor-blueprint', name: 'Contractor Blueprint', category: 'Contractor',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'split', primary_color: '#1E3A5F', secondary_color: '#F59E0B',
        background_color: '#F8FAFC', text_color: '#172033', button_color: '#1E3A5F',
        button_text_color: '#FFFFFF', font_family: 'Manrope', button_style: 'filled',
        profile_image_shape: 'square', border_radius: '8', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#1E3A5F 0%,#315B86 60%,#F59E0B 135%)'
      }
    },
    {
      id: 'staging-photographer-editorial', name: 'Photographer Editorial', category: 'Photography',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'editorial', primary_color: '#252525', secondary_color: '#B8A58D',
        background_color: '#F6F2EC', text_color: '#232323', button_color: '#252525',
        button_text_color: '#FFFFFF', font_family: 'Georgia', button_style: 'outline',
        profile_image_shape: 'square', border_radius: '6', color_mode: 'light',
        gradient_background: 'linear-gradient(135deg,#1F1F1F 0%,#4A4540 62%,#B8A58D 132%)'
      }
    },
    {
      id: 'staging-nightlife-dj', name: 'Nightlife DJ', category: 'DJ & Entertainment',
      access_tier: 'standard', is_premium: false, is_active: true, staging_only: true,
      configuration: {
        layout: 'spotlight', primary_color: '#111827', secondary_color: '#8B5CF6',
        background_color: '#070711', text_color: '#F8FAFC', button_color: '#8B5CF6',
        button_text_color: '#FFFFFF', font_family: 'Manrope', button_style: 'filled',
        profile_image_shape: 'circle', border_radius: '22', color_mode: 'dark',
        gradient_background: 'linear-gradient(135deg,#05050B 0%,#312E81 58%,#8B5CF6 105%,#06B6D4 145%)'
      }
    }
  ];

  let selectedStagingId = '';
  const baseRenderTemplates = renderTemplates;
  const baseApplyTemplate = applyTemplate;

  function installStagingTemplates() {
    if (!Array.isArray(templates)) return;
    const existing = new Set(templates.map(template => String(template.id)));
    stagingTemplates.forEach(template => {
      if (!existing.has(String(template.id))) templates.push(template);
    });
  }

  function decorateStagingTemplates() {
    const grid = document.getElementById('template-grid');
    if (!grid) return;

    let note = document.getElementById('staging-template-lab-note');
    if (!note) {
      note = document.createElement('div');
      note.id = 'staging-template-lab-note';
      note.className = 'editor-step-note';
      note.innerHTML = '<i data-lucide="flask-conical" size="17"></i><div><strong>Staging template lab</strong><span>12 niche designs are unlocked here for testing only. No template records are being added to the live database.</span></div>';
      grid.parentElement?.insertBefore(note, grid);
    }

    stagingTemplates.forEach(template => {
      const button = grid.querySelector(`.template-card[data-template="${template.id}"]`);
      if (!button) return;
      button.dataset.stagingOnly = 'true';
      button.title = `${template.name} — staging test template`;
      const badge = button.querySelector('.template-card-label em');
      if (badge) {
        badge.textContent = 'Test';
        badge.classList.remove('free');
      }
      button.classList.toggle('active', selectedStagingId === template.id);
    });

    if (selectedStagingId) {
      const selected = stagingTemplates.find(template => template.id === selectedStagingId);
      const summary = document.getElementById('template-selected-summary');
      if (selected && summary) summary.textContent = `${selected.name} · STAGING`;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  renderTemplates = function stagingAwareRenderTemplates() {
    installStagingTemplates();
    const result = baseRenderTemplates();
    decorateStagingTemplates();
    return result;
  };

  applyTemplate = function stagingAwareApplyTemplate(template) {
    if (!template?.staging_only) {
      selectedStagingId = '';
      return baseApplyTemplate(template);
    }

    const config = template.configuration || {};
    const keys = [
      'primary_color', 'secondary_color', 'background_color', 'text_color',
      'button_color', 'button_text_color', 'font_family', 'button_style',
      'profile_image_shape', 'border_radius', 'color_mode', 'gradient_background'
    ];

    keys.forEach(key => {
      if (config[key] === undefined || config[key] === null || !field(key)) return;
      field(key).value = String(config[key]);
    });

    field('card_layout').value = safeLayout(config.layout || 'classic');
    field('template_id').value = '';
    selectedStagingId = template.id;

    document.querySelectorAll('.template-card').forEach(item => {
      item.classList.toggle('active', item.dataset.template === String(template.id));
    });
    document.querySelectorAll('.color-preset').forEach(item => item.classList.remove('active'));

    const summary = document.getElementById('template-selected-summary');
    if (summary) summary.textContent = `${template.name} · STAGING`;

    updateCoverPreview();
    render();
    scheduleSave();
    decorateStagingTemplates();
    toast(`${template.name} staging design applied`);
  };
})();
