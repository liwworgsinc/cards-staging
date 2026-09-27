const { test, expect } = require('@playwright/test');

const catalog = [
  { addon_key: 'premium_templates', name: 'Premium Templates', is_active: true, is_sellable: false, monthly_price_cents: 200, yearly_price_cents: 2000, stripe_monthly_price_id: 'price_test_month', stripe_yearly_price_id: 'price_test_year', included_plans: ['plus','pro'] },
  { addon_key: 'advanced_analytics', name: 'Advanced Analytics', is_active: true, is_sellable: false, monthly_price_cents: 200, yearly_price_cents: 2000, stripe_monthly_price_id: 'price_test_month2', stripe_yearly_price_id: 'price_test_year2', included_plans: ['pro'] },
  { addon_key: 'extra_card', name: 'Extra Digital Card', is_active: true, is_sellable: false, monthly_price_cents: 100, yearly_price_cents: 1000, stripe_monthly_price_id: 'price_test_month3', stripe_yearly_price_id: 'price_test_year3', included_plans: [] }
];

async function openCatalog(page, options = {}) {
  const subscription = options.subscription || {plan_key: 'starter', status: 'active', billing_interval: 'month', stripe_subscription_id: null};
  const planKey = options.planKey || 'starter';
  await page.addInitScript(({ definitions, subscription, planKey }) => {
    window.LIW_IS_GITHUB_STAGING = true;
    window.lucide = { createIcons() {} };
    window.requireUser = async () => ({id: 'e2e-user'});
    window.getLiwAccessContext = async () => ({planKey, isAdmin: false, isPlanPreview: false});
    const data = {
      addon_definitions: definitions,
      subscription_addons: [],
      subscriptions: subscription,
      plan_definitions: [
        {plan_key:'plus',name:'Plus',yearly_price_cents:4900},
        {plan_key:'pro',name:'Pro',yearly_price_cents:9900}
      ]
    };
    window.supabaseClient = {
      from(table) {
        const query = {
          select() { return query; },
          eq() { return query; },
          order() { return query; },
          in() { return query; },
          maybeSingle() { return Promise.resolve({data: data[table], error: null}); },
          then(resolve, reject) { return Promise.resolve({data: data[table], error: null}).then(resolve, reject); }
        };
        return query;
      }
    };
  }, {definitions: options.definitions || catalog, subscription, planKey});
  await page.route('**/js/config.js*', route => route.fulfill({status:200, contentType:'text/javascript', body:'window.LIW_CONFIG={};'}));
  await page.route('**/js/common.js*', route => route.fulfill({status:200, contentType:'text/javascript', body:''}));
  await page.route('**/js/referral.js*', route => route.fulfill({status:200, contentType:'text/javascript', body:''}));
  await page.route('https://unpkg.com/lucide@latest', route => route.fulfill({status:200, contentType:'text/javascript', body:'window.lucide={createIcons(){}};'}));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', route => route.fulfill({status:200, contentType:'text/javascript', body:'window.supabase={};'}));
  await page.goto('/enhance-card-test.html', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#enhance-catalog-count')).toContainText('28 proposed prices');
}

test('owner-approved proposal prices, yearly default and monthly comparison never charge', async ({page}) => {
  const calls = [];
  await page.route('**/functions/v1/manage-addon', route => {calls.push(route.request().url());return route.abort();});
  await openCatalog(page);
  await expect(page.locator('[data-enhance-interval="year"]')).toHaveClass(/active/);
  await expect(page.locator('[data-id="premium_templates"]')).toContainText('$20.00');
  await expect(page.locator('[data-id="premium_templates"]')).toContainText('Price proposal');
  await page.locator('[data-id="premium_templates"] [data-select]').click();
  await expect(page.locator('#enhance-total')).toHaveText('$20.00');
  await page.locator('#enhance-checkout').click();
  await expect(page.locator('#enhance-status')).toContainText('not a checkout');
  expect(calls).toEqual([]);
  await page.locator('[data-enhance-interval="month"]').click();
  await expect(page.locator('[data-id="premium_templates"]')).toContainText('$2.49');
  await expect(page.locator('#enhance-total')).toHaveText('$0.00');
  expect(calls).toEqual([]);
});

test('included add-ons cannot be selected and paid interval remains locked', async ({page}) => {
  await openCatalog(page, {
    planKey:'plus',
    subscription:{plan_key:'plus', status:'active',billing_interval:'month',stripe_subscription_id:'sub_test_existing'}
  });
  await expect(page.locator('[data-enhance-interval="year"]')).toBeDisabled();
  await expect(page.locator('[data-enhance-interval="month"]')).toHaveClass(/active/);
  await expect(page.locator('[data-id="premium_templates"] [data-select]')).toBeDisabled();
  await expect(page.locator('[data-id="premium_templates"]')).toContainText('Included');
  await expect(page.locator('[data-id="premium_templates"] .enhance-price strong')).toHaveText('$20.00');
  await expect(page.locator('[data-id="advanced_analytics"]')).toContainText('$3.49');
});

test('mobile review shows the selected summary', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await openCatalog(page);
  await page.locator('[data-id="premium_templates"] [data-select]').click();
  await page.locator('#enhance-mobile-review').click();
  await expect(page.locator('.enhance-summary-card')).toBeVisible();
  await expect(page.locator('#enhance-selected-list')).toContainText('Premium Templates');
});

