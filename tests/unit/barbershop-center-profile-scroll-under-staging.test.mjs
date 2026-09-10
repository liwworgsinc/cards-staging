import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop profile is centered and floats halfway off the cover', () => {
  const css = read('css/public-barbershop-staging.css');
  assert.match(css, /Barbershop V6 — centered floating profile/);
  assert.match(css, /left:50%!important/);
  assert.match(css, /bottom:-44px!important/);
  assert.match(css, /transform:translateX\(-50%\)!important/);
  assert.match(css, /width:88px!important/);
  assert.match(css, /height:88px!important/);
  assert.match(css, /overflow:visible!important/);
});

test('client room stays below the floating profile as the scroll surface', () => {
  const css = read('css/public-barbershop-staging.css');
  assert.match(css, /\.public-content\{[\s\S]*?z-index:1!important[\s\S]*?overflow:hidden!important/);
  assert.match(css, /\.barber-client-stage,[\s\S]*?\.barber-iframe-shell,[\s\S]*?\.barber-booking-host\{[\s\S]*?z-index:1!important/);
  assert.match(css, /\.barber-client-home\{[\s\S]*?padding-top:58px!important/);
});

test('profile-center change does not add runtime loops', () => {
  const css = read('css/public-barbershop-staging.css');
  assert.doesNotMatch(css, /setInterval|MutationObserver|requestAnimationFrame/);
});

test('card uses a fresh centered-profile cache key', () => {
  const card = read('card.html');
  assert.match(card, /data-liw-barber-profile-center-v6="true"/);
  assert.match(card, /20260910-barber-profile-center-v6-1/);
});
