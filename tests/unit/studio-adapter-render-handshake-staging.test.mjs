import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/public-studio-adapter-handshake-staging.js', import.meta.url), 'utf8');
const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('Studio handshake waits for a rendered Studio card and the existing adapter', () => {
  assert.match(source, /card\.hidden/);
  assert.match(source, /mode==='barbershop'/);
  assert.match(source, /__LIW_PUBLIC_BARBERSHOP_STAGING__!==true/);
});

test('Studio handshake only signals the existing adapter instead of rendering a second theme', () => {
  assert.match(source, /liw:card-loader-ready/);
  assert.match(source, /studio-card-rendered/);
  assert.doesNotMatch(source, /innerHTML\s*=/);
  assert.doesNotMatch(source, /createElement\(['"]style['"]\)/);
  assert.doesNotMatch(source, /#loading/);
});

test('card page loads the one-shot Studio adapter handshake', () => {
  assert.match(cardHtml, /public-studio-adapter-handshake-staging\.js\?v=20260912-studio-handshake-1/);
});
