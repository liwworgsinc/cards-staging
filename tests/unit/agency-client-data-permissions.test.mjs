import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard=fs.readFileSync('js/agency-owner-data-guard-staging.js','utf8');
const hostingUi=fs.readFileSync('js/agency-hosting-ui-v2.js','utf8');
const hostingFile=fs.readFileSync('js/agency-hosting-file-v2.js','utf8');
const sql=fs.readFileSync('sql/agency-client-data-permissions.sql','utf8');

test('agency admin can manage and import client info but cannot export',()=>{
  assert.match(sql,/wm\.role = 'agency_admin'/);
  assert.match(sql,/can_import_agency_clients/);
  assert.match(sql,/can_export_agency_clients/);
  assert.match(sql,/when \(select auth\.uid\(\)\) = p_owner then true/);
  assert.match(sql,/when public\.is_admin\(\) then true/);
  assert.match(sql,/else false/);
});

test('staging guard separates client info import and export permissions',()=>{
  assert.match(guard,/canManageClientInfo/);
  assert.match(guard,/canImport/);
  assert.match(guard,/canExport/);
  assert.match(guard,/Agency Admin client intake/);
  assert.match(guard,/Client export and connected card downloads are Owner\/Admin only/);
  assert.match(guard,/Client information is restricted to the Owner\/Admin and Agency Admin/);
  assert.match(guard,/agency-client-form/);
});

test('connected hosting file requires backend export permission',()=>{
  assert.match(hostingUi,/can_export_agency_clients/);
  assert.match(hostingFile,/can_export_agency_clients/);
  assert.match(hostingFile,/Connected client-card downloads are Owner\/Admin only/);
});
