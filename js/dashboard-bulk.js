(function () {
  const FEATURE_KEY = 'bulk_card_management';
  const CARD_FIELDS = [
    'template_id','slug','status','full_name','job_title','company_name','biography','phone','email','website','business_address','headline',
    'profile_image_url','primary_color','secondary_color','background_color','text_color','button_color','button_text_color','font_family','button_style',
    'profile_image_shape','border_radius','card_layout','gradient_background','color_mode','show_branding','qr_foreground_color','qr_background_color','qr_logo_url',
    'booking_url','payment_url','services_enabled','products_enabled','booking_enabled','lead_form_enabled','seo_title','cover_image_url','cover_position','cover_overlay',
    'branding_mode','custom_branding_text','custom_branding_url','seo_description','internal_label','client_name','campaign_tag','video_title','video_url','video_enabled',
    'payment_sharing_enabled','cash_app_cashtag','cash_app_label','venmo_username','venmo_label','paypal_url','paypal_label','zelle_contact','zelle_label',
    'payment_qr_url','profile_position_x','profile_position_y','profile_zoom','social_button_style','social_button_size'
  ];

  let bulkUser = null;
  let bulkAccess = null;
  let bulkMode = false;
  const selectedIds = new Set();

  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  function injectStyles() {
    if (document.getElementById('liw-bulk-card-styles')) return;
    const style = document.createElement('style');
    style.id = 'liw-bulk-card-styles';
    style.textContent = `
      .bulk-manage-button.is-active{border-color:rgba(212,168,79,.72);background:rgba(212,168,79,.12);color:#7a5515}
      .bulk-card-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:14px 0 16px;padding:14px 16px;border:1px solid rgba(11,20,56,.12);border-radius:16px;background:#fff;box-shadow:0 10px 30px rgba(11,20,56,.07)}
      .bulk-card-toolbar[hidden]{display:none!important}
      .bulk-card-summary{display:flex;align-items:center;gap:10px;min-width:max-content}
      .bulk-card-summary strong{font-size:.95rem;color:#111827}.bulk-card-summary span{font-size:.82rem;color:#667085}
      .bulk-card-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
      .bulk-card-actions .btn{min-height:36px}
      .bulk-delete-action{color:#b42318;border-color:rgba(180,35,24,.24)}
      .bulk-delete-action:hover:not(:disabled){color:#912018;background:rgba(217,45,32,.08);border-color:rgba(180,35,24,.38)}
      .bulk-card-mode .card-item{position:relative;transition:box-shadow .18s ease,transform .18s ease,border-color .18s ease}
      .bulk-card-mode .card-item.bulk-card-selected{border-color:rgba(212,168,79,.8);box-shadow:0 0 0 2px rgba(212,168,79,.36),0 14px 34px rgba(11,20,56,.10);transform:translateY(-1px)}
      .bulk-card-check{position:absolute;z-index:4;top:12px;left:12px;display:none;align-items:center;justify-content:center;width:34px;height:34px;border:1px solid rgba(11,20,56,.16);border-radius:11px;background:rgba(255,255,255,.96);box-shadow:0 7px 18px rgba(11,20,56,.14);cursor:pointer}
      .bulk-card-mode .bulk-card-check{display:flex}.bulk-card-check input{width:18px;height:18px;margin:0;accent-color:#0b1438;cursor:pointer}
      .bulk-card-shared-note{position:absolute;z-index:4;top:12px;left:12px;display:none;padding:6px 9px;border-radius:9px;background:rgba(11,20,56,.88);color:#fff;font-size:.72rem;font-weight:800}
      .bulk-card-mode .bulk-card-shared-note{display:block}
      .bulk-card-dialog{width:min(92vw,520px);border:0;border-radius:22px;padding:0;color:inherit;background:#fff;box-shadow:0 28px 90px rgba(16,24,40,.32)}
      .bulk-card-dialog::backdrop{background:rgba(16,24,40,.68);backdrop-filter:blur(4px)}
      .bulk-card-dialog-panel{padding:26px}.bulk-card-dialog-head{display:flex;gap:14px;align-items:flex-start}.bulk-card-dialog-icon{width:46px;height:46px;flex:0 0 46px;display:grid;place-items:center;border-radius:14px;color:#b42318;background:#fee4e2}
      .bulk-card-dialog h2{margin:0 0 6px;font-size:1.25rem}.bulk-card-dialog p{margin:0;line-height:1.55}.bulk-card-delete-summary{margin:18px 0;padding:14px 16px;border:1px solid #eaecf0;border-radius:14px;background:#f9fafb}
      .bulk-card-delete-summary strong{display:block;margin-bottom:4px}.bulk-delete-label{display:block;margin-bottom:8px;font-weight:800}.bulk-delete-input{width:100%;min-height:46px;border:1px solid #d0d5dd;border-radius:12px;padding:10px 13px;font:inherit;text-transform:uppercase}.bulk-delete-input:focus{outline:3px solid rgba(217,45,32,.13);border-color:#d92d20}.bulk-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}
      @media(max-width:760px){.bulk-card-toolbar{align-items:flex-start;flex-direction:column}.bulk-card-actions{width:100%;justify-content:flex-start}.bulk-card-actions .btn{flex:1 1 auto}.bulk-card-summary{min-width:0}}
      @media(max-width:520px){.bulk-card-actions{display:grid;grid-template-columns:1fr 1fr}.bulk-card-actions .btn{width:100%}.bulk-dialog-actions{flex-direction:column-reverse}.bulk-dialog-actions .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ownedCardElements() {
    return [...document.querySelectorAll('#card-list .card-item')].filter(card => card.querySelector('[data-delete-card]'));
  }

  function sharedCardElements() {
    return [...document.querySelectorAll('#card-list .card-item')].filter(card => !card.querySelector('[data-delete-card]'));
  }

  function ensureCardSelectors() {
    ownedCardElements().forEach(card => {
      if (card.querySelector('.bulk-card-check')) return;
      const id = card.dataset.cardId;
      const label = document.createElement('label');
      label.className = 'bulk-card-check';
      label.title = 'Select card';
      label.innerHTML = `<input type="checkbox" aria-label="Select card" data-bulk-card-checkbox="${escapeHtml(id)}">`;
      card.prepend(label);
      const input = label.querySelector('input');
      input.checked = selectedIds.has(id);
      input.addEventListener('change', () => {
        if (input.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        card.classList.toggle('bulk-card-selected', input.checked);
        updateToolbar();
      });
    });

    sharedCardElements().forEach(card => {
      if (card.querySelector('.bulk-card-shared-note')) return;
      const note = document.createElement('span');
      note.className = 'bulk-card-shared-note';
      note.textContent = 'Shared card';
      card.prepend(note);
    });
  }

  function setBulkMode(enabled) {
    bulkMode = Boolean(enabled);
    document.body.classList.toggle('bulk-card-mode', bulkMode);
    const toolbar = document.getElementById('bulk-card-toolbar');
    const manage = document.getElementById('bulk-manage-button');
    if (toolbar) toolbar.hidden = !bulkMode;
    if (manage) {
      manage.classList.toggle('is-active', bulkMode);
      manage.innerHTML = bulkMode
        ? '<i data-lucide="x" size="16"></i> Done'
        : '<i data-lucide="list-checks" size="16"></i> Manage cards';
    }
    if (!bulkMode) {
      selectedIds.clear();
      document.querySelectorAll('[data-bulk-card-checkbox]').forEach(input => { input.checked = false; });
      document.querySelectorAll('.bulk-card-selected').forEach(card => card.classList.remove('bulk-card-selected'));
    }
    updateToolbar();
    if (window.lucide) lucide.createIcons();
  }

  function updateToolbar() {
    const count = selectedIds.size;
    const countElement = document.getElementById('bulk-selected-count');
    if (countElement) countElement.textContent = String(count);
    document.querySelectorAll('[data-bulk-action]').forEach(button => { button.disabled = count === 0; });
    const selectAll = document.getElementById('bulk-select-all');
    if (selectAll) {
      const all = ownedCardElements();
      selectAll.textContent = all.length > 0 && count === all.length ? 'Clear all' : 'Select all';
    }
  }

  function injectBulkUi() {
    const list = document.getElementById('card-list');
    const section = list?.closest('section');
    const sectionTitle = section?.querySelector('.section-title');
    if (!list || !section || !sectionTitle || document.getElementById('bulk-manage-button')) return;

    const existingActions = sectionTitle.querySelector('a[href*="editor.html"]')?.parentElement === sectionTitle
      ? sectionTitle
      : sectionTitle;
    const manage = document.createElement('button');
    manage.id = 'bulk-manage-button';
    manage.type = 'button';
    manage.className = 'btn btn-light btn-sm bulk-manage-button';
    manage.innerHTML = '<i data-lucide="list-checks" size="16"></i> Manage cards';
    manage.addEventListener('click', () => setBulkMode(!bulkMode));

    const addButton = sectionTitle.querySelector('a[href*="editor.html"]');
    if (addButton) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap';
      addButton.replaceWith(wrap);
      wrap.append(manage, addButton);
    } else {
      existingActions.appendChild(manage);
    }

    const toolbar = document.createElement('div');
    toolbar.id = 'bulk-card-toolbar';
    toolbar.className = 'bulk-card-toolbar';
    toolbar.hidden = true;
    toolbar.innerHTML = `
      <div class="bulk-card-summary"><strong><span id="bulk-selected-count">0</span> selected</strong><span id="bulk-action-status">Pro bulk tools</span></div>
      <div class="bulk-card-actions">
        <button class="btn btn-light btn-sm" id="bulk-select-all" type="button">Select all</button>
        <button class="btn btn-light btn-sm" data-bulk-action="publish" type="button" disabled><i data-lucide="rocket" size="15"></i> Publish</button>
        <button class="btn btn-light btn-sm" data-bulk-action="unpublish" type="button" disabled><i data-lucide="archive" size="15"></i> Unpublish</button>
        <button class="btn btn-light btn-sm" data-bulk-action="duplicate" type="button" disabled><i data-lucide="copy-plus" size="15"></i> Duplicate</button>
        <button class="btn btn-light btn-sm bulk-delete-action" data-bulk-action="delete" type="button" disabled><i data-lucide="trash-2" size="15"></i> Delete</button>
      </div>`;
    list.before(toolbar);

    document.getElementById('bulk-select-all')?.addEventListener('click', toggleSelectAll);
    toolbar.querySelector('[data-bulk-action="publish"]')?.addEventListener('click', () => setSelectedStatus('published'));
    toolbar.querySelector('[data-bulk-action="unpublish"]')?.addEventListener('click', () => setSelectedStatus('draft'));
    toolbar.querySelector('[data-bulk-action="duplicate"]')?.addEventListener('click', duplicateSelectedCards);
    toolbar.querySelector('[data-bulk-action="delete"]')?.addEventListener('click', openBulkDeleteDialog);

    ensureCardSelectors();
    injectBulkDeleteDialog();
    if (window.lucide) lucide.createIcons();
  }

  function toggleSelectAll() {
    const cards = ownedCardElements();
    const shouldSelect = selectedIds.size !== cards.length;
    selectedIds.clear();
    cards.forEach(card => {
      const id = card.dataset.cardId;
      const input = card.querySelector('[data-bulk-card-checkbox]');
      if (shouldSelect) selectedIds.add(id);
      if (input) input.checked = shouldSelect;
      card.classList.toggle('bulk-card-selected', shouldSelect);
    });
    updateToolbar();
  }

  function setActionsBusy(busy, message = '') {
    document.querySelectorAll('[data-bulk-action],#bulk-select-all,#bulk-manage-button').forEach(button => {
      button.disabled = busy || (button.hasAttribute('data-bulk-action') && selectedIds.size === 0);
    });
    const summary = document.getElementById('bulk-action-status');
    if (summary) summary.textContent = busy ? (message || 'Working…') : 'Pro bulk tools';
  }

  async function setSelectedStatus(status) {
    if (!bulkUser || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setActionsBusy(true, status === 'published' ? 'Publishing…' : 'Unpublishing…');
    try {
      const { data, error } = await supabaseClient
        .from('digital_cards')
        .update({ status })
        .eq('user_id', bulkUser.id)
        .in('id', ids)
        .select('id,status');
      if (error) throw error;
      if ((data || []).length !== ids.length) throw new Error('One or more selected cards could not be updated.');
      (data || []).forEach(row => {
        const card = document.querySelector(`#card-list [data-card-id="${CSS.escape(row.id)}"]`);
        const pill = card?.querySelector('.status-pill');
        if (pill) {
          pill.className = `status-pill ${status}`;
          pill.textContent = status;
        }
      });
      toast(`${ids.length} card${ids.length === 1 ? '' : 's'} ${status === 'published' ? 'published' : 'unpublished'}`);
    } catch (error) {
      toast(error?.message || `Could not ${status === 'published' ? 'publish' : 'unpublish'} the selected cards`);
    } finally {
      setActionsBusy(false);
    }
  }

  function byCard(rows) {
    return (rows || []).reduce((map, row) => {
      if (!map.has(row.card_id)) map.set(row.card_id, []);
      map.get(row.card_id).push(row);
      return map;
    }, new Map());
  }

  function duplicatePayload(card) {
    const payload = {};
    CARD_FIELDS.forEach(key => {
      if (card[key] !== undefined) payload[key] = card[key];
    });
    payload.status = 'draft';
    payload.slug = `${card.slug || card.full_name || 'card'}-copy`;
    payload.internal_label = `${card.internal_label || card.company_name || card.full_name || 'Card'} (Copy)`;
    return payload;
  }

  async function duplicateViaSaveFunction(card, socials, services, products) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('Your login expired. Sign in again to duplicate cards.');
    const response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/save-card-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': LIW_CONFIG.supabaseKey
      },
      body: JSON.stringify({
        cardId: null,
        card: duplicatePayload(card),
        socials: (socials || []).map(row => ({ platform: row.platform, label: row.label, url: row.url, is_enabled: row.is_enabled })),
        services: (services || []).map(row => ({
          name: row.name, description: row.description, price_cents: row.price_cents, image_url: row.image_url,
          booking_url: row.booking_url, payment_url: row.payment_url, cta_label: row.cta_label, is_enabled: row.is_enabled
        })),
        products: (products || []).map(row => ({
          name: row.name, description: row.description, price_cents: row.price_cents, image_urls: row.image_urls,
          purchase_url: row.purchase_url, is_enabled: row.is_enabled
        }))
      })
    });
    let result = null;
    try { result = await response.json(); } catch (_) {}
    if (!response.ok || !result?.card?.id) throw new Error(result?.error || 'The duplicate could not be created.');
    return result.card;
  }

  async function duplicateSelectedCards() {
    if (!bulkUser || !bulkAccess || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setActionsBusy(true, 'Checking capacity…');
    try {
      const { count, error: countError } = await supabaseClient
        .from('digital_cards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', bulkUser.id);
      if (countError) throw countError;
      const limit = Number(bulkAccess.cardLimit || 1);
      const remaining = Math.max(limit - Number(count || 0), 0);
      if (remaining < ids.length) {
        throw new Error(`Your plan has room for ${remaining} more card${remaining === 1 ? '' : 's'}. Select ${remaining || 'fewer'} before duplicating.`);
      }

      setActionsBusy(true, 'Loading card content…');
      const [cardsResult, socialsResult, servicesResult, productsResult, downloadsResult] = await Promise.all([
        supabaseClient.from('digital_cards').select('*').eq('user_id', bulkUser.id).in('id', ids),
        supabaseClient.from('social_links').select('*').in('card_id', ids).order('sort_order'),
        supabaseClient.from('card_services').select('*').in('card_id', ids).order('sort_order'),
        supabaseClient.from('card_products').select('*').in('card_id', ids).order('sort_order'),
        supabaseClient.from('card_downloads').select('*').in('card_id', ids).order('sort_order')
      ]);
      for (const result of [cardsResult, socialsResult, servicesResult, productsResult, downloadsResult]) {
        if (result.error) throw result.error;
      }

      const cardMap = new Map((cardsResult.data || []).map(card => [card.id, card]));
      const socials = byCard(socialsResult.data);
      const services = byCard(servicesResult.data);
      const products = byCard(productsResult.data);
      const downloads = byCard(downloadsResult.data);
      let created = 0;
      let downloadWarnings = 0;

      for (const id of ids) {
        const card = cardMap.get(id);
        if (!card) continue;
        setActionsBusy(true, `Duplicating ${created + 1} of ${ids.length}…`);
        const newCard = await duplicateViaSaveFunction(card, socials.get(id), services.get(id), products.get(id));
        const sourceDownloads = downloads.get(id) || [];
        if (sourceDownloads.length) {
          const rows = sourceDownloads.map((row, index) => ({
            card_id: newCard.id,
            title: row.title,
            description: row.description,
            file_url: row.file_url,
            sort_order: index,
            is_enabled: row.is_enabled
          }));
          const { error } = await supabaseClient.from('card_downloads').insert(rows);
          if (error) downloadWarnings += 1;
        }
        created += 1;
      }

      if (!created) throw new Error('No cards were duplicated.');
      toast(downloadWarnings
        ? `${created} card${created === 1 ? '' : 's'} duplicated as drafts. Some downloads could not be copied.`
        : `${created} card${created === 1 ? '' : 's'} duplicated as drafts.`);
      window.setTimeout(() => location.reload(), 650);
    } catch (error) {
      toast(error?.message || 'Could not duplicate the selected cards');
      setActionsBusy(false);
    }
  }

  function injectBulkDeleteDialog() {
    if (document.getElementById('bulk-delete-dialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'bulk-delete-dialog';
    dialog.className = 'bulk-card-dialog';
    dialog.innerHTML = `
      <div class="bulk-card-dialog-panel">
        <div class="bulk-card-dialog-head">
          <span class="bulk-card-dialog-icon"><i data-lucide="triangle-alert" size="23"></i></span>
          <div><h2>Permanently delete selected cards?</h2><p class="muted">This cannot be undone. Their public links and connected card data will stop working immediately.</p></div>
        </div>
        <div class="bulk-card-delete-summary"><strong id="bulk-delete-count">0 cards selected</strong><span class="muted">Only cards you own will be deleted. Shared cards cannot be selected here.</span></div>
        <label class="bulk-delete-label" for="bulk-delete-input">Type <strong>DELETE</strong> to confirm</label>
        <input class="bulk-delete-input" id="bulk-delete-input" autocomplete="off" placeholder="DELETE" spellcheck="false" type="text">
        <div class="bulk-dialog-actions">
          <button class="btn btn-light" id="bulk-delete-cancel" type="button">Keep cards</button>
          <button class="btn btn-danger" id="bulk-delete-confirm" type="button" disabled><i data-lucide="trash-2" size="16"></i> Delete selected</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    const input = dialog.querySelector('#bulk-delete-input');
    const confirm = dialog.querySelector('#bulk-delete-confirm');
    input.addEventListener('input', () => { confirm.disabled = input.value.trim().toUpperCase() !== 'DELETE'; });
    dialog.querySelector('#bulk-delete-cancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    confirm.addEventListener('click', deleteSelectedCards);
    if (window.lucide) lucide.createIcons();
  }

  function openBulkDeleteDialog() {
    if (selectedIds.size === 0) return;
    const dialog = document.getElementById('bulk-delete-dialog');
    const input = document.getElementById('bulk-delete-input');
    const confirm = document.getElementById('bulk-delete-confirm');
    const count = document.getElementById('bulk-delete-count');
    if (!dialog || !input || !confirm || !count) return;
    count.textContent = `${selectedIds.size} card${selectedIds.size === 1 ? '' : 's'} selected`;
    input.value = '';
    confirm.disabled = true;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    window.setTimeout(() => input.focus(), 60);
  }

  async function deleteSelectedCards() {
    if (!bulkUser || selectedIds.size === 0) return;
    const input = document.getElementById('bulk-delete-input');
    const confirm = document.getElementById('bulk-delete-confirm');
    const cancel = document.getElementById('bulk-delete-cancel');
    const dialog = document.getElementById('bulk-delete-dialog');
    if (input?.value.trim().toUpperCase() !== 'DELETE') return;
    const ids = [...selectedIds];
    confirm.disabled = true;
    cancel.disabled = true;
    confirm.innerHTML = '<i data-lucide="loader-circle" size="16"></i> Deleting…';
    if (window.lucide) lucide.createIcons();
    try {
      const { data, error } = await supabaseClient
        .from('digital_cards')
        .delete()
        .eq('user_id', bulkUser.id)
        .in('id', ids)
        .select('id');
      if (error) throw error;
      if ((data || []).length !== ids.length) throw new Error('One or more selected cards could not be deleted.');
      dialog?.close();
      toast(`${ids.length} card${ids.length === 1 ? '' : 's'} permanently deleted`);
      window.setTimeout(() => location.reload(), 650);
    } catch (error) {
      toast(error?.message || 'Could not delete the selected cards');
      confirm.disabled = false;
      cancel.disabled = false;
      confirm.innerHTML = '<i data-lucide="trash-2" size="16"></i> Delete selected';
      if (window.lucide) lucide.createIcons();
    }
  }

  async function waitForDashboardCards() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const list = document.getElementById('card-list');
      if (list && (list.querySelector('.card-item') || list.querySelector('.empty-state'))) return true;
      await wait(100);
    }
    return Boolean(document.getElementById('card-list'));
  }

  async function initBulkCardManagement() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      const access = await getLiwAccessContext(user);
      if (!access?.has?.(FEATURE_KEY)) return;
      bulkUser = user;
      bulkAccess = access;
      await waitForDashboardCards();
      injectStyles();
      injectBulkUi();
    } catch (error) {
      console.warn('LIW bulk card management did not load:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.setTimeout(initBulkCardManagement, 0));
  else window.setTimeout(initBulkCardManagement, 0);
})();
