const { test, expect } = require('@playwright/test');

for (const slug of ['latoya-rapid', 'jacky-brown']) {
  test(`published card ${slug} renders without browser errors`, async ({ page }) => {
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error?.message || error)));
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const response = await page.goto(`/card.html?slug=${slug}`, { waitUntil: 'domcontentloaded' });
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(400);

    await expect(page.locator('#card')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#loading')).toBeHidden({ timeout: 15000 });

    expect(pageErrors, `page errors for ${slug}:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors.filter(line => !/favicon|ERR_BLOCKED_BY_CLIENT/i.test(line)),
      `console errors for ${slug}:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
}
