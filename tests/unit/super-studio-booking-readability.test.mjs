import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../css/super-studio-booking-hotfix-staging.css',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../../js/super-studio-booking-hotfix-staging.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js',import.meta.url),'utf8');

test('Super Studio appointment modal keeps labels, values and placeholders readable on white fields',()=>{
  assert.match(css,/#booking-v1-section label/);
  assert.match(css,/#booking-v1-section input/);
  assert.match(css,/#booking-v1-section textarea/);
  assert.match(css,/#booking-v1-section select/);
  assert.match(css,/color:#111827!important/);
  assert.match(css,/input::placeholder/);
  assert.match(css,/textarea::placeholder/);
  assert.match(css,/color:#6b7280!important/);
  assert.match(css,/-webkit-text-fill-color:#111827!important/);
});

test('booking readability boundary does not flatten the themed primary submit button',()=>{
  assert.match(css,/button:not\(\[type="submit"\]\):not\(\.btn-primary\)/);
  assert.doesNotMatch(css,/#booking-v1-section button\{color:#111827!important/);
});

test('booking readability CSS and runtime are cache-busted in the public Super Studio loader',()=>{
  assert.match(runtime,/super-studio-booking-hotfix-staging\.css\?v=20261012-readability-1/);
  assert.match(loader,/super-studio-booking-hotfix-staging\.js\?v=20261012-readability-1/);
});
