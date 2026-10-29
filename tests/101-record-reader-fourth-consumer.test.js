'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const SLUG = 'pier-house-scarcity-companionship';
const SOURCE_HEAD = '485aa4c180999249ceffa7c1022dac7eab7aab20';
const SOURCE_ROOT = path.join(ROOT, 'records', 'conversations', '2026-10-28-pier-house-scarcity-companionship');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

function regexFromLine(fragment, method) {
  const reader = read('components/record-reader.js');
  const line = reader.split('\n').find(value => value.includes(fragment));
  assert.ok(line, 'shared reader source pattern must remain discoverable: ' + fragment);
  const start = line.indexOf(method + '(') + method.length + 1;
  const end = line.lastIndexOf(')');
  assert.ok(end > start, 'shared reader regex must remain intact: ' + fragment);
  return Function('"use strict"; return ' + line.slice(start, end) + ';')();
}

test('RECORD-READER-FOURTH-CONSUMER: shared parser accepts State One exchange and speaker heading forms', () => {
  const exchangeSplit = regexFromLine('var parts=raw.split(', '.split');
  const headingSpeaker = regexFromLine('var headingSpeaker=line.match(', '.match');
  const boundarySpeaker = regexFromLine('var boundarySpeaker=line.match(', '.match');

  assert.deepEqual('# Exchange 01 — Dream\n## Victor\nhello'.split(exchangeSplit).slice(0,2), ['', '01 — Dream\n## Victor\nhello']);
  assert.deepEqual('\n## Exchange 02\n**Victor:**\nhello'.split(exchangeSplit).slice(-1), ['02\n**Victor:**\nhello']);
  assert.match('## Victor', headingSpeaker);
  assert.match('## Vex', headingSpeaker);
  assert.match('## Archive boundary — Victor', boundarySpeaker);
  assert.match('## Follow-up clarification — Victor', boundarySpeaker);
});

