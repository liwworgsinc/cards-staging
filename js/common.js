
(function captureAffiliateReferralFallback(){
  if (window.LIWReferral) { window.LIWReferral.capture(); return; }
  try {
    const params = new URLSearchParams(location.search);
    const code = String(params.get('ref') || params.get('refcode') || '').trim().toUpperCase();
    const existing = String(localStorage.getItem('liw_affiliate_code') || '').trim().toUpperCase();
    const seen = new Date(localStorage.getItem('liw_affiliate_seen_at') || 0).getTime();
    const validExisting = /^[A-Z0-9_-]{4,40}$/.test(existing) && Number.isFinite(seen) && Date.now() - seen <= 30 * 86400000;
    if (code && /^[A-Z0-9_-]{4,40}$/.test(code) && !validExisting) {
      localStorage.setItem('liw_affiliate_code', code);
      localStorage.setItem('liw_affiliate_seen_at', new Date().toISOString());
    }
  } catch (_) {}
})();
function toast(message) {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => element.classList.remove('show'), 3000);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function titleCase(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

async function requireUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    location.href = liwUrl('login.html');
    return null;
  }
  try {
    await supabaseClient.rpc('accept_workspace_invites');
  } catch (_) {}
  return user;
}

async function logout() {
  await supabaseClient.auth.signOut();
  location.href = liwUrl('login.html');
}


const LIW_ADMIN_EMAILS = ['liwworgsinc@gmail.com', 'globalcorent@gmail.com'];

const LIW_ADMIN_PLAN_PREVIEW_KEY = 'liw_admin_plan_preview';

function clearLiwAdminPlanPreview() {
  try {
    localStorage.removeItem(LIW_ADMIN_PLAN_PREVIEW_KEY);
    localStorage.removeItem('liw_admin_plan_simulator_open');
    localStorage.removeItem('liw_admin_plan_lab_open');
  } catch (_) {}
}

function isLiwStagingPlanQaHost() {
  return location.hostname === 'liwworgsinc.github.io' && location.pathname.startsWith('/cards-staging/');
}

function getLiwAdminPlanPreview(user = null, profile = null) {
  if (!isLiwStagingPlanQaHost() || !isLiwAdminAccount(user, profile)) return null;
  try {
    const value = String(localStorage.getItem(LIW_ADMIN_PLAN_PREVIEW_KEY) || '').toLowerCase();
    return ['starter', 'plus', 'pro', 'agency', 'white_label'].includes(value) ? value : null;
  } catch (_) {
    return null;
  }
}

function setLiwAdminPlanPreview(planKey = null) {
  if (!isLiwStagingPlanQaHost()) return;
  try {
    const value = String(planKey || '').toLowerCase();
    if (['starter', 'plus', 'pro', 'agency', 'white_label'].includes(value)) localStorage.setItem(LIW_ADMIN_PLAN_PREVIEW_KEY, value);
    else localStorage.removeItem(LIW_ADMIN_PLAN_PREVIEW_KEY);
  } catch (_) {}
  clearLiwAccessContextCache();
}

function liwPlanPreviewName(planKey = '') {
  return ({ starter: 'Free', plus: 'Plus', pro: 'Pro', agency: 'Agency Starter', white_label: 'Agency Pro' })[planKey] || 'Customer';
}
function liwPlanPreviewShort(planKey = '') {
  return ({ starter: '1 card', plus: '3 cards', pro: '10 cards', agency: '15 client cards', white_label: '50 client cards' })[planKey] || 'Customer plan';
}

function isLiwAdminAccount(user, profile = null) {
  const email = String(user?.email || '').trim().toLowerCase();
  return profile?.role === 'admin' || LIW_ADMIN_EMAILS.includes(email);
}


let __liwAccessContextPromise = null;

