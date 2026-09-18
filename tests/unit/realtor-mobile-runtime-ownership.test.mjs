import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const swipe = fs.readFileSync('js/public-swipe-card.js','utf8');
const enhancements = fs.readFileSync('js/public-card-enhancements-staging.js','utf8');
const cardHtml = fs.readFileSync('card.html','utf8');

test('explicit Realtor experience cannot be replaced by Flow/swipe template layout',()=>{
  assert.ok(swipe.includes("if(experience&&experience!=='classic'&&experience!=='flow')return false;"),
    'public swipe runtime must reject explicit non-Flow experiences');
  assert.ok(swipe.includes("(legacySwipe&&(!experience||experience==='classic'))"),
    'legacy swipe layout should only activate for classic/unspecified experiences');
  assert.ok(enhancements.includes("experience==='flow'||(legacySwipe&&(!experience||experience==='classic'))"),
    'Flow enhancement loader must use the same experience guard');
});

test('staging public card directly loads Realtor runtime and guarded local swipe runtime',()=>{
  assert.ok(cardHtml.includes('js/realtor-public-v1.js?v=20260918-mobile-runtime-1'),
    'Realtor public runtime should load directly from card.html');
  assert.ok(cardHtml.includes('js/public-swipe-card.js?v=20260918-experience-guard-1'),
    'staging should use guarded local swipe runtime');
  assert.equal(cardHtml.includes('https://cards.liwworgs.com/js/public-swipe-card.js'),false,
    'staging must not use production swipe runtime');
});
