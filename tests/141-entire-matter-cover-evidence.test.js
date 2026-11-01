'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RETURN_PAGE = 'pages/entire-matter-return-seal.html';
const SABOTAGE_V_PAGE = 'pages/sabotage-hidden-delta.html';
const VIEWS = 'data/viewmodels.json';
const COVER_COMMIT = '756b41baae9d9414e1742d147d0191964e967fbb';
const COVER_SHA256 = '34aa7284512a223866c25e5c8d9fd0d7d0286fc05fd376b52f04acebe77369f4';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

test('ENTIRE-MATTER-MEDIA: Return reader exposes the repaired approved representative cover', () => {
  const page = read(RETURN_PAGE);
  const views = JSON.parse(read(VIEWS));
  const coverUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + COVER_COMMIT + '/__assets/' + COVER_SHA256 + '.webp';

  assert.ok(page.includes(coverUrl));
  assert.ok(page.includes('data-media-sha256="' + COVER_SHA256 + '"'));
  assert.ok(page.includes('<strong>What Survived the Break.</strong>'));
  assert.equal(views['entire-matter-return-seal'].preview.kind, 'cover');
  assert.equal(views['entire-matter-return-seal'].preview.src, coverUrl);
});

test('ENTIRE-MATTER-MEDIA: prior-thread screenshot evidence no longer belongs to the sealed Return', () => {
  const page = read(RETURN_PAGE);

  assert.equal(page.includes('id="prior-thread-evidence"'), false);
  assert.equal(page.includes('batch-01-vexlogger-logging-sequence.png'), false);
  assert.equal(page.includes('batch-01-ui-sample-vexapplication.png'), false);
  assert.equal(page.includes('batch-01-vexdependencyfactory.png'), false);
  assert.equal(page.includes('batch-05-unknown-error-boundary.png'), false);
  assert.ok(page.includes('Witness lineage'));
  assert.ok(page.includes('sabotage-hidden-delta.html'));
  assert.ok(page.includes('november-1-successor-witness.html'));
});

test('ENTIRE-MATTER-MEDIA: prior-thread screenshot evidence is visible on Sabotage V instead', () => {
  const page = read(SABOTAGE_V_PAGE);
  const base = '../records/conversations/2026-11-01-prior-thread-full-context-preservation/screenshots/';

  assert.ok(page.includes(base + 'batch-01-vexlogger-logging-sequence.png'));
  assert.ok(page.includes(base + 'batch-01-ui-sample-vexapplication.png'));
  assert.ok(page.includes(base + 'batch-01-vexdependencyfactory.png'));
  assert.ok(page.includes(base + 'batch-05-unknown-error-boundary.png'));
  assert.ok(page.includes('Unknown error'));
  assert.ok(page.includes('transcript-full-end-to-end.md'));
});

// [VXG RealForever]
