'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const projection = require('../data/orientation-map.json');
const publicAtlas = require('../data/process-atlas/pat-01-public-synthetic.json');
const {
  BASELINE_MAPS,
  DEFAULT_MAX_MAPS,
  PUBLIC_PROVIDER_SCHEMA_VERSION,
  PUBLIC_PROVIDER_REF,
  PUBLIC_PROVIDER_QUESTION_CLASSES,
  normalizeRepoPath,
  selectOrientationContext,
  buildPublicOrientationProviderReceipt,
  parseArgs,
} = require('../lib/select-orientation-context');

function ids(packet) {
  return packet.maps.map(map => map.id);
}

function publicEvidence(currentState = 'CURRENT') {
  const commitRef = 'github.commit.vextreme.3222fdc8959d6929b189f283fbe48ba2abe22608';
  return {
    repositoryRef: 'vgong24/Vextreme',
    sourceRef: commitRef,
    observedAt: '2026-08-08T11:30:00Z',
    currentState,
    liveSourceRefOrNull: currentState === 'CURRENT' ? commitRef : null,
    currentWorkRef: null,
    currentEntryRefs: [commitRef],
    currentAcceptedRefs: [commitRef],
    priorAcceptedRefs: [],
    supersededRefs: [],
    nextEligibleRefs: [],
    nextHeldRefs: [],
    currentClaimRefs: [],
    conflictingClaimRefs: [],
    exactNextActionRef: null,
  };
}

test('ORIENTATION-PACKET: page/navigation task selects page health plus the safety baseline', () => {
  const packet = selectOrientationContext(projection, {
    task: 'Fix a public page whose navigation and FAB are missing',
    paths: ['pages/example.html'],
  });
  assert.deepEqual(ids(packet).slice(0, 2), BASELINE_MAPS);
  assert.ok(ids(packet).includes('page-health'));
  assert.equal(packet.status, 'routed');
});

test('ORIENTATION-PACKET: exact question id outranks trigger matches', () => {
  const packet = selectOrientationContext(projection, {
    task: 'architecture dependency',
    questionIds: ['change-impact'],
  });
  const lattice = packet.maps.find(map => map.id === 'lattice');
  assert.ok(lattice);
  assert.ok(lattice.score >= 100);
  assert.ok(lattice.reasons.some(reason => /explicit question/.test(reason)));
});

test('ORIENTATION-PACKET: registered directory contains a changed child path', () => {
  const packet = selectOrientationContext(projection, {
    paths: ['docs/architecture/05-browser.md'],
  });
  assert.ok(ids(packet).includes('architecture'));
  assert.ok(packet.maps.find(map => map.id === 'architecture').reasons.some(reason => /path route/.test(reason)));
});

test('ORIENTATION-PACKET: selection is deterministic, tie-broken, and capped at five maps', () => {
  const request = {
    task: 'cold start onboarding ambiguity generated artifact session current work claim ownership architecture design constraint change impact terrain status page navigation lesson environment private SDK v1 legacy',
    maxMaps: 99,
  };
  const first = selectOrientationContext(projection, request);
  const second = selectOrientationContext(projection, request);
  assert.deepEqual(first, second);
  assert.equal(first.maps.length, DEFAULT_MAX_MAPS);
});

test('ORIENTATION-PACKET: unmatched task remains partial instead of widening', () => {
  const packet = selectOrientationContext(projection, { task: 'flibbertigibbet' });
  assert.deepEqual(ids(packet), BASELINE_MAPS);
  assert.equal(packet.status, 'partial');
  assert.ok(packet.gaps.some(gap => /No task-specific trigger/.test(gap)));
});

test('ORIENTATION-PACKET: an explicit cold-start trigger is routed by the baseline itself', () => {
  const packet = selectOrientationContext(projection, { task: 'onboarding a new instance at cold start' });
  assert.deepEqual(ids(packet), BASELINE_MAPS);
  assert.equal(packet.status, 'routed');
  assert.ok(packet.maps.find(map => map.id === 'cold-start').score > 0);
});

test('ORIENTATION-PACKET: unsafe absolute and parent-traversal paths fail closed', () => {
  assert.throws(() => normalizeRepoPath('/Users/example/private'), /unsafe/);
  assert.throws(() => normalizeRepoPath('C:\\Users\\example\\private'), /unsafe/);
  assert.throws(() => normalizeRepoPath('../Vextreme-SDK/secret'), /unsafe/);
});

