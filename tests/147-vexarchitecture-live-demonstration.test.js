'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

function json(rel) {
  return JSON.parse(read(rel));
}

test('VEXARCHITECTURE LIVE: companion stays separate from the Builder Field Guide', () => {
  const guide = read('pages/vexarchitecture-first-stable-body.html');
  const live = read('pages/vexarchitecture-live-demonstration.html');

  assert.ok(guide.includes('./vexarchitecture-live-demonstration.html'));
  assert.ok(guide.includes('Open VexArchitecture — Live Demonstration ↗'));
  assert.ok(live.includes('./vexarchitecture-first-stable-body.html'));
  assert.ok(live.includes('This page does not redefine VexArchitecture.'));
  assert.ok(live.includes('Code blocks are scoped teaching excerpts'));
  assert.ok(live.includes('The linked source path and blob own the byte-exact code'));
  for (const bridge of [
    'MainActivity',
    'VexLifeApp(session: VexLifeSession)',
    'AppScreens',
    'VexRuntime.activate(...)',
    'ThemeModeStoreProvider',
    'SharedPreferencesThemeModeStore',
    'observeThemeModeStore',
    'VexExecution.observe',
    'RuntimeProvider',
    'currentAppActions = {',
    'AppActionRegistrations.dispatch(AppActionRequest)',
    'VexStreamLibrarySurface',
    'VexStreamPlaybackConnectionViewModel',
    'CurrentVexStreamPlaybackExperience',
    'VexMapsMapSurface',
  ]) {
    assert.ok(live.includes(bridge), 'missing explicit traversal bridge: ' + bridge);
  }
  assert.ok(live.includes('ThemeMode · accepted patient zero'));
  assert.ok(live.includes('VexStream Playback · current-source exemplar'));
  assert.ok(live.includes('VexMaps Distribution · current-source exemplar'));
});

test('VEXARCHITECTURE LIVE: every introduced ThemeMode scope has a visible next edge', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  for (const required of [
    'MainActivity',
    'VexLifeApp()',
    'VexApplicationDependencyModule',
    'themeModeStore: ThemeModeStoreProvider',
    'VexLifeViewModel',
    'VexLifeSessionDependencyModule',
    'themeModeFamily: ThemeModeFamilyProvider',
    'ThemeModeFamilyProvider.create()',
    'SessionProvider.create()',
    'AppActionsProvider.create()',
    'ScreenActionContext.toggleDarkMode',
    'DebugMenuScreen',
    'toggleThemeMode(...)',
    'ThemeModeFamily / VexFamily.activate',
    'activateThemeMode(...)',
    'ThemeModeFamily.Act.Method.Save',
    'ThemeModeStore.Result.Success',
    'unsettledSelection: Parameter.Mode?',
    'ThemeModeFamily.DisplayState',
    'DebugMenuScreenContent',
  ]) {
    assert.ok(live.includes(required), 'missing scope/edge witness: ' + required);
  }

  assert.equal(live.includes('used later'), false);
  assert.equal(live.includes('later used'), false);
  assert.ok(live.includes('theme-step-20'));
  assert.ok(live.includes('same concrete Store resolved in Step 06'));
});

test('VEXARCHITECTURE LIVE: VexStream walk closes UI to Media3 and back', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  for (const required of [
    'VexStreamLibrarySurface',
    'rememberVexStreamPlaybackExperience()',
    'VexStreamPlaybackConnectionViewModel',
    'VexStreamMiniPlayer',
    'playbackExperience.activate',
    'CurrentVexStreamPlaybackExperience',
    'Media3VexStreamPlaybackConnection',
    'controls.resolve(current, control)',
    'controller.play()',
    'Player.Listener',
    'publishObserved',
    'connection.projections StateFlow',
    'projection.present(PlayPause)',
  ]) {
    assert.ok(live.includes(required), 'missing VexStream witness: ' + required);
  }
});

