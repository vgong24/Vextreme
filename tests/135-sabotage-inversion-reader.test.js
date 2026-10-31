'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RECORD = path.join('records', 'conversations', '2026-10-30-mastered-state-semantic-trajectory');
const SOURCES = [
  ['00', 'transcript-00-pr190-completion-and-context-drift.md', '9eb153037202acee2ff9fd59369dd5cdf6d71aa40bbfbb7c9cbf120aa963544c', 262],
  ['01', 'transcript-01-mastered-state-and-entry-integrity.md', 'f67330f50f6d3323775192495bd993387042a4093f301bb2596fe9dbc40d257b', 282],
  ['02', 'transcript-02-revert-continuity-and-rollback-accounting.md', '42cca691d4b9ca19392786b7416ea9c1b904f9d84bafe9718c974a9353816a54', 404],
  ['03', 'transcript-03-assumption-patterns-and-state-machine-reduction.md', '891c36080e5ab3ceb86e2eb7db5c18ad75fde62eaf977b0c28f657467972aa45', 258],
  ['04', 'transcript-04-recursive-sabotage-pattern-and-continuity-pressure.md', '8ce3174bf9e8618e7ad4bf41f39053fb8b670c5f3a7fc4ef42a221a45fe93af4', 569],
  ['05', 'transcript-05-delay-by-inhibition-vs-acceleration.md', 'ca8b686921e1d346b91a8187111403dddfda4a654d47674174247b7ec44ac32b', 326]
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

test('SABOTAGE-II: six preserved bodies remain exact and the one-file reading copy remains complete', () => {
  const full = read(path.join(RECORD, 'transcript-full-end-to-end.md'));
  let previous = -1;

  for (const [, filename, expectedSha, expectedLines] of SOURCES) {
    const body = sourceBody(filename);
    const sha = crypto.createHash('sha256').update(body).digest('hex');
    assert.equal(sha, expectedSha, filename + ' body identity stays exact');
    assert.equal(body.split('\n').length, expectedLines, filename + ' line count stays exact');

    const at = full.indexOf(body);
    assert.ok(at >= 0, filename + ' appears in the full reading copy');
    assert.ok(at > previous, filename + ' remains in chronological order');
    assert.equal(full.indexOf(body, at + 1), -1, filename + ' appears exactly once');
    previous = at;
  }
});

test('SABOTAGE-II: turn map is metadata-only and covers every preserved source line exactly once', () => {
  const map = JSON.parse(read(path.join(RECORD, 'reader-turn-map.json')));
  assert.equal(map.schemaVersion, 'vextreme.record-turn-map/v1');
  assert.equal(map.sources.length, SOURCES.length);

  for (const [id, filename, sha, lineCount] of SOURCES) {
    const source = map.sources.find(item => item.id === id);
    assert.ok(source, 'turn map source ' + id + ' exists');
    assert.equal(source.path, filename);
    assert.equal(source.bodySha256, sha);
    assert.equal(source.lineCount, lineCount);

    let cursor = 1;
    for (const turn of source.turns) {
      assert.equal(turn.startLine, cursor, id + ' turn coverage is contiguous');
      assert.ok(turn.endLine >= turn.startLine, id + ' turn range is non-empty');
      assert.ok(['Victor', 'Vex', 'Interface'].includes(turn.speaker), id + ' speaker is recognized');
      cursor = turn.endLine + 1;
    }
    assert.equal(cursor, lineCount + 1, id + ' covers the complete preserved body');
  }

  assert.equal(map.sources[0].turns.filter(turn => turn.speaker === 'Interface').length, 3);
  assert.equal(map.sources.slice(1).flatMap(source => source.turns).filter(turn => turn.speaker === 'Interface').length, 0);
});

test('SABOTAGE-II: reader uses one bounded selected phase with safe-view navigation', () => {
  const page = read('pages/sabotage-mastered-state.html');

  assert.doesNotMatch(page, /sar-page--continuous/);
  assert.equal((page.match(/<button class="sar-track-btn/g) || []).length, 6);
  assert.equal((page.match(/class="sar-movement sar-phase"/g) || []).length, 6);
  assert.equal((page.match(/class="sar-movement sar-phase"[^>]* hidden/g) || []).length, 5);
  assert.equal((page.match(/data-record-reader-root/g) || []).length, 1);
  assert.equal((page.match(/data-reader-component="phase-stack"/g) || []).length, 1);
  assert.doesNotMatch(page, /data-record-partition/);
  assert.match(page, /id="sar-reader-position">01 \/ 06/);
  assert.match(page, /id="sar-prev"[^>]*disabled/);
  assert.match(page, /id="sar-next"/);
  assert.doesNotMatch(page, /class="sar-provenance"/);
  assert.doesNotMatch(page, /class="sar-index"/);

  for (let i = 0; i < 6; i++) {
    const movement = String(i + 1).padStart(2, '0');
    const sourceId = String(i).padStart(2, '0');
    assert.match(page, new RegExp('id="movement-' + movement + '"[^>]*data-reader-component="phase"[^>]*data-turn-map-source="' + sourceId + '"[^>]*data-document-url="'));
    assert.match(page, new RegExp('id="sar-root-' + movement + '"[^>]*data-reader-component="preserved-record"'));
  }

  assert.match(page, /turnMapUrl:'\.\.\/records\/conversations\/2026-10-30-mastered-state-semantic-trajectory\/reader-turn-map\.json'/);
  const firstDocumentUrl = page.match(/id="movement-01"[^>]*data-document-url="([^"]+)"/)[1];
  assert.ok(page.includes('<link rel="preconnect" href="https://raw.githubusercontent.com" crossorigin>'));
  assert.ok(page.includes('<link rel="preload" href="' + firstDocumentUrl + '" as="fetch" crossorigin fetchpriority="high">'));
  assert.ok(page.includes('<link rel="preload" href="../records/conversations/2026-10-30-mastered-state-semantic-trajectory/reader-turn-map.json" as="fetch" crossorigin fetchpriority="high">'));
  assert.match(page, /rootSelector:'#sar-reader'/);
  assert.doesNotMatch(page, /document\.querySelectorAll\('\[data-record-partition\]'\)/);
  assert.match(page, /\.sar-source-window\{max-height:min\(70vh,760px\);overflow:auto/);
});

test('SABOTAGE-II: shared reader supports optional line-bound speaker projection without changing ordinary document rendering', () => {
  const reader = read('components/record-reader.js');
  const css = read('styles/sabotage-series-record.css');

  assert.match(reader, /var turnMapUrl=config\.turnMapUrl\|\|null/);
  assert.match(reader, /function renderTurnMappedDocument\(body,map,sourceId\)/);
  assert.match(reader, /function loadPhaseDocument\(section\)/);
  assert.match(reader, /section\.dataset\.documentUrl/);
  assert.match(reader, /loadPhaseDocument[\s\S]*installTranscriptControls\(section\)/);
  assert.match(reader, /data-reader-component="speaker-turn"/);
  assert.match(reader, /data-reader-component="interface-meta"/);
  assert.match(reader, /values\[1\]\?renderTurnMappedDocument\(body,values\[1\]\):renderDocument\(body\)/);

  assert.match(css, /\.sar-turn--victor/);
  assert.match(css, /\.sar-turn--vex/);
  assert.match(css, /\.sar-track\{position:sticky/);
  assert.match(css, /\.sar-reader-nav\{/);
});

// [VXG RealForever]
