(() => {
  const PHOTO_KEY = 'liw_guest_profile_photo_v1';

  function hasGuestPhoto() {
    try {
      const raw = localStorage.getItem(PHOTO_KEY);
      const record = raw ? JSON.parse(raw) : null;
      return Boolean(String(record?.dataUrl || ''));
    } catch (_) {
      return false;
    }
  }

  function placeholderMarkup() {
    return `
      <span class="guest-photo-placeholder-visual" aria-hidden="true">
        <svg class="guest-photo-placeholder-person" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="3.25"></circle>
          <path d="M5.75 19c.7-3.25 3.08-5.1 6.25-5.1s5.55 1.85 6.25 5.1"></path>
        </svg>
        <span class="guest-photo-placeholder-camera">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 8.5h2.2l1.15-1.8h7.3l1.15 1.8H19a2 2 0 0 1 2 2v6.25a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V10.5a2 2 0 0 1 2-2Z"></path>
            <circle cx="12" cy="13.4" r="3"></circle>
          </svg>
        </span>
      </span>`;
  }

  function injectStyles() {
    if (document.getElementById('guest-photo-placeholder-styles')) return;
    const style = document.createElement('style');
    style.id = 'guest-photo-placeholder-styles';
    style.textContent = `
      .guest-photo-placeholder-visual{position:relative;width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#f3f5f8,#e7ebf1);color:#6f7b8f}
      .guest-photo-placeholder-person{width:42%;height:42%;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .guest-photo-placeholder-camera{position:absolute;right:7%;bottom:7%;width:31%;height:31%;border-radius:50%;display:grid;place-items:center;background:#fff;color:#0b1438;box-shadow:0 2px 8px rgba(15,23,42,.16)}
      .guest-photo-placeholder-camera svg{width:58%;height:58%;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
      #preview-initials:has(.guest-photo-placeholder-visual){font-size:0!important;letter-spacing:0!important;background:transparent!important}
      #guest-profile-photo-thumb:has(.guest-photo-placeholder-visual){font-size:0!important;background:transparent!important}
    `;
    document.head.appendChild(style);
  }

  function syncPlaceholder() {
    const photoExists = hasGuestPhoto();
    const preview = document.getElementById('preview-initials');
    const thumb = document.getElementById('guest-profile-photo-thumb');

    if (!photoExists && preview && !preview.querySelector('.guest-photo-placeholder-visual')) {
      preview.innerHTML = placeholderMarkup();
    }
    if (!photoExists && thumb && !thumb.querySelector('img') && !thumb.querySelector('.guest-photo-placeholder-visual')) {
      thumb.innerHTML = placeholderMarkup();
    }
  }

  injectStyles();
  syncPlaceholder();

  const observe = node => {
    if (!node) return;
    new MutationObserver(() => window.setTimeout(syncPlaceholder, 0)).observe(node, { childList: true, subtree: true });
  };
  observe(document.getElementById('preview-initials'));

  document.addEventListener('input', event => {
    if (event.target.closest('#guest-full-name')) window.setTimeout(syncPlaceholder, 0);
  });
  document.addEventListener('click', event => {
    if (event.target.closest('#guest-profile-photo-remove,#guest-clear')) {
      window.setTimeout(syncPlaceholder, 60);
      window.setTimeout(syncPlaceholder, 250);
    }
  });
  document.addEventListener('change', event => {
    if (event.target.closest('#guest-profile-file')) window.setTimeout(syncPlaceholder, 350);
  });

  window.setTimeout(() => {
    syncPlaceholder();
    observe(document.getElementById('guest-profile-photo-thumb'));
  }, 250);
  window.setTimeout(syncPlaceholder, 800);
})();