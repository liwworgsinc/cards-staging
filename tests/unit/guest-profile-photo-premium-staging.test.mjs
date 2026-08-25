import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const premium = readFileSync(new URL('../../js/guest-profile-photo-premium-staging.js', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../../js/guest-builder-mobile-swipe-staging.js', import.meta.url), 'utf8');

test('guest crop is presented as a focused premium dialog', () => {
  assert.match(premium, /guest-photo-modal/);
  assert.match(premium, /Make your photo look sharp/);
  assert.match(premium, /Use this photo/);
  assert.match(premium, /Choose another/);
});

test('technical inline crop controls are hidden from the conversion funnel', () => {
  assert.match(premium, /#guest-profile-photo-upload \.guest-profile-crop\{display:none!important\}/);
  assert.match(premium, /Fine tune/);
});

test('premium crop keeps editor-compatible position and zoom values', () => {
  assert.match(premium, /DEFAULTS = \{ x: 50, y: 22, zoom: 125 \}/);
  assert.match(premium, /positionX/);
  assert.match(premium, /positionY/);
  assert.match(premium, /zoom/);
  assert.match(premium, /maxTranslate/);
});

test('photo can be dragged and zoomed without exposing engineering controls', () => {
  assert.match(premium, /pointerdown/);
  assert.match(premium, /pointermove/);
  assert.match(premium, /guest-photo-premium-zoom/);
  assert.match(premium, /Drag photo to position your face/);
});

test('mobile guest bundle loads the premium crop layer', () => {
  assert.match(mobile, /guest-profile-photo-premium-staging\.js\?v=20260825-1/);
  assert.match(mobile, /data-guest-profile-photo-premium/);
});
