'use strict';

/**
 * BUILD-ANALYSIS-INDEX — tests/36-build-analysis-index.test.js
 *
 * Tests for lib/build-analysis-index.js — Analysis Mode's data-layer write
 * side (docs/architecture/15-analysis-mode.md, Phase A). Composes
 * lib/trace-string-usage.js and lib/screenshot-evidence.js
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
  pageSlugFromUsage,
  expectedLangsForUsage,
  buildElementIndex,
  buildPageIndex,
  buildAnalysisIndex,
} = require('../lib/build-analysis-index');
const {
  findScreenshots,
  findScreenshotEvidence,
  findAssetScreenshotEvidence,
  mergeScreenshotEvidence,
  exactMatrixEvidence,
  representativeScreenshots,
} = require('../lib/screenshot-evidence');

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

test('pageSlugFromUsage: only real pages/*.html paths become page-language demand', () => {
  assert.equal(pageSlugFromUsage('pages/alpha.html'), 'alpha');
  assert.equal(pageSlugFromUsage('wip/alpha.html'), null);
  assert.equal(pageSlugFromUsage('pages/nested/alpha.html'), null);
});

test('expectedLangsForUsage: a partial locale is demanded only by pages that actually advertise it', () => {
  const pageLanguageMap = {
    alpha: { availableLangs: ['en', 'fr'] },
    beta: { availableLangs: ['en', 'ja'] },
  };
  const supported = ['en', 'fr', 'ja', 'zh'];

  assert.deepEqual(expectedLangsForUsage(['pages/alpha.html'], supported, pageLanguageMap), ['en', 'fr']);
  assert.deepEqual(expectedLangsForUsage(['pages/beta.html'], supported, pageLanguageMap), ['en', 'ja']);
  assert.deepEqual(expectedLangsForUsage(['pages/alpha.html', 'pages/beta.html'], supported, pageLanguageMap), ['en', 'fr', 'ja']);
  assert.deepEqual(expectedLangsForUsage([], supported, pageLanguageMap), ['en']);
  assert.deepEqual(expectedLangsForUsage(['pages/alpha.html'], supported, null), supported,
    'omitting pageLanguageMap preserves legacy global behavior for pure callers');
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

test('buildElementIndex: page-aware demand prevents a new locale from becoming unrelated site-wide debt', () => {
  const usages = {
    'pages.alpha.body': ['pages/alpha.html'],
    'pages.beta.body': ['pages/beta.html'],
    'common.shared': ['pages/alpha.html', 'pages/beta.html'],
    'unused.key': [],
  };
  const manifest = {
    'pages.alpha.body': { enHash: 'a', langs: ['en'] },
    'pages.beta.body': { enHash: 'b', langs: ['en'] },
    'common.shared': { enHash: 'c', langs: ['en', 'fr'] },
    'unused.key': { enHash: 'd', langs: ['en'] },
  };
  const pageLanguageMap = {
    alpha: { availableLangs: ['en', 'fr'] },
    beta: { availableLangs: ['en'] },
  };
  const elements = buildElementIndex(usages, manifest, ['en', 'fr', 'ja'], pageLanguageMap);

  assert.deepEqual(elements['pages.alpha.body'].missingLangs, ['fr']);
  assert.deepEqual(elements['pages.beta.body'].missingLangs, []);
  assert.deepEqual(elements['common.shared'].missingLangs, []);
  assert.deepEqual(elements['unused.key'].missingLangs, []);
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
  const screenshotEvidenceBySlug = {
    foo: [{
      slug: 'foo', locale: 'en', theme: 'foundation', viewport: 320,
      kind: 'matrix', path: 'docs/screenshots/foo-en-foundation-320.png',
    }],
  };
  const pages = buildPageIndex(usages, manifest, screenshotsBySlug, ['foo', 'bar'], screenshotEvidenceBySlug);

  assert.deepEqual(pages.foo.keys, ['pages.foo.ghost', 'pages.foo.title']);
  assert.deepEqual(pages.foo.orphanKeys, ['pages.foo.ghost']);
  assert.deepEqual(pages.foo.screenshots, { en: 'docs/screenshots/foo-en.png' });
  assert.equal(pages.foo.screenshotEvidence[0].path, 'docs/screenshots/foo-en-foundation-320.png');

  assert.deepEqual(pages.bar.keys, []);
  assert.deepEqual(pages.bar.screenshots, {});
  assert.equal(pages.bar.screenshotEvidence, undefined);
});

test('buildAnalysisIndex: matrix-only evidence remains reachable by representative and exact filename', () => {
  const files = [
    'vex-test-en-foundation-320.png',
    'vex-test-en-foundation-1440.png',
  ];
  const result = buildAnalysisIndex(
    {},
    {},
    findScreenshots(files),
    ['vex-test'],
    ['en'],
    findScreenshotEvidence(files)
  );

  assert.equal(
    result.pages['vex-test'].screenshots.en,
    'docs/screenshots/vex-test-en-foundation-1440.png'
  );
  assert.deepEqual(
    result.pages['vex-test'].screenshotEvidence.map(record => record.path),
    files.slice().sort().map(file => `docs/screenshots/${file}`)
  );
});

test('buildAnalysisIndex: Assets screenshot fallback fills missing locales while local representatives remain first', () => {
  const projection = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'screenshot-evidence-assets.json'), 'utf8'));
  const local = findScreenshotEvidence(['specimen-full-translation-en.png']);
  const assets = findAssetScreenshotEvidence(projection);
  const merged = mergeScreenshotEvidence(local, assets);
  const screenshots = representativeScreenshots(merged);

  const result = buildAnalysisIndex(
    {},
    {},
    screenshots,
    ['specimen-full-translation'],
    ['en', 'ja'],
    merged
  );

  assert.equal(
    result.pages['specimen-full-translation'].screenshots.en,
    'docs/screenshots/specimen-full-translation-en.png',
    'local evidence remains the representative while present'
  );
  assert.match(
    result.pages['specimen-full-translation'].screenshots.ja,
    /^https:\/\/vgong24\.github\.io\/Vextreme-Assets\/evidence\/screenshots\/.*\.png$/,
    'Assets custody fills the otherwise-missing locale'
  );
  assert.equal(
    result.pages['specimen-full-translation'].screenshotEvidence,
    undefined,
    'Assets fallback records do not masquerade as exact local institutional matrix evidence'
  );
});

test('buildAnalysisIndex: institutional Assets records remain exact matrix evidence without duplicating local coordinates', () => {
  const projection = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'screenshot-evidence-assets.json'), 'utf8'));
  const assets = findAssetScreenshotEvidence(projection);
  const remote = assets['vextreme-home'];
  assert.equal(remote.length, 18);

  const remoteOnly = exactMatrixEvidence(remote);
  assert.equal(remoteOnly.length, 18);
  assert.ok(remoteOnly.every(record =>
    record.storage === 'assets' && record.captureKind === 'institutional-localization'
  ));

  const local = findScreenshotEvidence(['vextreme-home-en-foundation-320.png'])['vextreme-home'];
  const deduped = exactMatrixEvidence([...(local || []), ...remote]);
  assert.equal(deduped.length, 18, 'one exact coordinate must not appear twice across custodians');
  const chosen = deduped.find(record =>
    record.locale === 'en' && record.theme === 'foundation' && record.viewport === 320
  );
  assert.equal(chosen.path, 'docs/screenshots/vextreme-home-en-foundation-320.png',
    'local custody wins when the exact coordinate exists in both places');

  const screenshots = representativeScreenshots({ 'vextreme-home':remote });
  const result = buildAnalysisIndex(
    {}, {}, screenshots, ['vextreme-home'], ['en','ja','zh'],
    { 'vextreme-home':remote }
  );
  assert.equal(result.pages['vextreme-home'].screenshotEvidence.length, 18);
  assert.ok(result.pages['vextreme-home'].screenshotEvidence.every(record =>
    /^https:\/\/vgong24\.github\.io\/Vextreme-Assets\/evidence\/screenshots\//.test(record.path)
  ));
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
