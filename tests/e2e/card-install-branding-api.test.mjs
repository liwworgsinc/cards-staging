import test from 'node:test';
import assert from 'node:assert/strict';

const edge = 'https://nfwqcilqmqruysovjuyj.supabase.co/functions/v1';
const origin = 'https://liwworgsinc.github.io';

async function getManifest(slug) {
  const app = origin + '/cards-staging/card.html?slug=' + encodeURIComponent(slug);
  const url = edge + '/card-manifest-staging?slug=' + encodeURIComponent(slug) + '&app_url=' + encodeURIComponent(app);
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.start_url.startsWith(app), true);
  assert.equal(body.id, app);
  return body;
}

async function assertPng(url, size, expectedSource) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(response.status, 200, new TextDecoder().decode(bytes.slice(0, 300)));
  assert.match(response.headers.get('content-type') || '', /image\/png/);
  assert.equal(response.headers.get('x-liw-icon-source'), expectedSource);
  assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(16), size);
  assert.equal(view.getUint32(20), size);
}

test('paid Yard Saga uses its published profile photo at 192px and 512px', { timeout: 210000 }, async () => {
  const manifest = await getManifest('desmond-mitchell');
  assert.equal(manifest.liw_icon_source, 'profile');
  assert.equal(manifest.icons.length, 2);
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(x => x.sizes === size + 'x' + size);
    assert.ok(icon, 'Missing icon size ' + size);
    assert.match(icon.src, /card-icon-staging/);
    await assertPng(icon.src, size, 'profile');
  }
});

test('Free card retains LIW icon even if it has a profile photo', { timeout: 70000 }, async () => {
  const manifest = await getManifest('cluelislol');
  assert.equal(manifest.liw_icon_source, 'liw');
  assert.ok(manifest.icons.some(x => x.sizes === '192x192' && x.src.includes('/assets/icons/icon-192')));
  assert.ok(manifest.icons.some(x => x.sizes === '512x512' && x.src.includes('/assets/icons/icon-512')));
  assert.equal(manifest.icons.some(x => x.src.includes('card-icon-staging')), false);
});

test('Free icon is forbidden and staging-only manifest rejects production URL', { timeout: 70000 }, async () => {
  const free = await fetch(edge + '/card-icon-staging?slug=cluelislol&size=192',
    { signal: AbortSignal.timeout(45000) });
  assert.equal(free.status, 403);
  const app = 'https://cards.liwworgs.com/card.html?slug=desmond-mitchell';
  const live = await fetch(edge + '/card-manifest-staging?slug=desmond-mitchell&app_url=' + encodeURIComponent(app),
    { signal: AbortSignal.timeout(45000) });
  assert.equal(live.status, 403);
});
