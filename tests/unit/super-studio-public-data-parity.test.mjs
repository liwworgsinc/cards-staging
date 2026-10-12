import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const bridge=readFileSync(new URL('../../js/super-studio-public-data-parity-staging.js',import.meta.url),'utf8');
const loader=readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../../supabase/staging/public-super-studio-payload.sql',import.meta.url),'utf8');

test('Super Studio uses one server payload for draft and published support data',()=>{
  assert.match(bridge,/public_super_studio_payload_staging/);
  assert.match(bridge,/super_studio_state_staging/);
  assert.match(bridge,/card_services/);
  assert.match(bridge,/social_links/);
  assert.match(bridge,/card_products/);
  assert.match(bridge,/__LIW_SUPER_STUDIO_PUBLIC_PAYLOAD__/);
});

test('parity bridge replaces only Super Studio support-table reads',()=>{
  assert.match(bridge,/const TABLES=new Set\(\['super_studio_state_staging','card_services','social_links','card_products'\]\)/);
  assert.match(bridge,/if\(property==='from'\)/);
  assert.match(bridge,/TABLES\.has/);
  assert.match(bridge,/target\.from\.call\(target,table\)/);
});

test('loader mounts public data parity before the Super Studio public renderer',()=>{
  assert.match(loader,/super-studio-public-data-parity-staging\.js\?v=20261012-data-parity-1/);
  assert.match(loader,/script\.addEventListener\('load',loadPublic/);
  assert.match(loader,/if\(window\.LIWSuperStudio\)\{loadDataParity\(\);return;\}/);
  assert.match(loader,/config\.onload=loadDataParity/);
  assert.match(loader,/super-studio-public-staging\.js\?v=20261012-data-parity-1/);
});

test('server payload allows published public reads and authenticated draft preview without leaking private drafts',()=>{
  assert.match(migration,/v_status = 'published' and public\.card_is_within_current_limit\(p_card_id\)/);
  assert.match(migration,/v_owner = \(select auth\.uid\(\)\)/);
  assert.match(migration,/public\.has_workspace_access\(v_owner, false\)/);
  assert.match(migration,/public\.is_admin\(\)/);
  assert.match(migration,/public\.designer_has_card_access\(p_card_id, false\)/);
  assert.match(migration,/if not v_allowed then\s+return null;/);
  assert.match(migration,/grant execute on function public\.public_super_studio_payload_staging\(uuid\) to anon, authenticated/);
});
