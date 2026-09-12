import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const motion = readFileSync(new URL('../../js/public-admin-scroll-motion-v2-staging.js', import.meta.url), 'utf8');
const bootstrap = readFileSync(new URL('../../js/public-admin-scroll-bootstrap-staging.js', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../../js/public-card-enhancements-staging.js', import.meta.url), 'utf8');

test('LIW Lab Motion V2 stays behind the admin lab preview flag', () => {
  assert.match(motion, /get\('liwAdminScroll'\) !== '1'/);
  assert.match(bootstrap, /public-admin-scroll-motion-v2-staging\.js/);
  assert.match(controller, /public-admin-scroll-motion-v2-staging\.js/);
});

test('LIW Lab Motion V2 is visual-only and never persists customer fields', () => {
  assert.doesNotMatch(motion, /supabase/i);
  assert.doesNotMatch(motion, /\.from\(/);
  assert.doesNotMatch(motion, /card_experience\s*=/);
  assert.doesNotMatch(motion, /card_layout\s*=/);
  assert.doesNotMatch(motion, /template_id\s*=/);
});

test('LIW Lab Motion V2 has scroll-linked premium motion', () => {
  assert.match(motion, /--liw-v2-hero/);
  assert.match(motion, /--liw-section-distance/);
  assert.match(motion, /--liw-product-offset/);
  assert.match(motion, /--liw-service-depth/);
  assert.match(motion, /liwV2DockSpring/);
  assert.match(motion, /liwV2SceneFlash/);
  assert.match(motion, /requestAnimationFrame\(updateMotion\)/);
});

test('LIW Lab Motion V2 respects reduced-motion accessibility', () => {
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.match(motion, /reduceMotion/);
  assert.match(motion, /\{ passive: true \}/);
});
