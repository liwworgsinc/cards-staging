const LIW_CONFIG = {
  supabaseUrl: "https://nfwqcilqmqruysovjuyj.supabase.co",
  supabaseKey: "sb_publishable_30SO9QdTrtkp1ATapt7nnQ_QHOmXu49",
  resellerPlansEnabled: false,
  oneTimeServicesEnabled: false
};

// Keep the production URL explicit for production-only checks and public configuration.
// On staging/localhost, internal navigation must remain on the current test origin so
// browser automation and manual QA never jump into the live site by accident.
// Connected Agency exports can also be opened directly from disk (file://). In that
// case location.origin is the literal string "null", so use the document base URL
// injected by the exporter instead of trying to construct new URL("null/").
const LIW_PRODUCTION_URL = new URL("https://cards.liwworgs.com/");
const LIW_IS_GITHUB_STAGING =
  location.hostname === 'liwworgsinc.github.io' &&
  location.pathname.startsWith('/cards-staging/');
const LIW_IS_FILE_EXPORT = location.protocol === 'file:';
const LIW_IS_AUTH_CALLBACK = /\/auth-callback(?:\.html)?$/.test(location.pathname);
const LIW_IS_NON_PRODUCTION =
  LIW_IS_GITHUB_STAGING ||
  LIW_IS_FILE_EXPORT ||
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1' ||
  location.hostname.startsWith('staging.') ||
  location.hostname.startsWith('test.') ||
  location.hostname.endsWith('.vercel.app');
const LIW_TEST_URL = LIW_IS_GITHUB_STAGING
  ? new URL('/cards-staging/', location.origin)
  : LIW_IS_FILE_EXPORT
    ? new URL('./', document.baseURI)
    : new URL(`${location.origin}/`);
const LIW_CANONICAL_URL = LIW_IS_NON_PRODUCTION ? LIW_TEST_URL : LIW_PRODUCTION_URL;
const liwUrl = (path = "") => new URL(path, LIW_CANONICAL_URL).href;

const supabaseClient = window.supabase.createClient(
  LIW_CONFIG.supabaseUrl,
  LIW_CONFIG.supabaseKey,
  {
    auth: {
      persistSession: !LIW_IS_FILE_EXPORT,
      autoRefreshToken: !LIW_IS_FILE_EXPORT,
      // auth-callback.js owns PKCE/OTP processing on the callback page. Letting the
      // SDK auto-detect the same code at the same time can contend for the auth lock
      // and leave customers staring at "Signing you in" for minutes.
      detectSessionInUrl: !LIW_IS_FILE_EXPORT && !LIW_IS_AUTH_CALLBACK
    }
  }
);

// Shared helpers intentionally resolve the client through window. Expose the exact
// authenticated client used by the app so feature modules never create a second session.
window.supabaseClient = supabaseClient;

// The old staging route is kept only as a compatibility URL. Customers should see one
// earning experience and one name: Earn with LIW.
if (LIW_IS_GITHUB_STAGING && /\/affiliate-dashboard(?:\.html)?$/.test(location.pathname)) {
  location.replace(liwUrl('earn-with-liw.html'));
}

