'use strict';

/**
 * BUILD-INDEX CACHE CURRENTNESS — regression for PR #379 A010.
 *
 * The index pipeline mutates widgets/fab-lang.js through bump-fab-version.js.
 * That file participates in the shared cache-family fingerprint, so the same
 * pipeline must regenerate and stage the cache token owners before treating
 * generated artifacts as current.
 *
 * [VXG RealForever]
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cacheIdentity = require('../lib/build-shared-cache-generation');

const ROOT = path.join(__dirname, '..');
const WORKFLOW_PATH = path.join(ROOT, '.github', 'workflows', 'build-index.yml');

function readWorkflow() {
  return fs.readFileSync(WORKFLOW_PATH, 'utf8').replace(/\r\n/g, '\n');
}

function triggerPatterns(source) {
  const start = source.indexOf('paths: &build_trigger_paths');
  const end = source.indexOf('\n  # Session 022 continued:', start);
  assert.ok(start >= 0 && end > start, 'build trigger path block must remain discoverable');
  const block = source.slice(start, end);
  return [...block.matchAll(/^\s+- '([^']+)'\s*$/gm)].map(match => match[1]);
}

function patternCovers(pattern, relativePath) {
  if (pattern === relativePath) return true;
  if (pattern.endsWith('/**')) {
    return relativePath.startsWith(pattern.slice(0, -2));
  }
  return false;
}

test('BUILD-INDEX-CACHE: shared cache generation runs after FAB versioning and before downstream God Script generation', () => {
  const source = readWorkflow();
  const bump = source.indexOf('run: node lib/bump-fab-version.js');
  const cache = source.indexOf('run: node lib/build-shared-cache-generation.js');
  const vextreme = source.indexOf('run: node lib/build-vextreme.js');

  assert.ok(bump >= 0, 'build-index must run bump-fab-version.js');
  assert.ok(cache > bump, 'cache identity must be regenerated after fab-lang VERSION may change');
  assert.ok(vextreme > cache, 'downstream generation must observe the current shared cache identity');
  assert.equal(
    source.match(/run: node lib\/build-shared-cache-generation\.js/g)?.length,
    1,
    'cache generator should have one workflow owner step'
  );
});

test('BUILD-INDEX-CACHE: every cache-family source and the cache generator itself can trigger the build workflow', () => {
  const patterns = triggerPatterns(readWorkflow());
  const required = [
    'lib/build-shared-cache-generation.js',
    ...cacheIdentity.CACHE_FAMILY_PATHS,
  ];

  for (const relativePath of required) {
    assert.ok(
      patterns.some(pattern => patternCovers(pattern, relativePath)),
      `build-index trigger paths must cover cache-currentness input: ${relativePath}`
    );
  }
});

test('BUILD-INDEX-CACHE: generated-artifact verification stages every shared cache token owner', () => {
  const source = readWorkflow();
  const marker = '- name: Verify generated artifacts are committed';
  const index = source.indexOf(marker);
  assert.ok(index >= 0, 'generated-artifact verification step must exist');
  const verify = source.slice(index);

  const owners = [
    'lib/shell.js',
    'lib/vextreme.js',
    'pages/terrain-map.html',
    ...cacheIdentity.shellContextPagePaths(ROOT),
  ];

  assert.deepEqual(
    cacheIdentity.shellContextPagePaths(ROOT),
    ['pages/about-vextreme.html', 'pages/vex-support.html'],
    'current shell-context institutional owner set is part of this regression boundary'
  );

  for (const relativePath of owners) {
    assert.ok(
      verify.includes(relativePath),
      `generated-artifact verification must stage cache token owner: ${relativePath}`
    );
  }
});
