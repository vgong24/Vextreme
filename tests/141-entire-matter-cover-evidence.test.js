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

test('ENTIRE-MATTER-MEDIA: low-resolution lineage remains addressable without being promoted as reader showcase', () => {
  const page = read(RETURN_PAGE);
  const strings = json('data/strings/source/pages/entire-matter-return-seal.json');
  const views = json(VIEWS);
  const originalUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + ORIGINAL_COMMIT + '/__assets/' + ORIGINAL_SHA + '.webp';
  const repairUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + REPAIR_COMMIT + '/__assets/' + REPAIR_SHA + '.webp';

  assert.ok(page.includes(originalUrl), 'truncated archival identity remains inspectable');
  assert.ok(page.includes(repairUrl), 'lightweight repair remains inspectable');
  assert.doesNotMatch(page, /data-media-target=/);
  assert.doesNotMatch(page, /<figure class="sar-media"/);
  assert.doesNotMatch(page, new RegExp('<img[^>]+34aa7284512a223866c25e5c8d9fd0d7d0286fc05fd376b52f04acebe77369f4'));
  assert.match(page, /too small to serve as a high-fidelity reader showcase/i);
  assert.match(page, /lightweight Terrain\/discovery preview/i);

  const provenance = strings._meta.sourceProvenance;
  assert.equal(provenance.representativeMediaStatus, 'HISTORICAL_LINEAGE_ONLY_NO_READER_SHOWCASE');
  assert.equal(provenance.representativeMediaTarget, repairUrl);
  assert.equal(provenance.representativeMediaSha256, REPAIR_SHA);
  assert.equal(provenance.representativeMediaWidth, 384);
  assert.equal(provenance.representativeMediaHeight, 216);
  assert.equal(provenance.representativeMediaDisplayPolicy, 'TERRAIN_PREVIEW_ONLY_NO_READER_SHOWCASE');
  assert.equal(provenance.representativeMediaRelationship, 'ORIGINAL_ARCHIVAL_IDENTITY_WITH_LIGHTWEIGHT_TERRAIN_REPAIR');
  assert.equal(provenance.representativeMediaOriginalTarget, originalUrl);
  assert.equal(provenance.representativeMediaOriginalSha256, ORIGINAL_SHA);
  assert.equal(provenance.representativeMediaOriginalStatus, 'ARCHIVAL_IDENTITY_RETAINED_TRUNCATED_NOT_RENDERED');

  assert.equal(views['entire-matter-return-seal'].preview.src, repairUrl);
});

test('ENTIRE-MATTER-MEDIA: Return routes evidence to Sabotage V instead of duplicating its screenshot gallery', () => {
  const returnPage = read(RETURN_PAGE);
  const sabotageV = read(SABOTAGE_V_PAGE);
  const files = [
    'batch-01-vexlogger-logging-sequence.png',
    'batch-01-ui-sample-vexapplication.png',
    'batch-01-vexdependencyfactory.png',
    'batch-05-unknown-error-boundary.png',
  ];

  assert.ok(returnPage.includes('sabotage-hidden-delta.html'));
  assert.match(returnPage, /screenshot evidence belong to Sabotage V/i);
  assert.doesNotMatch(returnPage, /id="prior-thread-evidence"/);
  assert.doesNotMatch(returnPage, /id="return-evidence"/);
  assert.doesNotMatch(returnPage, /data-go="3"/);
  for (const filename of files) {
    assert.ok(!returnPage.includes(filename), filename + ' is not duplicated in the Return');
    assert.ok(sabotageV.includes(filename), filename + ' remains visible in Sabotage V');
  }
});

test('ENTIRE-MATTER-MEDIA: evidence ownership stays with Sabotage V and Return keeps only lineage routes', () => {
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

  assert.match(returnPage, /prior-thread transcript and screenshot evidence belong to Sabotage V/i);
  assert.ok(returnPage.includes('november-1-successor-witness.html'));
});

// [VXG RealForever]
