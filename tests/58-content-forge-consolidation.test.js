'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const forge = require('../tools/vex-content-forge/consolidate_workmaps');
const { fixtureRepo, withRepo } = require('./fixtures/content-forge-consolidation-fixture');

test('follows explicit map chain and emits deterministic proposal buckets', () => {
  withRepo(root => {
    fixtureRepo(root);
    const first = forge.compileProposal(root);
    const second = forge.compileProposal(root);
    assert.equal(forge.stableJson(first), forge.stableJson(second));
    assert.deepEqual(first.generatedFrom.mapChain.map(item => item.revision), [1, 2, 3]);
    assert.equal(first.counts.mapsRead, 3);
    assert.equal(first.counts.normalizedRecords, 5);
    assert.equal(first.counts.uniqueRoutes, 4);
    assert.equal(first.counts.exactRouteLineageFamilies, 1);
    assert.equal(first.counts.canonicalIdentityLineageFamilies, 1);
    assert.equal(first.counts.invariantErrors, 0);
    assert.equal(first.counts.invariantHolds, 0);
    const classes = Object.fromEntries(first.destinationClasses.map(item => [item.destinationClass, item.count]));
    assert.deepEqual(classes, {
      EXISTING_CANONICAL_PAGE_VARIANT: 1,
      EXISTING_CANONICAL_SLOT_PAGE_ABSENT: 2,
      PROTECTED_METADATA_ONLY: 1,
      SOURCE_ONLY_HOLD: 1,
    });
    const alpha = first.lineages.exactRoute.find(item => item.route === '/alpha');
    assert.ok(alpha);
    assert.equal(alpha.byteDistinct, true);
    assert.equal(alpha.reviewRequired, true);
    const alphaQueue = first.ambiguityQueue.filter(item => item.route === '/alpha');
    assert.equal(alphaQueue.length, 2);
    assert.ok(alphaQueue.every(item => item.reasons.includes('MULTI_CAPTURE_SAME_ROUTE_RECONCILIATION')));
  });
});

test('matching titles alone never form an alias or canonical lineage', () => {
  withRepo(root => {
    fixtureRepo(root);
    const proposal = forge.compileProposal(root);
    const other = proposal.records.find(record => record.source.route === '/other');
    assert.equal(other.destination.canonicalIdentity, null);
    assert.equal(proposal.lineages.canonicalIdentity.some(family => family.routes.includes('/other')), false);
    assert.equal(proposal.effectBoundary.titleSimilarityAliasInferenceAllowed, false);
  });
});

test('count differences become explicit HOLD instead of cosmetic reconciliation', () => {
  withRepo(root => {
    fixtureRepo(root);
    const pointerPath = path.join(root, 'docs', 'ingestion', 'workmaps', 'content-forge-current.json');
    const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
    pointer.observedPages = 6;
    fs.writeFileSync(pointerPath, `${JSON.stringify(pointer, null, 2)}\n`);
    const terminalPath = path.join(root, 'docs', 'ingestion', 'workmaps', 'content-forge-r003.json');
    const terminal = JSON.parse(fs.readFileSync(terminalPath, 'utf8'));
    terminal.cumulativeState.observedPages = 6;
    fs.writeFileSync(terminalPath, `${JSON.stringify(terminal, null, 2)}\n`);
    const formationPath = path.join(root, 'docs', 'ingestion', 'workmaps', 'content-forge-post-breadth-consolidation-formation.json');
    const formation = JSON.parse(fs.readFileSync(formationPath, 'utf8'));
    formation.knownHolds.countReconciliation.sourceCaptureInputPages = 6;
    formation.knownHolds.countReconciliation.terminalScannerObservedPages = 6;
    fs.writeFileSync(formationPath, `${JSON.stringify(formation, null, 2)}\n`);
    const proposal = forge.compileProposal(root);
    const hold = proposal.invariantFindings.find(item => item.code === 'NORMALIZED_RECORD_COUNT_DIFFERS_FROM_SCANNER_OBSERVED_PAGES');
    assert.ok(hold);
    assert.equal(hold.severity, 'HOLD');
    assert.equal(hold.scannerObservedPages, 6);
    assert.equal(hold.normalizedRecords, 5);
    assert.equal(proposal.counts.invariantErrors, 0);
  });
});

test('unsafe work-map paths are rejected', () => {
  assert.throws(() => forge.assertWorkmapPath('../secret.json'), /unsafe repository path/);
  assert.throws(() => forge.assertWorkmapPath('data/not-a-workmap.json'), /escapes docs\/ingestion\/workmaps/);
});

test('output and check modes are byte deterministic', () => {
  withRepo(root => {
    fixtureRepo(root);
    const output = 'docs/ingestion/workmaps/content-forge-consolidation-proposal.json';
    assert.equal(forge.runCli(['--repo-root', root, '--output', output]), 0);
    assert.equal(forge.runCli(['--repo-root', root, '--check', output]), 0);
    const absolute = path.join(root, ...output.split('/'));
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    parsed.counts.normalizedRecords += 1;
    fs.writeFileSync(absolute, `${JSON.stringify(parsed, null, 2)}\n`);
    assert.equal(forge.runCli(['--repo-root', root, '--check', output]), 1);
  });
});


