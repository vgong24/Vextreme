'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'what-remains-faithful-through-change';
const SOURCE_HEAD = '3670d1d62f8fa35d02998ba21a8549e7d2bc17d0';
const ASSET_COMMIT = '0fa486afec2e9fa9ab185cd0538017b2c9d95bce';
const ASSET_SHA = '45fad36b05d46719875517303cc2c423936c3c2dcf6d9d14441b3d38d2a31580';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}
function json(rel) { return JSON.parse(read(rel)); }

test('WITNESS-RECORD-I: source-first reader binds the exact PR #568 witness without rewriting it', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.match(page, new RegExp(SOURCE_HEAD));
  assert.match(page, /Source PR #568/);
  assert.match(page, /data-reader-template="conversation-witness-reader\/v1"/);
  assert.ok(page.includes("sourceBase:'https://raw.githubusercontent.com/vgong24/Vextreme/" + SOURCE_HEAD + "/"));
  assert.doesNotMatch(page, /data-reader-component="witness-commentary"/);
  assert.doesNotMatch(page, /data-reader-component="synthesis"/);
});

test('WITNESS-RECORD-I: eight source movements cover exchanges 1 through 24 exactly once', () => {
  const page = read('pages/' + SLUG + '.html');
  const ranges = [...page.matchAll(/data-phase-kind="(?:record|archive-boundary)" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m => [Number(m[1]), Number(m[2]), Number(m[3]), m[4]]);
  assert.deepEqual(ranges, [
    [1,1,4,'transcript-01-exchanges-01-04.md'],
    [2,5,8,'transcript-02-exchanges-05-08.md'],
    [3,9,12,'transcript-03-exchanges-09-12.md'],
    [4,13,14,'transcript-04-exchanges-13-14.md'],
    [5,15,17,'transcript-05-exchanges-15-17.md'],
    [6,18,20,'transcript-06-exchanges-18-20.md'],
    [7,21,23,'transcript-07-exchanges-21-23.md'],
    [8,24,24,'transcript-08-archive-boundary.md'],
  ]);
  const covered=[];
  for (const [,from,to] of ranges) for (let n=from;n<=to;n+=1) covered.push(n);
  assert.deepEqual(covered, Array.from({length:24},(_,i)=>i+1));
});

test('WITNESS-RECORD-I: shared reader accepts archived User/Assistant labels without changing their visible source labels', () => {
  const reader = read('components/record-reader.js');
  assert.match(reader, /Victor\|Vex\|User\|Assistant/);
  assert.match(reader, /turn\.speaker==='User'\?'Victor'/);
  assert.match(reader, /turn\.speaker==='Assistant'\?'Vex'/);
  assert.match(reader, /data-source-speaker/);
  assert.match(reader, /speakerLabel=turn\.speaker\+\(turn\.role\?' · '\+turn\.role:''\)/);
  assert.match(reader, /body='### '\+heading/);
});

test('WITNESS-RECORD-I: repository owners project one new Witness Records collection into Terrain and Archives', () => {
  const nodes = json('data/nodes.json');
  const arcs = json('data/arcs-v2.json');
  const views = json('data/viewmodels.json');
  const archives = read('lib/build-archives.js');
  const node = nodes.find(n => n.slug === SLUG);
  assert.ok(node);
  assert.equal(node.id,124);
  assert.equal(node.date,'November 3, 2026');
  assert.deepEqual(node.arcKeys,['witness_records','victors_record','full_timeline']);
  const witnessSlugs = arcs.witness_records.sections[0].slugs;
  assert.equal(witnessSlugs[0],SLUG);
  assert.equal(witnessSlugs.filter(slug => slug===SLUG).length,1);
  assert.equal(arcs.witness_records.parent.title,'Witness Records');
  assert.equal(arcs.witness_records.parent.relationship,undefined);
  assert.ok(arcs.victors_record.sections[0].slugs.includes(SLUG));
  assert.equal(views[SLUG].scopes[0],'pages.'+SLUG);
  assert.deepEqual(views[SLUG].features,['lang','spiral-fab','theme','map','analysis','arc-nav']);
  assert.match(archives, /'victors_record', 'witness_records', 'victor_dossier'/);
  assert.match(archives, /witness_records: 'witness-records'/);
});

test('WITNESS-RECORD-I: representative art is immutable derived presentation, not evidence', () => {
  const page = read('pages/' + SLUG + '.html');
  const views = json('data/viewmodels.json');
  const strings = json('data/strings/source/pages/' + SLUG + '.json');
  assert.match(page,new RegExp(ASSET_COMMIT));
  assert.match(page,new RegExp(ASSET_SHA));
  assert.match(page,/data-media-class="representative"/);
  assert.match(page,/interpretive art, not transcript evidence/i);
  assert.equal(views[SLUG].preview.src, strings._meta.sourceProvenance.representativeMediaTarget);
  assert.equal(strings._meta.sourceProvenance.representativeMediaAssetCommit,ASSET_COMMIT);
  assert.equal(strings._meta.sourceProvenance.representativeMediaSha256,ASSET_SHA);
  assert.equal(strings._meta.sourceProvenance.representativeMediaClass,'REPRESENTATIVE_NOT_EVIDENCE');
});

test('WITNESS-RECORD-I: temporal precision stays inside the actual archive evidence', () => {
  const page = read('pages/' + SLUG + '.html');
  const strings = json('data/strings/source/pages/' + SLUG + '.json');
  assert.match(page,/November 3, 2026 · archive request supplied at 12:00 PM Pacific · individual exchange clocks not supplied/);
  assert.equal(strings._meta.sourceProvenance.recordedTimePrecision,'DATE_WITH_ARCHIVE_BOUNDARY_TIME');
  assert.equal(strings._meta.sourceProvenance.exactExchangeClocksSupplied,false);
});

// [VXG RealForever]
