import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');
const editorHtml = readFileSync(new URL('../../editor.html', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../../js/editor.js', import.meta.url), 'utf8');
const previewParitySource = readFileSync(new URL('../../js/editor-preview-production-parity-staging.js', import.meta.url), 'utf8');

test('staging card preview uses the proven production public renderer', () => {
  assert.match(cardHtml, /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/);
  assert.match(cardHtml, /https:\/\/cards\.liwworgs\.com\/js\/config\.js\?v=20260729-10/);
  assert.match(cardHtml, /https:\/\/cards\.liwworgs\.com\/js\/public-card\.js\?v=20260812-8/);
  assert.doesNotMatch(cardHtml, /js\/public-card\.js\?v=20260912-staging-draft-renderer/);
});

test('staging forces fresh stable Barbershop loader and social assets', () => {
  assert.match(cardHtml, /public-card-liw-loader-staging\.js\?v=20260912-barber-engine-reset-1/);
  assert.match(cardHtml, /public-barber-social-svg-staging\.js\?v=20260912-barber-social-v4-reset-1/);
});

test('editor preview is not hijacked by the retired staging private-preview interceptor', () => {
  assert.doesNotMatch(editorHtml, /editor-preview-save-fix-staging\.js/);
  assert.match(editorSource, /document\.getElementById\('preview-link'\)\?\.addEventListener\('click', openFullPreview\)/);
  assert.match(editorSource, /previewWindow\.location\.replace\(cardUrl\(\)\)/);
  assert.match(editorSource, /return liwUrl\(`card\.html\?slug=/);
});

test('Preview finishes the latest save before navigation and never leaves a blank popup on failure', () => {
  assert.match(previewParitySource, /await saveLatest\(\);/);
  assert.match(previewParitySource, /navigateToPreview\(url\);/);
  assert.match(previewParitySource, /#preview-link, #mobile-preview-button, #liw-mobile-public-preview-launcher/);
  assert.match(previewParitySource, /previewWindow && !previewWindow\.closed\) previewWindow\.close\(\)/);
  assert.doesNotMatch(previewParitySource, /Background save failed/);
});
