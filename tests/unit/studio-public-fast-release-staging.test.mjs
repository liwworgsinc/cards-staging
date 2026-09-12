import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const retired = read('js/studio-public-fast-release-staging.js');
const studio = read('js/public-studio-v4-staging.js');
const social = read('js/public-barber-social-svg-staging.js');

test('retired Studio V3 can no longer own or hold the global LIW loader', () => {
  assert.match(retired, /retired Studio loader gate compatibility shim/);
  assert.doesNotMatch(retired, /liw-studio-fast-pending #card/);
  assert.doesNotMatch(retired, /loading\.hidden=true/);
  assert.doesNotMatch(retired, /liw-card-loader-active/);
  assert.match(retired, /public-studio-v4-staging\.js\?v=20260912-studio-v4-1/);
});

test('Studio V4 progressively adapts the normal rendered public card', () => {
  assert.match(studio, /Studio public adapter V4/);
  assert.match(studio, /mode===MODE&&experience!=='music'/);
  assert.match(studio, /studio_business_type/);
  assert.match(studio, /public_studio_business_type/);
  assert.match(studio, /currentType\|\|'studio'/);
  assert.doesNotMatch(studio, /liw-card-loader-active/);
  assert.doesNotMatch(studio, /#loading/);
});

test('Lash Brow has adaptive Studio identity and does not require Barber chrome', () => {
  assert.match(studio, /lashes:\{label:'Lash \/ Brow'/);
  assert.match(studio, /data-studio-business-type="barber"/);
  assert.match(studio, /public-cover::after/);
  assert.match(studio, /barber-background/);
  assert.match(studio, /barber-secondary/);
});

test('Studio V4 keeps legacy dock and client-room controllers mountable without gating first paint', () => {
  assert.match(studio, /LIWBarberClientRoom\?\.mount/);
  assert.match(studio, /LIWBarberRevolvingDock\?\.mount/);
  assert.match(studio, /liw:barber-client-ready/);
  assert.match(studio, /liw:card-loader-ready/);
});

test('public social hook now loads Studio V4 instead of the V3 readiness gate', () => {
  assert.match(social, /public-studio-v4-staging\.js\?v=20260912-studio-v4-1/);
  assert.doesNotMatch(social, /studio-public-fast-release-staging\.js\?v=/);
});
