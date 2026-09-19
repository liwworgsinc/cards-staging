import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Beef Up gallery uploads use the signed-in storage owner and remain reusable', () => {
  const source = read('js/editor-rich-sections.js');

  assert.match(source, /const storageUserId = \(typeof user !== 'undefined' && user\?\.id\) \? user\.id : null;/);
  assert.match(source, /\$\{storageUserId\}\/galleries\/\$\{cardId\}\//);
  assert.doesNotMatch(source, /\$\{ownerId\(\)\}\/galleries\/\$\{cardId\}\//);
  assert.match(source, /contentType:file\.type \|\| 'image\/jpeg'/);
  assert.match(source, /if \(!data\?\.publicUrl\) throw new Error\('The gallery photo uploaded but no public URL was returned\.'\);/);
  assert.match(source, /class="rich-gallery-file-input" type="file"/);
  assert.doesNotMatch(source, /data-gallery-upload><\/label>/);
  assert.match(source, /uploadGalleryPhotos\(upload\)\.finally\(\(\) => \{ upload\.value = ''; \}\);/);
  assert.match(source, /LIWImageOptimizeStaging\?\.optimizeFile/);
});


test('editor cache-busts Beef Up assets after the upload repair', () => {
  const editor = read('editor.html');
  const optimizer = read('js/editor-image-optimize-staging.js');

  assert.match(editor, /rich-sections\.css\?v=20260919-beef-upload-3/);
  assert.match(editor, /editor-rich-sections\.js\?v=20260919-beef-upload-3/);
  assert.match(editor, /rich-sections-pro-gate\.js\?v=20260919-beef-upload-3/);
  assert.match(optimizer, /input\.hasAttribute\('data-gallery-upload'\)/);
});
