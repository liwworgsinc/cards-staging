import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/liw-auto-contrast-surfaces-staging.js', import.meta.url), 'utf8');

test('surface contrast discovers computed backgrounds generically', () => {
  assert.ok(source.includes('function ownBg'));
  assert.ok(source.includes("root.querySelectorAll?.('*')"));
  assert.ok(source.includes('function samples'));
  assert.ok(source.includes('function gradients'));
});

test('detected surfaces expose reusable design-system contrast tokens', () => {
  for (const token of ['--liw-surface-bg','--liw-surface-text','--liw-surface-muted','--liw-surface-border','--liw-surface-icon','--liw-surface-accent','--liw-auto-control-accent']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
});

test('normal text, large text and UI graphics use 4.5:1 and 3:1 thresholds', () => {
  assert.ok(source.includes('text=best(bgs,current,4.5)'));
  assert.ok(source.includes('?3:4.5'));
  assert.ok(source.includes('bestAccent(bgs,accent,secondary,3)'));
});

test('dynamic and hidden content is recalculated without polling', () => {
  assert.match(source, /new MutationObserver\(\(\)=>scheduleSurfaces\(\)\)/);
  assert.ok(source.includes("attributeFilter:['class','style','hidden','aria-hidden']"));
  assert.ok(source.includes("typeof requestAnimationFrame==='function'?requestAnimationFrame(run)"));
  assert.doesNotMatch(source, /setInterval\s*\(/);
});

test('same-origin template iframes inherit the global contrast system', () => {
  assert.ok(source.includes('function iframeRoots'));
  assert.ok(source.includes('f.contentDocument?.body'));
  assert.ok(source.includes("f.addEventListener('load',scheduleSurfaces"));
  assert.ok(source.includes('el?.ownerDocument?.defaultView||g'));
});

test('barbershop special surfaces remain supported by the global engine', () => {
  for (const token of ['barber-client-home','barber-client-promo','barber-revolve-dock','barber-iframe-top','barber-booking-host','#social-section .social-brand-icon']) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
});
