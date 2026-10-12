import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../../js/editor-super-studio-main-preview-parity-staging.js',import.meta.url),'utf8');

test('Super Studio grants full access to Plus Pro and Agency tiers',()=>{
  for(const plan of ['plus','pro','agency','agency_starter','agency_pro']){
    assert.match(source,new RegExp(`['\"]${plan}['\"]`),`missing full-access plan ${plan}`);
  }
  assert.match(source,/FULL_ACCESS_PLANS/);
});

test('Free Lite and legacy Starter remain preview only',()=>{
  for(const plan of ['free','lite','starter']){
    assert.match(source,new RegExp(`['\"]${plan}['\"]`),`missing preview-only plan ${plan}`);
  }
  assert.match(source,/PREVIEW_ONLY_PLANS/);
  assert.match(source,/PREVIEW MODE/);
  assert.match(source,/This preview does not activate Super Studio on your card/);
});

test('restricted selector click is intercepted before activation',()=>{
  assert.match(source,/data-card-experience=\\?"super-studio\\?"/);
  assert.match(source,/event\.stopImmediatePropagation\(\)/);
  assert.match(source,/openRestrictedPreview\(\)/);
});

test('restricted users cannot use programmatic activate save or publish paths',()=>{
  assert.match(source,/api\.activate=function\(\)/);
  assert.match(source,/api\.save=function\(\)/);
  assert.match(source,/publishLike\(event\.target\)/);
  assert.match(source,/Upgrade to Plus, Pro, Agency Starter or Agency Pro to publish Super Studio/);
});

test('admin bypass is disabled during plan preview simulation',()=>{
  assert.match(source,/access\?\.isAdmin&&!access\?\.isPlanPreview/);
});
