(() => {
  'use strict';

  if (!/\/editor(?:\.html)?$/.test(location.pathname)) return;
  if (window.__LIW_PREVIEW_PARITY_BOUND__) return;
  window.__LIW_PREVIEW_PARITY_BOUND__ = true;

  /* Staging WYSIWYG live-card mirror.
     Keep this loader here because editor.html already loads this parity file on
     every editor visit. That prevents the live phone preview from silently
     falling back to the older simplified preview when editor.html is refreshed. */
  function ensureLiveMirror() {
    const version = '20260830-preview-parity-2';

    if (!document.querySelector('link[data-liw-editor-full-mirror]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = `css/editor-preview-full-mirror-staging.css?v=${version}`;
      style.dataset.liwEditorFullMirror = 'true';
      document.head.appendChild(style);
    }

    const loadScript = (src, marker, onload = null) => {
      const existing = document.querySelector(`script[${marker}]`);
      if (existing) {
        if (onload) onload();
        return existing;
      }
      const script = document.createElement('script');
      script.src = `${src}?v=${version}`;
      script.async = false;
      script.setAttribute(marker, 'true');
      if (onload) script.addEventListener('load', onload, { once: true });
      document.head.appendChild(script);
      return script;
    };

    loadScript('js/editor-preview-full-mirror-staging.js', 'data-liw-editor-full-mirror-script', () => {
      try { window.LIWStagingPreviewMirror?.refresh?.(); } catch (_) {}
      loadScript('js/editor-live-preview-sync-staging.js', 'data-liw-editor-live-preview-sync');
    });
  }

  ensureLiveMirror();

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
      if (!slug) throw new Error('The draft could not create its preview link yet. Add your name, save, and try Preview again.');
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
