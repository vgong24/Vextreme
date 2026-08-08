'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicAtlas = require('../data/process-atlas/pat-01-public-synthetic.json');
const {
  PROVIDER_SCHEMA_VERSION,
  PROVIDER_REF,
  REPOSITORY_REF,
  QUESTION_CLASSES,
  buildPublicOrientationProviderReceipt,
} = require('../lib/public-orientation-provider');

const ROOT = path.join(__dirname, '..');
const PROVIDER_PATH = path.join(ROOT, 'lib', 'public-orientation-provider.js');
const DOC_PATH = path.join(ROOT, 'docs', 'process', 'public-orientation-provider.md');
const OBSERVED_AT = '2026-08-08T11:00:00Z';
const ACCEPTED_MAIN_REF = 'github.commit.vextreme.3222fdc8959d6929b189f283fbe48ba2abe22608';

function currentEvidence(overrides = {}) {
  return {
    repositoryRef: REPOSITORY_REF,
    sourceRef: ACCEPTED_MAIN_REF,
    liveSourceRefOrNull: ACCEPTED_MAIN_REF,
    currentState: 'CURRENT',
    currentWorkRef: null,
    currentEntryRefs: [ACCEPTED_MAIN_REF],
    currentAcceptedRefs: [ACCEPTED_MAIN_REF],
    priorAcceptedRefs: [],
    supersededRefs: [],
    nextEligibleRefs: [],
    nextHeldRefs: [],
    exactNextActionRef: null,
    coordination: {
      liveStatus: 'available',
      valid: true,
      claims: [],
    },
    ...overrides,
  };
}

function build(evidence = currentEvidence(), atlas = structuredClone(publicAtlas)) {
  return buildPublicOrientationProviderReceipt({
    currentWorkEvidence: evidence,
    processAtlas: atlas,
    observedAt: OBSERVED_AT,
  });
}

const REQUIRED_TOP_LEVEL_KEYS = [
  'schemaVersion', 'providerRef', 'providerClass', 'repositoryRef', 'visibility',
  'projectionScope', 'observedAt', 'freshnessState', 'publicationState', 'currentState',
  'current', 'purposeState', 'functionState', 'capabilityState', 'edges',
  'questionCoverage', 'authorityEnvelope', 'effectEnvelope', 'resourceEnvelope',
  'currentClaimRefs', 'conflictingClaimRefs', 'relayState', 'unknownRefs', 'attentions',
  'blockers', 'exactNextActionRef', 'privateStateRefs', 'currentContext', 'sourceRefs',
].sort();

test('PUBLIC0: accepted PAT fixture plus current public evidence forms one canonical receipt', () => {
  const receipt = build();
  assert.deepEqual(Object.keys(receipt).sort(), REQUIRED_TOP_LEVEL_KEYS);
  assert.equal(receipt.schemaVersion, PROVIDER_SCHEMA_VERSION);
  assert.equal(receipt.providerRef, PROVIDER_REF);
  assert.equal(receipt.providerClass, 'PUBLIC_VEXTREME');
  assert.equal(receipt.repositoryRef, REPOSITORY_REF);
  assert.equal(receipt.visibility, 'PUBLIC');
  assert.equal(receipt.projectionScope, 'PUBLIC_SAFE');
  assert.equal(receipt.currentState, 'CURRENT');
  assert.equal(receipt.freshnessState.selectedSourceClass, 'LIVE');
  assert.equal(receipt.publicationState.publicationAuthority, false);
  assert.equal(receipt.authorityEnvelope.state, 'HELD');
  assert.deepEqual(receipt.authorityEnvelope.allowedEffectRefs, []);
  assert.deepEqual(receipt.privateStateRefs, []);
  assert.equal(receipt.questionCoverage.length, QUESTION_CLASSES.length);
  assert.ok(receipt.sourceRefs.includes('synthetic.source.process-atlas-demo'));
  assert.ok(receipt.sourceRefs.includes(ACCEPTED_MAIN_REF));
});

test('PUBLIC1: validated active public work remains distinct from accepted main', () => {
  const evidence = currentEvidence({
    currentWorkRef: 'work.vextreme.public-example.001',
    currentEntryRefs: ['github.pr.vextreme.999'],
    exactNextActionRef: 'work.vextreme.public-example.001',
    coordination: {
      liveStatus: 'available',
      valid: true,
      claims: [{
        workRef: 'work.vextreme.public-example.001',
        repository: REPOSITORY_REF,
        status: 'active',
        coordinationOnly: true,
        implementationAuthority: false,
      }],
    },
  });
  const receipt = build(evidence);
  assert.deepEqual(receipt.currentClaimRefs, ['work.vextreme.public-example.001']);
  assert.deepEqual(receipt.current.currentAcceptedRefs, [ACCEPTED_MAIN_REF]);
  assert.equal(receipt.current.currentWorkRef, 'work.vextreme.public-example.001');
  assert.notEqual(receipt.current.currentWorkRef, receipt.current.currentAcceptedRefs[0]);
  assert.equal(receipt.publicationState.publicationAuthority, false);
});

