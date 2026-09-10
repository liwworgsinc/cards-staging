import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Barbershop is a first-class card experience with its own control center', () => {
  const loader = read('js/editor-industry-covers-staging.js');
  const editor = read('js/editor-barbershop-staging.js');

  assert.match(loader, /editor-barbershop-staging\.css/);
  assert.match(loader, /editor-barbershop-staging\.js/);
  assert.match(editor, /data-card-experience=\"barbershop\"/);
  assert.match(editor, /Barber Control Center/);
  assert.match(editor, /Revolving Flow Dock/);
  assert.match(editor, /removeLegacyTemplateCard/);
  assert.match(editor, /MODE='barbershop'/);
  assert.doesNotMatch(editor, /setCore\('card_experience','barbershop'\)/);
});

test('Barbershop editor reuses LIW fields and offers barber theme customization', () => {
  const editor = read('js/editor-barbershop-staging.js');

  for (const preset of ['Black & Gold', 'Classic Pole', 'Urban', 'Clean White', 'Vintage Leather']) {
    assert.match(editor, new RegExp(preset));
  }
  for (const field of ['primary_color', 'secondary_color', 'background_color', 'text_color']) {
    assert.match(editor, new RegExp(`data-barber-color=\\"${field}\\"`));
  }
  for (const field of ['full_name', 'job_title', 'company_name', 'business_address', 'phone', 'sms_phone', 'booking_url', 'headline']) {
    assert.match(editor, new RegExp(field));
  }
  assert.match(editor, /scheduleSave/);
  assert.match(editor, /render/);
});

test('Barbershop public experience is fixed full-screen with changing center content', () => {
  const loader = read('js/public-card-liw-loader-staging.js');
  const publicTheme = read('js/public-barbershop-staging.js');
  const publicCss = read('css/public-barbershop-staging.css');

  assert.match(loader, /public-barbershop-staging\.css/);
  assert.match(loader, /public-barbershop-staging\.js/);
  assert.match(publicTheme, /barber-center-stage/);
  assert.match(publicTheme, /barber-flow-dock/);
  assert.match(publicTheme, /Book My Chair/);
  assert.match(publicTheme, /Save My Barber/);
  assert.match(publicTheme, /data-barber-view/);
  assert.match(publicCss, /100dvh/);
  assert.match(publicCss, /overflow:hidden!important/);
  assert.match(publicCss, /#avatar\.public-avatar/);
  assert.match(publicCss, /barber-flow-dock button\.active/);
});

test('native LIW booking remains reachable from the Barbershop experience', () => {
  const publicTheme = read('js/public-barbershop-staging.js');
  assert.match(publicTheme, /nativeBookingSection/);
  assert.match(publicTheme, /#booking-v1-section/);
  assert.match(publicTheme, /openBookingSheet/);
});
