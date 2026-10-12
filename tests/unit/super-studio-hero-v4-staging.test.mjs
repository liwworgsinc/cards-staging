import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../../js/super-studio-hero-v4-staging.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../css/super-studio-hero-v4-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('Super Studio V6 uses a separate compact header instead of shrinking the live video hero',()=>{
  assert.match(js,/ss-hero-compact-bar/);
  assert.match(js,/delta>=118/);
  assert.match(js,/delta<=38/);
  assert.match(css,/\.ss-hero-collapsed \.ss-hero-compact-bar/);
  assert.match(css,/position:fixed/);
  assert.doesNotMatch(css,/\.ss-hero-collapsed \.ss-hero\{[^}]*min-height/s);
});

test('Super Studio V6 configures video for iOS Safari autoplay and provides a play fallback',()=>{
  assert.match(js,/video\.defaultMuted=true/);
  assert.match(js,/webkit-playsinline/);
  assert.match(js,/video\.preload='auto'/);
  assert.match(js,/ss-video-play-toggle/);
  assert.match(js,/attemptPlay/);
  assert.match(css,/\.ss-video-play-toggle\.is-visible/);
});

test('Super Studio V6 removes mobile white seams around full bleed video',()=>{
  assert.match(css,/width:calc\(100% \+ 2px\)!important/);
  assert.match(css,/margin:0 0 0 -1px!important/);
  assert.match(css,/inset:-1px!important/);
  assert.match(css,/public-card\.super-studio-public-active/);
});

test('Super Studio V6 keeps the larger premium profile treatment',()=>{
  assert.match(css,/width:clamp\(104px,27vw,118px\)/);
  assert.match(css,/outline:2px solid color-mix/);
  assert.match(css,/font-size:clamp\(1\.72rem,7vw,2\.35rem\)/);
});

test('Super Studio V6 hero loads in editor preview and public card',()=>{
  assert.match(editorLoader,/super-studio-hero-v4-staging\.js\?v=20261011-5/);
  assert.match(publicLoader,/super-studio-hero-v4-staging\.js\?v=20261011-5/);
  assert.match(js,/super-studio-hero-v4-staging\.css\?v=20261011-4/);
});

test('hero upgrade remains isolated to Super Studio',()=>{
  assert.match(js,/\.super-studio-experience/);
  assert.match(css,/\.super-studio-experience/);
  assert.doesNotMatch(css,/\.realtor-experience/);
  assert.doesNotMatch(css,/\.restaurant-experience/);
  assert.doesNotMatch(css,/\.showtime-experience/);
});
