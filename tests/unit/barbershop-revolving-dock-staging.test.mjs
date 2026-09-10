import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('revolving dock turns actions under the finger without group translation or polling', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.doesNotMatch(dock, /setInterval\s*\(/);
  assert.match(dock, /pointerdown/);
  assert.match(dock, /pointermove/);
  assert.match(dock, /pointerup/);
  assert.match(dock, /pointer\.accum/);
  assert.match(dock, /const threshold=30/);
  assert.match(dock, /rotate\(direction,\{perform:false,fromFinger:true\}\)/);
  assert.doesNotMatch(dock, /style\.setProperty\(['"]--dock-drag/);
  assert.doesNotMatch(dock, /setPointerCapture/);
  assert.doesNotMatch(dock, /releasePointerCapture/);
});

test('gesture cleanup cannot leave the page pointer-locked after release or cancel', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /function clearPointer/);
  assert.match(dock, /window\.addEventListener\('pointerup',finishPointer/);
  assert.match(dock, /window\.addEventListener\('pointercancel',cancelPointer/);
  assert.match(dock, /window\.addEventListener\('blur',\(\)=>cancelPointer/);
  assert.match(dock, /ignoreClicksUntil=performance\.now\(\)\+120/);
});

test('dock exposes direct barber actions plus rich iframe launch buttons', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  for (const label of ['Welcome','Book','Call','Text','Cuts','Gallery','Map','Reviews','Social','Shop','Inquiry','Save']) {
    assert.match(dock, new RegExp(`label:'${label}'`));
  }
  assert.match(dock, /data-barber-action-kind/);
  assert.match(dock, /LIWBarberClientRoom/);
});

test('Book routes to LIW native appointments and never external booking_url', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /openNativeAppointment/);
  assert.match(dock, /appointment_booking/);
  assert.doesNotMatch(dock, /window\.open\([^\n]*booking_url/);
});

test('main app shell remains fixed and reduced motion remains supported', () => {
  const css = read('css/public-barbershop-revolving-dock-staging.css');
  const roomCss = read('css/public-barbershop-client-room-staging.css');
  assert.match(css, /100dvh/);
  assert.match(css, /overflow:hidden!important/);
  assert.match(roomCss, /prefers-reduced-motion:reduce/);
  assert.match(roomCss, /barberSoftLand/);
  assert.match(roomCss, /barber-dock-center-mark/);
});
