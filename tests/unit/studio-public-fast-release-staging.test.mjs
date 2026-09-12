import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const loader = read('js/public-card-liw-loader-staging.js');
const bridge = read('js/public-barbershop-staging.js');
const social = read('js/public-barber-social-svg-staging.js');

test('Studio uses the existing Barbershop public engine instead of a second runtime', () => {
  assert.match(loader, /public-barbershop-staging\.js/);
  assert.match(loader, /public-barbershop-revolving-dock-staging\.js/);
  assert.match(loader, /public-barbershop-client-room-staging\.js/);
  assert.doesNotMatch(social, /public-studio-v4-staging\.js/);
  assert.doesNotMatch(social, /studio-public-fast-release-staging\.js/);
});

test('Studio bridge preserves the legacy Barbershop engine marker and adapts by business type', () => {
  assert.match(bridge, /const MODE='barbershop'/);
  assert.match(bridge, /mode===MODE&&experience!=='music'/);
  assert.match(bridge, /public_studio_business_type/);
  assert.match(bridge, /liw-public-studio/);
  assert.match(bridge, /document\.body\.dataset\.studioBusinessType=studioType/);
  assert.match(bridge, /delete document\.body\.dataset\.studioBusinessType/);
});

test('Lash Brow is an identity adaptation of the Barbershop engine', () => {
  assert.match(bridge, /lashes:\{label:'Lash \/ Brow'/);
  assert.match(bridge, /booking:'Book Lash \/ Brow'/);
  assert.match(bridge, /dock:'Lash\/Brow'/);
  assert.match(bridge, /room:'Lash & Brow Services'/);
  assert.match(bridge, /gallery:'Lash & Brow Gallery'/);
  assert.match(bridge, /lashes:'<path/);
});

test('the adaptive Studio bridge never owns the global LIW loading screen', () => {
  assert.doesNotMatch(bridge, /liw-card-loader-active/);
  assert.doesNotMatch(bridge, /studio-fast-pending/);
  assert.doesNotMatch(bridge, /loading\.hidden/);
});
