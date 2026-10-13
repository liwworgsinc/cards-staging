import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime=readFileSync(new URL('../../js/editor-super-studio-main-preview-parity-safe-staging.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../../js/editor-experience-state-guard-staging.js',import.meta.url),'utf8');
const externalPreview=readFileSync(new URL('../../external-preview.html',import.meta.url),'utf8');

test('main editor phone uses the same canonical mobile viewport dimensions as External Preview',()=>{
  assert.match(externalPreview,/const mobileWidth=390/);
  assert.match(runtime,/const WIDTH=390/);
  assert.match(runtime,/const HEIGHT=800/);
  assert.match(runtime,/shellWidth\/WIDTH/);
  assert.match(runtime,/setStyle\(target,'width',WIDTH\+'px'\)/);
  assert.match(runtime,/setStyle\(target,'height',HEIGHT\+'px'\)/);
  assert.match(runtime,/const height=\(HEIGHT\*scale\+borderY\)\+'px'/);
  assert.match(runtime,/shell\.style\.height!==height/);
  assert.match(runtime,/setStyle\(target,'transform',`scale\(\$\{scale\}\)`\)/);
  assert.match(runtime,/setStyle\(target,'transform-origin','top left'\)/);
});

test('main editor phone grants the same media capability needed by the Super Studio video cover',()=>{
  assert.match(externalPreview,/allow="autoplay; clipboard-write; web-share; fullscreen"/);
  assert.match(runtime,/setAttribute\('allow','autoplay; clipboard-write; web-share; fullscreen'\)/);
});

test('editor phone removes preview-only readability chrome from the Super Studio frame',()=>{
  assert.match(runtime,/liw-reading-floating/);
  assert.match(runtime,/#liw-reading-dialog/);
  assert.match(runtime,/cleanPreviewChrome\(target\)/);
});

test('main preview parity is isolated to Super Studio editor cards',()=>{
  assert.match(runtime,/\/editor\\\.html\$/);
  assert.match(runtime,/card_experience/);
  assert.match(runtime,/==='super-studio'/);
  assert.match(runtime,/resetPreview\(shell,target\)/);
});

test('main preview observer only reacts when preview nodes are added',()=>{
  assert.match(runtime,/addedNodes/);
  assert.match(runtime,/#phone-preview,\.liw-public-card-frame/);
  assert.match(runtime,/if\(relevant\)wirePreview\(\)/);
});

test('editor hydration loader cache-busts and loads the safe main preview runtime',()=>{
  assert.match(loader,/editor-super-studio-main-preview-parity-safe-staging\.js\?v=20261012-freeze-guard-1/);
  assert.match(loader,/superMainPreviewParity/);
  assert.match(loader,/then\(\(\)=>load\(superMainPreviewParity\)\)/);
});
