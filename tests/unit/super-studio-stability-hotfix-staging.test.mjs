import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stability = readFileSync(new URL('../../js/super-studio-stability-hotfix-staging.js', import.meta.url), 'utf8');
const hero = readFileSync(new URL('../../js/super-studio-hero-v4-staging.js', import.meta.url), 'utf8');
const booking = readFileSync(new URL('../../js/super-studio-booking-hotfix-staging.js', import.meta.url), 'utf8');
const bookingCss = readFileSync(new URL('../../css/super-studio-booking-hotfix-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('Work navigation is explicitly repaired and keeps portfolio content in Work',()=>{
  assert.match(stability,/moveWorkContent/);
  assert.match(stability,/data-ss-screen=\\?"work\\?"/);
  assert.match(stability,/data-ss-app-screen/);
  assert.match(stability,/stopImmediatePropagation/);
  assert.match(stability,/ss-ba-list/);
});

test('profession label is resolved from Super Studio state instead of flashing Other',()=>{
  assert.match(stability,/super_studio_state_staging/);
  assert.match(stability,/studioProfession/);
  assert.match(stability,/ss-profession-resolving/);
  assert.match(stability,/visibility='hidden'/);
  assert.match(stability,/setProfession/);
});

test('video header uses fixed hysteresis thresholds and does not recalculate from sticky geometry',()=>{
  assert.match(hero,/collapseAt:start\+120/);
  assert.match(hero,/expandAt:start\+20/);
  assert.match(hero,/if\(!meta\.collapsed&&current>=meta\.collapseAt\)/);
  assert.match(hero,/else if\(meta\.collapsed&&current<=meta\.expandAt\)/);
  assert.doesNotMatch(hero,/contentTop\(/);
  assert.doesNotMatch(hero,/onResize/);
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

test('hotfixes are loaded in the appropriate staging surfaces',()=>{
  assert.match(editorLoader,/super-studio-stability-hotfix-staging\.js\?v=20261011-2/);
  assert.match(editorLoader,/super-studio-hero-v4-staging\.js\?v=20261011-2/);
  assert.match(publicLoader,/super-studio-stability-hotfix-staging\.js\?v=20261011-2/);
  assert.match(publicLoader,/super-studio-booking-hotfix-staging\.js\?v=20261011-1/);
  assert.match(publicLoader,/super-studio-hero-v4-staging\.js\?v=20261011-2/);
});
