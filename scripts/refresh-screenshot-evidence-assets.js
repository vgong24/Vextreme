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
 *     --manifest ../Vextreme-Assets/evidence/screenshots/manifest.json \
 *     --commit <exact-40-hex-assets-commit>
 *
 * Optional:
 *   --output <path>  Override the committed projection destination.
 *   --check          Verify the destination already matches; do not write.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_OUTPUT = path.join(ROOT, 'data', 'screenshot-evidence-assets.json');
const CONTENT_ASSETS_PATH = path.join(ROOT, 'config', 'content-assets.json');
const PROJECTION_SCHEMA = 'vextreme.screenshot-evidence-assets-projection/v1';

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

function buildProjection({ manifest, sourceCommit, contentAssets }) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error('screenshot manifest must be a JSON object');
  }
  if (!contentAssets || typeof contentAssets !== 'object' || Array.isArray(contentAssets)) {
    throw new Error('content-assets config must be a JSON object');
  }

  const provider = contentAssets.provider || {};
  const expectedRepository = provider.repository;
  const expectedSchema = provider.manifestSchemaVersion;
  const publicOrigin = contentAssets.baseUrl;

  if (manifest.repository !== expectedRepository) {
    throw new Error(
      'Assets screenshot manifest repository mismatch: expected ' +
      String(expectedRepository) + ', got ' + String(manifest.repository)
    );
  }
  if (manifest.schemaVersion !== expectedSchema) {
    throw new Error(
      'Assets screenshot manifest schema mismatch: expected ' +
      String(expectedSchema) + ', got ' + String(manifest.schemaVersion)
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
  const args = { check: false, manifest: null, output: DEFAULT_OUTPUT, commit: null };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--check') {
      args.check = true;
      continue;
    }
    if (token === '--manifest' || token === '--commit' || token === '--output') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(token + ' requires a value');
      if (token === '--manifest') args.manifest = value;
      if (token === '--commit') args.commit = value;
      if (token === '--output') args.output = value;
      i += 1;
      continue;
    }
    throw new Error('unknown argument: ' + token);
  }
  if (!args.manifest) throw new Error('--manifest is required');
  if (!args.commit) throw new Error('--commit is required');
  return args;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const manifestPath = path.resolve(args.manifest);
  const outputPath = path.resolve(args.output);
  const projection = buildProjection({
    manifest: readJson(manifestPath),
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
  buildProjection,
  parseArgs,
  stableJson,
  main,
};

// [VXG RealForever]
