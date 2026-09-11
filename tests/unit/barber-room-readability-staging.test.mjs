import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/public-barber-room-readability-staging.js', import.meta.url), 'utf8');
const social = readFileSync(new URL('../../js/public-barber-social-room-premium-staging.js', import.meta.url), 'utf8');
const card = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('Barber iframe room uses surface-aware contrast', () => {
  assert.match(source, /function bestText\(background\)/);
  assert.match(source, /function bestAccent\(background,primary,secondary\)/);
  assert.match(source, /const roomText=bestText\(background\)/);
  assert.match(source, /const panelText=bestText\(panelBackground\)/);
  assert.match(source, /\.public-section-heading h2,\.public-rich-head h2/);
  assert.match(source, /\.public-product-card,\.product-card,\.public-service-item,\.service-card/);
});

test('Barber iframe room forces readable SVG/icon styling', () => {
  assert.match(source, /function styleSvg\(svg,color\)/);
  assert.match(source, /setImportant\(svg,'stroke','currentColor'\)/);
  assert.match(source, /setImportant\(shape,'fill','currentColor'\)/);
  assert.match(source, /i\[data-lucide\]/);
  assert.match(source, /social-brand-icon img/);
});

test('Barber room readability is installed immediately before setRoom clone path', () => {
  assert.match(source, /const original=api\.setRoom\.bind\(api\)/);
  assert.match(source, /prepareRoom\(key\)/);
  assert.match(source, /return original\(key\)/);
});

test('Barber room readability stays event driven', () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('staging cache-busts the readability loader', () => {
  assert.match(social, /public-barber-room-readability-staging\.js\?v=20260911-room-readability-1/);
  assert.match(card, /public-barber-social-room-premium-staging\.js\?v=20260911-barber-social-room-premium-2/);
  assert.match(card, /class="qr-center-logo"/);
});
