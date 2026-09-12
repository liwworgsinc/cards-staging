import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../css/public-card-liw-loader-staging.css', import.meta.url), 'utf8');
const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('renderer hidden state always wins over branded loader CSS', () => {
  assert.match(css, /html #loading\[hidden\]\s*\{[^}]*display:none!important;/s);
  assert.match(css, /html #loading\[hidden\]\s*\{[^}]*visibility:hidden!important;/s);
  assert.match(css, /html #loading\[hidden\]\s*\{[^}]*opacity:0!important;/s);
});

test('visible rendered card cannot remain suppressed by stale loader class', () => {
  assert.match(css, /html\.liw-card-loader-active #card:not\(\[hidden\]\)\s*\{[^}]*visibility:visible!important;/s);
  assert.match(css, /html\.liw-card-loader-active #card:not\(\[hidden\]\)\s*\{[^}]*opacity:1!important;/s);
});

test('card page cache-busts the loader authority stylesheet', () => {
  assert.match(cardHtml, /public-card-liw-loader-staging\.css\?v=20260912-hidden-authority-1/);
});
