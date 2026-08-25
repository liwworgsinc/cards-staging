(() => {
  const PHOTO_KEY = 'liw_guest_profile_photo_v1';
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
      .guest-profile-photo-thumb img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
      .guest-profile-photo-copy{min-width:0}.guest-profile-photo-copy strong{display:block;font-size:.9rem}.guest-profile-photo-copy p{margin:3px 0 10px!important;font-size:.78rem!important;line-height:1.4;color:#7a8495!important}
      .guest-profile-photo-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.guest-profile-photo-actions .btn{min-height:38px}.guest-profile-photo-remove{border:0;background:transparent;color:#667085;font:inherit;font-size:.78rem;font-weight:800;padding:8px;cursor:pointer}
      .guest-profile-photo-status{grid-column:1/-1;display:none;border-radius:11px;padding:9px 10px;font-size:.76rem;font-weight:750;line-height:1.35}.guest-profile-photo-status.show{display:block}.guest-profile-photo-status.error{background:#fff1f0;color:#9d332d}.guest-profile-photo-status.success{background:#effaf2;color:#28623a}
      .guest-avatar{position:relative}.guest-avatar .guest-profile-live-photo{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover;object-position:center;display:none}.guest-avatar.has-guest-photo .guest-profile-live-photo{display:block}.guest-avatar.has-guest-photo #preview-initials{visibility:hidden}
      @media(max-width:620px){.guest-profile-photo-upload{grid-template-columns:66px minmax(0,1fr);padding:12px;gap:12px}.guest-profile-photo-thumb{width:66px;height:66px}.guest-profile-photo-actions{gap:5px}.guest-profile-photo-actions .btn{min-height:36px;padding-left:10px;padding-right:10px}}
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
      <div class="guest-profile-photo-status" id="guest-profile-photo-status" role="status" aria-live="polite"></div>`;
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

  function renderPhoto() {
    const record = readPhoto();
    const dataUrl = String(record?.dataUrl || '');
    const thumb = document.getElementById('guest-profile-photo-thumb');
    const avatar = document.querySelector('.guest-avatar');
    const live = document.getElementById('guest-profile-live-photo');
    const previewInitials = document.getElementById('preview-initials');

    if (thumb) {
      thumb.innerHTML = dataUrl
        ? `<img src="${dataUrl}" alt="Profile photo preview">`
        : `<span>${initials()}</span>`;
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
        version: 1,
        savedAt: Date.now(),
        dataUrl,
        originalName: String(file.name || 'guest-profile.jpg'),
        sourceType: file.type,
        positionX: 50,
        positionY: 50,
        zoom: 110
      });
      if (!saved) throw new Error('The browser could not save this photo draft. Try a smaller image.');
      renderPhoto();
      showStatus('Photo added to your guest card and saved in this browser.', 'success');
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
  document.getElementById('guest-full-name')?.addEventListener('input', () => {
    if (!readPhoto()?.dataUrl) renderPhoto();
  });
  document.getElementById('guest-clear')?.addEventListener('click', () => {
    clearPhoto();
    renderPhoto();
    showStatus('');
  });

  renderPhoto();
  if (window.lucide) try { lucide.createIcons(); } catch (_) {}
})();
