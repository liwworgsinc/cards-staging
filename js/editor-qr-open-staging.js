(() => {
  'use strict';

  if (!/\/editor\.html$/i.test(location.pathname)) return;

  // Guest recovery belongs to the guest-signup handoff and save reconciliation.
  // Never auto-open a recent draft just because editor.html has no card id: that
  // route is also the intentional "Create card" destination for signed-in users.
  // Clear the old one-shot flag once the authenticated editor has been reached so
  // a later Create card click always starts a genuinely new card.
  try { sessionStorage.removeItem('liw_guest_claim_ready'); } catch (_) {}

  const PRINT_PNG_SIZE = 3000;
  const STYLE_META = {
    classic: { module: 'square', eye: 'square' },
    rounded: { module: 'rounded', eye: 'rounded' },
    dots: { module: 'dots', eye: 'dots' },
    luxe: { module: 'luxe', eye: 'luxe' },
    bold: { module: 'bold', eye: 'bold' },
    liw_signature: { module: 'signature', eye: 'signature' }
  };
  const matrixCache = new Map();

  function notify(message) {
    try {
      if (typeof toast === 'function') return toast(message);
    } catch (_) {}
    console.info('[LIW QR]', message);
  }

  function ensureStyles() {
    if (document.getElementById('liw-editor-qr-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'liw-editor-qr-modal-style';
    style.textContent = `
      #liw-editor-qr-dialog{width:min(440px,calc(100vw - 28px));max-width:none;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);padding:0;border:0;border-radius:24px;background:#fff;box-shadow:0 28px 80px rgba(7,16,46,.28);overflow:auto;overscroll-behavior:contain}
      #liw-editor-qr-dialog::backdrop{background:rgba(7,16,46,.58)}
      .liw-editor-qr-shell{padding:22px}
      .liw-editor-qr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
      .liw-editor-qr-head h3{margin:0 0 4px;color:#0b1438;font-size:1.15rem}
      .liw-editor-qr-head p{margin:0;color:#667085;font-size:.82rem;line-height:1.5}
      .liw-editor-qr-close{width:38px;height:38px;display:grid;place-items:center;border:1px solid #e2e6ee;border-radius:12px;background:#f8fafc;color:#0b1438;cursor:pointer;flex:0 0 auto}
      .liw-editor-qr-code-wrap{display:grid;place-items:center;padding:20px;border:1px solid #e2e6ee;border-radius:20px;background:#f8fafc}
      .liw-editor-qr-code-stage{position:relative;width:260px;height:260px;display:grid;place-items:center;padding:12px;border-radius:18px;background:#fff;box-shadow:0 10px 30px rgba(11,20,56,.08)}
      .liw-editor-qr-code-stage>img:first-child{width:236px;height:236px;object-fit:contain;border-radius:12px}
      .liw-editor-qr-logo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:54px;height:54px;object-fit:contain;border-radius:12px;background:#fff;padding:5px;box-shadow:0 2px 10px rgba(0,0,0,.14)}
      .liw-editor-qr-url{max-width:100%;margin:14px 0 0;padding:11px 12px;border-radius:12px;background:#f7f8fb;color:#475467;font-size:.75rem;font-weight:650;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
      .liw-editor-qr-printbox{margin-top:12px;padding:12px;border:1px solid #e4e7ec;border-radius:16px;background:linear-gradient(180deg,#fff,#f8fafc)}
      .liw-editor-qr-printhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .liw-editor-qr-printhead strong{display:block;color:#101828;font-size:.84rem}
      .liw-editor-qr-printhead small{display:block;margin-top:2px;color:#667085;font-size:.68rem;line-height:1.35}
      .liw-editor-qr-printbadge{flex:0 0 auto;padding:4px 7px;border:1px solid #d7e1f2;border-radius:999px;background:#eef4ff;color:#254a85;font-size:.57rem;font-weight:900;letter-spacing:.05em}
      .liw-editor-qr-export-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .liw-editor-qr-export-actions .btn{min-width:0;min-height:48px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 7px;font-size:.76rem;white-space:nowrap}
      .liw-editor-qr-export-actions .btn small{display:block;color:inherit;opacity:.7;font-size:.57rem;font-weight:700}
      .liw-editor-qr-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
      .liw-editor-qr-actions .btn{justify-content:center;min-height:44px}

      @media(max-width:520px){
        #liw-editor-qr-dialog{width:min(430px,calc(100vw - 20px));max-height:calc(100vh - 16px);max-height:calc(100dvh - 16px);border-radius:22px}
        .liw-editor-qr-shell{padding:16px}
        .liw-editor-qr-head{gap:12px;margin-bottom:12px}
        .liw-editor-qr-head h3{font-size:1.08rem}
        .liw-editor-qr-head p{font-size:.78rem;line-height:1.42}
        .liw-editor-qr-close{width:36px;height:36px;border-radius:11px}
        .liw-editor-qr-code-wrap{padding:14px;border-radius:18px}
        .liw-editor-qr-code-stage{width:min(214px,61vw);height:min(214px,61vw);padding:10px;border-radius:16px}
        .liw-editor-qr-code-stage>img:first-child{width:100%;height:100%;border-radius:10px}
        .liw-editor-qr-logo{width:48px;height:48px;border-radius:11px}
        .liw-editor-qr-url{margin-top:9px;padding:8px 9px;font-size:.69rem;line-height:1.3}
        .liw-editor-qr-printbox{padding:10px;margin-top:10px}
        .liw-editor-qr-printhead{margin-bottom:8px}
        .liw-editor-qr-export-actions{gap:6px}
        .liw-editor-qr-export-actions .btn{min-height:44px;padding:7px 5px;font-size:.72rem;gap:4px}
        .liw-editor-qr-actions{grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}
        .liw-editor-qr-actions .btn{min-height:42px;padding-left:10px;padding-right:10px;font-size:.8rem}
      }

      @media(max-height:760px){
        .liw-editor-qr-shell{padding:12px 15px}
        .liw-editor-qr-head{margin-bottom:8px}
        .liw-editor-qr-head p{font-size:.72rem}
        .liw-editor-qr-code-wrap{padding:10px}
        .liw-editor-qr-code-stage{width:min(176px,49vw);height:min(176px,49vw);padding:8px}
        .liw-editor-qr-logo{width:42px;height:42px}
        .liw-editor-qr-url{margin-top:7px;padding:7px 8px}
        .liw-editor-qr-printbox{margin-top:8px;padding:8px 9px}
        .liw-editor-qr-printhead{margin-bottom:6px}
        .liw-editor-qr-printhead small{display:none}
        .liw-editor-qr-export-actions .btn{min-height:40px}
        .liw-editor-qr-actions{margin-top:8px}
        .liw-editor-qr-actions .btn{min-height:40px}
      }
    `;
    document.head.appendChild(style);
  }

  function fieldValue(name) {
    return String(document.querySelector(`[name="${name}"]`)?.value || '').trim();
  }

  function currentCardUrl() {
    try {
      if (typeof cardUrl === 'function') return cardUrl();
    } catch (_) {}
    const slug = fieldValue('slug');
    if (slug && typeof liwUrl === 'function') return liwUrl(`card.html?slug=${encodeURIComponent(slug)}`);
    return location.href;
  }

  function displayCardUrl(url) {
    try {
      const parsed = new URL(url, location.href);
      const slug = parsed.searchParams.get('slug');
      if (slug) return `Card link · ${slug}`;
      return parsed.hostname.replace(/^www\./, '') + parsed.pathname;
    } catch (_) {
      return url;
    }
  }

  function currentQrSrc() {
    const existing = document.getElementById('editor-qr');
    if (existing?.src) return existing.src;
    try {
      if (typeof buildQrImageUrl === 'function') return buildQrImageUrl(currentCardUrl(), 900);
    } catch (_) {}
    return '';
  }

  function normalizedStyle(value) {
    const key = String(value || 'classic').trim().toLowerCase();
    return STYLE_META[key] ? key : 'classic';
  }

  function currentPrintOptions() {
    const foregroundInput = document.querySelector('[name="qr_foreground_color"]');
    const customAllowed = Boolean(foregroundInput && !foregroundInput.disabled);
    const styledImage = document.getElementById('editor-qr');
    const selectedStyle = window.LIWQrStyleStaging?.selectedStyle || styledImage?.dataset?.liwQrStyled || 'classic';
    return {
      foreground: customAllowed ? (fieldValue('qr_foreground_color') || '#000000') : '#000000',
      background: customAllowed ? (fieldValue('qr_background_color') || '#FFFFFF') : '#FFFFFF',
      logoUrl: customAllowed ? fieldValue('qr_logo_url') : '',
      style: customAllowed ? normalizedStyle(selectedStyle) : 'classic'
    };
  }

  function loadImage(source, crossOrigin = true) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      if (crossOrigin) image.crossOrigin = 'anonymous';
      const timer = setTimeout(() => reject(new Error('QR image loading timed out')), 12000);
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
      if (pixels[offset + 3] < 128) return false;
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

      for (let quiet = 0; quiet < 4; quiet += 1) {
        for (let index = 0; index < total; index += 1) {
          check(sample(total, quiet, index), false);
          check(sample(total, total - 1 - quiet, index), false);
          check(sample(total, index, quiet), false);
          check(sample(total, index, total - 1 - quiet), false);
        }
      }

      [[0, 0], [count - 7, 0], [0, count - 7]].forEach(([originX, originY]) => {
        for (let y = 0; y < 7; y += 1) {
          for (let x = 0; x < 7; x += 1) {
            check(sample(total, originY + y + 4, originX + x + 4), finderExpected(x, y));
          }
        }
      });

      if (count > 21) {
        for (let index = 8; index < count - 8; index += 1) {
          const expected = index % 2 === 0;
          check(sample(total, 10, index + 4), expected);
          check(sample(total, index + 4, 10), expected);
        }
      }

      const score = checks ? passed / checks : 0;
      if (!best || score > best.score) best = { count, total, score };
    }

    if (!best || best.score < 0.88) throw new Error('Unable to identify the QR module grid');
    return Array.from({ length: best.count }, (_, row) =>
      Array.from({ length: best.count }, (_, column) => sample(best.total, row + 4, column + 4))
    );
  }

  async function matrixFor(data) {
    const key = String(data || '');
    if (matrixCache.has(key)) return matrixCache.get(key);
    if (!window.LIWQr?.buildImageUrl) throw new Error('QR engine is still loading');
    const built = window.LIWQr.buildImageUrl(key, {
      size: 640,
      foreground: '#000000',
      background: '#FFFFFF'
    });
    const image = await loadImage(built.url);
    const matrix = extractMatrix(image);
    matrixCache.set(key, matrix);
    if (matrixCache.size > 12) matrixCache.delete(matrixCache.keys().next().value);
    return matrix;
  }

  function safePalette(foreground, background) {
    try {
      if (window.LIWQr?.safePalette) return window.LIWQr.safePalette(foreground, background);
    } catch (_) {}
    return { foreground: foreground || '#000000', background: background || '#FFFFFF' };
  }

  function isFinderModule(x, y, count) {
    return (x < 7 && y < 7) || (x >= count - 7 && y < 7) || (x < 7 && y >= count - 7);
  }

  const num = value => Number(value.toFixed(4)).toString();
  const xml = value => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  function svgRect(x, y, width, height, radius, fill) {
    const rx = Math.max(0, Number(radius) || 0);
    return `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}"${rx ? ` rx="${num(rx)}" ry="${num(rx)}"` : ''} fill="${xml(fill)}"/>`;
  }

  function svgCircle(cx, cy, radius, fill) {
    return `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(radius)}" fill="${xml(fill)}"/>`;
  }

  function moduleSvg(matrix, row, column, quiet, style, foreground) {
    const meta = STYLE_META[style] || STYLE_META.classic;
    const x = quiet + column;
    const y = quiet + row;
    if (meta.module === 'square') return svgRect(x, y, 1, 1, 0, foreground);
    if (meta.module === 'dots') return svgCircle(x + 0.5, y + 0.5, 0.43, foreground);
    if (meta.module === 'signature') {
      const neighbors = [
        matrix?.[row]?.[column - 1], matrix?.[row]?.[column + 1],
        matrix?.[row - 1]?.[column], matrix?.[row + 1]?.[column]
      ].filter(Boolean).length;
      if (neighbors <= 1) return svgCircle(x + 0.5, y + 0.5, 0.43, foreground);
      return svgRect(x + 0.055, y + 0.055, 0.89, 0.89, 0.43, foreground);
    }
    const inset = meta.module === 'bold' ? 0.012 : meta.module === 'luxe' ? 0.075 : 0.07;
    const radius = meta.module === 'bold' ? 0.08 : meta.module === 'luxe' ? 0.46 : 0.30;
    return svgRect(x + inset, y + inset, 1 - inset * 2, 1 - inset * 2, radius, foreground);
  }

  function finderSvg(originX, originY, style, foreground, background) {
    const meta = STYLE_META[style] || STYLE_META.classic;
    const x = originX;
    const y = originY;
    if (meta.eye === 'square' || meta.eye === 'bold') {
      return [
        svgRect(x, y, 7, 7, 0, foreground),
        svgRect(x + 1, y + 1, 5, 5, 0, background),
        svgRect(x + 2, y + 2, 3, 3, 0, foreground)
      ].join('');
    }
    if (meta.eye === 'dots') {
      return [
        svgCircle(x + 3.5, y + 3.5, 3.5, foreground),
        svgCircle(x + 3.5, y + 3.5, 2.5, background),
        svgCircle(x + 3.5, y + 3.5, 1.5, foreground)
      ].join('');
    }
    const outerRadius = meta.eye === 'luxe' ? 2.05 : meta.eye === 'signature' ? 2.25 : 1.35;
    const middleRadius = meta.eye === 'luxe' ? 1.35 : meta.eye === 'signature' ? 1.55 : 0.9;
    const pieces = [
      svgRect(x, y, 7, 7, outerRadius, foreground),
      svgRect(x + 1, y + 1, 5, 5, middleRadius, background)
    ];
    if (meta.eye === 'luxe' || meta.eye === 'signature') pieces.push(svgCircle(x + 3.5, y + 3.5, 1.5, foreground));
    else pieces.push(svgRect(x + 2, y + 2, 3, 3, 0.7, foreground));
    return pieces.join('');
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to embed QR logo'));
      reader.readAsDataURL(blob);
    });
  }

  async function embeddedLogo(url) {
    const source = String(url || '').trim();
    if (!source) return '';
    if (source.startsWith('data:')) return source;
    try {
      const response = await fetch(source, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) throw new Error('Logo download failed');
      return await blobToDataUrl(await response.blob());
    } catch (_) {
      return '';
    }
  }

  async function buildPrintSvg() {
    const targetUrl = currentCardUrl();
    const options = currentPrintOptions();
    const palette = safePalette(options.foreground, options.background);
    const matrix = await matrixFor(targetUrl);
    const count = matrix.length;
    const quiet = 4;
    const total = count + quiet * 2;
    const pieces = [svgRect(0, 0, total, total, 0, palette.background)];

    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        if (!matrix[row][column] || isFinderModule(column, row, count)) continue;
        pieces.push(moduleSvg(matrix, row, column, quiet, options.style, palette.foreground));
      }
    }

    pieces.push(finderSvg(quiet, quiet, options.style, palette.foreground, palette.background));
    pieces.push(finderSvg(quiet + count - 7, quiet, options.style, palette.foreground, palette.background));
    pieces.push(finderSvg(quiet, quiet + count - 7, options.style, palette.foreground, palette.background));

    let logoEmbedded = true;
    if (options.logoUrl) {
      const logo = await embeddedLogo(options.logoUrl);
      if (logo) {
        const padSize = total * Number(window.LIWQr?.QR_LOGO_PAD_RATIO || 0.17);
        const contentSize = total * Number(window.LIWQr?.QR_LOGO_CONTENT_RATIO || 0.105);
        const padX = (total - padSize) / 2;
        const contentX = (total - contentSize) / 2;
        pieces.push(svgRect(padX, padX, padSize, padSize, total * 0.018, '#FFFFFF'));
        pieces.push(`<image href="${xml(logo)}" x="${num(contentX)}" y="${num(contentX)}" width="${num(contentSize)}" height="${num(contentSize)}" preserveAspectRatio="xMidYMid meet"/>`);
      } else {
        logoEmbedded = false;
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}" shape-rendering="geometricPrecision">${pieces.join('')}</svg>`;
    return { svg, logoEmbedded, style: options.style };
  }

  function safeFileStem() {
    const slug = fieldValue('slug') || 'card';
    return `liw-${slug.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'card'}-qr`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function downloadSvg() {
    const result = await buildPrintSvg();
    downloadBlob(new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeFileStem()}.svg`);
    if (!result.logoEmbedded) notify('SVG downloaded without the center logo because the browser blocked logo embedding.');
    else notify('Print-quality SVG downloaded');
  }

  async function downloadHighResPng() {
    const result = await buildPrintSvg();
    const svgBlob = new Blob([result.svg], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(svgBlob);
    try {
      const image = await loadImage(objectUrl, false);
      const canvas = document.createElement('canvas');
      canvas.width = PRINT_PNG_SIZE;
      canvas.height = PRINT_PNG_SIZE;
      const context = canvas.getContext('2d');
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, PRINT_PNG_SIZE, PRINT_PNG_SIZE);
      context.drawImage(image, 0, 0, PRINT_PNG_SIZE, PRINT_PNG_SIZE);
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to create high-resolution PNG')), 'image/png', 1);
      });
      downloadBlob(pngBlob, `${safeFileStem()}-${PRINT_PNG_SIZE}px.png`);
      if (!result.logoEmbedded) notify('High-res PNG downloaded without the center logo because the browser blocked logo embedding.');
      else notify(`${PRINT_PNG_SIZE}px print-quality PNG downloaded`);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function printQr(printWindow) {
    const result = await buildPrintSvg();
    if (!printWindow || printWindow.closed) throw new Error('Print window was blocked');
    const label = xml('Scan to view my digital card');
    const linkLabel = xml(displayCardUrl(currentCardUrl()).replace('Card link · ', ''));
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><title>LIW Card QR</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>@page{margin:.45in}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;color:#111827;background:#fff}.sheet{text-align:center}.qr{width:min(3.5in,82vw);margin:0 auto}.qr svg{display:block;width:100%;height:auto}.label{margin-top:.18in;font-size:14pt;font-weight:700}.url{margin-top:6px;font-size:9pt;color:#475467}@media print{body{min-height:auto}.qr{width:3.5in;-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><main class="sheet"><div class="qr">${result.svg}</div><div class="label">${label}</div><div class="url">${linkLabel}</div></main></body></html>`);
    printWindow.document.close();
    if (!result.logoEmbedded) notify('Print view opened without the center logo because the browser blocked logo embedding.');
    setTimeout(() => {
      try { printWindow.focus(); printWindow.print(); } catch (_) {}
    }, 250);
  }

  async function runButtonTask(button, busyLabel, task) {
    if (!button || button.disabled) return;
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i data-lucide="loader-circle" size="15"></i> ${busyLabel}`;
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    try {
      await task();
    } catch (error) {
      notify(error?.message || 'Unable to prepare the print-quality QR file.');
    } finally {
      button.disabled = false;
      button.innerHTML = original;
      if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    }
  }

  function ensureDialog() {
    let dialog = document.getElementById('liw-editor-qr-dialog');
    if (dialog) return dialog;
    ensureStyles();
    dialog = document.createElement('dialog');
    dialog.id = 'liw-editor-qr-dialog';
    dialog.innerHTML = `
      <div class="liw-editor-qr-shell">
        <div class="liw-editor-qr-head">
          <div><h3>Your card QR code</h3><p>Customers can scan this code to open your published LIW Card.</p></div>
          <button type="button" class="liw-editor-qr-close" aria-label="Close QR code"><i data-lucide="x" size="18"></i></button>
        </div>
        <div class="liw-editor-qr-code-wrap">
          <div class="liw-editor-qr-code-stage">
            <img id="liw-editor-qr-modal-image" alt="Card QR code" />
            <img id="liw-editor-qr-modal-logo" class="liw-editor-qr-logo" alt="QR center logo" hidden />
          </div>
          <div class="liw-editor-qr-url" id="liw-editor-qr-modal-url"></div>
        </div>
        <section class="liw-editor-qr-printbox" aria-label="Print-quality QR downloads">
          <div class="liw-editor-qr-printhead"><div><strong>Print-quality QR</strong><small>Sharp files for business cards, flyers, signs and banners.</small></div><span class="liw-editor-qr-printbadge">HI-RES</span></div>
          <div class="liw-editor-qr-export-actions">
            <button type="button" class="btn btn-light" id="liw-editor-qr-download-png"><i data-lucide="download" size="15"></i><span>PNG<small>${PRINT_PNG_SIZE} px</small></span></button>
            <button type="button" class="btn btn-light" id="liw-editor-qr-download-svg"><i data-lucide="file-text" size="15"></i><span>SVG<small>Vector</small></span></button>
            <button type="button" class="btn btn-light" id="liw-editor-qr-print"><i data-lucide="printer" size="15"></i><span>Print<small>Ready</small></span></button>
          </div>
        </section>
        <div class="liw-editor-qr-actions">
          <button type="button" class="btn btn-primary" id="liw-editor-qr-copy-link"><i data-lucide="copy" size="16"></i> Copy card link</button>
          <button type="button" class="btn btn-light" id="liw-editor-qr-close-bottom"><i data-lucide="check" size="16"></i> Done</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const close = () => dialog.close();
    dialog.querySelector('.liw-editor-qr-close')?.addEventListener('click', close);
    dialog.querySelector('#liw-editor-qr-close-bottom')?.addEventListener('click', close);
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.querySelector('#liw-editor-qr-copy-link')?.addEventListener('click', async () => {
      const url = currentCardUrl();
      try {
        await navigator.clipboard.writeText(url);
        notify('Card link copied');
      } catch (_) {
        const input = document.createElement('textarea');
        input.value = url;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
        notify('Card link copied');
      }
    });
    dialog.querySelector('#liw-editor-qr-download-png')?.addEventListener('click', event => {
      runButtonTask(event.currentTarget, 'Building…', downloadHighResPng);
    });
    dialog.querySelector('#liw-editor-qr-download-svg')?.addEventListener('click', event => {
      runButtonTask(event.currentTarget, 'Building…', downloadSvg);
    });
    dialog.querySelector('#liw-editor-qr-print')?.addEventListener('click', event => {
      const printWindow = window.open('about:blank', '_blank');
      if (printWindow) printWindow.document.body.innerHTML = '<p style="font:600 16px system-ui;padding:28px">Preparing print-quality QR…</p>';
      runButtonTask(event.currentTarget, 'Preparing…', () => printQr(printWindow));
    });
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    return dialog;
  }

  function openQrDialog() {
    const dialog = ensureDialog();
    const qr = dialog.querySelector('#liw-editor-qr-modal-image');
    const url = currentCardUrl();
    const src = currentQrSrc();
    if (!src) {
      notify('QR code is still preparing. Try again in a moment.');
      return;
    }
    qr.src = src;
    const urlLabel = dialog.querySelector('#liw-editor-qr-modal-url');
    urlLabel.textContent = displayCardUrl(url);
    urlLabel.title = url;

    const sourceLogo = document.getElementById('editor-qr-logo');
    const modalLogo = dialog.querySelector('#liw-editor-qr-modal-logo');
    if (sourceLogo?.src && !sourceLogo.hidden) {
      modalLogo.src = sourceLogo.src;
      modalLogo.hidden = false;
    } else {
      modalLogo.hidden = true;
      modalLogo.removeAttribute('src');
    }

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#download-qr');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openQrDialog();
  }, true);

  document.getElementById('liw-editor-wallet-card')?.remove();
})();
