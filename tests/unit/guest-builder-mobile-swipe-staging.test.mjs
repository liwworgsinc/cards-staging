import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../guest-builder.html', import.meta.url), 'utf8');
const mobile = readFileSync(new URL('../../js/guest-builder-mobile-swipe-staging.js', import.meta.url), 'utf8');

test('guest builder loads the staging mobile edit preview controller', () => {
  assert.match(html, /guest-builder-mobile-swipe-staging\.js/);
});

test('mobile uses one visible workspace panel at a time', () => {
  assert.match(mobile, /data-mobile-view=\\"edit\\"/);
  assert.match(mobile, /data-mobile-view=\\"preview\\"/);
  assert.match(mobile, /guest-preview-panel\{display:none!important\}/);
  assert.match(mobile, /guest-editor\{display:none!important\}/);
});

test('mobile has tap controls and horizontal swipe navigation', () => {
  assert.match(mobile, /Edit card/);
  assert.match(mobile, /Preview/);
  assert.match(mobile, /pointerdown/);
  assert.match(mobile, /pointerup/);
  assert.match(mobile, /Math\.abs\(dx\) < 55/);
});

test('mobile header is simplified without changing desktop copy', () => {
  assert.match(mobile, /login\.textContent = 'Log in'/);
  assert.match(mobile, /desktopLoginText/);
  assert.match(mobile, /height:58px!important/);
});
