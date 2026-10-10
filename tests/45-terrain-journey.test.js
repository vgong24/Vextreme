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


test('TERRAIN-JOURNEY: threshold rail projects semantic depth and exposes only a bounded outward zoom affordance', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('function thresholdRailPosition');
  const end = source.indexOf('// ── the navigation fix', start);
  assert.ok(start > 0 && end > start, 'threshold rail implementation must be present before zoom navigation');
  const railSource = source.slice(start, end);

  assert.match(railSource, /levelIndex/);
  assert.match(railSource, /levelBaseScale/);
  assert.match(railSource, /ENTER_RATIO/);
  assert.match(railSource, /EXIT_RATIO/);
  assert.match(railSource, /aria-current="step"/);
  assert.match(railSource, /role="progressbar"/);
  assert.doesNotMatch(railSource, /<button|<input/, 'the rail does not become an arbitrary navigation surface');
  assert.match(source, /id="levelReadout" tabindex="0" aria-label="Semantic depth\./);
  assert.match(source, /\.level-readout\{[\s\S]*pointer-events:auto;[\s\S]*opacity:\.18;/);
  assert.match(source, /\.level-readout\[data-can-zoom-out="true"\]\{ cursor:zoom-out; \}/);
  assert.match(source, /function zoomOutOneSemanticLevel\(reason\)/);
  assert.match(source, /function wireDepthRailOutwardGesture\(\)/);
  assert.match(source, /event\.deltaY >= 0 \|\| levelIndex <= 0/);
  assert.match(source, /semantic depth rail wheel/);
  assert.match(source, /semantic depth rail keyboard/);
  assert.match(source, /\.level-readout\.is-active\{ opacity:\.94; \}/);
  assert.match(source, /style="top:' \+ position\.toFixed\(2\) \+ '%"/);
  assert.match(source, /function revealDepthRail\(\)/);
  assert.match(source, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(source, /\.topbar > \*\{ min-width:0; \}/);
});


test('TERRAIN-JOURNEY: Row B uses existing stage semantics for adaptive focus and bounded neighborhood materialization', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /function stageCompositionLayout/);
  assert.match(source, /stageCompositionRect\(ctx\)/);
  assert.match(source, /data-stage-index/);
  assert.match(source, /role:'button'/);
  assert.match(source, /tabindex:'0'/);
  assert.match(source, /targetLevel === 1 && stageIdx >= 0/);
  assert.match(source, /levelIndex === 1 && typeof levelCtx\.stageIdx !== 'number' && ratio > ENTER_RATIO/);
  assert.match(source, /levelIndex === 1 && typeof levelCtx\.stageIdx === 'number' && ratio < EXIT_RATIO/);
  assert.match(source, /NODE_NEIGHBORHOOD_LIMIT = LIVE_VIEW\.levels\.node\.neighborhoodLimit/);
  assert.match(source, /"neighborhoodLimit": 12/);
  assert.match(source, /function neighborhoodIdsFor/);
  assert.match(source, /neighborhoodIdsFor\(pinnedId, NODE_NEIGHBORHOOD_LIMIT\)/);
  assert.doesNotMatch(source, /semantic\s*=\s*\{[^}]*\b(?:x|y|scale)\s*:/s);

  const stage = { world: 'code', lens: 'all', level: 'stage', stageKey: 'generate', pinnedId: null };
  const snapshot = Journey.create(stage, { label: 'GENERATE', world: 'code', level: 'stage' });
  const roundTrip = Journey.unwrap(Journey.wrap(snapshot, {}));
  assert.equal(roundTrip.version, Journey.VERSION);
  assert.deepEqual(roundTrip.semantic, stage, 'existing Journey v1 carries focused stageKey without a schema bump');
});


test('TERRAIN-JOURNEY: Row B correction keeps zero stages perceivable and selected-node framing bounded', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /var worst = members\.length \? 'good' : null/);
  assert.doesNotMatch(source, /if \(!summary\.members\.length\) return/);
  assert.match(source, /data-membership-count/);
  assert.match(source, /data-primary-count/);
  assert.match(source, /data-projection-completeness/);
  assert.match(source, /if \(summary\.groupKind === 'timeline-view'\) return/);
  assert.match(source, /if \(!summary\.primaryCount\) return/);
  assert.match(source, /function nodeNeighborhoodRect/);
  assert.match(source, /function focusNodeNeighborhood/);
  assert.match(source, /pad = pinnedId \? 24 : 160/);
  assert.match(source, /nodeId: semantic\.pinnedId \|\| null/);
  assert.match(source, /ctx\.nodeId/);
  assert.doesNotMatch(source, /semantic\s*=\s*\{[^}]*\b(?:x|y|scale)\s*:/s);
});

