import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../../js/super-studio-hero-v4-staging.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../css/super-studio-hero-v4-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('Super Studio V7 compact header waits until the full hero has actually scrolled away',()=>{
  assert.match(js,/ss-hero-compact-bar/);
  assert.match(js,/heroBottom/);
  assert.match(js,/collapseLine=top\+78/);
  assert.match(js,/expandLine=top\+138/);
  assert.match(js,/heroBottom<=collapseLine/);
  assert.match(js,/heroBottom>=expandLine/);
  assert.match(css,/\.ss-hero-compact-bar\[aria-hidden="false"\]/);
  assert.match(css,/visibility:hidden/);
  assert.doesNotMatch(js,/delta>=118/);
});

test('Super Studio V7 provides a visible media fallback until video playback actually starts',()=>{
  assert.match(js,/video\.defaultMuted=true/);
  assert.match(js,/webkit-playsinline/);
  assert.match(js,/video\.preload='auto'/);
  assert.match(js,/ss-hero-video-poster/);
  assert.match(js,/button\.classList\.add\('is-visible'\)/);
  assert.match(js,/ss-hero-video-playing/);
  assert.match(css,/\.ss-hero-video-poster/);
  assert.match(css,/\.ss-hero-video-playing \.ss-hero-video-poster/);
  assert.match(css,/\.ss-video-play-toggle\.is-visible/);
});

test('Super Studio V7 removes mobile white seams around full bleed video',()=>{
  assert.match(css,/width:calc\(100% \+ 2px\)!important/);
  assert.match(css,/margin:0 0 0 -1px!important/);
  assert.match(css,/inset:-1px!important/);
  assert.match(css,/public-card\.super-studio-public-active/);
});

test('Super Studio V7 reserves clearance above the fixed bottom navigation',()=>{
  assert.match(css,/\.ss-app-screen\{padding-bottom:calc\(var\(--ss-v3-nav-h,72px\) \+ 30px\)!important\}/);
});

test('Super Studio V7 keeps the larger premium profile treatment',()=>{
  assert.match(css,/width:clamp\(104px,27vw,118px\)/);
  assert.match(css,/outline:2px solid color-mix/);
  assert.match(css,/font-size:clamp\(1\.72rem,7vw,2\.35rem\)/);
});

test('Super Studio V7 hero loads cache-safe in editor preview and public card',()=>{
  assert.match(editorLoader,/super-studio-hero-v4-staging\.js\?v=20261011-6/);
  assert.match(publicLoader,/super-studio-hero-v4-staging\.js\?v=20261011-6/);
  assert.match(js,/super-studio-hero-v4-staging\.css\?v=20261011-5/);
});

test('hero upgrade remains isolated to Super Studio',()=>{
  assert.match(js,/\.super-studio-experience/);
  assert.match(css,/\.super-studio-experience/);
  assert.doesNotMatch(css,/\.realtor-experience/);
  assert.doesNotMatch(css,/\.restaurant-experience/);
  assert.doesNotMatch(css,/\.showtime-experience/);
});