test('restored feature inventory displays proposed prices but roadmap cards cannot be purchased', async ({page}) => {
  await openCatalog(page);
  const missing = [
    'email_signature_generator', 'virtual_background_styles', 'custom_virtual_background_upload',
    'business_hours', 'frequently_asked_questions', 'map_location', 'photo_gallery',
    'testimonials_reviews', 'custom_cta_buttons', 'credentials_badges', 'featured_links'
  ];
  await expect(page.locator('[data-enhance-section]')).toHaveCount(6);
  for (const key of missing) {
    const card = page.locator('[data-id="' + key + '"]');
    await expect(card).toContainText('Planned');
    await expect(card).toContainText('Proposed');
    await expect(card.locator('[data-select]')).toBeDisabled();
  }
  await page.locator('[data-filter="growth"]').click();
  await expect(page.locator('[data-enhance-section="growth"]')).toBeVisible();
  await expect(page.locator('[data-enhance-section="design"]')).toBeHidden();
  await page.locator('[data-filter="all"]').click();
  await expect(page.locator('[data-enhance-section="design"]')).toBeVisible();
  await expect(page.locator('[data-enhance-section="mine"]')).toBeHidden();
  await expect(page.locator('#enhance-total')).toHaveText('$0.00');
});

test('My Enhancements shows entitlements once without extra purchase buttons', async ({page}) => {
  await openCatalog(page, {planKey:'plus'});
  await page.locator('[data-filter="mine"]').click();
  await expect(page.locator('[data-enhance-section="mine"]')).toBeVisible();
  await expect(page.locator('[data-owned-key="premium_templates"]')).toContainText('Included in your plan');
  await expect(page.locator('[data-enhance-section="mine"] [data-select]')).toHaveCount(0);
  await expect(page.locator('[data-id="premium_templates"]')).toHaveCount(1);
});

test('unconfigured items show proposed amounts but remain planned and disabled', async ({page}) => {
  await openCatalog(page, {planKey:'plus'});
  await expect(page.locator('[data-id="cover_image"]')).toContainText('Planned');
  await expect(page.locator('[data-id="cover_image"]')).toContainText('$12.00');
  await expect(page.locator('[data-id="cover_image"] [data-select]')).toBeDisabled();
  await expect(page.locator('[data-id="agency_card_pack_25"]')).toContainText('Planned');
  await expect(page.locator('[data-id="agency_card_pack_25"]')).toContainText('$120.00');
});

test('every one of the 28 proposed prices matches the owner-approved price sheet', async ({page}) => {
  await openCatalog(page);
  const proposed = [
    ['premium_templates','$20.00'],['remove_branding','$20.00'],['cover_image','$12.00'],
    ['expanded_fonts','$12.00'],['custom_branding_link','$15.00'],['realtor_experience','$29.00'],
    ['email_signature_generator','$15.00'],['virtual_background_styles','$15.00'],
    ['custom_virtual_background_upload','$19.00'],['appointment_booking','$36.00'],
    ['lead_capture','$24.00'],['product_showcase','$29.00'],['business_hours','$12.00'],
    ['frequently_asked_questions','$15.00'],['map_location','$12.00'],['advanced_analytics','$29.00'],
    ['photo_gallery','$24.00'],['testimonials_reviews','$15.00'],['custom_cta_buttons','$15.00'],
    ['credentials_badges','$12.00'],['featured_links','$15.00'],['custom_seo','$24.00'],
    ['video_section','$24.00'],['file_downloads','$29.00'],['extra_card','$10.00'],
    ['team_member_access','$40.00'],['bulk_card_management','$29.00'],['agency_card_pack_25','$120.00']
  ];
  await expect(page.locator('.enhance-feature')).toHaveCount(28);
  for (const [key,amount] of proposed) {
    await expect(page.locator('[data-id="' + key + '"] .enhance-price strong')).toHaveText(amount);
  }
  await expect(page.locator('[data-id="appointment_booking"]')).toContainText('not enforced');
  await expect(page.locator('[data-id="video_section"]')).toContainText('External video');
  await expect(page.locator('[data-id="file_downloads"]')).toContainText('10 MB each');
});

test('annual-only enhancements cannot be added to a monthly estimate', async ({page}) => {
  await openCatalog(page, {definitions:catalog.concat([
    {addon_key:'cover_image',name:'Custom Cover Image',is_active:true,is_sellable:false,
     monthly_price_cents:0,yearly_price_cents:0,stripe_monthly_price_id:null,stripe_yearly_price_id:null,included_plans:['plus']}
  ])});
  await expect(page.locator('[data-id="cover_image"] .enhance-price strong')).toHaveText('$12.00');
  await page.locator('[data-id="cover_image"] [data-select]').click();
  await expect(page.locator('#enhance-total')).toHaveText('$12.00');
  await page.locator('[data-enhance-interval="month"]').click();
  await expect(page.locator('[data-id="cover_image"]')).toContainText('Annual only');
  await expect(page.locator('[data-id="cover_image"] [data-select]')).toBeDisabled();
  await expect(page.locator('#enhance-total')).toHaveText('$0.00');
});

test('plan comparison does not claim an extra card is included in Plus or Pro', async ({page}) => {
  await openCatalog(page);
  await page.locator('[data-id="extra_card"] [data-select]').click();
  await expect(page.locator('#enhance-recommendation')).toContainText('Some selected extras are not included');
  await expect(page.locator('#enhance-plus-card')).not.toHaveClass(/recommended/);
  await expect(page.locator('#enhance-pro-card')).not.toHaveClass(/recommended/);
  await expect(page.locator('[data-id="team_member_access"] [data-select]')).toBeDisabled();
});
