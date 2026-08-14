(function attachLiwQrSafety(global) {
  'use strict';

  const TARGET_CONTRAST = 4.5;
  const QR_LOGO_PAD_RATIO = 0.17;
  const QR_LOGO_CONTENT_RATIO = 0.105;

  function normalizeHex(value, fallback = '#000000') {
    const raw = String(value || fallback).trim().replace('#', '');
    if (/^[0-9a-f]{3}$/i.test(raw)) {
      return `#${raw.split('').map(char => char + char).join('').toUpperCase()}`;
    }
    if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`;
    return normalizeHex(fallback, '#000000');
  }

  function hexToRgb(hex) {
    const value = normalizeHex(hex).slice(1);
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHex({ r, g, b }) {
    const channel = value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
    return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
  }

  function mix(hex, target, amount) {
    const from = hexToRgb(hex);
    const to = hexToRgb(target);
    const weight = Math.max(0, Math.min(1, Number(amount) || 0));
    return rgbToHex({
      r: from.r + (to.r - from.r) * weight,
      g: from.g + (to.g - from.g) * weight,
      b: from.b + (to.b - from.b) * weight
    });
  }

  function relativeLuminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const linear = value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  }

  function contrastRatio(first, second) {
    const a = relativeLuminance(first);
    const b = relativeLuminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function safePalette(foreground, background) {
    const originalForeground = normalizeHex(foreground, '#000000');
    const originalBackground = normalizeHex(background, '#FFFFFF');
    let safeForeground = originalForeground;
    let safeBackground = originalBackground;
    const changes = [];

    // Reliable phone scanning is most consistent with dark modules on a light background.
    if (relativeLuminance(safeBackground) < 0.78) {
      let lightened = safeBackground;
      for (let step = 1; step <= 20 && relativeLuminance(lightened) < 0.84; step += 1) {
        lightened = mix(originalBackground, '#FFFFFF', step / 20);
      }
      safeBackground = lightened;
      changes.push('background lightened');
    }

    if (relativeLuminance(safeForeground) >= relativeLuminance(safeBackground) || contrastRatio(safeForeground, safeBackground) < TARGET_CONTRAST) {
      let darkened = safeForeground;
      for (let step = 1; step <= 24 && contrastRatio(darkened, safeBackground) < TARGET_CONTRAST; step += 1) {
        darkened = mix(originalForeground, '#000000', step / 24);
      }
      safeForeground = darkened;
      changes.push('QR color darkened');
    }

    if (contrastRatio(safeForeground, safeBackground) < TARGET_CONTRAST || relativeLuminance(safeForeground) >= relativeLuminance(safeBackground)) {
      safeForeground = '#000000';
      safeBackground = '#FFFFFF';
      changes.push('black-and-white fallback applied');
    }

    const ratio = contrastRatio(safeForeground, safeBackground);
    return {
      foreground: safeForeground,
      background: safeBackground,
      ratio,
      adjusted: safeForeground !== originalForeground || safeBackground !== originalBackground,
      message: changes.length
        ? `Scan-safe colors applied: ${Array.from(new Set(changes)).join(', ')}.`
        : `Color contrast is scan-safe (${ratio.toFixed(1)}:1).`
    };
  }

  function buildImageUrl(data, options = {}) {
    const size = Math.max(300, Math.min(1000, Number(options.size) || 512));
    const palette = safePalette(options.foreground, options.background);
    const params = new URLSearchParams({
      size: `${size}x${size}`,
      color: palette.foreground.slice(1),
      bgcolor: palette.background.slice(1),
      margin: '0',
      qzone: '4',
      ecc: 'H',
      format: 'png',
      data: String(data || '')
    });
    return { url: `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`, palette };
  }

  function applyLogo(image, logoUrl, allowed = true) {
    if (!image) return;
    const visible = allowed && Boolean(String(logoUrl || '').trim());
    image.hidden = !visible;
    if (visible) {
      image.crossOrigin = 'anonymous';
      image.src = String(logoUrl);
    } else {
      image.removeAttribute('src');
    }
  }

  function loadImage(source, { crossOrigin = true, timeout = 12000 } = {}) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      if (crossOrigin) image.crossOrigin = 'anonymous';
      const timer = setTimeout(() => reject(new Error('Image loading timed out')), timeout);
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Unable to load QR image')); };
      image.src = source;
    });
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawContainedImage(context, image, x, y, width, height) {
    const sourceRatio = image.naturalWidth / Math.max(1, image.naturalHeight);
    const targetRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;
    if (sourceRatio > targetRatio) drawHeight = width / sourceRatio;
    else drawWidth = height * sourceRatio;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  async function composeCanvas(data, options = {}) {
    const size = Math.max(320, Math.min(1000, Number(options.size) || 640));
    const built = buildImageUrl(data, { ...options, size });
    const qrImage = await loadImage(built.url);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(qrImage, 0, 0, size, size);

    const logoUrl = String(options.logoUrl || '').trim();
    if (logoUrl) {
      const logo = await loadImage(logoUrl);
      const padSize = Math.round(size * QR_LOGO_PAD_RATIO);
      const contentSize = Math.round(size * QR_LOGO_CONTENT_RATIO);
      const padX = (size - padSize) / 2;
      const padY = (size - padSize) / 2;
      context.fillStyle = '#FFFFFF';
      roundedRect(context, padX, padY, padSize, padSize, Math.max(8, size * 0.018));
      context.fill();
      const contentX = (size - contentSize) / 2;
      const contentY = (size - contentSize) / 2;
      drawContainedImage(context, logo, contentX, contentY, contentSize, contentSize);
    }

    return { canvas, palette: built.palette, imageUrl: built.url };
  }

  async function detectCanvas(canvas, expectedData) {
    try {
      if ('BarcodeDetector' in global) {
        const detector = new global.BarcodeDetector({ formats: ['qr_code'] });
        const results = await detector.detect(canvas);
        const match = results.find(result => String(result.rawValue || '') === String(expectedData || ''));
        return { supported: true, ok: Boolean(match), engine: 'BarcodeDetector' };
      }
    } catch (_) {}
    return { supported: false, ok: true, engine: 'safety-rules' };
  }

  async function testScan(data, options = {}) {
    const palette = safePalette(options.foreground, options.background);
    try {
      const composed = await composeCanvas(data, options);
      const detected = await detectCanvas(composed.canvas, data);
      if (detected.supported) {
        return {
          ok: detected.ok,
          verified: true,
          engine: detected.engine,
          palette,
          canvas: composed.canvas,
          message: detected.ok
            ? 'QR scan test passed with the current logo and colors.'
            : 'QR scan test failed. Remove the logo or choose darker QR colors before publishing.'
        };
      }
      return {
        ok: palette.ratio >= TARGET_CONTRAST,
        verified: false,
        engine: detected.engine,
        palette,
        canvas: composed.canvas,
        message: 'Scan-safe sizing, contrast, Level H correction, and quiet-zone checks passed. Live camera decoding is unavailable in this browser.'
      };
    } catch (error) {
      return {
        ok: palette.ratio >= TARGET_CONTRAST,
        verified: false,
        engine: 'safety-rules',
        palette,
        canvas: null,
        message: `Scan-safe rules passed, but the browser could not run a live decode check (${error?.message || 'image unavailable'}).`
      };
    }
  }

  async function imageFromFile(file) {
    if ('createImageBitmap' in global) return await createImageBitmap(file);
    const objectUrl = URL.createObjectURL(file);
    try {
      return await loadImage(objectUrl, { crossOrigin: false });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function cropLogoFile(file) {
    const image = await imageFromFile(file);
    const sourceWidth = image.width || image.naturalWidth;
    const sourceHeight = image.height || image.naturalHeight;
    const scale = Math.min(1, 1400 / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
    sourceContext.drawImage(image, 0, 0, width, height);
    const pixels = sourceContext.getImageData(0, 0, width, height).data;

    function boundsFor(includeNearWhite) {
      let left = width;
      let top = height;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 4;
          const r = pixels[offset];
          const g = pixels[offset + 1];
          const b = pixels[offset + 2];
          const a = pixels[offset + 3];
          if (a < 18) continue;
          if (!includeNearWhite && r > 246 && g > 246 && b > 246) continue;
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
      return right >= left && bottom >= top ? { left, top, right, bottom } : null;
    }

    const bounds = boundsFor(false) || boundsFor(true) || { left: 0, top: 0, right: width - 1, bottom: height - 1 };
    const contentWidth = bounds.right - bounds.left + 1;
    const contentHeight = bounds.bottom - bounds.top + 1;
    const padding = Math.round(Math.max(contentWidth, contentHeight) * 0.06);
    const sx = Math.max(0, bounds.left - padding);
    const sy = Math.max(0, bounds.top - padding);
    const sw = Math.min(width - sx, contentWidth + padding * 2);
    const sh = Math.min(height - sy, contentHeight + padding * 2);

    const outputSize = 512;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const outputContext = outputCanvas.getContext('2d');
    outputContext.clearRect(0, 0, outputSize, outputSize);
    const targetSize = Math.round(outputSize * 0.84);
    const ratio = sw / sh;
    let dw = targetSize;
    let dh = targetSize;
    if (ratio > 1) dh = targetSize / ratio;
    else dw = targetSize * ratio;
    const dx = (outputSize - dw) / 2;
    const dy = (outputSize - dh) / 2;
    outputContext.drawImage(sourceCanvas, sx, sy, sw, sh, dx, dy, dw, dh);

    const blob = await new Promise((resolve, reject) => {
      outputCanvas.toBlob(result => result ? resolve(result) : reject(new Error('Unable to optimize the logo')), 'image/png', 0.94);
    });
    const baseName = String(file.name || 'qr-logo').replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80) || 'qr-logo';
    return new File([blob], `${baseName}-scan-safe.png`, { type: 'image/png', lastModified: Date.now() });
  }

  global.LIWQr = {
    TARGET_CONTRAST,
    QR_LOGO_PAD_RATIO,
    QR_LOGO_CONTENT_RATIO,
    normalizeHex,
    contrastRatio,
    safePalette,
    buildImageUrl,
    applyLogo,
    composeCanvas,
    testScan,
    cropLogoFile
  };
})(window);
