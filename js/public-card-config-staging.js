// LIW Cards — staging public-card bootstrap.
// Customer-facing public cards use an anonymous client so dashboard/login auth state
// can never block a published card from rendering.
const LIW_CONFIG = {
  supabaseUrl: 'https://nfwqcilqmqruysovjuyj.supabase.co',
  supabaseKey: 'sb_publishable_30SO9QdTrtkp1ATapt7nnQ_QHOmXu49',
  resellerPlansEnabled: false,
  oneTimeServicesEnabled: false
};
const LIW_PRODUCTION_URL = new URL('https://cards.liwworgs.com/');
const LIW_IS_GITHUB_STAGING = location.hostname === 'liwworgsinc.github.io' && location.pathname.startsWith('/cards-staging/');
const LIW_CANONICAL_URL = LIW_IS_GITHUB_STAGING ? new URL('/cards-staging/', location.origin) : new URL(`${location.origin}/`);
const liwUrl = (path = '') => new URL(path, LIW_CANONICAL_URL).href;
const supabaseClient = window.supabase.createClient(LIW_CONFIG.supabaseUrl, LIW_CONFIG.supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'liw-public-card-anonymous'
  }
});
window.supabaseClient = supabaseClient;
window.__LIW_PUBLIC_CARD_ANONYMOUS_CLIENT__ = true;
