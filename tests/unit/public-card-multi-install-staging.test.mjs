import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const card = readFileSync(join(root, 'card.html'), 'utf8');
const share = readFileSync(join(root, 'js/public-card-share-home.js'), 'utf8');
const installer = readFileSync(join(root, 'js/pwa-install.js'), 'utf8');
const preview = readFileSync(join(root, 'external-preview.html'), 'utf8');

function manifestFor(href, embedded = false) {
  const headScript = card.match(/<title>LIW Digital Cards Card<\/title>\s*<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(headScript, 'card-specific manifest bootstrap must be in the document head');
  const links = [];
  const url = new URL(href);
  const document = {
    createElement(tag) { assert.equal(tag, 'link'); return { dataset: {} }; },
    head: { appendChild(link) { links.push(link); } }
  };
  const window = { self: {}, top: {} };
  if (!embedded) window.top = window.self;
  vm.runInNewContext(headScript, { URL, URLSearchParams, location: url, document, window });
  return links;
}

test('published cards load separate manifests early, and previews do not', () => {
  const base = 'https://liwworgsinc.github.io/cards-staging/card.html?slug=';
  const first = manifestFor(base + 'damion-thomas-liw');
  const second = manifestFor(base + 'another-business');
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.notEqual(first[0].href, second[0].href);
  assert.match(first[0].href, /card-manifest/);
  assert.match(first[0].href, /slug=damion-thomas-liw/);
  assert.equal(first[0].crossOrigin, 'anonymous');
  assert.equal(manifestFor(base + 'damion-thomas-liw&embed=1').length, 0);
  assert.equal(manifestFor(base + 'damion-thomas-liw&preview=1').length, 0);
  assert.equal(manifestFor(base + 'damion-thomas-liw&editor_preview=1').length, 0);
  assert.equal(manifestFor(base + 'damion-thomas-liw&_liw_preview=123').length, 0);
  assert.equal(manifestFor(base + 'damion-thomas-liw', true).length, 0);
});

test('dashboard PWA never removes a published card manifest', () => {
  assert.doesNotMatch(installer, /if \(isSafeCardInstallMode\(\)\) \{\s*document\.querySelectorAll\('link\[rel="manifest"\]'\)/);
  assert.doesNotMatch(installer, /^\s*ensureSafeCardHomeScreenStaging\(\);/m);
  assert.match(card, /public-card-home-screen-safe-staging\.css/);
});

test('share drawer invokes native prompt when available, otherwise supplies copy-to-Chrome help', () => {
  assert.match(share, /homeButton\.hidden = false/);
  assert.match(share, /if \(prompt && !isStandalone\(\) && !isEmbedded\(\)\)/);
  assert.match(share, /Copy card link for Chrome/);
  assert.match(share, /clipboard|copyText\(getShareUrl\(\)\)/);
  assert.doesNotMatch(share, /package=com\.android\.chrome/);
  assert.doesNotMatch(share, /openCardInChrome/);
  assert.doesNotMatch(share, /already on this device/);
});

test('card metadata preserves manifest established before rendering', () => {
  assert.match(share, /querySelector\('link\[data-liw-card-manifest\]'\)/);
  assert.doesNotMatch(share, /querySelectorAll\('link\[rel="manifest"\]'\)\.forEach\(link => link\.remove\(\)\)/);
});

test('external preview copies canonical card URL on Android instead of launching another app', () => {
  assert.match(preview, /id="open-published-card"/);
  assert.match(preview, /publishedCardUrl=new URL\('card.html',location.href\)/);
  assert.match(preview, /publishedCardUrl\.searchParams\.set\('slug',slug\)/);
  assert.match(preview, /navigator\.clipboard\.writeText\(publishedLink\.href\)/);
  assert.doesNotMatch(preview, /package=com\.android\.chrome/);
  assert.doesNotMatch(preview, /rel="manifest"/);
});
test('dialog offers copyable Chrome steps and never presumes a menu in an installed window', () => {
  assert.match(share, /primary\.textContent = isAndroid\(\) \? 'Copy card link for Chrome'/);
  assert.match(share, /This app window has no Chrome browser menu/);
  assert.match(share, /Open Chrome from your phone/);
});

test('one-shot native event is captured in the head before delayed card scripts', () => {
  const head = card.match(/<title>LIW Digital Cards Card<\/title>\s*<script>([\s\S]*?)<\/script>/)?.[1];
  const handlers = {};
  const links = [];
  const self = {};
  const window = { self, top: self, addEventListener(name, handler) { handlers[name] = handler; } };
  const document = {
    createElement() { return { dataset: {} }; },
    head: { appendChild(link) { links.push(link); } }
  };
  vm.runInNewContext(head, {
    URL, URLSearchParams, window, document,
    location: new URL('https://liwworgsinc.github.io/cards-staging/card.html?slug=desmond-mitchell')
  });
  assert.equal(links.length, 1);
  assert.equal(typeof handlers.beforeinstallprompt, 'function');
  const event = { prevented: false, preventDefault() { this.prevented = true; } };
  handlers.beforeinstallprompt(event);
  assert.equal(event.prevented, true);
  assert.equal(window.__LIW_CARD_INSTALL_PROMPT__, event);
});

const handler = share.slice(
  share.indexOf('    async function promptHomeInstall(shareDialog) {'),
  share.indexOf('    function makeShareDialog() {')
);
test('install handler is present for behavior tests', () => {
  assert.match(handler, /async function promptHomeInstall/);
});

async function simulateInstall({ native = false, android = true, standalone = false,
  embedded = false } = {}) {
  const calls = [];
  const event = native ? {
    prompt() { calls.push('native'); },
    userChoice: Promise.resolve({ outcome: 'accepted' })
  } : null;
  const window = { __LIW_CARD_INSTALL_PROMPT__: event, track() {} };
  const context = {
    window, deferredPrompt: null, preferredIcon: { custom: true },
    closeDialog() { calls.push('close'); },
    isAndroid: () => android,
    isStandalone: () => standalone,
    isEmbedded: () => embedded,
    openInstallInstructions() { calls.push('copy-help'); }
  };
  vm.runInNewContext(handler + '\nthis.runInstall = promptHomeInstall;', context);
  await context.runInstall({});
  return calls;
}
test('native browser prompt takes precedence in a regular Chrome tab', async () => {
  assert.deepEqual(await simulateInstall({ native: true }), ['close', 'native']);
});
test('installed dashboard never auto-opens another app', async () => {
  assert.deepEqual(await simulateInstall({ standalone: true }), ['close', 'copy-help']);
});
test('embedded preview never auto-opens another app', async () => {
  assert.deepEqual(await simulateInstall({ embedded: true }), ['close', 'copy-help']);
});
test('custom tab without native prompt does not enter a redirect loop', async () => {
  assert.deepEqual(await simulateInstall(), ['close', 'copy-help']);
});
test('Chrome tab without native prompt gives instructions instead of a false install claim', async () => {
  assert.deepEqual(await simulateInstall({ native: false }), ['close', 'copy-help']);
});
test('neither the card Share nor the preview uses an Android intent handoff', () => {
  assert.doesNotMatch(share, /intent:\/\//);
  assert.doesNotMatch(share, /window\.top\.location/);
  assert.doesNotMatch(preview, /intent:\/\//);
});
