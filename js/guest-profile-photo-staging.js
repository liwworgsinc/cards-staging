(() => {
  const PHOTO_KEY = 'liw_guest_profile_photo_v1';
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const DEFAULT_POSITION = { x: 50, y: 22, zoom: 125 };

  function readPhoto() {
    try {
      const raw = localStorage.getItem(PHOTO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writePhoto(photo) {
    try {
      localStorage.setItem(PHOTO_KEY, JSON.stringify(photo));
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearPhoto() {
    try { localStorage.removeItem(PHOTO_KEY); } catch (_) {}
  }

  function initials() {
    const value = String(document.getElementById('guest-full-name')?.value || '').trim();
    const parts = value.split(/\s+/).filter(Boolean);
    return (parts.slice(0, 2).map(part => part[0]).join('') || 'YN').toUpperCase();
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function normalizePhotoRecord(record) {
    if (!record) return null;
    record.positionX = clamp(record.positionX, 0, 100, DEFAULT_POSITION.x);
    record.positionY = clamp(record.positionY, 0, 100, DEFAULT_POSITION.y);
    record.zoom = clamp(record.zoom, 110, 200, DEFAULT_POSITION.zoom);
    return record;
  }

  function profileCropTransform(x, y, zoomPercent) {
    const zoom = Math.max(1.1, Math.min(2, Number(zoomPercent || 125) / 100));
    const maxTranslate = ((zoom - 1) / (2 * zoom)) * 100;
    const translateX = ((x - 50) / 50) * maxTranslate;
    const translateY = ((y - 50) / 50) * maxTranslate;
    return `scale(${zoom}) translate(${translateX}%, ${translateY}%)`;
  }

  function injectUi() {
    if (document.getElementById('guest-profile-photo-upload')) return;
    const firstSection = document.querySelector('.guest-editor .guest-section');
    const head = firstSection?.querySelector('.guest-section-head');
    if (!firstSection || !head) return;

    const style = document.createElement('style');
    style.id = 'guest-profile-photo-styles';
    style.textContent = `
      .guest-profile-photo-upload{display:grid;grid-template-columns:78px minmax(0,1fr);gap:14px;align-items:center;margin:2px 0 18px;padding:14px;border:1px solid #e2e6ec;border-radius:17px;background:#fafbfc}
      .guest-profile-photo-thumb{width:78px;height:78px;border-radius:50%;overflow:hidden;background:linear-gradient(145deg,#eef1f6,#e5e9f0);display:grid;place-items:center;color:#536176;font-weight:900;font-size:1.15rem;box-shadow:inset 0 0 0 1px rgba(15,23,42,.05)}
      .guest-profile-photo-thumb img{width:100%;height:100%;object-fit:cover;object-position:50% 50%;transform-origin:center center;display:block}
      .guest-profile-photo-copy{min-width:0}.guest-profile-photo-copy strong{display:block;font-size:.9rem}.guest-profile-photo-copy p{margin:3px 0 10px!important;font-size:.78rem!important;line-height:1.4;color:#7a8495!important}
      .guest-profile-photo-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.guest-profile-photo-actions .btn{min-height:38px}.guest-profile-photo-remove{border:0;background:transparent;color:#667085;font:inherit;font-size:.78rem;font-weight:800;padding:8px;cursor:pointer}
      .guest-profile-photo-status{grid-column:1/-1;display:none;border-radius:11px;padding:9px 10px;font-size:.76rem;font-weight:750;line-height:1.35}.guest-profile-photo-status.show{display:block}.guest-profile-photo-status.error{background:#fff1f0;color:#9d332d}.guest-profile-photo-status.success{background:#effaf2;color:#28623a}
      .guest-profile-crop{grid-column:1/-1;display:none;margin-top:2px;border-top:1px solid #e5e9ef;padding-top:14px}.guest-profile-crop.show{display:grid;grid-template-columns:150px minmax(0,1fr);gap:16px;align-items:center}
      .guest-profile-crop-stage{width:150px;height:150px;border-radius:50%;overflow:hidden;position:relative;background:#e8edf4;box-shadow:inset 0 0 0 1px rgba(15,23,42,.08),0 8px 20px rgba(15,23,42,.08);touch-action:none;cursor:grab;user-select:none}.guest-profile-crop-stage.dragging{cursor:grabbing}.guest-profile-crop-stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;transform-origin:center center;pointer-events:none;user-select:none}.guest-profile-crop-stage:after{content:'';position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 3px #fff,inset 0 0 0 4px rgba(15,23,42,.14);pointer-events:none}
      .guest-profile-crop-controls{display:grid;gap:11px;min-width:0}.guest-profile-crop-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.guest-profile-crop-title strong{font-size:.86rem}.guest-profile-crop-title span{display:block;margin-top:2px;font-size:.72rem;color:#7a8495;line-height:1.35}.guest-profile-crop-reset{border:0;background:#fff;border:1px solid #dde3ea;border-radius:10px;color:#4f5c70;font:inherit;font-size:.72rem;font-weight:850;padding:7px 9px;cursor:pointer;white-space:nowrap}
      .guest-profile-crop-control{display:grid;gap:5px}.guest-profile-crop-label{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:.74rem;font-weight:800;color:#455267}.guest-profile-crop-label output{font-size:.7rem;color:#7a8495}.guest-profile-crop-control input[type=range]{width:100%;accent-color:#0b1438}.guest-profile-crop-help{display:flex;align-items:center;gap:6px;color:#7a8495;font-size:.7rem;line-height:1.35}
      .guest-avatar{position:relative;overflow:hidden}.guest-avatar .guest-profile-live-photo{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:50% 50%;transform-origin:center center;display:none}.guest-avatar.has-guest-photo .guest-profile-live-photo{display:block}.guest-avatar.has-guest-photo #preview-initials{visibility:hidden}
      @media(max-width:620px){.guest-profile-photo-upload{grid-template-columns:66px minmax(0,1fr);padding:12px;gap:12px}.guest-profile-photo-thumb{width:66px;height:66px}.guest-profile-photo-actions{gap:5px}.guest-profile-photo-actions .btn{min-height:36px;padding-left:10px;padding-right:10px}.guest-profile-crop.show{grid-template-columns:1fr;justify-items:center}.guest-profile-crop-controls{width:100%}.guest-profile-crop-stage{width:164px;height:164px}.guest-profile-crop-title{width:100%}}
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'guest-profile-photo-upload';
    wrap.id = 'guest-profile-photo-upload';
    wrap.innerHTML = `
      <div class="guest-profile-photo-thumb" id="guest-profile-photo-thumb" aria-hidden="true"><span>${initials()}</span></div>
      <div class="guest-profile-photo-copy">
        <strong>Profile photo</strong>
        <p>Optional. Add a clear headshot or business image now — it will carry into your card after signup.</p>
        <div class="guest-profile-photo-actions">
          <label class="btn btn-light btn-sm" for="guest-profile-file"><i data-lucide="upload" size="15"></i><span>Upload photo</span></label>
          <input id="guest-profile-file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
          <button class="guest-profile-photo-remove" id="guest-profile-photo-remove" type="button">Remove</button>
        </div>
      </div>
      <div class="guest-profile-photo-status" id="guest-profile-photo-status" role="status" aria-live="polite"></div>
      <div class="guest-profile-crop" id="guest-profile-crop">
        <div class="guest-profile-crop-stage" id="guest-profile-crop-stage" aria-label="Drag profile photo to reposition">
          <img id="guest-profile-crop-image" alt="Profile photo crop preview">
        </div>
        <div class="guest-profile-crop-controls">
          <div class="guest-profile-crop-title"><div><strong>Adjust photo</strong><span>Same crop controls as the LIW editor.</span></div><button class="guest-profile-crop-reset" id="guest-profile-crop-reset" type="button"><i data-lucide="rotate-ccw" size="13"></i> Reset</button></div>
          <div class="guest-profile-crop-control"><div class="guest-profile-crop-label"><label for="guest-profile-position-x">Left / right</label><output id="guest-profile-position-x-value">50%</output></div><input id="guest-profile-position-x" min="0" max="100" step="1" type="range" value="50" aria-label="Move profile photo left or right"></div>
          <div class="guest-profile-crop-control"><div class="guest-profile-crop-label"><label for="guest-profile-position-y">Up / down</label><output id="guest-profile-position-y-value">22%</output></div><input id="guest-profile-position-y" min="0" max="100" step="1" type="range" value="22" aria-label="Move profile photo up or down"></div>
          <div class="guest-profile-crop-control"><div class="guest-profile-crop-label"><label for="guest-profile-zoom">Zoom</label><output id="guest-profile-zoom-value">125%</output></div><input id="guest-profile-zoom" min="110" max="200" step="1" type="range" value="125" aria-label="Zoom profile photo"></div>
          <div class="guest-profile-crop-help"><i data-lucide="move" size="13"></i><span>Drag the photo to position the face, or use the sliders for precision.</span></div>
        </div>
      </div>`;
    head.insertAdjacentElement('afterend', wrap);

    const avatar = document.querySelector('.guest-avatar');
    if (avatar && !avatar.querySelector('.guest-profile-live-photo')) {
      const image = document.createElement('img');
      image.className = 'guest-profile-live-photo';
      image.id = 'guest-profile-live-photo';
      image.alt = '';
      avatar.prepend(image);
    }
  }

  function showStatus(message = '', type = '') {
    const status = document.getElementById('guest-profile-photo-status');
    if (!status) return;
    status.textContent = message;
    status.className = `guest-profile-photo-status${message ? ' show' : ''}${type ? ` ${type}` : ''}`;
  }

  function updateCropLabels(record) {
    document.getElementById('guest-profile-position-x-value').textContent = `${Math.round(record.positionX)}%`;
    document.getElementById('guest-profile-position-y-value').textContent = `${Math.round(record.positionY)}%`;
    document.getElementById('guest-profile-zoom-value').textContent = `${Math.round(record.zoom)}%`;
  }

  function syncCropControls(record) {
    const x = document.getElementById('guest-profile-position-x');
    const y = document.getElementById('guest-profile-position-y');
    const zoom = document.getElementById('guest-profile-zoom');
    if (x) x.value = String(record.positionX);
    if (y) y.value = String(record.positionY);
    if (zoom) zoom.value = String(record.zoom);
    updateCropLabels(record);
  }

  function applyCrop(record) {
    if (!record) return;
    const transform = profileCropTransform(record.positionX, record.positionY, record.zoom);
    document.querySelectorAll('#guest-profile-photo-thumb img, #guest-profile-crop-image, #guest-profile-live-photo').forEach(image => {
      image.style.objectPosition = '50% 50%';
      image.style.transformOrigin = 'center center';
      image.style.transform = transform;
    });
    syncCropControls(record);
  }

  function renderPhoto() {
    const record = normalizePhotoRecord(readPhoto());
    const dataUrl = String(record?.dataUrl || '');
    const thumb = document.getElementById('guest-profile-photo-thumb');
    const avatar = document.querySelector('.guest-avatar');
    const live = document.getElementById('guest-profile-live-photo');
    const crop = document.getElementById('guest-profile-crop');
    const cropImage = document.getElementById('guest-profile-crop-image');
    const previewInitials = document.getElementById('preview-initials');

    if (thumb) {
      thumb.innerHTML = dataUrl
        ? `<img src="${dataUrl}" alt="Profile photo preview">`
        : `<span>${initials()}</span>`;
    }
    if (crop) crop.classList.toggle('show', Boolean(dataUrl));
    if (cropImage) {
      if (dataUrl) cropImage.src = dataUrl;
      else cropImage.removeAttribute('src');
    }
    if (avatar && live) {
      if (dataUrl) {
        live.src = dataUrl;
        avatar.classList.add('has-guest-photo');
      } else {
        live.removeAttribute('src');
        avatar.classList.remove('has-guest-photo');
      }
    }
    if (previewInitials && !dataUrl) previewInitials.textContent = initials();
    if (record && dataUrl) applyCrop(record);
  }

  function updateCropFromControls() {
    const record = normalizePhotoRecord(readPhoto());
    if (!record?.dataUrl) return;
    record.positionX = clamp(document.getElementById('guest-profile-position-x')?.value, 0, 100, DEFAULT_POSITION.x);
    record.positionY = clamp(document.getElementById('guest-profile-position-y')?.value, 0, 100, DEFAULT_POSITION.y);
    record.zoom = clamp(document.getElementById('guest-profile-zoom')?.value, 110, 200, DEFAULT_POSITION.zoom);
    record.savedAt = Date.now();
    writePhoto(record);
    applyCrop(record);
  }

  function resetCrop() {
    const record = normalizePhotoRecord(readPhoto());
    if (!record?.dataUrl) return;
    record.positionX = DEFAULT_POSITION.x;
    record.positionY = DEFAULT_POSITION.y;
    record.zoom = DEFAULT_POSITION.zoom;
    record.savedAt = Date.now();
    writePhoto(record);
    applyCrop(record);
  }

  function wireDrag() {
    const stage = document.getElementById('guest-profile-crop-stage');
    if (!stage) return;
    let dragState = null;

    stage.addEventListener('pointerdown', event => {
      const record = normalizePhotoRecord(readPhoto());
      if (!record?.dataUrl) return;
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        positionX: record.positionX,
        positionY: record.positionY
      };
      stage.classList.add('dragging');
      try { stage.setPointerCapture(event.pointerId); } catch (_) {}
      event.preventDefault();
    });

    stage.addEventListener('pointermove', event => {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      const record = normalizePhotoRecord(readPhoto());
      if (!record?.dataUrl) return;
      record.positionX = Math.max(0, Math.min(100, dragState.positionX + ((event.clientX - dragState.startX) / width) * 100));
      record.positionY = Math.max(0, Math.min(100, dragState.positionY + ((event.clientY - dragState.startY) / height) * 100));
      record.savedAt = Date.now();
      writePhoto(record);
      applyCrop(record);
      event.preventDefault();
    });

    const endDrag = event => {
      if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;
      try { stage.releasePointerCapture(dragState.pointerId); } catch (_) {}
      dragState = null;
      stage.classList.remove('dragging');
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that photo.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('That image could not be opened.'));
        image.onload = () => resolve(image);
        image.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  async function compressPhoto(file) {
    const image = await loadImage(file);
    const maxSide = 900;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('This browser could not prepare the photo.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.86);
  }

  async function handleFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    showStatus('Preparing photo…');

    if (!ACCEPTED_TYPES.has(file.type)) {
      input.value = '';
      showStatus('Upload a JPG, PNG, or WebP photo.', 'error');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      input.value = '';
      showStatus('Photo must be smaller than 5 MB.', 'error');
      return;
    }

    try {
      const dataUrl = await compressPhoto(file);
      const saved = writePhoto({
        version: 2,
        savedAt: Date.now(),
        dataUrl,
        originalName: String(file.name || 'guest-profile.jpg'),
        sourceType: file.type,
        positionX: DEFAULT_POSITION.x,
        positionY: DEFAULT_POSITION.y,
        zoom: DEFAULT_POSITION.zoom
      });
      if (!saved) throw new Error('The browser could not save this photo draft. Try a smaller image.');
      renderPhoto();
      showStatus('Photo added. Adjust the crop now — these exact settings will follow your card after signup.', 'success');
    } catch (error) {
      showStatus(error.message || 'Could not prepare that photo.', 'error');
    } finally {
      input.value = '';
    }
  }

  injectUi();
  document.getElementById('guest-profile-file')?.addEventListener('change', handleFile);
  document.getElementById('guest-profile-photo-remove')?.addEventListener('click', () => {
    clearPhoto();
    renderPhoto();
    showStatus('Profile photo removed.', 'success');
  });
  ['guest-profile-position-x', 'guest-profile-position-y', 'guest-profile-zoom'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCropFromControls);
  });
  document.getElementById('guest-profile-crop-reset')?.addEventListener('click', () => {
    resetCrop();
    showStatus('Photo position reset to the LIW default.', 'success');
  });
  document.getElementById('guest-full-name')?.addEventListener('input', () => {
    if (!readPhoto()?.dataUrl) renderPhoto();
  });
  document.getElementById('guest-clear')?.addEventListener('click', () => {
    clearPhoto();
    renderPhoto();
    showStatus('');
  });

  wireDrag();
  renderPhoto();
  if (window.lucide) try { lucide.createIcons(); } catch (_) {}
})();
