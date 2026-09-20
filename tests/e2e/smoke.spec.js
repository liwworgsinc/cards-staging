const { test, expect } = require('@playwright/test');

const publicPages = [
  { path: '/', title: /LIW Cards/i },
  { path: '/login.html', title: /Log in|LIW Digital Cards/i },
  { path: '/register.html', title: /Create Account|LIW Cards/i },
  { path: '/tools/index.html', title: /Free Business Tools|LIW Cards Staging/i },
  { path: '/tools/qr-generator.html', title: /Free QR Code Generator|LIW Cards Staging/i },
  { path: '/tools/email-signature-generator.html', title: /Email Signature Generator|LIW Cards Staging/i },
  { path: '/tools/digital-card-score.html', title: /Digital Business Card Score|LIW Cards Staging/i },
  { path: '/email-preferences.html', title: /Email Preferences|LIW Cards Staging/i }
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

test('registration keeps marketing consent optional', async ({ page }) => {
  await page.goto('/register.html', { waitUntil: 'domcontentloaded' });
  const marketing = page.locator('#marketing-opt-in');
  await expect(marketing).toBeVisible();
  await expect(marketing).not.toBeChecked();
  await expect(marketing).not.toHaveAttribute('required', /.*/);
  await expect(page.locator('label[for="marketing-opt-in"]')).toContainText(/optional|unsubscribe anytime/i);
});

test('email preferences page offers account login without a token', async ({ page }) => {
  await page.goto('/email-preferences.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#login-actions')).toBeVisible();
  await expect(page.locator('#pref-status')).toContainText(/log in to manage/i);
});

test('home page exposes the core navigation surface', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a[href*="login"]').first()).toBeVisible();
  await expect(page.locator('body')).toContainText(/digital business card/i);
});

test('free tools hub links open the actual tools', async ({ page }) => {
  await page.goto('/tools/index.html', { waitUntil: 'domcontentloaded' });
  const links = [
    ['qr-generator.html', /Create a QR code in seconds/i],
    ['email-signature-generator.html', /Email Signature Generator/i],
    ['digital-card-score.html', /Digital Business Card Score/i]
  ];
  for (const [href, heading] of links) {
    const link = page.locator(`a[href="${href}"]`);
    await expect(link).toBeVisible();
    await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
    await expect(page.locator('h1')).toHaveText(heading);
    await page.goBack({ waitUntil: 'domcontentloaded' });
  }
});

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlGMGQAAAAASUVORK5CYII=',
  'base64'
);

test('QR generator actually generates a QR code without a script CDN', async ({ page }) => {
  await page.route('https://quickchart.io/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng }));
  await page.goto('/tools/qr-generator.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#status')).toContainText(/QR code ready/i, { timeout: 10000 });

  await page.locator('#qr-url').fill('https://cards.liwworgs.com/card.html?slug=tes-auto');
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText(/QR code ready/i, { timeout: 10000 });
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#qr-image')).toBeVisible();
  await expect(page.locator('#qr-image')).toHaveAttribute('src', /quickchart\.io\/qr/);
});

test('QR generator falls back when the primary QR image service fails', async ({ page }) => {
  await page.route('https://quickchart.io/**', route => route.abort());
  await page.route('https://api.qrserver.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng }));
  await page.goto('/tools/qr-generator.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#status')).toContainText(/QR code ready/i, { timeout: 10000 });
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#qr-image')).toHaveAttribute('src', /api\.qrserver\.com/);
});

