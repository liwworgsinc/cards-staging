(() => {
  'use strict';
  if (window.__LIW_ROLODEX_V1__) return;
  window.__LIW_ROLODEX_V1__ = true;

  const PENDING_KEY = 'liw_rolodex_pending_slug';
  let user = null;
  let entries = [];
  let sourceFilter = 'all';
  let categoryFilter = 'all';
  let addMode = 'liw';
  let editingId = '';

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const safe = (value, max = 1000) => String(value ?? '').trim().slice(0, max);

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function notify(message) {
    if (typeof toast === 'function') return toast(message);
    const node = $('#toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(node._rolodexTimer);
    node._rolodexTimer = setTimeout(() => node.classList.remove('show'), 2600);
  }

  function appUrl(path) {
    if (typeof liwUrl === 'function') return liwUrl(path);
    const staged = location.pathname.includes('/cards-staging/');
    return new URL(`${staged ? '/cards-staging/' : '/'}${String(path || '').replace(/^\//, '')}`, location.origin).href;
  }

  function normalizeWebUrl(value) {
    const raw = safe(value, 1000);
    if (!raw) return '';
    try {
      const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const url = new URL(withProtocol);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return url.href;
    } catch (_) {
      return '';
    }
  }

  function parseLiwSlug(value) {
    const raw = safe(value, 500);
    if (!raw) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      const slug = safe(url.searchParams.get('slug'), 160);
      if (slug) return slug;
    } catch (_) {}
    const slugMatch = raw.match(/[?&]slug=([^&#]+)/i);
    if (slugMatch) {
      try { return safe(decodeURIComponent(slugMatch[1]), 160); } catch (_) { return safe(slugMatch[1], 160); }
    }
    return raw.replace(/^\/+|\/+$/g, '').replace(/^.*\//, '').slice(0, 160);
  }

  function initials(name) {
    return safe(name, 120).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'LIW';
  }

  function avatarMarkup(entry, className = 'rolodex-avatar') {
    const image = normalizeWebUrl(entry.profile_image_url);
    return image
      ? `<span class="${className}"><img src="${esc(image)}" alt=""></span>`
      : `<span class="${className}">${esc(initials(entry.display_name))}</span>`;
  }

  function sourceLabel(entry) {
    if (entry.source_type === 'liw') return entry.liw_available ? 'LIW live' : 'LIW saved';
    if (entry.source_type === 'external') return 'External card';
    return 'Manual contact';
  }

  function sourceBadge(entry) {
    const live = entry.source_type === 'liw' && entry.liw_available;
    return `<span class="rolodex-badge ${live ? 'live' : ''}">${live ? '<span class="live-dot"></span>' : ''}${esc(sourceLabel(entry))}</span>`;
  }

  function actionLink(href, icon, label, primary = false, target = '') {
    if (!href) return '';
    return `<a class="${primary ? 'primary-action' : ''}" href="${esc(href)}" ${target ? `target="${target}" rel="noopener"` : ''}><i data-lucide="${icon}" size="15"></i><span>${esc(label)}</span></a>`;
  }

  function viewUrl(entry) {
    if (entry.source_type === 'liw' && entry.liw_slug) return appUrl(`card.html?slug=${encodeURIComponent(entry.liw_slug)}`);
    return normalizeWebUrl(entry.external_url || entry.website);
  }

  function renderEntry(entry) {
    const phone = safe(entry.phone, 80);
    const email = safe(entry.email, 180);
    const website = normalizeWebUrl(entry.website);
    const view = viewUrl(entry);
    const companyLine = [safe(entry.company_name, 160), safe(entry.job_title, 160)].filter(Boolean).join(' · ');
    const category = safe(entry.category, 80) || 'Contacts';
    const note = safe(entry.notes, 1200);
    const actions = [
      actionLink(phone ? `tel:${phone}` : '', 'phone', 'Call'),
      actionLink(phone ? `sms:${phone}` : '', 'message-square-text', 'Text'),
      actionLink(email ? `mailto:${email}` : '', 'mail', 'Email'),
      actionLink(view || website, entry.source_type === 'liw' ? 'contact-round' : 'external-link', entry.source_type === 'liw' ? 'View card' : 'Open', true, view || website ? '_blank' : '')
    ].filter(Boolean).join('');

    return `<article class="rolodex-entry" data-entry-id="${esc(entry.id)}">
      <div class="rolodex-entry-top">
        ${avatarMarkup(entry)}
        <div class="rolodex-entry-copy">
          <div class="rolodex-entry-name-row"><h3>${esc(entry.display_name || 'Unnamed contact')}</h3></div>
          <p class="rolodex-entry-sub">${esc(entry.job_title || entry.company_name || sourceLabel(entry))}</p>
          ${companyLine ? `<p class="rolodex-entry-company">${esc(companyLine)}</p>` : ''}
          <div class="rolodex-entry-badges">${sourceBadge(entry)}<span class="rolodex-badge category">${esc(category)}</span></div>
        </div>
        <div class="rolodex-entry-menu">
          <button type="button" class="rolodex-icon-button ${entry.is_favorite ? 'is-favorite' : ''}" data-favorite-entry="${esc(entry.id)}" aria-label="${entry.is_favorite ? 'Remove from favorites' : 'Add to favorites'}"><i data-lucide="star" size="17" ${entry.is_favorite ? 'fill="currentColor"' : ''}></i></button>
          <button type="button" class="rolodex-icon-button" data-edit-entry="${esc(entry.id)}" aria-label="Edit contact"><i data-lucide="ellipsis" size="18"></i></button>
        </div>
      </div>
      ${note ? `<p class="rolodex-note-preview"><strong>Note:</strong> ${esc(note.slice(0, 150))}${note.length > 150 ? '…' : ''}</p>` : ''}
      <div class="rolodex-actions">${actions || '<button type="button" data-edit-entry="' + esc(entry.id) + '"><i data-lucide="pencil" size="15"></i> Edit</button>'}</div>
    </article>`;
  }

  function filteredEntries() {
    const query = safe($('#rolodex-search')?.value, 160).toLowerCase();
    return entries.filter(entry => {
      const sourceOk = sourceFilter === 'all'
        || (sourceFilter === 'favorite' && entry.is_favorite)
        || (sourceFilter === 'liw' && entry.source_type === 'liw')
        || entry.source_type === sourceFilter;
      const categoryOk = categoryFilter === 'all' || safe(entry.category, 80) === categoryFilter;
      const haystack = [entry.display_name, entry.company_name, entry.job_title, entry.category, entry.email, entry.phone].map(value => safe(value, 300).toLowerCase()).join(' ');
      const queryOk = !query || haystack.includes(query);
      return sourceOk && categoryOk && queryOk;
    });
  }

  function renderStats() {
    $('#stat-total').textContent = String(entries.length);
    $('#stat-favorites').textContent = String(entries.filter(entry => entry.is_favorite).length);
    $('#stat-liw').textContent = String(entries.filter(entry => entry.source_type === 'liw' && entry.liw_available).length);
    $('#stat-categories').textContent = String(new Set(entries.map(entry => safe(entry.category, 80) || 'Contacts')).size);
  }

  function renderCategories() {
    const select = $('#rolodex-category-filter');
    if (!select) return;
    const categories = [...new Set(entries.map(entry => safe(entry.category, 80) || 'Contacts'))].sort((a, b) => a.localeCompare(b));
    const current = categoryFilter;
    select.innerHTML = '<option value="all">All categories</option>' + categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('');
    if ([...select.options].some(option => option.value === current)) select.value = current;
    else { select.value = 'all'; categoryFilter = 'all'; }
  }

  function renderList() {
    const list = $('#rolodex-list');
    const empty = $('#rolodex-empty');
    if (!list || !empty) return;
    renderStats();
    renderCategories();
    const visible = filteredEntries();
    list.hidden = visible.length === 0;
    empty.hidden = visible.length !== 0;
    list.innerHTML = visible.map(renderEntry).join('');
    if (window.lucide) lucide.createIcons();
  }

  async function loadEntries() {
    const { data, error } = await supabaseClient.rpc('rolodex_list_entries');
    if (error) throw error;
    entries = Array.isArray(data) ? data : [];
    renderList();
  }

  async function saveLiwSlug(slug, options = {}) {
    const cleanSlug = parseLiwSlug(slug);
    if (!cleanSlug) throw new Error('Paste an LIW Card link or slug first.');
    const { data, error } = await supabaseClient.rpc('rolodex_save_liw_card', { p_slug: cleanSlug });
    if (error) throw error;
    const result = data || {};
    if (!result.ok) {
      if (result.reason === 'own_card') throw new Error('That is your own LIW Card. Rolodex is for the people and businesses you save.');
      if (result.reason === 'not_found') throw new Error('We could not find a published LIW Card with that link or slug.');
      throw new Error('That LIW Card could not be saved.');
    }
    if (options.clearPending) {
      try { sessionStorage.removeItem(PENDING_KEY); } catch (_) {}
    }
    await loadEntries();
    notify(result.already_saved ? `${result.display_name || 'Card'} is already in your Rolodex — live details refreshed.` : `${result.display_name || 'LIW Card'} saved to your Rolodex.`);
    return result;
  }

  function setMode(mode) {
    addMode = mode === 'other' ? 'other' : 'liw';
    $$('#rolodex-mode-tabs [data-add-mode]').forEach(button => button.classList.toggle('active', button.dataset.addMode === addMode));
    $('#liw-add-panel').hidden = addMode !== 'liw';
    $('#other-add-panel').hidden = addMode !== 'other';
    $('#liw-edit-panel').hidden = true;
  }

  function resetDialog() {
    editingId = '';
    $('#rolodex-entry-id').value = '';
    $('#rolodex-entry-source').value = '';
    $('#dialog-eyebrow').textContent = 'Add to Rolodex';
    $('#dialog-title').textContent = 'Add a contact';
    $('#dialog-copy').textContent = 'Save an LIW Card or add another business contact.';
    $('#rolodex-mode-tabs').hidden = false;
    $('#liw-card-input').value = '';
    ['contact-name','contact-company','contact-title','contact-phone','contact-email','contact-website','contact-external-url','contact-notes'].forEach(id => { const node = $(`#${id}`); if (node) node.value = ''; });
    $('#contact-category').value = 'Contacts';
    $('#contact-favorite').checked = false;
    $('#delete-rolodex-entry').hidden = true;
    setMode('liw');
  }

  function openAdd(mode = 'liw') {
    resetDialog();
    setMode(mode);
    $('#rolodex-dialog').showModal();
    setTimeout(() => (mode === 'liw' ? $('#liw-card-input') : $('#contact-name'))?.focus(), 40);
  }

  function openEdit(entry) {
    if (!entry) return;
    editingId = entry.id;
    $('#rolodex-entry-id').value = entry.id;
    $('#rolodex-entry-source').value = entry.source_type;
    $('#dialog-eyebrow').textContent = 'Rolodex contact';
    $('#dialog-title').textContent = 'Edit contact';
    $('#dialog-copy').textContent = entry.source_type === 'liw' ? 'LIW identity details stay synced. Your category and notes are private to you.' : 'Update the contact details stored in your Rolodex.';
    $('#rolodex-mode-tabs').hidden = true;
    $('#liw-add-panel').hidden = true;
    $('#other-add-panel').hidden = entry.source_type === 'liw';
    $('#liw-edit-panel').hidden = entry.source_type !== 'liw';

    if (entry.source_type === 'liw') {
      $('#liw-edit-person').innerHTML = `${avatarMarkup(entry)}<div><strong>${esc(entry.display_name || 'LIW contact')}</strong><span>${esc([entry.company_name, entry.job_title].filter(Boolean).join(' · ') || 'Live LIW Card')}</span></div>`;
      $('#liw-edit-category').value = safe(entry.category, 80) || 'Contacts';
      $('#liw-edit-notes').value = safe(entry.notes, 1200);
      $('#liw-edit-favorite').checked = Boolean(entry.is_favorite);
    } else {
      $('#contact-name').value = safe(entry.display_name, 140);
      $('#contact-company').value = safe(entry.company_name, 160);
      $('#contact-title').value = safe(entry.job_title, 160);
      $('#contact-category').value = safe(entry.category, 80) || 'Contacts';
      $('#contact-phone').value = safe(entry.phone, 80);
      $('#contact-email').value = safe(entry.email, 180);
      $('#contact-website').value = safe(entry.website, 500);
      $('#contact-external-url').value = safe(entry.external_url, 1000);
      $('#contact-notes').value = safe(entry.notes, 1200);
      $('#contact-favorite').checked = Boolean(entry.is_favorite);
      $('#delete-rolodex-entry').hidden = false;
    }
    $('#rolodex-dialog').showModal();
    if (window.lucide) lucide.createIcons();
  }

  function otherPayload() {
    const displayName = safe($('#contact-name').value, 140);
    if (!displayName) throw new Error('Add a name or business name.');
    const email = safe($('#contact-email').value, 180);
    if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
    const websiteRaw = safe($('#contact-website').value, 500);
    const externalRaw = safe($('#contact-external-url').value, 1000);
    const website = websiteRaw ? normalizeWebUrl(websiteRaw) : '';
    const externalUrl = externalRaw ? normalizeWebUrl(externalRaw) : '';
    if (websiteRaw && !website) throw new Error('Enter a valid website URL.');
    if (externalRaw && !externalUrl) throw new Error('Enter a valid digital-card URL.');
    return {
      user_id: user.id,
      source_type: externalUrl ? 'external' : 'manual',
      display_name: displayName,
      company_name: safe($('#contact-company').value, 160) || null,
      job_title: safe($('#contact-title').value, 160) || null,
      category: safe($('#contact-category').value, 80) || 'Contacts',
      phone: safe($('#contact-phone').value, 80) || null,
      email: email || null,
      website: website || null,
      external_url: externalUrl || null,
      notes: safe($('#contact-notes').value, 1200),
      is_favorite: Boolean($('#contact-favorite').checked)
    };
  }

  async function saveOther() {
    const payload = otherPayload();
    if (editingId) {
      const { error } = await supabaseClient.from('rolodex_entries').update(payload).eq('id', editingId).eq('user_id', user.id);
      if (error) throw error;
      notify('Contact updated.');
    } else {
      const { error } = await supabaseClient.from('rolodex_entries').insert(payload);
      if (error) throw error;
      notify('Contact saved to your Rolodex.');
    }
    $('#rolodex-dialog').close();
    await loadEntries();
  }

  async function saveLiwEdit() {
    if (!editingId) return;
    const payload = {
      category: safe($('#liw-edit-category').value, 80) || 'Contacts',
      notes: safe($('#liw-edit-notes').value, 1200),
      is_favorite: Boolean($('#liw-edit-favorite').checked)
    };
    const { error } = await supabaseClient.from('rolodex_entries').update(payload).eq('id', editingId).eq('user_id', user.id);
    if (error) throw error;
    $('#rolodex-dialog').close();
    await loadEntries();
    notify('Rolodex notes updated.');
  }

  async function toggleFavorite(id) {
    const entry = entries.find(item => item.id === id);
    if (!entry) return;
    const next = !entry.is_favorite;
    entry.is_favorite = next;
    renderList();
    const { error } = await supabaseClient.from('rolodex_entries').update({ is_favorite: next }).eq('id', id).eq('user_id', user.id);
    if (error) {
      entry.is_favorite = !next;
      renderList();
      throw error;
    }
    notify(next ? 'Added to favorites.' : 'Removed from favorites.');
  }

  async function deleteEntry(id) {
    const entry = entries.find(item => item.id === id);
    if (!entry) return;
    if (!confirm(`Remove ${entry.display_name || 'this contact'} from your Rolodex?`)) return;
    const { error } = await supabaseClient.from('rolodex_entries').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    entries = entries.filter(item => item.id !== id);
    $('#rolodex-dialog')?.close();
    renderList();
    notify('Contact removed from Rolodex.');
  }

  async function resumePendingScan() {
    let pending = '';
    try { pending = safe(sessionStorage.getItem(PENDING_KEY), 160); } catch (_) {}
    if (!pending) return;
    try {
      await saveLiwSlug(pending, { clearPending: true });
      const notice = document.createElement('div');
      notice.className = 'rolodex-scan-notice';
      notice.innerHTML = '<i data-lucide="check-circle-2" size="16"></i> Scanned LIW Card saved. It will stay synced here.';
      $('.rolodex-panel')?.prepend(notice);
      if (window.lucide) lucide.createIcons();
      setTimeout(() => notice.remove(), 5200);
    } catch (error) {
      try { sessionStorage.removeItem(PENDING_KEY); } catch (_) {}
      notify(error?.message || 'The scanned card could not be saved.');
    }
  }

  function bind() {
    $('#sidebar-toggle')?.addEventListener('click', () => $('#sidebar')?.classList.toggle('open'));
    $('#add-contact-button')?.addEventListener('click', () => openAdd('liw'));
    $('#add-liw-card-button')?.addEventListener('click', () => openAdd('liw'));
    $('#add-other-card-button')?.addEventListener('click', () => openAdd('other'));
    $$('[data-open-add]').forEach(button => button.addEventListener('click', () => openAdd(button.dataset.openAdd || 'liw')));
    $('#close-rolodex-dialog')?.addEventListener('click', () => $('#rolodex-dialog').close());
    $$('[data-dialog-cancel]').forEach(button => button.addEventListener('click', () => $('#rolodex-dialog').close()));
    $$('#rolodex-mode-tabs [data-add-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.addMode)));
    $('#rolodex-search')?.addEventListener('input', renderList);
    $('#rolodex-category-filter')?.addEventListener('change', event => { categoryFilter = event.target.value || 'all'; renderList(); });
    $$('.rolodex-filter').forEach(button => button.addEventListener('click', () => {
      sourceFilter = button.dataset.sourceFilter || 'all';
      $$('.rolodex-filter').forEach(item => item.classList.toggle('active', item === button));
      renderList();
    }));

    $('#rolodex-list')?.addEventListener('click', async event => {
      const favorite = event.target.closest('[data-favorite-entry]');
      const edit = event.target.closest('[data-edit-entry]');
      try {
        if (favorite) await toggleFavorite(favorite.dataset.favoriteEntry);
        else if (edit) openEdit(entries.find(item => item.id === edit.dataset.editEntry));
      } catch (error) { notify(error?.message || 'Could not update that contact.'); }
    });

    $('#rolodex-form')?.addEventListener('submit', async event => {
      event.preventDefault();
      const submitter = event.submitter;
      if (submitter) submitter.disabled = true;
      try {
        if (editingId && $('#rolodex-entry-source').value === 'liw') await saveLiwEdit();
        else if (addMode === 'liw' && !editingId) {
          await saveLiwSlug($('#liw-card-input').value);
          $('#rolodex-dialog').close();
        } else await saveOther();
      } catch (error) {
        notify(error?.message || 'Could not save that contact.');
      } finally {
        if (submitter) submitter.disabled = false;
      }
    });

    $('#delete-rolodex-entry')?.addEventListener('click', () => deleteEntry(editingId).catch(error => notify(error?.message || 'Could not remove that contact.')));
    $('#delete-liw-entry')?.addEventListener('click', () => deleteEntry(editingId).catch(error => notify(error?.message || 'Could not remove that contact.')));
  }

  (async function init() {
    try {
      user = await requireUser();
      if (!user) return;
      bind();
      await loadEntries();
      await resumePendingScan();
      const params = new URLSearchParams(location.search);
      if (params.get('scan') === 'saved') notify('Scanned LIW Card saved to your Rolodex.');
      if (window.lucide) lucide.createIcons();
    } catch (error) {
      console.error('[LIW Rolodex V1]', error);
      const list = $('#rolodex-list');
      if (list) list.innerHTML = `<div class="rolodex-empty" style="grid-column:1/-1"><span><i data-lucide="triangle-alert" size="28"></i></span><h3>Rolodex could not load</h3><p>${esc(error?.message || 'Refresh the page and try again.')}</p></div>`;
      notify(error?.message || 'Rolodex could not load.');
      if (window.lucide) lucide.createIcons();
    }
  })();
})();