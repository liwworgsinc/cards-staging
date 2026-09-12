import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

const runtime = read('js/studio-runtime-stabilizer-staging.js');
const editorPreview = read('js/editor-preview-production-parity-staging.js');
const publicSocial = read('js/public-barber-social-svg-staging.js');

test('Studio runtime preserves the selected LIW template instead of clearing it', () => {
  assert.match(runtime, /captureStyleSnapshot\(\)/);
  assert.match(runtime, /applyTemplate\(template\)/);
  assert.match(runtime, /setEditorValue\('template_id',savedId\)/);
  assert.match(runtime, /setEditorValue\('card_experience','classic'\)/);
  assert.match(runtime, /setEditorValue\('color_mode',MODE\)/);
  assert.match(runtime, /\[data-card-experience="barbershop"\]/);
  assert.match(runtime, /target\.closest\('\.template-card'\)/);
});

test('Studio has one LIW template source and removes the inherited Barber preset grid', () => {
  assert.match(runtime, /barber-v5-presets/);
  assert.match(runtime, /\.remove\(\)/);
  assert.match(runtime, /studioTemplateSource='liw-template-library'/);
  assert.match(runtime, /template-selected-summary/);
  assert.match(runtime, /LIWBarberTemplateBridge\?\.refresh/);
});

test('Studio public runtime copies the resolved industry to html and body', () => {
  assert.match(runtime, /document\.documentElement\.dataset\.studioBusinessType=type/);
  assert.match(runtime, /document\.body\.dataset\.studioBusinessType=type/);
  assert.match(runtime, /html\[data-studio-business-type\]:not\(\[data-studio-business-type="barber"\]\).*public-cover::after/s);
});

test('Non-barber Studio styling follows the selected template colors instead of barber gold', () => {
  assert.match(runtime, /public-content/);
  assert.match(runtime, /barber-client-stage/);
  assert.match(runtime, /barber-client-promo/);
  assert.match(runtime, /barber-revolve-dock/);
  assert.match(runtime, /barber-revolve-item/);
  assert.match(runtime, /var\(--barber-secondary/);
  assert.match(runtime, /var\(--barber-background/);
  assert.match(runtime, /var\(--barber-primary/);
  assert.match(runtime, /var\(--barber-text/);
});

test('Studio loader has one bounded lifecycle and is fully stopped after Studio is ready', () => {
  assert.match(runtime, /studioShellReady\(\)/);
  assert.match(runtime, /classList\.add\('liw-studio-runtime-pending','liw-card-loader-active'\)/);
  assert.match(runtime, /classList\.remove\('liw-card-loader-release','liw-card-loader-failed'\)/);
  assert.match(runtime, /performance\.now\(\)-started>9000/);
  assert.match(runtime, /clearInterval\(timer\)/);
  assert.match(runtime, /loading\.hidden=true/);
  assert.match(runtime, /loading\.style\.setProperty\('display','none','important'\)/);
  assert.match(runtime, /animation','none','important'/);
  assert.match(runtime, /liw-studio-runtime-ready/);
});

test('Studio runtime is loaded by both the editor and public card staging paths', () => {
  assert.match(editorPreview, /studio-runtime-stabilizer-staging\.js/);
  assert.match(editorPreview, /data-liw-studio-runtime/);
  assert.match(publicSocial, /studio-runtime-stabilizer-staging\.js\?v=20260912-studio-runtime-1/);
  assert.match(publicSocial, /data-liw-studio-runtime/);
});
