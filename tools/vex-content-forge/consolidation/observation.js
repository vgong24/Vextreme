'use strict';

const { allStrings, firstString, isObject, walkObjects } = require('./lib');
const { mapContext } = require('./chain');

function isSourcePageObservation(node) {
  if (!isObject(node)) return false;
  const source = isObject(node.source) ? node.source : {};
  const route = firstString(source.route, node.route, node.sourceRoute);
  const pageId = firstString(source.pageId, node.pageId);
  const kind = firstString(node.nodeKind, node.kind, node.type) || '';
  const hasDigest = Boolean(firstString(
    source.sourceHtmlSha256, source.preservedHtmlSha256, source.capturedPageSha256,
    source.derivedSha256, node.sourceHtmlSha256, node.preservedHtmlSha256,
    node.capturedPageSha256, node.derivedSha256,
  ));
  const captureRecordDigest = firstString(source.contentRecordSha256, node.contentRecordSha256);
  const destinationSignal = Boolean(
    firstString(node.placementState, node.currentDisposition, node.disposition, node.state) ||
    node.exactCanonicalNodeMatchOnCurrentMain === true ||
    node.pageSourcePresentOnCurrentMain === true || isObject(node.canonicalNode)
  );
  if (!route || !pageId) return false;
  if (/REFERENCED|FUTURE_SOURCE|SOURCE_REFERENCE/i.test(kind)) return false;
  if (/SOURCE_CAPTURE_VARIANT_OBSERVATION/i.test(kind)) return Boolean(captureRecordDigest);
  if (/SOURCE_PAGE_OBSERVATION|PAGE_OBSERVATION/i.test(kind)) return Boolean(hasDigest || destinationSignal);
  return Boolean(!kind && hasDigest && destinationSignal);
}

function collectCandidateNodes(mapRecords) {
  const candidates = [];
  for (const mapRecord of mapRecords) {
    const context = mapContext(mapRecord);
    walkObjects(mapRecord.value, node => {
      if (isSourcePageObservation(node)) candidates.push({ mapRecord, node, context });
    });
  }
  return candidates;
}

function isProtectedRecord(node, source, destination) {
  const sourceProtectionText = allStrings({
    materialization: source.publicMaterializationState,
    sourceProtection: source.protection,
  }).join(' ').toUpperCase();
  return Boolean(source.protected === true || source.publicationAllowed === false ||
    isObject(source.protection) || isObject(destination.protection) ||
    /PROTECTED|PASSWORD|NONPUBLIC|NON-PUBLIC|WITHHELD|METADATA_ONLY/.test(sourceProtectionText));
}

function explicitCanonicalIdentity(destination) {
  const canonical = isObject(destination.canonicalNode) ? destination.canonicalNode : {};
  if (canonical.id !== undefined && canonical.id !== null) return `id:${String(canonical.id)}`;
  const ref = firstString(canonical.nodeRef, canonical.ref, destination.canonicalNodeRef);
  if (ref) return `ref:${ref}`;
  const slug = firstString(canonical.slug, destination.canonicalSlug, destination.existingCanonicalSlug);
  return slug ? `slug:${slug}` : null;
}

function classifyDestination(node) {
  const source = isObject(node.source) ? node.source : {};
  const destination = isObject(node.destinationGrounding) ? node.destinationGrounding :
    (isObject(node.destination) ? node.destination : node);
  const disposition = firstString(destination.currentDisposition, destination.disposition, node.disposition) || '';
  const placement = firstString(destination.placementState, destination.state, node.placementState) || '';
  const exactCanonical = destination.exactCanonicalNodeMatchOnCurrentMain === true ||
    isObject(destination.canonicalNode) || Boolean(destination.canonicalNodeRef);
  const pagePresent = destination.pageSourcePresentOnCurrentMain === true || destination.currentPagePresent === true;
  if (isProtectedRecord(node, source, destination)) {
    return result('PROTECTED_METADATA_ONLY', ['explicit protection/publication metadata'], true);
  }
  if (exactCanonical && pagePresent) {
    return result('EXISTING_CANONICAL_PAGE_VARIANT', ['exact canonical identity', 'current page source present'], true);
  }
  if (exactCanonical) {
    return result('EXISTING_CANONICAL_SLOT_PAGE_ABSENT', ['exact canonical identity', 'current page source absent'], false);
  }
  if (/DEPENDENCY_ONLY/i.test(disposition)) return result('EXPLICIT_DEPENDENCY_ONLY', [`disposition=${disposition}`], true);
  if (/HOLD|WIP|UNSORTED|UNRESOLVED|PREPLACEMENT/i.test(`${disposition} ${placement} ${node.state || ''}`)) {
    return result('SOURCE_ONLY_HOLD', [`disposition=${disposition || '(none)'}`, `placement=${placement || '(none)'}`], true);
  }
  return result('UNKNOWN_REQUIRES_JUDGMENT', ['no supported explicit destination state'], true);
}

function result(destinationClass, basis, requiresJudgment) {
  return { destinationClass, basis, requiresJudgment };
}

module.exports = {
  classifyDestination,
  collectCandidateNodes,
  explicitCanonicalIdentity,
  isSourcePageObservation,
};
