import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime=readFileSync(new URL('../../js/super-studio-home-v9-staging.js',import.meta.url),'utf8');
const style=readFileSync(new URL('../../css/super-studio-home-v9-staging.css',import.meta.url),'utf8');
const loader=readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js',import.meta.url),'utf8');

test('Super Studio Home surfaces saved Email and Website contact actions',()=>{
  assert.match(runtime,/card\?\.email/);
  assert.match(runtime,/card\?\.website/);
  assert.match(runtime,/mailto:/);
  assert.match(runtime,/data-ss-home-action/);
  assert.match(runtime,/'mail','Email'/);
  assert.match(runtime,/'globe-2','Website'/);
});

test('Super Studio Home fills dead space with useful previews from existing content',()=>{
  assert.match(runtime,/Why book here/);
  assert.match(runtime,/Popular services/);
  assert.match(runtime,/Featured transformation/);
  assert.match(runtime,/Client love/);
  assert.match(runtime,/Meet your professional/);
  assert.match(runtime,/beforeAfter/);
  assert.match(runtime,/reviews/);
  assert.match(runtime,/biography/);
});

test('Home teasers navigate to the full Services Work and More screens',()=>{
  assert.match(runtime,/data-ss-home-jump/);
  assert.match(runtime,/navigate\(root,jump\.dataset\.ssHomeJump\)/);
  assert.match(runtime,/data-ss-app-screen/);
});

test('Home layout remains compact and card-like instead of another long page',()=>{
  assert.match(style,/\.ss-home-contact-grid/);
  assert.match(style,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(style,/\.ss-home-services/);
  assert.match(style,/\.ss-home-transformation/);
  assert.match(style,/height:118px/);
});

test('public loader cache-busts and loads V9 Home after Super Studio layout',()=>{
  assert.match(loader,/super-studio-home-v9-staging\.js\?v=20261012-home-1/);
  assert.match(loader,/loadHome/);
  assert.match(loader,/loadFinalParity/);
});
