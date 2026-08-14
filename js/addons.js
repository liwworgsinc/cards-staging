let addonUser = null;
let addonSubscription = null;
let addonPlan = null;
let addonDefinitions = [];
let addonRows = [];
let addonCards = [];
let domainExportOrders = [];
let oneTimeOffers = [];
let pendingRemoval = null;
let addonIsAdmin = false;
let addonIsPlanPreview = false;
let addonSelectedInterval = 'month';
let workspaceMembers = [];
let workspaceSettings = null;
let resellerProfile = null;
let resellerOrders = [];
let workspaceLogoRemoved = false;
const activeAddonStatuses = new Set(['active', 'trialing', 'past_due']);

(async function initAddons() {
  addonUser = await requireUser();
  if (!addonUser) return;

  const [profileResult, subscriptionResult, definitionsResult, addonResult, cardsResult, domainsResult, offersResult, membersResult, workspaceResult, resellerResult, resellerOrdersResult] = await Promise.all([
    supabaseClient.from('profiles').select('role').eq('id', addonUser.id).maybeSingle(),
    supabaseClient.from('subscriptions').select('*').eq('user_id', addonUser.id).maybeSingle(),
    supabaseClient.from('addon_definitions').select('*').eq('is_active', true).order('sort_order'),
    supabaseClient.from('subscription_addons').select('*').eq('user_id', addonUser.id),
    supabaseClient.from('digital_cards').select('id,full_name,company_name,slug,status').eq('user_id', addonUser.id).order('updated_at', { ascending: false }),
    supabaseClient.from('one_time_orders').select('id,offer_key,card_id,status,created_at').eq('user_id', addonUser.id).eq('offer_key', 'domain_export').order('created_at', { ascending: false }),
    supabaseClient.from('one_time_offers').select('*').eq('is_active', true).order('sort_order'),
    supabaseClient.from('workspace_members').select('*').eq('owner_user_id', addonUser.id).order('created_at'),
    supabaseClient.from('workspace_settings').select('*').eq('user_id', addonUser.id).maybeSingle(),
    supabaseClient.from('reseller_profiles').select('*').eq('user_id', addonUser.id).maybeSingle(),
    supabaseClient.from('reseller_orders').select('*').eq('seller_user_id', addonUser.id).order('created_at', { ascending: false }).limit(25)
  ]);

  if (subscriptionResult.error) toast(subscriptionResult.error.message);
  if (definitionsResult.error) toast(definitionsResult.error.message);
  if (addonResult.error) toast(addonResult.error.message);
  if (cardsResult.error) toast(cardsResult.error.message);
  if (domainsResult.error) toast(domainsResult.error.message);
  if (offersResult.error) toast(offersResult.error.message);

  const addonAccess = await getLiwAccessContext(addonUser, { refresh: true });
  addonIsAdmin = addonAccess.isAdmin;
  addonIsPlanPreview = addonAccess.isPlanPreview;
  addonSubscription = subscriptionResult.data;
  addonDefinitions = definitionsResult.data || [];
  addonRows = addonIsPlanPreview ? [] : (addonResult.data || []);
  addonCards = cardsResult.data || [];
  domainExportOrders = domainsResult.data || [];
  oneTimeOffers = offersResult.data || [];
  workspaceMembers = membersResult.data || [];
  workspaceSettings = workspaceResult.data || null;
  resellerProfile = resellerResult.data || null;
  resellerOrders = resellerOrdersResult.data || [];
  addonSelectedInterval = addonSubscription?.billing_interval === 'year' ? 'year' : 'month';

  const planKey = addonAccess.planKey;
  const { data: planDefinition } = await supabaseClient.from('plan_definitions')
    .select('plan_key,name,card_limit,entitlements')
    .eq('plan_key', planKey)
    .maybeSingle();
  addonPlan = (addonIsAdmin && !addonIsPlanPreview) ? { plan_key: 'admin', name: 'LIW Admin', card_limit: 100, entitlements: { agency_branding: true, white_label: true, white_label_dashboard: true, reseller_sales: true } } : (planDefinition || { plan_key: planKey, name: titleCase(planKey), card_limit: 1, entitlements: {} });

  renderSubscriptionSummary();
  renderAddons();
  renderDomainWorkspace();
  renderOneTimeOffers();
  renderTeamWorkspace();
  renderWhiteLabelWorkspace();
  renderResellerSales();
  wireAddonPage();
  if (new URLSearchParams(location.search).get('billing') === 'team-success') setTimeout(() => waitForTeamAccess(0), 900);
  if (window.lucide) lucide.createIcons();
})();

function wireAddonPage() {
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => document.getElementById('sidebar')?.classList.toggle('open'));

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('.addon-card').forEach(card => {
        card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
      });
    });
  });

  document.getElementById('close-remove-dialog')?.addEventListener('click', closeRemoveDialog);
  document.getElementById('cancel-remove-addon')?.addEventListener('click', closeRemoveDialog);
  document.getElementById('confirm-remove-addon')?.addEventListener('click', async () => {
    if (!pendingRemoval) return;
    const key = pendingRemoval;
    closeRemoveDialog();
    await changeAddon(key, 'remove', 1);
  });

  document.getElementById('domain-export-form')?.addEventListener('submit', purchaseDomainExport);
  document.getElementById('download-domain-export')?.addEventListener('click', downloadSelectedDomainExport);
  document.getElementById('domain-card')?.addEventListener('change', renderDomainExportState);

  document.querySelectorAll('[data-addon-interval]').forEach(button => {
    const paidIntervalLocked = Boolean(addonSubscription?.stripe_subscription_id && activeAddonStatuses.has(addonSubscription?.status));
    button.classList.toggle('active', button.dataset.addonInterval === addonSelectedInterval);
    button.disabled = paidIntervalLocked && button.dataset.addonInterval !== addonSelectedInterval;
    button.addEventListener('click', () => {
      if (paidIntervalLocked) return toast(`Your active subscription uses ${addonSelectedInterval === 'year' ? 'yearly' : 'monthly'} billing.`);
      addonSelectedInterval = button.dataset.addonInterval === 'year' ? 'year' : 'month';
      document.querySelectorAll('[data-addon-interval]').forEach(item => item.classList.toggle('active', item === button));
      renderAddons();
    });
  });

  document.getElementById('team-form')?.addEventListener('submit', submitTeamMember);
  document.getElementById('team-trial-seats')?.addEventListener('change', updateTeamTrialEstimate);
  document.getElementById('team-trial-interval')?.addEventListener('change', event => { addonSelectedInterval = event.currentTarget.value === 'year' ? 'year' : 'month'; document.querySelectorAll('[data-addon-interval]').forEach(item => item.classList.toggle('active', item.dataset.addonInterval === addonSelectedInterval)); updateTeamTrialEstimate(); renderAddons(); });
  document.getElementById('start-team-trial')?.addEventListener('click', event => { const seats = Number(document.getElementById('team-trial-seats')?.value || 2); addonSelectedInterval = document.getElementById('team-trial-interval')?.value === 'year' ? 'year' : 'month'; changeAddon('team_member_access', 'add', seats, event.currentTarget); });
  document.getElementById('cancel-team-access')?.addEventListener('click', event => { const row = addonRow('team_member_access'); if (row?.cancel_at_period_end) changeAddon('team_member_access', 'set_quantity', Math.max(1, Number(row.quantity || 1)), event.currentTarget); else openRemoveDialog('team_member_access'); });
  document.getElementById('update-team-seats')?.addEventListener('click', event => { const quantity = Math.max(1, Math.min(10, Number(document.getElementById('team-active-seats')?.value || 1))); changeAddon('team_member_access', 'set_quantity', quantity, event.currentTarget); });
  document.getElementById('white-label-form')?.addEventListener('submit', saveWorkspaceBranding);
  document.getElementById('reset-workspace-branding')?.addEventListener('click', resetWorkspaceBrandingPreview);
  document.querySelectorAll('#white-label-form input,#white-label-form select').forEach(control => control.addEventListener('input', updateWorkspaceBrandPreview));
  document.getElementById('workspace-logo-file')?.addEventListener('change', event => {
    if (event.currentTarget.files?.[0]) workspaceLogoRemoved = false;
    updateWorkspaceBrandPreview();
  });
  document.getElementById('workspace-logo-url')?.addEventListener('input', event => {
    if (event.currentTarget.value.trim()) workspaceLogoRemoved = false;
  });
  document.getElementById('remove-workspace-logo')?.addEventListener('click', removeWorkspaceLogo);
  document.getElementById('workspace-favicon-file')?.addEventListener('change', updateWorkspaceBrandPreview);
  document.getElementById('reseller-sales-form')?.addEventListener('submit', saveResellerSales);
  document.getElementById('preview-reseller-sales-link')?.addEventListener('click', previewResellerSalesPage);
  document.getElementById('connect-reseller-stripe')?.addEventListener('click', connectResellerStripe);
  document.getElementById('refresh-reseller-stripe')?.addEventListener('click', refreshResellerStripe);
  document.getElementById('disconnect-reseller-stripe')?.addEventListener('click', disconnectResellerStripe);
  document.getElementById('copy-reseller-sales-link')?.addEventListener('click', copyResellerSalesLink);
  document.getElementById('reseller-store-slug')?.addEventListener('input', updateResellerSalesLinks);
  document.getElementById('reseller-order-list')?.addEventListener('click', handleResellerOrderAction);

}

