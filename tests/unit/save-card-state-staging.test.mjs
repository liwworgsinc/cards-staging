import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const editor = read('js/editor.js');
const saveFunction = read('supabase/functions/save-card-state/index.ts');

test('editor saves through the authenticated save-card-state endpoint', () => {
  assert.match(editor, /functions\/v1\/save-card-state/);
  assert.match(editor, /Authorization`?:?\s*`Bearer \$\{session\.access_token\}`|Authorization.*Bearer/);
});

test('save function keeps the normal path short and parallelizes child writes', () => {
  assert.match(saveFunction, /Promise\.all\(\[\s*admin\.from\("social_links"\)\.delete/);
  assert.match(saveFunction, /const insertResults = await Promise\.all\(insertTasks\)/);
  assert.match(saveFunction, /if \(ownerId !== user\.id\)/);
});

test('save function recovers missing names and slugs instead of failing new drafts', () => {
  assert.match(saveFunction, /cardPayload\.full_name = "Untitled Card"/);
  assert.match(saveFunction, /makeUniqueSlug/);
  assert.match(saveFunction, /slugAction = "generated_unique"/);
});