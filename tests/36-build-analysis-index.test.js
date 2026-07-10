'use strict';

/**
 * BUILD-ANALYSIS-INDEX — tests/36-build-analysis-index.test.js
 *
 * Tests for lib/build-analysis-index.js — Analysis Mode's data-layer write
 * side (docs/architecture/15-analysis-mode.md, Phase A). Composes
 * lib/trace-string-usage.js and lib/build-terrain-map.js's findScreenshots()
 * rather than duplicating their logic, so most coverage here is about the
 * composition (missing-language computation, element/page assembly), not
 * re-testing usage-scanning or screenshot-discovery themselves.
 *
 * Test order:
 *   1. computeMissingLangs — supportedLangs minus a key's present langs
 *   2. buildElementIndex — one entry per key ever seen, manifest or HTML side
 *   3. buildPageIndex — one entry per real page slug, with screenshots attached
 *   4. buildAnalysisIndex — full assembly + summary
 *   5. Integration — the real repo's output is deterministic and internally consistent
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const { execFileSync } = require('child_process');
const fs        = require('fs');
const path      = require('path');

const {
  computeMissingLangs,
  buildElementIndex,
  buildPageIndex,
  buildAnalysisIndex,
} = require('../lib/build-analysis-index');

const ROOT = path.join(__dirname, '..');

// ── 1. computeMissingLangs ────────────────────────────────────────────────────

test('computeMissingLangs: returns supported langs not present, in supportedLangs order', () => {
  assert.deepEqual(computeMissingLangs(['en'], ['en', 'ja', 'zh']), ['ja', 'zh']);
});

test('computeMissingLangs: empty when every supported lang is present', () => {
  assert.deepEqual(computeMissingLangs(['en', 'ja', 'zh'], ['en', 'ja', 'zh']), []);
});

test('computeMissingLangs: empty supportedLangs yields empty result', () => {
  assert.deepEqual(computeMissingLangs(['en'], []), []);
});

// ── 2. buildElementIndex ──────────────────────────────────────────────────────

test('buildElementIndex: includes a manifest key with no HTML usage', () => {
  const usages   = {};
  const manifest = { 'common.label.foo': { enHash: 'abc', langs: ['en'] } };
  const elements = buildElementIndex(usages, manifest, ['en', 'ja']);
  assert.deepEqual(elements['common.label.foo'], {
    key: 'common.label.foo',
    usedIn: [],
    inManifest: true,
    langs: ['en'],
    missingLangs: ['ja'],
  });
});

test('buildElementIndex: includes an HTML-used key missing from the manifest (orphan)', () => {
  const usages   = { 'pages.foo.title': ['pages/foo.html'] };
  const manifest = {};
  const elements = buildElementIndex(usages, manifest, ['en']);
  assert.equal(elements['pages.foo.title'].inManifest, false);
  assert.deepEqual(elements['pages.foo.title'].usedIn, ['pages/foo.html']);
  // Not in the manifest at all means zero known language coverage — every
  // supported language is "missing", not zero, since none is confirmed present.
  assert.deepEqual(elements['pages.foo.title'].missingLangs, ['en']);
});

// ── 3. buildPageIndex ─────────────────────────────────────────────────────────

test('buildPageIndex: attaches keys, orphans, and screenshots per real slug', () => {
  const usages   = { 'pages.foo.title': ['pages/foo.html'], 'pages.foo.ghost': ['pages/foo.html'] };
  const manifest = { 'pages.foo.title': { enHash: 'x', langs: ['en'] } };
  const screenshotsBySlug = { foo: { en: 'docs/screenshots/foo-en.png' } };
  const pages = buildPageIndex(usages, manifest, screenshotsBySlug, ['foo', 'bar']);

  assert.deepEqual(pages.foo.keys, ['pages.foo.ghost', 'pages.foo.title']);
  assert.deepEqual(pages.foo.orphanKeys, ['pages.foo.ghost']);
  assert.deepEqual(pages.foo.screenshots, { en: 'docs/screenshots/foo-en.png' });

  assert.deepEqual(pages.bar.keys, []);
  assert.deepEqual(pages.bar.screenshots, {});
});

// ── 4. buildAnalysisIndex ─────────────────────────────────────────────────────

test('buildAnalysisIndex: assembles elements, pages, and a summary matching trace-string-usage semantics', () => {
  const usages   = { 'pages.foo.title': ['pages/foo.html'], 'pages.foo.ghost': ['pages/foo.html'] };
  const manifest = {
    'pages.foo.title': { enHash: 'x', langs: ['en'] },
    'pages.unused.key': { enHash: 'y', langs: ['en', 'ja'] },
  };
  const result = buildAnalysisIndex(usages, manifest, {}, ['foo'], ['en', 'ja']);

  assert.deepEqual(result.supportedLangs, ['en', 'ja']);
  assert.equal(Object.keys(result.elements).length, 3); // title, ghost, unused.key
  assert.equal(result.summary.totalKeysInManifest, 2);
  assert.equal(result.summary.totalKeysUsed, 2);
  assert.deepEqual(result.summary.orphanUsages, ['pages.foo.ghost']);
  assert.deepEqual(result.summary.unusedKeys, ['pages.unused.key']);
});

// ── 5. Integration ─────────────────────────────────────────────────────────────

test('integration: node lib/build-analysis-index.js produces deterministic, internally consistent output', () => {
  execFileSync('node', [path.join(ROOT, 'lib/build-analysis-index.js')], { cwd: ROOT });
  const first = fs.readFileSync(path.join(ROOT, 'data/analysis-index.json'), 'utf8');

  execFileSync('node', [path.join(ROOT, 'lib/build-analysis-index.js')], { cwd: ROOT });
  const second = fs.readFileSync(path.join(ROOT, 'data/analysis-index.json'), 'utf8');

  assert.equal(first, second, 'same inputs must produce byte-identical output — no timestamps, no randomness');

  const data = JSON.parse(first);
  assert.ok(Array.isArray(data.supportedLangs) && data.supportedLangs.length > 0);
  assert.ok(Object.keys(data.elements).length > 0);
  assert.ok(Object.keys(data.pages).length > 0);

  // Every page's keys must be a subset of real elements.
  for (const slug of Object.keys(data.pages)) {
    for (const key of data.pages[slug].keys) {
      assert.ok(data.elements[key], `page ${slug} references key ${key} missing from elements index`);
    }
  }

  // Every element's missingLangs must be disjoint from its own langs.
  for (const key of Object.keys(data.elements)) {
    const el = data.elements[key];
    for (const lang of el.missingLangs) {
      assert.ok(!el.langs.includes(lang), `key ${key} lists ${lang} as both present and missing`);
    }
  }
});
