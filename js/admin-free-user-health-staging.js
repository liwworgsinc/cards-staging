(() => {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const HEALTH_META = {
    active: { label: 'Active', range: '0–30 days', order: 1, icon: 'circle-check-big' },
    'at-risk': { label: 'At risk', range: '31–90 days', order: 2, icon: 'triangle-alert' },
    dormant: { label: 'Dormant', range: '91–364 days', order: 3, icon: 'moon' },
    archive: { label: 'Archive eligible', range: '365+ days', order: 4, icon: 'archive' }
  };

  let healthRows = [];
  let filteredHealthRows = [];
  let healthInitTimer = null;

  function startWhenAdminReady(attempt = 0) {
    const ready = typeof adminAccounts !== 'undefined'
      && typeof adminCards !== 'undefined'
      && Array.isArray(adminAccounts)
      && Array.isArray(adminCards)
      && typeof adminProfileMap !== 'undefined'
      && adminProfileMap instanceof Map
      && adminProfileMap.size > 0;

    if (ready) {
      initFreeUserHealth();
      return;
    }

    if (attempt >= 80) return;
    healthInitTimer = window.setTimeout(() => startWhenAdminReady(attempt + 1), 250);
  }

  function initFreeUserHealth() {
    if (healthInitTimer) window.clearTimeout(healthInitTimer);
    if (document.getElementById('free-user-health-panel')) return;

    injectSidebarLink();
    const stats = document.querySelector('.admin-support-stats');
    if (!stats) return;
    stats.insertAdjacentHTML('afterend', panelMarkup());

    document.getElementById('free-health-search')?.addEventListener('input', renderFreeUserHealth);
    document.getElementById('free-health-filter')?.addEventListener('change', renderFreeUserHealth);
    document.getElementById('free-health-copy')?.addEventListener('click', copyFilteredFreeEmails);
    document.getElementById('free-health-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-free-health-cards]');
      if (!button) return;
      const userId = button.getAttribute('data-free-health-cards');
      if (userId && typeof showCustomerCards === 'function') showCustomerCards(userId);
    });

    renderFreeUserHealth();
  }

  function injectSidebarLink() {
    const overviewLink = document.querySelector('.sidebar nav a[href="admin.html"]');
    if (!overviewLink || document.querySelector('.sidebar a[href="#free-user-health-panel"]')) return;
    overviewLink.insertAdjacentHTML(
      'afterend',
      '<a href="#free-user-health-panel"><i data-lucide="activity" size="18"></i> Free user health</a>'
    );
  }

  function panelMarkup() {
    return `
      <section class="card admin-panel admin-support-panel liw-free-health-panel" id="free-user-health-panel">
        <div class="section-title admin-section-title liw-free-health-heading">
          <div>
            <span class="eyebrow">Retention &amp; reactivation</span>
            <h2>Free User Health</h2>
            <p class="muted">Find Free accounts that have gone quiet before they disappear. Activity uses the latest sign-in or card update.</p>
          </div>
          <div class="admin-section-count"><strong id="free-health-visible-count">0</strong><span> users shown</span></div>
        </div>

        <div class="liw-free-health-safety">
          <i data-lucide="shield-check"></i>
          <div><strong>Safe by design.</strong><span>This view never unpublishes or deletes a customer card. “Archive eligible” is a review flag only.</span></div>
        </div>

        <div class="liw-free-health-kpis" aria-label="Free user health summary">
          <button type="button" class="liw-free-health-kpi" data-health-filter="all"><span>Free accounts</span><strong id="free-health-total">0</strong><small>All Free users</small></button>
          <button type="button" class="liw-free-health-kpi active" data-health-filter="active"><span>Active</span><strong id="free-health-active">0</strong><small>0–30 days</small></button>
          <button type="button" class="liw-free-health-kpi at-risk" data-health-filter="at-risk"><span>At risk</span><strong id="free-health-risk">0</strong><small>31–90 days</small></button>
          <button type="button" class="liw-free-health-kpi dormant" data-health-filter="dormant"><span>Dormant</span><strong id="free-health-dormant">0</strong><small>91–364 days</small></button>
          <button type="button" class="liw-free-health-kpi archive" data-health-filter="archive"><span>Archive eligible</span><strong id="free-health-archive">0</strong><small>365+ days</small></button>
        </div>

        <div class="liw-free-health-policy" aria-label="Inactivity policy">
          <span><strong>30 days</strong> gentle check-in</span>
          <span><strong>60 days</strong> show what they can update</span>
          <span><strong>90 days</strong> dormant review</span>
          <span><strong>180 days</strong> keep-active reminder</span>
          <span><strong>12 months</strong> archive review</span>
        </div>

        <div class="admin-section-controls liw-free-health-controls">
          <label class="admin-control-search"><i data-lucide="search"></i><input class="input" id="free-health-search" placeholder="Search Free users by name or email" type="search"/></label>
          <select class="input admin-filter" id="free-health-filter" aria-label="Filter Free users by activity health">
            <option value="all">All Free users</option>
            <option value="active">Active · 0–30 days</option>
            <option value="at-risk">At risk · 31–90 days</option>
            <option value="dormant">Dormant · 91–364 days</option>
            <option value="archive">Archive eligible · 365+ days</option>
          </select>
          <button class="btn btn-light" id="free-health-copy" type="button"><i data-lucide="copy"></i> Copy shown emails</button>
        </div>

        <div class="liw-free-health-list" id="free-health-list"></div>
      </section>`;
  }

  function buildHealthRows() {
    const latestCardUpdate = new Map();
    adminCards.forEach(card => {
      const time = parseTime(card.updated_at);
      if (!time) return;
      const current = latestCardUpdate.get(card.user_id);
      if (!current || time > current) latestCardUpdate.set(card.user_id, time);
    });

    const now = Date.now();
    return adminAccounts
      .filter(row => {
        if (row.role === 'admin') return false;
        return String(row.subscription?.plan_key || 'starter') === 'starter';
      })
      .map(row => {
        const signIn = parseTime(row.contact?.last_sign_in_at);
        const cardUpdate = latestCardUpdate.get(row.id) || 0;
        const joined = parseTime(row.created_at);
        const activityCandidates = [
          signIn ? { time: signIn, source: 'Last sign-in' } : null,
          cardUpdate ? { time: cardUpdate, source: 'Card update' } : null,
          joined ? { time: joined, source: 'Account created' } : null
        ].filter(Boolean).sort((a, b) => b.time - a.time);

        const latest = activityCandidates[0] || { time: 0, source: 'No activity recorded' };
        const daysInactive = latest.time ? Math.max(0, Math.floor((now - latest.time) / DAY_MS)) : Number.POSITIVE_INFINITY;
        const bucket = classifyHealth(daysInactive);
        const email = String(row.contact?.email || '').trim();
        const name = String(row.full_name || '').trim();

        return {
          ...row,
          email,
          displayName: name || email || 'Unnamed account',
          activityTime: latest.time,
          activitySource: latest.source,
          daysInactive,
          bucket
        };
      })
      .sort((a, b) => {
        const orderDifference = HEALTH_META[b.bucket].order - HEALTH_META[a.bucket].order;
        if (orderDifference) return orderDifference;
        return b.daysInactive - a.daysInactive;
      });
  }

  function classifyHealth(daysInactive) {
    if (daysInactive <= 30) return 'active';
    if (daysInactive <= 90) return 'at-risk';
    if (daysInactive < 365) return 'dormant';
    return 'archive';
  }

  function renderFreeUserHealth() {
    healthRows = buildHealthRows();
    const query = String(document.getElementById('free-health-search')?.value || '').trim().toLowerCase();
    const filter = document.getElementById('free-health-filter')?.value || 'all';

    filteredHealthRows = healthRows.filter(row => {
      if (filter !== 'all' && row.bucket !== filter) return false;
      if (!query) return true;
      return row.displayName.toLowerCase().includes(query) || row.email.toLowerCase().includes(query);
    });

    updateHealthCounts();
    renderHealthRows();
    bindKpiFilters();
    if (window.lucide) lucide.createIcons();
  }

  function updateHealthCounts() {
    const counts = healthRows.reduce((summary, row) => {
      summary[row.bucket] += 1;
      return summary;
    }, { active: 0, 'at-risk': 0, dormant: 0, archive: 0 });

    setLocalText('free-health-total', healthRows.length);
    setLocalText('free-health-active', counts.active);
    setLocalText('free-health-risk', counts['at-risk']);
    setLocalText('free-health-dormant', counts.dormant);
    setLocalText('free-health-archive', counts.archive);
    setLocalText('free-health-visible-count', filteredHealthRows.length);
  }

  function bindKpiFilters() {
    document.querySelectorAll('[data-health-filter]').forEach(button => {
      if (button.dataset.healthBound === 'true') return;
      button.dataset.healthBound = 'true';
      button.addEventListener('click', () => {
        const filter = document.getElementById('free-health-filter');
        if (!filter) return;
        filter.value = button.getAttribute('data-health-filter') || 'all';
        renderFreeUserHealth();
        document.getElementById('free-health-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  function renderHealthRows() {
    const list = document.getElementById('free-health-list');
    if (!list) return;

    if (!filteredHealthRows.length) {
      list.innerHTML = '<div class="empty-state"><h3>No Free users match this view</h3><p class="muted">Try another search or activity status.</p></div>';
      return;
    }

    list.innerHTML = filteredHealthRows.map(row => {
      const meta = HEALTH_META[row.bucket];
      const activity = row.activityTime
        ? `${formatHealthDate(row.activityTime)} · ${formatInactiveDays(row.daysInactive)}`
        : 'No activity recorded';
      const cardLabel = row.cardCount === 1 ? '1 card' : `${row.cardCount || 0} cards`;
      const emailAction = row.email
        ? `<a class="btn btn-primary btn-sm" href="${safeAttr(reactivationHref(row))}" target="_blank" rel="noopener"><i data-lucide="mail"></i> Draft reactivation</a>`
        : '<span class="liw-free-health-no-email">Email unavailable</span>';

      return `<article class="liw-free-health-row ${safeHtml(row.bucket)}">
        <div class="liw-free-health-person">
          <span class="admin-person-avatar">${safeHtml(initials(row.displayName))}</span>
          <div>
            <strong>${safeHtml(row.displayName)}</strong>
            ${row.email ? `<a href="mailto:${safeAttr(row.email)}">${safeHtml(row.email)}</a>` : '<span class="muted">Email unavailable</span>'}
          </div>
        </div>
        <div class="liw-free-health-card-count"><span>Cards</span><strong>${safeHtml(cardLabel)}</strong><small>${row.cardCount ? 'Customer card data retained' : 'No card created yet'}</small></div>
        <div class="liw-free-health-activity"><span>Latest activity</span><strong>${safeHtml(activity)}</strong><small>${safeHtml(row.activitySource)}</small></div>
        <div class="liw-free-health-status"><span class="liw-free-health-pill ${safeHtml(row.bucket)}"><i data-lucide="${safeHtml(meta.icon)}"></i>${safeHtml(meta.label)}</span><small>${safeHtml(meta.range)}</small></div>
        <div class="liw-free-health-actions">
          ${emailAction}
          <button class="btn btn-light btn-sm" type="button" data-free-health-cards="${safeAttr(row.id)}"><i data-lucide="contact-round"></i> Cards</button>
        </div>
      </article>`;
    }).join('');
  }

  function reactivationHref(row) {
    const firstName = String(row.displayName || '').split(/\s+/)[0] || 'there';
    const dashboardUrl = typeof liwUrl === 'function' ? liwUrl('dashboard.html') : 'dashboard.html';
    const subject = 'Your LIW Digital Card is still here';
    const body = `Hi ${firstName},\n\nYour LIW Digital Card is still here and ready to use. Jump back in to update your card, add products or services, or share your QR code.\n\nOpen your dashboard: ${dashboardUrl}\n\n— LIW Cards`;
    const params = new URLSearchParams({ view: 'cm', fs: '1', to: row.email, su: subject, body });
    return `https://mail.google.com/mail/?${params.toString()}`;
  }

  async function copyFilteredFreeEmails() {
    const emails = [...new Set(filteredHealthRows.map(row => row.email).filter(Boolean))];
    if (!emails.length) {
      notify('No email addresses are available in this view.');
      return;
    }

    const text = emails.join(', ');
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    notify(`${emails.length} Free user email${emails.length === 1 ? '' : 's'} copied.`);
  }

  function parseTime(value) {
    if (!value) return 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function formatHealthDate(time) {
    if (!time) return '—';
    return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatInactiveDays(days) {
    if (!Number.isFinite(days)) return 'No activity';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  function initials(value) {
    return String(value || 'C').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('') || 'C';
  }

  function setLocalText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function notify(message) {
    if (typeof toast === 'function') toast(message);
  }

  function safeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeAttr(value) {
    return safeHtml(value).replace(/`/g, '&#096;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startWhenAdminReady(), { once: true });
  } else {
    startWhenAdminReady();
  }
})();
