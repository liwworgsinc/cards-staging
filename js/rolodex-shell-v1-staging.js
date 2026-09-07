(() => {
  'use strict';
  if (window.__LIW_ROLODEX_SHELL_V1__) return;
  window.__LIW_ROLODEX_SHELL_V1__ = true;
  const PENDING_KEY = 'liw_rolodex_pending_slug';
  let resumeChecked = false;

  function pageName() { return String(location.pathname.split('/').pop() || '').toLowerCase(); }
  function appUrl(path) {
    if (typeof liwUrl === 'function') return liwUrl(path);
    const staged = location.pathname.includes('/cards-staging/');
    return new URL(`${staged ? '/cards-staging/' : '/'}${String(path || '').replace(/^\//, '')}`, location.origin).href;
  }

  function workspaceNav(sidebar) {
    const label = [...sidebar.querySelectorAll('.sidebar-label')].find(node => String(node.textContent || '').trim().toLowerCase() === 'workspace');
    return label?.nextElementSibling?.matches('nav') ? label.nextElementSibling : sidebar.querySelector('nav');
  }

  function ensureNav() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return false;
    const nav = workspaceNav(sidebar);
    if (!nav) return false;
    const matches = [...sidebar.querySelectorAll('a[href="rolodex.html"],a[data-liw-rolodex-link]')];
    let link = matches[0] || null;
    matches.slice(1).forEach(item => item.remove());
    if (!link) {
      link = document.createElement('a');
      link.href = 'rolodex.html';
      link.dataset.liwRolodexLink = 'true';
      link.innerHTML = '<i data-lucide="contact-round" size="18"></i> Rolodex';
      const leads = nav.querySelector('a[href="leads.html"]');
      const analytics = nav.querySelector('a[href="analytics.html"]');
      if (leads) leads.insertAdjacentElement('beforebegin', link);
      else if (analytics) analytics.insertAdjacentElement('afterend', link);
      else nav.appendChild(link);
    }
    if (!nav.contains(link)) nav.appendChild(link);
    link.hidden = false;
    link.removeAttribute('hidden');
    const active = pageName() === 'rolodex.html';
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    return true;
  }

  function dashboardToolMarkup() {
    const link = document.createElement('a');
    link.className = 'card dashboard-tool';
    link.href = 'rolodex.html';
    link.dataset.liwRolodexTool = 'true';
    link.innerHTML = '<span><i data-lucide="contact-round"></i></span><div><strong>Open LIW Rolodex</strong><p>Save business cards, organize contacts, and keep LIW connections live.</p></div><i data-lucide="arrow-right"></i>';
    return link;
  }

  function ensureDashboardTool() {
    if (pageName() !== 'dashboard.html') return;
    const grid = document.querySelector('.dashboard-tool-grid');
    if (!grid) return;
    let link = grid.querySelector('a[href="rolodex.html"],a[data-liw-rolodex-tool]');
    if (!link) {
      link = dashboardToolMarkup();
      const leads = grid.querySelector('a[href="leads.html"]');
      if (leads) leads.insertAdjacentElement('beforebegin', link); else grid.prepend(link);
    }
    link.hidden = false;
    link.removeAttribute('hidden');
  }

  async function resumePending() {
    if (resumeChecked || pageName() === 'rolodex.html') return;
    let pending = '';
    try { pending = String(sessionStorage.getItem(PENDING_KEY) || '').trim(); } catch (_) {}
    if (!pending || typeof supabaseClient === 'undefined') return;
    resumeChecked = true;
    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data?.session?.user) location.replace(appUrl('rolodex.html?resume=1'));
      else resumeChecked = false;
    } catch (_) { resumeChecked = false; }
  }

  function mount() {
    ensureNav();
    ensureDashboardTool();
    resumePending();
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
  [180, 500, 1100, 2000].forEach(delay => setTimeout(mount, delay));
})();