test('ORIENTATION-PACKET: private or SDK task selects only the public boundary map', () => {
  const packet = selectOrientationContext(projection, { task: 'inspect private SDK roadmap' });
  assert.ok(ids(packet).includes('public-private-boundary'));
  assert.ok(packet.readOrder.every(read => !/Vextreme-SDK|secret|credential/i.test(read.path)));
  assert.match(packet.boundaries.privateState, /excluded/);
});

test('ORIENTATION-PACKET: unknown question and unregistered safe path remain explicit gaps', () => {
  const packet = selectOrientationContext(projection, {
    questionIds: ['not-a-real-question'],
    paths: ['some/new/file.js'],
  });
  assert.ok(packet.gaps.some(gap => /Unknown question id/.test(gap)));
  assert.ok(packet.gaps.some(gap => /No registered map path/.test(gap)));
});

test('ORIENTATION-PACKET: CLI arguments preserve repeated questions and paths', () => {
  assert.deepEqual(parseArgs([
    '--task', 'fix nav', '--question', 'page-health', '--question', 'change-impact',
    '--path', 'pages/a.html', '--path', 'lib/a.js', '--max-maps', '4', '--json',
  ]), {
    task: 'fix nav',
    questionIds: ['page-health', 'change-impact'],
    paths: ['pages/a.html', 'lib/a.js'],
    maxMaps: 4,
  });
});

test('PUBLIC-ORIENTATION-PROVIDER: accepted PAT-01 plus current public evidence forms the canonical PUBLIC_SAFE receipt', () => {
  const receipt = buildPublicOrientationProviderReceipt({
    atlas: structuredClone(publicAtlas),
    repositoryEvidence: publicEvidence(),
  });

  assert.equal(receipt.schemaVersion, PUBLIC_PROVIDER_SCHEMA_VERSION);
  assert.equal(receipt.providerRef, PUBLIC_PROVIDER_REF);
  assert.equal(receipt.providerClass, 'PUBLIC_VEXTREME');
  assert.equal(receipt.repositoryRef, 'vgong24/Vextreme');
  assert.equal(receipt.visibility, 'PUBLIC');
  assert.equal(receipt.projectionScope, 'PUBLIC_SAFE');
  assert.equal(receipt.currentState, 'CURRENT');
  assert.equal(receipt.freshnessState.selectedSourceClass, 'LIVE');
  assert.equal(receipt.publicationState.lifecycleState, 'PUBLIC');
  assert.equal(receipt.publicationState.publicationAuthority, false);
  assert.equal(receipt.authorityEnvelope.state, 'HELD');
  assert.deepEqual(receipt.authorityEnvelope.allowedEffectRefs, []);
  assert.deepEqual(receipt.privateStateRefs, []);
  assert.equal(receipt.relayState.executionState, 'TASK_STATE_UNKNOWN_DO_NOT_EXECUTE');
  assert.equal(receipt.questionCoverage.length, PUBLIC_PROVIDER_QUESTION_CLASSES.length);
  assert.deepEqual(
    receipt.questionCoverage.map(item => item.questionClass),
    PUBLIC_PROVIDER_QUESTION_CLASSES,
  );
  assert.ok(receipt.sourceRefs.includes('synthetic.source.process-atlas-demo'));
  assert.ok(receipt.sourceRefs.includes(publicEvidence().sourceRef));
  assert.doesNotMatch(JSON.stringify(receipt), /Vextreme-SDK|VexLife|secret|credential/i);
});

test('PUBLIC-ORIENTATION-PROVIDER: equal explicit inputs are deterministic and input-preserving', () => {
  const atlas = structuredClone(publicAtlas);
  const evidence = publicEvidence();
  const beforeAtlas = JSON.stringify(atlas);
  const beforeEvidence = JSON.stringify(evidence);
  const first = buildPublicOrientationProviderReceipt({ atlas, repositoryEvidence: evidence });
  const second = buildPublicOrientationProviderReceipt({
    atlas: structuredClone(publicAtlas),
    repositoryEvidence: publicEvidence(),
  });
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(atlas), beforeAtlas);
  assert.equal(JSON.stringify(evidence), beforeEvidence);
});

