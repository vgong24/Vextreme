'use strict';

/**
 * BUILD-TERRAIN-MAP — tests/28-build-terrain-map.test.js
 *
 * Tests for lib/build-terrain-map.js — the self-updating terrain map's write
 * side. Session 025's pilot (an Artifact over 14 hand-picked nodes) proved
 * the interaction model; this generalizes it into the real lattice, computed
 * fresh every build instead of hand-authored.
 *
 * Test order:
 *   1. clusterOf — coarse directory-based grouping
 *   2. layoutClusters — deterministic grid layout
 *   3. computeStatus / findDebtReferences — health cross-referencing
 *   4. computeEdges — mention-based edge detection
 *   5. findScreenshots — {slug}-{lang}.png discovery
 *   6. buildTerrainMap — full assembly
 *   7. Integration — the real repo's output is deterministic and internally consistent
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const { execFileSync } = require('child_process');
const fs        = require('fs');
const path      = require('path');

const {
  clusterOf,
  layoutClusters,
  computeStatus,
  findDebtReferences,
  computeEdges,
  findScreenshots,
  buildTerrainMap,
} = require('../lib/build-terrain-map');

const ROOT = path.join(__dirname, '..');

// ── 1. clusterOf ──────────────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP: clusterOf groups by top-level directory', () => {
  assert.equal(clusterOf('lib/build-index.js'), 'lib');
  assert.equal(clusterOf('widgets/fab-lang.js'), 'widgets');
  assert.equal(clusterOf('tests/01-foo.test.js'), 'tests');
  assert.equal(clusterOf('data/nodes.json'), 'data');
  assert.equal(clusterOf('docs/lattice-map.json'), 'docs');
  assert.equal(clusterOf('blueprint.json'), 'root');
});

// ── 2. layoutClusters ─────────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP: layoutClusters assigns every node a position and cluster', () => {
  const { positions } = layoutClusters(['lib/a.js', 'lib/b.js', 'widgets/c.js']);
  assert.equal(Object.keys(positions).length, 3);
  assert.equal(positions['lib/a.js'].cluster, 'lib');
  assert.equal(positions['widgets/c.js'].cluster, 'widgets');
  assert.ok(typeof positions['lib/a.js'].x === 'number');
  assert.ok(typeof positions['lib/a.js'].y === 'number');
});

test('BUILD-TERRAIN-MAP: layoutClusters is deterministic — same input, same output', () => {
  const input = ['lib/z.js', 'lib/a.js', 'widgets/m.js', 'data/x.json'];
  const a = layoutClusters(input);
  const b = layoutClusters(input.slice().reverse());
  assert.deepEqual(a.positions, b.positions);
});

test('BUILD-TERRAIN-MAP: layoutClusters never overlaps two nodes at the same coordinate', () => {
  const input = Array.from({ length: 12 }, (_, i) => `lib/file-${i}.js`);
  const { positions } = layoutClusters(input);
  const coords = Object.values(positions).map(p => p.x + ',' + p.y);
  assert.equal(new Set(coords).size, coords.length);
});

// ── 3. computeStatus / findDebtReferences ────────────────────────────────────

test('BUILD-TERRAIN-MAP: computeStatus is good when tested with no debt references', () => {
  assert.equal(computeStatus({ testedBy: ['tests/x.test.js'] }, []), 'good');
});

test('BUILD-TERRAIN-MAP: computeStatus is warning when tested but debt-referenced', () => {
  assert.equal(computeStatus({ testedBy: ['tests/x.test.js'] }, [{ id: 'td-001' }]), 'warning');
});

test('BUILD-TERRAIN-MAP: computeStatus is critical when untested and debt-referenced', () => {
  assert.equal(computeStatus({ testedBy: [] }, [{ id: 'td-001' }]), 'critical');
});

test('BUILD-TERRAIN-MAP: computeStatus is good when untested but no debt references', () => {
  assert.equal(computeStatus({ testedBy: [] }, []), 'good');
});

test('BUILD-TERRAIN-MAP: findDebtReferences matches a node basename inside an item blob', () => {
  const items = [{ id: 'td-001', title: 'strings-check needs work', context: 'lib/strings-check.js' }];
  const refs = findDebtReferences('lib/strings-check.js', items);
  assert.deepEqual(refs, [{ id: 'td-001', title: 'strings-check needs work' }]);
});

test('BUILD-TERRAIN-MAP: findDebtReferences skips names too short to avoid false positives', () => {
  // basename 'sw' (from lib/sw.js) is under the 4-char floor
  const items = [{ id: 'td-001', title: 'unrelated', context: 'this text says sw somewhere' }];
  assert.deepEqual(findDebtReferences('lib/sw.js', items), []);
});

// ── 4. computeEdges ───────────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP: computeEdges finds a mention-based edge between two nodes', () => {
  const nodes = {
    'lib/build-vextreme.js': { reads: ['lib/vex-config.js'] },
    'lib/vex-config.js': {},
  };
  const edges = computeEdges(nodes);
  assert.equal(edges.length, 1);
  assert.deepEqual(edges[0].slice().sort(), ['lib/build-vextreme.js', 'lib/vex-config.js'].sort());
});

test('BUILD-TERRAIN-MAP: computeEdges dedupes a bidirectional mention into one edge', () => {
  const nodes = {
    'lib/a-longname.js': { reads: ['lib/b-longname.js'] },
    'lib/b-longname.js': { loadedBy: ['lib/a-longname.js'] },
  };
  assert.equal(computeEdges(nodes).length, 1);
});

test('BUILD-TERRAIN-MAP: computeEdges produces no self-edges', () => {
  const nodes = { 'lib/build-vextreme.js': { reads: ['lib/build-vextreme.js'] } };
  assert.deepEqual(computeEdges(nodes), []);
});

// ── 5. findScreenshots ────────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP: findScreenshots groups files by slug and language', () => {
  const result = findScreenshots(['foo-en.png', 'foo-ja.png', 'bar-en.png']);
  assert.deepEqual(result, {
    foo: { en: 'docs/screenshots/foo-en.png', ja: 'docs/screenshots/foo-ja.png' },
    bar: { en: 'docs/screenshots/bar-en.png' },
  });
});

test('BUILD-TERRAIN-MAP: findScreenshots ignores files that do not match the {slug}-{lang}.png convention', () => {
  const result = findScreenshots(['ecosystem-hub-lenses.png', 'plain.png']);
  assert.deepEqual(result, {});
});

// ── 6. buildTerrainMap ────────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP: buildTerrainMap assembles nodes, edges, clusters, and screens together', () => {
  const latticeMap = {
    nodes: {
      'lib/build-vextreme.js': { role: 'assembler', reads: ['lib/vex-config.js'], testedBy: [] },
      'lib/vex-config.js': { role: 'constants', testedBy: ['tests/x.test.js'] },
    },
  };
  const statusItems = [{ id: 'td-001', title: 'assembler needs work', context: 'lib/build-vextreme.js' }];
  const nodesJson = [{ slug: 'demo-page', title: 'Demo Page', arcKeys: ['demo'] }];
  const screenshots = ['demo-page-en.png'];

  const result = buildTerrainMap(latticeMap, statusItems, nodesJson, screenshots);
  assert.equal(result.nodes.length, 2);
  assert.equal(result.screens.length, 1);
  assert.equal(result.screens[0].slug, 'demo-page');
  assert.equal(result.screens[0].liveUrl, 'https://vgong24.github.io/Vextreme/pages/demo-page.html');
  const assembler = result.nodes.find(n => n.id === 'lib/build-vextreme.js');
  assert.equal(assembler.status, 'critical'); // untested + debt-referenced
  assert.deepEqual(assembler.debts, ['td-001']);
  assert.ok(result.debtTitles['td-001']);
});

// ── 7. Integration ───────────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP integration: the real generator produces byte-identical output on repeated runs', () => {
  execFileSync('node', ['lib/build-terrain-map.js'], { cwd: ROOT });
  const first = fs.readFileSync(path.join(ROOT, 'data', 'terrain-map.json'), 'utf8');
  execFileSync('node', ['lib/build-terrain-map.js'], { cwd: ROOT });
  const second = fs.readFileSync(path.join(ROOT, 'data', 'terrain-map.json'), 'utf8');
  assert.equal(first, second, 'same inputs must produce a byte-identical file (generated-artifacts-must-be-content-deterministic)');
});

test('BUILD-TERRAIN-MAP integration: every edge in the real output references two real nodes', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'terrain-map.json'), 'utf8'));
  const ids = new Set(data.nodes.map(n => n.id));
  for (const [a, b] of data.edges) {
    assert.ok(ids.has(a), `edge references unknown node ${a}`);
    assert.ok(ids.has(b), `edge references unknown node ${b}`);
  }
});

test('BUILD-TERRAIN-MAP integration: every screen references a screenshot file that actually exists', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'terrain-map.json'), 'utf8'));
  for (const screen of data.screens) {
    for (const relPath of Object.values(screen.screenshots)) {
      assert.ok(fs.existsSync(path.join(ROOT, relPath)), `missing screenshot file: ${relPath}`);
    }
  }
});

test('TERRAIN-MAP-PAGE: pages/terrain-map.html is registered in audit-pages.js SKIP_PAGES so it is not flagged as an orphan/blocker', () => {
  const { SKIP_PAGES } = require('../lib/audit-pages');
  assert.ok('terrain-map' in SKIP_PAGES);
});

// [VXG RealForever]
