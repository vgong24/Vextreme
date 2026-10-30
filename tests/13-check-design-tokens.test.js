'use strict';

/**
 * DESIGN TOKENS — tests/13-check-design-tokens.test.js
 *
 * Tests for lib/check-design-tokens.js — the automated check named in
 * od-004/od-005 (data/status/open-discussions.json), built to catch the
 * exact bug class Session 015 found by hand in lib/build-ecosystem-hub.js:
 * a var(--token) reference that doesn't resolve against any real token.
 *
 * Test order:
 *   1. extractRootTokens — reads :root block declarations
 *   2. extractUsedTokens — reads var(--x) references
 *   3. linksStylesheet — detects a <link> to a given stylesheet
 *   4. checkFile — the combined resolution logic (local + conditional global)
 *   5. Integration — the real repo has zero violations right now
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');
const { execFileSync } = require('child_process');

const { extractRootTokens, extractUsedTokens, linksStylesheet, checkFile } = require('../lib/check-design-tokens');

const ROOT = path.join(__dirname, '..');

// ── 1. extractRootTokens ────────────────────────────────────────────────────

test('DESIGN-TOKENS: extracts tokens from a single :root block', () => {
  const css = ':root { --foo: red; --bar: blue; }';
  assert.deepEqual(extractRootTokens(css).sort(), ['bar', 'foo']);
});

test('DESIGN-TOKENS: extracts tokens across multiple :root blocks', () => {
  const css = ':root { --a: 1; } body {} :root { --b: 2; }';
  assert.deepEqual(extractRootTokens(css).sort(), ['a', 'b']);
});

test('DESIGN-TOKENS: returns empty array when no :root block present', () => {
  assert.deepEqual(extractRootTokens('body { color: red; }'), []);
});

// ── 2. extractUsedTokens ─────────────────────────────────────────────────────

test('DESIGN-TOKENS: extracts a single var() usage', () => {
  assert.deepEqual(extractUsedTokens('color: var(--stone);'), ['stone']);
});

test('DESIGN-TOKENS: extracts multiple distinct var() usages, deduplicated', () => {
  const css = 'color: var(--stone); background: var(--cream); border-color: var(--stone);';
  assert.deepEqual(extractUsedTokens(css).sort(), ['cream', 'stone']);
});

test('DESIGN-TOKENS: ignores a fallback value inside var() — only the token name is captured', () => {
  assert.deepEqual(extractUsedTokens('color: var(--stone-950, #0a0a0a);'), ['stone-950']);
});

// ── 3. linksStylesheet ──────────────────────────────────────────────────────

test('DESIGN-TOKENS: detects a matching <link rel="stylesheet">', () => {
  const html = '<link rel="stylesheet" href="https://cdn.example.com/styles/design-system.css">';
  assert.equal(linksStylesheet(html, 'design-system.css'), true);
});

test('DESIGN-TOKENS: returns false when the stylesheet is not linked', () => {
  const html = '<link rel="stylesheet" href="https://cdn.example.com/styles/arc-nav.css">';
  assert.equal(linksStylesheet(html, 'design-system.css'), false);
});

// ── 4. checkFile ─────────────────────────────────────────────────────────────

const GLOBAL_TOKENS = ['stone', 'cream', 'muted', 'border', 'ember', 'ember-bg', 'serif', 'sans', 'mono'];

test('DESIGN-TOKENS: flags a token used but never defined anywhere', () => {
  const content = '<style>.x { color: var(--stone-950); }</style>';
  const result = checkFile(content, GLOBAL_TOKENS, false);
  assert.deepEqual(result.undefined, ['stone-950']);
});

test('DESIGN-TOKENS: does not flag a global token when the file links design-system.css', () => {
  const content = '<link rel="stylesheet" href="/styles/design-system.css"><style>.x { color: var(--stone); }</style>';
  const result = checkFile(content, GLOBAL_TOKENS, false);
  assert.deepEqual(result.undefined, []);
});

test('DESIGN-TOKENS: flags a global token when the file does NOT link design-system.css', () => {
  const content = '<style>.x { color: var(--stone); }</style>';
  const result = checkFile(content, GLOBAL_TOKENS, false);
  assert.deepEqual(result.undefined, ['stone']);
});

test('DESIGN-TOKENS: does not flag a locally-defined token even without linking design-system.css', () => {
  const content = '<style>:root { --bg: #0e0e0e; } body { background: var(--bg); }</style>';
  const result = checkFile(content, GLOBAL_TOKENS, false);
  assert.deepEqual(result.undefined, []);
});

test('DESIGN-TOKENS: alwaysGlobal=true credits global tokens without needing a <link> (for plain .css files)', () => {
  const content = '.x { color: var(--ember); }';
  const result = checkFile(content, GLOBAL_TOKENS, true);
  assert.deepEqual(result.undefined, []);
});

test('DESIGN-TOKENS: a fallback value does not count as the token being defined', () => {
  // var(--x, #hex) is a real CSS pattern, but this checker's whole point is
  // that a lucky-looking fallback masked the Session 015 bug — it must still flag it.
  const content = '<style>.x { color: var(--stone-950, #0a0a0a); }</style>';
  const result = checkFile(content, GLOBAL_TOKENS, false);
  assert.deepEqual(result.undefined, ['stone-950']);
});

// ── 5. Integration — the real repo ──────────────────────────────────────────

test('DESIGN-TOKENS: node lib/check-design-tokens.js finds zero violations in the current repo', () => {
  const out = execFileSync('node', ['lib/check-design-tokens.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /No violations/, `expected zero violations, got:\n${out}`);
});

test('DESIGN-TOKENS: --json output includes globalTokens and an empty violations array on a clean repo', () => {
  const out = JSON.parse(execFileSync('node', ['lib/check-design-tokens.js', '--json'], { cwd: ROOT, encoding: 'utf8' }));
  assert.ok(Array.isArray(out.globalTokens) && out.globalTokens.length > 0);
  assert.deepEqual(out.violations, []);
});

// [VXG RealForever]
