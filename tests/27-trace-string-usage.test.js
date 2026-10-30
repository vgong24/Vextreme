'use strict';

/**
 * TRACE-STRING-USAGE — tests/27-trace-string-usage.test.js
 *
 * Tests for lib/trace-string-usage.js — the string reverse-tracer.
 *
 * Test order:
 *   1. extractDataI18nKeys — pulls data-i18n values out of HTML
 *   2. scanUsages — builds key -> [file] across multiple files
 *   3. traceKey / tracePage — the two lookup directions
 *   4. findOrphanUsages / findUnusedKeys
 *   5. Integration — the real dossier page has zero orphan keys
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path      = require('path');

const {
  extractDataI18nKeys,
  scanUsages,
  traceKey,
  tracePage,
  findOrphanUsages,
  findUnusedKeys,
} = require('../lib/trace-string-usage');

const ROOT = path.join(__dirname, '..');

// ── 1. extractDataI18nKeys ────────────────────────────────────────────────────

test('TRACE-STRING-USAGE: extractDataI18nKeys pulls every data-i18n value in order', () => {
  const html = '<p data-i18n="a.b">x</p><span data-i18n="c.d">y</span>';
  assert.deepEqual(extractDataI18nKeys(html), ['a.b', 'c.d']);
});

test('TRACE-STRING-USAGE: extractDataI18nKeys keeps duplicates', () => {
  const html = '<p data-i18n="a.b">x</p><p data-i18n="a.b">y</p>';
  assert.deepEqual(extractDataI18nKeys(html), ['a.b', 'a.b']);
});

test('TRACE-STRING-USAGE: extractDataI18nKeys returns empty array when none present', () => {
  assert.deepEqual(extractDataI18nKeys('<p>no keys here</p>'), []);
});

// ── 2. scanUsages ─────────────────────────────────────────────────────────────

test('TRACE-STRING-USAGE: scanUsages maps each key to every file that references it', () => {
  const files = [
    { relPath: 'pages/a.html', html: '<p data-i18n="shared.key">x</p><p data-i18n="a.only">y</p>' },
    { relPath: 'pages/b.html', html: '<p data-i18n="shared.key">x</p>' },
  ];
  const usages = scanUsages(files);
  assert.deepEqual(usages['shared.key'].sort(), ['pages/a.html', 'pages/b.html']);
  assert.deepEqual(usages['a.only'], ['pages/a.html']);
});

test('TRACE-STRING-USAGE: scanUsages counts a file once even if it repeats a key', () => {
  const files = [{ relPath: 'pages/a.html', html: '<p data-i18n="x">1</p><p data-i18n="x">2</p>' }];
  assert.deepEqual(scanUsages(files)['x'], ['pages/a.html']);
});

// ── 3. traceKey / tracePage ───────────────────────────────────────────────────

test('TRACE-STRING-USAGE: traceKey reports usage and language coverage for a known key', () => {
  const usages   = { 'a.b': ['pages/a.html'] };
  const manifest = { 'a.b': { enHash: 'x', langs: ['en', 'zh'] } };
  assert.deepEqual(traceKey('a.b', usages, manifest), {
    key: 'a.b', usedIn: ['pages/a.html'], inManifest: true, langs: ['en', 'zh'],
  });
});

test('TRACE-STRING-USAGE: traceKey flags a key the manifest has never heard of', () => {
  const result = traceKey('typo.key', { 'typo.key': ['pages/a.html'] }, {});
  assert.equal(result.inManifest, false);
  assert.deepEqual(result.langs, []);
});

test('TRACE-STRING-USAGE: tracePage lists only keys used by that exact file, and its orphans', () => {
  const usages = {
    'a.b': ['pages/a.html'],
    'a.c': ['pages/a.html', 'pages/b.html'],
    'typo': ['pages/a.html'],
  };
  const manifest = { 'a.b': { langs: ['en'] }, 'a.c': { langs: ['en'] } };
  const result = tracePage('pages/a.html', usages, manifest);
  assert.deepEqual(result.keys.map(k => k.key), ['a.b', 'a.c', 'typo']);
  assert.deepEqual(result.orphanKeys, ['typo']);
});

// ── 4. findOrphanUsages / findUnusedKeys ──────────────────────────────────────

test('TRACE-STRING-USAGE: findOrphanUsages finds HTML references missing from the manifest', () => {
  const usages   = { 'known': ['pages/a.html'], 'unknown': ['pages/a.html'] };
  const manifest = { 'known': { langs: ['en'] } };
  assert.deepEqual(findOrphanUsages(usages, manifest), ['unknown']);
});

test('TRACE-STRING-USAGE: findUnusedKeys finds manifest keys no HTML file references', () => {
  const manifest = { 'used': { langs: ['en'] }, 'unused': { langs: ['en'] } };
  const usages   = { 'used': ['pages/a.html'] };
  assert.deepEqual(findUnusedKeys(usages, manifest), ['unused']);
});

// ── 5. Integration ───────────────────────────────────────────────────────────

test('TRACE-STRING-USAGE integration: the real dossier page has zero orphan data-i18n keys', () => {
  // If this fails, the page references a key that was renamed or typo'd in
  // data/strings/source without updating the HTML — fix the HTML, not this test.
  const out = execFileSync('node', ['lib/trace-string-usage.js', '--page=victor-methodology-presentation'], { cwd: ROOT, encoding: 'utf8' });
  assert.ok(!out.includes('orphan key'), `expected zero orphan keys, got:\n${out}`);
});

test('TRACE-STRING-USAGE integration: --key mode runs against a real key without throwing', () => {
  const out = execFileSync('node', ['lib/trace-string-usage.js', '--key=pages.victor-methodology-presentation.header.thesis'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /pages\/victor-methodology-presentation\.html/);
});

// [VXG RealForever]
