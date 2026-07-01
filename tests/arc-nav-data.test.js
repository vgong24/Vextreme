'use strict';

/**
 * Tests for the buildArcNavData transformation.
 *
 * The function lives inside a browser IIFE (vextreme-index-v2.js) and
 * calls urlFromSlug which reads window.location. Rather than mock a DOM,
 * we re-implement the pure data portion here and test it in isolation.
 * If the function ever moves to a shared module, replace this with a
 * direct import and delete the local copy below.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { buildSlugMap, buildArcMap, buildArcMeta } = require('../lib/build-index');

const fixtureNodes   = require('./fixtures/nodes.fixture.json');
const fixtureArcsDef = require('./fixtures/arcs.fixture.json');

// Pure data transform extracted from vextreme-index-v2.js buildArcNavData.
// URL builder injected so the function is testable without window.location.
function buildArcNavData(slug, index, urlFromSlug) {
  var node = index.slugMap[slug];
  if (!node) return null;

  var sortedKeys = node.arcKeys;
  var arcViews   = [];

  for (var i = 0; i < sortedKeys.length; i++) {
    var arcName  = sortedKeys[i];
    var sections = index.arcMap[arcName];
    if (!sections || !sections.length) continue;

    var flatSlugs      = [];
    var sectionForSlug = null;
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
      arcName:      arcName,
      arcMeta:      meta,
      renderMode:   meta.renderMode || 'dots',
      sectionLabel: sectionForSlug.label,
      position:     pos + 1,
      total:        flatSlugs.length,
      prevSlug:     prevSlug,
      nextSlug:     nextSlug,
      prevUrl:      prevSlug ? urlFromSlug(prevSlug) : null,
      nextUrl:      nextSlug ? urlFromSlug(nextSlug) : null
    });
  }

  return { node: node, arcs: arcViews };
}

// Build a real index from fixtures — same pipeline as CI.
function buildFixtureIndex() {
  const slugMap = buildSlugMap(fixtureNodes, fixtureArcsDef);
  const arcMap  = buildArcMap(fixtureNodes, fixtureArcsDef, slugMap);
  const arcMeta = buildArcMeta(fixtureArcsDef);
  return { slugMap, arcMap, arcMeta };
}

const fakeUrl = slug => `/pages/${slug}.html`;
const index   = buildFixtureIndex();

// ── unknown slug ──────────────────────────────────────────────────────────────

test('buildArcNavData: unknown slug returns null — the mount function checks for null before rendering, so a 404 or test page never throws', () => {
  assert.equal(buildArcNavData('does-not-exist', index, fakeUrl), null);
});

// ── position and total ────────────────────────────────────────────────────────

test('buildArcNavData: position is 1-indexed and total reflects the full section — "1 / 3" tells the reader they are at the start of a 3-entry arc', () => {
  // arc_a: [alpha, beta, gamma]. alpha is first.
  // 0-indexed position would display "0 / 3" to the user — wrong.
  const lattice  = buildArcNavData('alpha', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.position, 1);
  assert.equal(arcAView.total, 3);
});

test('buildArcNavData: middle entry position updates correctly — off-by-one here means every page after the first shows the wrong counter', () => {
  // arc_a: [alpha, beta, gamma]. beta should show "2 / 3".
  // A regression here (e.g. position not adding 1) would show "1 / 3" for beta — actively misleading.
  const lattice  = buildArcNavData('beta', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.position, 2);
  assert.equal(arcAView.total, 3);
});

// ── prev / next URLs ──────────────────────────────────────────────────────────

test('buildArcNavData: first entry has no prevUrl — a non-null prevUrl would render a "← prev" link pointing to an invalid page', () => {
  // The renderer checks prevUrl === null to decide whether to render a disabled span
  // vs. a real link. A wrong non-null value would produce a broken anchor.
  const lattice  = buildArcNavData('alpha', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.prevUrl, null);
  assert.equal(arcAView.nextUrl, '/pages/beta.html');
});

test('buildArcNavData: last entry has no nextUrl — a non-null nextUrl would suggest more content exists when the arc is complete', () => {
  // arc_a: [alpha, beta, gamma]. gamma is last.
  const lattice  = buildArcNavData('gamma', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.nextUrl, null);
  assert.equal(arcAView.prevUrl, '/pages/beta.html');
});

test('buildArcNavData: middle entry has both prevUrl and nextUrl pointing to the correct adjacent slugs', () => {
  // beta sits between alpha and gamma. Wrong neighbors = reader navigates to a different arc entry.
  const lattice  = buildArcNavData('beta', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.prevUrl, '/pages/alpha.html');
  assert.equal(arcAView.nextUrl, '/pages/gamma.html');
});

// ── renderMode propagation ────────────────────────────────────────────────────

test('buildArcNavData: renderMode flows from arcMeta into the arcView — if missing, RENDERERS falls back to "dots" with a console warning instead of the intended layout', () => {
  // arc_a uses "dots", arc_b uses "position". The renderer registry dispatches on this value.
  // If renderMode were stripped here, arc_b would silently render as "dots" — wrong layout,
  // no error, no warning until someone notices the UI looks different.
  const lattice  = buildArcNavData('alpha', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  const arcBView = lattice.arcs.find(v => v.arcName === 'arc_b');
  assert.equal(arcAView.renderMode, 'dots');
  assert.equal(arcBView.renderMode, 'position');
});

// ── section label ─────────────────────────────────────────────────────────────

test('buildArcNavData: sectionLabel identifies which section within an arc the page belongs to — wrong label misrepresents the reader\'s location in multi-section arcs', () => {
  // The "dots" renderer displays "Arc Title · Section Label" as the arc nav header.
  // A wrong section label tells the reader they are in a different part of the story.
  const lattice  = buildArcNavData('alpha', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.sectionLabel, 'Season One');
});

// ── arc ordering (priority) ───────────────────────────────────────────────────

test('buildArcNavData: arcs render in priority order (lower number = first) — the primary arc must appear at the top of the nav widget', () => {
  // alpha belongs to arc_a (priority 10) and arc_b (priority 20).
  // arc_a is the "primary" story arc and should be the first nav row the reader sees.
  // Wrong order deprioritizes the main arc and surfaces a secondary arc instead.
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  assert.equal(lattice.arcs[0].arcName, 'arc_a');
  assert.equal(lattice.arcs[1].arcName, 'arc_b');
});

// ── node metadata ─────────────────────────────────────────────────────────────

test('buildArcNavData: node title is passed through to lattice.node — the renderer uses it for the "You Are Here: {title}" label at the bottom of the nav widget', () => {
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  assert.equal(lattice.node.title, 'Alpha Entry');
});

// ── explicit ordering preserved ───────────────────────────────────────────────

test('buildArcNavData: explicit arc position is based on declared order, not date — author curation must survive the build pipeline end-to-end', () => {
  // arc_explicit declares [explicit-second, explicit-first].
  // explicit-second is position 1 even though both nodes have null dates.
  // This tests the full pipeline: arcs fixture → buildArcMap (explicit) → buildArcNavData → position.
  // A regression anywhere in that chain would show the wrong position to the reader.
  const lattice = buildArcNavData('explicit-second', index, fakeUrl);
  const arcView = lattice.arcs.find(v => v.arcName === 'arc_explicit');
  assert.equal(arcView.position, 1);
  assert.equal(arcView.nextUrl, '/pages/explicit-first.html');
});

// [VXG RealForever]
