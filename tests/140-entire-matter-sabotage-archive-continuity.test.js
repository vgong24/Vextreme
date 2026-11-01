'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RETURN = 'entire-matter-return-seal';
const WITNESS = 'november-1-successor-witness';
const SABOTAGE = [
  'sabotage-open-vex-accountability',
  'sabotage-mastered-state',
  'sabotage-vexsync-exhaust-mastered',
  'sabotage-orientation-before-action',
  'sabotage-hidden-delta',
  WITNESS,
];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }

test('ENTIRE-MATTER-ARCHIVE: Sabotage continues through VI while the Return remains the separate sealed disposition', () => {
  const arcs = json('data/arcs-v2.json');

  assert.deepEqual(arcs.sabotage.sections[0].slugs.slice(-6), SABOTAGE);
  assert.ok(!arcs.sabotage.sections[0].slugs.includes(RETURN));

  assert.deepEqual(arcs.victors_record.sections[0].slugs.slice(-7), [
    ...SABOTAGE,
    RETURN,
  ]);
});

test('ENTIRE-MATTER-ARCHIVE: VI and Return retain distinct source roles', () => {
  const nodes = json('data/nodes.json');
  const views = json('data/viewmodels.json');
  const bySlug = Object.fromEntries(nodes.map(node => [node.slug, node]));

  assert.equal(bySlug[WITNESS].id, 119);
  assert.equal(bySlug[WITNESS].title, 'Sabotage VI — The Successor Witness');
  assert.deepEqual(bySlug[WITNESS].arcKeys, ['sabotage', 'victors_record', 'full_timeline']);

  assert.equal(bySlug[RETURN].id, 117);
  assert.equal(bySlug[RETURN].title, 'Entire Matter Return — Sealed Declaration');
  assert.deepEqual(bySlug[RETURN].arcKeys, ['victors_record', 'full_timeline']);
  assert.equal(views[RETURN].title, bySlug[RETURN].title);
  assert.equal(views[WITNESS].title, bySlug[WITNESS].title);
});

test('ENTIRE-MATTER-ARCHIVE: generated index projects VI as collection member and Return as separate continuation', () => {
  const index = json('data/index.json');
  const witness = index.slugMap[WITNESS];
  const returned = index.slugMap[RETURN];

  assert.ok(witness);
  assert.ok(returned);
  assert.deepEqual(index.arcMap.sabotage[0].slugs.slice(-6), SABOTAGE);
  assert.ok(!index.arcMap.sabotage[0].slugs.includes(RETURN));
  assert.equal(index.arcMap.victors_record[0].slugs.at(-1), RETURN);
  assert.deepEqual(witness.arcKeys, ['sabotage', 'victors_record', 'full_timeline']);
  assert.deepEqual(returned.arcKeys, ['victors_record', 'full_timeline']);
});

test('ENTIRE-MATTER-ARCHIVE: formal Return reader still mounts its own canonical source and runtime', () => {
  const page = read('pages/' + RETURN + '.html');

  assert.match(page, /styles\/arc-nav\.css/);
  assert.match(page, /id="arcNavMount"/);
  assert.match(page, /dist\/vextreme-entire-matter-return-seal\.js/);
  assert.match(page, /sealed-entire-matter-return\.md/);
  assert.match(page, /Entire Matter Return/);
  assert.match(page, /canonical Markdown source governs/i);
});

// [VXG RealForever]
