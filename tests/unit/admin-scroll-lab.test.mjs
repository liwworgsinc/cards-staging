import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lab = readFileSync(new URL('../../js/public-admin-scroll-lab-staging.js', import.meta.url), 'utf8');
const controller = readFileSync(new URL('../../js/public-card-enhancements-staging.js', import.meta.url), 'utf8');

test('Admin Scroll Lab is opt-in only', () => {
  assert.match(lab, /params\.get\('liwAdminScroll'\)!=='1'/);
  assert.match(controller, /get\('liwAdminScroll'\)==='1'/);
  assert.match(controller, /public-admin-scroll-lab-staging\.js/);
});

test('Admin Scroll Lab does not persist card data or replace a customer theme', () => {
  assert.doesNotMatch(lab, /from\(['"][^'"]+['"]\)\.(insert|upsert|update|delete)/);
  assert.doesNotMatch(lab, /card_experience\s*=/);
  assert.doesNotMatch(lab, /card_layout\s*=/);
});

test('Admin Scroll Lab supports accessibility and performant scroll motion', () => {
  assert.match(lab, /prefers-reduced-motion:\s*reduce/);
  assert.match(lab, /requestAnimationFrame\(updateScrollState\)/);
  assert.match(lab, /IntersectionObserver/);
  assert.match(lab, /\{passive:true\}/);
});
