import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('barber dock gives normal button clicks priority', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /dock\.addEventListener\('click',handleDockClick\)/);
  assert.match(dock, /select\(button\.dataset\.barberDockAction,\{perform:true,pulse:true,hapticFeedback:true\}\)/);
  assert.match(dock, /button\.style\.pointerEvents=visible\?'auto':'none'/);
});

test('swipe rotation uses only pointerdown and pointerup and cannot lock the page', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /track\.addEventListener\('pointerdown'/);
  assert.match(dock, /track\.addEventListener\('pointerup'/);
  assert.match(dock, /track\.addEventListener\('pointercancel'/);
  assert.doesNotMatch(dock, /pointermove/);
  assert.doesNotMatch(dock, /window\.addEventListener\('pointer/);
  assert.doesNotMatch(dock, /setPointerCapture/);
  assert.doesNotMatch(dock, /releasePointerCapture/);
  assert.doesNotMatch(dock, /preventDefault\(\).*pointer/i);
});

test('dock has no MutationObserver or polling loop', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.doesNotMatch(dock, /MutationObserver/);
  assert.doesNotMatch(dock, /setInterval\s*\(/);
  assert.doesNotMatch(dock, /contentObserver|readyObserver|watchMiddle|watchUntilReady/);
});

test('dock uses inline SVG instead of global Lucide remounts', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /const ICONS=/);
  assert.match(dock, /class=\"barber-dock-icon\"/);
  assert.doesNotMatch(dock, /lucide\.createIcons/);
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
