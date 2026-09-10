import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop V5 mounts as a first-class editor experience without polling', () => {
  const editor = read('js/editor-barbershop-experience-staging.js');
  const bootstrap = read('js/editor-slug-fix.js');

  assert.match(editor, /dataset\.cardExperience='barbershop'/);
  assert.match(editor, /Barber Control Center/);
  assert.match(editor, /window\.__LIW_BARBERSHOP_EDITOR_STAGING__=true/);
  assert.doesNotMatch(editor, /setInterval\s*\(/);
  assert.match(bootstrap, /editor-barbershop-experience-staging\.js\?v=\$\{version\}/);
  assert.match(bootstrap, /editor-barbershop-experience-staging\.css\?v=\$\{version\}/);
});

test('Barbershop V5 reuses existing saved LIW card fields', () => {
  const editor = read('js/editor-barbershop-experience-staging.js');
  for (const field of [
    'full_name',
    'job_title',
    'company_name',
    'business_address',
    'phone',
    'sms_phone',
    'headline',
    'biography'
  ]) {
    assert.match(editor, new RegExp(field));
  }
  assert.match(editor, /color_mode/);
  assert.match(editor, /MODE='barbershop'/);
  assert.doesNotMatch(editor, /setCore\('card_experience','barbershop'\)/);
});

test('Barbershop profile is clipped inside the left side of the cover', () => {
  const css = read('css/public-barbershop-staging.css');
  const card = read('card.html');

  assert.match(css, /\.public-cover \.public-avatar\{[\s\S]*?position:absolute!important/);
  assert.match(css, /left:18px!important/);
  assert.match(css, /overflow:hidden!important/);
  assert.match(css, /border-radius:50%!important/);
  assert.match(css, /\.public-avatar::after\{[\s\S]*?content:none!important/);
  assert.match(css, /\.barber-avatar-shears\{display:none!important\}/);
  assert.match(card, /data-liw-barber-profile-left-v5="true"/);
  assert.match(card, /20260910-barber-profile-left-v5-1/);
});

test('Barbershop top utilities stay separate on the right', () => {
  const css = read('css/public-barbershop-staging.css');
  assert.match(css, /\.public-top-actions,[\s\S]*?\.public-cover-top-actions\{[\s\S]*?right:12px!important/);
  assert.match(css, /#barber-wallet-top/);
});
