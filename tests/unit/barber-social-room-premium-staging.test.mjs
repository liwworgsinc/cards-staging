import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/public-barber-social-room-premium-staging.js', import.meta.url), 'utf8');
const card = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('premium Barber Social room decorates the real LIW social source', () => {
  assert.match(source, /#social-section/);
  assert.match(source, /#socials/);
  assert.match(source, /Follow the shop/);
  assert.match(source, /data\.barberSocialPremium/);
  assert.match(source, /social-brand-icon/);
  assert.match(source, /data-barber-social-arrow/);
});

test('Social room upgrade runs synchronously before the client room clones Social', () => {
  assert.match(source, /room\.setRoom=wrapped/);
  assert.match(source, /if\(key==='social'\)/);
  assert.match(source, /decorateSocialRoom\(\)/);
  assert.match(source, /return original\(key\)/);
});

test('Social room upgrade stays event driven and does not add freeze-prone loops', () => {
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('staging card loads premium Barber Social room with a fresh cache key', () => {
  assert.match(card, /public-barber-social-room-premium-staging\.js\?v=20260911-barber-social-room-premium-1/);
});
