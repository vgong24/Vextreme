/**
 * VEXTREME — tests/91-test-runner-isolation.test.js
 *
 * The suite contains source-projection tests that intentionally write generated
 * files in the checked-out repository. Test files therefore must not execute
 * concurrently inside one checkout. CI keeps throughput by running multiple
 * shards in parallel, while each shard serializes its own files.
 *
 * [VXG RealForever]
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'test.yml'), 'utf8');

test('TEST RUNNER: full and coverage suites serialize test files in the shared checkout', () => {
  assert.equal(pkg.scripts.test, 'node --test --test-concurrency=1 tests/*.test.js');
  assert.equal(pkg.scripts['test:coverage'], 'node --experimental-test-coverage --test --test-concurrency=1 tests/*.test.js');
  assert.equal(pkg.engines.node, '>=18.19.0');
});

test('TEST RUNNER: CI preserves parallel shards while serializing files inside each shard', () => {
  assert.match(workflow, /strategy:\s*\n\s*matrix:/);
  assert.match(
    workflow,
    /node --test --test-concurrency=1 \$\(node lib\/compute-test-shards\.js files --shard \$\{\{ matrix\.shard \}\} --total \$\{\{ needs\.shards\.outputs\.total \}\}\)/
  );
});

test('TEST RUNNER: the proven shared-writer class remains visible to the isolation contract', () => {
  for (const filename of [
    '61-content-forge-convos-with-god-arc-batch.test.js',
    '62-content-forge-claude-journals-arc-batch.test.js',
    '64-content-forge-excavation-arc-batch.test.js',
    '65-content-forge-march-23-arc-batch.test.js',
  ]) {
    const source = fs.readFileSync(path.join(ROOT, 'tests', filename), 'utf8');
    assert.match(source, /project_arc_batch\.js/);
    assert.match(source, /data['"], ['"]viewmodels\.json|data['"]\s*,\s*['"]viewmodels\.json/);
  }
});

// [VXG RealForever]
