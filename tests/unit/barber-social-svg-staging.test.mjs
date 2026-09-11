import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/public-barber-social-svg-staging.js', import.meta.url), 'utf8');
const card = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('Barber Social V4 builds portable icons from LIW social metadata', () => {
  assert.match(source, /window\.socialMeta/);
  assert.match(source, /data:image\/svg\+xml;charset=UTF-8/);
  assert.match(source, /document\.createElement\('img'\)/);
  assert.match(source, /data-barber-social-icon-image/);
  assert.match(source, /current\.replaceWith\(next\)/);
});

test('Barber Social V4 avoids iframe SVG style inheritance', () => {
  assert.match(source, /buildPortableIcon/);
  assert.match(source, /svgDataUri/);
  assert.match(source, /DARK_BRAND_OVERRIDES/);
  assert.match(source, /tiktok:'#25F4EE'/);
  assert.match(source, /x:'#F8F8FB'/);
});

test('Barber Social rebuild happens synchronously inside setRoom before clone', () => {
  assert.match(source, /const original=api\.setRoom\.bind\(api\)/);
  assert.match(source, /api\.setRoom=function\(key\)/);
  assert.match(source, /if\(key==='social'\)rebuildSocialSource\(\)/);
  assert.match(source, /return original\(key\)/);
  assert.match(source, /__liwSocialV4Wrapped=true/);
});

test('Barber Social bridge stays event driven', () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('staging card loads Barber Social V4 with a fresh cache key', () => {
  assert.match(card, /public-barber-social-svg-staging\.js\?v=20260911-barber-social-svg-v4-1/);
});
