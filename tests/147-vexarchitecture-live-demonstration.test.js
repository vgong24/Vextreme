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
    'ExecutionRootProvider',
    'LogPersistenceProvider',
    'LoggerProvider',
    'LogHistoryPersistenceQueue',
    'VexDependencyFactory.resolveAny(ThemeModeFamilyProvider)',
    'recursively resolve every declared prerequisite before provider.build(...)',
    'provider.build(VexDependencyBuildScope(resolvedPrerequisites))',
    'ThemeModeStoreProvider',
    'SharedPreferencesThemeModeStore',
    'observeThemeModeStore',
    'VexExecution.observe',
    'RuntimeProvider',
    'currentAppActions = {',
    'AppActionRegistrations.dispatch(AppActionRequest)',
    'rememberVexStreamPlaybackExperience()',
    'VexStreamPlaybackFamily',
    'VexStreamPlayerPartner.Connection.Request',
    'VexStreamPlayerStore',
    'Media3PlayerConnection',
    'VexStreamPlaybackService',
    'VexStreamPlaybackWidget',
    'CurrentVexStreamPlaybackExperience',
    'VexMapsMapSurface',
    'VexPartner',
    'CgmPartner',
    'CgmPartnerLab',
    'ConnectedPenPartner',
    'InsulinPumpPartner',
    'InsulinPartnerLab',
    'RoomCgmStore',
  ]) {
    assert.ok(live.includes(bridge), 'missing explicit traversal bridge: ' + bridge);
  }
  assert.ok(live.includes('ThemeMode · origin witness'));
  assert.ok(live.includes('VexStream Playback · relationship witness'));
  assert.ok(live.includes('VexMaps Distribution · relationship witness'));
  assert.ok(live.includes('VexPartner · external-participant circuit'));
  assert.ok(live.includes('After walking four systems'));
  assert.ok(live.includes('Origin witness'));
  assert.ok(live.includes('Playback relationship witness'));
  assert.ok(live.includes('Relay relationship witness'));
  assert.ok(live.includes('External-participant relationship witness'));
  assert.equal(live.includes('Current-source exemplar'), false);
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
    'Boolean — did the physical write commit?',
    'VexMethod.Result&lt;ThemeMode, Unit&gt;',
    'unsettledSelection: Parameter.Mode?',
    'ThemeModeFamily.DisplayState',
    'DebugMenuScreenContent',
  ]) {
    assert.ok(live.includes(required), 'missing scope/edge witness: ' + required);
  }

  assert.equal(live.includes('used later'), false);
  assert.equal(live.includes('later used'), false);
  assert.ok(live.includes('theme-step-20'));
  assert.ok(live.includes('same concrete Store resolved in Step 05'));
  assert.ok(live.includes('bound Method lawfully returns Success / Failure'));
  assert.ok(live.includes('Family / Execution continuation forms Error'));
  assert.ok(live.includes('Copy this dependency pattern'));
  assert.ok(live.includes('VexDependencyProvider.named(...)'));
  assert.ok(live.includes('copy this pattern rather than adding a parallel path'));
  assert.ok(live.includes('Dependency README · conceptual/lifetime contract'));
  assert.ok(live.includes('current source/tests own implementation details'));
  assert.ok(live.includes('VexDependencyFactoryTest.kt · executable pattern proof'));
});

test('VEXARCHITECTURE LIVE: VexStream walk follows current Direct Family Partner Store Service and Widget owners', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  for (const required of [
    'VexStream current relationship circuit',
    'VexStreamPlaybackFamily',
    'Act.Accepted',
    'realizationBegin',
    'VexStreamPlaybackFamily.Act.Method',
    'VexStreamPlayerPartner.Connection.Request',
    'VexExecution custody',
    'VexStreamPlayerPartner.Signal.Playback',
    'VexStreamPlayerStore',
    'observeVexStreamPlaybackPlayerStore',
    'VexStreamPlaybackService : MediaSessionService',
    'Media3PlayerConnection',
    'VexStreamPlaybackWidget',
    'activateVexStreamPlayback',
    'request acknowledgement != later Player truth',
  ]) {
    assert.ok(live.includes(required), 'missing current VexStream witness: ' + required);
  }

  for (const stale of [
    'Media3VexStreamPlaybackConnection',
    'Media3VexStreamCurrentPlaybackObserver',
    'BackgroundServiceRelay',
    'VexServiceScope&lt;',
  ]) {
    assert.equal(live.includes(stale), false, 'stale VexStream/Service witness survived: ' + stale);
  }
});