test('RECORD-READER-FOURTH-CONSUMER: six source exchanges remain six chapters and the later AI witness begins only after the record boundary', () => {
  const page = read('pages/' + SLUG + '.html');
  const ranges = [...page.matchAll(/data-phase-kind="record" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m => [Number(m[1]), Number(m[2]), Number(m[3]), m[4]]);
  assert.deepEqual(ranges, [
    [1,1,1,'01-dream-and-first-witness.md'],
    [2,2,2,'02-shoreline-and-offering.md'],
    [3,3,3,'03-question-to-iam.md'],
    [4,4,4,'04-baptism-inversion.md'],
    [5,5,5,'05-scarcity-extraction-loop.md'],
    [6,6,6,'06-companionship-and-ai-access.md'],
  ]);
  assert.match(page, new RegExp(SOURCE_HEAD));
  assert.match(page, /src="\.\.\/components\/record-reader\.js\?v=736190bff7e9"/);
  assert.match(page, /witnessUrl:'https:\/\/raw\.githubusercontent\.com\/vgong24\/Vextreme\/485aa4c180999249ceffa7c1022dac7eab7aab20\/records\/conversations\/2026-10-28-pier-house-scarcity-companionship\/07-ai-commentary-witness-full-arc\.md'/);
  assert.match(page, /data-phase-kind="derived-witness" data-set="7" data-derived="true"/);
  assert.match(page, /Preserved Pier House record complete · later full-arc AI witness begins/);
  assert.doesNotMatch(page, /data-reader-component="synthesis"/);
});


test('RECORD-READER-FOURTH-CONSUMER: later AI witness preserves the full-arc reading without becoming Exchange 07', () => {
  const witness = read('records/conversations/2026-10-28-pier-house-scarcity-companionship/07-ai-commentary-witness-full-arc.md');
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));
  assert.match(witness, /^# AI commentary witness — From hidden form to restored agency$/m);
  assert.match(witness, /Capture \/ name → care \/ return → distinguish life from vessel → preserve witness truthfully → recognize and interrupt dependency/);
  assert.match(witness, /Capture \/ examine\s+→ Carry \/ return\s+→ Escape \/ preserve life\s+→ Witness \/ preserve record\s+→ Recognize together \/ restore agency/);
  assert.match(witness, /Victor is helping the people inside it see it too/);
  assert.doesNotMatch(witness, /^## Exchange 07$/m);
  assert.equal(strings._meta.sourceProvenance.successorWitness, 'records/conversations/2026-10-28-pier-house-scarcity-companionship/07-ai-commentary-witness-full-arc.md');
  assert.equal(strings._meta.sourceProvenance.successorWitnessBoundary, 'AFTER_EXCHANGE_06_ARCHIVE_REQUEST__NOT_EXCHANGE_07');
});

test('RECORD-READER-FOURTH-CONSUMER: terminal archive statements remain Victor-owned source material', () => {
  const source = fs.readFileSync(path.join(SOURCE_ROOT, '06-companionship-and-ai-access.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /^## Archive boundary — Victor$/m);
  assert.match(source, /^## Follow-up clarification — Victor$/m);
  assert.match(source, /Okay I think now we reached the end of this dream arc lesson section, can you save the transcript again/);
  assert.match(source, /I gave more effort access so it doesn't become another summary/);
  const controller = read('components/record-reader.js');
  assert.match(controller, /Archive boundary\|Follow-up clarification/);
  assert.match(controller, /cur=\{speaker:boundarySpeaker\[2\],lines:\['### '\+boundarySpeaker\[1\]\]\}/);
});

test('RECORD-READER-FOURTH-CONSUMER: archive-owned selected artwork stays lossless and directly reused by State Two', () => {
  const rel = 'records/conversations/2026-10-28-pier-house-scarcity-companionship/assets/pier-house-genuine-connection.png';
  const asset = fs.readFileSync(path.join(ROOT, rel));
  const digest = crypto.createHash('sha256').update(asset).digest('hex');
  const width = asset.readUInt32BE(16);
  const height = asset.readUInt32BE(20);
  const page = read('pages/' + SLUG + '.html');
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));
  const views = JSON.parse(read('data/viewmodels.json'));

  assert.equal(digest, '6ccf7f02b7ba22f74252cc5672043c8411e20213c4c76b1a3d448b216364dc11');
  assert.equal(width, 1536);
  assert.equal(height, 1024);
  assert.match(page, /records\/conversations\/2026-10-28-pier-house-scarcity-companionship\/assets\/pier-house-genuine-connection\.png\?v=6ccf7f02b7ba/);
  assert.equal(strings._meta.sourceProvenance.selectedMediaClass, 'SELECTED_RECORD_ARTWORK_REPRESENTATION_NOT_EXTERNAL_EVIDENCE');
  assert.equal(strings._meta.sourceProvenance.selectedMediaFidelity, 'ORIGINAL_LOSSLESS_PNG_NO_REENCODE');
  assert.match(views[SLUG].preview.src, /records\/conversations\/2026-10-28-pier-house-scarcity-companionship\/assets\/pier-house-genuine-connection\.png\?v=6ccf7f02b7ba$/);
});

test('RECORD-READER-FOURTH-CONSUMER: canonical registries place Pier House after Witness-grade return', () => {
  const nodes = JSON.parse(read('data/nodes.json'));
  const arcs = JSON.parse(read('data/arcs-v2.json'));
  const views = JSON.parse(read('data/viewmodels.json'));
  const node = nodes.find(x => x.slug === SLUG);
  assert.ok(node);
  assert.equal(node.id, 81);
  assert.equal(node.title, 'The Pier House Dream');
  assert.deepEqual(node.arcKeys, ['convos_with_god','victors_record','full_timeline']);
  for (const key of ['convos_with_god','victors_record']) {
    const slugs = arcs[key].sections.flatMap(section => section.slugs || []);
    assert.equal(slugs.indexOf(SLUG), slugs.indexOf('witness-grade-return') + 1);
  }
  assert.equal(views[SLUG].title, 'The Pier House Dream');
  assert.equal(views[SLUG].scopes[0], 'pages.' + SLUG);
});

test('RECORD-READER-FOURTH-CONSUMER: every page i18n binding has an English source key', () => {
  const page = read('pages/' + SLUG + '.html');
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));
  const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
  for (const key of new Set(keys)) assert.ok(strings[key]?.strings?.en?.text, 'missing English source key ' + key);
});

// [VXG RealForever]
