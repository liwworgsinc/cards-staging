(() => {
  'use strict';

  if (!/\/dashboard\.html$/i.test(location.pathname)) return;

  const CREATE_LABEL = /^(create card|new card|build a card|add card|start building)$/i;

  function numberFrom(id) {
    const text = String(document.getElementById(id)?.textContent || '').trim();
    const value = Number(text.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(value) ? value : null;
  }

  function atCardLimit() {
    const count = numberFrom('usage-count');
    const limit = numberFrom('usage-limit');
    if (count == null || limit == null || limit <= 0) return false;
    return count >= limit;
  }

  function isCreateCardLink(anchor) {
    if (!anchor || anchor.tagName !== 'A') return false;
    let url;
    try { url = new URL(anchor.href, location.href); } catch (_) { return false; }
    if (!/\/editor\.html$/i.test(url.pathname) || url.searchParams.get('id')) return false;
    const label = String(anchor.textContent || '').replace(/\s+/g, ' ').trim();
    return CREATE_LABEL.test(label);
  }

  function ensureStyles() {
    if (document.getElementById('liw-card-limit-upgrade-style')) return;
    const style = document.createElement('style');
    style.id = 'liw-card-limit-upgrade-style';
    style.textContent = `
      #liw-card-limit-dialog{width:min(470px,calc(100vw - 28px));max-width:none;padding:0;border:0;border-radius:24px;background:#fff;color:#111827;box-shadow:0 30px 90px rgba(7,16,46,.28);overflow:hidden}
      #liw-card-limit-dialog::backdrop{background:rgba(7,16,46,.62);backdrop-filter:blur(4px)}
      .liw-card-limit-shell{padding:26px}
      .liw-card-limit-icon{width:52px;height:52px;display:grid;place-items:center;border-radius:16px;background:rgba(212,168,79,.15);color:#0b1438;margin-bottom:17px}
      .liw-card-limit-shell h2{margin:0 0 8px;color:#0b1438;font-size:1.35rem;line-height:1.2}
      .liw-card-limit-shell p{margin:0;color:#667085;line-height:1.6}
      .liw-card-limit-usage{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:19px 0 0;padding:14px 15px;border:1px solid rgba(11,20,56,.1);border-radius:15px;background:#f8fafc}
      .liw-card-limit-usage span{color:#667085;font-size:.82rem}.liw-card-limit-usage strong{color:#0b1438;font-size:.92rem}
      .liw-card-limit-actions{display:grid;grid-template-columns:1fr 1.35fr;gap:10px;margin-top:20px}
      .liw-card-limit-actions .btn{justify-content:center;min-height:46px}
      @media(max-width:520px){#liw-card-limit-dialog{width:calc(100vw - 20px);border-radius:21px}.liw-card-limit-shell{padding:21px}.liw-card-limit-actions{grid-template-columns:1fr}.liw-card-limit-actions .btn-primary{order:-1}}
    `;
    document.head.appendChild(style);
  }

  function planName() {
    return String(document.getElementById('plan')?.textContent || 'current').replace(/\s+Preview$/i, '').trim() || 'current';
  }

  function openUpgradePrompt() {
    ensureStyles();
    let dialog = document.getElementById('liw-card-limit-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'liw-card-limit-dialog';
      document.body.appendChild(dialog);
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    }

    const count = numberFrom('usage-count') ?? 0;
    const limit = numberFrom('usage-limit') ?? 1;
    const plan = planName();
    const singular = limit === 1;
    dialog.innerHTML = `
      <div class="liw-card-limit-shell">
        <div class="liw-card-limit-icon"><i data-lucide="layers-3" size="24"></i></div>
        <h2>You’ve reached your card limit</h2>
        <p>Your ${plan} plan includes ${limit} card${singular ? '' : 's'}, and ${count} ${count === 1 ? 'is' : 'are'} already in use. Upgrade your plan to create another LIW Card.</p>
        <div class="liw-card-limit-usage"><span>Current usage</span><strong>${count} of ${limit} cards used</strong></div>
        <div class="liw-card-limit-actions">
          <button type="button" class="btn btn-light" data-liw-card-limit-close>Not now</button>
          <a class="btn btn-primary" href="${typeof liwUrl === 'function' ? liwUrl('pricing.html?from=card-limit') : 'pricing.html?from=card-limit'}"><i data-lucide="sparkles" size="16"></i> Upgrade plan</a>
        </div>
      </div>`;

    dialog.querySelector('[data-liw-card-limit-close]')?.addEventListener('click', () => dialog.close());
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (!isCreateCardLink(anchor) || !atCardLimit()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openUpgradePrompt();
  }, true);

  window.LIWCardLimitUpgrade = { atCardLimit, openUpgradePrompt };
})();
