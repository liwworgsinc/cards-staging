import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editor = readFileSync(new URL('../../js/editor.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../editor.html', import.meta.url), 'utf8');

test('Preview is wired before optional editor controls', () => {
  const wireStart = editor.indexOf('function wireEvents()');
  const previewBind = editor.indexOf("document.getElementById('preview-link')?.addEventListener('click', openFullPreview)", wireStart);
  const optionalPublish = editor.indexOf("document.getElementById('panel-publish-button')?.addEventListener", wireStart);
  assert.ok(wireStart >= 0);
  assert.ok(previewBind > wireStart);
  assert.ok(optionalPublish > previewBind);
});

test('missing secondary controls cannot abort Preview wiring', () => {
  assert.match(editor, /getElementById\('panel-publish-button'\)\?\.addEventListener/);
  assert.match(editor, /getElementById\('copy-card-link'\)\?\.addEventListener/);
  assert.match(editor, /getElementById\('download-qr'\)\?\.addEventListener/);
});

test('editor page exposes desktop and mobile Preview controls and fresh editor asset', () => {
  assert.match(html, /id="preview-link"/);
  assert.match(html, /id="mobile-preview-button"/);
  assert.match(html, /js\/editor\.js\?v=20260829-preview-wiring-2/);
});
