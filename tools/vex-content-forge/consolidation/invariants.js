'use strict';

const { isObject } = require('./lib');

function invariantFindings(chain, records) {
  const findings = [];
  const state = isObject(chain.root.value.cumulativeState) ? chain.root.value.cumulativeState : {};
  const pointerObserved = Number.isInteger(chain.pointer.observedPages) ? chain.pointer.observedPages : null;
  const rootObserved = Number.isInteger(state.observedPages) ? state.observedPages : null;
  const expectedObserved = rootObserved ?? pointerObserved;
  if (pointerObserved !== null && rootObserved !== null && pointerObserved !== rootObserved) {
    findings.push({
      severity: 'ERROR', code: 'POINTER_ROOT_OBSERVED_PAGE_COUNT_MISMATCH',
      pointerObservedPages: pointerObserved, rootObservedPages: rootObserved,
    });
  }
  if (expectedObserved !== null && expectedObserved !== records.length) {
    findings.push({
      severity: 'HOLD', code: 'NORMALIZED_RECORD_COUNT_DIFFERS_FROM_SCANNER_OBSERVED_PAGES',
      scannerObservedPages: expectedObserved, normalizedRecords: records.length,
      rule: 'COUNT_DIFFERENCE_REQUIRES_EXPLANATION_NOT_COSMETIC_RECONCILIATION',
    });
  }
  if (state.canonicalPlacementEffects !== undefined && state.canonicalPlacementEffects !== 0) {
    findings.push({ severity: 'ERROR', code: 'NONZERO_CANONICAL_PLACEMENT_EFFECTS_IN_BREADTH_ROOT', value: state.canonicalPlacementEffects });
  }
  for (const record of records) {
    if (record.destination.canonicalPlacementEffectPerformed) {
      findings.push({ severity: 'ERROR', code: 'SOURCE_RECORD_REPORTS_CANONICAL_PLACEMENT_EFFECT', recordRef: record.recordRef });
    }
    const protectedRecord = record.classification.destinationClass === 'PROTECTED_METADATA_ONLY';
    const stateText = record.source.publicMaterializationState || '';
    if (protectedRecord && /MATERIALIZED/i.test(stateText) && !/NOT_MATERIALIZED|WITHHELD|METADATA_ONLY/i.test(stateText)) {
      findings.push({
        severity: 'ERROR', code: 'PROTECTED_RECORD_APPEARS_PUBLICLY_MATERIALIZED',
        recordRef: record.recordRef, materializationState: stateText,
      });
    }
  }
  return findings.sort((a, b) => a.code.localeCompare(b.code) || (a.recordRef || '').localeCompare(b.recordRef || ''));
}

function destinationClassSummary(records) {
  const groups = new Map();
  for (const record of records) {
    const key = record.classification.destinationClass;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record.recordRef);
  }
  return [...groups.entries()].map(([destinationClass, refs]) => ({
    destinationClass, count: refs.length, recordRefs: refs.sort(),
  })).sort((a, b) => a.destinationClass.localeCompare(b.destinationClass));
}

module.exports = { destinationClassSummary, invariantFindings };
