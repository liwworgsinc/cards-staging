const { test, expect } = require('@playwright/test');
const path = require('path');

test('Flow large text keeps Save icon-only and quick-action words intact', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/404.html');
  await page.setContent(`<article class="public-card swipe-card-active" id="card" style="width:340px">
    <div class="public-cover" style="position:relative;height:130px">
      <div class="public-top-actions">
        <button id="save" class="primary-card-cta" aria-label="Save to contacts"><svg aria-hidden="true" width="19" height="19"><circle cx="9" cy="9" r="6"/></svg> Save to contacts</button>
        <button class="public-round-btn" id="share-top">Share</button>
        <button class="public-round-btn" id="qr-top">QR</button>
      </div>
    </div>
    <div class="public-content">
      <div class="swipe-fixed-identity"><h1>Damion Thomas jr</h1><p class="public-title">Staff Analysis</p><p class="public-company">LIW Worgs Inc</p></div>
      <div class="swipe-fixed-actions"><div class="action-grid">
        <button class="action-tile"><svg></svg><span>Call</span></button>
        <button class="action-tile"><svg></svg><span>Text</span></button>
        <button class="action-tile"><svg></svg><span>Email</span></button>
        <button class="action-tile"><svg></svg><span>Website</span></button>
        <button class="action-tile"><svg></svg><span>Directions</span></button>
      </div></div>
      <div class="swipe-nav-shell"><div class="swipe-section-tabs"><button class="swipe-section-tab">About</button><button class="swipe-section-tab">Services</button></div></div>
      <div class="swipe-viewport"><section class="swipe-panel"><p class="public-bio">Readable text must remain scrollable even when the viewport is short.</p></section></div>
    </div>
  </article>`);
  for (const file of ['css/swipe-card.css', 'css/swipe-action-rail.css', 'css/swipe-save-top.css', 'css/flow-actions-refine-staging.css', 'css/public-card-readability-staging.css', 'css/public-card-readability-layout-fix-staging.css']) {
    await page.addStyleTag({ path: path.join(process.cwd(), file) });
  }
  await page.addScriptTag({ path: path.join(process.cwd(), 'js/public-card-readability-staging.js') });
  const save = page.locator('#save');
  const directions = page.getByText('Directions', { exact: true });
  for (const level of ['normal', 'large', 'extra']) {
    await page.evaluate(level => window.LIWCardReadability.choose(level), level);
    await expect(save).toHaveCSS('font-size', '0px');
    await expect(page.locator('.public-top-actions [data-liw-reading-trigger]')).toHaveCount(1);
    await expect(page.locator('#card')).toHaveAttribute('data-liw-reading-size', level);
    expect(await directions.evaluate(el => getComputedStyle(el).wordBreak)).toBe('normal');
    expect(await directions.evaluate(el => el.parentElement.getBoundingClientRect().width)).toBeGreaterThanOrEqual(94);
    expect(await directions.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(86);
    expect(await save.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
  await expect(page.locator('.public-bio')).toHaveCSS('font-size','20px');
  expect(await page.locator('.swipe-viewport').evaluate(el=>getComputedStyle(el).minHeight)).toBe('0px');
});
