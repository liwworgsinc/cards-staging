import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../../js/super-studio-layout-v2-staging.js', import.meta.url), 'utf8');
const baseCss = readFileSync(new URL('../../css/super-studio-completion-staging.css', import.meta.url), 'utf8');
const appCss = readFileSync(new URL('../../css/super-studio-app-shell-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('Super Studio V3 separates the long card into app screens',()=>{
  assert.match(layout,/ss-app-shell/);
  assert.match(layout,/data-ss-screen=\"home\"/);
  assert.match(layout,/data-ss-screen=\"services\"/);
  assert.match(layout,/data-ss-screen=\"work\"/);
  assert.match(layout,/data-ss-screen=\"more\"/);
  assert.match(layout,/data-ss-app-screen/);
  assert.match(layout,/setScreen\(root/);
  assert.match(appCss,/\.ss-app-screen\.is-active/);
});

test('Super Studio V3 removes duplicate booking and the old conversion footer',()=>{
  assert.match(layout,/ss-quick-book-duplicate/);
  assert.match(layout,/removeLegacyFooter/);
  assert.doesNotMatch(layout,/function buildFooter/);
  assert.match(appCss,/\.ss-conversion-footer\{display:none!important\}/);
  assert.match(appCss,/\.ss-quick-book-duplicate\{display:none!important\}/);
});

test('Super Studio V3 keeps services professional and compact',()=>{
  assert.match(layout,/Choose Your Service/);
  assert.match(layout,/ss-service-category-rail/);
  assert.match(layout,/ss-service-card-v3/);
  assert.match(baseCss,/\.ss-service-showcase/);
  assert.match(appCss,/\.ss-service-card-v3/);
  assert.match(appCss,/clamp\(/);
});

test('Super Studio V3 has persistent app navigation and top utility tools',()=>{
  assert.match(layout,/ss-app-nav/);
  assert.match(layout,/data-ss-app-book/);
  assert.match(layout,/data-ss-utility-qr/);
  assert.match(layout,/#qr-top/);
  assert.match(layout,/liw-global-wallet-fallback|liwGlobalWallet|LIWWalletGlobal/);
  assert.match(appCss,/position:fixed/);
  assert.match(appCss,/safe-area-inset-bottom/);
  assert.match(appCss,/ss-utility-cluster/);
});

test('paid Super Studio hides Powered by branding',()=>{
  assert.match(layout,/liw-super-studio-paid/);
  assert.match(layout,/#branding/);
  assert.match(appCss,/body\.liw-super-studio-paid #branding\{display:none!important\}/);
});

test('V3 layout is loaded in editor preview and public card with cache busting',()=>{
  assert.match(editorLoader,/super-studio-layout-v2-staging\.js\?v=20261011-4/);
  assert.match(publicLoader,/super-studio-layout-v2-staging\.js\?v=20261011-4/);
  assert.match(layout,/super-studio-app-shell-staging\.css\?v=20261011-2/);
});

test('V3 remains isolated to Super Studio DOM',()=>{
  assert.match(layout,/\.super-studio-experience/);
  assert.doesNotMatch(layout,/\.realtor-experience/);
  assert.doesNotMatch(layout,/\.restaurant-experience/);
  assert.doesNotMatch(layout,/\.showtime-experience/);
  assert.doesNotMatch(layout,/\.barbershop-experience/);
});
