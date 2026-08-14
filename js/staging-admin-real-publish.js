(function () {
  'use strict';

  async function handleAdminPlanPreviewPublish(event) {
    if (!(typeof isPlanPreview !== 'undefined' && isPlanPreview && typeof isAdmin !== 'undefined' && isAdmin)) return;

    const button = event.target.closest('#publish-button,#panel-publish-button');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!canEditCurrentCard) {
      toast('This shared card is view-only. Ask the owner to grant Editor access.');
      return;
    }

    const previousStatus = value('status') || 'draft';
    const buttons = [document.getElementById('publish-button'), document.getElementById('panel-publish-button')].filter(Boolean);
    buttons.forEach(item => { item.disabled = true; });

    try {
      const isPublishing = previousStatus !== 'published';
      if (isPublishing && !value('full_name').trim()) {
        openTab('content');
        field('full_name')?.focus();
        throw new Error('Enter the name that should appear on this card before publishing.');
      }

      if (isPublishing && value('branding_mode') === 'custom' && (!value('custom_branding_text').trim() || !value('custom_branding_url').trim())) {
        openTab('design');
        field('custom_branding_text')?.focus();
        throw new Error('Enter both custom footer text and a custom footer link before publishing.');
      }

      if (isPublishing && hasEntitlement('custom_qr')) {
        const qrSafe = await runQrSafetyCheck({ manual: false });
        if (!qrSafe) {
          openTab('share');
          const qrDetails = document.getElementById('share-qr-settings');
          if (qrDetails) qrDetails.open = true;
          throw new Error('The QR scan test failed. Remove the center logo or choose darker QR colors before publishing.');
        }
      }

      await flushSave();
      if (!currentId) await save({ silent: true });
      if (!currentId) throw new Error('Your card could not be created. Add your name and try again.');

      const next = previousStatus === 'published' ? 'draft' : 'published';
      field('status').value = next;
      await save({ silent: true });
      render();

      if (next === 'published') {
        openTab('share', { scroll: false });
        window.LIWPostPublishShare?.celebrate?.();
      }

      toast(next === 'published' ? 'Your staging test card is live' : 'Card returned to draft');
    } catch (error) {
      field('status').value = previousStatus;
      render();
      toast(error?.message || 'Unable to publish. Your changes are still in the editor.');
    } finally {
      buttons.forEach(item => { item.disabled = false; });
    }
  }

  document.addEventListener('click', handleAdminPlanPreviewPublish, true);
})();