// Staging only: authenticated workspace pages that render the standard sidebar receive
// the premium sidebar shell and the database-backed Earn with LIW flow. Public marketing
// pages intentionally do not load these workspace scripts.
(function mountPremiumStagingSidebarAssets(){
  if (!LIW_IS_GITHUB_STAGING) return;

  const cleanLegacySidebarEntries = () => {
    document.querySelectorAll('.dashboard-tool-grid a[href="affiliate-dashboard.html"]').forEach(tool => tool.remove());
    document.querySelectorAll('.sidebar a[href="affiliate-dashboard.html"],.sidebar a[data-liw-program-link="affiliate"]').forEach(link => link.remove());
    document.querySelectorAll('.sidebar a[data-liw-program-link="admin-white-label"],.sidebar a[href="hire-designer.html"]').forEach(link => link.remove());

    const agencyLinks = [...document.querySelectorAll('.sidebar a[data-liw-program-link="agency-workspace"],.sidebar a[href="agency-dashboard.html"]')];
    if (agencyLinks.length > 1) {
      const keep = agencyLinks.find(link => link.dataset.liwProgramLink === 'agency-workspace') || agencyLinks[0];
      agencyLinks.forEach(link => { if (link !== keep) link.remove(); });
    }

    const earnTools = [...document.querySelectorAll('.dashboard-tool-grid a[href="earn-with-liw.html"]')];
    earnTools.slice(1).forEach(tool => tool.remove());

    document.querySelectorAll('a,button').forEach(element => {
      const label = String(element.textContent || '').trim().toLowerCase();
      if (label === 'affiliate dashboard' || label === 'white-label lab') element.remove();
    });
  };

  const mountEarnWithLiw = () => {
    if (document.querySelector('script[data-earn-with-liw-staging],script[src*="earn-with-liw-staging.js"]')) return;
    const script = document.createElement('script');
    script.src = liwUrl('js/earn-with-liw-staging.js?v=20260827-earn-4');
    script.dataset.earnWithLiwStaging = 'true';
    document.body.appendChild(script);
  };

  const mountBusinessToolsRestore = () => {
    if (document.querySelector('script[data-business-tools-restore-staging]')) return;
    const script = document.createElement('script');
    script.src = liwUrl('js/business-tools-restore-staging.js?v=20260905-designerflow-2');
    script.dataset.businessToolsRestoreStaging = 'true';
    document.body.appendChild(script);
  };

  const mountReadableSidebar = () => {
    if (document.querySelector('link[data-readable-sidebar-staging]')) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = liwUrl('css/sidebar-readable-staging.css?v=20260830-readable-1');
    stylesheet.dataset.readableSidebarStaging = 'true';
    document.head.appendChild(stylesheet);
  };

  const mount = () => {
    // Critical: do not mount workspace-only scripts on the public homepage/marketing pages.
    if (!document.querySelector('.sidebar')) return;

    cleanLegacySidebarEntries();
    mountEarnWithLiw();

    if (!document.querySelector('link[data-premium-sidebar], link[data-liw-premium-sidebar]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = liwUrl('css/sidebar-premium-staging.css?v=20260830-main-sidebar-1');
      stylesheet.dataset.premiumSidebar = 'true';
      document.head.appendChild(stylesheet);
    }

    if (!document.querySelector('script[data-premium-sidebar-script]')) {
      const script = document.createElement('script');
      script.src = liwUrl('js/sidebar-premium-staging.js?v=20260830-main-sidebar-1');
      script.dataset.premiumSidebarScript = 'true';
      document.body.appendChild(script);
    }

    mountBusinessToolsRestore();
    mountReadableSidebar();
    cleanLegacySidebarEntries();

    if (!document.querySelector('link[data-premium-sidebar-mobile]')) {
      const mobileStylesheet = document.createElement('link');
      mobileStylesheet.rel = 'stylesheet';
      mobileStylesheet.href = liwUrl('css/sidebar-mobile-staging.css?v=20260830-main-sidebar-1');
      mobileStylesheet.dataset.premiumSidebarMobile = 'true';
      document.head.appendChild(mobileStylesheet);
    }

    if (!document.querySelector('script[data-premium-sidebar-mobile-script]')) {
      const mobileScript = document.createElement('script');
      mobileScript.src = liwUrl('js/sidebar-mobile-staging.js?v=20260830-main-sidebar-1');
      mobileScript.dataset.premiumSidebarMobileScript = 'true';
      document.body.appendChild(mobileScript);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  setTimeout(mount, 350);
  setTimeout(mount, 1000);
})();

// Staging platform analytics. The homepage owns its own delayed analytics mount so its
// card rotation can initialize first without competing script/network work.
(function mountStagingPlatformAnalytics(){
  if (!LIW_IS_GITHUB_STAGING) return;

  const page = String(location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (page !== 'index.html' && !document.querySelector('script[data-liw-site-analytics]')) {
    const tracker = document.createElement('script');
    tracker.src = liwUrl('js/site-analytics-staging.js?v=20260827-2');
    tracker.dataset.liwSiteAnalytics = 'true';
    document.head.appendChild(tracker);
  }

  if (page !== 'admin.html') return;

  if (!document.querySelector('link[data-liw-platform-analytics]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = liwUrl('css/admin-platform-analytics-staging.css?v=20260827-2');
    styles.dataset.liwPlatformAnalytics = 'true';
    document.head.appendChild(styles);
  }

  if (!document.querySelector('script[data-liw-platform-analytics]')) {
    const dashboard = document.createElement('script');
    dashboard.src = liwUrl('js/admin-platform-analytics-staging.js?v=20260827-2');
    dashboard.dataset.liwPlatformAnalytics = 'true';
    document.body.appendChild(dashboard);
  }
})();

// Staging-only editor for the public Hire a Designer page. Keeping this loader in
// config.js means the existing admin shell can receive the control panel without
// changing production-facing admin markup.
(function mountStagingHireDesignerAdmin(){
  if (!LIW_IS_GITHUB_STAGING) return;
  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  if (page !== 'admin.html') return;

  if (!document.querySelector('link[data-liw-designer-admin]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = liwUrl('css/admin-hire-designer-staging.css?v=20260905-designerflow-2');
    styles.dataset.liwDesignerAdmin = 'true';
    document.head.appendChild(styles);
  }

  if (!document.querySelector('script[data-liw-designer-admin]')) {
    const script = document.createElement('script');
    script.src = liwUrl('js/admin-hire-designer-staging.js?v=20260905-designerflow-2');
    script.dataset.liwDesignerAdmin = 'true';
    document.body.appendChild(script);
  }
})();

// Staging-only Super Admin customer plan controls. The server action is also restricted
// to the staging origin/header, so production cannot invoke these controls accidentally.
(function mountStagingAdminPlanOverrides(){
  if (!LIW_IS_GITHUB_STAGING) return;
  const page = String(location.pathname.split('/').pop() || '').toLowerCase();
  if (page !== 'admin.html') return;

  if (!document.querySelector('link[data-liw-admin-plan-overrides]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = liwUrl('css/admin-plan-overrides-staging.css?v=20260904-1');
    styles.dataset.liwAdminPlanOverrides = 'true';
    document.head.appendChild(styles);
  }

  if (!document.querySelector('script[data-liw-admin-plan-overrides]')) {
    const script = document.createElement('script');
    script.src = liwUrl('js/admin-plan-overrides-staging.js?v=20260904-1');
    script.dataset.liwAdminPlanOverrides = 'true';
    document.body.appendChild(script);
  }
})();
