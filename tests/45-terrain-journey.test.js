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
  assert.equal(Journey.current(next).reason, 'search result');
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


test('TERRAIN-JOURNEY: automatic-entry preference stays presentation-local and out of semantic identity', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  const capture = source.match(/function captureSemanticState\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(capture, 'semantic snapshot owner must remain explicit');
  assert.doesNotMatch(capture[1], /COLLECTION_ENTER_RATIO|COLLECTION_ENTER_RATIO_STORAGE_KEY|COLLECTION_SCROLL_TO_ENTER_STORAGE_KEY|terrainEnterRatio|data-scroll-to-enter|localStorage/,
    'collection zoom/entry preferences must not become Journey semantic state');

  const preference = source.match(/function setCollectionEnterRatioPreference\(value, persist\) \{([\s\S]*?)\n  \}/);
  assert.ok(preference, 'entry-depth preference writer must remain explicit');
  assert.doesNotMatch(preference[1], /commitSemanticState|syncPresentationUrl|enterLevel/,
    'changing display preference must not become semantic movement or route identity');

  const scrollPreference = source.match(/function setCollectionScrollToEnterPreference\(enabled, persist\) \{([\s\S]*?)\n  \}/);
  assert.ok(scrollPreference, 'scroll-to-enter preference writer must remain explicit');
  assert.doesNotMatch(scrollPreference[1], /commitSemanticState|syncPresentationUrl|enterLevel/,
    'changing scroll-to-enter preference must remain local presentation state');

  const reveal = source.match(/function revealDepthRail\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(reveal, 'depth preference inspection path must remain explicit');
  assert.doesNotMatch(reveal[1], /localStorage|setCollectionEnterRatioPreference|setCollectionScrollToEnterPreference|commitSemanticState/,
    'hover/focus inspection must remain effect-free');

  const syncUrl = source.match(/function syncPresentationUrl\([^)]*\) \{([\s\S]*?)\n  \}/);
  assert.ok(syncUrl, 'presentation URL owner must remain explicit');
  assert.doesNotMatch(syncUrl[1], /ENTER_RATIO|ENTER_RATIO_STORAGE_KEY|COLLECTION_SCROLL_TO_ENTER_STORAGE_KEY|terrainEnterRatio|scroll-to-enter/,
    'preferences must not be serialized as navigation identity');
});

test('TERRAIN-JOURNEY: Content owns max-four overview and readable collection-entry preference without changing Live/Code geometry', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');
  const match = source.match(/<script type="application\/json" id="terrain-view-contract">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'Terrain view contract must remain embedded in the page');
  const view = JSON.parse(match[1]);

  assert.equal(view.profiles.live.levels.group.overview.maxColumns, 3,
    'Live/Code keeps its accepted three-column overview geometry');
  assert.equal(view.profiles['evolution-v1'].levels.group.overview.maxColumns, 4,
    'accepted Content may expand only its own collection overview to four columns');
  assert.ok(view.profiles['evolution-v1'].declaredDeltas.some((delta) => /up to four columns/.test(delta)));
  assert.ok(view.profiles['evolution-v1'].declaredDeltas.some((delta) => /local automatic-entry zoom preference/.test(delta)));

  assert.match(source, /function stageOverviewMaxColumns\(profile\)[\s\S]*currentWorld === 'content'[\s\S]*currentProfile === 'evolution-v1'/);
  assert.match(source, /return profile\.overview\.maxColumns/);
  assert.match(source, /function stageOverviewColumnCount\(profile\)/);
  assert.match(source, /return Math\.min\(stageOverviewMaxColumns\(profile\), Math\.max\(1, STAGES\.length\)\)/);
  assert.match(source, /function fitRectToView\(rect, fillFactor\)[\s\S]*Math\.min\(vp\.w \* fillFactor \/ rect\.width, vp\.h \* fillFactor \/ rect\.height\)/,
    'existing Terrain fit/framing remains the viewport-scale owner');
  assert.match(source, /var cols = stageOverviewColumnCount\(profile\)/);
  assert.match(source, /\.evo-grid\{ display:grid; grid-template-columns:repeat\(auto-fill,minmax\(220px,1fr\)\);/,
    'post-entry member-card grid stays outside this overview refinement');

  assert.match(source, /\.depth-preference-label\{[^}]*font:700 11px\/1\.25 var\(--mono\)/);
  assert.match(source, /\.depth-preference-value\{[^}]*font:800 14px\/1 var\(--mono\)/);
  assert.match(source, /\.depth-preference input\[type="range"\]\{[^}]*min-height:28px/);
  assert.match(source, /aria-label="Scroll to enter collection automatically"/);
  assert.match(source, /Automatic collection entry at/);
  assert.match(source, /Maximum collection zoom/);
});

