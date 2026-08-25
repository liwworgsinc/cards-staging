import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const guest = readFileSync(new URL('../../js/guest-profile-photo-staging.js', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../../js/guest-builder-mobile-swipe-staging.js', import.meta.url), 'utf8');
const editorGuestPhoto = readFileSync(new URL('../../js/editor-guest-photo-staging.js', import.meta.url), 'utf8');
const tierHardening = readFileSync(new URL('../../js/editor-tier-hardening.js', import.meta.url), 'utf8');

test('guest builder offers a profile photo upload before signup', () => {
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

test('guest crop uses the same LIW editor defaults and bounded crop transform', () => {
  assert.match(guest, /DEFAULT_POSITION = \{ x: 50, y: 22, zoom: 125 \}/);
  assert.match(guest, /function profileCropTransform/);
  assert.match(guest, /const maxTranslate = \(\(zoom - 1\) \/ \(2 \* zoom\)\) \* 100/);
  assert.match(guest, /scale\(\$\{zoom\}\) translate/);
});

test('guest crop supports drag, left-right, up-down, zoom and reset', () => {
  assert.match(guest, /guest-profile-crop-stage/);
  assert.match(guest, /guest-profile-position-x/);
  assert.match(guest, /guest-profile-position-y/);
  assert.match(guest, /guest-profile-zoom/);
  assert.match(guest, /guest-profile-crop-reset/);
  assert.match(guest, /pointerdown/);
  assert.match(guest, /pointermove/);
  assert.match(guest, /setPointerCapture/);
});

test('mobile swipe does not steal gestures from profile crop controls', () => {
  assert.match(mobile, /guest-profile-crop-stage/);
  assert.match(mobile, /guest-profile-crop-controls/);
});

test('guest builder bootstraps the crop-capable staging photo uploader', () => {
  assert.match(mobile, /guest-profile-photo-staging\.js\?v=20260825-2/);
});

test('authenticated editor uploads the guest photo and preserves crop settings', () => {
  assert.match(editorGuestPhoto, /storage\.from\('profile-images'\)\.upload/);
  assert.match(editorGuestPhoto, /getPublicUrl/);
  assert.match(editorGuestPhoto, /profileUrl = publicUrl/);
  assert.match(editorGuestPhoto, /field\('profile_image_url'\)/);
  assert.match(editorGuestPhoto, /record\.positionX \?\? 50/);
  assert.match(editorGuestPhoto, /record\.positionY \?\? 22/);
  assert.match(editorGuestPhoto, /record\.zoom \?\? 125/);
  assert.match(editorGuestPhoto, /await save\(\{ silent: true \}\)/);
  assert.match(editorGuestPhoto, /clearPhoto\(\)/);
});

test('editor staging bundle loads guest photo restoration after auth', () => {
  assert.match(tierHardening, /editor-guest-photo-staging\.js\?v=\$\{version\}/);
  assert.match(tierHardening, /20260825-guest-photo-1/);
});
