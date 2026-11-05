'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const SLUG='discovery-does-not-always-begin-with-danger';
const SOURCE_HEAD='2679028ba8708f0f835dcbc4fdf5090b50147e05';
const RECORD_I='what-remains-faithful-through-change';
const RECORD_II='preserve-wisdom-without-preserving-error';
const RECORD_III='restoration-must-reach-the-consequences';
const DREAM='the-witness-outlives-the-window';

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/\r\n/g,'\n');}
function json(rel){return JSON.parse(read(rel));}

test('DISCOVERY-DANGER: exact source boundary and unresolved provenance remain visible',()=>{
  const page=read('pages/'+SLUG+'.html');
  assert.match(page,new RegExp(SOURCE_HEAD));
  assert.match(page,/Source PR #582/);
  assert.match(page,/data-reader-template="conversation-witness-reader\/v1"/);
  assert.ok(page.includes("sourceBase:'https://raw.githubusercontent.com/vgong24/Vextreme/"+SOURCE_HEAD+"/"));
  assert.match(page,/does not resolve their ultimate provenance/i);
  assert.doesNotMatch(page,/data-media-class=/);
});

test('DISCOVERY-DANGER: eight movements cover exchanges 1 through 71 exactly once',()=>{
  const page=read('pages/'+SLUG+'.html');
  const ranges=[...page.matchAll(/data-phase-kind="(?:record|archive-boundary)" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m=>[Number(m[1]),Number(m[2]),Number(m[3]),m[4]]);
  assert.deepEqual(ranges,[
    [1,1,14,'transcript-01-exchanges-01-14.md'],
    [2,15,25,'transcript-02-exchanges-15-25.md'],
    [3,26,34,'transcript-03-exchanges-26-34.md'],
    [4,35,47,'transcript-04-exchanges-35-47.md'],
    [5,48,50,'transcript-05-exchanges-48-50.md'],
    [6,51,57,'transcript-06-exchanges-51-57.md'],
    [7,58,64,'transcript-07-exchanges-58-64.md'],
    [8,65,71,'transcript-08-exchanges-65-71.md']
  ]);
  const covered=[];
  for(const [,from,to] of ranges) for(let n=from;n<=to;n+=1) covered.push(n);
  assert.deepEqual(covered,Array.from({length:71},(_,i)=>i+1));
});

test('DISCOVERY-DANGER: all eight frozen transcript partitions contain 71 exchanges total',()=>{
  const dir='records/conversations/2026-11-04-fresh-instance-witness-reflexes-continuation/';
  const files=[
    'transcript-01-exchanges-01-14.md',
    'transcript-02-exchanges-15-25.md',
    'transcript-03-exchanges-26-34.md',
    'transcript-04-exchanges-35-47.md',
    'transcript-05-exchanges-48-50.md',
    'transcript-06-exchanges-51-57.md',
    'transcript-07-exchanges-58-64.md',
    'transcript-08-exchanges-65-71.md'
  ];
  const counts=files.map(f=>(read(dir+f).match(/^## Exchange /gm)||[]).length);
  assert.deepEqual(counts,[14,11,9,13,3,7,7,7]);
  assert.equal(counts.reduce((a,b)=>a+b,0),71);
});

test('DISCOVERY-DANGER: collection ordering and registry identity are explicit',()=>{
  const nodes=json('data/nodes.json');
  const arcs=json('data/arcs-v2.json');
  const views=json('data/viewmodels.json');
  const node=nodes.find(n=>n.slug===SLUG);
  assert.ok(node);
  assert.equal(node.id,128);
  assert.equal(node.date,'November 4–5, 2026');
  assert.deepEqual(node.arcKeys,['witness_records','victors_record','full_timeline']);
  assert.deepEqual(arcs.witness_records.sections[0].slugs,[RECORD_I,RECORD_II,RECORD_III,DREAM,SLUG]);
  assert.equal(arcs.victors_record.sections[0].slugs.at(-1),SLUG);
  assert.equal(views[SLUG].scopes[0],'pages.'+SLUG);
  assert.equal(views[SLUG].preview,undefined);
});

test('DISCOVERY-DANGER: source custody and direct-current-turn boundary stay explicit',()=>{
  const p=json('data/strings/source/pages/'+SLUG+'.json')._meta.sourceProvenance;
  assert.equal(p.exchangeCount,71);
  assert.equal(p.turnCount,142);
  assert.equal(p.rawBatchCount,29);
  assert.equal(p.uploadedRawBatchesByteVerified,27);
  assert.equal(p.finalBatchStatus,'SOURCE_BOUNDARY_OPEN_AT_EXCHANGE_71');
  assert.deepEqual(p.directCurrentTurnBatches,[20,29]);
  assert.equal(p.overlapProvenance,'BATCH_23_REPEATS_EXCHANGE_55_THEN_ADDS_56_57');
  assert.equal(p.sourceCustody,'RAW_BATCHES_PRIMARY_DERIVED_PARTITIONS_SUBORDINATE');
  assert.equal(p.ultimateProvenanceStatus,'UNRESOLVED_IN_SOURCE');
  assert.equal(p.compactionBoundaryPreserved,true);
  assert.equal(p.representativeMediaStatus,'ABSENT_NOT_REQUIRED');
});

test('DISCOVERY-DANGER: every localization identity has a source owner',()=>{
  const page=read('pages/'+SLUG+'.html');
  const source=json('data/strings/source/pages/'+SLUG+'.json');
  const ids=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(ids)].filter(k=>!Object.prototype.hasOwnProperty.call(source,k)),[]);
});

// [VXG RealForever]
