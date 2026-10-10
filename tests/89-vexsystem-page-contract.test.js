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
const projectionSource = fs.readFileSync(path.join(ROOT, 'lib', 'vexsystem', 'projection.js'), 'utf8');
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

test('VEXSYSTEM PAGE: human questions compose the semantic engine instead of exposing internal lenses as the primary control', () => {
  assert.match(html, /id="question-controls"/);
  assert.match(html, /What do you want to understand\?/);
  assert.match(app, /for \(const question of projectionApi\.HUMAN_QUESTIONS\)/);
  assert.match(app, /projectionApi\.projectAtlasForQuestion/);
  assert.match(app, /projectionApi\.composeHumanQuestion/);
  assert.match(app, /projectionApi\.setLevel/);
  assert.doesNotMatch(html, />Focus on</);
});

test('VEXSYSTEM PAGE: selected semantic coordinate is URL-addressable and returnable', () => {
  assert.match(app, /url\.searchParams\.set\('subject', state\.selectedSubjectRef\)/);
  assert.match(app, /url\.searchParams\.set\('question', questionRef\)/);
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
  assert.match(browserProof, /receiver-desktop/);
  assert.match(browserProof, /history-desktop/);
  assert.match(browserProof, /receiver-mobile/);
  assert.match(browserProof, /Page\.captureScreenshot/);
});

test('VEXSYSTEM PAGE: browser proof checks semantic stability, accessibility projection, privacy and overflow', () => {
  assert.match(browserProof, /VEXSYSTEM_BROWSER_QUESTION_TELEPORT/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_QUESTION_CONSEQUENCE_MISSING/);
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

test('VEXSYSTEM PAGE: screenshot evidence uses the same strict runtime/network classifier with bounded Terrain initialization options', () => {
  assert.match(browserProof, /assertPageSignals\(/);
  assert.match(browserProof, /'screenshot ' \+ scenario/);
  assert.match(browserProof, /terrainScenario/);
  assert.match(browserProof, /allowSingleSupersededDocumentAbort/);
  assert.match(browserProof, /signals,/);
});

test('VEXSYSTEM PAGE: composed understanding precedes optional exploration controls', () => {
  const understanding = html.indexOf('id="understanding-title"');
  const controls = html.indexOf('id="question-controls"');
  assert.ok(understanding >= 0);
  assert.ok(controls > understanding);
  assert.match(html, /data-vexsystem-component="composed-understanding"/);
  assert.match(app, /projectionApi\.composeUnderstanding\(atlas, state\.selectedSubjectRef\)/);
});

test('VEXSYSTEM PAGE: receiver-facing controls ask questions instead of presenting architecture buzzwords', () => {
  assert.match(html, /What do you want to understand\?/);
  assert.match(projectionSource, /How is this put together\?/);
  assert.match(projectionSource, /How does it keep working\?/);
  assert.match(projectionSource, /How do we know it is healthy\?/);
  assert.match(projectionSource, /Where does it show up\?/);
  assert.match(projectionSource, /How did we get here\?/);
  assert.match(html, />Detail</);
  assert.match(html, />Less</);
  assert.match(html, />More</);
  assert.doesNotMatch(html, />Focus on</);
  assert.doesNotMatch(app, /BLUEPRINT: 'Structure'/);
  assert.doesNotMatch(app, /CONSEQUENCE: 'Impact'/);
});

test('VEXSYSTEM PAGE: relationship map has explicit pan, zoom, fit and reset presentation controls', () => {
  assert.match(html, /id="map-world"/);
  assert.match(html, /id="map-fit"/);
  assert.match(html, /id="map-zoom-in"/);
  assert.match(html, /id="map-zoom-out"/);
  assert.match(html, /id="map-reset"/);
  assert.match(css, /touch-action:none/);
  assert.match(css, /cursor:grab/);
  assert.match(app, /function zoomMapAt\(point, requestedScale\)/);
  assert.match(app, /function fitMapToQuestion\(positions, supportSubjectRefs\)/);
  assert.match(app, /addEventListener\('wheel'/);
  assert.match(app, /addEventListener\('pointerdown'/);
  assert.match(app, /addEventListener\('pointermove'/);
});

test('VEXSYSTEM PAGE: direct human answer precedes raw map inspection detail', () => {
  assert.match(html, /id="view-answer"/);
  assert.match(html, /Why does this answer the question\?/);
  assert.match(html, /Same relationships, without the map/);
  assert.match(app, /dom\.viewAnswer\.textContent = question\.answer/);
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


test('VEXSYSTEM PAGE: navigation-abort noise is admitted only after a proven top-level Terrain -> VexSystem handoff', () => {
  assert.match(browserProof, /allowSingleSupersededDocumentAbort/);
  assert.match(browserProof, /entry\.url == null/);
  assert.match(browserProof, /entry\.errorText === 'net::ERR_ABORTED'/);
  assert.match(browserProof, /entry\.canceled === true/);
  assert.match(browserProof, /entry\.type === 'Document'/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_MULTIPLE_NAVIGATION_ABORTS/);
  assert.match(browserProof, /topLevel === true/);
  assert.match(browserProof, /navigated\.pathname === '\/Vextreme\/vexsystem\/'/);
  assert.doesNotMatch(browserProof, /allowSingleSupersededDocumentAbort:\s*true/);
});


test('VEXSYSTEM PAGE: mobile Terrain initialization admits one superseded document only after canonical arrival is proven', () => {
  assert.match(browserProof, /mobileArrival\.entryPresent === true/);
  assert.match(browserProof, /mobileArrival\.pathname === '\/Vextreme\/pages\/terrain-map\.html'/);
  assert.match(browserProof, /Terrain mobile arrival runtime/);
});


test('VEXSYSTEM PAGE: Terrain screenshots admit one initial document abort only after canonical arrival is proven', () => {
  assert.match(browserProof, /terrainScenario\s*\?\s*\{/);
  assert.match(browserProof, /snapshot\.entryPresent === true/);
  assert.match(browserProof, /snapshot\.pathname === '\/Vextreme\/pages\/terrain-map\.html'/);
  assert.match(browserProof, /'screenshot ' \+ scenario/);
  assert.doesNotMatch(browserProof, /allowSingleSupersededDocumentAbort:\s*true/);
});


test('VEXSYSTEM PAGE: browser proof treats map camera movement as presentation-only', () => {
  assert.match(browserProof, /proveMapCameraIsPresentationOnly/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_MAP_PAN_SEMANTIC_MUTATION/);
  assert.match(browserProof, /VEXSYSTEM_BROWSER_MAP_ZOOM_SEMANTIC_MUTATION/);
  assert.match(browserProof, /type: 'mouseWheel'/);
  assert.match(browserProof, /window\.__vexMapFitTransform/);
  assert.match(browserProof, /#map-fit/);
  assert.match(browserProof, /#map-reset/);
});

// [VXG RealForever]
