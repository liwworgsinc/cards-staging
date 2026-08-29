import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard = fs.readFileSync(new URL('../../js/card-limit-upgrade-staging.js', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('../../js/business-tools-restore-staging.js', import.meta.url), 'utf8');

test('dashboard card creation prompts for upgrade at plan limit', () => {
  assert.match(guard, /count >= limit/);
  assert.match(guard, /You’ve reached your card limit/);
  assert.match(guard, /Upgrade plan/);
  assert.match(guard, /pricing\.html\?from=card-limit/);
  assert.match(guard, /create card\|new card\|build a card\|add card\|start building/i);
});

test('existing card edit routes are not treated as new-card actions', () => {
  assert.match(guard, /url\.searchParams\.get\('id'\)/);
});

test('dashboard staging loader mounts card-limit guard', () => {
  assert.match(loader, /card-limit-upgrade-staging\.js\?v=20260829-1/);
  assert.match(loader, /data-liw-card-limit-upgrade|dataset\.liwCardLimitUpgrade/);
});
