import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop middle uses isolated iframe rooms for rich client content', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /barber-client-iframe/);
  assert.match(room, /srcdoc/);
  assert.match(room, /sandbox=\"allow-forms allow-scripts/);
  assert.match(room, /FRAME_KEYS=new Set\(\['cuts','gallery','map','reviews','social','shop','inquiry'\]\)/);
  assert.match(room, /data-public-rich=\\\"gallery\\\"/);
  assert.match(room, /data-public-rich=\\\"location\\\"/);
  assert.match(room, /data-public-rich=\\\"testimonials\\\"/);
  assert.match(room, /#services-section/);
  assert.match(room, /#social-section/);
  assert.match(room, /#products-section/);
  assert.match(room, /#lead-section/);
});

test('client home remains the barber welcome and promo screen', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /CLIENT PROMO/);
  assert.match(room, /WELCOME TO/);
  assert.match(room, /barber-client-home/);
  assert.match(room, /Fresh cuts/);
});

test('Book uses LIW native appointments only and suppresses external booking', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /openNativeAppointment/);
  assert.match(room, /#booking-v1-section/);
  assert.match(room, /data-liw-native-booking-action/);
  assert.match(room, /cardData\.booking_url=''/);
  assert.doesNotMatch(room, /window\.open\([^\n]*booking_url/);
});

test('inquiry iframe bridges to the existing LIW lead form instead of duplicating backend logic', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /liw-barber-inquiry-submit/);
  assert.match(room, /form\.requestSubmit/);
  assert.match(room, /postMessage/);
});

test('client room adds no repeating timer or whole-card scroll loop', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.doesNotMatch(room, /setInterval\s*\(/);
  assert.doesNotMatch(room, /scrollIntoView\s*\(/);
});

test('main card stays locked while iframe and booking host own scrolling', () => {
  const css = read('css/public-barbershop-client-room-staging.css');
  assert.match(css, /\.public-content\{[^}]*overflow:hidden!important/);
  assert.match(css, /barber-client-iframe/);
  assert.match(css, /barber-booking-host/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /max-height:108px/);
});
