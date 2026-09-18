const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('Realtor Experience is gated to Plus and Pro in the editor', async () => {
  const src = fs.readFileSync('js/realtor-editor-v1.js','utf8');

  expect(src).toContain("access?.has?.('realtor_experience')");
  expect(src).toContain("['plus','pro','agency','white_label'].includes(currentPlanKey())");
  expect(src).toContain("Realtor Experience is included with Plus and Pro");
  expect(src).toContain("realtorButton?.classList.toggle('locked',!unlocked)");
  expect(src).toContain("if(!canUseRealtor()){syncUi();showRealtorUpgrade();return;}");
  expect(src).toContain("if(!isRealtor()||!canUseRealtor()||!hydrationSafe())return;");
});

test('Pricing communicates Realtor access consistently', async () => {
  const pricing = fs.readFileSync('pricing.html','utf8');

  expect(pricing).toContain('Realtor Experience preview');
  expect(pricing).toContain('Unlock the full Realtor Experience with Plus');
  expect(pricing).toContain('Classic, Showtime + Realtor card experiences');
  expect(pricing).toContain('Realtor Experience included');
  expect(pricing).toContain('Flow, Showtime and Realtor card experiences');
});
