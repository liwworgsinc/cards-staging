import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Wallet is enforced globally at the experience layer', () => {
  const source = read('js/public-card-wallet-global-staging.js');
  assert.match(source, /card_experience/);
  assert.match(source, /color_mode/);
  assert.match(source, /\.liw-rolodex-public-button/);
  assert.match(source, /\[data-realtor-wallet\]/);
  assert.match(source, /\[data-rest-wallet\]/);
  assert.match(source, /#barber-wallet-top/);
  assert.match(source, /#music-save-home-top\[data-liw-wallet-top="true"\]/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /LIWRolodex\.save/);
  assert.match(source, /data-liw-global-wallet/);
});

test('public card loads the global Wallet rule after experience renderers', () => {
  const html = read('card.html');
  const wallet = html.indexOf('public-card-wallet-global-staging.js?v=20260922-global-wallet-1');
  const realtor = html.indexOf('realtor-public-v1.js');
  const restaurant = html.indexOf('restaurant-public-v1-staging.js');
  const studio = html.indexOf('public-studio-signature-top-v4-staging.js');
  assert.ok(wallet > realtor);
  assert.ok(wallet > restaurant);
  assert.ok(wallet > studio);
});
