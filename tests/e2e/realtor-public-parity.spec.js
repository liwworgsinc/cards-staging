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
  expect(scripts[0]).toContain('20260918-sticky-public-1');
});


test('external Realtor hero stays pinned while card content scrolls underneath', async ({ page }) => {
  await page.goto('/card.html?slug=kevin-z3zu', { waitUntil: 'domcontentloaded' });

  const shell = page.locator('#realtor-public-shell');
  const hero = page.locator('.realtor-public-hero');
  await expect(shell).toBeVisible({ timeout: 25_000 });
  await expect(hero).toBeVisible();

  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(pageHeight).toBeGreaterThan(900);

  await page.evaluate(() => window.scrollTo(0, Math.min(700, document.documentElement.scrollHeight - innerHeight)));
  await page.waitForTimeout(250);

  const stickyState = await hero.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      top: rect.top,
      position: style.position,
      fixedFallback: el.classList.contains('realtor-force-fixed')
    };
  });

  expect(Math.abs(stickyState.top)).toBeLessThanOrEqual(3);
  expect(['sticky','fixed','-webkit-sticky']).toContain(stickyState.position);
});
