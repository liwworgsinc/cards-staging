(function () {
  'use strict';

  const thumbnailBySlug = new Map();

  function initials(value) {
    return String(value || 'Card')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'C';
  }

  function rowSlug(row) {
    const meta = row.querySelector('.admin-card-primary > div > span');
    const text = String(meta?.textContent || '');
    const marker = text.lastIndexOf('· /');
    return marker >= 0 ? text.slice(marker + 3).trim() : '';
  }

  function decorateCardRows() {
    document.querySelectorAll('#admin-card-list .admin-card-row').forEach(row => {
      const slug = rowSlug(row);
      const item = thumbnailBySlug.get(slug);
      const box = row.querySelector('.admin-card-icon');
      if (!box || !item) return;

      box.textContent = initials(item.label);
      box.style.overflow = 'hidden';
      box.style.fontWeight = '900';
      box.style.fontSize = '.72rem';

      if (!item.imageUrl) return;
      const image = document.createElement('img');
      image.src = item.imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.style.width = '100%';
      image.style.height = '100%';
      image.style.objectFit = 'cover';
      image.style.display = 'block';
      box.textContent = '';
      box.appendChild(image);
    });
  }

  async function loadThumbnails() {
    try {
      const { data, error } = await supabaseClient
        .from('digital_cards')
        .select('slug,full_name,company_name,profile_image_url')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      (data || []).forEach(card => {
        thumbnailBySlug.set(String(card.slug || ''), {
          label: card.company_name || card.full_name || 'Card',
          imageUrl: String(card.profile_image_url || '').trim()
        });
      });
      decorateCardRows();
    } catch (error) {
      console.warn('Admin card thumbnails unavailable:', error);
    }
  }

  function scheduleDecoration() {
    window.setTimeout(decorateCardRows, 0);
  }

  ['admin-card-search', 'admin-card-status-filter', 'admin-clear-card-owner-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', scheduleDecoration);
    document.getElementById(id)?.addEventListener('change', scheduleDecoration);
    document.getElementById(id)?.addEventListener('click', scheduleDecoration);
  });

  document.addEventListener('click', event => {
    if (event.target.closest('button[onclick^="showCustomerCards"]')) scheduleDecoration();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadThumbnails, { once: true });
  } else {
    loadThumbnails();
  }
})();
