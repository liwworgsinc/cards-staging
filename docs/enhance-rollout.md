# LIW Cards — Enhance Your Card rollout

Updated 2026-09-27. Applies to the `liwworgsinc/cards-staging` repository only.

## Stage A: implemented (catalog and pricing review)
- `enhance-card-test.html` loads `js/enhance-card-staging.js`.
- Authenticated account context comes from the existing LIW auth runtime.
- Reads `addon_definitions`, `subscription_addons`, `subscriptions`, and `plan_definitions` under the user's session.
- Original Stage A used database cents/Stripe-price readiness rather than legacy mock prices; Stage A.2 below now deliberately replaces the preview amounts with an owner-approved proposal while preserving database-backed entitlements.
- Yearly default for users without a live paid subscription; monthly comparison supported.
- Existing paid subscriptions lock the interval to the plan's existing billing interval.
- Included/active add-ons are not offered again; account-wide scope is made explicit.
- Selected items are an estimate, not a multi-item Stripe cart.
- No payment endpoint, subscription update, or entitlement mutation is invoked.
- Playwright scenarios cover annual/monthly display, included/active states, no-charge review, and mobile summary.

## Stage A.1: restored staging feature inventory
- The catalog is organized into six views: Design & Branding, Business Tools, Growth Suite, Media & Content, Extra Capacity, and My Enhancements.
- The original 11 omitted enhancements appear as **planned**, initially without prices, entitlements or purchase buttons until approved database mappings exist: Email Signature Generator, Virtual Background Styles, Custom Virtual Background Upload, Business Hours, Frequently Asked Questions, Map & Location, Photo Gallery, Testimonials & Reviews, Custom CTA Buttons, Credentials & Badges, Featured Links.
- Seven database-only items are surfaced with their actual status: Custom Cover Image, Expanded Font Library, Custom Footer Link, Custom SEO Details, Realtor Experience, Bulk Card Management, 25 Extra Client Cards.
- Custom domains stay in their separate purchase flow and link to domains.html; no duplicate add-on was created.
- My Enhancements summarizes existing plan inclusions/active add-ons without duplicating purchase controls.
- Separate-billing items (Team Member Access and 25 Extra Client Cards) cannot be combined into the illustrative estimate.
- No database schema, Stripe price, Stripe Edge Function, entitlement or production code was changed in this stage.

## Stage A.2: owner-approved selling-price proposal (staging-only)

- The 28 approved proposed customer prices are isolated in `js/enhance-pricing-proposal-staging.js`, with a full change matrix and safety gates in [enhance-pricing-2026-09-27.md](enhance-pricing-2026-09-27.md).
- These browser prices are illustrative only and not checkout authority; the shared Supabase/Stripe amounts and IDs remain unchanged.
- Staging now displays all 28 proposed annual amounts, including 11 clearly **planned** enhancements, without enabling purchases of unmapped features.
- Thirteen low-cost items are annual-only. A feature with no monthly proposal is not eligible for the monthly estimate, even when a database mapping exists.
- Existing plan/active entitlements prevent duplicate selections. Team seats and agency 25-card packs remain outside the combined estimate.
- Plan comparisons are shown only when database entitlements verify that every selected item is included in the compared plan.
- Usage allowances for booking/email, file downloads, photos and backgrounds are **proposed but not yet enforced**. Existing subscribers are not retroactively limited.
- No Supabase schema, shared database rows, Stripe products/prices, live subscription or production repository file changed.

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
The earlier static design listed 17 example features and sample prices; Stage A.2 now uses the 28-item owner-approved **proposal**, not the existing Stripe pricing. These values must not be presented as purchasable products or guaranteed totals until production billing and entitlements are tested.
