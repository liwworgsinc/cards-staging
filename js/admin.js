let adminAccounts = [];
let adminCards = [];
let adminAffiliateApplications = [];
let adminAffiliates = [];
let adminProfileMap = new Map();
let adminContactMap = new Map();
let activeCardOwnerFilter = '';
let adminCurrentUser = null;
let adminWorkspaceSettings = null;
let adminWorkspaceLogoRemoved = false;

const ADMIN_PLAN_LABELS = {
  starter: 'Free',
  plus: 'Plus',
  pro: 'Pro',
  agency: 'Hidden legacy plan',
  white_label: 'Hidden legacy plan'
};

(async function initAdminOverview() {
  const user = await requireUser();
  if (!user) return;

  const { data: ownerProfile, error: ownerError } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (ownerError) return toast(ownerError.message);
  if (!isLiwAdminAccount(user, ownerProfile)) {
    toast('Admin access is required.');
    setTimeout(() => location.href = liwUrl('dashboard.html'), 700);
    return;
  }

  adminCurrentUser = user;

  const [
    profilesResult,
    subscriptionsResult,
    cardsResult,
    leadsResult,
    affiliateApplicationsResult,
    affiliatesResult,
    contactsResult,
    workspaceSettingsResult
  ] = await Promise.all([
    supabaseClient.from('profiles').select('id,full_name,role,created_at').order('created_at', { ascending: false }),
    supabaseClient.from('subscriptions').select('user_id,plan_key,status,billing_interval,current_period_end,trial_ends_at'),
    supabaseClient.from('digital_cards').select('id,user_id,full_name,company_name,job_title,slug,status,updated_at').order('updated_at', { ascending: false }),
    supabaseClient.from('leads').select('id', { count: 'exact', head: true }),
    supabaseClient.from('affiliate_applications').select('id,user_id,email,legal_name,business_name,country_code,promotion_method,promotion_url,status,agreement_version,agreement_accepted_at,reviewed_at,notes,created_at').order('created_at', { ascending: false }),
    supabaseClient.from('affiliates').select('id,user_id,application_id,referral_code,status,tax_status,tax_form_type,payout_status,payout_method,payout_details,payout_details_confirmed_at,created_at').order('created_at', { ascending: false }),
    supabaseClient.rpc('admin_customer_directory'),
    supabaseClient.from('workspace_settings').select('*').eq('user_id', user.id).maybeSingle()
  ]);

  const criticalError = [
    profilesResult.error,
    subscriptionsResult.error,
    cardsResult.error,
    leadsResult.error,
    affiliateApplicationsResult.error,
    affiliatesResult.error,
    workspaceSettingsResult.error
  ].find(Boolean);
  if (criticalError) return toast(criticalError.message);

  if (contactsResult.error) {
    console.warn('Customer email directory unavailable:', contactsResult.error);
    toast('Customer accounts loaded, but email details could not be retrieved.');
  }

  const profiles = profilesResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  adminCards = cardsResult.data || [];
  adminAffiliateApplications = affiliateApplicationsResult.data || [];
  adminAffiliates = affiliatesResult.data || [];
  adminWorkspaceSettings = workspaceSettingsResult.data || null;

  adminContactMap = new Map((contactsResult.data || []).map(row => [row.user_id, row]));
  const subscriptionMap = new Map(subscriptions.map(row => [row.user_id, row]));
  const cardCounts = new Map();
  adminCards.forEach(card => cardCounts.set(card.user_id, (cardCounts.get(card.user_id) || 0) + 1));

  adminAccounts = profiles.map(profile => ({
    ...profile,
    contact: adminContactMap.get(profile.id) || null,
    subscription: subscriptionMap.get(profile.id) || null,
    cardCount: cardCounts.get(profile.id) || 0
  }));
  adminProfileMap = new Map(adminAccounts.map(profile => [profile.id, profile]));

  const pendingAffiliates = adminAffiliates.filter(row => row.payout_status !== 'ready').length;
  const paidOrTrial = adminAccounts.filter(row => {
    if (row.role === 'admin') return false;
    const plan = row.subscription?.plan_key || 'starter';
    const status = row.subscription?.status || 'active';
    return plan !== 'starter' && ['active', 'trialing'].includes(status);
  }).length;

  setText('admin-user-count', profiles.length);
  setText('admin-paid-account-count', paidOrTrial);
  setText('admin-card-count', adminCards.length);
  setText('admin-published-count', adminCards.filter(card => card.status === 'published').length);
  setText('admin-affiliate-pending-stat', pendingAffiliates);
  setText('admin-lead-count', leadsResult.count || 0);
  setText('admin-own-card-count', cardCounts.get(user.id) || 0);

  renderFilteredAccounts();
  renderFilteredAffiliateApplications();
  renderFilteredCards();
  bindAdminControls();
  renderAdminWorkspaceBranding();

  if (window.lucide) lucide.createIcons();
})();