function renderSubscriptionSummary() {
  const activePlan = addonIsPlanPreview || addonIsAdmin || (addonSubscription && activeAddonStatuses.has(addonSubscription.status));
  const paidPlan = !addonIsPlanPreview && activePlan && Boolean(addonSubscription?.stripe_subscription_id);
  const interval = addonSubscription?.stripe_subscription_id ? (addonSubscription?.billing_interval === 'year' ? 'year' : 'month') : addonSelectedInterval;
  const activePaid = addonDefinitions.filter(def => def.is_sellable && (() => {
    const row = addonRow(def.addon_key);
    return row && activeAddonStatuses.has(row.status) && !isIncluded(def);
  })());
  const included = addonDefinitions.filter(isIncluded);
  const totalCents = activePaid.reduce((sum, def) => {
    const row = addonRow(def.addon_key);
    const price = interval === 'year' ? def.yearly_price_cents : def.monthly_price_cents;
    return sum + price * Math.max(1, row?.quantity || 1);
  }, 0);

  document.getElementById('current-plan').textContent = addonIsPlanPreview ? `${addonPlan?.name || 'Starter'} preview` : addonIsAdmin ? 'LIW Admin workspace' : `${addonPlan?.name || 'Starter'} plan`;
  const status = document.getElementById('current-plan-status');
  status.textContent = addonIsPlanPreview ? 'Admin simulation' : addonIsAdmin ? 'Owner access' : activePlan ? (addonSubscription?.status === 'past_due' ? 'Payment attention' : 'Active') : 'Inactive';
  status.className = `status-pill ${activePlan ? (addonSubscription?.status === 'past_due' ? 'past_due' : 'active') : 'draft'}`;

  document.getElementById('billing-summary').textContent = addonIsPlanPreview
    ? `Previewing ${addonPlan?.name || 'this plan'} with its included features and limits. Billing and subscriptions stay unchanged. Reseller branding and storefront demo settings can be saved to the LIW Admin workspace.`
    : addonIsAdmin
    ? '100 cards and every software add-on are included. No recurring purchase is required for the LIW owner account.'
    : activePlan
      ? paidPlan
      ? `${interval === 'year' ? 'Yearly' : 'Monthly'} billing · ${addonPlan.card_limit} base card${addonPlan.card_limit === 1 ? '' : 's'} · Recurring extras renew with your plan.`
      : `Free · ${addonPlan.card_limit} published card · Add only the tools you need, including up to 5 extra cards.`
    : 'Activate Free, Plus, Pro, Starter Reseller, or Pro Reseller to begin.';
  document.getElementById('active-addon-count').textContent = String(activePaid.length);
  document.getElementById('included-addon-count').textContent = String(included.length);
  document.getElementById('addon-total').textContent = formatMoney(interval === 'year' ? Math.round(totalCents / 12) : totalCents);
  document.getElementById('addon-total-label').textContent = interval === 'year' ? 'monthly equivalent' : 'per month';

  document.getElementById('sidebar-plan').textContent = addonIsPlanPreview ? `${addonPlan.name} preview` : addonIsAdmin ? 'LIW Admin workspace' : activePlan ? `${addonPlan.name} plan` : 'Plan inactive';
  document.getElementById('sidebar-plan-copy').textContent = addonIsPlanPreview
    ? 'Customer feature rules active · billing disabled.'
    : addonIsAdmin
    ? '100 cards included · no software add-on billing.'
    : activePlan
    ? paidPlan
      ? `${interval === 'year' ? 'Yearly' : 'Monthly'} billing · ${activePaid.length} paid extra${activePaid.length === 1 ? '' : 's'}.`
      : 'Free forever · 1 published card.'
    : 'Choose a plan to publish.';

  const chips = [
    ...included.map(def => `<span class="active-addon-chip included"><i data-lucide="circle-check" size="15"></i>${escapeHtml(def.name)} <small>Included</small></span>`),
    ...activePaid.map(def => {
      const row = addonRow(def.addon_key);
      const quantity = def.is_quantity && row?.quantity > 1 ? ` ×${row.quantity}` : '';
      return `<span class="active-addon-chip"><i data-lucide="sparkles" size="15"></i>${escapeHtml(def.name)}${quantity}</span>`;
    })
  ];
  const strip = document.getElementById('active-addon-strip');
  if (chips.length) {
    strip.hidden = false;
    document.getElementById('active-addon-chips').innerHTML = chips.join('');
  } else {
    strip.hidden = true;
  }
}

function renderAddons() {
  const grid = document.getElementById('addon-grid');
  const resellerPlan = ['agency', 'white_label'].includes(addonPlan?.plan_key);
  const sellableDefinitions = addonDefinitions.filter(definition => definition.is_sellable && !(resellerPlan && definition.addon_key === 'extra_card'));
  const safeAddonIcons = { extra_card: 'copy-plus', team_member_access: 'users-round', premium_templates: 'panels-top-left', advanced_analytics: 'chart-no-axes-combined', remove_branding: 'badge-x' };
  const iconFor = definition => safeAddonIcons[definition.addon_key] || definition.icon || 'sparkles';
  if (!sellableDefinitions.length) {
    grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><span class="empty-icon"><i data-lucide="blocks" size="28"></i></span><h3>No add-ons available</h3><p class="muted">The marketplace is being prepared.</p></div>';
    return;
  }

  const interval = addonSubscription?.stripe_subscription_id ? (addonSubscription?.billing_interval === 'year' ? 'year' : 'month') : addonSelectedInterval;
  const activePlan = addonIsPlanPreview || addonIsAdmin || (addonSubscription && activeAddonStatuses.has(addonSubscription.status));
  const paidPlan = !addonIsPlanPreview && activePlan && Boolean(addonSubscription?.stripe_subscription_id);

  grid.innerHTML = sellableDefinitions.map(def => {
    const row = addonRow(def.addon_key);
    const active = row && activeAddonStatuses.has(row.status);
    const included = isIncluded(def);
    const priceCents = interval === 'year' ? def.yearly_price_cents : def.monthly_price_cents;
    const monthlyEquivalent = interval === 'year' ? Math.round(priceCents / 12) : priceCents;
    const stripePriceId = interval === 'year' ? def.stripe_yearly_price_id : def.stripe_monthly_price_id;
    const priceReady = Boolean(stripePriceId);
    const quantity = Math.max(1, Number(row?.quantity || 1));
    const statusClass = included ? 'included' : active ? 'active' : '';
    const configure = configureHref(def);
    let controls = '';

    if (included) {
      controls = `<div class="addon-ready-row"><div class="addon-included"><i data-lucide="badge-check" size="18"></i> ${addonIsAdmin && !addonIsPlanPreview ? 'Admin included' : `Included with ${escapeHtml(addonPlan.name)}`}</div>${configure ? `<a class="btn btn-light btn-sm" href="${configure}">Configure</a>` : ''}</div>`;
    } else if (addonIsPlanPreview) {
      controls = '<button class="btn btn-light btn-block" type="button" disabled><i data-lucide="scan-eye" size="17"></i> Locked on this plan</button>';
    } else if (!paidPlan) {
      controls = priceReady
        ? (def.is_quantity
          ? `<div class="addon-quantity-row addon-start-row">
              <div class="quantity-control" aria-label="Choose quantity">
                <button type="button" data-qty-change="-1" data-addon-key="${def.addon_key}" aria-label="Decrease quantity"><i data-lucide="minus" size="15"></i></button>
                <input type="number" min="1" max="${def.max_quantity}" value="${quantity}" data-addon-quantity="${def.addon_key}" aria-label="Quantity">
                <button type="button" data-qty-change="1" data-addon-key="${def.addon_key}" aria-label="Increase quantity"><i data-lucide="plus" size="15"></i></button>
              </div>
              <button class="btn btn-primary" type="button" data-add-addon="${def.addon_key}"><i data-lucide="credit-card" size="17"></i> Start ${addonSelectedInterval === 'year' ? 'yearly' : 'monthly'} add-on</button>
            </div>`
          : `<button class="btn btn-primary btn-block" type="button" data-add-addon="${def.addon_key}"><i data-lucide="credit-card" size="17"></i> Start ${addonSelectedInterval === 'year' ? 'yearly' : 'monthly'} add-on</button>`)
        : '<button class="btn btn-light btn-block" type="button" disabled><i data-lucide="clock-3" size="17"></i> Live price being connected</button>';
    } else if (active && def.is_quantity) {
      controls = `<div class="addon-quantity-row">
        <div class="quantity-control" aria-label="Extra card quantity">
          <button type="button" data-qty-change="-1" data-addon-key="${def.addon_key}" aria-label="Decrease quantity"><i data-lucide="minus" size="15"></i></button>
          <input type="number" min="1" max="${def.max_quantity}" value="${quantity}" data-addon-quantity="${def.addon_key}" aria-label="Quantity">
          <button type="button" data-qty-change="1" data-addon-key="${def.addon_key}" aria-label="Increase quantity"><i data-lucide="plus" size="15"></i></button>
        </div>
        <button class="btn btn-primary btn-sm" type="button" data-update-addon="${def.addon_key}">Update</button>
        <a class="btn btn-light btn-sm" href="${configure || 'editor.html'}">Create card</a>
        <button class="btn btn-ghost btn-sm danger-text" type="button" data-remove-addon="${def.addon_key}">Remove</button>
      </div>`;
    } else if (active) {
      controls = `<div class="addon-active-actions"><span><i data-lucide="circle-check" size="17"></i> Active now</span><div>${configure ? `<a class="btn btn-light btn-sm" href="${configure}">Configure</a>` : ''}<button class="btn btn-ghost btn-sm danger-text" type="button" data-remove-addon="${def.addon_key}">Remove</button></div></div>`;
    } else {
      controls = priceReady
        ? (def.is_quantity
          ? `<div class="addon-quantity-row addon-start-row">
              <div class="quantity-control" aria-label="Choose quantity">
                <button type="button" data-qty-change="-1" data-addon-key="${def.addon_key}" aria-label="Decrease quantity"><i data-lucide="minus" size="15"></i></button>
                <input type="number" min="1" max="${def.max_quantity}" value="${quantity}" data-addon-quantity="${def.addon_key}" aria-label="Quantity">
                <button type="button" data-qty-change="1" data-addon-key="${def.addon_key}" aria-label="Increase quantity"><i data-lucide="plus" size="15"></i></button>
              </div>
              <button class="btn btn-primary" type="button" data-add-addon="${def.addon_key}"><i data-lucide="plus" size="17"></i> Add to ${escapeHtml(addonPlan.name)}</button>
            </div>`
          : `<button class="btn btn-primary btn-block" type="button" data-add-addon="${def.addon_key}"><i data-lucide="plus" size="17"></i> Add to ${escapeHtml(addonPlan.name)}</button>`)
        : '<button class="btn btn-light btn-block" type="button" disabled><i data-lucide="clock-3" size="17"></i> Live price being connected</button>';
    }

    if (def.addon_key === 'team_member_access' && !included) {
      const trialEligible = !row?.trial_used_at;
      const canceling = Boolean(row?.cancel_at_period_end);
      if (active) {
        controls = `<div class="addon-active-actions"><span><i data-lucide="${row.status === 'trialing' ? 'timer' : 'circle-check'}" size="17"></i> ${row.status === 'trialing' ? '7-day trial active' : canceling ? 'Canceling at period end' : 'Team Access active'}</span><div><a class="btn btn-light btn-sm" href="#team-workspace">Manage team</a></div></div>`;
      } else if (!addonIsPlanPreview) {
        controls = `<div class="addon-quantity-row addon-start-row"><label>Seats<input class="input" data-addon-quantity="${def.addon_key}" min="1" max="${Number(def.max_quantity || 10)}" type="number" value="2"></label><div class="quantity-stepper"><button type="button" data-qty-change="-1" data-addon-key="${def.addon_key}" aria-label="Decrease quantity"><i data-lucide="minus" size="15"></i></button><span>Up to ${Number(def.max_quantity || 10)}</span><button type="button" data-qty-change="1" data-addon-key="${def.addon_key}" aria-label="Increase quantity"><i data-lucide="plus" size="15"></i></button></div><button class="btn btn-primary" type="button" data-add-addon="${def.addon_key}"><i data-lucide="users-round" size="17"></i> ${trialEligible ? 'Start 7-day trial' : 'Start Team Access'}</button><small class="addon-trial-copy">${trialEligible ? 'Card required. Billing begins after seven days unless canceled.' : 'Trial already used. Billing starts when checkout completes.'}</small></div>`;
      }
    }

    return `<article class="card addon-card ${statusClass}" data-category="${escapeHtml(def.category)}">
      <div class="addon-card-top">
        <span class="addon-icon"><i data-lucide="${escapeHtml(iconFor(def))}" size="23"></i></span>
        ${included ? '<span class="addon-badge included">Included</span>' : active ? '<span class="addon-badge active">Active</span>' : '<span class="addon-badge">Optional</span>'}
      </div>
      <div class="addon-card-copy">
        <p class="addon-category">${escapeHtml(titleCase(def.category))}</p>
        <h3>${escapeHtml(def.name)}</h3>
        <p>${escapeHtml(def.short_description)}</p>
      </div>
      <div class="addon-price-row">
        <div><strong>${formatMoney(monthlyEquivalent)}</strong><span>/month${def.is_quantity ? ' each' : ''}</span></div>
        <small>${included ? `Included in ${escapeHtml(addonPlan.name)}` : active ? 'Active on your subscription' : interval === 'year' ? `${formatMoney(priceCents)} billed yearly · two months free` : 'Added to your monthly subscription'}</small>
      </div>
      <div class="addon-controls">${controls}</div>
    </article>`;
  }).join('');

  grid.querySelectorAll('[data-add-addon]').forEach(button => button.addEventListener('click', () => {
    const definition = addonDefinitions.find(item => item.addon_key === button.dataset.addAddon);
    const input = document.querySelector(`[data-addon-quantity="${button.dataset.addAddon}"]`);
    const quantity = definition?.is_quantity ? Number(input?.value || 1) : 1;
    changeAddon(button.dataset.addAddon, 'add', quantity, button);
  }));
  grid.querySelectorAll('[data-update-addon]').forEach(button => button.addEventListener('click', () => {
    const input = document.querySelector(`[data-addon-quantity="${button.dataset.updateAddon}"]`);
    changeAddon(button.dataset.updateAddon, 'set_quantity', Number(input?.value || 1), button);
  }));
  grid.querySelectorAll('[data-remove-addon]').forEach(button => button.addEventListener('click', () => openRemoveDialog(button.dataset.removeAddon)));
  grid.querySelectorAll('[data-qty-change]').forEach(button => button.addEventListener('click', () => {
    const input = document.querySelector(`[data-addon-quantity="${button.dataset.addonKey}"]`);
    if (!input) return;
    const definition = addonDefinitions.find(item => item.addon_key === button.dataset.addonKey);
    const next = Math.max(1, Math.min(Number(definition?.max_quantity || 5), Number(input.value || 1) + Number(button.dataset.qtyChange)));
    input.value = String(next);
  }));

  if (window.lucide) lucide.createIcons();
}

