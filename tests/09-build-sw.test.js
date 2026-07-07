'use strict';

/**
 * BUILD-SW — tests/09-build-sw.test.js
 *
 * Tests for lib/build-sw.js (Service Worker generator).
 *
 * Test order:
 *   1. collectDistUrls — reads dist/ and returns URL list
 *   2. generateSWContent — produces valid sw.js string
 *   3. CORE_ASSETS constant — required shared assets present
 *   4. getCommitHash — returns a non-empty string
 *   5. collectArcBundleUrls — arc-chunked bundling pilot (od-001/td-006)
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const { collectDistUrls, collectArcBundleUrls, generateSWContent, getCommitHash, CORE_ASSETS } = require('../lib/build-sw');

const ROOT     = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const ARC_BUNDLES_INDEX = path.join(ROOT, 'data', 'strings', 'compiled', 'arcs', 'index.json');

// ── 1. collectDistUrls ────────────────────────────────────────────────────────

test('BUILD-SW: collectDistUrls returns an array', () => {
  const urls = collectDistUrls(DIST_DIR);
  assert.ok(Array.isArray(urls), 'must return array');
});

test('BUILD-SW: collectDistUrls returns at least one God Script URL', () => {
  const urls = collectDistUrls(DIST_DIR);
  assert.ok(urls.length > 0, 'dist/ must have at least one assembled God Script');
});

test('BUILD-SW: all collectDistUrls entries start with /Vextreme/dist/', () => {
  const urls = collectDistUrls(DIST_DIR);
  for (const url of urls) {
    assert.ok(url.startsWith('/Vextreme/dist/'), `URL must start with /Vextreme/dist/: ${url}`);
    assert.ok(url.endsWith('.js'), `URL must end with .js: ${url}`);
  }
});

test('BUILD-SW: collectDistUrls matches actual dist/ filenames', () => {
  const urls   = collectDistUrls(DIST_DIR);
  const files  = fs.readdirSync(DIST_DIR).filter(f => /^vextreme-.+\.js$/.test(f)).sort();
  assert.equal(urls.length, files.length, 'URL count must match file count');
  for (const file of files) {
    assert.ok(urls.some(u => u.endsWith('/' + file)), `dist/${file} must appear in URL list`);
  }
});

test('BUILD-SW: collectDistUrls returns empty array for nonexistent dir', () => {
  const urls = collectDistUrls('/nonexistent/path/dist');
  assert.deepEqual(urls, []);
});

// ── 2. generateSWContent ─────────────────────────────────────────────────────

const SAMPLE_URLS  = ['/Vextreme/dist/vextreme-test.js'];
const SAMPLE_HASH  = 'abc1234';

test('BUILD-SW: generateSWContent returns a non-empty string', () => {
  const content = generateSWContent(SAMPLE_URLS, SAMPLE_HASH);
  assert.equal(typeof content, 'string');
  assert.ok(content.length > 0);
});

test('BUILD-SW: output contains the cache name with commit hash', () => {
  const content = generateSWContent(SAMPLE_URLS, SAMPLE_HASH);
  assert.ok(content.includes(`vextreme-v1-${SAMPLE_HASH}`), 'cache name must include commit hash');
});

test('BUILD-SW: output declares CACHE_NAME variable', () => {
  const content = generateSWContent(SAMPLE_URLS, SAMPLE_HASH);
  assert.ok(content.includes('var CACHE_NAME'), 'must declare CACHE_NAME');
});

test('BUILD-SW: output declares PRECACHE_URLS with all URLs', () => {
  const content = generateSWContent(SAMPLE_URLS, SAMPLE_HASH);
  assert.ok(content.includes('var PRECACHE_URLS'), 'must declare PRECACHE_URLS');
  assert.ok(content.includes('/Vextreme/dist/vextreme-test.js'), 'must include supplied URL');
});

test('BUILD-SW: output includes CORE_ASSETS in precache list', () => {
  const content = generateSWContent([], SAMPLE_HASH);
  for (const asset of CORE_ASSETS) {
    assert.ok(content.includes(asset), `must include core asset: ${asset}`);
  }
});

test('BUILD-SW: output has install event listener', () => {
  const content = generateSWContent(SAMPLE_URLS, SAMPLE_HASH);
  assert.ok(content.includes("'install'"), 'must have install listener');
  assert.ok(content.includes('cache.addAll'), 'install must call cache.addAll');
  assert.ok(content.includes('skipWaiting'), 'install must call skipWaiting');
});

test('BUILD-SW: output has activate event listener with cache cleanup', () => {
  const content = generateSWContent(SAMPLE_URLS, SAMPLE_HASH);
  assert.ok(content.includes("'activate'"), 'must have activate listener');
  assert.ok(content.includes('caches.keys()'), 'activate must iterate caches');
  assert.ok(content.includes('caches.delete'), 'activate must delete old caches');
});

test('BUILD-SW: output has fetch event listener', () => {
  const content = generateSWContent(SAMPLE_URLS, SAMPLE_HASH);
  assert.ok(content.includes("'fetch'"), 'must have fetch listener');
  assert.ok(content.includes('caches.match'), 'fetch must check cache first');
  assert.ok(content.includes("'text/html'"), 'fetch must skip HTML requests');
});

test('BUILD-SW: output uses dev hash when commitHash is empty', () => {
  const content = generateSWContent([], '');
  assert.ok(content.includes('vextreme-v1-dev'), 'must fall back to dev hash');
});

// ── 3. CORE_ASSETS ───────────────────────────────────────────────────────────

test('BUILD-SW: CORE_ASSETS includes design-system.css', () => {
  assert.ok(CORE_ASSETS.some(a => a.includes('design-system.css')), 'must include design-system.css');
});

test('BUILD-SW: CORE_ASSETS includes arc-nav.css', () => {
  assert.ok(CORE_ASSETS.some(a => a.includes('arc-nav.css')), 'must include arc-nav.css');
});

test('BUILD-SW: CORE_ASSETS includes index.json', () => {
  assert.ok(CORE_ASSETS.some(a => a.includes('index.json')), 'must include index.json');
});

// ── 4. getCommitHash ─────────────────────────────────────────────────────────

test('BUILD-SW: getCommitHash returns a non-empty string', () => {
  const hash = getCommitHash();
  assert.equal(typeof hash, 'string');
  assert.ok(hash.length > 0, 'must return non-empty string');
});

test('BUILD-SW: getCommitHash returns a short git hash or dev', () => {
  const hash = getCommitHash();
  // Either a valid short hash (hex chars) or the fallback 'dev'
  assert.ok(/^[0-9a-f]{4,12}$/.test(hash) || hash === 'dev',
    `hash "${hash}" must be a short git hash or 'dev'`);
});

// ── 5. collectArcBundleUrls ──────────────────────────────────────────────────

test('BUILD-SW: collectArcBundleUrls returns an array', () => {
  const urls = collectArcBundleUrls(ARC_BUNDLES_INDEX);
  assert.ok(Array.isArray(urls), 'must return array');
});

test('BUILD-SW: collectArcBundleUrls returns empty array for a nonexistent index', () => {
  const urls = collectArcBundleUrls('/nonexistent/path/index.json');
  assert.deepEqual(urls, []);
});

test('BUILD-SW: collectArcBundleUrls builds one URL per arc per language', () => {
  const fixture = { 'sample_arc': { langs: { en: 10, zh: 8 } } };
  const tmpPath = path.join(require('os').tmpdir(), `arc-bundles-index-${Date.now()}.json`);
  fs.writeFileSync(tmpPath, JSON.stringify(fixture));
  try {
    const urls = collectArcBundleUrls(tmpPath);
    assert.deepEqual(urls, [
      '/Vextreme/data/strings/compiled/arcs/sample_arc.en.json',
      '/Vextreme/data/strings/compiled/arcs/sample_arc.zh.json',
    ]);
  } finally {
    fs.unlinkSync(tmpPath);
  }
});

test('BUILD-SW: the real arc bundles index (if present) only contributes URLs for opted-in arcs', () => {
  // This is the blast-radius guarantee: the pilot should add a handful of
  // URLs (one per opted-in arc per language), not one per page on the site.
  if (!fs.existsSync(ARC_BUNDLES_INDEX)) return; // no arc has opted in yet — nothing to check
  const urls = collectArcBundleUrls(ARC_BUNDLES_INDEX);
  assert.ok(urls.length < 20, `expected a small, bounded URL count for the pilot, got ${urls.length}`);
});

// [VXG RealForever]
