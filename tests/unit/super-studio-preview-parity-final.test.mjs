import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../../css/super-studio-preview-parity-final-staging.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../../js/super-studio-preview-parity-final-staging.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js',import.meta.url),'utf8');
const editorLoader=readFileSync(new URL('../../js/editor-experience-state-guard-staging.js',import.meta.url),'utf8');

test('public Open Card uses phone-scale Super Studio proportions',()=>{
  assert.match(css,/--ss-hero-full:300px!important/);
  assert.match(css,/width:82px!important/);
  assert.match(css,/max-width:430px!important/);
  assert.match(css,/\.ss-service-showcase \.ss-services\{\s*grid-template-columns:1fr!important/);
  assert.match(css,/\.ss-app-nav\{[\s\S]*width:min\(100vw,430px\)!important/);
  assert.doesNotMatch(css,/760px/);
});

test('selected card color owns the full Super Studio visual system',()=>{
  assert.match(js,/root\.style\.setProperty\('--ss-accent',primary\)/);
  assert.match(js,/root\.style\.setProperty\('--ss-theme',primary\)/);
  assert.match(js,/dataset\.ssThemeSynced='true'/);
  assert.match(css,/--ss-theme:var\(--ss-primary\)/);
  assert.match(css,/\.ss-primary-book[\s\S]*var\(--ss-theme\)/);
  assert.match(css,/\.ss-service-showcase[\s\S]*var\(--ss-theme-deep\)/);
  assert.match(css,/\.ss-app-nav \.ss-app-nav-book[\s\S]*var\(--ss-theme\)/);
  assert.match(css,/\.ss-quick[\s\S]*var\(--ss-theme-border\)/);
});

test('profession-aware icons cover every Super Studio role family and service chrome',()=>{
  for(const label of ['barber','hair stylist','braider','loctician','nail technician','makeup artist','lash technician','brow artist','esthetician','tattoo artist','piercer','massage therapist','salon','spa']){
    assert.match(js,new RegExp(`['\"]${label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}['\"]\\s*:`),label);
  }
  assert.match(js,/['\"]other['\"]\s*:\s*['\"]sparkles['\"]/);
  assert.match(js,/dataset\.ssProfessionIcon/);
  assert.match(js,/\.ss-service-mark i/);
  assert.match(js,/\[data-ss-app-screen="services"\]/);
  assert.match(js,/\[data-ss-nav="services"\]/);
  assert.match(js,/data-lucide/);
});

test('Other profession exposes a persisted custom role with a universal sparkle icon',()=>{
  assert.match(js,/data-ss-path="customProfession"/);
  assert.match(js,/What do you do\?/);
  assert.match(js,/ALL CAPS/);
  assert.match(js,/custom\.toUpperCase\(\)/);
  assert.match(js,/super_studio_state_staging/);
  assert.match(js,/customProfession:cleanCustomProfession/);
  assert.match(js,/\|\|'sparkles'/);
});

test('video parity layer retries muted inline autoplay without changing saved source',()=>{
  assert.match(js,/video\.muted=true/);
  assert.match(js,/video\.defaultMuted=true/);
  assert.match(js,/video\.playsInline=true/);
  assert.match(js,/video\.play\(\)/);
  assert.doesNotMatch(js,/setAttribute\(['\"]src['\"]/);
});

test('final parity assets load after hotfixes and in editor preview',()=>{
  const hotfixIndex=loader.indexOf('super-studio-public-shell-final-staging.css');
  const parityIndex=loader.indexOf('loadFinalParity();');
  assert.ok(hotfixIndex>=0);
  assert.ok(parityIndex>hotfixIndex);
  assert.match(loader,/super-studio-preview-parity-final-staging\.css\?v=20261012-2/);
  assert.match(loader,/super-studio-preview-parity-final-staging\.js\?v=20261019-custom-profession-1/);
  assert.match(editorLoader,/super-studio-preview-parity-final-staging\.js\?v=20261019-custom-profession-1/);
});
