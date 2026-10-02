'use strict';

const { firstString, isObject, sha256Text, stableJson } = require('./lib');
const { classifyDestination, explicitCanonicalIdentity } = require('./observation');

function sourceDigests(source, node) {
  const entries = [
    ['sourceHtmlSha256', firstString(source.sourceHtmlSha256, node.sourceHtmlSha256)],
    ['preservedHtmlSha256', firstString(source.preservedHtmlSha256, node.preservedHtmlSha256)],
    ['capturedPageSha256', firstString(source.capturedPageSha256, node.capturedPageSha256)],
    ['derivedSha256', firstString(source.derivedSha256, node.derivedSha256)],
    ['gitBlobSha1', firstString(source.gitBlobSha1, source.sourceGitBlobSha1, source.gitBlob,
      node.gitBlobSha1, node.sourceGitBlobSha1, node.preservedGitBlobSha1, node.gitBlob)],
  ].filter(([, value]) => value);
  return Object.fromEntries(entries);
}

function normalizeRecord({ mapRecord, node, context = {} }) {
  const source = isObject(node.source) ? node.source : {};
  const destination = isObject(node.destinationGrounding) ? node.destinationGrounding :
    (isObject(node.destination) ? node.destination : node);
  const canonical = isObject(destination.canonicalNode) ? destination.canonicalNode : {};
  const route = firstString(source.route, node.route, node.sourceRoute);
  const partRef = firstString(source.partRef, node.partRef, context.partRef);
  const pageId = firstString(source.pageId, node.pageId);
  const workNodeRef = firstString(node.workNodeRef, node.nodeRef, node.ref);
  const digests = sourceDigests(source, node);
  const digestKey = firstString(digests.sourceHtmlSha256, digests.preservedHtmlSha256,
    digests.capturedPageSha256, digests.derivedSha256, digests.gitBlobSha1);
  const identitySeed = [partRef, pageId, route, digestKey, workNodeRef].filter(Boolean).join('|');
  const observationKind = firstString(node.nodeKind, node.kind, node.type);
  const isCaptureVariant = /SOURCE_CAPTURE_VARIANT_OBSERVATION/i.test(observationKind || '');
  const captureVariant = isCaptureVariant ? {
    contentRecordSha256: firstString(source.contentRecordSha256, node.contentRecordSha256),
    localPath: firstString(source.localPath, node.localPath),
    renderedHtmlMaterializedSeparately: source.renderedHtmlMaterializedSeparately === true ||
      node.renderedHtmlMaterializedSeparately === true,
    primaryCapturePageId: firstString(node.observation && node.observation.primaryCapturePageId),
    primaryContentRecordSha256: firstString(node.observation && node.observation.primaryContentRecordSha256),
  } : null;
  return {
    recordRef: `content-forge.source-record.${sha256Text(identitySeed).slice(0, 20)}`,
    workNodeRef,
    observationKind,
    map: { path: mapRecord.repoPath, revision: mapRecord.revision, revisionRef: mapRecord.revisionRef },
    source: {
      partRef, route, pageId,
      title: firstString(source.title, node.title),
      sourceNavigationGroup: firstString(source.sourceNavigationGroup, source.collection,
        source.routeFamily, node.sourceNavigationGroup, context.sourceGroupState),
      archiveMember: firstString(source.archiveMember, node.archiveMember),
      pageAuthority: firstString(source.pageAuthority, node.pageAuthority),
      publicMaterializationState: firstString(source.publicMaterializationState, node.publicMaterializationState),
      capturedPageBytes: Number.isFinite(source.capturedPageBytes) ? source.capturedPageBytes :
        (Number.isFinite(node.preservedHtmlBytes) ? node.preservedHtmlBytes :
          (Number.isFinite(node.capturedPageBytes) ? node.capturedPageBytes : null)),
      digests,
    },
    destination: {
      repository: firstString(destination.repository),
      currentMainAtReview: firstString(destination.currentMainAtReview),
      exactCanonicalNodeMatchOnCurrentMain: destination.exactCanonicalNodeMatchOnCurrentMain === true,
      pageSourcePresentOnCurrentMain: destination.pageSourcePresentOnCurrentMain === true,
      contentIntentMatchOnCurrentMain: destination.contentIntentMatchOnCurrentMain === true,
      currentDisposition: firstString(destination.currentDisposition, destination.disposition, node.currentDisposition),
      placementState: firstString(destination.placementState, destination.state, node.placementState),
      canonicalIdentity: explicitCanonicalIdentity(destination),
      canonicalNode: Object.keys(canonical).length ? canonical : null,
      canonicalPlacementEffectPerformed: destination.canonicalPlacementEffectPerformed === true,
    },
    classification: classifyDestination(node),
    explicitLineage: isObject(node.lineage) ? node.lineage :
      (isCaptureVariant && isObject(node.observation) ? node.observation : null),
    captureVariant,
    observationClass: firstString(node.observation && node.observation.observedContentClass),
  };
}

function recordDedupeKey(record) {
  return stableJson({
    workNodeRef: record.workNodeRef,
    observationKind: record.observationKind,
    source: record.source,
    destination: record.destination,
    explicitLineage: record.explicitLineage,
    captureVariant: record.captureVariant,
  });
}

function dedupeRecords(records) {
  const byKey = new Map();
  for (const record of records) {
    const key = recordDedupeKey(record);
    const existing = byKey.get(key);
    if (!existing || (record.map.revision ?? -1) > (existing.map.revision ?? -1)) byKey.set(key, record);
  }
  return [...byKey.values()].sort((a, b) =>
    (a.source.route || '').localeCompare(b.source.route || '') ||
    (a.source.partRef || '').localeCompare(b.source.partRef || '') ||
    a.recordRef.localeCompare(b.recordRef));
}

module.exports = { dedupeRecords, normalizeRecord, sourceDigests };
