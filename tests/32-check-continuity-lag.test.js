'use strict';

/**
 * CONTINUITY LAG — tests/32-check-continuity-lag.test.js
 *
 * Tests for lib/check-continuity-lag.js — the informational check comparing
 * merged-PR count against how recently the newest continuity session file
 * was touched. See that file's header for why it exists (Session 027 found
 * 15 merged PRs with no session file, invisible to every other drift check).
 *
 * Test order:
 *   1. countMergeCommits — pure git-log-blob parsing
 *   2. evaluateLag — threshold decision
 *   3. Integration — the real checker runs against the real repo and never
 *      fails the process (informational only)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');

const { countMergeCommits, evaluateLag } = require('../lib/check-continuity-lag');

const ROOT = path.join(__dirname, '..');

// ── 1. countMergeCommits ─────────────────────────────────────────────────────

test('CONTINUITY-LAG: counts "Merge pull request #N" lines in a git log blob', () => {
  const log = [
    'abc1234 Merge pull request #92 from vgong24/some-branch',
    'def5678 VXG-070726: some commit',
    'ghi9012 Merge pull request #91 from vgong24/other-branch',
  ].join('\n');
  assert.equal(countMergeCommits(log), 2);
});

test('CONTINUITY-LAG: ignores non-merge commit lines', () => {
  const log = 'abc1234 VXG-070826: add a feature\ndef5678 Auto-rebuild artifacts [skip ci]';
  assert.equal(countMergeCommits(log), 0);
});

test('CONTINUITY-LAG: empty or falsy input counts as zero', () => {
  assert.equal(countMergeCommits(''), 0);
  assert.equal(countMergeCommits(null), 0);
  assert.equal(countMergeCommits(undefined), 0);
});

// ── 2. evaluateLag ────────────────────────────────────────────────────────────

test('CONTINUITY-LAG: a count under threshold is not flagged', () => {
  const result = evaluateLag(3, 8);
  assert.equal(result.flagged, false);
  assert.match(result.message, /3 PR\(s\) merged/);
});

test('CONTINUITY-LAG: a count at or over threshold is flagged', () => {
  const result = evaluateLag(8, 8);
  assert.equal(result.flagged, true);
  assert.match(result.message, /session entry is likely overdue/);

  const higher = evaluateLag(15, 8);
  assert.equal(higher.flagged, true);
  assert.match(higher.message, /15 PRs have merged/);
});

// ── 3. Integration ───────────────────────────────────────────────────────────

test('CONTINUITY-LAG integration: the real checker runs against the real repo without failing the process', () => {
  // Informational only — process.exit(0) always, per the file's own header.
  // This asserts it runs cleanly and returns a well-shaped JSON report, not
  // any particular PR count (that number changes with every merge).
  const out = execFileSync('node', ['lib/check-continuity-lag.js', '--json'], { cwd: ROOT, encoding: 'utf8' });
  const report = JSON.parse(out);
  if (report.skipped) {
    assert.equal(typeof report.reason, 'string');
  } else {
    assert.equal(typeof report.mergeCount, 'number');
    assert.equal(typeof report.threshold, 'number');
    assert.equal(typeof report.flagged, 'boolean');
    assert.equal(typeof report.newestSessionFile, 'string');
  }
});
