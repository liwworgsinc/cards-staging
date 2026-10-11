import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../../js/super-studio-hero-v4-staging.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../css/super-studio-hero-v4-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('Super Studio V4 collapses the cover as its scroll container moves',()=>{
  assert.match(js,/scrollParent/);
  assert.match(js,/ss-hero-collapsed/);
  assert.match(js,/addEventListener\('scroll'/);
  assert.match(js,/video\.pause\(\)/);
  assert.match(js,/video\.play\(\)/);
  assert.match(css,/\.ss-hero-v4-ready\.ss-hero-collapsed \.ss-hero/);
  assert.match(css,/position:sticky/);
  assert.match(css,/--ss-hero-compact:118px/);
});

test('Super Studio V4 gives the professional a larger premium profile treatment',()=>{
  assert.match(css,/width:clamp\(104px,27vw,118px\)/);
  assert.match(css,/outline:2px solid color-mix/);
  assert.match(css,/font-size:clamp\(1\.72rem,7vw,2\.35rem\)/);
  assert.match(css,/backdrop-filter:blur\(12px\)/);
  assert.match(css,/\.ss-identity>span/);
  assert.match(css,/\.ss-identity>em/);
});

test('Super Studio V4 hero runs in editor preview and public card',()=>{
  assert.match(editorLoader,/super-studio-hero-v4-staging\.js\?v=20261011-1/);
  assert.match(publicLoader,/super-studio-hero-v4-staging\.js\?v=20261011-1/);
  assert.match(js,/super-studio-hero-v4-staging\.css\?v=20261011-1/);
});

test('hero upgrade remains isolated to Super Studio',()=>{
  assert.match(js,/\.super-studio-experience/);
  assert.match(css,/\.super-studio-experience/);
  assert.doesNotMatch(css,/\.realtor-experience/);
  assert.doesNotMatch(css,/\.restaurant-experience/);
  assert.doesNotMatch(css,/\.showtime-experience/);
});
