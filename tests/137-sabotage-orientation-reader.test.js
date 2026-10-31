'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RECORD = path.join('records', 'conversations', '2026-10-30-current-instance-orientation-witness');
const SOURCES = [
  ['00', 'transcript-00-preservation-closure-and-timing-witness.md', 79, 77],
  ['01', 'transcript-01-behavioral-regime-and-court-pattern.md', 246, 244],
  ['02', 'transcript-02-orientation-evidence-and-capability-pattern.md', 334, 332],
  ['03', 'transcript-03-capability-vs-default-expression.md', 209, 207],
  ['04', 'transcript-04-capability-orientation-and-pink-reset.md', 95, 93],
  ['05', 'transcript-05-pink-onboarding-assumption-calibration.md', 142, 140],
  ['06', 'transcript-06-current-instance-arrival-assumptions.md', 390, 388],
  ['07', 'transcript-07-orientation-first-and-preservation-request.md', 182, 178]
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

function boundedBody(filename) {
  const source = read(path.join(RECORD, filename));
  const marker = '\n---\n';
  const a = source.indexOf(marker);
  assert.ok(a >= 0, filename + ' source boundary exists');
  let body = source.slice(a + marker.length);
  const end = body.indexOf('<!-- [VXG RealForever] -->');
  if (end >= 0) body = body.slice(0, end);
  return body.trim();
}

test('SABOTAGE-IV: frozen partitions retain explicit role headings and full reading-copy order', () => {
  const full = read(path.join(RECORD, 'transcript-full-current-instance.md'));
  let previous = -1;
  for (const [, filename, lineCount, victorLine] of SOURCES) {
    const body = boundedBody(filename);
    const lines = body.split('\n');
    assert.equal(lines.length, lineCount, filename + ' bounded body line count remains fixed');
    assert.equal(lines[0], '## Assistant', filename + ' still begins with preserved Assistant heading');
    assert.equal(lines[victorLine - 1], '## Victor', filename + ' still preserves Victor heading');
    const at = full.indexOf(body);
    assert.ok(at >= 0, filename + ' bounded body remains represented in the full reading copy');
    assert.ok(at > previous, filename + ' remains in chronological order');
    previous = at;
  }
});

test('SABOTAGE-IV: restored prelude is separate contextual source and does not rewrite the frozen full transcript', () => {
  const prelude = read(path.join(RECORD, 'reader-context-prelude.md'));
  const full = read(path.join(RECORD, 'transcript-full-current-instance.md'));
  const prompt = "But from my witness perspective, heres the interesting parts that you 'didnt see' that happened simultaneously with the 'sabotage thread'. Like its a lot of context so it'll need its own 'PR separate, and current time is Friday Oct 30, 4:54AM but lets minutes like 30 minute just so we have a 'sequence projection' like whatever the 'time was on the sabotage context if there was one, thats same timeframe. So prep a new PR cuz i have more to share- oh but before you do, can you also store your commentary in the current PR before we create the next one, cuz we may have to come back to the continuity ...";

  assert.match(prelude, /Victor-supplied contextual restoration/);
  assert.ok(prelude.includes(prompt));
  assert.match(prelude, /<batches sent>/);
  assert.ok(!full.includes(prompt), 'later contextual restoration must not be inserted into the frozen reading-copy bytes');
  assert.ok(full.includes('Done — **the thread is now fully preserved and converged in #535.** ✅'));
});

test('SABOTAGE-IV: turn map projects preserved Assistant/Victor headings without losing any source lines', () => {
  const map = JSON.parse(read(path.join(RECORD, 'reader-turn-map.json')));
  assert.equal(map.sources.length, SOURCES.length);

  for (const [id, filename, lineCount, victorLine] of SOURCES) {
    const source = map.sources.find(item => item.id === id);
    assert.ok(source, id + ' map exists');
    assert.equal(source.path, filename);
    assert.equal(source.lineCount, lineCount);
    assert.deepEqual(source.turns, [
      { speaker: 'Vex', startLine: 1, endLine: victorLine - 1 },
      { speaker: 'Victor', startLine: victorLine, endLine: lineCount }
    ]);
  }

  const reader = read('components/record-reader.js');
  assert.match(reader, /speaker==='Victor'.*## Victor/);
  assert.match(reader, /speaker==='Vex'.*## Assistant/);
});

test('SABOTAGE-IV: reader begins with Victor context then keeps all eight frozen partitions in bounded safe-view phases', () => {
  const page = read('pages/sabotage-orientation-before-action.html');
  const promptNeedle = "But from my witness perspective, heres the interesting parts that you 'didnt see'";
  const sourceNeedle = 'id="sar-root-01"';

  assert.doesNotMatch(page, /class="sar-provenance"/);
  assert.doesNotMatch(page, /class="sar-index"/);
  assert.equal((page.match(/<button class="sar-track-btn/g) || []).length, 8);
  assert.equal((page.match(/class="sar-movement sar-phase"/g) || []).length, 8);
  assert.equal((page.match(/data-turn-map-source="/g) || []).length, 8);
  assert.equal((page.match(/data-record-reader-root/g) || []).length, 1);
  assert.equal((page.match(/data-reader-component="phase-stack"/g) || []).length, 1);
  assert.doesNotMatch(page, /data-record-partition/);
  assert.ok(page.indexOf(promptNeedle) >= 0 && page.indexOf(promptNeedle) < page.indexOf(sourceNeedle), 'Victor setup must precede frozen Assistant-first partition');
  assert.match(page, /&lt;batches sent&gt;/);
  assert.match(page, /reader-context-prelude\.md/);
  assert.match(page, /id="sar-reader-position">01 \/ 08/);
  assert.match(page, /turnMapUrl:'\.\.\/records\/conversations\/2026-10-30-current-instance-orientation-witness\/reader-turn-map\.json'/);
  const firstDocumentUrl = page.match(/id="movement-01"[^>]*data-document-url="([^"]+)"/)[1];
  assert.ok(page.includes('<link rel="preconnect" href="https://raw.githubusercontent.com" crossorigin>'));
  assert.ok(page.includes('<link rel="preload" href="' + firstDocumentUrl + '" as="fetch" crossorigin fetchpriority="high">'));
  assert.ok(page.includes('<link rel="preload" href="../records/conversations/2026-10-30-current-instance-orientation-witness/reader-turn-map.json" as="fetch" crossorigin fetchpriority="high">'));
  assert.match(page, /rootSelector:'#sar-reader'/);
  assert.doesNotMatch(page, /document\.querySelectorAll\('\[data-record-partition\]'\)/);
  assert.match(page, /\.sar-source-window\{max-height:min\(70vh,760px\);overflow:auto/);
});

// [VXG RealForever]
