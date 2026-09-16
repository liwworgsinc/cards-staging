const { test, expect } = require('@playwright/test');

test.describe('Email Growth staging', () => {
  test('admin email growth route never settles on a blank page', async ({ page }) => {
    await page.goto('/admin-email-growth.html');
    await page.waitForTimeout(900);
    const url = page.url();
    if (url.includes('login.html')) {
      await expect(page.locator('body')).toBeVisible();
      return;
    }
    await expect(page.locator('#email-auth-guard')).toBeVisible();
    await expect(page.locator('#email-auth-title')).not.toHaveText('');
  });

  test('email growth assets and staging safety copy are shipped', async ({ request }) => {
    const pageResponse = await request.get('/admin-email-growth.html');
    expect(pageResponse.ok()).toBeTruthy();
    const html = await pageResponse.text();
    expect(html).toContain('Staging safety lock');
    expect(html).toContain('admin-email-growth.js');

    const jsResponse = await request.get('/js/admin-email-growth.js');
    expect(jsResponse.ok()).toBeTruthy();
    const js = await jsResponse.text();
    expect(js).toContain("growth-email-staging");
    expect(js).toContain('send_test');
  });
});
