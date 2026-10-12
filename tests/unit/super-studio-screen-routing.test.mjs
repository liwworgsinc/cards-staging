import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const layout=readFileSync(new URL('../../js/super-studio-layout-v2-staging.js',import.meta.url),'utf8');
const publicLoader=readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js',import.meta.url),'utf8');
const editorLoader=readFileSync(new URL('../../js/editor-experience-state-guard-staging.js',import.meta.url),'utf8');

test('Work routing recognizes portfolio, featured and Before/After content',()=>{
  assert.match(layout,/function sectionBucket\(section\)/);
  assert.match(layout,/work-transformations/);
  assert.match(layout,/before-after/);
  assert.match(layout,/portfolio/);
  assert.match(layout,/\.ss-ba-list,\.ss-work-grid,\.ss-featured-grid/);
  assert.match(layout,/return 'work'/);
});

test('generic Super Studio sections are routed to More instead of being dropped',()=>{
  assert.match(layout,/function repairScreenContents\(root\)/);
  assert.match(layout,/qa\('\.ss-section',root\)/);
  assert.match(layout,/const bucket=sectionBucket\(section\)/);
  assert.match(layout,/const target=screens\[bucket\]/);
  assert.match(layout,/if\(target&&section\.parentElement!==target\)target\.appendChild\(section\)/);
  assert.match(layout,/return 'more'/);
});

test('routing repair runs before screen activation and after dynamic changes',()=>{
  assert.match(layout,/function setScreen\(root,name,focus=true\)\{[\s\S]*repairScreenContents\(root\)/);
  assert.match(layout,/function refreshDynamicNodes\(root\)\{[\s\S]*repairScreenContents\(root\)/);
  assert.match(layout,/root\.dataset\.ssScreenRouting='stable'/);
});

test('public and editor both load the cache-bumped routing runtime',()=>{
  assert.match(publicLoader,/super-studio-layout-v2-staging\.js\?v=20261012-routing-1/);
  assert.match(editorLoader,/super-studio-layout-v2-staging\.js\?v=20261012-routing-1/);
});
