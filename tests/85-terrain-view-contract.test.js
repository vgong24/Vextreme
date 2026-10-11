'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'pages', 'terrain-map.html');
const NODES = path.join(ROOT, 'data', 'nodes.json');
const ARCS = path.join(ROOT, 'data', 'arcs-v2.json');
const INTENTS = path.join(ROOT, 'config', 'content-intents.json');

function pageSource() {
  return fs.readFileSync(PAGE, 'utf8').replace(/\r\n/g, '\n');
}

function contract() {
  const source = pageSource();
  const match = source.match(/<script type="application\/json" id="terrain-view-contract">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'Terrain view contract must be embedded in the shipped page');
  return JSON.parse(match[1]);
}

function entryContract() {
  const source = pageSource();
  const match = source.match(/<script type="application\/json" id="terrain-entry-contract">\s*([\s\S]*?)\s*<\/script>/);
  assert.ok(match, 'Terrain entry contract must be embedded in the shipped page');
  return JSON.parse(match[1]);
}

function canonicalAssortment() {
  const nodes = JSON.parse(fs.readFileSync(NODES, 'utf8'));
  const arcs = JSON.parse(fs.readFileSync(ARCS, 'utf8'));
  const arcKeys = Object.keys(arcs).filter(key => !key.startsWith('_'));
  const rows = arcKeys.map(key => {
    const members = nodes.filter(node => (node.arcKeys || []).includes(key));
    const primary = nodes.filter(node => (node.arcKeys || [])[0] === key);
    return { key, members: members.map(node => node.slug), primary: primary.map(node => node.slug) };
  });
  return { nodes, arcs, rows };
}

test('TERRAIN-VIEW: Content presentation is accepted while the legacy Live geometry remains available', () => {
  const value = contract();
  assert.equal(value.schemaVersion, 'vextreme.terrain-view-contract/v1');
  assert.equal(value.terminology.legacyLevelAliases.stage, 'group');
  assert.deepEqual(Object.keys(value.components), [
    'terrain.system-field',
    'terrain.group-card',
    'terrain.node-marker',
    'terrain.detail-drawer',
  ]);
  assert.equal(value.profiles.live.status, 'accepted-reference');
  assert.equal(value.profiles['evolution-v1'].status, 'accepted-reference');
  assert.equal(value.profiles['evolution-v1'].label, 'Content');
  assert.equal(value.profiles['evolution-v1'].inherits, 'live');
  assert.ok(value.profiles['evolution-v1'].declaredDeltas.some(delta => /curiosity previews/.test(delta)));
  assert.ok(value.profiles['evolution-v1'].declaredDeltas.length >= 7);
  assert.equal(value.profiles['evolution-v1'].levels.group.renderer, 'content-preview-shelf');
  assert.equal(value.profiles['evolution-v1'].levels.node.renderer, 'preview-card');
  assert.equal(value.profiles['evolution-v1'].levels.node.readerRenderer, 'embedded-page');
  assert.equal(
    value.profiles['evolution-v1'].levels.node.inputPriority,
    'scrollable-content > armed-boundary-transition > terrain-zoom'
  );
  assert.equal(value.profiles['evolution-v2'].status, 'experimental');
  assert.equal(value.profiles['evolution-v2'].label, 'Evolution');
  assert.equal(value.profiles['evolution-v2'].inherits, 'evolution-v1');
  assert.ok(value.profiles['evolution-v2'].declaredDeltas.length >= 3);
  assert.equal(value.profiles['evolution-v2'].levels.group.renderer, 'adaptive-group-cards+curiosity-peek');
});

test('TERRAIN-VIEW: Live profile preserves the accepted geometry as named component tokens', () => {
  const live = contract().profiles.live;
  assert.deepEqual(live.levels.group.overview, {
    maxColumns: 3,
    cardWidth: 240,
    cardHeight: 140,
    gap: 24,
    boundsPadding: 18,
  });
  assert.deepEqual(live.levels.group.focus, {
    canvasWidth: 820,
    minCanvasHeight: 660,
    focusWidth: 490,
    focusHeight: 520,
    contextWidth: 145,
    contextHeight: 64,
    contextGap: 16,
    railCanvasPadding: 40,
    boundsPadding: 20,
  });
  assert.equal(live.levels.node.neighborhoodLimit, 12);
  assert.deepEqual(live.levels.node.marker, {
    focusRingRadius: 12,
    hitRadius: 16,
    nodeRadius: 6,
    screenWidth: 18,
    screenHeight: 14,
    screenCornerRadius: 3,
    labelOffsetX: 11,
    labelOffsetY: 4,
    pinOffsetY: 12,
  });
});

test('TERRAIN-VIEW: current canonical arcs are not empty; three are secondary-only in primary placement and Timeline is cross-cutting', () => {
  const { rows } = canonicalAssortment();
  assert.deepEqual(rows.filter(row => row.members.length === 0), []);

  const secondaryOnly = rows
    .filter(row => row.members.length > 0 && row.primary.length === 0)
    .map(row => ({ key: row.key, members: row.members.length }));
  assert.deepEqual(secondaryOnly, [
    { key: 'ai_orientation', members: 8 },
    { key: 'excavation', members: 5 },
    { key: 'march_23_2026', members: 3 },
  ]);

  const timeline = rows.find(row => row.key === 'full_timeline');
  assert.equal(timeline.members.length, 75);
  assert.equal(timeline.primary.length, 1);
});

