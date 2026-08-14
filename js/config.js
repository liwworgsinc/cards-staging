const LIW_CONFIG = {
  supabaseUrl: "https://nfwqcilqmqruysovjuyj.supabase.co",
  supabaseKey: "sb_publishable_30SO9QdTrtkp1ATapt7nnQ_QHOmXu49",
  resellerPlansEnabled: false,
  oneTimeServicesEnabled: false
};

// Keep the production URL explicit for production-only checks and public configuration.
// On staging/localhost, internal navigation must remain on the current test origin so
// browser automation and manual QA never jump into the live site by accident.
const LIW_PRODUCTION_URL = new URL("https://cards.liwworgs.com/");
const LIW_IS_GITHUB_STAGING =
  location.hostname === 'liwworgsinc.github.io' &&
  location.pathname.startsWith('/cards-staging/');
const LIW_IS_NON_PRODUCTION =
  LIW_IS_GITHUB_STAGING ||
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1' ||
  location.hostname.startsWith('staging.') ||
  location.hostname.startsWith('test.') ||
  location.hostname.endsWith('.vercel.app');
const LIW_TEST_URL = LIW_IS_GITHUB_STAGING
  ? new URL('/cards-staging/', location.origin)
  : new URL(`${location.origin}/`);
const LIW_CANONICAL_URL = LIW_IS_NON_PRODUCTION ? LIW_TEST_URL : LIW_PRODUCTION_URL;
const liwUrl = (path = "") => new URL(path, LIW_CANONICAL_URL).href;

const supabaseClient = window.supabase.createClient(
  LIW_CONFIG.supabaseUrl,
  LIW_CONFIG.supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
