(() => {
  'use strict';

  if (!/\/editor\.html$/i.test(location.pathname)) return;

  const WALLET_CARD_ID = 'liw-editor-wallet-card';

  function ensureStyles() {
    if (document.getElementById('liw-editor-qr-modal-style')) return;
    const style = document.createElement('style');
    style.id = 'liw-editor-qr-modal-style';
    style.textContent = `
      #liw-editor-qr-dialog{width:min(440px,calc(100vw - 28px));max-width:none;padding:0;border:0;border-radius:24px;background:#fff;box-shadow:0 28px 80px rgba(7,16,46,.28);overflow:hidden}
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
      .liw-editor-qr-url{margin:14px 0 0;padding:11px 12px;border-radius:12px;background:#f7f8fb;color:#475467;font-size:.75rem;line-height:1.4;word-break:break-all;text-align:center}
      .liw-editor-qr-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
      .liw-editor-qr-actions .btn{justify-content:center;min-height:46px}

      .liw-editor-wallet-card{margin:18px 0 0;padding:18px;border:1px solid #e2e6ee;border-radius:22px;background:linear-gradient(145deg,#f8fafc,#fff);box-shadow:0 12px 32px rgba(11,20,56,.06)}
      .liw-editor-wallet-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
      .liw-editor-wallet-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#050505;color:#fff;flex:0 0 auto}
      .liw-editor-wallet-copy{min-width:0;flex:1}
      .liw-editor-wallet-copy strong{display:block;color:#0b1438;font-size:.95rem}
      .liw-editor-wallet-copy small{display:block;margin-top:2px;color:#667085;font-size:.7rem;line-height:1.35}
      .liw-editor-wallet-badge{padding:5px 8px;border-radius:999px;background:#fff7dd;border:1px solid #f1dea3;color:#8a6715;font-size:.6rem;font-weight:800;white-space:nowrap}
      .liw-editor-wallet-badge.ready{background:#e9fbf4;border-color:#bcebd9;color:#087a5f}
      .liw-editor-wallet-pass{--wallet-primary:#0b1438;position:relative;overflow:hidden;min-height:164px;padding:18px;border-radius:20px;background:linear-gradient(135deg,var(--wallet-primary),#05070d 78%);color:#fff;box-shadow:0 16px 34px rgba(5,7,13,.18)}
      .liw-editor-wallet-pass:after{content:'';position:absolute;right:-55px;top:-70px;width:190px;height:190px;border-radius:999px;background:rgba(255,255,255,.08)}
      .liw-editor-wallet-brand{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:.64rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.9}
      .liw-editor-wallet-person{position:relative;z-index:1;margin-top:30px}
      .liw-editor-wallet-person strong{display:block;font-size:1.25rem;line-height:1.1;letter-spacing:-.02em}
      .liw-editor-wallet-person span{display:block;margin-top:5px;font-size:.76rem;opacity:.84}
      .liw-editor-wallet-person small{display:block;margin-top:2px;font-size:.68rem;opacity:.68}
      .liw-editor-wallet-footer{position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:24px}
      .liw-editor-wallet-footer span{font-size:.61rem;opacity:.75}
      .liw-editor-wallet-qr-mark{width:40px;height:40px;display:grid;place-items:center;border-radius:9px;background:#fff;color:#111827}
      .liw-editor-wallet-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}
      .liw-editor-wallet-actions .btn{justify-content:center;min-height:43px}
      .liw-editor-wallet-status{display:flex;align-items:flex-start;gap:8px;margin-top:11px;padding:10px 11px;border-radius:12px;background:#f7f8fb;color:#596579;font-size:.68rem;line-height:1.4}
      .liw-editor-wallet-status svg{flex:0 0 auto;margin-top:1px}

      @media(max-width:520px){
        .liw-editor-qr-shell{padding:18px}.liw-editor-qr-code-stage{width:230px;height:230px}.liw-editor-qr-code-stage>img:first-child{width:206px;height:206px}.liw-editor-qr-actions{grid-template-columns:1fr}
        .liw-editor-wallet-card{padding:14px;border-radius:18px}.liw-editor-wallet-head{align-items:flex-start}.liw-editor-wallet-actions{grid-template-columns:1fr}.liw-editor-wallet-pass{min-height:154px;padding:16px}.liw-editor-wallet-person{margin-top:24px}
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

  function currentQrSrc() {
    const existing = document.getElementById('editor-qr');
    if (existing?.src) return existing.src;
    try {
      if (typeof buildQrImageUrl === 'function') return buildQrImageUrl(currentCardUrl(), 900);
    } catch (_) {}
    return '';
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
        if (typeof toast === 'function') toast('Card link copied');
      } catch (_) {
        const input = document.createElement('textarea');
        input.value = url;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
        if (typeof toast === 'function') toast('Card link copied');
      }
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
      if (typeof toast === 'function') toast('QR code is still preparing. Try again in a moment.');
      return;
    }
    qr.src = src;
    dialog.querySelector('#liw-editor-qr-modal-url').textContent = url;

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

  function walletStatusUrl() {
    const slug = fieldValue('slug').toLowerCase();
    const supabaseUrl = typeof LIW_CONFIG !== 'undefined' ? String(LIW_CONFIG.supabaseUrl || '') : '';
    if (!slug || !supabaseUrl) return '';
    const url = new URL('/functions/v1/apple-wallet-pass', supabaseUrl);
    url.searchParams.set('slug', slug);
    url.searchParams.set('app_url', currentCardUrl());
    url.searchParams.set('status', '1');
    return url.href;
  }

  function syncWalletPreview() {
    const root = document.getElementById(WALLET_CARD_ID);
    if (!root) return;
    const primary = /^#[0-9a-f]{6}$/i.test(fieldValue('primary_color')) ? fieldValue('primary_color') : '#0b1438';
    root.style.setProperty('--wallet-primary', primary);
    const name = fieldValue('full_name') || 'Your Name';
    const company = fieldValue('company_name') || 'LIW Digital Card';
    const title = fieldValue('job_title') || 'Digital Business Card';
    root.querySelector('[data-wallet-name]').textContent = name;
    root.querySelector('[data-wallet-company]').textContent = company;
    root.querySelector('[data-wallet-title]').textContent = title;
  }

  async function checkWalletStatus() {
    const root = document.getElementById(WALLET_CARD_ID);
    if (!root) return;
    const badge = root.querySelector('[data-wallet-badge]');
    const status = root.querySelector('[data-wallet-status-copy]');
    const url = walletStatusUrl();

    badge.classList.remove('ready');
    badge.textContent = 'Checking';
    if (!url) {
      badge.textContent = 'Setup pending';
      status.textContent = 'Save this card with a public slug first. The Wallet preview is visible now, but Apple signing is not active yet.';
      return;
    }

    status.textContent = 'Checking the staging Wallet signing endpoint…';
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.available === true) {
        badge.textContent = 'Ready';
        badge.classList.add('ready');
        status.textContent = 'Apple Wallet signing is ready. Open the public card on iPhone to add the pass.';
      } else {
        badge.textContent = 'Setup pending';
        status.textContent = 'The Wallet feature is installed in staging. Apple Pass Type signing credentials still need to be added before an iPhone can install the pass.';
      }
    } catch (_) {
      badge.textContent = 'Setup pending';
      status.textContent = 'The Wallet preview is installed. The signing status could not be reached right now.';
    }
  }

  function mountWalletEditorCard() {
    if (document.getElementById(WALLET_CARD_ID)) return true;
    const panel = document.querySelector('.editor-panel[data-panel="share"]');
    if (!panel) return false;
    ensureStyles();

    const section = document.createElement('section');
    section.id = WALLET_CARD_ID;
    section.className = 'liw-editor-wallet-card';
    section.innerHTML = `
      <div class="liw-editor-wallet-head">
        <span class="liw-editor-wallet-icon"><i data-lucide="wallet-cards" size="20"></i></span>
        <div class="liw-editor-wallet-copy"><strong>Apple Wallet</strong><small>Preview how this digital card will live inside Apple Wallet.</small></div>
        <span class="liw-editor-wallet-badge" data-wallet-badge>Setup pending</span>
      </div>
      <div class="liw-editor-wallet-pass">
        <div class="liw-editor-wallet-brand"><span>LIW Digital Cards</span><span>APPLE WALLET</span></div>
        <div class="liw-editor-wallet-person">
          <strong data-wallet-name>Your Name</strong>
          <span data-wallet-title>Digital Business Card</span>
          <small data-wallet-company>LIW Digital Card</small>
        </div>
        <div class="liw-editor-wallet-footer"><span>Scan to open full digital card</span><span class="liw-editor-wallet-qr-mark"><i data-lucide="qr-code" size="23"></i></span></div>
      </div>
      <div class="liw-editor-wallet-actions">
        <button class="btn btn-primary" type="button" data-wallet-check><i data-lucide="refresh-cw" size="16"></i> Check Wallet setup</button>
        <button class="btn btn-light" type="button" data-wallet-open><i data-lucide="external-link" size="16"></i> Open public card</button>
      </div>
      <div class="liw-editor-wallet-status"><i data-lucide="info" size="15"></i><span data-wallet-status-copy>The Wallet preview is installed in staging. Apple signing setup is still pending.</span></div>
    `;

    const qrButton = document.getElementById('download-qr');
    const qrBlock = qrButton?.closest('.form-section') || qrButton?.parentElement;
    if (qrBlock && panel.contains(qrBlock)) qrBlock.insertAdjacentElement('afterend', section);
    else panel.appendChild(section);

    section.querySelector('[data-wallet-check]')?.addEventListener('click', checkWalletStatus);
    section.querySelector('[data-wallet-open]')?.addEventListener('click', () => {
      const url = currentCardUrl();
      if (url && url !== location.href) window.open(url, '_blank', 'noopener');
      else if (typeof toast === 'function') toast('Save a card slug first, then open the public card.');
    });

    document.addEventListener('input', event => {
      if (event.target.matches('[name="full_name"],[name="company_name"],[name="job_title"],[name="primary_color"]')) syncWalletPreview();
    });
    document.addEventListener('change', event => {
      if (event.target.matches('[name="full_name"],[name="company_name"],[name="job_title"],[name="primary_color"],[name="slug"]')) syncWalletPreview();
    });

    syncWalletPreview();
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    return true;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#download-qr');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openQrDialog();
  }, true);

  let attempts = 0;
  const mountTimer = window.setInterval(() => {
    attempts += 1;
    if (mountWalletEditorCard() || attempts >= 40) window.clearInterval(mountTimer);
  }, 250);
  mountWalletEditorCard();
})();