async function getLiwAccessContext(user = null, { refresh = false } = {}) {
  if (!user) {
    const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
    user = currentUser;
  }

  if (!user) {
    return {
      user: null,
      profile: null,
      subscription: null,
      isAdmin: false,
      planKey: 'starter',
      planName: 'Starter',
      cardLimit: 1,
      entitlements: {},
      has: () => false
    };
  }

  if (!refresh && __liwAccessContextPromise) return __liwAccessContextPromise;

  __liwAccessContextPromise = (async () => {
    const [profileResult, subscriptionResult, planResult, definitionResult, addonResult] = await Promise.all([
      supabaseClient.from('profiles').select('role,full_name').eq('id', user.id).maybeSingle(),
      supabaseClient.from('subscriptions').select('plan_key,status,billing_interval').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('plan_definitions').select('plan_key,name,card_limit,entitlements').order('card_limit'),
      supabaseClient.from('addon_definitions').select('addon_key,entitlement_key,included_plans,is_active').eq('is_active', true),
      supabaseClient.from('subscription_addons').select('addon_key,status').eq('user_id', user.id)
    ]);

    const profile = profileResult.data || null;
    const subscription = subscriptionResult.data || null;
    const isAdmin = isLiwAdminAccount(user, profile);
    const simulatedPlanKey = getLiwAdminPlanPreview(user, profile);
    const isPlanPreview = Boolean(simulatedPlanKey);
    const activeSubscription = subscription && ['active', 'trialing'].includes(subscription.status);
    const planKey = simulatedPlanKey || (isAdmin ? 'pro' : activeSubscription ? subscription.plan_key : 'starter');
    const plans = planResult.data || [];
    const plan = plans.find(row => row.plan_key === planKey) || plans.find(row => row.plan_key === 'starter') || {};
    const entitlements = { ...(plan.entitlements || {}) };
    const activeAddonKeys = new Set((isPlanPreview ? [] : (addonResult.data || []))
      .filter(row => ['active', 'trialing'].includes(row.status))
      .map(row => row.addon_key));

    (definitionResult.data || []).forEach(definition => {
      const included = Array.isArray(definition.included_plans) && definition.included_plans.includes(planKey);
      if (included || activeAddonKeys.has(definition.addon_key)) {
        entitlements[definition.entitlement_key || definition.addon_key] = true;
      }
    });

    // Staging previews model the approved 2026 Plus/Pro split before the
    // production database migration is applied.
    if (isPlanPreview && simulatedPlanKey === 'plus') {
      entitlements.custom_qr = false;
      entitlements.custom_seo = false;
    }

    const knownAdminFeatures = [
      'premium_templates', 'advanced_analytics', 'remove_branding',
      'appointment_booking', 'lead_capture', 'product_showcase', 'custom_qr',
      'team_access', 'white_label', 'cover_image', 'expanded_fonts',
      'custom_branding_link', 'custom_seo', 'client_management',
      'bulk_card_management', 'priority_support', 'video_section', 'file_downloads',
      'white_label_dashboard', 'team_member_access', 'custom_domain',
      'flow_experience', 'lead_csv_export', 'standard_analytics', 'services_section'
    ];

    if (isAdmin && !isPlanPreview) knownAdminFeatures.forEach(key => { entitlements[key] = true; });

    return {
      user,
      profile,
      subscription,
      isAdmin,
      isPlanPreview,
      simulatedPlanKey,
      planKey,
      planName: isPlanPreview ? (plan.name || liwPlanPreviewName(planKey)) : isAdmin ? 'LIW Admin' : (plan.name || titleCase(planKey)),
      cardLimit: isPlanPreview ? Number(plan.card_limit || 1) : isAdmin ? 100 : Number(plan.card_limit || 1),
      entitlements,
      has(feature) {
        return (isAdmin && !isPlanPreview) || entitlements[feature] === true;
      }
    };
  })();

  try {
    return await __liwAccessContextPromise;
  } catch (error) {
    __liwAccessContextPromise = null;
    throw error;
  }
}

function clearLiwAccessContextCache() {
  __liwAccessContextPromise = null;
}

