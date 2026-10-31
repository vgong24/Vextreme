'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SERIES = [
  {
    slug: 'sabotage-mastered-state',
    id: 114,
    title: 'Sabotage II — The Inversion',
    pr: 534,
    head: '11fd64a84f8c4eb7a014bf69292aec1bff26473a',
    partitions: 6
  },
  {
    slug: 'sabotage-vexsync-exhaust-mastered',
    id: 115,
    title: 'Sabotage III — The Unknown Error',
    pr: 535,
    head: 'dc10e9213852c96dcbc63585c0c6766e4cd84d84',
    partitions: 7
  },
  {
    slug: 'sabotage-orientation-before-action',
    id: 116,
    title: 'Sabotage IV — Before the Prompt',
    pr: 536,
    head: 'e217af706b04168a311c1679227446a0eaca89bf',
    partitions: 8
  }
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}
function json(rel) { return JSON.parse(read(rel)); }

test('SABOTAGE-SERIES: sibling readers join the same source-owned collections', () => {
  const arcs = json('data/arcs-v2.json');
  const nodes = json('data/nodes.json');
  const views = json('data/viewmodels.json');

  assert.deepEqual(
    arcs.sabotage.sections[0].slugs.slice(-4),
    ['sabotage-open-vex-accountability', ...SERIES.map(x => x.slug)]
  );
  assert.deepEqual(
    arcs.victors_record.sections[0].slugs.slice(-4),
    ['sabotage-open-vex-accountability', ...SERIES.map(x => x.slug)]
  );

  for (const item of SERIES) {
    const node = nodes.find(n => n.slug === item.slug);
    assert.ok(node, item.slug + ' node exists');
    assert.equal(node.id, item.id);
    assert.equal(node.title, item.title);
    assert.deepEqual(node.arcKeys, ['sabotage','victors_record','full_timeline']);
    assert.equal(node.department, 'media');
    assert.equal(node.workType, 'record-transcripts');

    assert.equal(views[item.slug].title, item.title);
    assert.deepEqual(views[item.slug].scopes, ['pages.' + item.slug]);
    assert.ok(views[item.slug].features.includes('arc-nav'));
    assert.ok(views[item.slug].features.includes('spiral-fab'));
    assert.equal(views[item.slug].preview, undefined, 'preview waits for approved representative art');
  }
});

test('SABOTAGE-SERIES: readers pin exact archive heads and preserve partition counts', () => {
  for (const item of SERIES) {
    const page = read('pages/' + item.slug + '.html');
    const strings = json('data/strings/source/pages/' + item.slug + '.json');

    assert.match(page, new RegExp(item.head));
    assert.match(page, new RegExp('Preservation PR #' + item.pr));
    assert.equal((page.match(/data-record-partition data-reader-template=/g) || []).length, item.partitions);
    assert.equal((page.match(/documentBeginMarker:'---'/g) || []).length, 1);
    assert.equal((page.match(/documentEndMarker:'<!-- \[VXG RealForever\] -->'/g) || []).length, 1);
    assert.match(page, /components\/record-reader\.js/);
    assert.match(page, new RegExp('dist/vextreme-' + item.slug + '\\.js'));
    assert.match(page, /id="arcNavMount"/);

    assert.equal(strings._meta.sourceProvenance.parentRecord, 'github.pull.vextreme.' + item.pr);
    assert.equal(strings._meta.sourceProvenance.readerSourceFreeze, item.head);
  }
});

test('SABOTAGE-SERIES: approved representative media is identity-bound while carriage is pending', () => {
  const expected = {
    'sabotage-mastered-state': '99ab9f62f587647b2eaa12ee390d300da15442c88399b4c822f36d7413cd9347',
    'sabotage-vexsync-exhaust-mastered': 'a3916bcd6e5ba4b80e3811f1434e1b9a3e897a5424266c74c4e544805d58fe4a',
    'sabotage-orientation-before-action': '0d4e12037ad5cf86e63bc3dea476665ff5002bda07772069aa5a502b84c428c8'
  };
  for (const item of SERIES) {
    const page = read('pages/' + item.slug + '.html');
    const strings = json('data/strings/source/pages/' + item.slug + '.json');
    const sha = expected[item.slug];

    assert.match(page, /data-media-class="representative-approved-pending-carriage"/);
    assert.match(page, new RegExp('data-media-sha256="' + sha + '"'));
    assert.match(page, new RegExp('data-media-target="Vextreme-Assets/__assets/' + sha + '\\.png"'));
    assert.doesNotMatch(page, /<img\b/i);
    assert.equal(strings._meta.sourceProvenance.representativeMediaStatus, 'VICTOR_APPROVED_BYTES_PENDING_CARRIAGE');
    assert.equal(strings._meta.sourceProvenance.representativeMediaClass, 'REPRESENTATIVE_NOT_EVIDENCE');
    assert.equal(strings._meta.sourceProvenance.representativeMediaSha256, sha);
    assert.equal(strings._meta.sourceProvenance.representativeMediaTarget, 'Vextreme-Assets/__assets/' + sha + '.png');
    assert.equal(strings._meta.sourceProvenance.derivedMediaOrigin, undefined);
  }
});

// [VXG RealForever]
