import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('barber dock gives normal button clicks priority', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /dock\.addEventListener\('click',handleDockClick\)/);
  assert.match(dock, /select\(key,\{perform:true,pulse:true,hapticFeedback:true\}\)/);
  assert.match(dock, /pointer-events',visible\?'auto':'none'/);
  assert.match(dock, /dock\.style\.pointerEvents='auto'/);
});

test('swipe rotation is local and cannot pointer-lock the page', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /track\.addEventListener\('pointerdown'/);
  assert.match(dock, /track\.addEventListener\('pointermove'/);
  assert.match(dock, /track\.addEventListener\('pointerup'/);
  assert.match(dock, /track\.addEventListener\('pointercancel'/);
  assert.doesNotMatch(dock, /window\.addEventListener\('pointermove'/);
  assert.doesNotMatch(dock, /setPointerCapture/);
  assert.doesNotMatch(dock, /releasePointerCapture/);
  assert.doesNotMatch(dock, /style\.setProperty\(['"]--dock-drag/);
  assert.doesNotMatch(dock, /handlePointerMove[\s\S]{0,900}preventDefault\(/);
});

test('finger movement rotates actions rather than translating the group', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /const threshold=34/);
  assert.match(dock, /rotate\(delta<0\?steps:-steps,\{fromFinger:true\}\)/);
  assert.match(dock, /gesture\.stepX/);
  assert.match(dock, /swipeGuard=\{key:startKey,until:performance\.now\(\)\+90\}/);
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

test('barbershop loader cache-busts the reliable dock and iframe room', () => {
  const loader = read('js/public-card-liw-loader-staging.js');
  assert.match(loader, /public-barbershop-revolving-dock-staging\.js\?v=20260910-buttons-v6-1/);
  assert.match(loader, /public-barbershop-client-room-staging\.js\?v=20260910-client-room-v4-2/);
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
