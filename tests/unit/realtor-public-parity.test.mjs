import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const analytics=fs.readFileSync('js/site-analytics-staging.js','utf8');
const realtor=fs.readFileSync('js/realtor-public-v1.js','utf8');
const cardHtml=fs.readFileSync('card.html','utf8');

test('public Realtor has one runtime owner',()=>{
  assert.equal(analytics.includes("page==='card.html'?'js/realtor-public-v1.js"),false,
    'shared staging loader must not inject public Realtor');
  assert.ok(cardHtml.includes('js/realtor-public-v1.js?v=20260918-public-parity-2'),
    'card.html must own the public Realtor runtime');
});

test('public Realtor loads both public settings and public listings',()=>{
  assert.ok(realtor.includes("rpc('public_realtor_listings'"),
    'public Realtor must load visible listings through the public RPC');
  assert.ok(realtor.includes("rpc('public_realtor_settings_by_slug'"),
    'public Realtor must load brokerage/settings through the public RPC');
  assert.ok(realtor.includes("cardData.realtor_settings=publicSettings"),
    'public Realtor must apply fetched settings before rendering');
});
