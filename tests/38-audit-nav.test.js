'use strict';

/**
 * AUDIT-NAV — tests/38-audit-nav.test.js
 *
 * Tests for lib/audit-nav.js — the read-only nav-coverage auditor.
 *
 * Test order:
 *   1. countStaticHubLinks — hub-destination link detection
 *   2. hasShellJs — v1 loader detection
 *   3. godScriptHasSpiralFab — FAB-navigation availability detection
 *   4. classifyNav — full per-page classification
 *   5. Integration — the real repo's report is internally consistent
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');

const {
  HUB_DESTINATIONS,
  countStaticHubLinks,
  hasShellJs,
  godScriptHasSpiralFab,
  classifyNav,
  getNavReport,
} = require('../lib/audit-nav');

const ROOT = path.join(__dirname, '..');

// ── 1. countStaticHubLinks ────────────────────────────────────────────────────

test('countStaticHubLinks: zero for a page with no hub links', () => {
  assert.equal(countStaticHubLinks('<p>hello</p>'), 0);
});

test('countStaticHubLinks: counts distinct hub destinations, not occurrences', () => {
  const html = '<a href="index.html">Home</a><a href="index.html">Home again</a><a href="archives.html">Archives</a>';
  assert.equal(countStaticHubLinks(html), 2);
});

test('countStaticHubLinks: matches regardless of absolute/relative URL form', () => {
  const html = '<a href="https://vgong24.github.io/Vextreme/pages/terrain-map.html">Map</a>';
  assert.equal(countStaticHubLinks(html), 1);
});

test('HUB_DESTINATIONS: is the real, current set of hub pages', () => {
  assert.deepEqual(HUB_DESTINATIONS, ['index.html', 'archives.html', 'ecosystem-hub.html', 'terrain-map.html']);
});

// ── 2. hasShellJs ──────────────────────────────────────────────────────────────

test('hasShellJs: true when the page references lib/shell.js', () => {
  assert.equal(hasShellJs('<script src=".../lib/shell.js"></script>'), true);
});

test('hasShellJs: false otherwise', () => {
  assert.equal(hasShellJs('<script src=".../lib/vextreme-index-v2.js"></script>'), false);
});

// ── 3. godScriptHasSpiralFab ──────────────────────────────────────────────────

test('godScriptHasSpiralFab: true when the assembled script bundles spiral-fab', () => {
  assert.equal(godScriptHasSpiralFab('/* feature: spiral-fab */\n...'), true);
  assert.equal(godScriptHasSpiralFab('...vex-fab.js...'), true);
});

test('godScriptHasSpiralFab: false for empty/missing dist output', () => {
  assert.equal(godScriptHasSpiralFab(''), false);
  assert.equal(godScriptHasSpiralFab(null), false);
});

// ── 4. classifyNav ─────────────────────────────────────────────────────────────

test('classifyNav: navigable via a static hub link alone', () => {
  const result = classifyNav('foo', '<a href="archives.html">Archives</a>', false, '');
  assert.equal(result.navigable, true);
  assert.equal(result.staticHubLinks, 1);
  assert.equal(result.hasFabNav, false);
});

test('classifyNav: navigable via shell.js alone', () => {
  const result = classifyNav('foo', '<script src=".../lib/shell.js"></script>', false, '');
  assert.equal(result.navigable, true);
  assert.equal(result.hasShellJs, true);
});

test('classifyNav: navigable via FAB nav only when actually wired, not just God-Script-exists', () => {
  const withoutWiring = classifyNav('foo', '<p>content</p>', false, 'feature: spiral-fab');
  assert.equal(withoutWiring.hasFabNav, false, 'a God Script with spiral-fab that the page never loads must not count');

  const wired = classifyNav('foo', '<p>content</p>', true, 'feature: spiral-fab');
  assert.equal(wired.hasFabNav, true);
  assert.equal(wired.navigable, true);
});

test('classifyNav: isolated when none of the three mechanisms are present', () => {
  const result = classifyNav('foo', '<p>just content, no links</p>', false, '');
  assert.equal(result.navigable, false);
  assert.equal(result.staticHubLinks, 0);
  assert.equal(result.hasShellJs, false);
  assert.equal(result.hasFabNav, false);
});

// ── 5. Integration ─────────────────────────────────────────────────────────────

test('integration: the real repo report is internally consistent', () => {
  const { rows, summary } = getNavReport();

  assert.ok(rows.length > 0, 'must find real pages');
  assert.equal(summary.total, rows.length);
  assert.equal(summary.navigable + summary.isolated, summary.total);
  assert.equal(summary.isolatedSlugs.length, summary.isolated);

  // Every isolated slug in the summary must correspond to a real row marked not navigable.
  const bySlug = Object.fromEntries(rows.map(r => [r.slug, r]));
  for (const slug of summary.isolatedSlugs) {
    assert.ok(bySlug[slug], `isolated slug ${slug} must have a real row`);
    assert.equal(bySlug[slug].navigable, false, `${slug} listed isolated but classified navigable`);
  }
});

test('integration: victor-methodology-presentation is navigable via real FAB wiring, not a fluke', () => {
  const { rows } = getNavReport();
  const row = rows.find(r => r.slug === 'victor-methodology-presentation');
  assert.ok(row, 'victor-methodology-presentation must be a real page');
  assert.equal(row.hasFabNav, true, 'the one fully-wired page must show real FAB nav, confirming the detector works against real dist/ output');
});
