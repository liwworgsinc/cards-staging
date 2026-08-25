(() => {
  const PHOTO_KEY = 'liw_guest_profile_photo_v1';
  const MAX_ATTEMPTS = 120;

  function readPhoto() {
    try {
      const raw = localStorage.getItem(PHOTO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writePhoto(record) {
    try { localStorage.setItem(PHOTO_KEY, JSON.stringify(record)); } catch (_) {}
  }

  function clearPhoto() {
    try { localStorage.removeItem(PHOTO_KEY); } catch (_) {}
  }

  function currentUser() {
    try { return typeof user !== 'undefined' ? user : null; } catch (_) { return null; }
  }

  function client() {
    try { return typeof supabaseClient !== 'undefined' ? supabaseClient : null; } catch (_) { return null; }
  }

  function editorReady() {
    try {
      return Boolean(
        typeof editorInitializationComplete !== 'undefined' &&
        editorInitializationComplete &&
        typeof field === 'function' &&
        document.querySelector('[name="profile_image_url"]')
      );
    } catch (_) {
      return false;
    }
  }

  function dataUrlToBlob(dataUrl) {
    const match = String(dataUrl || '').match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) throw new Error('Guest profile photo data is invalid.');
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: match[1] || 'image/jpeg' });
  }

  function safeFileName(value) {
    const base = String(value || 'guest-profile.jpg').toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
    return base || 'guest-profile.jpg';
  }

  function applyPosition(record) {
    try {
      const x = Math.max(0, Math.min(100, Number(record.positionX ?? 50)));
      const y = Math.max(0, Math.min(100, Number(record.positionY ?? 22)));
      const zoom = Math.max(110, Math.min(200, Number(record.zoom ?? 125)));
      const xField = field('profile_position_x');
      const yField = field('profile_position_y');
      const zoomField = field('profile_zoom');
      if (xField) xField.value = String(x);
      if (yField) yField.value = String(y);
      if (zoomField) zoomField.value = String(zoom);
    } catch (_) {}
  }

  async function saveIntoCard(record, publicUrl) {
    profileUrl = publicUrl;
    const imageField = field('profile_image_url');
    if (imageField) imageField.value = publicUrl;
    applyPosition(record);
    if (typeof updatePhoto === 'function') updatePhoto();
    if (typeof render === 'function') render();
    if (typeof updateCompletion === 'function') updateCompletion();
    if (typeof markDirty === 'function') markDirty();
    if (typeof persistLocalDraft === 'function') persistLocalDraft();
    if (typeof save === 'function') await save({ silent: true });
  }

  async function restoreGuestPhoto() {
    const record = readPhoto();
    const authUser = currentUser();
    const supabase = client();
    if (!record || !authUser?.id || !supabase || !editorReady()) return false;

    try {
      if (typeof setSaveState === 'function') setSaveState('saving', 'Restoring your profile photo…');

      let publicUrl = String(record.uploadedUrl || '');
      if (!publicUrl) {
        const blob = dataUrlToBlob(record.dataUrl);
        const safeName = safeFileName(record.originalName);
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        const path = `${authUser.id}/${Date.now()}-guest-${safeName.replace(/\.[a-z0-9]+$/i, '')}.${extension}`;
        const { error } = await supabase.storage.from('profile-images').upload(path, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: blob.type || 'image/jpeg'
        });
        if (error) throw error;
        const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
        publicUrl = String(data?.publicUrl || '');
        if (!publicUrl) throw new Error('The uploaded photo did not return a public URL.');
        record.uploadedUrl = publicUrl;
        record.uploadedAt = Date.now();
        writePhoto(record);
      }

      await saveIntoCard(record, publicUrl);
      clearPhoto();
      if (typeof toast === 'function') toast('Profile photo and crop restored from your guest card');
      return true;
    } catch (error) {
      console.warn('LIW guest profile photo restore failed:', error);
      if (typeof setSaveState === 'function') setSaveState('error', 'Profile photo waiting to retry');
      if (typeof toast === 'function') toast('Your card is safe. We will retry the guest profile photo on your next editor visit.');
      return false;
    }
  }

  let attempts = 0;
  const timer = setInterval(async () => {
    attempts += 1;
    if (!readPhoto()) {
      clearInterval(timer);
      return;
    }
    if (!editorReady() || !currentUser()?.id) {
      if (attempts >= MAX_ATTEMPTS) clearInterval(timer);
      return;
    }
    clearInterval(timer);
    await restoreGuestPhoto();
  }, 250);
})();
