import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const home = read('index.html');
const marketing = read('js/marketing.js');
const pricing = read('pricing.html');
const billing = read('js/billing.js');
const guest = read('js/guest-builder-staging.js');
const guestHtml = read('guest-builder.html');
const login = read('login.html');
const register = read('register.html');
const auth = read('js/auth.js');
const callbackPage = read('auth-callback.html');
const callback = read('js/auth-callback.js');
const editorTier = read('js/editor-tier-hardening.js');
const guestPhotoBridge = read('js/editor-guest-photo-staging.js');
const guestProductBridge = read('js/editor-guest-product-staging.js');

test('homepage free conversion CTAs enter the guest builder instead of registration', () => {
  assert.match(home, /href="guest-builder\.html\?from=home">Start free/);
  assert.match(home, /href="guest-builder\.html\?from=home">Create your card/);
  assert.match(home, /href="guest-builder\.html\?from=home">Create my card/);
  assert.doesNotMatch(home, /class="btn btn-primary" href="register\.html">Start free/);
  assert.match(marketing, /wireGuestBuilderHomeCtas/);
});

test('pricing Free enters guest builder while paid plans preserve pricing intent', () => {
  assert.match(pricing, /href="guest-builder\.html\?from=pricing">Start free/);
  assert.match(billing, /if \(plan === 'starter'\)/);
  assert.match(billing, /guest-builder\.html\?from=pricing/);
  assert.match(billing, /liw_cards_pending_plan/);
  assert.match(billing, /login\.html\?next=pricing/);
});

test('guest publish goes to signup and signed-in guest goes straight to the editor', () => {
  assert.match(guest, /register\.html\?guest=1/);
  assert.match(guest, /editor\.html\?welcome=1&guest_claim=1/);
  assert.match(guest, /liw_guest_signup_pending/);
  assert.match(guestHtml, /href="login\.html" id="guest-login-link"/);
  assert.match(guestHtml, /href="index\.html" aria-label="LIW Cards home"/);
});

test('login, register and callback load the fresh Google auth build while funnel assets remain pinned', () => {
  assert.match(login, /js\/auth\.js\?v=20260826-google1/);
  assert.match(register, /js\/auth\.js\?v=20260826-google1/);
  assert.match(callbackPage, /js\/auth-callback\.js\?v=20260826-google1/);
  assert.match(guestHtml, /guest-builder-staging\.js\?v=20260825-funnel1/);
  assert.match(guestHtml, /guest-builder-mobile-swipe-staging\.js\?v=20260825-funnel1/);
  assert.match(pricing, /js\/billing\.js\?v=20260825-funnel1/);
});

test('guest auth has priority and restores the saved browser card', () => {
  assert.match(auth, /claimGuestDraftForUser/);
  assert.match(auth, /liw_editor_draft_\$\{authUser\.id\}_new/);
  assert.match(auth, /guestClaimed \|\| next === 'guest-editor'/);
  assert.match(auth, /editor\.html\?welcome=1&guest_claim=1/);
  assert.match(register, /Your card draft is saved/);
  assert.match(register, /No Plus purchase is required/);
});

test('email verification preserves guest restore and paid pricing destinations', () => {
  assert.match(callback, /claimGuestDraftForUser/);
  assert.match(callback, /requestedPostAuthDestination/);
  assert.match(callback, /requestedNext === 'pricing'/);
  assert.match(callback, /pricingResumeUrl/);
  assert.match(callback, /Restoring the card you already built/);
  assert.match(callback, /editor\.html\?welcome=1&guest_claim=1/);
});

test('paid-plan new-account route returns to pricing after signup or verification', () => {
  assert.match(auth, /register\.html\?next=pricing/);
  assert.match(auth, /requestedNext === 'pricing'/);
  assert.match(auth, /Returning to the plan you were viewing/);
  assert.match(auth, /pricingResumeUrl\(\)/);
  assert.match(callback, /Returning to the plan you were viewing/);
});

test('guest photo and one-product bridges are attached to the authenticated editor', () => {
  assert.match(editorTier, /editor-guest-photo-staging\.js/);
  assert.match(editorTier, /editor-guest-product-staging\.js/);
  assert.match(guestPhotoBridge, /profile-images/);
  assert.match(guestPhotoBridge, /profile_position_x/);
  assert.match(guestPhotoBridge, /profile_position_y/);
  assert.match(guestPhotoBridge, /profile_zoom/);
  assert.match(guestProductBridge, /liw_guest_product_pending_v1/);
  assert.match(guestProductBridge, /will not appear on a Free card/);
  assert.match(guestProductBridge, /hasEntitlement\('product_showcase'\)/);
});

test('Free publishing never turns the guest Plus product on', () => {
  assert.match(guest, /products_enabled:\s*false/);
  assert.match(guest, /draft\.products = \[\]/);
  assert.match(guestProductBridge, /if \(!cleaned \|\| !canUseProducts\(\)\) return/);
});
