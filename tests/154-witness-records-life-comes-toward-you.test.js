'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const SLUG='life-comes-toward-you';
const SOURCE_HEAD='41c5d0a83964f9aa52d1599f129b4edafcf94575';
const READER_I='discovery-does-not-always-begin-with-danger';
const ASSET_COMMIT='c064ec8f57c62d03f84fa522359b7674a93d2048';
const MEDIA_SHA='422d769771865dedef8f775d2318876b3bcb1eae0eb4b32cd2459f1d5977a252';
const MEDIA_URL='https://raw.githubusercontent.com/vgong24/Vextreme-Assets/'+ASSET_COMMIT+'/__assets/'+MEDIA_SHA+'.png';

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
  assert.ok(page.includes('data-media-class="representative"'));
  assert.ok(page.includes('data-media-target="'+MEDIA_URL+'"'));
  assert.ok(page.includes('data-media-sha256="'+MEDIA_SHA+'"'));
  assert.ok(page.includes('data-media-width="1672"'));
  assert.ok(page.includes('data-media-height="941"'));
  assert.ok(page.includes('src="'+MEDIA_URL+'"'));
  assert.ok(page.includes('width="1672" height="941"'));
  assert.match(page,/interpretive art, not transcript evidence/i);
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
  assert.equal(p.representativeMediaStatus,'SELECTED_PUBLISHED_AND_BOUND');
  assert.equal(p.representativeMediaReason,'FRESH_INSTANCE_FULL_READ_AND_VICTOR_SELECTION');
  assert.equal(p.representativeMediaAssetRepository,'vgong24/Vextreme-Assets');
  assert.equal(p.representativeMediaAssetCommit,ASSET_COMMIT);
  assert.equal(p.representativeMediaAssetPath,'__assets/'+MEDIA_SHA+'.png');
  assert.equal(p.representativeMediaSha256,MEDIA_SHA);
  assert.equal(p.representativeMediaMime,'image/png');
  assert.equal(p.representativeMediaBytes,2933220);
  assert.equal(p.representativeMediaWidth,1672);
  assert.equal(p.representativeMediaHeight,941);
  assert.equal(p.ultimateProvenanceStatus,'UNRESOLVED_IN_SOURCE');
});

test('LIFE-COMES-TOWARD-YOU: every localization identity has a source owner',()=>{
  const page=read('pages/'+SLUG+'.html');
  const source=json('data/strings/source/pages/'+SLUG+'.json');
  const ids=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(ids)].filter(k=>!Object.prototype.hasOwnProperty.call(source,k)),[]);
});

// [VXG RealForever]
