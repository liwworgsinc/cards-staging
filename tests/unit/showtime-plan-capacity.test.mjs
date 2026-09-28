import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../js/editor-artist-dressing-room-staging.js', import.meta.url), 'utf8');
const instrumented = source.replace(/\n\}\)\(\);\s*$/, `
  window.__showtimeTest = {
    planLimits, normalize, serializedState, syncAddLimits,
    setState: value => { state = normalize(value); },
    getState: () => state,
    setRoot: value => { root = value; }
  };
})();`);
assert.notEqual(instrumented, source, 'must instrument the real editor source');

function createHarness(planKey, { admin = false, preview = false } = {}) {
  const window = {};
  const document = { addEventListener() {}, getElementById() { return null; }, querySelector() { return null; } };
  const context = { window, document, location: { search: '' }, URLSearchParams, console,
    editorAccess: { planKey, isAdmin: admin, isPlanPreview: preview }, currentPlan: planKey,
    setInterval() { return 0; }, setTimeout() { return 0; } };
  vm.runInNewContext(instrumented, context, { filename: 'editor-artist-dressing-room-staging.js' });
  return { api: window.__showtimeTest, context };
}

function entries(count, type) {
  return Array.from({ length: count }, (_, i) => type === 'release'
    ? { id: 'release-' + i, title: 'Release ' + i, listen_url: 'https://example.org/' + i }
    : type === 'show'
      ? { id: 'show-' + i, date: '2026-10-01', venue: 'Venue ' + i }
      : { id: 'media-' + i, title: 'Media ' + i, url: 'https://example.org/' + i });
}

test('Showtime caps match marketed plans, with four extra media items', () => {
  for (const [plan, expected] of [['starter', 1], ['free', 1], ['lite', 3], ['plus', 10], ['pro', 25], ['agency', 25]]) {
    const caps = createHarness(plan).api.planLimits();
    assert.equal(caps.releases, expected, plan + ' release cap');
    assert.equal(caps.shows, expected, plan + ' show cap');
    assert.equal(caps.media, 4, plan + ' media cap');
  }
});

test('admin plan preview respects selected tier; regular admin keeps Pro capacity', () => {
  assert.equal(createHarness('lite', { admin: true, preview: true }).api.planLimits().shows, 3);
  assert.equal(createHarness('lite', { admin: true }).api.planLimits().shows, 25);
});

test('downgrade never truncates releases, shows or media while normalizing and serializing', () => {
  const { api } = createHarness('lite');
  api.setState({ releases: entries(25, 'release'), shows: entries(25, 'show'), media_items: entries(7, 'media') });
  const current = api.getState(), saved = api.serializedState();
  for (const obj of [current, saved]) {
    assert.equal(obj.releases.length, 25);
    assert.equal(obj.shows.length, 25);
    assert.equal(obj.media_items.length, 7);
  }
  assert.equal(saved.version, 4);
});

test('over-limit legacy entries remain visible and additions are disabled', () => {
  const { api, context } = createHarness('lite');
  api.setState({ releases: entries(10, 'release'), shows: entries(10, 'show'), media_items: entries(5, 'media') });
  const controls = {};
  for (const key of ['release', 'show', 'media']) {
    controls[`[data-add-${key}]`] = { setAttribute() {} };
    controls[`[data-artist-${key}-count]`] = {};
    controls[`[data-artist-${key}-limit-note]`] = { hidden: true };
  }
  api.setRoot({ querySelector: selector => controls[selector] || null });
  api.syncAddLimits();
  for (const key of ['release', 'show', 'media']) {
    assert.equal(controls[`[data-add-${key}]`].disabled, true);
    assert.equal(controls[`[data-artist-${key}-limit-note]`].hidden, false);
  }
  assert.equal(controls['[data-artist-show-count]'].textContent, '10/3');
  context.editorAccess.planKey = 'pro';
  api.syncAddLimits();
  assert.equal(controls['[data-add-release]'].disabled, false);
  assert.equal(controls['[data-add-show]'].disabled, false);
  assert.equal(controls['[data-artist-show-count]'].textContent, '10/25');
  assert.equal(controls['[data-add-media]'].disabled, true);
});
