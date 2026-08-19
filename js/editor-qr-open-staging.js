(() => {
  'use strict';

  if (!/\/editor\.html$/i.test(location.pathname)) return;

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
      @media(max-width:520px){.liw-editor-qr-shell{padding:18px}.liw-editor-qr-code-stage{width:230px;height:230px}.liw-editor-qr-code-stage>img:first-child{width:206px;height:206px}.liw-editor-qr-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function currentCardUrl() {
    try {
      if (typeof cardUrl === 'function') return cardUrl();
    } catch (_) {}
    const slug = document.querySelector('[name="slug"]')?.value?.trim();
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

  document.addEventListener('click', event => {
    const button = event.target.closest('#download-qr');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openQrDialog();
  }, true);
})();
