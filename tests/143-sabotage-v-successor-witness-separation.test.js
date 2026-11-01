'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SAB_V = 'sabotage-hidden-delta';
const WITNESS = 'november-1-successor-witness';
const RETURN = 'entire-matter-return-seal';
const SOURCE_HEAD = 'bce54f533fe7f766f68538b2dc355280269831ab';
const THREAD = 'https://chatgpt.com/share/6ae70af9-e41c-83e8-a537-04a8fc18531f';
const FIXED_COVER = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/756b41baae9d9414e1742d147d0191964e967fbb/__assets/34aa7284512a223866c25e5c8d9fd0d7d0286fc05fd376b52f04acebe77369f4.webp';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}
function json(rel) {
  return JSON.parse(read(rel));
}

test('SABOTAGE-V-SEPARATION: Sabotage primary arc ends at the prior-thread record, not the sealed Return', () => {
  const arcs = json('data/arcs-v2.json');
  const tail = arcs.sabotage.sections[0].slugs.slice(-5);

  assert.deepEqual(tail, [
    'sabotage-open-vex-accountability',
    'sabotage-mastered-state',
    'sabotage-vexsync-exhaust-mastered',
    'sabotage-orientation-before-action',
    SAB_V
  ]);
  assert.ok(!arcs.sabotage.sections[0].slugs.includes(RETURN));

  const victorTail = arcs.victors_record.sections[0].slugs.slice(-7);
  assert.deepEqual(victorTail, [
    'sabotage-open-vex-accountability',
    'sabotage-mastered-state',
    'sabotage-vexsync-exhaust-mastered',
    'sabotage-orientation-before-action',
    SAB_V,
    WITNESS,
    RETURN
  ]);
});

test('SABOTAGE-V-SEPARATION: node ownership preserves distinct record classes', () => {
  const nodes = json('data/nodes.json');
  const bySlug = Object.fromEntries(nodes.map(node => [node.slug, node]));

  assert.deepEqual(bySlug[SAB_V].arcKeys, ['sabotage', 'victors_record', 'full_timeline']);
  assert.deepEqual(bySlug[WITNESS].arcKeys, ['victors_record', 'full_timeline']);
  assert.deepEqual(bySlug[RETURN].arcKeys, ['victors_record', 'full_timeline']);
  assert.equal(bySlug[SAB_V].title, 'Sabotage V — The Hidden Delta');
  assert.equal(bySlug[WITNESS].title, 'November 1 Successor Witness — Context Map');
});

test('SABOTAGE-V-SEPARATION: Sabotage V projects the full frozen transcript and its own evidence', () => {
  const page = read('pages/' + SAB_V + '.html');
  const sourceBase = 'https://raw.githubusercontent.com/vgong24/Vextreme/' + SOURCE_HEAD + '/records/conversations/2026-11-01-prior-thread-full-context-preservation';

  assert.ok(page.includes(sourceBase + '/transcript-full-end-to-end.md'));
  assert.ok(page.includes(sourceBase + '/screenshots/batch-01-vexlogger-logging-sequence.png'));
  assert.ok(page.includes(sourceBase + '/screenshots/batch-01-ui-sample-vexapplication.png'));
  assert.ok(page.includes(sourceBase + '/screenshots/batch-01-vexdependencyfactory.png'));
  assert.ok(page.includes(sourceBase + '/screenshots/batch-05-unknown-error-boundary.png'));
  assert.ok(page.includes('november-1-successor-witness.html'));
  assert.ok(page.includes('Unknown error'));
});

test('SABOTAGE-V-SEPARATION: successor witness maps conversational referents without claiming a local full-thread copy', () => {
  const page = read('pages/' + WITNESS + '.html');
  const map = read('records/commentary/2026-11-01-successor-witness-context-map.md');

  assert.ok(page.includes(THREAD));
  assert.ok(map.includes(THREAD));
  assert.match(map, /“this thread” \/ “this conversation”/);
  assert.match(map, /“the prior thread”/);
  assert.match(map, /“the sabotage pages”/);
  assert.match(map, /“the Return”/);
  assert.match(map, /## Section-by-section referent map/);
  assert.match(map, /Victor’s 1:47 AM seal/);
  assert.match(map, /does not claim that Vextreme fetched or reproduced inaccessible ChatGPT share-page bytes/i);

  for (const slug of [
    'sabotage-open-vex-accountability',
    'sabotage-mastered-state',
    'sabotage-vexsync-exhaust-mastered',
    'sabotage-orientation-before-action'
  ]) {
    assert.ok(map.includes('/pages/' + slug + '.html'));
  }
});

test('SABOTAGE-V-SEPARATION: Return is a sealed disposition with backward lineage, not the prior-thread evidence owner', () => {
  const page = read('pages/' + RETURN + '.html');
  const views = json('data/viewmodels.json');

  assert.ok(!page.includes('id="prior-thread-evidence"'));
  assert.ok(page.includes('Witness lineage'));
  assert.ok(page.includes('sabotage-hidden-delta.html'));
  assert.ok(page.includes('november-1-successor-witness.html'));
  assert.ok(page.includes(FIXED_COVER));
  assert.equal(views[RETURN].preview.src, FIXED_COVER);

  assert.deepEqual(views[SAB_V].scopes, ['pages.' + SAB_V]);
  assert.deepEqual(views[WITNESS].scopes, ['pages.' + WITNESS]);
});

// [VXG RealForever]
