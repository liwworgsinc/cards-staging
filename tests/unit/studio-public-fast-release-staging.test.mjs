import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const fast = read('js/studio-public-fast-release-staging.js');
const social = read('js/public-barber-social-svg-staging.js');

test('Studio public reveal waits only for the core Studio card, not the dock or room', () => {
  assert.match(fast, /card\.classList\.contains\('barbershop-card-active'\)/);
  assert.doesNotMatch(fast, /q\('\.barber-revolve-dock'\)/);
  assert.doesNotMatch(fast, /q\('\.barber-client-home'\)/);
  assert.match(fast, /MAX_STUDIO_GATE_MS=2200/);
});

test('Studio public loader is fully disabled after release', () => {
  assert.match(fast, /liw-card-loader-active/);
  assert.match(fast, /loading\.hidden=true/);
  assert.match(fast, /display','none','important'/);
  assert.match(fast, /animation','none','important'/);
});

test('Public card loads the fast Studio release controller', () => {
  assert.match(social, /studio-public-fast-release-staging\.js\?v=20260912-studio-fast-1/);
  assert.doesNotMatch(social, /studio-runtime-stabilizer-staging\.js\?v=20260912-studio-runtime-1/);
});
