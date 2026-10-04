'use strict';

const { discoverMapChain } = require('./chain');
const { destinationClassSummary, invariantFindings } = require('./invariants');
const { buildAmbiguityQueue, buildLineages } = require('./lineage');
const { dedupeRecords, normalizeRecord } = require('./normalize');
const { collectCandidateNodes } = require('./observation');
const { DEFAULT_FORMATION, DEFAULT_POINTER, assertWorkmapPath, firstString, isObject, loadJson, sha256Text } = require('./lib');

function compileProposal(repoRoot, pointerPath = DEFAULT_POINTER, formationPath = DEFAULT_FORMATION) {
  const chain = discoverMapChain(repoRoot, pointerPath);
  const formationRecord = loadJson(repoRoot, assertWorkmapPath(formationPath));
  const formation = formationRecord.value;
  const knownHolds = isObject(formation.knownHolds) ? formation.knownHolds : {};
  const candidates = collectCandidateNodes(chain.maps);
  const records = dedupeRecords(candidates.map(normalizeRecord));
  const lineages = buildLineages(records);
  const ambiguityQueue = buildAmbiguityQueue(records, lineages);
  const findings = invariantFindings(chain, records, knownHolds);
  const countReconciliation = isObject(knownHolds.countReconciliation) ? knownHolds.countReconciliation : {};
  const referencedNotCarried = Array.isArray(knownHolds.referencedNotCarried) ? knownHolds.referencedNotCarried : [];
  return {
    schemaVersion: 'vex-content-forge.consolidation-proposal/v0.2',
    continuity: '[VXG RealForever]',
    effectBoundary: {
      stage: 'POST_BREADTH_CONSOLIDATION_PROPOSAL_ONLY', readOnly: true,
      canonicalPlacementEffectsAllowed: false, mergeAllowed: false, publicationAllowed: false,
      rawProviderSourceAllowed: false, titleSimilarityAliasInferenceAllowed: false,
      sourceNavigationToDestinationArcInferenceAllowed: false,
    },
    generatedFrom: {
      pointerPath: chain.pointerPath, pointerSha256: chain.pointerSha256,
      pointerState: firstString(chain.pointer.state), issueRef: firstString(chain.pointer.issueRef),
      breadthPrRef: firstString(chain.pointer.breadthPrRef), consumedThrough: firstString(chain.pointer.consumedThrough),
      rootWorkMapPath: chain.rootPath, rootRevision: chain.root.revision, rootRevisionRef: chain.root.revisionRef,
      formationPath: formationRecord.repoPath, formationSha256: sha256Text(formationRecord.text),
      stageRef: firstString(formation.stageRef),
      mapChain: chain.maps.map(map => ({ path: map.repoPath, revision: map.revision,
        revisionRef: map.revisionRef, sha256: map.sha256, bytes: map.bytes })),
    },
    counts: {
      mapsRead: chain.maps.length, candidateObjectsSeen: candidates.length,
      normalizedRecords: records.length,
      uniqueRoutes: new Set(records.map(record => record.source.route).filter(Boolean)).size,
      sourceCaptureInputPages: Number.isInteger(countReconciliation.sourceCaptureInputPages)
        ? countReconciliation.sourceCaptureInputPages : null,
      terminalScannerObservedPages: Number.isInteger(countReconciliation.terminalScannerObservedPages)
        ? countReconciliation.terminalScannerObservedPages : null,
      referencedNotCarried: referencedNotCarried.length,
      ambiguityQueue: ambiguityQueue.length,
      exactRouteLineageFamilies: lineages.exactRoute.length,
      canonicalIdentityLineageFamilies: lineages.canonicalIdentity.length,
      sourcePageIdLineageFamilies: lineages.pageId.length,
      invariantFindings: findings.length,
      invariantErrors: findings.filter(item => item.severity === 'ERROR').length,
      invariantHolds: findings.filter(item => item.severity === 'HOLD').length,
    },
    knownHolds,
    destinationClasses: destinationClassSummary(records),
    lineages,
    ambiguityQueue,
    invariantFindings: findings,
    records,
  };
}

module.exports = { compileProposal };
