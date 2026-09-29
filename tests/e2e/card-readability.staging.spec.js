const { test, expect } = require('@playwright/test');
const path = require('path');

test('Aa increases readable text, persists preference and reattaches to industry controls', async ({ page }) => {
  await page.goto('/404.html');
  await page.evaluate(() => localStorage.removeItem('liw_cards_reading_size_v1'));
  await page.setContent(`<article id="card" class="public-card">
    <div class="public-top-actions"><button class="public-round-btn" id="share-top">Share</button></div>
    <p class="public-bio" id="bio">Accessible business description</p>
  </article>`);
  await page.addStyleTag({ path: path.join(process.cwd(), 'css/public-card-readability-staging.css') });
  await page.addScriptTag({ path: path.join(process.cwd(), 'js/public-card-readability-staging.js') });
  const card = page.locator('#card');
  const trigger = page.locator('.public-top-actions [data-liw-reading-trigger]');
  await expect(trigger).toHaveCount(1);
  await expect(card).toHaveAttribute('data-liw-reading-size', 'normal');
  await expect(page.locator('#bio')).toHaveCSS('font-size', '16px');
  await trigger.click();
  await page.getByRole('button', { name: /Comfortable/ }).click();
  await expect(card).toHaveAttribute('data-liw-reading-size', 'large');
  await expect(page.locator('#bio')).toHaveCSS('font-size', '18px');
  await page.getByRole('button', { name: /Extra large/ }).click();
  await expect(page.locator('#bio')).toHaveCSS('font-size', '20px');
  expect(await page.evaluate(() => localStorage.getItem('liw_cards_reading_size_v1'))).toBe('extra');
  await page.getByRole('button', { name: 'Close text size options' }).click();

  await page.evaluate(() => {
    document.querySelector('#card').insertAdjacentHTML('beforeend',
      '<div class="realtor-public-top-actions"></div><div class="restaurant-public-top-actions"></div>');
  });
  await expect(page.locator('.realtor-public-top-actions [data-liw-reading-trigger]')).toHaveCount(1);
  await expect(page.locator('.restaurant-public-top-actions [data-liw-reading-trigger]')).toHaveCount(1);
  await page.locator('.restaurant-public-top-actions [data-liw-reading-trigger]').click();
  await page.getByRole('button', { name: /^Normal/ }).click();
  await expect(card).toHaveAttribute('data-liw-reading-size', 'normal');
  await expect(page.locator('#bio')).toHaveCSS('font-size', '16px');
});
