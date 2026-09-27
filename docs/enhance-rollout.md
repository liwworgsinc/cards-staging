# LIW Cards — Enhance Your Card rollout

Updated 2026-09-27. Applies to the `liwworgsinc/cards-staging` repository only.

## Stage A: implemented (catalog and pricing review)
- `enhance-card-test.html` loads `js/enhance-card-staging.js`.
- Authenticated account context comes from the existing LIW auth runtime.
- Reads `addon_definitions`, `subscription_addons`, `subscriptions`, and `plan_definitions` under the user's session.
- Uses database cents/Stripe-price readiness, not the prior static $9.99 sample prices.
- Yearly default for users without a live paid subscription; monthly comparison supported.
- Existing paid subscriptions lock the interval to the plan's existing billing interval.
- Included/active add-ons are not offered again; account-wide scope is made explicit.
- Selected items are an estimate, not a multi-item Stripe cart.
- No payment endpoint, subscription update, or entitlement mutation is invoked.
- Playwright scenarios cover annual/monthly display, included/active states, no-charge review, and mobile summary.

## Backend findings that block live checkout
- Both staging and production frontends currently use the same Supabase project.
- All current `addon_definitions` have `is_sellable = false`; do not override this in the shared project merely to test the page.
- Deployed `manage-addon` uses the project-level Stripe secret and updates real subscriptions.
- Its origin and return-URL allowlist does not include the current `liwworgsinc.github.io/cards-staging/` address.
- The existing endpoint changes one add-on at a time. Do not represent the estimate as a single multi-item checkout.
- The existing Stripe webhook already contains subscription/add-on reconciliation; changes to it affect production customers.
- The deprecated `addons.html` route redirects to `pricing.html`. Do not route users there for the new storefront without checking this redirect.

## Stage B: isolated Stripe QA (not deployed)
1. Isolate billing tests using Stripe test-mode secret/prices **and** test-only customer/entitlement records; do not share the live subscription rows.
2. Review staging origin and success/cancel URL allowlists in the *test* endpoint.
3. Implement server-side authenticated pricing/eligibility checks. Never accept price IDs or costs from browser payloads.
4. Define a purchase model: initial checkout for the first add-on, one-at-a-time subsequent subscription changes, or a new atomic multi-item checkout if desired. UI must describe the chosen behavior accurately.
5. Verify signed test webhook, event deduplication, invoice/failed-payment behavior, entitlement reconciliation, interval changes, cancellation and renewal.
6. Keep purchases guarded until checks pass and configured features are explicitly approved for sale.
7. Verify Free, Lite, Plus, Pro, admin simulation, active/past-due, and mobile flows before production changes.

## Stage C: production (not deployed)
Review approved prices against displayed copy; test the live Stripe price IDs separately; confirm permission and entitlement rules; implement a reversible rollout and monitoring. Do not deploy from the staging preview alone.

## Pricing note
The earlier static design listed 17 example features and example yearly prices. The current database has a different feature/pricing catalog, so examples must not be presented as purchasable products or guaranteed totals.
