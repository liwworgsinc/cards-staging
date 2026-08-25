(() => {
  const PHOTO_KEY = 'liw_guest_profile_photo_v1';
  const DEFAULTS = { x: 50, y: 22, zoom: 125 };
  let snapshot = null;
  let drag = null;
  let openAfterUploadTimer = null;

  const read = () => {
    try {
      const raw = localStorage.getItem(PHOTO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  };
  const write = record => {
    try { localStorage.setItem(PHOTO_KEY, JSON.stringify(record)); return true; } catch (_) { return false; }
  };
  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  };
  const normalize = record => {
    if (!record) return null;
    record.positionX = clamp(record.positionX, 0, 100, DEFAULTS.x);
    record.positionY = clamp(record.positionY, 0, 100, DEFAULTS.y);
    record.zoom = clamp(record.zoom, 110, 200, DEFAULTS.zoom);
    return record;
  };
  const transformFor = record => {
    const zoom = Math.max(1.1, Math.min(2, Number(record?.zoom || 125) / 100));
    const maxTranslate = ((zoom - 1) / (2 * zoom)) * 100;
    const tx = ((Number(record?.positionX ?? 50) - 50) / 50) * maxTranslate;
    const ty = ((Number(record?.positionY ?? 22) - 50) / 50) * maxTranslate;
    return `scale(${zoom}) translate(${tx}%, ${ty}%)`;
  };

  function injectStyles() {
    if (document.getElementById('guest-photo-premium-styles')) return;
    const style = document.createElement('style');
    style.id = 'guest-photo-premium-styles';
    style.textContent = `
      /* keep conversion funnel clean: crop mechanics live in the focused editor */
      #guest-profile-photo-upload .guest-profile-crop{display:none!important}
      #guest-profile-photo-upload{position:relative!important;grid-template-columns:84px minmax(0,1fr)!important;padding:16px!important;border:1px solid #e5e8ee!important;border-radius:20px!important;background:#fff!important;box-shadow:0 10px 28px rgba(15,23,42,.055)!important;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease}
      #guest-profile-photo-upload:hover{border-color:#d5dbe5!important;box-shadow:0 14px 32px rgba(15,23,42,.075)!important}
      #guest-profile-photo-thumb{width:84px!important;height:84px!important;border:3px solid #fff!important;outline:1px solid #dde2e9!important;box-shadow:0 6px 18px rgba(15,23,42,.12)!important;cursor:pointer!important}
      #guest-profile-photo-upload .guest-profile-photo-copy strong{font-size:.96rem!important;letter-spacing:-.01em}
      #guest-profile-photo-upload .guest-profile-photo-copy p{margin:4px 0 12px!important;max-width:420px;color:#788396!important}
      #guest-profile-photo-upload .guest-profile-photo-actions{gap:7px!important}
      #guest-profile-photo-upload label[for="guest-profile-file"]{background:#0b1438!important;border-color:#0b1438!important;color:#fff!important;border-radius:11px!important;box-shadow:0 5px 14px rgba(11,20,56,.16)!important;font-weight:850!important}
      #guest-profile-photo-upload label[for="guest-profile-file"]:hover{transform:translateY(-1px)}
      .guest-photo-edit-premium{display:none;align-items:center;gap:6px;border:1px solid #dfe4eb;background:#fff;color:#344054;border-radius:11px;padding:9px 11px;font:inherit;font-size:.76rem;font-weight:850;cursor:pointer}
      .guest-photo-edit-premium.show{display:inline-flex}
      #guest-profile-photo-remove{font-size:.76rem!important;color:#8a94a5!important}
      #guest-profile-photo-status.success{background:#f5f9ff!important;color:#466080!important;border:1px solid #e4ebf5!important}

      .guest-photo-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:22px;background:rgba(9,16,34,.58);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
      .guest-photo-modal.open{display:flex}
      .guest-photo-dialog{width:min(94vw,520px);max-height:min(92vh,760px);overflow:auto;background:#fff;border:1px solid rgba(255,255,255,.72);border-radius:28px;box-shadow:0 30px 90px rgba(2,8,23,.32);animation:guestPhotoIn .22s ease-out}
      .guest-photo-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 22px 0}
      .guest-photo-dialog-head h2{margin:0;font-size:1.32rem;line-height:1.12;letter-spacing:-.025em;color:#111827}
      .guest-photo-dialog-head p{margin:6px 0 0;color:#748094;font-size:.82rem;line-height:1.45}
      .guest-photo-close{width:38px;height:38px;border:1px solid #e3e7ed;border-radius:12px;background:#fff;color:#475467;display:grid;place-items:center;cursor:pointer;flex:0 0 auto}
      .guest-photo-canvas-wrap{padding:20px 22px 12px;display:grid;place-items:center}
      .guest-photo-canvas{width:min(66vw,292px);aspect-ratio:1;border-radius:50%;position:relative;overflow:hidden;background:#e9edf3;touch-action:none;user-select:none;cursor:grab;box-shadow:0 18px 42px rgba(15,23,42,.18),0 0 0 1px #dfe4eb,0 0 0 9px #fff,0 0 0 10px #edf0f4}
      .guest-photo-canvas.dragging{cursor:grabbing}
      .guest-photo-canvas img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;transform-origin:center center;pointer-events:none;user-select:none}
      .guest-photo-canvas:after{content:'';position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(255,255,255,.9);pointer-events:none}
      .guest-photo-drag-hint{display:flex;align-items:center;gap:7px;margin-top:16px;color:#778396;font-size:.73rem;font-weight:750}
      .guest-photo-controls{padding:8px 22px 20px}
      .guest-photo-zoom-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:14px 0 4px}
      .guest-photo-zoom-row span{font-size:.75rem;font-weight:850;color:#475467}
      .guest-photo-zoom-row input[type=range]{width:100%;accent-color:#0b1438}
      .guest-photo-zoom-value{font-size:.72rem;color:#8792a4;min-width:38px;text-align:right}
      .guest-photo-fine-toggle{width:100%;margin-top:10px;border:0;background:transparent;color:#667085;font:inherit;font-size:.74rem;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;padding:7px}
      .guest-photo-fine{display:none;margin-top:8px;padding:13px;border:1px solid #e7eaf0;border-radius:14px;background:#fafbfc;gap:10px}
      .guest-photo-fine.open{display:grid}
      .guest-photo-fine-row{display:grid;grid-template-columns:78px minmax(0,1fr) 38px;align-items:center;gap:9px;font-size:.7rem;color:#667085;font-weight:750}
      .guest-photo-fine-row input[type=range]{width:100%;accent-color:#0b1438}
      .guest-photo-reset{justify-self:end;border:0;background:transparent;color:#667085;font:inherit;font-size:.7rem;font-weight:850;cursor:pointer;padding:4px 0}
      .guest-photo-actions-premium{display:grid;grid-template-columns:1fr 1.45fr;gap:10px;padding:0 22px 22px}
      .guest-photo-secondary,.guest-photo-primary{min-height:48px;border-radius:14px;font:inherit;font-size:.86rem;font-weight:900;cursor:pointer}
      .guest-photo-secondary{border:1px solid #dde3ea;background:#fff;color:#344054}
      .guest-photo-primary{border:1px solid #0b1438;background:#0b1438;color:#fff;box-shadow:0 8px 20px rgba(11,20,56,.19)}
      .guest-photo-primary:hover{transform:translateY(-1px)}
      body.guest-photo-modal-open{overflow:hidden!important}
      @keyframes guestPhotoIn{from{opacity:.55;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
      @media(max-width:620px){
        #guest-profile-photo-upload{grid-template-columns:72px minmax(0,1fr)!important;padding:13px!important;border-radius:17px!important}
        #guest-profile-photo-thumb{width:72px!important;height:72px!important}
        .guest-photo-modal{align-items:flex-end;padding:0;background:rgba(9,16,34,.52)}
        .guest-photo-dialog{width:100%;max-height:92svh;border-radius:26px 26px 0 0;animation:guestPhotoSheetIn .24s ease-out}
        .guest-photo-dialog-head{padding:19px 18px 0}.guest-photo-canvas-wrap{padding:18px 18px 10px}.guest-photo-controls{padding:7px 18px 18px}.guest-photo-actions-premium{padding:0 18px calc(18px + env(safe-area-inset-bottom));grid-template-columns:1fr 1.6fr}
        .guest-photo-canvas{width:min(70vw,270px)}
        @keyframes guestPhotoSheetIn{from{opacity:.7;transform:translateY(28px)}to{opacity:1;transform:none}}
      }
    `;
    document.head.appendChild(style);
  }

  function injectEditButton() {
    const actions = document.querySelector('#guest-profile-photo-upload .guest-profile-photo-actions');
    if (!actions || actions.querySelector('.guest-photo-edit-premium')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guest-photo-edit-premium';
    button.innerHTML = '<i data-lucide="crop" size="14"></i><span>Adjust</span>';
    button.addEventListener('click', openModal);
    actions.insertBefore(button, document.getElementById('guest-profile-photo-remove'));
  }

  function injectModal() {
    if (document.getElementById('guest-photo-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'guest-photo-modal';
    modal.className = 'guest-photo-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'guest-photo-modal-title');
    modal.innerHTML = `
      <div class="guest-photo-dialog">
        <div class="guest-photo-dialog-head">
          <div><h2 id="guest-photo-modal-title">Make your photo look sharp</h2><p>Drag to center yourself, then zoom until it feels right.</p></div>
          <button class="guest-photo-close" type="button" aria-label="Close photo editor"><i data-lucide="x" size="18"></i></button>
        </div>
        <div class="guest-photo-canvas-wrap">
          <div class="guest-photo-canvas" id="guest-photo-premium-canvas"><img id="guest-photo-premium-image" alt="Profile photo crop preview"></div>
          <div class="guest-photo-drag-hint"><i data-lucide="move" size="14"></i><span>Drag photo to position your face</span></div>
        </div>
        <div class="guest-photo-controls">
          <div class="guest-photo-zoom-row"><span>Zoom</span><input id="guest-photo-premium-zoom" type="range" min="110" max="200" step="1" value="125" aria-label="Zoom profile photo"><output class="guest-photo-zoom-value" id="guest-photo-premium-zoom-value">125%</output></div>
          <button class="guest-photo-fine-toggle" type="button" aria-expanded="false"><i data-lucide="sliders-horizontal" size="14"></i><span>Fine tune</span><i data-lucide="chevron-down" size="14"></i></button>
          <div class="guest-photo-fine" id="guest-photo-premium-fine">
            <div class="guest-photo-fine-row"><label for="guest-photo-premium-x">Left / right</label><input id="guest-photo-premium-x" type="range" min="0" max="100" step="1"><output id="guest-photo-premium-x-value">50%</output></div>
            <div class="guest-photo-fine-row"><label for="guest-photo-premium-y">Up / down</label><input id="guest-photo-premium-y" type="range" min="0" max="100" step="1"><output id="guest-photo-premium-y-value">22%</output></div>
            <button class="guest-photo-reset" type="button"><i data-lucide="rotate-ccw" size="13"></i> Reset position</button>
          </div>
        </div>
        <div class="guest-photo-actions-premium">
          <button class="guest-photo-secondary" type="button" id="guest-photo-change">Choose another</button>
          <button class="guest-photo-primary" type="button" id="guest-photo-use"><i data-lucide="check" size="16"></i> Use this photo</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('.guest-photo-close')?.addEventListener('click', () => closeModal(true));
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(true); });
    modal.querySelector('.guest-photo-fine-toggle')?.addEventListener('click', event => {
      const button = event.currentTarget;
      const fine = document.getElementById('guest-photo-premium-fine');
      const open = !fine.classList.contains('open');
      fine.classList.toggle('open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.getElementById('guest-photo-change')?.addEventListener('click', () => {
      closeModal(false);
      document.getElementById('guest-profile-file')?.click();
    });
    document.getElementById('guest-photo-use')?.addEventListener('click', () => closeModal(false));
    document.querySelector('.guest-photo-reset')?.addEventListener('click', () => {
      const record = normalize(read());
      if (!record?.dataUrl) return;
      record.positionX = DEFAULTS.x; record.positionY = DEFAULTS.y; record.zoom = DEFAULTS.zoom; record.savedAt = Date.now();
      write(record); syncModal(record); mirrorIntoLegacyControls(record);
    });

    ['guest-photo-premium-zoom','guest-photo-premium-x','guest-photo-premium-y'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateFromModalControls);
    });
    wireDrag();
  }

  function mirrorIntoLegacyControls(record) {
    const x = document.getElementById('guest-profile-position-x');
    const y = document.getElementById('guest-profile-position-y');
    const z = document.getElementById('guest-profile-zoom');
    if (x) { x.value = String(record.positionX); x.dispatchEvent(new Event('input', { bubbles: true })); }
    if (y) { y.value = String(record.positionY); y.dispatchEvent(new Event('input', { bubbles: true })); }
    if (z) { z.value = String(record.zoom); z.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  function syncModal(record) {
    record = normalize(record);
    if (!record?.dataUrl) return;
    const image = document.getElementById('guest-photo-premium-image');
    if (image) {
      image.src = record.dataUrl;
      image.style.objectPosition = '50% 50%';
      image.style.transformOrigin = 'center center';
      image.style.transform = transformFor(record);
    }
    const zoom = document.getElementById('guest-photo-premium-zoom');
    const x = document.getElementById('guest-photo-premium-x');
    const y = document.getElementById('guest-photo-premium-y');
    if (zoom) zoom.value = String(record.zoom);
    if (x) x.value = String(record.positionX);
    if (y) y.value = String(record.positionY);
    const zv = document.getElementById('guest-photo-premium-zoom-value');
    const xv = document.getElementById('guest-photo-premium-x-value');
    const yv = document.getElementById('guest-photo-premium-y-value');
    if (zv) zv.textContent = `${Math.round(record.zoom)}%`;
    if (xv) xv.textContent = `${Math.round(record.positionX)}%`;
    if (yv) yv.textContent = `${Math.round(record.positionY)}%`;
  }

  function updateFromModalControls() {
    const record = normalize(read());
    if (!record?.dataUrl) return;
    record.zoom = clamp(document.getElementById('guest-photo-premium-zoom')?.value, 110, 200, DEFAULTS.zoom);
    record.positionX = clamp(document.getElementById('guest-photo-premium-x')?.value, 0, 100, DEFAULTS.x);
    record.positionY = clamp(document.getElementById('guest-photo-premium-y')?.value, 0, 100, DEFAULTS.y);
    record.savedAt = Date.now();
    write(record);
    syncModal(record);
    mirrorIntoLegacyControls(record);
  }

  function wireDrag() {
    const canvas = document.getElementById('guest-photo-premium-canvas');
    if (!canvas) return;
    canvas.addEventListener('pointerdown', event => {
      const record = normalize(read());
      if (!record?.dataUrl) return;
      drag = { id:event.pointerId, sx:event.clientX, sy:event.clientY, x:record.positionX, y:record.positionY };
      canvas.classList.add('dragging');
      try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.id) return;
      const record = normalize(read());
      if (!record?.dataUrl) return;
      const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      record.positionX = Math.max(0, Math.min(100, drag.x + ((event.clientX - drag.sx) / w) * 100));
      record.positionY = Math.max(0, Math.min(100, drag.y + ((event.clientY - drag.sy) / h) * 100));
      record.savedAt = Date.now();
      write(record); syncModal(record); mirrorIntoLegacyControls(record);
      event.preventDefault();
    });
    const end = event => {
      if (!drag || (event?.pointerId != null && event.pointerId !== drag.id)) return;
      drag = null; canvas.classList.remove('dragging');
    };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
  }

  function openModal() {
    const record = normalize(read());
    if (!record?.dataUrl) { document.getElementById('guest-profile-file')?.click(); return; }
    snapshot = JSON.parse(JSON.stringify(record));
    syncModal(record);
    const modal = document.getElementById('guest-photo-modal');
    modal?.classList.add('open');
    document.body.classList.add('guest-photo-modal-open');
    setTimeout(() => document.getElementById('guest-photo-use')?.focus(), 0);
  }

  function closeModal(revert) {
    if (revert && snapshot) {
      write(snapshot); mirrorIntoLegacyControls(snapshot); syncModal(snapshot);
    }
    snapshot = null;
    document.getElementById('guest-photo-modal')?.classList.remove('open');
    document.body.classList.remove('guest-photo-modal-open');
    updateCardState();
  }

  function updateCardState() {
    const hasPhoto = Boolean(read()?.dataUrl);
    document.querySelector('.guest-photo-edit-premium')?.classList.toggle('show', hasPhoto);
    const label = document.querySelector('#guest-profile-photo-upload label[for="guest-profile-file"] span');
    if (label) label.textContent = hasPhoto ? 'Change photo' : 'Add photo';
  }

  function watchUpload() {
    const input = document.getElementById('guest-profile-file');
    if (!input) return;
    input.addEventListener('change', () => {
      const before = Number(read()?.savedAt || 0);
      clearInterval(openAfterUploadTimer);
      let tries = 0;
      openAfterUploadTimer = setInterval(() => {
        tries += 1;
        const record = read();
        if (record?.dataUrl && Number(record.savedAt || 0) !== before) {
          clearInterval(openAfterUploadTimer);
          updateCardState();
          openModal();
        } else if (tries > 60) clearInterval(openAfterUploadTimer);
      }, 100);
    });
  }

  function waitForBaseUploader() {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (document.getElementById('guest-profile-photo-upload') && document.getElementById('guest-profile-file')) {
        clearInterval(timer);
        injectStyles(); injectEditButton(); injectModal(); watchUpload(); updateCardState();
        document.getElementById('guest-profile-photo-thumb')?.addEventListener('click', () => {
          if (read()?.dataUrl) openModal(); else document.getElementById('guest-profile-file')?.click();
        });
        document.getElementById('guest-profile-photo-remove')?.addEventListener('click', () => setTimeout(updateCardState, 0));
        if (window.lucide) try { lucide.createIcons(); } catch (_) {}
      } else if (tries > 80) clearInterval(timer);
    }, 100);
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('guest-photo-modal')?.classList.contains('open')) closeModal(true);
  });

  waitForBaseUploader();
})();
