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
  assert.match(source, /uploadGalleryPhotos\(files\)\.finally\(\(\) => \{ upload\.value = ''; \}\);/);
});
