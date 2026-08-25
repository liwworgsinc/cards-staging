import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const parity = readFileSync(new URL('../../js/guest-profile-thumb-parity-staging.js', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../../js/guest-builder-mobile-swipe-staging.js', import.meta.url), 'utf8');

test('guest editor thumbnail uses the same absolute image geometry as the card avatar', () => {
  assert.match(parity, /#guest-profile-photo-thumb img\{position:absolute!important;inset:0!important/);
  assert.match(parity, /object-fit:cover!important/);
  assert.match(parity, /object-position:50% 50%!important/);
  assert.match(parity, /transform-origin:center center!important/);
});

test('thumbnail and card preview are synchronized from one crop record', () => {
  assert.match(parity, /liw_guest_profile_photo_v1/);
  assert.match(parity, /guest-profile-photo-thumb/);
  assert.match(parity, /guest-profile-live-photo/);
  assert.match(parity, /image\.style\.transform = transform/);
});

test('guest builder loads the staging thumbnail parity fix', () => {
  assert.match(mobile, /guest-profile-thumb-parity-staging\.js\?v=20260825-1/);
});
