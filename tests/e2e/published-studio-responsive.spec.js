const { test, expect } = require('@playwright/test');

test('published Studio card stays responsive after first render', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));

  const response = await page.goto('https://liwworgsinc.github.io/cards-staging/card.html?slug=jacky-brown', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('#card')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#loading')).toBeHidden({ timeout: 15000 });
  await expect(page.locator('html')).toHaveClass(/liw-public-studio/, { timeout: 15000 });
  await expect(page.locator('.barber-client-home')).toBeVisible({ timeout: 15000 });

  const started = Date.now();
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
  }));
  expect(Date.now() - started).toBeLessThan(4000);

  await expect(page.locator('.studio-signature-identity')).toBeVisible({ timeout: 10000 });
  expect(pageErrors).toEqual([]);
});
