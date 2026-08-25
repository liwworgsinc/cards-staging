import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const guest = readFileSync(new URL('../../js/guest-profile-photo-staging.js', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../../js/guest-builder-mobile-swipe-staging.js', import.meta.url), 'utf8');
const editorGuestPhoto = readFileSync(new URL('../../js/editor-guest-photo-staging.js', import.meta.url), 'utf8');
const tierHardening = readFileSync(new URL('../../js/editor-tier-hardening.js', import.meta.url), 'utf8');

test('guest builder offers a basic profile photo upload before signup', () => {
  assert.match(guest, /Profile photo/);
  assert.match(guest, /Upload photo/);
  assert.match(guest, /guest-profile-file/);
  assert.match(guest, /image\/jpeg,image\/png,image\/webp/);
  assert.match(guest, /5 \* 1024 \* 1024/);
});

test('guest profile photo is compressed and stored separately from the card payload', () => {
  assert.match(guest, /liw_guest_profile_photo_v1/);
  assert.match(guest, /canvas\.toDataURL\('image\/jpeg', 0\.86\)/);
  assert.match(guest, /maxSide = 900/);
  assert.doesNotMatch(guest, /digital_cards/);
});

test('guest photo immediately replaces initials in the live preview', () => {
  assert.match(guest, /guest-profile-live-photo/);
  assert.match(guest, /has-guest-photo/);
  assert.match(guest, /visibility:hidden/);
});

test('guest builder bootstraps the staging photo uploader', () => {
  assert.match(mobile, /guest-profile-photo-staging\.js\?v=20260825-1/);
});

test('authenticated editor uploads the guest photo to the normal profile image bucket', () => {
  assert.match(editorGuestPhoto, /storage\.from\('profile-images'\)\.upload/);
  assert.match(editorGuestPhoto, /getPublicUrl/);
  assert.match(editorGuestPhoto, /profileUrl = publicUrl/);
  assert.match(editorGuestPhoto, /field\('profile_image_url'\)/);
  assert.match(editorGuestPhoto, /await save\(\{ silent: true \}\)/);
  assert.match(editorGuestPhoto, /clearPhoto\(\)/);
});

test('editor staging bundle loads guest photo restoration after auth', () => {
  assert.match(tierHardening, /editor-guest-photo-staging\.js\?v=\$\{version\}/);
  assert.match(tierHardening, /20260825-guest-photo-1/);
});
