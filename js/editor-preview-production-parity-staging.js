(() => {
  'use strict';

  if (!/\/editor(?:\.html)?$/.test(location.pathname)) return;
  if (window.__LIW_PREVIEW_PARITY_BOUND__) return;
  window.__LIW_PREVIEW_PARITY_BOUND__ = true;

  /* Staging WYSIWYG live-card mirror. */
  function ensureLiveMirror() {
    const version = '20260912-admin-lab-1';

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

    /* Studio's legacy Barber engine and the normal LIW template library both listen
       to Design clicks. Load this guard before the Barber V5 bridge so the selected
       template remains authoritative and Studio only owns the experience shell. */
    loadScript('js/studio-runtime-stabilizer-staging.js', 'data-liw-studio-runtime');

    /* LIW Lab is an admin-only experimental layer. It never writes a synthetic
       template id or experience value into customer card data. */
    loadScript('js/editor-admin-lab-staging.js', 'data-liw-admin-lab-editor');

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

  const isPreviewButton = target => target?.closest?.('#preview-link, #mobile-preview-button, #liw-mobile-public-preview-launcher');

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

  const saveLatest = async () => {
    if (typeof flushSave === 'function') {
      await flushSave({ force: true, silent: true });
      return;
    }
    if (typeof save === 'function') {
      await save({ silent: true });
      return;
    }
    throw new Error('The editor save service is not ready yet. Reload the editor and try Preview again.');
  };

  const setPopupStatus = (previewWindow, title, message) => {
    if (!previewWindow || previewWindow.closed) return;
    try {
      previewWindow.document.title = title;
      previewWindow.document.body.innerHTML = `<p style="font:600 16px system-ui;padding:28px">${message}</p>`;
    } catch (_) {}
  };

  const openPreview = async event => {
    const button = isPreviewButton(event.target);
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (window.__LIW_PREVIEW_PARITY_OPENING__) return;
    window.__LIW_PREVIEW_PARITY_OPENING__ = true;

    const compactScreen = window.matchMedia?.('(max-width: 900px)')?.matches === true;
    const useSameTab = button.id === 'mobile-preview-button' || button.id === 'liw-mobile-public-preview-launcher' || compactScreen;
    let previewWindow = null;

    if (!useSameTab) {
      previewWindow = window.open('about:blank', '_blank', desktopPopupFeatures());
      if (!previewWindow) showToast('Preview will open in this tab. Use Back to return to the editor.');
    }

    setPopupStatus(previewWindow, 'Saving LIW card preview…', 'Saving your latest changes…');

    const navigateToPreview = url => {
      if (previewWindow && !previewWindow.closed) previewWindow.location.replace(url);
      else window.location.assign(url);
    };

    try {
      const slugField = document.querySelector('[name="slug"]');
      await saveLatest();
      const slug = String(slugField?.value || '').trim();
      if (!slug) throw new Error('This card does not have a preview link yet. Add your name, save once, and try Preview again.');

      const baseUrl = typeof cardUrl === 'function'
        ? cardUrl()
        : new URL(`card.html?slug=${encodeURIComponent(slug)}`, location.href).href;
      const url = window.LIWAdminLab?.decoratePreviewUrl
        ? window.LIWAdminLab.decoratePreviewUrl(baseUrl)
        : baseUrl;

      setPopupStatus(previewWindow, 'Opening LIW card preview…', 'Opening your LIW card…');
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