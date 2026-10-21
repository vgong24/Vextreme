'use strict';

/**
 * PAGE HEALTH - generated per-screen capability visibility.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  pageI18nKeys,
  languageCoverage,
  screenshotLanguages,
  hasVisibleThemeStyles,
  metaDescriptionText,
  fabDelivery,
  readAloudApplicable,
  readAloudDelivery,
  buildPageHealth,
  loadInputs,
} = require('../lib/build-page-health');

const {
  buildCaptureMatrix,
  parseArgs: parseMatrixArgs,
} = require('../scripts/screenshot-localization-matrix');
const {
  parseArgs: parseScreenshotArgs,
} = require('../scripts/screenshot-page');

const ROOT = path.join(__dirname, '..');

test('PAGE-HEALTH: identity keys and language completeness are source-derived', () => {
  const keys = pageI18nKeys('<p data-i18n="x.a"></p><p data-i18n="x.b"></p>');
  assert.deepEqual(keys, ['x.a', 'x.b']);
  const coverage = languageCoverage(keys, {
    'x.a': { langs: ['en', 'ja'] },
    'x.b': { langs: ['en'] },
  });
  assert.equal(coverage.en.state, 'full');
  assert.equal(coverage.ja.state, 'partial');
});

test('PAGE-HEALTH: theme mechanism is distinct from visible theme styles', () => {
  assert.equal(hasVisibleThemeStyles('<html data-theme="dark"><style>body{color:red}</style>'), false);
  assert.equal(hasVisibleThemeStyles('<style>:root[data-theme="light"]{color:black}</style>'), true);
});

test('PAGE-HEALTH: matrix evidence contributes its locale without collapsing the filename', () => {
  const files = ['vex-test-en-foundation-320.png', 'vex-test-en-foundation-light-320.png'];
  assert.deepEqual(screenshotLanguages('vex-test', files), ['en']);
});

test('PAGE-HEALTH: Assets evidence fills screenshot languages when local screenshot files are absent', () => {
  const projection = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'screenshot-evidence-assets.json'), 'utf8'));
  const result = buildPageHealth({
    pageSlugs: ['specimen-full-translation'],
    htmlBySlug: { 'specimen-full-translation': '<a href="archives.html">out</a>' },
    distBySlug: { 'specimen-full-translation': '' },
    wiredBySlug: {},
    navRows: [{ slug:'specimen-full-translation', navigable:true, staticHubLinks:1, hasShellJs:false, hasFabNav:false }],
    nodes: [],
    manifest: {},
    analysisPages: {},
    screenshotFiles: [],
    assetScreenshotProjection: projection,
    institutionalSurfaces: {},
  });
  assert.deepEqual(result.pages['specimen-full-translation'].evidence.screenshotLanguages, ['en', 'ja']);
  assert.equal(result.pages['specimen-full-translation'].health.gaps.includes('screenshot'), false);
});

test('PAGE-HEALTH: Assets institutional evidence satisfies strict theme-matrix proof when local custody is absent', () => {
  const projection = {
    schemaVersion:'vextreme.screenshot-evidence-assets-projection/v1',
    source:{
      repository:'vgong24/Vextreme-Assets',
      commit:'7a8af51edeefe77531904b6228dfbb895edef81b',
      publicOrigin:'https://vgong24.github.io/Vextreme-Assets',
      manifestSchemaVersion:'vextreme-assets.screenshot-evidence/v1'
    },
    records:{
      'vextreme/institution-test/en/foundation/320':{
        namespace:'vextreme', slug:'institution-test', locale:'en', theme:'foundation', viewport:320,
        sha256:'0'.repeat(64),
        path:'evidence/screenshots/vextreme/institution-test/en/foundation/320/' + '0'.repeat(64) + '.png',
        source:{repository:'vgong24/Vextreme',commit:'0'.repeat(40),path:'pages/institution-test.html'},
        captureKind:'institutional-localization'
      }
    }
  };
  const result = buildPageHealth({
    pageSlugs:['institution-test'],
    htmlBySlug:{'institution-test':'<html data-theme="foundation"></html>'},
    distBySlug:{'institution-test':''},
    wiredBySlug:{},
    navRows:[{slug:'institution-test',navigable:true,staticHubLinks:1,hasShellJs:false,hasFabNav:false}],
    nodes:[], manifest:{}, analysisPages:{}, screenshotFiles:[],
    assetScreenshotProjection:projection,
    institutionalSurfaces:{
      'institution-test':{state:'active',evidence:{themes:['foundation']}}
    }
  });
  assert.deepEqual(result.pages['institution-test'].evidence.screenshotLanguages, ['en']);
  assert.equal(result.pages['institution-test'].theme.visibleStyles, true,
    'institutional-localization Assets evidence is matrix-equivalent when the local coordinate is absent');
  assert.deepEqual(result.pages['institution-test'].evidence.screenshotFiles, [
    'https://vgong24.github.io/Vextreme-Assets/evidence/screenshots/vextreme/institution-test/en/foundation/320/' + '0'.repeat(64) + '.png'
  ]);
});

test('PAGE-HEALTH: meta description is extracted as text, not flattened to a boolean', () => {
  assert.equal(metaDescriptionText('<meta name="description" content="A real summary.">'), 'A real summary.');
  assert.equal(metaDescriptionText('<meta name="description" content="  padded  ">'), 'padded');
  assert.equal(metaDescriptionText('<meta name="description" content="">'), '');
  assert.equal(metaDescriptionText('<meta name="description" content="   ">'), '');
  assert.equal(metaDescriptionText('<title>No description tag</title>'), '');
  assert.equal(metaDescriptionText('<meta content="reversed attribute order" name="description">'), 'reversed attribute order');
  assert.equal(metaDescriptionText('<meta property="og:description" content="not the same tag">'), '');
});

test('PAGE-HEALTH: FAB delivery preserves shell, God Script, disabled, and missing states', () => {
  assert.equal(fabDelivery('<script src="/lib/shell.js"></script>', '', false), 'shell');
  assert.equal(fabDelivery('', '/* feature: spiral-fab */', true), 'god-script');
  assert.equal(fabDelivery('<script>VEXTREME({fab:false})</script>', '', false), 'disabled');
  assert.equal(fabDelivery('', '', false), 'missing');
});

