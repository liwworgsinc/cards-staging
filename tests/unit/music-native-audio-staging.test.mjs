import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Artist Dressing Room can upload native audio without a second card table', () => {
  const source = read('js/editor-artist-audio-staging.js');
  assert.match(source, /artist_settings/);
  assert.match(source, /save_artist_settings/);
  assert.match(source, /audio_preview_url/);
  assert.match(source, /storage\.from\('artist-audio'\)/);
  assert.match(source, /15\*1024\*1024/);
});

test('Music native playback intercepts the home CTA and release strip', () => {
  const source = read('js/public-music-native-audio-staging.js');
  assert.match(source, /\.music-primary-cta,\.music-release-card/);
  assert.match(source, /stopImmediatePropagation/);
  assert.match(source, /new Audio\(\)/);
  assert.match(source, /audio\.play\(\)/);
  assert.match(source, /music-audio-playing/);
});

test('Streaming remains fallback when no native audio exists', () => {
  const source = read('js/public-music-native-audio-staging.js');
  assert.match(source, /STREAM MUSIC/);
  assert.match(source, /if\(!isMusic\(\)\|\|!ready\)return/);
});

test('Artist audio storage is bounded and workspace protected', () => {
  const sql = read('sql/artist-audio-preview-storage-staging.sql');
  assert.match(sql, /15728640/);
  assert.match(sql, /audio\/mpeg/);
  assert.match(sql, /has_workspace_access/);
  assert.match(sql, /bucket_id = 'artist-audio'/);
});
