import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/liw-auto-contrast-surfaces-staging.js', import.meta.url), 'utf8');

test('surface-aware contrast knows barber light and dark surfaces', () => {
  for (const token of ['barber-client-home','barber-client-promo','barber-revolve-dock','barber-iframe-top','barber-booking-host']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
});

test('surface-aware contrast exposes reusable LIW surface API', () => {
  for (const token of ['resolvedBackground','applySurface','applySurfaces','--liw-surface-text','--liw-surface-muted','--liw-surface-accent']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
});

test('surface-aware contrast remains event driven', () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('barber mixed surfaces get independent readable text', () => {
  assert.match(source, /home\.style\.setProperty\('--barber-text',homeColors\.text\)/);
  assert.match(source, /promo\.style\.setProperty\('--barber-text',promoColors\.text\)/);
  assert.match(source, /setColor\(promo\.querySelector\('strong'\),promoColors\.text\)/);
  assert.match(source, /setColor\(home\.querySelector\('\.barber-welcome-specialty'\),homeColors\.muted\)/);
});
