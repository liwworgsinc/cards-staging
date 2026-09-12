import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loader = readFileSync(new URL('../../js/public-card-liw-loader-staging.js', import.meta.url), 'utf8');
const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('visible rendered card always releases the LIW loader even before experience data is readable', () => {
  assert.match(loader, /if\(!data\)\{[\s\S]*if\(!card\.hidden\)\{release\('card-visible'\);return true;\}/);
  assert.match(loader, /if\(loading\)\{[\s\S]*loading\.hidden=true;/);
  assert.match(loader, /if\(card&&!card\.hidden\)\{[\s\S]*release\(data\?'failsafe':'failsafe-visible'\)/);
});

test('fresh loader also fetches fresh Studio bridge and non-Barber chrome CSS', () => {
  assert.match(loader, /public-barbershop-staging\.js\?v=20260912-studio-root-fix-2/);
  assert.match(loader, /public-barbershop-client-room-staging\.css\?v=20260912-studio-chrome-2/);
  assert.match(cardHtml, /public-card-liw-loader-staging\.js\?v=20260912-studio-visible-handshake-1/);
});
