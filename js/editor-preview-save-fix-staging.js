/* LIW Cards staging: make editor save + preview deterministic.
   - Preview waits for the latest confirmed save and opens a private authenticated route.
   - Save now coalesces with any active autosave instead of forcing a duplicate write.
   - Text/range/color controls save from their input event only; their later change event
     is suppressed so one customer edit cannot increment the save revision twice. */
(function () {
  'use strict';
  if (window.__LIW_EDITOR_PREVIEW_SAVE_FIX_STAGING__) return;
  window.__LIW_EDITOR_PREVIEW_SAVE_FIX_STAGING__ = true;

  const PREVIEW_BUTTONS = '#preview-link,#mobile-preview-button';
  const SAVE_BUTTON = '#save-now-button';
  const FILE_IDS = new Set(['profile-file', 'cover-file', 'payment-qr-file', 'qr-logo-file']);
  let previewOpening = false;

  function toastSafe(message) {
    try {
      if (typeof window.toast === 'function') window.toast(message);
      else if (typeof toast === 'function') toast(message);
    } catch (_) {}
  }

  function setSaveStateSafe(state, message) {
    try {
      if (typeof window.setSaveState === 'function') window.setSaveState(state, message);
      else if (typeof setSaveState === 'function') setSaveState(state, message);
    } catch (_) {}
  }

  function editorSlug() {
    return String(document.querySelector('[name="slug"]')?.value || '').trim();
  }

  function privatePreviewUrl() {
    const slug = editorSlug();
    if (!slug) return '';
    // Draft preview must stay on the exact same origin/path as the authenticated editor.
    // Do not use the public canonical URL helper here: a production-domain session can be
    // different or stale, which makes a legitimate draft look unavailable.
    const url = new URL('./card-preview.html', location.href);
    url.searchParams.set('slug', slug);
    url.searchParams.set('preview', '1');
    url.searchParams.set('from', 'editor');
    return url.href;
  }

  async function flushLatestSave({ silent = true } = {}) {
    if (typeof flushSave !== 'function') throw new Error('The editor save service is still loading. Try again.');
    // force:false is deliberate. flushSave already waits for an active save and writes
    // again only when a newer revision still needs saving or the card has no ID yet.
    await flushSave({ force: false, silent });
  }

  async function openPrivatePreview() {
    if (previewOpening) {
      toastSafe('Your preview is already opening.');
      return;
    }
    previewOpening = true;

    const previewWindow = window.open('about:blank', '_blank');
    if (previewWindow) {
      try {
        previewWindow.document.title = 'Preparing LIW private preview…';
        previewWindow.document.body.innerHTML = '<p style="font:600 16px system-ui;padding:28px">Saving your latest changes and opening your private preview…</p>';
      } catch (_) {}
    }

    try {
      if (!previewWindow || previewWindow.closed) throw new Error('Your browser blocked the preview tab. Allow pop-ups for LIW Cards and try Preview again.');
      setSaveStateSafe('saving', 'Saving before preview…');
      await flushLatestSave({ silent: true });
      const url = privatePreviewUrl();
      if (!url) throw new Error('Your card does not have a confirmed address yet. Add your name and save once, then preview again.');
      previewWindow.location.replace(url);
    } catch (error) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      toastSafe(error?.message || 'Unable to open the preview. Your editor changes are still here.');
    } finally {
      previewOpening = false;
    }
  }

  async function saveNow(button) {
    button.disabled = true;
    try {
      setSaveStateSafe('saving', 'Saving latest changes…');
      await flushLatestSave({ silent: false });
      // If there was nothing new to write, give the customer a stable confirmation
      // instead of starting a second server request just to make the button feel active.
      const state = document.getElementById('save-state');
      if (state && !state.classList.contains('error') && !state.classList.contains('saving')) return;
      if (state && !state.classList.contains('error')) setSaveStateSafe('saved', 'Saved');
    } catch (_) {
      // The core editor already stores the recovery copy and surfaces the useful error.
    } finally {
      button.disabled = false;
    }
  }

  // A text/range/color edit already fires input. Let change remain meaningful for
  // selects, radios and checkboxes only. This removes the common input -> change ->
  // focusout save storm without changing the editor's live-render behavior.
  document.addEventListener('change', event => {
    const element = event.target;
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) return;
    if (!element.closest('.editor-workspace')) return;
    if (FILE_IDS.has(element.id)) return;
    const keepChange = element instanceof HTMLSelectElement || ['checkbox', 'radio'].includes(String(element.type || '').toLowerCase());
    if (!keepChange) event.stopImmediatePropagation();
  }, true);

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const previewButton = target.closest(PREVIEW_BUTTONS);
    if (previewButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPrivatePreview();
      return;
    }

    const saveButton = target.closest(SAVE_BUTTON);
    if (saveButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveNow(saveButton);
    }
  }, true);
})();