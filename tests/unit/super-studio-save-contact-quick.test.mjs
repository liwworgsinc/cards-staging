import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime=readFileSync(new URL('../../js/super-studio-save-contact-quick-staging.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js',import.meta.url),'utf8');

test('Super Studio Home exposes Save Contact beside the quick contact actions',()=>{
  assert.match(runtime,/button\.dataset\.ssHomeAction='save-contact'/);
  assert.match(runtime,/Save Contact/);
  assert.match(runtime,/user-round-plus/);
  assert.match(runtime,/button\.className='ss-quick'/);
});

test('Save Contact reuses the existing LIW vCard action instead of creating a second contact format',()=>{
  assert.match(runtime,/q\('#save'\)/);
  assert.match(runtime,/save\.click\(\)/);
  assert.match(runtime,/window\.saveVcard/);
});

test('public Super Studio loader mounts the Save Contact quick action',()=>{
  assert.match(loader,/super-studio-save-contact-quick-staging\.js\?v=20261012-save-contact-1/);
  assert.match(loader,/loadSaveContact/);
  assert.match(loader,/data-liw-super-studio-save-contact-quick/);
});