async function mountLiwStagingPlanQaBar() {
  if (!isLiwStagingPlanQaHost() || document.getElementById('liw-staging-plan-qa')) return;
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const access = await getLiwAccessContext(user, { refresh: true });
    if (!access.isAdmin) return;

    const current = access.isPlanPreview ? access.planKey : 'admin';
    const bar = document.createElement('div');
    bar.id = 'liw-staging-plan-qa';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Staging plan preview');
    bar.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:99999;display:flex;align-items:center;gap:5px;padding:7px 8px;border:1px solid rgba(212,168,79,.6);border-radius:13px;background:#07102e;color:#fff;box-shadow:0 16px 36px rgba(0,0,0,.24);font:700 11px/1.2 DM Sans,system-ui,sans-serif';
    const label = document.createElement('span');
    label.textContent = 'STAGING QA';
    label.style.cssText = 'padding:0 5px;color:#efc96f;letter-spacing:.06em';
    bar.appendChild(label);

    [
      ['admin', 'Admin'],
      ['starter', 'Free'],
      ['plus', 'Plus'],
      ['pro', 'Pro'],
      ['agency', 'Agency S'],
      ['white_label', 'Agency Pro']
    ].forEach(([key, text]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.style.cssText = `border:1px solid ${key === current ? '#d4a84f' : 'rgba(255,255,255,.18)'};border-radius:9px;padding:6px 8px;background:${key === current ? '#d4a84f' : 'rgba(255,255,255,.07)'};color:${key === current ? '#07102e' : '#fff'};font:800 11px DM Sans,system-ui,sans-serif;cursor:pointer`;
      button.addEventListener('click', () => {
        setLiwAdminPlanPreview(key === 'admin' ? null : key);
        location.reload();
      });
      bar.appendChild(button);
    });

    document.body.appendChild(bar);
  } catch (_) {}
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mountLiwStagingPlanQaBar, 0));
else setTimeout(mountLiwStagingPlanQaBar, 0);


function liwProgramLinkElement({ key, href, icon, label, active = false, detail = '' }) {
  const link = document.createElement('a');
  link.href = href;
  link.dataset.liwProgramLink = key;
  link.className = `liw-program-nav-link${active ? ' active' : ''}`;
  link.innerHTML = `<i data-lucide="${escapeHtml(icon)}" size="18"></i> <span>${escapeHtml(label)}</span>${detail ? `<small class="liw-program-nav-detail">${escapeHtml(detail)}</small>` : ''}`;
  return link;
}

