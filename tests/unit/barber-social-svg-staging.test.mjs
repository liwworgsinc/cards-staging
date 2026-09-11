import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/public-barber-social-svg-staging.js', import.meta.url), 'utf8');
const card = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('Barber Social rebuild uses LIW authoritative icon metadata', () => {
  assert.match(source, /window\.socialMeta/);
  assert.match(source, /window\.socialIconHtml/);
  assert.match(source, /shape\.setAttribute\('fill',brand\)/);
  assert.match(source, /svg\.setAttribute\('fill',brand\)/);
  assert.match(source, /current\.replaceWith\(next\)/);
});

test('Barber Social rebuild happens synchronously inside setRoom before clone', () => {
  assert.match(source, /const original=api\.setRoom\.bind\(api\)/);
  assert.match(source, /api\.setRoom=function\(key\)/);
  assert.match(source, /if\(key==='social'\)rebuildSocialSource\(\)/);
  assert.match(source, /return original\(key\)/);
  assert.match(source, /__liwSocialV3Wrapped=true/);
});

test('Barber Social bridge stays event driven', () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('staging card loads Barber Social V3 with a fresh cache key', () => {
  assert.match(card, /public-barber-social-svg-staging\.js\?v=20260910-barber-social-svg-v3-1/);
});
