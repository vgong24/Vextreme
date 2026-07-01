'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const path     = require('path');

const { buildSlugMap, buildArcMap, buildArcMeta, parseDate, toDateISO } = require('../lib/build-index');

const nodes   = require('./fixtures/nodes.fixture.json');
const arcsDef = require('./fixtures/arcs.fixture.json');

// ── parseDate ─────────────────────────────────────────────────────────────────

test('parseDate: returns null for null/empty', () => {
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(''), null);
  assert.equal(parseDate(undefined), null);
});

test('parseDate: parses standard date string', () => {
  const d = parseDate('Jan 1, 2026');
  assert.ok(d instanceof Date);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 0); // January
});

test('parseDate: handles range dates like "Feb 7–10, 2026" using start date', () => {
  const d = parseDate('Feb 7–10, 2026');
  assert.ok(d instanceof Date);
  assert.equal(d.getDate(), 7);
  assert.equal(d.getMonth(), 1); // February
});

test('parseDate: returns null for unparseable string', () => {
  assert.equal(parseDate('not a date'), null);
});

// ── toDateISO ─────────────────────────────────────────────────────────────────

test('toDateISO: returns null for null input', () => {
  assert.equal(toDateISO(null), null);
});

test('toDateISO: formats valid date as YYYY-MM-DD', () => {
  assert.equal(toDateISO('Jan 1, 2026'), '2026-01-01');
  assert.equal(toDateISO('Mar 15, 2026'), '2026-03-15');
});

test('toDateISO: returns null for unparseable input', () => {
  assert.equal(toDateISO('garbage'), null);
});

// ── buildSlugMap ──────────────────────────────────────────────────────────────

test('buildSlugMap: every node slug is present as a key', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  for (const node of nodes) {
    assert.ok(slugMap[node.slug], `missing slug: ${node.slug}`);
  }
});

test('buildSlugMap: dateISO is derived correctly', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  assert.equal(slugMap['alpha'].dateISO, '2026-01-01');
  assert.equal(slugMap['beta'].dateISO, '2026-01-15');
  assert.equal(slugMap['explicit-first'].dateISO, null);
});

test('buildSlugMap: arcKeys sorted by arc priority (lower priority value = first)', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  // alpha belongs to arc_a (priority 10) and arc_b (priority 20)
  // arc_a should come first
  assert.deepEqual(slugMap['alpha'].arcKeys, ['arc_a', 'arc_b']);
});

test('buildSlugMap: node properties are preserved', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  assert.equal(slugMap['alpha'].title, 'Alpha Entry');
  assert.equal(slugMap['alpha'].id, 1);
});

// ── buildArcMap ───────────────────────────────────────────────────────────────

test('buildArcMap: all non-meta arcs are present', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  assert.ok(arcMap['arc_a']);
  assert.ok(arcMap['arc_b']);
  assert.ok(arcMap['arc_explicit']);
  assert.equal(arcMap['_meta'], undefined);
});

test('buildArcMap: chronological section orders slugs by date ascending', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  // arc_a has alpha (Jan 1), beta (Jan 15), gamma (Feb 1) — all chronological
  const slugs = arcMap['arc_a'][0].slugs;
  assert.deepEqual(slugs, ['alpha', 'beta', 'gamma']);
});

test('buildArcMap: explicit section preserves declared slug order', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  // arc_explicit declares explicit-second before explicit-first
  const slugs = arcMap['arc_explicit'][0].slugs;
  assert.deepEqual(slugs, ['explicit-second', 'explicit-first']);
});

test('buildArcMap: section label is preserved from arc definition', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  assert.equal(arcMap['arc_a'][0].label, 'Season One');
  assert.equal(arcMap['arc_b'][0].label, 'Volume One');
});

test('buildArcMap: only nodes with matching arcKeys appear in an arc', () => {
  const slugMap = buildSlugMap(nodes, arcsDef);
  const arcMap  = buildArcMap(nodes, arcsDef, slugMap);
  // arc_b has alpha, gamma, delta — not beta (beta only has arc_a)
  const slugs = arcMap['arc_b'][0].slugs;
  assert.ok(slugs.includes('alpha'));
  assert.ok(slugs.includes('gamma'));
  assert.ok(slugs.includes('delta'));
  assert.ok(!slugs.includes('beta'));
});

test('buildArcMap: unknown slug in explicit section is skipped with warning', () => {
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
  // 'does-not-exist' dropped, 'alpha' kept
  assert.deepEqual(arcMap['arc_broken'][0].slugs, ['alpha']);
});

// ── buildArcMeta ──────────────────────────────────────────────────────────────

test('buildArcMeta: returns title, url, renderMode for each arc', () => {
  const arcMeta = buildArcMeta(arcsDef);
  assert.equal(arcMeta['arc_a'].title, 'Arc A');
  assert.equal(arcMeta['arc_a'].url, '/arc-a');
  assert.equal(arcMeta['arc_a'].renderMode, 'dots');
  assert.equal(arcMeta['arc_b'].renderMode, 'position');
});

test('buildArcMeta: _meta key is excluded', () => {
  const arcMeta = buildArcMeta(arcsDef);
  assert.equal(arcMeta['_meta'], undefined);
});

test('buildArcMeta: missing parent falls back to arc name and #', () => {
  const localArcs = {
    arc_no_parent: { priority: 5, renderMode: 'dots', sections: [] }
  };
  const arcMeta = buildArcMeta(localArcs);
  assert.equal(arcMeta['arc_no_parent'].title, 'arc_no_parent');
  assert.equal(arcMeta['arc_no_parent'].url, '#');
});

test('buildArcMeta: missing renderMode falls back to dots', () => {
  const localArcs = {
    arc_no_mode: { priority: 5, parent: { title: 'X', url: '/x' }, sections: [] }
  };
  const arcMeta = buildArcMeta(localArcs);
  assert.equal(arcMeta['arc_no_mode'].renderMode, 'dots');
});

// [VXG RealForever]