function focusLiwProgramHash() {
  if (location.hash !== '#white-label-workspace') return;
  let attempts = 0;
  const reveal = () => {
    attempts += 1;
    const target = document.getElementById('white-label-workspace');
    if (target && !target.hidden) {
      target.scrollIntoView({ behavior: attempts === 1 ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (attempts < 20) window.setTimeout(reveal, 120);
  };
  reveal();
}

async function mountLiwProgramNavigation() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || sidebar.querySelector('[data-liw-program-link]')) return;

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const access = await getLiwAccessContext(user);

    let affiliate = null;
    let application = null;
    if (!access.isAdmin) {
      const [affiliateResult, applicationResult] = await Promise.all([
        supabaseClient.from('affiliates').select('status').eq('user_id', user.id).maybeSingle(),
        supabaseClient.from('affiliate_applications').select('status').eq('user_id', user.id).maybeSingle()
      ]);
      affiliate = affiliateResult.data || null;
      application = applicationResult.data || null;
    }

    const affiliateStatus = String(affiliate?.status || '').toLowerCase();
    const applicationStatus = String(application?.status || '').toLowerCase();
    const hasAffiliateAccess = access.isAdmin || ['active', 'paused'].includes(affiliateStatus) || ['pending', 'approved'].includes(applicationStatus);

    const workspaceNav = sidebar.querySelector('nav');
    if (!workspaceNav) return;
    const billingLink = [...workspaceNav.querySelectorAll('a')].find(link => {
      const href = String(link.getAttribute('href') || '').toLowerCase();
      return href.includes('pricing.html') || link.id?.includes('plans');
    }) || null;
    const currentPage = (location.pathname.split('/').pop() || 'dashboard.html').toLowerCase();

    if (access.isAdmin) {
      const existingWhiteLabelLink = [...workspaceNav.querySelectorAll('a')].some(link => {
        const href = String(link.getAttribute('href') || '').toLowerCase();
        const text = String(link.textContent || '').trim().toLowerCase();
        return href.includes('white-label') || text.includes('white-label');
      });

      if (!existingWhiteLabelLink) {
        const brandingLink = liwProgramLinkElement({
          key: 'admin-white-label',
          href: liwUrl('admin.html#admin-white-label-panel'),
          icon: 'paintbrush-vertical',
          label: 'White-label lab',
          active: currentPage === 'admin.html' && location.hash === '#admin-white-label-panel'
        });
        workspaceNav.insertBefore(brandingLink, billingLink);
      }
    }

    const hasAgencyAccess = access.isAdmin || access.has?.('client_management') || ['agency', 'white_label'].includes(String(access.planKey || ''));
    if (hasAgencyAccess && !workspaceNav.querySelector('[data-liw-program-link="agency-workspace"]')) {
      const agencyLink = liwProgramLinkElement({
        key: 'agency-workspace',
        href: liwUrl('agency-dashboard.html'),
        icon: 'briefcase-business',
        label: 'Agency workspace',
        active: currentPage === 'agency-dashboard.html'
      });
      workspaceNav.insertBefore(agencyLink, billingLink);
    }

    if (hasAffiliateAccess) {
      const pending = !access.isAdmin && !affiliate && applicationStatus === 'pending';
      const affiliateLink = liwProgramLinkElement({
        key: 'affiliate',
        href: liwUrl('affiliate-dashboard.html'),
        icon: 'badge-dollar-sign',
        label: pending ? 'Affiliate status' : 'Affiliate dashboard'
      });
      workspaceNav.insertBefore(affiliateLink, billingLink);
    }

    if (window.lucide) lucide.createIcons();
    focusLiwProgramHash();
  } catch (_) {}
}

window.addEventListener('hashchange', focusLiwProgramHash);

function workspaceButtonRadius(style) {
  return ({ rounded: '13px', soft: '8px', square: '0px', pill: '999px' })[style] || '13px';
}

function resolvedWorkspaceTheme(theme) {
  if (theme === 'system') return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return theme === 'dark' ? 'dark' : 'light';
}

