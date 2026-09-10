import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop starts with Home only and creates iframe rooms on demand', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /function ensureBaseStage\(\)/);
  assert.match(room, /function ensureFrameSurface\(\)/);
  assert.match(room, /ensureFrameSurface\(\);\s*activeRoom=key/);
  assert.match(room, /loading=\"lazy\"/);
  assert.match(room, /FRAME_KEYS=new Set\(\['cuts','gallery','map','reviews','social','shop','inquiry'\]\)/);
  assert.doesNotMatch(room, /loading=\"eager\"/);
});

test('client room removes broad startup observers and repeated icon remounting', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.doesNotMatch(room, /sourceObserver/);
  assert.doesNotMatch(room, /function watchSources/);
  assert.doesNotMatch(room, /lucide\.createIcons/);
  assert.doesNotMatch(room, /setInterval\s*\(/);
  assert.doesNotMatch(room, /scrollIntoView\s*\(/);
});

test('the only client-room MutationObserver is bounded and created after Book is requested', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  const observers = room.match(/new MutationObserver/g) || [];
  assert.equal(observers.length, 1);
  assert.match(room, /function waitForNativeAppointment\(\)/);
  assert.match(room, /bookingObserverTimer=setTimeout/);
  assert.match(room, /clearBookingObserver\(\)/);
  assert.match(room, /},3000\)/);
});

test('Map and other rich content are generated only from the requested room', () => {
  const room = read('js/public-barbershop-client-room-staging.js');
  assert.match(room, /function roomMarkup\(key\)/);
  assert.match(room, /if\(key==='map'\)return fallbackMap\(\)/);
  assert.match(room, /frame\.srcdoc=frameDocument\(key,roomMarkup\(key\)\)/);
  assert.match(room, /rich\('gallery'\)/);
  assert.match(room, /rich\('location'\)/);
  assert.match(room, /rich\('testimonials'\)/);
});

test('Book stays on LIW native appointments and external booking remains suppressed', () => {
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

test('Untitled Card is replaced with a barber-friendly public fallback', () => {
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
