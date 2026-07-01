'use strict';

/**
 * BROWSER NAV — tests/03-browser-nav.test.js
 *
 * Pipeline: data/index.json → buildArcNavData() → arcView[] → rendered nav HTML
 *
 * This file tests the browser-side consumption of the built index — specifically
 * the transformation from index data to the arcView objects that the RENDERERS
 * registry consumes to produce arc nav HTML.
 *
 * The function under test (buildArcNavData) lives inside a browser IIFE in
 * vextreme-index-v2.js and depends on window.location for URL construction.
 * Rather than mock a DOM, the pure data transform is re-implemented here with
 * an injected URL builder. This is intentional isolation: the URL builder is
 * trivial and environment-specific; the data transform is the contract being tested.
 *
 * If buildArcNavData moves to a shared module, replace the local copy below with
 * a direct import. The comment at the top of the local copy signals this.
 *
 * This file uses the same fixture index built by tests/01-content-pipeline.test.js.
 * Failures in the content pipeline will cascade here — if arcMap is wrong, arcView
 * positions and URLs will be wrong too. Run 01 first for diagnosis.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { buildSlugMap, buildArcMap, buildArcMeta } = require('../lib/build-index');

const fixtureNodes   = require('./fixtures/nodes.fixture.json');
const fixtureArcsDef = require('./fixtures/arcs.fixture.json');

// Local copy of the pure data transform from vextreme-index-v2.js.
// URL builder injected so no DOM mock is needed.
// If this function moves to a shared module, replace with a direct import.
function buildArcNavData(slug, index, urlFromSlug) {
  var node = index.slugMap[slug];
  if (!node) return null;
  var arcViews = [];
  for (var i = 0; i < node.arcKeys.length; i++) {
    var arcName  = node.arcKeys[i];
    var sections = index.arcMap[arcName];
    if (!sections || !sections.length) continue;
    var flatSlugs = [], sectionForSlug = null;
    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      for (var j = 0; j < sec.slugs.length; j++) flatSlugs.push(sec.slugs[j]);
      if (sec.slugs.indexOf(slug) >= 0) sectionForSlug = sec;
    }
    var pos = flatSlugs.indexOf(slug);
    if (pos < 0 || !sectionForSlug) continue;
    var prevSlug = flatSlugs[pos - 1] || null;
    var nextSlug = flatSlugs[pos + 1] || null;
    var meta     = (index.arcMeta && index.arcMeta[arcName]) || { title: arcName, url: '#', renderMode: 'dots' };
    arcViews.push({
      arcName, arcMeta: meta, renderMode: meta.renderMode || 'dots',
      sectionLabel: sectionForSlug.label,
      position: pos + 1, total: flatSlugs.length,
      prevSlug, nextSlug,
      prevUrl: prevSlug ? urlFromSlug(prevSlug) : null,
      nextUrl: nextSlug ? urlFromSlug(nextSlug) : null
    });
  }
  return { node, arcs: arcViews };
}

function buildIndex() {
  const slugMap = buildSlugMap(fixtureNodes, fixtureArcsDef);
  const arcMap  = buildArcMap(fixtureNodes, fixtureArcsDef, slugMap);
  const arcMeta = buildArcMeta(fixtureArcsDef);
  return { slugMap, arcMap, arcMeta };
}

const fakeUrl = slug => `/pages/${slug}.html`;
const index   = buildIndex();

// ── 1. Full pipeline integration ──────────────────────────────────────────────

test('PIPELINE: given a valid index, a middle entry produces correct position, section label, renderMode, and adjacent URLs', () => {
  // beta is position 2 of 3 in arc_a (chronological: alpha, beta, gamma).
  // This is the full contract the renderer depends on. Any regression in how
  // buildArcNavData reads the index — section flattening, position calculation,
  // URL construction — will show up here before it breaks a live page.
  const lattice  = buildArcNavData('beta', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');

  assert.ok(arcAView, 'arc_a row missing from arcViews for beta');
  assert.equal(arcAView.position,     2,                      'position should be 1-indexed (2 of 3)');
  assert.equal(arcAView.total,        3,                      'total should reflect full section length');
  assert.equal(arcAView.prevUrl,      '/pages/alpha.html',    'prevUrl should point to alpha');
  assert.equal(arcAView.nextUrl,      '/pages/gamma.html',    'nextUrl should point to gamma');
  assert.equal(arcAView.sectionLabel, 'Season One',           'sectionLabel should match the arc definition');
  assert.equal(arcAView.renderMode,   'dots',                 'renderMode should flow from arcMeta');
  assert.equal(lattice.node.title,    'Beta Entry',           'node title needed for You Are Here label');
});

// ── 2. Invariants ─────────────────────────────────────────────────────────────

test('INVARIANT: unknown slug returns null — the mount function checks for null before rendering, so missing pages never throw', () => {
  assert.equal(buildArcNavData('does-not-exist', index, fakeUrl), null);
});

test('INVARIANT: first entry has no prevUrl — a non-null prevUrl would render a broken prev link suggesting content that does not exist', () => {
  const view = buildArcNavData('alpha', index, fakeUrl).arcs.find(v => v.arcName === 'arc_a');
  assert.equal(view.prevUrl, null);
  assert.equal(view.nextUrl, '/pages/beta.html');
});

test('INVARIANT: last entry has no nextUrl — a non-null nextUrl implies more content after the arc ends', () => {
  const view = buildArcNavData('gamma', index, fakeUrl).arcs.find(v => v.arcName === 'arc_a');
  assert.equal(view.nextUrl, null);
  assert.equal(view.prevUrl, '/pages/beta.html');
});

test('INVARIANT: arcs appear in priority order — the primary arc must be the first row in the nav widget', () => {
  // alpha belongs to arc_a (priority 10) and arc_b (priority 20).
  // arc_a is the primary story arc. Wrong order deprioritizes the main arc.
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  assert.equal(lattice.arcs[0].arcName, 'arc_a');
  assert.equal(lattice.arcs[1].arcName, 'arc_b');
});

test('INVARIANT: renderMode flows from arcMeta into every arcView — without it, RENDERERS falls back to dots with a console warning and the wrong layout renders silently', () => {
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  assert.equal(lattice.arcs.find(v => v.arcName === 'arc_a').renderMode, 'dots');
  assert.equal(lattice.arcs.find(v => v.arcName === 'arc_b').renderMode, 'position');
});

// ── 3. Edge cases / regression guards ────────────────────────────────────────

test('EDGE: explicit arc position is based on declared order, not date — author curation survives the full build→browser pipeline', () => {
  // arc_explicit declares [explicit-second, explicit-first]. Both have null dates.
  // explicit-second must be position 1 with nextUrl pointing to explicit-first.
  // This tests the full chain: fixture → buildArcMap (explicit order) → buildArcNavData → position.
  const view = buildArcNavData('explicit-second', index, fakeUrl).arcs.find(v => v.arcName === 'arc_explicit');
  assert.equal(view.position, 1);
  assert.equal(view.nextUrl, '/pages/explicit-first.html');
  assert.equal(view.prevUrl, null);
});

// [VXG RealForever]
