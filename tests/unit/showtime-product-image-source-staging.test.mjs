import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('Showtime Store exposes upload and URL on each existing product row', () => {
  const editor = read('editor.html');
  const script = read('js/editor-showtime-product-images-staging.js');
  assert.match(editor, /editor-showtime-product-images-staging\.js\?v=20260927-1/);
  assert.match(editor, /editor-showtime-product-images-staging\.css\?v=20260927-1/);
  assert.match(script, /card_experience.*music/);
  assert.match(script, /data-product-index/);
  assert.match(script, /data-product-field="image_url"/);
  assert.match(script, /data-showtime-image-file/);
  assert.match(script, /data-showtime-remove-image/);
});

test('Upload uses existing product image and save pipeline with file validation', () => {
  const script = read('js/editor-showtime-product-images-staging.js');
  assert.match(script, /image\/jpeg/);
  assert.match(script, /image\/png/);
  assert.match(script, /image\/webp/);
  assert.match(script, /5 \* 1024 \* 1024/);
  assert.match(script, /storage\.from\('profile-images'\)/);
  assert.match(script, /product\.image_urls = \[publicUrl\]/);
  assert.match(script, /new Event\('input', \{ bubbles: true \}\)/);
  assert.match(script, /flushSave\(\{ silent: true \}\)/);
  assert.match(script, /products\.indexOf\(product\)/);
});

test('Existing URL is retained and preview is restricted to HTTP(S)', () => {
  const script = read('js/editor-showtime-product-images-staging.js');
  assert.match(script, /url\.protocol === 'https:' \|\| url\.protocol === 'http:'/);
  assert.match(script, /var raw = field\.value\.trim\(\)/);
  assert.match(script, /image\.onerror/);
  assert.match(script, /field\.value = ''/);
  assert.match(read('js/editor.js'), /image_urls: Array\.isArray\(product\.image_urls\)/);
});