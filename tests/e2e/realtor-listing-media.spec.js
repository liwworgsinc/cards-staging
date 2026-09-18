const { test, expect } = require('@playwright/test');
const fs = require('node:fs');

test('Realtor listing editor guides photos and caps the gallery', async () => {
  const editor = fs.readFileSync('js/realtor-editor-v1.js','utf8');

  expect(editor).toContain("const GALLERY_SLOTS=[");
  expect(editor).toContain("Kitchen");
  expect(editor).toContain("Bathroom");
  expect(editor).toContain("Primary Bedroom");
  expect(editor).toContain("Living Room");
  expect(editor).toContain("Exterior / Backyard");
  expect(editor).toContain("Other Highlight");
  expect(editor).toContain("1 main photo + up to 6 room/property photos");
  expect(editor).toContain("data-gallery-photo");
  expect(editor).toContain("data-gallery-remove");
  expect(editor).toContain("gallery_urls:gallerySlots(l)");
});

test('Realtor supports Under Contract everywhere it matters', async () => {
  const editor = fs.readFileSync('js/realtor-editor-v1.js','utf8');
  const pub = fs.readFileSync('js/realtor-public-v1.js','utf8');

  expect(editor).toContain("under_contract:'Under Contract'");
  expect(editor).toContain('<option value="under_contract">Under Contract</option>');
  expect(editor).toContain('status-under_contract');
  expect(pub).toContain("under_contract:'Under Contract'");
  expect(pub).toContain('realtor-status-badge.status-under_contract');
  expect(pub).toContain("status-${esc(l.status||'for_sale')}");
});
