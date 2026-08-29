import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile(new URL('../../dashboard.html', import.meta.url), 'utf8');
const editorQr = await readFile(new URL('../../js/editor-qr-open-staging.js', import.meta.url), 'utf8');
const authCallback = await readFile(new URL('../../js/auth-callback.js', import.meta.url), 'utf8');

test('signed-in Create card entry points start a blank authenticated editor', () => {
  assert.match(dashboard, /href="editor\.html"[^>]*>[^<]*(?:<[^>]+>[^<]*<\/[^>]+>)?\s*Create card/i);
  assert.match(dashboard, /href="editor\.html"[^>]*>[\s\S]{0,120}New card/i);
  assert.match(dashboard, /href="editor\.html"[^>]*>[\s\S]{0,120}Add card/i);
});

test('editor helper never redirects id-less Create card route to a recent guest draft', () => {
  assert.doesNotMatch(editorQr, /recoverGuestDraftRoute/);
  assert.doesNotMatch(editorQr, /\.from\(['"]digital_cards['"]\)[\s\S]{0,500}location\.replace/);
  assert.match(editorQr, /sessionStorage\.removeItem\(['"]liw_guest_claim_ready['"]\)/);
});

test('guest auth handoff remains explicitly marked and separate from normal Create card', () => {
  assert.match(authCallback, /editor\.html\?welcome=1&guest_claim=1/);
  assert.match(authCallback, /localStorage\.setItem\(`liw_editor_draft_\$\{authUser\.id\}_new`/);
});
