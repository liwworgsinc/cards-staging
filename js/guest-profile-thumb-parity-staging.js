(() => {
  const PHOTO_KEY = 'liw_guest_profile_photo_v1';
  const DEFAULTS = { x: 50, y: 22, zoom: 125 };
  let lastSignature = '';

  const clamp = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  };

  function readPhoto() {
    try {
      const raw = localStorage.getItem(PHOTO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function normalize(record) {
    if (!record?.dataUrl) return null;
    return {
      ...record,
      positionX: clamp(record.positionX, 0, 100, DEFAULTS.x),
      positionY: clamp(record.positionY, 0, 100, DEFAULTS.y),
      zoom: clamp(record.zoom, 110, 200, DEFAULTS.zoom)
    };
  }

  function transformFor(record) {
    const zoom = Math.max(1.1, Math.min(2, Number(record.zoom) / 100));
    const maxTranslate = ((zoom - 1) / (2 * zoom)) * 100;
    const tx = ((record.positionX - 50) / 50) * maxTranslate;
    const ty = ((record.positionY - 50) / 50) * maxTranslate;
    return `scale(${zoom}) translate(${tx}%, ${ty}%)`;
  }

  function injectStyles() {
    if (document.getElementById('guest-profile-thumb-parity-styles')) return;
    const style = document.createElement('style');
    style.id = 'guest-profile-thumb-parity-styles';
    style.textContent = `
      #guest-profile-photo-thumb{position:relative!important;overflow:hidden!important;display:block!important}
      #guest-profile-photo-thumb img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;object-position:50% 50%!important;transform-origin:center center!important;margin:0!important;padding:0!important;max-width:none!important}
    `;
    document.head.appendChild(style);
  }

  function ensureThumbImage(record) {
    const thumb = document.getElementById('guest-profile-photo-thumb');
    if (!thumb || !record?.dataUrl) return null;
    let image = thumb.querySelector('img');
    if (!image) {
      thumb.innerHTML = '';
      image = document.createElement('img');
      image.alt = 'Profile photo preview';
      thumb.appendChild(image);
    }
    if (image.src !== record.dataUrl) image.src = record.dataUrl;
    return image;
  }

  function syncSurfaces(force = false) {
    injectStyles();
    const record = normalize(readPhoto());
    const signature = record
      ? `${record.savedAt || 0}|${record.positionX}|${record.positionY}|${record.zoom}|${record.dataUrl.length}`
      : 'none';
    if (!force && signature === lastSignature) return;
    lastSignature = signature;

    if (!record) return;
    const transform = transformFor(record);
    const thumbImage = ensureThumbImage(record);
    const liveImage = document.getElementById('guest-profile-live-photo');
    const premiumImage = document.getElementById('guest-photo-premium-image');

    [thumbImage, liveImage, premiumImage].forEach(image => {
      if (!image) return;
      if (image.src !== record.dataUrl) image.src = record.dataUrl;
      image.style.objectPosition = '50% 50%';
      image.style.transformOrigin = 'center center';
      image.style.transform = transform;
    });
  }

  document.addEventListener('input', event => {
    if (event.target?.matches?.('#guest-profile-position-x,#guest-profile-position-y,#guest-profile-zoom,#guest-photo-premium-x,#guest-photo-premium-y,#guest-photo-premium-zoom')) {
      requestAnimationFrame(() => syncSurfaces(true));
    }
  });

  document.addEventListener('click', event => {
    if (event.target?.closest?.('#guest-photo-use,.guest-photo-reset,.guest-photo-edit-premium,#guest-profile-photo-remove')) {
      setTimeout(() => syncSurfaces(true), 0);
    }
  });

  const observer = new MutationObserver(() => syncSurfaces(true));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  syncSurfaces(true);
  setInterval(syncSurfaces, 160);
})();