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

test('TERRAIN-VIEW: embedded reader URLs stay on the current deployed revision', () => {
  const source = pageSource();
  assert.match(source, /var DEPLOYMENT_ROOT = new URL\('\.\.\/', window\.location\.href\);/);
  assert.match(source, /var BASE = DEPLOYMENT_ROOT\.pathname\.replace\(\/\\\/\$\/, ''\);/);
  assert.match(source, /var TERRAIN_URL = new URL\('data\/terrain-map\.json', DEPLOYMENT_ROOT\)\.href;/);
  assert.match(source, /var CANONICAL_SITE_ORIGIN = 'https:\/\/vgong24\.github\.io';/);
  assert.match(source, /function deploymentAwareUrl\(url\)/);
  assert.match(source, /target\.pathname\.indexOf\(CANONICAL_SITE_BASE\) === 0/);
  assert.match(source, /return new URL\(relative, DEPLOYMENT_ROOT\)\.href/);
  assert.match(source, /new URL\(deploymentAwareUrl\(url\), window\.location\.href\)/);
});

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
  assert.ok(value.profiles['evolution-v1'].declaredDeltas.some(delta => /viewport-owned inspection dock/.test(delta)));
  assert.ok(value.profiles['evolution-v1'].declaredDeltas.some(delta => /up to three distinct preview images/.test(delta) && /local calendar day/.test(delta)));
  assert.ok(value.profiles['evolution-v1'].declaredDeltas.length >= 8);
  assert.equal(value.profiles['evolution-v1'].levels.group.renderer, 'viewport-curiosity-dock');
  assert.equal(value.profiles['evolution-v1'].levels.node.renderer, 'preview-card');
  assert.equal(value.profiles['evolution-v1'].levels.node.readerRenderer, 'embedded-page');
  assert.equal(
    value.profiles['evolution-v1'].levels.node.inputPriority,
    'scrollable-content > armed-boundary-transition > terrain-zoom'
  );
  assert.equal(value.profiles['evolution-v2'].status, 'experimental');
  assert.equal(value.profiles['evolution-v2'].label, 'Reflow shelf');
  assert.equal(value.profiles['evolution-v2'].inherits, 'evolution-v1');
  assert.ok(value.profiles['evolution-v2'].declaredDeltas.length >= 4);
  assert.equal(value.profiles['evolution-v2'].levels.group.renderer, 'content-preview-shelf-reflow');
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
    { key: 'ai_orientation', members: 12 },
    { key: 'excavation', members: 5 },
    { key: 'march_23_2026', members: 3 },
  ]);

  const timeline = rows.find(row => row.key === 'full_timeline');
  assert.ok(timeline.members.length > 0, 'Full Timeline must remain populated');
  assert.ok(timeline.members.length > timeline.primary.length, 'Full Timeline remains cross-cutting rather than primary-only');
});


