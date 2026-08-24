import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const common = readFileSync(new URL('../../js/common.js', import.meta.url), 'utf8');
const pricing = readFileSync(new URL('../../pricing.html', import.meta.url), 'utf8');
const pricingJs = readFileSync(new URL('../../js/pricing.js', import.meta.url), 'utf8');
const flow = readFileSync(new URL('../../js/editor-swipe-layout.js', import.meta.url), 'utf8');

function liteCardMarkup() {
  const match = pricing.match(/<article class="card price-card lite-plan-card">([\s\S]*?)<\/article>/);
  assert.ok(match, 'Lite pricing card is missing');
  return match[1];
}

test('Lite is available in the staging plan simulator', () => {
  assert.match(common, /\['starter', 'lite', 'plus', 'pro', 'agency', 'white_label'\]/);
  assert.match(common, /plan_key:\s*'lite'/);
  assert.match(common, /name:\s*'Lite'/);
  assert.match(common, /card_limit:\s*1/);
});

test('Lite unlocks cover image and custom QR only from higher tiers', () => {
  assert.match(common, /cover_image:\s*true/);
  assert.match(common, /custom_qr:\s*true/);
  for (const locked of [
    'premium_templates', 'expanded_fonts', 'remove_branding', 'custom_seo',
    'appointment_booking', 'lead_capture', 'product_showcase', 'payment_sharing',
    'services_section', 'video_section', 'file_downloads', 'standard_analytics',
    'advanced_analytics', 'flow_experience'
  ]) {
    assert.ok(common.includes(`'${locked}'`), `Lite lock list is missing ${locked}`);
  }
});

test('Lite pricing is monthly, has no trial, and keeps the agreed feature boundary', () => {
  const card = liteCardMarkup();
  assert.match(card, /\$4\.99\s*<small>\/month<\/small>/);
  assert.match(card, /MONTHLY · NO TRIAL/);
  assert.match(card, /Classic card experience/);
  assert.match(card, /Core templates/);
  assert.match(card, /Cover image/);
  assert.match(card, /Custom QR colors \+ center logo/);
  assert.match(card, /LIW branding/);
  assert.doesNotMatch(card, /Premium templates/i);
  assert.doesNotMatch(card, /Flow interactive|Flow card/i);
  assert.doesNotMatch(card, /Services \+|products per card/i);
  assert.doesNotMatch(card, /Leads, booking/i);
  assert.doesNotMatch(card, /HTML download/i);
});

test('Lite checkout stays disabled until billing QA is approved', () => {
  assert.match(pricing, /data-plan="lite" data-billing-interval="month" disabled/);
  assert.match(pricingJs, /if\(plan==='lite'\)/);
  assert.match(pricingJs, /Lite checkout after QA/);
  assert.doesNotMatch(pricingJs, /\['lite','plus','pro'\]\.includes\(plan\)/);
});

test('Flow remains a Pro and Agency entitlement', () => {
  assert.match(flow, /access\.has\?\.\('flow_experience'\)/);
  assert.match(flow, /Flow is included with Pro and Agency plans/);
  assert.doesNotMatch(flow, /Lite.*Flow included/i);
});

test('Plus annual pricing remains cheaper than twelve months of Lite', () => {
  assert.match(pricing, /\$10\.88 less than 12 months of Lite/);
  assert.match(pricing, /\$49 <small>\/year<\/small>/);
});