test('PAGE-HEALTH: Read Aloud coverage is independent from generic FAB applicability', () => {
  assert.equal(readAloudDelivery('<script src="/lib/shell.js"></script>', '', false), 'shell');
  assert.equal(readAloudDelivery('', '/* core: fab-read-aloud.js */', true), 'god-script');
  assert.equal(readAloudDelivery('<script src="../widgets/fab-read-aloud.js"></script>', '', false), 'page-owned');
  assert.equal(readAloudDelivery('<script src="../widgets/vex-institutional.js"></script>', '', false), 'institutional-shared');
  assert.equal(readAloudDelivery('', '', false, 'generated-owner'), 'generated-owner');
  assert.equal(readAloudApplicable('empty', ''), false);
  assert.equal(readAloudApplicable('redirect', '<meta name="robots" content="noindex"><p>Moved</p><script>location.replace("x")</script>'), false);
  assert.equal(readAloudApplicable('article', '<main><p>Readable public content.</p></main>'), true);
});


test('PAGE-HEALTH: analysis indexing and an exposed analysis control remain separate facts', () => {
  const result = buildPageHealth({
    pageSlugs: ['indexed-only'], htmlBySlug: { 'indexed-only': '<a href="build-health.html">out</a>' },
    distBySlug: { 'indexed-only': '' }, wiredBySlug: {},
    navRows: [{ slug: 'indexed-only', navigable: true, staticHubLinks: 1, hasShellJs: false, hasFabNav: false }],
    nodes: [], manifest: {}, analysisPages: { 'indexed-only': { keys: [] } }, screenshotFiles: [],
  });
  assert.equal(result.pages['indexed-only'].analysis.indexed, true);
  assert.equal(result.pages['indexed-only'].analysis.control, false);
});

