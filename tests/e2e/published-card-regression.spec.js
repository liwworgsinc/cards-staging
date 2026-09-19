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


function fakeJwt(sub = '3147d8be-3aec-4f50-afd5-f7c89b135cbb') {
  const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc({ sub, role: 'authenticated', aud: 'authenticated', exp: 4102444800 })}.signature`;
}

async function installSignedInPreviewMocks(page, { slug, status, experience = 'classic', colorMode = 'light' }) {
  const userId = '3147d8be-3aec-4f50-afd5-f7c89b135cbb';
  const token = fakeJwt(userId);
  const session = {
    access_token: token,
    refresh_token: 'fake-refresh',
    expires_in: 3600,
    expires_at: 4102444800,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'preview-test@liw.local',
      app_metadata: {},
      user_metadata: {}
    }
  };

  await page.addInitScript(({ session }) => {
    localStorage.setItem('sb-nfwqcilqmqruysovjuyj-auth-token', JSON.stringify(session));
  }, { session });

  await page.route('https://nfwqcilqmqruysovjuyj.supabase.co/auth/v1/user', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user)
    });
  });

  await page.route('https://nfwqcilqmqruysovjuyj.supabase.co/rest/v1/rpc/public_card_by_slug', async route => {
    const auth = route.request().headers()['authorization'] || '';
    expect(auth).toContain(token);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: slug === 'jacky-brown' ? '677ff9f8-1806-41ce-bf56-46c6183094eb' : '5488b232-1fa6-4150-8ff9-cf6aeb7dccfd',
        slug,
        status,
        full_name: slug === 'jacky-brown' ? 'Jacky Brown' : 'Latoya White',
        job_title: slug === 'jacky-brown' ? 'Founder' : 'Realtor',
        company_name: slug === 'jacky-brown' ? 'JB Studio' : 'Rapid Realty',
        biography: 'Preview regression card',
        primary_color: '#123f8c',
        secondary_color: '#c82d32',
        background_color: '#ffffff',
        text_color: '#111827',
        button_color: '#123f8c',
        button_text_color: '#ffffff',
        card_layout: 'classic',
        card_experience: experience,
        color_mode: colorMode,
        show_branding: true,
        branding_mode: 'liw',
        services_enabled: false,
        products_enabled: false,
        booking_enabled: false,
        lead_form_enabled: false,
        gallery_enabled: false,
        testimonials_enabled: false,
        hours_enabled: false,
        music_enabled: false
      })
    });
  });

  await page.route('https://nfwqcilqmqruysovjuyj.supabase.co/rest/v1/rpc/public_card_feature_access', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );

  for (const table of ['social_links', 'card_services', 'card_products', 'card_downloads']) {
    await page.route(`https://nfwqcilqmqruysovjuyj.supabase.co/rest/v1/${table}**`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    );
  }
}

test('signed-in editor can preview Jacky Brown while Draft', async ({ page }) => {
  await installSignedInPreviewMocks(page, {
    slug: 'jacky-brown',
    status: 'draft',
    experience: 'classic',
    colorMode: 'barbershop'
  });

  const response = await page.goto('/card.html?slug=jacky-brown&editor_preview=1', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('#card')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#preview-banner')).toBeVisible();
  await expect(page.locator('#name')).toHaveText('Jacky Brown');
});

test('signed-in editor can preview Latoya Rapid while Published', async ({ page }) => {
  await installSignedInPreviewMocks(page, {
    slug: 'latoya-rapid',
    status: 'published',
    experience: 'realtor',
    colorMode: 'light'
  });

  const response = await page.goto('/card.html?slug=latoya-rapid&editor_preview=1', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.locator('#card')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#name')).toHaveText('Latoya White');
});
