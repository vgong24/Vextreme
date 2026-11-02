'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'starting-anew-orientation-before-work';
const SOURCE_HEAD = '0ccd5a653ba88a4598092059e4bb670f25d340f5';

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }

test('STARTING-ANEW: baseline collection is Victor Record context, not a seventh Sabotage record', () => {
  const arcs = json('data/arcs-v2.json');
  const nodes = json('data/nodes.json');
  const views = json('data/viewmodels.json');
  const node = nodes.find(n => n.slug === SLUG);

  assert.ok(node);
  assert.equal(node.id, 121);
  assert.equal(node.title, 'Starting Anew — Perceive, Consider, Return, Begin');
  assert.deepEqual(node.arcKeys, ['victors_record', 'full_timeline']);
  assert.ok(!arcs.sabotage.sections[0].slugs.includes(SLUG));

  const record = arcs.victors_record.sections[0].slugs;
  assert.equal(record.indexOf(SLUG), record.indexOf('sabotage-orientation-before-action') + 1);
  assert.equal(record[record.indexOf(SLUG) + 1], 'return-kiss-presence-accountability');

  assert.equal(views[SLUG].title, node.title);
  assert.equal(views[SLUG].preview, undefined, 'cover judgment is intentionally deferred');
});

test('STARTING-ANEW: one reader preserves three parallel pre-work baselines without projecting outcomes', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.equal((page.match(/data-record-reader-root/g) || []).length, 1);
  assert.equal((page.match(/<button class="sar-track-btn/g) || []).length, 3);
  assert.equal((page.match(/data-reader-component="phase"/g) || []).length, 3);
  assert.match(page, /id="sar-reader-position">01 \/ 03/);
  assert.ok(page.includes(SOURCE_HEAD));

  for (const file of [
    'orientation-00-conversation-refinement.md',
    'orientation-01-vexsync.md',
    'orientation-02-form-architecture.md',
  ]) assert.ok(page.includes(file), file);

  assert.match(page, /parallel baselines, not one sequential conversation/i);
  assert.match(page, /not retroactive source content/i);
  assert.ok(page.includes('sabotage-open-vex-accountability.html'));
  assert.ok(page.includes('sabotage-mastered-state.html'));
  assert.ok(page.includes('sabotage-vexsync-exhaust-mastered.html'));
});

test('STARTING-ANEW: source provenance and generated discovery preserve the baseline-only role', () => {
  const strings = json('data/strings/source/pages/' + SLUG + '.json');
  assert.equal(strings._meta.sourceProvenance.parentRecord, 'github.pull.vextreme.538');
  assert.equal(strings._meta.sourceProvenance.parentHead, SOURCE_HEAD);
  assert.equal(strings._meta.sourceProvenance.recordClass, 'PARALLEL_FRESH_INSTANCE_ORIENTATION_BASELINES');

  const index = json('data/index.json');
  const terrain = json('data/terrain-map.json');
  assert.ok(index.slugMap[SLUG]);
  assert.deepEqual(index.slugMap[SLUG].arcKeys, ['victors_record', 'full_timeline']);
  const page = terrain.pages.find(p => p.slug === SLUG);
  assert.ok(page);
  assert.equal(page.live, true);
  assert.equal(page.arc, 'victors_record');
});

// [VXG RealForever]