test('QR generator rejects non-web links', async ({ page }) => {
  await page.route('https://quickchart.io/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: tinyPng }));
  await page.goto('/tools/qr-generator.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#qr-url').fill('javascript:alert(1)');
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toContainText(/valid public http:\/\/ or https:\/\/ link/i);
  await expect(page.locator('#download')).toBeDisabled();
});

test('email signature preview updates when user types', async ({ page }) => {
  await page.goto('/tools/email-signature-generator.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#name').fill('LIW Test User');
  await page.locator('#business').fill('LIW Cards');
  await expect(page.locator('#preview')).toContainText('LIW Test User');
  await expect(page.locator('#preview')).toContainText('LIW Cards');
});

test('digital card score updates interactively', async ({ page }) => {
  await page.goto('/tools/digital-card-score.html', { waitUntil: 'domcontentloaded' });
  const first = page.locator('[data-points]').first();
  await first.check();
  await expect(page.locator('#score')).toHaveText('15');
  await first.uncheck();
  await expect(page.locator('#score')).toHaveText('0');
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
  if (await title.count()) await expect(title).not.toHaveText(/could not start/i);
});


test('Super Admin exposes Growth Center navigation', async ({ request }) => {
  const response = await request.get('/admin.html');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('href="admin-growth.html"');
  expect(html).toContain('href="admin-email-growth.html"');
});


test('Super Admin hero exposes Growth Center shortcuts', async ({ request }) => {
  const response = await request.get('/admin.html');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('data-liw-growth-hero-link="true"');
  expect(html).toContain('href="admin-growth.html"');
  expect(html).toContain('href="admin-email-growth.html"');
});


test('Email Growth exposes automation controls', async ({ request }) => {
  const response = await request.get('/admin-email-growth.html');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('id="email-automation-enabled"');
  expect(html).toContain('id="email-dry-run"');
  expect(html).toContain('id="email-run-now"');
  expect(html).toContain('id="automation-queue"');
  expect(html).toContain('id="email-suppressions"');
});


test('AI Content Engine route and admin entrypoints are shipped', async ({ request }) => {
  const ai = await request.get('/admin-ai-content.html');
  expect(ai.status()).toBe(200);
  const aiHtml = await ai.text();
  expect(aiHtml).toContain('AI Content Engine');
  expect(aiHtml).toContain('id="ai-generate"');
  expect(aiHtml).toContain('id="ai-drafts"');
  expect(aiHtml).toContain('js/admin-ai-content.js');

  const admin = await request.get('/admin.html');
  expect(await admin.text()).toContain('href="admin-ai-content.html"');

  const growth = await request.get('/admin-growth.html');
  expect(await growth.text()).toContain('href="admin-ai-content.html"');
});


test('LIW Buzz routes and controlled publishing are shipped', async ({ request }) => {
  const hub = await request.get('/buzz.html');
  expect(hub.status()).toBe(200);
  const hubHtml = await hub.text();
  expect(hubHtml).toContain('LIW Buzz');
  expect(hubHtml).toContain('js/buzz.js');

  const article = await request.get('/buzz-article.html?slug=test');
  expect(article.status()).toBe(200);
  const articleHtml = await article.text();
  expect(articleHtml).toContain('js/buzz-article.js');

  const ai = await request.get('/admin-ai-content.html');
  const aiHtml = await ai.text();
  expect(aiHtml).toContain('id="ai-publish"');
  expect(aiHtml).toContain('Publish to LIW Buzz');
  expect(aiHtml).toContain('id="ai-unpublish"');

  const home = await request.get('/index.html');
  expect(await home.text()).toContain('href="buzz.html"');

  const sitemap = await request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain('https://cards.liwworgs.com/buzz.html');
});


test('LIW Buzz high-energy editorial shell is shipped', async ({ request }) => {
  const hub = await request.get('/buzz.html');
  expect(hub.status()).toBe(200);
  const hubHtml = await hub.text();
  expect(hubHtml).toContain('Catch the');
  expect(hubHtml).toContain('buzz-ticker');
  expect(hubHtml).toContain('id="buzz-feature"');
  expect(hubHtml).toContain('Buzz stream');

  const article = await request.get('/buzz-article.html?slug=test');
  expect(article.status()).toBe(200);
  const articleHtml = await article.text();
  expect(articleHtml).toContain('id="buzz-progress"');
  expect(articleHtml).toContain('buzz-mini-ticker');
});


test('AI Social Studio ships Buffer scheduling controls', async ({ request }) => {
  const studio = await request.get('/admin-social-studio.html');
  expect(studio.status()).toBe(200);
  const html = await studio.text();
  expect(html).toContain('AI Social Studio');
  expect(html).toContain('id="ss-buffer-status"');
  expect(html).toContain('id="ss-generate"');
  expect(html).toContain('id="ss-regenerate-image"');
  expect(html).toContain('id="ss-schedule"');
  expect(html).toContain('Create Today’s Post');
  expect(html).toContain('id="ss-promo-title"');
  expect(html).toContain('id="ss-next-promo"');
  expect(html).toContain('Schedule Post');
  expect(html).toContain('js/admin-social-studio.js');

  const js = await request.get('/js/admin-social-studio.js');
  expect(js.status()).toBe(200);
  const source = await js.text();
  expect(source).toContain("growth-social-staging");
  expect(source).toContain('scheduleInBuffer');
  expect(source).toContain('staging_metricool_metric_snapshots');

  const admin = await request.get('/admin.html');
  expect(await admin.text()).toContain('href="admin-social-studio.html"');

  const growth = await request.get('/admin-growth.html');
  const growthHtml = await growth.text();
  expect(growthHtml).toContain('href="admin-social-studio.html"');
  expect(growthHtml).toContain('data-liw-social-studio-launch="true"');
});


test('Social Studio preloads a promotion instead of requiring an idea', async ({ request }) => {
  const studio = await request.get('/admin-social-studio.html');
  expect(studio.status()).toBe(200);
  const html = await studio.text();
  expect(html).toContain('Today’s promotion');
  expect(html).toContain('Create Today’s Post');
  expect(html).toContain('Show Me Another Promotion');

  const js = await request.get('/js/admin-social-studio.js');
  expect(js.status()).toBe(200);
  const source = await js.text();
  expect(source).toContain('const PROMOTIONS = [');
  expect(source).toContain('applyPromotion(dayOfYear() % PROMOTIONS.length)');
  expect(source).toContain('setSuggestedSchedule');
});


test('Growth Center is simplified for one-person operation', async ({ request }) => {
  const response = await request.get('/admin-growth.html');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('What should I do today?');
  expect(html).toContain('Create Today’s Promotion');
  expect(html).toContain('Email Follow-up');
  expect(html).toContain('Referrals');
  expect(html).toContain('Results');
  expect(html).toContain('More growth tools');
});

test('Social Studio has an automatic branded image fallback', async ({ request }) => {
  const response = await request.get('/js/admin-social-studio.js');
  expect(response.status()).toBe(200);
  const source = await response.text();
  expect(source).toContain('createFallbackImage');
  expect(source).toContain('liw-branded-fallback-v1');
  expect(source).toContain("staging-social-media");
});


test('AI Content Engine preloads today’s content and simplifies publishing', async ({ request }) => {
  const response = await request.get('/admin-ai-content.html');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('Today’s content');
  expect(html).toContain('Create Today’s Article');
  expect(html).toContain('Show Me Another Topic');
  expect(html).toContain('id="ai-publish-simple"');
  expect(html).toContain('Approve & Publish');

  const js = await request.get('/js/admin-ai-content.js');
  expect(js.status()).toBe(200);
  const source = await js.text();
  expect(source).toContain('const CONTENT_TOPICS = [');
  expect(source).toContain('applyTopic(dayOfYear() % CONTENT_TOPICS.length)');
  expect(source).toContain('approveAndPublish');
});
