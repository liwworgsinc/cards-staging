(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  let user = null;
  let session = null;
  let orders = [];
  let filtered = [];
  let selected = null;
  let intake = null;
  let assets = [];
  let messages = [];
  let history = [];
  let cards = [];

  const statusLabels = {
    awaiting_intake: 'Awaiting intake',
    intake_submitted: 'Intake submitted',
    in_design: 'In design',
    customer_review: 'Customer review',
    revision_requested: 'Revision requested',
    approved: 'Approved',
    publishing: 'Publishing',
    completed: 'Completed',
    on_hold: 'On hold',
    canceled: 'Canceled'
  };

  const notifiableStatuses = new Set([
    'intake_submitted', 'in_design', 'customer_review', 'revision_requested',
    'approved', 'publishing', 'completed', 'on_hold', 'canceled'
  ]);

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const dt = (value) => value
    ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  function alertBox(type, message) {
    const node = $('#dw-admin-alert');
    if (!node) return;
    node.className = `dw-alert show ${type}`;
    node.textContent = message;
  }

  function clearAlert() {
    const node = $('#dw-admin-alert');
    if (node) node.className = 'dw-alert';
  }

  function renderAccessState(kind, detail = '') {
    const loading = $('#dw-admin-loading');
    const app = $('#dw-admin-app');
    if (app) app.hidden = true;
    if (!loading) return;
    loading.hidden = false;

    if (kind === 'signin') {
      loading.innerHTML = `
        <i data-lucide="log-in" size="30"></i>
        <h2>Sign in to LIW Admin.</h2>
        <p>This browser does not currently have an LIW session. Sign in, then return to Designer Orders.</p>
        <a class="dw-btn navy" href="${esc(liwUrl('login.html'))}">Sign in</a>`;
    } else if (kind === 'denied') {
      loading.innerHTML = `
        <i data-lucide="shield-alert" size="30"></i>
        <h2>Admin access required.</h2>
        <p>This production workspace is restricted to LIW Super Admin accounts.</p>
        <a class="dw-btn navy" href="${esc(liwUrl('dashboard.html'))}">Back to dashboard</a>`;
    } else {
      loading.innerHTML = `
        <i data-lucide="circle-alert" size="30"></i>
        <h2>We could not verify Admin access.</h2>
        <p>${esc(detail || 'Refresh this page. If the problem continues, open the regular Admin Overview first and try again.')}</p>
        <button class="dw-btn navy" type="button" id="dw-auth-retry">Try again</button>`;
      $('#dw-auth-retry')?.addEventListener('click', () => location.reload());
    }
    window.lucide?.createIcons?.();
  }

  async function requireAdmin() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    session = data?.session || null;

    if (!session?.user) {
      renderAccessState('signin');
      return false;
    }

    user = session.user;
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const isAdmin = typeof isLiwAdminAccount === 'function'
      ? isLiwAdminAccount(user, profile)
      : profile?.role === 'admin';

    if (!isAdmin) {
      renderAccessState('denied');
      return false;
    }

    return true;
  }

  async function notifyDesigner(eventKey, orderId) {
    if (!session?.access_token || !orderId || !notifiableStatuses.has(eventKey)) return;
    const response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/notify-designer-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': LIW_CONFIG.supabaseKey
      },
      body: JSON.stringify({ orderId, eventKey })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Designer notification could not be sent');
    }
  }

  async function loadOrders() {
    const { data, error } = await supabaseClient
      .from('designer_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    orders = data || [];
    const count = $('#dw-admin-count');
    if (count) count.textContent = `${orders.filter((order) => !['completed', 'canceled'].includes(order.workflow_status)).length} active`;
    filterOrders();
  }

  function filterOrders() {
    const query = $('#dw-search')?.value.trim().toLowerCase() || '';
    const status = $('#dw-status-filter')?.value || '';
    filtered = orders.filter((order) => {
      const matchesStatus = !status || order.workflow_status === status;
      const matchesQuery = !query || [order.order_number, order.customer_email, order.service_name, order.domain_name]
        .some((value) => String(value || '').toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
    renderQueue();
  }

  function renderQueue() {
    const wrap = $('#dw-queue-list');
    if (!wrap) return;
    wrap.innerHTML = filtered.length
      ? filtered.map((order) => `
          <button class="dw-queue-item ${selected?.id === order.id ? 'active' : ''}" type="button" data-id="${esc(order.id)}">
            <strong>${esc(order.order_number)} · ${esc(order.service_name)}${order.is_test ? ' · QA' : ''}</strong>
            <span><b>${esc(statusLabels[order.workflow_status] || order.workflow_status)}</b><time>${esc(dt(order.created_at).split(',')[0])}</time></span>
            <span><b>${esc(order.customer_email || 'No email')}</b><em>${Number(order.revisions_used || 0)}/${Number(order.revision_limit || 0)} revisions</em></span>
          </button>`).join('')
      : '<div class="dw-empty" style="padding:28px 10px"><p>No orders match this filter.</p></div>';

    wrap.querySelectorAll('[data-id]').forEach((button) => {
      button.addEventListener('click', () => openOrder(button.dataset.id));
    });
  }

  async function openOrder(id) {
    clearAlert();
    const found = orders.find((order) => order.id === id);
    if (!found) return;
    selected = found;
    renderQueue();
    if ($('#dw-no-selection')) $('#dw-no-selection').hidden = true;
    if ($('#dw-detail')) $('#dw-detail').hidden = false;

    const [intakeResult, assetResult, messageResult, historyResult, cardResult] = await Promise.all([
      supabaseClient.from('designer_intakes').select('*').eq('order_id', id).maybeSingle(),
      supabaseClient.from('designer_order_assets').select('*').eq('order_id', id).order('created_at'),
      supabaseClient.from('designer_order_messages').select('*').eq('order_id', id).order('created_at'),
      supabaseClient.from('designer_order_status_history').select('*').eq('order_id', id).order('created_at', { ascending: false }),
      supabaseClient.from('digital_cards').select('id,slug,full_name,company_name,status').eq('user_id', found.user_id).order('updated_at', { ascending: false })
    ]);

    for (const result of [intakeResult, assetResult, messageResult, historyResult, cardResult]) {
      if (result.error) throw result.error;
    }

    intake = intakeResult.data;
    assets = assetResult.data || [];
    messages = messageResult.data || [];
    history = historyResult.data || [];
    cards = cardResult.data || [];
    renderDetail();
  }

  function kv(label, value) {
    return `<div><small>${esc(label)}</small><strong>${esc(value || '—')}</strong></div>`;
  }

  function renderDetail() {
    if (!selected) return;
    $('#dw-detail-title').textContent = `${selected.order_number} · ${selected.service_name}${selected.is_test ? ' · QA TEST' : ''}`;
    $('#dw-detail-subtitle').textContent = `${selected.customer_email || 'No email'} · opened ${dt(selected.created_at)}`;
    $('#dw-detail-status').textContent = statusLabels[selected.workflow_status] || selected.workflow_status;
    $('#dw-order-kv').innerHTML = [
      kv('Payment', selected.is_test ? 'QA paid simulation — no Stripe charge' : selected.payment_status === 'paid' ? 'Paid / verified' : selected.payment_status),
      kv('Service price', new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((selected.service_price_cents || 0) / 100)),
      kv('Requested plan', selected.selected_plan_name || selected.selected_plan_key || 'Current plan'),
      kv('Domain', selected.domain_mode === 'liw' ? 'LIW card link' : selected.domain_name || selected.domain_mode),
      kv('Revisions', `${selected.revisions_used || 0} used of ${selected.revision_limit || 0}`),
      kv('Assigned', selected.assigned_to ? 'LIW team member' : 'Unassigned')
    ].join('');

    const cardSelect = $('#dw-card-select');
    cardSelect.innerHTML = '<option value="">Link LIW card…</option>' + cards.map((card) =>
      `<option value="${esc(card.id)}" ${selected.card_id === card.id ? 'selected' : ''}>${esc(card.full_name || card.company_name || card.slug)} · ${esc(card.status)}</option>`
    ).join('');

    $('#dw-status-select').value = selected.workflow_status === 'awaiting_intake' ? 'intake_submitted' : selected.workflow_status;
    const edit = $('#dw-edit-card');
    if (selected.card_id) {
      edit.hidden = false;
      edit.href = `editor.html?id=${encodeURIComponent(selected.card_id)}`;
    } else {
      edit.hidden = true;
    }

    renderIntake();
    renderAssets();
    renderMessages();
    renderHistory();
    window.lucide?.createIcons?.();
  }

  function renderIntake() {
    const wrap = $('#dw-intake-detail');
    if (!wrap) return;
    if (!intake) {
      wrap.innerHTML = '<div style="grid-column:1/-1"><small>Status</small><strong>Customer has not submitted intake yet.</strong></div>';
      return;
    }

    const colors = Array.isArray(intake.brand_colors) ? intake.brand_colors.join(' · ') : '';
    const social = Array.isArray(intake.social_links) ? intake.social_links.join(' · ') : JSON.stringify(intake.social_links || {});
    const services = Array.isArray(intake.services) ? intake.services.join(' · ') : '';
    const products = Array.isArray(intake.products) ? intake.products.join(' · ') : '';

    wrap.innerHTML = [
      kv('Contact name', intake.contact_name), kv('Business / brand', intake.business_name),
      kv('Title', intake.job_title), kv('Email', intake.contact_email), kv('Phone', intake.phone),
      kv('Website', intake.website), kv('Address', intake.business_address), kv('What they do', intake.business_description),
      kv('Main goal', intake.primary_goal), kv('Audience', intake.target_audience), kv('Style', intake.preferred_style || 'LIW choice'),
      kv('Template', intake.preferred_template || 'LIW choice'), kv('Brand colors', colors), kv('Color notes', intake.color_notes),
      kv('Booking', intake.booking_url), kv('Payment', intake.payment_url), kv('Social', social),
      kv('Services', services), kv('Products', products), kv('Special requests', intake.special_requests)
    ].join('');
  }

  async function openAsset(asset) {
    const { data, error } = await supabaseClient.storage.from('designer-assets').createSignedUrl(asset.storage_path, 300);
    if (error) return alertBox('error', error.message);
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  function renderAssets() {
    const wrap = $('#dw-admin-assets');
    if (!wrap) return;
    if (!assets.length) {
      wrap.innerHTML = '<div class="dw-message"><p>No files were uploaded with this intake.</p></div>';
      return;
    }

    wrap.innerHTML = assets.map((asset) => `
      <div class="dw-asset">
        <span class="dw-asset-icon"><i data-lucide="${asset.mime_type === 'application/pdf' ? 'file-text' : 'image'}" size="16"></i></span>
        <button type="button" data-asset="${esc(asset.id)}" style="border:0;background:transparent;text-align:left;min-width:0;cursor:pointer">
          <strong>${esc(asset.original_name)}</strong><small>${esc(String(asset.asset_type || '').replaceAll('_', ' '))}</small>
        </button>
        <i data-lucide="external-link" size="15"></i>
      </div>`).join('');

    wrap.querySelectorAll('[data-asset]').forEach((button) => {
      button.addEventListener('click', () => {
        const asset = assets.find((item) => item.id === button.dataset.asset);
        if (asset) openAsset(asset);
      });
    });
    window.lucide?.createIcons?.();
  }

  function renderMessages() {
    const wrap = $('#dw-admin-thread');
    if (!wrap) return;
    wrap.innerHTML = messages.length
      ? messages.map((message) => `
          <div class="dw-message ${message.is_internal ? 'dw-internal' : ''}">
            <div class="dw-message-head"><strong>${message.is_internal ? 'Internal LIW note' : message.sender_role === 'customer' ? 'Customer' : message.sender_role === 'system' ? 'System' : 'LIW'}</strong><time>${esc(dt(message.created_at))}</time></div>
            <p>${esc(message.message)}</p>
          </div>`).join('')
      : '<div class="dw-message"><p>No messages yet.</p></div>';
  }

  function renderHistory() {
    const wrap = $('#dw-history');
    if (!wrap) return;
    wrap.innerHTML = history.length
      ? history.map((item) => `
          <div class="dw-timeline-row done">
            <span class="dw-timeline-dot"><i data-lucide="history" size="13"></i></span>
            <div><strong>${esc(statusLabels[item.to_status] || item.to_status)}</strong><small>${esc(dt(item.created_at))}${item.note ? ' · ' + esc(item.note) : ''}</small></div>
          </div>`).join('')
      : '<div class="dw-message"><p>No status history yet.</p></div>';
    window.lucide?.createIcons?.();
  }

  async function transition() {
    if (!selected) return;
    const status = $('#dw-status-select').value;
    const note = $('#dw-status-note').value.trim();
    const cardId = $('#dw-card-select').value || null;
    const button = $('#dw-update-status');
    button.disabled = true;

    try {
      const orderId = selected.id;
      const { data, error } = await supabaseClient.rpc('admin_transition_designer_order', {
        p_order_id: orderId,
        p_status: status,
        p_note: note || null,
        p_card_id: cardId
      });
      if (error) throw error;
      selected = data;
      $('#dw-status-note').value = '';

      let notice = '';
      try {
        await notifyDesigner(status, orderId);
      } catch (notificationError) {
        console.warn('Designer status notification failed:', notificationError);
        notice = ' Customer email could not be sent; the order status is still saved.';
      }

      alertBox(notice ? 'info' : 'success', `Order moved to ${statusLabels[status] || status}.${notice}`);
      await loadOrders();
      await openOrder(orderId);
    } catch (error) {
      alertBox('error', error.message || 'Could not update order.');
    } finally {
      button.disabled = false;
    }
  }

  async function addMessage(event) {
    event.preventDefault();
    if (!selected) return;
    const input = $('#dw-admin-message');
    const message = input.value.trim();
    if (!message) return;
    const internal = $('#dw-internal-note').checked;
    const button = event.submitter;
    button.disabled = true;

    try {
      const { error } = await supabaseClient.from('designer_order_messages').insert({
        order_id: selected.id,
        user_id: user.id,
        sender_role: 'admin',
        message_type: internal ? 'note' : 'message',
        message,
        is_internal: internal
      });
      if (error) throw error;
      input.value = '';
      $('#dw-internal-note').checked = false;
      await openOrder(selected.id);
    } catch (error) {
      alertBox('error', error.message || 'Could not add message.');
    } finally {
      button.disabled = false;
    }
  }

  async function init() {
    window.lucide?.createIcons?.();
    try {
      if (!await requireAdmin()) return;
      await loadOrders();
      $('#dw-admin-loading').hidden = true;
      $('#dw-admin-app').hidden = false;
      $('#dw-search')?.addEventListener('input', filterOrders);
      $('#dw-status-filter')?.addEventListener('change', filterOrders);
      $('#dw-refresh')?.addEventListener('click', loadOrders);
      $('#dw-update-status')?.addEventListener('click', transition);
      $('#dw-admin-message-form')?.addEventListener('submit', addMessage);

      const fromUrl = new URLSearchParams(location.search).get('id');
      if (fromUrl && orders.some((order) => order.id === fromUrl)) await openOrder(fromUrl);
      else if (orders.length) await openOrder(orders[0].id);
      window.lucide?.createIcons?.();
    } catch (error) {
      console.error('Designer admin queue failed:', error);
      renderAccessState('error', error.message || 'The Admin verification request failed.');
      alertBox('error', error.message || 'Could not load the designer production queue.');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();