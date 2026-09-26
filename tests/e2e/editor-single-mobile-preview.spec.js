const { test, expect } = require('@playwright/test');

for (const width of [390, 820]) {
  test('editor shows one preview action at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.setContent(
      '<body class="editor-page">' +
        '<button id="preview-link" type="button">Preview</button>' +
        '<main class="editor-shell"><section class="editor-workspace">' +
          '<button id="editor-step-next" type="button">Continue</button>' +
          '<input name="slug" value="sample-card">' +
        '</section></main>' +
        '<aside class="phone-stage" data-liw-viewport-mode="mobile">' +
          '<div class="phone-label">Live card preview</div><div class="phone"></div>' +
          '<button id="mobile-preview-button" type="button">Open full preview</button>' +
        '</aside>' +
      '</body>'
    );
    await page.addStyleTag({ url: '/css/editor-preview-sticky-staging.css' });
    await page.addScriptTag({ url: '/js/editor-mobile-public-preview-launcher-staging.js?v=20260926-single-mobile-preview-1' });

    await expect(page.locator('#liw-mobile-public-preview-launcher')).toBeVisible();
    await expect(page.locator('.phone-stage')).toBeHidden();
    await expect(page.locator('#mobile-preview-button')).toBeHidden();
    await expect(page.locator('#preview-link')).toBeHidden();
    await expect(page.locator('#editor-step-next')).toBeVisible();

    const visiblePreviewCount = await page.locator(
      '#preview-link, #mobile-preview-button, #liw-mobile-public-preview-launcher'
    ).evaluateAll(buttons => buttons.filter(button =>
      getComputedStyle(button).display !== 'none' && button.getClientRects().length > 0
    ).length);
    expect(visiblePreviewCount).toBe(1);
  });
}
