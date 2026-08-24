import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pricing = readFileSync(new URL('../../pricing.html', import.meta.url), 'utf8');
const pricingJs = readFileSync(new URL('../../js/pricing.js', import.meta.url), 'utf8');

test('Plus exposes 5.99 monthly and 49 yearly in staging', () => {
  assert.match(pricing, /Plus at \$5\.99\/month or \$49\/year/);
  assert.match(pricingJs, /data-plus-billing-option="month"/);
  assert.match(pricingJs, /<strong>\$5\.99<\/strong><small>\/month<\/small>/);
  assert.match(pricingJs, /data-plus-billing-option="year"/);
  assert.match(pricingJs, /<strong>\$49<\/strong><small>\/year<\/small>/);
});

test('Plus monthly has no trial and stays checkout-locked during QA', () => {
  assert.match(pricingJs, /plusMonthlyStaging=plan==='plus'&&interval==='month'/);
  assert.match(pricingJs, /Monthly · no trial/);
  assert.match(pricingJs, /\$5\.99\/month · checkout after QA/);
  assert.match(pricing, /Plus monthly do not include a free trial/);
});

test('Plus annual keeps the 7-day trial and 49 yearly price', () => {
  assert.match(pricing, /Start 7-day Plus trial/);
  assert.match(pricing, /\$49 <small>\/year<\/small>/);
  assert.match(pricingJs, /const isTrialPlan=\['plus','pro'\]\.includes\(plan\)&&interval==='year'/);
});

test('Plus yearly savings are communicated correctly', () => {
  assert.match(pricing, /Save \$22\.88 vs\. 12 monthly payments/);
  assert.match(pricingJs, /Switch to yearly anytime to save \$22\.88/);
});
