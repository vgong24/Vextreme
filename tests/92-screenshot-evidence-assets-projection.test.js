'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  PROJECTION_SCHEMA,
  ASSET_MANIFEST_SCHEMA,
  ASSET_MANIFEST_PATH,
  buildProjection,
  readManifestAtCommit,
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

function initAssetsRepo(initialManifest) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vextreme-assets-projection-'));
  fs.mkdirSync(path.join(root, path.dirname(ASSET_MANIFEST_PATH)), { recursive: true });
  fs.writeFileSync(path.join(root, ASSET_MANIFEST_PATH), JSON.stringify(initialManifest, null, 2) + '\n');
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Vextreme Test'], { cwd: root });
  execFileSync('git', ['add', ASSET_MANIFEST_PATH], { cwd: root });
  execFileSync('git', ['commit', '-m', 'manifest'], { cwd: root, stdio: 'ignore' });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  return { root, commit };
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

test('SCREENSHOT-ASSETS-PROJECTION: command binding requires exact Assets root + commit', () => {
  assert.deepEqual(
    parseArgs(['--assets-root', '../Vextreme-Assets', '--commit', '1'.repeat(40), '--check']),
    {
      check: true,
      assetsRoot: '../Vextreme-Assets',
      output: path.join(__dirname, '..', 'data', 'screenshot-evidence-assets.json'),
      commit: '1'.repeat(40),
    }
  );
  assert.throws(() => parseArgs(['--assets-root', '../Vextreme-Assets']), /--commit is required/);
  assert.throws(() => parseArgs(['--commit', '1'.repeat(40)]), /--assets-root is required/);
});

test('SCREENSHOT-ASSETS-PROJECTION: manifest bytes are read from the declared Git commit, not the mutable worktree', () => {
  const committed = manifest({
    'vextreme/committed/en/default/1280': {
      namespace: 'vextreme',
      slug: 'committed',
      locale: 'en',
      theme: 'default',
      viewport: 1280,
      sha256: 'c'.repeat(64),
      path: 'evidence/screenshots/vextreme/committed/en/default/1280/' + 'c'.repeat(64) + '.png',
      source: { repository: 'vgong24/Vextreme', commit: '3'.repeat(40), path: 'pages/committed.html' },
      captureKind: 'localization',
    },
  });
  const repo = initAssetsRepo(committed);
  try {
    const dirty = manifest({
      'vextreme/dirty/en/default/1280': {
        namespace: 'vextreme',
        slug: 'dirty',
        locale: 'en',
        theme: 'default',
        viewport: 1280,
        sha256: 'd'.repeat(64),
        path: 'evidence/screenshots/vextreme/dirty/en/default/1280/' + 'd'.repeat(64) + '.png',
        source: { repository: 'vgong24/Vextreme', commit: '4'.repeat(40), path: 'pages/dirty.html' },
        captureKind: 'localization',
      },
    });
    fs.writeFileSync(path.join(repo.root, ASSET_MANIFEST_PATH), JSON.stringify(dirty, null, 2) + '\n');

    assert.deepEqual(readManifestAtCommit(repo.root, repo.commit), committed,
      'dirty worktree manifest must not be mistaken for the declared commit bytes');
    assert.throws(
      () => readManifestAtCommit(repo.root, 'f'.repeat(40)),
      /cannot read .* exact Assets commit/
    );
  } finally {
    fs.rmSync(repo.root, { recursive: true, force: true });
  }
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