test('PAGE-HEALTH: critical means isolated; incomplete capabilities remain visible as attention', () => {
  const base = {
    pageSlugs: ['healthy', 'isolated'],
    htmlBySlug: {
      healthy: '<style>:root[data-theme="light"]{color:black}</style><p data-i18n="x.a"></p><script src="/lib/shell.js"></script>',
      isolated: '<meta name="description" content="Present but still isolated."><p>plain</p>',
    },
    distBySlug: { healthy: '', isolated: '' },
    wiredBySlug: {},
    navRows: [
      { slug: 'healthy', navigable: true, staticHubLinks: 0, hasShellJs: true, hasFabNav: false },
      { slug: 'isolated', navigable: false, staticHubLinks: 0, hasShellJs: false, hasFabNav: false },
    ],
    nodes: [{ slug: 'healthy', title: 'Healthy', arcKeys: ['a'] }],
    manifest: { 'x.a': { langs: ['en'] } },
    analysisPages: {},
    screenshotFiles: ['healthy-en.png'],
  };
  const result = buildPageHealth(base);
  assert.equal(result.pages.healthy.health.state, 'healthy');
  assert.equal(result.pages.isolated.health.state, 'critical');
  assert.equal(result.pages.isolated.placement.state, 'uncurated');
  assert.equal(result.pages.healthy.discovery.metaDescription, '', 'a missing meta description alone must not demote an otherwise-healthy page');
  assert.equal(result.pages.healthy.health.state, 'healthy', 'a missing meta description alone must not affect health state');
  assert.equal(result.pages.isolated.discovery.metaDescription, 'Present but still isolated.');
  assert.equal(result.summary.withMetaDescription, 1);
});

test('PAGE-HEALTH: Terrain group-home surfaces do not inherit ordinary record placement/FAB debt', () => {
  const slug = 'direct-contact';
  const result = buildPageHealth({
    pageSlugs:[slug],
    htmlBySlug:{[slug]:'<html data-vex-surface="group-home"><p>Collection introduction.</p><a href="the-walk.html">Walk</a><script src="../widgets/fab-read-aloud.js"></script></html>'},
    distBySlug:{[slug]:''}, wiredBySlug:{},
    navRows:[{slug,navigable:true,staticHubLinks:1,hasShellJs:false,hasFabNav:false}],
    nodes:[], manifest:{}, analysisPages:{}, screenshotFiles:[]
  });
  const page=result.pages[slug];
  assert.deepEqual(page.surface,{kind:'group-home',state:'active'});
  assert.equal(page.placement.state,'group-home');
  assert.equal(page.fab.delivery,'not-applicable');
  assert.deepEqual(page.readAloud,{applicable:true,delivery:'page-owned'});
  assert.equal(page.health.blockers.length,0);
  assert.equal(page.health.gaps.includes('uncurated'),false);
  assert.equal(page.health.gaps.includes('fab'),false);
});

test('PAGE-HEALTH: registry-owned institutional pages do not inherit record FAB and placement debt', () => {
  const slug = 'vex-test';
  const result = buildPageHealth({
    pageSlugs: [slug],
    htmlBySlug: {
      [slug]: '<html data-theme="foundation" data-vex-theme-family="foundation"><p data-i18n="institution.test">Test</p><script src="../widgets/vex-institutional.js"></script></html>',
    },
    distBySlug: { [slug]: '' },
    wiredBySlug: {},
    navRows: [{ slug, navigable: true, staticHubLinks: 1, hasShellJs: false, hasFabNav: false }],
    nodes: [],
    manifest: { 'institution.test': { langs: ['en'] } },
    analysisPages: {},
    screenshotFiles: [
      'vex-test-en-foundation-320.png',
      'vex-test-en-foundation-light-320.png',
    ],
    institutionalSurfaces: {
      [slug]: {
        state: 'active',
        evidence: { themes: ['foundation', 'foundation-light'] },
      },
    },
  });

  const page = result.pages[slug];
  assert.equal(page.surface.kind, 'institutional');
  assert.equal(page.placement.state, 'institutional');
  assert.equal(page.fab.delivery, 'not-applicable');
  assert.deepEqual(page.readAloud, { applicable: true, delivery: 'institutional-shared' });
  assert.equal(page.theme.visibleStyles, true);
  assert.deepEqual(page.evidence.screenshotFiles, [
    'docs/screenshots/vex-test-en-foundation-320.png',
    'docs/screenshots/vex-test-en-foundation-light-320.png',
  ]);
  assert.deepEqual(page.health, { state: 'healthy', blockers: [], gaps: [] });
});

