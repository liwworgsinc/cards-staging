import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop reuses the live Standard and Premium LIW template library', () => {
  const source = read('js/editor-barbershop-liw-palettes-staging.js');
  assert.match(source, /Array\.isArray\(templates\)/);
  assert.match(source, /templateTier/);
  assert.match(source, /hasTemplateAccess/);
  assert.match(source, /Standard Templates/);
  assert.match(source, /Premium Templates/);
  assert.match(source, /premium_templates/);
  assert.doesNotMatch(source, /Navy & Gold|Graphite|Teal|Rose|Amber|Royal Blue/);
});

test('template skins apply the LIW visual configuration but preserve Barber architecture', () => {
  const source = read('js/editor-barbershop-liw-palettes-staging.js');
  for (const key of [
    'primary_color','secondary_color','background_color','text_color',
    'button_color','button_text_color','font_family','button_style',
    'border_radius','gradient_background'
  ]) assert.match(source, new RegExp(key));

  assert.match(source, /setValue\('template_id',template\.id\)/);
  assert.match(source, /setValue\('card_layout','classic'\)/);
  assert.match(source, /setValue\('card_experience','classic'\)/);
  assert.match(source, /setValue\('color_mode','barbershop'\)/);
  assert.match(source, /setValue\('profile_image_shape','circle'\)/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});

test('Barbershop Look no longer mounts the rejected color-only LIW palette row', () => {
  const source = read('js/editor-barbershop-liw-palettes-staging.js');
  assert.doesNotMatch(source, /LIW Card Colors/);
  assert.doesNotMatch(source, /#color-presets \.color-preset/);
  assert.match(source, /LIW Template Styles/);
});

test('Barbershop editor loader uses the fresh template-skin cache key', () => {
  const loader = read('js/editor-slug-fix.js');
  assert.match(loader, /20260910-barber-template-skins-1/);
  assert.match(loader, /data-liw-barber-template-skins/);
  assert.match(loader, /editor-barbershop-liw-palettes-staging\.js/);
});
