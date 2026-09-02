(() => {
  'use strict';

  const isStaging = location.hostname === 'liwworgsinc.github.io' && location.pathname.startsWith('/cards-staging/');
  if (!isStaging || window.__LIW_QR_STYLE_STAGING__) return;
  window.__LIW_QR_STYLE_STAGING__ = true;

  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  const isEditor = page === 'editor.html';
  const isPublicCard = page === 'card.html' || page === 'card-preview.html';
  if (!isEditor && !isPublicCard) return;

  const STYLES = {
    classic: { label: 'Classic', note: 'Sharp and universal', module: 'square', eye: 'square' },
    rounded: { label: 'Rounded', note: 'Soft modern corners', module: 'rounded', eye: 'rounded' },
    dots: { label: 'Dots', note: 'Clean circular pattern', module: 'dots', eye: 'dots' },
    luxe: { label: 'Luxe', note: 'Elegant rounded eyes', module: 'luxe', eye: 'luxe' },
    bold: { label: 'Bold', note: 'Strong block pattern', module: 'bold', eye: 'bold' },
    liw_signature: { label: 'LIW Signature', note: 'Our custom hybrid pattern', module: 'signature', eye: 'signature', featured: true }
  };
  const STYLE_KEYS = new Set(Object.keys(STYLES));
  const matrixCache = new Map();
  const internalSrcWrites = new WeakSet();
  let selectedStyle = 'classic';
  let styleLoaded = isPublicCard;
  let entitlementReady = isPublicCard;
  let publicQrOptions = null;
  let renderTimer = null;
  let renderSerial = 0;
  let originalComposeCanvas = null;
  let originalTestScan = null;

  function normalizeStyle(value) {
    const key = String(value || 'classic').trim().toLowerCase();
    return STYLE_KEYS.has(key) ? key : 'classic';
  }

  function showToast(message) {
    try {
      if (typeof window.toast === 'function') return window.toast(message);
    } catch (_) {}
    console.info('[LIW QR]', message);
  }

  function safePalette(foreground, background) {
    try {
      if (window.LIWQr?.safePalette) return window.LIWQr.safePalette(foreground, background);
    } catch (_) {}
    return { foreground: foreground || '#000000', background: background || '#FFFFFF', ratio: 7, adjusted: false };
  }

  function hexToRgb(hex) {
    const raw = String(hex || '#000000').replace('#', '').trim();
    const value = raw.length === 3 ? raw.split('').map(char => char + char).join('') : raw.padEnd(6, '0').slice(0, 6);
    return {
      r: parseInt(value.slice(0, 2), 16) || 0,
      g: parseInt(value.slice(2, 4), 16) || 0,
      b: parseInt(value.slice(4, 6), 16) || 0
    };
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(Number(radius) || 0, width / 2, height / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function loadImage(source, timeout = 12000) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      const timer = setTimeout(() => reject(new Error('QR image loading timed out')), timeout);
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Unable to load QR image')); };
      image.src = source;
    });
  }

  function finderExpected(x, y) {
    return x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
  }

  function extractMatrix(image) {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const context = source.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;

    const darkPixel = (x, y) => {
      const px = Math.max(0, Math.min(width - 1, Math.round(x)));
      const py = Math.max(0, Math.min(height - 1, Math.round(y)));
      const offset = (py * width + px) * 4;
      const alpha = pixels[offset + 3] / 255;
      if (alpha < 0.5) return false;
      const luminance = 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
      return luminance < 128;
    };

    const sample = (total, row, column) => darkPixel(
      ((column + 0.5) / total) * width,
      ((row + 0.5) / total) * height
    );

    let best = null;
    for (let count = 21; count <= 177; count += 4) {
      const total = count + 8;
      let passed = 0;
      let checks = 0;
      const check = (actual, expected) => {
        checks += 1;
        if (actual === expected) passed += 1;
      };

      // The generator always uses a four-module quiet zone. Scoring all four
      // edges makes module-count detection reliable even when image pixels do
      // not divide evenly by the QR grid.
      for (let quiet = 0; quiet < 4; quiet += 1) {
        for (let i = 0; i < total; i += 1) {
          check(sample(total, quiet, i), false);
          check(sample(total, total - 1 - quiet, i), false);
          check(sample(total, i, quiet), false);
          check(sample(total, i, total - 1 - quiet), false);
        }
      }

      const finderOrigins = [[0, 0], [count - 7, 0], [0, count - 7]];
      finderOrigins.forEach(([originX, originY]) => {
        for (let y = 0; y < 7; y += 1) {
          for (let x = 0; x < 7; x += 1) {
            check(sample(total, originY + y + 4, originX + x + 4), finderExpected(x, y));
          }
        }
      });

      // Timing tracks add a second independent signal for the correct grid.
      if (count > 21) {
        for (let index = 8; index < count - 8; index += 1) {
          const expected = index % 2 === 0;
          check(sample(total, 6 + 4, index + 4), expected);
          check(sample(total, index + 4, 6 + 4), expected);
        }
      }

      const score = checks ? passed / checks : 0;
      if (!best || score > best.score) best = { count, total, score };
    }

    if (!best || best.score < 0.88) throw new Error('Unable to identify the QR module grid');
    const matrix = Array.from({ length: best.count }, (_, y) =>
      Array.from({ length: best.count }, (_, x) => sample(best.total, y + 4, x + 4))
    );
    return matrix;
  }

  async function matrixFor(data) {
    const key = String(data || '');
    if (matrixCache.has(key)) return matrixCache.get(key);
    if (!window.LIWQr?.buildImageUrl) throw new Error('QR safety engine is unavailable');
    const built = window.LIWQr.buildImageUrl(key, { size: 640, foreground: '#000000', background: '#FFFFFF' });
    const image = await loadImage(built.url);
    const matrix = extractMatrix(image);
    matrixCache.set(key, matrix);
    if (matrixCache.size > 16) matrixCache.delete(matrixCache.keys().next().value);
    return matrix;
  }

  function isFinderModule(x, y, count) {
    return (x < 7 && y < 7) || (x >= count - 7 && y < 7) || (x < 7 && y >= count - 7);
  }

  function drawModule(context, x, y, cell, style, matrix, foreground) {
    const meta = STYLES[style] || STYLES.classic;
    const centerX = x + cell / 2;
    const centerY = y + cell / 2;
    context.fillStyle = foreground;

    if (meta.module === 'dots') {
      context.beginPath();
      context.arc(centerX, centerY, cell * 0.43, 0, Math.PI * 2);
      context.fill();
      return;
    }

    if (meta.module === 'signature') {
      const neighbors = [
        matrix?.[y.__row]?.[x.__column - 1], matrix?.[y.__row]?.[x.__column + 1],
        matrix?.[y.__row - 1]?.[x.__column], matrix?.[y.__row + 1]?.[x.__column]
      ].filter(Boolean).length;
      if (neighbors <= 1) {
        context.beginPath();
        context.arc(centerX, centerY, cell * 0.43, 0, Math.PI * 2);
        context.fill();
      } else {
        const inset = cell * 0.055;
        roundedRect(context, x + inset, y + inset, cell - inset * 2, cell - inset * 2, cell * 0.43);
        context.fill();
      }
      return;
    }

    const inset = meta.module === 'bold' ? cell * 0.012 : meta.module === 'luxe' ? cell * 0.075 : cell * 0.07;
    const radius = meta.module === 'bold' ? cell * 0.08 : meta.module === 'luxe' ? cell * 0.46 : cell * 0.30;
    roundedRect(context, x + inset, y + inset, cell - inset * 2, cell - inset * 2, radius);
    context.fill();
  }

  function fillRounded(context, x, y, size, radius, color) {
    context.fillStyle = color;
    roundedRect(context, x, y, size, size, radius);
    context.fill();
  }

  function drawFinder(context, originX, originY, cell, style, foreground, background) {
    const x = originX * cell;
    const y = originY * cell;
    const outer = cell * 7;
    const middle = cell * 5;
    const center = cell * 3;
    const meta = STYLES[style] || STYLES.classic;

    if (meta.eye === 'square' || meta.eye === 'bold') {
      context.fillStyle = foreground;
      context.fillRect(x, y, outer, outer);
      context.fillStyle = background;
      context.fillRect(x + cell, y + cell, middle, middle);
      context.fillStyle = foreground;
      context.fillRect(x + cell * 2, y + cell * 2, center, center);
      return;
    }

    if (meta.eye === 'dots') {
      const cx = x + outer / 2;
      const cy = y + outer / 2;
      context.fillStyle = foreground;
      context.beginPath();
      context.arc(cx, cy, outer / 2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = background;
      context.beginPath();
      context.arc(cx, cy, middle / 2, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = foreground;
      context.beginPath();
      context.arc(cx, cy, center / 2, 0, Math.PI * 2);
      context.fill();
      return;
    }

    const outerRadius = meta.eye === 'luxe' ? cell * 2.05 : meta.eye === 'signature' ? cell * 2.25 : cell * 1.35;
    const middleRadius = meta.eye === 'luxe' ? cell * 1.35 : meta.eye === 'signature' ? cell * 1.55 : cell * 0.9;
    fillRounded(context, x, y, outer, outerRadius, foreground);
    fillRounded(context, x + cell, y + cell, middle, middleRadius, background);
    if (meta.eye === 'luxe' || meta.eye === 'signature') {
      context.fillStyle = foreground;
      context.beginPath();
      context.arc(x + outer / 2, y + outer / 2, center / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      fillRounded(context, x + cell * 2, y + cell * 2, center, cell * 0.7, foreground);
    }
  }

  function drawContainedImage(context, image, x, y, width, height) {
    const imageWidth = image.naturalWidth || image.width || 1;
    const imageHeight = image.naturalHeight || image.height || 1;
    const sourceRatio = imageWidth / Math.max(1, imageHeight);
    const targetRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;
    if (sourceRatio > targetRatio) drawHeight = width / sourceRatio;
    else drawWidth = height * sourceRatio;
    context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  async function addLogo(canvas, logoUrl) {
    const source = String(logoUrl || '').trim();
    if (!source) return;
    const image = await loadImage(source);
    const context = canvas.getContext('2d');
    const size = canvas.width;
    const padRatio = Number(window.LIWQr?.QR_LOGO_PAD_RATIO || 0.17);
    const contentRatio = Number(window.LIWQr?.QR_LOGO_CONTENT_RATIO || 0.105);
    const padSize = Math.round(size * padRatio);
    const contentSize = Math.round(size * contentRatio);
    const padX = (size - padSize) / 2;
    const padY = (size - padSize) / 2;
    context.fillStyle = '#FFFFFF';
    roundedRect(context, padX, padY, padSize, padSize, Math.max(8, size * 0.018));
    context.fill();
    drawContainedImage(context, image, (size - contentSize) / 2, (size - contentSize) / 2, contentSize, contentSize);
  }

  async function composeStyledCanvas(data, options = {}, requestedStyle = selectedStyle) {
    const style = normalizeStyle(requestedStyle);
    if (style === 'classic' && originalComposeCanvas) return originalComposeCanvas(data, options);
    const size = Math.max(320, Math.min(1000, Number(options.size) || 640));
    const palette = safePalette(options.foreground, options.background);
    const matrix = await matrixFor(data);
    const count = matrix.length;
    const total = count + 8;
    const cell = size / total;
    const quiet = cell * 4;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.fillStyle = palette.background;
    context.fillRect(0, 0, size, size);

    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        if (!matrix[row][column] || isFinderModule(column, row, count)) continue;
        const px = quiet + column * cell;
        const py = quiet + row * cell;
        // Tiny metadata on boxed numbers lets Signature inspect neighbors without
        // allocating a second render structure.
        const xBox = new Number(px); // eslint-disable-line no-new-wrappers
        const yBox = new Number(py); // eslint-disable-line no-new-wrappers
        xBox.__column = column;
        yBox.__row = row;
        drawModule(context, xBox, yBox, cell, style, matrix, palette.foreground);
      }
    }

    drawFinder(context, 4, 4, cell, style, palette.foreground, palette.background);
    drawFinder(context, 4 + count - 7, 4, cell, style, palette.foreground, palette.background);
    drawFinder(context, 4, 4 + count - 7, cell, style, palette.foreground, palette.background);

    if (options.logoUrl) await addLogo(canvas, options.logoUrl);
    return { canvas, palette, style, matrixSize: count };
  }

  async function detectCanvas(canvas, expectedData) {
    try {
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const results = await detector.detect(canvas);
        return { supported: true, ok: results.some(item => String(item.rawValue || '') === String(expectedData || '')) };
      }
    } catch (_) {}
    return { supported: false, ok: true };
  }

  async function testStyledScan(data, options = {}) {
    const style = normalizeStyle(options.style || selectedStyle);
    if (style === 'classic' && originalTestScan) return originalTestScan(data, options);
    const palette = safePalette(options.foreground, options.background);
    try {
      const composed = await composeStyledCanvas(data, options, style);
      const detected = await detectCanvas(composed.canvas, data);
      if (detected.supported) {
        return {
          ok: detected.ok,
          verified: true,
          engine: 'BarcodeDetector',
          palette,
          canvas: composed.canvas,
          message: detected.ok
            ? `${STYLES[style].label} QR scan test passed.`
            : `${STYLES[style].label} QR did not decode. Try Classic/Rounded or remove the center logo.`
        };
      }
      return {
        ok: Number(palette.ratio || 0) >= Number(window.LIWQr?.TARGET_CONTRAST || 4.5),
        verified: false,
        engine: 'safety-rules',
        palette,
        canvas: composed.canvas,
        message: `${STYLES[style].label} keeps Level H correction, the four-module quiet zone, protected finder eyes, and scan-safe contrast.`
      };
    } catch (error) {
      return {
        ok: false,
        verified: false,
        engine: 'style-renderer',
        palette,
        canvas: null,
        message: `Style preview could not be verified (${error?.message || 'renderer unavailable'}). Classic QR remains available.`
      };
    }
  }

  function patchSafetyEngine() {
    if (!window.LIWQr || window.LIWQr.__stylePatched) return false;
    originalComposeCanvas = typeof window.LIWQr.composeCanvas === 'function' ? window.LIWQr.composeCanvas.bind(window.LIWQr) : null;
    originalTestScan = typeof window.LIWQr.testScan === 'function' ? window.LIWQr.testScan.bind(window.LIWQr) : null;
    window.LIWQr.composeCanvas = (data, options = {}) => composeStyledCanvas(data, options, options.style || selectedStyle);
    window.LIWQr.testScan = (data, options = {}) => testStyledScan(data, { ...options, style: options.style || selectedStyle });
    window.LIWQr.composeStyledCanvas = composeStyledCanvas;
    window.LIWQr.qrStyles = STYLES;
    window.LIWQr.__stylePatched = true;
    return true;
  }

  function editorCardUrl() {
    try {
      if (typeof window.cardUrl === 'function') return window.cardUrl();
    } catch (_) {}
    const slug = String(document.querySelector('[name="slug"]')?.value || 'your-card').trim() || 'your-card';
    const base = typeof window.liwUrl === 'function' ? window.liwUrl('card.html') : new URL('card.html', location.href).href;
    const url = new URL(base);
    url.searchParams.set('slug', slug);
    return url.href;
  }

  function editorQrOptions(size = 520, includeLogo = false) {
    return {
      size,
      foreground: document.querySelector('[name="qr_foreground_color"]')?.value || '#000000',
      background: document.querySelector('[name="qr_background_color"]')?.value || '#FFFFFF',
      logoUrl: includeLogo ? String(document.querySelector('[name="qr_logo_url"]')?.value || '') : ''
    };
  }

  function customQrAllowed() {
    if (!isEditor || !entitlementReady) return false;
    const badge = document.querySelector('[data-entitlement-badge="custom_qr"]');
    const input = document.querySelector('[name="qr_foreground_color"]');
    const label = String(badge?.textContent || '').toLowerCase();
    return label.includes('custom qr included') && !input?.disabled;
  }

  function effectiveEditorStyle() {
    return customQrAllowed() ? normalizeStyle(selectedStyle) : 'classic';
  }

  function setImageSource(image, source, style) {
    if (!image || !source) return;
    internalSrcWrites.add(image);
    image.dataset.liwQrStyled = style;
    image.src = source;
  }

  async function renderEditorQr() {
    if (!isEditor || !window.LIWQr?.composeStyledCanvas) return;
    const style = effectiveEditorStyle();
    updatePickerState();
    if (style === 'classic') return;
    const serial = ++renderSerial;
    try {
      const targetUrl = editorCardUrl();
      const composed = await composeStyledCanvas(targetUrl, editorQrOptions(520, false), style);
      if (serial !== renderSerial) return;
      const imageUrl = composed.canvas.toDataURL('image/png');
      ['qr-editor-preview', 'editor-qr'].forEach(id => setImageSource(document.getElementById(id), imageUrl, style));
      const stage = document.getElementById('qr-editor-stage');
      if (stage) stage.dataset.qrStyle = style;
      const shareStage = document.getElementById('editor-qr-stage');
      if (shareStage) shareStage.dataset.qrStyle = style;
    } catch (error) {
      console.warn('[LIW QR] Styled editor preview fallback:', error);
    }
  }

  function scheduleEditorQr(delay = 45) {
    if (!isEditor) return;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderEditorQr, delay);
  }

  function presetIcon(key) {
    const shape = key === 'dots' ? 'dot' : key === 'bold' ? 'bold' : key === 'luxe' ? 'luxe' : key === 'liw_signature' ? 'signature' : key === 'rounded' ? 'rounded' : 'square';
    return `<span class="liw-qr-preset-icon liw-qr-icon-${shape}" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></span>`;
  }

  function ensureEditorStyles() {
    if (document.getElementById('liw-qr-style-staging-css')) return;
    const style = document.createElement('style');
    style.id = 'liw-qr-style-staging-css';
    style.textContent = `
      .liw-qr-style-picker{margin:0 0 18px;padding:16px;border:1px solid #e4e7ec;border-radius:18px;background:linear-gradient(180deg,#fff,#f8fafc)}
      .liw-qr-style-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}.liw-qr-style-head strong{display:block;color:#101828;font-size:.93rem}.liw-qr-style-head span{display:block;margin-top:3px;color:#667085;font-size:.76rem;line-height:1.4}.liw-qr-style-head em{font-style:normal;font-size:.65rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6941c6;background:#f4ebff;border:1px solid #e9d7fe;border-radius:999px;padding:5px 8px;white-space:nowrap}
      .liw-qr-style-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.liw-qr-style-option{position:relative;min-width:0;display:flex;align-items:center;gap:9px;text-align:left;border:1px solid #e4e7ec;border-radius:14px;padding:9px;background:#fff;color:#101828;cursor:pointer;transition:.16s ease}.liw-qr-style-option:hover{border-color:#b9c0cc;transform:translateY(-1px)}.liw-qr-style-option.active{border-color:#0b1438;box-shadow:0 0 0 2px rgba(11,20,56,.09);background:#fbfcff}.liw-qr-style-option[aria-disabled="true"]{opacity:.55}.liw-qr-style-option-copy{min-width:0}.liw-qr-style-option strong{display:block;font-size:.76rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.liw-qr-style-option small{display:block;margin-top:2px;color:#667085;font-size:.62rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.liw-qr-featured{position:absolute;top:-6px;right:7px;font-size:.5rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#7a5b16;background:#fff4cf;border:1px solid #ead79c;border-radius:999px;padding:2px 5px}
      .liw-qr-preset-icon{width:31px;height:31px;flex:0 0 31px;display:grid;grid-template-columns:repeat(2,6px);grid-auto-rows:6px;gap:3px;place-content:center;border-radius:9px;background:#f2f4f7;border:1px solid #eaecf0}.liw-qr-preset-icon i{display:block;width:6px;height:6px;background:#111827}.liw-qr-icon-rounded i{border-radius:2px}.liw-qr-icon-dot i{border-radius:50%}.liw-qr-icon-bold i{width:7px;height:7px}.liw-qr-icon-luxe{border-radius:11px}.liw-qr-icon-luxe i{border-radius:3px}.liw-qr-icon-signature{background:linear-gradient(135deg,#0b1438,#25345f)}.liw-qr-icon-signature i{background:#fff;border-radius:50%}.liw-qr-icon-signature i:nth-child(2),.liw-qr-icon-signature i:nth-child(3){border-radius:2px}.liw-qr-icon-signature b{position:absolute;width:8px;height:8px;border:2px solid #d4a84f;border-radius:3px;transform:translate(17px,-17px)}
      #qr-editor-stage[data-qr-style="rounded"],#qr-editor-stage[data-qr-style="luxe"],#qr-editor-stage[data-qr-style="liw_signature"]{box-shadow:0 14px 34px rgba(11,20,56,.12)}
      @media(max-width:640px){.liw-qr-style-picker{padding:13px}.liw-qr-style-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.liw-qr-style-option{padding:8px}.liw-qr-style-option small{font-size:.59rem}}
    `;
    document.head.appendChild(style);
  }

  function injectEditorPicker() {
    if (!isEditor || document.getElementById('liw-qr-style-picker')) return;
    const controls = document.getElementById('qr-custom-controls');
    if (!controls) return;
    ensureEditorStyles();
    const picker = document.createElement('div');
    picker.id = 'liw-qr-style-picker';
    picker.className = 'liw-qr-style-picker';
    picker.innerHTML = `
      <div class="liw-qr-style-head"><div><strong>QR pattern style</strong><span>Change the modules and finder-eye design while LIW keeps the code scan-safe.</span></div><em>Pro</em></div>
      <div class="liw-qr-style-grid">${Object.entries(STYLES).map(([key, meta]) => `
        <button class="liw-qr-style-option" data-liw-qr-style="${key}" type="button" aria-pressed="false">
          ${presetIcon(key)}<span class="liw-qr-style-option-copy"><strong>${meta.label}</strong><small>${meta.note}</small></span>${meta.featured ? '<span class="liw-qr-featured">Featured</span>' : ''}
        </button>`).join('')}</div>`;
    controls.prepend(picker);
    picker.addEventListener('click', event => {
      const button = event.target.closest('[data-liw-qr-style]');
      if (!button) return;
      const nextStyle = normalizeStyle(button.dataset.liwQrStyle);
      if (nextStyle !== 'classic' && !customQrAllowed()) {
        showToast('Custom QR pattern styles are included with Pro.');
        return;
      }
      selectedStyle = nextStyle;
      styleLoaded = true;
      updatePickerState();
      const colorInput = document.querySelector('[name="qr_foreground_color"]');
      if (colorInput) colorInput.dispatchEvent(new Event('input', { bubbles: true }));
      scheduleEditorQr(0);
      showToast(`${STYLES[nextStyle].label} QR style selected`);
    });
    updatePickerState();
  }

  function updatePickerState() {
    if (!isEditor) return;
    const allowed = customQrAllowed();
    document.querySelectorAll('[data-liw-qr-style]').forEach(button => {
      const key = normalizeStyle(button.dataset.liwQrStyle);
      const active = key === effectiveEditorStyle();
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.setAttribute('aria-disabled', key !== 'classic' && !allowed ? 'true' : 'false');
    });
    const note = document.getElementById('qr-plan-note');
    if (note && allowed) note.textContent = `${STYLES[effectiveEditorStyle()].label} pattern · scan-safe colors · protected finder eyes · optional center logo.`;
  }

  async function loadEditorStyle() {
    if (!isEditor) return;
    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
      selectedStyle = 'classic';
      styleLoaded = true;
      updatePickerState();
      return;
    }
    try {
      const client = window.supabaseClient;
      if (!client) throw new Error('Supabase client unavailable');
      const { data, error } = await client.from('digital_cards').select('qr_style').eq('id', id).maybeSingle();
      if (error) throw error;
      selectedStyle = normalizeStyle(data?.qr_style);
      styleLoaded = true;
      updatePickerState();
      scheduleEditorQr(0);
    } catch (error) {
      console.warn('[LIW QR] Saved QR style could not be loaded:', error);
    }
  }

  function installSaveStyleBridge() {
    if (!isEditor || window.__LIW_QR_STYLE_FETCH_BRIDGE__) return;
    window.__LIW_QR_STYLE_FETCH_BRIDGE__ = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      const url = typeof input === 'string' ? input : String(input?.url || '');
      const options = init ? { ...init } : init;
      if (styleLoaded && entitlementReady && url.includes('/functions/v1/save-card-state') && options && typeof options.body === 'string') {
        try {
          const payload = JSON.parse(options.body);
          if (payload && payload.card && typeof payload.card === 'object') {
            payload.card.qr_style = effectiveEditorStyle();
            options.body = JSON.stringify(payload);
          }
        } catch (_) {}
      }
      return nativeFetch(input, options);
    };
  }

  function observeEditorQr() {
    if (!isEditor) return;
    const attach = image => {
      if (!image || image.dataset.liwQrStyleObserved) return;
      image.dataset.liwQrStyleObserved = 'true';
      new MutationObserver(mutations => {
        if (mutations.some(item => item.attributeName === 'src')) {
          if (internalSrcWrites.has(image)) {
            internalSrcWrites.delete(image);
            return;
          }
          if (effectiveEditorStyle() !== 'classic') scheduleEditorQr();
        }
      }).observe(image, { attributes: true, attributeFilter: ['src'] });
    };
    attach(document.getElementById('qr-editor-preview'));
    attach(document.getElementById('editor-qr'));
    document.addEventListener('input', event => {
      if (event.target?.matches?.('[name="slug"],[name="qr_foreground_color"],[name="qr_background_color"]')) scheduleEditorQr();
    });
    document.addEventListener('change', event => {
      if (event.target?.matches?.('[name="slug"],[name="qr_foreground_color"],[name="qr_background_color"]')) scheduleEditorQr();
    });
  }

  async function loadPublicStyle() {
    if (!isPublicCard) return;
    const slug = new URLSearchParams(location.search).get('slug');
    if (!slug || !window.supabaseClient) return;
    try {
      const { data: rawCard, error: cardError } = await window.supabaseClient.rpc('public_card_by_slug', { p_slug: slug });
      if (cardError) throw cardError;
      const card = Array.isArray(rawCard) ? rawCard[0] : rawCard;
      if (!card?.id) return;
      const { data: rawAccess } = await window.supabaseClient.rpc('public_card_feature_access', { p_card_id: card.id });
      const access = Array.isArray(rawAccess) ? rawAccess[0] : rawAccess;
      selectedStyle = access?.custom_qr === true ? normalizeStyle(card.qr_style) : 'classic';
      publicQrOptions = {
        size: 560,
        foreground: access?.custom_qr === true ? card.qr_foreground_color : '#000000',
        background: access?.custom_qr === true ? card.qr_background_color : '#FFFFFF',
        logoUrl: ''
      };
      styleLoaded = true;
      if (selectedStyle !== 'classic') schedulePublicQr(0);
    } catch (error) {
      console.warn('[LIW QR] Public QR style fallback:', error);
    }
  }

  async function renderPublicQr() {
    if (!isPublicCard || selectedStyle === 'classic' || !publicQrOptions || !window.LIWQr?.composeStyledCanvas) return;
    const qr = document.getElementById('qr');
    if (!qr) return;
    const serial = ++renderSerial;
    try {
      const composed = await composeStyledCanvas(location.href, publicQrOptions, selectedStyle);
      if (serial !== renderSerial) return;
      setImageSource(qr, composed.canvas.toDataURL('image/png'), selectedStyle);
      qr.closest('.qr-frame')?.setAttribute('data-qr-style', selectedStyle);
    } catch (error) {
      console.warn('[LIW QR] Public styled QR fallback:', error);
    }
  }

  function schedulePublicQr(delay = 80) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPublicQr, delay);
  }

  function observePublicQr() {
    if (!isPublicCard) return;
    const bind = () => {
      const qr = document.getElementById('qr');
      if (!qr || qr.dataset.liwPublicQrStyleObserved) return false;
      qr.dataset.liwPublicQrStyleObserved = 'true';
      new MutationObserver(mutations => {
        if (!mutations.some(item => item.attributeName === 'src')) return;
        if (internalSrcWrites.has(qr)) {
          internalSrcWrites.delete(qr);
          return;
        }
        if (selectedStyle !== 'classic') schedulePublicQr();
      }).observe(qr, { attributes: true, attributeFilter: ['src'] });
      return true;
    };
    if (bind()) return;
    const timer = setInterval(() => { if (bind()) clearInterval(timer); }, 150);
    setTimeout(() => clearInterval(timer), 10000);
  }

  function bootEditor() {
    installSaveStyleBridge();
    injectEditorPicker();
    observeEditorQr();
    patchSafetyEngine();
    loadEditorStyle();

    // Entitlements arrive asynchronously after the editor's account lookup.
    // The badge is authoritative and avoids briefly exposing Pro controls to Free.
    let checks = 0;
    const timer = setInterval(() => {
      checks += 1;
      const badge = document.querySelector('[data-entitlement-badge="custom_qr"]');
      const text = String(badge?.textContent || '').toLowerCase();
      if (text.includes('custom qr included') || (text.includes('basic qr included') && checks >= 3) || checks >= 16) {
        entitlementReady = true;
        if (!customQrAllowed() && selectedStyle !== 'classic') selectedStyle = 'classic';
        updatePickerState();
        scheduleEditorQr(0);
        clearInterval(timer);
      }
    }, 250);
  }

  function bootPublic() {
    patchSafetyEngine();
    observePublicQr();
    loadPublicStyle();
  }

  function boot() {
    let tries = 0;
    const wait = setInterval(() => {
      tries += 1;
      if (window.LIWQr && window.supabaseClient) {
        clearInterval(wait);
        if (isEditor) bootEditor();
        else bootPublic();
      } else if (tries >= 50) {
        clearInterval(wait);
      }
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.LIWQrStyleStaging = {
    styles: STYLES,
    get selectedStyle() { return selectedStyle; },
    setStyle(style) { selectedStyle = normalizeStyle(style); scheduleEditorQr(0); schedulePublicQr(0); },
    composeStyledCanvas
  };
})();
