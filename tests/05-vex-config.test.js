'use strict';

/**
 * VEX CONFIG — tests/05-vex-config.test.js
 *
 * Tests for lib/vex-config.js — the single source of truth for all semantic
 * constants in the build system and browser runtime.
 *
 * Test order:
 *   1. Named constant values — confirm the string values haven't silently changed
 *   2. Path derivation — scopeRelPath and scopeUrl correctness
 *   3. Grep audit — no raw magic strings remain in build scripts or widgets
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const {
  Category,
  DEFAULT_CATEGORY,
  Language,
  DEFAULT_LANGUAGE,
  Scope,
  CDN_BASE,
  scopeRelPath,
  scopeUrl,
  flatBundleUrl,
} = require('../lib/vex-config');

const ROOT = path.join(__dirname, '..');

// ── 1. Named constant values ──────────────────────────────────────────────────

test('CONFIG: Category constants have correct string values', () => {
  assert.equal(Category.SYSTEM,       'system');
  assert.equal(Category.PRODUCTION,   'production');
  assert.equal(Category.DEMO,         'demo');
  assert.equal(Category.STAGING,      'staging');
  assert.equal(Category.EXPERIMENTAL, 'experimental');
});

test('CONFIG: DEFAULT_CATEGORY is production', () => {
  assert.equal(DEFAULT_CATEGORY, Category.PRODUCTION);
});

test('CONFIG: Language constants have correct string values', () => {
  assert.equal(Language.EN, 'en');
  assert.equal(Language.JA, 'ja');
});

test('CONFIG: DEFAULT_LANGUAGE is EN', () => {
  assert.equal(DEFAULT_LANGUAGE, Language.EN);
});

test('CONFIG: Scope constants have correct string values', () => {
  assert.equal(Scope.COMMON,    'common');
  assert.equal(Scope.DEMO,      'demo');
  assert.equal(Scope.SPECIMENS, 'specimens');
  assert.equal(Scope.ARCHIVES,  'archives');
  assert.equal(Scope.ARCS,      'arcs');
});

test('CONFIG: CDN_BASE points to jsDelivr vextreme@main', () => {
  assert.ok(CDN_BASE.includes('cdn.jsdelivr.net'));
  assert.ok(CDN_BASE.includes('vextreme@main'));
});

// ── 2. Path derivation ────────────────────────────────────────────────────────

test('SCOPE_REL_PATH: flat scope in demo category', () => {
  assert.equal(scopeRelPath('specimens', 'demo'), 'demo/specimens');
});

test('SCOPE_REL_PATH: dotted scope in production category', () => {
  assert.equal(scopeRelPath('pages.claude-answers-the-doubt', 'production'), 'production/pages/claude-answers-the-doubt');
});

test('SCOPE_REL_PATH: common always routes to system regardless of caller category', () => {
  assert.equal(scopeRelPath('common', 'demo'),       'system/common');
  assert.equal(scopeRelPath('common', 'production'), 'system/common');
  assert.equal(scopeRelPath('common', 'staging'),    'system/common');
});

test('SCOPE_REL_PATH: uses DEFAULT_CATEGORY when none provided', () => {
  assert.equal(scopeRelPath('archives', undefined), 'production/archives');
  assert.equal(scopeRelPath('archives', null),      'production/archives');
});

test('SCOPE_URL: produces correct full CDN URL', () => {
  const url = scopeUrl('specimens', 'demo', 'ja', CDN_BASE);
  assert.ok(url.includes('/data/strings/compiled/scopes/demo/specimens.ja.json'));
  assert.ok(url.startsWith(CDN_BASE));
});

test('SCOPE_URL: common always resolves to system/ regardless of page category', () => {
  const url = scopeUrl('common', 'demo', 'en', CDN_BASE);
  assert.ok(url.includes('/scopes/system/common.en.json'));
});

test('FLAT_BUNDLE_URL: produces correct full CDN URL', () => {
  const url = flatBundleUrl('ja', CDN_BASE);
  assert.ok(url.includes('/data/strings/compiled/strings.ja.json'));
  assert.ok(url.startsWith(CDN_BASE));
});

// ── 3. Grep audit — no raw magic strings in build scripts or widgets ──────────
// Checks that the category and language strings only appear via the named
// constants, not as standalone literals. Allowlist covers: the config file
// itself, JSON data files, test fixtures, comments, and string keys.

test('AUDIT: no raw "demo" category string in build scripts', () => {
  const targets = [
    'lib/build-demo.js',
    'lib/build-specimens.js',
    'lib/build-archives.js',
    'lib/build-index.js',
    'lib/strings-compile.js',
    'lib/strings-check.js',
  ];
  const forbidden = /'demo'|"demo"/;
  // Exceptions: string keys containing "demo" (e.g. 'demo.section.why'), scope
  // names like 'vextreme-demo', and data-i18n keys. We test only standalone
  // 'demo' or "demo" that aren't part of a longer key.
  // Simple check: the literal strings === 'demo' or === "demo" as a value.
  const standaloneDemo = /(?<![a-zA-Z0-9._-])['"]demo['"](?![a-zA-Z0-9._-])/;

  for (const rel of targets) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    // Strip comment lines first
    const noComments = src.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n');
    const match = noComments.match(standaloneDemo);
    assert.equal(match, null,
      `Found raw 'demo' string in ${rel} at: ${match ? match[0] : ''}. Use Category.DEMO instead.`);
  }
});

test('AUDIT: no raw standalone "ja" language string in build scripts', () => {
  const targets = [
    'lib/build-specimens.js',
    'lib/strings-check.js',
    'lib/strings-export.js',
    'lib/strings-import.js',
    'lib/build-archives.js',
    'lib/build-index.js',
  ];
  // Match standalone 'ja' or "ja" — not part of a longer word or key
  const standaloneJa = /(?<![a-zA-Z0-9._-])['"]ja['"](?![a-zA-Z0-9._-])/;

  for (const rel of targets) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const noComments = src.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n');
    const match = noComments.match(standaloneJa);
    assert.equal(match, null,
      `Found raw 'ja' string in ${rel}. Use Language.JA instead.`);
  }
});
