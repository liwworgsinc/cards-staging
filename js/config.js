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
      detectSessionInUrl: !LIW_IS_FILE_EXPORT
    }
  }
);

// Shared helpers intentionally resolve the client through window. Expose the exact
// authenticated client used by the app so feature modules never create a second session.
window.supabaseClient = supabaseClient;

// Staging only: every authenticated workspace page that renders the standard sidebar
// should receive the same premium sidebar shell and the database-backed Earn with LIW flow.
(function mountPremiumStagingSidebarAssets(){
  if (!LIW_IS_GITHUB_STAGING) return;

  const cleanEarningDuplicates = () => {
    const tools = [...document.querySelectorAll('.dashboard-tool-grid a[href="affiliate-dashboard.html"], .dashboard-tool-grid a[href="earn-with-liw.html"]')];
    tools.slice(1).forEach(tool => tool.remove());
  };

  const mountEarnWithLiw = () => {
    if (document.querySelector('script[data-earn-with-liw-staging],script[src*="earn-with-liw-staging.js"]')) return;
    const script = document.createElement('script');
    script.src = liwUrl('js/earn-with-liw-staging.js?v=20260827-earn-3');
    script.dataset.earnWithLiwStaging = 'true';
    document.body.appendChild(script);
  };

  const mount = () => {
    cleanEarningDuplicates();
    mountEarnWithLiw();
    if (!document.querySelector('.sidebar')) return;

    if (!document.querySelector('link[data-premium-sidebar], link[data-liw-premium-sidebar]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = liwUrl('css/sidebar-premium-staging.css?v=20260825-global-5');
      stylesheet.dataset.premiumSidebar = 'true';
      document.head.appendChild(stylesheet);
    }

    if (!document.querySelector('script[data-premium-sidebar-script]')) {
      const script = document.createElement('script');
      script.src = liwUrl('js/sidebar-premium-staging.js?v=20260825-global-5');
      script.dataset.premiumSidebarScript = 'true';
      document.body.appendChild(script);
    }

    if (!document.querySelector('link[data-premium-sidebar-mobile]')) {
      const mobileStylesheet = document.createElement('link');
      mobileStylesheet.rel = 'stylesheet';
      mobileStylesheet.href = liwUrl('css/sidebar-mobile-staging.css?v=20260826-mobile-3');
      mobileStylesheet.dataset.premiumSidebarMobile = 'true';
      document.head.appendChild(mobileStylesheet);
    }

    if (!document.querySelector('script[data-premium-sidebar-mobile-script]')) {
      const mobileScript = document.createElement('script');
      mobileScript.src = liwUrl('js/sidebar-mobile-staging.js?v=20260826-mobile-3');
      mobileScript.dataset.premiumSidebarMobileScript = 'true';
      document.body.appendChild(mobileScript);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }

  // A few workspace shells finish mounting after auth/page scripts. These retries are
  // guarded by data attributes, so they cannot duplicate the sidebar assets.
  setTimeout(mount, 350);
  setTimeout(mount, 1000);
})();
