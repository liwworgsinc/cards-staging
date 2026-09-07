(() => {
  'use strict';
  if (window.__LIW_WALLET_QR_PATCH__) return;
  window.__LIW_WALLET_QR_PATCH__ = true;

  const QR_LIB = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
  const $ = selector => document.querySelector(selector);
  const safe = (value, max = 5000) => String(value ?? '').trim().slice(0, max);
  let scanner = null;
  let handling = false;

  function notify(message) {
    try { if (typeof toast === 'function') return toast(message); } catch (_) {}
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(node._liwQrPatchTimer);
    node._liwQrPatchTimer = setTimeout(() => node.classList.remove('show'), 3000);
  }

  function setStatus(message, type = '') {
    const node = $('#liw-qr-status');
    if (!node) return;
    node.textContent = message;
    node.className = `wallet-status${type ? ` ${type}` : ''}`;
  }

  function loadQrLib() {
    if (window.Html5Qrcode) return Promise.resolve(window.Html5Qrcode);
    const existing = [...document.scripts].find(script => script.src === QR_LIB);
    if (existing) {
      return new Promise((resolve, reject) => {
        const ready = () => window.Html5Qrcode ? resolve(window.Html5Qrcode) : reject(new Error('QR scanner did not load.'));
        existing.addEventListener('load', ready, { once: true });
        existing.addEventListener('error', () => reject(new Error('QR scanner could not load.')), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = QR_LIB;
      script.async = true;
      script.onload = () => window.Html5Qrcode ? resolve(window.Html5Qrcode) : reject(new Error('QR scanner did not load.'));
      script.onerror = () => reject(new Error('QR scanner could not load.'));
      document.head.appendChild(script);
    });
  }

  function stopLooseTracks() {
    document.querySelectorAll('#liw-wallet-qr-reader video').forEach(video => {
      try { video.srcObject?.getTracks?.().forEach(track => track.stop()); } catch (_) {}
      try { video.srcObject = null; } catch (_) {}
    });
  }

  async function stopScanner(clearReader = true) {
    stopLooseTracks();
    const active = scanner;
    scanner = null;
    if (active) {
      try { await active.stop(); } catch (_) {}
      try { await active.clear(); } catch (_) {}
    }
    stopLooseTracks();
    const reader = $('#liw-wallet-qr-reader');
    if (clearReader && reader) reader.innerHTML = '';
    const stop = $('#liw-qr-stop');
    if (stop) stop.hidden = true;
  }

  function showQrView() {
    document.querySelectorAll('[data-wallet-view]').forEach(view => {
      view.hidden = view.dataset.walletView !== 'qr';
    });
    const title = $('#wallet-import-title');
    const copy = $('#wallet-import-copy');
    if (title) title.textContent = 'Scan any QR';
    if (copy) copy.textContent = 'LIW QR codes stay live-linked; other QR data can be reviewed before saving.';
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  function normalizeUrl(value) {
    const raw = safe(value, 1200);
    if (!raw) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) { return ''; }
  }

  function vcardValue(value) {
    return String(value || '')
      .replace(/=\r?\n/g, '')
      .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  function parseVcard(text) {
    const unfolded = String(text || '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
    const block = (unfolded.match(/BEGIN:VCARD[\s\S]*?END:VCARD/i) || [])[0];
    if (!block) return null;
    const fields = {};
    block.split(/\r?\n/).forEach(line => {
      const colon = line.indexOf(':');
      if (colon < 0) return;
      const key = line.slice(0, colon).split(';')[0].toUpperCase();
      const value = vcardValue(line.slice(colon + 1));
      if (!fields[key]) fields[key] = [];
      fields[key].push(value);
    });
    const n = safe(fields.N?.[0], 220).split(';');
    const fallbackName = [n[1], n[0]].filter(Boolean).join(' ');
    return {
      display_name: safe(fields.FN?.[0] || fallbackName || fields.ORG?.[0] || 'QR contact', 140),
      company_name: safe(fields.ORG?.[0], 160).split(';')[0],
      job_title: safe(fields.TITLE?.[0], 160),
      phone: safe(fields.TEL?.[0], 80),
      email: safe(fields.EMAIL?.[0], 180),
      website: normalizeUrl(fields.URL?.[0]),
      category: 'QR scans',
      notes: safe(fields.NOTE?.[0], 1200)
    };
  }

  function parseMecard(text) {
    const fields = {};
    String(text || '').replace(/^MECARD:/i, '').replace(/;;?$/, '').split(';').forEach(part => {
      const index = part.indexOf(':');
      if (index < 0) return;
      fields[part.slice(0, index).toUpperCase()] ||= part.slice(index + 1).trim();
    });
    const name = safe(fields.N, 140).split(',').reverse().join(' ').trim();
    return {
      display_name: name || safe(fields.ORG, 140) || 'QR contact',
      company_name: safe(fields.ORG, 160),
      phone: safe(fields.TEL, 80),
      email: safe(fields.EMAIL, 180),
      website: normalizeUrl(fields.URL),
      category: 'QR scans'
    };
  }

  function liwSlug(text) {
    try {
      const url = new URL(text);
      const host = url.hostname.toLowerCase();
      const isLiw = host === 'cards.liwworgs.com' || (host === 'liwworgsinc.github.io' && url.pathname.includes('/cards-staging/'));
      return isLiw ? safe(url.searchParams.get('slug'), 160) : '';
    } catch (_) { return ''; }
  }

  function openReview(contact) {
    const importDialog = $('#liw-wallet-import-dialog');
    if (importDialog?.open) importDialog.close();
    $('#add-other-card-button')?.click();
    setTimeout(() => {
      const values = {
        'contact-name': contact.display_name,
        'contact-company': contact.company_name,
        'contact-title': contact.job_title,
        'contact-category': contact.category || 'QR scans',
        'contact-phone': contact.phone,
        'contact-email': contact.email,
        'contact-website': contact.website,
        'contact-external-url': contact.external_url,
        'contact-notes': contact.notes
      };
      Object.entries(values).forEach(([id, value]) => {
        const field = document.getElementById(id);
        if (field) field.value = safe(value, id === 'contact-notes' ? 1200 : 1000);
      });
      $('#contact-name')?.focus();
      notify('QR read. Review the contact, then tap Save contact.');
    }, 80);
  }

  async function saveLiwCard(slug) {
    const { data, error } = await supabaseClient.rpc('rolodex_save_liw_card', { p_slug: slug });
    if (error) throw error;
    const result = data || {};
    if (!result.ok) {
      if (result.reason === 'own_card') throw new Error('That is your own LIW Card.');
      if (result.reason === 'not_found') throw new Error('That LIW Card is not published or could not be found.');
      throw new Error('Could not save that LIW Card.');
    }
    notify(result.already_saved ? 'That LIW Card is already in your Wallet — live details refreshed.' : 'LIW Card saved live to your Wallet.');
    $('#liw-wallet-import-dialog')?.close();
    setTimeout(() => location.reload(), 450);
  }

  async function handleDecoded(decodedText) {
    if (handling) return;
    handling = true;
    try {
      const text = safe(decodedText, 5000);
      if (!text) throw new Error('That QR code did not contain readable data.');
      setStatus('QR found. Reading it…', 'success');
      await stopScanner();

      const slug = liwSlug(text);
      if (slug) return await saveLiwCard(slug);

      if (/^BEGIN:VCARD/i.test(text)) {
        const contact = parseVcard(text);
        if (contact) return openReview(contact);
      }
      if (/^MECARD:/i.test(text)) return openReview(parseMecard(text));
      if (/^mailto:/i.test(text)) {
        return openReview({ display_name: 'Email contact', email: text.replace(/^mailto:/i, '').split('?')[0], category: 'QR scans' });
      }
      if (/^tel:/i.test(text)) {
        return openReview({ display_name: 'Phone contact', phone: text.replace(/^tel:/i, ''), category: 'QR scans' });
      }

      const url = normalizeUrl(text);
      if (url) {
        let label = 'QR website';
        try { label = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}
        return openReview({ display_name: label, website: url, external_url: url, category: 'QR scans' });
      }

      return openReview({
        display_name: safe(text.split(/\r?\n/)[0], 140) || 'QR contact',
        category: 'QR scans',
        notes: `Scanned QR content:\n${safe(text, 900)}`
      });
    } catch (error) {
      setStatus(error?.message || 'Could not process that QR code.', 'error');
      notify(error?.message || 'Could not process that QR code.');
    } finally {
      handling = false;
    }
  }

  async function startCamera() {
    setStatus('Starting camera…');
    await stopScanner();
    try {
      await loadQrLib();
      scanner = new Html5Qrcode('liw-wallet-qr-reader');
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 245, height: 245 }, aspectRatio: 1.333334 },
        decoded => handleDecoded(decoded),
        () => {}
      );
      const stop = $('#liw-qr-stop');
      if (stop) stop.hidden = false;
      setStatus('Point the camera at a QR code.');
    } catch (error) {
      await stopScanner();
      setStatus('Camera could not start. You can choose a QR image instead.', 'error');
    }
  }

  async function scanImage(file) {
    if (!file) return;
    setStatus('Reading QR image…');
    try {
      await stopScanner();
      await loadQrLib();
      scanner = new Html5Qrcode('liw-wallet-qr-reader');
      const decoded = await scanner.scanFile(file, true);
      await handleDecoded(decoded);
    } catch (error) {
      setStatus('No readable QR code was found in that image.', 'error');
    } finally {
      const input = $('#liw-qr-file');
      if (input) input.value = '';
      if (scanner) {
        try { await scanner.clear(); } catch (_) {}
        scanner = null;
      }
    }
  }

  function ensureFallbackUi() {
    const actions = $('#liw-qr-stop')?.closest('.wallet-tool-actions');
    if (!actions || $('#liw-qr-image-button')) return;
    const input = document.createElement('input');
    input.id = 'liw-qr-file';
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    const button = document.createElement('button');
    button.id = 'liw-qr-image-button';
    button.type = 'button';
    button.className = 'btn btn-light';
    button.innerHTML = '<i data-lucide="image-up" size="16"></i> Choose QR image';
    actions.prepend(button);
    actions.insertAdjacentElement('afterend', input);
    button.addEventListener('click', event => {
      event.preventDefault();
      input.click();
    });
    input.addEventListener('change', event => scanImage(event.target.files?.[0]));
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  document.addEventListener('click', event => {
    const qrMethod = event.target.closest?.('[data-wallet-method="qr"]');
    if (qrMethod) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showQrView();
      ensureFallbackUi();
      startCamera();
      return;
    }

    if (event.target.closest?.('#liw-qr-stop')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      stopScanner();
      setStatus('Scanner stopped.');
      return;
    }

    if (event.target.closest?.('[data-wallet-back], [data-wallet-import-close]')) {
      stopScanner();
    }
  }, true);

  const observer = new MutationObserver(() => ensureFallbackUi());
  observer.observe(document.documentElement, { subtree: true, childList: true });
  setTimeout(() => observer.disconnect(), 15000);
  ensureFallbackUi();

  window.addEventListener('pagehide', () => {
    stopLooseTracks();
    stopScanner(false);
  });
  $('#liw-wallet-import-dialog')?.addEventListener('close', () => stopScanner());
})();