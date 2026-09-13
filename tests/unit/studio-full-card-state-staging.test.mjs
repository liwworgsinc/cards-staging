import fs from 'node:fs';
import assert from 'node:assert/strict';

const publicAdapter=fs.readFileSync('js/public-barbershop-staging.js','utf8');
const persistence=fs.readFileSync('js/editor-studio-type-persistence-staging.js','utf8');
const cardHtml=fs.readFileSync('card.html','utf8');

assert.match(publicAdapter,/get\('embed'\)===?'1'|get\('embed'\)===\"1\"/,'Studio adapter must stay out of homepage embed mode');
assert.ok(!publicAdapter.includes('new MutationObserver'),'Studio public adapter must remain event-driven');
assert.match(publicAdapter,/public_studio_business_type/,'Studio public adapter must resolve the saved business type');
assert.match(publicAdapter,/typeof supabaseClient!==['"]undefined['"]/,'Studio public adapter must support the normal Supabase global binding');
assert.match(publicAdapter,/liw:barber-client-ready/,'Studio public adapter must adapt after the proven Barbershop client room mounts');
assert.match(publicAdapter,/LIWBarberClientRoom/,'Studio public adapter must wrap the existing client-room API instead of replacing it');

assert.ok(!persistence.includes('queueMicrotask'),'Studio persistence must not use an unbounded microtask retry loop');
assert.match(persistence,/MAX_RETRIES=8/,'Studio persistence retries must stay bounded');
assert.match(persistence,/set_studio_business_type/,'Studio persistence must write the selected industry through the secure RPC');
assert.match(persistence,/waitForReady\(timeoutMs=1600\)/,'Preview persistence must have a bounded readiness wait');

const directAdapter=cardHtml.indexOf('public-barbershop-staging.js?v=20260913-studio-full-card-1');
const legacyLoader=cardHtml.indexOf('public-card-liw-loader-staging.js?v=20260913-home-embed-isolation-1');
assert.ok(directAdapter>=0,'Full card must load the fresh Studio adapter directly');
assert.ok(legacyLoader>=0,'Existing LIW loader must remain wired');
assert.ok(directAdapter<legacyLoader,'Fresh Studio adapter must load before the legacy Barbershop bootstrap can inject a cached copy');

console.log('Studio full-card state regression checks passed.');
