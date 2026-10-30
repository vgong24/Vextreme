'use strict';

/**
 * MAP BINDINGS — tests/22-check-map-bindings.test.js
 *
 * Tests for lib/check-map-bindings.js (pe-013) — the layered-maps drift
 * detector. The integration test at the bottom runs the real checker against
 * the real repo, which is what puts this check in CI: if a registry, batch
 * directory, or index line drifts from the files it claims to bind, the
 * suite fails.
 *
 * Test order:
 *   1. parseNoteRows / checkContextNoteBindings — registry ↔ note files
 *   2. parseActiveBatchLine / sessionRange — INDEX.md parsing
 *   3. checkSessionFiles — naming convention + declared range
 *   4. checkLastUpdatedBinding — the Session 023 regression shape
 *   5. Integration — the real repo's bindings all hold
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path      = require('path');

const {
  parseNoteRows,
  checkContextNoteBindings,
  parseActiveBatchLine,
  sessionRange,
  checkSessionFiles,
  checkLastUpdatedBinding,
} = require('../lib/check-map-bindings');

const ROOT = path.join(__dirname, '..');

// ── 1. context-note bindings ─────────────────────────────────────────────────

test('MAP-BINDINGS: parseNoteRows extracts backticked note paths from the registry table', () => {
  const md = '| 2026-07-05 | `docs/continuity/context-notes/a.md` | x |\n| 2026-07-06 | `docs/continuity/context-notes/b.md` | y |';
  assert.deepEqual(parseNoteRows(md), [
    'docs/continuity/context-notes/a.md',
    'docs/continuity/context-notes/b.md',
  ]);
});

test('MAP-BINDINGS: a registry row whose file is missing is drift', () => {
  const issues = checkContextNoteBindings(['docs/continuity/context-notes/gone.md'], ['README.md']);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /gone\.md.*does not exist/);
});

test('MAP-BINDINGS: a note file with no registry row is drift; README.md is exempt', () => {
  const issues = checkContextNoteBindings([], ['README.md', 'orphan.md']);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /orphan\.md has no row/);
});

test('MAP-BINDINGS: matching rows and files produce no issues', () => {
  const issues = checkContextNoteBindings(
    ['docs/continuity/context-notes/a.md'],
    ['README.md', 'a.md'],
  );
  assert.deepEqual(issues, []);
});

// ── 2. INDEX.md parsing ──────────────────────────────────────────────────────

test('MAP-BINDINGS: parseActiveBatchLine reads the Active batch pointer', () => {
  assert.equal(parseActiveBatchLine('**Active batch:** `docs/continuity/batch-003/`'), 'docs/continuity/batch-003/');
  assert.equal(parseActiveBatchLine('no such line'), null);
});

test('MAP-BINDINGS: sessionRange parses an en-dash session span', () => {
  assert.deepEqual(sessionRange('021–030'), { lo: 21, hi: 30 });
  assert.equal(sessionRange('unbounded'), null);
});

// ── 3. session file convention ───────────────────────────────────────────────

test('MAP-BINDINGS: a misnamed session file is drift; README.md is exempt', () => {
  const issues = checkSessionFiles(['README.md', 'session-25.md'], { lo: 21, hi: 30 });
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /session-25\.md does not match/);
});

test('MAP-BINDINGS: a session number outside the declared range is drift', () => {
  const issues = checkSessionFiles(['2026-08-01-session-031.md'], { lo: 21, hi: 30 });
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /outside the registry's declared range 021–030/);
});

test('MAP-BINDINGS: convention-named files inside the range produce no issues', () => {
  assert.deepEqual(checkSessionFiles(['2026-07-06-session-024.md', 'README.md'], { lo: 21, hi: 30 }), []);
});

// ── 4. Last updated ↔ newest file — the Session 023 regression shape ─────────

test('MAP-BINDINGS: INDEX.md claiming an older latest session than the record holds is drift', () => {
  // This is the exact failure that motivated pe-013 and this checker:
  // Session 023's work existed in the record while the index still said 022.
  const issues = checkLastUpdatedBinding('022', '2026-07-06-session-023.md');
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /Last updated: Session 022.*session 023/);
});

test('MAP-BINDINGS: agreeing index and record produce no issues', () => {
  assert.deepEqual(checkLastUpdatedBinding('024', '2026-07-06-session-024.md'), []);
  assert.deepEqual(checkLastUpdatedBinding(null, null), []);
});

// ── 5. Integration ───────────────────────────────────────────────────────────

test('MAP-BINDINGS integration: every map binding in the real repo holds', () => {
  // If this fails, a map drifted from the files it claims to bind — fix the
  // drift, not this test. The checker's output names the exact binding.
  const out = execFileSync('node', ['lib/check-map-bindings.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /All map bindings hold/);
});

// [VXG RealForever]
