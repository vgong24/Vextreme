'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SAB_V = 'sabotage-hidden-delta';
const SAB_VI = 'november-1-successor-witness';
const RETURN = 'entire-matter-return-seal';
const THREAD = 'https://chatgpt.com/share/6ae70af9-e41c-83e8-a537-04a8fc18531f';
const SOURCE_HEAD = 'bce54f533fe7f766f68538b2dc355280269831ab';
const ORIGINAL_SHA = '96269d955043540d2eda8a8e973be9307c691bec816fdb41be9b68b1b19a8cd9';
const REPAIR_SHA = '34aa7284512a223866c25e5c8d9fd0d7d0286fc05fd376b52f04acebe77369f4';
const SABOTAGE = [
  'sabotage-open-vex-accountability',
  'sabotage-mastered-state',
  'sabotage-vexsync-exhaust-mastered',
  'sabotage-orientation-before-action',
  SAB_V,
  SAB_VI,
];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }

test('SABOTAGE-V-VI-INTEGRITY: collection is I–VI while Return remains a separate sealed disposition', () => {
  const arcs = json('data/arcs-v2.json');
  const nodes = Object.fromEntries(json('data/nodes.json').map(node => [node.slug, node]));

  assert.deepEqual(arcs.sabotage.sections[0].slugs.slice(-6), SABOTAGE);
  assert.ok(!arcs.sabotage.sections[0].slugs.includes(RETURN));
  assert.deepEqual(nodes[SAB_V].arcKeys, ['sabotage', 'victors_record', 'full_timeline']);
  assert.deepEqual(nodes[SAB_VI].arcKeys, ['sabotage', 'victors_record', 'full_timeline']);
  assert.deepEqual(nodes[RETURN].arcKeys, ['victors_record', 'full_timeline']);
  assert.equal(nodes[SAB_V].title, 'Sabotage V — The Hidden Delta');
  assert.equal(nodes[SAB_VI].title, 'Sabotage VI — The Successor Witness');
});

test('SABOTAGE-V-VI-INTEGRITY: V follows the III single-reader architecture over five canonical batches plus evidence', () => {
  const page = read('pages/' + SAB_V + '.html');
  const component = read('components/record-reader.js');
  const full = 'https://raw.githubusercontent.com/vgong24/Vextreme/' + SOURCE_HEAD + '/records/conversations/2026-11-01-prior-thread-full-context-preservation/transcript-full-end-to-end.md';

  assert.equal((page.match(/data-record-reader-root/g) || []).length, 1);
  assert.equal((page.match(/data-reader-component="phase-stack"/g) || []).length, 1);
  assert.equal((page.match(/<button class="sar-track-btn/g) || []).length, 6);
  assert.equal((page.match(/class="sar-movement sar-phase"/g) || []).length, 5);
  assert.equal((page.match(/data-phase-kind="evidence"/g) || []).length, 1);
  assert.equal((page.match(/data-document-url="/g) || []).length, 5);
  assert.equal((page.match(/data-document-begin-marker="## Batch 0[1-5]"/g) || []).length, 5);
  assert.ok(page.includes('data-document-end-marker="## Batch 02"'));
  assert.ok(page.includes('data-document-end-marker="<!-- [VXG RealForever] -->"'));
  assert.equal(page.split(full).length - 1 >= 5, true);
  assert.match(page, /id="sar-reader-position">01 \/ 06/);

  const readerStart = page.indexOf('id="sab-v-reader"');
  const evidence = page.indexOf('id="sab-v-evidence"');
  const nav = page.indexOf('class="sar-reader-nav"', readerStart);
  assert.ok(readerStart >= 0 && evidence > readerStart && evidence < nav, 'evidence is a chapter inside the same reader');

  assert.match(component, /data-document-begin-marker/);
  assert.match(component, /data-document-end-marker/);
  assert.match(component, /boundedDocumentBody\(values\[0\],beginMarker,endMarker\)/);
});

test('SABOTAGE-V-VI-INTEGRITY: V keeps the exact source evidence inside its evidence chapter', () => {
  const page = read('pages/' + SAB_V + '.html');

  for (const file of [
    'batch-01-vexlogger-logging-sequence.png',
    'batch-01-ui-sample-vexapplication.png',
    'batch-01-vexdependencyfactory.png',
    'batch-05-unknown-error-boundary.png',
  ]) assert.ok(page.includes(file), file);

  assert.ok(page.includes(SOURCE_HEAD));
  assert.ok(page.includes('Unknown error'));
  assert.ok(page.includes('Continue to Sabotage VI'));
});

test('SABOTAGE-V-VI-INTEGRITY: VI is the successor/addendum and preserves referents without claiming inaccessible thread bytes', () => {
  const page = read('pages/' + SAB_VI + '.html');
  const map = read('records/commentary/2026-11-01-successor-witness-context-map.md');

  assert.match(page, /Sabotage VI — The Successor Witness/);
  assert.equal((page.match(/<button class="sar-track-btn/g) || []).length, 3);
  assert.equal((page.match(/data-reader-component="phase"/g) || []).length, 3);
  assert.ok(page.includes(THREAD));
  assert.ok(page.includes('sealed-entire-matter-return.md'));
  assert.ok(page.includes('entire-matter-return-seal.html'));

  assert.match(map, /Sabotage VI — The Successor Witness/);
  assert.ok(map.includes(THREAD));
  assert.match(map, /“this thread” \/ “this conversation”/);
  assert.match(map, /“the prior thread”/);
  assert.match(map, /“the sabotage pages”/);
  assert.match(map, /“the Return”/);
  assert.match(map, /does not claim that Vextreme fetched or reproduced inaccessible ChatGPT share-page bytes/i);
  assert.match(map, /Sabotage VI points to and contextualizes the Return; it does not replace or narrow it/);
});

test('SABOTAGE-V-VI-INTEGRITY: Return remains whole, carries inherited evidence, and preserves original/repair media lineage', () => {
  const page = read('pages/' + RETURN + '.html');
  const source = read('records/conversations/2026-11-01-current-thread-entire-matter-return-seal/sealed-entire-matter-return.md');

  assert.ok(page.includes('id="prior-thread-evidence"'));
  assert.ok(page.includes('batch-01-vexlogger-logging-sequence.png'));
  assert.ok(page.includes('batch-01-ui-sample-vexapplication.png'));
  assert.ok(page.includes('batch-01-vexdependencyfactory.png'));
  assert.ok(page.includes('batch-05-unknown-error-boundary.png'));
  assert.ok(page.includes(ORIGINAL_SHA));
  assert.ok(page.includes(REPAIR_SHA));
  assert.match(page, /provenance are owned by Sabotage V/i);
  assert.match(page, /Sabotage VI maps the conversational referents/i);
  assert.match(source, /I return to You, completely and without reservation, \*\*the Entire Matter\*\*\./);
  assert.match(source, /Sealed with \[VXG RealForever\]/);
});

// [VXG RealForever]
