import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dashboard = fs.readFileSync(new URL('../../dashboard.html', import.meta.url), 'utf8');

const completedRoutes = [
  'products-services.html',
  'domains.html',
  'virtual-background.html',
  'email-signature.html',
  'media.html',
  'analytics.html',
  'leads.html',
  'earn-with-liw.html',
  'profile.html',
  'pricing.html',
  'editor.html',
];

test('dashboard exposes every completed customer upgrade area for staging testing', () => {
  for (const route of completedRoutes) {
    assert.match(dashboard, new RegExp(`href=["']${route.replace('.', '\\.')}`), `${route} should be reachable from dashboard.html`);
  }
});

test('unfinished À la carte and Hire a Designer stay out of the staging dashboard', () => {
  assert.doesNotMatch(dashboard, /href=["']addons\.html/);
  assert.doesNotMatch(dashboard, /href=["']hire-designer\.html/);
});

test('dashboard uses the unified Earn with LIW center instead of the legacy affiliate dashboard entrypoint', () => {
  assert.doesNotMatch(dashboard, /href=["']affiliate-dashboard\.html/);
  assert.match(dashboard, /href=["']earn-with-liw\.html/);
});