function configureHref(definition) {
  const firstCard = addonCards[0];
  const editorBase = firstCard ? `editor.html?id=${encodeURIComponent(firstCard.id)}` : 'editor.html';
  const joiner = editorBase.includes('?') ? '&' : '?';
  const map = {
    advanced_analytics: 'analytics.html',
    premium_templates: `${editorBase}${joiner}tab=design&feature=premium_templates`,
    appointment_booking: `${editorBase}${joiner}tab=tools&feature=appointment_booking`,
    lead_capture: `${editorBase}${joiner}tab=tools&feature=lead_capture`,
    product_showcase: `${editorBase}${joiner}tab=tools&feature=product_showcase`,
    video_section: 'media.html?feature=video_section',
    file_downloads: 'media.html?feature=file_downloads',
    team_member_access: '#team-workspace',
    white_label_dashboard: '#white-label-workspace',
    remove_branding: `${editorBase}${joiner}tab=design&feature=custom_branding_link`,
    extra_card: 'editor.html',
  };
  return map[definition?.addon_key] || '';
}

async function changeAddon(addonKey, action, quantity = 1, trigger = null) {
  if (addonIsPlanPreview) {
    toast('Plan Simulator is preview-only. Exit simulation to manage real add-ons.');
    return;
  }
  if (addonIsAdmin) {
    toast('Admin already includes 100 cards and every software add-on.');
    return;
  }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return location.href = liwUrl('login.html');
  const definition = addonDefinitions.find(item => item.addon_key === addonKey);
  const interval = addonKey === 'team_member_access' ? addonSelectedInterval : (addonSubscription?.stripe_subscription_id ? (addonSubscription?.billing_interval === 'year' ? 'year' : 'month') : addonSelectedInterval);
  const priceId = interval === 'year' ? definition?.stripe_yearly_price_id : definition?.stripe_monthly_price_id;
  if (action !== 'remove' && !priceId) return toast('This affordable live price is still being connected to Stripe.');
  setButtonBusy(trigger, true, action === 'remove' ? 'Removing…' : 'Updating…');

  try {
    const response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/manage-addon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        addonKey, action, quantity, interval: addonSelectedInterval,
        successUrl: addonKey === 'team_member_access' ? liwUrl('addons.html?billing=team-success#team-workspace') : liwUrl('dashboard.html?billing=addon-success'),
        cancelUrl: addonKey === 'team_member_access' ? liwUrl('addons.html#team-workspace') : liwUrl('addons.html')
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to update add-on');
    toast(data.message || `${definition?.name || 'Add-on'} updated`);
    if (data.paymentUrl) {
      setTimeout(() => location.href = data.paymentUrl, 450);
      return;
    }

    const existing = addonRows.find(row => row.addon_key === addonKey);
    const nextStatus = data.active === false || action === 'remove' ? 'canceled' : 'active';
    if (existing) {
      existing.status = nextStatus;
      existing.quantity = Math.max(1, Number(data.quantity || quantity || 1));
      if (data.status) existing.status = data.status;
      if (data.trialEndsAt !== undefined) existing.trial_ends_at = data.trialEndsAt;
      if (data.cancelAtPeriodEnd !== undefined) existing.cancel_at_period_end = data.cancelAtPeriodEnd;
    } else {
      addonRows.push({ addon_key: addonKey, status: data.status || nextStatus, quantity: Math.max(1, Number(data.quantity || quantity || 1)), trial_ends_at: data.trialEndsAt || null, cancel_at_period_end: Boolean(data.cancelAtPeriodEnd) });
    }
    clearLiwAccessContextCache();
    renderSubscriptionSummary();
    renderAddons();
    renderDomainWorkspace();
    renderTeamWorkspace();
    renderWhiteLabelWorkspace();
    renderResellerSales();
    setButtonBusy(trigger, false);

    const configure = configureHref(definition);
    if (configure && action !== 'remove' && !configure.startsWith('#')) {
      const card = document.querySelector(`.addon-card[data-category="${definition.category}"]`);
      card?.classList.add('addon-just-activated');
    }
  } catch (error) {
    toast(error.message);
    setButtonBusy(trigger, false);
  }
}

function setButtonBusy(button, busy, label = 'Working…') {
  if (!button) return;
  button.dataset.original = button.dataset.original || button.innerHTML;
  button.disabled = busy;
  button.innerHTML = busy ? `<span class="button-spinner"></span>${label}` : button.dataset.original;
}

