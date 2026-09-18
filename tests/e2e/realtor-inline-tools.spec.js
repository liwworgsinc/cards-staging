const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('Realtor tools stay inside Design and do not create a top-level editor tab', async () => {
  const realtor = fs.readFileSync('js/realtor-editor-v1.js','utf8');

  expect(realtor).toContain("experience.insertAdjacentElement('afterend',panel)");
  expect(realtor).toContain("panel.className='realtor-control-center'");
  expect(realtor).toContain("q('.realtor-editor-tab')?.remove()");
  expect(realtor).not.toContain("tab.innerHTML='<span class=\"editor-step-number\">R</span>");
  expect(realtor).not.toContain("panel.dataset.panel='realtor'");
});

test('selecting Realtor opens Design and the inline Realtor control center', async () => {
  const realtor = fs.readFileSync('js/realtor-editor-v1.js','utf8');

  expect(realtor).toContain("const designTab=q('.editor-tab[data-tab=\"design\"]')");
  expect(realtor).toContain("q('.realtor-control-center')?.classList.add('is-visible')");
  expect(realtor).toContain("q('.realtor-control-center')?.scrollIntoView");
});
