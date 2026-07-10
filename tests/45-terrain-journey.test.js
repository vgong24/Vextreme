'use strict';

/**
 * TERRAIN JOURNEY
 *
 * Semantic history is intentionally independent of camera coordinates. These
 * tests protect branching, namespacing, and the page integration contract that
 * keeps wheel/pan noise out of browser history.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Journey = require('../lib/terrain-journey');
const ROOT = path.join(__dirname, '..');

function semantic(nodeId) {
  return { world: 'code', lens: 'all', level: nodeId ? 'node' : 'system', stageKey: nodeId ? 'generate' : null, pinnedId: nodeId || null };
}

test('TERRAIN-JOURNEY: creates a serializable origin and appends relationship-aware commits', () => {
  const origin = Journey.create(semantic(null), { label: 'VEXTREME', world: 'code', level: 'system' });
  const next = Journey.append(origin, semantic('lib/build-vextreme.js'), {
    label: 'lib/build-vextreme.js',
    nodeId: 'lib/build-vextreme.js',
    fromNodeId: null,
    relationship: 'search',
    reason: 'search result',
    world: 'code',
    level: 'node',
  });

  assert.equal(origin.journey.entries.length, 1, 'append must not mutate the prior browser-history state');
  assert.equal(next.journey.cursor, 1);
  assert.equal(Journey.current(next).relationship, 'search');
  assert.equal(next.semantic.pinnedId, 'lib/build-vextreme.js');
});

test('TERRAIN-JOURNEY: appending after Back truncates the abandoned Forward branch', () => {
  const origin = Journey.create(semantic(null), { label: 'VEXTREME' });
  const first = Journey.append(origin, semantic('a'), { label: 'a', nodeId: 'a' });
  const second = Journey.append(first, semantic('b'), { label: 'b', nodeId: 'b' });
  const restoredFirst = { ...second, semantic: first.semantic, journey: { cursor: 1, entries: second.journey.entries } };
  const branch = Journey.append(restoredFirst, semantic('c'), { label: 'c', nodeId: 'c' });

  assert.deepEqual(branch.journey.entries.map((entry) => entry.nodeId), [null, 'a', 'c']);
  assert.equal(branch.journey.cursor, 2);
});

test('TERRAIN-JOURNEY: wraps state without destroying another history namespace', () => {
  const snapshot = Journey.create(semantic(null), { label: 'VEXTREME' });
  const state = Journey.wrap(snapshot, { anotherFeature: { active: true } });

  assert.deepEqual(state.anotherFeature, { active: true });
  assert.deepEqual(Journey.unwrap(state), snapshot);
  assert.equal(Journey.unwrap({}), null);
});

test('TERRAIN-JOURNEY: reset keeps the current semantic position as a new visible origin', () => {
  const origin = Journey.create(semantic(null), { label: 'VEXTREME' });
  const traveled = Journey.append(origin, semantic('b'), { label: 'b', nodeId: 'b', relationship: 'loads' });
  const reset = Journey.reset(traveled, traveled.semantic);

  assert.equal(reset.journey.cursor, 0);
  assert.equal(reset.journey.entries.length, 1);
  assert.equal(reset.journey.entries[0].nodeId, 'b');
  assert.equal(reset.semantic.pinnedId, 'b');
  assert.equal(reset.generation, traveled.generation + 1, 'Back can skip browser entries from the cleared generation');
});

test('TERRAIN-JOURNEY: page wires semantic history without storing camera noise', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  assert.match(source, /<script src="\.\.\/lib\/terrain-journey\.js"><\/script>/);
  assert.match(source, /history\.pushState\(/);
  assert.match(source, /addEventListener\('popstate'/);
  assert.match(source, /data-journey-action="origin"/);
  assert.match(source, /data-journey-action="clear"/);
  assert.match(source, /snapshot\.generation !== journeySnapshot\.generation/);
  assert.match(source, /listOrEmpty\(n\.reads, 'reads', n\.id\)/);
  assert.doesNotMatch(source, /semantic\s*=\s*\{[^}]*\b(?:x|y|scale)\s*:/s);
});

// [VXG RealForever]
