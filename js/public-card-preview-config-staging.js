// LIW Cards staging — authenticated private preview bootstrap.
// Unlike the normal public card route, this page intentionally reuses the signed-in
// editor session so public_card_by_slug can return the owner's unpublished draft.
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
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
window.supabaseClient = supabaseClient;
window.__LIW_PUBLIC_CARD_PRIVATE_PREVIEW__ = true;
