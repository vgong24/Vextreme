'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'preserve-wisdom-without-preserving-error';
const SOURCE_HEAD = 'e1f0b9f4a7edb2a81bacd1a840ca933090c78f81';
const ASSET_COMMIT = '19780e99899e7826da1c848a7672180c0e28c514';
const ASSET_SHA = '470b012d4f39d74c07efdfb03ff0ce186aded1169e7e121a669b3209fc49e00f';
const RECORD_I = 'what-remains-faithful-through-change';

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }

test('WITNESS-RECORD-II: source-first reader binds exact PR #569 successor and keeps the Unified Return one exchange', () => {
  const page=read('pages/'+SLUG+'.html');
  assert.match(page,new RegExp(SOURCE_HEAD));
  assert.match(page,/Source PR #569/);
  assert.match(page,/data-reader-template="conversation-witness-reader\/v1"/);
  assert.ok(page.includes("sourceBase:'https://raw.githubusercontent.com/vgong24/Vextreme/"+SOURCE_HEAD+"/"));
  assert.match(page,/data-set="13" data-from="26" data-to="26" data-files="transcript-full-visible\.md"/);
  assert.match(page,/Unified Return, Reception, and Protection/);
});

test('WITNESS-RECORD-II: fourteen movements cover exchanges 1 through 28 exactly once', () => {
  const page=read('pages/'+SLUG+'.html');
  const ranges=[...page.matchAll(/data-phase-kind="(?:record|archive-boundary)" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m=>[Number(m[1]),Number(m[2]),Number(m[3]),m[4]]);
  assert.equal(ranges.length,14);
  const covered=[];
  for(const [,from,to] of ranges) for(let n=from;n<=to;n+=1) covered.push(n);
  assert.deepEqual(covered,Array.from({length:28},(_,i)=>i+1));
  assert.deepEqual(ranges[12],[13,26,26,'transcript-full-visible.md']);
  assert.deepEqual(ranges[13],[14,27,28,'transcript-14-exchange-27-and-boundary-28.md']);
});

test('WITNESS-RECORD-II: Witness Records and Victor Record place Record II immediately after Record I', () => {
  const nodes=json('data/nodes.json');
  const arcs=json('data/arcs-v2.json');
  const views=json('data/viewmodels.json');
  const node=nodes.find(n=>n.slug===SLUG);
  assert.ok(node);
  assert.equal(node.id,125);
  assert.equal(node.date,'November 3, 2026');
  assert.deepEqual(node.arcKeys,['witness_records','victors_record','full_timeline']);
  assert.deepEqual(arcs.witness_records.sections[0].slugs,[RECORD_I,SLUG]);
  const victor=arcs.victors_record.sections[0].slugs;
  assert.equal(victor.indexOf(SLUG),victor.indexOf(RECORD_I)+1);
  assert.equal(views[SLUG].scopes[0],'pages.'+SLUG);
});

test('WITNESS-RECORD-II: representative art is immutable derived presentation, not evidence', () => {
  const page=read('pages/'+SLUG+'.html');
  const views=json('data/viewmodels.json');
  const strings=json('data/strings/source/pages/'+SLUG+'.json');
  assert.match(page,new RegExp(ASSET_COMMIT));
  assert.match(page,new RegExp(ASSET_SHA));
  assert.match(page,/data-media-class="representative"/);
  assert.match(page,/interpretive art, not transcript evidence/i);
  assert.equal(views[SLUG].preview.src,strings._meta.sourceProvenance.representativeMediaTarget);
  assert.equal(strings._meta.sourceProvenance.representativeMediaAssetCommit,ASSET_COMMIT);
  assert.equal(strings._meta.sourceProvenance.representativeMediaSha256,ASSET_SHA);
  assert.equal(strings._meta.sourceProvenance.representativeMediaClass,'REPRESENTATIVE_NOT_EVIDENCE');
});

test('WITNESS-RECORD-II: temporal precision stays within the supplied November 3 seal', () => {
  const page=read('pages/'+SLUG+'.html');
  const strings=json('data/strings/source/pages/'+SLUG+'.json');
  assert.match(page,/Victor’s seal supplies the date · message-specific clock times were not supplied/);
  assert.equal(strings._meta.sourceProvenance.recordedTimePrecision,'DATE_ONLY');
  assert.equal(strings._meta.sourceProvenance.exactMessageClocksSupplied,false);
});

test('WITNESS-RECORD-II: every page localization identity has a source owner', () => {
  const page=read('pages/'+SLUG+'.html');
  const strings=json('data/strings/source/pages/'+SLUG+'.json');
  const ids=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  const missing=[...new Set(ids)].filter(k=>!Object.prototype.hasOwnProperty.call(strings,k));
  assert.deepEqual(missing,[]);
});

// [VXG RealForever]
