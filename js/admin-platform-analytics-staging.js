(function () {
  'use strict';

  const isGithubStaging = location.hostname === 'liwworgsinc.github.io'
    && location.pathname.startsWith('/cards-staging/');
  if (!isGithubStaging || globalThis.__liwAdminPlatformAnalyticsMounted) return;
  globalThis.__liwAdminPlatformAnalyticsMounted = true;

  const numberFormat = new Intl.NumberFormat('en-US');
  const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  let currentDays = 30;

  function esc(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
  }

  function fmt(value) {
    return numberFormat.format(Number(value || 0));
  }

  function currentPageName() {
    return String(location.pathname.split('/').pop() || 'admin.html').toLowerCase();
  }

  function addSidebarLink() {
    const nav = document.querySelector('.sidebar nav');
    if (!nav || nav.querySelector('[data-platform-analytics-link]')) return;
    const adminLink = [...nav.querySelectorAll('a')].find(link => String(link.getAttribute('href') || '').includes('admin.html'));
    const link = document.createElement('a');
    link.href = '#platform-analytics-panel';
    link.dataset.platformAnalyticsLink = 'true';
    link.innerHTML = '<i data-lucide="chart-spline" size="18"></i> Platform analytics';
    if (adminLink?.nextSibling) nav.insertBefore(link, adminLink.nextSibling);
    else nav.appendChild(link);

    const cardAnalytics = [...nav.querySelectorAll('a')].find(item => String(item.getAttribute('href') || '').includes('analytics.html'));
    if (cardAnalytics && /analytics/i.test(cardAnalytics.textContent || '')) {
      cardAnalytics.innerHTML = '<i data-lucide="chart-no-axes-combined" size="18"></i> Card analytics';
    }
    if (window.lucide) lucide.createIcons();
  }

  function mountPanel() {
    if (document.getElementById('platform-analytics-panel')) return document.getElementById('platform-analytics-panel');
    const anchor = document.querySelector('.admin-support-stats') || document.querySelector('.admin-stats');
    if (!anchor) return null;

    const section = document.createElement('section');
    section.className = 'card admin-panel admin-support-panel platform-analytics-panel';
    section.id = 'platform-analytics-panel';
    section.innerHTML = `
      <div class="platform-analytics-head">
        <div>
          <span class="eyebrow">Traffic intelligence</span>
          <h2>Platform Analytics</h2>
          <p class="muted">See how people are discovering LIW Cards, what they visit, and how traffic turns into new accounts.</p>
          <span class="platform-analytics-status"><i data-lucide="radio-tower"></i> Staging tracker active</span>
        </div>
        <div class="platform-analytics-controls">
          <select class="input" id="platform-analytics-range" aria-label="Analytics range">
            <option value="7">Last 7 days</option>
            <option value="30" selected>Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button class="btn btn-light" id="platform-analytics-refresh" type="button"><i data-lucide="refresh-cw" size="16"></i> Refresh</button>
        </div>
      </div>

      <div class="platform-analytics-metrics">
        <article class="platform-metric"><span>Visitors today</span><strong id="platform-visitors-today">—</strong><small>Unique public visitors</small></article>
        <article class="platform-metric"><span>Visitors · 7 days</span><strong id="platform-visitors-7d">—</strong><small>Unique visitors</small></article>
        <article class="platform-metric"><span id="platform-period-visitor-label">Visitors · 30 days</span><strong id="platform-period-visitors">—</strong><small>Unique visitors</small></article>
        <article class="platform-metric"><span id="platform-page-view-label">Page views · 30 days</span><strong id="platform-period-pageviews">—</strong><small>Public pages + direct cards</small></article>
        <article class="platform-metric"><span id="platform-signup-label">Signups · 30 days</span><strong id="platform-period-signups">—</strong><small>New non-admin accounts</small></article>
        <article class="platform-metric"><span id="platform-conversion-label">Conversion · 30 days</span><strong id="platform-period-conversion">—</strong><small>Visitors → accounts</small></article>
      </div>

      <div class="platform-analytics-grid">
        <article class="platform-analytics-card">
          <div class="platform-analytics-card-header"><h3>Traffic trend</h3><small id="platform-trend-caption">Daily page views</small></div>
          <div class="platform-trend" id="platform-traffic-trend"><div class="platform-empty">Collecting traffic…</div></div>
          <div class="platform-trend-labels"><span id="platform-trend-start">—</span><span id="platform-trend-end">Today</span></div>
        </article>
        <article class="platform-analytics-card">
          <div class="platform-analytics-card-header"><h3>Traffic sources</h3><small>Unique visitors</small></div>
          <div class="platform-list" id="platform-source-list"><div class="platform-empty">Collecting sources…</div></div>
        </article>
      </div>

      <div class="platform-breakdowns">
        <article class="platform-analytics-card">
          <div class="platform-analytics-card-header"><h3>Top pages</h3><small>Where attention goes</small></div>
          <div class="platform-list" id="platform-page-list"><div class="platform-empty">Collecting page views…</div></div>
        </article>
        <article class="platform-analytics-card">
          <div class="platform-analytics-card-header"><h3>Top card traffic</h3><small id="platform-card-view-total">0 direct opens</small></div>
          <div class="platform-list" id="platform-card-list"><div class="platform-empty">Direct card traffic will appear here.</div></div>
        </article>
        <article class="platform-analytics-card">
          <div class="platform-analytics-card-header"><h3>Devices</h3><small>Visitor mix</small></div>
          <div class="platform-device-grid" id="platform-device-list"><div class="platform-empty">Collecting devices…</div></div>
        </article>
      </div>

      <div class="platform-analytics-foot">
        <span><strong>Tracking started:</strong> <span id="platform-tracking-started">Waiting for first visit</span></span>
        <span>Public visitor totals exclude Admin and signed-in workspace page views. Embedded homepage card previews are excluded.</span>
      </div>`;
    anchor.insertAdjacentElement('afterend', section);

    document.getElementById('platform-analytics-range')?.addEventListener('change', event => {
      currentDays = Number(event.currentTarget.value || 30);
      loadAnalytics();
    });
    document.getElementById('platform-analytics-refresh')?.addEventListener('click', loadAnalytics);
    if (window.lucide) lucide.createIcons();
    return section;
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function renderList(id, rows, valueKey = 'unique_visitors', subLabel = row => `${fmt(row.page_views)} page views`) {
    const root = document.getElementById(id);
    if (!root) return;
    if (!Array.isArray(rows) || !rows.length) {
      root.innerHTML = '<div class="platform-empty">No traffic recorded in this range yet.</div>';
      return;
    }
    const maximum = Math.max(...rows.map(row => Number(row[valueKey] || 0)), 1);
    root.innerHTML = rows.map(row => {
      const value = Number(row[valueKey] || 0);
      const width = Math.max(3, Math.round((value / maximum) * 100));
      return `<div class="platform-list-row">
        <div class="platform-list-copy"><strong title="${esc(row.label || row.slug || 'Unknown')}">${esc(row.label || row.slug || 'Unknown')}</strong><small>${esc(subLabel(row))}</small></div>
        <span class="platform-list-value">${fmt(value)}</span>
        <div class="platform-list-track"><div class="platform-list-fill" style="width:${width}%"></div></div>
      </div>`;
    }).join('');
  }

  function renderTrend(rows) {
    const root = document.getElementById('platform-traffic-trend');
    if (!root) return;
    if (!Array.isArray(rows) || !rows.length) {
      root.innerHTML = '<div class="platform-empty">No traffic recorded yet.</div>';
      return;
    }
    const maxViews = Math.max(...rows.map(row => Number(row.page_views || 0)), 1);
    root.innerHTML = rows.map(row => {
      const views = Number(row.page_views || 0);
      const unique = Number(row.unique_visitors || 0);
      const height = views === 0 ? 2 : Math.max(7, Math.round((views / maxViews) * 100));
      return `<div class="platform-trend-day" title="${esc(row.day)} · ${fmt(views)} views · ${fmt(unique)} visitors"><div class="platform-trend-bar" style="height:${height}%"></div></div>`;
    }).join('');
    const first = rows[0]?.day ? new Date(`${rows[0].day}T12:00:00`) : null;
    setText('platform-trend-start', first && !Number.isNaN(first.getTime()) ? first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—');
  }

  function renderDevices(rows) {
    const root = document.getElementById('platform-device-list');
    if (!root) return;
    const icon = { mobile: 'smartphone', tablet: 'tablet', desktop: 'monitor' };
    if (!Array.isArray(rows) || !rows.length) {
      root.innerHTML = '<div class="platform-empty">No device data yet.</div>';
      return;
    }
    root.innerHTML = rows.map(row => `<div class="platform-device"><i data-lucide="${icon[row.label] || 'monitor'}"></i><strong>${fmt(row.unique_visitors)}</strong><span>${esc(row.label)}</span></div>`).join('');
    if (window.lucide) lucide.createIcons();
  }

  function renderAnalytics(data) {
    const days = Number(data?.period_days || currentDays || 30);
    setText('platform-visitors-today', fmt(data?.visitors_today));
    setText('platform-visitors-7d', fmt(data?.visitors_7d));
    setText('platform-period-visitors', fmt(data?.period_visitors));
    setText('platform-period-pageviews', fmt(data?.period_page_views));
    setText('platform-period-signups', fmt(data?.period_signups));
    setText('platform-period-conversion', `${Number(data?.period_conversion_rate || 0).toFixed(1)}%`);
    setText('platform-period-visitor-label', `Visitors · ${days} days`);
    setText('platform-page-view-label', `Page views · ${days} days`);
    setText('platform-signup-label', `Signups · ${days} days`);
    setText('platform-conversion-label', `Conversion · ${days} days`);
    setText('platform-card-view-total', `${fmt(data?.period_card_views)} direct opens`);

    if (data?.tracking_started_at) {
      const started = new Date(data.tracking_started_at);
      setText('platform-tracking-started', Number.isNaN(started.getTime()) ? 'Active' : dateFormat.format(started));
    } else {
      setText('platform-tracking-started', 'Waiting for first visit');
    }

    renderTrend(data?.daily || []);
    renderList('platform-source-list', data?.traffic_sources || [], 'unique_visitors', row => `${fmt(row.page_views)} page views`);
    renderList('platform-page-list', data?.top_pages || [], 'page_views', row => `${fmt(row.unique_visitors)} unique visitors`);
    renderList('platform-card-list', (data?.top_cards || []).map(row => ({ ...row, label: String(row.slug || 'Unknown card').replace(/-/g, ' ') })), 'page_views', row => `${fmt(row.unique_visitors)} unique visitors`);
    renderDevices(data?.devices || []);
  }

  function setLoading(loading) {
    const refresh = document.getElementById('platform-analytics-refresh');
    const range = document.getElementById('platform-analytics-range');
    if (refresh) {
      refresh.disabled = loading;
      refresh.innerHTML = loading ? '<i data-lucide="loader-circle" size="16"></i> Loading' : '<i data-lucide="refresh-cw" size="16"></i> Refresh';
    }
    if (range) range.disabled = loading;
    if (window.lucide) lucide.createIcons();
  }

  async function loadAnalytics() {
    const client = globalThis.supabaseClient;
    if (!client?.rpc) return;
    setLoading(true);
    try {
      const { data, error } = await client.rpc('admin_platform_analytics', {
        p_environment: 'staging',
        p_days: currentDays
      });
      if (error) throw error;
      renderAnalytics(data || {});
    } catch (error) {
      console.error('Platform analytics failed:', error);
      const section = document.getElementById('platform-analytics-panel');
      section?.setAttribute('data-analytics-error', 'true');
      setText('platform-tracking-started', 'Unable to load analytics');
      if (typeof globalThis.toast === 'function') toast(error?.message || 'Unable to load platform analytics.');
    } finally {
      setLoading(false);
    }
  }

  async function init() {
    if (currentPageName() !== 'admin.html') return;
    const client = globalThis.supabaseClient;
    if (!client?.auth) return;

    try {
      const { data: userData } = await client.auth.getUser();
      const user = userData?.user || null;
      if (!user) return;
      const { data: profile } = await client.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'admin') return;
    } catch (_) { return; }

    addSidebarLink();
    if (!mountPanel()) return;
    await loadAnalytics();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
