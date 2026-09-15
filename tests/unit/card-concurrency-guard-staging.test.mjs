import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/20260915_card_optimistic_concurrency_guard.sql');
const saveFunction = read('supabase/functions/save-card-state/index.ts');
const designerSaveFunction = read('supabase/functions/save-designer-card-state/index.ts');
const browserGuard = read('js/data-integrity-guard-staging.js');

test('digital cards have a server-controlled monotonic revision', () => {
  assert.match(migration, /add column if not exists revision bigint/i);
  assert.match(migration, /new\.revision := coalesce\(old\.revision, 1\) \+ 1/i);
  assert.match(migration, /before update on public\.digital_cards/i);
});

test('normal existing-card saves use compare-and-swap semantics', () => {
  assert.match(saveFunction, /expectedRevision/);
  assert.match(saveFunction, /\.eq\("revision",expectedRevision\)/);
  assert.match(saveFunction, /CARD_CONFLICT/);
  assert.match(saveFunction, /CARD_MISSING/);
  assert.match(saveFunction, /editorSessionId/);
});

test('designer saves cannot bypass the revision guard', () => {
  assert.match(designerSaveFunction, /expectedRevision/);
  assert.match(designerSaveFunction, /\.eq\("revision", expectedRevision\)/);
  assert.match(designerSaveFunction, /CARD_CONFLICT/);
  assert.match(designerSaveFunction, /CARD_MISSING/);
});

test('browser guard sends the loaded revision and locks stale editors', () => {
  assert.match(browserGuard, /requestBody\.expectedRevision = expectedRevision/);
  assert.match(browserGuard, /requestBody\.editorSessionId = sessionId/);
  assert.match(browserGuard, /This card was updated in another session\./);
  assert.match(browserGuard, /Reload latest version/);
  assert.match(browserGuard, /conflictActive = true/);
});

test('brand-new cards transition into revision tracking after their first save', () => {
  assert.match(browserGuard, /const returnedCardId = String\(payload\?\.card\?\.id \|\| payload\?\.cardId/);
  assert.match(browserGuard, /new_card_revision_tracking_started/);
  assert.match(browserGuard, /if \(!cardId && requestCardId\)/);
  assert.match(browserGuard, /revisionPromise = loadRevision\(cardId\)/);
});

test('dashboard guard distinguishes fetch failure from an empty account', () => {
  assert.match(browserGuard, /liw-card-list-last-good/);
  assert.match(browserGuard, /This is a loading error, not an empty account/);
  assert.match(browserGuard, /No cards were deleted/);
  assert.match(browserGuard, /dashboard_cards_fetch_failed/);
});