function openRemoveDialog(addonKey) {
  pendingRemoval = addonKey;
  const definition = addonDefinitions.find(item => item.addon_key === addonKey);
  document.getElementById('remove-addon-copy').textContent = addonKey === 'team_member_access' ? 'Team Access will remain available until the end of the current trial or billing period. Cancel during the trial to avoid the first charge.' : `${definition?.name || 'This add-on'} will stop being available. Stripe will calculate any applicable prorated credit.`;
  document.getElementById('remove-addon-dialog').showModal();
}

function closeRemoveDialog() {
  pendingRemoval = null;
  document.getElementById('remove-addon-dialog').close();
}


function renderOneTimeOffers() {
  const grid = document.getElementById('one-time-offer-grid');
  if (!grid) return;
  const standaloneOffers = oneTimeOffers.filter(offer => !['domain_export', 'nfc_card'].includes(offer.offer_key));
  if (!standaloneOffers.length) {
    grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><h3>Services are being prepared</h3><p class="muted">Live checkout prices still need to be connected.</p></div>';
    return;
  }

  grid.innerHTML = standaloneOffers.map(offer => {
    const ready = LIW_CONFIG.oneTimeServicesEnabled === true && Boolean(offer.stripe_price_id);
    return `<article class="card one-time-offer-card ${offer.offer_key === 'done_for_you' ? 'featured' : ''}">
      ${offer.badge ? `<span class="offer-badge">${escapeHtml(offer.badge)}</span>` : ''}
      <span class="offer-icon"><i data-lucide="${escapeHtml(offer.icon || 'sparkles')}"></i></span>
      <h3>${escapeHtml(offer.name)}</h3>
      <p>${escapeHtml(offer.short_description)}</p>
      <div class="offer-price">${formatMoney(offer.price_cents)} <small>one time</small></div>
      <button class="btn ${offer.offer_key === 'done_for_you' ? 'btn-primary' : 'btn-light'} btn-block" type="button" data-purchase-offer="${escapeHtml(offer.offer_key)}" ${ready ? '' : 'disabled'}>${ready ? 'Buy now' : 'Checkout being connected'}</button>
    </article>`;
  }).join('');

  grid.querySelectorAll('[data-purchase-offer]').forEach(button => {
    button.addEventListener('click', () => checkoutOneTime(button.dataset.purchaseOffer, button));
  });
  if (window.lucide) lucide.createIcons();
}

function renderDomainWorkspace() {
  const section = document.getElementById('domain-workspace');
  if (!section) return;
  section.hidden = false;

  const select = document.getElementById('domain-card');
  const requestedCardId = new URLSearchParams(location.search).get('card');
  const priorValue = select.value || requestedCardId || '';
  select.innerHTML = addonCards.length
    ? addonCards.map(card => `<option value="${escapeHtml(card.id)}">${escapeHtml(card.company_name || card.full_name || card.slug)}</option>`).join('')
    : '<option value="">Create a card first</option>';
  if (priorValue && addonCards.some(card => card.id === priorValue)) select.value = priorValue;
  renderDomainExportState();
  renderDomainExportHistory();

  if (new URLSearchParams(location.search).get('purchase') === 'domain-export') {
    setTimeout(() => waitForDomainExportUnlock(0), 1600);
  }
}

function domainExportOffer() {
  return oneTimeOffers.find(offer => offer.offer_key === 'domain_export') || null;
}

function selectedDomainCard() {
  const id = document.getElementById('domain-card')?.value;
  return addonCards.find(card => card.id === id) || null;
}

function paidDomainExportFor(cardId) {
  return domainExportOrders.find(order => order.card_id === cardId && order.status === 'paid') || null;
}

function renderDomainExportState() {
  const card = selectedDomainCard();
  const purchase = document.getElementById('purchase-domain-export');
  const download = document.getElementById('download-domain-export');
  const status = document.getElementById('domain-export-status');
  if (!purchase || !download || !status) return;

  if (!card) {
    purchase.hidden = false;
    purchase.disabled = true;
    download.hidden = true;
    status.textContent = 'Create a digital card before purchasing a self-host package.';
    return;
  }

  const order = paidDomainExportFor(card.id);
  if ((addonIsAdmin && !addonIsPlanPreview) || order) {
    purchase.hidden = true;
    download.hidden = false;
    download.disabled = false;
    status.textContent = addonIsAdmin && !addonIsPlanPreview
      ? 'LIW Admin can download owned card packages without purchasing.'
      : 'Paid export unlocked. You can download this card package again whenever needed.';
    return;
  }

  const offer = domainExportOffer();
  purchase.hidden = false;
  download.hidden = true;
  const checkoutReady = LIW_CONFIG.oneTimeServicesEnabled === true && Boolean(offer?.stripe_price_id);
  purchase.disabled = !checkoutReady;
  purchase.innerHTML = `<i data-lucide="credit-card" size="17"></i> Purchase export — ${formatMoney(offer?.price_cents || 1000)}`;
  status.textContent = checkoutReady
    ? 'One payment unlocks repeated downloads for the selected card.'
    : 'The export tool is built. Its live Stripe price and one-time checkout function must be connected before customers can purchase.';
  if (window.lucide) lucide.createIcons();
}

function renderDomainExportHistory() {
  const area = document.getElementById('domain-exports');
  if (!area) return;
  const paid = domainExportOrders.filter(order => order.status === 'paid' && order.card_id);
  if (!paid.length) {
    area.innerHTML = '<div class="domain-empty"><i data-lucide="folder-down" size="20"></i><span>No paid self-host exports yet.</span></div>';
    if (window.lucide) lucide.createIcons();
    return;
  }

  area.innerHTML = paid.map(order => {
    const card = addonCards.find(item => item.id === order.card_id);
    return `<article class="domain-request-row"><div><strong>${escapeHtml(card?.company_name || card?.full_name || 'Digital card')}</strong><span>Purchased ${new Date(order.created_at).toLocaleDateString('en-US')}</span></div><button class="btn btn-light btn-sm" type="button" data-download-domain-card="${escapeHtml(order.card_id)}"><i data-lucide="download" size="15"></i> Download</button></article>`;
  }).join('');
  area.querySelectorAll('[data-download-domain-card]').forEach(button => button.addEventListener('click', () => downloadDomainExport(button.dataset.downloadDomainCard, button)));
  if (window.lucide) lucide.createIcons();
}

async function waitForDomainExportUnlock(attempt = 0) {
  await refreshDomainExportOrders();
  const card = selectedDomainCard();
  if (card && !paidDomainExportFor(card.id) && attempt < 4) {
    setTimeout(() => waitForDomainExportUnlock(attempt + 1), 1800 + attempt * 700);
  }
}

async function refreshDomainExportOrders() {
  const { data, error } = await supabaseClient.from('one_time_orders')
    .select('id,offer_key,card_id,status,created_at')
    .eq('user_id', addonUser.id)
    .eq('offer_key', 'domain_export')
    .order('created_at', { ascending: false });
  if (error) return;
  domainExportOrders = data || [];
  renderDomainExportState();
  renderDomainExportHistory();
}

async function purchaseDomainExport(event) {
  event.preventDefault();
  const card = selectedDomainCard();
  if (!card) return toast('Choose a card to export');
  const button = document.getElementById('purchase-domain-export');
  await checkoutOneTime('domain_export', button, {
    cardId: card.id,
    successUrl: liwUrl(`addons.html?purchase=domain-export&card=${encodeURIComponent(card.id)}`)
  });
}

async function downloadSelectedDomainExport() {
  const card = selectedDomainCard();
  if (!card) return toast('Choose a card to export');
  if (addonIsPlanPreview) return toast('Plan Simulator is preview-only. No export was created.');
  if (!addonIsAdmin && !paidDomainExportFor(card.id)) return toast('Purchase this card export first');
  await downloadDomainExport(card.id, document.getElementById('download-domain-export'));
}

