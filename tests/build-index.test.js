'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const { buildSlugMap, buildArcMap, buildArcMeta, parseDate, toDateISO } = require('../lib/build-index');

const nodes   = require('./fixtures/nodes.fixture.json');
const arcsDef = require('./fixtures/arcs.fixture.json');

// ── parseDate ─────────────────────────────────────────────────────────────────

test('parseDate: nodes with no date must not block the build — null/empty inputs return null cleanly', () => {
  // Some nodes (undated content, meta pages) have null dates.
  // If parseDate threw instead, the entire index build would fail for all 88 nodes.
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(''), null);
  assert.equal(parseDate(undefined), null);
});

test('parseDate: standard date strings produce a real Date so chronological sort works', () => {
  // Chronological arc ordering depends on Date comparison.
  // A failed parse silently returns null, which sorts the node to the END of its section —
  // wrong position, wrong prev/next links for every subsequent page.
  const d = parseDate('Jan 1, 2026');
  assert.ok(d instanceof Date);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 0);
});

test('parseDate: range dates like "Feb 7–10, 2026" use the START date, not the end — position is based on when content begins', () => {
  // Content spanning multiple days appears in chronological order at its start date.
  // Using the end date would shift the node forward in the arc, misrepresenting release order.
  const d = parseDate('Feb 7–10, 2026');
  assert.ok(d instanceof Date);
  assert.equal(d.getDate(), 7);
  assert.equal(d.getMonth(), 1);
});

test('parseDate: garbage date strings return null rather than an invalid Date — prevents silent wrong-order sort', () => {
  // new Date("garbage") returns an Invalid Date object (not null) — isNaN catches it.
  // If we passed an Invalid Date to sort(), comparison returns NaN and sort order is undefined.
  assert.equal(parseDate('not a date'), null);
});

// ── toDateISO ─────────────────────────────────────────────────────────────────

test('toDateISO: undated nodes get null dateISO so the browser can skip range filtering for them', () => {
  // The browser may filter by dateISO for range queries. A null signals "no date" cleanly.
  // An empty string or "Invalid Date" would cause false range mismatches.
  assert.equal(toDateISO(null), null);
});

test('toDateISO: YYYY-MM-DD format is required for reliable string comparison in the browser', () => {
  // index.json stores dateISO as a string. The browser does string comparison for range filtering —
  // this only works correctly if the format is zero-padded ISO (lexicographic = chronological).
  assert.equal(toDateISO('Jan 1, 2026'), '2026-01-01');
  assert.equal(toDateISO('Mar 15, 2026'), '2026-03-15');
});

test('toDateISO: unparseable date string yields null, not a bad string that corrupts range comparisons', () => {
  assert.equal(toDateISO('garbage'), null);
});

// ── buildSlugMap ──────────────────────────────────────────────────────────────

test('buildSlugMap: every node must be reachable by slug — a missing entry means the browser returns null and renders no arc nav', () => {
  // The browser calls index.slugMap[slug] first. If any node is missing, that page
  // shows no arc nav widget at all — silent failure with no error message.
  const slugMap = buildSlugMap(nodes, arcsDef);
  for (const node of nodes) {
    assert.ok(slugMap[node.slug], `slug "${node.slug}" missing from slugMap — that page will have no arc nav`);
  }
});

test('buildSlugMap: dateISO must be derived at build time — the browser never re-parses human date strings', () => {
  // Constraint: build step owns computation. If dateISO were missing, the browser would need
  // its own date parser — violating the single-source principle and adding JS payload.
  const slugMap = buildSlugMap(nodes, arcsDef);
  assert.equal(slugMap['alpha'].dateISO, '2026-01-01');
  assert.equal(slugMap['beta'].dateISO, '2026-01-15');
  assert.equal(slugMap['explicit-first'].dateISO, null); // no date on this node — expected null
});

test('buildSlugMap: arcKeys must be sorted by priority at build time so the browser renders arcs in correct order without its own priority table', () => {
  // arc_a has priority 10, arc_b has priority 20.
  // The RENDERER registry assumes arc[0] is the primary arc (displayed first/most prominently).
  // Wrong sort order = wrong arc shown at top of every page that belongs to multiple arcs.
  const slugMap = buildSlugMap(nodes, arcsDef);
  assert.deepEqual(slugMap['alpha'].arcKeys, ['arc_a', 'arc_b']);
});

