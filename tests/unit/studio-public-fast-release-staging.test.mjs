import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const fast = read('js/studio-public-fast-release-staging.js');
const social = read('js/public-barber-social-svg-staging.js');

test('Studio does not reveal the raw Barber shell before adaptive identity is applied', () => {
  assert.match(fast, /function identityReady\(\)/);
  assert.match(fast, /root\.classList\.contains\('liw-public-studio'\)/);
  assert.match(fast, /card\.dataset\.studioBusinessType/);
  assert.match(fast, /studio-public-industry/);
  assert.match(fast, /TYPE_LABELS/);
  assert.match(fast, /if\(!card\|\|card\.hidden\|\|!identityReady\(\)\)return false/);
});

test('Studio dock is hidden until its click controller and client-room API are ready', () => {
  assert.match(fast, /function dockReady\(\)/);
  assert.match(fast, /window\.LIWBarberRevolvingDock/);
  assert.match(fast, /window\.LIWBarberClientRoom/);
  assert.match(fast, /dock\.dataset\.gesturesBound==='true'/);
  assert.match(fast, /data-barber-dock-action/);
  assert.match(fast, /liw-studio-dock-ready/);
  assert.match(fast, /not\(\.liw-studio-dock-ready\).*barber-revolve-dock/s);
});

test('Studio actively mounts controllers but never waits for optional room content', () => {
  assert.match(fast, /LIWBarberClientRoom\?\.mount/);
  assert.match(fast, /LIWBarberRevolvingDock\?\.mount/);
  assert.match(fast, /MOUNT_KICK_MS=650/);
  assert.match(fast, /MAX_STUDIO_GATE_MS=2800/);
  assert.doesNotMatch(fast, /public-gallery-grid/);
  assert.doesNotMatch(fast, /public-map-frame/);
});

test('Non-barber Studio removes barber chrome and uses saved template palette variables', () => {
  assert.match(fast, /not\(\[data-studio-business-type="barber"\]\).*public-cover::after/s);
  assert.match(fast, /barber-hint-symbol::after/);
  assert.match(fast, /var\(--barber-primary/);
  assert.match(fast, /var\(--barber-secondary/);
  assert.match(fast, /var\(--barber-background/);
  assert.match(fast, /var\(--barber-text/);
});

test('Studio public loader is fully disabled after adaptive identity release', () => {
  assert.match(fast, /liw-card-loader-active/);
  assert.match(fast, /loading\.hidden=true/);
  assert.match(fast, /display','none','important'/);
  assert.match(fast, /animation','none','important'/);
});

test('Public hook cache-busts the interactive Studio readiness controller', () => {
  assert.match(social, /studio-public-fast-release-staging\.js\?v=20260912-studio-interactive-1/);
  assert.doesNotMatch(social, /studio-public-fast-release-staging\.js\?v=20260912-studio-fast-1/);
});
