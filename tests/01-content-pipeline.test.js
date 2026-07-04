'use strict';

/**
 * CONTENT PIPELINE — tests/01-content-pipeline.test.js
 *
 * Pipeline: data/nodes.json + data/arcs-v2.json → data/index.json → browser nav
 *
 * This file tests the full input-to-output contract of the content build pipeline.
 * Failures here mean readers see wrong navigation: broken prev/next links, wrong
 * position counters, missing arc rows, or no arc nav at all.
 *
 * Test order follows consequence severity:
 *   1. Full pipeline integration — verifies the whole path with real fixture data
 *   2. Invariants — properties that must hold regardless of data shape
 *   3. Edge cases / regression guards — specific failure modes with known consequences
 *
 * Implementation detail tests (parseDate alone, toDateISO alone) are intentionally
 * absent here. They are only tested in the context of the pipeline step that uses
 * them — if buildSlugMap produces the right dateISO, parseDate is working.
 * The one exception is the range-date syntax test, which cannot be verified at the
 * pipeline level without a specific fixture node that no other test needs.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');
const { buildSlugMap, buildArcMap, buildArcMeta, parseDate, findDuplicateSlugs } = require('../lib/build-index');

const nodes   = require('./fixtures/nodes.fixture.json');
const arcsDef = require('./fixtures/arcs.fixture.json');

// ── Shared fixture index (built once, reused across tests) ────────────────────

function buildFixtureIndex(customNodes, customArcs) {
  const n = customNodes || nodes;
  const a = customArcs  || arcsDef;
  const slugMap = buildSlugMap(n, a);
  const arcMap  = buildArcMap(n, a, slugMap);
  const arcMeta = buildArcMeta(a);
  return { slugMap, arcMap, arcMeta };
}

// ── 1. Full pipeline integration ──────────────────────────────────────────────

test('PIPELINE: given valid nodes and arcs, the index contains every slug, every arc, and correct nav data for a middle entry', () => {
  // This is the contract the browser depends on. If any step in the pipeline breaks —
  // slug mapping, arc resolution, arc metadata — some part of this assertion fails.
  // It is intentionally broad: one failure here means "the pipeline is broken",
  // and the targeted tests below identify exactly which step.
  const index   = buildFixtureIndex();
  const fakeUrl = s => `/pages/${s}.html`;

  // Every node is reachable
  for (const node of nodes) {
    assert.ok(index.slugMap[node.slug], `slug "${node.slug}" missing from index — that page will have no arc nav`);
  }

  // Every declared arc resolves
  assert.ok(index.arcMap['arc_a'],        'arc_a missing from index');
  assert.ok(index.arcMap['arc_b'],        'arc_b missing from index');
  assert.ok(index.arcMap['arc_explicit'], 'arc_explicit missing from index');

  // Full nav data for a middle entry (beta, position 2 of 3 in arc_a)
  const sections   = index.arcMap['arc_a'];
  const flatSlugs  = sections.flatMap(s => s.slugs);
  const pos        = flatSlugs.indexOf('beta');
  assert.equal(pos, 1, 'beta should be position 1 (0-indexed) in arc_a');
  assert.equal(fakeUrl(flatSlugs[pos - 1]), '/pages/alpha.html', 'prev of beta should be alpha');
  assert.equal(fakeUrl(flatSlugs[pos + 1]), '/pages/gamma.html', 'next of beta should be gamma');
  assert.equal(index.arcMeta['arc_a'].renderMode, 'dots');
  assert.equal(index.arcMeta['arc_b'].renderMode, 'position');
});

// ── 2. Invariants ─────────────────────────────────────────────────────────────

test('INVARIANT: arcKeys in slugMap are sorted by priority — the browser renders arcs in this order with no sorting logic of its own', () => {
  // arc_a (priority 10) must come before arc_b (priority 20) in alpha's arcKeys.
  // Wrong order = wrong arc displayed first on pages belonging to multiple arcs.
  const index = buildFixtureIndex();
  assert.deepEqual(index.slugMap['alpha'].arcKeys, ['arc_a', 'arc_b']);
});

test('INVARIANT: chronological sections are date-ascending — wrong order inverts prev/next links for every page in the arc', () => {
  const index = buildFixtureIndex();
  assert.deepEqual(index.arcMap['arc_a'][0].slugs, ['alpha', 'beta', 'gamma']);
});

test('INVARIANT: explicit section order is the author\'s declared intent — chronological re-sorting would override editorial curation', () => {
  // arc_explicit declares [explicit-second, explicit-first] — second before first intentionally.
  // If the build re-sorted by date, the arc would show a different entry as position 1.
  const index = buildFixtureIndex();
  assert.deepEqual(index.arcMap['arc_explicit'][0].slugs, ['explicit-second', 'explicit-first']);
});

test('INVARIANT: arc membership is exclusive — a node only appears in arcs declared in its own arcKeys', () => {
  // beta only declares arc_a. If it leaked into arc_b, arc_b\'s total count and
  // prev/next links would be wrong for every node in that arc.
  const index  = buildFixtureIndex();
  const slugs  = index.arcMap['arc_b'][0].slugs;
  assert.ok(!slugs.includes('beta'), 'beta leaked into arc_b — it only declared arc_a');
  assert.ok(slugs.includes('alpha') && slugs.includes('gamma') && slugs.includes('delta'));
});

test('INVARIANT: dateISO is derived at build time and stored in the index — the browser never re-parses human-readable date strings', () => {
  // Constraint: build step owns computation. dateISO must be present and correct
  // so the browser can do range comparisons with a string match, not a date parse.
  const index = buildFixtureIndex();
  assert.equal(index.slugMap['alpha'].dateISO, '2026-01-01');
  assert.equal(index.slugMap['beta'].dateISO,  '2026-01-15');
  assert.equal(index.slugMap['explicit-first'].dateISO, null); // no date — expected null, not undefined or ''
});

test('INVARIANT: _meta key in arcs-v2.json must not produce an arc entry — the browser would try to render a nav row for a schema object', () => {
  const index = buildFixtureIndex();
  assert.equal(index.arcMap['_meta'],  undefined);
  assert.equal(index.arcMeta['_meta'], undefined);
});

// ── 3. Edge cases / regression guards ────────────────────────────────────────

test('EDGE: range date syntax "Feb 7–10, 2026" uses the START date — using the end date would shift the node forward in chronological sort', () => {
  // This is the one implementation-level test kept here because it cannot be
  // verified at the pipeline level without a dedicated range-date fixture node.
  // An em-dash (–) vs hyphen (-) in the date string is a real authoring pattern.
  const d = parseDate('Feb 7–10, 2026');
  assert.ok(d instanceof Date && !isNaN(d));
  assert.equal(d.getDate(), 7);
  assert.equal(d.getMonth(), 1); // February = index 1
});

test('EDGE: unknown slug in explicit section is dropped gracefully — a typo in arcs-v2.json should not crash the build or corrupt adjacent entries', () => {
  const slugMap    = buildSlugMap(nodes, arcsDef);
  const localArcs  = {
    ...arcsDef,
    arc_broken: {
      priority: 99, renderMode: 'dots',
      parent: { title: 'Broken', url: '#' },
      sections: [{ label: 'Bad', order: 'explicit', slugs: ['does-not-exist', 'alpha'] }]
    }
  };
  const arcMap = buildArcMap(nodes, localArcs, slugMap);
  assert.deepEqual(arcMap['arc_broken'][0].slugs, ['alpha'],
    '\'does-not-exist\' should be dropped; \'alpha\' should remain');
});

test('EDGE: arc with no parent object falls back to arc name and "#" — broken link is better than a crash on arcMeta[name].title', () => {
  const arcMeta = buildArcMeta({ arc_no_parent: { priority: 5, renderMode: 'dots', sections: [] } });
  assert.equal(arcMeta['arc_no_parent'].title, 'arc_no_parent');
  assert.equal(arcMeta['arc_no_parent'].url, '#');
});

test('EDGE: arc with no renderMode defaults to "dots" — the RENDERERS registry always has a dots renderer, so the row never crashes silently', () => {
  const arcMeta = buildArcMeta({ arc_no_mode: { priority: 5, parent: { title: 'X', url: '/x' }, sections: [] } });
  assert.equal(arcMeta['arc_no_mode'].renderMode, 'dots');
});

test('EDGE: dateRange filter restricts chronological sections to only nodes within the date window', () => {
  // full_timeline arcs split into dated sections (e.g. "Jan 2026", "Feb 2026").
  // Without this filter, every node in the arc appears in every section — wrong position counts.
  const localNodes = nodes
    .filter(n => ['alpha', 'beta', 'gamma'].includes(n.slug))
    .map(n => ({ ...n, arcKeys: ['arc_ranged'] }));
  const localArcs = {
    arc_ranged: {
      priority: 5, renderMode: 'dots',
      parent: { title: 'Ranged', url: '/ranged' },
      sections: [
        { label: 'January',  order: 'chronological', dateRange: { from: '2026-01-01', to: '2026-01-31' } },
        { label: 'February', order: 'chronological', dateRange: { from: '2026-02-01', to: '2026-02-28' } }
      ]
    }
  };
  const slugMap = buildSlugMap(localNodes, localArcs);
  const arcMap  = buildArcMap(localNodes, localArcs, slugMap);
  assert.deepEqual(arcMap['arc_ranged'][0].slugs, ['alpha', 'beta'], 'January window: only Jan nodes');
  assert.deepEqual(arcMap['arc_ranged'][1].slugs, ['gamma'],         'February window: only Feb nodes');
});

test('EDGE: null-date nodes are excluded from dateRange sections — null cannot be compared to a date boundary without crashing or silently matching', () => {
  const localNodes = nodes.map(n => ({ ...n, arcKeys: ['arc_dated'] }));
  const localArcs  = {
    arc_dated: {
      priority: 5, renderMode: 'dots',
      parent: { title: 'Dated', url: '/dated' },
      sections: [{ label: 'All 2026', order: 'chronological', dateRange: { from: '2026-01-01', to: '2026-12-31' } }]
    }
  };
  const slugMap = buildSlugMap(localNodes, localArcs);
  const arcMap  = buildArcMap(localNodes, localArcs, slugMap);
  const slugs   = arcMap['arc_dated'][0].slugs;
  assert.ok(slugs.includes('alpha'),          'alpha (Jan 1) should be included');
  assert.ok(!slugs.includes('explicit-first'), 'null-date node must not appear in a dateRange section');
});

// ── 4. findDuplicateSlugs — BLOCK-severity guard ──────────────────────────────
//
// The slug is the system's only identifier (docs/architecture/02-slug.md) —
// department/arc lookups resolve to a physical file by computing pages/{slug}.html
// from a slug, never by storing a path separately. Two nodes sharing a slug means
// that computation silently picks one node over the other. This must be loud,
// not a warning that can be ignored — same BLOCK severity as strings-check.js's
// missing-EN-text case.

test('SLUGS: findDuplicateSlugs returns empty for a clean node list', () => {
  assert.deepEqual(findDuplicateSlugs(nodes), []);
});

test('SLUGS: findDuplicateSlugs detects a single duplicated slug', () => {
  const dupedNodes = [...nodes, { ...nodes[0] }]; // re-use nodes[0]'s slug
  const result = findDuplicateSlugs(dupedNodes);
  assert.equal(result.length, 1);
  assert.equal(result[0].slug, nodes[0].slug);
  assert.equal(result[0].count, 2);
});

test('SLUGS: findDuplicateSlugs reports every distinct slug that repeats, not just the first', () => {
  const dupedNodes = [...nodes, { ...nodes[0] }, { ...nodes[1] }, { ...nodes[1] }];
  const result = findDuplicateSlugs(dupedNodes).sort((a, b) => a.slug.localeCompare(b.slug));
  const bySlug  = Object.fromEntries(result.map(r => [r.slug, r.count]));
  assert.equal(bySlug[nodes[0].slug], 2);
  assert.equal(bySlug[nodes[1].slug], 3);
});

test('SLUGS: the real data/nodes.json has zero duplicate slugs', () => {
  const realNodes = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'nodes.json'), 'utf8'));
  const dupes = findDuplicateSlugs(realNodes);
  assert.deepEqual(dupes, [], `found duplicate slugs in data/nodes.json: ${JSON.stringify(dupes)}`);
});

// [VXG RealForever]
