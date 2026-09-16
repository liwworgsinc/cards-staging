const { test, expect } = require('@playwright/test');

const publicPages = [
  { path: '/', title: /LIW Cards/i },
  { path: '/login.html', title: /Log in|LIW Digital Cards/i },
  { path: '/register.html', title: /Create Account|LIW Cards/i },
  { path: '/tools/index.html', title: /Free Business Tools|LIW Cards Staging/i },
  { path: '/tools/qr-generator.html', title: /Free QR Code Generator|LIW Cards Staging/i }
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

test('free tools hub links to the three staging tools', async ({ page }) => {
  await page.goto('/tools/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a[href="qr-generator.html"]')).toBeVisible();
  await expect(page.locator('a[href="email-signature-generator.html"]')).toBeVisible();
  await expect(page.locator('a[href="digital-card-score.html"]')).toBeVisible();
});

test('QR generator exposes URL input and download workflow', async ({ page }) => {
  await page.goto('/tools/qr-generator.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#qr-url')).toBeVisible();
  await expect(page.locator('#generate')).toBeVisible();
  await expect(page.locator('#download')).toBeVisible();
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

test('Growth Center Supabase runtime compatibility asset is present', async ({ request }) => {
  const response = await request.get('/vendor/supabase-2.110.8.js');
  expect(response.status()).toBe(200);
  const source = await response.text();
  expect(source).toMatch(/supabase-js@2|createClient/);
});

test('Growth Center does not settle on a runtime-start failure', async ({ page }) => {
  await page.goto('/admin-growth.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  if (/login\.html/.test(page.url())) return;
  const title = page.locator('#liw-growth-auth-title');
  if (await title.count()) {
    await expect(title).not.toHaveText(/could not start/i);
  }
});
