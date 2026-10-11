'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  PROJECTION_SCHEMA,
  ASSET_MANIFEST_SCHEMA,
  buildProjection,
  parseArgs,
  stableJson,
} = require('../scripts/refresh-screenshot-evidence-assets.js');
const projection = require('../data/screenshot-evidence-assets.json');

const ASSET_CONFIG = {
  provider: {
    repository: 'vgong24/Vextreme-Assets',
    manifestSchemaVersion: 'vextreme-assets.import-manifest/v1',
  },
  baseUrl: 'https://vgong24.github.io/Vextreme-Assets',
};

function manifest(records = {}) {
  return {
    schemaVersion: ASSET_MANIFEST_SCHEMA,
    repository: 'vgong24/Vextreme-Assets',
    records,
  };
}

test('SCREENSHOT-ASSETS-PROJECTION: deterministic writer preserves exact records and bindings', () => {
  const sourceRecords = {
    'vextreme/z/en/default/1280': {
      namespace: 'vextreme',
      slug: 'z',
      locale: 'en',
      theme: 'default',
      viewport: 1280,
      sha256: 'b'.repeat(64),
      path: 'evidence/screenshots/vextreme/z/en/default/1280/' + 'b'.repeat(64) + '.png',
      source: { repository: 'vgong24/Vextreme', commit: '1'.repeat(40), path: 'pages/z.html' },
      captureKind: 'localization',
    },
    'vextreme/a/en/default/1280': {
      namespace: 'vextreme',
      slug: 'a',
      locale: 'en',
      theme: 'default',
      viewport: 1280,
      sha256: 'a'.repeat(64),
      path: 'evidence/screenshots/vextreme/a/en/default/1280/' + 'a'.repeat(64) + '.png',
      source: { repository: 'vgong24/Vextreme', commit: '2'.repeat(40), path: 'pages/a.html' },
      captureKind: 'localization',
    },
  };
  const input = manifest(sourceRecords);
  const actual = buildProjection({
    manifest: input,
    sourceCommit: 'ABCDEF0123456789ABCDEF0123456789ABCDEF01',
    contentAssets: ASSET_CONFIG,
  });

  assert.equal(actual.schemaVersion, PROJECTION_SCHEMA);
  assert.deepEqual(actual.source, {
    repository: 'vgong24/Vextreme-Assets',
    commit: 'abcdef0123456789abcdef0123456789abcdef01',
    publicOrigin: 'https://vgong24.github.io/Vextreme-Assets',
    manifestSchemaVersion: ASSET_MANIFEST_SCHEMA,
  });
  assert.deepEqual(Object.keys(actual.records), [
    'vextreme/a/en/default/1280',
    'vextreme/z/en/default/1280',
  ]);
  assert.deepEqual(actual.records['vextreme/a/en/default/1280'], sourceRecords['vextreme/a/en/default/1280']);
  assert.deepEqual(actual.records['vextreme/z/en/default/1280'], sourceRecords['vextreme/z/en/default/1280']);
  assert.deepEqual(input.records, sourceRecords, 'projection formation must not mutate the Assets manifest');
  assert.equal(stableJson(actual), JSON.stringify(actual, null, 2) + '\n');
  assert.notEqual(ASSET_CONFIG.provider.manifestSchemaVersion, ASSET_MANIFEST_SCHEMA,
    'authored-asset import schema and screenshot-evidence schema must remain separate contracts');
});

test('SCREENSHOT-ASSETS-PROJECTION: rejects wrong source identity instead of silently repinning', () => {
  assert.throws(
    () => buildProjection({
      manifest: { ...manifest(), repository: 'someone/else' },
      sourceCommit: '1'.repeat(40),
      contentAssets: ASSET_CONFIG,
    }),
    /repository mismatch/
  );
  assert.throws(
    () => buildProjection({
      manifest: { ...manifest(), schemaVersion: 'wrong\/v1' },
      sourceCommit: '1'.repeat(40),
      contentAssets: ASSET_CONFIG,
    }),
    /schema mismatch/
  );
  assert.throws(
    () => buildProjection({
      manifest: manifest(),
      sourceCommit: 'not-a-commit',
      contentAssets: ASSET_CONFIG,
    }),
    /exact 40-hex/
  );
});

test('SCREENSHOT-ASSETS-PROJECTION: command binding requires exact manifest + commit', () => {
  assert.deepEqual(
    parseArgs(['--manifest', '../Vextreme-Assets/evidence/screenshots/manifest.json', '--commit', '1'.repeat(40), '--check']),
    {
      check: true,
      manifest: '../Vextreme-Assets/evidence/screenshots/manifest.json',
      output: path.join(__dirname, '..', 'data', 'screenshot-evidence-assets.json'),
      commit: '1'.repeat(40),
    }
  );
  assert.throws(() => parseArgs(['--manifest', 'manifest.json']), /--commit is required/);
  assert.throws(() => parseArgs(['--commit', '1'.repeat(40)]), /--manifest is required/);
});

test('SCREENSHOT-ASSETS-PROJECTION: committed projection retains the historical support matrix', () => {
  assert.equal(projection.schemaVersion, PROJECTION_SCHEMA);
  assert.equal(projection.source.repository, 'vgong24/Vextreme-Assets');
  assert.equal(projection.source.manifestSchemaVersion, ASSET_MANIFEST_SCHEMA);
  assert.match(projection.source.commit, /^[0-9a-f]{40}$/);
  assert.ok(Object.keys(projection.records).length >= 38,
    'projection must not regress behind the accepted 38-record Assets checkpoint');

  const supportRecords = Object.values(projection.records).filter(record => record && record.slug === 'vex-support');
  assert.ok(supportRecords.length >= 18,
    'the accepted 18-cell vex-support matrix must remain present in the pinned projection');
});

// [VXG RealForever]
