(() => {
  'use strict';

  if (!/\/dashboard(?:\.html)?$/i.test(location.pathname)) return;

  const STYLE_ID = 'liw-dashboard-wallet-style';
  let refreshQueued = false;
  let observer = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .dashboard-wallet-toggle{gap:6px}
      .dashboard-wallet-toggle[data-enabled="true"]{background:#050505;color:#fff;border-color:#050505}
      .dashboard-wallet-toggle[data-enabled="true"]:hover{background:#111827;color:#fff;border-color:#111827}
      .dashboard-wallet-toggle:disabled{opacity:.55;cursor:not-allowed}
      .dashboard-wallet-note{display:flex;align-items:flex-start;gap:10px;margin:0 0 14px;padding:12px 14px;border:1px solid #e2e6ee;border-radius:14px;background:#f8fafc;color:#475467;font-size:.78rem;line-height:1.45}
      .dashboard-wallet-note strong{color:#0b1438}
      .dashboard-wallet-note svg{flex:0 0 auto;margin-top:1px}
    `;
    document.head.appendChild(style);
  }

  function toastMessage(message) {
    if (typeof window.toast === 'function') window.toast(message);
  }

  function setButtonState(button, enabled) {
    button.dataset.enabled = enabled ? 'true' : 'false';
    button.innerHTML = enabled
      ? '<i data-lucide="wallet-cards" size="15"></i> Remove Wallet'
      : '<i data-lucide="wallet-cards" size="15"></i> Add Wallet';
    button.setAttribute('aria-label', enabled ? 'Remove Apple Wallet from this public card' : 'Add Apple Wallet to this public card');
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  async function toggleWallet(button) {
    const cardId = button.dataset.walletCardId;
    if (!cardId || button.disabled || typeof supabaseClient === 'undefined') return;
    const nextEnabled = button.dataset.enabled !== 'true';
    const previousHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-circle" size="15"></i> Saving…';
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}

    try {
      const { data, error } = await supabaseClient
        .from('digital_cards')
        .update({ apple_wallet_enabled: nextEnabled })
        .eq('id', cardId)
        .select('id,apple_wallet_enabled')
        .single();

      if (error) throw error;
      setButtonState(button, data?.apple_wallet_enabled === true);
      toastMessage(nextEnabled
        ? 'Apple Wallet added to this card.'
        : 'Apple Wallet removed from this card. The public Wallet button is now hidden.');
    } catch (error) {
      console.warn('Dashboard Apple Wallet update failed:', error);
      button.innerHTML = previousHtml;
      toastMessage('Could not update Apple Wallet for this card.');
    } finally {
      button.disabled = false;
      if (window.lucide) try { lucide.createIcons(); } catch (_) {}
    }
  }

  async function refreshControls() {
    refreshQueued = false;
    const list = document.getElementById('card-list');
    if (!list || typeof supabaseClient === 'undefined') return;

    ensureStyles();
    const cardItems = Array.from(list.querySelectorAll('.card-item[data-card-id]'));
    if (!cardItems.length) return;

    const ids = cardItems.map(item => item.dataset.cardId).filter(Boolean);
    if (!ids.length) return;

    const { data: cards, error } = await supabaseClient
      .from('digital_cards')
      .select('id,apple_wallet_enabled,status')
      .in('id', ids);

    if (error) {
      console.warn('Dashboard Apple Wallet state lookup failed:', error);
      return;
    }

    const byId = new Map((cards || []).map(card => [String(card.id), card]));

    cardItems.forEach(item => {
      const cardId = String(item.dataset.cardId || '');
      const card = byId.get(cardId);
      if (!card) return;

      const actions = item.querySelector('.card-actions');
      if (!actions) return;

      // Owners and workspace editors already receive an Edit action from dashboard.js.
      const canManage = Boolean(actions.querySelector('a[href^="editor.html?id="]'));
      if (!canManage) return;

      let button = actions.querySelector('[data-wallet-card-id]');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-light btn-sm dashboard-wallet-toggle';
        button.dataset.walletCardId = cardId;
        button.addEventListener('click', () => toggleWallet(button));

        const deleteButton = actions.querySelector('[data-delete-card]');
        if (deleteButton) actions.insertBefore(button, deleteButton);
        else actions.appendChild(button);
      }

      setButtonState(button, card.apple_wallet_enabled !== false);
      if (card.status !== 'published') button.title = 'You can set Wallet visibility now; the Wallet pass becomes usable after the card is published and Apple signing is configured.';
      else button.removeAttribute('title');
    });
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    setTimeout(refreshControls, 80);
  }

  function addDashboardNote() {
    const list = document.getElementById('card-list');
    const section = list?.closest('section');
    if (!section || section.querySelector('[data-dashboard-wallet-note]')) return;
    const note = document.createElement('div');
    note.className = 'dashboard-wallet-note';
    note.dataset.dashboardWalletNote = 'true';
    note.innerHTML = '<i data-lucide="wallet-cards" size="17"></i><div><strong>Apple Wallet is managed per card.</strong> Use Add Wallet or Remove Wallet on each card below. Removing it hides the Wallet option from that public card.</div>';
    list.insertAdjacentElement('beforebegin', note);
    if (window.lucide) try { lucide.createIcons(); } catch (_) {}
  }

  function boot() {
    const list = document.getElementById('card-list');
    if (!list) return;
    addDashboardNote();
    queueRefresh();
    observer = new MutationObserver(queueRefresh);
    observer.observe(list, { childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
