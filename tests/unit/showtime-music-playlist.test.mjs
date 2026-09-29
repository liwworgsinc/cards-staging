import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../../js/public-music-media-rooms-staging.js',import.meta.url),'utf8');
const patched=source.replace(/\n\}\)\(\);\s*$/, '\n  window.__playlistTest={releaseCatalog,buildMusicRoom,safeWebUrl};\n})();');
assert.notEqual(patched,source,'must instrument the actual public Music room');

function node(tag){
  return {tag,children:[],style:{setProperty(){}},setAttribute(){},addEventListener(){},
    querySelector(){return {addEventListener(){}};},appendChild(child){this.children.push(child);return child;},
    prepend(child){this.children.unshift(child);return child;},innerHTML:''};
}
function harness(){
  const window={addEventListener(){}};
  const document={getElementById(){return null;},querySelector(){return null;},createElement:node};
  const context={window,document,location:{search:''},URL,URLSearchParams,console,
    publicCard:{card_experience:'music',slug:'test-artist',full_name:'Test Artist'},
    setTimeout(){return 0;}};
  vm.runInNewContext(patched,context,{filename:'public-music-media-rooms-staging.js'});
  return window.__playlistTest;
}
const release=(i,featured=false)=>({id:'song-'+i,title:'Song '+i,artwork_url:'https://example.org/art/'+i+'.jpg',listen_url:'https://example.org/listen/'+i,featured});

test('second release appears below the featured hero',()=>{
  const api=harness(),catalog=api.releaseCatalog({releases:[release(1,true),release(2)]});
  assert.equal(catalog.featured.title,'Song 1');
  assert.equal(catalog.more.length,1);
  const stage=api.buildMusicRoom({releases:[release(1,true),release(2)]});
  const hero=stage.children.find(x=>x.className==='music-listen-hero');
  const playlist=stage.children.find(x=>x.className==='music-playlist');
  assert.match(hero.innerHTML,/Song 1/);
  assert.ok(playlist,'more music should appear');
  assert.equal(playlist.children[0].children.length,1);
  assert.match(playlist.children[0].children[0].innerHTML,/Song 2/);
  assert.match(playlist.children[0].children[0].innerHTML,/href="https:\/\/example.org\/listen\/2"/);
});

test('making another release featured updates hero and retains the rest',()=>{
  const api=harness(),releases=[release(1),release(2,true),release(3)];
  const catalog=api.releaseCatalog({releases});
  assert.equal(catalog.featured.title,'Song 2');
  assert.deepEqual(Array.from(catalog.more,item=>item.title),['Song 1','Song 3']);
});

test('a 25-release catalog stays within one scrollable list rather than 25 heroes',()=>{
  const api=harness(),releases=Array.from({length:25},(_,index)=>release(index+1,index===12));
  const stage=api.buildMusicRoom({releases});
  assert.equal(stage.children.filter(x=>x.className==='music-listen-hero').length,1);
  assert.equal(stage.children.find(x=>x.className==='music-playlist').children[0].children.length,24);
  assert.match(stage.children.find(x=>x.className==='music-listen-hero').innerHTML,/Song 13/);
});

test('legacy one-release data stays visible and empty catalog gets no playlist',()=>{
  const api=harness(),stage=api.buildMusicRoom({featured_release_title:'Older single',listen_url:'https://example.org/old'});
  assert.match(stage.children.find(x=>x.className==='music-listen-hero').innerHTML,/Older single/);
  assert.equal(stage.children.some(x=>x.className==='music-playlist'),false);
});

test('unsafe URLs are rejected and titles are escaped',()=>{
  const api=harness();
  assert.equal(api.safeWebUrl('javascript:alert(1)'),'');
  const stage=api.buildMusicRoom({releases:[release(1,true),{id:'x',title:'<img src=x onerror=alert(1)>',listen_url:'javascript:alert(1)'}]});
  const list=stage.children.find(x=>x.className==='music-playlist').children[0];
  assert.match(list.children[0].innerHTML,/&lt;img/);
  assert.doesNotMatch(list.children[0].innerHTML,/href="javascript:/);
  assert.match(list.children[0].innerHTML,/Link soon/);
});
