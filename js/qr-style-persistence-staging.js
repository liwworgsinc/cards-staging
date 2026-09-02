(() => {
  'use strict';

  const staging = location.hostname === 'liwworgsinc.github.io' && location.pathname.startsWith('/cards-staging/');
  if (!staging || window.__LIW_QR_STYLE_PERSISTENCE_STAGING__) return;
  window.__LIW_QR_STYLE_PERSISTENCE_STAGING__ = true;

  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  const isEditor = page === 'editor.html';
  const isPublicCard = page === 'card.html' || page === 'card-preview.html';
  if (!isEditor && !isPublicCard) return;

  // Conservative scanner tune: keep distinctive data-module shapes, but use
  // standard finder-eye geometry on the experimental presets. Dot mode uses
  // LIW's hybrid rounded/dot data pattern so narrow gaps remain detectable.
  const styleLibrary = window.LIWQrStyleStaging?.styles;
  if (styleLibrary) {
    if (styleLibrary.rounded) styleLibrary.rounded.eye = 'bold';
    if (styleLibrary.luxe) styleLibrary.luxe.eye = 'bold';
    if (styleLibrary.dots) {
      styleLibrary.dots.module = 'signature';
      styleLibrary.dots.eye = 'bold';
      styleLibrary.dots.note = 'Scan-safe dot hybrid';
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
