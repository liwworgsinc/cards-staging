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
    ? mediaCards.map(card => `<option value="${card.id}">${escapeHtml(mediaCardDisplayName(card))}</option>`).join('')
    : '<option value="">Create a card first</option>';

  const videoUnlocked = mediaFeatureUnlocked('video_section');
  const downloadsUnlocked = mediaFeatureUnlocked('file_downloads');
  const downloadLimit = mediaDownloadLimit();

  setMediaAccessBadge('video-access', videoUnlocked, videoUnlocked ? 'Included' : 'Upgrade required');
  setMediaAccessBadge('download-access', downloadsUnlocked, downloadsUnlocked ? `${downloadLimit} files / card` : 'Upgrade required');

  document.getElementById('video-panel')?.setAttribute('aria-disabled', String(!videoUnlocked));
  document.getElementById('downloads-panel')?.setAttribute('aria-disabled', String(!downloadsUnlocked));

  const videoSubmit = document.getElementById('video-form')?.querySelector('button[type="submit"]');
  const downloadSubmit = document.getElementById('download-form')?.querySelector('button[type="submit"]');
  if (videoSubmit) videoSubmit.disabled = !videoUnlocked;
  if (downloadSubmit) downloadSubmit.disabled = !downloadsUnlocked;

  ['video-enabled', 'video-title', 'video-url'].forEach(id => {
    const control = document.getElementById(id);
    if (control) control.disabled = !videoUnlocked;
  });
  ['download-title', 'download-url', 'download-description'].forEach(id => {
    const control = document.getElementById(id);
    if (control) control.disabled = !downloadsUnlocked;
  });

  select.addEventListener('change', loadSelected);
  document.getElementById('video-enabled')?.addEventListener('change', updateVideoStatus);
  document.getElementById('video-form').addEventListener('submit', saveVideo);
  document.getElementById('download-form').addEventListener('submit', addDownload);
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  updateDownloadUsage();
  await loadSelected();
  if (window.lucide) lucide.createIcons();
})();

function mediaCardDisplayName(card) {
  const company = String(card?.company_name || '').trim();
  const name = String(card?.full_name || '').trim();
  if (company && name && company.toLowerCase() !== name.toLowerCase()) return `${company} — ${name}`;
  return company || name || 'Untitled card';
}

function setMediaAccessBadge(id, unlocked, label) {
  const badge = document.getElementById(id);
  if (!badge) return;
  badge.textContent = label;
  badge.dataset.state = unlocked ? 'unlocked' : 'locked';
}

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
  updateSelectedCardSummary(card);
  updateVideoStatus();

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

function updateSelectedCardSummary(card) {
  const summary = document.getElementById('media-selected-card-name');
  if (!summary) return;
  summary.textContent = card
    ? `Editing media for ${mediaCardDisplayName(card)}.`
    : 'Create a card first to add video or downloadable files.';
}

function updateVideoStatus() {
  const enabled = Boolean(document.getElementById('video-enabled')?.checked);
  const status = document.getElementById('video-section-status');
  const label = document.getElementById('video-live-status');
  if (status) status.dataset.state = enabled ? 'live' : 'hidden';
  if (label) label.textContent = enabled ? 'Shown on card' : 'Hidden on card';
}

function updateDownloadUsage() {
  const count = mediaDownloads.length;
  const limit = mediaDownloadLimit();
  const unlocked = mediaFeatureUnlocked('file_downloads');
  const countEl = document.getElementById('download-usage-count');
  const bar = document.getElementById('download-usage-bar');
  const copy = document.getElementById('download-usage-copy');

  if (countEl) countEl.textContent = unlocked ? `${count} of ${limit} used` : 'Locked on this plan';
  if (bar) bar.style.width = unlocked && limit ? `${Math.min(100, Math.round((count / limit) * 100))}%` : '0%';

  if (copy) {
    if (!unlocked) {
      copy.textContent = 'Upgrade to an eligible plan to add downloadable files to this card.';
    } else if (count >= limit) {
      copy.textContent = 'This card has reached its file limit. Remove a file before adding another.';
    } else {
      const remaining = Math.max(0, limit - count);
      copy.textContent = `${remaining} file${remaining === 1 ? '' : 's'} remaining on this card.`;
    }
  }

  const addButton = document.getElementById('download-form')?.querySelector('button[type="submit"]');
  if (addButton) addButton.disabled = !unlocked || count >= limit;
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
  updateVideoStatus();
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

function safeMediaUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

function renderDownloads() {
  const area = document.getElementById('download-list');
  if (!area) return;

  area.innerHTML = mediaDownloads.length
    ? mediaDownloads.map(download => {
        const href = safeMediaUrl(download.file_url);
        const openAction = href !== '#'
          ? `<a class="media-download-open" href="${escapeHtml(href)}" target="_blank" rel="noopener" title="Open file" aria-label="Open ${escapeHtml(download.title)}"><i data-lucide="external-link"></i></a>`
          : '';
        return `<article class="media-download-row">
          <span class="media-download-icon" aria-hidden="true"><i data-lucide="file-down"></i></span>
          <div class="media-download-copy">
            <strong>${escapeHtml(download.title)}</strong>
            <span>${escapeHtml(download.description || download.file_url)}</span>
          </div>
          <div class="media-download-actions">
            ${openAction}
            <button class="media-download-remove" type="button" data-delete-download="${escapeHtml(download.id)}" title="Remove file" aria-label="Remove ${escapeHtml(download.title)}"><i data-lucide="trash-2"></i></button>
          </div>
        </article>`;
      }).join('')
    : `<div class="media-empty">
        <span class="media-empty-icon" aria-hidden="true"><i data-lucide="file-plus-2"></i></span>
        <strong>No files on this card yet</strong>
        <span>Add a brochure, menu, form, catalog, media kit, or another public file link.</span>
      </div>`;

  area.querySelectorAll('[data-delete-download]').forEach(button => {
    button.addEventListener('click', () => deleteDownload(button.dataset.deleteDownload));
  });

  updateDownloadUsage();
  if (window.lucide) lucide.createIcons();
}

async function deleteDownload(id) {
  const { error } = await supabaseClient.from('card_downloads').delete().eq('id', id);
  if (error) return toast(error.message);
  mediaDownloads = mediaDownloads.filter(download => download.id !== id);
  renderDownloads();
  toast('Download removed');
}
