(function () {
  'use strict';

  const panelConfig = [
    { id: 'accounts-panel', label: 'Customers' },
    { id: 'recent-cards-panel', label: 'Cards' },
    { id: 'affiliate-applications-panel', label: 'Affiliates' },
    { id: 'homepage-spotlight-panel', label: 'Homepage' },
    { id: 'admin-white-label-panel', label: 'Brand' }
  ];

  function setupCommandCenter() {
    const shell = document.querySelector('.admin-mobile-section-shell');
    const deck = shell?.querySelector('.admin-mobile-section-deck');
    const tabsWrap = shell?.querySelector('.admin-mobile-section-tabs');
    if (!shell || !deck || !tabsWrap) return false;

    const panels = panelConfig.map(item => document.getElementById(item.id));
    if (panels.some(panel => !panel)) return false;

    shell.classList.add('admin-command-center');

    if (!shell.querySelector('.admin-command-heading')) {
      const heading = document.createElement('div');
      heading.className = 'admin-command-heading';
      heading.innerHTML = `
        <div>
          <h2>Manage</h2>
          <p>Choose one area at a time. Your tools stay organized as LIW Cards grows.</p>
        </div>
        <small>Admin workspace</small>`;
      shell.insertBefore(heading, shell.firstChild);
    }

    const existingTabs = Array.from(tabsWrap.querySelectorAll('.admin-mobile-section-tab'));
    const tabsByPanel = new Map();
    existingTabs.forEach(tab => {
      const panelId = tab.getAttribute('aria-controls');
      if (panelId) tabsByPanel.set(panelId, tab);
    });

    panelConfig.forEach(item => {
      const tab = tabsByPanel.get(item.id);
      if (tab) tab.textContent = item.label;
    });

    function activate(panelId, options = {}) {
      const targetIndex = panelConfig.findIndex(item => item.id === panelId);
      if (targetIndex < 0) return;

      panels.forEach((panel, index) => {
        const active = index === targetIndex;
        panel.classList.toggle('admin-command-active', active);
        panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      });

      existingTabs.forEach(tab => {
        const active = tab.getAttribute('aria-controls') === panelId;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      const activeTab = tabsByPanel.get(panelId);
      if (activeTab) {
        const left = Math.max(0, activeTab.offsetLeft - (tabsWrap.clientWidth - activeTab.offsetWidth) / 2);
        tabsWrap.scrollTo({ left, behavior: options.instant ? 'auto' : 'smooth' });
      }

      if (options.scroll) {
        const heading = shell.querySelector('.admin-command-heading');
        (heading || shell).scrollIntoView({ behavior: options.instant ? 'auto' : 'smooth', block: 'start' });
      }
    }

    existingTabs.forEach(tab => {
      const panelId = tab.getAttribute('aria-controls');
      if (!panelId) return;
      tab.addEventListener('click', event => {
        event.preventDefault();
        activate(panelId);
      });
    });

    document.querySelectorAll('.admin-hero-links a[href^="#"], .sidebar a[href^="#"]').forEach(link => {
      const panelId = String(link.getAttribute('href') || '').slice(1);
      if (!panelConfig.some(item => item.id === panelId)) return;
      link.addEventListener('click', event => {
        event.preventDefault();
        activate(panelId, { scroll: true });
      });
    });

    const originalShowCustomerCards = window.showCustomerCards;
    if (typeof originalShowCustomerCards === 'function' && !originalShowCustomerCards.__liwCommandCenterWrapped) {
      const wrapped = function (userId) {
        originalShowCustomerCards(userId);
        window.setTimeout(() => activate('recent-cards-panel', { scroll: true }), 40);
      };
      wrapped.__liwCommandCenterWrapped = true;
      window.showCustomerCards = wrapped;
    }

    const hashId = location.hash ? location.hash.slice(1) : '';
    const initialId = panelConfig.some(item => item.id === hashId) ? hashId : 'accounts-panel';
    activate(initialId, { instant: true });

    return true;
  }

  function boot(attempt = 0) {
    if (setupCommandCenter()) return;
    if (attempt >= 20) return;
    window.setTimeout(() => boot(attempt + 1), 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
  } else {
    boot();
  }
})();
