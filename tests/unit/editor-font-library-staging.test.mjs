import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fontCss = readFileSync(new URL('../../css/card-fonts-staging.css', import.meta.url), 'utf8');
const editorEnhancement = readFileSync(new URL('../../js/editor-industry-covers-staging.js', import.meta.url), 'utf8');
const nameFontEnhancement = readFileSync(new URL('../../js/editor-name-font-staging.js', import.meta.url), 'utf8');
const publicNameFont = readFileSync(new URL('../../js/public-name-font-staging.js', import.meta.url), 'utf8');
const publicCardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');

test('selected card font controls the cardholder name in preview and public card', () => {
  assert.match(fontCss, /\.public-card #name[\s\S]*#phone-preview #p-name[\s\S]*font-family:\s*inherit\s*!important/);
});

test('expanded Plus and Pro font library includes modern and display choices', () => {
  for (const font of ['Sora', 'Rubik', 'Work Sans', 'Cinzel', 'Dancing Script', 'Great Vibes']) {
    assert.match(editorEnhancement, new RegExp(font.replace(' ', '\\s+')));
  }
  assert.match(editorEnhancement, /expandedFontsAllowed\(\)/);
  assert.match(editorEnhancement, /hasEntitlement\('expanded_fonts'\)/);
});

test('separate name font selector includes signature, luxury, and modern choices', () => {
  for (const font of ['Allura', 'Parisienne', 'Sacramento', 'Satisfy', 'Bodoni Moda', 'Prata', 'Yeseva One', 'Cormorant SC', 'Marcellus', 'Kaushan Script', 'Lobster Two']) {
    assert.match(nameFontEnhancement, new RegExp(font.replaceAll(' ', '\\s+')));
    assert.match(fontCss, new RegExp(font.replaceAll(' ', '[+]')));
  }
  assert.match(nameFontEnhancement, /namePremiumFont/);
  assert.match(nameFontEnhancement, /expanded_fonts/);
});

test('public name font enhancement loads the expanded font bundle and respects plan access', () => {
  assert.match(publicNameFont, /card-fonts-staging\.css\?v=20260830-name-library-2/);
  assert.match(publicNameFont, /access\.expanded_fonts/);
});

test('public staging card loads the expanded font asset bundle', () => {
  assert.match(publicCardHtml, /css\/card-fonts-staging\.css\?v=20260829-fonts-1/);
});
