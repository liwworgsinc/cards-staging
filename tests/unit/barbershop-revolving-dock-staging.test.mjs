import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('revolving dock is event driven with finger-follow drag and no polling loop', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.doesNotMatch(dock, /setInterval\s*\(/);
  assert.match(dock, /pointerdown/);
  assert.match(dock, /pointermove/);
  assert.match(dock, /pointerup/);
  assert.match(dock, /--dock-drag/);
  assert.match(dock, /velocity/);
  assert.match(dock, /suppressClickUntil/);
  assert.match(dock, /MutationObserver/);
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

test('fluid chair rail uses spring settling and drag-state transitions', () => {
  const css = read('css/public-barbershop-client-room-staging.css');
  assert.match(css, /dock-dragging/);
  assert.match(css, /dock-release/);
  assert.match(css, /barberSoftLand/);
  assert.match(css, /--dock-drag/);
  assert.match(css, /cubic-bezier\(\.16,1\.18,\.3,1\)/);
  assert.match(css, /barber-dock-center-mark/);
});

test('main app shell remains fixed and reduced motion remains supported', () => {
  const css = read('css/public-barbershop-revolving-dock-staging.css');
  const roomCss = read('css/public-barbershop-client-room-staging.css');
  assert.match(css, /100dvh/);
  assert.match(css, /overflow:hidden!important/);
  assert.match(roomCss, /prefers-reduced-motion:reduce/);
});
