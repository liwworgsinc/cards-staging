import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../../js/super-studio-hero-v4-staging.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../css/super-studio-hero-v4-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('Super Studio V5 collapses from a stable sentinel instead of changing hero geometry',()=>{
  assert.match(js,/ss-hero-collapse-sentinel/);
  assert.match(js,/sentinelTop/);
  assert.match(js,/collapseLine/);
  assert.match(js,/expandLine/);
  assert.match(js,/document\.addEventListener\('scroll',scheduleSync,true\)/);
  assert.match(js,/ss-hero-collapsed/);
  assert.match(js,/video\.pause\(\)/);
  assert.match(js,/video\.play\(\)/);
  assert.match(css,/\.ss-hero-v4-ready\.ss-hero-collapsed \.ss-hero/);
  assert.match(css,/position:sticky!important/);
  assert.match(css,/--ss-hero-compact:118px/);
  assert.doesNotMatch(js,/collapseAt:start\+120/);
});

test('Super Studio V5 recovers a saved video cover from Super Studio state',()=>{
  assert.match(js,/super_studio_state_staging/);
  assert.match(js,/videoCoverUrl/);
  assert.match(js,/ensureVideoElement/);
  assert.match(js,/loadeddata/);
  assert.match(js,/canplay/);
  assert.match(css,/\.ss-hero-video\{/);
  assert.match(css,/object-fit:cover!important/);
  assert.match(css,/border-radius:0!important/);
});

test('Super Studio V5 gives the professional a larger premium profile treatment',()=>{
  assert.match(css,/width:clamp\(104px,27vw,118px\)/);
  assert.match(css,/outline:2px solid color-mix/);
  assert.match(css,/font-size:clamp\(1\.72rem,7vw,2\.35rem\)/);
  assert.match(css,/backdrop-filter:blur\(12px\)/);
  assert.match(css,/\.ss-identity>span/);
  assert.match(css,/\.ss-identity>em/);
});

test('Super Studio V5 removes white seams around full-bleed media',()=>{
  assert.match(css,/overflow-x:clip!important/);
  assert.match(css,/background:#07090d!important/);
  assert.match(css,/width:100%!important/);
  assert.match(css,/max-width:none!important/);
  assert.match(css,/margin:0!important/);
});

test('Super Studio V5 hero runs in editor preview and public card',()=>{
  assert.match(editorLoader,/super-studio-hero-v4-staging\.js\?v=20261011-3/);
  assert.match(publicLoader,/super-studio-hero-v4-staging\.js\?v=20261011-3/);
  assert.match(js,/super-studio-hero-v4-staging\.css\?v=20261011-3/);
});

test('hero upgrade remains isolated to Super Studio',()=>{
  assert.match(js,/\.super-studio-experience/);
  assert.match(css,/\.super-studio-experience/);
  assert.doesNotMatch(css,/\.realtor-experience/);
  assert.doesNotMatch(css,/\.restaurant-experience/);
  assert.doesNotMatch(css,/\.showtime-experience/);
});