test('TERRAIN-JOURNEY: Scroll to enter defaults on, persists locally, and when off caps visual zoom without semantic entry', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  assert.match(source, /COLLECTION_SCROLL_TO_ENTER_STORAGE_KEY = 'vex-terrain-collection-scroll-to-enter'/);
  assert.match(source, /function readCollectionScrollToEnterPreference\(\)[\s\S]*if \(stored === 'false'\) return false;[\s\S]*if \(stored === 'true'\) return true;[\s\S]*return true;/);
  assert.match(source, /localStorage\.setItem\(COLLECTION_SCROLL_TO_ENTER_STORAGE_KEY, collectionScrollToEnterEnabled \? 'true' : 'false'\)/);
  assert.match(source, /data-scroll-to-enter/);
  assert.match(source, /<span>Scroll to enter<\/span>/);
  assert.match(source, /setCollectionScrollToEnterPreference\(toggle\.checked, true\)/);

  assert.match(source, /var collectionEntryContext = collectionEntryPreferenceApplies\(\)/);
  assert.match(source, /var allowSemanticEntry = !\(collectionEntryContext && !collectionScrollToEnterEnabled\)/);
  assert.match(source, /if \(!allowSemanticEntry && ratio > collectionEnterRatio\) \{[\s\S]*newScale = levelBaseScale \* collectionEnterRatio;[\s\S]*ratio = collectionEnterRatio;/);
  assert.match(source, /if \(allowSemanticEntry && levelIndex === 1 && typeof levelCtx\.stageIdx !== 'number' && ratio > enterRatio\)/);
  assert.match(source, /if \(allowSemanticEntry && levelIndex < OVERVIEW_LEVELS\.length - 1 && ratio > enterRatio\)/);

  assert.match(source, /g\.addEventListener\('click',function\(ev\)\{ ev\.stopPropagation\(\); activateStage\(i\); \}\)/,
    'direct collection click entry must remain independent of scroll-to-enter');
  assert.match(source, /ev\.key==='Enter'\|\|ev\.key===' '/,
    'keyboard collection entry must remain independent of scroll-to-enter');
  assert.match(source, /collectionScrollToEnterEnabled[\s\S]*'scroll to zoom into this collection'[\s\S]*'click or press Enter to open this collection'/,
    'focused collection hint must match the current preference');
});

