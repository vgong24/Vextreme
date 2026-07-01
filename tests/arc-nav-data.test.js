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

test('buildArcNavData: returns null for unknown slug', () => {
  assert.equal(buildArcNavData('does-not-exist', index, fakeUrl), null);
});

// ── position and total ────────────────────────────────────────────────────────

test('buildArcNavData: position is 1-indexed, total is section length', () => {
  // arc_a: [alpha, beta, gamma] — alpha is first
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.position, 1);
  assert.equal(arcAView.total, 3);
});

test('buildArcNavData: middle entry has correct position', () => {
  // arc_a: [alpha, beta, gamma] — beta is second
  const lattice = buildArcNavData('beta', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.position, 2);
  assert.equal(arcAView.total, 3);
});

// ── prev / next URLs ──────────────────────────────────────────────────────────

test('buildArcNavData: first entry has no prevUrl', () => {
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.prevUrl, null);
  assert.equal(arcAView.nextUrl, '/pages/beta.html');
});

test('buildArcNavData: last entry has no nextUrl', () => {
  // arc_a: [alpha, beta, gamma] — gamma is last
  const lattice = buildArcNavData('gamma', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.nextUrl, null);
  assert.equal(arcAView.prevUrl, '/pages/beta.html');
});

test('buildArcNavData: middle entry has both prevUrl and nextUrl', () => {
  const lattice = buildArcNavData('beta', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.prevUrl, '/pages/alpha.html');
  assert.equal(arcAView.nextUrl, '/pages/gamma.html');
});

// ── renderMode propagation ────────────────────────────────────────────────────

test('buildArcNavData: renderMode comes from arcMeta', () => {
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  const arcBView = lattice.arcs.find(v => v.arcName === 'arc_b');
  assert.equal(arcAView.renderMode, 'dots');
  assert.equal(arcBView.renderMode, 'position');
});

// ── section label ─────────────────────────────────────────────────────────────

test('buildArcNavData: sectionLabel matches the section containing the slug', () => {
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  const arcAView = lattice.arcs.find(v => v.arcName === 'arc_a');
  assert.equal(arcAView.sectionLabel, 'Season One');
});

// ── arc ordering (priority) ───────────────────────────────────────────────────

test('buildArcNavData: arcs listed in priority order (lower value first)', () => {
  // alpha is in arc_a (priority 10) and arc_b (priority 20)
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  assert.equal(lattice.arcs[0].arcName, 'arc_a');
  assert.equal(lattice.arcs[1].arcName, 'arc_b');
});

// ── node metadata ─────────────────────────────────────────────────────────────

test('buildArcNavData: node title is passed through', () => {
  const lattice = buildArcNavData('alpha', index, fakeUrl);
  assert.equal(lattice.node.title, 'Alpha Entry');
});

// ── explicit ordering preserved ───────────────────────────────────────────────

test('buildArcNavData: explicit arc preserves declared order for position', () => {
  // arc_explicit: [explicit-second, explicit-first] — explicit-second is position 1
  const lattice = buildArcNavData('explicit-second', index, fakeUrl);
  const arcView = lattice.arcs.find(v => v.arcName === 'arc_explicit');
  assert.equal(arcView.position, 1);
  assert.equal(arcView.nextUrl, '/pages/explicit-first.html');
});

// [VXG RealForever]
