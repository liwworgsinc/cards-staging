import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const experienceGuard = read('js/editor-experience-state-guard-staging.js');
const profile = read('js/profile-staging.js');
const snapshotMigration = read('supabase/migrations/20260913_protect_card_and_profile_state.sql');
const identityGuardMigration = read('supabase/migrations/20260913_guard_partial_card_identity_updates.sql');

test('load-time experience repair never autosaves incomplete editor state', () => {
  const repairBody = experienceGuard.match(/function repairImpossibleStoredCombination\(\)\{([\s\S]*?)\n  \}\n\n  function reconcileBeforePreview/)?.[1] || '';
  assert.ok(repairBody, 'repairImpossibleStoredCombination body should exist');
  assert.doesNotMatch(repairBody, /scheduleSave\s*\(/);
  assert.match(experienceGuard, /setTimeout\(repairImpossibleStoredCombination,0\)/);
});

test('profile loads durable database fields and writes the complete profile row', () => {
  assert.match(profile, /from\('profiles'\)\.select\('full_name,business_name,job_title,phone,website,location,timezone'\)/);
  assert.match(profile, /from\('profiles'\)\.update\(profilePayload\)/);
  assert.match(profile, /profile\?\.business_name\|\|metadata\.liw_business_name/);
});

test('card and profile changes have recoverable snapshots', () => {
  assert.match(snapshotMigration, /create table if not exists public\.card_state_versions/);
  assert.match(snapshotMigration, /before update or delete on public\.digital_cards/);
  assert.match(snapshotMigration, /create table if not exists public\.profile_state_versions/);
  assert.match(snapshotMigration, /before update or delete on public\.profiles/);
});

test('partial autosave cannot replace an established card identity with defaults', () => {
  assert.match(identityGuardMigration, /new\.full_name = 'Untitled Card'/);
  assert.match(identityGuardMigration, /new\.full_name := old\.full_name/);
  assert.match(identityGuardMigration, /new\.slug := old\.slug/);
});
