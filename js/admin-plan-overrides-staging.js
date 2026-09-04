(() => {
  'use strict';

  const isStaging = location.hostname === 'liwworgsinc.github.io'
    && location.pathname.startsWith('/cards-staging/');
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
    || location.hostname.startsWith('staging.')
    || location.hostname.startsWith('test.');
  if ((!isStaging && !isLocal) || !/\/admin\.html$/i.test(location.pathname)) return;
  if (globalThis.__liwAdminPlanOverridesMounted) return;
  globalThis.__liwAdminPlanOverridesMounted = true;

  const FUNCTION_URL = `${LIW_CONFIG.supabaseUrl}/functions/v1/admin-plan-override`;
  const STAGING_HEADER = 'cards-staging-admin-v1';
  const PLAN_LABELS = {
    starter: 'Free',
    lite: 'Lite',
    plus: 'Plus',
    pro: 'Pro',
    agency: 'Agency'
  };
  const planStates = new Map();
  let selectedUserId = '';
  let decorateQueued = false;

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function planLabel(key = 'starter') {
    return PLAN_LABELS[String(key || 'starter').toLowerCase()] || 'Free';
  }

  function sourceLabel(state) {
    if (state?.planSource === 'admin_override') return 'Admin override';
    if (state?.planSource === 'stripe') return 'Stripe-managed';
    return 'Free / no billing';
  }

  function defaultPlanState(userId) {
    return {
      userId,
      planKey: 'starter',
      planStatus: 'active',
      planSource: 'free',
      overridePlanKey: null,
      overrideReason: '',
      overrideBy: null,
      overrideAt: null,
      billingPlanKey: null,
      billingStatus: null,
      hasStripeSubscription: false
    };
  }

  async function callPlanAction(action, payload = {}) {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) throw new Error('Your admin session expired. Sign in again.');

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: LIW_CONFIG.supabaseKey,
        'x-liw-staging-admin': STAGING_HEADER
      },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to manage this customer plan.');
    return data;
  }

  function findUserId(row) {
    if (row?.dataset?.liwPlanUserId) return row.dataset.liwPlanUserId;
    const cardsButton = [...(row?.querySelectorAll('button') || [])]
      .find(button => /showCustomerCards\(/.test(button.getAttribute('onclick') || ''));
    const match = cardsButton?.getAttribute('onclick')?.match(/showCustomerCards\('([^']+)'\)/);
    const userId = match?.[1] || '';
    if (userId) row.dataset.liwPlanUserId = userId;
    return userId;
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
      cells,
      row
    };
  }

  function updatePlanCell(info, state) {
    const cell = info?.cells?.[3];
    if (!cell || !state) return;
    let meta = cell.querySelector('.admin-plan-override-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'admin-plan-override-meta';
      cell.appendChild(meta);
    }
    meta.dataset.source = state.planSource || 'free';
    meta.innerHTML = `<span>${esc(sourceLabel(state))}</span>${state.planSource === 'admin_override' ? '<i data-lucide="shield-check" aria-hidden="true"></i>' : ''}`;
  }

  function decorateRows() {
    decorateQueued = false;
    const body = document.getElementById('admin-user-rows');
    if (!body) return;

    body.querySelectorAll('tr').forEach(row => {
      const info = rowInfo(row);
      if (!info) return;
      const isAdmin = info.role.includes('admin');
      const state = planStates.get(info.userId) || defaultPlanState(info.userId);
      if (!isAdmin) updatePlanCell(info, state);

      const actions = info.cells[6]?.querySelector('.admin-row-actions');
      if (actions && !isAdmin && !actions.querySelector('[data-admin-plan-manage]')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-light btn-sm admin-plan-manage-btn';
        button.dataset.adminPlanManage = info.userId;
        button.innerHTML = '<i data-lucide="badge-dollar-sign"></i> Plan';
        button.addEventListener('click', () => openPlanDialog(info.userId));
        actions.appendChild(button);
      }
    });

    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  function queueDecorateRows() {
    if (decorateQueued) return;
    decorateQueued = true;
    requestAnimationFrame(decorateRows);
  }

  function currentRowInfo(userId) {
    const row = [...document.querySelectorAll('#admin-user-rows tr')]
      .find(item => findUserId(item) === userId);
    return rowInfo(row);
  }

  function ensureFilterOptions() {
    const select = document.getElementById('admin-plan-filter');
    if (!select) return;
    const options = [...select.options];
    const insertBeforeAdmin = select.querySelector('option[value="admin"]');
    [
      ['lite', 'Lite'],
      ['agency', 'Agency']
    ].forEach(([value, label]) => {
      if (options.some(option => option.value === value) || select.querySelector(`option[value="${value}"]`)) return;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      select.insertBefore(option, insertBeforeAdmin || null);
    });
  }

  function ensureDialog() {
    let dialog = document.getElementById('admin-plan-override-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'admin-plan-override-dialog';
    dialog.innerHTML = `
      <div class="admin-plan-dialog-shell">
        <div class="admin-plan-dialog-head">
          <div>
            <span class="eyebrow">Super Admin · staging</span>
            <h2 id="admin-plan-dialog-name">Manage customer plan</h2>
            <p id="admin-plan-dialog-email"></p>
          </div>
          <button type="button" class="admin-plan-dialog-close" aria-label="Close"><i data-lucide="x"></i></button>
        </div>
        <div class="admin-plan-dialog-body">
          <div class="admin-plan-current-card">
            <div><small>Effective access plan</small><strong id="admin-plan-current-plan">Free</strong></div>
            <span class="admin-plan-source" id="admin-plan-source" data-source="free">Free / no billing</span>
          </div>

          <div class="admin-plan-billing-note" id="admin-plan-billing-note">
            <i data-lucide="shield-check"></i>
            <div><strong>Access override only</strong><span>Changing a plan here does not charge, cancel, refund, or modify the customer’s Stripe subscription.</span></div>
          </div>

          <div class="admin-plan-form-grid">
            <label class="admin-plan-field">
              <span>Set customer access to</span>
              <select class="input" id="admin-plan-select">
                <option value="starter">Free</option>
                <option value="lite">Lite</option>
                <option value="plus">Plus</option>
                <option value="pro">Pro</option>
                <option value="agency">Agency</option>
              </select>
            </label>
            <label class="admin-plan-field">
              <span>Reason / internal note</span>
              <textarea class="input" id="admin-plan-reason" maxlength="500" placeholder="Example: complimentary Pro access for partner demo"></textarea>
            </label>
          </div>

          <div class="admin-plan-actions">
            <button class="btn btn-primary" id="admin-plan-apply" type="button"><i data-lucide="shield-check"></i> Apply admin override</button>
            <button class="btn btn-light" id="admin-plan-return-billing" type="button"><i data-lucide="refresh-cw"></i> Return to billing plan</button>
          </div>
          <p class="admin-plan-restore-copy" id="admin-plan-restore-copy"></p>

          <section class="admin-plan-history-section">
            <div class="admin-plan-history-head"><strong>Plan history</strong><span>Latest 20 admin changes</span></div>
            <div class="admin-plan-history" id="admin-plan-history"><div class="admin-plan-history-empty">No admin plan changes yet.</div></div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    dialog.querySelector('.admin-plan-dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector('#admin-plan-apply')?.addEventListener('click', applyOverride);
    dialog.querySelector('#admin-plan-return-billing')?.addEventListener('click', clearOverride);
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    return dialog;
  }

  function setBusy(dialog, busy) {
    dialog.classList.toggle('admin-plan-dialog-busy', busy);
    dialog.querySelectorAll('button,input,textarea,select').forEach(control => {
      if (busy) {
        control.dataset.wasDisabled = String(control.disabled);
        control.disabled = true;
      } else {
        control.disabled = control.dataset.wasDisabled === 'true';
        delete control.dataset.wasDisabled;
      }
    });
  }

  function renderDialogState(dialog, state) {
    const effective = planLabel(state.planKey);
    dialog.querySelector('#admin-plan-current-plan').textContent = effective;
    const source = dialog.querySelector('#admin-plan-source');
    source.textContent = sourceLabel(state);
    source.dataset.source = state.planSource || 'free';
    dialog.querySelector('#admin-plan-select').value = state.planKey || 'starter';
    dialog.querySelector('#admin-plan-reason').value = state.overrideReason || '';

    const restoreButton = dialog.querySelector('#admin-plan-return-billing');
    restoreButton.disabled = state.planSource !== 'admin_override';
    const restorePlan = planLabel(state.billingPlanKey || 'starter');
    const restoreCopy = dialog.querySelector('#admin-plan-restore-copy');
    if (state.planSource === 'admin_override') {
      restoreCopy.textContent = state.hasStripeSubscription
        ? `Billing is still tracking ${restorePlan}. “Return to billing plan” removes the override and restores that access.`
        : 'This customer has no active Stripe plan saved. Returning to billing restores Free access.';
    } else if (state.planSource === 'stripe') {
      restoreCopy.textContent = `This customer’s access currently follows Stripe (${effective}).`;
    } else {
      restoreCopy.textContent = 'This customer currently has Free access with no billing override.';
    }
  }

  async function openPlanDialog(userId) {
    const info = currentRowInfo(userId);
    if (!info) return;
    selectedUserId = userId;
    const dialog = ensureDialog();
    const state = planStates.get(userId) || defaultPlanState(userId);
    dialog.querySelector('#admin-plan-dialog-name').textContent = info.name;
    dialog.querySelector('#admin-plan-dialog-email').textContent = info.email || 'Email unavailable';
    renderDialogState(dialog, state);
    dialog.querySelector('#admin-plan-history').innerHTML = '<div class="admin-plan-history-empty">Loading history…</div>';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    loadHistory(userId);
  }

  async function loadHistory(userId) {
    const root = ensureDialog().querySelector('#admin-plan-history');
    try {
      const result = await callPlanAction('history', { userId });
      if (userId !== selectedUserId) return;
      const rows = result.history || [];
      if (!rows.length) {
        root.innerHTML = '<div class="admin-plan-history-empty">No admin plan changes yet.</div>';
        return;
      }
      root.innerHTML = rows.map(row => {
        const date = row.changed_at ? new Date(row.changed_at) : null;
        const when = date && !Number.isNaN(date.getTime())
          ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
          : 'Unknown time';
        const verb = row.action === 'restore' ? 'Restored' : 'Override';
        return `<article class="admin-plan-history-row">
          <div><strong>${esc(planLabel(row.previous_plan_key))} <span>→</span> ${esc(planLabel(row.new_plan_key))}</strong><small>${esc(verb)} · ${esc(when)}</small></div>
          <p>${row.reason ? esc(row.reason) : 'No internal note'}</p>
          <span class="admin-plan-history-by">${esc(row.changed_by || 'LIW Admin')}</span>
        </article>`;
      }).join('');
    } catch (error) {
      root.innerHTML = `<div class="admin-plan-history-empty">${esc(error?.message || 'Unable to load plan history.')}</div>`;
    }
  }

  async function applyOverride() {
    if (!selectedUserId) return;
    const dialog = ensureDialog();
    const planKey = dialog.querySelector('#admin-plan-select')?.value || 'starter';
    const reason = dialog.querySelector('#admin-plan-reason')?.value?.trim() || '';
    const info = currentRowInfo(selectedUserId);
    const label = planLabel(planKey);
    if (!confirm(`Give ${info?.name || 'this customer'} ${label} access as an admin override? Stripe billing will not be changed.`)) return;

    setBusy(dialog, true);
    try {
      const result = await callPlanAction('set_plan', { userId: selectedUserId, planKey, reason });
      if (result.plan) planStates.set(selectedUserId, result.plan);
      toast?.(result.message || `${label} access applied.`);
      dialog.close();
      window.setTimeout(() => location.reload(), 450);
    } catch (error) {
      toast?.(error?.message || 'Unable to apply this plan.');
    } finally {
      setBusy(dialog, false);
    }
  }

  async function clearOverride() {
    if (!selectedUserId) return;
    const dialog = ensureDialog();
    const info = currentRowInfo(selectedUserId);
    const state = planStates.get(selectedUserId) || defaultPlanState(selectedUserId);
    if (state.planSource !== 'admin_override') return;
    const restorePlan = planLabel(state.billingPlanKey || 'starter');
    const reason = dialog.querySelector('#admin-plan-reason')?.value?.trim() || '';
    if (!confirm(`Remove the admin override for ${info?.name || 'this customer'} and restore ${restorePlan} access?`)) return;

    setBusy(dialog, true);
    try {
      const result = await callPlanAction('clear_override', { userId: selectedUserId, reason });
      if (result.plan) planStates.set(selectedUserId, result.plan);
      toast?.(result.message || 'Customer returned to their billing-managed plan.');
      dialog.close();
      window.setTimeout(() => location.reload(), 450);
    } catch (error) {
      toast?.(error?.message || 'Unable to remove this override.');
    } finally {
      setBusy(dialog, false);
    }
  }

  async function loadPlanStates() {
    try {
      const result = await callPlanAction('list');
      (result.plans || []).forEach(state => {
        if (state?.userId) planStates.set(state.userId, state);
      });
      queueDecorateRows();
    } catch (error) {
      console.warn('LIW staging admin plan controls unavailable:', error);
      toast?.(error?.message || 'Customer plan controls could not load.');
    }
  }

  function boot() {
    ensureFilterOptions();
    ensureDialog();
    const body = document.getElementById('admin-user-rows');
    if (body) new MutationObserver(queueDecorateRows).observe(body, { childList: true });
    ['admin-user-search', 'admin-plan-filter', 'admin-account-status-filter'].forEach(id => {
      const node = document.getElementById(id);
      node?.addEventListener(id.includes('search') ? 'input' : 'change', () => window.setTimeout(queueDecorateRows, 0));
    });
    queueDecorateRows();
    loadPlanStates();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
