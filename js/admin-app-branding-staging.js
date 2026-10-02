(() => {
  if (!window.supabaseClient) return;

  const TABLE = 'staging_app_branding';
  const BUCKET = 'profile-images';
  const fields = [
    { key: 'site_logo_url', input: 'app-branding-site-logo', label: 'Main website logo', help: 'Default LIW Cards logo used when a light/dark-specific version is not set.', kind: 'site-logo', mode: 'original' },
    { key: 'light_background_logo_url', input: 'app-branding-light-logo', label: 'Light-background logo', help: 'Use a transparent logo made for white or light backgrounds.', kind: 'light-logo', mode: 'original' },
    { key: 'dark_background_logo_url', input: 'app-branding-dark-logo', label: 'Dark-background logo', help: 'Use a transparent logo made for navy, black, or other dark backgrounds.', kind: 'dark-logo', mode: 'original' },
    { key: 'favicon_url', input: 'app-branding-favicon', label: 'Browser favicon', help: 'One upload is converted to a clean 64×64 PNG.', kind: 'favicon', mode: 'square', size: 64 },
    { key: 'pwa_icon_url', input: 'app-branding-pwa-icon', label: 'PWA / app icon', help: 'One square image creates both 192×192 and 512×512 install icons.', kind: 'pwa', mode: 'pwa' },
    { key: 'apple_touch_icon_url', input: 'app-branding-apple-icon', label: 'Apple home-screen icon', help: 'Converted to a 180×180 PNG for iPhone/iPad home-screen installs.', kind: 'apple', mode: 'square', size: 180 }
  ];

  let current = {};
  let user = null;
  const cleared = new Set();

  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function injectPanel() {
    if (document.getElementById('admin-app-branding-panel')) { bind(); if (window.lucide) window.lucide.createIcons(); return; }

    const sidebarNav = document.querySelector('#sidebar nav');
    if (sidebarNav && !sidebarNav.querySelector('a[href="#admin-app-branding-panel"]')) {
      const link = document.createElement('a');
      link.href = '#admin-app-branding-panel';
      link.innerHTML = '<i data-lucide="image-up" size="18"></i> Web app branding';
      const whiteLabel = sidebarNav.querySelector('a[href="#admin-white-label-panel"]');
      (whiteLabel || sidebarNav.lastElementChild)?.insertAdjacentElement(whiteLabel ? 'beforebegin' : 'beforebegin', link);
    }

    const panel = document.createElement('section');
    panel.className = 'card admin-panel admin-support-panel admin-app-branding-panel';
    panel.id = 'admin-app-branding-panel';
    panel.innerHTML = `
      <div class="section-title admin-section-title">
        <div>
          <span class="eyebrow">Super Admin · staging only</span>
          <h2>Web app branding</h2>
          <p class="muted">Change LIW Cards platform logos and install icons without touching customer cards. These controls affect staging only.</p>
        </div>
        <span class="status-pill trialing" id="app-branding-status">Staging branding</span>
      </div>

      <div class="app-branding-safety">
        <i data-lucide="shield-check"></i>
        <div><strong>Production is protected.</strong><span>Nothing saved here changes cards.liwworgs.com or individual card/profile images.</span></div>
      </div>

      <div class="app-branding-layout">
        <form id="admin-app-branding-form" class="app-branding-form">
          <div class="app-branding-upload-grid">
            ${fields.map(field => `
              <article class="app-branding-upload-card" data-brand-field="${field.key}">
                <div class="app-branding-upload-copy">
                  <strong>${esc(field.label)}</strong>
                  <span>${esc(field.help)}</span>
                </div>
                <div class="app-branding-current" id="${field.input}-current">
                  <div class="app-branding-thumb"><span>No custom image</span></div>
                  <div class="app-branding-current-copy"><small>Current</small><strong>LIW default</strong></div>
                </div>
                <label class="app-branding-file-button">
                  <i data-lucide="upload" size="16"></i>
                  Choose image
                  <input id="${field.input}" type="file" accept="image/*"/>
                </label>
                <button class="btn btn-light btn-sm app-branding-default-button" type="button" data-clear-brand="${field.key}">
                  <i data-lucide="rotate-ccw" size="15"></i> Use LIW default
                </button>
              </article>`).join('')}
          </div>

          <div class="app-branding-actions">
            <div>
              <strong>Changes apply across staging after save.</strong>
              <span>Existing installed PWAs may need to be removed and reinstalled before the phone refreshes its home-screen icon.</span>
            </div>
            <div class="app-branding-action-buttons">
              <button class="btn btn-light" type="button" id="admin-app-branding-reset"><i data-lucide="rotate-ccw"></i> Reset all</button>
              <button class="btn btn-primary" type="submit" id="admin-app-branding-save"><i data-lucide="save"></i> Save web app branding</button>
            </div>
          </div>
        </form>

        <aside class="app-branding-preview">
          <span class="workspace-preview-label">Live branding preview</span>
          <div class="app-branding-preview-row light">
            <span>Light background</span>
            <div id="app-branding-preview-light" class="app-branding-logo-preview">LIW Cards</div>
          </div>
          <div class="app-branding-preview-row dark">
            <span>Dark background</span>
            <div id="app-branding-preview-dark" class="app-branding-logo-preview">LIW Cards</div>
          </div>
          <div class="app-branding-icon-preview-grid">
            <div><span>Favicon</span><div id="app-branding-preview-favicon" class="app-branding-icon-preview">LIW</div></div>
            <div><span>App icon</span><div id="app-branding-preview-pwa" class="app-branding-icon-preview large">LIW</div></div>
            <div><span>Apple</span><div id="app-branding-preview-apple" class="app-branding-icon-preview">LIW</div></div>
          </div>
        </aside>
      </div>
    `;

    const whiteLabelPanel = document.getElementById('admin-white-label-panel');
    const featurePanel = document.querySelector('.admin-feature-access');
    if (whiteLabelPanel) whiteLabelPanel.insertAdjacentElement('beforebegin', panel);
    else if (featurePanel) featurePanel.insertAdjacentElement('beforebegin', panel);
    else document.querySelector('main.main')?.appendChild(panel);

    bind();
    if (window.lucide) window.lucide.createIcons();
  }

  function resolvedUrl(field) {
    if (cleared.has(field.key)) return '';
    const file = document.getElementById(field.input)?.files?.[0];
    if (file) return URL.createObjectURL(file);
    if (field.key === 'pwa_icon_url') return current.pwa_icon_512_url || current.pwa_icon_url || '';
    return current[field.key] || '';
  }

  function renderPreviewImage(targetId, url, fallback = 'LIW Cards') {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = url ? `<img src="${esc(url)}" alt="">` : `<span>${esc(fallback)}</span>`;
  }

  function refreshPreview() {
    const site = resolvedUrl(fields[0]);
    const light = resolvedUrl(fields[1]) || site;
    const dark = resolvedUrl(fields[2]) || site;
    const favicon = resolvedUrl(fields[3]) || resolvedUrl(fields[4]);
    const pwa = resolvedUrl(fields[4]) || favicon;
    const apple = resolvedUrl(fields[5]) || pwa;

    renderPreviewImage('app-branding-preview-light', light);
    renderPreviewImage('app-branding-preview-dark', dark);
    renderPreviewImage('app-branding-preview-favicon', favicon, 'LIW');
    renderPreviewImage('app-branding-preview-pwa', pwa, 'LIW');
    renderPreviewImage('app-branding-preview-apple', apple, 'LIW');

    fields.forEach(field => {
      const block = document.getElementById(`${field.input}-current`);
      if (!block) return;
      const url = field.key === 'pwa_icon_url'
        ? (cleared.has(field.key) ? '' : (current.pwa_icon_512_url || current.pwa_icon_url || ''))
        : (cleared.has(field.key) ? '' : (current[field.key] || ''));
      const chosen = document.getElementById(field.input)?.files?.[0];
      const thumb = block.querySelector('.app-branding-thumb');
      const text = block.querySelector('.app-branding-current-copy strong');
      if (chosen) {
        const temp = URL.createObjectURL(chosen);
        thumb.innerHTML = `<img src="${esc(temp)}" alt="">`;
        text.textContent = 'New image selected';
      } else if (url) {
        thumb.innerHTML = `<img src="${esc(url)}" alt="">`;
        text.textContent = 'Custom image';
      } else {
        thumb.innerHTML = '<span>No custom image</span>';
        text.textContent = 'LIW default';
      }
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unable to read that image.')); };
      img.src = url;
    });
  }

  async function squarePng(file, size) {
    const image = await loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const ratio = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    const width = Math.round(image.naturalWidth * ratio);
    const height = Math.round(image.naturalHeight * ratio);
    ctx.drawImage(image, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.96));
    if (!blob) throw new Error('Unable to prepare the icon.');
    return new File([blob], `liw-${size}.png`, { type: 'image/png' });
  }

  async function upload(file, kind, extOverride = '') {
    if (!file) return null;
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 6 * 1024 * 1024) throw new Error('Each source image must be smaller than 6 MB.');
    const ext = extOverride || ((file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png');
    const path = `${user.id}/staging-app-branding/${kind}-${Date.now()}.${ext}`;
    const { error } = await window.supabaseClient.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = window.supabaseClient.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function prepareAndUpload(field, file) {
    if (!file) return {};
    if (field.mode === 'original') return { [field.key]: await upload(file, field.kind) };
    if (field.mode === 'square') {
      const png = await squarePng(file, field.size);
      return { [field.key]: await upload(png, field.kind, 'png') };
    }
    if (field.mode === 'pwa') {
      const icon192 = await squarePng(file, 192);
      const icon512 = await squarePng(file, 512);
      const [url192, url512] = await Promise.all([
        upload(icon192, 'pwa-192', 'png'),
        upload(icon512, 'pwa-512', 'png')
      ]);
      return {
        pwa_icon_url: url512,
        pwa_icon_192_url: url192,
        pwa_icon_512_url: url512
      };
    }
    return {};
  }

  function setBusy(button, busy, text) {
    if (!button) return;
    if (busy) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.textContent = text;
    } else {
      button.disabled = false;
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
  }

  async function load() {
    const auth = await window.supabaseClient.auth.getUser();
    user = auth.data?.user || null;
    if (!user) return;

    const { data, error } = await window.supabaseClient
      .from(TABLE)
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

    if (error) {
      toast(error.message || 'Unable to load staging app branding.');
      return;
    }
    current = data || {};
    refreshPreview();
  }

  async function save(event) {
    event.preventDefault();
    if (!user) return toast('Admin session is unavailable.');
    const button = document.getElementById('admin-app-branding-save');
    setBusy(button, true, 'Saving…');

    try {
      const payload = {
        id: 'global',
        site_logo_url: cleared.has('site_logo_url') ? null : (current.site_logo_url || null),
        light_background_logo_url: cleared.has('light_background_logo_url') ? null : (current.light_background_logo_url || null),
        dark_background_logo_url: cleared.has('dark_background_logo_url') ? null : (current.dark_background_logo_url || null),
        favicon_url: cleared.has('favicon_url') ? null : (current.favicon_url || null),
        pwa_icon_url: cleared.has('pwa_icon_url') ? null : (current.pwa_icon_url || null),
        pwa_icon_192_url: cleared.has('pwa_icon_url') ? null : (current.pwa_icon_192_url || null),
        pwa_icon_512_url: cleared.has('pwa_icon_url') ? null : (current.pwa_icon_512_url || null),
        apple_touch_icon_url: cleared.has('apple_touch_icon_url') ? null : (current.apple_touch_icon_url || null),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      for (const field of fields) {
        const file = document.getElementById(field.input)?.files?.[0] || null;
        if (!file) continue;
        Object.assign(payload, await prepareAndUpload(field, file));
      }

      const { data, error } = await window.supabaseClient
        .from(TABLE)
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;

      current = data || payload;
      cleared.clear();
      fields.forEach(field => {
        const input = document.getElementById(field.input);
        if (input) input.value = '';
      });
      refreshPreview();
      window.dispatchEvent(new CustomEvent('liw:staging-app-branding-updated', { detail: current }));
      toast('Staging web app branding saved.');
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      toast(error.message || 'Unable to save web app branding.');
    } finally {
      setBusy(button, false);
    }
  }

  async function resetAll() {
    if (!confirm('Reset every staging web app logo and icon back to the LIW defaults in the repo?')) return;
    fields.forEach(field => cleared.add(field.key));
    refreshPreview();
    const form = document.getElementById('admin-app-branding-form');
    if (!form) return;
    await save({ preventDefault() {}, currentTarget: form });
  }

  function bind() {
    const form = document.getElementById('admin-app-branding-form');
    form?.addEventListener('submit', save);

    fields.forEach(field => {
      document.getElementById(field.input)?.addEventListener('change', () => {
        cleared.delete(field.key);
        refreshPreview();
      });
    });

    document.querySelectorAll('[data-clear-brand]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.clearBrand;
        cleared.add(key);
        const field = fields.find(item => item.key === key);
        const input = field ? document.getElementById(field.input) : null;
        if (input) input.value = '';
        refreshPreview();
        toast('This item will use the LIW default after you save.');
      });
    });

    document.getElementById('admin-app-branding-reset')?.addEventListener('click', resetAll);
  }

  injectPanel();
  load();
})();