import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop starts with Home only and creates iframe rooms on demand', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /function ensureBaseStage\(\)/);
  assert.match(room, /function ensureFrameSurface\(\)/);
  assert.match(room, /loading=\"lazy\"/);
  assert.match(room, /FRAME_KEYS=new Set\(\['cuts','gallery','map','reviews','social','shop','inquiry'\]\)/);
  assert.doesNotMatch(room, /loading=\"eager\"/);
});

test('rich room work is deferred off the tap path', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /function scheduleRoomLoad\(key\)/);
  assert.match(room, /requestAnimationFrame\(\(\)=>\{\s*setTimeout/s);
  assert.match(room, /frame\.srcdoc=doc/);
  const openFrame = room.match(/function openFrame\(key\)\{[\s\S]*?\n  \}/)?.[0] || '';
  assert.doesNotMatch(openFrame, /frameDocument\(|roomMarkup\(/);
  assert.match(openFrame, /scheduleRoomLoad\(key\)/);
});

test('Map iframe itself only loads after Load map is pressed', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /data-barber-load-map/);
  assert.match(room, /data-barber-map-slot/);
  assert.match(room, /f\.src='https:\/\/www\.google\.com\/maps\?q='/);
  assert.doesNotMatch(room, /<iframe class=\"public-map-frame\"[^>]+src=\"https:\/\/www\.google\.com\/maps/);
});

test('client room has no broad startup observer, polling or icon remount', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.doesNotMatch(room, /sourceObserver|function watchSources|lucide\.createIcons|setInterval\s*\(|scrollIntoView\s*\(/);
});

test('the only MutationObserver is bounded and only used after Book is requested', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  const observers = room.match(/new MutationObserver/g) || [];
  assert.equal(observers.length, 1);
  assert.match(room, /function waitForNativeAppointment\(\)/);
  assert.match(room, /bookingObserverTimer=setTimeout/);
  assert.match(room, /clearBookingObserver\(\)/);
  assert.match(room, /},2500\)/);
});

test('Book stays on LIW native appointments and external booking is suppressed', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /openNativeAppointment/);
  assert.match(room, /#booking-v1-section/);
  assert.match(room, /data-liw-native-booking-action/);
  assert.match(room, /cardData\.booking_url=''/);
  assert.doesNotMatch(room, /window\.open\([^\n]*booking_url/);
});

test('inquiry iframe bridges to the existing LIW lead form', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /liw-barber-inquiry-submit/);
  assert.match(room, /form\.requestSubmit/);
  assert.match(room, /postMessage/);
});

test('Untitled Card is replaced with barber-friendly public fallback', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /\^untitled\\s\+card\$/i);
  assert.match(room, /'Your Barber'/);
});

test('main card stays locked while home, iframe and booking surfaces own scrolling', () => {
  const css = read('css/public-barbershop-client-room-staging.css');
  assert.match(css, /\.public-content\{[^}]*overflow:hidden!important/);
  assert.match(css, /barber-client-iframe/);
  assert.match(css, /barber-booking-host/);
  assert.match(css, /overflow-y:auto/);
  assert.match(css, /max-height:108px/);
});
