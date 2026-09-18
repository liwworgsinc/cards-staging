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
  expect(scripts[0]).toContain('20260918-identity-tools-2');
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


test('external Realtor hero stays pinned on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/card.html?slug=kevin-z3zu', { waitUntil: 'domcontentloaded' });

  const shell = page.locator('#realtor-public-shell');
  const hero = page.locator('.realtor-public-hero');
  await expect(shell).toBeVisible({ timeout: 25_000 });
  await expect(hero).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, Math.min(620, document.documentElement.scrollHeight - innerHeight)));
  await page.waitForTimeout(250);

  const stickyState = await hero.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      position: getComputedStyle(el).position,
      fixedFallback: el.classList.contains('realtor-force-fixed')
    };
  });

  expect(Math.abs(stickyState.top)).toBeLessThanOrEqual(3);
  expect(['sticky','fixed','-webkit-sticky']).toContain(stickyState.position);
});


test('Realtor identity handles long names without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/card.html?slug=kevin-z3zu', { waitUntil: 'domcontentloaded' });

  const shell = page.locator('#realtor-public-shell');
  const name = shell.locator('.realtor-public-agent h1');
  await expect(shell).toBeVisible({ timeout: 25_000 });
  await expect(name).toBeVisible();

  await name.evaluate(el => {
    el.textContent = 'Alexandria Montgomery-Sutherland Whitmore';
  });

  const layout = await shell.evaluate(el => {
    const nameEl = el.querySelector('.realtor-public-agent h1');
    const hero = el.querySelector('.realtor-public-hero');
    return {
      shellOverflow: el.scrollWidth - el.clientWidth,
      nameOverflow: nameEl.scrollWidth - nameEl.clientWidth,
      heroHeight: hero.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(nameEl).lineHeight),
      nameHeight: nameEl.getBoundingClientRect().height
    };
  });

  expect(layout.shellOverflow).toBeLessThanOrEqual(1);
  expect(layout.nameOverflow).toBeLessThanOrEqual(1);
  expect(layout.heroHeight).toBeLessThanOrEqual(285);
  expect(layout.nameHeight).toBeLessThanOrEqual(layout.lineHeight * 2.2);
});


test('Realtor compacts normal card extras into the utility strip', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/card.html?slug=kevin-z3zu', { waitUntil: 'domcontentloaded' });

  const shell = page.locator('#realtor-public-shell');
  await expect(shell).toBeVisible({ timeout: 25_000 });

  await expect(shell.getByRole('button', { name: 'Business hours' })).toBeVisible();
  await expect(shell.getByRole('button', { name: 'Location' })).toBeVisible();
  await expect(shell.getByRole('button', { name: 'Social profiles' })).toBeVisible();

  await shell.getByRole('button', { name: 'Business hours' }).click();
  await expect(page.getByRole('heading', { name: 'Business Hours' })).toBeVisible();
  await page.locator('[data-close-realtor-info]').click();

  await shell.getByRole('button', { name: 'Social profiles' }).click();
  await expect(page.getByRole('heading', { name: 'Connect' })).toBeVisible();
  await expect(page.getByText('Instagram', { exact: true })).toBeVisible();
});

test('public card never leaks a literal backslash-n marker', async ({ page }) => {
  await page.goto('/card.html?slug=kevin-z3zu', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#realtor-public-shell')).toBeVisible({ timeout: 25_000 });
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.trim().endsWith('\\n')).toBe(false);
});
