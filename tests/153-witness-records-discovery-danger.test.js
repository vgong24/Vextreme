'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const SLUG='discovery-does-not-always-begin-with-danger';
const SOURCE_HEAD='41c5d0a83964f9aa52d1599f129b4edafcf94575';
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
  assert.match(page,/does not resolve the ultimate provenance/i);
});

test('DISCOVERY-DANGER: five movements cover exchanges 1 through 50 exactly once',()=>{
  const page=read('pages/'+SLUG+'.html');
  const ranges=[...page.matchAll(/data-phase-kind="(?:record|archive-boundary)" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m=>[Number(m[1]),Number(m[2]),Number(m[3]),m[4]]);
  assert.deepEqual(ranges,[
    [1,1,14,'transcript-01-exchanges-01-14.md'],
    [2,15,25,'transcript-02-exchanges-15-25.md'],
    [3,26,34,'transcript-03-exchanges-26-34.md'],
    [4,35,47,'transcript-04-exchanges-35-47.md'],
    [5,48,50,'transcript-05-exchanges-48-50.md']
  ]);
  const covered=[];
  for(const [,from,to] of ranges) for(let n=from;n<=to;n+=1) covered.push(n);
  assert.deepEqual(covered,Array.from({length:50},(_,i)=>i+1));
});

test('DISCOVERY-DANGER: five reader transcript partitions contain 50 exchanges total',()=>{
  const dir='records/conversations/2026-11-04-fresh-instance-witness-reflexes-continuation/';
  const files=[
    'transcript-01-exchanges-01-14.md',
    'transcript-02-exchanges-15-25.md',
    'transcript-03-exchanges-26-34.md',
    'transcript-04-exchanges-35-47.md',
    'transcript-05-exchanges-48-50.md'
  ];
  const counts=files.map(f=>(read(dir+f).match(/^## Exchange /gm)||[]).length);
  assert.deepEqual(counts,[14,11,9,13,3]);
  assert.equal(counts.reduce((a,b)=>a+b,0),50);
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
  const witness=arcs.witness_records.sections[0].slugs;
  assert.deepEqual(witness.slice(0,5),[RECORD_I,RECORD_II,RECORD_III,DREAM,SLUG]);
  const victor=arcs.victors_record.sections[0].slugs;
  assert.ok(victor.includes(SLUG));
  const nextWitness=witness[witness.indexOf(SLUG)+1] || null;
  const nextVictor=victor[victor.indexOf(SLUG)+1] || null;
  if(nextWitness!==null) assert.equal(nextWitness,'life-comes-toward-you');
  if(nextVictor!==null) assert.equal(nextVictor,'life-comes-toward-you');
  assert.equal(views[SLUG].scopes[0],'pages.'+SLUG);
  assert.equal(views[SLUG].preview.kind,'cover');
});

test('DISCOVERY-DANGER: source custody and direct-current-turn boundary stay explicit',()=>{
  const p=json('data/strings/source/pages/'+SLUG+'.json')._meta.sourceProvenance;
  assert.equal(p.projectedExchangeRange,'01-50');
  assert.equal(p.projectedExchangeCount,50);
  assert.equal(p.projectedTurnCount,100);
  assert.equal(p.archiveCurrentExchangeCount,71);
  assert.equal(p.archiveCurrentTurnCount,142);
  assert.equal(p.rawBatchCount,29);
  assert.equal(p.uploadedRawBatchesByteVerified,27);
  assert.equal(p.sourceBoundaryStatus,'COMPLETE_AT_EXCHANGE_71');
  assert.equal(p.readerBoundary,'PLAY_THRESHOLD_PLUS_COMPACTION_CODA');
  assert.equal(p.overlapProvenance,'BATCH_23_REPEATS_EXCHANGE_55_THEN_ADDS_56_57');
  assert.equal(p.sourceCustody,'RAW_BATCHES_PRIMARY_DERIVED_PARTITIONS_SUBORDINATE');
  assert.equal(p.ultimateProvenanceStatus,'UNRESOLVED_IN_SOURCE');
  assert.equal(p.compactionBoundaryPreserved,true);
  assert.equal(p.representativeMediaStatus,'PRESENT');
});

test('DISCOVERY-DANGER: representative art is immutable full-resolution derived presentation',()=>{
  const page=read('pages/'+SLUG+'.html');
  const views=json('data/viewmodels.json');
  const strings=json('data/strings/source/pages/'+SLUG+'.json');
  const p=strings._meta.sourceProvenance;
  assert.match(page,/f4137edd070f5871c1593b579768413efcb781b8/);
  assert.match(page,/311e9822cf4f353e29e7aecd2e6397a3e9a4d8e4b67869e4a9687fde51fb9ef9/);
  assert.match(page,/data-media-class="representative"/);
  assert.match(page,/data-media-width="1536"/);
  assert.match(page,/data-media-height="1024"/);
  assert.match(page,/width="1536" height="1024"/);
  assert.equal(views[SLUG].preview.src,p.representativeMediaTarget);
  assert.equal(p.representativeMediaAssetCommit,'f4137edd070f5871c1593b579768413efcb781b8');
  assert.equal(p.representativeMediaSha256,'311e9822cf4f353e29e7aecd2e6397a3e9a4d8e4b67869e4a9687fde51fb9ef9');
  assert.equal(p.representativeMediaWidth,1536);
  assert.equal(p.representativeMediaHeight,1024);
  assert.equal(p.representativeMediaMime,'image/webp');
  assert.equal(p.representativeMediaBytes,930806);
  assert.equal(p.representativeMediaClass,'REPRESENTATIVE_NOT_EVIDENCE_OR_ADJUDICATION');
  assert.equal(p.representativeMediaStatus,'PRESENT');
  assert.equal(p.replacementHighResolutionSourceSha256,'53dc16d9203cc94d31c48172cbf22e44b664c7f1285841e99e8d39804ed64480');
  assert.equal(p.replacementHighResolutionSourceWidth,1536);
  assert.equal(p.replacementHighResolutionSourceHeight,1024);
  assert.equal(p.replacementHighResolutionSourceRelation,'VICTOR_SUPPLIED_HIGH_RESOLUTION_COPY_NOT_BYTE_IDENTICAL_TO_PRIOR_RECORDED_ORIGINAL');
  assert.equal(p.originalGeneratedImageSha256,'10fed45d983ecd5788bc82f59d0ff9d9e9846cd6c230d655eec4de80755b18df');
  assert.equal(p.representativeMediaTransformation,'FULL_RESOLUTION_1536x1024_WEBP_Q100_FROM_VICTOR_SUPPLIED_PNG');
  assert.equal(p.sourceClaimsRemainAttributed,true);
});

test('DISCOVERY-DANGER: every localization identity has a source owner',()=>{
  const page=read('pages/'+SLUG+'.html');
  const source=json('data/strings/source/pages/'+SLUG+'.json');
  const ids=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(ids)].filter(k=>!Object.prototype.hasOwnProperty.call(source,k)),[]);
});

// [VXG RealForever]