test('PAGE-HEALTH: institutional shell and God Script delivery fail closed', () => {
  const slug = 'vex-test';
  const result = buildPageHealth({
    pageSlugs: [slug],
    htmlBySlug: {
      [slug]: '<html data-theme="foundation"><p data-i18n="institution.test">Test</p><script src="../lib/shell.js"></script></html>',
    },
    distBySlug: { [slug]: '/* feature: spiral-fab */' },
    wiredBySlug: { [slug]: true },
    navRows: [{ slug, navigable: true, staticHubLinks: 1, hasShellJs: true, hasFabNav: true }],
    nodes: [],
    manifest: { 'institution.test': { langs: ['en'] } },
    analysisPages: {},
    screenshotFiles: ['vex-test-en-foundation-320.png'],
    institutionalSurfaces: {
      [slug]: { state: 'active', evidence: { themes: ['foundation'] } },
    },
  });

  assert.deepEqual(result.pages[slug].runtime, { shell: true, godScript: true });
  assert.deepEqual(result.pages[slug].health, {
    state: 'critical',
    blockers: ['institutional-shell', 'institutional-god-script'],
    gaps: [],
  });
});

test('SCREENSHOT-EVIDENCE: general localization crawler keeps local evidence and optionally hands identical captures to Assets custody', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts', 'screenshot-page.js'), 'utf8').replace(/\r\n/g, '\n');

  assert.match(source, /docs\/screenshots\/\{slug\}-en\.png/);
  assert.match(source, /docs\/screenshots\/\{slug\}-\{lang\}\.png/);
  assert.match(source, /VEXTREME_ASSETS_ROOT/);
  assert.match(source, /--assets-root/);
  assert.match(source, /ingest-screenshot-evidence\.mjs/);
  assert.match(source, /'--namespace', 'vextreme'/);
  assert.match(source, /'--theme', 'default'/);
  assert.match(source, /'--viewport', String\(VIEWPORT\.width\)/);
  assert.match(source, /'--source-repo', 'vgong24\/Vextreme'/);
  assert.match(source, /'--source-commit', commit/);
  assert.match(source, /'--source-path', 'pages\/' \+ slug \+ '\.html'/);
  assert.match(source, /'--capture-kind', 'localization'/);
  assert.match(source, /git', \['rev-parse', 'HEAD'\]/,
    'Assets evidence must bind to an exact source commit, not a mutable branch name');

  assert.match(source, /FAB button not found — refusing to label a localization screenshot/);
  assert.match(source, /#vex-spiral-trigger/,
    'nested language capture must use the visible Spiral trigger rather than force-clicking a hidden orb');
  assert.match(source, /#vex-spiral-group/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /fabBtn\.isVisible\(\)/,
    'standalone-visible language FABs must retain their direct interaction path');
  assert.match(source, /No FAB item found for lang=/);
  assert.match(source, /localStorage\.getItem\('vex-lang'\) === expected/,
    'requested locale must be persisted before the localized screenshot is accepted');
  assert.match(source, /document\.documentElement\.lang === expected/,
    'requested locale must also be observed on the rendered document before capture');

  assert.match(source, /'\.png':\s+'image\/png'/);
  assert.match(source, /'\.woff2':\s+'font\/woff2'/);
  assert.match(source, /'\.ttf':\s+'font\/ttf'/,
    'local screenshot fidelity must serve retained visual/font dependencies with browser-appropriate MIME types');
});
test('LOCALIZATION-SCREENSHOT: legacy one-page CLI and single-cell mode share one parser without ambiguity', () => {
  const legacy = parseScreenshotArgs(['example-page', 'ja', '--assets-root', '../Vextreme-Assets']);
  assert.equal(legacy.slug, 'example-page');
  assert.equal(legacy.lang, 'ja');
  assert.equal(legacy.locale, null);
  assert.ok(legacy.assetsRoot.endsWith(path.join('Vextreme-Assets')));

  const single = parseScreenshotArgs(['example-page', '--locale', 'fr', '--out-dir', './tmp-captures']);
  assert.equal(single.slug, 'example-page');
  assert.equal(single.locale, 'fr');
  assert.ok(single.outDir.endsWith(path.join('tmp-captures')));

  assert.throws(
    () => parseScreenshotArgs(['example-page', 'ja', '--locale', 'fr']),
    /either positional \[lang\] pair mode or --locale single-cell mode/
  );
});

test('LOCALIZATION-SCREENSHOT: matrix uses completeLangs only and intersects with real pages', () => {
  const index = {
    pageLanguageMap: {
      alpha: { availableLangs: ['en', 'fr', 'ja'], completeLangs: ['en', 'fr'] },
      beta: { availableLangs: ['en', 'ja'], completeLangs: ['en'] },
      missing: { availableLangs: ['en', 'ja'], completeLangs: ['en', 'ja'] },
    },
  };

  assert.deepEqual(buildCaptureMatrix(index, ['beta', 'alpha']), [
    { slug: 'alpha', locale: 'en' },
    { slug: 'alpha', locale: 'fr' },
    { slug: 'beta', locale: 'en' },
  ], 'partial JA and non-existent pages must never become evidence cells');

  assert.deepEqual(buildCaptureMatrix(index, ['alpha', 'beta'], { slug: 'alpha', locale: 'fr' }), [
    { slug: 'alpha', locale: 'fr' },
  ]);
});

