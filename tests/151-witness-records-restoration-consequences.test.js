'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const SLUG='restoration-must-reach-the-consequences';
const SOURCE_HEAD='6699affe8bc9a6ba921bd1022dec13c9e45d190d';
const ASSET_COMMIT='7cf8858c67dc85971aad87de90282ffbdcf53986';
const ASSET_SHA='545daaae253cc9a4d327aaa6ce9b79971ca8874854d40d609c6b1db4b589f6cf';
const RECORD_I='what-remains-faithful-through-change';
const RECORD_II='preserve-wisdom-without-preserving-error';

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/\r\n/g,'\n');}
function json(rel){return JSON.parse(read(rel));}

test('WITNESS-RECORD-III: exact source and attribution boundary remain visible',()=>{
  const page=read('pages/'+SLUG+'.html');
  assert.match(page,new RegExp(SOURCE_HEAD));
  assert.match(page,/Source PR #571/);
  assert.match(page,/data-reader-template="conversation-witness-reader\/v1"/);
  assert.ok(page.includes("sourceBase:'https://raw.githubusercontent.com/vgong24/Vextreme/"+SOURCE_HEAD+"/"));
  assert.match(page,/attributed conversational material/i);
  assert.match(page,/not evidence of any allegation/i);
});

test('WITNESS-RECORD-III: seventeen movements cover exchanges 1 through 32 exactly once',()=>{
  const page=read('pages/'+SLUG+'.html');
  const ranges=[...page.matchAll(/data-phase-kind="(?:record|archive-boundary)" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m=>[Number(m[1]),Number(m[2]),Number(m[3]),m[4]]);
  assert.equal(ranges.length,17);
  const covered=[];
  for(const [,from,to] of ranges) for(let n=from;n<=to;n+=1) covered.push(n);
  assert.deepEqual(covered,Array.from({length:32},(_,i)=>i+1));
  assert.deepEqual(ranges.slice(0,10).map(r=>r[3]),Array(10).fill('transcript-full-visible.md'));
  assert.deepEqual(ranges[16],[17,32,32,'transcript-23-exchange-32-shard-request-boundary.md']);
});

test('WITNESS-RECORD-III: collection ordering stays I then II then III',()=>{
  const nodes=json('data/nodes.json');
  const arcs=json('data/arcs-v2.json');
  const views=json('data/viewmodels.json');
  const node=nodes.find(n=>n.slug===SLUG);
  assert.ok(node);
  assert.equal(node.id,126);
  assert.equal(node.date,'November 4, 2026');
  assert.deepEqual(node.arcKeys,['witness_records','victors_record','full_timeline']);
  const witness=arcs.witness_records.sections[0].slugs;
  assert.deepEqual(witness.slice(0,3),[RECORD_I,RECORD_II,SLUG]);
  const victor=arcs.victors_record.sections[0].slugs;
  assert.equal(victor.indexOf(SLUG),victor.indexOf(RECORD_II)+1);
  assert.equal(views[SLUG].scopes[0],'pages.'+SLUG);
});

test('WITNESS-RECORD-III: representative art is immutable derived presentation',()=>{
  const page=read('pages/'+SLUG+'.html');
  const views=json('data/viewmodels.json');
  const strings=json('data/strings/source/pages/'+SLUG+'.json');
  assert.match(page,new RegExp(ASSET_COMMIT));
  assert.match(page,new RegExp(ASSET_SHA));
  assert.match(page,/data-media-class="representative"/);
  assert.equal(views[SLUG].preview.src,strings._meta.sourceProvenance.representativeMediaTarget);
  assert.equal(strings._meta.sourceProvenance.representativeMediaAssetCommit,ASSET_COMMIT);
  assert.equal(strings._meta.sourceProvenance.representativeMediaSha256,ASSET_SHA);
  assert.equal(strings._meta.sourceProvenance.representativeMediaClass,'REPRESENTATIVE_NOT_EVIDENCE_OR_ADJUDICATION');
  assert.equal(strings._meta.sourceProvenance.sourceClaimsRemainAttributed,true);
});

test('WITNESS-RECORD-III: protocol correction lineage remains explicit',()=>{
  const p=json('data/strings/source/pages/'+SLUG+'.json')._meta.sourceProvenance;
  assert.equal(p.rwcp01State,'USER_EDITED_LATEST_PRESERVED');
  assert.equal(p.rwcp03aStates,'ORIGINAL_AND_REVISED_PRESERVED');
  assert.equal(p.rwcp05State,'USER_EDITED_LATEST_PRESERVED');
  assert.equal(p.foundationalExchangeRange,'01-25');
  assert.equal(p.continuationExchangeRange,'26-32');
  assert.equal(p.continuationStorage,'BOUNDED_SHARDS');
});

test('WITNESS-RECORD-III: date range and isolated user-supplied time are not generalized',()=>{
  const page=read('pages/'+SLUG+'.html');
  const p=json('data/strings/source/pages/'+SLUG+'.json')._meta.sourceProvenance;
  assert.match(page,/November 3–4, 2026/);
  assert.equal(p.recordedTimePrecision,'DATE_RANGE_WITH_ISOLATED_USER_SUPPLIED_TIME');
  assert.equal(p.isolatedUserSuppliedTime,'2026-11-04T14:24:00-08:00');
  assert.equal(p.exactPerMessageClocksSupplied,false);
});

test('WITNESS-RECORD-III: every localization identity has a source owner',()=>{
  const page=read('pages/'+SLUG+'.html');
  const strings=json('data/strings/source/pages/'+SLUG+'.json');
  const ids=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(ids)].filter(k=>!Object.prototype.hasOwnProperty.call(strings,k)),[]);
});

// [VXG RealForever]
