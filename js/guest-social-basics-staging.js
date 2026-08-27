(() => {
  const DRAFT_KEY = 'liw_guest_card_draft_v1';
  const PLATFORM_ORDER = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x'];
  const EXTRA_PLATFORMS = ['facebook', 'tiktok', 'youtube', 'x'];
  const LABELS = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    linkedin: 'LinkedIn',
    x: 'X'
  };

  function text(value) {
    return String(value || '').trim();
  }

  function injectStyles() {
    if (document.getElementById('guest-social-basics-styles')) return;
    const style = document.createElement('style');
    style.id = 'guest-social-basics-styles';
    style.textContent = `
      /* Center only the visible card avatar holder. Crop x/y/zoom math is untouched. */
      .guest-avatar{margin-left:auto!important;margin-right:auto!important}
      .guest-social-block{grid-column:1/-1;margin-top:2px;padding-top:4px}
      .guest-social-block-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:2px 0 10px}
      .guest-social-block-head strong{display:block;font-size:.84rem;color:#344054}
      .guest-social-block-head span{display:block;margin-top:3px;color:#8992a3;font-size:.75rem;line-height:1.4}
      .guest-social-optional{flex:0 0 auto;border-radius:999px;background:#f2f4f7;color:#667085;padding:5px 8px;font-size:.66rem!important;font-weight:850;letter-spacing:.02em}
      .guest-social-input-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .guest-social-input-grid .guest-field{min-width:0}
      .guest-social-input-grid .guest-field label{display:flex;align-items:center;gap:6px}
      .guest-social-input-grid .guest-field label:after{content:'optional';font-size:.61rem;font-weight:750;color:#98a2b3;text-transform:uppercase;letter-spacing:.04em}
      @media(max-width:620px){.guest-social-input-grid{grid-template-columns:1fr}.guest-social-block-head{align-items:center}.guest-social-optional{display:none}}
    `;
    document.head.appendChild(style);
  }

  function makeField(platform, placeholder) {
    const field = document.createElement('div');
    field.className = 'guest-field';
    field.dataset.guestSocialPlatform = platform;
    field.innerHTML = `<label for="guest-${platform}">${LABELS[platform]}</label><input id="guest-${platform}" inputmode="url" placeholder="${placeholder}" autocomplete="off"/>`;
    return field;
  }

  function buildSocialBlock() {
    if (document.getElementById('guest-social-basics')) return;
    const instagram = document.getElementById('guest-instagram');
    const linkedin = document.getElementById('guest-linkedin');
    const website = document.getElementById('guest-website');
    const grid = website?.closest('.guest-grid');
    if (!instagram || !linkedin || !website || !grid) return;

    const instagramField = instagram.closest('.guest-field');
    const linkedinField = linkedin.closest('.guest-field');
    if (!instagramField || !linkedinField) return;

    instagramField.dataset.guestSocialPlatform = 'instagram';
    linkedinField.dataset.guestSocialPlatform = 'linkedin';
    instagram.placeholder = '@yourname';
    linkedin.placeholder = 'linkedin.com/in/yourname';

    const block = document.createElement('div');
    block.className = 'guest-social-block';
    block.id = 'guest-social-basics';
    block.innerHTML = `
      <div class="guest-social-block-head">
        <div><strong>Social media</strong><span>Add only the platforms you actually use. You can leave every one blank.</span></div>
        <span class="guest-social-optional">OPTIONAL</span>
      </div>
      <div class="guest-social-input-grid" id="guest-social-input-grid"></div>`;

    linkedinField.insertAdjacentElement('afterend', block);
    const socialGrid = block.querySelector('#guest-social-input-grid');
    socialGrid.appendChild(makeField('facebook', 'facebook.com/yourpage'));
    socialGrid.appendChild(instagramField);
    socialGrid.appendChild(makeField('tiktok', '@yourname'));
    socialGrid.appendChild(makeField('youtube', '@yourchannel'));
    socialGrid.appendChild(linkedinField);
    socialGrid.appendChild(makeField('x', '@yourname'));
  }

  function ensureUrl(value) {
    const raw = text(value);
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, '')}`;
  }

  function platformUrl(platform, value) {
    const raw = text(value);
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (platform === 'facebook') return `https://facebook.com/${raw.replace(/^@/, '')}`;
    if (platform === 'instagram') return `https://instagram.com/${raw.replace(/^@/, '')}`;
    if (platform === 'tiktok') return `https://tiktok.com/@${raw.replace(/^@/, '')}`;
    if (platform === 'youtube') return `https://youtube.com/@${raw.replace(/^@/, '')}`;
    if (platform === 'linkedin') {
      if (/linkedin\.com/i.test(raw)) return ensureUrl(raw);
      return `https://linkedin.com/in/${raw.replace(/^@/, '')}`;
    }
    if (platform === 'x') return `https://x.com/${raw.replace(/^@/, '')}`;
    return ensureUrl(raw);
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function restoreExtraFields() {
    const draft = readDraft();
    const links = Array.isArray(draft?.socialLinks) ? draft.socialLinks : [];
    EXTRA_PLATFORMS.forEach(platform => {
      const input = document.getElementById(`guest-${platform}`);
      if (!input || input.value) return;
      input.value = links.find(link => String(link?.platform || '').toLowerCase() === platform)?.url || '';
    });
  }

  function extraLinks() {
    return EXTRA_PLATFORMS.map(platform => {
      const input = document.getElementById(`guest-${platform}`);
      const url = platformUrl(platform, input?.value);
      return url ? { platform, url } : null;
    }).filter(Boolean);
  }

  function patchDraftExtras() {
    try {
      const draft = readDraft();
      if (!draft?.card) return;
      const existing = Array.isArray(draft.socialLinks) ? draft.socialLinks : [];
      draft.socialLinks = [
        ...existing.filter(link => !EXTRA_PLATFORMS.includes(String(link?.platform || '').toLowerCase())),
        ...extraLinks()
      ];
      draft.savedAt = Date.now();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (_) {}
  }

  function renderExtraSocials() {
    const area = document.getElementById('preview-socials');
    if (!area) return;
    area.querySelectorAll('[data-guest-extra-social]').forEach(node => node.remove());
    extraLinks().forEach(link => {
      const item = document.createElement('span');
      item.className = 'guest-social-chip';
      item.dataset.guestExtraSocial = link.platform;
      const icon = typeof window.socialIconHtml === 'function'
        ? window.socialIconHtml(link.platform, { size: 13, title: false })
        : `<i data-lucide="link" size="13"></i>`;
      item.innerHTML = `${icon}<span>${LABELS[link.platform]}</span>`;
      area.appendChild(item);
    });
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  function syncAfterBaseRender() {
    patchDraftExtras();
    renderExtraSocials();
  }

  function clearExtras() {
    EXTRA_PLATFORMS.forEach(platform => {
      const input = document.getElementById(`guest-${platform}`);
      if (input) input.value = '';
    });
  }

  injectStyles();
  buildSocialBlock();
  restoreExtraFields();
  syncAfterBaseRender();

  document.addEventListener('input', () => {
    window.setTimeout(syncAfterBaseRender, 0);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('#guest-clear')) {
      window.setTimeout(() => {
        clearExtras();
        syncAfterBaseRender();
      }, 0);
      return;
    }
    if (event.target.closest('.guest-color')) window.setTimeout(renderExtraSocials, 0);
  });

  // The brand-icon bundle loads asynchronously in guest mode; refresh once it is likely ready.
  window.setTimeout(renderExtraSocials, 450);
  window.setTimeout(renderExtraSocials, 1200);
})();