test('PUBLIC-ORIENTATION-PROVIDER: stale public currentness stays source-covered but fails closed', () => {
  const receipt = buildPublicOrientationProviderReceipt({
    atlas: structuredClone(publicAtlas),
    repositoryEvidence: publicEvidence('STALE'),
  });
  assert.equal(receipt.currentState, 'STALE');
  assert.equal(receipt.freshnessState.selectedSourceClass, 'UNKNOWN');
  assert.deepEqual(receipt.capabilityState.activeCapabilityRefs, []);
  assert.deepEqual(receipt.capabilityState.blockedCapabilityRefs, ['capability.current-state-answer']);
  assert.ok(receipt.unknownRefs.includes('public.source.fresh-current-state'));
  assert.ok(receipt.blockers.includes('blocker.public-currentness-stale'));
  assert.equal(receipt.exactNextActionRef, 'action.refresh-public-current-state');
  assert.ok(receipt.questionCoverage.every(item => item.missingSourceRefs.length === 0));
});

test('PUBLIC-ORIENTATION-PROVIDER: current evidence changes remain visible without changing authority', () => {
  const leftEvidence = publicEvidence();
  const rightEvidence = publicEvidence();
  rightEvidence.currentWorkRef = 'work.vextreme.public-example.001';
  rightEvidence.currentClaimRefs = ['claim.vextreme.public-example.001'];
  const left = buildPublicOrientationProviderReceipt({ atlas: publicAtlas, repositoryEvidence: leftEvidence });
  const right = buildPublicOrientationProviderReceipt({ atlas: publicAtlas, repositoryEvidence: rightEvidence });
  assert.notDeepEqual(left.current, right.current);
  assert.notDeepEqual(left.currentClaimRefs, right.currentClaimRefs);
  assert.equal(left.publicationState.publicationAuthority, false);
  assert.equal(right.publicationState.publicationAuthority, false);
  assert.equal(left.authorityEnvelope.state, 'HELD');
  assert.equal(right.authorityEnvelope.state, 'HELD');
});

test('PUBLIC-ORIENTATION-PROVIDER: private repository or sensitive source values fail closed', () => {
  const privateEvidence = publicEvidence();
  privateEvidence.sourceRef = 'github.commit.vexlife.deadbeef';
  assert.throws(() => buildPublicOrientationProviderReceipt({
    atlas: structuredClone(publicAtlas),
    repositoryEvidence: privateEvidence,
  }), /non-public provider or sensitive state/);

  const privateAtlas = structuredClone(publicAtlas);
  privateAtlas.sources[0].sourceRef = 'private.source.secret';
  assert.throws(() => buildPublicOrientationProviderReceipt({
    atlas: privateAtlas,
    repositoryEvidence: publicEvidence(),
  }), /non-public provider or sensitive state/);
});

test('PUBLIC-ORIENTATION-PROVIDER: malformed PAT boundary and unsupported current evidence fail closed', () => {
  const unsafeAtlas = structuredClone(publicAtlas);
  unsafeAtlas.projectionReceipt.visibilityProfileRefs = [];
  assert.throws(() => buildPublicOrientationProviderReceipt({
    atlas: unsafeAtlas,
    repositoryEvidence: publicEvidence(),
  }), /public-safe visibility profile/);

  const missingLive = publicEvidence();
  missingLive.liveSourceRefOrNull = null;
  assert.throws(() => buildPublicOrientationProviderReceipt({
    atlas: structuredClone(publicAtlas),
    repositoryEvidence: missingLive,
  }), /CURRENT public evidence requires liveSourceRefOrNull/);

  const extraField = publicEvidence();
  extraField.publicationAuthority = true;
  assert.throws(() => buildPublicOrientationProviderReceipt({
    atlas: structuredClone(publicAtlas),
    repositoryEvidence: extraField,
  }), /is not allowed/);
});

test('PUBLIC-ORIENTATION-PROVIDER: pure projection performs no filesystem observation', () => {
  const originalRead = fs.readFileSync;
  fs.readFileSync = () => { throw new Error('unexpected filesystem read'); };
  try {
    const receipt = buildPublicOrientationProviderReceipt({
      atlas: structuredClone(publicAtlas),
      repositoryEvidence: publicEvidence(),
    });
    assert.equal(receipt.providerClass, 'PUBLIC_VEXTREME');
  } finally {
    fs.readFileSync = originalRead;
  }
});

// [VXG RealForever]
