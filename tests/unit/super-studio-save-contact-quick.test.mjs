import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime=readFileSync(new URL('../../js/super-studio-save-contact-quick-staging.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js',import.meta.url),'utf8');

test('Super Studio keeps Save Contact in the top utility bar',()=>{
  assert.match(runtime,/button\.dataset\.ssUtilitySave='true'/);
  assert.match(runtime,/button\.className='ss-round ss-utility-action'/);
  assert.match(runtime,/user-round-plus/);
  assert.match(runtime,/super-studio-top-actions/);
  assert.match(runtime,/qa\('\[data-ss-home-action="save-contact"\]'/);
});

test('Save Contact reuses the existing LIW vCard action instead of creating a second contact format',()=>{
  assert.match(runtime,/q\('#save'\)/);
  assert.match(runtime,/save\.click\(\)/);
  assert.match(runtime,/window\.saveVcard/);
});

test('Super Studio More owns payment info business info inquiry social and policies',()=>{
  assert.match(runtime,/Payment Info/);
  assert.match(runtime,/#payment-sharing-section/);
  assert.match(runtime,/#business-actions \[data-event="payment_click"\]/);
  assert.match(runtime,/Business Info/);
  assert.match(runtime,/Send Inquiry/);
  assert.match(runtime,/#lead-section/);
  assert.match(runtime,/ss-social-section/);
  assert.match(runtime,/ss-policy-actions/);
});

test('Super Studio More does not create a self-triggering mutation observer loop',()=>{
  assert.match(runtime,/if\(expected!==node\)/);
  assert.match(runtime,/let mounting=false/);
  assert.match(runtime,/function scheduleObservedMount\(\)/);
  assert.match(runtime,/new MutationObserver\(scheduleObservedMount\)/);
  assert.doesNotMatch(runtime,/new MutationObserver\(\(\)=>requestAnimationFrame\(mount\)\)/);
  assert.doesNotMatch(runtime,/if\(cursor\)\{more\.insertBefore\(node,cursor\.nextSibling\);cursor=node;\}/);
});

test('public Super Studio loader mounts the cache-busted More hub runtime',()=>{
  assert.match(loader,/super-studio-save-contact-quick-staging\.js\?v=20261014-more-loopfix-1/);
  assert.match(loader,/loadSaveContact/);
  assert.match(loader,/data-liw-super-studio-save-contact-quick/);
});
