/* LIW Cards — STAGING ONLY — embed the card profile photo in downloaded vCards. */
(() => {
  'use strict';

  if (!/\/card(?:\.html)?$/i.test(location.pathname)) return;
  if (window.__LIW_VCARD_PHOTO_STAGING__) return;
  window.__LIW_VCARD_PHOTO_STAGING__ = true;

  const escapeVcard = value => String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

  function foldVcardLine(line, firstLimit = 72, continuationLimit = 71) {
    const text = String(line || '');
    if (text.length <= firstLimit) return text;
    const parts = [text.slice(0, firstLimit)];
    let offset = firstLimit;
    while (offset < text.length) {
      parts.push(` ${text.slice(offset, offset + continuationLimit)}`);
      offset += continuationLimit;
    }
    return parts.join('\r\n');
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to decode profile photo'));
      image.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, type, quality));
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Unable to read profile photo'));
      reader.readAsDataURL(blob);
    });
  }

  async function embeddedProfilePhoto(cardData) {
    const source = String(cardData?.profile_image_url || '').trim();
    if (!source) return '';

    const response = await fetch(source, { mode: 'cors', credentials: 'omit', cache: 'force-cache' });
    if (!response.ok) throw new Error(`Profile photo request failed (${response.status})`);

    const sourceBlob = await response.blob();
    const objectUrl = URL.createObjectURL(sourceBlob);
    try {
      const image = await loadImage(objectUrl);
      const sourceWidth = Number(image.naturalWidth || image.width || 0);
      const sourceHeight = Number(image.naturalHeight || image.height || 0);
      if (!sourceWidth || !sourceHeight) throw new Error('Profile photo has no dimensions');

      // Keep the vCard lightweight and broadly compatible with Apple/Google contacts.
      // Draw the same square avatar crop, including the editor's zoom/position settings,
      // then convert WebP/PNG/etc. to a standard JPEG before embedding it.
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Unable to prepare profile photo');

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);

      const zoom = Math.max(1.1, Math.min(2, Number(cardData?.profile_zoom ?? 125) / 100));
      const positionX = Math.max(0, Math.min(100, Number(cardData?.profile_position_x ?? 50)));
      const positionY = Math.max(0, Math.min(100, Number(cardData?.profile_position_y ?? 22)));
      const coverScale = Math.max(size / sourceWidth, size / sourceHeight) * zoom;
      const drawWidth = sourceWidth * coverScale;
      const drawHeight = sourceHeight * coverScale;
      const travelX = Math.max(0, (drawWidth - size) / 2);
      const travelY = Math.max(0, (drawHeight - size) / 2);
      const dx = (size - drawWidth) / 2 + ((positionX - 50) / 50) * travelX;
      const dy = (size - drawHeight) / 2 + ((positionY - 50) / 50) * travelY;

      context.drawImage(image, dx, dy, drawWidth, drawHeight);
      const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.84);
      if (!jpegBlob) throw new Error('Unable to encode profile photo');
      const dataUrl = await blobToDataUrl(jpegBlob);
      return dataUrl.split(',')[1] || '';
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function downloadVcardWithPhoto(cardData) {
    const button = document.getElementById('save');
    const originalHtml = button?.innerHTML || '';
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="button-spinner"></span> Preparing contact…';
    }

    let photoBase64 = '';
    try {
      photoBase64 = await embeddedProfilePhoto(cardData);
    } catch (error) {
      // A remote-image/CORS problem should never prevent saving the contact itself.
      console.warn('LIW vCard profile photo could not be embedded:', error);
    }

    try {
      const names = String(cardData?.full_name || '').trim().split(/\s+/).filter(Boolean);
      const last = names.length > 1 ? names.pop() : '';
      const first = names.join(' ');
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${escapeVcard(last)};${escapeVcard(first)};;;`,
        `FN:${escapeVcard(cardData?.full_name || '')}`,
        `ORG:${escapeVcard(cardData?.company_name || '')}`,
        `TITLE:${escapeVcard(cardData?.job_title || '')}`,
        `TEL;TYPE=CELL:${escapeVcard(cardData?.phone || '')}`,
        `EMAIL;TYPE=INTERNET:${escapeVcard(cardData?.email || '')}`,
        `URL:${escapeVcard(cardData?.website || '')}`,
        `ADR;TYPE=WORK:;;${escapeVcard(cardData?.business_address || '')};;;;`
      ];

      if (photoBase64) lines.push(foldVcardLine(`PHOTO;ENCODING=b;TYPE=JPEG:${photoBase64}`));
      lines.push(`NOTE:${escapeVcard(cardData?.biography || '')}`, 'END:VCARD');

      const vcard = `${lines.join('\r\n')}\r\n`;
      const objectUrl = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${cardData?.slug || 'contact'}.vcf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);

      try { window.track?.('contact_save'); } catch (_) {}
      try { window.toast?.(photoBase64 ? 'Contact downloaded with photo' : 'Contact downloaded'); } catch (_) {}
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = originalHtml;
        try { window.lucide?.createIcons?.(); } catch (_) {}
      }
    }
  }

  // Replace the public-card helper when it is exposed globally.
  try { window.saveVcard = downloadVcardWithPhoto; } catch (_) {}
  try { saveVcard = downloadVcardWithPhoto; } catch (_) {}

  // The production renderer assigns its own click handler after its async card load.
  // Rebind once the loaded card exists so staging always uses the photo-aware download.
  let attempts = 0;
  const bindWhenReady = setInterval(() => {
    attempts += 1;
    const button = document.getElementById('save');
    let cardData = null;
    try { cardData = publicCard || null; } catch (_) {}
    if (button && cardData) {
      button.onclick = () => downloadVcardWithPhoto(cardData);
      clearInterval(bindWhenReady);
      return;
    }
    if (attempts >= 120) clearInterval(bindWhenReady);
  }, 100);

  window.LIWVcardPhotoStaging = { download: downloadVcardWithPhoto };
})();
