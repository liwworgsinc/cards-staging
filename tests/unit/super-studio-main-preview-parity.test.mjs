import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime=readFileSync(new URL('../../js/editor-super-studio-main-preview-parity-staging.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../../js/editor-experience-state-guard-staging.js',import.meta.url),'utf8');
const externalPreview=readFileSync(new URL('../../external-preview.html',import.meta.url),'utf8');

test('main editor phone uses the same canonical 390px mobile viewport as External Preview',()=>{
  assert.match(externalPreview,/const mobileWidth=390/);
  assert.match(runtime,/const CANONICAL_MOBILE_WIDTH=390/);
  assert.match(runtime,/shellWidth\/CANONICAL_MOBILE_WIDTH/);
  assert.match(runtime,/target\.style\.width=CANONICAL_MOBILE_WIDTH\+'px'/);
  assert.match(runtime,/target\.style\.height=\(shellHeight\/scale\)\+'px'/);
  assert.match(runtime,/target\.style\.transform=`scale\(\$\{scale\}\)`/);
  assert.match(runtime,/transformOrigin='top left'/);
});

test('main editor phone grants the same media capability needed by the Super Studio video cover',()=>{
  assert.match(externalPreview,/allow="autoplay; clipboard-write; web-share; fullscreen"/);
  assert.match(runtime,/setAttribute\('allow','autoplay; clipboard-write; web-share; fullscreen'\)/);
});

test('main preview parity is isolated to Super Studio editor cards',()=>{
  assert.match(runtime,/\/editor\\\.html\$/);
  assert.match(runtime,/card_experience/);
  assert.match(runtime,/==='super-studio'/);
  assert.match(runtime,/resetFrame\(target\)/);
});

test('editor hydration loader cache-busts and loads the main preview parity runtime',()=>{
  assert.match(loader,/editor-super-studio-main-preview-parity-staging\.js\?v=20261012-main-preview-1/);
  assert.match(loader,/superMainPreviewParity/);
  assert.match(loader,/then\(\(\)=>load\(superMainPreviewParity\)\)/);
});
