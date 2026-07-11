'use strict';

/**
 * PAGE HEALTH - generated per-screen capability visibility.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  pageI18nKeys,
  languageCoverage,
  hasVisibleThemeStyles,
  metaDescriptionText,
  fabDelivery,
  buildPageHealth,
  loadInputs,
} = require('../lib/build-page-health');

const ROOT = path.join(__dirname, '..');

test('PAGE-HEALTH: identity keys and language completeness are source-derived', () => {
  const keys = pageI18nKeys('<p data-i18n="x.a"></p><p data-i18n="x.b"></p>');
  assert.deepEqual(keys, ['x.a', 'x.b']);
  const coverage = languageCoverage(keys, {
    'x.a': { langs: ['en', 'ja'] },
    'x.b': { langs: ['en'] },
  });
  assert.equal(coverage.en.state, 'full');
  assert.equal(coverage.ja.state, 'partial');
});

test('PAGE-HEALTH: theme mechanism is distinct from visible theme styles', () => {
  assert.equal(hasVisibleThemeStyles('<html data-theme="dark"><style>body{color:red}</style>'), false);
  assert.equal(hasVisibleThemeStyles('<style>:root[data-theme="light"]{color:black}</style>'), true);
});

test('PAGE-HEALTH: meta description is extracted as text, not flattened to a boolean', () => {
  assert.equal(metaDescriptionText('<meta name="description" content="A real summary.">'), 'A real summary.');
  assert.equal(metaDescriptionText('<meta name="description" content="  padded  ">'), 'padded');
  assert.equal(metaDescriptionText('<meta name="description" content="">'), '');
  assert.equal(metaDescriptionText('<meta name="description" content="   ">'), '');
  assert.equal(metaDescriptionText('<title>No description tag</title>'), '');
  assert.equal(metaDescriptionText('<meta content="reversed attribute order" name="description">'), 'reversed attribute order');
  assert.equal(metaDescriptionText('<meta property="og:description" content="not the same tag">'), '');
});

test('PAGE-HEALTH: FAB delivery preserves shell, God Script, disabled, and missing states', () => {
  assert.equal(fabDelivery('<script src="/lib/shell.js"></script>', '', false), 'shell');
  assert.equal(fabDelivery('', '/* feature: spiral-fab */', true), 'god-script');
  assert.equal(fabDelivery('<script>VEXTREME({fab:false})</script>', '', false), 'disabled');
  assert.equal(fabDelivery('', '', false), 'missing');
});

test('PAGE-HEALTH: analysis indexing and an exposed analysis control remain separate facts', () => {
  const result = buildPageHealth({
    pageSlugs: ['indexed-only'], htmlBySlug: { 'indexed-only': '<a href="archives.html">out</a>' },
    distBySlug: { 'indexed-only': '' }, wiredBySlug: {},
    navRows: [{ slug: 'indexed-only', navigable: true, staticHubLinks: 1, hasShellJs: false, hasFabNav: false }],
    nodes: [], manifest: {}, analysisPages: { 'indexed-only': { keys: [] } }, screenshotFiles: [],
  });
  assert.equal(result.pages['indexed-only'].analysis.indexed, true);
  assert.equal(result.pages['indexed-only'].analysis.control, false);
});

test('PAGE-HEALTH: critical means isolated; incomplete capabilities remain visible as attention', () => {
  const base = {
    pageSlugs: ['healthy', 'isolated'],
    htmlBySlug: {
      healthy: '<style>:root[data-theme="light"]{color:black}</style><p data-i18n="x.a"></p><script src="/lib/shell.js"></script>',
      isolated: '<meta name="description" content="Present but still isolated."><p>plain</p>',
    },
    distBySlug: { healthy: '', isolated: '' },
    wiredBySlug: {},
    navRows: [
      { slug: 'healthy', navigable: true, staticHubLinks: 0, hasShellJs: true, hasFabNav: false },
      { slug: 'isolated', navigable: false, staticHubLinks: 0, hasShellJs: false, hasFabNav: false },
    ],
    nodes: [{ slug: 'healthy', title: 'Healthy', arcKeys: ['a'] }],
    manifest: { 'x.a': { langs: ['en'] } },
    analysisPages: {},
    screenshotFiles: ['healthy-en.png'],
  };
  const result = buildPageHealth(base);
  assert.equal(result.pages.healthy.health.state, 'healthy');
  assert.equal(result.pages.isolated.health.state, 'critical');
  assert.equal(result.pages.isolated.placement.state, 'uncurated');
  assert.equal(result.pages.healthy.discovery.metaDescription, '', 'a missing meta description alone must not demote an otherwise-healthy page');
  assert.equal(result.pages.healthy.health.state, 'healthy', 'a missing meta description alone must not affect health state');
  assert.equal(result.pages.isolated.discovery.metaDescription, 'Present but still isolated.');
  assert.equal(result.summary.withMetaDescription, 1);
});

test('PAGE-HEALTH integration: committed projection equals fresh source computation', () => {
  const committed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'page-health.json'), 'utf8'));
  assert.deepEqual(committed, buildPageHealth(loadInputs()));
});

test('PAGE-HEALTH integration: Archives and Terrain consume the shared projection', () => {
  const archives = fs.readFileSync(path.join(ROOT, 'pages', 'archives.html'), 'utf8');
  const terrain = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'terrain-map.json'), 'utf8'));
  assert.match(archives, /Page capability health/);
  for (const page of terrain.pages.filter((entry) => entry.live)) {
    assert.ok(page.capability, `${page.slug} missing capability projection`);
    assert.equal(page.capability.identity, undefined, `${page.slug} should carry the compact Terrain digest, not full language coverage`);
  }
});

// [VXG RealForever]
