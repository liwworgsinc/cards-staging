import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stability = readFileSync(new URL('../../js/super-studio-stability-hotfix-staging.js', import.meta.url), 'utf8');
const hero = readFileSync(new URL('../../js/super-studio-hero-v4-staging.js', import.meta.url), 'utf8');
const booking = readFileSync(new URL('../../js/super-studio-booking-hotfix-staging.js', import.meta.url), 'utf8');
const bookingCss = readFileSync(new URL('../../css/super-studio-booking-hotfix-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');
const publicEnhancements = readFileSync(new URL('../../js/super-studio-public-enhancements-staging.js', import.meta.url), 'utf8');

test('Work navigation remains explicit and gives an empty-state instead of a blank screen',()=>{
  assert.match(stability,/moveWorkContent/);
  assert.match(stability,/data-ss-app-screen/);
  assert.match(stability,/stopImmediatePropagation/);
  assert.match(stability,/ss-ba-list/);
  assert.match(stability,/ss-work-empty/);
});

test('selected profession icon and label stay synced in full and compact headers',()=>{
  assert.match(stability,/PROFESSION_ICONS/);
  assert.match(stability,/loctician:'waves'/);
  assert.match(stability,/renderProfessionChip/);
  assert.match(stability,/ss-compact-profession/);
  assert.match(stability,/data-lucide/);
  assert.match(stability,/setProfession/);
});

test('video hero uses full-hero bottom thresholds instead of early scroll delta collapse',()=>{
  assert.match(hero,/heroBottom/);
  assert.match(hero,/collapseLine=top\+78/);
  assert.match(hero,/expandLine=top\+138/);
  assert.match(hero,/video\.defaultMuted=true/);
  assert.match(hero,/webkit-playsinline/);
  assert.doesNotMatch(hero,/delta>=118/);
});

test('public completion mounts the exact saved video directly from Super Studio state',()=>{
  assert.match(publicEnhancements,/videoCoverUrl/);
  assert.match(publicEnhancements,/ensureVideo/);
  assert.match(publicEnhancements,/\.ss-hero-video/);
  assert.match(publicEnhancements,/webkit-playsinline/);
  assert.match(publicEnhancements,/video\.defaultMuted=true/);
  assert.match(publicEnhancements,/video\.play\(\)/);
  assert.match(publicEnhancements,/ss-hero-video-playing/);
});

test('public completion mounts saved Before After directly inside Work and removes empty state',()=>{
  assert.match(publicEnhancements,/beforeAfter/);
  assert.match(publicEnhancements,/ensureBeforeAfter/);
  assert.match(publicEnhancements,/data-ss-screen=\\?"work\\?"/);
  assert.match(publicEnhancements,/ss-ba-list/);
  assert.match(publicEnhancements,/ss-work-empty/);
  assert.match(publicEnhancements,/node=>node\.remove\(\)/);
  assert.match(publicEnhancements,/clipPath=`inset/);
});

test('native booking is isolated in a dedicated modal instead of mounted in app screens',()=>{
  assert.match(booking,/ss-booking-modal/);
  assert.match(booking,/showModal\(\)/);
  assert.match(booking,/data-ss-booking-host/);
  assert.match(booking,/stopImmediatePropagation/);
  assert.match(bookingCss,/\.super-studio-experience>\.ss-native-booking/);
  assert.match(bookingCss,/display:none!important/);
  assert.match(bookingCss,/100dvh/);
});

test('V7 runtimes and public completion cache bust are loaded on staging',()=>{
  assert.match(editorLoader,/super-studio-stability-hotfix-staging\.js\?v=20261011-6/);
  assert.match(editorLoader,/super-studio-hero-v4-staging\.js\?v=20261011-6/);
  assert.match(publicLoader,/super-studio-stability-hotfix-staging\.js\?v=20261011-6/);
  assert.match(publicLoader,/super-studio-booking-hotfix-staging\.js\?v=20261011-1/);
  assert.match(publicLoader,/super-studio-hero-v4-staging\.js\?v=20261011-6/);
  assert.match(publicLoader,/super-studio-public-enhancements-staging\.js\?v=20261011-2/);
});
