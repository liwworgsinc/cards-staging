import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop loader mounts the isolated premium revolving dock assets', () => {
  const loader = read('js/public-card-liw-loader-staging.js');
  assert.match(loader, /public-barbershop-revolving-dock-staging\.css\?v=20260910-premium-safe-1/);
  assert.match(loader, /public-barbershop-revolving-dock-staging\.js\?v=20260910-premium-safe-1/);
});

test('revolving dock is event driven and does not use a repeating timer', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  assert.doesNotMatch(dock, /setInterval\s*\(/);
  assert.match(dock, /pointerdown/);
  assert.match(dock, /pointerup/);
  assert.match(dock, /ArrowRight/);
  assert.match(dock, /MutationObserver/);
  assert.match(dock, /observer\?\.disconnect/);
});

test('dock supports the premium barber actions and cyclic positioning', () => {
  const dock = read('js/public-barbershop-revolving-dock-staging.js');
  for (const label of ['Home','Book','Call','Text','Cuts','Social','Shop','Save']) {
    assert.match(dock, new RegExp(`label:'${label}'`));
  }
  assert.match(dock, /shortestDistance/);
  assert.match(dock, /--dock-slot/);
  assert.doesNotMatch(dock, /scrollIntoView\s*\(/);
});

test('Barbershop app shell locks the main page and scrolls only the middle content', () => {
  const css = read('css/public-barbershop-revolving-dock-staging.css');
  assert.match(css, /100dvh/);
  assert.match(css, /overflow:hidden!important/);
  assert.match(css, /\.public-content\{[^}]*overflow-y:auto!important/);
  assert.match(css, /grid-template-rows:auto minmax\(0,1fr\) 96px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /barberDockLand/);
  assert.match(css, /barberDockOrbit/);
});
