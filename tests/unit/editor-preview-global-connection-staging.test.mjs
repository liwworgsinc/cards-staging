import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const parity = readFileSync(new URL('../../js/editor-preview-production-parity-staging.js', import.meta.url), 'utf8');
const studioPersistence = readFileSync(new URL('../../js/editor-studio-type-persistence-staging.js', import.meta.url), 'utf8');
const experienceGuard = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');

test('global Preview only waits for explicit Studio state', () => {
  assert.match(parity, /context\.colorMode === 'barbershop' && \(context\.experience === 'classic' \|\| context\.experience === 'barbershop'\)/);
  assert.match(parity, /if \(studioExperienceActive\(\) && window\.LIWStudioTypePersistence\?\.flush\)/);
  assert.match(parity, /Studio persistence skipped/);
  assert.match(parity, /current experience is not Studio/);
});

test('Studio persistence cannot classify Flow or Showtime as Studio from color mode alone', () => {
  assert.match(studioPersistence, /mode==='barbershop'&&\(experience==='classic'\|\|experience==='barbershop'\)/);
  assert.doesNotMatch(studioPersistence, /experience!=='music'/);
  const flushStart = studioPersistence.indexOf('async function flush()');
  const inactiveGuard = studioPersistence.indexOf('if(!studioActive())', flushStart);
  const waitForReady = studioPersistence.indexOf('await waitForReady()', flushStart);
  assert.ok(flushStart >= 0, 'flush() must exist');
  assert.ok(inactiveGuard > flushStart, 'flush() must guard inactive Studio first');
  assert.ok(waitForReady > inactiveGuard, 'inactive Studio must exit before readiness waiting');
  assert.match(studioPersistence, /return \{skipped:true,reason:'studio-inactive'\}/);
});

test('standard experience selection clears stale Studio mode globally', () => {
  assert.match(experienceGuard, /const STANDARD=new Set\(\['classic','flow','music'\]\)/);
  assert.match(experienceGuard, /if\(previousMode===STUDIO_MODE\)/);
  assert.match(experienceGuard, /mode===STUDIO_MODE&&\(experience==='flow'\|\|experience==='music'\)/);
  assert.match(experienceGuard, /post-click-race-repair/);
  assert.match(experienceGuard, /preview-preflight/);
});

test('Preview reconciles experience state before saving', () => {
  const reconcile = parity.indexOf('window.LIWExperienceStateGuard?.reconcile?.()');
  const save = parity.indexOf("logPreview('save started')");
  assert.ok(reconcile >= 0);
  assert.ok(save > reconcile);
});

test('Studio RPC and overall Preview preparation are bounded', () => {
  assert.match(studioPersistence, /RPC_TIMEOUT_MS=5000/);
  assert.match(studioPersistence, /Studio type save timed out/);
  assert.match(parity, /PREVIEW_PREP_TIMEOUT_MS = 18000/);
  assert.match(parity, /preview connection timed out while saving the latest card data/i);
});

test('Preview exposes a recoverable connection failure instead of an endless Connecting state', () => {
  assert.match(parity, /Preview failed to connect/);
  assert.match(parity, /retry\.textContent = 'Retry'/);
  assert.match(parity, /document\.getElementById\('preview-link'\)\?\.click\(\)/);
});

test('Preview diagnostics include selected theme, transport, save state, URL and connection errors', () => {
  assert.match(parity, /selectedThemeId: context\.themeId/);
  assert.match(parity, /transport: 'direct-navigation'/);
  assert.match(parity, /preview data saved/);
  assert.match(parity, /previewUrl: url/);
  assert.match(parity, /iframe: false/);
  assert.match(parity, /connection error/);
  assert.match(parity, /experience state reconciled/);
});
