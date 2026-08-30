import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');
const editorHtml = readFileSync(new URL('../../editor.html', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../../js/editor.js', import.meta.url), 'utf8');
const publicCardSource = readFileSync(new URL('../../js/public-card.js', import.meta.url), 'utf8');

test('staging card preview has a real Supabase browser client before production renderer boots', () => {
  assert.match(cardHtml, /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/);
  assert.doesNotMatch(cardHtml, /vendor\/supabase-2\.110\.8\.js/);
  assert.match(cardHtml, /https:\/\/cards\.liwworgs\.com\/js\/config\.js\?v=20260729-10/);
  assert.match(cardHtml, /https:\/\/cards\.liwworgs\.com\/js\/public-card\.js\?v=20260812-8/);
  assert.match(cardHtml, /js\/pwa-install\.js\?v=20260830-card-fix-1/);
  assert.doesNotMatch(cardHtml, /public-card-config-staging\.js/);
});

test('editor preview is not hijacked by the retired staging private-preview interceptor', () => {
  assert.doesNotMatch(editorHtml, /editor-preview-save-fix-staging\.js/);
  assert.match(editorSource, /document\.getElementById\('preview-link'\)\?\.addEventListener\('click', openFullPreview\)/);
  assert.match(editorSource, /previewWindow\.location\.replace\(cardUrl\(\)\)/);
  assert.match(editorSource, /return liwUrl\(`card\.html\?slug=/);
});

test('public card lookup uses the secure RPC required for public cards and owner drafts', () => {
  assert.match(publicCardSource, /supabaseClient\.rpc\('public_card_by_slug', \{ p_slug: slug \}\)/);
  assert.match(publicCardSource, /ownerPreview = card\.status !== 'published' && Boolean\(signedInUser\)/);
});
