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

test('TERRAIN-VIEW: component contract keeps Live accepted while forming one bounded Evolution A profile', () => {
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
  assert.equal(value.profiles['evolution-v1'].status, 'experimental');
  assert.equal(value.profiles['evolution-v1'].label, 'Evolution A');
  assert.equal(value.profiles['evolution-v1'].inherits, 'live');
  assert.ok(value.profiles['evolution-v1'].declaredDeltas.length >= 6);
  assert.equal(value.profiles['evolution-v1'].levels.group.renderer, 'content-preview-shelf');
  assert.equal(value.profiles['evolution-v1'].levels.node.renderer, 'preview-card');
  assert.equal(value.profiles['evolution-v1'].levels.node.readerRenderer, 'embedded-page');
  assert.equal(
    value.profiles['evolution-v1'].levels.node.inputPriority,
    'scrollable-content > armed-boundary-transition > terrain-zoom'
  );
  assert.equal(value.profiles['evolution-v2'].status, 'reserved-unformed');
  assert.deepEqual(value.profiles['evolution-v2'].declaredDeltas, []);
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

test('TERRAIN-VIEW: Evolution A is a URL-addressable presentation state over shared Content truth', () => {
  const source = pageSource();

  assert.match(source, /id="contentProfile"/);
  assert.match(source, /<option value="live">Live<\/option>/);
  assert.match(source, /<option value="evolution-v1">Evolution A<\/option>/);
  assert.match(source, /id="evolutionLayer"/);
  assert.match(source, /function readInitialRoute\(\)/);
  assert.match(source, /params\.get\('profile'\)/);
  assert.match(source, /params\.get\('group'\)/);
  assert.match(source, /params\.get\('page'\)/);
  assert.match(source, /url\.searchParams\.set\('profile', currentProfile\)/);
  assert.match(source, /url\.searchParams\.set\('group', String\(stage\.key\)\)/);
  assert.match(source, /url\.searchParams\.set\('page', String\(readerNode\.slug \|\| readerNode\.id\)\)/);
  assert.match(source, /function setPresentationProfile\(profile, writeUrl\)/);
  assert.match(source, /function renderEvolutionAGroup\(\)/);
  assert.match(source, /stageMembers\(stage\)/);
  assert.match(source, /node\.screenshots \|\| \{\}/);
  assert.match(source, /preview pending/);
  assert.match(source, /data-evo-detail/);
  assert.match(source, /data-evo-reader/);
  assert.match(source, /id="evolutionReader"/);
  assert.match(source, /id="evolutionReaderFrame"/);
  assert.match(source, /id="readerBack"/);
  assert.match(source, /id="readerPrev"/);
  assert.match(source, /id="readerNext"/);
  assert.match(source, /function openEvolutionReader\(nodeId, options\)/);
  assert.match(source, /function closeEvolutionReader\(options\)/);
  assert.match(source, /function boundaryGestureReady\(key, direction\)/);
  assert.match(source, /function handleEvolutionShelfWheel\(ev\)/);
  assert.match(source, /function handleEvolutionReaderWheel\(ev\)/);
  assert.match(source, /BOUNDARY_GESTURE_IDLE_MS = 220/);
  assert.match(source, /scrollPathCanMove\(ev\.target, doc, direction\)/);
  assert.match(source, /evolutionLayer\.addEventListener\('wheel', handleEvolutionShelfWheel/);
  assert.match(source, /evolutionReaderFrame\.addEventListener\('load', wireEvolutionReaderDocument\)/);
  assert.match(source, /if \(isEvolutionAGroup\(\) \|\| activeReaderId \|\| activeEntrySlug\) return;/);

  const profileFunction = source.match(/function setPresentationProfile\(profile, writeUrl\) \{([\s\S]*?)\n  \}/);
  assert.ok(profileFunction, 'presentation-profile function should be present');
  assert.doesNotMatch(profileFunction[1], /commitSemanticState/, 'renderer switching must not add a Journey step');
});


test('TERRAIN-VIEW: collection group homes stay outside membership while remaining readable inside Terrain', () => {
  const source = pageSource();
  assert.match(source, /parent: a\.parent \|\| null/);
  assert.match(source, /stage\.parent && stage\.parent\.live && stage\.parent\.url/);
  assert.match(source, /class="evo-group-home"/);
  assert.match(source, /data-evo-group-home/);
  assert.match(source, />Group home<\/button>/);
  assert.match(source, /function openEvolutionGroupHome\(stage, options\)/);
  assert.match(source, /activeGroupHomeKey = stage\.key/);
  assert.match(source, /initialStage\.parent\.pageSlug === initialRoute\.page/);
  const scopedParentRoute = source.indexOf('initialStage.parent.pageSlug === initialRoute.page');
  const globalRecordRoute = source.indexOf('var initialPage = ALL.find', scopedParentRoute > -1 ? scopedParentRoute : 0);
  assert.ok(scopedParentRoute > -1 && globalRecordRoute > -1 && scopedParentRoute < globalRecordRoute, 'group-scoped parent route must win before global record lookup');
  assert.match(source, /openEvolutionGroupHome\(stage\)/);
  assert.match(source, /group home pending/);
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


test('TERRAIN-VIEW: ordered entry contract keeps Receive God before Take a Walk and reserves VexSystem without inventing a third active route', () => {
  const value = entryContract();
  assert.equal(value.schemaVersion, 'vextreme.terrain-entry/v1');
  assert.deepEqual(value.choices.map(choice => [choice.id, choice.effect, choice.enabled]), [
    ['receive-god', 'reader', true],
    ['archives', 'terrain-group-overview', true],
    ['vexsystem', 'reserved', false],
  ]);
  assert.equal(value.documents['receive-god'].order, 1);
  assert.equal(value.documents['take-a-walk'].order, 2);
  assert.equal(value.choices.some(choice => choice.id === 'take-a-walk'), false);

  const source = pageSource();
  assert.match(source, /function renderEvolutionAArrival\(\)/);
  assert.match(source, /function openEntryReader\(slug\)/);
  assert.match(source, /function enterArchivesFromArrival\(\)/);
  assert.match(source, /function handleTerrainEntryMessage\(event\)/);
  assert.match(source, /data-entry-action="vexsystem" disabled aria-disabled="true"/);
  assert.match(source, /openEntryReader\('receive-god'\)/);
  assert.doesNotMatch(source, /data-entry-action="take-a-walk"/);
});

// [VXG RealForever]
