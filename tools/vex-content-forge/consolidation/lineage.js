'use strict';

const { firstString } = require('./lib');

function groupBy(records, keyFn) {
  const groups = new Map();
  for (const record of records) {
    const key = keyFn(record);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  return groups;
}

function primaryDigest(record) {
  const d = record.source.digests;
  return firstString(d.sourceHtmlSha256, d.preservedHtmlSha256, d.capturedPageSha256, d.derivedSha256, d.gitBlobSha1);
}

function lineageFamilies(records, keyName, keyFn) {
  const families = [];
  for (const [key, members] of groupBy(records, keyFn)) {
    if (members.length < 2) continue;
    const routes = [...new Set(members.map(record => record.source.route).filter(Boolean))].sort();
    const digests = [...new Set(members.map(primaryDigest).filter(Boolean))].sort();
    const captureVariantRecordRefs = members
      .filter(record => /SOURCE_CAPTURE_VARIANT_OBSERVATION/i.test(record.observationKind || ''))
      .map(record => record.recordRef).sort();
    families.push({
      [keyName]: key,
      recordRefs: members.map(record => record.recordRef).sort(),
      routes,
      sourceDigests: digests,
      sameRoute: routes.length === 1,
      byteDistinct: digests.length > 1,
      captureVariantPresent: captureVariantRecordRefs.length > 0,
      captureVariantRecordRefs,
      reviewRequired: digests.length > 1 || routes.length > 1 || captureVariantRecordRefs.length > 0,
    });
  }
  return families.sort((a, b) => String(a[keyName]).localeCompare(String(b[keyName])));
}

function buildLineages(records) {
  return {
    exactRoute: lineageFamilies(records, 'route', record => record.source.route),
    canonicalIdentity: lineageFamilies(records, 'canonicalIdentity', record => record.destination.canonicalIdentity),
    pageId: lineageFamilies(records, 'pageId', record => record.source.pageId),
  };
}

function buildLineageIndexes(lineages) {
  const output = { exactRoute: new Set(), canonicalIdentity: new Set(), pageId: new Set() };
  for (const [kind, families] of Object.entries(lineages)) {
    for (const family of families) {
      if (!family.reviewRequired) continue;
      family.recordRefs.forEach(ref => output[kind].add(ref));
    }
  }
  return output;
}

function ambiguityReasons(record, indexes) {
  const reasons = new Set();
  const destinationClass = record.classification.destinationClass;
  if (record.classification.requiresJudgment) reasons.add(`DESTINATION_CLASS_${destinationClass}`);
  if (!record.source.route) reasons.add('MISSING_SOURCE_ROUTE');
  if (!record.source.pageId) reasons.add('MISSING_SOURCE_PAGE_ID');
  if (!primaryDigest(record)) reasons.add('MISSING_SOURCE_DIGEST');
  if (!record.destination.currentDisposition && !record.destination.placementState) {
    reasons.add('MISSING_DESTINATION_DISPOSITION');
  }
  if (record.destination.canonicalNode && record.destination.canonicalNode.id === null) {
    reasons.add('CANONICAL_SLOT_HAS_NULL_NUMERIC_ID');
  }
  const placement = `${record.destination.currentDisposition || ''} ${record.destination.placementState || ''}`.toUpperCase();
  if (/ALIAS|REPLACE|REPLACEMENT/.test(placement)) reasons.add('ALIAS_OR_REPLACEMENT_REVIEW');
  if (/TOOL|CALCULATOR|INSTRUMENT|SIMULATION/.test(placement)) reasons.add('TOOL_OR_INSTRUMENT_CLASS_REVIEW');
  if (/COLLECTION|HUB|SERIES|ARC/.test(placement)) reasons.add('COLLECTION_OR_SERIES_CLASS_REVIEW');
  if (record.explicitLineage) reasons.add('EXPLICIT_LINEAGE_REVIEW');
  if (/SOURCE_CAPTURE_VARIANT_OBSERVATION/i.test(record.observationKind || '')) reasons.add('SOURCE_CAPTURE_VARIANT_RECONCILIATION');
  if (indexes.exactRoute.has(record.recordRef)) reasons.add('MULTI_CAPTURE_SAME_ROUTE_RECONCILIATION');
  if (indexes.canonicalIdentity.has(record.recordRef)) reasons.add('MULTI_SOURCE_CANONICAL_IDENTITY_RECONCILIATION');
  if (indexes.pageId.has(record.recordRef)) reasons.add('MULTI_RECORD_SOURCE_PAGE_ID_RECONCILIATION');
  return [...reasons].sort();
}

function buildAmbiguityQueue(records, lineages) {
  const indexes = buildLineageIndexes(lineages);
  return records.map(record => ({
    recordRef: record.recordRef,
    route: record.source.route,
    partRef: record.source.partRef,
    destinationClass: record.classification.destinationClass,
    reasons: ambiguityReasons(record, indexes),
  })).filter(item => item.reasons.length > 0)
    .sort((a, b) => (a.route || '').localeCompare(b.route || '') || a.recordRef.localeCompare(b.recordRef));
}

module.exports = { buildAmbiguityQueue, buildLineages, primaryDigest };
