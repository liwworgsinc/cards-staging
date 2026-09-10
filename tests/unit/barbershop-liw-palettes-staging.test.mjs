import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop reuses the existing LIW editor color presets', () => {
  const source = read('js/editor-barbershop-liw-palettes-staging.js');
  assert.match(source, /#color-presets \.color-preset\[data-colors\]/);
  assert.match(source, /Navy & Gold/);
  assert.match(source, /Graphite/);
  assert.match(source, /Teal/);
  assert.match(source, /Rose/);
  assert.match(source, /Amber/);
  assert.match(source, /Royal Blue/);
});

test('shared palettes keep Barbershop as the active experience', () => {
  const source = read('js/editor-barbershop-liw-palettes-staging.js');
  assert.match(source, /setValue\('color_mode','barbershop'\)/);
  assert.match(source, /window\.LIWBarbershopEditor\?\.refresh/);
  assert.doesNotMatch(source, /card_experience','classic'/);
  assert.doesNotMatch(source, /card_experience','flow'/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});

test('Barbershop editor loader mounts shared LIW palettes with a fresh cache key', () => {
  const loader = read('js/editor-slug-fix.js');
  assert.match(loader, /editor-barbershop-liw-palettes-staging\.js/);
  assert.match(loader, /20260910-barber-editor-liw-colors-2/);
  assert.match(loader, /data-liw-barber-liw-palettes/);
});