test('buildSlugMap: node properties (title, id) are preserved — the browser reads these for the "You Are Here" label', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  assert.equal(slugMap['alpha'].title, 'Alpha Entry');
  assert.equal(slugMap['alpha'].id, 1);
});

// ── buildArcMap ───────────────────────────────────────────────────────────────

test('buildArcMap: every declared arc produces an entry — a missing arc means the browser silently skips that nav row', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  assert.ok(arcMap['arc_a'], 'arc_a missing — pages in this arc will show no nav row for it');
  assert.ok(arcMap['arc_b'], 'arc_b missing');
  assert.ok(arcMap['arc_explicit'], 'arc_explicit missing');
  assert.equal(arcMap['_meta'], undefined); // _meta is schema, not a real arc
});

test('buildArcMap: chronological sections must be date-ascending — wrong order inverts prev/next links on every page in the arc', () => {
  // If alpha (Jan 1) sorts AFTER beta (Jan 15), visiting "alpha" shows "prev → beta",
  // which is wrong both semantically and narratively.
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  assert.deepEqual(arcMap['arc_a'][0].slugs, ['alpha', 'beta', 'gamma']);
});

test('buildArcMap: explicit section order is the author\'s intent — chronological re-sorting would override editorial curation', () => {
  // arc_explicit declares [explicit-second, explicit-first].
  // The author put "second" first on purpose (e.g., prologue/epilogue order).
  // If the build re-sorted by date, the arc would show a different entry as position 1.
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  assert.deepEqual(arcMap['arc_explicit'][0].slugs, ['explicit-second', 'explicit-first']);
});

test('buildArcMap: section label is stored in the index so the browser has no hardcoded arc schema', () => {
  // The browser reads section.label directly from arcMap. If it were missing, the arc nav row
  // would display an empty label or crash trying to read undefined.label.
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  assert.equal(arcMap['arc_a'][0].label, 'Season One');
  assert.equal(arcMap['arc_b'][0].label, 'Volume One');
});

test('buildArcMap: arc membership is exclusive — a node only appears in arcs declared in its own arcKeys', () => {
  // beta only declares arc_a. If it leaked into arc_b, arc_b\'s position count and
  // prev/next links would be wrong for every node in that arc.
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  const slugs   = arcMap['arc_b'][0].slugs;
  assert.ok(slugs.includes('alpha'));
  assert.ok(slugs.includes('gamma'));
  assert.ok(slugs.includes('delta'));
  assert.ok(!slugs.includes('beta'), 'beta should not appear in arc_b — it only declared arc_a');
});

test('buildArcMap: unknown slug in an explicit section is dropped with a warning, not a crash — bad data degrades gracefully', () => {
  // A typo in arcs-v2.json should not break the entire build.
  // Valid slugs in the same section should still resolve correctly.
  const slugMap = buildSlugMap(nodes, arcsDef);
  const localArcs = {
    ...arcsDef,
    arc_broken: {
      priority: 99,
      renderMode: 'dots',
      parent: { title: 'Broken', url: '#' },
      sections: [{ label: 'Bad', order: 'explicit', slugs: ['does-not-exist', 'alpha'] }]
    }
  };
  const arcMap = buildArcMap(nodes, localArcs, slugMap);
  assert.deepEqual(arcMap['arc_broken'][0].slugs, ['alpha']);
});

test('buildArcMap: dateRange filter narrows chronological sections to only nodes whose date falls within the window', () => {
  // full_timeline arcs cover all time but split into dated sections (e.g. "Jan 2026", "Feb 2026").
  // A missing dateRange filter means every node in the arc appears in every section — duplicate
  // entries and wrong position counts across all pages in those sections.
  const slugMap = buildSlugMap(nodes, arcsDef);
  const localArcs = {
    arc_ranged: {
      priority: 5,
      renderMode: 'dots',
      parent: { title: 'Ranged', url: '/ranged' },
      sections: [
        { label: 'January', order: 'chronological', dateRange: { from: '2026-01-01', to: '2026-01-31' } },
        { label: 'February', order: 'chronological', dateRange: { from: '2026-02-01', to: '2026-02-28' } }
      ]
    }
  };
  // alpha (Jan 1) and beta (Jan 15) are in January; gamma (Feb 1) is in February
  const localNodes = nodes.filter(n => ['alpha', 'beta', 'gamma'].includes(n.slug))
    .map(n => ({ ...n, arcKeys: ['arc_ranged'] }));
  const localSlugMap = buildSlugMap(localNodes, localArcs);
  const arcMap = buildArcMap(localNodes, localArcs, localSlugMap);

  assert.deepEqual(arcMap['arc_ranged'][0].slugs, ['alpha', 'beta'], 'January section should contain only Jan nodes');
  assert.deepEqual(arcMap['arc_ranged'][1].slugs, ['gamma'], 'February section should contain only Feb nodes');
});

