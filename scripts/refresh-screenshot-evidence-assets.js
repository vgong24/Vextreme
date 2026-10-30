#!/usr/bin/env node
'use strict';

/**
 * Refresh the committed Vextreme screenshot-evidence projection from an exact
 * Vextreme-Assets screenshot manifest.
 *
 * This file is a projection writer, not a screenshot authority. Vextreme-Assets
 * owns screenshot custody/schema; Vextreme consumes the exact manifest records
 * through data/screenshot-evidence-assets.json.
 *
 * Usage:
 *   node scripts/refresh-screenshot-evidence-assets.js \
 *     --assets-root ../Vextreme-Assets \
 *     --commit <exact-40-hex-assets-commit>
 *
 * Optional:
 *   --output <path>  Override the committed projection destination.
 *   --check          Verify the destination already matches; do not write.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUTPUT = path.join(ROOT, 'data', 'screenshot-evidence-assets.json');
const CONTENT_ASSETS_PATH = path.join(ROOT, 'config', 'content-assets.json');
const PROJECTION_SCHEMA = 'vextreme.screenshot-evidence-assets-projection/v1';
const ASSET_MANIFEST_SCHEMA = 'vextreme-assets.screenshot-evidence/v1';
const ASSET_MANIFEST_PATH = 'evidence/screenshots/manifest.json';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function stableJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function requireExactCommit(commit) {
  if (!/^[0-9a-f]{40}$/i.test(commit || '')) {
    throw new Error('expected exact 40-hex Vextreme-Assets commit');
  }
  return commit.toLowerCase();
}

function readManifestAtCommit(assetsRoot, sourceCommit) {
  if (typeof assetsRoot !== 'string' || !assetsRoot.trim()) {
    throw new Error('--assets-root is required');
  }
  const exactCommit = requireExactCommit(sourceCommit);
  const root = path.resolve(assetsRoot);
  let text;
  try {
    text = execFileSync(
      'git',
      ['-C', root, 'show', exactCommit + ':' + ASSET_MANIFEST_PATH],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 }
    );
  } catch (error) {
    const detail = error && error.stderr ? String(error.stderr).trim() : '';
    throw new Error(
      'cannot read ' + ASSET_MANIFEST_PATH + ' from exact Assets commit ' +
      exactCommit + (detail ? ': ' + detail : '')
    );
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(
      'invalid JSON in ' + ASSET_MANIFEST_PATH + ' at exact Assets commit ' +
      exactCommit + ': ' + error.message
    );
  }
}

function buildProjection({ manifest, sourceCommit, contentAssets }) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('screenshot manifest must be a JSON object');
  }
  if (!contentAssets || typeof contentAssets !== 'object' || Array.isArray(contentAssets)) {
    throw new Error('content-assets config must be a JSON object');
  }

  const provider = contentAssets.provider || {};
  const expectedRepository = provider.repository;
  const publicOrigin = contentAssets.baseUrl;

  if (manifest.repository !== expectedRepository) {
    throw new Error(
      'Assets screenshot manifest repository mismatch: expected ' +
      String(expectedRepository) + ', got ' + String(manifest.repository)
    );
  }
  if (manifest.schemaVersion !== ASSET_MANIFEST_SCHEMA) {
    throw new Error(
      'Assets screenshot manifest schema mismatch: expected ' +
      ASSET_MANIFEST_SCHEMA + ', got ' + String(manifest.schemaVersion)
    );
  }
  if (typeof publicOrigin !== 'string' || !/^https:\/\//.test(publicOrigin)) {
    throw new Error('content-assets baseUrl must be an https public origin');
  }
  if (!manifest.records || typeof manifest.records !== 'object' || Array.isArray(manifest.records)) {
    throw new Error('Assets screenshot manifest records must be an object');
  }

  const records = {};
  for (const key of Object.keys(manifest.records).sort()) {
    records[key] = manifest.records[key];
  }

  return {
    schemaVersion: PROJECTION_SCHEMA,
    source: {
      repository: expectedRepository,
      commit: requireExactCommit(sourceCommit),
      publicOrigin: publicOrigin.replace(/\/$/, ''),
      manifestSchemaVersion: manifest.schemaVersion,
    },
    records,
  };
}

function parseArgs(argv) {
  const args = { check: false, assetsRoot: null, output: DEFAULT_OUTPUT, commit: null };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--check') {
      args.check = true;
      continue;
    }
    if (token === '--assets-root' || token === '--commit' || token === '--output') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(token + ' requires a value');
      if (token === '--assets-root') args.assetsRoot = value;
      if (token === '--commit') args.commit = value;
      if (token === '--output') args.output = value;
      i += 1;
      continue;
    }
    throw new Error('unknown argument: ' + token);
  }
  if (!args.assetsRoot) throw new Error('--assets-root is required');
  if (!args.commit) throw new Error('--commit is required');
  return args;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const outputPath = path.resolve(args.output);
  const projection = buildProjection({
    manifest: readManifestAtCommit(args.assetsRoot, args.commit),
    sourceCommit: args.commit,
    contentAssets: readJson(CONTENT_ASSETS_PATH),
  });
  const next = stableJson(projection);

  if (args.check) {
    const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;
    if (current !== next) {
      throw new Error('screenshot evidence Assets projection is stale: ' + outputPath);
    }
    process.stdout.write(
      'Screenshot evidence Assets projection is current: ' +
      Object.keys(projection.records).length + ' records @ ' + projection.source.commit + '\n'
    );
    return projection;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, next);
  process.stdout.write(
    'Refreshed screenshot evidence Assets projection: ' +
    Object.keys(projection.records).length + ' records @ ' + projection.source.commit + '\n'
  );
  return projection;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write('SCREENSHOT_EVIDENCE_ASSETS_REFRESH_FAILED: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  PROJECTION_SCHEMA,
  ASSET_MANIFEST_SCHEMA,
  ASSET_MANIFEST_PATH,
  buildProjection,
  readManifestAtCommit,
  parseArgs,
  stableJson,
  main,
};

// [VXG RealForever]
