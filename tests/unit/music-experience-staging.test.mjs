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

test('Artist Control Center is isolated to Music and saves through its own RPC', () => {
  const source = read('js/editor-artist-dressing-room-staging.js');
  assert.match(source, /currentExperience\(\)==='music'/);
  assert.match(source, /save_artist_settings/);
  assert.match(source, /releases:\[\],shows:\[\],media_items:\[\]/);
  assert.match(source, /featured_release_title/);
  assert.match(source, /upcoming_show_date/);
  assert.match(source, /data-artist-nav="home"/);
  assert.match(source, /data-artist-nav="music"/);
  assert.match(source, /data-artist-nav="shows"/);
  assert.match(source, /data-artist-nav="store"/);
  assert.match(source, /data-artist-nav="media"/);
  assert.match(source, /data-artist-nav="profile"/);
});

test('Artist Control Center supports add and remove flows', () => {
  const source = read('js/editor-artist-dressing-room-staging.js');
  assert.match(source, /data-add-release/);
  assert.match(source, /data-remove-release/);
  assert.match(source, /data-add-show/);
  assert.match(source, /data-remove-show/);
  assert.match(source, /data-add-media/);
  assert.match(source, /data-remove-media/);
  assert.match(source, /confirmRemove/);
  assert.match(source, /data-artist-remove-profile/);
  assert.match(source, /data-artist-remove-cover/);
});

test('Dressing Room styling is light, editor-only and mobile responsive', () => {
  const css = read('css/editor-artist-dressing-room-staging.css');
  assert.match(css, /\.artist-dressing-room/);
  assert.match(css, /\.artist-control-nav/);
  assert.match(css, /\.artist-item-card/);
  assert.match(css, /\.artist-remove-action/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /background:#fff/);
});

test('Music public renderer reads Dressing Room and opens full-screen rooms', () => {
  const source = read('js/public-music-card-staging.js');
  assert.match(source, /public_artist_settings_by_slug/);
  assert.match(source, /music-artist-room/);
  assert.match(source, /openRoom\('music'\)/);
  assert.match(source, /artistSettings\.tiles/);
  assert.match(source, /card_experience/);
  assert.match(source, /===MUSIC_VALUE/);
});

test('Music Store reuses the native Classic and Flow product showcase', () => {
  const loader = read('js/editor-swipe-layout.js');
  const room = read('js/editor-artist-dressing-room-staging.js');
  const merch = read('js/editor-artist-merch-staging.js');
  const publicMusic = read('js/public-music-card-staging.js');
  assert.match(loader, /editor-artist-merch-staging\.js/);
  assert.match(room, /product_showcase/);
  assert.match(room, /products_enabled/);
  assert.match(room, /data-artist-store-host/);
  assert.match(merch, /Artist Store compatibility bridge/);
  assert.match(publicMusic, /merch:\{title:'Merch',icon:'shirt',target:'products-section'\}/);
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
  assert.match(source, /public-music-card-staging\.js/);
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