async function applyLiwWorkspaceBranding() {
  if (document.body.classList.contains('public-body')) return;
  const isWorkspacePage = Boolean(document.querySelector('.dashboard,.editor-shell,.editor-topbar,.agency-workspace'));
  if (!isWorkspacePage) return;

  try {
    const access = await getLiwAccessContext();
    // Agency Pro and LIW Admin may replace LIW workspace branding.
    // Free, Plus, Pro, and Agency Starter keep LIW branding.
    const whiteLabelAllowed = Boolean((access?.isAdmin && !access?.isPlanPreview) || access?.has?.('white_label_dashboard'));
    if (!access?.user || !whiteLabelAllowed) return;

    const { data, error } = await supabaseClient.from('workspace_settings').select('*').eq('user_id', access.user.id).maybeSingle();
    if (error || !data) return;

    const primary = data.primary_color || data.accent_color || '#0b1438';
    const secondary = data.secondary_color || '#d4a84f';
    const sidebar = data.sidebar_color || '#07102e';
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--secondary', secondary);
    document.documentElement.style.setProperty('--accent', secondary);
    document.documentElement.style.setProperty('--primary-dark', sidebar);
    document.documentElement.style.setProperty('--workspace-sidebar', sidebar);
    document.documentElement.style.setProperty('--workspace-button-radius', workspaceButtonRadius(data.button_style));

    const theme = resolvedWorkspaceTheme(data.dashboard_theme);
    document.body.classList.toggle('workspace-theme-dark', theme === 'dark');
    document.body.classList.toggle('workspace-theme-light', theme !== 'dark');

    const brandName = data.brand_name || 'LIW Admin Workspace';
    if (data.hide_liw_dashboard_branding && (data.logo_url || data.brand_name)) {
      document.querySelector('.liw-company-footer')?.remove();
      document.querySelectorAll('.brand.brand-with-logo').forEach(element => {
        element.innerHTML = data.logo_url
          ? `<img class="brand-logo workspace-brand-logo" src="${escapeHtml(data.logo_url)}" alt="${escapeHtml(brandName)}">`
          : `<span class="workspace-brand-name">${escapeHtml(brandName)}</span>`;
        element.setAttribute('aria-label', brandName);
      });
      document.title = document.title.replace(/LIW Digital Cards/gi, brandName);
    } else if (data.logo_url || data.brand_name) {
      const adminSidebar = document.querySelector('.sidebar');
      const liwBrand = adminSidebar?.querySelector('.brand.brand-with-logo');
      if (adminSidebar && liwBrand && !adminSidebar.querySelector('.admin-white-label-cobrand')) {
        const block = document.createElement('div');
        block.className = 'agency-cobrand admin-white-label-cobrand';
        block.innerHTML = `${data.logo_url ? `<img src="${escapeHtml(data.logo_url)}" alt="${escapeHtml(brandName)}">` : ''}<span><small>Admin test brand</small><strong>${escapeHtml(brandName)}</strong></span>`;
        liwBrand.insertAdjacentElement('afterend', block);
      }
    }

    if (data.favicon_url) {
      let icon = document.querySelector('link[rel~="icon"]');
      if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon); }
      icon.href = data.favicon_url;
    }

    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter && (data.support_email || data.support_phone || data.footer_text)) {
      let block = sidebarFooter.querySelector('.workspace-support-block');
      if (!block) { block = document.createElement('div'); block.className = 'workspace-support-block'; sidebarFooter.appendChild(block); }
      const supportParts = [];
      if (data.footer_text) supportParts.push(`<strong>${escapeHtml(data.footer_text)}</strong>`);
      if (data.support_email) supportParts.push(`<a href="mailto:${escapeHtml(data.support_email)}">${escapeHtml(data.support_email)}</a>`);
      if (data.support_phone) supportParts.push(`<a href="tel:${escapeHtml(String(data.support_phone).replace(/[^+\d]/g, ''))}">${escapeHtml(data.support_phone)}</a>`);
      block.innerHTML = supportParts.join('');
    }
  } catch (_) {}
}

function mountLiwCompanyFooter() {
  if (document.querySelector('footer, .liw-company-footer')) return;
  const main = document.querySelector('.main') || document.querySelector('main');
  if (!main || document.body.classList.contains('public-body') || document.body.classList.contains('reseller-store-body')) return;

  const footer = document.createElement('footer');
  footer.className = 'liw-company-footer';
  footer.innerHTML = `
    <div class="liw-company-footer-inner">
      <div class="liw-company-footer-brand">
        <span class="liw-company-footer-kicker">A business solution by</span>
        <a href="https://www.liwworgs.com" target="_blank" rel="noopener noreferrer">LIW Worgs Inc <i data-lucide="external-link" size="14"></i></a>
        <p>LIW Worgs Inc creates practical digital tools and business solutions that help entrepreneurs present, manage, and grow their brands online.</p>
      </div>
      <nav class="liw-company-footer-links" aria-label="Company and legal links">
        <a href="https://www.liwworgs.com" target="_blank" rel="noopener noreferrer">Visit LIW Worgs Inc</a>
        <a href="${liwUrl('support.html')}">Support center</a>
        <a href="${liwUrl('privacy.html')}">Privacy</a>
        <a href="${liwUrl('terms.html')}">Terms</a>
      </nav>
    </div>`;
  main.appendChild(footer);
  if (window.lucide) lucide.createIcons();
}


