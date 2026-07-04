'use strict';

/**
 * DEPARTMENTS — tests/15-departments.test.js
 *
 * Tests for lib/build-index.js's buildDepartmentMap / buildDepartmentMeta —
 * the production-domain grouping axis (department → workType), a different
 * concern from arcMap (reader-facing narrative grouping).
 *
 * Test order:
 *   1. buildDepartmentMap — grouping, default fallback, ported detection
 *   2. buildDepartmentMeta — label/default/workTypes extraction
 *   3. Integration — data/departments.json + data/nodes.json + data/index.json agree
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const { buildDepartmentMap, buildDepartmentMeta } = require('../lib/build-index');

const ROOT = path.join(__dirname, '..');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_DEPARTMENTS = {
  _comment: 'fixture',
  rd: {
    label: 'R&D',
    default: true,
    workTypes: { default: { label: 'Default' } },
  },
  media: {
    label: 'Media',
    default: false,
    workTypes: {
      reviews: { label: 'Reviews' },
      'record-transcripts': { label: 'Record Transcripts' },
    },
  },
};

// slugs chosen to exist / not exist under the real pages/ dir, since
// buildDepartmentMap's `ported` check reads the filesystem directly —
// same convention lib/build-archives.js already uses for its `ported` set.
const SAMPLE_NODES = [
  { slug: 'phantom-opera-meta-review', title: 'Phantom Review', arcKeys: [], department: 'media', workType: 'reviews' },
  { slug: 'vxg-thread-round-5',        title: 'VXG Thread',     arcKeys: [], department: 'media', workType: 'record-transcripts' },
  { slug: 'covenant',                  title: 'Covenant',       arcKeys: ['covenant'] }, // no department/workType — should default
];

// ── 1. buildDepartmentMap ──────────────────────────────────────────────────────

test('DEPARTMENTS: groups nodes with an explicit department/workType correctly', () => {
  const map = buildDepartmentMap(SAMPLE_NODES, SAMPLE_DEPARTMENTS);
  assert.ok(map.media, 'media department missing from map');
  assert.ok(Array.isArray(map.media.reviews), 'media.reviews should be an array');
  assert.equal(map.media.reviews.length, 1);
  assert.equal(map.media.reviews[0].slug, 'phantom-opera-meta-review');
  assert.equal(map.media['record-transcripts'].length, 1);
  assert.equal(map.media['record-transcripts'][0].slug, 'vxg-thread-round-5');
});

test('DEPARTMENTS: a node with no department/workType falls back to the default:true department and workType "default"', () => {
  const map = buildDepartmentMap(SAMPLE_NODES, SAMPLE_DEPARTMENTS);
  assert.ok(map.rd, 'rd (default) department missing from map');
  assert.ok(map.rd.default, 'rd.default workType missing');
  const slugs = map.rd.default.map(n => n.slug);
  assert.ok(slugs.includes('covenant'), 'node with no department field should land in the default department');
});

test('DEPARTMENTS: falls back to "rd" if no department is marked default:true', () => {
  const noDefault = { rd: { label: 'R&D', workTypes: { default: {} } } };
  const map = buildDepartmentMap([{ slug: 'x', title: 'X', arcKeys: [] }], noDefault);
  assert.ok(map.rd, 'should still fall back to "rd" as a last resort');
});

test('DEPARTMENTS: `ported` reflects whether pages/{slug}.html actually exists on disk', () => {
  const map = buildDepartmentMap(SAMPLE_NODES, SAMPLE_DEPARTMENTS);
  const phantomExists = fs.existsSync(path.join(ROOT, 'pages', 'phantom-opera-meta-review.html'));
  const transcriptExists = fs.existsSync(path.join(ROOT, 'pages', 'vxg-thread-round-5.html'));

  assert.equal(map.media.reviews[0].ported, phantomExists);
  assert.equal(map.media['record-transcripts'][0].ported, transcriptExists);
});

// ── 2. buildDepartmentMeta ─────────────────────────────────────────────────────

test('DEPARTMENTS: buildDepartmentMeta extracts label, default flag, and workType labels', () => {
  const meta = buildDepartmentMeta(SAMPLE_DEPARTMENTS);
  assert.equal(meta.rd.label, 'R&D');
  assert.equal(meta.rd.default, true);
  assert.equal(meta.media.default, false);
  assert.equal(meta.media.workTypes.reviews.label, 'Reviews');
  assert.equal(meta.media.workTypes['record-transcripts'].label, 'Record Transcripts');
});

test('DEPARTMENTS: buildDepartmentMeta ignores underscore-prefixed keys like _comment', () => {
  const meta = buildDepartmentMeta(SAMPLE_DEPARTMENTS);
  assert.equal(meta._comment, undefined);
});

test('DEPARTMENTS: buildDepartmentMeta handles an empty/missing registry without throwing', () => {
  assert.deepEqual(buildDepartmentMeta({}), {});
  assert.deepEqual(buildDepartmentMeta(undefined), {});
});

// ── 3. Integration — real repo files agree ────────────────────────────────────

test('DEPARTMENTS: data/departments.json + data/nodes.json + data/index.json agree', () => {
  const departmentsDef = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'departments.json'), 'utf8'));
  const nodes          = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nodes.json'), 'utf8'));
  const index          = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index.json'), 'utf8'));

  // index.json's departmentMap includes auto-discovered nodes (lib/auto-discover-nodes.js),
  // not just curated nodes.json entries — mirror the same allNodes computation
  // lib/build-index.js's I/O block does, or this comparison is comparing apples to
  // a bigger apple-plus-oranges bowl.
  const { discoverOrphanNodes, readPageFromDisk } = require('../lib/auto-discover-nodes');
  const { SKIP_PAGES, getPageSlugs } = require('../lib/audit-pages');
  const viewmodels = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'viewmodels.json'), 'utf8'));
  const viewmodelSlugs = Object.keys(viewmodels).filter(k => !k.startsWith('_'));
  const discovered = discoverOrphanNodes(getPageSlugs(), nodes.map(n => n.slug), SKIP_PAGES, viewmodelSlugs, readPageFromDisk, departmentsDef);
  const allNodes = nodes.concat(discovered);

  const map  = buildDepartmentMap(allNodes, departmentsDef);
  const meta = buildDepartmentMeta(departmentsDef);

  assert.deepEqual(index.departmentMap,  map,  'data/index.json departmentMap is stale — run node lib/build-index.js');
  assert.deepEqual(index.departmentMeta, meta, 'data/index.json departmentMeta is stale — run node lib/build-index.js');

  // Every node declaring a department must reference one that actually exists in the registry.
  for (const node of nodes) {
    if (node.department) {
      assert.ok(departmentsDef[node.department], `node "${node.slug}" references unknown department "${node.department}"`);
    }
  }
});

// [VXG RealForever]
