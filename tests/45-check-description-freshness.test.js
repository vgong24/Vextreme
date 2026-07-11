'use strict';

/**
 * DESCRIPTION-FRESHNESS — tests/45-check-description-freshness.test.js
 *
 * Covers lib/check-description-freshness.js's pure diff parser: which
 * pages/*.html paths a PR touched, given raw `git diff --name-status -M`
 * porcelain output. The "does the changed page have a description" half is
 * exercised through lib/build-page-health.js's own metaDescriptionText
 * tests (tests/44-page-health.test.js) — this file only needs to prove the
 * diff-to-paths extraction is correct, not re-test detection.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseChangedPages } = require('../lib/check-description-freshness');

test('DESCRIPTION-FRESHNESS: added and modified pages are included', () => {
  const output = [
    'A\tpages/new-page.html',
    'M\tpages/existing-page.html',
  ].join('\n');
  assert.deepEqual(parseChangedPages(output), ['pages/existing-page.html', 'pages/new-page.html']);
});

test('DESCRIPTION-FRESHNESS: a rename into pages/ is included at its new path', () => {
  const output = 'R92\twip/draft.html\tpages/promoted.html';
  assert.deepEqual(parseChangedPages(output), ['pages/promoted.html']);
});

test('DESCRIPTION-FRESHNESS: a deleted page is excluded — nothing to review at a path that no longer exists', () => {
  const output = 'D\tpages/removed-page.html';
  assert.deepEqual(parseChangedPages(output), []);
});

test('DESCRIPTION-FRESHNESS: non-pages paths and non-html files are ignored', () => {
  const output = [
    'M\tlib/build-page-health.js',
    'M\tdocs/lattice-map.json',
    'A\twip/draft.html',
  ].join('\n');
  assert.deepEqual(parseChangedPages(output), []);
});

test('DESCRIPTION-FRESHNESS: duplicate paths across multiple diff lines are de-duplicated and sorted', () => {
  const output = [
    'M\tpages/z-page.html',
    'M\tpages/a-page.html',
    'M\tpages/z-page.html',
  ].join('\n');
  assert.deepEqual(parseChangedPages(output), ['pages/a-page.html', 'pages/z-page.html']);
});

test('DESCRIPTION-FRESHNESS: empty diff output produces an empty list', () => {
  assert.deepEqual(parseChangedPages(''), []);
  assert.deepEqual(parseChangedPages('   \n  '), []);
});

// [VXG RealForever]
