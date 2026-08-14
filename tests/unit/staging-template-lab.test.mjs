import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../js/pwa-install.js', import.meta.url), 'utf8');

const expectedTemplates = [
  'Executive Barber', 'Luxury Realtor', 'Brooklyn Realtor', 'Tax Pro Trust',
  'Clean & Fresh', 'Mobile Mechanic', 'Salon Luxe', 'Optical Modern',
  'Restaurant Reserve', 'Contractor Blueprint', 'Photographer Editorial', 'Nightlife DJ'
];

test('staging template lab contains all 12 niche designs', () => {
  for (const name of expectedTemplates) assert.ok(source.includes(name), `missing ${name}`);
});

test('staging templates never save fake template ids', () => {
  assert.match(source, /STAGING ONLY — LIW Cards niche template lab/);
  assert.match(source, /staging_only:\s*true/);
  assert.match(source, /field\('template_id'\)\.value\s*=\s*''/);
  assert.doesNotMatch(source, /from\(['"]templates['"]\)\.(insert|upsert|update|delete)/);
});