async function downloadDomainExport(cardId, trigger = null) {
  const card = addonCards.find(item => item.id === cardId);
  if (!card) return toast('That card is no longer available');
  if (!window.JSZip) return toast('The ZIP generator did not load. Refresh and try again.');
  setButtonBusy(trigger, true, 'Building ZIP…');
  try {
    const publicUrl = liwUrl(`card.html?slug=${encodeURIComponent(card.slug)}`);
    const displayName = card.company_name || card.full_name || 'Digital Card';
    const safeName = String(displayName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'liw-digital-card';
    const htmlTitle = escapeHtml(displayName);
    const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0b1438">
  <title>${htmlTitle}</title>
  <style>
    *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:#f4f5f8;overflow:hidden}
    iframe{display:block;width:100%;height:100%;border:0;background:#fff}
    .fallback{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:5;padding:9px 13px;border-radius:999px;background:rgba(7,16,46,.92);color:#fff;font:600 13px system-ui;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.2)}
  </style>
</head>
<body>
  <iframe src="${publicUrl}" title="${htmlTitle}" allow="clipboard-write; fullscreen" loading="eager"></iframe>
  <a class="fallback" href="${publicUrl}" target="_blank" rel="noopener">Open card directly</a>
</body>
</html>`;
    const readme = `LIW DIGITAL CARDS — SELF-HOST PACKAGE\n\nCARD: ${displayName}\nLIVE CARD URL: ${publicUrl}\n\nHOW TO UPLOAD\n1. Unzip this package.\n2. Upload index.html and 404.html to the public/root folder of your hosting account.\n3. In cPanel this is normally public_html. In Netlify, drag the entire unzipped folder into Sites.\n4. Connect the client's domain inside the hosting provider.\n5. Add the DNS records shown by that provider at the domain registrar.\n6. Wait for SSL/HTTPS to become active, then test the domain on a phone and computer.\n\nGITHUB PAGES\n1. Create a new repository.\n2. Upload all files from this package.\n3. Open Settings > Pages and publish from the main branch.\n4. Add the custom domain in GitHub Pages settings.\n\nIMPORTANT\n- The uploaded page displays the live LIW Digital Card. Card updates made in LIW appear automatically.\n- Keep the LIW card published. If the card becomes a draft, the public page may no longer display.\n- Do not remove the iframe URL from index.html.\n- CNAME.example is a reminder file only. Rename it to CNAME only when your host specifically requires that file.\n\nSUPPORT\nLIW WORGS INC\nliwworgsinc@gmail.com\n`;
    const dnsGuide = `CUSTOM DOMAIN CHECKLIST\n\n1. Buy or use a domain you already own.\n2. Upload this package to a web host.\n3. Add the domain inside the hosting dashboard.\n4. Copy the A, AAAA, or CNAME records supplied by the host.\n5. Add those records at the domain registrar.\n6. Remove conflicting parking records.\n7. Wait for DNS propagation and HTTPS activation.\n8. Test both yourdomain.com and www.yourdomain.com.\n`;
    const zip = new JSZip();
    zip.file('index.html', indexHtml);
    zip.file('404.html', indexHtml);
    zip.file('README-UPLOAD-INSTRUCTIONS.txt', readme);
    zip.file('CUSTOM-DOMAIN-CHECKLIST.txt', dnsGuide);
    zip.file('CNAME.example', 'yourdomain.com\n');
    zip.file('netlify.toml', '[[headers]]\n  for = "/*"\n  [headers.values]\n    X-Content-Type-Options = "nosniff"\n    Referrer-Policy = "strict-origin-when-cross-origin"\n');
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${safeName}-self-host-package.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Website ZIP downloaded');
  } catch (error) {
    toast(error.message || 'Could not build the website ZIP');
  } finally {
    setButtonBusy(trigger, false);
  }
}

function hasActiveOrIncluded(addonKey) {
  const definition = addonDefinitions.find(item => item.addon_key === addonKey);
  const row = addonRow(addonKey);
  return Boolean(definition && (isIncluded(definition) || (row && activeAddonStatuses.has(row.status))));
}

function planHasEntitlement(key) {
  return (addonIsAdmin && !addonIsPlanPreview) || addonPlan?.entitlements?.[key] === true;
}

function isFullWhiteLabelPlan() {
  return (addonIsAdmin && !addonIsPlanPreview) || addonPlan?.plan_key === 'white_label' || planHasEntitlement('white_label') || planHasEntitlement('white_label_dashboard');
}

function isResellerSalesPlan() {
  return (addonIsAdmin && !addonIsPlanPreview) || planHasEntitlement('reseller_sales');
}

function isAgencyBrandingPlan() {
  return isFullWhiteLabelPlan() || addonPlan?.plan_key === 'agency' || planHasEntitlement('agency_branding');
}


function teamSeatLimit() {
  const row = addonRow('team_member_access');
  if (addonIsAdmin && !addonIsPlanPreview) return 100;
  if (addonPlan?.plan_key === 'white_label') return 10;
  if (addonPlan?.plan_key === 'agency') return 5;
  return Math.max(1, Number(row?.quantity || 1));
}

function teamInviteUrl(member) {
  const page = member?.status === 'active' ? 'login.html' : 'register.html';
  const url = new URL(liwUrl(page));
  url.searchParams.set('team_invite', '1');
  url.searchParams.set('email', member?.invited_email || '');
  return url.href;
}

function teamDeliveryCopy(member) {
  if (member.status === 'active' || member.invite_delivery_status === 'connected') return 'Connected';
  if (member.invite_delivery_status === 'failed') return 'Email failed';
  if (member.invite_delivery_status === 'sent') return 'Email sent';
  return 'Pending';
}

function teamTrialDaysLeft(row) {
  if (!row?.trial_ends_at) return null;
  return Math.max(0, Math.ceil((new Date(row.trial_ends_at).getTime() - Date.now()) / 86400000));
}

function updateTeamTrialEstimate() {
  const seats = Math.max(1, Math.min(10, Number(document.getElementById('team-trial-seats')?.value || 2)));
  const interval = document.getElementById('team-trial-interval')?.value === 'year' ? 'year' : 'month';
  const copy = document.getElementById('team-trial-after-copy');
  if (copy) copy.textContent = interval === 'year'
    ? `Then ${formatMoney(4000 * seats)}/year for ${seats} seat${seats === 1 ? '' : 's'} unless canceled.`
    : `Then ${formatMoney(400 * seats)}/month for ${seats} seat${seats === 1 ? '' : 's'} unless canceled.`;
}

function renderTeamWorkspace() {
  const section = document.getElementById('team-workspace');
  if (!section) return;
  section.hidden = false;
  const row = addonRow('team_member_access');
  const included = addonDefinitions.find(item => item.addon_key === 'team_member_access') && isIncluded(addonDefinitions.find(item => item.addon_key === 'team_member_access'));
  const enabled = hasActiveOrIncluded('team_member_access');
  const upgradePanel = document.getElementById('team-upgrade-panel');
  const managerPanel = document.getElementById('team-manager-panel');
  const status = document.getElementById('team-access-status');
  const cancelButton = document.getElementById('cancel-team-access');
  if (upgradePanel) upgradePanel.hidden = enabled;
  if (managerPanel) managerPanel.hidden = !enabled;

  if (!enabled) {
    if (status) { status.className = 'status-pill'; status.textContent = row?.trial_used_at ? 'Available' : '7-day trial available'; }
    const count = document.getElementById('team-seat-count');
    if (count) count.textContent = 'Choose 1–10 member seats';
    updateTeamTrialEstimate();
    if (window.lucide) lucide.createIcons();
    return;
  }

  const seatLimit = teamSeatLimit();
  const occupied = workspaceMembers.filter(member => ['invited', 'active'].includes(member.status)).length;
  const daysLeft = row?.status === 'trialing' ? teamTrialDaysLeft(row) : null;
  const canceling = Boolean(row?.cancel_at_period_end);
  if (status) {
    status.className = `status-pill active team-access-status ${row?.status === 'trialing' ? 'trialing' : canceling ? 'canceling' : ''}`;
    status.textContent = included ? `Included with ${addonPlan.name}` : row?.status === 'trialing' ? `Trial · ${daysLeft ?? 7} day${daysLeft === 1 ? '' : 's'} left` : canceling ? 'Cancellation scheduled' : 'Active';
  }
  const count = document.getElementById('team-seat-count');
  if (count) count.textContent = `${occupied} of ${seatLimit} member seat${seatLimit === 1 ? '' : 's'} used`;
  const managerTitle = document.getElementById('team-manager-title');
  const managerCopy = document.getElementById('team-manager-copy');
  if (managerTitle) managerTitle.textContent = included ? 'Team Access is included' : row?.status === 'trialing' ? 'Your Team Access trial is active' : canceling ? 'Team Access will end soon' : 'Team Access is active';
  if (managerCopy) managerCopy.textContent = row?.status === 'trialing'
    ? `Invite members now. Billing begins ${row.trial_ends_at ? new Date(row.trial_ends_at).toLocaleDateString('en-US') : 'after the trial'} unless canceled.`
    : canceling && row?.current_period_end
      ? `Access remains available through ${new Date(row.current_period_end).toLocaleDateString('en-US')}.`
      : 'Invite members and choose Editor or Viewer access for each person.';
  if (cancelButton) {
    cancelButton.hidden = included;
    cancelButton.innerHTML = canceling ? '<i data-lucide="rotate-ccw" size="16"></i> Keep Team Access' : '<i data-lucide="calendar-x-2" size="16"></i> Cancel Team Access';
    cancelButton.dataset.resumeTeam = canceling ? '1' : '0';
  }
  const seatPlan = document.getElementById('team-seat-plan');
  const activeSeats = document.getElementById('team-active-seats');
  if (seatPlan) seatPlan.hidden = included;
  if (activeSeats) { activeSeats.value = String(Math.max(1, Number(row?.quantity || seatLimit))); activeSeats.disabled = canceling; }
  const updateSeats = document.getElementById('update-team-seats');
  if (updateSeats) updateSeats.disabled = canceling;

  const area = document.getElementById('team-members');
  area.innerHTML = workspaceMembers.length
    ? workspaceMembers.map(member => {
      const delivery = teamDeliveryCopy(member);
      const sentAt = member.invite_sent_at ? ` · ${new Date(member.invite_sent_at).toLocaleString('en-US')}` : '';
      const errorCopy = member.invite_last_error ? `<small class="team-invite-error">${escapeHtml(member.invite_last_error)}</small>` : '';
      return `<article class="team-member-row"><div class="team-member-main"><strong>${escapeHtml(member.invited_email)}</strong><span>${escapeHtml(titleCase(member.status))}</span>${errorCopy}</div><div class="team-member-role-control"><label for="team-role-${escapeHtml(member.id)}">Role</label><select class="input" id="team-role-${escapeHtml(member.id)}" data-team-role-member="${escapeHtml(member.id)}"><option value="editor" ${member.role === 'editor' ? 'selected' : ''}>Editor</option><option value="viewer" ${member.role === 'viewer' ? 'selected' : ''}>Viewer</option></select></div><div class="team-member-status"><span class="invite-status ${escapeHtml(member.invite_delivery_status || 'pending')}">${escapeHtml(delivery)}</span><small>${escapeHtml(sentAt.replace(/^ · /, ''))}</small></div><div class="team-member-actions">${member.status !== 'active' ? `<button class="btn btn-light btn-sm" type="button" data-resend-team-member="${escapeHtml(member.id)}"><i data-lucide="send" size="15"></i> Resend</button>` : ''}<button class="btn btn-light btn-sm" type="button" data-copy-team-member="${escapeHtml(member.id)}"><i data-lucide="copy" size="15"></i> Copy link</button><button class="btn btn-ghost btn-sm danger-text" type="button" data-remove-team-member="${escapeHtml(member.id)}">Remove</button></div></article>`;
    }).join('')
    : '<div class="domain-empty"><i data-lucide="users" size="20"></i><span>No team members invited yet. Add the first editor or viewer above.</span></div>';

  const submit = document.querySelector('#team-form button[type="submit"]');
  if (submit) { submit.disabled = occupied >= seatLimit || canceling; submit.title = canceling ? 'Resume Team Access before inviting another member' : submit.disabled ? `All ${seatLimit} seats are used` : ''; }
  area.querySelectorAll('[data-team-role-member]').forEach(select => select.addEventListener('change', () => updateTeamMemberRole(select.dataset.teamRoleMember, select.value, select)));
  area.querySelectorAll('[data-resend-team-member]').forEach(button => button.addEventListener('click', () => resendTeamMember(button.dataset.resendTeamMember, button)));
  area.querySelectorAll('[data-copy-team-member]').forEach(button => button.addEventListener('click', () => copyTeamInviteLink(button.dataset.copyTeamMember, button)));
  area.querySelectorAll('[data-remove-team-member]').forEach(button => button.addEventListener('click', () => removeTeamMember(button.dataset.removeTeamMember)));
  if (window.lucide) lucide.createIcons();
}

async function parseTeamFunctionError(error) {
  let payload = null;
  const response = error?.context;

  if (response && typeof response.clone === 'function') {
    try {
      payload = await response.clone().json();
    } catch (_) {
      try {
        const raw = await response.clone().text();
        payload = raw ? { error: raw } : null;
      } catch (_) {
        payload = null;
      }
    }
  }

  if (payload?.member) {
    const existing = workspaceMembers.find(item => item.id === payload.member.id);
    if (existing) Object.assign(existing, payload.member); else workspaceMembers.push(payload.member);
    renderTeamWorkspace();
  }

  const baseMessage = payload?.error || error?.message || 'Unable to send invitation email.';
  if (/failed to send a request|failed to fetch|networkerror|load failed/i.test(baseMessage)) {
    return 'The team invitation service could not be reached. Deploy the invite-workspace-member Edge Function, then reload this page and try again.';
  }
  return baseMessage;
}

async function callTeamInvite(email, role, trigger = null) {
  const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session) throw new Error('Your session expired. Log in again.');

  setButtonBusy(trigger, true, 'Sending…');
  try {
    const { data, error } = await supabaseClient.functions.invoke('invite-workspace-member', {
      body: { email, role }
    });

    if (error) throw new Error(await parseTeamFunctionError(error));
    if (!data || typeof data !== 'object') throw new Error('The invitation service returned an empty response.');

    if (data.member) {
      const existing = workspaceMembers.find(item => item.id === data.member.id);
      if (existing) Object.assign(existing, data.member); else workspaceMembers.push(data.member);
      renderTeamWorkspace();
    }
    if (data.error) throw new Error(data.error);
    return data;
  } finally {
    setButtonBusy(trigger, false);
  }
}

async function submitTeamMember(event) {
  if (addonIsPlanPreview) { event.preventDefault(); return toast('Plan Simulator is preview-only.'); }
  event.preventDefault();
  const email = document.getElementById('team-email').value.trim().toLowerCase();
  const role = document.getElementById('team-role').value;
  if (!email) return;
  const button = event.currentTarget.querySelector('button[type="submit"]');
  try {
    const data = await callTeamInvite(email, role, button);
    event.currentTarget.reset();
    toast(data.message || 'Invitation email sent.');
  } catch (error) {
    toast(error.message || 'Unable to send the team invitation.');
  }
}

async function resendTeamMember(id, trigger = null) {
  const member = workspaceMembers.find(item => item.id === id);
  if (!member) return;
  try {
    const data = await callTeamInvite(member.invited_email, member.role, trigger);
    toast(data.message || 'Invitation resent.');
  } catch (error) {
    toast(error.message || 'Unable to resend the invitation.');
  }
}

async function copyTeamInviteLink(id, trigger = null) {
  const member = workspaceMembers.find(item => item.id === id);
  if (!member) return;
  const url = teamInviteUrl(member);
  try {
    await navigator.clipboard.writeText(url);
    toast('Backup invite link copied');
  } catch (_) {
    window.prompt('Copy this invite link:', url);
  }
}

async function updateTeamMemberRole(id, role, control = null) {
  if (!['editor', 'viewer'].includes(role)) return;
  const member = workspaceMembers.find(item => item.id === id);
  if (!member || member.role === role) return;
  const previous = member.role;
  if (control) control.disabled = true;
  const { error } = await supabaseClient.from('workspace_members')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_user_id', addonUser.id);
  if (control) control.disabled = false;
  if (error) {
    if (control) control.value = previous;
    return toast(error.message);
  }
  member.role = role;
  toast(`${member.invited_email} is now a ${titleCase(role)}.`);
}

async function refreshTeamAccessRow() {
  const { data, error } = await supabaseClient.from('subscription_addons')
    .select('*')
    .eq('user_id', addonUser.id)
    .eq('addon_key', 'team_member_access')
    .maybeSingle();
  if (error) return null;
  const index = addonRows.findIndex(row => row.addon_key === 'team_member_access');
  if (data && index >= 0) addonRows[index] = data;
  else if (data) addonRows.push(data);
  else if (index >= 0) addonRows.splice(index, 1);
  return data;
}

async function waitForTeamAccess(attempt = 0) {
  const row = await refreshTeamAccessRow();
  renderSubscriptionSummary();
  renderAddons();
  renderTeamWorkspace();
  if (row && activeAddonStatuses.has(row.status)) {
    toast(row.status === 'trialing' ? 'Your 7-day Team Access trial is ready.' : 'Team Access is ready.');
    history.replaceState({}, '', liwUrl('addons.html#team-workspace'));
    return;
  }
  if (attempt < 6) return setTimeout(() => waitForTeamAccess(attempt + 1), 1300 + attempt * 450);
  toast('Stripe is still finalizing Team Access. Refresh this page in a moment.');
}

async function removeTeamMember(id) {
  if (!window.confirm('Remove this person from the workspace?')) return;
  const { error } = await supabaseClient.from('workspace_members').delete().eq('id', id).eq('owner_user_id', addonUser.id);
  if (error) return toast(error.message);
  workspaceMembers = workspaceMembers.filter(item => item.id !== id);
  renderTeamWorkspace();
  toast('Team member removed');
}

function workspaceField(id, fallback = '') {
  return document.getElementById(id)?.value || fallback;
}

function renderWhiteLabelWorkspace() {
  const section = document.getElementById('white-label-workspace');
  if (!section) return;
  const enabled = isAgencyBrandingPlan();
  const full = isFullWhiteLabelPlan();
  section.hidden = !enabled;
  if (!enabled) return;

  document.getElementById('branding-plan-label').textContent = full ? 'Pro Reseller branding' : 'Starter Reseller co-branding';
  document.getElementById('branding-section-title').textContent = full ? 'Run the workspace under your business brand' : 'Add your reseller identity while LIW remains visible';
  document.getElementById('branding-section-copy').textContent = full
    ? 'Use complete dashboard branding, your own support details, and the reseller checkout connected to your Stripe account.'
    : 'Starter Reseller includes a co-branded storefront, Stripe checkout, 25 active client cards, and your business name, logo, primary color, and accent color. Full LIW removal, custom support, favicon, and advanced reseller tools require Pro Reseller.';
  document.getElementById('branding-plan-status').textContent = addonIsPlanPreview
    ? `${full ? 'Pro Reseller' : 'Starter Reseller'} demo`
    : (full ? 'Full Pro Reseller branding' : 'Starter Reseller branding');
  const brandingSaveButton = section.querySelector('#white-label-form button[type="submit"]');
  if (brandingSaveButton) brandingSaveButton.innerHTML = addonIsPlanPreview
    ? '<i data-lucide="save" size="17"></i> Save demo branding'
    : '<i data-lucide="save" size="17"></i> Save branding settings';
  const simulationNote = document.getElementById('reseller-simulation-save-note');
  if (simulationNote) simulationNote.hidden = !addonIsPlanPreview;
  section.querySelectorAll('[data-full-white-label]').forEach(element => { element.hidden = !full; });

  const values = {
    brand_name: workspaceSettings?.brand_name || '', logo_url: workspaceSettings?.logo_url || '',
    primary_color: workspaceSettings?.primary_color || workspaceSettings?.accent_color || '#0b1438',
    secondary_color: workspaceSettings?.secondary_color || '#d4a84f', sidebar_color: workspaceSettings?.sidebar_color || '#07102e',
    dashboard_theme: workspaceSettings?.dashboard_theme || 'light', button_style: workspaceSettings?.button_style || 'rounded',
    favicon_url: workspaceSettings?.favicon_url || '', support_email: workspaceSettings?.support_email || '',
    support_phone: workspaceSettings?.support_phone || '', footer_text: workspaceSettings?.footer_text || ''
  };

  document.getElementById('workspace-brand-name').value = values.brand_name;
  workspaceLogoRemoved = false;
  const logoUrlField = document.getElementById('workspace-logo-url');
  if (logoUrlField) logoUrlField.value = isManagedWorkspaceLogo(values.logo_url) ? '' : values.logo_url;
  renderCurrentWorkspaceLogo(values.logo_url);
  document.getElementById('workspace-primary-color').value = values.primary_color;
  document.getElementById('workspace-secondary-color').value = values.secondary_color;
  document.getElementById('workspace-sidebar-color').value = full ? values.sidebar_color : '#07102e';
  document.getElementById('workspace-theme').value = full ? values.dashboard_theme : 'light';
  document.getElementById('workspace-button-style').value = full ? values.button_style : 'rounded';
  document.getElementById('workspace-favicon-url').value = full ? values.favicon_url : '';
  document.getElementById('workspace-support-email').value = full ? values.support_email : '';
  document.getElementById('workspace-support-phone').value = full ? values.support_phone : '';
  document.getElementById('workspace-footer-text').value = full ? values.footer_text : '';
  document.getElementById('hide-liw-dashboard-branding').checked = full && Boolean(workspaceSettings?.hide_liw_dashboard_branding);
  updateWorkspaceBrandPreview();
}
function buttonRadiusForStyle(style) {
  return ({ rounded: '13px', soft: '8px', square: '0px', pill: '999px' })[style] || '13px';
}

function updateWorkspaceBrandPreview() {
  const preview = document.getElementById('workspace-brand-preview');
  if (!preview) return;
  const brandName = workspaceField('workspace-brand-name', 'Your Company').trim() || 'Your Company';
  const enteredLogoUrl = workspaceField('workspace-logo-url').trim();
  const savedLogoUrl = workspaceLogoRemoved ? '' : (workspaceSettings?.logo_url || '');
  const logoUrl = enteredLogoUrl || savedLogoUrl;
  const primary = workspaceField('workspace-primary-color', '#0b1438');
  const secondary = workspaceField('workspace-secondary-color', '#d4a84f');
  const sidebar = workspaceField('workspace-sidebar-color', '#07102e');
  const theme = workspaceField('workspace-theme', 'light');
  const buttonStyle = workspaceField('workspace-button-style', 'rounded');
  const logoFile = document.getElementById('workspace-logo-file')?.files?.[0];

  preview.style.setProperty('--preview-primary', primary);
  preview.style.setProperty('--preview-secondary', secondary);
  preview.style.setProperty('--preview-sidebar', sidebar);
  preview.style.setProperty('--preview-button-radius', buttonRadiusForStyle(buttonStyle));
  preview.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.getElementById('workspace-preview-name').textContent = `${brandName} workspace`;

  const logo = document.getElementById('workspace-preview-logo');
  const renderLogo = url => {
    logo.innerHTML = url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(brandName)}">` : escapeHtml(brandName);
  };
  if (logoFile) {
    const reader = new FileReader();
    reader.onload = () => renderLogo(String(reader.result || ''));
    reader.readAsDataURL(logoFile);
  } else {
    renderLogo(logoUrl);
  }
}

function isManagedWorkspaceLogo(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.supabase.co') && parsed.pathname.includes('/storage/v1/object/public/');
  } catch (_) {
    return false;
  }
}

