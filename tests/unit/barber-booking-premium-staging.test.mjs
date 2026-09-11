import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../css/public-barbershop-booking-premium-staging.css', import.meta.url), 'utf8');
const card = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('Barber booking premium skin is scoped to the Barber booking host', () => {
  assert.match(css, /#card\.barbershop-card-active \.barber-booking-host/);
  assert.match(css, /#booking-v1-section/);
  assert.match(css, /BOOK MY CHAIR/);
  assert.match(css, /public-booking-service\.active/);
  assert.match(css, /public-booking-slots/);
  assert.match(css, /#booking-v1-submit/);
});

test('Barber booking skin keeps controls readable and mobile tappable', () => {
  assert.match(css, /min-height:52px!important/);
  assert.match(css, /min-height:44px!important/);
  assert.match(css, /background:#f5f5f7!important/);
  assert.match(css, /color:#111827!important/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});

test('card loads the isolated cache-busted Barber booking stylesheet', () => {
  assert.match(card, /data-liw-barber-booking-premium="true"/);
  assert.match(card, /public-barbershop-booking-premium-staging\.css\?v=20260911-barber-booking-premium-1/);
});

test('premium Barber booking skin is CSS-only', () => {
  assert.doesNotMatch(css, /MutationObserver|setInterval|requestAnimationFrame|addEventListener|supabase/i);
});
