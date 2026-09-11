import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/liw-auto-contrast-staging.js', import.meta.url), 'utf8');

test('surface-aware contrast knows barber light and dark surfaces', () => {
  for (const token of ['barber-client-home','barber-client-promo','barber-revolve-dock']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
});

test('surface-aware contrast remains event driven', () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});
