/* Owner-approved working price proposal for LIW Cards staging, 2026-09-27.
 * Display and estimate ONLY: never trust this client-side manifest for checkout.
 * Existing Supabase/Stripe prices remain unchanged; no limits below are enforced.
 */
(function () {
  'use strict';
  const rows = [
  {
    "key": "premium_templates",
    "section": "design",
    "yearlyCents": 2000,
    "monthlyCents": 249,
    "note": "Premium styles"
  },
  {
    "key": "remove_branding",
    "section": "design",
    "yearlyCents": 2000,
    "monthlyCents": 249,
    "note": "Branding removal"
  },
  {
    "key": "cover_image",
    "section": "design",
    "yearlyCents": 1200,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "expanded_fonts",
    "section": "design",
    "yearlyCents": 1200,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "custom_branding_link",
    "section": "design",
    "yearlyCents": 1500,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "realtor_experience",
    "section": "design",
    "yearlyCents": 2900,
    "monthlyCents": 349,
    "note": "Industry experience"
  },
  {
    "key": "email_signature_generator",
    "section": "design",
    "yearlyCents": 1500,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "virtual_background_styles",
    "section": "design",
    "yearlyCents": 1500,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "custom_virtual_background_upload",
    "section": "design",
    "yearlyCents": 1900,
    "monthlyCents": null,
    "note": "Storage allowance proposed; not enforced"
  },
  {
    "key": "appointment_booking",
    "section": "business",
    "yearlyCents": 3600,
    "monthlyCents": 399,
    "note": "Proposed cap: 50 bookings + 150 transactional emails/month; not enforced"
  },
  {
    "key": "lead_capture",
    "section": "business",
    "yearlyCents": 2400,
    "monthlyCents": 299,
    "note": "Lead collection"
  },
  {
    "key": "product_showcase",
    "section": "business",
    "yearlyCents": 2900,
    "monthlyCents": 349,
    "note": "Product permission; verify service access separately"
  },
  {
    "key": "business_hours",
    "section": "business",
    "yearlyCents": 1200,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "frequently_asked_questions",
    "section": "business",
    "yearlyCents": 1500,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "map_location",
    "section": "business",
    "yearlyCents": 1200,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "advanced_analytics",
    "section": "growth",
    "yearlyCents": 2900,
    "monthlyCents": 349,
    "note": "Advanced insights"
  },
  {
    "key": "photo_gallery",
    "section": "growth",
    "yearlyCents": 2400,
    "monthlyCents": 299,
    "note": "Compressed uploads and photo limits proposed; not enforced"
  },
  {
    "key": "testimonials_reviews",
    "section": "growth",
    "yearlyCents": 1500,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "custom_cta_buttons",
    "section": "growth",
    "yearlyCents": 1500,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "credentials_badges",
    "section": "growth",
    "yearlyCents": 1200,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "featured_links",
    "section": "growth",
    "yearlyCents": 1500,
    "monthlyCents": null,
    "note": "Annual only"
  },
  {
    "key": "custom_seo",
    "section": "growth",
    "yearlyCents": 2400,
    "monthlyCents": 299,
    "note": "Supported page metadata only"
  },
  {
    "key": "video_section",
    "section": "media",
    "yearlyCents": 2400,
    "monthlyCents": 299,
    "note": "External video links/embeds; hosted uploads not included"
  },
  {
    "key": "file_downloads",
    "section": "media",
    "yearlyCents": 2900,
    "monthlyCents": 349,
    "note": "Proposed allowance: 3 files, 10 MB each; not enforced"
  },
  {
    "key": "extra_card",
    "section": "capacity",
    "yearlyCents": 1000,
    "monthlyCents": 100,
    "note": "Per additional card; monthly only on a consolidated invoice"
  },
  {
    "key": "team_member_access",
    "section": "capacity",
    "yearlyCents": 4000,
    "monthlyCents": 400,
    "note": "Per seat; separate billing and quantity verification"
  },
  {
    "key": "bulk_card_management",
    "section": "capacity",
    "yearlyCents": 2900,
    "monthlyCents": 349,
    "note": "Plan-eligible workspaces"
  },
  {
    "key": "agency_card_pack_25",
    "section": "capacity",
    "yearlyCents": 12000,
    "monthlyCents": 1200,
    "note": "Per pack of 25; separate billing and quantity verification"
  }
];
  const prices = Object.fromEntries(rows.map(({key, section, yearlyCents, monthlyCents, note}) => [key,
    Object.freeze({section, yearlyCents, monthlyCents, note, annualOnly: monthlyCents === null})]));
  window.LIW_ENHANCE_PRICING_DRAFT = Object.freeze({version:'2026-09-27-owner-proposal-v1', label:'Proposed LIW add-on pricing — staging only', prices:Object.freeze(prices)});
})();
