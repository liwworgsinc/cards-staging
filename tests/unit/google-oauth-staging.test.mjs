import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const login = read('login.html');
const register = read('register.html');
const auth = read('js/auth.js');
const callbackPage = read('auth-callback.html');
const callback = read('js/auth-callback.js');

test('login and registration expose a branded Google OAuth action', () => {
  assert.match(login, /data-oauth-provider="google"/);
  assert.match(register, /data-oauth-provider="google"/);
  assert.match(login, />Continue with Google</);
  assert.match(register, />Continue with Google</);
  assert.match(login, /Affiliate Program Agreement/);
  assert.match(register, /Affiliate Program Agreement/);
});

test('Google OAuth uses Supabase and returns through the LIW auth callback', () => {
  assert.match(auth, /supabaseClient\.auth\.signInWithOAuth/);
  assert.match(auth, /provider:\s*'google'/);
  assert.match(auth, /redirectTo:\s*AUTH_CALLBACK_URL/);
  assert.match(auth, /prompt:\s*'select_account'/);
  assert.match(auth, /liw_oauth_provider/);
  assert.match(auth, /liw_cards_after_login/);
});

test('Google clickwrap consent is persisted into Supabase user metadata', () => {
  assert.match(callback, /syncOAuthLegalMetadata/);
  assert.match(callback, /terms_accepted_at/);
  assert.match(callback, /privacy_accepted_at/);
  assert.match(callback, /affiliate_terms_accepted_at/);
  assert.match(callback, /oauth_consent_source/);
  assert.match(callback, /google_clickwrap/);
});

test('Google callback preserves new-user, guest, pricing and team-invite routing', () => {
  assert.match(callback, /isRecentlyCreatedUser/);
  assert.match(callback, /googleSignupFlow/);
  assert.match(callback, /claimGuestDraftForUser/);
  assert.match(callback, /pricingResumeUrl/);
  assert.match(callback, /accept_workspace_invites/);
  assert.match(callback, /invitation belongs to/);
  assert.match(callback, /Signed in with Google/);
});

test('callback page is provider-neutral for email and Google auth', () => {
  assert.match(callbackPage, /<h1>Signing you in<\/h1>/);
  assert.match(callbackPage, /securely finish your LIW Digital Cards sign-in/);
  assert.match(callbackPage, /auth-callback\.js\?v=20260826-google1/);
});
