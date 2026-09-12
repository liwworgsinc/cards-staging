import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');
const editorHtml = readFileSync(new URL('../../editor.html', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../../js/editor.js', import.meta.url), 'utf8');
const previewParitySource = readFileSync(new URL('../../js/editor-preview-production-parity-staging.js', import.meta.url), 'utf8');
const publicCardSource = readFileSync(new URL('../../js/public-card.js', import.meta.url), 'utf8');

test('staging card preview boots its draft-capable local renderer', () => {
  assert.match(cardHtml, /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/);
  assert.match(cardHtml, /https:\/\/cards\.liwworgs\.com\/js\/config\.js\?v=20260729-10/);
  assert.match(cardHtml, /js\/public-card\.js\?v=20260912-staging-draft-renderer-1/);
  assert.doesNotMatch(cardHtml, /https:\/\/cards\.liwworgs\.com\/js\/public-card\.js/);
});

test('editor preview is not hijacked by the retired staging private-preview interceptor', () => {
  assert.doesNotMatch(editorHtml, /editor-preview-save-fix-staging\.js/);
  assert.match(editorSource, /document\.getElementById\('preview-link'\)\?\.addEventListener\('click', openFullPreview\)/);
  assert.match(editorSource, /previewWindow\.location\.replace\(cardUrl\(\)\)/);
  assert.match(editorSource, /return liwUrl\(`card\.html\?slug=/);
});

test('Preview finishes the latest save before navigation and does not leave a background save running', () => {
  assert.match(previewParitySource, /await saveLatest\(\);/);
  assert.match(previewParitySource, /navigateToPreview\(url\);/);
  assert.match(previewParitySource, /#preview-link, #mobile-preview-button, #liw-mobile-public-preview-launcher/);
  assert.doesNotMatch(previewParitySource, /Background save failed/);
  assert.doesNotMatch(previewParitySource, /Promise\.resolve\(flushSave/);
});

test('local staging public renderer supports authenticated owner draft preview and reveals the card', () => {
  assert.match(publicCardSource, /supabaseClient\.rpc\('public_card_by_slug', \{ p_slug: slug \}\)/);
  assert.match(publicCardSource, /ownerPreview = card\.status !== 'published' && Boolean\(signedInUser\)/);
  assert.match(publicCardSource, /document\.getElementById\('loading'\)\.hidden = true/);
  assert.match(publicCardSource, /card\.hidden = false/);
});
