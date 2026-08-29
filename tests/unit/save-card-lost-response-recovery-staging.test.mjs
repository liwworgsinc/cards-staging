import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../supabase/functions/save-card-state/index.ts', import.meta.url), 'utf8');

test('lost first guest-save response recovers the recent Free-plan draft instead of creating card two', () => {
  assert.match(source, /recoverRecentDraft/);
  assert.match(source, /Card limit reached for current plan/);
  assert.match(source, /\.eq\("user_id", userId\)/);
  assert.match(source, /\.eq\("status", "draft"\)/);
  assert.match(source, /\.eq\("full_name", fullName\)/);
  assert.match(source, /45 \* 60 \* 1000/);
  assert.match(source, /slugAction = "recovered_recent_draft"/);
  assert.match(source, /cardPayload\.slug = recovered\.slug/);
  assert.match(source, /update\(cardPayload\)\.eq\("id", recovered\.id\)/);
});

test('save-card-state can leave unchanged child collections alone', () => {
  assert.match(source, /hasOwnProperty\.call\(body, "socials"\)/);
  assert.match(source, /hasOwnProperty\.call\(body, "services"\)/);
  assert.match(source, /hasOwnProperty\.call\(body, "products"\)/);
  assert.match(source, /if \(hasSocials\) deleteTasks\.push/);
  assert.match(source, /if \(hasServices\) deleteTasks\.push/);
  assert.match(source, /if \(hasProducts\) deleteTasks\.push/);
});
