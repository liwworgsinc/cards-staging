import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const publicRealtor = readFileSync(new URL('../../js/realtor-public-v1.js', import.meta.url), 'utf8');
const publicPage = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('Realtor hero collapses to about half height on scroll with its existing video intact', () => {
  assert.match(publicRealtor, /expandedHeight\*\.52/);
  assert.match(publicRealtor, /--realtor-hero-render-height/);
  assert.match(publicRealtor, /distance\/travel/);
  assert.match(publicRealtor, /requestAnimationFrame\(sync\)/);
  assert.match(publicRealtor, /realtor-public-hero-video.*src=/);
  assert.match(publicRealtor, /muted loop playsinline autoplay/);
  assert.doesNotMatch(publicRealtor, /video\.pause\(\)/);
});

test('The compact layout preserves the agent identity and hides only secondary details', () => {
  assert.match(publicRealtor, /realtor-hero-compact \.realtor-public-agent h1/);
  assert.match(publicRealtor, /realtor-hero-compact \.realtor-public-agent p/);
  assert.match(publicRealtor, /realtor-hero-compact \.realtor-office-control/);
  assert.match(publicRealtor, /if\(compact&&officeToggle\?\.getAttribute/);
});

test('The fallback sticky spacer follows current height and the change is Realtor-scoped', () => {
  assert.match(publicRealtor, /shell\.style\.setProperty\('--realtor-hero-height',nextHeight\+'px'\)/);
  assert.match(publicRealtor, /#card\.realtor-public-active \.realtor-public-shell\.realtor-hero-collapsible/);
  assert.match(publicPage, /js\/realtor-public-v1\.js\?v=20260929-realtor-scroll-collapse-staging-1/);
});