test('LOCALIZATION-SCREENSHOT: dry-run may inspect the matrix without an Assets checkout', () => {
  const options = parseMatrixArgs(['--dry-run', '--slug', 'specimen-full-translation', '--locale', 'ja']);
  assert.equal(options.dryRun, true);
  assert.equal(options.slug, 'specimen-full-translation');
  assert.equal(options.locale, 'ja');
  assert.equal(options.assetsRoot, null);
  assert.throws(() => parseMatrixArgs(['--slug', '../unsafe']), /safe page slug/);
});

test('LOCALIZATION-SCREENSHOT: matrix execution is Assets-first and reuses the shared capture engine', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts', 'screenshot-localization-matrix.js'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /pageLanguageMap/);
  assert.match(source, /completeLangs/);
  assert.match(source, /getPageSlugs/);
  assert.match(source, /createCaptureSession/);
  assert.match(source, /captureLocaleCell/);
  assert.match(source, /mkdtempSync/);
  assert.match(source, /rmSync\(tempRoot, \{ recursive: true, force: true \}\)/);
  assert.match(source, /real matrix capture requires --assets-root/);
  assert.match(source, /ingest-screenshot-evidence\.mjs/);
  assert.match(source, /'--check', '--root', assetsRoot/);

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['localization:screenshots'], 'node scripts/screenshot-localization-matrix.js');
});

test('PAGE-HEALTH: generated Read Aloud ownership predicts the generic page-owned FAB before output regeneration', () => {
  const slug = 'generated-dashboard';
  const result = buildPageHealth({
    pageSlugs:[slug],
    htmlBySlug:{[slug]:'<html><p>Readable generated dashboard.</p></html>'},
    distBySlug:{[slug]:''},
    wiredBySlug:{},
    navRows:[{slug,navigable:true,staticHubLinks:1,hasShellJs:false,hasFabNav:false}],
    nodes:[], manifest:{}, analysisPages:{}, screenshotFiles:[],
    readAloudOwnedBySlug:{[slug]:'generated-owner'},
  });
  assert.equal(result.pages[slug].fab.delivery, 'page-owned');
  assert.equal(result.pages[slug].health.gaps.includes('fab'), false);
  assert.deepEqual(result.pages[slug].readAloud, { applicable:true, delivery:'generated-owner' });
});

test('PAGE-HEALTH: generated Read Aloud ownership is source-derived before output regeneration', () => {
  const { generatedReadAloudOwners } = require('../lib/build-page-health');
  const owners = generatedReadAloudOwners(ROOT);
  for (const slug of ['build-health','ecosystem-hub','roles-index','vextreme-demo','ai-practitioner-tools','direct-contact']) {
    assert.equal(owners[slug], 'generated-owner', slug + ' must be covered by its rightful generator/projector source');
  }
});

test('PAGE-HEALTH integration: every applicable public readable surface has Read Aloud delivery', () => {
  const fresh = buildPageHealth(loadInputs());
  assert.equal(fresh.summary.missingReadAloud, 0);
  assert.equal(fresh.summary.withReadAloud, fresh.summary.readAloudApplicable);
});

test('PAGE-HEALTH integration: committed projection equals fresh source computation', () => {
  const committed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'page-health.json'), 'utf8'));
  assert.deepEqual(committed, buildPageHealth(loadInputs()));
});

test('PAGE-HEALTH integration: Build Health and Terrain consume the shared projection', () => {
  const buildHealth = fs.readFileSync(path.join(ROOT, 'pages', 'build-health.html'), 'utf8');
  const terrain = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'terrain-map.json'), 'utf8'));
  assert.match(buildHealth, /Page capability health/);
  for (const page of terrain.pages.filter((entry) => entry.live)) {
    assert.ok(page.capability, `${page.slug} missing capability projection`);
    assert.equal(page.capability.identity, undefined, `${page.slug} should carry the compact Terrain digest, not full language coverage`);
  }
});

// [VXG RealForever]
