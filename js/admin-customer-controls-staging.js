(() => {
  'use strict';

  if (!/\/admin\.html$/i.test(location.pathname)) return;

  const FUNCTION_URL = `${LIW_CONFIG.supabaseUrl}/functions/v1/admin-manage-customer`;
  const STAGING_HEADER = 'cards-staging-admin-v1';
  const accountStates = new Map();
  let decorateQueued = false;
  let selectedUserId = '';

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function callAdminAction(action, payload = {}) {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) throw new Error('Your admin session expired. Sign in again.');

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': LIW_CONFIG.supabaseKey,
        'x-liw-staging-admin': STAGING_HEADER
      },
      body: JSON.stringify({ action, ...payload })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to manage this customer.');
    return data;
  }

  function findUserId(row) {
    if (row.dataset.liwUserId) return row.dataset.liwUserId;
    const cardsButton = [...row.querySelectorAll('button')].find(button => /showCustomerCards\(/.test(button.getAttribute('onclick') || ''));
    const match = cardsButton?.getAttribute('onclick')?.match(/showCustomerCards\('([^']+)'\)/);
    const id = match?.[1] || '';
    if (id) row.dataset.liwUserId = id;
    return id;
  }

  function rowInfo(row) {
    const cells = row?.querySelectorAll('td');
    if (!cells?.length) return null;
    const userId = findUserId(row);
    if (!userId) return null;
    return {
      userId,
      name: cells[0]?.querySelector('strong')?.textContent?.trim() || 'Customer',
      email: cells[1]?.querySelector('.admin-email-link')?.textContent?.trim() || '',
      role: cells[2]?.textContent?.trim().toLowerCase() || 'user',
      row,
      cells
    };
  }

  function accessCopy(status) {
    if (status === 'suspended') return 'Login access is disabled. Customer data and public cards remain in place.';
    if (status === 'banned') return 'Login access is disabled. Published cards were taken offline when the ban was applied.';
    if (status === 'owner') return 'Protected LIW Admin account.';
    return 'Customer can sign in and use LIW Cards normally.';
  }

  function ensureAccessFilter() {
    if (document.getElementById('admin-access-filter')) return;
    const controls = document.querySelector('#accounts-panel .admin-section-controls');
    if (!controls) return;

    const select = document.createElement('select');
    select.className = 'input admin-filter admin-customer-access-filter';
    select.id = 'admin-access-filter';
    select.setAttribute('aria-label', 'Filter accounts by access');
    select.innerHTML = `
      <option value="all">All access</option>
      <option value="active">Active access</option>
      <option value="suspended">Suspended</option>
      <option value="banned">Banned</option>`;
    controls.appendChild(select);
    select.addEventListener('change', queueDecorateRows);

    const panel = document.getElementById('accounts-panel');
    const note = document.createElement('div');
    note.className = 'admin-customer-access-note';
    note.innerHTML = '<i data-lucide="shield-alert"></i><div><strong>Customer access controls</strong><span>Suspend keeps the customer’s data and public cards. Ban also takes published cards offline. Permanent delete requires typing DELETE and is blocked while an active Stripe subscription is connected.</span></div>';
    controls.insertAdjacentElement('afterend', note);
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  function setBadge(badge, status) {
    const labels = { active: 'Active', suspended: 'Suspended', banned: 'Banned', owner: 'LIW Admin' };
    if (badge.dataset.access !== status) badge.dataset.access = status;
    const label = labels[status] || 'Active';
    if (badge.textContent !== label) badge.textContent = label;
  }

  function decorateRows() {
    decorateQueued = false;
    ensureAccessFilter();
    const body = document.getElementById('admin-user-rows');
    if (!body) return;

    const filter = document.getElementById('admin-access-filter')?.value || 'all';
    let visible = 0;

    body.querySelectorAll('tr').forEach(row => {
      const info = rowInfo(row);
      if (!info) return;
      const isAdmin = info.role.includes('admin');
      const status = isAdmin ? 'owner' : (accountStates.get(info.userId)?.status || 'active');
      row.dataset.accountAccess = status;

      const personCopy = info.cells[0]?.querySelector('.admin-person > div');
      if (personCopy) {
        let badge = personCopy.querySelector('.admin-access-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'admin-access-badge';
          personCopy.appendChild(badge);
        }
        setBadge(badge, status);
      }

      const actions = info.cells[6]?.querySelector('.admin-row-actions');
      if (actions && !isAdmin && !actions.querySelector('[data-manage-customer]')) {
        const button = document.createElement('button');
        button.className = 'btn btn-light btn-sm admin-manage-customer-btn';
        button.type = 'button';
        button.dataset.manageCustomer = info.userId;
        button.innerHTML = '<i data-lucide="shield"></i> Manage';
        button.addEventListener('click', () => openManageDialog(info.userId));
        actions.appendChild(button);
      }

      const show = filter === 'all' || status === filter;
      row.hidden = !show;
      if (show) visible += 1;
    });

    const count = document.getElementById('admin-account-visible-count');
    if (count && filter !== 'all') count.textContent = String(visible);
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  function queueDecorateRows() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(decorateRows);
  }

  function ensureDialog() {
    let dialog = document.getElementById('admin-customer-manage-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'admin-customer-manage-dialog';
    dialog.innerHTML = `
      <div class="admin-customer-dialog-shell">
        <div class="admin-customer-dialog-head">
          <div><span class="eyebrow">Customer access</span><h2 id="admin-customer-dialog-name">Manage customer</h2><p id="admin-customer-dialog-email"></p></div>
          <button class="admin-customer-dialog-close" type="button" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="admin-customer-dialog-body">
          <div class="admin-customer-status-card">
            <div><small>Current access</small><strong id="admin-customer-current-status">Active</strong></div>
            <span class="admin-access-badge" id="admin-customer-dialog-badge" data-access="active">Active</span>
          </div>
          <p class="admin-customer-status-copy" id="admin-customer-status-copy"></p>
          <label class="admin-customer-reason"><span>Reason / internal note</span><textarea class="input" id="admin-customer-reason" maxlength="500" placeholder="Optional for suspension. Required for a ban."></textarea></label>
          <div class="admin-customer-actions-grid">
            <button class="btn admin-customer-action-suspend" type="button" data-customer-action="suspend"><i data-lucide="pause-circle"></i> Suspend</button>
            <button class="btn admin-customer-action-ban" type="button" data-customer-action="ban"><i data-lucide="ban"></i> Ban</button>
            <button class="btn admin-customer-action-reactivate" type="button" data-customer-action="reactivate"><i data-lucide="shield-check"></i> Reactivate</button>
          </div>
          <div class="admin-customer-danger">
            <div class="admin-customer-danger-head"><div><strong>Danger zone</strong><span>Permanent deletion removes the Supabase Auth account and database records that cascade with it. This cannot be undone.</span></div><button class="admin-customer-delete-open" type="button">Delete account</button></div>
            <div class="admin-customer-delete-confirm" id="admin-customer-delete-confirm">
              <label>Type DELETE to confirm permanent deletion<input class="input" id="admin-customer-delete-word" autocomplete="off" placeholder="DELETE"></label>
              <div class="admin-customer-delete-confirm-row"><span>Active Stripe subscriptions must be canceled before deletion.</span><button class="admin-customer-delete-final" id="admin-customer-delete-final" type="button" disabled>Permanently delete</button></div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    dialog.querySelector('.admin-customer-dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelectorAll('[data-customer-action]').forEach(button => button.addEventListener('click', () => runAccessAction(button.dataset.customerAction, button)));
    dialog.querySelector('.admin-customer-delete-open')?.addEventListener('click', () => {
      dialog.querySelector('#admin-customer-delete-confirm')?.classList.add('is-open');
      dialog.querySelector('#admin-customer-delete-word')?.focus();
    });
    dialog.querySelector('#admin-customer-delete-word')?.addEventListener('input', event => {
      const final = dialog.querySelector('#admin-customer-delete-final');
      if (final) final.disabled = event.currentTarget.value !== 'DELETE';
    });
    dialog.querySelector('#admin-customer-delete-final')?.addEventListener('click', event => runDelete(event.currentTarget));

    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    return dialog;
  }

  function currentRowInfo(userId) {
    const row = [...document.querySelectorAll('#admin-user-rows tr')].find(item => findUserId(item) === userId);
    return rowInfo(row);
  }

  function openManageDialog(userId) {
    const info = currentRowInfo(userId);
    if (!info) return;
    selectedUserId = userId;
    const dialog = ensureDialog();
    const state = accountStates.get(userId) || { status: 'active', reason: '' };
    const status = state.status || 'active';

    dialog.querySelector('#admin-customer-dialog-name').textContent = info.name;
    dialog.querySelector('#admin-customer-dialog-email').textContent = info.email || 'Email unavailable';
    dialog.querySelector('#admin-customer-current-status').textContent = status.charAt(0).toUpperCase() + status.slice(1);
    const badge = dialog.querySelector('#admin-customer-dialog-badge');
    setBadge(badge, status);
    dialog.querySelector('#admin-customer-status-copy').textContent = accessCopy(status);
    dialog.querySelector('#admin-customer-reason').value = state.reason || '';
    dialog.querySelector('#admin-customer-delete-confirm').classList.remove('is-open');
    dialog.querySelector('#admin-customer-delete-word').value = '';
    dialog.querySelector('#admin-customer-delete-final').disabled = true;

    dialog.querySelector('[data-customer-action="suspend"]').disabled = status === 'suspended';
    dialog.querySelector('[data-customer-action="ban"]').disabled = status === 'banned';
    dialog.querySelector('[data-customer-action="reactivate"]').disabled = status === 'active';

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  function setBusy(dialog, busy) {
    dialog.classList.toggle('admin-customer-busy', busy);
    dialog.querySelectorAll('button,input,textarea').forEach(control => {
      if (busy) {
        control.dataset.wasDisabled = String(control.disabled);
        control.disabled = true;
      } else if (control.dataset.wasDisabled !== 'true') {
        control.disabled = false;
      }
    });
  }

  async function runAccessAction(action, button) {
    if (!selectedUserId || !button) return;
    const dialog = ensureDialog();
    const reason = dialog.querySelector('#admin-customer-reason')?.value?.trim() || '';
    if (action === 'ban' && !reason) {
      toast?.('Enter a reason before banning this customer.');
      dialog.querySelector('#admin-customer-reason')?.focus();
      return;
    }

    const verb = action === 'reactivate' ? 'restore access for' : `${action}`;
    const info = currentRowInfo(selectedUserId);
    if (!confirm(`Are you sure you want to ${verb} ${info?.name || 'this customer'}?`)) return;

    setBusy(dialog, true);
    try {
      const result = await callAdminAction(action, { userId: selectedUserId, reason });
      if (result.account) accountStates.set(selectedUserId, result.account);
      toast?.(result.message || 'Customer access updated.');
      dialog.close();
      queueDecorateRows();
    } catch (error) {
      toast?.(error?.message || 'Unable to update customer access.');
    } finally {
      setBusy(dialog, false);
    }
  }

  async function runDelete(button) {
    if (!selectedUserId || !button) return;
    const dialog = ensureDialog();
    const word = dialog.querySelector('#admin-customer-delete-word')?.value || '';
    if (word !== 'DELETE') return;
    const info = currentRowInfo(selectedUserId);
    if (!confirm(`Permanently delete ${info?.name || 'this customer'}? This cannot be undone.`)) return;

    setBusy(dialog, true);
    try {
      const result = await callAdminAction('delete', { userId: selectedUserId, confirmation: 'DELETE' });
      toast?.(result.message || 'Customer account deleted.');
      dialog.close();
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      toast?.(error?.message || 'Unable to delete this customer.');
    } finally {
      setBusy(dialog, false);
    }
  }

  async function loadAccountStates() {
    try {
      const result = await callAdminAction('list');
      (result.accounts || []).forEach(account => accountStates.set(account.userId, account));
      queueDecorateRows();
    } catch (error) {
      console.warn('LIW staging customer access controls unavailable:', error);
      toast?.(error?.message || 'Customer access controls could not load.');
    }
  }

  function boot() {
    ensureAccessFilter();
    ensureDialog();
    const body = document.getElementById('admin-user-rows');
    if (body) new MutationObserver(queueDecorateRows).observe(body, { childList: true });
    ['admin-user-search', 'admin-plan-filter', 'admin-account-status-filter'].forEach(id => {
      document.getElementById(id)?.addEventListener(id.includes('search') ? 'input' : 'change', () => setTimeout(queueDecorateRows, 0));
    });
    queueDecorateRows();
    loadAccountStates();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
