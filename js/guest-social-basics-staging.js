(() => {
  const DRAFT_KEY = 'liw_guest_card_draft_v1';
  const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x'];
  const META = {
    facebook: { label: 'Facebook', placeholder: 'facebook.com/yourpage' },
    instagram: { label: 'Instagram', placeholder: '@yourname' },
    tiktok: { label: 'TikTok', placeholder: '@yourname' },
    youtube: { label: 'YouTube', placeholder: '@yourchannel' },
    linkedin: { label: 'LinkedIn', placeholder: 'linkedin.com/in/yourname' },
    x: { label: 'X', placeholder: '@yourname' }
  };

  function text(value) {
    return String(value || '').trim();
  }

  function injectStyles() {
    if (document.getElementById('guest-social-basics-styles')) return;
    const style = document.createElement('style');
    style.id = 'guest-social-basics-styles';
    style.textContent = `
      /* True-center the holder itself. Crop x/y/zoom and image transforms remain untouched. */
      .guest-avatar{position:relative!important;left:50%!important;transform:translateX(-50%)!important;margin-left:0!important;margin-right:0!important}
      .guest-social-block{grid-column:1/-1;margin-top:2px;padding-top:4px}
      .guest-social-block-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:2px 0 10px}
      .guest-social-block-head strong{display:block;font-size:.84rem;color:#344054}
      .guest-social-block-head span{display:block;margin-top:3px;color:#8992a3;font-size:.75rem;line-height:1.4}
      .guest-social-limit{flex:0 0 auto;border-radius:999px;background:#eef3ff;color:#49679f;padding:6px 9px;font-size:.65rem!important;font-weight:900;letter-spacing:.02em;white-space:nowrap}
      .guest-social-picker{display:grid;gap:10px}
      .guest-social-slot{display:grid;grid-template-columns:minmax(132px,.78fr) minmax(0,1.22fr);gap:9px;align-items:center}
      .guest-social-slot select,.guest-social-slot input{width:100%;min-width:0;min-height:46px;border:1px solid #d8dde5;border-radius:13px;padding:11px 12px;font:inherit;font-size:.88rem;color:#1f2937;background:#fff;outline:none;transition:border-color .18s,box-shadow .18s}
      .guest-social-slot select:focus,.guest-social-slot input:focus{border-color:#7189c5;box-shadow:0 0 0 3px rgba(59,86,153,.12)}
      .guest-social-slot input:disabled{background:#f7f8fa;color:#98a2b3;cursor:not-allowed}
      .guest-social-slot-label{display:none}
      .guest-social-helper{margin-top:8px!important;font-size:.72rem!important;color:#8a94a5!important}
      @media(max-width:620px){
        .guest-social-slot{grid-template-columns:1fr}
        .guest-social-block-head{align-items:flex-start}
        .guest-social-limit{margin-top:0!important}
        .guest-social-slot select,.guest-social-slot input{font-size:16px;min-height:48px}
      }
    `;
    document.head.appendChild(style);
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function displayValue(platform, value) {
    const raw = text(value);
    if (!raw) return '';
    if (platform === 'facebook') return raw.replace(/^https?:\/\/(www\.)?facebook\.com\//i, '');
    if (platform === 'instagram') return raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '@');
    if (platform === 'tiktok') return raw.replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, '@');
    if (platform === 'youtube') return raw.replace(/^https?:\/\/(www\.)?youtube\.com\/@?/i, '@');
    if (platform === 'x') return raw.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '@');
    return raw;
  }

  function storageInput(platform) {
    return document.getElementById(`guest-${platform}`);
  }

  function ensureStorageInputs() {
    const instagram = document.getElementById('guest-instagram');
    const linkedin = document.getElementById('guest-linkedin');
    const website = document.getElementById('guest-website');
    const instagramField = instagram?.closest('.guest-field');
    const linkedinField = linkedin?.closest('.guest-field');
    const websiteField = website?.closest('.guest-field');
    if (!instagram || !linkedin || !websiteField || !instagramField || !linkedinField) return null;

    const storage = document.createElement('div');
    storage.id = 'guest-social-storage';
    storage.hidden = true;
    instagram.type = 'hidden';
    linkedin.type = 'hidden';
    storage.appendChild(instagram);
    storage.appendChild(linkedin);
    instagramField.remove();
    linkedinField.remove();

    PLATFORMS.forEach(platform => {
      if (storageInput(platform)) return;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.id = `guest-${platform}`;
      storage.appendChild(input);
    });
    websiteField.insertAdjacentElement('afterend', storage);
    return { storage, websiteField };
  }

  function optionsHtml() {
    return ['<option value="">Choose platform</option>', ...PLATFORMS.map(platform => `<option value="${platform}">${META[platform].label}</option>`)].join('');
  }

  function slotHtml(index) {
    return `
      <div class="guest-social-slot" data-guest-social-slot="${index}">
        <span class="guest-social-slot-label">Social ${index}</span>
        <select id="guest-social-select-${index}" aria-label="Choose social platform ${index}">${optionsHtml()}</select>
        <input id="guest-social-value-${index}" aria-label="Social profile ${index}" placeholder="Choose a platform first" disabled autocomplete="off" autocapitalize="off" spellcheck="false"/>
      </div>`;
  }

  function buildPicker() {
    if (document.getElementById('guest-social-basics')) return true;
    const prepared = ensureStorageInputs();
    if (!prepared) return false;

    const block = document.createElement('div');
    block.className = 'guest-social-block';
    block.id = 'guest-social-basics';
    block.innerHTML = `
      <div class="guest-social-block-head">
        <div><strong>Social media</strong><span>Choose the two platforms that matter most to you.</span></div>
        <span class="guest-social-limit">PICK UP TO 2</span>
      </div>
      <div class="guest-social-picker">${slotHtml(1)}${slotHtml(2)}</div>
      <p class="guest-social-helper">Optional. One, two, or none is completely fine.</p>`;
    prepared.storage.insertAdjacentElement('afterend', block);
    return true;
  }

  function row(index) {
    return {
      select: document.getElementById(`guest-social-select-${index}`),
      input: document.getElementById(`guest-social-value-${index}`)
    };
  }

  function updateRow(index) {
    const current = row(index);
    if (!current.select || !current.input) return;
    const platform = current.select.value;
    current.input.disabled = !platform;
    current.input.placeholder = platform ? META[platform].placeholder : 'Choose a platform first';
  }

  function selectedPlatforms() {
    return [row(1).select?.value, row(2).select?.value].filter(Boolean);
  }

  function updateDuplicateOptions() {
    const selected = selectedPlatforms();
    [1, 2].forEach(index => {
      const select = row(index).select;
      if (!select) return;
      [...select.options].forEach(option => {
        if (!option.value) return;
        option.disabled = selected.includes(option.value) && select.value !== option.value;
      });
      updateRow(index);
    });
  }

  function clearStorage() {
    PLATFORMS.forEach(platform => {
      const input = storageInput(platform);
      if (input) input.value = '';
    });
  }

  function syncStorage({ notify = true } = {}) {
    clearStorage();
    [1, 2].forEach(index => {
      const current = row(index);
      const platform = current.select?.value || '';
      const value = text(current.input?.value);
      const hidden = storageInput(platform);
      if (platform && hidden && value) hidden.value = value;
    });
    updateDuplicateOptions();

    if (notify) {
      const trigger = storageInput('instagram') || storageInput('linkedin');
      trigger?.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function restorePicker() {
    const links = Array.isArray(readDraft()?.socialLinks) ? readDraft().socialLinks : [];
    const unique = [];
    links.forEach(link => {
      const platform = String(link?.platform || '').toLowerCase();
      if (!PLATFORMS.includes(platform) || unique.some(item => item.platform === platform)) return;
      unique.push({ platform, url: link.url || '' });
    });

    [1, 2].forEach(index => {
      const current = row(index);
      const saved = unique[index - 1] || null;
      if (!current.select || !current.input) return;
      current.select.value = saved?.platform || '';
      current.input.value = saved ? displayValue(saved.platform, saved.url) : '';
      updateRow(index);
    });
    syncStorage({ notify: true });
  }

  function wirePicker() {
    [1, 2].forEach(index => {
      const current = row(index);
      current.select?.addEventListener('change', () => {
        const otherIndex = index === 1 ? 2 : 1;
        const other = row(otherIndex);
        if (current.select.value && current.select.value === other.select?.value) {
          other.select.value = '';
          if (other.input) other.input.value = '';
        }
        if (current.input) current.input.value = '';
        updateRow(index);
        updateRow(otherIndex);
        syncStorage({ notify: true });
        current.input?.focus();
      });
      current.input?.addEventListener('input', () => syncStorage({ notify: true }));
    });
  }

  function clearPicker() {
    [1, 2].forEach(index => {
      const current = row(index);
      if (current.select) current.select.value = '';
      if (current.input) current.input.value = '';
      updateRow(index);
    });
    syncStorage({ notify: true });
  }

  injectStyles();
  if (!buildPicker()) return;
  wirePicker();
  restorePicker();

  document.addEventListener('click', event => {
    if (!event.target.closest('#guest-clear')) return;
    window.setTimeout(clearPicker, 0);
  });
})();
