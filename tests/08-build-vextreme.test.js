'use strict';

/**
 * BUILD-VEXTREME — tests/08-build-vextreme.test.js
 *
 * Tests for the God Script assembler (lib/build-vextreme.js) and the
 * key alignment check (lib/check-key-alignment.js).
 *
 * Test order:
 *   1. readScopeBundle — reads compiled EN scope files
 *   2. mergeScopes — merges multiple scopes into one flat map
 *   3. assembleGodScript — produces valid God Script string
 *   4. resolveAllSlugs — union of slugMap + viewmodels.json overrides
 *   5. checkKeyAlignment — confirms nodes/arcs are in sync with index.json
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const { resolveAllSlugs, readScopeBundle, mergeScopes, assembleGodScript } = require('../lib/build-vextreme');
const { checkKeyAlignment, findOrphanPages, scanWipIntendedSlugs, findWipSlugCollisions, findDuplicateWipIntents } = require('../lib/check-key-alignment');

const ROOT     = path.join(__dirname, '..');
const INDEX_IN = path.join(ROOT, 'data', 'index.json');
const VMS_IN   = path.join(ROOT, 'data', 'viewmodels.json');
const FAB_IN   = path.join(ROOT, 'widgets', 'fab-lang.js');
const PAGES_DIR = path.join(ROOT, 'pages');

const DEMO_VIEWMODEL = {
  category: 'demo',
  template: 'specimen-page',
  scopes:   ['pages.specimen-full-translation', 'specimens'],
  features: ['lang', 'demo'],
};

// ── 1. readScopeBundle ────────────────────────────────────────────────────────

test('ASSEMBLER: readScopeBundle returns object for existing scope', () => {
  const data = readScopeBundle('specimens', 'demo', 'en');
  assert.ok(data !== null, 'specimens.en.json should exist');
  assert.equal(typeof data, 'object');
  assert.ok(Object.keys(data).length > 0, 'should have at least one key');
});

test('ASSEMBLER: readScopeBundle returns null for missing scope', () => {
  const data = readScopeBundle('pages.nonexistent-page', 'demo', 'en');
  assert.equal(data, null, 'should return null for missing scope');
});

test('ASSEMBLER: readScopeBundle reads common scope from system category', () => {
  const data = readScopeBundle('common', 'system', 'en');
  assert.ok(data !== null, 'common.en.json should exist in system/');
  assert.ok(Object.keys(data).length > 0);
});

// ── 2. mergeScopes ───────────────────────────────────────────────────────────

test('ASSEMBLER: mergeScopes returns merged object from multiple scopes', () => {
  const merged = mergeScopes(['pages.specimen-full-translation', 'specimens'], 'demo', 'en');
  assert.equal(typeof merged, 'object');
  assert.ok(Object.keys(merged).length > 0, 'merged should have keys');
});

test('ASSEMBLER: mergeScopes automatically includes common scope', () => {
  const merged = mergeScopes(['specimens'], 'demo', 'en');
  const hasCommonKey = Object.keys(merged).some(k => k.startsWith('common.'));
  assert.ok(hasCommonKey, 'should include common scope keys');
});

test('ASSEMBLER: mergeScopes handles missing scope gracefully (no throw)', () => {
  assert.doesNotThrow(() => {
    mergeScopes(['pages.totally-does-not-exist', 'specimens'], 'demo', 'en');
  });
});

// ── 3. assembleGodScript ─────────────────────────────────────────────────────

test('ASSEMBLER: assembleGodScript returns a non-empty string', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.equal(typeof script, 'string');
  assert.ok(script.length > 0);
});

test('ASSEMBLER: output contains VEX_VIEWMODEL assignment', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('window.VEX_VIEWMODEL'), 'must set VEX_VIEWMODEL global');
  assert.ok(script.includes('"demo"'), 'category must appear in viewmodel JSON');
});

test('ASSEMBLER: output contains VEX_STRINGS_EN assignment', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('window.VEX_STRINGS_EN'), 'must set VEX_STRINGS_EN global');
});

test('ASSEMBLER: output contains VEX_STRING_SCOPES and VEX_STRING_CATEGORY', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('window.VEX_STRING_SCOPES'),   'must set VEX_STRING_SCOPES');
  assert.ok(script.includes('window.VEX_STRING_CATEGORY'), 'must set VEX_STRING_CATEGORY');
});

test('ASSEMBLER: output contains VEX_SUPPORTED_LANGS when provided', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, {
    includeSourceComment: false,
    supportedLangs: ['en', 'ja'],
  });
  assert.ok(script.includes('window.VEX_SUPPORTED_LANGS'), 'must set VEX_SUPPORTED_LANGS');
  assert.ok(script.includes('"en"') && script.includes('"ja"'), 'supported langs must appear in output');
});

test('ASSEMBLER: widgets/fab-lang.js actually reads window.VEX_SUPPORTED_LANGS — baking the global in at build time is useless if the runtime widget never checks it', () => {
  // Regression guard: lib/build-vextreme.js has baked VEX_SUPPORTED_LANGS into
  // every God Script since it was introduced, but loadSupportedLangs() in
  // widgets/fab-lang.js went straight to a localStorage cache (written by a
  // DIFFERENT widget) or a live index.json fetch — silently never consuming
  // the correct, build-time-baked value. A browser with a stale cache could
  // show a language list missing a language the page's own God Script has
  // (real bug, e.g. the ZH option missing from the dossier's language FAB).
  // This asserts the fast-path is wired, not just documented.
  const widgetSrc = fs.readFileSync(path.join(ROOT, 'widgets', 'fab-lang.js'), 'utf8');
  const loadFnMatch = widgetSrc.match(/function loadSupportedLangs\([^)]*\)\s*\{([\s\S]*?)\n  \}/);
  assert.ok(loadFnMatch, 'loadSupportedLangs() function not found in widgets/fab-lang.js');
  assert.ok(loadFnMatch[1].includes('window.VEX_SUPPORTED_LANGS'),
    'loadSupportedLangs() must check window.VEX_SUPPORTED_LANGS before falling back to cache/network');
});

// ── Session 025: FAB system unification ─────────────────────────────────────
//
// spiral-fab/theme/map were reserved Feature slots since Session 013
// (filename: null, silently no-op'd) — this is the "you just confirm"
// health check Victor asked for: since spiral-fab/theme/map/lang are all
// DEFAULT features (lib/build-index.js's buildViewmodel fallback), every
// page that gets a God Script at all automatically gets the full FAB group
// with no per-page wiring. These tests confirm that propagation actually
// happens, so a future FEATURES registry edit that silently drops one of
// these back to filename: null fails CI immediately.

test('FAB SYSTEM: a default-viewmodel page\'s assembled God Script contains all four FAB features (spiral-fab, lang, theme, map)', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, {
    includeSourceComment: false,
    supportedLangs: ['en', 'ja'],
  });
  // DEMO_VIEWMODEL explicitly lists features: ['lang', 'demo'] — swap for a
  // features array matching a real default-viewmodel page instead.
  const defaultFeaturesScript = assembleGodScript('test-slug', {
    ...DEMO_VIEWMODEL,
    features: ['lang', 'spiral-fab', 'theme', 'map'],
  }, { includeSourceComment: false });

  assert.ok(defaultFeaturesScript.includes('feature: spiral-fab') || defaultFeaturesScript.includes('vex-fab.js'),
    'spiral-fab must be bundled');
  assert.ok(defaultFeaturesScript.includes('feature: lang') || defaultFeaturesScript.includes('fab-lang.js'),
    'lang must be bundled');
  assert.ok(defaultFeaturesScript.includes('feature: theme') || defaultFeaturesScript.includes('fab-theme.js'),
    'theme must be bundled');
  assert.ok(defaultFeaturesScript.includes('feature: map') || defaultFeaturesScript.includes('fab-map.js'),
    'map must be bundled');
});

test('FAB SYSTEM: spiral-fab is concatenated before lang/theme/map — DOMContentLoaded handlers must fire in that order so #vex-spiral-group exists before an orb widget looks for it', () => {
  const script = assembleGodScript('test-slug', {
    ...DEMO_VIEWMODEL,
    features: ['lang', 'spiral-fab', 'theme', 'map'],
  }, { includeSourceComment: false });

  const spiralIdx = script.indexOf('vex-fab.js');
  const langIdx   = script.indexOf('fab-lang.js');
  const themeIdx  = script.indexOf('fab-theme.js');
  const mapIdx    = script.indexOf('fab-map.js');

  assert.ok(spiralIdx !== -1 && langIdx !== -1 && themeIdx !== -1 && mapIdx !== -1,
    'all four widget sources must be present in the assembled script');
  assert.ok(spiralIdx < langIdx,  'vex-fab.js must be concatenated before fab-lang.js');
  assert.ok(spiralIdx < themeIdx, 'vex-fab.js must be concatenated before fab-theme.js');
  assert.ok(spiralIdx < mapIdx,   'vex-fab.js must be concatenated before fab-map.js');
});

test('FAB SYSTEM: default viewmodel (no override) includes all four FAB features — real-page propagation, not just the assembler accepting them', () => {
  const { buildViewmodel } = require('../lib/build-index');
  const { Feature: F } = require('../lib/vex-config');
  const vm = buildViewmodel('any-slug-with-no-override', {});
  assert.ok(vm.features.includes(F.SPIRAL_FAB), 'default viewmodel must include spiral-fab');
  assert.ok(vm.features.includes(F.LANG),       'default viewmodel must include lang');
  assert.ok(vm.features.includes(F.THEME),      'default viewmodel must include theme');
  assert.ok(vm.features.includes(F.MAP),        'default viewmodel must include map');
});

test('FAB SYSTEM: widgets/fab-theme.js and widgets/fab-map.js both check for #vex-spiral-group and nest into it when present', () => {
  for (const file of ['fab-theme.js', 'fab-map.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'widgets', file), 'utf8');
    assert.ok(src.includes("getElementById('vex-spiral-group')"),
      `${file} must look up #vex-spiral-group to nest its orb, per Session 025's real-estate-conscious design`);
  }
});

test('FAB SYSTEM: widgets/fab-lang.js nests into #vex-spiral-group when present, and still falls back to a standalone mount when absent', () => {
  const src = fs.readFileSync(path.join(ROOT, 'widgets', 'fab-lang.js'), 'utf8');
  assert.ok(src.includes("getElementById('vex-spiral-group')"), 'must check for the shared group container');
  assert.ok(src.includes('document.body.appendChild(fab)'), 'must retain the standalone fallback for pages without spiral-fab');
});

test('ASSEMBLER: output contains VEX_STRING_ARC_BUNDLE when arcBundle option is set', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false, arcBundle: 'victor_dossier' });
  assert.ok(script.includes('window.VEX_STRING_ARC_BUNDLE'), 'must set VEX_STRING_ARC_BUNDLE');
  assert.ok(script.includes('"victor_dossier"'), 'arc id must appear in output');
});

test('ASSEMBLER: VEX_STRING_ARC_BUNDLE assignment is omitted when arcBundle option is absent', () => {
  // fab-lang.js's own inlined source always *checks* window.VEX_STRING_ARC_BUNDLE
  // (it's a generic feature of the widget) — what must NOT appear for a page
  // that didn't opt in is assembleGodScript's *assignment* line for it.
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(!script.includes('window.VEX_STRING_ARC_BUNDLE ='), 'must not assign the arc bundle global for a non-piloted page');
});

test('ASSEMBLER: output is wrapped in an IIFE', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('(function ()'), 'must be wrapped in an IIFE');
  assert.ok(script.includes('}());'), 'IIFE must be closed');
});

test('ASSEMBLER: output includes feature modules when widgets exist', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('feature: lang') || script.includes('fab-lang.js'),
    'should include lang feature content or label');
});

test('ASSEMBLER: source comment header includes slug', () => {
  const script = assembleGodScript('my-slug', DEMO_VIEWMODEL);
  assert.ok(script.includes('my-slug'), 'header comment must reference the slug');
  assert.ok(script.includes('DO NOT EDIT'), 'must include regeneration notice');
});

test('ASSEMBLER: handles empty features array without throwing', () => {
  const vm = { category: 'demo', template: 'page', scopes: ['specimens'], features: [] };
  assert.doesNotThrow(() => assembleGodScript('test', vm, { includeSourceComment: false }));
});

test('ASSEMBLER: output includes sw-register.js core module', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('sw-register.js') || script.includes('serviceWorker'),
    'God Script must include Service Worker registration (sw-register.js core module)');
});

// ── 4. resolveAllSlugs ───────────────────────────────────────────────────────

test('ASSEMBLER: resolveAllSlugs returns array with at least slugMap entries', () => {
  const index = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const vms   = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));
  const result = resolveAllSlugs(index, vms);
  assert.ok(Array.isArray(result), 'must return array');
  assert.ok(result.length >= Object.keys(index.slugMap).length, 'must include all slugMap entries');
});

test('ASSEMBLER: resolveAllSlugs includes demo overrides not in slugMap', () => {
  const index = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const vms   = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));
  const result = resolveAllSlugs(index, vms);
  const slugs  = new Set(result.map(r => r.slug));

  for (const [slug] of Object.entries(vms)) {
    if (slug.startsWith('_')) continue;
    assert.ok(slugs.has(slug), `viewmodels.json slug "${slug}" must appear in resolved list`);
  }
});

test('ASSEMBLER: resolveAllSlugs has no duplicate slugs', () => {
  const index = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const vms   = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));
  const result = resolveAllSlugs(index, vms);
  const slugs  = result.map(r => r.slug);
  const unique = new Set(slugs);
  assert.equal(slugs.length, unique.size, 'no duplicate slugs in resolved list');
});

test('ASSEMBLER: every resolved entry has a viewmodel', () => {
  const index = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const vms   = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));
  const result = resolveAllSlugs(index, vms);
  for (const { slug, viewmodel } of result) {
    assert.ok(viewmodel, `slug "${slug}" must have a viewmodel`);
  }
});

// ── 5. checkKeyAlignment ─────────────────────────────────────────────────────

test('KEY-ALIGNMENT: returns nodes and arcs report', () => {
  const report = checkKeyAlignment();
  assert.ok(report.nodes, 'report must have nodes');
  assert.ok(report.arcs,  'report must have arcs');
  assert.equal(typeof report.nodes.total,   'number');
  assert.equal(typeof report.nodes.inIndex, 'number');
  assert.ok(Array.isArray(report.nodes.missingFromIndex));
  assert.ok(Array.isArray(report.nodes.extraInIndex));
});

test('KEY-ALIGNMENT: all nodes.json slugs appear in index.json', () => {
  const report = checkKeyAlignment();
  assert.deepEqual(report.nodes.missingFromIndex, [],
    `Slugs in nodes.json missing from index.json: ${report.nodes.missingFromIndex.join(', ')}`);
});

test('KEY-ALIGNMENT: no extra slugs in index.json beyond nodes.json', () => {
  const report = checkKeyAlignment();
  assert.deepEqual(report.nodes.extraInIndex, [],
    `Extra slugs in index.json not in nodes.json: ${report.nodes.extraInIndex.join(', ')}`);
});

test('KEY-ALIGNMENT: all arcs-v2.json keys appear in index.json', () => {
  const report = checkKeyAlignment();
  assert.deepEqual(report.arcs.missingFromIndex, [],
    `Arc IDs missing from index.json: ${report.arcs.missingFromIndex.join(', ')}`);
});

test('KEY-ALIGNMENT: every real arc is wired into build-archives.js\'s ARC_ORDER and ARC_KEY_MAP, and priority-1 arcs into build-index-page.js\'s ARC_ORDER — existing in arcs-v2.json/index.json is not sufficient for a human to actually reach the page (real regression: victor_dossier)', () => {
  const report = checkKeyAlignment();
  assert.deepEqual(report.arcs.missingFromArcOrder, [],
    `Arc(s) missing from build-archives.js's ARC_ORDER (unreachable from Archives): ${report.arcs.missingFromArcOrder.join(', ')}`);
  assert.deepEqual(report.arcs.missingFromArcKeyMap, [],
    `Arc(s) missing from build-archives.js's ARC_KEY_MAP (heading i18n lookup falls back silently): ${report.arcs.missingFromArcKeyMap.join(', ')}`);
  assert.deepEqual(report.arcs.missingFromHomepageOrder, [],
    `Priority-1 arc(s) missing from build-index-page.js's ARC_ORDER (no homepage hub card): ${report.arcs.missingFromHomepageOrder.join(', ')}`);
});

test('KEY-ALIGNMENT: report includes pages and wip sections', () => {
  const report = checkKeyAlignment();
  assert.ok(report.pages, 'report must have a pages section');
  assert.ok(report.wip,   'report must have a wip section');
  assert.ok(Array.isArray(report.pages.orphans));
  assert.ok(report.pages.bindings, 'report.pages must include the page binding report');
  assert.ok(Array.isArray(report.pages.bindings.rows));
  assert.ok(Array.isArray(report.wip.collisions));
  assert.ok(Array.isArray(report.wip.duplicateIntents));
});

test('KEY-ALIGNMENT: the real repo has no wip/ collisions or duplicate intents today', () => {
  // Uncurated pages (report.pages.orphans) are NOT asserted empty here — since
  // lib/auto-discover-nodes.js, having some is a normal, ongoing steady state
  // (a worklist of pages awaiting a proper nodes.json entry), not a bug. Real
  // collisions and duplicate wip/ intents are a different, still-zero-expected
  // invariant: those represent an actual placement conflict, not just "not yet curated."
  const report = checkKeyAlignment();
  assert.deepEqual(report.wip.collisions, [],
    `wip/ collisions found: ${JSON.stringify(report.wip.collisions)}`);
  assert.deepEqual(report.wip.duplicateIntents, []);
});

// ── 6. findOrphanPages / scanWipIntendedSlugs / findWipSlugCollisions / findDuplicateWipIntents ──

test('ORPHANS: a page not in nodes.json, viewmodels, or SKIP_PAGES is reported', () => {
  const result = findOrphanPages(['a', 'b', 'c'], ['a'], { b: 'generated page' }, []);
  assert.deepEqual(result, ['c']);
});

test('ORPHANS: viewmodels.json-registered dev/demo pages are not orphans', () => {
  const result = findOrphanPages(['a', 'vextreme-demo'], ['a'], {}, ['vextreme-demo']);
  assert.deepEqual(result, []);
});

test('WIP-INTENT: scanWipIntendedSlugs skips files with no _meta.slug', () => {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'wip-test-'));
  fs.writeFileSync(path.join(tmpDir, 'no-intent.json'), JSON.stringify({ foo: 'bar' }));
  fs.writeFileSync(path.join(tmpDir, 'has-intent.json'), JSON.stringify({ _meta: { slug: 'my-slug' } }));
  const result = scanWipIntendedSlugs(tmpDir);
  assert.deepEqual(result.map(r => r.slug), ['my-slug']);
  fs.rmSync(tmpDir, { recursive: true });
});

test('WIP-COLLISION: a wip/ slug matching an existing page is a collision', () => {
  const result = findWipSlugCollisions([{ file: 'x.json', slug: 'taken' }], ['taken', 'other']);
  assert.equal(result.length, 1);
  assert.equal(result[0].collidesWith, 'pages/');
});

test('WIP-COLLISION: a wip/ slug matching only a nodes.json placeholder (no page yet) is NOT a collision', () => {
  // This is the real fixture's actual shape: wip/silent-god.json declares
  // "vxg-thread-round-5", which exists in nodes.json as its own placeholder
  // with no page yet — the expected linkage, not a conflict.
  const result = findWipSlugCollisions([{ file: 'silent-god.json', slug: 'vxg-thread-round-5' }], ['some-other-page']);
  assert.deepEqual(result, []);
});

test('WIP-DUPLICATE-INTENT: two wip/ files declaring the same slug are both reported', () => {
  const result = findDuplicateWipIntents([
    { file: 'a.json', slug: 'shared' },
    { file: 'b.json', slug: 'shared' },
    { file: 'c.json', slug: 'unique' },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].slug, 'shared');
  assert.deepEqual(result[0].files.sort(), ['a.json', 'b.json']);
});

test('LANG-FAB: standalone widget refreshes supportedLangs before using stale index cache', () => {
  const source = fs.readFileSync(FAB_IN, 'utf8');
  const globalCheck = source.indexOf('window.VEX_SUPPORTED_LANGS');
  const cacheRead   = source.indexOf('localStorage.getItem(LS_DATA)');
  const requestOpen = source.indexOf("req.open('GET', INDEX_URL, true)");
  const earlyReturn = source.indexOf('onReady(cached.supportedLangs)');

  assert.ok(globalCheck >= 0, 'standalone widget must honor build-time supported lang globals');
  assert.ok(cacheRead >= 0 && requestOpen >= 0, 'widget must still have cache and network paths');
  assert.ok(globalCheck < cacheRead, 'build-time globals must bypass stale localStorage');
  assert.ok(cacheRead < requestOpen, 'cached langs should be available as fetch fallback');
  assert.equal(earlyReturn, -1, 'cached supportedLangs must not short-circuit the current index fetch');
});

test('LANG-FAB: hand-authored pages do not own supported language data', () => {
  const offenders = fs.readdirSync(PAGES_DIR)
    .filter(file => file.endsWith('.html'))
    .filter(file => {
      const html = fs.readFileSync(path.join(PAGES_DIR, file), 'utf8');
      return /window\.VEX_SUPPORTED_LANGS\s*=/.test(html);
    });

  assert.deepEqual(offenders, [], 'supportedLangs belongs in data/index.json and generated dist scripts, not page HTML');
});

test('LANG-FAB: victor methodology page uses generated script as language context', () => {
  const html = fs.readFileSync(path.join(PAGES_DIR, 'victor-methodology-presentation.html'), 'utf8');

  assert.ok(html.includes('../dist/vextreme-victor-methodology-presentation.js'), 'page must load its generated God Script');
  assert.equal(/window\.VEX_SUPPORTED_LANGS\s*=/.test(html), false, 'page must not inline supported languages');
  assert.equal(/<script[^>]+widgets\/fab-lang\.js/.test(html), false, 'page must not bypass the generated language bundle');
});

// loadSortLangs — pulls the real LANG_NAMES map and sortLangs() function out
// of the widget source and evaluates them directly, instead of a brittle
// text-position check, so this test actually exercises the sort behavior
// rather than just confirming certain strings appear in a certain order.
function loadSortLangs() {
  const source = fs.readFileSync(FAB_IN, 'utf8');
  const namesMatch = source.match(/var LANG_NAMES = \{[\s\S]*?\n  \};/);
  const sortMatch  = source.match(/function sortLangs\([\s\S]*?\n  \}/);
  assert.ok(namesMatch, 'LANG_NAMES map must exist in widgets/fab-lang.js');
  assert.ok(sortMatch, 'sortLangs() must exist in widgets/fab-lang.js');
  const fn = new Function(
    'LANG_DEFAULT',
    namesMatch[0].replace('var LANG_NAMES', 'var LANG_NAMES') + '\n' +
    sortMatch[0] + '\nreturn sortLangs;'
  );
  return fn('en');
}

test('LANG-FAB: sortLangs pins English first regardless of input order', () => {
  const sortLangs = loadSortLangs();
  // Chinese sorts before Japanese alphabetically by display name (C < J).
  assert.deepEqual(sortLangs(['zh', 'ja', 'en']), ['en', 'zh', 'ja']);
  assert.deepEqual(sortLangs(['en', 'ja', 'zh']), ['en', 'zh', 'ja']);
});

test('LANG-FAB: sortLangs orders non-English languages alphabetically by display name', () => {
  const sortLangs = loadSortLangs();
  // Chinese, Japanese, Korean — alphabetical by name puts zh before ja before ko,
  // not code order (ja, ko, zh) and not input order.
  assert.deepEqual(sortLangs(['ko', 'ja', 'zh', 'en']), ['en', 'zh', 'ja', 'ko']);
});

test('LANG-FAB: sortLangs still sorts alphabetically by name when English is absent from the list', () => {
  const sortLangs = loadSortLangs();
  assert.deepEqual(sortLangs(['zh', 'ja']), ['zh', 'ja']);
});

test('LANG-FAB: wheel clips to a partial peek when languages exceed the visible cap', () => {
  const source = fs.readFileSync(FAB_IN, 'utf8');
  assert.ok(/var WHEEL_VISIBLE_ITEMS\s*=\s*\d+/.test(source), 'must declare a visible-items cap');
  assert.ok(/var WHEEL_PEEK_FRACTION\s*=\s*[\d.]+/.test(source), 'must declare a peek fraction for the clipped trailing item');
  assert.ok(source.includes('wheel.style.height'), 'wheel height must be computed per mount, not fixed in CSS, so it can clip to a peek');
  assert.ok(!/#vex-lang-wheel \{[^}]*height:\s*\d+px/.test(source), 'wheel height must not be hardcoded in CSS once it is computed per instance');
});

// loadComputeLangSearch — pulls the real, pure computeLangSearch() out of the
// widget source and evaluates it directly (same technique as loadSortLangs
// above), so the URL-sharing logic is actually exercised rather than only
// text-matched.
function loadComputeLangSearch() {
  const source = fs.readFileSync(FAB_IN, 'utf8');
  const paramMatch = source.match(/var URL_LANG_PARAM = '[^']+';/);
  const fnMatch    = source.match(/function computeLangSearch\([\s\S]*?\n  \}/);
  assert.ok(paramMatch, 'URL_LANG_PARAM must exist in widgets/fab-lang.js');
  assert.ok(fnMatch, 'computeLangSearch() must exist in widgets/fab-lang.js');
  const fn = new Function(
    'LANG_DEFAULT',
    paramMatch[0] + '\n' + fnMatch[0] + '\nreturn computeLangSearch;'
  );
  return fn('en');
}

test('LANG-FAB: computeLangSearch omits ?lang= for the default language, for a clean shareable URL', () => {
  const computeLangSearch = loadComputeLangSearch();
  assert.equal(computeLangSearch('', 'en'), '');
  assert.equal(computeLangSearch('?lang=zh', 'en'), '');
});

test('LANG-FAB: computeLangSearch sets ?lang= explicitly for any non-default language', () => {
  const computeLangSearch = loadComputeLangSearch();
  assert.equal(computeLangSearch('', 'zh'), 'lang=zh');
  assert.equal(computeLangSearch('?lang=en', 'ja'), 'lang=ja');
});

test('LANG-FAB: computeLangSearch preserves unrelated query params', () => {
  const computeLangSearch = loadComputeLangSearch();
  const result = computeLangSearch('?utm_source=share&foo=bar', 'zh');
  const params = new URLSearchParams(result);
  assert.equal(params.get('lang'), 'zh');
  assert.equal(params.get('utm_source'), 'share');
  assert.equal(params.get('foo'), 'bar');
});

test('LANG-FAB: a URL ?lang= param wins over the stored localStorage preference on load', () => {
  const source = fs.readFileSync(FAB_IN, 'utf8');
  const urlLangCheck  = source.indexOf('var urlLang = getUrlLang();');
  const savedLangUse  = source.indexOf('if (langs.indexOf(savedLang) < 0) savedLang = langs[0];');
  assert.ok(urlLangCheck >= 0, 'mount() must check the URL for an explicit language override');
  assert.ok(urlLangCheck < savedLangUse, 'the URL override must be applied before the final savedLang is locked in');
});

test('LANG-FAB: selecting a language from the wheel updates the URL immediately', () => {
  const source = fs.readFileSync(FAB_IN, 'utf8');
  const clickHandler = source.match(/item\.addEventListener\('click', function \(\) \{[\s\S]*?\n\s*\}\);/);
  assert.ok(clickHandler, 'wheel item click handler must exist');
  assert.ok(clickHandler[0].includes('syncUrlLang(lang)'), 'clicking a language must sync it into the URL, not just apply it in-page');
});

// [VXG RealForever]