function renderCurrentWorkspaceLogo(url) {
  const block = document.getElementById('workspace-current-logo');
  const image = document.getElementById('workspace-current-logo-image');
  if (!block || !image) return;
  const visibleUrl = workspaceLogoRemoved ? '' : (url || '');
  block.hidden = !visibleUrl;
  if (visibleUrl) image.src = visibleUrl;
  else image.removeAttribute('src');
}

function removeWorkspaceLogo() {
  workspaceLogoRemoved = true;
  const logoFile = document.getElementById('workspace-logo-file');
  const logoUrl = document.getElementById('workspace-logo-url');
  if (logoFile) logoFile.value = '';
  if (logoUrl) logoUrl.value = '';
  renderCurrentWorkspaceLogo('');
  updateWorkspaceBrandPreview();
  toast('Logo will be removed when you save branding settings.');
}

function resetWorkspaceBrandingPreview() {
  document.getElementById('workspace-brand-name').value = '';
  workspaceLogoRemoved = true;
  document.getElementById('workspace-logo-url').value = '';
  renderCurrentWorkspaceLogo('');
  document.getElementById('workspace-primary-color').value = '#0b1438';
  document.getElementById('workspace-secondary-color').value = '#d4a84f';
  document.getElementById('workspace-sidebar-color').value = '#07102e';
  document.getElementById('workspace-theme').value = 'light';
  document.getElementById('workspace-button-style').value = 'rounded';
  document.getElementById('workspace-favicon-url').value = '';
  document.getElementById('workspace-support-email').value = '';
  document.getElementById('workspace-support-phone').value = '';
  document.getElementById('workspace-footer-text').value = '';
  document.getElementById('hide-liw-dashboard-branding').checked = false;
  const logoFile = document.getElementById('workspace-logo-file');
  const faviconFile = document.getElementById('workspace-favicon-file');
  if (logoFile) logoFile.value = '';
  if (faviconFile) faviconFile.value = '';
  updateWorkspaceBrandPreview();
  toast('Preview reset. Save to apply these defaults.');
}

