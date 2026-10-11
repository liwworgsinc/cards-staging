/* LIW Cards staging — Super Admin self-service card allowance. */
(function () {
  const DEFAULT_LIMIT = 100;
  const MAX_LIMIT = 1000000;
  let allowanceCache = null;
  let allowancePromise = null;
  let currentAdminUser = null;

  function normalizeLimit(value) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
    return Math.min(MAX_LIMIT, Math.max(1, parsed));
  }

  async function resolveAdminUser(preferredUser = null) {
    const user = preferredUser || (typeof window.getLiwSessionUser === 'function' ? await window.getLiwSessionUser() : null);
    if (!user) return null;

    let profile = null;
    try {
      const result = await window.supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      profile = result?.data || null;
    } catch (_) {}

    if (typeof window.isLiwAdminAccount !== 'function' || !window.isLiwAdminAccount(user, profile)) return null;
    currentAdminUser = user;
    return user;
  }

  async function loadAllowance(preferredUser = null, { refresh = false } = {}) {
    if (allowanceCache && !refresh) return allowanceCache;
    if (allowancePromise && !refresh) return allowancePromise;

    allowancePromise = (async () => {
      const user = await resolveAdminUser(preferredUser);
      if (!user) {
        allowanceCache = { isAdmin: false, limit: DEFAULT_LIMIT, unlimited: false };
        return allowanceCache;
      }

      const { data, error } = await window.supabaseClient
        .from('workspace_settings')
        .select('admin_card_limit,admin_card_limit_unlimited')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('[LIW Admin Card Allowance] settings lookup failed:', error);
      }

      allowanceCache = {
        isAdmin: true,
        limit: normalizeLimit(data?.admin_card_limit),
        unlimited: Boolean(data?.admin_card_limit_unlimited)
      };
      return allowanceCache;
    })();

    try {
      return await allowancePromise;
    } finally {
      allowancePromise = null;
    }
  }

  function clearAllowanceCache() {
    allowanceCache = null;
    allowancePromise = null;
    if (typeof window.clearLiwAccessContextCache === 'function') window.clearLiwAccessContextCache();
  }

  window.getLiwAdminCardAllowance = loadAllowance;
  window.clearLiwAdminCardAllowanceCache = clearAllowanceCache;

  const originalAccessContext = window.getLiwAccessContext;
  if (typeof originalAccessContext === 'function' && !originalAccessContext.__liwAdminAllowanceWrapped) {
    const wrappedAccessContext = async function (...args) {
      const access = await originalAccessContext.apply(this, args);
      if (access?.isAdmin && !access?.isPlanPreview) {
        const allowance = await loadAllowance(access.user || args[0] || null);
        access.adminCardLimitUnlimited = allowance.unlimited;
        access.adminCardLimit = allowance.limit;
        access.cardLimit = allowance.unlimited ? null : allowance.limit;
        setTimeout(() => applyAdminCapacityUi(allowance), 0);
      }
      return access;
    };
    wrappedAccessContext.__liwAdminAllowanceWrapped = true;
    window.getLiwAccessContext = wrappedAccessContext;
  }

  function capacityLabel(allowance) {
    return allowance.unlimited ? 'Unlimited' : String(allowance.limit);
  }

  function applyDashboardCapacity(allowance) {
    const usageCount = Number.parseInt(document.getElementById('usage-count')?.textContent || document.getElementById('card-count')?.textContent || '0', 10) || 0;
    const label = capacityLabel(allowance);

    const renewal = document.getElementById('renewal-date');
    if (renewal) renewal.textContent = allowance.unlimited ? 'Unlimited cards · no billing' : `${allowance.limit} cards included · no billing`;

    const sidebarCopy = document.getElementById('sidebar-plan-copy');
    if (sidebarCopy) sidebarCopy.textContent = allowance.unlimited
      ? 'Unlimited cards · all software features unlocked.'
      : `${allowance.limit} cards included · all software features unlocked.`;

    const cardUsage = document.getElementById('card-usage');
    if (cardUsage) cardUsage.textContent = allowance.unlimited ? 'Unlimited capacity' : `${Math.max(allowance.limit - usageCount, 0)} remaining`;

    const usageLimit = document.getElementById('usage-limit');
    if (usageLimit) usageLimit.textContent = allowance.unlimited ? '∞' : label;

    const progress = document.getElementById('usage-progress');
    if (progress) progress.style.width = allowance.unlimited ? '0%' : `${Math.min(100, usageCount / Math.max(1, allowance.limit) * 100)}%`;

    const welcomeCopy = document.getElementById('welcome-copy');
    if (welcomeCopy && document.getElementById('plan')?.textContent?.includes('LIW Admin')) {
      welcomeCopy.textContent = allowance.unlimited
        ? 'Create unlimited LIW cards with every software feature unlocked and no subscription charges.'
        : `Create up to ${allowance.limit} LIW cards with every software feature unlocked and no subscription charges.`;
    }
  }

  function applyAdminOverviewCapacity(allowance) {
    const label = capacityLabel(allowance);
    const capacity = document.querySelector('.admin-capacity span');
    if (capacity) capacity.textContent = `/${allowance.unlimited ? '∞' : label} own cards used`;

    const footer = document.querySelector('.sidebar-footer .sidebar-plan small');
    if (footer && /cards/i.test(footer.textContent || '')) {
      footer.textContent = allowance.unlimited
        ? 'Unlimited cards · all software features · no subscription billing'
        : `${allowance.limit} cards · all software features · no subscription billing`;
    }

    const email = String(currentAdminUser?.email || '').trim().toLowerCase();
    if (email) {
      document.querySelectorAll('#admin-user-rows tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const rowEmail = String(cells[1]?.textContent || '').trim().toLowerCase();
        if (!rowEmail.includes(email)) return;
        const planStrong = cells[3]?.querySelector('strong');
        const countStrong = cells[4]?.querySelector('strong');
        if (planStrong) planStrong.textContent = allowance.unlimited ? 'Admin · Unlimited cards' : `Admin · ${allowance.limit} cards`;
        if (countStrong) {
          const currentCount = String(countStrong.textContent || '0').split('/')[0].trim();
          countStrong.textContent = `${currentCount} / ${allowance.unlimited ? '∞' : allowance.limit}`;
        }
      });
    }
  }

  function applyAdminCapacityUi(allowance) {
    if (!allowance?.isAdmin) return;
    applyDashboardCapacity(allowance);
    applyAdminOverviewCapacity(allowance);
  }

  function panelMarkup(allowance) {
    return `
      <div class="section-title admin-section-title" style="margin-bottom:18px">
        <div>
          <span class="eyebrow">Super Admin</span>
          <h2 style="margin:8px 0 5px">Card Allowance</h2>
          <p class="muted" style="margin:0">Control how many LIW cards your Super Admin workspace can create. Customer Free, Lite, Plus, and Pro limits are not changed.</p>
        </div>
        <span class="status-pill active" id="admin-card-allowance-status">${allowance.unlimited ? 'Unlimited' : `${allowance.limit} cards`}</span>
      </div>
      <form id="admin-card-allowance-form" style="display:grid;gap:16px;max-width:720px">
        <label class="toggle-row" style="margin:0">
          <input id="admin-card-unlimited" type="checkbox" ${allowance.unlimited ? 'checked' : ''}/>
          <span><strong>Unlimited cards</strong><small>No numeric card cap for this Super Admin workspace.</small></span>
        </label>
        <label class="form-group" for="admin-card-limit-input">
          <span>Custom card limit</span>
          <input class="input" id="admin-card-limit-input" type="number" min="1" max="${MAX_LIMIT}" step="1" value="${allowance.limit}" ${allowance.unlimited ? 'disabled' : ''}/>
          <small class="muted">Enter any whole number from 1 to ${MAX_LIMIT.toLocaleString()}. Turn Unlimited off to use this number.</small>
        </label>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" id="admin-card-allowance-save" type="submit"><i data-lucide="save" size="16"></i> Save card allowance</button>
          <span class="muted" id="admin-card-allowance-message" style="align-self:center"></span>
        </div>
      </form>`;
  }

  async function mountAdminAllowancePanel() {
    if (!/(^|\/)admin\.html$/.test(location.pathname)) return;
    if (document.getElementById('admin-card-allowance-panel')) return;

    const user = await resolveAdminUser();
    if (!user) return;
    const allowance = await loadAllowance(user);
    const hero = document.querySelector('.admin-owner-banner');
    if (!hero) return;

    const panel = document.createElement('section');
    panel.id = 'admin-card-allowance-panel';
    panel.className = 'card admin-panel admin-support-panel';
    panel.style.marginTop = '22px';
    panel.innerHTML = panelMarkup(allowance);
    hero.insertAdjacentElement('afterend', panel);

    const unlimited = panel.querySelector('#admin-card-unlimited');
    const input = panel.querySelector('#admin-card-limit-input');
    const form = panel.querySelector('#admin-card-allowance-form');
    const saveButton = panel.querySelector('#admin-card-allowance-save');
    const message = panel.querySelector('#admin-card-allowance-message');

    unlimited?.addEventListener('change', () => {
      if (input) input.disabled = unlimited.checked;
    });

    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const isUnlimited = Boolean(unlimited?.checked);
      const limit = normalizeLimit(input?.value);

      if (!isUnlimited) {
        const raw = Number(input?.value);
        if (!Number.isInteger(raw) || raw < 1 || raw > MAX_LIMIT) {
          if (message) message.textContent = `Enter a whole number from 1 to ${MAX_LIMIT.toLocaleString()}.`;
          input?.focus();
          return;
        }
      }

      if (saveButton) saveButton.disabled = true;
      if (message) message.textContent = 'Saving…';

      try {
        const { data, error } = await window.supabaseClient
          .from('workspace_settings')
          .upsert({
            user_id: user.id,
            admin_card_limit: limit,
            admin_card_limit_unlimited: isUnlimited
          }, { onConflict: 'user_id' })
          .select('admin_card_limit,admin_card_limit_unlimited')
          .single();

        if (error) throw error;

        allowanceCache = {
          isAdmin: true,
          limit: normalizeLimit(data?.admin_card_limit),
          unlimited: Boolean(data?.admin_card_limit_unlimited)
        };
        if (typeof window.clearLiwAccessContextCache === 'function') window.clearLiwAccessContextCache();
        applyAdminCapacityUi(allowanceCache);

        const status = panel.querySelector('#admin-card-allowance-status');
        if (status) status.textContent = allowanceCache.unlimited ? 'Unlimited' : `${allowanceCache.limit} cards`;
        if (message) message.textContent = allowanceCache.unlimited ? 'Saved — Super Admin is unlimited.' : `Saved — Super Admin limit is ${allowanceCache.limit}.`;
        if (typeof window.toast === 'function') window.toast('Super Admin card allowance saved.');
      } catch (error) {
        console.error('[LIW Admin Card Allowance] save failed:', error);
        if (message) message.textContent = error?.message || 'Could not save the card allowance.';
        if (typeof window.toast === 'function') window.toast(error?.message || 'Could not save the card allowance.');
      } finally {
        if (saveButton) saveButton.disabled = false;
      }
    });

    applyAdminCapacityUi(allowance);
    if (window.lucide) window.lucide.createIcons();

    [350, 900, 1800].forEach(delay => setTimeout(() => applyAdminCapacityUi(allowanceCache || allowance), delay));
  }

  async function refreshCurrentPageCapacity() {
    try {
      const allowance = await loadAllowance();
      if (!allowance.isAdmin) return;
      applyAdminCapacityUi(allowance);
      [250, 750, 1500].forEach(delay => setTimeout(() => applyAdminCapacityUi(allowanceCache || allowance), delay));
    } catch (error) {
      console.warn('[LIW Admin Card Allowance] UI refresh skipped:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountAdminAllowancePanel();
      refreshCurrentPageCapacity();
    }, { once: true });
  } else {
    mountAdminAllowancePanel();
    refreshCurrentPageCapacity();
  }
})();