test('PUBLIC2: missing or unavailable live coordination stays UNKNOWN and grants no authority', () => {
  const missing = currentEvidence();
  delete missing.coordination;
  const missingReceipt = build(missing);
  assert.equal(missingReceipt.currentState, 'UNKNOWN');
  assert.deepEqual(missingReceipt.currentClaimRefs, []);
  assert.deepEqual(missingReceipt.capabilityState.activeCapabilityRefs, []);
  assert.deepEqual(missingReceipt.authorityEnvelope.allowedEffectRefs, []);
  assert.ok(missingReceipt.attentions.includes('attention.public-work-coordination'));

  const unavailable = currentEvidence({ coordination: { liveStatus: 'unavailable', valid: false, claims: [] } });
  const unavailableReceipt = build(unavailable);
  assert.equal(unavailableReceipt.currentState, 'UNKNOWN');
  assert.equal(unavailableReceipt.exactNextActionRef, 'action.refresh-public-work-coordination');
  assert.ok(unavailableReceipt.blockers.includes('blocker.public-work-coordination-unavailable'));
});

test('PUBLIC3: PAT projection receipt hash and count mismatch fail closed', () => {
  const badHash = structuredClone(publicAtlas);
  badHash.projectionReceipt.contentSha256 = '0'.repeat(64);
  assert.throws(() => build(currentEvidence(), badHash), /hash mismatch/);

  const badCount = structuredClone(publicAtlas);
  badCount.projectionReceipt.publicNodeCount += 1;
  assert.throws(() => build(currentEvidence(), badCount), /count mismatch/);
});

test('PUBLIC4: any PAT ref outside the synthetic namespace fails closed', () => {
  const unsafe = structuredClone(publicAtlas);
  unsafe.nodes[0].sourceRefs[0] = 'public.source.not-synthetic';
  assert.throws(() => build(currentEvidence(), unsafe), /synthetic namespace/);
});

test('PUBLIC5: privateStateRefs cannot become non-empty', () => {
  const receipt = build();
  assert.deepEqual(receipt.privateStateRefs, []);
  const evidence = currentEvidence();
  evidence.privateStateRefs = ['public.state.should-not-be-accepted'];
  assert.throws(() => build(evidence), /privateStateRefs is not allowed/);
});

test('PUBLIC6: visibility and projection scope are fixed public-safe outputs', () => {
  const receipt = build();
  assert.equal(receipt.visibility, 'PUBLIC');
  assert.equal(receipt.projectionScope, 'PUBLIC_SAFE');
  const evidence = currentEvidence();
  evidence.visibility = 'PRIVATE';
  assert.throws(() => build(evidence), /visibility is not allowed/);
});

test('PUBLIC7: publication authority is always false', () => {
  assert.equal(build().publicationState.publicationAuthority, false);
  const evidence = currentEvidence();
  evidence.publicationAuthority = true;
  assert.throws(() => build(evidence), /publicationAuthority is not allowed/);
});

test('PUBLIC8: adapter source has zero network, process, or filesystem-write effect surface', () => {
  const source = fs.readFileSync(PROVIDER_PATH, 'utf8');
  assert.doesNotMatch(source, /node:fs|child_process|node:http|node:https|\bfetch\s*\(|\bwriteFile|\bappendFile|\bspawn\s*\(|\bexec(?:File)?\s*\(/);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('unexpected network effect'); };
  try {
    assert.equal(build().providerClass, 'PUBLIC_VEXTREME');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PUBLIC9: same normalized inputs and observedAt produce stable output without input mutation', () => {
  const atlas = structuredClone(publicAtlas);
  const evidence = currentEvidence();
  const beforeAtlas = JSON.stringify(atlas);
  const beforeEvidence = JSON.stringify(evidence);
  const first = buildPublicOrientationProviderReceipt({ currentWorkEvidence: evidence, processAtlas: atlas, observedAt: OBSERVED_AT });
  const second = buildPublicOrientationProviderReceipt({
    currentWorkEvidence: structuredClone(evidence),
    processAtlas: structuredClone(atlas),
    observedAt: OBSERVED_AT,
  });
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(atlas), beforeAtlas);
  assert.equal(JSON.stringify(evidence), beforeEvidence);
});

test('PUBLIC10: content-absent output does not project arbitrary PAT body text or non-public repository refs', () => {
  const receipt = build();
  assert.doesNotMatch(JSON.stringify(receipt), /Synthetic journey question/);

  const outsideRepositoryRef = ['github', 'commit', 'other-repository', 'deadbeef'].join('.');
  const evidence = currentEvidence({ sourceRef: outsideRepositoryRef });
  assert.throws(() => build(evidence), /outside the public repository reference boundary/);

  const checkedIn = `${fs.readFileSync(PROVIDER_PATH, 'utf8')}\n${fs.readFileSync(DOC_PATH, 'utf8')}`;
  for (const match of checkedIn.matchAll(/github\.(?:commit|pr|issue)\.([a-z0-9-]+)\./gi)) {
    assert.equal(match[1].toLowerCase(), 'vextreme');
  }
});

test('PUBLIC11: current-work evidence and PAT semantics remain distinct source classes', () => {
  const receipt = build();
  const atlasEdge = receipt.edges.find(edge => edge.edgeClass === 'SOURCE_ORIGIN');
  const liveEdge = receipt.edges.find(edge => edge.edgeClass === 'VALIDATED_BY');
  assert.equal(atlasEdge.toRef, publicAtlas.atlasRef);
  assert.equal(liveEdge.toRef, ACCEPTED_MAIN_REF);
  assert.ok(atlasEdge.sourceRefs.every(ref => ref.startsWith('synthetic.')));
  assert.ok(liveEdge.sourceRefs.every(ref => ref.startsWith('github.commit.vextreme.')));
  assert.ok(receipt.current.currentAcceptedRefs.every(ref => !ref.startsWith('synthetic.')));
  assert.ok(receipt.sourceRefs.some(ref => ref.startsWith('synthetic.')));
  assert.ok(receipt.sourceRefs.some(ref => ref.startsWith('github.commit.vextreme.')));
});

// [VXG RealForever]
