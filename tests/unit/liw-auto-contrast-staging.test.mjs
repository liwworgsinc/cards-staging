import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/liw-auto-contrast-staging.js', import.meta.url), 'utf8');
const loader = readFileSync(new URL('../../js/pwa-install.js', import.meta.url), 'utf8');

await import('../../js/liw-auto-contrast-staging.js');
const contrast = globalThis.LIWAutoContrast;

test('global auto contrast chooses light text on dark backgrounds', () => {
  assert.equal(contrast.bestText('#000000'), '#f8fafc');
  assert.equal(contrast.bestText('#0b1020'), '#f8fafc');
});

test('global auto contrast chooses dark text on light backgrounds', () => {
  assert.equal(contrast.bestText('#ffffff'), '#111827');
  assert.equal(contrast.bestText('#f8fbff'), '#111827');
});

test('foreground contrast math meets readable contrast for black and white extremes', () => {
  assert.ok(contrast.contrastRatio(contrast.bestText('#000000'), '#000000') >= 4.5);
  assert.ok(contrast.contrastRatio(contrast.bestText('#ffffff'), '#ffffff') >= 4.5);
});

test('preferred accents fall back when they do not contrast with the background', () => {
  assert.equal(contrast.accessibleColor('#ffffff', '#ffffff', 4.5), '#111827');
  assert.equal(contrast.accessibleColor('#111827', '#ffffff', 4.5), '#111827');
});

test('auto contrast stays event driven with no observers or repeating timers', () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('shared runtime covers editor values and public experience variables', () => {
  for (const token of [
    'background_color', 'text_color', 'button_color', 'button_text_color',
    '--card-button-text', '--flow-brand-button-text', '--music-template-text',
    '--music-template-button-text', '--barber-text'
  ]) assert.ok(source.includes(token), `missing ${token}`);
});

test('staging-wide loader mounts the same contrast engine on card and editor pages', () => {
  assert.match(loader, /\/(?:card\|editor|\(\?:card\|editor\))\\?\.html/);
  assert.match(loader, /js\/liw-auto-contrast-staging\.js\?v=20260910-global-contrast-1/);
  assert.match(loader, /data-liw-auto-contrast/);
});
