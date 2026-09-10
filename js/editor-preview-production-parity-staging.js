(() => {
  'use strict';

  if (!/\/editor(?:\.html)?$/.test(location.pathname)) return;
  if (window.__LIW_PREVIEW_PARITY_BOUND__) return;
  window.__LIW_PREVIEW_PARITY_BOUND__ = true;

  /* Staging WYSIWYG live-card mirror. */
  function ensureLiveMirror() {
    const version = '20260908-direct-preview-1';

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

    loadScript('js/qr-style-staging.js', 'data-liw-qr-style-staging', () => {
      loadScript('js/qr-style-persistence-staging.js', 'data-liw-qr-style-persistence-staging');
      loadScript('js/editor-qr-open-staging.js', 'data-liw-editor-qr-open-staging');
    });

    loadScript('js/editor-native-booking-preview-staging.js', 'data-liw-editor-native-booking-preview');

    loadScript('js/editor-preview-full-mirror-staging.js', 'data-liw-editor-full-mirror-script', () => {
      loadScript('js/editor-preview-rich-parity-staging.js', 'data-liw-editor-rich-preview-parity', () => {
        try { window.LIWStagingPreviewMirror?.refresh?.(); } catch (_) {}
        try { window.LIWEditorRichPreviewParity?.apply?.(); } catch (_) {}
        loadScript('js/editor-live-preview-sync-staging.js', 'data-liw-editor-live-preview-sync');
      });
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

  const desktopPopupFeatures = () => {
    const availableWidth = Math.max(560, window.outerWidth || window.screen?.availWidth || 1200);
    const availableHeight = Math.max(720, window.outerHeight || window.screen?.availHeight || 900);
    const width = Math.max(420, Math.round(availableWidth * 0.75));
    const height = Math.max(680, Math.round(availableHeight * 0.94));
    const left = Math.max(0, Math.round((window.screenX || 0) + ((availableWidth - width) / 2)));
    const top = Math.max(0, Math.round((window.screenY || 0) + ((availableHeight - height) / 2)));
    return `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
  };

  const openPreview = async event => {
    const button = isPreviewButton(event.target);
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (window.__LIW_PREVIEW_PARITY_OPENING__) return;
    window.__LIW_PREVIEW_PARITY_OPENING__ = true;

    const compactScreen = window.matchMedia?.('(max-width: 900px)')?.matches === true;
    const useSameTab = button.id === 'mobile-preview-button' || compactScreen;
    let previewWindow = null;

    // One preview only: desktop opens the actual public card directly in a
    // popup that is 25% narrower than the editor window. Mobile stays same-tab.
    if (!useSameTab) {
      previewWindow = window.open('about:blank', '_blank', desktopPopupFeatures());
      if (!previewWindow) {
        showToast('Preview will open in this tab. Use Back to return to the editor.');
      }
    }

    if (previewWindow) {
      try {
        previewWindow.document.title = 'Preparing LIW card preview…';
        previewWindow.document.body.innerHTML = '<p style="font:600 16px system-ui;padding:28px">Opening your LIW card…</p>';
      } catch (_) {}
    }

    const navigateToPreview = url => {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.location.replace(url);
      } else {
        window.location.assign(url);
      }
    };

    try {
      const slugField = document.querySelector('[name="slug"]');
      const existingId = new URLSearchParams(location.search).get('id');

      if (existingId) {
        if (!previewWindow && typeof flushSave === 'function') {
          await flushSave({ force: true, silent: true });
        }

        const slug = String(slugField?.value || '').trim();
        if (!slug) throw new Error('This card does not have a preview link yet. Save the card once and try Preview again.');
        const url = typeof cardUrl === 'function'
          ? cardUrl()
          : new URL(`card.html?slug=${encodeURIComponent(slug)}`, location.href).href;
        navigateToPreview(url);

        if (previewWindow && typeof flushSave === 'function') {
          Promise.resolve(flushSave({ silent: true })).catch(error => {
            console.warn('[LIW Preview] Background save failed:', error);
          });
        }
        return;
      }

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
      navigateToPreview(url);
    } catch (error) {
      try { if (previewWindow && !previewWindow.closed) previewWindow.close(); } catch (_) {}
      console.error('[LIW Preview] Unable to open preview:', error);
      showToast(error?.message || 'Unable to open Preview.');
    } finally {
      window.__LIW_PREVIEW_PARITY_OPENING__ = false;
    }
  };

  document.addEventListener('click', openPreview, true);
})();