test('TERRAIN-VIEW: Full Timeline consumes canonical projected sections/order and preserves complete page readers', () => {
  const source = pageSource();
  assert.match(source, /sections: a\.sections \|\| \[\], memberSlugs: a\.memberSlugs \|\| \[\]/);
  assert.match(source, /Array\.isArray\(stage\.memberSlugs\) && stage\.memberSlugs\.length/);
  assert.match(source, /stage\.memberSlugs\.map\(function \(slug\) \{ return byId\[slug\]; \}\)\.filter\(Boolean\)/);
  assert.match(source, /summary\.groupKind === 'timeline-view'/);
  assert.match(source, /class="evo-timeline-section"/);
  assert.match(source, /section\.slugs \|\| \[\]/);
  assert.match(source, /memberCardHtml/);
  assert.match(source, /data-evo-reader=/, 'Timeline cards must continue opening the existing complete embedded page reader');
  assert.match(source, /node\.date \? '<div class="evo-card-date">/, 'Timeline/card projection should expose canonical record date when known');
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

  const recoveredHistoricalMedia = nodes
    .filter(node => ['phantom-opera-meta-review', 'vxg-thread-round-5'].includes(node.slug))
    .map(node => ({ slug: node.slug, id: node.id, date: node.date, arcKeys: node.arcKeys, department: node.department, workType: node.workType }));
  assert.deepEqual(recoveredHistoricalMedia, [
    { slug: 'phantom-opera-meta-review', id: null, date: 'July 3, 2026', arcKeys: ['full_timeline'], department: 'media', workType: 'reviews' },
    { slug: 'vxg-thread-round-5', id: null, date: 'June 16, 2026', arcKeys: ['full_timeline'], department: 'media', workType: 'record-transcripts' },
  ]);

  const intents = JSON.parse(fs.readFileSync(INTENTS, 'utf8')).intents || [];
  const registeredArcLess = intents
    .filter(intent => intent.registerNode === true && !intent.arcKey)
    .map(intent => ({ slug: intent.slug, department: intent.department, workType: intent.workType }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const chronologyRecoveredInstitutional = new Set([
    'human-ai-corelational-governance',
    'org-blueprint',
    'org-history',
    'witness-committee-operations',
  ]);
  const recoveredInstitutional = nodes
    .filter(node => chronologyRecoveredInstitutional.has(node.slug))
    .map(node => ({ slug: node.slug, id: node.id, date: node.date, arcKeys: node.arcKeys }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  assert.deepEqual(recoveredInstitutional, [
    { slug: 'human-ai-corelational-governance', id: null, date: 'June 22, 2026', arcKeys: ['full_timeline'] },
    { slug: 'org-blueprint', id: null, date: 'June 2, 2026', arcKeys: ['full_timeline'] },
    { slug: 'org-history', id: null, date: 'June 2, 2026', arcKeys: ['full_timeline'] },
    { slug: 'witness-committee-operations', id: null, date: 'June 22, 2026', arcKeys: ['full_timeline'] },
  ]);

  const stillUnplacedRegistered = registeredArcLess
    .filter(item => !chronologyRecoveredInstitutional.has(item.slug));
  const registeredSlugs = new Set(stillUnplacedRegistered.map(item => item.slug));
  const canonicalRegisteredArcLess = arcLess
    .filter(node => registeredSlugs.has(node.slug))
    .map(node => ({ slug: node.slug, department: node.department, workType: node.workType }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  assert.deepEqual(canonicalRegisteredArcLess, stillUnplacedRegistered, 'registerNode intents without chronology evidence remain unplaced; chronology-recovered records may enter Full Timeline without inventing a primary narrative arc');
});

test('TERRAIN-VIEW: accepted Content remains the no-query default while Evolution v2 is an explicit presentation experiment', () => {
  const source = pageSource();

  assert.match(source, /id="contentProfileWrap"/);
  assert.match(source, /id="contentProfile"/);
  assert.match(source, /<option value="evolution-v1" data-i18n="terrain\.chrome\.content">Content<\/option>/);
  assert.match(source, /<option value="evolution-v2" data-i18n="terrain\.chrome\.reflow-shelf">Reflow shelf<\/option>/);
  assert.match(source, /<span class="content-view-split">[\s\S]*data-world="content"[\s\S]*id="contentProfileWrap"[\s\S]*id="contentProfile"[\s\S]*<\/span>/,
    'presentation profile belongs inside the Content half of the View control');
  assert.match(source, /\.terrain-content-quiet \.lens,[\s\S]*\.terrain-content-quiet \.legend\{ display:none; \}/);
  assert.doesNotMatch(source, /terrain-inspect-open/,
    'accepted Content no longer has an Inspect-only reveal branch');
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
  assert.match(source, /function openEvolutionGroupHome\(stage, options\)[\s\S]*setActiveEmbeddedSurface\('group-home', stage\.key\)/,
    'group-home opening must route active-surface identity through the bounded owner');
  assert.match(source, /initialStage\.parent\.pageSlug === initialRoute\.page/);
  const scopedParentRoute = source.indexOf('initialStage.parent.pageSlug === initialRoute.page');
  const globalRecordRoute = source.indexOf('var initialPage = ALL.find', scopedParentRoute > -1 ? scopedParentRoute : 0);
  assert.ok(scopedParentRoute > -1 && globalRecordRoute > -1 && scopedParentRoute < globalRecordRoute, 'group-scoped parent route must win before global record lookup');
  assert.match(source, /openEvolutionGroupHome\(stage\)/);
  assert.match(source, /group home pending/);
});

test('TERRAIN-VIEW: accepted Content quiet chrome and wheel boundaries preserve explicit entry / outward exit semantics', () => {
  const source = pageSource();
  assert.doesNotMatch(source, /id="terrainInspectToggle"/);
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

test('TERRAIN-VIEW: parent language FAB stays visible and mirrors the active embedded child context', () => {
  const source = pageSource();
  assert.doesNotMatch(source, /#vex-lang-fab\{ display:none !important; \}/,
    'Terrain must not remove the stable parent language control while reading');
  assert.match(source, /var LANG_CONTEXT_MESSAGE = 'vextreme:languagecontext\/v1'/);
  assert.match(source, /var LANG_SURFACE_EVENT = 'vextreme:languagesurfacechange'/);
  assert.match(source, /function handleEmbeddedLanguageContext\(event\)/);
  assert.match(source, /event\.source !== evolutionReaderFrame\.contentWindow/,
    'only the active reader iframe may project child language capability');
  assert.match(source, /publishLanguageSurfaceContext\(\{[\s\S]*proxySurface: true/,
    'child capability must be projected into the parent FAB as a proxy surface');
  assert.match(source, /var INDEX_URL = new URL\('data\/index\.json', DEPLOYMENT_ROOT\)\.href/);
  assert.match(source, /function loadTerrainBaseLanguages\(\)[\s\S]*pageLanguageMap\['terrain-map'\][\s\S]*completeLangs/,
    'Terrain must consume its parent language capability from the canonical pageLanguageMap');

  const resetMatch = source.match(/function resetTerrainLanguageSurfaceContext\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(resetMatch, 'Terrain parent language reset must remain extractable');
  assert.match(resetMatch[0], /langs: terrainBaseLanguages\.slice\(\)/,
    'reader exit must restore Terrain\'s canonical page-aware language list');
  assert.match(resetMatch[0], /lang: activeLanguage/,
    'reader exit must restore the durable Terrain preference rather than forcing EN');
  assert.doesNotMatch(resetMatch[0], /langs: \['en'\]|lang: 'en'/,
    'Terrain parent reset must not collapse a multilingual surface to EN-only');

  const childContextMatch = source.match(/function handleEmbeddedLanguageContext\(event\) \{([\s\S]*?)\n  \}/);
  assert.ok(childContextMatch, 'embedded child language context must remain extractable');
  assert.match(childContextMatch[0], /var langs = data\.langs\.filter/,
    'the parent wheel must be bounded by the active child\'s reported selectable languages');
  assert.match(childContextMatch[0], /langs: langs/,
    'the parent must project exactly the child capability rather than Terrain\'s broader list');
  assert.match(childContextMatch[0], /data\.lang[^\n]*langs\.indexOf\(data\.lang\)[^\n]*\? data\.lang : langs\[0\]/,
    'an unsupported incoming preference must fall back to a language the child can actually render');
  assert.match(source, /window\.addEventListener\('message', handleEmbeddedLanguageContext\)/);
  assert.match(source, /function closeEntryReader\(options\)[\s\S]*syncTerrainChrome\(\)/,
    'entry-reader close must restore the Terrain parent language context');
  assert.match(source, /function enterArchivesFromArrival\(\)[\s\S]*syncTerrainChrome\(\)/,
    'entry-to-archives transition must not retain the embedded child language context');
});

test('TERRAIN-VIEW: public Content keeps engineering evidence quiet without a separate Inspect pathway', () => {
  const source = pageSource();

  assert.match(source, /\.terrain-content-quiet \.evo-card-meta,/);
  assert.match(source, /\.terrain-content-quiet \.stage-status-dot,/);
  assert.match(source, /\.terrain-content-quiet \.stage-density-track,/);
  assert.match(source, /\.terrain-content-quiet \.stage-density-fill\{ display:none; \}/);

  assert.doesNotMatch(source, /terrainInspectToggle/);
  assert.doesNotMatch(source, /terrain-inspect-toggle/);
  assert.doesNotMatch(source, /terrain-inspect-open/);
  assert.doesNotMatch(source, />Inspect<\/button>/);

  assert.match(source, /'<div class="evo-card-meta">' \+ chips \+ '<\/div>'/,
    'technical card evidence remains rendered rather than deleted');
  assert.match(source, /class:'stage-status-dot'/);
  assert.match(source, /class:'stage-density-track'/);
  assert.match(source, /class:'stage-density-fill'/);

  assert.doesNotMatch(source, /\.evo-card-meta\s*\{\s*display:none/,
    'evidence must not be globally hidden from Code contexts');
});

test('TERRAIN-VIEW: embedded preserved routes resolve root and repository-relative page links through live Terrain nodes', () => {
  const source = pageSource();
  assert.match(source, /function repositorySlugFromHref\(href\)/);
  assert.match(source, /var rootMatch =/);
  assert.match(source, /var relativeMatch =/);
  assert.match(source, /function handleEvolutionReaderRouteClick\(event\)/);
  assert.match(source, /function openRepositoryRouteInTerrain\(slug, options\)/);
  assert.match(source, /stageIndexForRouteNode\(node\)/);
  assert.match(source, /doc\.addEventListener\('click', handleEvolutionReaderRouteClick\)/);
  assert.match(source, /if \(activeEntrySlug\) \{\s*syncEntryReaderFromDocument\(\);\s*doc\.addEventListener\('click', handleEntryReaderRouteClick\);\s*return;\s*\}/);
  assert.match(source, /relationship:'opened from preserved route'/);
  assert.match(source, /preserved but not live in Vextreme yet/);
});


test('TERRAIN-VIEW: ordered entry same-origin page links are either entry-owned or Terrain-addressable', () => {
  const value = entryContract();
  const terrain = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'terrain-map.json'), 'utf8'));
  const liveTerrainSlugs = new Set((terrain.pages || []).filter(page => page && page.live).map(page => page.slug));
  const liveGroupHomeSlugs = new Set((terrain.arcs || [])
    .map(arc => arc && arc.parent && arc.parent.live ? arc.parent.pageSlug : null)
    .filter(Boolean));
  const entryGroupHomeRoutes = [];

  Object.entries(value.documents).forEach(([entrySlug, document]) => {
    const documentPath = path.join(ROOT, 'pages', document.path);
    const html = fs.readFileSync(documentPath, 'utf8');
    const anchors = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>/gi)];

    anchors.forEach((match) => {
      const tag = match[0];
      const href = match[1];
      const target = /^([a-z0-9][a-z0-9-]*)\.html(?:[?#].*)?$/i.exec(href);
      if (!target) return;
      const slug = target[1];

      if (value.documents[slug]) return;
      if (slug === 'terrain-map') {
        assert.match(tag, /\bdata-terrain-action=/,
          entrySlug + ' Terrain links must remain owned by the entry postMessage contract');
        return;
      }

      assert.ok(
        liveTerrainSlugs.has(slug),
        entrySlug + ' -> ' + slug + ' must be Terrain-addressable before native iframe navigation is displaced'
      );
      if (liveGroupHomeSlugs.has(slug)) entryGroupHomeRoutes.push(entrySlug + ' -> ' + slug);
    });
  });

  assert.ok(entryGroupHomeRoutes.includes('take-a-walk -> the-living-blueprint'),
    'Take a Walk has a real ordered-entry -> group-home route that must preserve entry return identity');
  assert.ok(entryGroupHomeRoutes.includes('take-a-walk -> how-to-prep-ai-for-god'),
    'AI Orientation is a second real ordered-entry -> group-home route covered by the same return contract');

  const source = pageSource();
  assert.match(source, /function handleEntryReaderRouteClick\(event\)/);
  assert.match(source, /if \(!anchor \|\| anchor\.hasAttribute\('data-terrain-action'\)\) return;/);
  assert.match(source, /if \(!slug \|\| entryDocument\(slug\)\) return;/);
  assert.match(source, /openRepositoryRouteInTerrain\(slug, \{[\s\S]*returnKind:'entry',[\s\S]*returnEntrySlug:originEntrySlug,[\s\S]*historyMode:'push'/);
  assert.match(source, /function openGroupHomeRouteInTerrain\(slug, options\)[\s\S]*returnKind:options\.returnKind \|\| \(originReaderId \? 'reader' : 'collection'\)[\s\S]*returnEntrySlug:options\.returnEntrySlug/);
  assert.match(source, /entryReturnPush = activeReaderReturnKind === 'entry' && options\.historyMode === 'push'[\s\S]*commitSemanticState\([\s\S]*syncPresentationUrl\('replace', 'reader'/);
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
  assert.match(source, /function memberCardHtml\(node\)/);
  assert.match(source, /memberCards = members\.map\(memberCardHtml\)\.join\(''\)/,
    'ordinary collection cards must still reuse the shared member-card renderer');

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

test('TERRAIN-VIEW: selected-language state remains live before the archive/map engine boots', () => {
  const source = pageSource();

  assert.match(source, /function handleTerrainLanguageChange\(event\)/,
    'Terrain must own one language-change handler independent of map boot');

  const handler = source.match(/function handleTerrainLanguageChange\(event\) \{([\s\S]*?)\n  \}/);
  assert.ok(handler, 'language-change handler must remain extractable');
  assert.match(handler[0], /activeLanguage = lang/);
  assert.match(handler[0], /if \(!DATA\)/,
    'the handler must explicitly support the lightweight pre-engine Home state');
  assert.match(handler[0], /if \(lang !== activeLanguage\) return/,
    'a stale locale response must not reclaim Terrain language state');

  const listener = source.indexOf('window.addEventListener(LANG_CHANGE_EVENT, handleTerrainLanguageChange);');
  const wire = source.indexOf('function wireControls()');
  assert.ok(listener >= 0 && wire > listener,
    'selected-language wiring must be installed before the deferred map-engine controls');
  assert.equal(
    source.slice(wire).includes("window.addEventListener(LANG_CHANGE_EVENT"),
    false,
    'map-engine boot must not install a second language-change listener'
  );

  assert.match(source, /var initialArrivalLanguage = activeLanguage;[\s\S]*initialArrivalLanguage !== activeLanguage/,
    'the initial arrival locale fetch must not overwrite a newer user selection');
});

test('TERRAIN-VIEW: deferred engine boot cannot restore an older locale after the user changes language', () => {
  const source = pageSource();

  const stableLoader = source.match(/function loadStableTerrainStrings\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(stableLoader, 'deferred engine boot must have one stable-current locale loader');
  assert.match(stableLoader[0], /var requestedLanguage = activeLanguage/);
  assert.match(stableLoader[0], /requestedLanguage !== activeLanguage[\s\S]*loadStableTerrainStrings\(\)/,
    'a locale change during a locale fetch must retry against the newer selected language');

  const engine = source.match(/function ensureTerrainEngine\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(engine, 'deferred engine boot must remain extractable');
  assert.match(engine[0], /var engineLanguage = activeLanguage/);
  assert.match(engine[0], /loadTerrainStrings\(engineLanguage\)/,
    'normal engine boot may still load its initial locale in parallel with map data');
  assert.match(engine[0], /engineLanguage === activeLanguage[\s\S]*loadStableTerrainStrings\(\)/,
    'engine boot must re-resolve a stable current locale when selection changes in flight');
  assert.ok(
    engine[0].indexOf('loadStableTerrainStrings()') < engine[0].indexOf('terrainStrings = values[1]'),
    'the stale-response check must happen before engine boot can publish Terrain strings'
  );
});

test('TERRAIN-VIEW: default arrival is quiet, localized, and defers archive/map data until a map-dependent action', () => {
  const source = pageSource();

  assert.match(source, /<div class="app terrain-content-quiet terrain-arrival-quiet">/,
    'the authored first paint must already use arrival chrome rather than flash the technical Terrain header');
  assert.match(source, /id="loadState"[^>]*hidden/,
    'the archive/map loading label must not flash on the lightweight Home path');

  const engine = source.match(/function ensureTerrainEngine\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(engine, 'archive/map data loading must have one lazy owner');
  assert.match(engine[0], /fetch\(TERRAIN_URL, \{ cache: 'no-store' \}\)/,
    'mutable Terrain map data must still use no-store when a map-dependent route requests it');

  const bootstrap = source.match(/if \(!initialRoute\.explicit\) \{([\s\S]*?)\n  \} else \{/);
  assert.ok(bootstrap, 'default versus explicit route bootstrap must remain explicit');
  assert.match(bootstrap[0], /var initialArrivalLanguage = activeLanguage;[\s\S]*loadTerrainStrings\(initialArrivalLanguage\)[\s\S]*initialArrivalLanguage !== activeLanguage[\s\S]*renderEvolutionAArrival\(\)/,
    'plain Home must snapshot the active locale, reject a stale response, then render the localized arrival');
  assert.match(bootstrap[0], /loadTerrainBaseLanguages\(\)/,
    'plain Home must still resolve the canonical page-language capability');
  assert.doesNotMatch(bootstrap[0], /fetch\(TERRAIN_URL|ensureTerrainEngine\(\)/,
    'plain Home must not start archive/map data loading in the background');

  assert.match(source, /data-entry-action="receive-god"[\s\S]*withTerrainEngine\(function \(\) \{ openEntryReader\('receive-god'\); \}\)/,
    'Receive God may boot the map engine only when that deeper Terrain reader is requested');
  assert.match(source, /data-entry-action="archives"[\s\S]*withTerrainEngine\(enterArchivesFromArrival\)/,
    'Explore Archives must boot the map engine on demand');
  assert.match(source, /data-entry-action="about"[\s\S]*addEventListener\('click', enterAboutFromArrival\)/,
    'plain orientation must remain direct lightweight navigation without map boot');
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
  assert.match(source, /stage-orientation-title" data-i18n="terrain\.chrome\.content-groups">Content groups</);
  assert.match(source, /stage-orientation-kind" data-i18n="terrain\.chrome\.collection">collection</);
  assert.match(source, /stage-orientation-kind" data-i18n="terrain\.chrome\.timeline-view">timeline view</);
  assert.match(source, /stage-orientation-kind" data-i18n="terrain\.chrome\.curation-bucket">curation bucket</);
  assert.match(source, /function renderStageOrientation\(layout\)/);
  assert.match(source, /currentWorld !== 'content'/);
  assert.match(source, /layout\.focusedIdx >= 0/);
  assert.match(source, /stageOrientationSummary\.textContent = ALL\.length \+ ' pages/);
});

test('TERRAIN-VIEW: focused Content group reveals real member titles and existing group-home relationship', () => {
  const source = pageSource();
  assert.match(source, /var previewMembers = summary\.members\.slice\(0, 5\)/);
  assert.match(source, /memberText\.textContent = '• ' \+ stageLabelText\(nodeDisplayTitle\(member\), 46\)/);
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

test('TERRAIN-VIEW: collection overview shows up to three deterministic daily previews and rotates larger pools by local day', () => {
  const source = pageSource();

  const scoreFn = source.match(/function terrainPreviewScore\(value\) \{[\s\S]*?\n  \}/);
  const selectFn = source.match(/function dailyPreviewSelection\(candidates, stageKey, dayIndex, limit\) \{[\s\S]*?\n  \}/);
  assert.ok(scoreFn && selectFn, 'daily preview selection helpers must remain extractable');

  const select = new Function([
    scoreFn[0],
    selectFn[0],
    'return dailyPreviewSelection;'
  ].join('\n'))();

  const candidates = ['a','b','c','d','e'].map(id => ({ id }));
  const today = select(candidates, 'collection-a', 22000, 3).map(node => node.id);
  const sameDay = select(candidates, 'collection-a', 22000, 3).map(node => node.id);
  const tomorrow = select(candidates, 'collection-a', 22001, 3).map(node => node.id);
  const otherCollection = select(candidates, 'collection-b', 22000, 3).map(node => node.id);

  assert.deepEqual(sameDay, today, 'same collection/day must render the same three previews');
  assert.equal(today.length, 3);
  assert.equal(new Set(today).size, 3, 'preview strip must not duplicate a member');
  assert.notDeepEqual(tomorrow, today, 'a pool larger than three must rotate on the next local day');
  assert.notDeepEqual(otherCollection, today,
    'collection identity must participate in deterministic preview ordering');
  assert.deepEqual(
    select(candidates.slice(0, 2), 'collection-a', 22000, 3).map(node => node.id),
    ['a','b'],
    'collections with fewer than three visuals show every available preview without churn'
  );

  assert.match(source, /function terrainPreviewDayIndex\(date\)/);
  assert.match(source, /Date\.UTC\(date\.getFullYear\(\), date\.getMonth\(\), date\.getDate\(\)\)/,
    'daily rotation follows the viewer local calendar date rather than UTC clock rollover');
  assert.match(source, /function terrainPreviewDayKey\(date\)/);
  assert.match(source, /return dailyPreviewSelection\(candidates, stage && stage\.key, dayIndex, 3\)/);
  assert.match(source, /var previewStripEnabled = contentTilePeekProfileEnabled\(\)\s*&& item\.kind === 'overview'/,
    'daily strip must reuse the existing Content profile owner');
  assert.match(source, /function contentTilePeekProfileEnabled\(\) \{[\s\S]*currentWorld === 'content'[\s\S]*currentProfile === 'evolution-v1' \|\| currentProfile === 'evolution-v2'/,
    'the live Content reference profile must remain excluded from the new daily strip');
  assert.match(source, /data-preview-count/);
  assert.match(source, /data-preview-day/);
  assert.match(source, /class:'stage-curiosity-thumb stage-daily-preview-thumb'/);

  const slotFn = source.match(/function dailyPreviewSlotX\(rect, count, index, thumbWidth\) \{[\s\S]*?\n  \}/);
  assert.ok(slotFn, 'daily preview geometry helper must remain extractable');
  const slotX = new Function(slotFn[0] + '\nreturn dailyPreviewSlotX;')();
  const card = { x:100, width:300 };

  assert.equal(slotX(card, 1, 0, 58), 221,
    'one preview stays centered in the usable card width');
  assert.deepEqual(
    [0, 1].map(index => slotX(card, 2, index, 48)),
    [114, 338],
    'two previews occupy the left and right interior anchors'
  );
  assert.deepEqual(
    [0, 1, 2].map(index => slotX(card, 3, index, 48)),
    [114, 226, 338],
    'three previews occupy left, center, and right with equal spacing'
  );
  assert.doesNotMatch(source, /previewStripWidth|previewStartX|previewThumbGap/,
    'daily previews must not regress to a compact right-aligned strip');

  const slotYFn = source.match(/function dailyPreviewSlotY\(rect, metadataBaselineY, thumbHeight\) \{[\s\S]*?\n  \}/);
  assert.ok(slotYFn, 'daily preview vertical-layout helper must remain extractable');
  const slotY = new Function(slotYFn[0] + '\nreturn dailyPreviewSlotY;')();
  const verticalCard = { y:100, height:140 };

  assert.equal(slotY(verticalCard, 180, 34), 189.5,
    'one preview is centered inside the lower card region');
  assert.equal(slotY(verticalCard, 180, 30), 191.5,
    'multi-preview rows are centered between metadata and the card bottom');
  assert.match(source, /var statY = r\.y \+ \(context\?48:\(currentWorld === 'content' \? \(focused\?103:80\) : \(focused\?84:78\)\)\)/,
    'metadata baseline must have one named owner inside the card');
  assert.match(source, /var previewY = dailyPreviewSlotY\(r, statY, previewThumbHeight\)/,
    'preview geometry must derive from the metadata baseline and card bounds');
  assert.match(source, /var stat=el\('text',\{x:r\.x\+14,y:statY,class:'stage-sub'\}\)/,
    'rendered metadata must consume the same baseline used by preview layout');
});

test('TERRAIN-VIEW: overview thumbnail imagery hydrates progressively after interaction is ready', () => {
  const source = pageSource();

  assert.match(source, /var stageThumbnailHydrationQueue = \[\];/);
  assert.match(source, /var stageThumbnailHydrationHandle = null;/);
  assert.match(source, /function scheduleTerrainIdle\(callback\)/);
  assert.match(source, /window\.requestIdleCallback\(callback, \{ timeout:1200 \}\)/);
  assert.match(source, /window\.setTimeout\(function \(\) \{[\s\S]*callback\(\{ didTimeout:true/);
  assert.match(source, /function queueStageThumbnailHydration\(node, src\)/);
  assert.match(source, /function drainStageThumbnailHydration\(\)/);
  assert.match(source, /item\.node\.setAttribute\('href', item\.src\)/);
  assert.match(source, /function clearStageThumbnailHydration\(\)/);
  assert.match(source, /clearStageThumbnailHydration\(\);[\s\S]*while \(world\.firstChild\)/,
    'rerender must cancel stale thumbnail work before replacing the world');

  const creationBlock = source.match(/dailyPreviewMembers\.forEach\(function \(member, previewIndex\) \{[\s\S]*?dailyPreviewThumbs\.push\(\{ node:thumb, src:visual\.src \}\);[\s\S]*?\n        \}\);/);
  assert.ok(creationBlock, 'daily overview thumbnail strip must remain extractable');
  assert.doesNotMatch(creationBlock[0], /href:/,
    'initial interactive render must not eagerly attach preview URLs');
  assert.match(source, /world\.appendChild\(g\);[\s\S]*dailyPreviewThumbs\.forEach\(function \(preview\) \{[\s\S]*queueStageThumbnailHydration\(preview\.node, preview\.src\)/,
    'every daily thumbnail hydrates only after the interactive card is attached');

  const scheduleFn = source.match(/function scheduleTerrainIdle\(callback\) \{[\s\S]*?\n  \}/);
  const cancelFn = source.match(/function cancelTerrainIdle\(handle\) \{[\s\S]*?\n  \}/);
  const clearFn = source.match(/function clearStageThumbnailHydration\(\) \{[\s\S]*?\n  \}/);
  const drainFn = source.match(/function drainStageThumbnailHydration\(\) \{[\s\S]*?\n  \}/);
  const queueFn = source.match(/function queueStageThumbnailHydration\(node, src\) \{[\s\S]*?\n  \}/);
  assert.ok(scheduleFn && cancelFn && clearFn && drainFn && queueFn, 'thumbnail scheduler helpers must remain extractable');

  const makeHarness = new Function('window', [
    "var stageThumbnailHydrationQueue = [];",
    "var stageThumbnailHydrationHandle = null;",
    scheduleFn[0],
    cancelFn[0],
    clearFn[0],
    drainFn[0],
    queueFn[0],
    "return { queue:queueStageThumbnailHydration, clear:clearStageThumbnailHydration, state:function(){ return { queue:stageThumbnailHydrationQueue, handle:stageThumbnailHydrationHandle }; } };"
  ].join('\n'));

  const idle = [];
  const cancelled = [];
  const fakeWindow = {
    requestIdleCallback(fn) { idle.push(fn); return idle.length; },
    cancelIdleCallback(id) { cancelled.push(id); },
    setTimeout() { throw new Error('idle-capable harness must not use timeout fallback'); },
    clearTimeout() {}
  };
  const harness = makeHarness(fakeWindow);
  const makeNode = connected => ({
    isConnected: connected,
    attrs: {},
    setAttribute(key, value) { this.attrs[key] = value; }
  });
  const first = makeNode(true);
  const second = makeNode(true);

  harness.queue(first, 'first.png');
  harness.queue(second, 'second.png');
  assert.equal(first.attrs.href, undefined, 'queueing must not synchronously start image hydration');
  assert.equal(second.attrs.href, undefined);
  assert.equal(idle.length, 1, 'one idle turn is scheduled for the queue');

  idle.shift()();
  assert.equal(first.attrs.href, 'first.png');
  assert.equal(second.attrs.href, undefined, 'only one thumbnail hydrates per idle turn');
  assert.equal(idle.length, 1, 'remaining work schedules a later idle turn');

  idle.shift()();
  assert.equal(second.attrs.href, 'second.png');

  const stale = makeNode(false);
  harness.queue(stale, 'stale.png');
  idle.shift()();
  assert.equal(stale.attrs.href, undefined, 'detached thumbnails are skipped rather than fetching obsolete imagery');

  const pending = makeNode(true);
  harness.queue(pending, 'pending.png');
  harness.clear();
  assert.ok(cancelled.length >= 1, 'clearing the world cancels pending idle hydration');
  assert.equal(harness.state().queue.length, 0);
});

test('TERRAIN-VIEW: collection pointer intent cancels pending preview before click activation', () => {
  const source = pageSource();

  assert.match(source, /g\.addEventListener\('pointerdown', function \(\) \{[\s\S]*cancelContentTilePeekOpen\(\);[\s\S]*cancelContentTilePeekClose\(\);[\s\S]*\}\);/,
    'pointer-down on a collection must cancel pending preview work immediately');
  assert.match(source, /g\.addEventListener\('click',function\(ev\)\{ ev\.stopPropagation\(\); activateStage\(i\); \}\)/,
    'click still owns synchronous collection activation');
  const pointerDownBlock = source.match(/g\.addEventListener\('pointerdown', function \(\) \{[\s\S]*?\n      \}\);/);
  assert.ok(pointerDownBlock, 'collection pointer-down handler must remain extractable');
  assert.doesNotMatch(pointerDownBlock[0], /preventDefault|stopPropagation/,
    'pointer-down preview cancellation must not steal drag/pan semantics');
  assert.match(source, /g\.addEventListener\('keydown',function\(ev\)\{ if\(ev\.key==='Enter'\|\|ev\.key===' '\)\{ ev\.preventDefault\(\); ev\.stopPropagation\(\); activateStage\(i\); \} \}\)/,
    'keyboard activation remains immediate and preview-independent');

  const activationBlock = source.match(/g\.addEventListener\('pointerdown'[\s\S]*?world\.appendChild\(g\);/);
  assert.ok(activationBlock, 'stage-card activation block must remain extractable');
  assert.doesNotMatch(activationBlock[0], /load|await|decode\(|onload|addEventListener\('load'/,
    'tile activation must not depend on preview image readiness');
});

test('TERRAIN-VIEW: pan suppresses only the drag-sequence click; a later tile click is immediately ready', () => {
  const source = pageSource();
  assert.match(source, /MAP_DRAG_THRESHOLD_PX = 5/);
  assert.match(source, /var mapPointerGesture = \{[\s\S]*suppressClick:false,[\s\S]*suppressFrame:null/);
  assert.match(source, /function armMapDragClickSuppression\(\)/);
  assert.match(source, /function consumeMapDragClickSuppression\(\)/);
  assert.match(source, /Math\.hypot\(dx, dy\) < MAP_DRAG_THRESHOLD_PX/);
  assert.match(source, /view\.x = mapPointerGesture\.originViewX \+ dx/);
  assert.match(source, /view\.y = mapPointerGesture\.originViewY \+ dy/);
  assert.match(source, /if \(mapPointerGesture\.moved\) armMapDragClickSuppression\(\)/);

  assert.match(source, /mapPointerGesture\.suppressFrame = window\.requestAnimationFrame\(clearMapDragClickSuppression\)/,
    'drag suppression expires at the next paint boundary rather than after an arbitrary click-blocking timeout');
  assert.match(source, /window\.cancelAnimationFrame\(mapPointerGesture\.suppressFrame\)/);
  assert.doesNotMatch(source, /window\.setTimeout\(clearMapDragClickSuppression,\s*160\)/,
    'a fresh user click must not remain blocked for the old 160ms window');

  assert.match(source, /mapWrap\.addEventListener\('click', function \(ev\) \{[\s\S]*consumeMapDragClickSuppression\(\)[\s\S]*ev\.stopPropagation\(\);[\s\S]*\}, true\)/,
    'the immediate drag-generated click is still intercepted before a stage-card handler can run');

  const clearFn = source.match(/function clearMapDragClickSuppression\(\) \{[\s\S]*?\n  \}/);
  const armFn = source.match(/function armMapDragClickSuppression\(\) \{[\s\S]*?\n  \}/);
  const consumeFn = source.match(/function consumeMapDragClickSuppression\(\) \{[\s\S]*?\n  \}/);
  assert.ok(clearFn && armFn && consumeFn, 'drag suppression helpers must remain extractable');

  const makeHarness = new Function('window', [
    "var mapPointerGesture = { suppressClick:false, suppressFrame:null };",
    clearFn[0],
    armFn[0],
    consumeFn[0],
    "return { state:mapPointerGesture, arm:armMapDragClickSuppression, consume:consumeMapDragClickSuppression };"
  ].join('\n'));

  var queued = null;
  var cancelled = [];
  const fakeWindow = {
    requestAnimationFrame(fn) { queued = fn; return 77; },
    cancelAnimationFrame(id) { cancelled.push(id); }
  };
  const harness = makeHarness(fakeWindow);

  harness.arm();
  assert.equal(harness.state.suppressClick, true);
  assert.equal(harness.state.suppressFrame, 77);
  assert.equal(harness.consume(), true, 'same-sequence synthetic click is consumed once');
  assert.equal(harness.state.suppressClick, false);
  assert.deepEqual(cancelled, [77]);

  cancelled.length = 0;
  harness.arm();
  assert.ok(queued, 'suppression schedules an automatic next-frame release');
  queued();
  assert.equal(harness.state.suppressClick, false, 'no synthetic click means the guard expires by the next frame');
  assert.equal(harness.consume(), false, 'a later independent click is immediately eligible');

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
  assert.match(source, /currentWorld === 'content' && item\.kind === 'overview'[\s\S]*appendStageOverviewLabel\(g, r, stageDisplayName\(stage\)\)/);
  assert.match(source, /else \{[\s\S]*stageLabelText\(stageDisplayName\(stage\), context\?15:\(focused\?30:22\)\)/,
    'focused and context variants retain their existing compact title behavior');
});

test('TERRAIN-VIEW: accepted Content reserves the stable viewport dock while Reflow shelf remains an explicit query comparison', () => {
  const source = pageSource();

  assert.match(source, /id="contentCuriosityDock"/);
  assert.match(source, /class="stage-curiosity-dock"/);
  assert.match(source, /\.terrain-curiosity-dock-mode \.map-wrap\{ bottom:190px; \}/);
  assert.match(source, /function contentCuriosityDockModeEnabled\(\) \{[\s\S]*currentProfile === 'evolution-v1'[\s\S]*levelIndex === 1/);
  assert.match(source, /function syncContentCuriosityDockMode\(\)/);
  assert.match(source, /appRoot\.classList\.toggle\('terrain-curiosity-dock-mode', enabled\)/);
  assert.match(source, /contentCuriosityDock\.hidden = !enabled/);

  const dockRenderer = source.match(/function openContentCuriosityDock\(stageIndex, options\) \{[\s\S]*?\n  \}/);
  assert.ok(dockRenderer, 'accepted dock renderer must remain extractable');
  assert.doesNotMatch(dockRenderer[0], /candidate\.style\.transform|translateY\(/,
    'accepted Content dock must never move collection tiles');

  const sharedPeek = source.match(/function openContentTilePeek\(stageIndex, options\) \{[\s\S]*?\n  \}/);
  assert.ok(sharedPeek, 'shared curiosity entry point must remain extractable');
  assert.match(sharedPeek[0], /currentProfile === 'evolution-v1'[\s\S]*openContentCuriosityDock\(stageIndex, options\)[\s\S]*return;/,
    'public no-query Content must branch to the stable dock before any reflow logic');
  assert.match(sharedPeek[0], /candidate\.style\.transform = 'translateY\(' \+ shift \+ 'px\)'/,
    'old row-translation shelf remains available only through the comparison profile');

  assert.match(source, /currentProfile === 'evolution-v1' \? 520 : CONTENT_TILE_PEEK_CLOSE_MS/,
    'accepted dock keeps enough hover grace to reach the inspection band');
  assert.match(source, /<option value="evolution-v1" data-i18n="terrain\.chrome\.content">Content<\/option>[\s\S]*<option value="evolution-v2" data-i18n="terrain\.chrome\.reflow-shelf">Reflow shelf<\/option>/);
  assert.match(source, /profile: profile === 'live' \? 'live' : \(profile === 'evolution-v2' \? 'evolution-v2' : 'evolution-v1'\)/,
    'no-query Content remains the accepted dock profile');
  assert.match(source, /if \(currentWorld === 'content' && currentProfile === 'evolution-v1'\) \{[\s\S]*url\.searchParams\.delete\('profile'\)/,
    'accepted dock stays canonical without a profile query parameter');

  assert.doesNotMatch(source, /class="map-hint"/);
  assert.doesNotMatch(source, /zoom-controls|zoom-btn|zoomIn|zoomOut|zoomReset/,
    'accepted dock remains intact while the manual zoom-button stack is removed for diagnosis');
  assert.match(source, /mapWrap\.addEventListener\('wheel', function \(ev\) \{/,
    'wheel navigation remains available during the zoom-control diagnostic');
});

test('TERRAIN-VIEW: accepted Content curiosity previews support slower autoplay, manual edges, and direct reading', () => {
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
  assert.match(source, /function dailyStagePreviewMembers\(stage, dayIndex\) \{[\s\S]*stageMembers\(stage\)\.filter\(hasEvolutionPreview\)[\s\S]*dailyPreviewSelection\(candidates, stage && stage\.key, dayIndex, 3\)/,
    'overview curiosity thumbnails must continue sourcing previewable members through the daily-strip owner');
  assert.match(source, /class:'stage-curiosity-thumb stage-daily-preview-thumb'/,
    'overview curiosity thumbnails must retain the shared curiosity-thumb styling while using the daily-preview marker');
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

test('TERRAIN-VIEW: embedded readers and screenshot previews follow the shared effective language', () => {
  const source = pageSource();
  assert.match(source, /var LANG_STORAGE_KEY = 'vex-lang'/);
  assert.match(source, /var LANG_CHANGE_EVENT = 'vextreme:languagechange'/);
  assert.match(source, /function readEffectiveLanguage\(\)[\s\S]*URLSearchParams[\s\S]*localStorage\.getItem\(LANG_STORAGE_KEY\)/,
    'Terrain must resolve the same URL-then-persisted language precedence as the FAB');
  assert.match(source, /function preferredScreenshotLanguage\(screenshots\)[\s\S]*languages\.indexOf\(activeLanguage\) !== -1[\s\S]*languages\.indexOf\('en'\)/,
    'localized screenshot evidence must prefer the effective locale before EN fallback');
  assert.match(source, /function languageAwareUrl\(url, lang\)[\s\S]*searchParams\.set\('lang', lang\)/,
    'embedded/standalone reader destinations must carry the effective locale explicitly');
  assert.match(source, /replaceEvolutionReaderDocument\(url\)[\s\S]*languageAwareUrl\(url, activeLanguage\)/,
    'embedded reader loads must use the language-aware URL');
  assert.match(source, /window\.addEventListener\(LANG_CHANGE_EVENT, handleTerrainLanguageChange\)/,
    'Terrain must register its selected-language listener independently of map-engine boot');
  const languageHandler = source.match(/function handleTerrainLanguageChange\(event\) \{([\s\S]*?)\n  \}/);
  assert.ok(languageHandler, 'Terrain language-change behavior must remain owned by the named handler');
  assert.match(languageHandler[0], /activeLanguage = lang/);
  assert.match(languageHandler[0], /if \(!DATA\)/,
    'the language handler must support the lightweight Home state before map data exists');
  assert.match(languageHandler[0], /refreshLocalizedPreviewImages\(\)/,
    'once map data exists, live locale changes must refresh localized preview evidence');
  assert.match(source, /data-preview-node-id=/,
    'curiosity previews need stable node identity so an already-rendered shelf can swap locale evidence');
  assert.doesNotMatch(source, /languages\.indexOf\('en'\) !== -1 \? 'en' : languages\[0\]/,
    'preview selection must not hardcode EN-first once a user locale exists');
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


test('TERRAIN-VIEW: ordered entry keeps human orientation primary while VexSystem stays secondary through About', () => {
  const value = entryContract();
  assert.equal(value.schemaVersion, 'vextreme.terrain-entry/v1');
  assert.deepEqual(value.choices.map(choice => [choice.id, choice.effect, choice.enabled]), [
    ['receive-god', 'reader', true],
    ['archives', 'terrain-group-overview', true],
    ['about', 'plain-orientation', true],
  ]);
  assert.equal(value.choices.find(choice => choice.id === 'about').path, 'about-vextreme.html');
  assert.equal(value.documents['receive-god'].order, 1);
  assert.equal(value.documents['take-a-walk'].order, 2);
  assert.equal(value.choices.some(choice => choice.id === 'take-a-walk'), false);
  assert.equal(value.choices.some(choice => choice.id === 'vexsystem'), false);

  const source = pageSource();
  assert.match(source, /function renderEvolutionAArrival\(\)/);
  assert.match(source, /function openEntryReader\(slug, options\)/);
  assert.match(source, /function enterArchivesFromArrival\(\)/);
  assert.match(source, /function handleTerrainEntryMessage\(event\)/);
  assert.match(source, /function enterAboutFromArrival\(\)/);
  assert.match(source, /data-entry-action="about"/);
  assert.match(source, /data-i18n="terrain\.arrival\.about\.title"/);
  assert.match(source, /terrainText\('terrain\.arrival\.about\.title', 'What is this\?'\)/);
  assert.doesNotMatch(source, /data-entry-action="vexsystem"/);
  assert.match(source, /new URL\(choice\.path, window\.location\.href\)/);
  assert.match(source, /target\.origin !== window\.location\.origin/);
  assert.match(source, /window\.location\.assign\(target\.href\)/);
  assert.ok(source.includes("evolutionLayer.querySelector('[data-entry-action=\"about\"]').addEventListener('click', enterAboutFromArrival);"));
  assert.match(source, /openEntryReader\('receive-god'\)/);
  assert.doesNotMatch(source, /data-entry-action="take-a-walk"/);
});



test('TERRAIN-VIEW: arrival narration and reader toolbar Back stay on explicit Terrain owners', () => {
  const source = pageSource();

  assert.match(source, /id="panel"[^>]*data-vex-read-aloud-skip/,
    'the technical detail drawer must stay outside the visitor narration plan');
  assert.equal(
    (source.match(/class="entry-card"[^>]*data-vex-read-aloud-block/g) || []).length,
    3,
    'all three authored arrival choices are compound readable controls'
  );

  const toolbarReturn = source.match(/function returnFromReaderToolbar\(\) \{[\s\S]*?\n  \}/);
  assert.ok(toolbarReturn, 'reader toolbar return owner must remain extractable');
  assert.match(toolbarReturn[0], /activeEntrySlug[\s\S]*closeEntryReader\(\{ history:false \}\)/,
    'Receive God toolbar Back returns directly to the Terrain arrival instead of traversing iframe session history');
  assert.match(toolbarReturn[0], /activeReaderReturnKind === 'collection'[\s\S]*closeEvolutionReader\(\{ history:false \}\)/,
    'collection-owned reader/group-home Back returns directly to the collection surface');
  assert.match(toolbarReturn[0], /closeEvolutionReader\(\);/,
    'nested exact-history return relationships retain the existing restoration path');
  assert.match(source, /readerBack'\)\.addEventListener\('click', returnFromReaderToolbar\)/,
    'the visible toolbar control must consume the Terrain return owner');
});

test('TERRAIN-VIEW: embedded entry paths preserve Receive God -> group home -> record browser history without reloading Terrain', () => {
  const source = pageSource();

  assert.match(source, /syncPresentationUrl\(options\.historyMode \|\| 'push', 'entry', \{ entrySlug:slug \}\)/,
    'opening an ordered entry must create presentation history without changing semantic depth');
  assert.match(source, /presentationHistoryKind\(history\.state\) === 'entry'[\s\S]*history\.back\(\)/,
    'history-aware entry close remains available for browser presentation traversal outside the direct toolbar return');
  assert.match(source, /if \(kind === 'entry'\)[\s\S]*openEntryReader\(entrySlug, \{ writeUrl:false \}\)/,
    'Back/Forward restoration must reopen the ordered entry reader in place');

  assert.match(source, /function openEntryGroupHome\(groupKey, entrySlug\)/);
  assert.match(source, /data\.action === 'group-home'[\s\S]*openEntryGroupHome\(data\.group, activeEntrySlug\)/,
    'same-origin entry messages must route group-home choices through Terrain instead of parent reloads');
  assert.match(source, /openEvolutionGroupHome\(stage, \{[\s\S]*returnKind:'entry'[\s\S]*returnEntrySlug:entrySlug[\s\S]*\}\);[\s\S]*commitSemanticState[\s\S]*syncPresentationUrl\('replace', 'group-home'/,
    'entry -> group-home must preserve the prior entry state while committing the real group semantic level');
  assert.match(source, /var collectionLabel = terrainText\('terrain\.reader\.collection', 'Collection'\);[\s\S]*returnEntry \? '← ' \+ returnEntry\.label : '← ' \+ collectionLabel/,
    'group-home Back should preserve the Receive God entry owner while localizing the generic Collection fallback');

  assert.match(source, /var fromGroupHome = !!activeGroupHomeKey;[\s\S]*openEvolutionReader\(node\.id, \{ returnKind:'group-home' \}\)/,
    'opening a record from a group home must push reader history instead of replacing the group-home state');
  assert.match(source, /activeReaderReturnKind === 'group-home' && stage && stage\.parent\) backLabel = '← ' \+ stageDisplayName\(stage\)/,
    'record Back should name and return to its group home');
  assert.match(source, /openEvolutionGroupHome\(stage, \{[\s\S]*returnKind:presentation[\s\S]*returnEntrySlug:presentation/,
    'restored group-home state must retain the ordered-entry return coordinate');
});

test('TERRAIN-VIEW: Welcome Wagon arrival converges visually without importing institutional runtime ownership', () => {
  const source = pageSource();

  assert.match(source, /#vex-site-nav \.vex-nav\{[\s\S]*background:var\(--ground\);[\s\S]*border-color:var\(--line-strong\);/u);
  assert.match(source, /#vex-site-nav \.vex-family-mark,[\s\S]*#vex-site-nav \.vex-family-current\{ color:var\(--ink\); \}/u);
  assert.doesNotMatch(source, /vex-nav-title::before/u);
  assert.doesNotMatch(source, /vextreme-mark\.svg/u);
  assert.doesNotMatch(source, /#vex-site-nav\s*\{[\s\S]*--stone:/u);
  assert.doesNotMatch(source, /#vex-site-nav\s*\{[\s\S]*--ember-bg:/u);
  assert.match(source, /\.entry-arrival\{[\s\S]*--entry-serif:"Source Serif 4"[\s\S]*--entry-sans:"IBM Plex Sans"[\s\S]*--entry-mono:"IBM Plex Mono"/u);
  assert.match(source, /\.entry-shell h2\{[\s\S]*var\(--entry-serif\)/u);
  assert.match(source, /\.entry-title\{[^}]*var\(--entry-serif\)/u);
  assert.match(source, /--sans:\s*system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;/u);
  assert.doesNotMatch(source, /\.topbar\{[^}]*var\(--entry-/u);
  assert.match(source, /data-i18n="terrain\.arrival\.kicker"/u);
  assert.match(source, /data-i18n="terrain\.arrival\.lede"/u);
  assert.match(source, /<span class="entry-icon" aria-hidden="true">✦<\/span>/u);
  assert.match(source, /<span class="entry-icon" aria-hidden="true">🗂️<\/span>/u);
  assert.match(source, /<span class="entry-icon" aria-hidden="true">\?<\/span>/u);
  assert.doesNotMatch(source, /<span class="entry-icon"[^>]*>0[123]<\/span>/u);

  assert.doesNotMatch(source, /<link[^>]+design-system\.css/iu);
  assert.doesNotMatch(source, /<link[^>]+vex-institutional\.css/iu);
  assert.doesNotMatch(source, /data-entry-action="vexsystem"/u);
});


test('TERRAIN-VIEW: ordinary arrival copy names visitor intent and truthfully forecasts each entered experience', () => {
  const source = pageSource();

  assert.match(source, /data-i18n="terrain\.arrival\.lede"/u);
  assert.match(source, /data-i18n="terrain\.arrival\.receive\.copy"/u);
  assert.match(source, /data-i18n="terrain\.arrival\.archives\.copy"/u);
  assert.match(source, /data-i18n="terrain\.arrival\.about\.copy"/u);

  assert.doesNotMatch(source, /Terrain is the public front door to Vextreme/u);
  assert.doesNotMatch(source, /ordered VexLife entry/u);
  assert.doesNotMatch(source, /next Terrain layer/u);
  assert.doesNotMatch(source, /repository-hosted record/u);
  assert.doesNotMatch(source, /Vextreme, VexLife, and VexWork before going deeper/u);
  assert.doesNotMatch(source, /Begin a guided experience centered on receiving God/u);
  assert.doesNotMatch(source, /Browse the public record by collection/u);
  assert.doesNotMatch(source, /Get a simple explanation of what this place is/u);
});


test('TERRAIN-VIEW: ordinary arrival hides technical chrome without changing its ownership or restore path', () => {
  const source = pageSource();

  assert.match(source, /var arriving = quiet && mapWrap && mapWrap\.classList\.contains\('evolution-arrival-active'\);/u);
  assert.match(source, /appRoot\.classList\.toggle\('terrain-arrival-quiet', arriving\);/u);
  assert.match(source, /\.terrain-content-quiet\.terrain-arrival-quiet \.topbar\{ display:none; \}/u);
  assert.match(source, /\.terrain-arrival-quiet \.level-readout\{ visibility:hidden; \}/u);
  assert.match(source, /\.terrain-arrival-quiet \.evolution-layer\{ inset:18px 18px 20px; \}/u);

  assert.match(source, /id="searchInput"/u);
  assert.match(source, /id="levelReadout"/u);
  assert.doesNotMatch(source, /id="terrainInspectToggle"/u);
  assert.doesNotMatch(source, /terrain-inspect-open/u);

  const arrival = source.indexOf("mapWrap.classList.add('evolution-a-active', 'evolution-arrival-active');");
  const arrivalSync = source.indexOf('syncTerrainChrome();', arrival);
  assert.ok(arrival >= 0 && arrivalSync > arrival, 'arrival state must exist before chrome projection');

  const archives = source.indexOf('function enterArchivesFromArrival()');
  const archivesClear = source.indexOf("mapWrap.classList.remove('evolution-reader-active', 'evolution-arrival-active');", archives);
  const archivesSync = source.indexOf('syncTerrainChrome();', archivesClear);
  assert.ok(archives >= 0 && archivesClear > archives && archivesSync > archivesClear,
    'Archives must clear arrival state before restoring technical chrome');

  const reader = source.indexOf('function openEntryReader(slug, options)');
  const readerClear = source.indexOf("mapWrap.classList.remove('evolution-arrival-active');", reader);
  const readerSync = source.indexOf('syncTerrainChrome();', readerClear);
  assert.ok(reader >= 0 && readerClear > reader && readerSync > readerClear,
    'Receive God reader must leave arrival quiet before existing reader-quiet projection');

  assert.doesNotMatch(source, /\.terrain-arrival-quiet[^\n{]*#vex-site-nav/u);
  assert.doesNotMatch(source, /\.terrain-arrival-quiet[^\n{]*#vex-spiral/u);
});


test('TERRAIN-VIEW: Terrain localization consumes canonical chrome, collection, and page-title identities without changing machine coordinates', () => {
  const source = pageSource();
  assert.match(source, /window\.VEX_STRING_SCOPES = \["terrain"\]/);
  assert.match(source, /window\.VEX_STRING_CATEGORY = "system"/);
  assert.match(source, /function terrainText\(key, fallback\)/);
  assert.match(source, /function stageDisplayName\(stage\)[\s\S]*stage\.nameByLang/);
  assert.match(source, /function nodeDisplayTitle\(node\)[\s\S]*node\.titleByLang/);
  assert.match(source, /loadTerrainStrings\(lang\)[\s\S]*OVERVIEW_LEVELS\[levelIndex\]\.render\(levelCtx\)/);
  assert.match(source, /data-i18n="terrain\.preview\.title"/);
  assert.match(source, /data-i18n="terrain\.arrival\.heading"/);
  assert.match(source, /dailyPreviewSlotY\(r, statY, previewThumbHeight\)/, 'PR #522 vertical-centering ownership must remain intact');
});


test('TERRAIN-VIEW: embedded reader chrome follows localized Terrain and canonical content identities', () => {
  const source = pageSource();
  assert.ok(source.includes("var collectionLabel = terrainText('terrain.reader.collection', 'Collection');"));
  assert.ok(source.includes("var pageLabel = terrainText('terrain.reader.page', 'Page');"));
  assert.ok(source.includes("backLabel = '← ' + terrainText('terrain.chrome.content-groups', 'Content groups');"));
  assert.ok(source.includes("if (!returnEntry && returnReader) backLabel = '← ' + nodeDisplayTitle(returnReader);"));
  assert.ok(source.includes("document.getElementById('readerTitle').textContent = stageDisplayName(stage);"));
  assert.ok(source.includes("document.getElementById('readerMeta').textContent = stageDisplayName(stage) + ' · ' + terrainText('terrain.chrome.collection', 'collection');"));
  assert.ok(source.includes("evolutionReaderFrame.title = stageDisplayName(stage);"));
  assert.equal(source.includes("stage.name + ' · group home'"), false);
  assert.equal(source.includes("'page ' + (index + 1) + ' of ' + members.length"), false);
});

// [VXG RealForever]
