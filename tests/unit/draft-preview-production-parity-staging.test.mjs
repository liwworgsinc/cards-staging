import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');
const editorHtml = readFileSync(new URL('../../editor.html', import.meta.url), 'utf8');
const editorSource = readFileSync(new URL('../../js/editor.js', import.meta.url), 'utf8');
const previewParitySource = readFileSync(new URL('../../js/editor-preview-production-parity-staging.js', import.meta.url), 'utf8');
const studioPersistenceSource = readFileSync(new URL('../../js/editor-studio-type-persistence-staging.js', import.meta.url), 'utf8');
const loaderSource = readFileSync(new URL('../../js/public-card-liw-loader-staging.js', import.meta.url), 'utf8');

test('staging card preview uses one current staging core on desktop and mobile', () => {
  assert.match(cardHtml, /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2/);
  assert.match(cardHtml, /js\/config\.js\?v=20260912-staging-core-1/);
  assert.match(cardHtml, /js\/common\.js\?v=20260912-staging-core-1/);
  assert.match(cardHtml, /js\/public-card\.js\?v=20260912-staging-core-1/);
  assert.doesNotMatch(cardHtml, /https:\/\/cards\.liwworgs\.com\/js\/config\.js/);
  assert.doesNotMatch(cardHtml, /https:\/\/cards\.liwworgs\.com\/js\/public-card\.js/);
});

test('staging forces fresh Barbershop loader, social hook and Studio bridge assets', () => {
  assert.match(cardHtml, /public-card-liw-loader-staging\.js\?v=20260912-barber-engine-reset-2/);
  assert.match(cardHtml, /public-barber-social-svg-staging\.js\?v=20260912-barber-social-v4-reset-2/);
  assert.match(loaderSource, /public-barbershop-staging\.js\?v=20260912-studio-root-fix-1/);
});

test('editor preview is not hijacked by the retired staging private-preview interceptor', () => {
  assert.doesNotMatch(editorHtml, /editor-preview-save-fix-staging\.js/);
  assert.match(editorSource, /document\.getElementById\('preview-link'\)\?\.addEventListener\('click', openFullPreview\)/);
  assert.match(editorSource, /previewWindow\.location\.replace\(cardUrl\(\)\)/);
  assert.match(editorSource, /return liwUrl\(`card\.html\?slug=/);
});

test('Preview saves card fields and latest Studio business type before navigation', () => {
  assert.match(previewParitySource, /editor-studio-type-persistence-staging\.js/);
  assert.match(previewParitySource, /await saveLatest\(\);/);
  assert.match(previewParitySource, /LIWStudioTypePersistence\?\.flush/);
  assert.match(previewParitySource, /await window\.LIWStudioTypePersistence\.flush\(\)/);
  assert.match(previewParitySource, /navigateToPreview\(url\);/);
  assert.match(previewParitySource, /#preview-link, #mobile-preview-button, #liw-mobile-public-preview-launcher/);
  assert.match(previewParitySource, /previewWindow && !previewWindow\.closed\) previewWindow\.close\(\)/);
  assert.doesNotMatch(previewParitySource, /Background save failed/);
});

test('Studio type persistence is last-write-wins instead of dropping mobile taps', () => {
  assert.match(studioPersistenceSource, /let desiredType=''/);
  assert.match(studioPersistenceSource, /while\(desiredType\)/);
  assert.match(studioPersistenceSource, /p_business_type:next/);
  assert.match(studioPersistenceSource, /queueMicrotask\(\(\)=>\{void queue\(type\);\}\)/);
  assert.match(studioPersistenceSource, /window\.LIWStudioTypePersistence=\{queue,flush/);
  assert.doesNotMatch(studioPersistenceSource, /if\(!studioActive\(\)\|\|persistBusy\)return/);
});
