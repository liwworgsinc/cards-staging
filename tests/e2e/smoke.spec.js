const { test, expect } = require('@playwright/test');

const publicPages = [
  { path: '/', title: /LIW Cards/i },
  { path: '/login.html', title: /Log in|LIW Digital Cards/i },
  { path: '/register.html', title: /Create Account|LIW Cards/i }
];

for (const entry of publicPages) {
  test(`${entry.path} loads successfully`, async ({ page }) => {
    const response = await page.goto(entry.path, { waitUntil: 'domcontentloaded' });

    expect(response, `Expected a response for ${entry.path}`).not.toBeNull();
    expect(response.status(), `${entry.path} returned an HTTP error`).toBeLessThan(400);
    await expect(page).toHaveTitle(entry.title);
    await expect(page.locator('body')).toBeVisible();
  });
}

test('home page exposes the core navigation surface', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a[href*="login"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText(/digital business card/i);
});

test('Growth Center never leaves visitors on a blank auth-pending screen', async ({ page }) => {
  await page.goto('/admin-growth.html', { waitUntil: 'domcontentloaded' });

  await expect.poll(async () => {
    if (/login\.html/.test(page.url())) return 'login';
    const guard = page.locator('#liw-growth-auth-guard');
    if (await guard.count() && await guard.isVisible()) return 'guard';
    const bodyPending = await page.locator('body').evaluate(el => el.classList.contains('growth-auth-pending'));
    return bodyPending ? 'pending' : 'ready';
  }, { timeout: 8000 }).not.toBe('pending');

  if (!/login\.html/.test(page.url())) {
    const guard = page.locator('#liw-growth-auth-guard');
    const dashboard = page.locator('.dashboard');
    expect((await guard.count() && await guard.isVisible()) || (await dashboard.count() && await dashboard.isVisible())).toBeTruthy();
  }
});