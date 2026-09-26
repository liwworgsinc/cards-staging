import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const html = read('editor.html');
const editor = read('js/editor.js');

test('staging editor keeps dependency bootstrap synchronous and parallel-downloads ordered feature scripts', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/g)].map(match => match[0]);
  const commonIndex = scripts.findIndex(tag => /src="js\/common\.js\?/.test(tag));
  assert.ok(commonIndex > 0, 'common bootstrap is present');
  assert.doesNotMatch(scripts[commonIndex], /\bdefer\b/, 'common uses parser-time document.write');
  const featureScripts = scripts.slice(commonIndex + 1);
  assert.ok(featureScripts.length >= 20, 'editor feature scripts are discovered');
  for (const tag of featureScripts) {
    assert.match(tag, /<script\s+defer\b/, 'script must be ordered and nonblocking: ' + tag);
    assert.doesNotMatch(tag, /\basync\b/, 'async would break dependency order');
  }
  assert.ok(featureScripts.findIndex(tag => /js\/editor\.js\?/.test(tag)) <
            featureScripts.findIndex(tag => /js\/realtor-editor-v1\.js\?/.test(tag)),
            'editor core must precede realtor enhancement');
});

test('staging editor fetches selected card concurrently with account and entitlement lookups', () => {
  assert.match(editor, /const accessPromise = getLiwAccessContext\(user, \{ refresh: true \}\)/);
  assert.match(editor, /const cardPromise = currentId[\s\S]*?digital_cards'\)\.select\('\*'\)/);
  assert.match(editor, /const \[accessResult, templateResult, addonDefinitionResult, activeAddonResult, templatePurchaseResult, cardResult\] = await Promise\.all/);
  assert.match(editor, /await loadCard\(cardResult\)/);
  assert.match(editor, /async function loadCard\(prefetchedCardResult = null\)/);
  assert.match(editor, /prefetchedCardResult \|\| await supabaseClient\.from\('digital_cards'\)/);
});

test('failed card hydration does not offer a blank card as a saved existing card', () => {
  assert.match(editor, /Could not load this card\. Refresh to retry\./);
  assert.match(editor, /return; \/\/ Never expose a blank/);
});
