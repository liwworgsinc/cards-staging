const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('saved Realtor experience wins over template layout on editor return', async ({ page }) => {
  await page.goto('/');
  await page.setContent(`
    <input name="card_experience" value="realtor">
    <input name="card_layout" value="bold">
    <div id="phone-preview"><div class="preview-card-scroll"></div></div>
  `);

  await page.addScriptTag({ url: '/js/editor-swipe-layout.js?v=20260918-experience-hydrate-1' });

  const value = await page.evaluate(() => window.LIWFlowExperience?.currentValue?.());
  expect(value).toBe('realtor');
});

test('saved Studio experience also remains independent of template layout', async ({ page }) => {
  await page.goto('/');
  await page.setContent(`
    <input name="card_experience" value="studio">
    <input name="card_layout" value="swipe">
    <div id="phone-preview"><div class="preview-card-scroll"></div></div>
  `);

  await page.addScriptTag({ url: '/js/editor-swipe-layout.js?v=20260918-experience-hydrate-1' });

  const value = await page.evaluate(() => window.LIWFlowExperience?.currentValue?.());
  expect(value).toBe('studio');
});

test('existing-card hydration explicitly resyncs experience runtimes without input autosave', async () => {
  const editor = fs.readFileSync('js/editor.js', 'utf8');
  expect(editor).toContain("new CustomEvent('liw:editor-card-hydrated'");
  expect(editor).toContain('window.LIWFlowExperience?.refresh?.()');
  expect(editor).toContain('window.LIWRealtorV1?.refresh?.()');
});
