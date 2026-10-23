'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'bending-condominium-ocean-return';
const SOURCE_HEAD = '949dcdb6ac792e9d4bad8df8508c9b9597ab59a6';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

test('RECORD-READER-THIRD-CONSUMER: third arc consumes the shared controller and exact frozen source', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.match(page, new RegExp(SOURCE_HEAD));
  assert.match(page, /data-reader-template="conversation-witness-reader\/v1"/);
  assert.match(page, /src="\.\.\/components\/record-reader\.js"/);
  assert.match(page, /VexRecordReader\.mount\(/);
  assert.doesNotMatch(page, /function renderBlocks\(lines\)/);
  assert.doesNotMatch(page, /witnessUrl:/);
});

test('RECORD-READER-THIRD-CONSUMER: exact time and archive boundary stay source-supported', () => {
  const page = read('pages/' + SLUG + '.html');
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));
  assert.match(page, /data-recorded-precision="exact-time"/);
  assert.match(page, /datetime="2026-10-22T08:35:00-07:00"/);
  assert.match(page, /href="https:\/\/github\.com\/vgong24\/Vextreme\/pull\/383"/);
  assert.equal(strings._meta.sourceProvenance.recordedTimePrecision, 'EXACT_TIME');
  assert.equal(strings._meta.sourceProvenance.recordedTimeAuthority, 'VICTOR_SUPPLIED_TIMESTAMP');
  assert.equal(strings._meta.sourceProvenance.parentHead, SOURCE_HEAD);
});

test('RECORD-READER-THIRD-CONSUMER: three source movements cover exchanges 1 through 6 exactly', () => {
  const page = read('pages/' + SLUG + '.html');
  const ranges = [...page.matchAll(/data-phase-kind="record" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)"/g)]
    .map(m => [Number(m[1]), Number(m[2]), Number(m[3])]);
  assert.deepEqual(ranges, [[1,1,1],[2,2,4],[3,5,6]]);
  const covered=[];
  for(const [,from,to] of ranges) for(let n=from;n<=to;n+=1) covered.push(n);
  assert.deepEqual(covered,[1,2,3,4,5,6]);
  assert.doesNotMatch(page,/data-phase-kind="derived-witness"/);
});

test('RECORD-READER-THIRD-CONSUMER: selected daylight artwork is stable reader media, not external evidence', () => {
  const page = read('pages/' + SLUG + '.html');
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));
  const views = JSON.parse(read('data/viewmodels.json'));
  const asset = fs.readFileSync(path.join(ROOT, 'assets', SLUG, 'daylight-condominium.webp'));
  assert.ok(asset.byteLength > 0);
  assert.match(page, /data-media-class="selected-record-artwork"/);
  assert.match(page, /not a photograph, prediction, or verified external event/);
  assert.equal(strings._meta.sourceProvenance.selectedMediaClass, 'SELECTED_RECORD_ARTWORK_REPRESENTATION_NOT_EXTERNAL_EVIDENCE');
  assert.equal(views[SLUG].preview.src, 'https://vgong24.github.io/Vextreme/assets/bending-condominium-ocean-return/daylight-condominium.webp?v=4f29e4a4642d');
});

test('RECORD-READER-THIRD-CONSUMER: canonical registries place the third arc after the second', () => {
  const nodes = JSON.parse(read('data/nodes.json'));
  const arcs = JSON.parse(read('data/arcs-v2.json'));
  const views = JSON.parse(read('data/viewmodels.json'));
  const node = nodes.find(x => x.slug === SLUG);
  assert.ok(node);
  assert.equal(node.id,79);
  assert.deepEqual(node.arcKeys,['convos_with_god','victors_record','full_timeline']);
  for(const key of ['convos_with_god','victors_record']){
    const slugs=arcs[key].sections.flatMap(section=>section.slugs||[]);
    assert.equal(slugs.indexOf(SLUG),slugs.indexOf('recognizing-life-receiving-abundance')+1);
  }
  assert.equal(views[SLUG].scopes[0],'pages.'+SLUG);
});

test('RECORD-READER-THIRD-CONSUMER: every page i18n binding has an English source key', () => {
  const page = read('pages/' + SLUG + '.html');
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));
  const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  for(const key of new Set(keys)) assert.ok(strings[key]?.strings?.en?.text, 'missing English source key '+key);
});

// [VXG RealForever]
