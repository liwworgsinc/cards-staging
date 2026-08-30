import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../../domains.html', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../../js/domain-config-bridge-staging.js', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../../js/domain-stripe-checkout-staging.js', import.meta.url), 'utf8');

test('domains page loads the fresh Stripe checkout bridge', () => {
  assert.match(page, /domain-config-bridge-staging\.js\?v=20260829-domain-stripe-1/);
  assert.match(bridge, /domain-stripe-checkout-staging\.js\?v=20260829-domain-stripe-1/);
});

test('domain purchase flow uses server-side quote, checkout, and fulfillment status functions', () => {
  assert.match(checkout, /create-domain-checkout/);
  assert.match(checkout, /action: 'quote'/);
  assert.match(checkout, /action: 'checkout'/);
  assert.match(checkout, /domain-order-status/);
  assert.match(checkout, /agreementTypes: agreements\.map/);
  assert.match(checkout, /Continue to Stripe/);
});

test('staging makes a real-charge warning visible before redirecting to Stripe', () => {
  assert.match(checkout, /live Stripe account/);
  assert.match(checkout, /creates a real charge/);
});

test('checkout overlay prevents the retired search-only script from permanently disabling purchase', () => {
  assert.match(checkout, /const shouldDisable = checkoutBusy \|\| !allowed/);
  assert.match(checkout, /next\.dataset\.domainStripeReady = 'true'/);
});
