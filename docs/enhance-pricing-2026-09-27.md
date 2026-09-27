# LIW Cards — owner-approved À-la-Carte pricing proposal

Updated September 27, 2026. **Staging only; not current Stripe or live billing prices.** These are proposed selling prices in USD. Existing Plus/Pro pricing and entitlements remain unchanged. The canonical staging pricing manifest is `js/enhance-pricing-proposal-staging.js`, which must never be trusted as a checkout authority.

| Enhancement | Yearly proposal | Monthly proposal | Current DB yearly | Current DB state |
|---|---:|---:|---:|---|
| Premium Templates | $20.00 | $2.49 | $20.00 | Mapped; non-sellable |
| Remove LIW Branding | $20.00 | $2.49 | $20.00 | Mapped; non-sellable |
| Custom Cover Image | $12.00 | Annual only | $0.00 | Mapped; non-sellable |
| Expanded Font Library | $12.00 | Annual only | $0.00 | Mapped; non-sellable |
| Custom Footer Link | $15.00 | Annual only | $0.00 | Mapped; non-sellable |
| Realtor Experience | $29.00 | $3.49 | $0.00 | Mapped; non-sellable |
| Email Signature Generator | $15.00 | Annual only | No row | Planned; unmapped |
| Virtual Background Styles | $15.00 | Annual only | No row | Planned; unmapped |
| Custom Virtual Background Upload | $19.00 | Annual only | No row | Planned; unmapped |
| Native Appointment Booking | $36.00 | $3.99 | $30.00 | Mapped; non-sellable |
| Lead Capture | $24.00 | $2.99 | $30.00 | Mapped; non-sellable |
| Product Showcase | $29.00 | $3.49 | $30.00 | Mapped; non-sellable |
| Business Hours | $12.00 | Annual only | No row | Planned; unmapped |
| Frequently Asked Questions | $15.00 | Annual only | No row | Planned; unmapped |
| Map & Location | $12.00 | Annual only | No row | Planned; unmapped |
| Advanced Analytics | $29.00 | $3.49 | $20.00 | Mapped; non-sellable |
| Photo Gallery | $24.00 | $2.99 | No row | Planned; unmapped |
| Testimonials & Reviews | $15.00 | Annual only | No row | Planned; unmapped |
| Custom CTA Buttons | $15.00 | Annual only | No row | Planned; unmapped |
| Credentials & Badges | $12.00 | Annual only | No row | Planned; unmapped |
| Featured Links | $15.00 | Annual only | No row | Planned; unmapped |
| Custom SEO Details | $24.00 | $2.99 | $0.00 | Mapped; non-sellable |
| Featured Video | $24.00 | $2.99 | $20.00 | Mapped; non-sellable |
| File Downloads | $29.00 | $3.49 | $20.00 | Mapped; non-sellable |
| Extra Digital Card / card | $10.00 | $1.00 | $10.00 | Mapped; non-sellable |
| Team Member Access / seat | $40.00 | $4.00 | $40.00 | Mapped; non-sellable |
| Bulk Card Management | $29.00 | $3.49 | $0.00 | Mapped; non-sellable |
| 25 Extra Agency Client Cards / pack of 25 | $120.00 | $12.00 | $100.00 | Mapped; non-sellable |

## Cost controls and operational limits

**Current status:** None of the proposed usage limits below are enforced by this pricing proposal. Validate the server-side rules and existing contracts before launch. Do not retroactively reduce existing paid-plan benefits.

- Default to yearly. Thirteen low-price items are annual-only. Combine monthly add-ons into a single subscription invoice; do not collect separate monthly $1 payments for each card.
- Appointment add-on proposal: at most 50 bookings/month and 150 transactional emails/month, excluding SMS. Count and cap on the server, with upgrade/overflow handling.
- File-download add-on proposal: three files, 10 MB per file. Set and meter a download/egress quota before sale.
- Custom virtual background upload and photo gallery: define file-count, per-file size, storage and egress budgets; optimize images at upload. Current price alone does not entitle unlimited storage.
- Video price includes external video embeds/links, not LIW-hosted video transcoding or unlimited media bandwidth.
- Extra Card is per additional card; Team Access is per seat; Agency Pack is per 25 cards. Separate-billing items are excluded from combined estimates until the billing and quantity model is verified.
- Verify all actual feature entitlements, especially Product Showcase vs. Services, and do not claim that planned features are currently included in Plus/Pro. Show active/included tools without second purchase buttons.
- Use consolidated billing and actual provider costs (payment fee, Billing fee, storage, bandwidth, mail, refunds, tax and support) in a per-customer margin model. A $1/month sticker price is not $1 of profit.
- Provide self-serve help for low-cost items; quote custom design/support separately. Alert and meter usage to detect customers near allowances.

## Release and Stripe gates

- [ ] Set up isolated Stripe TEST credentials and test-only customer/subscription/entitlement data; never fall back to the shared project's existing live secret.
- [ ] Verify new test Price IDs for every approved interval and amount. Database cents and existing Stripe IDs may differ; do not assume an existing Stripe Price changes when database cents change.
- [ ] Verify server-side user/plan permission checks, add-on mapping, item units, duplicate/included/active protection, annual-only rules and price authority.
- [ ] Implement and test storage/egress, booking, email and capacity limits server-side; finalize published terms and overflow behavior.
- [ ] Test signed webhooks, idempotency, renewal, payment failure, proration, cancellation and entitlement removal.
- [ ] Verify Free, Lite, Plus, Pro, agency, admin-simulation and mobile flows without writing any production account data.
- [ ] Confirm performance/margin against actual use, run rollout monitoring and prepare rollback before any live activation.

**Custom domains:** existing separate domain flow. **My Enhancements:** free account view. All existing production add-on rows remained non-sellable at review.