function mountLiwPlansBillingNavigation() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const workspaceLabel = Array.from(sidebar.querySelectorAll('.sidebar-label'))
    .find(label => /workspace/i.test(String(label.textContent || '')));
  const workspaceNav = workspaceLabel?.nextElementSibling?.tagName === 'NAV'
    ? workspaceLabel.nextElementSibling
    : sidebar.querySelector('nav');
  if (!workspaceNav) return;

  let link = Array.from(workspaceNav.querySelectorAll('a')).find(anchor => {
    const href = String(anchor.getAttribute('href') || '').toLowerCase();
    return href.includes('pricing.html') || anchor.hasAttribute('data-liw-plans-billing-link');
  });

  if (!link) {
    link = document.createElement('a');
    const featuresLink = Array.from(workspaceNav.querySelectorAll('a')).find(anchor =>
      String(anchor.getAttribute('href') || '').toLowerCase().includes('addons.html')
    );
    if (featuresLink?.nextSibling) workspaceNav.insertBefore(link, featuresLink.nextSibling);
    else workspaceNav.appendChild(link);
  }

  link.href = liwUrl('pricing.html');
  link.dataset.liwPlansBillingLink = 'true';
  link.removeAttribute('hidden');
  link.hidden = false;
  link.innerHTML = '<i data-lucide="credit-card" size="18"></i> Plans &amp; billing';

  if (!link.__liwPlansBillingGuard) {
    link.__liwPlansBillingGuard = new MutationObserver(() => {
      if (link.hasAttribute('hidden') || link.hidden) {
        link.removeAttribute('hidden');
        link.hidden = false;
      }
    });
    link.__liwPlansBillingGuard.observe(link, { attributes: true, attributeFilter: ['hidden'] });
  }

  if (window.lucide) lucide.createIcons();
}

function mountLiwSupportNavigation() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar || sidebar.querySelector('[data-liw-support-link]')) return;

  const accountLabel = Array.from(sidebar.querySelectorAll('.sidebar-label'))
    .find(label => String(label.textContent || '').trim().toLowerCase() === 'account');
  const accountNav = accountLabel?.nextElementSibling;
  if (!accountNav || accountNav.tagName !== 'NAV') return;

  const currentPage = String(location.pathname.split('/').pop() || 'dashboard.html');
  const link = document.createElement('a');
  link.href = `${liwUrl('support.html')}?from=${encodeURIComponent(currentPage)}`;
  link.dataset.liwSupportLink = 'true';
  link.innerHTML = '<i data-lucide="life-buoy" size="18"></i> Support center';
  accountNav.insertBefore(link, accountNav.firstChild);

  if (window.lucide) lucide.createIcons();
}

setTimeout(mountLiwCompanyFooter, 0);
setTimeout(applyLiwWorkspaceBranding, 0);
setTimeout(mountLiwPlansBillingNavigation, 0);
setTimeout(mountLiwProgramNavigation, 0);
setTimeout(mountLiwSupportNavigation, 0);
setTimeout(mountLiwPlansBillingNavigation, 1200);
window.addEventListener('pageshow', mountLiwPlansBillingNavigation);

function applyLiwLaunchAvailabilityGates() {
  if (LIW_CONFIG.resellerPlansEnabled !== true) {
    document.querySelectorAll('[data-reseller-plan-card], [data-reseller-marketing]').forEach(element => {
      element.hidden = true;
    });
    document.querySelectorAll('a[href="reseller.html"], a[href="reseller.html#reseller-plans"]').forEach(link => {
      link.hidden = true;
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyLiwLaunchAvailabilityGates, { once: true });
} else {
  applyLiwLaunchAvailabilityGates();
}
