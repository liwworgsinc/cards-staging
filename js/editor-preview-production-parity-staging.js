(() => {
  'use strict';

  if (!/\/editor(?:\.html)?$/.test(location.pathname)) return;
  if (window.__LIW_PREVIEW_PARITY_BOUND__) return;
  window.__LIW_PREVIEW_PARITY_BOUND__ = true;

  const PREVIEW_PREP_TIMEOUT_MS = 35000;

  const previewContext = () => ({
    themeId: String(document.querySelector('[name="template_id"]')?.value || '').trim() || 'custom',
    experience: String(document.querySelector('[name="card_experience"]')?.value || 'classic').trim().toLowerCase(),
    colorMode: String(document.querySelector('[name="color_mode"]')?.value || 'light').trim().toLowerCase(),
    slug: String(document.querySelector('[name="slug"]')?.value || '').trim()
  });

  const studioExperienceActive = () => {
    const context = previewContext();
    return context.colorMode === 'barbershop' && (context.experience === 'classic' || context.experience === 'barbershop');
  };

  const logPreview = (stage, details = {}) => {
    console.info(`[LIW Preview] ${stage}`, { ...previewContext(), ...details });
  };

  const withTimeout = (promise, timeoutMs, message) => {
    let timer = 0;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]).finally(() => clearTimeout(timer));
  };

  /* Staging WYSIWYG live-card mirror. */
  function ensureLiveMirror() {
    const version = '20260913-global-preview-2';

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

    /* Studio persistence is isolated from every non-Studio experience. The preview
       gate below also checks Studio state before it can await this module. */
    loadScript('js/editor-studio-type-persistence-staging.js', 'data-liw-studio-type-persistence');

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

  const saveLatest = async ({ force = false } = {}) => {
    /* Normalize the user's explicit Standard/Flow/Showtime choice before the save.
       This repairs stale Studio markers left by older staging builds and prevents
       theme-specific listeners from changing which experience Preview receives. */
    const before = previewContext();
    let stateReconciled = false;
    try {
      const reconciled = window.LIWExperienceStateGuard?.reconcile?.();
      if (reconciled) {
        stateReconciled = reconciled.experience !== before.experience || reconciled.colorMode !== before.colorMode;
        logPreview('experience state reconciled', reconciled);
      }
    } catch (error) {
      console.warn('[LIW Preview] experience reconciliation failed:', error);
    }

    logPreview('save started', { force: force || stateReconciled });
    if (typeof flushSave === 'function') {
      await flushSave({ force: force || stateReconciled, silent: true });
    } else if (typeof save === 'function') {
      await save({ silent: true });
    } else {
      throw new Error('The editor save service is not ready yet. Reload the editor and try Preview again.');
    }
    logPreview('preview data saved');

    /* Studio-only data is allowed to block Preview only when the authoritative
       editor state is explicitly Studio. Flow and Showtime can never enter here. */
    if (studioExperienceActive() && window.LIWStudioTypePersistence?.flush) {
      logPreview('Studio persistence started');
      await window.LIWStudioTypePersistence.flush();
      logPreview('Studio persistence completed');
    } else {
      logPreview('Studio persistence skipped', { reason: 'current experience is not Studio' });
    }
  };

  const setPopupStatus = (previewWindow, title, message) => {
    if (!previewWindow || previewWindow.closed) return;
    try {
      previewWindow.document.title = title;
      previewWindow.document.body.innerHTML = `<p style="font:600 16px system-ui;padding:28px">${message}</p>`;
    } catch (_) {}
  };

  const setPopupFailure = (previewWindow, message) => {
    if (!previewWindow || previewWindow.closed) return false;
    try {
      const doc = previewWindow.document;
      doc.title = 'Preview failed to connect';
      doc.body.innerHTML = '';
      const panel = doc.createElement('div');
      panel.style.cssText = 'max-width:520px;margin:64px auto;padding:28px;font:500 16px/1.55 system-ui;color:#111827';
      const heading = doc.createElement('h1');
      heading.textContent = 'Preview failed to connect';
      heading.style.cssText = 'font-size:24px;margin:0 0 10px';
      const copy = doc.createElement('p');
      copy.textContent = message || 'The preview did not become ready. Your editor changes are still safe.';
      const retry = doc.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Retry';
      retry.style.cssText = 'margin-top:10px;padding:11px 18px;border:0;border-radius:10px;background:#0b1438;color:white;font:700 15px system-ui;cursor:pointer';
      retry.addEventListener('click', () => {
        try { previewWindow.close(); } catch (_) {}
        setTimeout(() => document.getElementById('preview-link')?.click(), 0);
      });
      panel.append(heading, copy, retry);
      doc.body.appendChild(panel);
      return true;
    } catch (_) {
      return false;
    }
  };

  const buildPreviewUrl = slug => {
    const baseUrl = typeof cardUrl === 'function'
      ? cardUrl()
      : new URL(`card.html?slug=${encodeURIComponent(slug)}`, location.href).href;
    return window.LIWAdminLab?.decoratePreviewUrl
      ? window.LIWAdminLab.decoratePreviewUrl(baseUrl)
      : baseUrl;
  };

  const hasExistingCard = () => {
    try { return typeof currentId !== 'undefined' && Boolean(currentId); }
    catch (_) { return false; }
  };

  const refreshOpenedPreview = (previewWindow, url) => {
    if (!previewWindow || previewWindow.closed) return;
    try {
      const refreshed = new URL(url, location.href);
      refreshed.searchParams.set('liw_preview_refresh', String(Date.now()));
      previewWindow.location.replace(refreshed.href);
    } catch (_) {}
  };

  const openPreview = async event => {
    const button = isPreviewButton(event.target);
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (window.__LIW_PREVIEW_PARITY_OPENING__) return;
    window.__LIW_PREVIEW_PARITY_OPENING__ = true;

    const context = previewContext();
    logPreview('preview requested', { selectedThemeId: context.themeId, transport: 'direct-navigation' });

    const compactScreen = window.matchMedia?.('(max-width: 900px)')?.matches === true;
    const useSameTab = button.id === 'mobile-preview-button' || button.id === 'liw-mobile-public-preview-launcher' || compactScreen;
    let previewWindow = null;

    if (!useSameTab) {
      previewWindow = window.open('about:blank', '_blank', desktopPopupFeatures());
      if (!previewWindow) showToast('Preview will open in this tab. Use Back to return to the editor.');
    }

    setPopupStatus(previewWindow, 'Connecting LIW card preview…', 'Connecting your LIW card preview…');

    const navigateToPreview = url => {
      logPreview('preview URL ready', { previewUrl: url, iframe: false });
      if (previewWindow && !previewWindow.closed) previewWindow.location.replace(url);
      else window.location.assign(url);
    };

    try {
      const slugField = document.querySelector('[name="slug"]');
      const existingSlug = String(slugField?.value || '').trim();

      /* Existing desktop cards already have a safe persisted URL. Open that immediately
         instead of leaving the customer staring at about:blank while a save request is
         warming up. Any pending edits save in the background, then the opened preview
         refreshes once so it picks up the newest successful server version. */
      if (!useSameTab && hasExistingCard() && existingSlug) {
        const url = buildPreviewUrl(existingSlug);
        logPreview('existing-card direct preview', { previewUrl: url });
        setPopupStatus(previewWindow, 'Opening LIW card preview…', 'Opening your LIW card…');
        navigateToPreview(url);

        withTimeout(
          saveLatest({ force: false }),
          PREVIEW_PREP_TIMEOUT_MS,
          'The preview save timed out. The last saved card version is still open.'
        ).then(() => {
          logPreview('existing-card background save completed');
          refreshOpenedPreview(previewWindow, buildPreviewUrl(String(slugField?.value || existingSlug).trim() || existingSlug));
        }).catch(error => {
          console.error('[LIW Preview] Background save did not complete:', error, previewContext());
          logPreview('background save error', { error: error?.message || String(error) });
          showToast('Preview opened the last saved version. Your latest edits are still protected — tap Retry save.');
        });
        return;
      }

      /* Brand-new cards need a server ID/slug before a public-card route can exist.
         Same-tab/mobile preview also waits so navigation cannot cancel an in-flight save. */
      await withTimeout(
        saveLatest({ force: !hasExistingCard() }),
        PREVIEW_PREP_TIMEOUT_MS,
        'The preview connection timed out while saving the latest card data.'
      );
      const slug = String(slugField?.value || '').trim();
      if (!slug) throw new Error('This card does not have a preview link yet. Add your name, save once, and try Preview again.');

      const url = buildPreviewUrl(slug);
      setPopupStatus(previewWindow, 'Opening LIW card preview…', 'Opening your LIW card…');
      navigateToPreview(url);
    } catch (error) {
      console.error('[LIW Preview] Unable to open preview:', error, previewContext());
      logPreview('connection error', { error: error?.message || String(error) });
      const message = error?.message || 'The preview did not become ready. Your editor changes are still safe.';
      const failureShown = setPopupFailure(previewWindow, message);
      if (!failureShown) showToast(`Preview failed to connect: ${message}`);
    } finally {
      window.__LIW_PREVIEW_PARITY_OPENING__ = false;
    }
  };

  document.addEventListener('click', openPreview, true);
})();