async function uploadWorkspaceAsset(file, kind) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB.');
  const extension = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${addonUser.id}/workspace-${kind}-${Date.now()}.${extension}`;
  const { error } = await supabaseClient.storage.from('profile-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
  return data.publicUrl;
}

async function saveWorkspaceBranding(event) {
  event.preventDefault();
  if (addonIsPlanPreview && !addonIsAdmin) return toast('Plan Simulator is preview-only.');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  setButtonBusy(button, true, 'Saving…');
  try {
    const logoUpload = document.getElementById('workspace-logo-file')?.files?.[0] || null;
    const faviconUpload = document.getElementById('workspace-favicon-file')?.files?.[0] || null;
    const uploadedLogo = await uploadWorkspaceAsset(logoUpload, 'logo');
    const uploadedFavicon = await uploadWorkspaceAsset(faviconUpload, 'favicon');
    const primary = workspaceField('workspace-primary-color', '#0b1438');
    const full = isFullWhiteLabelPlan();
    const payload = {
      user_id: addonUser.id,
      brand_name: workspaceField('workspace-brand-name').trim() || null,
      logo_url: uploadedLogo || workspaceField('workspace-logo-url').trim() || (workspaceLogoRemoved ? null : (workspaceSettings?.logo_url || null)),
      accent_color: primary,
      primary_color: primary,
      secondary_color: workspaceField('workspace-secondary-color', '#d4a84f'),
      sidebar_color: full ? workspaceField('workspace-sidebar-color', '#07102e') : '#07102e',
      dashboard_theme: full ? workspaceField('workspace-theme', 'light') : 'light',
      button_style: full ? workspaceField('workspace-button-style', 'rounded') : 'rounded',
      favicon_url: full ? (uploadedFavicon || workspaceField('workspace-favicon-url').trim() || null) : null,
      support_email: full ? (workspaceField('workspace-support-email').trim() || null) : null,
      support_phone: full ? (workspaceField('workspace-support-phone').trim() || null) : null,
      footer_text: full ? (workspaceField('workspace-footer-text').trim() || null) : null,
      hide_liw_dashboard_branding: full && document.getElementById('hide-liw-dashboard-branding').checked
    };
    const { data, error } = await supabaseClient.from('workspace_settings').upsert(payload, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    workspaceSettings = data;
    clearLiwAccessContextCache();
    const savedLabel = isFullWhiteLabelPlan() ? 'Pro Reseller branding saved' : 'Starter Reseller co-branding saved';
    toast(addonIsPlanPreview ? `${savedLabel} to your LIW Admin demo workspace` : savedLabel);
    setTimeout(() => location.reload(), 650);
  } catch (error) {
    toast(error.message || 'Unable to save white-label settings.');
  } finally {
    setButtonBusy(button, false);
  }
}


function resellerSalesUrl({ adminPreview = false } = {}) {
  const slug = String(document.getElementById('reseller-store-slug')?.value || resellerProfile?.store_slug || '').trim();
  const params = new URLSearchParams({ store: slug });
  if (adminPreview && addonIsAdmin) {
    params.set('preview', 'admin');
    params.set('admin_preview_version', '1065');
  }
  return liwUrl(`reseller.html?${params.toString()}`);
}

function updateResellerSalesLinks() {
  const preview = document.getElementById('preview-reseller-sales-link');
  if (preview) {
    preview.href = resellerSalesUrl({ adminPreview: addonIsAdmin });
    preview.innerHTML = addonIsAdmin
      ? '<i data-lucide="external-link" size="17"></i> Preview as admin'
      : '<i data-lucide="external-link" size="17"></i> Preview page';
  }
}

function buildResellerSalesPayload() {
  const price = Number(document.getElementById('reseller-card-price').value);
  if (!Number.isFinite(price) || price < 5 || price > 5000) throw new Error('Choose a price between $5 and $5,000.');
  const storeSlug = slugify(document.getElementById('reseller-store-slug').value);
  if (!storeSlug) throw new Error('Enter a valid sales-page address.');
  return {
    user_id: addonUser.id,
    store_slug: storeSlug,
    offer_name: document.getElementById('reseller-offer-name').value.trim() || 'Professional Digital Business Card',
    offer_description: document.getElementById('reseller-offer-description').value.trim() || 'A professionally designed digital business card.',
    price_cents: Math.round(price * 100),
    currency: 'usd',
    sales_enabled: document.getElementById('reseller-sales-enabled').checked && Boolean(resellerProfile?.stripe_charges_enabled)
  };
}

async function previewResellerSalesPage(event) {
  event.preventDefault();
  if (!addonIsAdmin) {
    window.open(resellerSalesUrl(), '_blank', 'noopener');
    return;
  }

  // Open immediately so the browser does not block the tab while the draft saves.
  const previewWindow = window.open('about:blank', '_blank');
  try {
    const payload = buildResellerSalesPayload();
    const { data, error } = await supabaseClient.from('reseller_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw error;
    resellerProfile = data;
    renderResellerSales();
    const previewUrl = resellerSalesUrl({ adminPreview: true });
    if (previewWindow) previewWindow.location.replace(previewUrl);
    else location.href = previewUrl;
  } catch (error) {
    if (previewWindow) previewWindow.close();
    toast(error.message || 'Unable to open the admin storefront preview.');
  }
}

function renderResellerSales() {
  const panel = document.getElementById('reseller-sales-panel');
  if (!panel) return;
  const resellerSalesActive = isResellerSalesPlan();
  panel.hidden = !resellerSalesActive;
  if (!resellerSalesActive) return;

  const connected = Boolean(resellerProfile?.stripe_account_id);
  const ready = connected && resellerProfile?.stripe_charges_enabled === true;
  const status = document.getElementById('reseller-stripe-status');
  status.textContent = ready ? 'Ready for sales' : connected ? 'Verification needed' : 'Not connected';
  status.className = `status-pill ${ready ? 'active' : connected ? 'past_due' : 'draft'}`;
  document.getElementById('reseller-stripe-title').textContent = ready
    ? 'Your Stripe account is connected'
    : connected
      ? 'Stripe connected — finish verification'
      : addonIsAdmin
        ? 'Admin storefront preview is available'
        : 'Connect your own Stripe account';
  document.getElementById('reseller-stripe-copy').textContent = ready
    ? 'Customer payments go to your Stripe account. LIW automatically receives 5% from storefront checkout sales.'
    : connected
      ? 'Open Stripe and complete any remaining business, identity, bank, or payout requirements.'
      : addonIsAdmin
        ? 'You can save and preview the storefront without Stripe. Connect only when you want this page to accept live customer payments.'
        : 'Use Stripe-hosted connection to link an existing or new Stripe business account.';
  document.getElementById('reseller-stripe-account').textContent = connected
    ? `${resellerProfile.stripe_business_name || resellerProfile.stripe_account_email || 'Stripe account'} · ${resellerProfile.stripe_account_id}`
    : '';
  const connectButton = document.getElementById('connect-reseller-stripe');
  connectButton.hidden = connected;
  connectButton.innerHTML = addonIsAdmin
    ? '<i data-lucide="plug-zap" size="17"></i> Connect for live checkout'
    : '<i data-lucide="plug-zap" size="17"></i> Connect Stripe';
  document.getElementById('refresh-reseller-stripe').hidden = !connected;
  document.getElementById('disconnect-reseller-stripe').hidden = !connected;

  const suggestedSlug = slugify(workspaceSettings?.brand_name || resellerProfile?.stripe_business_name || addonUser?.email?.split('@')[0] || 'my-card-studio');
  document.getElementById('reseller-store-slug').value = resellerProfile?.store_slug || suggestedSlug;
  document.getElementById('reseller-card-price').value = ((Number(resellerProfile?.price_cents || 5000)) / 100).toFixed(2);
  document.getElementById('reseller-offer-name').value = resellerProfile?.offer_name || 'Professional Digital Business Card';
  document.getElementById('reseller-offer-description').value = resellerProfile?.offer_description || 'A professionally designed digital business card customized for your brand.';
  document.getElementById('reseller-sales-enabled').checked = Boolean(resellerProfile?.sales_enabled);
  document.getElementById('reseller-sales-enabled').disabled = !ready;
  const resellerSaveButton = document.querySelector('#reseller-sales-form button[type="submit"]');
  if (resellerSaveButton) resellerSaveButton.innerHTML = addonIsPlanPreview
    ? '<i data-lucide="save" size="17"></i> Save demo storefront'
    : '<i data-lucide="save" size="17"></i> Save sales settings';
  updateResellerSalesLinks();
  renderResellerOrders();
}

function renderResellerOrders() {
  const area = document.getElementById('reseller-order-list');
  if (!area) return;
  if (!resellerOrders.length) {
    area.innerHTML = '<div class="domain-empty"><i data-lucide="receipt-text" size="20"></i><span>No reseller checkout orders yet.</span></div>';
  } else {
    area.innerHTML = resellerOrders.map(order => `<article class="domain-request-row reseller-order-row"><div><strong>${escapeHtml(order.buyer_name || order.buyer_email || 'Customer')}</strong><span>${escapeHtml(order.offer_name || 'Digital card')} · ${formatMoney(order.amount_total)} · LIW fee ${formatMoney(order.application_fee_amount)}</span><small>${new Date(order.created_at).toLocaleString()}${order.buyer_phone ? ` · ${escapeHtml(order.buyer_phone)}` : ''}${order.buyer_email ? ` · ${escapeHtml(order.buyer_email)}` : ''}</small>${order.buyer_notes ? `<small class="reseller-order-notes">${escapeHtml(order.buyer_notes)}</small>` : ''}</div><div class="reseller-order-actions"><span class="status-pill ${order.payment_status === 'paid' ? 'active' : order.payment_status === 'disputed' ? 'past_due' : 'draft'}">${escapeHtml(titleCase(order.payment_status))}</span>${order.payment_status === 'paid' ? `<button class="btn btn-ghost btn-sm" type="button" data-refund-reseller-order="${order.id}"><i data-lucide="undo-2" size="15"></i> Full refund</button>` : ''}</div></article>`).join('');
  }
  if (window.lucide) lucide.createIcons();
}

async function handleResellerOrderAction(event) {
  const button = event.target.closest('[data-refund-reseller-order]');
  if (!button) return;
  const orderId = button.dataset.refundResellerOrder;
  const order = resellerOrders.find(item => item.id === orderId);
  if (!order) return toast('Order not found.');
  const buyer = order.buyer_name || order.buyer_email || 'this customer';
  if (!window.confirm(`Refund ${formatMoney(order.amount_total)} to ${buyer}? This also refunds LIW's 5% application fee and cannot be undone.`)) return;
  try {
    const data = await callResellerFunction('refund-reseller-order', { orderId }, button, 'Refunding…');
    order.payment_status = 'refunded';
    renderResellerOrders();
    toast(data.message || 'Refund submitted.');
  } catch (error) { toast(error.message || 'Unable to refund order.'); }
}

