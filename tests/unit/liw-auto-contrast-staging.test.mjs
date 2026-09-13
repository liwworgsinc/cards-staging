import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/liw-auto-contrast-staging.js', import.meta.url), 'utf8');
await import('../../js/liw-auto-contrast-staging.js');
const contrast = globalThis.LIWAutoContrast;

test('global auto contrast chooses readable light or dark foregrounds', () => {
  assert.equal(contrast.bestText('#000000'), '#f8fafc');
  assert.equal(contrast.bestText('#ffffff'), '#111827');
  for (const background of ['#000000','#ffffff','#777777','#808080','#5b21b6']) {
    assert.ok(contrast.contrastRatio(contrast.bestText(background), background) >= 4.5);
  }
});

test('preferred colors are preserved only when they already pass contrast', () => {
  assert.equal(contrast.accessibleColor('#ffffff','#ffffff',4.5), '#111827');
  assert.equal(contrast.accessibleColor('#111827','#ffffff',4.5), '#111827');
});

test('per-card Auto Contrast preference defaults on and is persisted independently', () => {
  assert.ok(source.includes('auto_contrast_enabled!==false'));
  assert.ok(source.includes(".select('auto_contrast_enabled')"));
  assert.ok(source.includes('.update({auto_contrast_enabled:pending})'));
  assert.ok(source.includes('name="auto_contrast_enabled" checked'));
  assert.ok(source.includes('Recommended'));
  assert.ok(source.includes('Auto Contrast is off. Some text or icons may be difficult to read'));
});

test('runtime contrast keeps customer-selected card colors as preferences', () => {
  assert.doesNotMatch(source, /data\.text_color\s*=/);
  assert.doesNotMatch(source, /data\.button_text_color\s*=/);
  assert.ok(source.includes("q('text_color')?.value"));
  assert.ok(source.includes("q('button_text_color')?.value"));
});

test('shared runtime exposes global theme tokens and has no repeating polling timer', () => {
  for (const token of ['--liw-auto-text','--liw-auto-accent','--liw-auto-button-text','--card-button-text','--flow-brand-button-text','--music-template-text','--barber-text']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
  assert.doesNotMatch(source, /setInterval\s*\(/);
});
