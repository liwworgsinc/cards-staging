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
  }, {definitions: catalog, subscription, planKey});
  await page.route('**/js/config.js*', route => route.fulfill({status:200, contentType:'text/javascript', body:'window.LIW_CONFIG={};'}));
  await page.route('**/js/common.js*', route => route.fulfill({status:200, contentType:'text/javascript', body:''}));
  await page.route('**/js/referral.js*', route => route.fulfill({status:200, contentType:'text/javascript', body:''}));
  await page.route('https://unpkg.com/lucide@latest', route => route.fulfill({status:200, contentType:'text/javascript', body:'window.lucide={createIcons(){}};'}));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', route => route.fulfill({status:200, contentType:'text/javascript', body:'window.supabase={};'}));
  await page.goto('/enhance-card-test.html', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#enhance-catalog-count')).toContainText('3 configured add-ons');
}

test('real catalog prices, yearly default and monthly comparison never charge', async ({page}) => {
  const calls = [];
  await page.route('**/functions/v1/manage-addon', route => {calls.push(route.request().url());return route.abort();});
  await openCatalog(page);
  await expect(page.locator('[data-enhance-interval="year"]')).toHaveClass(/active/);
  await expect(page.locator('[data-id="premium_templates"]')).toContainText('$20.00');
  await expect(page.locator('[data-id="premium_templates"]')).toContainText('Not yet for sale');
  await page.locator('[data-id="premium_templates"] [data-select]').click();
  await expect(page.locator('#enhance-total')).toHaveText('$20.00');
  await page.locator('#enhance-checkout').click();
  await expect(page.locator('#enhance-status')).toContainText('not a checkout');
  expect(calls).toEqual([]);
  await page.locator('[data-enhance-interval="month"]').click();
  await expect(page.locator('[data-id="premium_templates"]')).toContainText('$2.00');
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
  await expect(page.locator('[data-id="advanced_analytics"]')).toContainText('$2.00');
});

test('mobile review shows the selected summary', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await openCatalog(page);
  await page.locator('[data-id="premium_templates"] [data-select]').click();
  await page.locator('#enhance-mobile-review').click();
  await expect(page.locator('.enhance-summary-card')).toBeVisible();
  await expect(page.locator('#enhance-selected-list')).toContainText('Premium Templates');
});