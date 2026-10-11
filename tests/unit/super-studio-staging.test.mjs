import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const config = readFileSync(new URL('../../js/super-studio-config-staging.js', import.meta.url), 'utf8');
const editor = readFileSync(new URL('../../js/super-studio-editor-staging.js', import.meta.url), 'utf8');
const editorEnhancements = readFileSync(new URL('../../js/super-studio-editor-enhancements-staging.js', import.meta.url), 'utf8');
const publicJs = readFileSync(new URL('../../js/super-studio-public-staging.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../css/super-studio-staging.css', import.meta.url), 'utf8');
const editorLoader = readFileSync(new URL('../../js/editor-experience-state-guard-staging.js', import.meta.url), 'utf8');
const publicLoader = readFileSync(new URL('../../js/public-booking-mode-v2-loader-staging.js', import.meta.url), 'utf8');
const sql = readFileSync(new URL('../../supabase/staging/super-studio-state.sql', import.meta.url), 'utf8');

function loadConfig(){
  const context={window:{},console,Intl,Date,Math,JSON,encodeURIComponent};
  context.window.window=context.window;
  vm.runInNewContext(config,context,{filename:'super-studio-config-staging.js'});
  return context.window.LIWSuperStudio;
}

test('Super Studio has an independent experience id and complete profession registry',()=>{
  const SS=loadConfig();
  assert.equal(SS.id,'super-studio');
  for(const key of ['barber','hair-stylist','braider','loctician','nail-tech','makeup-artist','lash-tech','brow-artist','esthetician','tattoo-artist','piercer','massage-therapist','salon','spa','other']) assert.ok(SS.PROFESSIONS[key],key);
  const nail=SS.normalize({studioProfession:'nail-tech',about:{specialties:'Editorial nail art'}});
  assert.equal(nail.studioProfession,'nail-tech');
  assert.equal(nail.about.specialties,'Editorial nail art');
  assert.ok(SS.starterServices('nail-tech').includes('Nail Art'));
});

test('shared renderer produces a studio experience without fake services',()=>{
  const SS=loadConfig();
  const state=SS.normalize({studioProfession:'braider',portfolio:[{id:'1',url:'https://example.com/a.jpg',featured:true,category:'Braids'}]});
  const html=SS.renderExperience({card:{full_name:'Maya Johnson',company_name:'Crowned By Maya',job_title:'Master Braider',primary_color:'#111827',secondary_color:'#c89245',background_color:'#fff',text_color:'#111827'},state,services:[],socials:[],products:[]});
  assert.match(html,/Crowned By Maya/);
  assert.match(html,/Master Braider/);
  assert.match(html,/Featured Work/);
  assert.doesNotMatch(html,/Knotless Braids/);
  assert.match(html,/Book Now/);
  assert.match(html,/ss-bottom-nav/);
});

test('editor keeps Super Studio state separate and preserves template architecture',()=>{
  assert.match(editor,/data-card-experience=\"super-studio\"/);
  assert.match(editor,/super_studio_state_staging/);
  assert.match(editor,/studioProfession/);
  assert.match(editor,/serviceMeta/);
  assert.match(editor,/depositType/);
  assert.match(editor,/appointments\.html\?card_id/);
  assert.doesNotMatch(editor,/card_layout[^\n]{0,80}=\s*['\"]super-studio/);
  assert.match(editorEnhancements,/availabilityStatus/);
  assert.match(editorEnhancements,/sectionVisibility/);
  assert.match(editorEnhancements,/studioInfo\.hours/);
  assert.match(editorEnhancements,/card-videos/);
});

test('public experience reuses LIW booking and global tools',()=>{
  assert.match(publicJs,/#booking-v1-section/);
  assert.match(publicJs,/mountNativeBooking/);
  assert.match(publicJs,/#share-top/);
  assert.match(publicJs,/#qr-top/);
  assert.match(publicJs,/#save/);
  assert.match(publicJs,/LIWPWA/);
  assert.match(publicJs,/touchstart/);
  assert.match(publicJs,/publicCardFeatureAccess/);
  assert.match(publicJs,/#branding/);
});

test('mobile styling prevents a Classic flash and supports narrow phones',()=>{
  assert.match(css,/liw-preload-super-studio #card\{visibility:hidden!important\}/);
  assert.match(css,/@media\(max-width:360px\)/);
  assert.match(css,/env\(safe-area-inset-bottom\)/);
});

test('staging loaders mount Super Studio modules',()=>{
  assert.match(editorLoader,/super-studio-config-staging\.js/);
  assert.match(editorLoader,/super-studio-editor-staging\.js/);
  assert.match(editorLoader,/super-studio-editor-enhancements-staging\.js/);
  assert.match(publicLoader,/super-studio-public-staging\.js/);
  assert.match(publicLoader,/super-studio-completion-staging\.css/);
  assert.match(publicLoader,/liwworgsinc\.github\.io/);
});

test('Super Studio persistence is staging-only and protected by RLS',()=>{
  assert.match(sql,/super_studio_state_staging/);
  assert.match(sql,/enable row level security/);
  assert.match(sql,/owner_user_id = dc\.user_id/);
  assert.match(sql,/has_workspace_access/);
  assert.match(sql,/card_is_within_current_limit/);
});
