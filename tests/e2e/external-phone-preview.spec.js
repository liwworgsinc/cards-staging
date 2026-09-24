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

  test('offers a return path instead of rendering an empty frame', async ({ page }) => {
    await page.goto('/external-preview.html');
    await expect(page.locator('.preview-error')).toBeVisible();
    await expect(page.locator('.preview-phone')).toBeHidden();
  });
});
