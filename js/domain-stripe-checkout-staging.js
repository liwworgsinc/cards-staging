(() => {
  'use strict';

  const API_VERSION = '20260829-domain-stripe-2';
  const next = document.getElementById('domain-next-button');
  const result = document.getElementById('domain-result');
  const cardSelect = document.getElementById('domain-card-select');
  const status = document.getElementById('domain-status');
  if (!next || !result || !cardSelect || !status) return;

  const config = window.LIW_CONFIG || {};
  const client = window.supabaseClient;
  let checkoutBusy = false;
  if (!config.supabaseUrl || !config.supabaseKey || !client) return;

  injectStyles();
  updateLockedCopy();
  ensureDialog();

  // Keep checkout state event-driven. Do not observe this result subtree or the
  // button itself: syncPurchaseButton updates both and a subtree observer can
  // turn those updates into a self-triggering mutation loop.
  const resultVisibilityObserver = new MutationObserver(() => syncPurchaseButton());
  resultVisibilityObserver.observe(result, { attributes: true, attributeFilter: ['hidden'] });
  cardSelect.addEventListener('change', syncPurchaseButton);
  document.getElementById('domain-term-panel')?.addEventListener('click', () => setTimeout(syncPurchaseButton, 0));
  document.getElementById('domain-options-panel')?.addEventListener('click', event => {
    if (event.target.closest('[data-domain-option]')) setTimeout(syncPurchaseButton, 0);
  });
  window.addEventListener('pageshow', syncPurchaseButton);
  setTimeout(syncPurchaseButton, 0);

  next.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    beginReview().catch(error => showPageError(error?.message || 'Unable to prepare domain checkout.'));
  }, true);

  handleReturn().catch(error => showPageError(error?.message || 'Unable to confirm the domain order.'));

  function getSelection() {
    const domain = String(document.getElementById('domain-result-name')?.textContent || '').trim().toLowerCase();
    const selectedTerm = document.querySelector('[data-domain-years].active,[data-domain-years][aria-pressed="true"]');
    const years = Number(selectedTerm?.dataset?.domainYears || 1);
    const cardId = String(cardSelect.value || '').trim();
    return { domain, years, cardId };
  }

  function canPurchase() {
    const { domain, years, cardId } = getSelection();
    return !result.hidden && Boolean(domain && domain.includes('.') && [1, 2, 3, 5, 10].includes(years) && cardId);
  }

  function syncPurchaseButton() {
    const allowed = canPurchase();
    const shouldDisable = checkoutBusy || !allowed;
    if (next.disabled !== shouldDisable) next.disabled = shouldDisable;
    if (next.hidden !== result.hidden) next.hidden = result.hidden;
    if (!result.hidden && !checkoutBusy) {
      const { years } = getSelection();
      const labelKey = `ready-${years}`;
      if (next.dataset.liwLabelKey !== labelKey) {
        next.innerHTML = `<i data-lucide="lock-keyhole" size="18"></i> Review & pay · ${years} year${years === 1 ? '' : 's'}`;
        next.dataset.liwLabelKey = labelKey;
        if (window.lucide) window.lucide.createIcons();
      }
      next.dataset.domainStripeReady = 'true';
    }
  }

  async function authHeaders() {
    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) throw new Error('Your session expired. Log in again.');
    return {
      'Content-Type': 'application/json',
      'apikey': config.supabaseKey,
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  async function callFunction(name, body) {
    const response = await fetch(`${config.supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || 'The request could not be completed.');
    return payload;
  }

  async function beginReview() {
    const { domain, years, cardId } = getSelection();
    if (!domain || result.hidden) throw new Error('Choose an available domain first.');
    if (!cardId) {
      cardSelect.focus();
      throw new Error('Choose the LIW Card this domain should open.');
    }

    setButtonBusy(true, 'Confirming final price…');
    try {
      const quote = await callFunction('create-domain-checkout', { action: 'quote', domain, years, cardId });
      renderReview(quote);
      const dialog = document.getElementById('domain-checkout-dialog');
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } finally {
      setButtonBusy(false);
    }
  }

  function renderReview(quote) {
    const dialog = document.getElementById('domain-checkout-dialog');
    dialog.dataset.orderId = quote.orderId;
    dialog.dataset.agreements = JSON.stringify(quote.agreements || []);
    dialog.querySelector('[data-domain-review-name]').textContent = quote.domain || 'Domain';
    dialog.querySelector('[data-domain-review-term]').textContent = `${quote.years} year${Number(quote.years) === 1 ? '' : 's'}`;
    dialog.querySelector('[data-domain-review-card]').textContent = quote.cardName || 'Selected LIW Card';
    dialog.querySelector('[data-domain-review-total]').textContent = money(quote.amountTotal, quote.currency);
    dialog.querySelector('[data-domain-review-inventory]').textContent = String(quote.inventory || 'STANDARD').toUpperCase() === 'PREMIUM' ? 'Premium domain' : 'Standard domain';

    const agreements = Array.isArray(quote.agreements) ? quote.agreements : [];
    const list = dialog.querySelector('[data-domain-agreements]');
    list.innerHTML = agreements.length
      ? agreements.map(item => `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener"><i data-lucide="file-text" size="16"></i><span>${escapeHtml(item.title || item.agreementType || 'Domain registration agreement')}</span><i data-lucide="external-link" size="14"></i></a>`).join('')
      : '<p class="domain-no-extra-agreements">No additional registrar agreements were returned for this domain.</p>';

    const check = dialog.querySelector('#domain-agreement-check');
    check.checked = false;
    const pay = dialog.querySelector('[data-domain-pay]');
    pay.disabled = true;
    check.onchange = () => { pay.disabled = !check.checked; };
    if (window.lucide) window.lucide.createIcons();
  }

  async function startStripeCheckout() {
    const dialog = document.getElementById('domain-checkout-dialog');
    const orderId = String(dialog.dataset.orderId || '');
    const agreements = JSON.parse(dialog.dataset.agreements || '[]');
    const check = dialog.querySelector('#domain-agreement-check');
    const pay = dialog.querySelector('[data-domain-pay]');
    if (!check.checked) return;

    pay.disabled = true;
    pay.innerHTML = '<i data-lucide="loader-circle" size="17"></i> Opening secure checkout…';
    if (window.lucide) window.lucide.createIcons();
    try {
      const base = new URL('domains.html', location.href);
      const success = new URL(base.href);
      success.searchParams.set('domain_checkout', 'success');
      success.searchParams.set('order', orderId);
      const cancel = new URL(base.href);
      cancel.searchParams.set('domain_checkout', 'cancel');
      cancel.searchParams.set('order', orderId);
      const payload = await callFunction('create-domain-checkout', {
        action: 'checkout',
        orderId,
        agreementTypes: agreements.map(item => item.agreementType),
        successUrl: success.href,
        cancelUrl: cancel.href,
      });
      if (!payload?.url) throw new Error('Stripe did not return a checkout page.');
      location.assign(payload.url);
    } catch (error) {
      pay.disabled = false;
      pay.innerHTML = '<i data-lucide="credit-card" size="17"></i> Continue to Stripe';
      if (window.lucide) window.lucide.createIcons();
      showDialogError(error?.message || 'Unable to open Stripe checkout.');
    }
  }

  async function handleReturn() {
    const params = new URLSearchParams(location.search);
    const mode = params.get('domain_checkout');
    const orderId = String(params.get('order') || '');
    if (!mode || !orderId) return;

    history.replaceState({}, '', new URL('domains.html', location.href).href);
    if (mode === 'cancel') {
      setStatusCard('info', 'Checkout canceled', 'No domain registration was started. Your card and existing domains were not changed.', 'circle-x');
      return;
    }
    if (mode !== 'success') return;

    setStatusCard('loading', 'Payment received — confirming order…', 'Stripe is being verified before LIW sends anything to the registrar.', 'loader-circle');
    for (let attempt = 0; attempt < 14; attempt++) {
      const state = await callFunction('domain-order-status', { orderId });
      if (state.status === 'registered') {
        setStatusCard('success', `${state.domain} is registered`, 'The domain purchase is complete. LIW has queued the domain-to-card connection and DNS setup is the next step.', 'badge-check');
        return;
      }
      if (state.status === 'fulfillment_failed') {
        setStatusCard('error', 'Payment is safe — registration needs review', state.message || 'The domain was not registered. LIW can safely retry or refund this paid order.', 'shield-alert');
        return;
      }
      if (state.status === 'registering') {
        setStatusCard('loading', `Registering ${state.domain}…`, 'Stripe is paid and the registrar is processing the registration. Do not submit another order.', 'loader-circle');
      } else if (state.paymentStatus && state.paymentStatus !== 'paid') {
        setStatusCard('loading', 'Waiting for Stripe confirmation…', 'Your payment is still being confirmed. Registration has not started yet.', 'loader-circle');
      }
      await sleep(2200);
    }
    setStatusCard('info', 'Registration is still processing', 'Your paid order is recorded. You can safely leave this page; LIW will keep the order ID for follow-up.', 'clock-3');
  }

  function ensureDialog() {
    if (document.getElementById('domain-checkout-dialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'domain-checkout-dialog';
    dialog.className = 'liw-domain-checkout-dialog';
    dialog.innerHTML = `
      <div class="liw-domain-checkout-card">
        <button class="liw-domain-dialog-close" type="button" aria-label="Close" data-domain-close><i data-lucide="x" size="19"></i></button>
        <span class="liw-domain-eyebrow"><i data-lucide="shield-check" size="15"></i> Secure domain checkout</span>
        <h2>Review before payment</h2>
        <p class="liw-domain-review-copy">We confirm the registrar price again before Stripe opens. Registration only starts after Stripe confirms payment.</p>
        <div class="liw-domain-review-name"><strong data-domain-review-name>—</strong><span data-domain-review-inventory>Standard domain</span></div>
        <div class="liw-domain-review-grid">
          <div><span>Registration term</span><strong data-domain-review-term>—</strong></div>
          <div><span>Connects to</span><strong data-domain-review-card>—</strong></div>
        </div>
        <div class="liw-domain-total"><span>Total charged today</span><strong data-domain-review-total>—</strong><small>One-time Stripe payment for the selected registration term.</small></div>
        <div class="liw-domain-agreement-block">
          <strong>Registrar agreements</strong>
          <div class="liw-domain-agreements" data-domain-agreements></div>
          <label class="liw-domain-consent"><input type="checkbox" id="domain-agreement-check"><span>I reviewed and accept the required domain registration agreements and authorize LIW to register this domain after successful payment.</span></label>
        </div>
        <p class="liw-domain-dialog-error" data-domain-dialog-error hidden></p>
        <div class="liw-domain-dialog-actions">
          <button class="btn btn-light" type="button" data-domain-close>Not now</button>
          <button class="btn btn-primary" type="button" data-domain-pay disabled><i data-lucide="credit-card" size="17"></i> Continue to Stripe</button>
        </div>
        <p class="liw-domain-live-note"><i data-lucide="circle-dollar-sign" size="15"></i> Staging is connected to LIW's live Stripe account. Completing Stripe Checkout creates a real charge.</p>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-domain-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector('[data-domain-pay]').addEventListener('click', startStripeCheckout);
  }

  function setButtonBusy(busy, label = '') {
    checkoutBusy = busy;
    next.disabled = busy || !canPurchase();
    if (busy) {
      next.dataset.liwLabelKey = 'busy';
      next.innerHTML = `<i data-lucide="loader-circle" size="18"></i> ${escapeHtml(label || 'Working…')}`;
      if (window.lucide) window.lucide.createIcons();
    } else {
      next.dataset.liwLabelKey = '';
      syncPurchaseButton();
    }
  }

  function updateLockedCopy() {
    const readyCopy = status.querySelector('p');
    if (readyCopy && /read-only|nothing can be purchased/i.test(readyCopy.textContent || '')) {
      readyCopy.textContent = 'Search live availability, select a card and term, then review the final registrar-backed price before secure Stripe payment.';
    }
    const actionNote = document.querySelector('.domain-result-actions > span');
    if (actionNote) actionNote.innerHTML = '<i data-lucide="shield-check" size="15"></i> Secure one-time checkout powered by Stripe.';
    const safety = document.querySelector('.domain-safety-note');
    if (safety) safety.innerHTML = '<i data-lucide="shield-check" size="18"></i><div><strong>Payment and registration are protected</strong><p>Stripe confirms payment before registration. LIW rechecks GoDaddy pricing and agreements before the irreversible registrar charge. DNS/card routing follows registration.</p></div>';
  }

  function setStatusCard(kind, title, copy, icon) {
    status.className = `domain-status${kind ? ` ${kind}` : ''}`;
    status.innerHTML = `<span class="domain-status-icon"><i data-lucide="${icon}" size="19"></i></span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p></div>`;
    if (window.lucide) window.lucide.createIcons();
    status.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showPageError(message) {
    setStatusCard('error', 'Domain checkout could not start', message, 'circle-alert');
  }

  function showDialogError(message) {
    const error = document.querySelector('[data-domain-dialog-error]');
    if (!error) return;
    error.textContent = message;
    error.hidden = false;
  }

  function money(cents, currency = 'usd') {
    const value = Number(cents || 0) / 100;
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency || 'usd').toUpperCase() }).format(value); }
    catch (_) { return `$${value.toFixed(2)}`; }
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
  }
  function escapeAttr(value = '') { return escapeHtml(String(value || '')).replace(/`/g, '&#096;'); }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function injectStyles() {
    if (document.querySelector('style[data-domain-stripe-checkout]')) return;
    const style = document.createElement('style');
    style.dataset.domainStripeCheckout = API_VERSION;
    style.textContent = `
      .liw-domain-checkout-dialog{border:0;padding:0;background:transparent;max-width:min(620px,calc(100vw - 28px));width:100%;overflow:visible}
      .liw-domain-checkout-dialog::backdrop{background:rgba(3,9,30,.7);backdrop-filter:blur(7px)}
      .liw-domain-checkout-card{position:relative;background:#fff;border-radius:26px;padding:28px;box-shadow:0 28px 80px rgba(7,16,46,.28);color:#07102e}
      .liw-domain-dialog-close{position:absolute;right:18px;top:18px;border:0;background:#f2f5fb;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:#07102e}
      .liw-domain-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#8d6b16;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
      .liw-domain-checkout-card h2{font-size:27px;margin:0 48px 8px 0;color:#07102e}.liw-domain-review-copy{color:#64708b;line-height:1.55;margin:0 0 20px}
      .liw-domain-review-name{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:17px 18px;background:#07102e;color:#fff;border-radius:18px;margin-bottom:14px}.liw-domain-review-name strong{font-size:20px;word-break:break-word}.liw-domain-review-name span{font-size:12px;font-weight:800;color:#e8c867;white-space:nowrap}
      .liw-domain-review-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.liw-domain-review-grid>div,.liw-domain-total{border:1px solid #e2e7f0;border-radius:16px;padding:14px 15px}.liw-domain-review-grid span,.liw-domain-total>span{display:block;color:#748099;font-size:12px;font-weight:700;margin-bottom:5px}.liw-domain-review-grid strong{font-size:15px}
      .liw-domain-total{margin-bottom:18px;background:#fbf8ee;border-color:#ead9a4}.liw-domain-total strong{display:block;font-size:28px;color:#07102e}.liw-domain-total small{color:#776a47}
      .liw-domain-agreement-block{border-top:1px solid #e7eaf1;padding-top:17px}.liw-domain-agreements{display:grid;gap:8px;margin:10px 0 14px}.liw-domain-agreements a{display:flex;align-items:center;gap:9px;padding:11px 12px;border:1px solid #e1e6ef;border-radius:12px;text-decoration:none;color:#07102e;font-weight:700}.liw-domain-agreements a span{flex:1}.domain-no-extra-agreements{color:#65718a;margin:8px 0 12px}
      .liw-domain-consent{display:flex;align-items:flex-start;gap:11px;padding:13px;border-radius:14px;background:#f5f7fb;font-size:13px;line-height:1.45;cursor:pointer}.liw-domain-consent input{margin-top:3px;accent-color:#07102e;width:17px;height:17px;flex:0 0 auto}
      .liw-domain-dialog-error{padding:10px 12px;border-radius:12px;background:#fff1f2;color:#9f1239;font-weight:700;font-size:13px}.liw-domain-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.liw-domain-dialog-actions .btn{min-height:46px}.liw-domain-live-note{display:flex;gap:7px;align-items:flex-start;margin:14px 0 0;color:#805d13;font-size:12px;line-height:1.4}
      #domain-next-button[data-domain-stripe-ready="true"]:not(:disabled){box-shadow:0 10px 24px rgba(7,16,46,.14)}
      @media(max-width:620px){.liw-domain-checkout-card{padding:23px 18px 18px;border-radius:22px}.liw-domain-review-grid{grid-template-columns:1fr}.liw-domain-review-name{align-items:flex-start;flex-direction:column}.liw-domain-dialog-actions{flex-direction:column-reverse}.liw-domain-dialog-actions .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }
})();
