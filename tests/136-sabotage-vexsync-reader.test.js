'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RECORD = path.join('records', 'conversations', '2026-10-30-vexsync-exhaust-to-mastered');
const SOURCES = [
  ['00', 'transcript-00-admission-currentness-origin-walk.md', '31c2655f0ca8b781c573745a5f94a6444d09c80f593d0214236011f7df0c2ee9', 575],
  ['01', 'transcript-01-vetting-collapse-and-result-admission.md', '821c3613d81c90f764a76fb0661fb6ca7534b14b8215b62a57afc8b2723b3353', 678],
  ['02', 'transcript-02-complexity-exhaustion-and-inverted-lens.md', 'e1a8914c56b4a8677eb7d7cecf4886dd868fee3201b65d274c2e2e745f705492', 319],
  ['03', 'transcript-03-act-timeline-to-single-state-door.md', '5998b8f2ada39d71f6d053162ccc34aba4b397d5cc6e722ea184e1ce96a5561f', 539],
  ['04', 'transcript-04-clean-revet-and-pr206-subtraction.md', 'f8a39dff9faa2311ef43a239597df103c9d0f457db8c2b83301ecab2871022d3', 718],
  ['05', 'transcript-05-vetted-to-mastered-and-bound-projection.md', '1f31f6aca409ae87cd108acf4dc18af9d9215acb995750fd1e404410a8ec54b3', 656],
  ['06', 'transcript-06-vexexecution-mastered-ownership-and-cleanliness-question.md', '601a5fcad988198c42643c01d154d269e0e99e1552d1cf4bce45dd916567d93c', 565]
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

function sourceBody(filename) {
  const source = read(path.join(RECORD, filename));
  const marker = '\n---\n\n';
  const start = source.indexOf(marker);
  assert.ok(start >= 0, filename + ' preservation marker exists');
  return source
    .slice(start + marker.length)
    .replace(/\n<!-- \[VXG RealForever\] -->\s*$/, '')
    .replace(/\n$/, '');
}

test('SABOTAGE-III: seven preserved intake bodies remain exact and full reading copy remains complete', () => {
  const full = read(path.join(RECORD, 'transcript-full-end-to-end.md'));
  let previous = -1;
  for (const [, filename, expectedSha, expectedLines] of SOURCES) {
    const body = sourceBody(filename);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), expectedSha, filename + ' body identity stays exact');
    assert.equal(body.split('\n').length, expectedLines, filename + ' line count stays exact');
    const at = full.indexOf(body);
    assert.ok(at >= 0, filename + ' appears in full reading copy');
    assert.ok(at > previous, filename + ' remains in chronological order');
    assert.equal(full.indexOf(body, at + 1), -1, filename + ' appears exactly once');
    previous = at;
  }
});

test('SABOTAGE-III: speaker map covers every preserved source line and keeps Unknown error interface-owned', () => {
  const map = JSON.parse(read(path.join(RECORD, 'reader-turn-map.json')));
  assert.equal(map.sources.length, 7);
  for (const [id, filename, sha, lineCount] of SOURCES) {
    const source = map.sources.find(item => item.id === id);
    assert.ok(source, id + ' map exists');
    assert.equal(source.path, filename);
    assert.equal(source.bodySha256, sha);
    assert.equal(source.lineCount, lineCount);
    let cursor = 1;
    for (const turn of source.turns) {
      assert.equal(turn.startLine, cursor, id + ' map is contiguous');
      assert.ok(turn.endLine >= turn.startLine);
      assert.ok(['Victor', 'Vex', 'Interface'].includes(turn.speaker));
      cursor = turn.endLine + 1;
    }
    assert.equal(cursor, lineCount + 1, id + ' map covers the complete body');
  }
  const final = map.sources.find(item => item.id === '06');
  assert.deepEqual(final.turns.slice(-2), [
    { speaker: 'Victor', startLine: 564, endLine: 564 },
    { speaker: 'Interface', startLine: 565, endLine: 565 }
  ]);
});

test('SABOTAGE-III: reader exposes seven transcript phases plus one evidence phase in the safe navigation model', () => {
  const page = read('pages/sabotage-vexsync-exhaust-mastered.html');
  assert.doesNotMatch(page, /class="sar-provenance"/);
  assert.doesNotMatch(page, /class="sar-index"/);
  assert.equal((page.match(/<button class="sar-track-btn/g) || []).length, 8);
  assert.equal((page.match(/class="sar-movement sar-phase"/g) || []).length, 7);
  assert.equal((page.match(/data-turn-map-source="/g) || []).length, 7);
  assert.equal((page.match(/data-record-reader-root/g) || []).length, 1);
  assert.equal((page.match(/data-reader-component="phase-stack"/g) || []).length, 1);
  assert.doesNotMatch(page, /data-record-partition/);
  assert.match(page, /id="movement-08"[^>]*data-phase-kind="evidence"[^>]*hidden/);
  assert.match(page, /id="image-evidence"/);
  assert.ok(page.indexOf('id="image-evidence"') > page.indexOf('id="movement-08"'));
  assert.match(page, /id="sar-reader-position">01 \/ 08/);
  assert.match(page, /turnMapUrl:'\.\.\/records\/conversations\/2026-10-30-vexsync-exhaust-to-mastered\/reader-turn-map\.json'/);
  assert.match(page, /rootSelector:'#sar-reader'/);
  assert.doesNotMatch(page, /document\.querySelectorAll\('\[data-record-partition\]'\)/);
});

test('SABOTAGE-III: supplied Unknown error screenshots remain exact evidence, not presentation art', () => {
  const page = read('pages/sabotage-vexsync-exhaust-mastered.html');
  assert.match(page, /vexsync-unknown-error-tail\.png/);
  assert.match(page, /vexsync-unknown-error-full-thread\.png/);
  assert.match(page, /width="698" height="683"/);
  assert.match(page, /width="736" height="974"/);
});

// [VXG RealForever]