test('buildArcMap: nodes with null dates are excluded from dateRange sections — a null date cannot be compared to a range boundary', () => {
  // 'explicit-first' and 'explicit-second' have null dates.
  // Including them in a dated section would mean they either always match (wrong) or always fail (correct).
  // The filter should drop them, not crash or silently include them.
  const slugMap = buildSlugMap(nodes, arcsDef);
  const localArcs = {
    arc_dated: {
      priority: 5,
      renderMode: 'dots',
      parent: { title: 'Dated', url: '/dated' },
      sections: [{ label: 'All 2026', order: 'chronological', dateRange: { from: '2026-01-01', to: '2026-12-31' } }]
    }
  };
  const localNodes = nodes.map(n => ({ ...n, arcKeys: ['arc_dated'] }));
  const localSlugMap = buildSlugMap(localNodes, localArcs);
  const arcMap = buildArcMap(localNodes, localArcs, localSlugMap);
  const slugs = arcMap['arc_dated'][0].slugs;

  // Nodes with real dates should be included
  assert.ok(slugs.includes('alpha'));
  assert.ok(slugs.includes('beta'));
  // Nodes with null dates should be excluded
  assert.ok(!slugs.includes('explicit-first'), 'null-date node should not appear in a dateRange section');
  assert.ok(!slugs.includes('explicit-second'), 'null-date node should not appear in a dateRange section');
});

// ── buildArcMeta ──────────────────────────────────────────────────────────────

test('buildArcMeta: title, url, and renderMode must all be present — missing any one causes the browser to render a broken nav row', () => {
  // title → the link text in the arc nav header
  // url → the href on that link (missing = broken link)
  // renderMode → selects which RENDERER function to call (missing = falls back to dots with a console warning)
  const arcMeta = buildArcMeta(arcsDef);
  assert.equal(arcMeta['arc_a'].title, 'Arc A');
  assert.equal(arcMeta['arc_a'].url, '/arc-a');
  assert.equal(arcMeta['arc_a'].renderMode, 'dots');
  assert.equal(arcMeta['arc_b'].renderMode, 'position'); // arc_b uses the position renderer
});

test('buildArcMeta: _meta key must be excluded — if included, the browser would try to render a nav row for the schema object', () => {
  const arcMeta = buildArcMeta(arcsDef);
  assert.equal(arcMeta['_meta'], undefined);
});

test('buildArcMeta: arc with no parent object falls back to arc name as title and "#" as url — broken link is better than a crash', () => {
  // An arc in development may not yet have a parent page. The fallback keeps the row
  // visible with a dead link rather than throwing on arcMeta[arcName].title.
  const localArcs = {
    arc_no_parent: { priority: 5, renderMode: 'dots', sections: [] }
  };
  const arcMeta = buildArcMeta(localArcs);
  assert.equal(arcMeta['arc_no_parent'].title, 'arc_no_parent');
  assert.equal(arcMeta['arc_no_parent'].url, '#');
});

test('buildArcMeta: arc with no renderMode defaults to "dots" — the registry always has a dots renderer, so the row never crashes', () => {
  // renderMode drives RENDERER dispatch. "dots" is the safe default registered in the browser lib.
  // An undefined renderMode would cause renderArcRow to warn and fall back anyway, but
  // catching it here means the index.json is already correct before it reaches the browser.
  const localArcs = {
    arc_no_mode: { priority: 5, parent: { title: 'X', url: '/x' }, sections: [] }
  };
  const arcMeta = buildArcMeta(localArcs);
  assert.equal(arcMeta['arc_no_mode'].renderMode, 'dots');
});

// [VXG RealForever]
