'use strict';

/**
 * SESSION BOOTSTRAP — tests/14-session-bootstrap.test.js
 *
 * Tests for lib/session-bootstrap.js — the one-shot state report described
 * in docs/culture.md's "What an AI instance actually needs here" section.
 *
 * Test order:
 *   1. parseLastSession — extracts the session number from INDEX.md
 *   2. parseBatchRegistry — reads the Batch Registry table rows
 *   3. summarizeStatus — pulls open-item counts from a parsed status.json
 *   4. Integration — running the real script against the real repo succeeds
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');
const { execFileSync } = require('child_process');

const { parseLastSession, parseBatchRegistry, latestSessionFile, summarizeStatus } = require('../lib/session-bootstrap');

const ROOT = path.join(__dirname, '..');

// ── 1. parseLastSession ─────────────────────────────────────────────────────

test('SESSION-BOOTSTRAP: extracts the session number from a Last updated line', () => {
  const md = 'some text\n\n*Last updated: Session 042 — July 2, 2026*\n';
  assert.equal(parseLastSession(md), '042');
});

test('SESSION-BOOTSTRAP: returns null when no Last updated line is present', () => {
  assert.equal(parseLastSession('no such line here'), null);
});

// ── 2. parseBatchRegistry ────────────────────────────────────────────────────

test('SESSION-BOOTSTRAP: parses a single batch registry row', () => {
  const md = '| Batch | File | Sessions | Status |\n|---|---|---|---|\n| 001 | `docs/continuity/Batch 001.md` | 001–010 | closed |\n';
  const rows = parseBatchRegistry(md);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].batch, '001');
  assert.equal(rows[0].file, 'docs/continuity/Batch 001.md');
  assert.equal(rows[0].sessions, '001–010');
  assert.equal(rows[0].status, 'closed');
});

test('SESSION-BOOTSTRAP: parses multiple batch registry rows in order', () => {
  const md = [
    '| Batch | File | Sessions | Status |',
    '|---|---|---|---|',
    '| 001 | `docs/continuity/Batch 001.md` | 001–010 | closed |',
    '| 002 | `docs/continuity/Batch 002.md` | 011–020 | full — 10/10, create Batch 003 next |',
  ].join('\n');
  const rows = parseBatchRegistry(md);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].batch, '002');
  assert.match(rows[1].status, /full/);
});

test('SESSION-BOOTSTRAP: returns empty array when no registry table is present', () => {
  assert.deepEqual(parseBatchRegistry('nothing here'), []);
});

// ── 2b. latestSessionFile ────────────────────────────────────────────────────

test('SESSION-BOOTSTRAP: latestSessionFile picks the newest date-prefixed session file', () => {
  const files = [
    'README.md',
    '2026-07-02-session-021.md',
    '2026-07-06-session-023.md',
    '2026-07-04-session-022.md',
  ];
  assert.equal(latestSessionFile(files), '2026-07-06-session-023.md');
});

test('SESSION-BOOTSTRAP: latestSessionFile breaks same-day ties by session number', () => {
  const files = ['2026-07-06-session-023.md', '2026-07-06-session-024.md'];
  assert.equal(latestSessionFile(files), '2026-07-06-session-024.md');
});

test('SESSION-BOOTSTRAP: latestSessionFile returns null when no session files match', () => {
  assert.equal(latestSessionFile(['README.md', 'notes.txt']), null);
  assert.equal(latestSessionFile([]), null);
});

test('SESSION-BOOTSTRAP: the real active batch directory resolves to a real newest session file', () => {
  // Ties the convention to reality: the registry's active batch is a directory
  // and its newest session file exists. If this fails, either the registry row
  // or the directory contents drifted from the documented convention.
  const indexMd = fs.readFileSync(path.join(ROOT, 'docs', 'continuity', 'INDEX.md'), 'utf8');
  const rows = parseBatchRegistry(indexMd);
  const active = rows[rows.length - 1];
  const batchPath = path.join(ROOT, active.file);
  assert.ok(fs.statSync(batchPath).isDirectory(), `expected ${active.file} to be a directory`);
  const newest = latestSessionFile(fs.readdirSync(batchPath));
  assert.ok(newest, 'expected at least one YYYY-MM-DD-session-0NN.md file');
  assert.ok(fs.existsSync(path.join(batchPath, newest)));
});

// ── 3. summarizeStatus ───────────────────────────────────────────────────────

test('SESSION-BOOTSTRAP: summarizeStatus pulls count per category', () => {
  const status = {
    _meta: { totalOpen: 7 },
    notices: {
      translation: { count: 1 },
      techDebt:    { count: 3 },
      assumptions: { count: 3 },
    },
  };
  const summary = summarizeStatus(status);
  assert.equal(summary.totalOpen, 7);
  assert.deepEqual(summary.byCategory, { translation: 1, techDebt: 3, assumptions: 3 });
});

test('SESSION-BOOTSTRAP: summarizeStatus handles missing _meta gracefully', () => {
  const summary = summarizeStatus({ notices: {} });
  assert.equal(summary.totalOpen, null);
  assert.deepEqual(summary.byCategory, {});
});

// ── 4. Integration ───────────────────────────────────────────────────────────

// session-bootstrap.js runs the full test suite internally, which includes
// this very file — running these two tests unconditionally would spawn this
// script, which spawns the full suite (including this file again), without
// bound. session-bootstrap.js sets VEX_BOOTSTRAP_NESTED=1 on that inner run
// specifically so this file can recognize "I'm already nested" and skip
// spawning another level, instead of asserting anything here.
const nested = !!process.env.VEX_BOOTSTRAP_NESTED;

test('SESSION-BOOTSTRAP: running the real script against the real repo exits 0 when everything is clean', { skip: nested }, () => {
  // If this fails, it's telling the truth about real repo state (drift, a
  // token violation, or a failing test) — not a bug in the test itself.
  const out = execFileSync('node', ['lib/session-bootstrap.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /Tests\s+: PASS/);
  assert.match(out, /Lattice drift\s+: clean/);
  assert.match(out, /Design tokens\s+: clean/);
});

test('SESSION-BOOTSTRAP: --json output is valid JSON with the expected top-level shape', { skip: nested }, () => {
  const out = JSON.parse(execFileSync('node', ['lib/session-bootstrap.js', '--json'], { cwd: ROOT, encoding: 'utf8' }));
  assert.ok('lastLoggedSession' in out);
  assert.ok('activeBatch' in out);
  assert.ok('git' in out);
  assert.ok('tests' in out);
  assert.ok('latticeDrift' in out);
  assert.ok('designTokens' in out);
  assert.ok('openItems' in out);
});

// [VXG RealForever]
