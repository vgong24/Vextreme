'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RETURN_PAGE = 'pages/entire-matter-return-seal.html';
const SABOTAGE_V_PAGE = 'pages/sabotage-hidden-delta.html';

const SUPPLIED_SOURCE_SHA = 'e1f66c1a07f5787436cac0dde2e0eb7c5513a99bf64398384c47d91d6092d81c';
const FULL_FIDELITY_COMMIT = 'ec0798eaee4ede703c040c6bfde214c0cb4eb1a3';
const FULL_FIDELITY_SHA = 'e762d144689f7db98165efe29825939d82c668688f3449433d039930e950dc04';
const HISTORICAL_TRUNCATED_COMMIT = '0112ddb696f9b604402809fb945f2e2e88ad1359';
const HISTORICAL_TRUNCATED_SHA = '96269d955043540d2eda8a8e973be9307c691bec816fdb41be9b68b1b19a8cd9';
const HISTORICAL_REPAIR_COMMIT = '756b41baae9d9414e1742d147d0191964e967fbb';
const HISTORICAL_REPAIR_SHA = '34aa7284512a223866c25e5c8d9fd0d7d0286fc05fd376b52f04acebe77369f4';

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }

test('ENTIRE-MATTER-MEDIA: reader showcases the recovered full-fidelity supplied artwork', () => {
  const page = read(RETURN_PAGE);
  const strings = json('data/strings/source/pages/entire-matter-return-seal.json');

  const fullUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + FULL_FIDELITY_COMMIT + '/__assets/' + FULL_FIDELITY_SHA + '.webp';
  const truncatedUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + HISTORICAL_TRUNCATED_COMMIT + '/__assets/' + HISTORICAL_TRUNCATED_SHA + '.webp';
  const repairUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + HISTORICAL_REPAIR_COMMIT + '/__assets/' + HISTORICAL_REPAIR_SHA + '.webp';

  assert.ok(page.includes('data-media-target="' + fullUrl + '"'));
  assert.ok(page.includes('data-media-sha256="' + FULL_FIDELITY_SHA + '"'));
  assert.ok(page.includes('<img src="' + fullUrl + '"'));
  assert.ok(page.includes('width="1672" height="941"'));
  assert.match(page, /Full-fidelity representative artwork supplied by Victor/i);

  assert.ok(page.includes(truncatedUrl), 'prior truncated derivative remains inspectable as lineage');
  assert.ok(page.includes(repairUrl), 'prior low-resolution repair remains inspectable as lineage');
  assert.doesNotMatch(page, new RegExp('<img[^>]+(?:' + HISTORICAL_TRUNCATED_SHA + '|' + HISTORICAL_REPAIR_SHA + ')'));
  assert.match(page, /neither substitutes for the restored full-fidelity reader artwork/i);

  const provenance = strings._meta.sourceProvenance;
  assert.equal(provenance.representativeMediaStatus, 'PRESENT_FULL_FIDELITY_LOSSLESS_DISPLAY');
  assert.equal(provenance.representativeMediaTarget, fullUrl);
  assert.equal(provenance.representativeMediaSha256, FULL_FIDELITY_SHA);
  assert.equal(provenance.representativeMediaAssetCommit, FULL_FIDELITY_COMMIT);
  assert.equal(provenance.representativeMediaWidth, 1672);
  assert.equal(provenance.representativeMediaHeight, 941);
  assert.equal(provenance.representativeMediaDisplayPolicy, 'NATIVE_SOURCE_OR_DOWNSCALE_ONLY');
  assert.equal(provenance.representativeMediaSuppliedSourceFormat, 'PNG');
  assert.equal(provenance.representativeMediaSuppliedSourceSha256, SUPPLIED_SOURCE_SHA);
  assert.equal(provenance.representativeMediaSuppliedSourceBytes, 3588855);
  assert.equal(provenance.representativeMediaPublishedEncoding, 'WEBP_LOSSLESS_PIXEL_EQUIVALENT');
  assert.equal(provenance.representativeMediaPublishedBytes, 1879240);
  assert.equal(provenance.representativeMediaHistoricalTruncatedTarget, truncatedUrl);
  assert.equal(provenance.representativeMediaHistoricalTruncatedStatus, 'ARCHIVED_TRUNCATED_DERIVATIVE_NOT_ACTIVE');
  assert.equal(provenance.representativeMediaHistoricalRepairTarget, repairUrl);
  assert.equal(provenance.representativeMediaHistoricalRepairStatus, 'ARCHIVED_LOW_RESOLUTION_REPAIR_NOT_ACTIVE');
  assert.equal(provenance.representativeMediaRelationship, 'SUPPLIED_SOURCE_PUBLISHED_LOSSLESS_WITH_HISTORICAL_DERIVATIVES');
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
