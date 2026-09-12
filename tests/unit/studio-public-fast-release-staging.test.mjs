import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const fast = read('js/studio-public-fast-release-staging.js');
const social = read('js/public-barber-social-svg-staging.js');

test('Studio V3 resolves identity independently instead of waiting forever on the legacy bridge', () => {
  assert.match(fast, /Studio public readiness controller V3/);
  assert.match(fast, /public_studio_business_type/);
  assert.match(fast, /directType\(\)/);
  assert.match(fast, /bridgeType\(card\)/);
  assert.match(fast, /FAIL_OPEN_MS=2400/);
  assert.match(fast, /studio-failsafe-release/);
});

test('Studio identity is applied before reveal and can represent Lash Brow without Barber chrome', () => {
  assert.match(fast, /lashes:\{label:'Lash \/ Brow'/);
  assert.match(fast, /function applyIdentity\(card,type\)/);
  assert.match(fast, /liw-public-studio/);
  assert.match(fast, /card\.dataset\.studioBusinessType=type/);
  assert.match(fast, /studio-public-industry/);
  assert.match(fast, /not\(\[data-studio-business-type="barber"\]\).*public-cover::after/s);
});

test('Studio dock stays hidden until the real dock and client-room controllers are interactive', () => {
  assert.match(fast, /function dockReady\(\)/);
  assert.match(fast, /LIWBarberRevolvingDock/);
  assert.match(fast, /LIWBarberClientRoom/);
  assert.match(fast, /dock\.dataset\.gesturesBound==='true'/);
  assert.match(fast, /liw-studio-dock-ready/);
  assert.match(fast, /not\(\.liw-studio-dock-ready\).*barber-revolve-dock/s);
});

test('Studio customer is never trapped behind the loader if type lookup is slow', () => {
  assert.match(fast, /TYPE_WAIT_MS=1800/);
  assert.match(fast, /FAIL_OPEN_MS=2400/);
  assert.match(fast, /applyIdentity\(card,direct\|\|resolvedType\|\|bridged\|\|'barber'\)/);
  assert.match(fast, /loading\.hidden=true/);
  assert.match(fast, /display','none','important'/);
});

test('Public hook requests the V3 Studio readiness controller with a fresh cache key', () => {
  assert.match(social, /studio-public-fast-release-staging\.js\?v=20260912-studio-ready-v3-1/);
  assert.doesNotMatch(social, /studio-interactive-1/);
});
