import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../../js/super-studio-layout-v2-staging.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../css/super-studio-completion-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');

test('Super Studio V2 makes services the primary selling section',()=>{
  assert.match(layout,/quick\.insertAdjacentElement\('afterend',section\)/);
  assert.match(layout,/Choose Your Service/);
  assert.match(layout,/Services & booking/);
  assert.match(layout,/ss-service-category-rail/);
  assert.match(layout,/ss-service-card-v2/);
  assert.match(css,/\.ss-service-showcase/);
  assert.match(css,/\.ss-service-card-v2\.is-featured-service/);
});

test('Super Studio V2 closes with a professional conversion footer',()=>{
  assert.match(layout,/ss-conversion-footer/);
  assert.match(layout,/Book an Appointment/);
  assert.match(layout,/data-ss-footer-share/);
  assert.match(layout,/data-ss-footer-save/);
  assert.match(layout,/ss-footer-socials/);
  assert.match(layout,/ss-footer-branding/);
  assert.match(css,/\.ss-conversion-footer/);
  assert.match(css,/\.ss-footer-book/);
  assert.match(css,/safe-area-inset-bottom/);
});

test('V2 layout is loaded in editor preview and public card',()=>{
  assert.match(editorLoader,/super-studio-layout-v2-staging\.js\?v=20261011-3/);
  assert.match(publicLoader,/super-studio-layout-v2-staging\.js\?v=20261011-3/);
  assert.match(publicLoader,/super-studio-completion-staging\.css\?v=20261011-3/);
  assert.match(layout,/super-studio-completion-staging\.css\?v=20261011-3/);
});

test('V2 remains isolated to Super Studio DOM',()=>{
  assert.match(layout,/\.super-studio-experience/);
  assert.doesNotMatch(layout,/\.realtor-experience/);
  assert.doesNotMatch(layout,/\.restaurant-experience/);
  assert.doesNotMatch(layout,/\.showtime-experience/);
  assert.doesNotMatch(layout,/\.barbershop-experience/);
});
