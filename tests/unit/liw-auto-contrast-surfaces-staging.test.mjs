import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/liw-auto-contrast-surfaces-staging.js', import.meta.url), 'utf8');
const pwa = readFileSync(new URL('../../js/pwa-install.js', import.meta.url), 'utf8');
const card = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('surface-aware contrast knows barber light and dark surfaces', () => {
  for (const token of ['barber-client-home','barber-client-promo','barber-revolve-dock','barber-iframe-top','barber-booking-host']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
});

test('surface-aware contrast exposes reusable LIW surface and accent APIs', () => {
  for (const token of ['resolvedBackground','applySurface','applySurfaces','bestAccent','--liw-surface-text','--liw-surface-muted','--liw-surface-accent','--liw-auto-control-accent']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
});

test('Auto Accent Contrast prefers primary, then secondary, then readable fallback', () => {
  assert.match(source, /contrastRatio\(primary,bg\)>=minRatio\)return primary/);
  assert.match(source, /contrastRatio\(secondary,bg\)>=minRatio\)return secondary/);
  assert.match(source, /return engine\.bestText\(bg\)/);
  assert.match(source, /minRatio=3/);
});

test('barber back arrow uses Auto Accent Contrast against its actual button surface', () => {
  assert.match(source, /querySelector\('\[data-barber-frame-home\]'\)/);
  assert.match(source, /resolvedBackground\(back,frameColors\.background\)/);
  assert.match(source, /engine\.bestAccent\(backBackground,primary,secondary,3\)/);
  assert.match(source, /back\.dataset\.liwAutoAccent='true'/);
});

test('barber social brand icons carry their paint rules into the sandboxed iframe clone', () => {
  assert.match(source, /prepareBarberSocialIcons/);
  assert.match(source, /#social-section \.social-brand-icon/);
  assert.match(source, /setProperty\('fill','currentColor','important'\)/);
  assert.match(source, /setProperty\('background','var\(--brand-bg,rgba\(255,255,255,\.08\)\)','important'\)/);
  assert.match(source, /setColor\(social\.querySelector\('\.public-section-heading h2'\),socialColors\.text\)/);
});

test('Auto Accent cache chain is fresh on the public staging card', () => {
  assert.ok(pwa.includes('liw-auto-contrast-surfaces-staging.js?v=20260910-global-surfaces-2'));
  assert.ok(card.includes('js/pwa-install.js?v=20260910-auto-accent-social-v3-1'));
});

test('surface-aware contrast remains event driven', () => {
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
});

test('barber mixed surfaces get independent readable text', () => {
  assert.match(source, /home\.style\.setProperty\('--barber-text',homeColors\.text\)/);
  assert.match(source, /promo\.style\.setProperty\('--barber-text',promoColors\.text\)/);
  assert.match(source, /setColor\(promo\.querySelector\('strong'\),promoColors\.text\)/);
  assert.match(source, /setColor\(home\.querySelector\('\.barber-welcome-specialty'\),homeColors\.muted\)/);
});
