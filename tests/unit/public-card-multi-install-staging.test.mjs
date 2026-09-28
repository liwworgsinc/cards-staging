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

test('share drawer keeps per-card install visible inside installed platform', () => {
  assert.match(share, /if \(homeButton\) homeButton\.hidden = false;/);
  assert.match(share, /if \(prompt && !isStandalone\(\) && !isEmbedded\(\)\)/);
  assert.match(share, /if \(isAndroid\(\) && !isChromeHandoff\(\)\)/);
  assert.match(share, /Open this card in Chrome/);
  assert.match(share, /package=com\.android\.chrome/);
  assert.match(share, /Copy card link/);
  assert.doesNotMatch(share, /already on this device/);
});

test('card metadata preserves manifest established before rendering', () => {
  assert.match(share, /querySelector\('link\[data-liw-card-manifest\]'\)/);
  assert.doesNotMatch(share, /querySelectorAll\('link\[rel="manifest"\]'\)\.forEach\(link => link\.remove\(\)\)/);
});

test('external preview opens the direct published card, not its iframe shell', () => {
  assert.match(preview, /id="open-published-card"/);
  assert.match(preview, /publishedCardUrl=new URL\('card.html',location.href\)/);
  assert.match(preview, /publishedCardUrl\.searchParams\.set\('slug',slug\)/);
  assert.match(preview, /package=com\.android\.chrome/);
  assert.match(preview, /browser_fallback_url/);
  assert.doesNotMatch(preview, /rel="manifest"/);
});
test('embedded share dialog offers an explicit full-browser handoff', () => {
  assert.match(share, /primary\.hidden = !\(isAndroid\(\) \|\| isEmbedded\(\)\)/);
  assert.match(share, /const target = isEmbedded\(\) \? window\.top : window;/);
  assert.match(share, /copyLink\.hidden = !\(isAndroid\(\) \|\| isStandalone\(\) \|\| isEmbedded\(\)\)/);
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
  embedded = false, handoff = false } = {}) {
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
    isChromeHandoff: () => handoff,
    openCardInChrome() { calls.push('chrome'); },
    openInstallInstructions() { calls.push('instructions'); }
  };
  vm.runInNewContext(handler + '\nthis.runInstall = promptHomeInstall;', context);
  await context.runInstall({});
  return calls;
}
test('native prompt takes precedence in a regular Chrome tab', async () => {
  assert.deepEqual(await simulateInstall({ native: true }), ['close', 'native']);
});
test('custom tab without a prompt goes straight to Chrome, not the instruction popup', async () => {
  assert.deepEqual(await simulateInstall(), ['close', 'chrome']);
});
test('installed dashboard opens Chrome instead of claiming this card is installed', async () => {
  assert.deepEqual(await simulateInstall({ standalone: true }), ['close', 'chrome']);
});
test('embedded preview opens the full card in Chrome directly', async () => {
  assert.deepEqual(await simulateInstall({ embedded: true }), ['close', 'chrome']);
});
test('Chrome handoff marker prevents a redirect loop if no native prompt exists', async () => {
  assert.deepEqual(await simulateInstall({ handoff: true }), ['close', 'instructions']);
});
test('desktop browser still receives install-menu instructions when no native prompt exists', async () => {
  assert.deepEqual(await simulateInstall({ android: false }), ['close', 'instructions']);
});
test('Android Chrome intent includes one-shot marker and canonical-card fallback', () => {
  assert.match(share, /searchParams\.set\('liw_install', 'chrome'\)/);
  assert.match(share, /package=com\.android\.chrome/);
  assert.match(share, /S\.browser_fallback_url/);
});
