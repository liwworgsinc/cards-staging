import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const guestHtml = readFileSync(new URL('../../guest-builder.html', import.meta.url), 'utf8');
const guestJs = readFileSync(new URL('../../js/guest-builder-staging.js', import.meta.url), 'utf8');
const authJs = readFileSync(new URL('../../js/auth.js', import.meta.url), 'utf8');
const callbackJs = readFileSync(new URL('../../js/auth-callback.js', import.meta.url), 'utf8');
const registerHtml = readFileSync(new URL('../../register.html', import.meta.url), 'utf8');

test('guest builder lets visitors build before signup', () => {
  assert.match(guestHtml, /Build your card first\./);
  assert.match(guestHtml, /No signup yet/);
  assert.match(guestHtml, /Publish my card/);
  assert.match(guestHtml, /register\.html\?guest=1|guest-builder-staging\.js/);
});

test('guest builder intentionally excludes Products and other paid card tools', () => {
  assert.doesNotMatch(guestHtml, /id="add-product"|id="product-list"|Product Showcase|Add products/i);
  assert.match(guestHtml, /does not show Products or other Plus-only tools/i);
  assert.match(guestJs, /products_enabled:\s*false/);
  assert.match(guestJs, /products:\s*\[\]/);
  assert.match(guestJs, /services_enabled:\s*false/);
  assert.match(guestJs, /cover_image_url:\s*''/);
  assert.match(guestJs, /template_id:\s*''/);
});

test('guest draft is browser-saved and handed to the authenticated editor', () => {
  assert.match(guestJs, /liw_guest_card_draft_v1/);
  assert.match(guestJs, /localStorage\.setItem\(GUEST_DRAFT_KEY/);
  assert.match(guestJs, /liw_editor_draft_\$\{user\.id\}_new/);
  assert.match(guestJs, /register\.html\?guest=1/);
  assert.match(guestJs, /editor\.html\?welcome=1&guest_claim=1/);
});

test('register and login auth claim the guest draft without forcing a paid plan', () => {
  assert.match(authJs, /claimGuestDraftForUser/);
  assert.match(authJs, /liw_editor_draft_\$\{authUser\.id\}_new/);
  assert.match(authJs, /draft\.card\.products_enabled = false/);
  assert.match(authJs, /guest-editor/);
  assert.doesNotMatch(authJs, /guest.*checkout|guest.*plus.*purchase/i);
});

test('email verification restores the guest card in the same browser', () => {
  assert.match(callbackJs, /claimGuestDraftForUser/);
  assert.match(callbackJs, /Restoring the card you already built/);
  assert.match(callbackJs, /guest-editor/);
  assert.match(callbackJs, /editor\.html\?welcome=1&guest_claim=1/);
});

test('guest signup screen tells the visitor their existing card is being saved', () => {
  assert.match(registerHtml, /Save and publish your card/);
  assert.match(registerHtml, /Your card draft is saved/);
  assert.match(registerHtml, /No Plus purchase is required/);
  assert.match(registerHtml, /Save my card & create account/);
});
