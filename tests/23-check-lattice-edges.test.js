'use strict';

/**
 * LATTICE EDGES — tests/23-check-lattice-edges.test.js
 *
 * Tests for lib/check-lattice-edges.js (pe-012) — verifies the lattice map's
 * claimed edges against actual code. The integration test runs the checker
 * against the real repo; because the checker is informational at the CLI,
 * this test is what makes stale edges fail CI.
 *
 * Test order:
 *   1. pathToken — path claims vs prose/globals
 *   2. isTemplate / mentionName — what's checkable and what counts as a mention
 *   3. stripLatticeBlock / requiresOf — self-reference and comment hazards
 *   4. Integration — every checkable edge in the real map holds
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path      = require('path');

const {
  pathToken,
  isTemplate,
  stripLatticeBlock,
  mentionName,
  requiresOf,
} = require('../lib/check-lattice-edges');

const ROOT = path.join(__dirname, '..');

// ── 1. pathToken ─────────────────────────────────────────────────────────────

test('LATTICE-EDGES: pathToken keeps path claims and strips annotations', () => {
  assert.equal(pathToken('data/index.json (open item counts)'), 'data/index.json');
  assert.equal(pathToken('lib/vex-config.js'), 'lib/vex-config.js');
  assert.equal(pathToken('docs/continuity/context-notes/'), 'docs/continuity/context-notes/');
});

test('LATTICE-EDGES: pathToken rejects prose, subprocess, and global claims', () => {
  assert.equal(pathToken('git log / git status (via subprocess)'), null);
  assert.equal(pathToken('stdout only — read-only, changes nothing'), null);
  assert.equal(pathToken('window.VEXTREME_ARCS (old arcs.json format)'), null);
  assert.equal(pathToken('manual run: node lib/audit-pages.js'), null);
});

// ── 2. isTemplate / mentionName ──────────────────────────────────────────────

test('LATTICE-EDGES: isTemplate flags globs and placeholders', () => {
  assert.equal(isTemplate('dist/vextreme-{slug}.js'), true);
  assert.equal(isTemplate('data/strings/source/**/*.json'), true);
  assert.equal(isTemplate('docs/continuity/batch-00N/'), true);
  assert.equal(isTemplate('data/index.json'), false);
});

test('LATTICE-EDGES: mentionName drops .js (require never spells it) but keeps other extensions', () => {
  assert.equal(mentionName('lib/vex-config.js'), 'vex-config');
  assert.equal(mentionName('data/index.json'), 'index.json');
  assert.equal(mentionName('docs/continuity/context-notes/'), 'context-notes');
});

// ── 3. self-reference hazards ────────────────────────────────────────────────

test('LATTICE-EDGES: stripLatticeBlock removes the generated header so claims cannot vouch for themselves', () => {
  const src = 'before\n/* LATTICE:BEGIN\n reads data/index.json\nLATTICE:END */\nafter';
  const out = stripLatticeBlock(src);
  assert.ok(!out.includes('index.json'));
  assert.ok(out.includes('before') && out.includes('after'));
});

// Fixture requires below deliberately name files that are NOT lattice nodes:
// this file is itself inside the checker's reverse-require scan, so a fixture
// naming a real mapped node would register as a genuine load edge — the same
// sentinel-text hazard the comment-stripping test below is about.
test('LATTICE-EDGES: requiresOf resolves relative requires to repo paths', () => {
  const src = "const a = require('./fixture-a');\nconst b = require('../lib/fixture-b.js');";
  assert.deepEqual(requiresOf(src, 'lib'), ['lib/fixture-a.js', 'lib/fixture-b.js']);
});

test('LATTICE-EDGES: requiresOf ignores requires that only appear in comments', () => {
  // The sentinel-text-is-hazardous-to-itself lesson, applied to this tool:
  // during development, a comment in the checker itself that spelled out a
  // require created a false reverse edge. Comments are mentions, not loads.
  const src = "// like require('./fixture-a') would\n/* or require('./fixture-b') */\nconst real = require('./fixture-c');";
  assert.deepEqual(requiresOf(src, 'lib'), ['lib/fixture-c.js']);
});

// ── 4. Integration ───────────────────────────────────────────────────────────

test('LATTICE-EDGES integration: every checkable edge in the real lattice map holds', () => {
  // If this fails, docs/lattice-map.json claims an edge the code does not
  // back up (or a require exists that the map does not acknowledge). Fix the
  // map and regenerate headers — do not relax this test. Session 024 fixed
  // 22 such stale edges the first time this ran.
  const out = execFileSync('node', ['lib/check-lattice-edges.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /All checkable lattice edges hold/);
});

// [VXG RealForever]
