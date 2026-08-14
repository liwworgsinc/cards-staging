let pendingDeleteCard = null;
let dashboardUserId = null;
let hiddenSharedCardIds = new Set();
let activeWorkspaceRoles = new Map();

function hiddenSharedStorageKey(userId) {
  return `liw-hidden-shared-cards:${userId}`;
}

function readLocalHiddenSharedCards(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(hiddenSharedStorageKey(userId)) || '[]');
    return new Set(Array.isArray(value) ? value.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function writeLocalHiddenSharedCards(userId, ids) {
  try {
    localStorage.setItem(hiddenSharedStorageKey(userId), JSON.stringify([...ids]));
  } catch {
    // Local storage is only a fallback when the database hide table is unavailable.
  }
}

(async function initDashboard() {
  const user = await requireUser();
  if (!user) return;

  dashboardUserId = user.id;
  const [profileResult, subResult, viewsResult, savesResult, addonsResult, definitionsResult, leadsResult, hiddenSharedResult, membershipsResult] = await Promise.all([
    supabaseClient.from('profiles').select('full_name,role').eq('id', user.id).maybeSingle(),
    supabaseClient.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabaseClient.from('card_views').select('id', { count: 'exact', head: true }),
    supabaseClient.from('card_events').select('id', { count: 'exact', head: true }).eq('event_type', 'contact_save'),
    supabaseClient.from('subscription_addons').select('*').eq('user_id', user.id),
    supabaseClient.from('addon_definitions').select('addon_key,name,included_plans,icon,is_sellable').eq('is_active', true).order('sort_order'),
    supabaseClient.from('leads').select('id', { count: 'exact', head: true }).eq('owner_user_id', user.id).eq('status', 'new'),
    supabaseClient.from('hidden_shared_cards').select('card_id').eq('user_id', user.id),
    supabaseClient.from('workspace_members').select('owner_user_id,role,status').eq('member_user_id', user.id).eq('status', 'active')
  ]);

  const profile = profileResult.data;
  const subscription = subResult.data;
  const databaseHidden = new Set((hiddenSharedResult.data || []).map(row => row.card_id));
  const localHidden = readLocalHiddenSharedCards(user.id);
  hiddenSharedCardIds = new Set([...databaseHidden, ...localHidden]);

  const memberships = membershipsResult.data || [];
  activeWorkspaceRoles = new Map(memberships.map(row => [row.owner_user_id, row.role || 'viewer']));
  const sharedOwnerIds = [...activeWorkspaceRoles.keys()].filter(ownerId => ownerId && ownerId !== user.id);

  const ownedCardsPromise = supabaseClient.from('digital_cards').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
  const sharedCardsPromise = sharedOwnerIds.length
    ? supabaseClient.from('digital_cards').select('*').in('user_id', sharedOwnerIds).order('updated_at', { ascending: false })
    : Promise.resolve({ data: [], error: null });
  const [ownedCardsResult, sharedCardsResult] = await Promise.all([ownedCardsPromise, sharedCardsPromise]);

  if (ownedCardsResult.error) toast(ownedCardsResult.error.message);
  if (sharedCardsResult.error) toast(sharedCardsResult.error.message);
  if (membershipsResult.error) toast(membershipsResult.error.message);

  const ownedCards = ownedCardsResult.data || [];
  const sharedCards = (sharedCardsResult.data || [])
    .filter(card => activeWorkspaceRoles.has(card.user_id) && !hiddenSharedCardIds.has(card.id))
    .map(card => ({
      ...card,
      _team_role: activeWorkspaceRoles.get(card.user_id) || 'viewer',
      _can_edit: activeWorkspaceRoles.get(card.user_id) === 'editor'
    }));
  const cards = [...ownedCards, ...sharedCards].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  const addons = addonsResult.data || [];
  const definitions = definitionsResult.data || [];

  const access = await getLiwAccessContext(user, { refresh: true });
  const isAdmin = access.isAdmin;
  const isPlanPreview = access.isPlanPreview;
  const planKey = access.planKey;
  const { data: planDefinition } = await supabaseClient.from('plan_definitions')
    .select('name,card_limit')
    .eq('plan_key', planKey)
    .maybeSingle();

  const active = isPlanPreview || isAdmin || ['active', 'trialing'].includes(subscription?.status);
  const paymentPastDue = !isPlanPreview && !isAdmin && subscription?.status === 'past_due';
  const paidPlan = !isPlanPreview && active && Boolean(subscription?.stripe_subscription_id);
  const name = profile?.full_name || user.user_metadata?.full_name || '';
  const firstName = name.trim().split(' ')[0] || 'there';
  const sellableKeys = new Set(definitions.filter(definition => definition.is_sellable).map(definition => definition.addon_key));
  const paidAddons = (isPlanPreview ? [] : addons).filter(row => sellableKeys.has(row.addon_key) && ['active', 'trialing'].includes(row.status));
  const extraCards = paidAddons.find(row => row.addon_key === 'extra_card')?.quantity || 0;
  const baseLimit = planDefinition?.card_limit || 1;
  const limit = isPlanPreview ? access.cardLimit : isAdmin ? 100 : baseLimit + Number(extraCards || 0);
  const cardCount = ownedCards.length;
  const published = ownedCards.some(card => card.status === 'published');
  const newLeadCount = leadsResult.count || 0;

  document.getElementById('welcome').textContent = `Welcome back, ${firstName}`;
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('user-chip').textContent = firstName.slice(0, 1).toUpperCase();
  document.getElementById('plan').textContent = isPlanPreview ? `${planDefinition?.name || access.planName} Preview` : isAdmin ? 'LIW Admin' : (planDefinition?.name || 'Starter');
  document.getElementById('plan-status').textContent = isPlanPreview
    ? 'Admin simulation'
    : isAdmin
    ? 'Owner workspace'
    : paymentPastDue
      ? 'Payment needs attention · paid features paused'
      : active
      ? planKey === 'starter' ? 'Free plan active' : subscription.status === 'trialing' ? 'Trial active' : 'Paid plan active'
      : 'Plan inactive';
  document.getElementById('renewal-date').textContent = isPlanPreview
    ? 'Preview only · subscription unchanged'
    : isAdmin
    ? '100 cards included · no billing'
    : paymentPastDue
      ? 'Payment failed · paid features are paused'
      : planKey === 'starter' && active
      ? 'Free forever · no renewal'
      : active && subscription.current_period_end
        ? `${subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} ${new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : 'No active renewal';
  document.getElementById('sidebar-plan').textContent = isPlanPreview
    ? `${planDefinition?.name || access.planName} preview`
    : isAdmin
    ? 'LIW Admin workspace'
    : active ? `${planDefinition?.name || 'Starter'} plan` : 'Starter preview';
  document.getElementById('sidebar-plan-copy').textContent = isPlanPreview
    ? `${access.cardLimit} card${access.cardLimit === 1 ? '' : 's'} · customer-facing feature rules active.`
    : isAdmin
    ? '100 cards included · all software features unlocked.'
    : active
      ? paidPlan
        ? `${subscription.billing_interval === 'year' ? 'Yearly' : 'Monthly'} billing · plan features included.`
        : 'Free forever · 1 published card.'
      : 'Activate Free Starter to publish.';

  document.getElementById('card-count').textContent = String(cardCount);
  document.getElementById('card-usage').textContent = `${Math.max(limit - cardCount, 0)} remaining`;
  document.getElementById('views').textContent = String(viewsResult.count || 0);
  document.getElementById('saves').textContent = String(savesResult.count || 0);
  document.getElementById('new-leads').textContent = String(newLeadCount);
  document.getElementById('addon-count').textContent = isPlanPreview ? 'Plan' : isAdmin ? 'All' : String(paidAddons.length);
  document.getElementById('usage-count').textContent = String(cardCount);
  document.getElementById('usage-limit').textContent = String(limit);
  document.getElementById('usage-progress').style.width = `${Math.min(100, cardCount / Math.max(1, limit) * 100)}%`;

  const navLead = document.getElementById('nav-lead-count');
  if (newLeadCount) {
    navLead.hidden = false;
    navLead.textContent = newLeadCount > 99 ? '99+' : String(newLeadCount);
  }

  const complete = [true, cardCount > 0, active, published];
  ['step-account', 'step-card', 'step-plan', 'step-published'].forEach((id, index) => {
    if (complete[index]) {
      const element = document.getElementById(id);
      element.classList.add('done');
      element.querySelector('.check-dot').innerHTML = '<i data-lucide="check" size="14"></i>';
    }
  });
  const percent = Math.round(complete.filter(Boolean).length / complete.length * 100);
  document.getElementById('onboarding-percent').textContent = `${percent}%`;
  document.getElementById('onboarding-progress').style.width = `${percent}%`;
  document.getElementById('upgrade-banner').hidden = (!isPlanPreview && isAdmin) || (active && planKey !== 'starter');

  const includedDefinitions = (isAdmin && !isPlanPreview) ? definitions : definitions.filter(def => def.included_plans?.includes(planKey));
  const activeDefinitions = paidAddons.map(row => definitions.find(def => def.addon_key === row.addon_key)).filter(Boolean);
  const uniqueFeatures = [...includedDefinitions, ...activeDefinitions].filter((feature, index, list) => list.findIndex(item => item.addon_key === feature.addon_key) === index);
  const addonChipArea = document.getElementById('dashboard-addon-chips');
  addonChipArea.innerHTML = uniqueFeatures.length
    ? uniqueFeatures.slice(0, 4).map(feature => `<span><i data-lucide="${escapeHtml(feature.icon || 'sparkles')}" size="14"></i>${escapeHtml(feature.name)}</span>`).join('')
    : '<p class="muted" style="font-size:.86rem;margin:0">No add-ons active yet.</p>';

  if (isAdmin && !isPlanPreview) {
    document.getElementById('welcome-headline').textContent = 'LIW Admin workspace is ready.';
    document.getElementById('welcome-copy').textContent = 'Create up to 100 LIW cards with every software feature unlocked and no subscription charges.';
  } else if (isPlanPreview) {
    document.getElementById('welcome-headline').textContent = `Previewing the ${planDefinition?.name || access.planName} customer journey.`;
    document.getElementById('welcome-copy').textContent = 'Feature locks, limits, upgrade prompts, and reseller tools now follow this plan. Your real admin subscription and billing are untouched.';
  } else if (active && !published) {
    document.getElementById('welcome-headline').textContent = 'Your plan is active—publish your first card.';
    document.getElementById('welcome-copy').textContent = 'Finish the details, preview the customer experience, and publish when everything looks right.';
  } else if (published) {
    document.getElementById('welcome-headline').textContent = 'Your digital presence is live.';
    document.getElementById('welcome-copy').textContent = 'Keep your cards fresh, follow engagement, and use add-ons to turn more visitors into customers.';
  }

  const pageParams = new URLSearchParams(location.search);
  if (pageParams.get('team') === 'connected') toast('Team invitation accepted. The shared workspace is now available.');
  else if (pageParams.get('purchase') === 'success') toast('Order received. LIW WORGS INC will follow up with the next steps.');
  else if (pageParams.get('billing') === 'free') toast('Free Starter is active. You can publish one card now.');
  else if (pageParams.get('billing') === 'success') toast('Payment received. Your plan is being activated.');

  const adminNav = document.getElementById('admin-nav-link');
  if (adminNav) adminNav.hidden = !isAdmin;
  const billingButton = document.getElementById('manage-billing-button');
  if (billingButton) billingButton.hidden = isAdmin;
  const plansLink = document.getElementById('plans-billing-link');
  if (plansLink) { plansLink.hidden = false; plansLink.removeAttribute('hidden'); }

  setupDeleteCardDialog();
  setupSharedCardControls();
  renderCards(cards, user.id);
  updateRestoreSharedButton();
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => document.getElementById('sidebar')?.classList.toggle('open'));
  if (window.lucide) lucide.createIcons();
})();

function renderCards(cards, currentUserId) {
  const list = document.getElementById('card-list');
  if (!cards.length) {
    list.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon"><i data-lucide="badge-plus" size="28"></i></span><h3>Create your first digital card</h3><p class="muted">Add your details, choose a style, connect social media, and preview the exact customer experience.</p><a class="btn btn-primary" href="editor.html">Start building</a></div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  list.innerHTML = cards.map(card => {
    const publicUrl = liwUrl(`card.html?slug=${encodeURIComponent(card.slug)}`);
    const initials = (card.full_name || 'DC').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
    const avatar = card.profile_image_url ? `<img src="${escapeHtml(card.profile_image_url)}" alt="">` : escapeHtml(initials);
    const cardName = card.internal_label || card.company_name || card.full_name || 'Untitled card';
    const thumbBackground = card.cover_image_url
      ? `linear-gradient(rgba(0,0,0,.24),rgba(0,0,0,.24)),url('${escapeHtml(card.cover_image_url)}') center/cover no-repeat`
      : escapeHtml(card.gradient_background || `linear-gradient(135deg,${card.primary_color || '#5b5cf0'},${card.secondary_color || '#9b5de5'})`);
    const organizationMeta = [card.client_name ? `Client: ${card.client_name}` : '', card.campaign_tag ? `Campaign: ${card.campaign_tag}` : ''].filter(Boolean).join(' · ');
    const miniActions = [
      card.phone ? 'phone' : '',
      card.email ? 'mail' : '',
      card.website ? 'globe' : '',
      card.business_address ? 'map-pin' : ''
    ].filter(Boolean).slice(0, 4);
    const avatarRadius = card.profile_image_shape === 'square' ? '8px' : card.profile_image_shape === 'rounded' ? '18px' : '50%';
    return `<article class="card card-item" data-card-id="${escapeHtml(card.id)}">
      <div class="card-thumb dashboard-card-preview" style="--dashboard-mini-bg:${escapeHtml(card.background_color || '#ffffff')};--dashboard-mini-text:${escapeHtml(card.text_color || '#111827')};--dashboard-mini-accent:${escapeHtml(card.button_color || card.primary_color || '#5b5cf0')}">
        <div class="dashboard-card-preview-cover" style="background:${thumbBackground}">
          <span class="card-initials" style="border-radius:${avatarRadius}">${avatar}</span>
        </div>
        <div class="dashboard-card-preview-body"><strong>${escapeHtml(card.full_name || 'Untitled card')}</strong><small>${escapeHtml(card.job_title || card.company_name || 'Digital business card')}</small><div class="dashboard-card-preview-actions">${(miniActions.length ? miniActions : ['phone','mail','globe']).map(icon => `<span><i data-lucide="${icon}" size="12"></i></span>`).join('')}</div></div>
      </div>
      <div class="card-meta">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h3>${escapeHtml(cardName)}</h3><p class="muted" style="font-size:.86rem;margin-bottom:0">${escapeHtml(organizationMeta || card.job_title || 'Add a job title')}</p></div><span class="status-pill ${card.status}">${card.status}</span></div>
        <div class="card-actions">
          ${card.user_id === currentUserId || card._can_edit
            ? `<a class="btn btn-light btn-sm" href="editor.html?id=${encodeURIComponent(card.id)}"><i data-lucide="pencil" size="15"></i> Edit</a>`
            : ''}
          <a class="btn btn-light btn-sm" href="${publicUrl}" target="_blank" rel="noopener"><i data-lucide="eye" size="15"></i> ${card.status === 'published' ? 'View' : 'Preview'}</a>
          <button class="btn btn-light btn-sm" data-copy="${publicUrl}" aria-label="Copy card link"><i data-lucide="copy" size="15"></i></button>
          ${card.user_id === currentUserId
            ? `<button class="btn btn-light btn-sm card-delete-button" type="button" data-delete-card="${escapeHtml(card.id)}" data-delete-name="${escapeHtml(cardName)}" aria-label="Delete ${escapeHtml(cardName)}"><i data-lucide="trash-2" size="15"></i> Delete</button>`
            : `<span class="status-pill active">Shared · ${card._team_role === 'editor' ? 'Editor' : 'Viewer'}</span><button class="btn btn-light btn-sm" type="button" data-remove-shared-card="${escapeHtml(card.id)}" data-remove-shared-name="${escapeHtml(cardName)}" aria-label="Remove ${escapeHtml(cardName)} from my dashboard"><i data-lucide="eye-off" size="15"></i> Remove</button>`}
        </div>
      </div>
    </article>`;
  }).join('');

  list.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      toast('Card link copied');
    } catch {
      toast('Could not copy the card link');
    }
  }));

  list.querySelectorAll('[data-delete-card]').forEach(button => {
    button.addEventListener('click', () => openDeleteCardDialog(button.dataset.deleteCard, button.dataset.deleteName));
  });

  list.querySelectorAll('[data-remove-shared-card]').forEach(button => {
    button.addEventListener('click', () => removeSharedCardFromDashboard(
      button.dataset.removeSharedCard,
      button.dataset.removeSharedName
    ));
  });

  if (window.lucide) lucide.createIcons();
}

function setupSharedCardControls() {
  const restoreButton = document.getElementById('restore-shared-cards');
  if (!restoreButton || restoreButton.dataset.ready === 'true') return;
  restoreButton.dataset.ready = 'true';
  restoreButton.addEventListener('click', restoreHiddenSharedCards);
}

function updateRestoreSharedButton() {
  const restoreButton = document.getElementById('restore-shared-cards');
  const count = document.getElementById('hidden-shared-count');
  if (!restoreButton) return;
  restoreButton.hidden = hiddenSharedCardIds.size === 0;
  if (count) count.textContent = String(hiddenSharedCardIds.size);
}

async function removeSharedCardFromDashboard(cardId, cardName = 'Shared card') {
  if (!cardId || !dashboardUserId) return;
  const confirmed = window.confirm(`Remove “${cardName}” from your dashboard?\n\nThis only hides the shared card for you. The owner’s original card will not be deleted.`);
  if (!confirmed) return;

  const { error } = await supabaseClient.from('hidden_shared_cards').upsert({
    user_id: dashboardUserId,
    card_id: cardId
  }, { onConflict: 'user_id,card_id' });

  hiddenSharedCardIds.add(cardId);
  writeLocalHiddenSharedCards(dashboardUserId, hiddenSharedCardIds);
  document.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`)?.remove();
  updateRestoreSharedButton();
  toast(error
    ? `${cardName} was removed on this device. The owner’s original card was not deleted.`
    : `${cardName} was removed from your dashboard. The owner’s original card was not deleted.`);

  if (!document.querySelector('#card-list [data-card-id]')) {
    document.getElementById('card-list').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon"><i data-lucide="eye-off" size="28"></i></span><h3>No visible cards</h3><p class="muted">Your shared cards are hidden. Use Restore shared above to show them again.</p><a class="btn btn-primary" href="editor.html">Create your own card</a></div>`;
    if (window.lucide) lucide.createIcons();
  }
}

async function restoreHiddenSharedCards() {
  if (!dashboardUserId || hiddenSharedCardIds.size === 0) return;
  const restoreButton = document.getElementById('restore-shared-cards');
  setButtonBusy(restoreButton, true, 'Restoring…');
  try {
    const { error } = await supabaseClient.from('hidden_shared_cards').delete().eq('user_id', dashboardUserId);
    hiddenSharedCardIds.clear();
    writeLocalHiddenSharedCards(dashboardUserId, hiddenSharedCardIds);
    toast(error ? 'Shared cards restored on this device.' : 'Shared cards restored');
    setTimeout(() => location.reload(), 350);
  } catch (error) {
    hiddenSharedCardIds.clear();
    writeLocalHiddenSharedCards(dashboardUserId, hiddenSharedCardIds);
    toast('Shared cards restored on this device.');
    setTimeout(() => location.reload(), 350);
  } finally {
    setButtonBusy(restoreButton, false);
  }
}

function setupDeleteCardDialog() {
  const dialog = document.getElementById('delete-card-dialog');
  const input = document.getElementById('delete-confirm-input');
  const cancelButton = document.getElementById('cancel-delete-card');
  const confirmButton = document.getElementById('confirm-delete-card');
  if (!dialog || !input || !cancelButton || !confirmButton || dialog.dataset.ready === 'true') return;

  dialog.dataset.ready = 'true';

  input.addEventListener('input', () => {
    confirmButton.disabled = input.value.trim().toUpperCase() !== 'DELETE';
  });

  cancelButton.addEventListener('click', () => closeDeleteCardDialog());

  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDeleteCardDialog();
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDeleteCardDialog();
  });

  confirmButton.addEventListener('click', deletePendingCard);
}

