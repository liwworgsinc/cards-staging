import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stability = readFileSync(new URL('../../js/super-studio-stability-hotfix-staging.js', import.meta.url), 'utf8');
const hero = readFileSync(new URL('../../js/super-studio-hero-v4-staging.js', import.meta.url), 'utf8');
const booking = readFileSync(new URL('../../js/super-studio-booking-hotfix-staging.js', import.meta.url), 'utf8');
const bookingCss = readFileSync(new URL('../../css/super-studio-booking-hotfix-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('Work navigation remains explicit and gives an empty-state instead of a blank screen',()=>{
  assert.match(stability,/moveWorkContent/);
  assert.match(stability,/data-ss-app-screen/);
  assert.match(stability,/stopImmediatePropagation/);
  assert.match(stability,/ss-ba-list/);
  assert.match(stability,/ss-work-empty/);
});

test('profession icon and label remain visible while Super Studio state resolves',()=>{
  assert.match(stability,/PROFESSION_ICONS/);
  assert.match(stability,/loctician:'waves'/);
  assert.match(stability,/chip\.style\.visibility=''/);
  assert.match(stability,/keyFromLabel/);
  assert.match(stability,/data-lucide/);
  assert.match(stability,/setProfession/);
});

test('video hero uses separate compact-bar thresholds instead of sticky hero geometry',()=>{
  assert.match(hero,/ss-hero-compact-bar/);
  assert.match(hero,/delta>=118/);
  assert.match(hero,/delta<=38/);
  assert.match(hero,/video\.defaultMuted=true/);
  assert.match(hero,/webkit-playsinline/);
  assert.doesNotMatch(hero,/ss-hero-collapse-sentinel/);
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

test('V6 runtimes are loaded in the appropriate staging surfaces',()=>{
  assert.match(editorLoader,/super-studio-stability-hotfix-staging\.js\?v=20261011-5/);
  assert.match(editorLoader,/super-studio-hero-v4-staging\.js\?v=20261011-5/);
  assert.match(publicLoader,/super-studio-stability-hotfix-staging\.js\?v=20261011-5/);
  assert.match(publicLoader,/super-studio-booking-hotfix-staging\.js\?v=20261011-1/);
  assert.match(publicLoader,/super-studio-hero-v4-staging\.js\?v=20261011-5/);
});