test('VEXARCHITECTURE LIVE: Maps shows local ownership and relationship ownership separately', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  for (const required of [
    'VexMapsMapSurface',
    'VexMapsDistributionProcess.session',
    'VexMapsDistributionProcess',
    'productionSession',
    'VexMapsDistributionUi',
    'VexMapsDistributionSession',
    'VexMapsDistributionModeConnection',
    'mode.activate',
    'VexMapsDistributionModeDeliveryRouteConvergenceRelay',
    'modeProjections + deliveryRouteProjections',
    'requestedModeControl',
    'acceptModeDeliveryRouteOutput',
  ]) {
    assert.ok(live.includes(required), 'missing Maps witness: ' + required);
  }

  assert.ok(live.includes("Relay owns the relationship question, not Mode or DeliveryRoute."));
});

test('VEXARCHITECTURE LIVE: source snapshot and exact blob coordinates are visible', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  assert.ok(live.includes('4d357c48eb5a25797513708f800e61a87e0195c0'));
  for (const blob of [
    'c1a82ee96ad0944b956301672353a20978186162',
    '4c30cc3d0f10c041c19ece4924b5d6b0f89abdac',
    'c49c7132d4977795365390120dbcf20934242799',
    '1e9d6c2dcf412180e57471210ab380883028209c',
    'c5c2f543f7de94e50be989b7f45133fc60effd00',
    'bc7f9fc00d05316965fa87dbce18108f2b52f066',
    'e7b0d958fd3427dc44dc451ee18e05e5c198c767',
    '0ccf546b276935aeb827e7963b06200cc729a39d',
    '1333d2d88d6541c3e10a914f8962390d42f69255',
  ]) {
    assert.ok(live.includes(blob), 'missing source blob coordinate ' + blob);
  }
});

test('VEXARCHITECTURE LIVE: copy-paste structure survives without interactive state', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  assert.ok(live.includes('Copy/paste chunk A · full walk'));
  assert.ok(live.includes('Copy/paste chunk B · current-source walk'));
  assert.ok(live.includes('Copy/paste chunk C · current-source walk'));
  assert.ok(live.includes('Container'));
  assert.ok(live.includes('Member'));
  assert.ok(live.includes('Next edge'));
  assert.ok(live.includes('white-space:pre-wrap'));
  assert.ok(live.includes('overflow-wrap:anywhere'));
  assert.equal(live.includes('<details'), false);
});

test('VEXARCHITECTURE LIVE: simple localized fallbacks match English source text', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');
  const strings = json('data/strings/source/pages/vexarchitecture-live-demonstration.json');
  const decode = value => value
    .replace(/&rarr;/g, '→')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  const matches = [...live.matchAll(/<([a-z0-9]+)\b[^>]*data-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi)];
  const mismatches = [];
  for (const match of matches) {
    if (/<[^>]+>/.test(match[3])) continue;
    const source = strings[match[2]]?.strings?.en?.text;
    if (source === undefined) continue;
    if (decode(match[3]) !== decode(source)) mismatches.push(match[2]);
  }

  assert.deepEqual(mismatches, []);
});

test('VEXARCHITECTURE LIVE: page strings cover every bound localization key', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');
  const strings = json('data/strings/source/pages/vexarchitecture-live-demonstration.json');
  const keys = [...live.matchAll(/\bdata-i18n(?:-alt|-aria)?=["']([^"']+)["']/g)]
    .map(match => match[1]);
  const missing = [...new Set(keys)].filter(key => !strings[key]);

  assert.deepEqual(missing, []);
  assert.equal(
    strings._meta.sourceProvenance.guideRevision,
    'DEVELOPMENT_STANDARD_4_N_LIVE_DEMONSTRATION',
  );
});

test('VEXARCHITECTURE LIVE: node and Development Standard navigation register the companion', () => {
  const nodes = json('data/nodes.json');
  const arcs = json('data/arcs-v2.json');
  const node = nodes.find(item => item.slug === 'vexarchitecture-live-demonstration');

  assert.ok(node);
  assert.equal(node.id, 123);
  assert.ok(node.arcKeys.includes('development_standard'));
  assert.ok(node.arcKeys.includes('architecture'));

  const living = arcs.development_standard.sections.find(
    section => section.label === 'Living Demonstrations',
  );
  assert.ok(living);
  assert.deepEqual(living.slugs, ['vexarchitecture-live-demonstration']);
  assert.ok(
    arcs.architecture.sections.some(
      section => section.slugs.includes('vexarchitecture-live-demonstration'),
    ),
  );
});

// [VXG RealForever]