test('VEXARCHITECTURE LIVE: Service walk ends in sustained-realization guidance rather than a generic root', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  for (const required of [
    'S5',
    'VexStreamPlaybackService : MediaSessionService',
    'MediaSession + ExoPlayer + Media3PlayerConnection',
    'Service-local custody',
    'S7',
    'VexMapsNavigationService',
    'sustained platform realization',
    'SAME REPEATED QUESTION',
    '!= SAME LIFECYCLE ALGORITHM',
    '!= generic VexService root',
    '!= universal Service.current',
    '!= mandatory VexExecution',
    '!= typed ServiceScope architecture law',
  ]) {
    assert.ok(live.includes(required), 'missing Service subtraction edge: ' + required);
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

test('VEXARCHITECTURE LIVE: Partner walk separates reusable grammar from current Store/Family realization', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  for (const required of [
    'Copy/paste chunk D · external-participant walk',
    'VexPartner · external-participant circuit',
    'REUSABLE PARTNER INBOUND BOUNDARY',
    'consumer-earned admission / reconciliation boundary',
    'CGM / INSULIN CONCRETE REALIZATION',
    'Source + Signal + Connection',
    'BleDecoder + HttpDecoder',
    'Signal → Observation → Receiver',
    'CgmStore.commit',
    'CgmPartnerLab.kt wiring',
    'RoomCgmStore',
    'process restart ≠ new Source history',
    'ConnectedPenPartner',
    'no imported CGM contiguous-gap semantics',
    'InsulinFamily',
    'InsulinPumpPartner.Connection',
    'InsulinPartnerLab.kt wiring',
    'EFFECT_REQUESTED',
    'PARTNER_ACKNOWLEDGED',
    'ACKNOWLEDGEMENT ≠ PHYSICAL OUTCOME',
    'DeliveryObserved',
    'one complete current Family ↔ Partner realization',
  ]) {
    assert.ok(live.includes(required), 'missing reasoning-preserving Partner circuit witness: ' + required);
  }

  assert.ok(
    live.includes('More elapsed time') === false,
    'Live walk should show source relationships; scale-vs-longevity judgment belongs in the Builder Guide',
  );
  assert.ok(live.includes('Read Store → Family as the CGM/insulin concrete realization after Receiver'));
  assert.ok(live.includes('Partner is earned by the independently-owned external-participant question first'));
  assert.ok(live.includes('implementing the VexPartner contract is the source expression of that earned relationship, not the evidence that creates it'));
  assert.ok(live.includes('Names, interfaces, and historical placement are never sufficient to admit or reject Partner by themselves.'));
  assert.equal(live.includes('not another architecture referendum'), false);
});

test('VEXARCHITECTURE LIVE: accepted snapshots and current Android candidate coordinates are visible', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  assert.ok(live.includes('305a09eac1fabebcf2241bd207386950f41121f2'));
  assert.ok(live.includes('7800c17909fd03d1170ec0211a6632172c87d1af'));
  assert.ok(live.includes('d857a92371555472e0303b18eadf353da2a868d6'));
  assert.equal(live.includes('0b3ee01e68508c4bba5c18dc38259c931a195f2a'), false);
  assert.equal(live.includes('544c6bbfbf36a8c43f5a094796132cf70478a0c9'), false);

  for (const blob of [
    'c1a82ee96ad0944b956301672353a20978186162',
    '4c30cc3d0f10c041c19ece4924b5d6b0f89abdac',
    '3fc3cdfa165b8122029cccfd2cfbd4bbe3a671cb',
    '9df5c797c839c02a3be1eb0cd37685d05a1a89a0',
    '15530b17dd478ad747fbeb513ace198147c3b040',
    '1e9d6c2dcf412180e57471210ab380883028209c',
    'e7b0d958fd3427dc44dc451ee18e05e5c198c767',
    '0ccf546b276935aeb827e7963b06200cc729a39d',
  ]) {
    assert.ok(live.includes(blob), 'missing retained source blob coordinate ' + blob);
  }
});

test('VEXARCHITECTURE LIVE: copy-paste structure survives without interactive state', () => {
  const live = read('pages/vexarchitecture-live-demonstration.html');

  assert.ok(live.includes('Copy/paste chunk A · full walk'));
  assert.ok(live.includes('Copy/paste chunk B · Playback relationship walk'));
  assert.ok(live.includes('Copy/paste chunk C · Relay relationship walk'));
  assert.ok(live.includes('Copy/paste chunk D · external-participant walk'));
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
    'DEVELOPMENT_STANDARD_6_N_CURRENT_DIRECT_FAMILY_PARTNER_SERVICE_SUBTRACTION_LIVE',
  );
  assert.equal(
    strings._meta.sourceProvenance.currentSourceSnapshot,
    'd857a92371555472e0303b18eadf353da2a868d6',
  );
  assert.equal(
    strings._meta.sourceProvenance.partnerSourceSnapshot,
    '7800c17909fd03d1170ec0211a6632172c87d1af',
  );
  assert.equal(
    strings._meta.sourceProvenance.partnerAcceptedMerge,
    '7800c17909fd03d1170ec0211a6632172c87d1af',
  );
  assert.equal('backgroundServicePullRequest' in strings._meta.sourceProvenance, false);
  assert.equal('typedScopePullRequest' in strings._meta.sourceProvenance, false);
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
