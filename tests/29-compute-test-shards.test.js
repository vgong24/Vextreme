'use strict';

/**
 * COMPUTE-TEST-SHARDS — tests/29-compute-test-shards.test.js
 *
 * Tests for lib/compute-test-shards.js — the self-scaling CI sharding
 * design: shard count and file assignment are pure functions of the real
 * current tests/*.test.js file list, not a number a person picks and
 * forgets to update. See that file's docstring for why file count
 * (not measured historical duration) is the sharding signal here.
 *
 * Test order:
 *   1. computeShardCount — the scaling formula itself
 *   2. assignFilesToShard — partition correctness (every file exactly once)
 *   3. listTestFiles / real-repo integration — the formula against the
 *      actual current tests/ directory
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const {
  computeShardCount,
  assignFilesToShard,
  listTestFiles,
  TARGET_FILES_PER_SHARD,
  MAX_SHARDS,
} = require('../lib/compute-test-shards');

// ── 1. computeShardCount ──────────────────────────────────────────────────────

test('COMPUTE-SHARDS: a suite at or below the target stays at 1 shard', () => {
  assert.equal(computeShardCount(1, 50, 6), 1);
  assert.equal(computeShardCount(50, 50, 6), 1);
});

test('COMPUTE-SHARDS: crossing the target bumps to 2 shards, not fractional', () => {
  assert.equal(computeShardCount(51, 50, 6), 2);
  assert.equal(computeShardCount(100, 50, 6), 2);
  assert.equal(computeShardCount(101, 50, 6), 3);
});

test('COMPUTE-SHARDS: shard count is capped at maxShards regardless of how large the suite grows', () => {
  assert.equal(computeShardCount(10000, 50, 6), 6);
});

test('COMPUTE-SHARDS: zero or negative file counts degrade to 1 shard rather than 0', () => {
  assert.equal(computeShardCount(0, 50, 6), 1);
  assert.equal(computeShardCount(-5, 50, 6), 1);
});

// ── 2. assignFilesToShard ─────────────────────────────────────────────────────

test('COMPUTE-SHARDS: every file is assigned to exactly one shard — no file dropped, none duplicated', () => {
  const files = Array.from({ length: 27 }, (_, i) => `${String(i).padStart(2, '0')}-x.test.js`);
  const totalShards = 4;
  const seen = new Set();
  for (let s = 1; s <= totalShards; s++) {
    for (const f of assignFilesToShard(files, s, totalShards)) {
      assert.ok(!seen.has(f), `${f} assigned to more than one shard`);
      seen.add(f);
    }
  }
  assert.equal(seen.size, files.length, 'not every file was assigned to some shard');
});

test('COMPUTE-SHARDS: assignment is deterministic — same inputs produce the same partition every time', () => {
  const files = ['a.test.js', 'b.test.js', 'c.test.js', 'd.test.js', 'e.test.js'];
  const first  = assignFilesToShard(files, 2, 3);
  const second = assignFilesToShard(files, 2, 3);
  assert.deepEqual(first, second);
});

test('COMPUTE-SHARDS: out-of-range shard index throws rather than silently returning an empty/wrong set', () => {
  const files = ['a.test.js'];
  assert.throws(() => assignFilesToShard(files, 0, 3));
  assert.throws(() => assignFilesToShard(files, 4, 3));
});

// ── 3. Real-repo integration ──────────────────────────────────────────────────

test('COMPUTE-SHARDS integration: the real suite has activated sharding and still follows the configured scaling formula', () => {
  const files = listTestFiles();
  assert.ok(files.length > 0, 'no test files found — listTestFiles() is broken or tests/ is empty');
  const shardCount = computeShardCount(files.length, TARGET_FILES_PER_SHARD, MAX_SHARDS);
  const expected = Math.min(
    Math.max(Math.ceil(files.length / TARGET_FILES_PER_SHARD), 1),
    MAX_SHARDS,
  );
  assert.equal(shardCount, expected, 'real-suite shard count drifted from the configured scaling formula');
  assert.ok(files.length > TARGET_FILES_PER_SHARD,
    `expected the real suite (${files.length} files) to remain above the first activation threshold (${TARGET_FILES_PER_SHARD})`);
  assert.ok(shardCount >= 2, 'the first self-scaling CI shard transition should remain active');
});

test('COMPUTE-SHARDS integration: real file list assigned across its own computed shard count still covers every file exactly once', () => {
  const files = listTestFiles();
  const total = computeShardCount(files.length, TARGET_FILES_PER_SHARD, MAX_SHARDS);
  const seen = new Set();
  for (let s = 1; s <= total; s++) {
    for (const f of assignFilesToShard(files, s, total)) seen.add(f);
  }
  assert.equal(seen.size, files.length);
});

// [VXG RealForever]