function bindAdminControls() {
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('open');
  });

  ['admin-user-search', 'admin-plan-filter', 'admin-account-status-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener(id.includes('search') ? 'input' : 'change', renderFilteredAccounts);
  });

  ['admin-affiliate-search', 'admin-affiliate-status-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener(id.includes('search') ? 'input' : 'change', renderFilteredAffiliateApplications);
  });

  ['admin-card-search', 'admin-card-status-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener(id.includes('search') ? 'input' : 'change', renderFilteredCards);
  });

  document.getElementById('admin-clear-card-owner-filter')?.addEventListener('click', () => {
    activeCardOwnerFilter = '';
    renderFilteredCards();
  });

  document.getElementById('admin-white-label-form')?.addEventListener('submit', saveAdminWorkspaceBranding);
  document.getElementById('admin-restore-liw-branding')?.addEventListener('click', restoreLiwAdminBranding);
  document.getElementById('admin-remove-workspace-logo')?.addEventListener('click', removeAdminWorkspaceLogo);
  document.querySelectorAll('#admin-white-label-form input,#admin-white-label-form select').forEach(control => {
    control.addEventListener('input', updateAdminWorkspaceBrandPreview);
    control.addEventListener('change', updateAdminWorkspaceBrandPreview);
  });
  document.getElementById('admin-workspace-logo-file')?.addEventListener('change', event => {
    if (event.currentTarget.files?.[0]) adminWorkspaceLogoRemoved = false;
    updateAdminWorkspaceBrandPreview();
  });
  document.getElementById('admin-workspace-logo-url')?.addEventListener('input', event => {
    if (event.currentTarget.value.trim()) adminWorkspaceLogoRemoved = false;
  });
}

function renderFilteredAccounts() {
  const query = String(document.getElementById('admin-user-search')?.value || '').trim().toLowerCase();
  const planFilter = document.getElementById('admin-plan-filter')?.value || 'all';
  const statusFilter = document.getElementById('admin-account-status-filter')?.value || 'all';

  const rows = adminAccounts.filter(row => {
    const email = String(row.contact?.email || '').toLowerCase();
    const name = String(row.full_name || '').toLowerCase();
    const role = String(row.role || 'user');
    const plan = role === 'admin' ? 'admin' : String(row.subscription?.plan_key || 'starter');
    const status = role === 'admin' ? 'active' : String(row.subscription?.status || 'active');

    if (query && !name.includes(query) && !email.includes(query)) return false;
    if (planFilter !== 'all' && plan !== planFilter) return false;
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    return true;
  });

  setText('admin-account-visible-count', rows.length);
  renderAdminAccounts(rows);
}

