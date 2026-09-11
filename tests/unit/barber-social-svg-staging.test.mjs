import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/public-barber-social-svg-staging.js', import.meta.url), 'utf8');
const card = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('Barber social painter writes literal brand paint into cloned SVG shapes', () => {
  assert.match(source, /getPropertyValue\('--brand'\)/);
  assert.match(source, /shape\.setAttribute\('fill',brand\)/);
  assert.match(source, /svg\.setAttribute\('fill',brand\)/);
  assert.match(source, /svg\.setAttribute\('width','18'\)/);
  assert.match(source, /svg\.setAttribute\('height','18'\)/);
});

test('Barber social painter runs before Social room cloning and stays event driven', () => {
  assert.match(source, /data-barber-dock-action="social"/);
  assert.match(source, /addEventListener\('click',[\s\S]*?,true\)/);
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('staging card loads the dedicated Barber social painter with a fresh cache key', () => {
  assert.match(card, /public-barber-social-svg-staging\.js\?v=20260910-barber-social-svg-v2-1/);
});
