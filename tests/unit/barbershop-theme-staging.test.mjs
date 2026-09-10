import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('staging editor loads the Barbershop template and dedicated control center', () => {
  const loader = read('js/editor-industry-covers-staging.js');
  const editor = read('js/editor-barbershop-staging.js');

  assert.match(loader, /editor-barbershop-staging\.css/);
  assert.match(loader, /editor-barbershop-staging\.js/);
  assert.match(editor, /Barber Control Center/);
  assert.match(editor, /data-barbershop-template/);
  assert.match(editor, /color_mode/);
  assert.match(editor, /MODE='barbershop'/);
  assert.doesNotMatch(editor, /setCore\('card_experience','barbershop'\)/);
});

test('Barbershop offers presets plus direct custom color controls', () => {
  const editor = read('js/editor-barbershop-staging.js');

  for (const preset of ['Black & Gold', 'Classic Pole', 'Urban', 'Clean White', 'Vintage Leather']) {
    assert.match(editor, new RegExp(preset));
  }
  for (const field of ['primary_color', 'secondary_color', 'background_color', 'text_color']) {
    assert.match(editor, new RegExp(`data-barber-color="${field}"`));
  }
});

test('Barber editor proxies existing saved LIW card fields instead of creating duplicate data', () => {
  const editor = read('js/editor-barbershop-staging.js');

  for (const field of ['full_name', 'job_title', 'company_name', 'business_address', 'phone', 'booking_url', 'headline']) {
    assert.match(editor, new RegExp(field));
  }
  assert.match(editor, /scheduleSave/);
  assert.match(editor, /render/);
});

test('staging public card loads and recognizes the Barbershop marker', () => {
  const loader = read('js/public-card-liw-loader-staging.js');
  const publicTheme = read('js/public-barbershop-staging.js');
  const publicCss = read('css/public-barbershop-staging.css');

  assert.match(loader, /public-barbershop-staging\.css/);
  assert.match(loader, /public-barbershop-staging\.js/);
  assert.match(publicTheme, /color_mode/);
  assert.match(publicTheme, /Save My Barber/);
  assert.match(publicTheme, /Book My Chair/);
  assert.match(publicCss, /barbershop-card-active/);
});