async function callResellerFunction(name, payload = {}, trigger = null, busyLabel = 'Working…') {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) throw new Error('Your session expired. Log in again.');
  setButtonBusy(trigger, true, busyLabel);
  try {
    const response = await fetch(`${LIW_CONFIG.supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify(payload)
    });
    const raw = await response.text(); let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  } finally { setButtonBusy(trigger, false); }
}

async function connectResellerStripe(event) {
  if (addonIsPlanPreview) return toast('Exit Plan Simulator before connecting Stripe.');
  const button = event.currentTarget;
  try {
    const data = await callResellerFunction('create-stripe-connect-link', {}, button, 'Opening Stripe…');
    if (!data.url) throw new Error('Stripe did not return a connection link.');
    location.href = data.url;
  } catch (error) { toast(error.message || 'Unable to connect Stripe.'); }
}

async function refreshResellerStripe(event) {
  try {
    const data = await callResellerFunction('refresh-stripe-connect', {}, event.currentTarget, 'Checking…');
    if (data.connected) resellerProfile = { ...(resellerProfile || {}), stripe_account_id: data.accountId, ...data };
    renderResellerSales();
    toast(data.stripe_charges_enabled ? 'Stripe is ready for sales.' : 'Stripe status refreshed. Verification may still be required.');
  } catch (error) { toast(error.message || 'Unable to refresh Stripe.'); }
}

async function disconnectResellerStripe(event) {
  if (addonIsPlanPreview) return toast('Exit Plan Simulator before changing Stripe.');
  if (!window.confirm('Disconnect Stripe and pause your reseller sales page?')) return;
  try {
    const data = await callResellerFunction('disconnect-stripe-connect', {}, event.currentTarget, 'Disconnecting…');
    resellerProfile = resellerProfile ? { ...resellerProfile, sales_enabled: false, stripe_account_id: null, stripe_charges_enabled: false, stripe_payouts_enabled: false } : null;
    renderResellerSales(); toast(data.message || 'Stripe disconnected.');
  } catch (error) { toast(error.message || 'Unable to disconnect Stripe.'); }
}

async function saveResellerSales(event) {
  event.preventDefault();
  if (addonIsPlanPreview && !addonIsAdmin) return toast('Plan Simulator is preview-only.');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  setButtonBusy(button, true, 'Saving…');
  try {
    const payload = buildResellerSalesPayload();
    const { data, error } = await supabaseClient.from('reseller_profiles').upsert(payload, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    resellerProfile = data;
    renderResellerSales();
    toast(addonIsPlanPreview ? 'Reseller storefront demo saved to your LIW Admin workspace.' : 'Reseller sales settings saved.');
  } catch (error) { toast(error.message || 'Unable to save reseller settings.'); }
  finally { setButtonBusy(button, false); }
}

async function copyResellerSalesLink() {
  const url = resellerSalesUrl();
  try { await navigator.clipboard.writeText(url); toast('Reseller sales link copied.'); }
  catch (_) { window.prompt('Copy this reseller sales link:', url); }
}

function addonRow(key) {
  return addonRows.find(row => row.addon_key === key) || null;
}

function isIncluded(definition) {
  return (addonIsAdmin && !addonIsPlanPreview) || Boolean(definition?.included_plans?.includes(addonPlan?.plan_key));
}

function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/^\.+|\.+$/g, '');
}

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 ? 2 : 0 }).format(Number(cents || 0) / 100);
}

function titleCase(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function slugify(text) { return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