test('TERRAIN-JOURNEY: Evolution A gives scrollable content priority and makes confirmed wheel boundaries outward-only', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  const shelfStart = source.indexOf('function handleEvolutionShelfWheel');
  const shelfEnd = source.indexOf('function handleEvolutionReaderWheel', shelfStart);
  assert.ok(shelfStart > 0 && shelfEnd > shelfStart, 'Evolution A shelf wheel handler must be present');
  const shelf = source.slice(shelfStart, shelfEnd);
  assert.ok(
    shelf.indexOf('canScrollElement(evolutionLayer, direction)') < shelf.indexOf('ev.preventDefault()'),
    'ordinary collection scrolling must be checked before a boundary transition consumes the wheel event'
  );
  assert.match(shelf, /boundaryGestureReady\('collection-outward', direction\)/);
  assert.doesNotMatch(shelf, /collection-enter:/, 'wheel boundary must not implicitly enter a page');

  const readerStart = source.indexOf('function handleEvolutionReaderWheel');
  const readerEnd = source.indexOf('function wireEvolutionReaderDocument', readerStart);
  assert.ok(readerStart > 0 && readerEnd > readerStart, 'embedded reader wheel handler must be present');
  const reader = source.slice(readerStart, readerEnd);
  assert.ok(
    reader.indexOf('scrollPathCanMove(ev.target, doc, direction)') < reader.indexOf('ev.preventDefault()'),
    'page and nested page scrolling must be exhausted before reader navigation consumes the wheel event'
  );
  assert.match(reader, /boundaryGestureReady\('reader-outward:' \+ readerKey, direction\)/);
  assert.doesNotMatch(reader, /reader-next:|reader-end:/, 'wheel boundary must not implicitly advance to another page');
  assert.match(reader, /if \(activeEntrySlug \|\| \(!activeReaderId && !activeGroupHomeKey\)\) return;/);

  assert.match(source, /BOUNDARY_GESTURE_IDLE_MS = 220/);
  assert.match(source, /BOUNDARY_GESTURE_RESET_MS = 3000/);
  assert.match(source, /gap < BOUNDARY_GESTURE_IDLE_MS/);
  assert.match(source, /currentProfile === 'evolution-v1' && levelIndex === 2/);
  assert.match(source, /enterLevel\(1, \{ stageIdx:stageIdx \}\)/);
  assert.match(source, /if \(isEvolutionAGroup\(\) \|\| activeReaderId \|\| activeEntrySlug\) return;/);
});


test('TERRAIN-JOURNEY: the shipped boundary armer requires a distinct second gesture in the same direction', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');
  const match = source.match(/function boundaryGestureReady\(key, direction\) \{[\s\S]*?\n  \}/);
  assert.ok(match, 'boundaryGestureReady must be extractable from the shipped page');
  const idle = Number(source.match(/BOUNDARY_GESTURE_IDLE_MS = (\d+)/)[1]);
  const reset = Number(source.match(/BOUNDARY_GESTURE_RESET_MS = (\d+)/)[1]);

  let now = 0;
  const make = new Function('performance', 'IDLE', 'RESET', [
    "var boundaryGesture = { key:null, direction:0, lastAt:0 };",
    "var BOUNDARY_GESTURE_IDLE_MS = IDLE;",
    "var BOUNDARY_GESTURE_RESET_MS = RESET;",
    "function resetBoundaryGesture(){ boundaryGesture.key=null; boundaryGesture.direction=0; boundaryGesture.lastAt=0; }",
    match[0],
    "return { ready: boundaryGestureReady, state: function(){ return Object.assign({}, boundaryGesture); } };"
  ].join('\n'));
  const armer = make({ now: () => now }, idle, reset);

  assert.equal(armer.ready('collection-outward', 1), false, 'first boundary gesture arms only');
  now = idle + 1;
  assert.equal(armer.ready('collection-outward', 1), true, 'second distinct same-direction gesture confirms outward transition');
  assert.deepEqual(armer.state(), { key:null, direction:0, lastAt:0 }, 'successful confirmation resets the armer');

  now += idle + 1;
  assert.equal(armer.ready('collection-outward', 1), false);
  now += idle + 1;
  assert.equal(armer.ready('collection-outward', -1), false, 'reversing direction re-arms instead of confirming');
});