function renderAdminAccounts(rows) {
  const body = document.getElementById('admin-user-rows');
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7"><div class="admin-empty-row"><strong>No matching accounts</strong><span>Try another name, email, plan, or status.</span></div></td></tr>';
    return;
  }

  body.innerHTML = rows.map(row => {
    const isAdmin = row.role === 'admin';
    const planKey = isAdmin ? 'admin' : (row.subscription?.plan_key || 'starter');
    const plan = isAdmin ? 'Admin · 100 cards' : planLabel(planKey);
    const status = isAdmin ? 'Owner' : titleCase(row.subscription?.status || 'active');
    const email = row.contact?.email || '';
    const initials = initialsFor(row.full_name || email || 'Customer');
    const lastSignIn = row.contact?.last_sign_in_at
      ? `Last sign-in ${formatDateTime(row.contact.last_sign_in_at)}`
      : 'No sign-in recorded';
    const confirmed = row.contact?.email_confirmed_at ? 'Email confirmed' : 'Email not confirmed';
    const subject = `LIW Digital Cards account support`;

    return `<tr>
      <td>
        <div class="admin-person">
          <span class="admin-person-avatar">${escapeHtml(initials)}</span>
          <div><strong>${escapeHtml(row.full_name || 'Unnamed account')}</strong><small>${escapeHtml(lastSignIn)}</small></div>
        </div>
      </td>
      <td>
        ${email
          ? `<a class="admin-email-link" href="${emailComposeHref(email, subject)}" target="_blank" rel="noopener">${escapeHtml(email)}</a><small>${escapeHtml(confirmed)}</small>`
          : '<span class="muted">Email unavailable</span>'}
      </td>
      <td><span class="status-pill ${isAdmin ? 'published' : 'draft'}">${escapeHtml(titleCase(row.role || 'user'))}</span></td>
      <td><strong>${escapeHtml(plan)}</strong><small>${escapeHtml(status)}</small></td>
      <td><strong>${row.cardCount}${isAdmin ? ' / 100' : ''}</strong></td>
      <td>${formatDate(row.created_at)}</td>
      <td>
        <div class="admin-row-actions">
          ${email ? `<a class="btn btn-primary btn-sm" href="${emailComposeHref(email, subject)}" target="_blank" rel="noopener"><i data-lucide="mail"></i> Email</a>` : ''}
          ${email ? `<button class="btn btn-light btn-sm" type="button" onclick="copyCustomerEmail('${escapeJs(email)}')"><i data-lucide="copy"></i> Copy</button>` : ''}
          <button class="btn btn-light btn-sm" type="button" onclick="showCustomerCards('${row.id}')"><i data-lucide="contact-round"></i> Cards</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function renderFilteredAffiliateApplications() {
  const query = String(document.getElementById('admin-affiliate-search')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('admin-affiliate-status-filter')?.value || 'all';
  const applicationByUser = new Map(adminAffiliateApplications.map(row => [row.user_id, row]));

  const rows = adminAffiliates.filter(affiliate => {
    const application = applicationByUser.get(affiliate.user_id);
    const profile = adminProfileMap.get(affiliate.user_id);
    const email = adminContactMap.get(affiliate.user_id)?.email || application?.email || '';
    const haystack = [
      profile?.full_name,
      application?.business_name,
      application?.legal_name,
      email,
      affiliate.referral_code,
      affiliate.payout_method,
      affiliate.payout_details
    ].filter(Boolean).join(' ').toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (statusFilter !== 'all' && affiliate.status !== statusFilter) return false;
    return true;
  });

  renderAdminAffiliateApplications(rows, applicationByUser);
}

function renderAdminAffiliateApplications(affiliates, applicationByUser = new Map()) {
  const body = document.getElementById('admin-affiliate-rows');
  const pendingCount = adminAffiliates.filter(row => row.payout_status !== 'ready').length;
  setText('admin-affiliate-pending-count', pendingCount);
  if (!body) return;

  if (!affiliates.length) {
    body.innerHTML = '<tr><td colspan="7"><div class="admin-empty-row"><strong>No matching affiliate accounts</strong><span>Try another search or affiliate status.</span></div></td></tr>';
    return;
  }

  body.innerHTML = affiliates.map(affiliate => {
    const application = applicationByUser.get(affiliate.user_id) || null;
    const profile = adminProfileMap.get(affiliate.user_id) || null;
    const contact = adminContactMap.get(affiliate.user_id) || null;
    const email = contact?.email || application?.email || '';
    const displayName = profile?.full_name || application?.business_name || application?.legal_name || 'Unnamed affiliate';
    const legalName = application?.legal_name || '';
    const statusClass = affiliate.status === 'active' ? 'published' : affiliate.status === 'terminated' ? 'archived' : 'draft';
    const taxForm = affiliate.tax_form_type || (application?.country_code === 'US' ? 'W-9' : 'W-8 series');
    const subject = 'Your LIW Cards affiliate account';
    const payoutMethod = affiliate.payout_method === 'cash_app' ? 'Cash App' : affiliate.payout_method ? titleCase(affiliate.payout_method) : 'Not selected';
    const payoutDetails = affiliate.payout_details || '';
    const payoutCell = payoutDetails
      ? `<strong>${escapeHtml(payoutMethod)}</strong><small>${escapeHtml(payoutDetails)}</small><div class="admin-inline-actions"><button type="button" onclick="copyAdminValue('${escapeJs(payoutDetails)}','Payout information')">Copy details</button></div>`
      : '<span class="muted">Not provided</span><small>Affiliate must save a payout method.</small>';
    const taxControl = `<label class="admin-tax-control"><span>${escapeHtml(taxForm)}</span><select onchange="setAffiliateTaxStatus('${affiliate.id}',this.value,'${escapeJs(taxForm)}')">
      ${['requested','received','verified','rejected','expired'].map(status => `<option value="${status}" ${affiliate.tax_status === status ? 'selected' : ''}>${escapeHtml(titleCase(status))}</option>`).join('')}
    </select><small>Payout: ${escapeHtml(titleCase(affiliate.payout_status))}</small></label>`;

    return `<tr>
      <td>
        <div class="admin-person">
          <span class="admin-person-avatar affiliate">${escapeHtml(initialsFor(displayName || email || 'A'))}</span>
          <div><strong>${escapeHtml(displayName)}</strong><small>${escapeHtml(legalName || `Joined ${formatDate(affiliate.created_at)}`)}</small></div>
        </div>
      </td>
      <td>
        ${email ? `<a class="admin-email-link" href="${emailComposeHref(email, subject)}" target="_blank" rel="noopener">${escapeHtml(email)}</a>` : '<span class="muted">Email unavailable</span>'}
        <div class="admin-inline-actions">
          ${email ? `<a href="${emailComposeHref(email, subject)}" target="_blank" rel="noopener">Email</a><button type="button" onclick="copyCustomerEmail('${escapeJs(email)}')">Copy</button>` : ''}
        </div>
      </td>
      <td><strong>${escapeHtml(affiliate.referral_code)}</strong><small>30-day tracking</small></td>
      <td><span class="status-pill ${statusClass}">${escapeHtml(titleCase(affiliate.status))}</span><small>Created ${formatDate(affiliate.created_at)}</small></td>
      <td>${payoutCell}</td>
      <td>${taxControl}</td>
      <td><div class="admin-affiliate-actions">${email ? `<a class="btn btn-light btn-sm" href="${emailComposeHref(email, subject)}" target="_blank" rel="noopener"><i data-lucide="mail"></i> Email</a>` : ''}</div></td>
    </tr>`;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function renderFilteredCards() {
  const query = String(document.getElementById('admin-card-search')?.value || '').trim().toLowerCase();
  const statusFilter = document.getElementById('admin-card-status-filter')?.value || 'all';

  const rows = adminCards.filter(card => {
    const owner = adminProfileMap.get(card.user_id);
    const ownerEmail = owner?.contact?.email || '';
    const haystack = [card.full_name, card.company_name, card.job_title, card.slug, owner?.full_name, ownerEmail].filter(Boolean).join(' ').toLowerCase();
    if (activeCardOwnerFilter && card.user_id !== activeCardOwnerFilter) return false;
    if (query && !haystack.includes(query)) return false;
    if (statusFilter !== 'all' && card.status !== statusFilter) return false;
    return true;
  });

  setText('admin-card-visible-count', rows.length);
  updateCardOwnerFilterNotice();
  renderAdminCards(rows, adminProfileMap);
}

function renderAdminCards(cards, profileMap) {
  const area = document.getElementById('admin-card-list');
  if (!area) return;

  if (!cards.length) {
    area.innerHTML = '<div class="empty-state"><h3>No matching cards</h3><p class="muted">Try another search, status, or customer filter.</p></div>';
    return;
  }

  area.innerHTML = cards.map(card => {
    const owner = profileMap.get(card.user_id);
    const email = owner?.contact?.email || '';
    const publicUrl = liwUrl(`card.html?slug=${encodeURIComponent(card.slug)}`);
    const subject = `Support for your LIW Digital Card: ${card.company_name || card.full_name || card.slug}`;

    return `<article class="admin-card-row admin-support-card-row">
      <div class="admin-card-primary">
        <span class="admin-card-icon"><i data-lucide="contact-round"></i></span>
        <div>
          <strong>${escapeHtml(card.company_name || card.full_name || 'Untitled Card')}</strong>
          <span>${escapeHtml(card.job_title || 'No title')} · /${escapeHtml(card.slug || '')}</span>
          <small>Updated ${formatDateTime(card.updated_at)}</small>
        </div>
      </div>
      <div class="admin-card-owner">
        <strong>${escapeHtml(owner?.full_name || 'Unknown customer')}</strong>
        ${email ? `<a href="${emailComposeHref(email, subject)}" target="_blank" rel="noopener">${escapeHtml(email)}</a>` : '<span>Email unavailable</span>'}
      </div>
      <span class="status-pill ${escapeHtml(card.status)}">${escapeHtml(titleCase(card.status))}</span>
      <div class="admin-card-actions">
        ${email ? `<a class="btn btn-light btn-sm" href="${emailComposeHref(email, subject)}" target="_blank" rel="noopener"><i data-lucide="mail"></i> Email</a>` : ''}
        <a class="btn btn-light btn-sm" href="editor.html?id=${encodeURIComponent(card.id)}"><i data-lucide="pencil"></i> Edit</a>
        <a class="btn btn-primary btn-sm" href="${publicUrl}" target="_blank" rel="noopener"><i data-lucide="external-link"></i> Open</a>
      </div>
    </article>`;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function showCustomerCards(userId) {
  activeCardOwnerFilter = userId;
  renderFilteredCards();
  document.getElementById('recent-cards-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateCardOwnerFilterNotice() {
  const notice = document.getElementById('admin-card-filter-notice');
  const text = document.getElementById('admin-card-filter-text');
  if (!notice || !text) return;

  if (!activeCardOwnerFilter) {
    notice.hidden = true;
    text.textContent = '';
    return;
  }

  const owner = adminProfileMap.get(activeCardOwnerFilter);
  const email = owner?.contact?.email || '';
  text.textContent = `Showing cards for ${owner?.full_name || 'selected customer'}${email ? ` · ${email}` : ''}`;
  notice.hidden = false;
}

async function copyCustomerEmail(email) {
  if (!email) return;
  try {
    await navigator.clipboard.writeText(email);
  } catch (_) {
    const textarea = document.createElement('textarea');
    textarea.value = email;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  toast(`Email copied: ${email}`);
}

async function copyAdminValue(value, label = 'Value') {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (_) {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }
  toast(`${label} copied.`);
}

async function reviewAffiliateApplication(applicationId, decision) {
  const verb = decision === 'approved' ? 'approve' : 'decline';
  if (!confirm(`Are you sure you want to ${verb} this affiliate application?`)) return;

  const { data, error } = await supabaseClient.rpc('admin_review_affiliate_application', {
    p_application_id: applicationId,
    p_decision: decision,
    p_notes: ''
  });

  if (error) return toast(error.message);
  const code = data?.referral_code ? ` Referral code: ${data.referral_code}` : '';
  toast(`Affiliate application ${decision}.${code}`);
  setTimeout(() => location.reload(), 650);
}

async function setAffiliateTaxStatus(affiliateId, status, taxFormType) {
  const { data, error } = await supabaseClient.rpc('admin_set_affiliate_tax_status', {
    p_affiliate_id: affiliateId,
    p_tax_status: status,
    p_tax_form_type: taxFormType
  });

  if (error) return toast(error.message);
  toast(`Tax status updated to ${titleCase(data?.tax_status || status)}.`);
  setTimeout(() => location.reload(), 500);
}

function planLabel(planKey) {
  return ADMIN_PLAN_LABELS[planKey] || titleCase(planKey || 'starter');
}

function initialsFor(value) {
  return String(value || 'C')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'C';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function emailComposeHref(email, subject) {
  const recipient = String(email || '').trim();
  const messageSubject = String(subject || 'LIW Digital Cards support').trim();
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: recipient,
    su: messageSubject
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function escapeJs(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}



function adminWorkspaceValue(id, fallback = '') {
  const element = document.getElementById(id);
  return element ? element.value : fallback;
}

function adminButtonRadius(style) {
  return ({ rounded: '13px', soft: '8px', square: '0px', pill: '999px' })[style] || '13px';
}

function renderAdminWorkspaceBranding() {
  const settings = adminWorkspaceSettings || {};
  adminWorkspaceLogoRemoved = false;
  setAdminWorkspaceValue('admin-workspace-brand-name', settings.brand_name || '');
  setAdminWorkspaceValue('admin-workspace-logo-url', isManagedAdminWorkspaceAsset(settings.logo_url) ? '' : (settings.logo_url || ''));
  setAdminWorkspaceValue('admin-workspace-primary-color', settings.primary_color || settings.accent_color || '#0b1438');
  setAdminWorkspaceValue('admin-workspace-secondary-color', settings.secondary_color || '#d4a84f');
  setAdminWorkspaceValue('admin-workspace-sidebar-color', settings.sidebar_color || '#07102e');
  setAdminWorkspaceValue('admin-workspace-theme', settings.dashboard_theme || 'light');
  setAdminWorkspaceValue('admin-workspace-button-style', settings.button_style || 'rounded');
  setAdminWorkspaceValue('admin-workspace-support-email', settings.support_email || '');
  setAdminWorkspaceValue('admin-workspace-support-phone', settings.support_phone || '');
  setAdminWorkspaceValue('admin-workspace-footer-text', settings.footer_text || '');
  const hide = document.getElementById('admin-hide-liw-dashboard-branding');
  if (hide) hide.checked = Boolean(settings.hide_liw_dashboard_branding);
  renderAdminCurrentWorkspaceLogo(settings.logo_url || '');
  const custom = Boolean(settings.brand_name || settings.logo_url || settings.favicon_url || settings.hide_liw_dashboard_branding || settings.support_email || settings.support_phone || settings.footer_text || (settings.primary_color && settings.primary_color !== '#0b1438') || (settings.secondary_color && settings.secondary_color !== '#d4a84f') || (settings.sidebar_color && settings.sidebar_color !== '#07102e'));
  const status = document.getElementById('admin-branding-status');
  if (status) {
    status.textContent = custom ? 'Admin custom branding' : 'LIW default';
    status.className = `status-pill ${custom ? 'trialing' : 'active'}`;
  }
  updateAdminWorkspaceBrandPreview();
}

function setAdminWorkspaceValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function isManagedAdminWorkspaceAsset(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith('.supabase.co') && parsed.pathname.includes('/storage/v1/object/public/');
  } catch (_) {
    return false;
  }
}

function renderAdminCurrentWorkspaceLogo(url) {
  const block = document.getElementById('admin-workspace-current-logo');
  const image = document.getElementById('admin-workspace-current-logo-image');
  if (!block || !image) return;
  const visibleUrl = adminWorkspaceLogoRemoved ? '' : String(url || '');
  block.hidden = !visibleUrl;
  if (visibleUrl) image.src = visibleUrl;
  else image.removeAttribute('src');
}

function updateAdminWorkspaceBrandPreview() {
  const preview = document.getElementById('admin-workspace-brand-preview');
  if (!preview) return;
  const brandName = adminWorkspaceValue('admin-workspace-brand-name').trim() || 'LIW Admin workspace';
  const enteredLogoUrl = adminWorkspaceValue('admin-workspace-logo-url').trim();
  const savedLogoUrl = adminWorkspaceLogoRemoved ? '' : String(adminWorkspaceSettings?.logo_url || '');
  const logoUrl = enteredLogoUrl || savedLogoUrl;
  const primary = adminWorkspaceValue('admin-workspace-primary-color', '#0b1438');
  const secondary = adminWorkspaceValue('admin-workspace-secondary-color', '#d4a84f');
  const sidebar = adminWorkspaceValue('admin-workspace-sidebar-color', '#07102e');
  const theme = adminWorkspaceValue('admin-workspace-theme', 'light');
  const buttonStyle = adminWorkspaceValue('admin-workspace-button-style', 'rounded');
  const logoFile = document.getElementById('admin-workspace-logo-file')?.files?.[0];

  preview.style.setProperty('--preview-primary', primary);
  preview.style.setProperty('--preview-secondary', secondary);
  preview.style.setProperty('--preview-sidebar', sidebar);
  preview.style.setProperty('--preview-button-radius', adminButtonRadius(buttonStyle));
  preview.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  setText('admin-workspace-preview-name', `${brandName} workspace`);

  const logo = document.getElementById('admin-workspace-preview-logo');
  if (!logo) return;
  const renderLogo = url => {
    logo.innerHTML = url
      ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(brandName)}">`
      : `<img src="assets/liw-worgs-logo.png" alt="LIW Worgs Inc">`;
  };
  if (logoFile) {
    const reader = new FileReader();
    reader.onload = () => renderLogo(String(reader.result || ''));
    reader.readAsDataURL(logoFile);
  } else {
    renderLogo(logoUrl);
  }
}

