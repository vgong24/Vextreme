'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function withRepo(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vex-content-forge-consolidation-'));
  fs.mkdirSync(path.join(root, 'docs', 'ingestion', 'workmaps'), { recursive: true });
  try { return callback(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function writeJson(root, repoPath, value) {
  const absolute = path.join(root, ...repoPath.split('/'));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sourceNode(options) {
  const {
    ref, route, pageId, partRef, sha, title, disposition, placement,
    canonicalNode, pagePresent = false,
    materialization = 'PUBLIC_SAFE_SOURCE_EVIDENCE_MATERIALIZED', protection, lineage,
  } = options;
  return {
    workNodeRef: ref,
    nodeKind: 'SOURCE_PAGE_OBSERVATION',
    state: 'OBSERVED_PREPLACEMENT',
    source: { route, pageId, partRef, title, capturedPageSha256: sha, publicMaterializationState: materialization },
    destinationGrounding: {
      exactCanonicalNodeMatchOnCurrentMain: Boolean(canonicalNode),
      pageSourcePresentOnCurrentMain: pagePresent,
      currentDisposition: disposition,
      placementState: placement,
      canonicalNode,
      protection,
      canonicalPlacementEffectPerformed: false,
    },
    lineage,
  };
}

function fixtureRepo(root) {
  writeJson(root, 'docs/ingestion/workmaps/content-forge-current.json', {
    continuity: '[VXG RealForever]', issueRef: 'github.issue.vextreme.159',
    breadthPrRef: 'github.pull.vextreme.162', state: 'BREADTH_TERMINAL',
    workMapPath: 'docs/ingestion/workmaps/content-forge-r003.json', observedPages: 5,
  });
  writeJson(root, 'docs/ingestion/workmaps/content-forge-r001.json', {
    schemaVersion: 'vex-content-forge.work-map/v0.test-deep', revision: 1,
    revisionRef: 'workmap.revision.test.r001',
    cumulativeState: { observedPages: 2, canonicalPlacementEffects: 0 },
    workNodes: [
      sourceNode({
        ref: 'workmap.source-page.alpha.first', route: '/alpha', pageId: 'page-alpha-a', partRef: 'PART_001',
        sha: 'a'.repeat(64), title: 'Shared Title', disposition: 'EXISTING_SEMANTIC_SLOT',
        placement: 'EXISTING_NODE_SLOT; PAGE_SOURCE_ABSENT', canonicalNode: { id: 4, title: 'Alpha' },
      }),
      sourceNode({
        ref: 'workmap.source-page.secret', route: '/secret', pageId: 'page-secret', partRef: 'PART_001',
        sha: 'b'.repeat(64), title: 'Secret', disposition: 'HOLD',
        placement: 'PROTECTED_NONPUBLIC_SOURCE; PUBLIC BYTE MATERIALIZATION WITHHELD',
        materialization: 'PROTECTED_SOURCE_METADATA_ONLY',
        protection: { sourceDeclaresPasswordProtected: true },
      }),
    ],
  });
  writeJson(root, 'docs/ingestion/workmaps/content-forge-r002.json', {
    schemaVersion: 'vex-content-forge.work-map/v0.test-compact', revision: 2,
    revisionRef: 'workmap.revision.test.r002',
    cumulativeBasis: { priorMapPath: 'docs/ingestion/workmaps/content-forge-r001.json' },
    cumulativeState: { observedPages: 4, canonicalPlacementEffects: 0 },
    r002: { nodes: [
      sourceNode({
        ref: 'workmap.source-page.alpha.second', route: '/alpha', pageId: 'page-alpha-b', partRef: 'PART_002',
        sha: 'c'.repeat(64), title: 'Shared Title', disposition: 'EXISTING_SEMANTIC_SLOT',
        placement: 'EXISTING_NODE_SLOT; PAGE_SOURCE_ABSENT', canonicalNode: { id: 4, title: 'Alpha' },
        lineage: { relation: 'SAME_ROUTE_DIFFERENT_BYTES' },
      }),
      sourceNode({
        ref: 'workmap.source-page.other-title-collision', route: '/other', pageId: 'page-other', partRef: 'PART_002',
        sha: 'd'.repeat(64), title: 'Shared Title', disposition: 'WIP_UNSORTED_INTAKE',
        placement: 'NO_EXACT_NODE_OR_PAGE; HOLD_FOR_DESTINATION_CLASS',
      }),
    ] },
  });
  writeJson(root, 'docs/ingestion/workmaps/content-forge-r003.json', {
    schemaVersion: 'vex-content-forge.work-map/v0.test-terminal', revision: 3,
    revisionRef: 'workmap.revision.test.r003',
    cumulativeBasis: {
      priorMapPath: 'docs/ingestion/workmaps/content-forge-r002.json',
      deepBasisPath: 'docs/ingestion/workmaps/content-forge-r001.json',
    },
    cumulativeState: { observedPages: 5, canonicalPlacementEffects: 0 },
    r003: { partRef: 'PART_003', node: {
      route: '/current', pageId: 'page-current', title: 'Current',
      preservedHtmlSha256: 'e'.repeat(64), preservedHtmlBytes: 1234,
      exactCanonicalNodeMatchOnCurrentMain: true, pageSourcePresentOnCurrentMain: true,
      currentDisposition: 'EXISTING_CANONICAL_PAGE_IMPLEMENTATION',
      placementState: 'EXISTING_NODE_AND_PAGE; SOURCE_VARIANT_RETAINED_WITHOUT_OVERWRITE',
      canonicalNode: { id: 17, title: 'Current' }, canonicalPlacementEffectPerformed: false,
    } },
  });
}

module.exports = { fixtureRepo, withRepo, writeJson };
