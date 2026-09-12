import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Studio keeps the proven classic experience plus barbershop color-mode marker', () => {
  const editor = read('js/editor-barbershop-template-bridge-staging.js');

  assert.match(editor, /const MODE='barbershop'/);
  assert.match(editor, /set\('card_experience','classic'\)/);
  assert.doesNotMatch(editor, /set\('card_experience','barbershop'\)/);
  assert.match(editor, /set\('color_mode',MODE\)/);
  assert.match(editor, /Studio Control Center/);
  assert.match(editor, /Choose Studio experience/);
});

test('Studio tile is not labeled Beauty', () => {
  const editor = read('js/editor-barbershop-template-bridge-staging.js');

  assert.match(editor, /businessIcon\(selectedType,17\)<\/span> Studio`/);
  assert.doesNotMatch(editor, /Studio <em>BEAUTY<\/em>/);
  assert.doesNotMatch(editor, /Adaptive beauty and grooming experience/);
});

test('Studio offers all supported grooming and personal-service business types', () => {
  const editor = read('js/editor-barbershop-template-bridge-staging.js');

  for (const type of ['barber', 'hair', 'nails', 'lashes', 'makeup', 'esthetician', 'spa', 'cosmetics']) {
    assert.match(editor, new RegExp(`${type}:\\{label:`));
  }
  for (const label of ['Barber', 'Hair Stylist', 'Nail Tech', 'Lash / Brow', 'Makeup Artist', 'Esthetician', 'Spa', 'Cosmetics']) {
    assert.match(editor, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(editor, /data-studio-business-type/);
  assert.match(editor, /studio-preview-industry/);
  assert.match(editor, /businessIcon\(selectedType,17\)/);
});

test('Studio editor stops its initial DOM watcher once the picker is mounted', () => {
  const editor = read('js/editor-barbershop-template-bridge-staging.js');

  assert.match(editor, /if\(q\('\[data-studio-business-picker\]'\)\)observer\.disconnect\(\)/);
  assert.match(editor, /if\(q\('\[data-studio-business-picker\]'\)\)return/);
});

test('Studio business type persists through dedicated database RPCs', () => {
  const editor = read('js/editor-barbershop-template-bridge-staging.js');
  const sql = read('sql/studio-business-type-staging.sql');

  assert.match(editor, /set_studio_business_type/);
  assert.match(sql, /add column if not exists studio_business_type text not null default 'barber'/);
  assert.match(sql, /create or replace function public\.set_studio_business_type/);
  assert.match(sql, /create or replace function public\.public_studio_business_type/);
  assert.match(sql, /grant execute on function public\.public_studio_business_type\(uuid\) to anon, authenticated/);
});

test('Public Studio changes icon and customer wording by business type', () => {
  const publicStudio = read('js/public-barbershop-staging.js');

  assert.match(publicStudio, /public_studio_business_type/);
  assert.match(publicStudio, /studio-public-industry/);
  assert.match(publicStudio, /Book My Chair/);
  assert.match(publicStudio, /Book Hair Appointment/);
  assert.match(publicStudio, /Book Nail Appointment/);
  assert.match(publicStudio, /Book Makeup Session/);
  assert.match(publicStudio, /Book Skin Treatment/);
  assert.match(publicStudio, /Book Spa Service/);
  assert.match(publicStudio, /Book Consultation/);
  assert.match(publicStudio, /dataStudioBusinessType|studioBusinessType|studio_business_type/);
});

test('Public Studio adapts inherited barber dock and client-room language', () => {
  const publicStudio = read('js/public-barbershop-staging.js');

  assert.match(publicStudio, /Studio revolving actions/);
  assert.match(publicStudio, /data-barber-dock-action=\\?"cuts\\?"/);
  assert.match(publicStudio, /existingIcon\.outerHTML=businessIcon\(studioType,20\)/);
  assert.match(publicStudio, /Nail Services/);
  assert.match(publicStudio, /Makeup Portfolio/);
  assert.match(publicStudio, /Skin Results/);
  assert.match(publicStudio, /Find the Studio/);
  assert.match(publicStudio, /This Studio has not added this section yet/);
});
