import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('editor exposes Music beside Classic and Flow', () => {
  const source = read('js/editor-swipe-layout.js');
  assert.match(source, /data-card-experience="classic"/);
  assert.match(source, /data-card-experience="flow"/);
  assert.match(source, /data-card-experience="music"/);
  assert.match(source, /stored==='music'/);
  assert.match(source, /\['classic','flow','music'\]/);
});

test('Music public renderer activates only for music experience', () => {
  const source = read('js/public-music-card-staging.js');
  assert.match(source, /card_experience/);
  assert.match(source, /===MUSIC_VALUE/);
  assert.match(source, /music-card-active/);
  assert.match(source, /swipe-card-active/);
  assert.match(source, /music-release-card/);
  assert.match(source, /music-inner-circle/);
  assert.match(source, /music-upcoming-show/);
});

test('Music styling is isolated and carries Nova Luxe visual language', () => {
  const css = read('css/music-theme-staging.css');
  assert.match(css, /Every rule is scoped to \.music-card-active or \.music-page-active/);
  assert.doesNotMatch(css, /(^|\n)\s*\.public-(?![^\n{]*\.music-card-active)/);
  assert.match(css, /\.music-card-active \.public-cover/);
  assert.match(css, /\.music-card-active \.music-luxe-grid/);
  assert.match(css, /\.music-card-active \.music-release-card/);
  assert.match(css, /\.music-card-active \.music-inner-circle/);
});

test('shared staging public hook loads Nova Luxe Music assets without page rewrites', () => {
  const source = read('js/public-name-font-staging.js');
  assert.match(source, /music-theme-staging\.css\?v=20260904-nova-luxe-2/);
  assert.match(source, /public-music-card-staging\.js\?v=20260904-nova-luxe-2/);
  assert.match(source, /__LIW_MUSIC_EXPERIENCE_LOADER__/);
});
