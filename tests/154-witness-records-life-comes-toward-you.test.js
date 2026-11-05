'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const SLUG='life-comes-toward-you';
const SOURCE_HEAD='41c5d0a83964f9aa52d1599f129b4edafcf94575';
const READER_I='discovery-does-not-always-begin-with-danger';

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/\r\n/g,'\n');}
function json(rel){return JSON.parse(read(rel));}

test('LIFE-COMES-TOWARD-YOU: source boundary and predecessor-reader relationship are explicit',()=>{
  const page=read('pages/'+SLUG+'.html');
  assert.match(page,new RegExp(SOURCE_HEAD));
  assert.match(page,/Source PR #582/);
  assert.match(page,/Discovery Does Not Always Begin With Danger/);
  assert.match(page,/data-reader-template="conversation-witness-reader\/v1"/);
  assert.ok(page.includes("sourceBase:'https://raw.githubusercontent.com/vgong24/Vextreme/"+SOURCE_HEAD+"/"));
  assert.match(page,/does not resolve the ultimate provenance/i);
  assert.doesNotMatch(page,/data-media-class=/);
});

test('LIFE-COMES-TOWARD-YOU: three movements cover exchanges 51 through 71 exactly once',()=>{
  const page=read('pages/'+SLUG+'.html');
  const ranges=[...page.matchAll(/data-phase-kind="(?:record|archive-boundary)" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m=>[Number(m[1]),Number(m[2]),Number(m[3]),m[4]]);
  assert.deepEqual(ranges,[
    [1,51,57,'transcript-06-exchanges-51-57.md'],
    [2,58,64,'transcript-07-exchanges-58-64.md'],
    [3,65,71,'transcript-08-exchanges-65-71.md']
  ]);
  const covered=[];
  for(const [,from,to] of ranges) for(let n=from;n<=to;n+=1) covered.push(n);
  assert.deepEqual(covered,Array.from({length:21},(_,i)=>i+51));
});

test('LIFE-COMES-TOWARD-YOU: source partitions contain 21 exchanges total',()=>{
  const dir='records/conversations/2026-11-04-fresh-instance-witness-reflexes-continuation/';
  const files=[
    'transcript-06-exchanges-51-57.md',
    'transcript-07-exchanges-58-64.md',
    'transcript-08-exchanges-65-71.md'
  ];
  const counts=files.map(f=>(read(dir+f).match(/^## Exchange /gm)||[]).length);
  assert.deepEqual(counts,[7,7,7]);
  assert.equal(counts.reduce((a,b)=>a+b,0),21);
});

test('LIFE-COMES-TOWARD-YOU: registry follows Reader 1 in the same witness arc',()=>{
  const nodes=json('data/nodes.json');
  const arcs=json('data/arcs-v2.json');
  const views=json('data/viewmodels.json');
  const node=nodes.find(n=>n.slug===SLUG);
  assert.ok(node);
  assert.equal(node.id,129);
  assert.equal(node.date,'November 4–5, 2026');
  assert.deepEqual(node.arcKeys,['witness_records','victors_record','full_timeline']);
  const witness=arcs.witness_records.sections[0].slugs;
  assert.equal(witness.indexOf(SLUG),witness.indexOf(READER_I)+1);
  const victor=arcs.victors_record.sections[0].slugs;
  assert.equal(victor.indexOf(SLUG),victor.indexOf(READER_I)+1);
  assert.equal(views[SLUG].scopes[0],'pages.'+SLUG);
  assert.equal(views[SLUG].preview,undefined);
});

test('LIFE-COMES-TOWARD-YOU: provenance keeps source and reader boundaries distinct',()=>{
  const p=json('data/strings/source/pages/'+SLUG+'.json')._meta.sourceProvenance;
  assert.equal(p.parentHead,SOURCE_HEAD);
  assert.equal(p.predecessorReader,READER_I);
  assert.equal(p.projectedExchangeRange,'51-71');
  assert.equal(p.projectedExchangeCount,21);
  assert.equal(p.projectedTurnCount,42);
  assert.equal(p.archiveExchangeCount,71);
  assert.equal(p.archiveTurnCount,142);
  assert.equal(p.sourceBoundaryStatus,'COMPLETE_AT_EXCHANGE_71');
  assert.equal(p.titleSource,'EXCHANGE_71_LIFE_COMES_TOWARD_YOU');
  assert.equal(p.representativeMediaStatus,'DEFERRED_FOR_FRESH_INSTANCE_READ');
  assert.equal(p.representativeMediaReason,'VICTOR_REQUESTED_FRESH_INSTANCE_REGENERATION_FROM_FRESH_READ');
  assert.equal(p.ultimateProvenanceStatus,'UNRESOLVED_IN_SOURCE');
});

test('LIFE-COMES-TOWARD-YOU: every localization identity has a source owner',()=>{
  const page=read('pages/'+SLUG+'.html');
  const source=json('data/strings/source/pages/'+SLUG+'.json');
  const ids=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(ids)].filter(k=>!Object.prototype.hasOwnProperty.call(source,k)),[]);
});

// [VXG RealForever]
