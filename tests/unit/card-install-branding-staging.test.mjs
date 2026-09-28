import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const card = read('card.html');
const share = read('js/public-card-share-home.js');
const installer = read('js/pwa-install.js');
const worker = read('service-worker.js');
const manifest = read('supabase/functions/card-manifest-staging/index.ts');
const icon = read('supabase/functions/card-icon-staging/index.ts');

test('staging pages link isolated profile-photo manifest, not production backend', () => {
  assert.match(card, /functions\/v1\/card-manifest-staging/);
  assert.match(share, /functions\/v1\/card-manifest-staging/);
  assert.doesNotMatch(card, /functions\/v1\/card-manifest'/);
  assert.match(manifest, /if \(!staging\)/);
});
test('manifest uses effective plan, not QR logo entitlement', () => {
  assert.match(manifest, /rpc\("public_card_plan_key"/);
  assert.match(manifest, /planKey !== "starter"/);
  assert.match(manifest, /profile_image_url/);
  assert.doesNotMatch(manifest, /qr_logo_url/);
  assert.doesNotMatch(manifest, /custom_qr/);
  assert.match(manifest, /if \(paid\) \{/);
  assert.match(manifest, /card-icon-staging/);
  assert.match(manifest, /src: liw192/);
  assert.match(manifest, /src: liw512/);
});
test('image endpoint denies Free, converts paid photo to PNG, never fetches arbitrary URL', () => {
  assert.match(icon, /planKey === "starter"/);
  assert.match(icon, /eq\("status", "published"\)/);
  assert.match(icon, /permittedProfileSource/);
  assert.match(icon, /\/storage\/v1\/object\/public\/profile-images\//);
  assert.match(icon, /MagickFormat\.Png/);
  assert.match(icon, /image\.resetPage\(\)/);
  assert.match(icon, /neutralProfilePng/);
  assert.match(icon, /X-LIW-Icon-Source/);
  assert.doesNotMatch(icon, /qr_logo_url/);
});
test('share drawer and Apple home icon follow the same manifest image', () => {
  assert.match(share, /refreshPreferredInstallIcon\(\);/);
  assert.match(share, /manifest\.liw_icon_source/);
  assert.match(share, /apple\.href = preferredIcon\.url/);
  assert.doesNotMatch(share, /getElementById\('qr-logo'\)/);
});
test('published top-level card has a staging-scoped worker, previews excluded', () => {
  assert.match(installer, /\/cards-staging\/service-worker\.js/);
  assert.match(installer, /scope: '\/cards-staging\/'/);
  assert.match(installer, /p\.has\('editor_preview'\)/);
  assert.match(installer, /window\.self !== window\.top/);
  assert.match(worker, /respondWith\(fetch\(event\.request\)\)/);
  assert.doesNotMatch(worker, /caches\.open/);
});
