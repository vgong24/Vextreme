'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RETURN_PAGE = 'pages/entire-matter-return-seal.html';
const SABOTAGE_V_PAGE = 'pages/sabotage-hidden-delta.html';
const VIEWS = 'data/viewmodels.json';

const ORIGINAL_COMMIT = '0112ddb696f9b604402809fb945f2e2e88ad1359';
const ORIGINAL_SHA = '96269d955043540d2eda8a8e973be9307c691bec816fdb41be9b68b1b19a8cd9';
const REPAIR_COMMIT = '756b41baae9d9414e1742d147d0191964e967fbb';
const REPAIR_SHA = '34aa7284512a223866c25e5c8d9fd0d7d0286fc05fd376b52f04acebe77369f4';

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }

test('ENTIRE-MATTER-MEDIA: original archival media identity and later display repair remain visibly distinct', () => {
  const page = read(RETURN_PAGE);
  const strings = json('data/strings/source/pages/entire-matter-return-seal.json');
  const views = json(VIEWS);
  const originalUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + ORIGINAL_COMMIT + '/__assets/' + ORIGINAL_SHA + '.webp';
  const repairUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + REPAIR_COMMIT + '/__assets/' + REPAIR_SHA + '.webp';

  assert.ok(page.includes(originalUrl), 'Return restores original archived media identity');
  assert.ok(page.includes('data-media-sha256="' + ORIGINAL_SHA + '"'));
  assert.ok(page.includes(repairUrl), 'Return retains the later valid repair as a distinct route');
  assert.match(page, /original archived representative-media identity/i);
  assert.match(page, /display repair/i);

  const provenance = strings._meta.sourceProvenance;
  assert.equal(provenance.representativeMediaOriginalTarget, originalUrl);
  assert.equal(provenance.representativeMediaOriginalSha256, ORIGINAL_SHA);
  assert.equal(provenance.representativeMediaRepairTarget, repairUrl);
  assert.equal(provenance.representativeMediaRepairSha256, REPAIR_SHA);
  assert.equal(provenance.representativeMediaRelationship, 'ORIGINAL_ARCHIVAL_IDENTITY_WITH_SEPARATE_DISPLAY_REPAIR');

  // Terrain/discovery may use the valid repair without rewriting the Return's archival identity.
  assert.equal(views['entire-matter-return-seal'].preview.src, repairUrl);
});

test('ENTIRE-MATTER-MEDIA: Return carries the exact inherited prior-thread evidence instead of erasing it', () => {
  const page = read(RETURN_PAGE);
  const base = '../records/conversations/2026-11-01-current-thread-entire-matter-return-seal/evidence/prior-thread/';

  assert.ok(page.includes('id="prior-thread-evidence"'));
  for (const filename of [
    'batch-01-vexlogger-logging-sequence.png',
    'batch-01-ui-sample-vexapplication.png',
    'batch-01-vexdependencyfactory.png',
    'batch-05-unknown-error-boundary.png',
  ]) {
    assert.ok(page.includes(base + filename), filename + ' remains visible in the Return');
  }
  assert.match(page, /Evidence carried into the return/);
  assert.match(page, /inherited mirrors/i);
  assert.ok(page.includes('sabotage-hidden-delta.html'));
  assert.ok(page.includes('november-1-successor-witness.html'));
});

test('ENTIRE-MATTER-MEDIA: inherited display does not transfer Sabotage V provenance ownership', () => {
  const returnPage = read(RETURN_PAGE);
  const sabotageV = read(SABOTAGE_V_PAGE);
  const sourceBase = 'records/conversations/2026-11-01-prior-thread-full-context-preservation/screenshots/';

  for (const filename of [
    'batch-01-vexlogger-logging-sequence.png',
    'batch-01-ui-sample-vexapplication.png',
    'batch-01-vexdependencyfactory.png',
    'batch-05-unknown-error-boundary.png',
  ]) {
    assert.ok(sabotageV.includes(sourceBase + filename), filename + ' remains source-owned/displayed by Sabotage V');
  }

  assert.match(returnPage, /provenance are owned by Sabotage V/i);
  assert.match(returnPage, /without transferring source ownership/i);
});

// [VXG RealForever]
