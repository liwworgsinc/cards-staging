const { test, expect } = require('@playwright/test');

test.describe('staging external phone preview', () => {
  test.beforeEach(async ({ page }) => {
    // Avoid database/auth dependencies: this test targets preview chrome only.
    await page.route('**/card.html?**', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><button id="action" onclick="this.textContent=\'Tapped\'">Tap</button></body></html>'
    }));
  });

  test('renders the real card route in a phone-width interactive iframe', async ({ page }) => {
    await page.goto('/external-preview.html?slug=preview-test&experience=restaurant&card_id=123');
    const frame = page.locator('#preview-frame');
    await expect(frame).toHaveAttribute('src', /card\.html\?slug=preview-test.*editor_preview=1.*experience=restaurant/);
    const bounds = await frame.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(380);
    expect(bounds.width).toBeLessThanOrEqual(400);
    await page.frameLocator('#preview-frame').locator('#action').click();
    await expect(page.frameLocator('#preview-frame').locator('#action')).toHaveText('Tapped');
    await expect(page.locator('#close-preview')).toHaveAttribute('href', /editor\.html\?id=123/);
    await page.locator('#refresh-preview').click();
    await expect(page.frameLocator('#preview-frame').locator('#action')).toHaveText('Tap');
  });

  test('uses the available width without a device bezel on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/external-preview.html?slug=preview-test');
    const bounds = await page.locator('#preview-frame').boundingBox();
    expect(Math.round(bounds.width)).toBe(390);
    await expect(page.locator('.preview-camera')).toBeHidden();
    await expect(page.locator('#close-preview')).toBeVisible();
    await expect(page.locator('#refresh-preview')).toBeVisible();
  });

  test('dashboard draft Preview and published View use the phone wrapper, but Copy keeps the public link', async ({ page }) => {
    await page.goto('/external-preview.html?slug=preview-test');
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<div id="card-list"></div>');
      window.requireUser = async () => null;
      window.escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
      window.liwUrl = path => new URL(path, location.href).href;
    });
    await page.addScriptTag({ url: '/js/dashboard.js' });
    await page.evaluate(() => renderCards([
      { id: 'draft-1', slug: 'draft-card', full_name: 'Draft Card', status: 'draft', user_id: 'owner' },
      { id: 'live-1', slug: 'live-card', full_name: 'Live Card', status: 'published', user_id: 'owner' }
    ], 'owner'));

    const draft = page.locator('[data-card-id="draft-1"]');
    const live = page.locator('[data-card-id="live-1"]');
    const draftPreview = new URL(await draft.getByRole('link', { name: /Preview Draft Card/ }).getAttribute('href'));
    const livePreview = new URL(await live.getByRole('link', { name: /View Live Card/ }).getAttribute('href'));
    expect(draftPreview.pathname).toBe('/external-preview.html');
    expect(draftPreview.searchParams.get('mode')).toBe('preview');
    expect(draftPreview.searchParams.get('source')).toBe('dashboard');
    expect(livePreview.pathname).toBe('/external-preview.html');
    expect(livePreview.searchParams.get('mode')).toBe('public');
    expect(livePreview.searchParams.get('source')).toBe('dashboard');
    expect(await live.locator('[data-copy]').getAttribute('data-copy')).toContain('card.html?slug=live-card');

    await page.goto(draftPreview.href);
    await expect(page.locator('#close-preview')).toHaveAttribute('href', /dashboard\.html$/);
    await expect(page.locator('#preview-frame')).toHaveAttribute('src', /editor_preview=1/);
    await page.goto(livePreview.href);
    await expect(page.locator('#preview-frame')).not.toHaveAttribute('src', /editor_preview=1/);
  });

  test('offers a return path instead of rendering an empty frame', async ({ page }) => {
    await page.goto('/external-preview.html');
    await expect(page.locator('.preview-error')).toBeVisible();
    await expect(page.locator('.preview-phone')).toBeHidden();
  });
});
