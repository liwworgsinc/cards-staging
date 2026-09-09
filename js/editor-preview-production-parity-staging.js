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
    const version = '20260908-desktop-phone-preview-1';

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

    // Staging-only custom QR lab. The base QR engine remains scan-safe; this
    // layer adds module/finder-eye presets, persistence, and the compact QR modal.
    loadScript('js/qr-style-staging.js', 'data-liw-qr-style-staging', () => {
      loadScript('js/qr-style-persistence-staging.js', 'data-liw-qr-style-persistence-staging');
      loadScript('js/editor-qr-open-staging.js', 'data-liw-editor-qr-open-staging');
    });

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

  const renderDesktopPhonePreview = (previewWindow, url) => {
    if (!previewWindow || previewWindow.closed) return false;

    const safeUrl = String(url || '')
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

    try {
      const doc = previewWindow.document;
      doc.open();
      doc.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LIW Cards · Phone Preview</title>
<style>
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{
    overflow:hidden;
    font-family:"DM Sans",Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    color:#0b1438;
    background:
      radial-gradient(circle at 18% 12%,rgba(212,168,79,.16),transparent 30%),
      radial-gradient(circle at 82% 88%,rgba(28,72,154,.12),transparent 34%),
      linear-gradient(180deg,#f8f9fc 0%,#eef1f6 100%);
  }
  .preview-shell{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr)}
  .preview-bar{
    min-height:64px;
    padding:10px 18px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:18px;
    background:rgba(255,255,255,.92);
    border-bottom:1px solid rgba(11,20,56,.08);
    box-shadow:0 8px 28px rgba(11,20,56,.06);
    backdrop-filter:blur(14px);
    position:relative;
    z-index:4;
  }
  .preview-brand{min-width:0;display:flex;align-items:center;gap:11px}
  .preview-mark{
    width:36px;height:36px;border-radius:12px;display:grid;place-items:center;
    background:#0b1438;color:#d4a84f;font-size:.72rem;font-weight:950;letter-spacing:.05em;
    box-shadow:0 8px 18px rgba(11,20,56,.18);
  }
  .preview-copy{min-width:0;display:grid;gap:2px}
  .preview-copy strong{font-size:.92rem;line-height:1.15;letter-spacing:-.02em}
  .preview-copy span{font-size:.67rem;line-height:1.2;color:#70798e;font-weight:700}
  .preview-link{
    flex:0 0 auto;min-height:38px;padding:9px 13px;border:1px solid #dce1ea;border-radius:12px;
    display:inline-flex;align-items:center;justify-content:center;text-decoration:none;background:#fff;
    color:#0b1438;font-size:.72rem;font-weight:850;box-shadow:0 4px 12px rgba(11,20,56,.05);
  }
  .preview-stage{
    min-height:0;
    padding:22px 18px 26px;
    display:grid;
    place-items:center;
    position:relative;
  }
  .device{
    position:relative;
    width:min(372px,43vh,calc(100vw - 36px));
    aspect-ratio:9/19.5;
    padding:10px;
    border-radius:42px;
    background:linear-gradient(145deg,#111827 0%,#020617 56%,#182033 100%);
    border:1px solid rgba(255,255,255,.1);
    box-shadow:
      0 32px 70px rgba(11,20,56,.28),
      0 10px 26px rgba(11,20,56,.18),
      inset 0 0 0 1px rgba(255,255,255,.07);
  }
  .device:before{
    content:"";
    position:absolute;
    top:17px;
    left:50%;
    width:30%;
    height:25px;
    transform:translateX(-50%);
    border-radius:999px;
    background:#020617;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.035);
    z-index:3;
    pointer-events:none;
  }
  .screen{
    width:100%;height:100%;display:block;border:0;border-radius:33px;background:#fff;
    overflow:hidden;
  }
  .device:after{
    content:"";
    position:absolute;
    left:50%;bottom:5px;
    width:31%;height:4px;
    transform:translateX(-50%);
    border-radius:999px;
    background:rgba(255,255,255,.5);
    pointer-events:none;
  }
  .phone-note{
    position:absolute;
    left:50%;
    bottom:7px;
    transform:translateX(-50%);
    color:#7d8799;
    font-size:.64rem;
    font-weight:700;
    white-space:nowrap;
    pointer-events:none;
  }
  @media(max-width:700px){
    .preview-bar{padding-inline:12px;min-height:58px}
    .preview-copy span{display:none}
    .preview-link{padding:8px 10px;font-size:.66rem}
    .preview-stage{padding:14px 10px 20px}
    .device{width:min(360px,45vh,calc(100vw - 22px));border-radius:36px;padding:8px}
    .screen{border-radius:29px}
    .device:before{top:14px;height:22px}
    .phone-note{display:none}
  }
</style>
</head>
<body>
  <div class="preview-shell">
    <header class="preview-bar">
      <div class="preview-brand">
        <span class="preview-mark">LIW</span>
        <span class="preview-copy">
          <strong>Phone preview</strong>
          <span>Desktop preview at a real phone-sized viewport</span>
        </span>
      </div>
      <a class="preview-link" href="${safeUrl}" target="_blank" rel="noopener">Open actual card</a>
    </header>
    <main class="preview-stage">
      <div class="device" aria-label="Phone preview frame">
        <iframe class="screen" src="${safeUrl}" title="LIW card phone preview" allow="web-share; clipboard-write"></iframe>
      </div>
      <div class="phone-note">Preview frame only · your published card is unchanged</div>
    </main>
  </div>
</body>
</html>`);
      doc.close();
      return true;
    } catch (error) {
      console.warn('[LIW Preview] Phone preview shell failed:', error);
      return false;
    }
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

    // Mobile browsers (especially Samsung Internet) may block window.open even
    // from a visible button. Use same-tab navigation on compact screens; browser
    // Back returns to the editor. Desktop uses a dedicated phone-sized preview shell.
    const compactScreen = window.matchMedia?.('(max-width: 900px)')?.matches === true;
    const useSameTab = button.id === 'mobile-preview-button' || compactScreen;
    let previewWindow = null;

    if (!useSameTab) {
      previewWindow = window.open('about:blank', '_blank');
      if (!previewWindow) {
        showToast('Preview will open in this tab. Use Back to return to the editor.');
      }
    }

    if (previewWindow) {
      try {
        previewWindow.document.title = 'Preparing LIW card preview…';
        previewWindow.document.body.innerHTML = '<p style="font:600 16px system-ui;padding:28px">Preparing your LIW card preview…</p>';
      } catch (_) {}
    }

    const navigateToPreview = url => {
      if (previewWindow && !previewWindow.closed) {
        if (!renderDesktopPhonePreview(previewWindow, url)) previewWindow.location.replace(url);
      } else {
        window.location.assign(url);
      }
    };

    try {
      const slugField = document.querySelector('[name="slug"]');
      const existingId = new URLSearchParams(location.search).get('id');

      // Existing cards can open immediately in a desktop preview tab. Same-tab
      // mobile previews save first so navigation cannot interrupt the latest edit.
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
      navigateToPreview(url);
    } catch (error) {
      try { if (previewWindow && !previewWindow.closed) previewWindow.close(); } catch (_) {}
      console.error('[LIW Preview] Unable to open preview:', error);
      showToast(error?.message || 'Unable to open Preview.');
    } finally {
      window.__LIW_PREVIEW_PARITY_OPENING__ = false;
    }
  };

  // Capture phase makes Preview independent from the rest of editor wiring.
  document.addEventListener('click', openPreview, true);
})();
