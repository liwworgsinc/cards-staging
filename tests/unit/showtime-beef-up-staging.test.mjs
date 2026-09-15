import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Showtime keeps Beef Your Card Up in the global Business Toolkit', () => {
  const loader = read('js/payment-link-lite-gate-staging.js');
  const toolkit = read('js/editor-business-toolkit.js');

  assert.match(loader, /editor-business-toolkit\.js\?v=20260915-showtime-beefup-1/);
  assert.match(loader, /editor-business-toolkit\.css\?v=20260915-showtime-beefup-1/);
  assert.match(loader, /document\.querySelector\('\.editor-page'\)/);

  assert.match(toolkit, /beef:\{title:'Beef Your Card Up',category:'enhance'/);
  assert.match(toolkit, /beef:document\.getElementById\('rich-card-builder'\)/);
  assert.match(toolkit, /data-tool="\$\{key\}"/);
});
