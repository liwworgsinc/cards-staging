import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Beef Up gallery keeps the production upload behavior on staging', () => {
  const source = read('js/editor-rich-sections.js');

  assert.match(source, /<label class="rich-upload-button">/);
  assert.match(source, /multiple hidden data-gallery-upload/);
  assert.match(source, /if \(upload\) uploadGalleryPhotos\(upload\.files\);/);
  assert.match(source, /async function uploadGalleryPhotos\(fileList\)/);
  assert.match(source, /\$\{ownerId\(\)\}\/galleries\/\$\{cardId\}\//);
  assert.match(source, /storage\.from\('profile-images'\)\.upload/);
});

test('staging image optimizer does not intercept Beef Up gallery changes', () => {
  const optimizer = read('js/editor-image-optimize-staging.js');
  assert.match(optimizer, /input\.hasAttribute\('data-gallery-upload'\)/);
});

test('staging loads Beef Up with production-parity timing and fresh assets', () => {
  const editor = read('editor.html');
  const gate = read('js/rich-sections-pro-gate.js');

  assert.match(editor, /rich-sections\.css\?v=20260919-beef-prod-parity-1/);
  assert.match(editor, /editor-rich-sections\.js\?v=20260919-beef-prod-parity-1/);
  assert.match(editor, /rich-sections-pro-gate\.js\?v=20260919-beef-prod-parity-1/);

  assert.match(gate, /function loadBusinessToolkit\(\)/);
  assert.match(gate, /editor-business-toolkit\.js\?v=20260919-beef-prod-parity-1/);
  assert.match(gate, /payment-link-lite-gate-staging\.js\?v=20260919-beef-prod-parity-1/);
});
