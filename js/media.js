let mediaUser = null;
let mediaAccess = null;
let mediaCards = [];
let mediaDownloads = [];

function mediaFeatureUnlocked(feature) {
  if (!mediaAccess) return false;
  if (mediaAccess.isAdmin && !mediaAccess.isPlanPreview) return true;
  const planKey = String(mediaAccess.planKey || '').toLowerCase();
  if (['plus', 'pro', 'agency', 'white_label'].includes(planKey) && ['video_section', 'file_downloads'].includes(feature)) return true;
  return Boolean(mediaAccess.has?.(feature));
}

(async function initMedia() {
  mediaUser = await requireUser();
  if (!mediaUser) return;

  const [access, { data: cards, error }] = await Promise.all([
    getLiwAccessContext(mediaUser),
    supabaseClient
      .from('digital_cards')
      .select('id,user_id,full_name,company_name,video_title,video_url,video_enabled')
      .eq('user_id', mediaUser.id)
      .order('updated_at', { ascending: false })
  ]);

  mediaAccess = access;
  if (error) toast(error.message);
  mediaCards = cards || [];

  configureMediaSidebar();

  const select = document.getElementById('media-card');
  select.innerHTML = mediaCards.length
    ? mediaCards.map(card => `<option value="${card.id}">${escapeHtml(card.company_name || card.full_name || 'Untitled card')}</option>`).join('')
    : '<option value="">Create a card first</option>';

  const videoUnlocked = mediaFeatureUnlocked('video_section');
  const downloadsUnlocked = mediaFeatureUnlocked('file_downloads');

  document.getElementById('video-access').textContent = videoUnlocked ? 'Unlocked' : 'Plus or add-on required';
  const downloadLimit = mediaDownloadLimit();
  document.getElementById('download-access').textContent = downloadsUnlocked ? `Unlocked · ${downloadLimit} per card` : 'Plus or add-on required';
  document.getElementById('video-form').querySelector('button[type="submit"]').disabled = !videoUnlocked;
  document.getElementById('download-form').querySelector('button[type="submit"]').disabled = !downloadsUnlocked;

  select.addEventListener('change', loadSelected);
  document.getElementById('video-form').addEventListener('submit', saveVideo);
  document.getElementById('download-form').addEventListener('submit', addDownload);
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  await loadSelected();
  if (window.lucide) lucide.createIcons();
})();

function configureMediaSidebar() {
  const videoUnlocked = mediaFeatureUnlocked('video_section');
  const downloadsUnlocked = mediaFeatureUnlocked('file_downloads');

  document.getElementById('sidebar-plan').textContent = mediaAccess.isPlanPreview
    ? `${mediaAccess.planName} preview`
    : mediaAccess.isAdmin
    ? 'LIW Admin'
    : `${mediaAccess.planName} plan`;

  document.getElementById('sidebar-plan-copy').textContent = mediaAccess.isPlanPreview
    ? 'Customer feature rules active · billing unchanged.'
    : mediaAccess.isAdmin
    ? 'Video and file downloads are fully unlocked.'
    : videoUnlocked && downloadsUnlocked
      ? 'Video and file downloads are enabled.'
      : videoUnlocked || downloadsUnlocked
        ? 'One media feature is active.'
        : 'Featured video and downloads unlock with Plus or an eligible add-on.';

  document.getElementById('media-admin-link')?.toggleAttribute('hidden', !mediaAccess.isAdmin);
  document.getElementById('media-billing-button')?.toggleAttribute('hidden', mediaAccess.isAdmin);
  document.getElementById('media-plans-link')?.toggleAttribute('hidden', false);
  document.getElementById('media-addon-link')?.toggleAttribute('hidden', mediaAccess.isAdmin);
}

function mediaDownloadLimit() {
  if (mediaAccess?.isAdmin && !mediaAccess?.isPlanPreview) return 30;
  if (['white_label', 'agency'].includes(mediaAccess?.planKey)) return 24;
  if (mediaAccess?.planKey === 'pro') return 10;
  if (mediaAccess?.planKey === 'plus') return 3;
  return 0;
}

async function loadSelected() {
  const id = document.getElementById('media-card').value;
  const card = mediaCards.find(item => item.id === id);

  document.getElementById('video-enabled').checked = Boolean(card?.video_enabled);
  document.getElementById('video-title').value = card?.video_title || '';
  document.getElementById('video-url').value = card?.video_url || '';

  if (!id) {
    mediaDownloads = [];
    renderDownloads();
    return;
  }

  const { data, error } = await supabaseClient
    .from('card_downloads')
    .select('*')
    .eq('card_id', id)
    .order('sort_order');

  if (error) return toast(error.message);
  mediaDownloads = data || [];
  renderDownloads();
}

async function saveVideo(event) {
  event.preventDefault();
  if (!mediaFeatureUnlocked('video_section')) {
    location.href = 'pricing.html';
    return;
  }

  const id = document.getElementById('media-card').value;
  if (!id) return toast('Choose a card');

  const payload = {
    video_enabled: document.getElementById('video-enabled').checked,
    video_title: document.getElementById('video-title').value.trim() || null,
    video_url: document.getElementById('video-url').value.trim() || null
  };

  const { data, error } = await supabaseClient
    .from('digital_cards')
    .update(payload)
    .eq('id', id)
    .select('id,video_title,video_url,video_enabled')
    .single();

  if (error) return toast(error.message);
  Object.assign(mediaCards.find(card => card.id === id), data);
  toast('Video saved');
}

async function addDownload(event) {
  event.preventDefault();
  if (!mediaFeatureUnlocked('file_downloads')) {
    location.href = 'pricing.html';
    return;
  }

  const cardId = document.getElementById('media-card').value;
  if (!cardId) return toast('Choose a card');
  const limit = mediaDownloadLimit();
  if (mediaDownloads.length >= limit) return toast(`Your plan supports up to ${limit} downloads per card`);

  const payload = {
    card_id: cardId,
    title: document.getElementById('download-title').value.trim(),
    file_url: document.getElementById('download-url').value.trim(),
    description: document.getElementById('download-description').value.trim() || null,
    sort_order: mediaDownloads.length
  };

  const { data, error } = await supabaseClient
    .from('card_downloads')
    .insert(payload)
    .select()
    .single();

  if (error) return toast(error.message);
  mediaDownloads.push(data);
  event.currentTarget.reset();
  renderDownloads();
  toast('Download added');
}

function renderDownloads() {
  const area = document.getElementById('download-list');
  area.innerHTML = mediaDownloads.length
    ? mediaDownloads.map(download => `<article class="domain-request-row">
        <div>
          <strong>${escapeHtml(download.title)}</strong>
          <span>${escapeHtml(download.description || download.file_url)}</span>
        </div>
        <button class="btn btn-ghost btn-sm danger-text" type="button" data-delete-download="${download.id}">Remove</button>
      </article>`).join('')
    : '<div class="domain-empty"><i data-lucide="file-down"></i><span>No downloads added.</span></div>';

  area.querySelectorAll('[data-delete-download]').forEach(button => {
    button.addEventListener('click', () => deleteDownload(button.dataset.deleteDownload));
  });

  if (window.lucide) lucide.createIcons();
}

async function deleteDownload(id) {
  const { error } = await supabaseClient.from('card_downloads').delete().eq('id', id);
  if (error) return toast(error.message);
  mediaDownloads = mediaDownloads.filter(download => download.id !== id);
  renderDownloads();
  toast('Download removed');
}