test('TERRAIN-JOURNEY: shipped collection and reader wheel handlers execute outward-only boundary transitions', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  const shelfMatch = source.match(/function handleEvolutionShelfWheel\(ev\) \{[\s\S]*?\n  \}/);
  const readerMatch = source.match(/function handleEvolutionReaderWheel\(ev\) \{[\s\S]*?\n  \}/);
  assert.ok(shelfMatch && readerMatch, 'Evolution A wheel handlers must be extractable');

  let shelfConfirm = false;
  let shelfEnter = 0;
  let shelfHint = 0;
  let shelfPrevented = 0;
  const makeShelf = new Function(
    'isEvolutionAGroup','canScrollElement','boundaryGestureReady','enterLevel','syncPresentationUrl','commitSemanticState','showGestureHint','resetBoundaryGesture','hideGestureHint',
    [
      "var activeReaderId = null;",
      "var hoveredEvolutionNodeId = null;",
      "var evolutionLayer = {};",
      shelfMatch[0],
      "return handleEvolutionShelfWheel;"
    ].join('\n')
  );
  const shelf = makeShelf(
    () => true,
    () => false,
    () => shelfConfirm,
    (level, ctx) => { assert.equal(level, 1); assert.deepEqual(ctx, {}); shelfEnter += 1; },
    () => {},
    (entry) => { assert.equal(entry.relationship, 'returned to'); },
    () => { shelfHint += 1; },
    () => {},
    () => {}
  );
  const shelfEvent = () => ({
    deltaY: 120, deltaX: 0,
    stopPropagation(){},
    preventDefault(){ shelfPrevented += 1; }
  });

  shelf(shelfEvent());
  assert.equal(shelfEnter, 0);
  assert.equal(shelfHint, 1);
  shelfConfirm = true;
  shelf(shelfEvent());
  assert.equal(shelfEnter, 1, 'confirmed downward boundary returns from collection to groups');
  assert.equal(shelfPrevented, 2);

  let readerConfirm = false;
  let readerClosed = 0;
  let readerHints = 0;
  const makeReader = new Function(
    'scrollPathCanMove','boundaryGestureReady','closeEvolutionReader','showGestureHint','resetBoundaryGesture','hideGestureHint',
    [
      "var activeEntrySlug = null;",
      "var activeReaderId = 'node-a';",
      "var activeGroupHomeKey = null;",
      "var evolutionReaderFrame = { contentDocument: {} };",
      readerMatch[0],
      "return handleEvolutionReaderWheel;"
    ].join('\n')
  );
  const reader = makeReader(
    () => false,
    () => readerConfirm,
    () => { readerClosed += 1; },
    () => { readerHints += 1; },
    () => {},
    () => {}
  );
  const readerEvent = () => ({ deltaY: 120, deltaX: 0, target: null, preventDefault(){} });

  reader(readerEvent());
  assert.equal(readerClosed, 0);
  assert.equal(readerHints, 1);
  readerConfirm = true;
  reader(readerEvent());
  assert.equal(readerClosed, 1, 'confirmed downward boundary returns from reader to collection');

  let scrollBoundaryCalled = false;
  const scrollingShelf = makeShelf(
    () => true,
    () => true,
    () => { scrollBoundaryCalled = true; return true; },
    () => { throw new Error('must not leave collection while it can still scroll'); },
    () => {}, () => {}, () => {}, () => {}, () => {}
  );
  let preventedWhileScrollable = false;
  scrollingShelf({
    deltaY: 120, deltaX: 0, stopPropagation(){},
    preventDefault(){ preventedWhileScrollable = true; }
  });
  assert.equal(scrollBoundaryCalled, false, 'ordinary scrolling wins before boundary logic');
  assert.equal(preventedWhileScrollable, false, 'ordinary scroll is not consumed as a boundary transition');
});

// [VXG RealForever]
