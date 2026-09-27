/* LIW Cards — staging-only, database-backed À-la-Carte catalog.
 * This page is a non-charging pricing review until an isolated test Stripe
 * checkout and server-verified entitlement flow are approved.
 */
(function () {
  'use strict';

  const FEATURES = [
    { key: 'extra_card', icon: 'copy-plus', group: 'plus', categories: 'plus', description: 'Additional card capacity for your LIW account.' },
    { key: 'premium_templates', icon: 'panels-top-left', group: 'plus', categories: 'plus media', description: 'Unlock premium card templates on your account.' },
    { key: 'appointment_booking', icon: 'calendar-days', group: 'plus', categories: 'plus', description: 'Appointment tools for your card experience.' },
    { key: 'lead_capture', icon: 'inbox', group: 'plus', categories: 'plus', description: 'Collect and manage inquiries from your card.' },
    { key: 'product_showcase', icon: 'shopping-bag', group: 'plus', categories: 'plus', description: 'Present products and services on your card.' },
    { key: 'video_section', icon: 'video', group: 'plus', categories: 'plus media', description: 'Introduce your business with a featured video.' },
    { key: 'file_downloads', icon: 'download', group: 'plus', categories: 'plus media', description: 'Share downloadable documents with visitors.' },
    { key: 'remove_branding', icon: 'badge-x', group: 'plus', categories: 'plus media', description: 'Remove LIW branding where supported by your plan.' },
    { key: 'advanced_analytics', icon: 'chart-no-axes-combined', group: 'pro', categories: 'growth', description: 'See additional insights about card performance.' },
    { key: 'team_member_access', icon: 'users-round', group: 'pro', categories: 'growth', description: 'Add teammates to your LIW workspace. Team Access is billed separately.' }
  ];
  const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);
  // IMPORTANT: staging uses the production Supabase project. Never call the
  // existing live manage-addon endpoint from this preview.
  const STAGING_PURCHASES_DISABLED = true;
  const selected = new Set();
  const state = { definitions: new Map(), rows: new Map(), plans: new Map(), subscription: null, access: null, interval: 'year', ready: false };
  const el = id => document.getElementById(id);
  const dollars = cents => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(Number(cents || 0) / 100);
  const safe = input => String(input == null ? '' : input).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const priceFor = def => Number(state.interval === 'year' ? def.yearly_price_cents : def.monthly_price_cents);
  const hasPrice = def => Boolean(state.interval === 'year' ? def.stripe_yearly_price_id : def.stripe_monthly_price_id) && Number.isFinite(priceFor(def)) && priceFor(def) > 0;
  const isIncluded = def => Boolean((state.access && state.access.isAdmin && !state.access.isPlanPreview) || (def.included_plans || []).includes(state.access && state.access.planKey));
  const isActive = key => { const row = state.rows.get(key); return Boolean(row && LIVE_STATUSES.has(row.status)); };
  const canCompare = def => !isIncluded(def) && !isActive(def.addon_key) && hasPrice(def);
  const isLocked = () => Boolean(state.subscription && state.subscription.stripe_subscription_id && LIVE_STATUSES.has(state.subscription.status));
  const planYear = key => Number((state.plans.get(key) || {}).yearly_price_cents || 0);

  function notify(message, tone) {
    const status = el('enhance-status');
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone || 'info';
    status.hidden = false;
  }

  function cardMarkup(item) {
    const def = state.definitions.get(item.key);
    if (!def || !def.is_active) return '';
    const included = isIncluded(def);
    const active = isActive(item.key);
    const compare = canCompare(def);
    const picked = selected.has(item.key);
    const ready = hasPrice(def);
    const price = ready ? dollars(priceFor(def)) : 'Not priced';
    const period = state.interval === 'year' ? 'per year' : 'per month';
    const stateLabel = included ? 'Included' : active ? 'Active' : !ready ? 'Not priced' : def.is_sellable ? 'Pricing preview' : 'Not yet for sale';
    const button = included ? 'Included in plan' : active ? 'Already active' : !ready ? 'Unavailable' : picked ? '✓ Selected' : 'Add to estimate';
    const hint = included ? 'No additional charge' : active ? 'Already in your account' : !ready ? 'No Stripe price for this interval' : def.is_sellable ? 'Checkout is paused in staging' : 'Preview only · purchase is disabled';
    return '<article class="enhance-feature' + (picked ? ' selected' : '') + '" data-id="' + safe(item.key) + '" data-category="' + safe(item.categories) + '">' +
      '<div class="enhance-feature-head"><span class="enhance-feature-icon"><i data-lucide="' + safe(item.icon) + '"></i></span><span class="enhance-tier ' + (item.group === 'pro' ? 'pro' : 'plus') + '">' + safe(stateLabel) + '</span></div>' +
      '<h3>' + safe(def.name) + '</h3><p>' + safe(item.description) + '</p>' +
      '<div class="enhance-feature-bottom"><span class="enhance-price"><strong>' + (included ? 'Included' : active ? 'Active' : price) + '</strong><small>' + safe(hint) + (compare ? ' · ' + period : '') + '</small></span>' +
      '<button class="enhance-add" type="button" data-select="' + safe(item.key) + '" ' + (!compare ? 'disabled' : 'aria-pressed="' + picked + '"') + '>' + button + '</button></div></article>';
  }

  function renderCatalog() {
    const plus = el('enhance-plus-grid');
    const pro = el('enhance-pro-grid');
    if (!plus || !pro) return;
    plus.innerHTML = FEATURES.filter(item => item.group === 'plus').map(cardMarkup).join('') || '<p>No Plus add-ons are configured.</p>';
    pro.innerHTML = FEATURES.filter(item => item.group === 'pro').map(cardMarkup).join('') || '<p>No Growth Suite add-ons are configured.</p>';
    document.querySelectorAll('[data-select]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.select;
      if (!canCompare(state.definitions.get(key))) return;
      if (selected.has(key)) selected.delete(key);
      else selected.add(key);
      renderCatalog();
      renderSummary();
      applyFilter();
    }));
    if (window.lucide) window.lucide.createIcons();
  }

  function renderSummary() {
    const items = FEATURES.filter(item => selected.has(item.key)).map(item => state.definitions.get(item.key)).filter(Boolean);
    const amount = items.reduce((sum, def) => sum + priceFor(def), 0);
    const yearFactor = state.interval === 'year' ? 1 : 12;
    const yearlyEstimate = amount * yearFactor;
    const intervalLabel = state.interval === 'year' ? 'year' : 'month';
    el('enhance-count').textContent = String(items.length);
    el('enhance-total').textContent = dollars(amount);
    el('enhance-total-label').textContent = state.interval === 'year' ? 'Estimated annual subtotal' : 'Estimated monthly subtotal';
    el('enhance-mobile-label').textContent = items.length + ' selected add-on' + (items.length === 1 ? '' : 's');
    el('enhance-mobile-total').textContent = dollars(amount) + '/' + intervalLabel;
    el('enhance-selected-list').innerHTML = items.length ? items.map(def =>
      '<div class="enhance-selected-row"><strong>' + safe(def.name) + '</strong><span>' + dollars(priceFor(def)) + '</span><button class="enhance-remove" type="button" data-remove="' + safe(def.addon_key) + '" aria-label="Remove ' + safe(def.name) + '">×</button></div>'
    ).join('') : '<div class="enhance-empty">Select a configured add-on to compare costs. No charge will be made.</div>';
    document.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
      selected.delete(button.dataset.remove);
      renderCatalog();
      renderSummary();
      applyFilter();
    }));

    const plusPrice = planYear('plus');
    const proPrice = planYear('pro');
    const hasPro = items.some(def => FEATURES.find(item => item.key === def.addon_key).group === 'pro');
    const targetKey = hasPro ? 'pro' : 'plus';
    const targetPrice = hasPro ? proPrice : plusPrice;
    const targetName = hasPro ? 'Pro' : 'Plus';
    const targetNode = el('enhance-' + targetKey + '-card');
    el('enhance-plus-card').classList.remove('recommended');
    el('enhance-pro-card').classList.remove('recommended');
    const recommendation = el('enhance-recommendation');
    recommendation.dataset.tone = 'neutral';
    if (!items.length) {
      recommendation.innerHTML = '<strong>Build it your way.</strong><span>Choose tools to compare their listed prices with an LIW plan. Billing is not active in staging.</span>';
    } else if (targetPrice > 0 && yearlyEstimate >= targetPrice) {
      targetNode.classList.add('recommended');
      recommendation.dataset.tone = 'win';
      recommendation.innerHTML = '<strong>Compare the ' + targetName + ' bundle.</strong><span>Your estimate is ' + dollars(yearlyEstimate) + '/year versus ' + dollars(targetPrice) + '/year for ' + targetName + '. Actual charges or prorations would be confirmed by Stripe.</span>';
    } else if (targetPrice > 0) {
      recommendation.innerHTML = '<strong>Your selected subtotal: ' + dollars(amount) + '/' + intervalLabel + '.</strong><span>' + targetName + ' is ' + dollars(targetPrice) + '/year. Compare included features before choosing.</span>';
    } else {
      recommendation.innerHTML = '<strong>Review your estimate.</strong><span>Plan pricing is unavailable. No amount can be charged from this page.</span>';
    }
    const button = el('enhance-checkout');
    button.disabled = !items.length;
    button.textContent = items.length ? 'Review checkout readiness' : 'Select an add-on';
    el('enhance-helper').textContent = 'Estimate only. Purchases, entitlements, and renewals are not changed.';
  }

  function applyFilter() {
    const active = document.querySelector('.enhance-tab.active');
    const filter = active ? active.dataset.filter : 'all';
    document.querySelectorAll('.enhance-feature').forEach(card => {
      card.hidden = filter !== 'all' && !card.dataset.category.split(' ').includes(filter);
    });
  }

  function renderPlans() {
    for (const key of ['plus', 'pro']) {
      const plan = state.plans.get(key);
      const price = el('enhance-' + key + '-price');
      if (price) price.textContent = plan ? dollars(plan.yearly_price_cents) + '/yr' : 'Price unavailable';
    }
  }

  function wire() {
    document.querySelectorAll('.enhance-tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.enhance-tab').forEach(item => item.classList.toggle('active', item === tab));
      applyFilter();
    }));
    document.querySelectorAll('[data-enhance-interval]').forEach(button => button.addEventListener('click', () => {
      if (!state.ready) return;
      if (isLocked()) return notify('Your existing paid subscription uses ' + (state.interval === 'year' ? 'yearly' : 'monthly') + ' billing. Add-ons must use the same interval.', 'info');
      state.interval = button.dataset.enhanceInterval === 'month' ? 'month' : 'year';
      document.querySelectorAll('[data-enhance-interval]').forEach(item => item.classList.toggle('active', item === button));
      selected.clear();
      renderCatalog();
      renderSummary();
      applyFilter();
    }));
    el('enhance-checkout').addEventListener('click', () => {
      if (!selected.size) return;
      if (STAGING_PURCHASES_DISABLED) notify('This is a pricing review, not a checkout. LIW add-ons are currently marked non-sellable and staging shares the live billing project. A separate Stripe test checkout and verified webhook are required before purchases can be enabled.', 'warning');
    });
    el('enhance-mobile-review').addEventListener('click', () => {
      el('enhance-checkout').scrollIntoView({behavior: 'smooth', block: 'center'});
      notify('Review the selected add-ons and plan comparison here. No payment is collected on this staging page.', 'info');
    });
    el('sidebar-toggle').addEventListener('click', () => el('sidebar').classList.toggle('open'));
  }

  async function load() {
    try {
      if (!window.LIW_IS_GITHUB_STAGING) {
        // Const declarations in config.js are global lexical bindings, not window properties.
        if (!location.hostname.endsWith('github.io')) return notify('This catalog is for staging only.', 'warning');
      }
      const user = await requireUser();
      if (!user) return;
      const [defs, rows, subscription, plans, access] = await Promise.all([
        supabaseClient.from('addon_definitions').select('*').eq('is_active', true).order('sort_order'),
        supabaseClient.from('subscription_addons').select('addon_key,status,quantity,cancel_at_period_end').eq('user_id', user.id),
        supabaseClient.from('subscriptions').select('plan_key,status,billing_interval,stripe_subscription_id').eq('user_id', user.id).maybeSingle(),
        supabaseClient.from('plan_definitions').select('plan_key,name,yearly_price_cents').in('plan_key', ['plus', 'pro']),
        getLiwAccessContext(user, {refresh: true})
      ]);
      if (defs.error || rows.error || subscription.error || plans.error) throw new Error('Could not read the current catalog and plan prices. Refresh to retry.');
      state.definitions = new Map((defs.data || []).map(def => [def.addon_key, def]));
      state.rows = new Map((rows.data || []).map(row => [row.addon_key, row]));
      state.plans = new Map((plans.data || []).map(plan => [plan.plan_key, plan]));
      state.subscription = subscription.data || null;
      state.access = access;
      state.interval = isLocked() && state.subscription.billing_interval === 'month' ? 'month' : 'year';
      state.ready = true;
      document.querySelectorAll('[data-enhance-interval]').forEach(button => {
        button.classList.toggle('active', button.dataset.enhanceInterval === state.interval);
        button.disabled = isLocked() && button.dataset.enhanceInterval !== state.interval;
      });
      const label = el('enhance-account-status');
      if (label) label.textContent = access.isPlanPreview ? 'Admin plan simulation · checkout disabled' : access.isAdmin ? 'LIW Admin · features included' : 'Current plan: ' + safe((state.plans.get(access.planKey) || {}).name || access.planKey || 'Free');
      const count = FEATURES.filter(item => { const def = state.definitions.get(item.key); return def && def.is_active; }).length;
      el('enhance-catalog-count').textContent = count + ' configured add-ons · current database prices';
      renderPlans();
      renderCatalog();
      renderSummary();
      applyFilter();
      notify('Live catalog loaded. This staging screen is read-only for billing: no charge or account change can occur here.', 'info');
    } catch (error) {
      notify(error && error.message ? error.message : 'Unable to load catalog.', 'warning');
      el('enhance-plus-grid').innerHTML = '<div class="enhance-empty">Catalog unavailable. Please refresh to try again.</div>';
      el('enhance-pro-grid').innerHTML = '';
      el('enhance-checkout').disabled = true;
    }
  }

  wire();
  load();
})();