'use strict';

/**
 * BUILD-TERRAIN-MAP — tests/28-build-terrain-map.test.js
 *
 * Tests for lib/build-terrain-map.js — the self-updating terrain map's write
 * side. Session 025's pilot (an Artifact over 14 hand-picked nodes) proved
 * the interaction model; Session 025 generalized it into the real lattice,
 * computed fresh every build instead of hand-authored. Session 025 (continued) replaced
 * the folder-grid layout with a lifecycle-stage layout and added two
 * role-lens tags per node, after a round of Artifact POCs tested a fractal
 * zoom-level UI against this exact shape.
 *
 * Test order:
 *   1. clusterOf / stageOf — folder grouping (informational) vs lifecycle stage (layout)
 *   2. isEngineerFocus / isAuditorFocus — role-lens heuristics
 *   3. layoutStages — deterministic column-per-stage layout
 *   4. computeStatus / findDebtReferences — health cross-referencing
 *   5. computeEdges — mention-based edge detection
 *   6. findScreenshots — {slug}-{lang}.png discovery
 *   7. buildTerrainMap — full assembly
 *   8. Integration — the real repo's output is deterministic and internally consistent
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const { execFileSync } = require('child_process');
const fs        = require('fs');
const path      = require('path');

const {
  clusterOf,
  stageOf,
  isEngineerFocus,
  isAuditorFocus,
  layoutStages,
  computeStatus,
  findDebtReferences,
  computeEdges,
  findScreenshots,
  buildTerrainMap,
} = require('../lib/build-terrain-map');

const ROOT = path.join(__dirname, '..');

// ── 1. clusterOf / stageOf ────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP: clusterOf groups by top-level directory', () => {
  assert.equal(clusterOf('lib/build-index.js'), 'lib');
  assert.equal(clusterOf('widgets/fab-lang.js'), 'widgets');
  assert.equal(clusterOf('tests/01-foo.test.js'), 'tests');
  assert.equal(clusterOf('data/nodes.json'), 'data');
  assert.equal(clusterOf('docs/lattice-map.json'), 'docs');
  assert.equal(clusterOf('blueprint.json'), 'root');
});

test('BUILD-TERRAIN-MAP: stageOf places sources, generators, checks, and outputs in the right lifecycle stage', () => {
  assert.equal(stageOf('data/nodes.json'), 0);
  assert.equal(stageOf('lib/build-index.js'), 1);
  assert.equal(stageOf('lib/apply-content-intents.js'), 1);
  assert.equal(stageOf('lib/check-key-alignment.js'), 2);
  assert.equal(stageOf('lib/vex-config.js'), 1.5);
  assert.equal(stageOf('tests/01-foo.test.js'), 2);
  assert.equal(stageOf('blueprint.json'), 3);
  assert.equal(stageOf('widgets/fab-lang.js'), 4);
});

test('BUILD-TERRAIN-MAP: stageOf never leaves a real clusterOf output unplaced', () => {
  const samples = ['lib/x.js', 'widgets/x.js', 'tests/x.test.js', 'config/x.json', 'data/x.json', 'docs/x.json', 'x.json'];
  for (const p of samples) assert.ok(typeof stageOf(p) === 'number', `stageOf(${p}) should return a number`);
});

// ── 2. isEngineerFocus / isAuditorFocus ───────────────────────────────────────

test('BUILD-TERRAIN-MAP: isEngineerFocus is true for build/apply/append scripts and data sources', () => {
  assert.equal(isEngineerFocus('lib/build-index.js'), true);
  assert.equal(isEngineerFocus('lib/apply-content-intents.js'), true);
  assert.equal(isEngineerFocus('data/nodes.json'), true);
  assert.equal(isEngineerFocus('lib/vex-config.js'), false);
});

test('BUILD-TERRAIN-MAP: isAuditorFocus is true for non-good status, debt references, or check/audit naming', () => {
  assert.equal(isAuditorFocus('warning', 0, 'lib/vex-config.js'), true);
  assert.equal(isAuditorFocus('good', 1, 'lib/vex-config.js'), true);
  assert.equal(isAuditorFocus('good', 0, 'lib/check-key-alignment.js'), true);
  assert.equal(isAuditorFocus('good', 0, 'lib/audit-pages.js'), true);
  assert.equal(isAuditorFocus('good', 0, 'lib/build-index.js'), false);
});

// ── 3. layoutStages ────────────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP: layoutStages assigns every node a position, stage, and stageName', () => {
  const { positions } = layoutStages(['lib/build-a.js', 'lib/b.js', 'widgets/c.js']);
  assert.equal(Object.keys(positions).length, 3);
  assert.equal(positions['lib/build-a.js'].stage, 1);
  assert.equal(positions['lib/build-a.js'].stageName, 'GENERATE');
  assert.equal(positions['widgets/c.js'].stageName, 'RUNTIME');
  assert.ok(typeof positions['lib/build-a.js'].x === 'number');
  assert.ok(typeof positions['lib/build-a.js'].y === 'number');
});

test('BUILD-TERRAIN-MAP: layoutStages is deterministic — same input, same output', () => {
  const input = ['lib/z.js', 'lib/build-a.js', 'widgets/m.js', 'data/x.json'];
  const a = layoutStages(input);
  const b = layoutStages(input.slice().reverse());
  assert.deepEqual(a.positions, b.positions);
});

test('BUILD-TERRAIN-MAP: layoutStages never overlaps two nodes at the same coordinate', () => {
  const input = Array.from({ length: 12 }, (_, i) => `lib/file-${i}.js`);
  const { positions } = layoutStages(input);
  const coords = Object.values(positions).map(p => p.x + ',' + p.y);
  assert.equal(new Set(coords).size, coords.length);
});

test('BUILD-TERRAIN-MAP: layoutStages produces stageMeta with a count and rect per stage', () => {
  const { stageMeta } = layoutStages(['lib/build-a.js', 'lib/build-b.js', 'data/x.json']);
  const generate = stageMeta.find(s => s.name === 'GENERATE');
  const sources = stageMeta.find(s => s.name === 'SOURCES');
  assert.equal(generate.count, 2);
  assert.equal(sources.count, 1);
  assert.ok(typeof generate.rect.x === 'number' && typeof generate.rect.width === 'number');
});

// ── 4. computeStatus / findDebtReferences ────────────────────────────────────

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

// ── 5. computeEdges ───────────────────────────────────────────────────────────

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

// ── 6. findScreenshots ────────────────────────────────────────────────────────

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

// ── 7. buildTerrainMap ────────────────────────────────────────────────────────

test('BUILD-TERRAIN-MAP: buildTerrainMap assembles nodes, edges, stages, and screens together', () => {
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
  assert.equal(assembler.stageName, 'GENERATE');
  assert.equal(assembler.engineerFocus, true);
  assert.equal(assembler.auditorFocus, true); // critical status
  const config = result.nodes.find(n => n.id === 'lib/vex-config.js');
  assert.equal(config.stageName, 'UTILITIES');
  assert.ok(result.stages.length > 0);
});

// ── 8. Integration ───────────────────────────────────────────────────────────

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

test('BUILD-TERRAIN-MAP integration: every real node has a stage, stageName, and both lens fields', () => {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'terrain-map.json'), 'utf8'));
  for (const n of data.nodes) {
    assert.ok(typeof n.stage === 'number', `${n.id} missing numeric stage`);
    assert.ok(typeof n.stageName === 'string' && n.stageName.length > 0, `${n.id} missing stageName`);
    assert.ok(typeof n.engineerFocus === 'boolean', `${n.id} missing engineerFocus`);
    assert.ok(typeof n.auditorFocus === 'boolean', `${n.id} missing auditorFocus`);
  }
  assert.ok(data.stages.length > 0);
});

test('TERRAIN-MAP-PAGE: pages/terrain-map.html is registered in audit-pages.js SKIP_PAGES so it is not flagged as an orphan/blocker', () => {
  const { SKIP_PAGES } = require('../lib/audit-pages');
  assert.ok('terrain-map' in SKIP_PAGES);
});

// [VXG RealForever]