test('reference-only nodes are not page observations while capture variants remain lineage evidence', () => {
  const referenceOnly = {
    workNodeRef: 'workmap.source-reference.future',
    nodeKind: 'REFERENCED_FUTURE_SOURCE_PAGE',
    state: 'REFERENCED_NOT_CARRIED',
    source: { route: '/future' },
    destinationGrounding: { placementState: 'NOT_EVALUATED' },
  };
  const captureVariant = {
    workNodeRef: 'workmap.source-capture.alpha-alt',
    nodeKind: 'SOURCE_CAPTURE_VARIANT_OBSERVATION',
    state: 'OBSERVED_DUPLICATE_SEMANTIC_CAPTURE',
    source: {
      route: '/alpha',
      pageId: 'page-alpha-alt',
      contentRecordSha256: 'f'.repeat(64),
      renderedHtmlMaterializedSeparately: false,
    },
    destinationGrounding: { disposition: 'CAPTURE_LINEAGE_ONLY' },
  };
  assert.equal(forge.isSourcePageObservation(referenceOnly), false);
  assert.equal(forge.isSourcePageObservation(captureVariant), true);
});

test('destination protection language alone does not classify public source as protected metadata', () => {
  const node = {
    workNodeRef: 'workmap.source-page.public-endpoint',
    nodeKind: 'SOURCE_PAGE_OBSERVATION',
    state: 'OBSERVED_PREPLACEMENT',
    source: {
      route: '/public-endpoint',
      pageId: 'page-public',
      capturedPageSha256: 'f'.repeat(64),
      publicMaterializationState: 'PUBLIC_SAFE_SOURCE_EVIDENCE_MATERIALIZED',
    },
    destinationGrounding: {
      currentDisposition: 'EXISTING_SEMANTIC_SLOT',
      placementState: 'EXISTING_OPERATIONAL_PAGE_PROTECTED_ENDPOINTS_CURRENTLY_BOUND',
    },
  };
  assert.notEqual(forge.classifyDestination(node).destinationClass, 'PROTECTED_METADATA_ONLY');
});

test('source-capture input mismatch remains a first-class HOLD independent of normalized page count', () => {
  withRepo(root => {
    fixtureRepo(root);
    const formationPath = path.join(root, 'docs', 'ingestion', 'workmaps', 'content-forge-post-breadth-consolidation-formation.json');
    const formation = JSON.parse(fs.readFileSync(formationPath, 'utf8'));
    formation.knownHolds.countReconciliation.sourceCaptureInputPages = 6;
    fs.writeFileSync(formationPath, `${JSON.stringify(formation, null, 2)}\n`);
    const proposal = forge.compileProposal(root);
    assert.equal(proposal.counts.normalizedRecords, 5);
    const hold = proposal.invariantFindings.find(item =>
      item.code === 'SOURCE_CAPTURE_INPUT_COUNT_DIFFERS_FROM_SCANNER_OBSERVED_PAGES');
    assert.ok(hold);
    assert.equal(hold.sourceCaptureInputPages, 6);
    assert.equal(hold.scannerObservedPages, 5);
    assert.equal(proposal.counts.invariantErrors, 0);
  });
});

test('real post-breadth snapshot is generated from 249 scanner observations with separate capture hold', () => {
  const root = path.resolve(__dirname, '..');
  const proposal = forge.compileProposal(root);
  assert.equal(proposal.counts.normalizedRecords, 249);
  assert.equal(proposal.counts.sourceCaptureInputPages, 250);
  assert.equal(proposal.counts.terminalScannerObservedPages, 249);
  assert.equal(proposal.counts.referencedNotCarried, 6);
  assert.equal(proposal.counts.exactRouteLineageFamilies, 1);
  assert.equal(proposal.counts.invariantErrors, 0);
  assert.equal(proposal.destinationClasses.find(item => item.destinationClass === 'PROTECTED_METADATA_ONLY').count, 1);
  const captureFamily = proposal.lineages.exactRoute[0];
  assert.equal(captureFamily.captureVariantPresent, true);
  assert.equal(captureFamily.reviewRequired, true);
  assert.ok(proposal.invariantFindings.some(item =>
    item.code === 'SOURCE_CAPTURE_INPUT_COUNT_DIFFERS_FROM_SCANNER_OBSERVED_PAGES' && item.severity === 'HOLD'));
  const snapshotPath = path.join(root, 'docs', 'ingestion', 'workmaps', 'content-forge-consolidation-proposal.json');
  assert.equal(fs.readFileSync(snapshotPath, 'utf8'), forge.stableJson(proposal));
});
