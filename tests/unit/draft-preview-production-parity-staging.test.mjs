import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');
const editorHtml = readFileSync(new URL('../../editor.html', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../../js/editor.js', import.meta.url), 'utf8');
const publicCardSource = readFileSync(new URL('../../js/public-card.js', import.meta.url), 'utf8');

test('staging draft preview follows the working production card.html flow', () => {
  assert.match(cardHtml, /vendor\/supabase-2\.110\.8\.js/);
  assert.match(cardHtml, /js\/config\.js\?v=20260829-prod-preview-parity-2/);
  assert.match(cardHtml, /js\/public-card\.js\?v=20260829-prod-preview-parity-2/);
  assert.doesNotMatch(cardHtml, /public-card-config-staging\.js/);
  assert.doesNotMatch(cardHtml, /cards\.liwworgs\.com\/js\/public-card\.js/);
});

test('editor preview is not hijacked by the retired staging private-preview interceptor', () => {
  assert.doesNotMatch(editorHtml, /editor-preview-save-fix-staging\.js/);
  assert.match(editorSource, /document\.getElementById\('preview-link'\)\?\.addEventListener\('click', openFullPreview\)/);
  assert.match(editorSource, /previewWindow\.location\.replace\(cardUrl\(\)\)/);
  assert.match(editorSource, /return liwUrl\(`card\.html\?slug=/);
});

test('public card lookup uses the same secure RPC as production for public cards and owner drafts', () => {
  assert.match(publicCardSource, /supabaseClient\.rpc\('public_card_by_slug', \{ p_slug: slug \}\)/);
  assert.match(publicCardSource, /ownerPreview = card\.status !== 'published' && Boolean\(signedInUser\)/);
});
