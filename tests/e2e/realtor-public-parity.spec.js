const { test, expect } = require('@playwright/test');

test('published Realtor card owns the external public renderer for logged-out visitors', async ({ page }) => {
  test.setTimeout(45_000);

  await page.goto('/card.html?slug=kevin-z3zu', { waitUntil: 'domcontentloaded' });

  const card = page.locator('#card');
  const shell = page.locator('#realtor-public-shell');

  await expect(shell).toBeVisible({ timeout: 25_000 });
  await expect(card).toHaveClass(/realtor-public-active/);

  await expect(shell.getByText('KW Associates', { exact: false }).first()).toBeVisible();
  await expect(shell.locator('.realtor-public-brand img')).toBeVisible();
  await expect(shell.getByText('Featured Listing', { exact: true })).toBeVisible();
  await expect(shell.getByText('9424 Farragut Road, 1st floor', { exact: true })).toBeVisible();

  const baseContentDisplay = await page.locator('#card > .public-content').evaluate(el => getComputedStyle(el).display);
  expect(baseContentDisplay).toBe('none');
});

test('shared staging loader cannot inject a second public Realtor runtime', async ({ page }) => {
  await page.goto('/card.html?slug=kevin-z3zu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#realtor-public-shell')).toBeVisible({ timeout: 25_000 });

  const scripts = await page.locator('script[src*="realtor-public-v1.js"]').evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('src'))
  );

  expect(scripts).toHaveLength(1);
  expect(scripts[0]).toContain('20260918-public-parity-3');
});