function openDeleteCardDialog(cardId, cardName) {
  const dialog = document.getElementById('delete-card-dialog');
  const input = document.getElementById('delete-confirm-input');
  const confirmButton = document.getElementById('confirm-delete-card');
  const cardNameElement = document.getElementById('delete-card-name');
  if (!dialog || !input || !confirmButton || !cardNameElement || !cardId) return;

  pendingDeleteCard = { id: cardId, name: cardName || 'Untitled card' };
  cardNameElement.textContent = pendingDeleteCard.name;
  input.value = '';
  confirmButton.disabled = true;
  confirmButton.innerHTML = '<i data-lucide="trash-2" size="16"></i> Delete permanently';

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }

  if (window.lucide) lucide.createIcons();
  setTimeout(() => input.focus(), 50);
}

function closeDeleteCardDialog() {
  const dialog = document.getElementById('delete-card-dialog');
  const input = document.getElementById('delete-confirm-input');
  if (dialog?.open && typeof dialog.close === 'function') dialog.close();
  else dialog?.removeAttribute('open');
  if (input) input.value = '';
  pendingDeleteCard = null;
}

async function deletePendingCard() {
  if (!pendingDeleteCard?.id) return;

  const dialog = document.getElementById('delete-card-dialog');
  const input = document.getElementById('delete-confirm-input');
  const confirmButton = document.getElementById('confirm-delete-card');
  const cancelButton = document.getElementById('cancel-delete-card');
  if (!confirmButton || !cancelButton || input?.value.trim().toUpperCase() !== 'DELETE') return;

  const cardToDelete = { ...pendingDeleteCard };
  confirmButton.disabled = true;
  cancelButton.disabled = true;
  confirmButton.innerHTML = '<i data-lucide="loader-circle" size="16"></i> Deleting…';
  if (window.lucide) lucide.createIcons();

  try {
    const { data, error } = await supabaseClient
      .from('digital_cards')
      .delete()
      .eq('id', cardToDelete.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data?.id) throw new Error('Card not found or you do not have permission to delete it.');

    const cardElement = document.querySelector(`[data-card-id="${CSS.escape(cardToDelete.id)}"]`);
    cardElement?.remove();

    if (dialog?.open && typeof dialog.close === 'function') dialog.close();
    else dialog?.removeAttribute('open');

    pendingDeleteCard = null;
    toast(`${cardToDelete.name} was permanently deleted`);

    setTimeout(() => window.location.reload(), 650);
  } catch (error) {
    toast(error?.message || 'Could not delete this card');
    confirmButton.disabled = false;
    cancelButton.disabled = false;
    confirmButton.innerHTML = '<i data-lucide="trash-2" size="16"></i> Delete permanently';
    if (window.lucide) lucide.createIcons();
  }
}