test('TERRAIN-JOURNEY: threshold rail projects semantic depth with bounded outward motion and one bounded entry-depth preference', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('function thresholdRailPosition');
  const end = source.indexOf('// ── the navigation fix', start);
  assert.ok(start > 0 && end > start, 'threshold rail implementation must be present before zoom navigation');
  const railSource = source.slice(start, end);

  assert.match(railSource, /levelIndex/);
  assert.match(railSource, /levelBaseScale/);
  assert.match(railSource, /enterRatioForCurrentContext/);
  assert.match(railSource, /EXIT_RATIO/);
  assert.match(railSource, /aria-current="step"/);
  assert.match(railSource, /role="progressbar"/);
  assert.doesNotMatch(railSource, /<button/, 'the rail does not become an arbitrary discrete navigation surface');
  assert.match(railSource, /data-enter-ratio type="range"/, 'the rail may expose exactly the bounded automatic-entry depth preference');
  assert.match(railSource, /COLLECTION_ENTER_RATIO_MIN/);
  assert.match(railSource, /COLLECTION_ENTER_RATIO_MAX/);
  assert.match(railSource, /setCollectionEnterRatioPreference/);
  assert.match(source, /id="levelReadout" tabindex="0" aria-label="Semantic depth\. Scroll downward while focused or hovered to move outward one layer\. Focus here to reveal the entry zoom preference\."/);
  assert.match(source, /function collectionEntryPreferenceApplies\(\)[\s\S]*currentWorld === 'content'[\s\S]*currentProfile === 'evolution-v1'[\s\S]*levelIndex === 1/);
  assert.match(source, /function enterRatioForCurrentContext\(\)[\s\S]*collectionEntryPreferenceApplies\(\) \? collectionEnterRatio : TERRAIN_ENTER_RATIO/);
  assert.match(source, /var TERRAIN_ENTER_RATIO = 3\.0/);
  assert.match(source, /COLLECTION_ENTER_RATIO_STORAGE_KEY = 'vex-terrain-collection-enter-ratio'/);
  assert.match(source, /\.level-readout\{[\s\S]*z-index:12;[\s\S]*pointer-events:auto;[\s\S]*opacity:\.18;/);
  assert.match(source, /\.level-readout\[data-can-zoom-out="true"\]\{ cursor:zoom-out; \}/);
  assert.match(source, /function canStepOutwardTerrainLayer\(\)/);
  assert.match(source, /function stepOutwardOneTerrainLayer\(reason\)/);
  assert.match(source, /activeReaderId \|\| activeGroupHomeKey/);
  assert.match(source, /closeEvolutionReader\(\{ history:false \}\)/);
  assert.match(source, /if \(isEvolutionAGroup\(\)\)/);
  assert.match(source, /function prefersReducedTerrainMotion\(\)/);
  assert.match(source, /function animateOutwardTerrainLayer\(reason\)/);
  assert.match(source, /terrainOutwardTransition = \{ active:false, timer:null \}/);
  assert.match(source, /TERRAIN_OUTWARD_TRANSITION_MS = 170/);
  assert.match(source, /mapWrap\.classList\.add\('terrain-outward-leaving'\)/);
  assert.match(source, /window\.setTimeout\(function \(\) \{[\s\S]*finishTerrainOutwardTransition\(reason\)/);
  assert.match(source, /function wireDepthRailOutwardGesture\(\)/);
  assert.match(source, /event\.deltaY <= 0 \|\| !canStepOutwardTerrainLayer\(\)/,
    'depth rail uses the same downward-wheel outward grammar as map zoom and Content boundaries');
  assert.match(source, /if \(sustainOutwardWheelGesture\(\)\) return/);
  assert.match(source, /animateOutwardTerrainLayer\('semantic depth rail wheel'\)/);
  assert.match(source, /\['ArrowDown','PageDown','-','_'\]/);
  assert.match(source, /lockOutwardWheelGesture\(\)/);
  assert.match(source, /semantic depth rail keyboard/);
  assert.match(source, /\.level-readout\.is-active\{ opacity:\.94; \}/);
  assert.match(source, /style="top:' \+ position\.toFixed\(2\) \+ '%"/);
  assert.match(source, /function revealDepthRail\(\)/);
  assert.match(source, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(source, /#world, #world\.snapping, \.panel, \.threshold-marker, \.level-readout,[\s\S]*\.evolution-layer, \.evolution-reader\{ transition:none !important; \}/);
  assert.match(source, /terrain-outward-leaving \.evolution-layer/);
  assert.match(source, /terrain-outward-leaving \.evolution-reader/);
  assert.match(source, /terrain-outward-leaving #world/);
  assert.match(source, /\.topbar > \*\{ min-width:0; \}/);

  assert.doesNotMatch(source, /class="map-hint"/);
  assert.doesNotMatch(source, /\.map-hint\{/);
  assert.doesNotMatch(source, /scroll to zoom \(levels snap to their own framing\)/);

  assert.doesNotMatch(source, /zoom-controls|zoom-btn|zoomIn|zoomOut|zoomReset/,
    'diagnostic build removes the entire manual zoom/reset control stack');
  assert.doesNotMatch(source, /mapWrap\.addEventListener\('pointermove'[\s\S]*revealDepthRail\(\)/,
    'desktop tile navigation remains free of a broad invisible depth-control hot zone');
  assert.match(source, /readout\.addEventListener\('mouseenter', revealDepthRail\)/,
    'the semantic depth rail remains the only visible/manual navigation instrument');

  assert.match(source, /mapWrap\.addEventListener\('wheel', function \(ev\) \{/,
    'wheel-to-zoom remains available so this change isolates only the button stack');
  assert.match(source, /handleZoomAt\(ev\.clientX - rect\.left, ev\.clientY - rect\.top, view\.scale \* Math\.pow\(1\.0015, -ev\.deltaY\)\)/,
    'wheel zoom math remains unchanged for the diagnostic');
});


test('TERRAIN-JOURNEY: Row B uses existing stage semantics for adaptive focus and bounded neighborhood materialization', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /function stageCompositionLayout/);
  assert.match(source, /stageCompositionRect\(ctx\)/);
  assert.match(source, /data-stage-index/);
  assert.match(source, /role:'button'/);
  assert.match(source, /tabindex:'0'/);
  assert.match(source, /targetLevel === 1 && stageIdx >= 0/);
  assert.match(source, /var enterRatio = enterRatioForCurrentContext\(\)/);
  assert.match(source, /levelIndex === 1 && typeof levelCtx\.stageIdx !== 'number' && ratio > enterRatio/);
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
  assert.match(reader, /activeReaderReturnKind === 'curiosity-overview'/,
    'reader boundary messaging must distinguish direct overview origins from collection origins');

  assert.match(source, /BOUNDARY_GESTURE_IDLE_MS = 220/);
  assert.match(source, /BOUNDARY_GESTURE_RESET_MS = 3000/);
  assert.match(source, /gap < BOUNDARY_GESTURE_IDLE_MS/);
  assert.match(source, /currentProfile === 'evolution-v1' && levelIndex === 2/);
  assert.match(source, /enterLevel\(1, \{ stageIdx:stageIdx \}\)/);
  assert.match(source, /if \(isEvolutionAGroup\(\) \|\| activeReaderId \|\| activeEntrySlug\) return;/);
  assert.match(source, /if \(ev\.deltaY > 0 && sustainOutwardWheelGesture\(\)\)/,
    'outer map must consume same-direction momentum after an outward transition');
  assert.match(source, /levelIndex === 1 && typeof levelCtx\.stageIdx === 'number' && ratio < EXIT_RATIO\)[\s\S]*lockOutwardWheelGesture\(\)[\s\S]*enterLevel\(1, \{\}\)/,
    'semantic stage-focus exit lands once before later wheel momentum may continue');
  assert.match(source, /levelIndex > 0 && ratio < EXIT_RATIO\)[\s\S]*lockOutwardWheelGesture\(\)[\s\S]*enterLevel\(levelIndex - 1/,
    'semantic level exit also arms the cross-layer landing lock');
  assert.match(source, /Collection reached · release, then scroll again to return to groups/);
  assert.match(source, /Groups reached · release, then scroll again to continue outward/);
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
    'isEvolutionAGroup','canScrollElement','boundaryGestureReady','enterLevel','syncPresentationUrl','commitSemanticState','showGestureHint','resetBoundaryGesture','hideGestureHint','sustainOutwardWheelGesture','scrollEvolutionRailWithWheel','lockOutwardWheelGesture',
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
    () => {},
    () => false,
    () => false,
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
  assert.equal(shelfHint, 2, 'confirmed outward transition exposes the new-layer landing hint');
  assert.equal(shelfPrevented, 2);

  let readerConfirm = false;
  let readerClosed = 0;
  let readerHints = 0;
  const makeReader = new Function(
    'scrollPathCanMove','boundaryGestureReady','closeEvolutionReader','showGestureHint','resetBoundaryGesture','hideGestureHint','sustainOutwardWheelGesture','lockOutwardWheelGesture',
    [
      "var activeEntrySlug = null;",
      "var activeReaderId = 'node-a';",
      "var activeGroupHomeKey = null;",
      "var activeReaderReturnKind = 'collection';",
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
    () => {},
    () => false,
    () => {}
  );
  const readerEvent = () => ({ deltaY: 120, deltaX: 0, target: null, preventDefault(){} });

  reader(readerEvent());
  assert.equal(readerClosed, 0);
  assert.equal(readerHints, 1);
  readerConfirm = true;
  reader(readerEvent());
  assert.equal(readerClosed, 1, 'confirmed downward boundary returns from reader to collection');
  assert.equal(readerHints, 2, 'reader transition lands visibly at the collection before another gesture may exit');

  let scrollBoundaryCalled = false;
  const scrollingShelf = makeShelf(
    () => true,
    () => true,
    () => { scrollBoundaryCalled = true; return true; },
    () => { throw new Error('must not leave collection while it can still scroll'); },
    () => {}, () => {}, () => {}, () => {}, () => {},
    () => false, () => false, () => {}
  );
  let preventedWhileScrollable = false;
  scrollingShelf({
    deltaY: 120, deltaX: 0, stopPropagation(){},
    preventDefault(){ preventedWhileScrollable = true; }
  });
  assert.equal(scrollBoundaryCalled, false, 'ordinary scrolling wins before boundary logic');
  assert.equal(preventedWhileScrollable, false, 'ordinary scroll is not consumed as a boundary transition');

  let upwardShelfBoundary = 0;
  const upwardShelf = makeShelf(
    () => true,
    () => false,
    () => { upwardShelfBoundary += 1; return true; },
    () => { throw new Error('upward wheel must not leave the collection'); },
    () => {}, () => {}, () => {}, () => {}, () => {},
    () => false, () => false, () => {}
  );
  upwardShelf({ deltaY:-120, deltaX:0, target:null, stopPropagation(){}, preventDefault(){} });
  assert.equal(upwardShelfBoundary, 0, 'top-edge upward wheel never arms outward collection navigation');

  let upwardReaderBoundary = 0;
  const upwardReader = makeReader(
    () => false,
    () => { upwardReaderBoundary += 1; return true; },
    () => { throw new Error('upward wheel must not leave the reader'); },
    () => {}, () => {}, () => {},
    () => false, () => {}
  );
  upwardReader({ deltaY:-120, deltaX:0, target:null, preventDefault(){} });
  assert.equal(upwardReaderBoundary, 0, 'top-edge upward wheel never arms outward reader navigation');

  let lockedBoundary = 0;
  const lockedShelf = makeShelf(
    () => true,
    () => false,
    () => { lockedBoundary += 1; return true; },
    () => { throw new Error('same wheel gesture must not cross another semantic boundary'); },
    () => {}, () => {}, () => {}, () => {}, () => {},
    () => true, () => false, () => {}
  );
  lockedShelf({ deltaY:120, deltaX:0, target:null, stopPropagation(){}, preventDefault(){} });
  assert.equal(lockedBoundary, 0, 'gesture-session lock blocks a second outward transition');
});


test('TERRAIN-JOURNEY: reader history preserves the real return surface instead of inventing an intermediate layer', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /PRESENTATION_HISTORY_KEY = 'vextremeTerrainPresentation'/);
  assert.match(source, /function presentationHistoryState\(kind, details\)/);
  assert.match(source, /Object\.assign\(\{ version:1, kind:kind \}, details \|\| \{\}\)/);
  assert.match(source, /function presentationHistoryValue\(state\)/);
  assert.match(source, /syncPresentationUrl\(options\.historyMode \|\| 'push', 'reader', \{[\s\S]*returnKind:activeReaderReturnKind/);
  assert.match(source, /syncPresentationUrl\(options\.historyMode \|\| 'push', 'group-home', \{[\s\S]*returnKind:activeReaderReturnKind,[\s\S]*returnEntrySlug:activeReaderReturnEntrySlug,[\s\S]*returnReaderId:activeReaderReturnReaderId/,
    'group-home history must preserve the actual surface it should return to');
  assert.match(source, /openEvolutionReader\(previous\.id, \{ historyMode:'replace' \}\)/);
  assert.match(source, /openEvolutionReader\(next\.id, \{ historyMode:'replace' \}\)/);
  assert.match(source, /syncPresentationUrl\('replace', 'reader', \{ returnKind:activeReaderReturnKind \}\)/,
    'direct embedded record routes must keep their real return contract when replacing the current presentation coordinate');
  assert.match(source, /presentationHistoryKind\(history\.state\) === 'reader'/);
  assert.match(source, /presentationHistoryKind\(history\.state\) === 'group-home'/);
  assert.match(source, /presentationHistoryKind\(history\.state\) === 'entry'/);
  assert.match(source, /history\.back\(\)/);
  assert.match(source, /restoreEvolutionPresentationFromHistory\(event\.state\)/);

  assert.match(source, /presentationHistoryState\('curiosity-overview', \{[\s\S]*stageKey:stage\.key,[\s\S]*step:contentTilePeekCycleIndex,[\s\S]*manual:contentTilePeekManual,[\s\S]*camera:capturePresentationCamera\(\)/);
  assert.match(source, /function capturePresentationCamera\(\) \{[\s\S]*x:view\.x,[\s\S]*y:view\.y,[\s\S]*scale:view\.scale/);
  assert.match(source, /function restorePresentationCamera\(camera\)/);
  assert.match(source, /world\.classList\.remove\('snapping'\)/,
    'camera return must cancel the temporary semantic refit animation before applying the preserved view');
  assert.match(source, /view\.x = camera\.x;[\s\S]*view\.y = camera\.y;[\s\S]*view\.scale = camera\.scale;[\s\S]*applyTransform\(\);[\s\S]*updateReadout\(\)/);
  assert.match(source, /history\.replaceState\(returnState, '', window\.location\.href\)/,
    'direct overview entry rewrites only the current presentation coordinate before pushing the reader');
  assert.match(source, /returnKind:'curiosity-overview'/);
  assert.match(source, /if \(activeReaderReturnKind === 'curiosity-overview'\) backLabel = '← Overview'/);
  assert.match(source, /activeReaderReturnKind === 'group-home'[\s\S]*backLabel = '← ' \+ \(stage\.parent\.title/,
    'record-reader Back label must name the group home when that is the actual return surface');
  assert.match(source, /kind === 'curiosity-overview'/);
  assert.match(source, /kind === 'curiosity-overview'[\s\S]*restorePresentationCamera\(presentation\.camera\)[\s\S]*openContentTilePeek\(overviewStageIdx, \{/,
    'Back restores the presentation camera before reopening the curiosity shelf');
  assert.match(source, /openContentTilePeek\(overviewStageIdx, \{[\s\S]*step:Number\.isInteger\(presentation\.step\)[\s\S]*manual:presentation\.manual === true/);
  assert.match(source, /returnKind:presentation && presentation\.returnKind \? presentation\.returnKind : 'collection'/,
    'browser Forward restores the reader with its original return contract');
  assert.match(source, /openEvolutionReader\(node\.id, \{[\s\S]*writeUrl:false,[\s\S]*returnKind:presentation && presentation\.returnKind \? presentation\.returnKind : 'collection',[\s\S]*returnEntrySlug:presentation && presentation\.returnEntrySlug \? presentation\.returnEntrySlug : null,[\s\S]*returnReaderId:presentation && presentation\.returnReaderId \? presentation\.returnReaderId : null/,
    'browser Forward must restore the coordinate paired with an entry/reader return kind');
  assert.match(source, /setReaderReturnContext\(returnKind, \{[\s\S]*entrySlug:options\.returnEntrySlug \|\| activeReaderReturnEntrySlug,[\s\S]*readerId:options\.returnReaderId \|\| activeReaderReturnReaderId[\s\S]*\}\)/,
    'reader replacement traversal must carry the existing return coordinate into the bounded mutation owner');
});


test('TERRAIN-JOURNEY: embedded Arc parent routes converge with Back without collapsing alternate topology', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  assert.match(source, /function currentReaderReturnStage\(\)/);
  assert.match(source, /activeReaderReturnKind !== 'group-home'/);
  assert.match(source, /function groupHomeRouteMatches\(slug\)/);
  assert.match(source, /candidate\.stage\.parent\.pageSlug === slug/);
  assert.match(source, /if \(activeReaderId[\s\S]*currentReturnStage[\s\S]*currentReturnStage\.parent\.pageSlug === slug\) \{[\s\S]*closeEvolutionReader\(\);[\s\S]*return true;/,
    'the current Arc parent uses the same history-owned return path as the top Back control');
  assert.match(source, /var matches = groupHomeRouteMatches\(slug\);[\s\S]*if \(matches\.length !== 1\) return false;/,
    'alternate group-home traversal must fail closed when one slug does not identify exactly one group');
  assert.match(source, /openEvolutionGroupHome\(target\.stage, \{[\s\S]*writeUrl:false,[\s\S]*returnKind:originReaderId \? 'reader' : 'collection',[\s\S]*returnReaderId:originReaderId/,
    'a unique alternate Arc parent preserves the originating record as presentation return context');
  assert.match(source, /syncPresentationUrl\('replace', 'group-home', \{[\s\S]*returnReaderId:activeReaderReturnReaderId/,
    'alternate topology uses the existing presentation history namespace rather than another navigation stack');
  assert.match(source, /var backLabel = returnEntry \? '← ' \+ returnEntry\.label : '← Collection';[\s\S]*if \(!returnEntry && returnReader\) backLabel = '← ' \+ \(returnReader\.title \|\| returnReader\.slug \|\| 'Page'\)/,
    'alternate group-home Back extends the existing entry/collection contract only when returning to a record');
  assert.match(source, /returnReaderId:presentation && presentation\.returnReaderId \? presentation\.returnReaderId : null/,
    'Forward restoration preserves the alternate group-home return context');
  assert.match(source, /function stageIndexForRouteNode\(node, preferredStageKey\)/);
  assert.match(source, /stageIndexForRouteNode\(node, fromGroupHome \? activeGroupHomeKey : null\)/,
    'a shared record opened from a group home keeps the actual journey group instead of falling back to primary placement');

  const routeFn = source.match(/function stageIndexForRouteNode\(node, preferredStageKey\) \{[\s\S]*?\n  \}/);
  assert.ok(routeFn, 'stageIndexForRouteNode must remain extractable for shared-membership proof');
  const routeIndex = new Function('STAGES', routeFn[0] + '\nreturn stageIndexForRouteNode;')([
    { key:'ai_practitioner_tools' },
    { key:'direct_contact' },
  ]);
  const sharedRecord = { arcKeys:['ai_practitioner_tools', 'direct_contact'] };
  assert.equal(routeIndex(sharedRecord, 'direct_contact'), 1,
    'actual group-home origin outranks the shared record primary/first arc');
  assert.equal(routeIndex(sharedRecord, null), 0,
    'without a real route origin the existing primary/first membership fallback remains unchanged');

  const fn = source.match(/function groupHomeRouteMatches\(slug\) \{[\s\S]*?\n  \}/);
  assert.ok(fn, 'groupHomeRouteMatches must remain extractable for ambiguity proof');
  const matchGroup = new Function('STAGES', fn[0] + '\nreturn groupHomeRouteMatches;')([
    { key:'direct_contact', parent:{ live:true, url:'/pages/direct-contact.html', pageSlug:'direct-contact' } },
    { key:'ai_practitioner_tools', parent:{ live:true, url:'/pages/ai-practitioner-tools.html', pageSlug:'ai-practitioner-tools' } },
    { key:'architecture', parent:{ live:true, url:'/pages/archives.html', pageSlug:'archives' } },
    { key:'claude_journals', parent:{ live:true, url:'/pages/archives.html', pageSlug:'archives' } },
  ]);
  assert.equal(matchGroup('direct-contact').length, 1);
  assert.equal(matchGroup('ai-practitioner-tools').length, 1);
  assert.equal(matchGroup('archives').length, 2,
    'shared archives route remains ambiguous instead of being silently assigned to one collection');
});


test('TERRAIN-JOURNEY: Inspect projects relationship and causal reason as separate accepted Journey facts', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  assert.match(source, /\.journey-relationship\{[^}]*color:var\(--accent\)/,
    'relationship retains the existing emphasized Journey treatment under a truthful presentation name');
  assert.match(source, /\.journey-reason\{[^}]*color:var\(--ink-faint\)/,
    'causal reason has its own read-only inspection treatment');
  assert.match(source, /var relationship = entry\.relationship[\s\S]*class="journey-relationship"[\s\S]*esc\(entry\.relationship\)/);
  assert.match(source, /var reason = entry\.reason[\s\S]*class="journey-reason">why · ' \+ esc\(entry\.reason\)/);
  assert.doesNotMatch(source, /class="journey-reason">[^']*' \+ esc\(entry\.relationship\)/,
    'the misleading historical class-to-field mapping must not return');

  const start = source.indexOf('function journeyHtml()');
  const end = source.indexOf('function wireJourneyControls', start);
  assert.ok(start > 0 && end > start, 'Journey inspection projection must remain extractable');
  const projectionSource = source.slice(start, end);
  assert.doesNotMatch(projectionSource, /commitSemanticState|history\.(?:pushState|replaceState|back|go)|openEvolution|closeEvolution|enterLevel/,
    'Inspect remains a projection and cannot become a navigation or semantic-state owner');

  const panelLayer = source.match(/\.panel\{[^}]*z-index:(\d+);/);
  const readerLayer = source.match(/\.evolution-reader\{[^}]*z-index:(\d+);/);
  assert.ok(panelLayer && readerLayer, 'Journey Inspect and embedded reader layers must remain explicit');
  assert.ok(Number(panelLayer[1]) > Number(readerLayer[1]),
    'Journey Inspect must remain perceivable above an embedded reader');

  const make = new Function('journeySnapshot', 'esc', [
    projectionSource,
    'return journeyHtml();'
  ].join('\n'));
  const html = make({
    journey: {
      cursor: 1,
      entries: [
        { label:'VEXTREME', relationship:null, reason:null, fromNodeId:null },
        {
          label:'Direct Contact',
          relationship:'entered from',
          reason:'Receive God primary path',
          fromNodeId:'receive-god'
        }
      ]
    }
  }, (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;'));

  assert.match(html, /class="journey-relationship">entered from · receive-god<\/span>/);
  assert.match(html, /class="journey-reason">why · Receive God primary path<\/span>/);
});


test('TERRAIN-JOURNEY: reader return context has one bounded mutation owner', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  assert.match(source, /function setReaderReturnContext\(kind, details\)/);
  assert.match(source, /function clearReaderReturnContext\(\) \{\s*setReaderReturnContext\('collection'\);\s*\}/);
  assert.match(source, /var returnKind = options\.returnKind[\s\S]*setReaderReturnContext\(returnKind, \{[\s\S]*entrySlug:options\.returnEntrySlug,[\s\S]*readerId:options\.returnReaderId/);

  const assignmentCount = (name) => {
    const expression = new RegExp('^\\s*(?:var\\s+)?' + name + '\\s*=(?!=)', 'gm');
    return (source.match(expression) || []).length;
  };
  assert.equal(assignmentCount('activeReaderReturnKind'), 2,
    'return kind may be initialized once and mutated only inside setReaderReturnContext');
  assert.equal(assignmentCount('activeReaderReturnEntrySlug'), 2,
    'entry return coordinate may be initialized once and mutated only inside setReaderReturnContext');
  assert.equal(assignmentCount('activeReaderReturnReaderId'), 2,
    'reader return coordinate may be initialized once and mutated only inside setReaderReturnContext');

  const helperStart = source.indexOf('function setReaderReturnContext(kind, details)');
  const helperEnd = source.indexOf('function updateEntryReaderChrome', helperStart);
  assert.ok(helperStart > 0 && helperEnd > helperStart, 'reader return helper block must remain extractable');
  const helperSource = source.slice(helperStart, helperEnd);
  const build = new Function('entryDocument', 'byId', [
    "var activeReaderReturnKind = 'collection';",
    'var activeReaderReturnEntrySlug = null;',
    'var activeReaderReturnReaderId = null;',
    helperSource,
    'return {',
    '  set:setReaderReturnContext,',
    '  clear:clearReaderReturnContext,',
    '  read:function(){ return { kind:activeReaderReturnKind, entrySlug:activeReaderReturnEntrySlug, readerId:activeReaderReturnReaderId }; }',
    '};'
  ].join('\n'));

  const context = build(
    (slug) => slug === 'receive-god' ? { label:'Receive God' } : null,
    { 'record-a':{ id:'record-a' } }
  );

  context.set('entry', { entrySlug:'receive-god', readerId:'record-a' });
  assert.deepEqual(context.read(), { kind:'entry', entrySlug:'receive-god', readerId:null });

  context.set('entry', { entrySlug:'missing' });
  assert.deepEqual(context.read(), { kind:'collection', entrySlug:null, readerId:null },
    'invalid entry coordinates fail the whole return context closed to collection');

  context.set('reader', { readerId:'record-a', entrySlug:'receive-god' });
  assert.deepEqual(context.read(), { kind:'reader', entrySlug:null, readerId:'record-a' });

  context.set('reader', { readerId:'missing' });
  assert.deepEqual(context.read(), { kind:'collection', entrySlug:null, readerId:null },
    'invalid reader coordinates fail the whole return context closed to collection');

  context.set('curiosity-overview');
  assert.deepEqual(context.read(), { kind:'curiosity-overview', entrySlug:null, readerId:null });

  context.set('group-home');
  assert.deepEqual(context.read(), { kind:'group-home', entrySlug:null, readerId:null });

  context.set('stale-history-kind', { entrySlug:'receive-god', readerId:'record-a' });
  assert.deepEqual(context.read(), { kind:'collection', entrySlug:null, readerId:null },
    'unknown reader return vocabulary fails closed to the neutral collection return');

  context.clear();
  assert.deepEqual(context.read(), { kind:'collection', entrySlug:null, readerId:null });
});


test('TERRAIN-JOURNEY: active embedded surface has one mutually-exclusive mutation owner', () => {
  const source = fs.readFileSync(path.join(ROOT, 'pages', 'terrain-map.html'), 'utf8').replace(/\r\n/g, '\n');

  assert.match(source, /function setActiveEmbeddedSurface\(kind, value\)/);
  assert.match(source, /function clearActiveEmbeddedSurface\(\) \{\s*setActiveEmbeddedSurface\(null, null\);\s*\}/);

  const assignmentCount = (name) => {
    const expression = new RegExp('^\\s*(?:var\\s+)?' + name + '\\s*=(?!=)', 'gm');
    return (source.match(expression) || []).length;
  };
  assert.equal(assignmentCount('activeReaderId'), 2,
    'reader surface identity may be initialized once and mutated only inside setActiveEmbeddedSurface');
  assert.equal(assignmentCount('activeEntrySlug'), 2,
    'entry surface identity may be initialized once and mutated only inside setActiveEmbeddedSurface');
  assert.equal(assignmentCount('activeGroupHomeKey'), 2,
    'group-home surface identity may be initialized once and mutated only inside setActiveEmbeddedSurface');

  const helperStart = source.indexOf('function setActiveEmbeddedSurface(kind, value)');
  const helperEnd = source.indexOf('function setReaderReturnContext', helperStart);
  assert.ok(helperStart > 0 && helperEnd > helperStart, 'active surface helper block must remain extractable');
  const helperSource = source.slice(helperStart, helperEnd);
  const build = new Function('entryDocument', 'byId', 'STAGES', [
    'var activeReaderId = null;',
    'var activeEntrySlug = null;',
    'var activeGroupHomeKey = null;',
    helperSource,
    'return {',
    '  set:setActiveEmbeddedSurface,',
    '  clear:clearActiveEmbeddedSurface,',
    '  read:function(){ return { readerId:activeReaderId, entrySlug:activeEntrySlug, groupHomeKey:activeGroupHomeKey }; }',
    '};'
  ].join('\n'));

  const surface = build(
    (slug) => slug === 'receive-god' ? { label:'Receive God' } : null,
    { 'record-a':{ id:'record-a' } },
    [{ key:'direct_contact' }]
  );

  surface.set('entry', 'receive-god');
  assert.deepEqual(surface.read(), { readerId:null, entrySlug:'receive-god', groupHomeKey:null });

  surface.set('reader', 'record-a');
  assert.deepEqual(surface.read(), { readerId:'record-a', entrySlug:null, groupHomeKey:null });

  surface.set('group-home', 'direct_contact');
  assert.deepEqual(surface.read(), { readerId:null, entrySlug:null, groupHomeKey:'direct_contact' });

  surface.set('entry', 'missing');
  assert.deepEqual(surface.read(), { readerId:null, entrySlug:null, groupHomeKey:null },
    'invalid active-surface identity fails closed to no embedded surface');

  surface.clear();
  assert.deepEqual(surface.read(), { readerId:null, entrySlug:null, groupHomeKey:null });

  const hideStart = source.indexOf('function hideEvolutionLayer()');
  const hideEnd = source.indexOf('function scheduleTerrainIdle', hideStart);
  const hideSource = source.slice(hideStart, hideEnd);
  assert.match(hideSource, /clearActiveEmbeddedSurface\(\)/,
    'generic Evolution teardown must clear entry as well as reader/group-home state');

  assert.match(source, /function syncEntryReaderFromDocument\(\)[\s\S]*setActiveEmbeddedSurface\('entry', slug\)/,
    'embedded entry-document synchronization must update active identity through the bounded owner');
});


// [VXG RealForever]
