import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('barber dock gives normal button clicks priority and fires action before recenter', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /dock\.addEventListener\('click',handleDockClick\)/);
  assert.match(dock, /const key=button\.dataset\.barberDockAction;\s*performAction\(key\);\s*settleTo\(key\);/s);
  assert.match(dock, /button\.style\.pointerEvents=visible\?'auto':'none'/);
});

test('tap handler does not scan availability, rebuild buttons, vibrate or animate first', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  const clickHandler = dock.match(/function handleDockClick\(event\)\{[\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(clickHandler, /resolveActions|renderButtons|positionButtons|requestAnimationFrame|navigator\.vibrate|haptic/);
  assert.match(clickHandler, /performAction\(key\)/);
});

test('swipe rotation uses pointerdown and pointerup only and cannot lock page', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /track\.addEventListener\('pointerdown'/);
  assert.match(dock, /track\.addEventListener\('pointerup'/);
  assert.match(dock, /track\.addEventListener\('pointercancel'/);
  assert.doesNotMatch(dock, /addEventListener\('pointermove'/);
  assert.doesNotMatch(dock, /window\.addEventListener\('pointer/);
  assert.doesNotMatch(dock, /setPointerCapture|releasePointerCapture/);
});

test('dock caches available actions instead of scanning on every tap/rotate', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /let actionCache=\[\]/);
  assert.match(dock, /function resolveActions\(\)/);
  assert.match(dock, /actionCache\.length\?actionCache:resolveActions\(\)/);
  assert.doesNotMatch(dock, /new MutationObserver|setInterval\s*\(/);
});

test('dock uses inline SVG and no global lucide or haptics', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /const ICONS=/);
  assert.match(dock, /class=\"barber-dock-icon\"/);
  assert.doesNotMatch(dock, /lucide\.createIcons|navigator\.vibrate/);
});

test('client-room dock override stays renderer-light', () => {
  const css = read('css/public-barbershop-client-room-staging.css');
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /will-change:auto!important/);
  assert.match(css, /filter:none!important/);
  assert.doesNotMatch(css, /barberSoftLand|dock-change/);
});

test('dock exposes direct barber actions plus rich iframe launch buttons', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  for (const label of ['Welcome','Book','Call','Text','Cuts','Gallery','Map','Reviews','Social','Shop','Inquiry','Save']) {
    assert.match(dock, new RegExp(`label:'${label}'`));
  }
  assert.match(dock, /LIWBarberClientRoom/);
});

test('Book routes to LIW native appointments and never external booking_url', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.match(dock, /openNativeAppointment/);
  assert.doesNotMatch(dock, /window\.open\([^\n]*booking_url/);
});

test('Barbershop loader cache-busts tap-safe V8/V6 runtime', () => {
  const loader = read('js/public-card-liw-loader-staging.js');
  const card = read('card.html');
  assert.match(loader, /public-barbershop-revolving-dock-staging\.js\?v=20260910-tap-v8-1/);
  assert.match(loader, /public-barbershop-client-room-staging\.js\?v=20260910-tap-v6-1/);
  assert.match(card, /public-card-liw-loader-staging\.js\?v=20260910-barber-tap-loader-v8-1/);
});

test('main app shell remains fixed while room owns scrolling', () => {
  const css = read('css/public-barbershop-revolving-dock-staging.css');
  const roomCss = read('css/public-barbershop-client-room-staging.css');
  assert.match(css, /100dvh/);
  assert.match(css, /overflow:hidden!important/);
  assert.match(roomCss, /barber-client-iframe/);
  assert.match(roomCss, /barber-room-loading/);
});
