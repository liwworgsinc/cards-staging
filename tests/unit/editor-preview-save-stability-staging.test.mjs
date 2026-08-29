import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const config = read('js/config.js');
const fix = read('js/editor-preview-save-fix-staging.js');
const previewPage = read('card-preview.html');
const previewConfig = read('js/public-card-preview-config-staging.js');

test('staging editor loads the preview/save reliability patch only on editor.html', () => {
  assert.match(config, /page !== 'editor\.html'/);
  assert.match(config, /editor-preview-save-fix-staging\.js\?v=20260829-preview-save-1/);
});

test('preview waits for the latest confirmed save before opening the private route', () => {
  assert.match(fix, /await flushLatestSave\(\{ silent: true \}\)/);
  assert.match(fix, /card-preview\.html/);
  assert.match(fix, /searchParams\.set\('slug', slug\)/);
  assert.match(fix, /searchParams\.set\('preview', '1'\)/);
});

test('Save now coalesces with active autosave instead of forcing another request', () => {
  assert.match(fix, /flushSave\(\{ force: false, silent \}\)/);
  assert.doesNotMatch(fix, /flushSave\(\{ force: true/);
});

test('text-like controls do not double-save on input followed by change', () => {
  assert.match(fix, /document\.addEventListener\('change'/);
  assert.match(fix, /HTMLSelectElement/);
  assert.match(fix, /\['checkbox', 'radio'\]/);
  assert.match(fix, /stopImmediatePropagation/);
});

test('private preview reuses the authenticated editor session while normal public cards stay separate', () => {
  assert.match(previewPage, /public-card-preview-config-staging\.js\?v=20260829-preview1/);
  assert.match(previewPage, /Private draft preview — only you can see this/);
  assert.match(previewConfig, /persistSession:\s*true/);
  assert.match(previewConfig, /autoRefreshToken:\s*true/);
  assert.match(previewConfig, /detectSessionInUrl:\s*false/);
  assert.doesNotMatch(previewConfig, /liw-public-card-anonymous/);
});
