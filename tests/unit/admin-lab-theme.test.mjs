import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const editorLab = readFileSync(new URL('../../js/editor-admin-lab-staging.js', import.meta.url), 'utf8');
const previewBridge = readFileSync(new URL('../../js/editor-preview-production-parity-staging.js', import.meta.url), 'utf8');
const publicLab = readFileSync(new URL('../../js/public-admin-scroll-lab-staging.js', import.meta.url), 'utf8');

test('LIW Lab editor tile is gated by the real editor admin state', () => {
  assert.match(editorLab, /typeof isAdmin !== 'undefined' && isAdmin === true/);
  assert.match(editorLab, /if \(!editorGlobal\('admin'\)\) return/);
  assert.match(editorLab, /ADMIN ONLY/);
});

test('LIW Lab stays isolated from saved customer theme fields', () => {
  assert.doesNotMatch(editorLab, /template_id\s*=/);
  assert.doesNotMatch(editorLab, /card_experience\s*=/);
  assert.doesNotMatch(editorLab, /card_layout\s*=/);
  assert.doesNotMatch(editorLab, /from\(['"][^'"]+['"]\)\.(insert|upsert|update|delete)/);
  assert.match(editorLab, /Customer themes stay untouched/);
});

test('LIW Lab selection decorates Preview with the public lab flag', () => {
  assert.match(editorLab, /searchParams\.set\('liwAdminScroll', '1'\)/);
  assert.match(previewBridge, /editor-admin-lab-staging\.js/);
  assert.match(previewBridge, /LIWAdminLab\?\.decoratePreviewUrl/);
});

test('public LIW Lab includes the larger experimental interactions', () => {
  assert.match(publicLab, /liw-admin-lab-dock/);
  assert.match(publicLab, /public-service-list/);
  assert.match(publicLab, /scroll-snap-type:x mandatory/);
  assert.match(publicLab, /public-product-grid/);
  assert.match(publicLab, /IntersectionObserver/);
  assert.match(publicLab, /prefers-reduced-motion:reduce/);
});
