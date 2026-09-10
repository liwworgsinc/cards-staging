import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop client room loads after the safe revolving dock', () => {
  const loader = read('js/public-card-liw-loader-staging.js');
  assert.match(loader, /public-barbershop-client-room-staging\.css\?v=20260910-client-room-1/);
  assert.match(loader, /public-barbershop-client-room-staging\.js\?v=20260910-client-room-1/);
});

test('client home is barber-first and middle content is reserved for rich rooms', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /CLIENT PROMO/);
  assert.match(room, /WELCOME TO/);
  assert.match(room, /data-barber-legacy-middle/);
  assert.match(room, /'home','cuts','social','shop','book'/);
  assert.match(room, /#services-section/);
  assert.match(room, /#social-section/);
  assert.match(room, /#products-section/);
  assert.match(room, /#lead-section/);
});

test('Book uses LIW native appointments and suppresses the external booking URL', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /data-liw-native-booking-action/);
  assert.match(room, /#booking-v1-section/);
  assert.match(room, /booking_enabled/);
  assert.match(room, /cardData\.booking_url=''/);
  assert.doesNotMatch(room, /window\.open\([^\n]*booking_url/);
});

test('client room adds no repeating timer or whole-card rebuild loop', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.doesNotMatch(room, /setInterval\s*\(/);
  assert.doesNotMatch(room, /scrollIntoView\s*\(/);
  assert.doesNotMatch(room, /setTimeout\s*\([^,]+,\s*250/);
});

test('barber shell has a shorter cover and barber chair rail treatment', () => {
  const css = read('css/public-barbershop-client-room-staging.css');
  assert.match(css, /12dvh/);
  assert.match(css, /max-height:108px/);
  assert.match(css, /barber-client-promo/);
  assert.match(css, /barber-dock-orbit/);
  assert.match(css, /border-radius:50%/);
  assert.match(css, /barber-native-booking-ready/);
});
