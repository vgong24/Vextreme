/**
 * VEXTREME — tests/89-vexsystem-page-contract.test.js
 *
 * Static contract for the standalone public VexSystem renderer.
 *
 * [VXG RealForever]
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'vexsystem', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'vexsystem', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'vexsystem', 'styles.css'), 'utf8');
const browserProof = fs.readFileSync(path.join(ROOT, 'vexsystem', 'proof', 'browser-proof.js'), 'utf8');

test('VEXSYSTEM PAGE: standalone surface consumes the canonical public projection core and atlas', () => {
  assert.match(html, /src="\.\.\/lib\/vexsystem\/projection\.js"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(app, /fetch\('\.\.\/data\/vexsystem\/atlas\.json'/);
  assert.match(app, /projectionApi\.assertAtlas\(value\)/);
});

test('VEXSYSTEM PAGE: graph has an explicit equivalent text/keyboard surface', () => {
  assert.match(html, /id="vexsystem-map"[^>]*role="img"/);
  assert.match(html, /id="text-node-list"/);
  assert.match(html, /Every graph node below is keyboard-selectable/);
  assert.match(app, /tabindex: '0'/);
  assert.match(app, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(app, /renderTextView\(view\)/);
});

test('VEXSYSTEM PAGE: lenses and semantic depth are model-driven, not separate hard-coded pages', () => {
  assert.match(html, /id="lens-controls"/);
  assert.match(html, /id="level-out"/);
  assert.match(html, /id="level-in"/);
  assert.match(app, /for \(const lensRecord of atlas\.lenses\)/);
  assert.match(app, /projectionApi\.setLens/);
  assert.match(app, /projectionApi\.setLevel/);
});

test('VEXSYSTEM PAGE: selected semantic coordinate is URL-addressable and returnable', () => {
  assert.match(app, /url\.searchParams\.set\('subject', state\.selectedSubjectRef\)/);
  assert.match(app, /url\.searchParams\.set\('lens', state\.lens\)/);
  assert.match(app, /url\.searchParams\.set\('level', String\(state\.level\)\)/);
  assert.match(app, /projectionApi\.returnFocus/);
});

test('VEXSYSTEM PAGE: renderer fails closed when the projection cannot be loaded', () => {
  assert.match(app, /VexSystem source could not be loaded/);
  assert.match(app, /fails closed rather than inventing architecture/);
});

test('VEXSYSTEM PAGE: visual branch classes include held, proof, and historical distinctions', () => {
  assert.match(css, /\.vs-edge\.HELD_BRANCH/);
  assert.match(css, /\.vs-edge\.PROOF/);
  assert.match(css, /\.vs-edge\.HISTORICAL_BRANCH/);
  assert.match(css, /\.vs-edge\.CONVERGENCE/);
});

test('VEXSYSTEM PAGE: Terrain remains an external host route rather than copied shared chrome', () => {
  assert.match(html, /href="\.\.\/pages\/terrain-map\.html"/);
  assert.doesNotMatch(html, /vex-spiral-trigger|vex-nav-actions|terrain-entry-contract/);
  assert.doesNotMatch(app, /vex-spiral-trigger|vex-nav-actions/);
});


test('VEXSYSTEM PAGE: browser proof is dependency-free CDP over installed Chromium-family browsers', () => {
  assert.match(browserProof, /--remote-debugging-pipe/);
  assert.match(browserProof, /Brave Browser\.app/);
  assert.match(browserProof, /Google Chrome\.app/);
  assert.match(browserProof, /CHROMIUM_DEVTOOLS_PROTOCOL_PIPE/);
  assert.match(browserProof, /installOrDownloadAttempted: false/);
  assert.doesNotMatch(browserProof, /require\(['"]playwright['"]\)|require\(['"]puppeteer['"]\)/);
});

test('VEXSYSTEM PAGE: browser proof keeps runtime and screenshots in separate bounded modes', () => {
  assert.match(browserProof, /mode === 'runtime'/);
  assert.match(browserProof, /mode === 'screenshot'/);
  assert.match(browserProof, /blueprint-desktop/);
  assert.match(browserProof, /formation-desktop/);
  assert.match(browserProof, /blueprint-mobile/);
  assert.match(browserProof, /Page\.captureScreenshot/);
});

test('VEXSYSTEM PAGE: browser proof checks semantic stability, accessibility projection, privacy and overflow', () => {
  assert.match(browserProof, /VEXSYSTEM_BROWSER_LENS_TELEPORT/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_ZOOM_TELEPORT/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_EQUIVALENT_VIEWS_MISSING/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_PRIVATE_COORDINATE_LEAK/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_HORIZONTAL_OVERFLOW/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_FORMATION_HISTORY_MISSING/);
});


test('VEXSYSTEM PAGE: host browser proof blocks nonessential external font traffic', () => {
  assert.match(browserProof, /Network\.setBlockedURLs/);
  assert.match(browserProof, /fonts\.googleapis\.com/);
  assert.match(browserProof, /fonts\.gstatic\.com/);
});


test('VEXSYSTEM PAGE: browser keyboard proof uses trusted CDP input rather than synthetic DOM keyboard events', () => {
  assert.match(browserProof, /Input\.dispatchKeyEvent/);
  assert.match(browserProof, /type: 'keyDown'/);
  assert.match(browserProof, /type: 'keyUp'/);
  assert.doesNotMatch(browserProof, /dispatchEvent\(new KeyboardEvent/);
});


test('VEXSYSTEM PAGE: trusted Enter proof distinguishes keyboard readiness from headless-CDP default activation', () => {
  assert.match(browserProof, /text: '\\\\r'/);
  assert.match(browserProof, /unmodifiedText: '\\\\r'/);
  assert.match(browserProof, /window\.__vexKeyboardProbe/);
  assert.match(browserProof, /event\.isTrusted === true/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_KEYBOARD_RECEPTION_MISSING/);
  assert.match(browserProof, /NATIVE_KEYBOARD_READY_TRUSTED_KEYS_OBSERVED__HEADLESS_CDP_DEFAULT_ACTION_NOT_CLAIMED/);
  assert.doesNotMatch(browserProof, /VEXSYSTEM_BROWSER_KEYBOARD_TRUST_CHAIN_MISSING/);
});


test('VEXSYSTEM PAGE: keyboard proof requires native focusable button semantics and keeps activation evidence separate', () => {
  assert.match(browserProof, /Page\.bringToFront/);
  assert.match(browserProof, /document\.hasFocus\(\) === true/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_PAGE_FOCUS_FAILED/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_NATIVE_BUTTON_REQUIRED/);
  assert.match(browserProof, /activeElementSubjectRef/);
  assert.match(browserProof, /keyboardObservation/);
  assert.match(browserProof, /keyboardSemantics/);
  assert.doesNotMatch(browserProof, /VEXSYSTEM_BROWSER_KEYBOARD_ACTIVATION_MISSING/);
});


test('VEXSYSTEM PAGE: product activation is proven with trusted pointer input when headless CDP omits native Enter default action', () => {
  assert.match(browserProof, /Input\.dispatchMouseEvent/);
  assert.match(browserProof, /type: 'mousePressed'/);
  assert.match(browserProof, /type: 'mouseReleased'/);
  assert.match(browserProof, /TRUSTED_POINTER_ACTIVATION_AFTER_KEYBOARD_READINESS/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_POINTER_ACTIVATION_MISSING/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_NATIVE_CLICK_SEMANTIC_SELECTION_MISSING/);
});


test('VEXSYSTEM PAGE: browser proof retains exact network failure identity and only bounds known browser/proof noise', () => {
  assert.match(browserProof, /Network\.requestWillBeSent/);
  assert.match(browserProof, /Network\.responseReceived/);
  assert.match(browserProof, /Network\.loadingFailed/);
  assert.match(browserProof, /responseErrors/);
  assert.match(browserProof, /loadingFailures/);
  assert.match(browserProof, /urlPathname\(entry\.url\) === '\/favicon\.ico'/);
  assert.match(browserProof, /fonts\.googleapis\.com/);
  assert.match(browserProof, /fonts\.gstatic\.com/);
  assert.match(browserProof, /blockingResponseErrors/);
  assert.match(browserProof, /blockingLoadingFailures/);
  assert.match(browserProof, /blockingConsoleErrors/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_PAGE_ERRORS/);
});

test('VEXSYSTEM PAGE: screenshot evidence uses the same strict runtime/network classification as interactive proof', () => {
  assert.match(browserProof, /assertPageSignals\(page, 'screenshot ' \+ scenario\)/);
  assert.match(browserProof, /signals,/);
});

test('VEXSYSTEM PAGE: composed understanding precedes optional exploration controls', () => {
  const understanding = html.indexOf('id="understanding-title"');
  const controls = html.indexOf('id="lens-controls"');
  assert.ok(understanding >= 0);
  assert.ok(controls > understanding);
  assert.match(html, /data-vexsystem-component="composed-understanding"/);
  assert.match(app, /projectionApi\.composeUnderstanding\(atlas, state\.selectedSubjectRef\)/);
});

test('VEXSYSTEM PAGE: human-facing focus and context labels do not require lens or numeric-level jargon', () => {
  assert.match(html, />Focus on</);
  assert.match(html, />Context</);
  assert.match(app, /BLUEPRINT: 'Structure'/);
  assert.match(app, /PROCESS: 'Building'/);
  assert.match(app, /CONSEQUENCE: 'Impact'/);
  assert.match(app, /PLATFORM: 'Platforms'/);
  assert.match(app, /FORMATION: 'History'/);
  assert.match(app, /dom\.levelOutput\.textContent = level\.name/);
  assert.doesNotMatch(html, />Semantic depth</);
});

test('VEXSYSTEM PAGE: mobile composition keeps meaning primary before the graph', () => {
  assert.match(css, /\.vs-understanding-heading h1\{font-size:31px/);
  assert.match(css, /\.vs-route-grid\{grid-template-columns:1fr/);
  assert.match(css, /\.vs-map-stage,#vexsystem-map\{min-height:390px\}/);
  assert.ok(html.indexOf('id="understanding-purpose"') < html.indexOf('id="vexsystem-map"'));
});



test('VEXSYSTEM PAGE: browser proof requires source-derived meaning before optional exploration', () => {
  assert.match(browserProof, /VEXSYSTEM_BROWSER_COMPOSED_UNDERSTANDING_MISSING/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_GRAPH_PRECEDES_UNDERSTANDING/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_WHOLE_ERASED_BY_FOCUS/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_MOBILE_FIRST_FOLD_MEANING_MISSING/);
  assert.match(browserProof, /understandingTitle/);
  assert.match(browserProof, /currentAnswerTop/);
  assert.match(browserProof, /purposeBottom/);
});


test('VEXSYSTEM PAGE: Formation screenshot visibly captures the optional deepening surface', () => {
  assert.match(browserProof, /document\.querySelector\('\.vs-explore'\)/);
  assert.match(browserProof, /window\.scrollTo\(0, top\)/);
  assert.match(browserProof, /Formation deepening viewport/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_FORMATION_CAPTURE_NOT_DEEPENED/);
  assert.match(browserProof, /scrollY: window\.scrollY/);
});


test('VEXSYSTEM PAGE: browser proof covers the live Terrain -> VexSystem top-level handoff', () => {
  assert.match(browserProof, /const TERRAIN_ENTRY = '\/Vextreme\/pages\/terrain-map\.html\?view=content&profile=evolution-v1'/);
  assert.match(browserProof, /relative\.startsWith\('Vextreme\/'\)/);
  assert.match(browserProof, /function assertTerrainArrivalSnapshot\(snapshot, label\)/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_TERRAIN_VEXSYSTEM_NOT_ACTIVE/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_TERRAIN_CONTRACT_MISMATCH/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_TERRAIN_READER_OWNS_VEXSYSTEM/);
  assert.match(browserProof, /TRUSTED_POINTER_TOP_LEVEL_HANDOFF/);
  assert.match(browserProof, /Terrain top-level VexSystem handoff/);
  assert.match(browserProof, /\/Vextreme\/vexsystem\//);
  assert.match(browserProof, /window\.top === window/);
  assert.match(browserProof, /terrain-entry-desktop/);
  assert.match(browserProof, /terrain-entry-mobile/);
});

// [VXG RealForever]
