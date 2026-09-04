import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('editor exposes Music beside Classic and Flow', () => {
  const source = read('js/editor-swipe-layout.js');
  assert.match(source, /data-card-experience="classic"/);
  assert.match(source, /data-card-experience="flow"/);
  assert.match(source, /data-card-experience="music"/);
  assert.match(source, /editor-artist-dressing-room-staging\.js/);
  assert.match(source, /editor-artist-dressing-room-staging\.css/);
});

test('Artist Dressing Room is isolated to Music and saves through its own RPC', () => {
  const source = read('js/editor-artist-dressing-room-staging.js');
  assert.match(source, /currentExperience\(\)==='music'/);
  assert.match(source, /save_artist_settings/);
  assert.match(source, /featured_release_title/);
  assert.match(source, /spotify_url/);
  assert.match(source, /upcoming_show_date/);
  assert.match(source, /glam_preset/);
  assert.match(source, /data-artist-tile-list/);
});

test('Dressing Room styling is editor-only and responsive', () => {
  const css = read('css/editor-artist-dressing-room-staging.css');
  assert.match(css, /\.artist-dressing-room/);
  assert.match(css, /\.artist-glam-presets/);
  assert.match(css, /\.artist-tile-row/);
  assert.match(css, /@media\(max-width:720px\)/);
});

test('Music public renderer reads Dressing Room and opens full-screen rooms', () => {
  const source = read('js/public-music-card-staging.js');
  assert.match(source, /public_artist_settings_by_slug/);
  assert.match(source, /music-artist-room/);
  assert.match(source, /openRoom\('music'\)/);
  assert.match(source, /artistSettings\.tiles/);
  assert.match(source, /artistSettings\.glam_preset/);
  assert.match(source, /card_experience/);
  assert.match(source, /===MUSIC_VALUE/);
});

test('Music no-scroll home and room styles do not target Classic or Flow', () => {
  const css = read('css/music-artist-rooms-staging.css');
  assert.match(css, /body\.music-page-active/);
  assert.match(css, /overflow:hidden!important/);
  assert.match(css, /\.music-artist-room\.open/);
  assert.doesNotMatch(css, /\.swipe-card-active/);
  assert.doesNotMatch(css, /\.classic-card/);
});

test('shared staging public hook cache-busts Dressing Room renderer', () => {
  const source = read('js/public-name-font-staging.js');
  assert.match(source, /music-theme-staging\.css\?v=20260904-dressing-room-1/);
  assert.match(source, /public-music-card-staging\.js\?v=20260904-dressing-room-1/);
  assert.match(source, /__LIW_MUSIC_EXPERIENCE_LOADER__/);
});

test('database script stores artist settings as a bounded JSON object', () => {
  const sql = read('sql/artist-dressing-room-staging.sql');
  assert.match(sql, /artist_settings jsonb/);
  assert.match(sql, /jsonb_typeof\(artist_settings\) = 'object'/);
  assert.match(sql, /public_artist_settings_by_slug/);
  assert.match(sql, /save_artist_settings/);
  assert.match(sql, /wm\.role = 'editor'/);
});
