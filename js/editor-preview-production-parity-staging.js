(() => {
  'use strict';

  if (!/\/editor(?:\.html)?$/.test(location.pathname)) return;
  if (window.__LIW_PREVIEW_PARITY_BOUND__) return;
  window.__LIW_PREVIEW_PARITY_BOUND__ = true;

  const isPreviewButton = target => target?.closest?.('#preview-link, #mobile-preview-button');

  const showToast = message => {
    try {
      if (typeof toast === 'function') {
        toast(message);
        return;
      }
    } catch (_) {}
    console.error('[LIW Preview]', message);
  };

  const openPreview = async event => {
    const button = isPreviewButton(event.target);
    if (!button) return;

    // Staging parity guard: own the Preview action completely so an unrelated
    // editor listener cannot cancel or break it after this point.
    event.preventDefault();
    event.stopImmediatePropagation();

    if (window.__LIW_PREVIEW_PARITY_OPENING__) return;
    window.__LIW_PREVIEW_PARITY_OPENING__ = true;

    // Match production behavior: create the tab synchronously from the click so
    // popup blockers do not mistake the navigation for an async popup.
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) {
      window.__LIW_PREVIEW_PARITY_OPENING__ = false;
      showToast('Your browser blocked the Preview tab. Allow pop-ups for LIW Cards and try again.');
      return;
    }

    try {
      previewWindow.document.title = 'Preparing LIW card preview…';
      previewWindow.document.body.innerHTML = '<p style="font:600 16px system-ui;padding:28px">Preparing your LIW card preview…</p>';
    } catch (_) {}

    try {
      const slugField = document.querySelector('[name="slug"]');
      const existingId = new URLSearchParams(location.search).get('id');

      // Existing cards: this is intentionally the production behavior. Open the
      // current card immediately; let autosave continue without blocking Preview.
      if (existingId) {
        const slug = String(slugField?.value || '').trim();
        if (!slug) throw new Error('This card does not have a preview link yet. Save the card once and try Preview again.');
        const url = typeof cardUrl === 'function'
          ? cardUrl()
          : new URL(`card.html?slug=${encodeURIComponent(slug)}`, location.href).href;
        previewWindow.location.replace(url);
        if (typeof flushSave === 'function') {
          Promise.resolve(flushSave({ silent: true })).catch(error => {
            console.warn('[LIW Preview] Background save failed:', error);
          });
        }
        return;
      }

      // New cards need a server id/slug before the normal public card route can
      // render them. Save once, then use the same cardUrl() production uses.
      if (typeof flushSave === 'function') {
        await flushSave({ force: true, silent: true });
      } else if (typeof save === 'function') {
        await save({ silent: true });
      } else {
        throw new Error('The editor save service is not ready yet. Reload the editor and try Preview again.');
      }

      const slug = String(slugField?.value || '').trim();
      if (!slug) throw new Error('The draft could not create its preview link yet. Add your name, save, and try again.');
      const url = typeof cardUrl === 'function'
        ? cardUrl()
        : new URL(`card.html?slug=${encodeURIComponent(slug)}`, location.href).href;
      previewWindow.location.replace(url);
    } catch (error) {
      try { if (!previewWindow.closed) previewWindow.close(); } catch (_) {}
      console.error('[LIW Preview] Unable to open preview:', error);
      showToast(error?.message || 'Unable to open Preview.');
    } finally {
      window.__LIW_PREVIEW_PARITY_OPENING__ = false;
    }
  };

  // Capture phase makes Preview independent from the rest of editor wiring.
  document.addEventListener('click', openPreview, true);
})();