function removeAdminWorkspaceLogo() {
  adminWorkspaceLogoRemoved = true;
  const file = document.getElementById('admin-workspace-logo-file');
  const url = document.getElementById('admin-workspace-logo-url');
  if (file) file.value = '';
  if (url) url.value = '';
  renderAdminCurrentWorkspaceLogo('');
  updateAdminWorkspaceBrandPreview();
  toast('The custom admin logo will be removed when you save.');
}

async function uploadAdminWorkspaceAsset(file, kind) {
  if (!file) return null;
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB.');
  const extension = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${adminCurrentUser.id}/admin-brand/${kind}-${Date.now()}.${extension}`;
  const { error } = await supabaseClient.storage.from('profile-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabaseClient.storage.from('profile-images').getPublicUrl(path);
  return data.publicUrl;
}

function setAdminBrandingButtonBusy(button, busy, label = 'Saving…') {
  if (!button) return;
  if (busy) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.textContent = label;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

async function saveAdminWorkspaceBranding(event) {
  event.preventDefault();
  if (!adminCurrentUser) return toast('Admin session is unavailable.');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  setAdminBrandingButtonBusy(button, true);
  try {
    const logoFile = document.getElementById('admin-workspace-logo-file')?.files?.[0] || null;
    const faviconFile = document.getElementById('admin-workspace-favicon-file')?.files?.[0] || null;
    const uploadedLogo = await uploadAdminWorkspaceAsset(logoFile, 'logo');
    const uploadedFavicon = await uploadAdminWorkspaceAsset(faviconFile, 'favicon');
    const primary = adminWorkspaceValue('admin-workspace-primary-color', '#0b1438');
    const payload = {
      user_id: adminCurrentUser.id,
      brand_name: adminWorkspaceValue('admin-workspace-brand-name').trim() || null,
      logo_url: uploadedLogo || adminWorkspaceValue('admin-workspace-logo-url').trim() || (adminWorkspaceLogoRemoved ? null : (adminWorkspaceSettings?.logo_url || null)),
      favicon_url: uploadedFavicon || adminWorkspaceSettings?.favicon_url || null,
      accent_color: primary,
      primary_color: primary,
      secondary_color: adminWorkspaceValue('admin-workspace-secondary-color', '#d4a84f'),
      sidebar_color: adminWorkspaceValue('admin-workspace-sidebar-color', '#07102e'),
      dashboard_theme: adminWorkspaceValue('admin-workspace-theme', 'light'),
      button_style: adminWorkspaceValue('admin-workspace-button-style', 'rounded'),
      support_email: adminWorkspaceValue('admin-workspace-support-email').trim() || null,
      support_phone: adminWorkspaceValue('admin-workspace-support-phone').trim() || null,
      footer_text: adminWorkspaceValue('admin-workspace-footer-text').trim() || null,
      hide_liw_dashboard_branding: Boolean(document.getElementById('admin-hide-liw-dashboard-branding')?.checked)
    };
    const { data, error } = await supabaseClient.from('workspace_settings').upsert(payload, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    adminWorkspaceSettings = data;
    clearLiwAccessContextCache();
    toast('Admin-only white-label settings saved.');
    setTimeout(() => location.reload(), 650);
  } catch (error) {
    toast(error.message || 'Unable to save admin branding.');
  } finally {
    setAdminBrandingButtonBusy(button, false);
  }
}

async function restoreLiwAdminBranding() {
  if (!adminCurrentUser) return toast('Admin session is unavailable.');
  if (!confirm('Restore the official LIW logo, colors, footer, and dashboard branding for this admin account?')) return;
  const button = document.getElementById('admin-restore-liw-branding');
  setAdminBrandingButtonBusy(button, true, 'Restoring…');
  try {
    const payload = {
      user_id: adminCurrentUser.id,
      brand_name: null,
      logo_url: null,
      favicon_url: null,
      accent_color: '#0b1438',
      primary_color: '#0b1438',
      secondary_color: '#d4a84f',
      sidebar_color: '#07102e',
      dashboard_theme: 'light',
      button_style: 'rounded',
      support_email: null,
      support_phone: null,
      footer_text: null,
      hide_liw_dashboard_branding: false
    };
    const { data, error } = await supabaseClient.from('workspace_settings').upsert(payload, { onConflict: 'user_id' }).select().single();
    if (error) throw error;
    adminWorkspaceSettings = data;
    adminWorkspaceLogoRemoved = false;
    clearLiwAccessContextCache();
    toast('Official LIW branding restored.');
    setTimeout(() => location.reload(), 650);
  } catch (error) {
    toast(error.message || 'Unable to restore LIW branding.');
  } finally {
    setAdminBrandingButtonBusy(button, false);
  }
}

window.showCustomerCards = showCustomerCards;
window.copyCustomerEmail = copyCustomerEmail;
window.reviewAffiliateApplication = reviewAffiliateApplication;
window.setAffiliateTaxStatus = setAffiliateTaxStatus;