test('TERRAIN-VIEW: dated content has one known timeline-only exception and canonical arc-less department records stay explicitly unplaced', () => {
  const { nodes } = canonicalAssortment();
  const datedTimelineOnly = nodes
    .filter(node => node.id !== null)
    .filter(node => (node.arcKeys || []).length === 1 && node.arcKeys[0] === 'full_timeline')
    .map(node => node.slug);
  assert.deepEqual(datedTimelineOnly, ['podcasts']);

  const arcLess = nodes.filter(node => !(node.arcKeys || []).length);
  assert.equal(arcLess.some(node => node.id !== null), false, 'arc-less canonical records remain id-null rather than acquiring invented chronology');
  assert.equal(arcLess.some(node => !node.department || !node.workType), false, 'arc-less canonical records remain explicitly department-placed');

  const historicalMedia = arcLess
    .filter(node => ['phantom-opera-meta-review', 'vxg-thread-round-5'].includes(node.slug))
    .map(node => ({ slug: node.slug, department: node.department, workType: node.workType }));
  assert.deepEqual(historicalMedia, [
    { slug: 'phantom-opera-meta-review', department: 'media', workType: 'reviews' },
    { slug: 'vxg-thread-round-5', department: 'media', workType: 'record-transcripts' },
  ]);

  const intents = JSON.parse(fs.readFileSync(INTENTS, 'utf8')).intents || [];
  const registeredArcLess = intents
    .filter(intent => intent.registerNode === true && !intent.arcKey)
    .map(intent => ({ slug: intent.slug, department: intent.department, workType: intent.workType }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const registeredSlugs = new Set(registeredArcLess.map(item => item.slug));
  const canonicalRegisteredArcLess = arcLess
    .filter(node => registeredSlugs.has(node.slug))
    .map(node => ({ slug: node.slug, department: node.department, workType: node.workType }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  assert.deepEqual(canonicalRegisteredArcLess, registeredArcLess, 'registerNode intents without arcKey become canonical without inventing narrative membership');
});

test('TERRAIN-VIEW: accepted Content remains the no-query default while Evolution v2 is an explicit presentation experiment', () => {
  const source = pageSource();

  assert.match(source, /id="contentProfileWrap"/);
  assert.match(source, /id="contentProfile"/);
  assert.match(source, /<option value="evolution-v1">Content<\/option>/);
  assert.match(source, /<option value="evolution-v2">Evolution<\/option>/);
  assert.match(source, /<span class="content-view-split">[\s\S]*data-world="content"[\s\S]*id="contentProfileWrap"[\s\S]*id="contentProfile"[\s\S]*<\/span>/,
    'presentation profile belongs inside the Content half of the View control');
  assert.match(source, /\.terrain-content-quiet \.lens,[\s\S]*\.terrain-content-quiet \.legend\{ display:none; \}/);
  assert.match(source, /\.terrain-content-quiet\.terrain-inspect-open \.lens,[\s\S]*\.terrain-content-quiet\.terrain-inspect-open \.legend\{ display:flex; \}/,
    'Inspect owns reveal of the View/profile control in accepted Content');
  assert.doesNotMatch(source, />Evolution A</);
  assert.match(source, /id="evolutionLayer"/);
  assert.match(source, /function readInitialRoute\(\)/);
  assert.match(source, /var view = params\.get\('view'\)/);
  assert.match(source, /world: view === 'code' \? 'code' : 'content'/);
  assert.match(source, /profile: profile === 'live' \? 'live' : \(profile === 'evolution-v2' \? 'evolution-v2' : 'evolution-v1'\)/);
  assert.match(source, /params\.get\('group'\)/);
  assert.match(source, /params\.get\('page'\)/);
  assert.match(source, /currentWorld === 'content' && currentProfile === 'evolution-v1'/);
  assert.match(source, /url\.searchParams\.delete\('view'\)/);
  assert.match(source, /url\.searchParams\.delete\('profile'\)/);
  assert.match(source, /if \(currentWorld === 'content'\) url\.searchParams\.set\('profile', currentProfile\)/);
  assert.match(source, /function setPresentationProfile\(profile, writeUrl\)/);
  assert.match(source, /var nextProfile = profile === 'live' \? 'live' : \(profile === 'evolution-v2' \? 'evolution-v2' : 'evolution-v1'\)/);
  assert.match(source, /contentProfile\.addEventListener\('change', function \(\) \{/);
  assert.match(source, /setPresentationProfile\(contentProfile\.value, true\)/);
  assert.match(source, /contentProfile\.value = currentProfile === 'evolution-v2' \? 'evolution-v2' : 'evolution-v1'/);
  assert.match(source, /currentProfile === 'evolution-v2'[\s\S]*levelIndex !== 1[\s\S]*levelCtx\.stageIdx/);
  assert.match(source, /enterLevel\(1, \{\}\)/);
  assert.match(source, /if \(nextWorld === 'content'\) currentProfile = 'evolution-v1'/);

  // Accepted Content remains its current renderer and reader behavior.
  assert.match(source, /function renderEvolutionAGroup\(\)/);
  assert.match(source, /stageMembers\(stage\)/);
  assert.match(source, /node\.screenshots \|\| \{\}/);
  assert.match(source, /preview pending/);
  assert.match(source, /data-evo-detail/);
  assert.match(source, /data-evo-reader/);
  assert.match(source, /id="evolutionReader"/);
  assert.match(source, /function openEvolutionReader\(nodeId, options\)/);

  const profileFunction = source.match(/function setPresentationProfile\(profile, writeUrl\) \{([\s\S]*?)\n  \}/);
  assert.ok(profileFunction, 'presentation-profile function should be present');
  assert.doesNotMatch(profileFunction[1], /commitSemanticState/, 'renderer switching must not add a Journey step');
});

test('TERRAIN-VIEW: collection group homes stay outside membership while remaining readable inside Terrain', () => {
  const source = pageSource();
  assert.match(source, /parent: a\.parent \|\| null/);
  assert.match(source, /stage\.parent && stage\.parent\.live && stage\.parent\.url/);
  assert.match(source, /class="evo-group-depth-card"/);
  assert.match(source, /data-evo-group-home/);
  assert.match(source, /evo-group-depth-kicker">Group home/);
  assert.match(source, /summary\.membershipCount \+ ' members · parent surface<\/span>'/);
  assert.match(source, /function openEvolutionGroupHome\(stage, options\)/);
  assert.match(source, /activeGroupHomeKey = stage\.key/);
  assert.match(source, /initialStage\.parent\.pageSlug === initialRoute\.page/);
  const scopedParentRoute = source.indexOf('initialStage.parent.pageSlug === initialRoute.page');
  const globalRecordRoute = source.indexOf('var initialPage = ALL.find', scopedParentRoute > -1 ? scopedParentRoute : 0);
  assert.ok(scopedParentRoute > -1 && globalRecordRoute > -1 && scopedParentRoute < globalRecordRoute, 'group-scoped parent route must win before global record lookup');
  assert.match(source, /openEvolutionGroupHome\(stage\)/);
  assert.match(source, /group home pending/);
});

test('TERRAIN-VIEW: accepted Content quiet chrome and wheel boundaries preserve explicit entry / outward exit semantics', () => {
  const source = pageSource();
  assert.match(source, /id="terrainInspectToggle"/);
  assert.match(source, /function syncTerrainChrome\(\)/);
  assert.match(source, /terrain-content-quiet/);
  assert.match(source, /terrain-reader-quiet/);
  assert.match(source, /class="evo-group-depth-card"/);
  assert.match(source, /boundaryGestureReady\('collection-outward', direction\)/);
  assert.match(source, /boundaryGestureReady\('reader-outward:' \+ readerKey, direction\)/);
  assert.doesNotMatch(source, /collection-enter:/);
  assert.doesNotMatch(source, /reader-next:/);
  assert.doesNotMatch(source, /scroll down again to read/);
  assert.match(source, /return to groups/);
  assert.match(source, /return to the collection/);
});

test('TERRAIN-VIEW: public Content hides engineering evidence until the existing Inspect state is opened', () => {
  const source = pageSource();

  assert.match(source, /\.terrain-content-quiet:not\(\.terrain-inspect-open\) \.evo-card-meta,/);
  assert.match(source, /\.terrain-content-quiet:not\(\.terrain-inspect-open\) \.stage-status-dot,/);
  assert.match(source, /\.terrain-content-quiet:not\(\.terrain-inspect-open\) \.stage-density-track,/);
  assert.match(source, /\.terrain-content-quiet:not\(\.terrain-inspect-open\) \.stage-density-fill\{ display:none; \}/);

  assert.match(source, /terrainInspectToggle\.addEventListener\('click', function \(\) \{[\s\S]*classList\.toggle\('terrain-inspect-open'\)/,
    'the already-shipped Inspect toggle remains the reveal control');

  assert.match(source, /'<div class="evo-card-meta">' \+ chips \+ '<\/div>'/,
    'technical card evidence remains rendered rather than deleted');
  assert.match(source, /class:'stage-status-dot'/);
  assert.match(source, /class:'stage-density-track'/);
  assert.match(source, /class:'stage-density-fill'/);

  assert.doesNotMatch(source, /\.evo-card-meta\s*\{\s*display:none/,
    'evidence must not be globally hidden from Code or Inspect contexts');
});

test('TERRAIN-VIEW: embedded preserved routes resolve root and repository-relative page links through live Terrain nodes', () => {
  const source = pageSource();
  assert.match(source, /function repositorySlugFromHref\(href\)/);
  assert.match(source, /var rootMatch =/);
  assert.match(source, /var relativeMatch =/);
  assert.match(source, /function handleEvolutionReaderRouteClick\(event\)/);
  assert.match(source, /function openRepositoryRouteInTerrain\(slug\)/);
  assert.match(source, /stageIndexForRouteNode\(node\)/);
  assert.match(source, /doc\.addEventListener\('click', handleEvolutionReaderRouteClick\)/);
  assert.match(source, /if \(activeEntrySlug\) \{\s*syncEntryReaderFromDocument\(\);\s*return;\s*\}\s*doc\.addEventListener\('click', handleEvolutionReaderRouteClick\);/);
  assert.match(source, /relationship:'opened from preserved route'/);
  assert.match(source, /preserved but not live in Vextreme yet/);
});

test('TERRAIN-VIEW: ordered entry reader hidden side controls stay visually absent', () => {
  const source = pageSource();
  assert.match(source, /\.reader-side\[hidden\]\{\s*display:none;\s*\}/);
  assert.match(source, /document\.getElementById\('readerPrev'\)\.hidden = true;/);
  assert.match(source, /document\.getElementById\('readerNext'\)\.hidden = true;/);
});

test('TERRAIN-VIEW: compact semantic-depth rail keeps verbose ordering detail out of the visual pill', () => {
  const source = pageSource();
  assert.match(source, /\.level-order\{[^}]*overflow:hidden;[^}]*text-overflow:ellipsis;[^}]*white-space:nowrap;/s);
  assert.match(source, /var orderLabel = ratio\.toFixed\(2\) \+ '× · ' \+ orderNote;/);
  assert.match(source, /class="level-order" role="note" aria-label="/);
  assert.match(source, /title="' \+ esc\(orderLabel\) \+ '">/);
  assert.match(source, /ratio\.toFixed\(2\) \+ '×<\/div>'/);
});

test('TERRAIN-VIEW: screenshot-backed surfaces remain visible as evidence without pretending to be a semantic screen family', () => {
  const source = pageSource();
  assert.match(source, /SCREENSHOT EVIDENCE/);
  assert.match(source, /membership means captured screenshot evidence/);
  assert.match(source, /evidence surface/);
  assert.doesNotMatch(source, /LIVE SCREENS/);
  assert.doesNotMatch(source, /LIVE SCREEN<\/div>/);
});

test('TERRAIN-VIEW: Content Search renders collection-aware results and opens them through the reader', () => {
  const source = pageSource();
  assert.match(source, /id="evoSearchResults"/);
  assert.match(source, /function renderEvolutionSearchResults\(\)/);
  assert.match(source, /function openEvolutionSearchMatch\(node, reason\)/);
  assert.match(source, /currentWorld === 'content' && currentProfile === 'evolution-v1'/);
  assert.match(source, /node\.stageName \|\| node\.arcName \|\| node\.stage/);
  assert.match(source, /enterLevel\(1, \{ stageIdx:stageIdx \}\)/);
  assert.match(source, /openEvolutionReader\(node\.id\)/);
  const travel = source.match(/function travelSearch\(direction\) \{[\s\S]*?\n  \}/);
  assert.ok(travel, 'travelSearch must remain present');
  assert.match(travel[0], /openEvolutionSearchMatch\(match, reason\)/);
  assert.match(travel[0], /travelTo\(match\.id/, 'legacy Code\/Live search remains the fallback');
});

test('TERRAIN-VIEW: Content prefers explicit cover art without claiming screenshot evidence', () => {
  const source = pageSource();
  assert.match(source, /node\.preview && node\.preview\.kind === 'cover'/);
  assert.match(source, /class="evo-cover-image"/);
  assert.match(source, /cover image/);
  assert.match(source, /screenshot pending/);
  assert.match(source, /screenshots = node\.screenshots \|\| \{\}/);
});

test('TERRAIN-VIEW: selected Content collection does not duplicate overview curiosity with a Visual Windows strip', () => {
  const source = pageSource();

  assert.match(source, /function hasEvolutionPreview\(node\)/,
    'shared preview capability remains available for overview curiosity');
  assert.match(source, /class="evo-preview"/,
    'ordinary member cards retain their own page preview');
  assert.match(source, /var memberCards = members\.map\(function \(node\) \{/);

  assert.doesNotMatch(source, /function evolutionVisualWindowNodes\(members\)/);
  assert.doesNotMatch(source, /class="evo-windows"/);
  assert.doesNotMatch(source, /Visual windows/);
  assert.doesNotMatch(source, /class="evo-window"/);
  assert.doesNotMatch(source, /\.evo-windows(?:-|\{)/,
    'removed Visual Windows styling must not survive as unused presentation baggage');
});

test('TERRAIN-VIEW: screenshot rendering accepts local repository paths and absolute Assets evidence URLs', () => {
  const source = pageSource();

  assert.match(source, /function screenshotUrl\(value\)/);
  assert.ok(source.includes("return /^https?:\\/\\//i.test(src) ? src : BASE + '/' + src.replace(/^\\/+/, '');"));
  assert.match(source, /escAttr\(screenshotUrl\(screenshots\[lang\]\)\)/,
    'Content card preview must resolve through the shared screenshot URL helper');
  assert.match(source, /screenshotUrl\(p\.screenshots\[panelLang\]\)/,
    'Content Details screenshot must resolve local or remote custody');
  assert.match(source, /screenshotUrl\(s\.screenshots\[panelLang\]\)/,
    'Code\/screen evidence panel must resolve local or remote custody');
});

test('TERRAIN-VIEW: mutable Terrain data bypasses stale browser cache so current preview metadata is visible', () => {
  const source = pageSource();
  assert.match(source, /fetch\(TERRAIN_URL, \{ cache: 'no-store' \}\)/);
});

test('TERRAIN-VIEW: Content search dismisses on outside pointer interaction without erasing the query', () => {
  const source = pageSource();
  assert.match(source, /var searchPopoverOpen = false;/);
  assert.match(source, /function dismissEvolutionSearchResults\(\)/);
  assert.match(source, /document\.addEventListener\('pointerdown'/);
  assert.match(source, /!searchRegion\.contains\(ev\.target\)/);
  assert.match(source, /addEventListener\('focus', function \(\) \{[\s\S]*searchPopoverOpen = true;/);
});

test('TERRAIN-VIEW: passive resize never re-enters semantic rendering while the reader is open', () => {
  const source = pageSource();
  const resize = source.match(/function handleTerrainResize\(\) \{[\s\S]*?\n  \}/);
  assert.ok(resize, 'resize guard must remain present');
  assert.match(resize[0], /if \(evolutionReader && !evolutionReader\.hidden\) return;/);
  assert.match(resize[0], /enterLevel\(levelIndex, levelCtx\);/);
  assert.match(source, /window\.addEventListener\('resize', handleTerrainResize\);/);
});

test('TERRAIN-VIEW: embedded reader navigation replaces iframe history instead of adding a blank Back stop', () => {
  const source = pageSource();
  assert.match(source, /function replaceEvolutionReaderDocument\(url\)/);
  assert.match(source, /evolutionReaderFrame\.contentWindow\.location\.replace\(target\);/);
  assert.match(source, /replaceEvolutionReaderDocument\(node\.liveUrl\);/);
  assert.match(source, /replaceEvolutionReaderDocument\('about:blank'\);/);
  assert.doesNotMatch(source, /evolutionReaderFrame\.src\s*=/);
});

test('TERRAIN-VIEW: embedded same-origin Terrain links return to the parent collection instead of nesting Terrain', () => {
  const source = pageSource();
  assert.match(source, /target = new URL\(href, evolutionReaderFrame\.contentWindow \? evolutionReaderFrame\.contentWindow\.location\.href : window\.location\.href\);/);
  assert.match(source, /target\.origin !== window\.location\.origin/);
  assert.match(source, /var pagesPrefix = BASE\.replace\(\/\\\/\$\/, ''\) \+ '\/pages\/';/);
  assert.match(source, /if \(slug === 'terrain-map'\) \{[\s\S]*?closeEvolutionReader\(\);[\s\S]*?return;/);
});

test('TERRAIN-VIEW: Content outward wheel escape is downward-only at reader and collection boundaries', () => {
  const source = pageSource();
  const shelf = source.match(/function handleEvolutionShelfWheel\(ev\) \{[\s\S]*?\n  \}/);
  const reader = source.match(/function handleEvolutionReaderWheel\(ev\) \{[\s\S]*?\n  \}/);
  assert.ok(shelf && reader, 'reader and collection wheel handlers must remain present');
  assert.match(shelf[0], /if \(direction < 0\) \{[\s\S]*?return;/);
  assert.match(reader[0], /if \(direction < 0\) \{[\s\S]*?return;/);
  assert.match(shelf[0], /End reached · pause, then scroll down again to return to groups/);
  assert.match(reader[0], /End reached · pause, then scroll down again to return to the collection/);
  assert.doesNotMatch(shelf[0], /Top reached/);
  assert.doesNotMatch(reader[0], /Top reached/);
});

test('TERRAIN-VIEW: one physical wheel gesture can cross at most one Content semantic boundary', () => {
  const source = pageSource();
  assert.match(source, /var outwardWheelGesture = \{ active:false, timer:null \};/);
  assert.match(source, /OUTWARD_WHEEL_RELEASE_MS = 520/);
  assert.match(source, /function sustainOutwardWheelGesture\(\)/);
  assert.match(source, /function lockOutwardWheelGesture\(\)/);
  const shelf = source.match(/function handleEvolutionShelfWheel\(ev\) \{[\s\S]*?\n  \}/);
  const reader = source.match(/function handleEvolutionReaderWheel\(ev\) \{[\s\S]*?\n  \}/);
  assert.ok(shelf && reader);
  assert.match(shelf[0], /var outwardLocked = direction > 0 && sustainOutwardWheelGesture\(\);/);
  assert.match(reader[0], /var outwardLocked = direction > 0 && sustainOutwardWheelGesture\(\);/);
  assert.match(source, /if \(ev\.deltaY > 0 && sustainOutwardWheelGesture\(\)\)/,
    'the outer map consumes continuing outward momentum after the inner surface disappears');
  assert.match(shelf[0], /if \(outwardLocked\) \{[\s\S]*?return;/);
  assert.match(reader[0], /if \(outwardLocked\) \{[\s\S]*?return;/);
  assert.match(shelf[0], /lockOutwardWheelGesture\(\);[\s\S]*?enterLevel\(1, \{\}\);/);
  assert.match(reader[0], /lockOutwardWheelGesture\(\);[\s\S]*?closeEvolutionReader\(\);/);
});

test('TERRAIN-VIEW: wheel input over the collection pill rail scrolls it horizontally', () => {
  const source = pageSource();
  assert.match(source, /function evolutionRailFromTarget\(target\)/);
  assert.match(source, /node\.closest\('\.evo-rail'\)/);
  assert.match(source, /function scrollEvolutionRailWithWheel\(ev\)/);
  assert.match(source, /rail\.scrollWidth <= rail\.clientWidth \+ 1/);
  assert.match(source, /rail\.scrollLeft \+= delta;/);
  const shelf = source.match(/function handleEvolutionShelfWheel\(ev\) \{[\s\S]*?\n  \}/);
  assert.ok(shelf);
  assert.match(shelf[0], /if \(scrollEvolutionRailWithWheel\(ev\)\) return;/);
});

test('TERRAIN-VIEW: Content middle layer foregrounds group kind and placement relationships instead of priority jargon', () => {
  const source = pageSource();
  assert.match(source, /function groupKindLabel\(kind\)/);
  assert.match(source, /function contentMembershipText\(summary\)/);
  assert.match(source, /summary\.membershipCount \+ ' members · ' \+ summary\.primaryCount \+ ' primary placement'/);
  assert.match(source, /if \(!context && currentWorld !== 'content'\) \{[\s\S]*stage\.sub/);
  assert.match(source, /class:'stage-kind'/);
  assert.match(source, /kind\.textContent=kindText/);
});

test('TERRAIN-VIEW: Content group overview exposes one bounded orientation legend without changing semantic state', () => {
  const source = pageSource();
  assert.match(source, /id="stageOrientation"/);
  assert.match(source, /stage-orientation-title">Content groups</);
  assert.match(source, /stage-orientation-kind">collection</);
  assert.match(source, /stage-orientation-kind">timeline view</);
  assert.match(source, /stage-orientation-kind">curation bucket</);
  assert.match(source, /function renderStageOrientation\(layout\)/);
  assert.match(source, /currentWorld !== 'content'/);
  assert.match(source, /layout\.focusedIdx >= 0/);
  assert.match(source, /stageOrientationSummary\.textContent = ALL\.length \+ ' pages/);
});

test('TERRAIN-VIEW: focused Content group reveals real member titles and existing group-home relationship', () => {
  const source = pageSource();
  assert.match(source, /var previewMembers = summary\.members\.slice\(0, 5\)/);
  assert.match(source, /member\.title \|\| member\.slug \|\| member\.id/);
  assert.match(source, /class:'stage-member'/);
  assert.match(source, /stage\.parent && stage\.parent\.live/);
  assert.match(source, /GROUP HOME · /);
  assert.doesNotMatch(source, /groupDescriptions|groupMeaning|semanticDescription/);
});

test('TERRAIN-VIEW: Content groups no longer imply a linear sequence with Stage arrows', () => {
  const source = pageSource();
  assert.match(source, /if \(layout\.focusedIdx < 0 && currentWorld === 'code'\) \{/);
  assert.match(source, /class:'stage-arrow pop-in'/);
});

test('TERRAIN-VIEW: pan gesture displacement suppresses the synthetic click without changing keyboard activation', () => {
  const source = pageSource();
  assert.match(source, /MAP_DRAG_THRESHOLD_PX = 5/);
  assert.match(source, /var mapPointerGesture = \{[\s\S]*suppressClick:false/);
  assert.match(source, /function armMapDragClickSuppression\(\)/);
  assert.match(source, /function consumeMapDragClickSuppression\(\)/);
  assert.match(source, /Math\.hypot\(dx, dy\) < MAP_DRAG_THRESHOLD_PX/);
  assert.match(source, /view\.x = mapPointerGesture\.originViewX \+ dx/);
  assert.match(source, /view\.y = mapPointerGesture\.originViewY \+ dy/);
  assert.match(source, /if \(mapPointerGesture\.moved\) armMapDragClickSuppression\(\)/);
  assert.match(source, /mapWrap\.addEventListener\('click', function \(ev\) \{[\s\S]*consumeMapDragClickSuppression\(\)[\s\S]*ev\.stopPropagation\(\);[\s\S]*\}, true\)/,
    'drag-generated click must be intercepted in capture phase before a stage-card click handler can run');
  assert.match(source, /ev\.target\.closest\('#levelReadout'\)/,
    'the side depth rail is not itself treated as a map-pan origin');
  assert.match(source, /g\.addEventListener\('click',function\(ev\)\{ ev\.stopPropagation\(\); activateStage\(i\); \}\)/);
  assert.match(source, /g\.addEventListener\('keydown',function\(ev\)\{ if\(ev\.key==='Enter'\|\|ev\.key===' '\)\{/,
    'keyboard activation remains an explicit non-pointer path');
});

test('TERRAIN-VIEW: Content overview collection titles wrap to two lines and auto-fit before truncating', () => {
  const source = pageSource();

  const textFn = source.match(/function stageLabelText\(value, limit\) \{[\s\S]*?\n  \}/);
  const wrapFn = source.match(/function stageLabelWrapAttempt\(value, maxChars, maxLines\) \{[\s\S]*?\n  \}/);
  const layoutFn = source.match(/function stageOverviewLabelLayout\(value, width\) \{[\s\S]*?\n  \}/);
  assert.ok(textFn && wrapFn && layoutFn, 'adaptive overview label helpers must remain extractable');

  const makeLayout = new Function([
    textFn[0],
    wrapFn[0],
    layoutFn[0],
    'return stageOverviewLabelLayout;'
  ].join('\n'));
  const layout = makeLayout();

  [
    'AI PRACTITIONER TOOLS',
    'ARCHITECTURE & METHODOLOGY',
    'CONVERSATIONS WITH GOD',
    'DIRECT CONTACT — START HERE',
    'THE AI LIBERATION RECORD',
  ].forEach(title => {
    const result = layout(title, 240);
    assert.ok(result.lines.length >= 1 && result.lines.length <= 2, title + ' must use at most two lines');
    assert.equal(result.truncated, false, title + ' should fit without losing its canonical name');
    assert.ok(result.fontSize >= 14 && result.fontSize <= 18, title + ' must stay inside the bounded auto-fit range');
    assert.equal(result.lines.join(' '), title, title + ' must preserve all words in order');
  });

  const pathological = layout('THISISANINTENTIONALLYUNBROKENANDIMPOSSIBLYLONGCOLLECTIONIDENTIFIER', 240);
  assert.equal(pathological.truncated, true, 'unavoidable overflow falls back to bounded truncation');
  assert.ok(pathological.lines.length <= 2);
  assert.equal(pathological.fontSize, 14);

  assert.match(source, /function appendStageOverviewLabel\(group, rect, value\)/);
  assert.match(source, /data-label-lines/);
  assert.match(source, /data-label-font-size/);
  assert.match(source, /data-label-truncated/);
  assert.match(source, /layout\.lines\.forEach\(function \(line, index\)/);
  assert.match(source, /var baseY = rect\.y \+ \(layout\.lines\.length > 1 \? 46 : 50\)/);
  assert.match(source, /currentWorld === 'content' && item\.kind === 'overview'[\s\S]*appendStageOverviewLabel\(g, r, stage\.name\)/);
  assert.match(source, /else \{[\s\S]*stageLabelText\(stage\.name, context\?15:\(focused\?30:22\)\)/,
    'focused and context variants retain their existing compact title behavior');
});

test('TERRAIN-VIEW: accepted Content curiosity shelf supports slower autoplay, manual edges, and direct reading', () => {
  const source = pageSource();
  assert.doesNotMatch(source, /CONTENT_TILE_PEEK_STAGE_KEYS/);
  assert.match(source, /CONTENT_TILE_PEEK_DELAY_MS = 200/);
  assert.match(source, /CONTENT_TILE_PEEK_STEP_MS = 3200/,
    'automatic preview movement should remain slow enough to inspect');
  assert.match(source, /CONTENT_TILE_PEEK_SHELF_HEIGHT = 176/);
  assert.match(source, /var contentTilePeekManual = false/);
  assert.match(source, /function contentTilePeekEnabledFor\(stage\) \{[\s\S]*stageMembers\(stage\)\.length/);
  assert.match(source, /function contentTilePeekProfileEnabled\(\) \{[\s\S]*currentProfile === 'evolution-v1'[\s\S]*currentProfile === 'evolution-v2'/);
  assert.match(source, /function openContentTilePeek\(stageIndex, options\)/);
  assert.match(source, /if \(!contentTilePeekProfileEnabled\(\) \|\| levelIndex !== 1\) return/);
  assert.match(source, /var curiosityOverview = contentTilePeekProfileEnabled\(\)/);
  assert.match(source, /if \(levelCtx && typeof levelCtx\.stageIdx === 'number'\) return/);
  assert.match(source, /var representative = stageMembers\(stage\)\.filter\(hasEvolutionPreview\)\[0\] \|\| null/);
  assert.match(source, /class:'stage-curiosity-thumb'/);
  assert.match(source, /members\.map\(contentTilePeekItemHtml\)\.join\(''\)/);
  assert.match(source, /item\.rect\.y <= activeItem\.rect\.y/);
  assert.match(source, /candidate\.style\.transform = 'translateY\(' \+ shift \+ 'px\)'/);
  assert.match(source, /stage-curiosity-track/);
  assert.match(source, /translate3d\(-' \+ \(contentTilePeekCycleIndex \* \(width \+ 10\)\)/);
  assert.match(source, /prefers-reduced-motion: reduce/);

  assert.match(source, /data-curiosity-shift="-1"/);
  assert.match(source, /data-curiosity-shift="1"/);
  assert.match(source, /function manuallyStepContentTilePeek\(shell, memberCount, delta\)/);
  assert.match(source, /contentTilePeekManual = true;[\s\S]*stopContentTilePeekCycle\(false\)/,
    'first manual edge action permanently pauses autoplay for the open shelf');
  assert.match(source, /prev\.disabled = contentTilePeekCycleIndex <= 0/);
  assert.match(source, /next\.disabled = contentTilePeekCycleIndex >= maxStep/);

  assert.match(source, /data-curiosity-reader=/);
  assert.match(source, /function openContentTilePeekReader\(stageIndex, nodeId\)/);
  assert.match(source, /history\.replaceState\(returnState, '', window\.location\.href\)/);
  assert.match(source, /levelIndex = 1;[\s\S]*levelCtx = \{ stageIdx:stageIndex \};[\s\S]*openEvolutionReader\(node\.id, \{/);
  const directOpen = source.match(/function openContentTilePeekReader\(stageIndex, nodeId\) \{[\s\S]*?\n  \}/);
  assert.ok(directOpen, 'direct curiosity reader opener must remain extractable');
  assert.doesNotMatch(directOpen[0], /enterLevel\(1, \{ stageIdx:stageIndex \}\)/,
    'direct curiosity selection must not render the collection-card middle layer before opening the reader');
  assert.match(source, /returnKind:'curiosity-overview'/);
  assert.match(source, /camera:capturePresentationCamera\(\)/,
    'direct preview entry preserves the exact overview camera in presentation history');
  assert.match(source, /function restorePresentationCamera\(camera\)/);
  assert.match(source, /restorePresentationCamera\(presentation\.camera\)/);
  assert.doesNotMatch(source, /semantic\s*=\s*\{[^}]*\b(?:x|y|scale)\s*:/s,
    'camera continuity remains presentation-only and does not contaminate Journey semantic state');
  assert.match(source, /select a preview to read directly/);

  assert.match(source, /g\.addEventListener\('mouseenter', function \(\) \{ scheduleContentTilePeekOpen\(i\); \}\)/);
  assert.match(source, /g\.addEventListener\('focusin', function \(\) \{ scheduleContentTilePeekOpen\(i\); \}\)/);
  assert.match(source, /g\.addEventListener\('click',function\(ev\)\{ ev\.stopPropagation\(\); activateStage\(i\); \}\)/);
  assert.match(source, /g\.addEventListener\('keydown',function\(ev\)\{ if\(ev\.key==='Enter'\|\|ev\.key===' '\)\{/);
  assert.doesNotMatch(source, /curiosity-peek[^\n]*semanticLevel/i);
});

test('TERRAIN-VIEW: every shipped inline JavaScript block still parses after contract extraction', () => {
  const source = pageSource();
  const scripts = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(match => !/type="application\/json"/.test(match[1]) && !/\bsrc=/.test(match[1]))
    .map(match => match[2])
    .filter(code => code.trim());
  assert.ok(scripts.length >= 2, 'expected search helper plus Terrain runtime inline scripts');
  scripts.forEach((code, index) => {
    assert.doesNotThrow(() => new Function(code), 'inline script ' + index + ' must parse');
  });
});

test('TERRAIN-VIEW: shipped renderer consumes the contract and exposes semantic component metadata in the DOM', () => {
  const source = pageSource();
  assert.match(source, /var profile = LIVE_VIEW\.levels\.group/);
  assert.match(source, /var overview = profile\.overview/);
  assert.match(source, /var focus = profile\.focus/);
  assert.match(source, /LIVE_VIEW\.levels\.node\.marker/);
  assert.match(source, /LIVE_VIEW\.levels\.node\.neighborhood/);
  assert.match(source, /LIVE_VIEW\.levels\.system\.geometry/);
  assert.match(source, /data-terrain-component/);
  assert.match(source, /data-group-kind/);
  assert.match(source, /data-membership-count/);
  assert.match(source, /data-primary-count/);
  assert.match(source, /data-projection-completeness/);
  assert.match(source, /cross-cutting view · not a primary parent in Live/);
  assert.match(source, /secondary membership · members live under other primary collections/);

  assert.doesNotMatch(source, /var cardW = 240, cardH = 140, gap = 24/);
  assert.doesNotMatch(source, /var focusRect = \{ x:165, y:/);
  assert.doesNotMatch(source, /var NODE_NEIGHBORHOOD_LIMIT = 12;/);
});


test('TERRAIN-VIEW: ordered entry contract keeps Take a Walk inside the reader while activating the VexSystem learning-world handoff', () => {
  const value = entryContract();
  assert.equal(value.schemaVersion, 'vextreme.terrain-entry/v1');
  assert.deepEqual(value.choices.map(choice => [choice.id, choice.effect, choice.enabled]), [
    ['receive-god', 'reader', true],
    ['archives', 'terrain-group-overview', true],
    ['vexsystem', 'vexsystem-learning-world', true],
  ]);
  assert.equal(value.choices.find(choice => choice.id === 'vexsystem').path, '../vexsystem/');
  assert.equal(value.documents['receive-god'].order, 1);
  assert.equal(value.documents['take-a-walk'].order, 2);
  assert.equal(value.choices.some(choice => choice.id === 'take-a-walk'), false);

  const source = pageSource();
  assert.match(source, /function renderEvolutionAArrival\(\)/);
  assert.match(source, /function openEntryReader\(slug\)/);
  assert.match(source, /function enterArchivesFromArrival\(\)/);
  assert.match(source, /function handleTerrainEntryMessage\(event\)/);
  assert.match(source, /function enterVexSystemFromArrival\(\)/);
  assert.match(source, /data-entry-action="vexsystem"/);
  assert.doesNotMatch(source, /data-entry-action="vexsystem" disabled/);
  assert.match(source, /new URL\(choice\.path, window\.location\.href\)/);
  assert.match(source, /target\.origin !== window\.location\.origin/);
  assert.match(source, /window\.location\.assign\(target\.href\)/);
  assert.ok(source.includes("evolutionLayer.querySelector('[data-entry-action=\"vexsystem\"]').addEventListener('click', enterVexSystemFromArrival);"));
  assert.match(source, /openEntryReader\('receive-god'\)/);
  assert.doesNotMatch(source, /data-entry-action="take-a-walk"/);
});

// [VXG RealForever]
