(() => {
  'use strict';

  const staging = location.hostname === 'liwworgsinc.github.io' && location.pathname.startsWith('/cards-staging/');
  if (!staging || window.__LIW_QR_STYLE_PERSISTENCE_STAGING__) return;
  window.__LIW_QR_STYLE_PERSISTENCE_STAGING__ = true;

  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  const isEditor = page === 'editor.html';
  const isPublicCard = page === 'card.html' || page === 'card-preview.html';
  if (!isEditor && !isPublicCard) return;

  // Keep every preset visually honest. The main QR renderer already protects
  // the quiet zone, contrast and Level-H correction, so do not collapse the
  // different patterns back into square eyes here.
  const styleLibrary = window.LIWQrStyleStaging?.styles;
  if (styleLibrary) {
    if (styleLibrary.rounded) {
      styleLibrary.rounded.module = 'rounded';
      styleLibrary.rounded.eye = 'rounded';
      styleLibrary.rounded.note = 'Soft rounded modules + eyes';
    }
    if (styleLibrary.dots) {
      styleLibrary.dots.module = 'dots';
      styleLibrary.dots.eye = 'dots';
      styleLibrary.dots.note = 'True circular dots + round eyes';
    }
    if (styleLibrary.luxe) {
      styleLibrary.luxe.module = 'luxe';
      styleLibrary.luxe.eye = 'luxe';
      styleLibrary.luxe.note = 'Pebble modules + luxe round-center eyes';
    }
    if (styleLibrary.bold) {
      styleLibrary.bold.module = 'bold';
      styleLibrary.bold.eye = 'bold';
      styleLibrary.bold.note = 'Heavy block modules + square eyes';
    }
    if (styleLibrary.liw_signature) {
      styleLibrary.liw_signature.module = 'signature';
      styleLibrary.liw_signature.eye = 'signature';
      styleLibrary.liw_signature.note = 'Hybrid dots + rounded LIW eyes';
    }
  }

  const currentStyle = () => String(window.LIWQrStyleStaging?.selectedStyle || 'classic');

  async function saveStyle(cardId, style = currentStyle()) {
    if (!cardId || !window.supabaseClient) return;
    try {
      const { error } = await window.supabaseClient.rpc('set_card_qr_style', {
        p_card_id: cardId,
        p_style: style
      });
      if (error) throw error;
    } catch (error) {
      console.warn('[LIW QR] QR style save skipped:', error);
    }
  }

  function existingEditorId() {
    return new URLSearchParams(location.search).get('id');
  }

  function wireEditorPersistence() {
    document.addEventListener('click', event => {
      const button = event.target.closest?.('[data-liw-qr-style]');
      if (!button) return;
      const id = existingEditorId();
      if (!id) return;
      setTimeout(() => saveStyle(id), 40);
    }, true);

    // New cards do not have an id when the user first chooses a style. Wait
    // until the normal card save returns its newly-created id, then persist the
    // QR style through the narrow authorized RPC above.
    let checks = 0;
    const waitForPrimarySaveBridge = setInterval(() => {
      checks += 1;
      if (!window.__LIW_QR_STYLE_FETCH_BRIDGE__) {
        if (checks >= 80) clearInterval(waitForPrimarySaveBridge);
        return;
      }
      clearInterval(waitForPrimarySaveBridge);
      if (window.__LIW_QR_STYLE_RESPONSE_BRIDGE__) return;
      window.__LIW_QR_STYLE_RESPONSE_BRIDGE__ = true;
      const previousFetch = window.fetch.bind(window);
      window.fetch = async function(input, init) {
        const response = await previousFetch(input, init);
        const url = typeof input === 'string' ? input : String(input?.url || '');
        if (response.ok && url.includes('/functions/v1/save-card-state')) {
          try {
            const data = await response.clone().json();
            const cardId = data?.card?.id || data?.recoveredCardId || null;
            if (cardId) saveStyle(cardId);
          } catch (_) {}
        }
        return response;
      };
    }, 100);
  }

  async function applyPublicStyle() {
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug || !window.supabaseClient || !window.LIWQrStyleStaging) return false;
    try {
      const { data, error } = await window.supabaseClient.rpc('public_card_qr_style', { p_slug: slug });
      if (error) throw error;
      const style = String(data || 'classic');
      // Let the public-card renderer and QR style module finish reading colors
      // and entitlement state first, then apply the saved pattern on top.
      setTimeout(() => window.LIWQrStyleStaging?.setStyle?.(style), 350);
      setTimeout(() => window.LIWQrStyleStaging?.setStyle?.(style), 1100);
      return true;
    } catch (error) {
      console.warn('[LIW QR] Public QR style restore skipped:', error);
      return false;
    }
  }

  function boot() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (window.supabaseClient && window.LIWQrStyleStaging) {
        clearInterval(timer);
        if (isEditor) wireEditorPersistence();
        else applyPublicStyle();
      } else if (attempts >= 80) {
        clearInterval(timer);
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

/* Staging-only Spotlight mount. Kept outside the QR runtime so Spotlight can be
   removed or iterated without touching the Classic renderer. */
(function mountSpotlightExperience(){
  'use strict';
  const staging=location.hostname==='liwworgsinc.github.io'&&location.pathname.startsWith('/cards-staging/');
  const page=String(location.pathname.split('/').pop()||'').toLowerCase();
  if(!staging||!['card.html','card-preview.html'].includes(page))return;
  if(document.querySelector('script[data-liw-spotlight-public]'))return;
  document.addEventListener('liw:public-card-rendered',event=>{window.__LIW_SPOTLIGHT_PENDING_CARD__=event.detail?.card||null;},{once:true});
  const script=document.createElement('script');
  script.src='js/public-spotlight-experience-staging.js?v=20261019-spotlight-mockup-parity-1';
  script.defer=true;
  script.dataset.liwSpotlightPublic='true';
  document.body.appendChild(script);
})();

/* LIW Dynamic card QR bridge — if a published card is explicitly linked to an
   active Dynamic QR, render that saved Dynamic QR artwork in the card QR modal.
   If no link exists (or anything fails), the existing regular card QR is untouched. */
(() => {
  'use strict';
  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  if (!['card.html', 'card-preview.html'].includes(page) || window.__LIW_DYNAMIC_CARD_QR_BRIDGE__) return;
  window.__LIW_DYNAMIC_CARD_QR_BRIDGE__ = true;

  const slug = String(new URLSearchParams(location.search).get('slug') || '').trim();
  if (!slug) return;

  const DYNAMIC_BASE = 'https://qr.liwworgs.com';
  const LIB_SRC = 'https://cdn.jsdelivr.net/npm/qr-code-styling@1.6.0/lib/qr-code-styling.js';

  function loadQrLibrary() {
    if (window.QRCodeStyling) return Promise.resolve(true);
    return new Promise(resolve => {
      const existing = document.querySelector('script[data-liw-dynamic-qr-lib]');
      if (existing) {
        existing.addEventListener('load', () => resolve(!!window.QRCodeStyling), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = LIB_SRC;
      script.async = true;
      script.dataset.liwDynamicQrLib = 'true';
      script.addEventListener('load', () => resolve(!!window.QRCodeStyling), { once: true });
      script.addEventListener('error', () => resolve(false), { once: true });
      (document.head || document.documentElement).appendChild(script);
    });
  }

  function gradientFor(design = {}) {
    const mode = String(design.colorMode || 'solid');
    if (mode === 'solid') return null;
    return {
      type: mode === 'radial' ? 'radial' : 'linear',
      rotation: Number(design.gradientAngle || 90) * Math.PI / 180,
      colorStops: [
        { offset: 0, color: design.fg || '#111111' },
        { offset: 1, color: design.fg2 || '#5b5cff' }
      ]
    };
  }

  function optionsFor(link, size = 768) {
    const d = link.design && typeof link.design === 'object' ? link.design : {};
    const sourceSize = Math.max(1, Number(d.size || 1024));
    const scaledMargin = Math.max(0, Math.round((Number(d.margin ?? 8) / sourceSize) * size));
    const scaledLogoMargin = Math.max(0, Math.round((Number(d.logoMargin ?? 6) / sourceSize) * size));
    const gradient = gradientFor(d);
    const dotsOptions = { type: d.dotsStyle || 'rounded' };
    if (gradient) dotsOptions.gradient = gradient;
    else dotsOptions.color = d.fg || '#111111';
    const options = {
      width: size,
      height: size,
      type: 'canvas',
      data: `${DYNAMIC_BASE}/q/${link.short_code}`,
      margin: scaledMargin,
      qrOptions: { errorCorrectionLevel: d.errorCorrection || 'Q' },
      dotsOptions,
      backgroundOptions: { color: d.transparent ? 'rgba(0,0,0,0)' : (d.bg || '#ffffff') },
      cornersSquareOptions: { color: d.eye || d.fg || '#111111', type: d.cornerStyle || 'extra-rounded' },
      cornersDotOptions: { color: d.eyeDot || d.fg || '#111111', type: d.cornerDotStyle || 'dot' }
    };
    if (d.logoSrc) {
      options.image = d.logoSrc;
      options.imageOptions = {
        hideBackgroundDots: d.hideLogoDots !== false,
        imageSize: Number(d.logoSize || 0.30),
        margin: scaledLogoMargin,
        crossOrigin: 'anonymous',
        saveAsBlob: true
      };
    }
    return options;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Unable to read Dynamic QR image'));
      reader.readAsDataURL(blob);
    });
  }

  function isThisCardUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href);
      return url.pathname === location.pathname && String(url.searchParams.get('slug') || '') === slug;
    } catch (_) { return false; }
  }

  async function fetchLink() {
    const client = window.supabaseClient;
    if (!client) return null;
    const { data, error } = await client.rpc('get_public_card_dynamic_qr', { p_slug: slug });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !/^[A-Za-z0-9_-]{4,64}$/.test(String(row.short_code || ''))) return null;
    return row;
  }

  async function activate(link) {
    if (!await loadQrLibrary()) return false;
    const qr = new window.QRCodeStyling(optionsFor(link));
    const blob = await qr.getRawData('png');
    if (!blob) return false;
    const dataUrl = await blobToDataUrl(blob);
    if (!dataUrl) return false;

    let tries = 0;
    while ((!window.LIWQr || !document.getElementById('qr')) && tries < 80) {
      await new Promise(resolve => setTimeout(resolve, 100));
      tries += 1;
    }
    if (!window.LIWQr) return false;

    if (!window.LIWQr.__dynamicCardOriginalBuildImageUrl) {
      window.LIWQr.__dynamicCardOriginalBuildImageUrl = window.LIWQr.buildImageUrl.bind(window.LIWQr);
    }
    const originalBuild = window.LIWQr.__dynamicCardOriginalBuildImageUrl;
    window.LIWQr.buildImageUrl = function(data, options) {
      if (isThisCardUrl(data)) {
        return { url: dataUrl, palette: { foreground: '#111111', background: '#ffffff', ratio: 21, adjusted: false } };
      }
      return originalBuild(data, options);
    };

    window.__LIW_DYNAMIC_CARD_QR_ACTIVE__ = {
      shortCode: link.short_code,
      updatedAt: link.updated_at || null
    };

    const overlayLogo = document.getElementById('qr-logo');
    if (overlayLogo) {
      overlayLogo.hidden = true;
      overlayLogo.removeAttribute('src');
    }
    const frame = document.getElementById('qr')?.closest('.qr-frame');
    if (frame) frame.dataset.liwDynamicQr = 'true';

    // Staging has its own QR style API name. Force classic transport so the
    // exact Dynamic PNG is used instead of re-shaping it a second time.
    window.LIWQrStyleStaging?.setStyle?.('classic');
    setTimeout(() => window.LIWQrStyleStaging?.setStyle?.('classic'), 250);
    return true;
  }

  async function boot() {
    let attempts = 0;
    while (!window.supabaseClient && attempts < 80) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts += 1;
    }
    if (!window.supabaseClient) return;
    try {
      const link = await fetchLink();
      if (!link) return;
      await activate(link);
    } catch (error) {
      console.warn('[LIW Dynamic] Card QR bridge fallback to regular QR:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
