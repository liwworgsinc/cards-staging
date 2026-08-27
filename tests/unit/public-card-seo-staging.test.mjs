import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const seoLayer = readFileSync(new URL('../../js/public-card-load-guard-staging.js', import.meta.url), 'utf8');
const cardHtml = readFileSync(new URL('../../card.html', import.meta.url), 'utf8');
const robots = readFileSync(new URL('../../robots.txt', import.meta.url), 'utf8');

test('staging remains globally blocked from search indexing', () => {
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Disallow:\s*\//);
});

test('published cards receive indexable robots metadata for production promotion', () => {
  assert.match(seoLayer, /index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1/);
  assert.match(seoLayer, /published-indexable/);
});

test('draft preview and unavailable cards are noindex', () => {
  assert.match(seoLayer, /noindex,nofollow,noarchive,noimageindex/);
  assert.match(seoLayer, /private-noindex/);
  assert.match(seoLayer, /unavailable-noindex/);
});

test('public cards receive canonical and social metadata', () => {
  assert.match(seoLayer, /https:\/\/cards\.liwworgs\.com\/card\.html/);
  assert.match(seoLayer, /link\[rel="canonical"\]/);
  assert.match(seoLayer, /og:title/);
  assert.match(seoLayer, /og:description/);
  assert.match(seoLayer, /og:url/);
  assert.match(seoLayer, /og:image/);
  assert.match(seoLayer, /twitter:card/);
  assert.match(seoLayer, /twitter:title/);
  assert.match(seoLayer, /twitter:description/);
  assert.match(seoLayer, /twitter:image/);
});

test('public cards receive Person and business structured data', () => {
  assert.match(seoLayer, /application\/ld\+json/);
  assert.match(seoLayer, /'@type':'Person'/);
  assert.match(seoLayer, /'LocalBusiness':'Organization'/);
  assert.match(seoLayer, /worksFor/);
});

test('custom SEO remains entitlement gated while automatic SEO is always available', () => {
  assert.match(seoLayer, /featureAccess\.custom_seo===true/);
  assert.match(seoLayer, /buildAutomaticTitle/);
  assert.match(seoLayer, /buildAutomaticDescription/);
  assert.match(seoLayer, /cardData\.seo_title/);
  assert.match(seoLayer, /cardData\.seo_description/);
});

test('the staging card page still loads the staging guard after the public renderer', () => {
  const rendererIndex = cardHtml.indexOf('public-card.js');
  const seoIndex = cardHtml.indexOf('public-card-load-guard-staging.js');
  assert.ok(rendererIndex >= 0, 'public renderer is missing');
  assert.ok(seoIndex > rendererIndex, 'SEO/load guard must run after the public renderer');
});
