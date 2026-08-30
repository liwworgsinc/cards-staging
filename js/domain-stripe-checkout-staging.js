(() => {
  'use strict';

  const API_VERSION = '20260830-domain-owner-4';
  const next = document.getElementById('domain-next-button');
  const result = document.getElementById('domain-result');
  const cardSelect = document.getElementById('domain-card-select');
  const status = document.getElementById('domain-status');
  if (!next || !result || !cardSelect || !status) return;

  const config = window.LIW_CONFIG || {};
  const client = window.supabaseClient;
  let checkoutBusy = false;
  let ownerPrefilled = false;
  if (!config.supabaseUrl || !config.supabaseKey || !client) return;

  injectStyles();
  updateLockedCopy();
  ensureDialog();

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
    openOwnerReview().catch(error => showPageError(error?.message || 'Unable to prepare domain checkout.'));
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

  async function openOwnerReview() {
    const { domain, years, cardId } = getSelection();
    if (!domain || result.hidden) throw new Error('Choose an available domain first.');
    if (!cardId) {
      cardSelect.focus();
      throw new Error('Choose the LIW Card this domain should open.');
    }
    const dialog = document.getElementById('domain-checkout-dialog');
    dialog.dataset.domain = domain;
    dialog.dataset.years = String(years);
    dialog.dataset.cardId = cardId;
    dialog.dataset.orderId = '';
    dialog.dataset.agreements = '[]';
    dialog.querySelector('[data-owner-domain]').textContent = domain;
    dialog.querySelector('[data-owner-term]').textContent = `${years} year${years === 1 ? '' : 's'}`;
    dialog.querySelector('[data-domain-dialog-error]').hidden = true;
    showOwnerStep();
    await prefillOwnerForm();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    setTimeout(() => dialog.querySelector('[data-owner-first]')?.focus(), 50);
  }

  async function prefillOwnerForm() {
    if (ownerPrefilled) return;
    ownerPrefilled = true;
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;
      const dialog = document.getElementById('domain-checkout-dialog');
      const email = dialog.querySelector('[data-owner-email]');
      if (email && !email.value) email.value = String(user.email || '');
      const fullName = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim();
      if (fullName) {
        const parts = fullName.split(/\s+/).filter(Boolean);
        const first = dialog.querySelector('[data-owner-first]');
        const last = dialog.querySelector('[data-owner-last]');
        if (first && !first.value) first.value = parts[0] || '';
        if (last && !last.value && parts.length > 1) last.value = parts.slice(1).join(' ');
      }
    } catch (_) {}
  }

  function showOwnerStep() {
    const dialog = document.getElementById('domain-checkout-dialog');
    dialog.querySelector('[data-owner-step]').hidden = false;
    dialog.querySelector('[data-review-step]').hidden = true;
    dialog.querySelector('[data-domain-dialog-error]').hidden = true;
  }

  function showReviewStep() {
    const dialog = document.getElementById('domain-checkout-dialog');
    dialog.querySelector('[data-owner-step]').hidden = true;
    dialog.querySelector('[data-review-step]').hidden = false;
    dialog.querySelector('[data-domain-dialog-error]').hidden = true;
  }

  function readRegistrant() {
    const dialog = document.getElementById('domain-checkout-dialog');
    const form = dialog.querySelector('[data-owner-form]');
    if (!form.reportValidity()) return null;
    return {
      firstName: dialog.querySelector('[data-owner-first]').value,
      lastName: dialog.querySelector('[data-owner-last]').value,
      organization: dialog.querySelector('[data-owner-organization]').value,
      email: dialog.querySelector('[data-owner-email]').value,
      phoneCountryCode: dialog.querySelector('[data-owner-phone-code]').value,
      phoneNationalNumber: dialog.querySelector('[data-owner-phone]').value,
      addressLine1: dialog.querySelector('[data-owner-address1]').value,
      addressLine2: dialog.querySelector('[data-owner-address2]').value,
      city: dialog.querySelector('[data-owner-city]').value,
      state: dialog.querySelector('[data-owner-state]').value,
      countryCode: dialog.querySelector('[data-owner-country]').value,
      postalCode: dialog.querySelector('[data-owner-postal]').value,
    };
  }

  async function requestFinalQuote() {
    const dialog = document.getElementById('domain-checkout-dialog');
    const registrant = readRegistrant();
    if (!registrant) return;
    const domain = String(dialog.dataset.domain || '');
    const years = Number(dialog.dataset.years || 1);
    const cardId = String(dialog.dataset.cardId || '');
    const button = dialog.querySelector('[data-domain-quote]');
    button.disabled = true;
    button.innerHTML = '<i data-lucide="loader-circle" size="17"></i> Confirming registrar price…';
    if (window.lucide) window.lucide.createIcons();
    showDialogError('');
    try {
      const quote = await callFunction('create-domain-checkout', { action: 'quote', domain, years, cardId, registrant });
      renderReview(quote);
      showReviewStep();
    } catch (error) {
      showDialogError(error?.message || 'Unable to confirm the domain with the registrar.');
    } finally {
      button.disabled = false;
      button.innerHTML = '<i data-lucide="badge-check" size="17"></i> Confirm price & agreements';
      if (window.lucide) window.lucide.createIcons();
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
      ? agreements.map(item => `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener"><i data-lucide="file-text" size="16"></i><span>${escapeHtml(agreementDisplayName(item))}</span><i data-lucide="external-link" size="14"></i></a>`).join('')
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

        <section data-owner-step>
          <span class="liw-domain-eyebrow"><i data-lucide="user-round-check" size="15"></i> Domain owner information</span>
          <h2>Who should own this domain?</h2>
          <p class="liw-domain-review-copy">This information is sent securely to the registrar and becomes the domain's registrant contact. Use accurate owner details.</p>
          <div class="liw-domain-owner-selection"><div><span>Domain</span><strong data-owner-domain>—</strong></div><div><span>Term</span><strong data-owner-term>—</strong></div></div>
          <form class="liw-domain-owner-form" data-owner-form>
            <div class="liw-domain-owner-grid">
              <label><span>First name</span><input data-owner-first autocomplete="given-name" maxlength="80" required></label>
              <label><span>Last name</span><input data-owner-last autocomplete="family-name" maxlength="80" required></label>
              <label class="span-2"><span>Business / organization <small>optional</small></span><input data-owner-organization autocomplete="organization" maxlength="120"></label>
              <label class="span-2"><span>Email</span><input data-owner-email type="email" autocomplete="email" maxlength="180" required></label>
              <label><span>Phone country code</span><div class="liw-phone-field"><b>+</b><input data-owner-phone-code inputmode="numeric" autocomplete="tel-country-code" value="1" maxlength="3" pattern="[0-9]{1,3}" required></div></label>
              <label><span>Phone number</span><input data-owner-phone type="tel" autocomplete="tel-national" maxlength="24" required></label>
              <label class="span-2"><span>Street address</span><input data-owner-address1 autocomplete="address-line1" maxlength="180" required></label>
              <label class="span-2"><span>Address line 2 <small>optional</small></span><input data-owner-address2 autocomplete="address-line2" maxlength="180"></label>
              <label><span>City</span><input data-owner-city autocomplete="address-level2" maxlength="100" required></label>
              <label><span>State / province</span><input data-owner-state autocomplete="address-level1" maxlength="100" required></label>
              <label><span>Postal / ZIP code</span><input data-owner-postal autocomplete="postal-code" maxlength="24" required></label>
              <label><span>Country</span><input data-owner-country autocomplete="country" value="US" maxlength="2" pattern="[A-Za-z]{2}" placeholder="US" required><small class="liw-field-help">2-letter code, e.g. US</small></label>
            </div>
          </form>
          <div class="liw-domain-privacy-note"><i data-lucide="shield-check" size="17"></i><span>LIW does not save these details in your browser. They are held privately for registrar fulfillment and removed from LIW's private fulfillment record after successful registration.</span></div>
          <p class="liw-domain-dialog-error" data-domain-dialog-error hidden></p>
          <div class="liw-domain-dialog-actions">
            <button class="btn btn-light" type="button" data-domain-close>Not now</button>
            <button class="btn btn-primary" type="button" data-domain-quote><i data-lucide="badge-check" size="17"></i> Confirm price &amp; agreements</button>
          </div>
        </section>

        <section data-review-step hidden>
          <span class="liw-domain-eyebrow"><i data-lucide="shield-check" size="15"></i> Secure domain checkout</span>
          <h2>Review before payment</h2>
          <p class="liw-domain-review-copy">GoDaddy accepted the owner information and returned a live registration quote. Registration only starts after Stripe confirms payment.</p>
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
          <div class="liw-domain-dialog-actions liw-domain-review-actions">
            <button class="btn btn-light" type="button" data-domain-back><i data-lucide="arrow-left" size="16"></i> Edit owner</button>
            <button class="btn btn-primary" type="button" data-domain-pay disabled><i data-lucide="credit-card" size="17"></i> Continue to Stripe</button>
          </div>
          <p class="liw-domain-live-note"><i data-lucide="circle-dollar-sign" size="15"></i> Staging is connected to LIW's live Stripe account. Completing Stripe Checkout creates a real charge and can start a real domain registration.</p>
        </section>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-domain-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector('[data-domain-quote]').addEventListener('click', requestFinalQuote);
    dialog.querySelector('[data-domain-pay]').addEventListener('click', startStripeCheckout);
    dialog.querySelector('[data-domain-back]').addEventListener('click', showOwnerStep);
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
      readyCopy.textContent = 'Search live availability, select a card and term, add the domain owner, then review the registrar-backed price before secure Stripe payment.';
    }
    const actionNote = document.querySelector('.domain-result-actions > span');
    if (actionNote) actionNote.innerHTML = '<i data-lucide="shield-check" size="15"></i> Secure one-time checkout powered by Stripe.';
    const safety = document.querySelector('.domain-safety-note');
    if (safety) safety.innerHTML = '<i data-lucide="shield-check" size="18"></i><div><strong>Payment and registration are protected</strong><p>GoDaddy validates the domain owner and final price before Stripe opens. LIW rechecks the same owner profile, pricing and agreements before the irreversible registrar charge.</p></div>';
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
    const visibleStep = document.querySelector('#domain-checkout-dialog [data-owner-step]:not([hidden]), #domain-checkout-dialog [data-review-step]:not([hidden])');
    const error = visibleStep?.querySelector('[data-domain-dialog-error]');
    if (!error) return;
    error.textContent = message || '';
    error.hidden = !message;
  }

  function agreementDisplayName(item = {}) {
    const raw = String(item.title || item.agreementType || '').trim();
    const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (key.includes('domains by proxy')) return 'Domain Privacy Agreement';
    if (key.includes('api domain purchase')) return 'Domain Registration Agreement';
    if (key.includes('domain purchase')) return 'Domain Registration Agreement';
    return raw || 'Domain Registration Agreement';
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
      .liw-domain-checkout-dialog{border:0;padding:0;background:transparent;max-width:min(700px,calc(100vw - 28px));width:100%;overflow:visible}
      .liw-domain-checkout-dialog::backdrop{background:rgba(3,9,30,.72);backdrop-filter:blur(7px)}
      .liw-domain-checkout-card{position:relative;background:#fff;border-radius:26px;padding:28px;box-shadow:0 28px 80px rgba(7,16,46,.28);color:#07102e;max-height:min(88vh,880px);overflow:auto}
      .liw-domain-dialog-close{position:absolute;right:18px;top:18px;border:0;background:#f2f5fb;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;cursor:pointer;color:#07102e;z-index:2}
      .liw-domain-eyebrow{display:inline-flex;align-items:center;gap:7px;color:#8d6b16;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
      .liw-domain-checkout-card h2{font-size:27px;margin:0 48px 8px 0;color:#07102e}.liw-domain-review-copy{color:#64708b;line-height:1.55;margin:0 0 20px}
      .liw-domain-owner-selection{display:grid;grid-template-columns:2fr 1fr;gap:10px;margin-bottom:18px}.liw-domain-owner-selection>div{background:#07102e;color:#fff;border-radius:15px;padding:13px 15px}.liw-domain-owner-selection span{display:block;color:#c7d0e5;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}.liw-domain-owner-selection strong{display:block;overflow-wrap:anywhere}.liw-domain-owner-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.liw-domain-owner-grid label{display:grid;gap:6px;color:#26314b;font-size:12px;font-weight:800}.liw-domain-owner-grid label.span-2{grid-column:1/-1}.liw-domain-owner-grid label>span{display:flex;justify-content:space-between;gap:8px}.liw-domain-owner-grid label>span small{font-weight:600;color:#8a94a8}.liw-domain-owner-grid input{width:100%;min-height:45px;border:1px solid #d9dfeb;border-radius:12px;padding:10px 12px;font:inherit;font-size:14px;color:#07102e;background:#fff;outline:none;box-sizing:border-box}.liw-domain-owner-grid input:focus{border-color:#b49135;box-shadow:0 0 0 3px rgba(180,145,53,.12)}.liw-phone-field{display:flex;align-items:center;border:1px solid #d9dfeb;border-radius:12px;overflow:hidden}.liw-phone-field:focus-within{border-color:#b49135;box-shadow:0 0 0 3px rgba(180,145,53,.12)}.liw-phone-field b{padding-left:12px;font-size:15px}.liw-phone-field input{border:0!important;box-shadow:none!important}.liw-field-help{color:#8791a5;font-weight:600;font-size:10px}.liw-domain-privacy-note{display:flex;align-items:flex-start;gap:8px;margin-top:14px;padding:11px 12px;border-radius:13px;background:#f7f8fb;color:#5f6a81;font-size:12px;line-height:1.45}.liw-domain-privacy-note svg{flex:0 0 auto;color:#8d6b16}
      .liw-domain-review-name{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:17px 18px;background:#07102e;color:#fff;border-radius:18px;margin-bottom:14px}.liw-domain-review-name strong{font-size:20px;word-break:break-word}.liw-domain-review-name span{font-size:12px;font-weight:800;color:#e8c867;white-space:nowrap}
      .liw-domain-review-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}.liw-domain-review-grid>div,.liw-domain-total{border:1px solid #e2e7f0;border-radius:16px;padding:14px 15px}.liw-domain-review-grid span,.liw-domain-total>span{display:block;color:#748099;font-size:12px;font-weight:700;margin-bottom:5px}.liw-domain-review-grid strong{font-size:15px}
      .liw-domain-total{margin-bottom:18px;background:#fbf8ee;border-color:#ead9a4}.liw-domain-total strong{display:block;font-size:28px;color:#07102e}.liw-domain-total small{color:#776a47}
      .liw-domain-agreement-block{border-top:1px solid #e7eaf1;padding-top:17px}.liw-domain-agreements{display:grid;gap:8px;margin:10px 0 14px}.liw-domain-agreements a{display:flex;align-items:center;gap:9px;padding:11px 12px;border:1px solid #e1e6ef;border-radius:12px;text-decoration:none;color:#07102e;font-weight:700}.liw-domain-agreements a span{flex:1}.domain-no-extra-agreements{color:#65718a;margin:8px 0 12px}
      .liw-domain-consent{display:flex;align-items:flex-start;gap:11px;padding:13px;border-radius:14px;background:#f5f7fb;font-size:13px;line-height:1.45;cursor:pointer}.liw-domain-consent input{margin-top:3px;accent-color:#07102e;width:17px;height:17px;flex:0 0 auto}
      .liw-domain-dialog-error{padding:10px 12px;border-radius:12px;background:#fff1f2;color:#9f1239;font-weight:700;font-size:13px;line-height:1.45}.liw-domain-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}.liw-domain-dialog-actions .btn{min-height:46px}.liw-domain-review-actions{justify-content:space-between}.liw-domain-live-note{display:flex;gap:7px;align-items:flex-start;margin:14px 0 0;color:#805d13;font-size:12px;line-height:1.4}
      #domain-next-button[data-domain-stripe-ready="true"]:not(:disabled){box-shadow:0 10px 24px rgba(7,16,46,.14)}
      [data-owner-step][hidden],[data-review-step][hidden]{display:none!important}
      @media(max-width:620px){.liw-domain-checkout-card{padding:23px 18px 18px;border-radius:22px;max-height:92vh}.liw-domain-owner-selection,.liw-domain-owner-grid,.liw-domain-review-grid{grid-template-columns:1fr}.liw-domain-owner-grid label.span-2{grid-column:auto}.liw-domain-review-name{align-items:flex-start;flex-direction:column}.liw-domain-dialog-actions{flex-direction:column-reverse}.liw-domain-dialog-actions .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }
})();