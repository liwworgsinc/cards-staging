const { test, expect } = require('@playwright/test');

test('published Latoya Rapid card renders externally', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));
  const response = await page.goto('/card.html?slug=latoya-rapid', { waitUntil: 'domcontentloaded' });
  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);
  await expect(page.locator('#card')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#loading')).toBeHidden({ timeout: 15000 });
  expect(pageErrors).toEqual([]);
});

test('public card loader preserves both draft-owner and published-public preview paths', async ({ request }) => {
  const card = await request.get('/card.html');
  const html = await card.text();
  expect(html).toContain('js/config.js?v=20260919-dual-preview-1');
  expect(html).not.toContain('public-card-config-staging.js');
  expect(html).not.toContain('public-card-safe-source-staging.js');

  const loader = await request.get('/js/public-card.js');
  const source = await loader.text();
  expect(source).toContain('createAnonymousPublicClient');
  expect(source).toContain('anonymous public route first');
  expect(source).toContain('fall back');
  expect(source).toContain("supabaseClient.rpc('public_card_by_slug'");
  expect(source).toContain("supabaseClient.auth.getUser()");
});
