import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../css/super-studio-public-shell-final-staging.css', import.meta.url), 'utf8');
const loader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('desktop Open Card is capped to the same focused card width',()=>{
  assert.match(css,/#card\.public-card\.super-studio-public-active/);
  assert.match(css,/430px/);
  assert.match(css,/\.ss-app-nav/);
  assert.match(css,/width:min\(calc\(100vw - 32px\),430px\)!important/);
});

test('mobile remains full width while desktop shell loads after app layout',()=>{
  assert.match(css,/@media \(max-width:640px\)/);
  assert.match(css,/max-width:none!important/);
  assert.match(loader,/super-studio-public-shell-final-staging\.css\?v=20261012-2/);
  assert.match(loader,/loadHotfixes/);
});
