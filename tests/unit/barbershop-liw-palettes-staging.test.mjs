import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop uses the normal LIW template grid like Showtime', () => {
  const source = read('js/editor-barbershop-template-bridge-staging.js');
  assert.match(source, /\.template-card/);
  assert.match(source, /#template-grid/);
  assert.match(source, /Change template/);
  assert.match(source, /Template styling/);
  assert.doesNotMatch(source, /Standard Templates/);
  assert.doesNotMatch(source, /Premium Templates/);
  assert.doesNotMatch(source, /data-barber-template-skin=/);
});

test('Barbershop mirrors the selected template design exactly like the Showtime bridge', () => {
  const source = read('js/editor-barbershop-template-bridge-staging.js');
  for (const key of ['primary_color','secondary_color','background_color','font_family','button_style']) {
    assert.match(source, new RegExp(key));
  }
  assert.match(source, /template-selected-summary/);
  assert.match(source, /data-barber-template-name/);
  assert.match(source, /data-barber-template-color/);
  assert.match(source, /data-barber-template-font/);
  assert.match(source, /data-barber-template-button-style/);
});

test('normal template clicks preserve the Barber experience', () => {
  const source = read('js/editor-barbershop-template-bridge-staging.js');
  assert.match(source, /window\.addEventListener\('click'/);
  assert.match(source, /barberActive\(\)/);
  assert.match(source, /set\('card_experience','barbershop'\)/);
  assert.match(source, /set\('color_mode',MODE\)/);
  assert.match(source, /set\('profile_image_shape','circle'\)/);
  assert.match(source, /restoreBarberAfterTemplate/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});

test('choosing Barbershop keeps the already selected LIW template', () => {
  const source = read('js/editor-barbershop-template-bridge-staging.js');
  assert.match(source, /const templateId=val\('template_id',''\)/);
  assert.match(source, /reapplySelectedTemplate\(templateId\)/);
  assert.match(source, /typeof applyTemplate==='function'/);
});

test('Barbershop loader no longer loads the failed custom template browser', () => {
  const loader = read('js/editor-slug-fix.js');
  assert.match(loader, /20260910-barber-showtime-template-bridge-1/);
  assert.match(loader, /editor-barbershop-template-bridge-staging\.js/);
  assert.match(loader, /editor-barbershop-template-bridge-staging\.css/);
  assert.doesNotMatch(loader, /editor-barbershop-liw-palettes-staging\.js/);
});
