#!/usr/bin/env node
/**
 * Deterministically selects a bounded orientation packet from the generated
 * map graph. No network, embeddings, AI/RAG inference, filesystem crawl, or
 * private-path discovery occurs here.
 *
 * The PUBLIC_VEXTREME provider projection exported below is also pure: callers
 * supply already-observed public repository evidence plus the accepted PAT-01
 * public-safe atlas. It performs no live repository observation of its own.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROJECTION_PATH = path.join(ROOT, 'data', 'orientation-map.json');
const BASELINE_MAPS = ['cold-start', 'work-coordination'];
const DEFAULT_MAX_MAPS = 5;
const PUBLIC_PROVIDER_SCHEMA_VERSION = 'vextreme.orientation-provider-receipt/v1';
const PUBLIC_PROVIDER_REF = 'provider.vextreme-public.orientation';
const PUBLIC_REPOSITORY_REF = 'vgong24/Vextreme';
const PUBLIC_ATLAS_SCHEMA_VERSION = 'vextreme.process-atlas.public-safe/v1';
const PUBLIC_ATLAS_RECEIPT_SCHEMA_VERSION = 'vextreme.process-atlas.projection-receipt/v1';
const PUBLIC_SAFE_VISIBILITY_PROFILE_REF = 'synthetic.visibility.public-safe';
const PUBLIC_PROVIDER_QUESTION_CLASSES = Object.freeze([
  'WHERE_AM_I',
  'WHY_DO_I_EXIST_IN_THIS_CURRENT_NEED',
  'WHAT_IS_CURRENT',
  'WHAT_IS_AVAILABLE',
  'WHAT_IS_IMPLEMENTED',
  'WHAT_IS_MAPPED',
  'WHAT_IS_ACTIVE',
  'WHAT_IS_HELD',
  'WHAT_IS_BLOCKED',
  'WHAT_IS_REQUIRED',
  'WHAT_PRECEDED_THIS',
  'WHAT_CAN_FOLLOW_THIS',
  'WHAT_CAN_PROCEED_IN_PARALLEL',
  'WHAT_CONNECTS_THESE_ITEMS',
  'CAN_THIS_ROLE_ACT',
  'WHICH_SOURCE_IS_AUTHORITATIVE',
  'HAS_THIS_TASK_ALREADY_RUN',
  'WHERE_IS_THE_RETURN',
  'WHAT_REQUIRES_VICTOR',
  'WHAT_IS_THE_ONE_NEXT_ACTION',
]);
const PUBLIC_CURRENT_STATES = new Set(['CURRENT', 'STALE', 'UNAVAILABLE', 'UNKNOWN']);
const REF_RE = /^[A-Za-z0-9][A-Za-z0-9._:/[\]-]*$/;
const SOURCE_REF_RE = /^[A-Za-z][A-Za-z0-9-]*\.[A-Za-z0-9][A-Za-z0-9._:/[\]-]*$/;
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const PRIVATE_VALUE_RE = /(?:Vextreme-SDK|VexLife|github\.(?:issue|pr|commit)\.vextreme-sdk|github\.(?:issue|pr|commit)\.vexlife|\b(?:secret|credential|password)\b|^(?:private|secret|credential)\.)/i;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9./_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRepoPath(value) {
  const normalized = String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:\//i.test(normalized) || normalized.includes('\0') || normalized.split('/').includes('..')) {
    throw new Error(`unsafe or empty repository path: ${value}`);
  }
  return normalized.replace(/\/+$/, '');
}

function pathMatches(registeredPath, requestedPath) {
  return requestedPath === registeredPath || requestedPath.startsWith(`${registeredPath}/`);
}

function addReason(scores, mapId, points, reason) {
  if (!scores.has(mapId)) scores.set(mapId, { score: 0, reasons: [] });
  const entry = scores.get(mapId);
  entry.score += points;
  if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
}

function scoreMaps(projection, request) {
  const scores = new Map();
  const gaps = [];
  const task = normalizeText(request.task);
  const questionIds = [...new Set(request.questionIds || [])].sort();
  const requestedPaths = [...new Set(request.paths || [])].map(normalizeRepoPath).sort();

  for (const mapId of BASELINE_MAPS) addReason(scores, mapId, 0, 'required safety baseline');

  for (const questionId of questionIds) {
    const route = projection.questionIndex[questionId];
    if (!route) {
      gaps.push(`Unknown question id: ${questionId}`);
      continue;
    }
    addReason(scores, route.mapId, 100, `explicit question: ${questionId}`);
  }

  for (const requestedPath of requestedPaths) {
    let matched = false;
    for (const [registeredPath, routes] of Object.entries(projection.pathIndex)) {
      if (!pathMatches(registeredPath, requestedPath)) continue;
      matched = true;
      for (const mapId of [...routes.sourceFor, ...routes.projectionFor]) {
        addReason(scores, mapId, 80, `path route: ${requestedPath} via ${registeredPath}`);
      }
    }
    if (!matched) gaps.push(`No registered map path contains: ${requestedPath}`);
  }

  if (task) {
    for (const map of Object.values(projection.maps)) {
      for (const trigger of map.triggers) {
        const normalizedTrigger = normalizeText(trigger);
        if (!normalizedTrigger || !task.includes(normalizedTrigger)) continue;
        const weight = 20 + normalizedTrigger.split(' ').length;
        addReason(scores, map.id, weight, `task trigger: ${trigger}`);
      }
    }
  }

  const taskSpecific = [...scores.entries()]
    .filter(([mapId, entry]) => !BASELINE_MAPS.includes(mapId) && entry.score > 0);
  if (taskSpecific.length === 0 && questionIds.length === 0 && requestedPaths.length === 0) {
    gaps.push('No task-specific trigger matched; packet remains at the safety baseline.');
  }
  return { scores, gaps, requestedPaths };
}

function selectMapIds(scores, maxMaps = DEFAULT_MAX_MAPS) {
  const boundedMax = Math.max(BASELINE_MAPS.length, Math.min(DEFAULT_MAX_MAPS, Number(maxMaps) || DEFAULT_MAX_MAPS));
  const selected = [...BASELINE_MAPS];
  const candidates = [...scores.entries()]
    .filter(([mapId, entry]) => !BASELINE_MAPS.includes(mapId) && entry.score > 0)
    .sort(([aId, a], [bId, b]) => b.score - a.score || aId.localeCompare(bId));
  for (const [mapId] of candidates) {
    if (selected.length >= boundedMax) break;
    selected.push(mapId);
  }
  return selected;
}

function buildReadOrder(projection, mapIds) {
  const seen = new Set();
  const reads = [];
  for (const mapId of mapIds) {
    const map = projection.maps[mapId];
    for (const [kind, paths] of [['source', map.sourcePaths], ['projection', map.projectionPaths]]) {
      for (const itemPath of paths) {
        const key = `${kind}:${itemPath}`;
        if (seen.has(key)) continue;
        seen.add(key);
        reads.push({ mapId, kind, path: itemPath });
      }
    }
  }
  return reads;
}

function selectOrientationContext(projection, request = {}) {
  if (!projection || projection.schemaVersion !== 'orientation-map.projection/v1') {
    throw new Error('orientation-map.projection/v1 is required');
  }
  const { scores, gaps, requestedPaths } = scoreMaps(projection, request);
  const mapIds = selectMapIds(scores, request.maxMaps);
  const maps = mapIds.map(mapId => {
    const map = projection.maps[mapId];
    const score = scores.get(mapId) || { score: 0, reasons: ['required safety baseline'] };
    return {
      id: map.id,
      score: score.score,
      reasons: [...score.reasons].sort(),
      authority: map.authority,
      freshness: map.freshness,
      lastVerified: map.lastVerified,
      sourcePaths: map.sourcePaths,
      projectionPaths: map.projectionPaths,
      health: map.health,
      exclusions: map.exclusions,
      nextRoutes: {
        forward: map.forwardEdges,
        reverse: map.reverseEdges,
      },
    };
  });
  const matchedSignal = [...scores.values()].some(entry => entry.score > 0);

  return {
    schemaVersion: 'orientation-context.packet/v1',
    request: {
      task: String(request.task || ''),
      questionIds: [...new Set(request.questionIds || [])].sort(),
      paths: requestedPaths,
    },
    status: matchedSignal ? 'routed' : 'partial',
    selectionPolicy: {
      baselineMaps: BASELINE_MAPS,
      maxMaps: Math.max(BASELINE_MAPS.length, Math.min(DEFAULT_MAX_MAPS, Number(request.maxMaps) || DEFAULT_MAX_MAPS)),
      expansion: 'matched maps only; adjacent edges are returned as next routes, not auto-loaded',
    },
    maps,
    readOrder: buildReadOrder(projection, mapIds),
    healthChecks: [...new Set(maps.map(map => map.health.checker).filter(Boolean))],
    gaps,
    boundaries: projection.boundaries,
  };
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function assertRef(value, label) {
  if (typeof value !== 'string' || !REF_RE.test(value)) {
    throw new Error(`${label} must be a reference-safe string`);
  }
  assertPublicValue(value, label);
  return value;
}

function assertSourceRef(value, label) {
  if (typeof value !== 'string' || !SOURCE_REF_RE.test(value)) {
    throw new Error(`${label} must be a source-reference-safe string`);
  }
  assertPublicValue(value, label);
  return value;
}

function assertPublicValue(value, label) {
  if (typeof value === 'string' && PRIVATE_VALUE_RE.test(value)) {
    throw new Error(`${label} contains non-public provider or sensitive state`);
  }
}

function assertPublicTree(value, label = 'input') {
  if (typeof value === 'string') {
    assertPublicValue(value, label);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPublicTree(item, `${label}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      assertPublicTree(item, `${label}.${key}`);
    }
  }
}

function assertRefArray(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return sortedUnique(value.map((item, index) => assertRef(item, `${label}[${index}]`)));
}

function collectSourceRefs(value, output = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectSourceRefs(item, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'sourceRef' && typeof item === 'string') output.add(assertSourceRef(item, key));
    if (key === 'sourceRefs' && Array.isArray(item)) {
      item.forEach((ref, index) => output.add(assertSourceRef(ref, `${key}[${index}]`)));
    }
    collectSourceRefs(item, output);
  }
  return output;
}

function validatePublicAtlas(atlas) {
  if (!atlas || typeof atlas !== 'object' || Array.isArray(atlas)) {
    throw new Error('PAT-01 public-safe atlas must be an object');
  }
  assertPublicTree(atlas, 'atlas');
  if (atlas.schemaVersion !== PUBLIC_ATLAS_SCHEMA_VERSION) {
    throw new Error(`${PUBLIC_ATLAS_SCHEMA_VERSION} is required`);
  }
  assertRef(atlas.atlasRef, 'atlas.atlasRef');
  const projectionReceipt = atlas.projectionReceipt;
  if (!projectionReceipt || projectionReceipt.schemaVersion !== PUBLIC_ATLAS_RECEIPT_SCHEMA_VERSION) {
    throw new Error(`${PUBLIC_ATLAS_RECEIPT_SCHEMA_VERSION} is required`);
  }
  if (!Array.isArray(projectionReceipt.visibilityProfileRefs)
    || !projectionReceipt.visibilityProfileRefs.includes(PUBLIC_SAFE_VISIBILITY_PROFILE_REF)) {
    throw new Error('PAT-01 projection must declare the public-safe visibility profile');
  }
  if (!Array.isArray(atlas.sources) || atlas.sources.length === 0) {
    throw new Error('PAT-01 atlas must include public source records');
  }
  const sourceRefs = sortedUnique([...collectSourceRefs(atlas)]);
  if (sourceRefs.length === 0) throw new Error('PAT-01 atlas has no public-safe source refs');
  return {
    atlasRef: assertRef(atlas.atlasRef, 'atlas.atlasRef'),
    projectionReceiptRef: assertRef(projectionReceipt.projectionReceiptRef, 'atlas.projectionReceipt.projectionReceiptRef'),
    sourceRefs,
  };
}

function normalizePublicRepositoryEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('repositoryEvidence must be an object');
  }
  const allowedFields = new Set([
    'repositoryRef', 'sourceRef', 'observedAt', 'currentState',
    'liveSourceRefOrNull', 'currentWorkRef', 'currentEntryRefs',
    'currentAcceptedRefs', 'priorAcceptedRefs', 'supersededRefs',
    'nextEligibleRefs', 'nextHeldRefs', 'currentClaimRefs',
    'conflictingClaimRefs', 'exactNextActionRef',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowedFields.has(key)) throw new Error(`repositoryEvidence.${key} is not allowed`);
  }
  assertPublicTree(value, 'repositoryEvidence');
  if (value.repositoryRef !== PUBLIC_REPOSITORY_REF) {
    throw new Error(`repositoryEvidence.repositoryRef must be ${PUBLIC_REPOSITORY_REF}`);
  }
  const sourceRef = assertSourceRef(value.sourceRef, 'repositoryEvidence.sourceRef');
  if (!TIMESTAMP_RE.test(String(value.observedAt || ''))) {
    throw new Error('repositoryEvidence.observedAt must be an explicit UTC timestamp');
  }
  if (!PUBLIC_CURRENT_STATES.has(value.currentState)) {
    throw new Error(`unsupported public currentState: ${value.currentState}`);
  }
  const liveSourceRefOrNull = value.liveSourceRefOrNull == null
    ? null
    : assertSourceRef(value.liveSourceRefOrNull, 'repositoryEvidence.liveSourceRefOrNull');
  if (value.currentState === 'CURRENT' && liveSourceRefOrNull === null) {
    throw new Error('CURRENT public evidence requires liveSourceRefOrNull');
  }
  const currentAcceptedRefs = assertRefArray(value.currentAcceptedRefs, 'repositoryEvidence.currentAcceptedRefs');
  if (value.currentState === 'CURRENT' && currentAcceptedRefs.length === 0) {
    throw new Error('CURRENT public evidence requires currentAcceptedRefs');
  }
  return {
    repositoryRef: PUBLIC_REPOSITORY_REF,
    sourceRef,
    observedAt: value.observedAt,
    currentState: value.currentState,
    liveSourceRefOrNull,
    currentWorkRef: value.currentWorkRef == null ? null : assertRef(value.currentWorkRef, 'repositoryEvidence.currentWorkRef'),
    currentEntryRefs: assertRefArray(value.currentEntryRefs, 'repositoryEvidence.currentEntryRefs'),
    currentAcceptedRefs,
    priorAcceptedRefs: assertRefArray(value.priorAcceptedRefs, 'repositoryEvidence.priorAcceptedRefs'),
    supersededRefs: assertRefArray(value.supersededRefs, 'repositoryEvidence.supersededRefs'),
    nextEligibleRefs: assertRefArray(value.nextEligibleRefs, 'repositoryEvidence.nextEligibleRefs'),
    nextHeldRefs: assertRefArray(value.nextHeldRefs, 'repositoryEvidence.nextHeldRefs'),
    currentClaimRefs: assertRefArray(value.currentClaimRefs, 'repositoryEvidence.currentClaimRefs'),
    conflictingClaimRefs: assertRefArray(value.conflictingClaimRefs, 'repositoryEvidence.conflictingClaimRefs'),
    exactNextActionRef: value.exactNextActionRef == null
      ? null
      : assertRef(value.exactNextActionRef, 'repositoryEvidence.exactNextActionRef'),
  };
}

function buildPublicOrientationProviderReceipt({ atlas, repositoryEvidence }) {
  const atlasState = validatePublicAtlas(atlas);
  const evidence = normalizePublicRepositoryEvidence(repositoryEvidence);
  const isCurrent = evidence.currentState === 'CURRENT';
  const sourceRefs = sortedUnique([...atlasState.sourceRefs, evidence.sourceRef]);
  const coverage = PUBLIC_PROVIDER_QUESTION_CLASSES.map(questionClass => ({
    questionClass,
    requiredSourceRefs: sourceRefs,
    optionalSourceRefs: [],
    alreadyCoveredSourceRefs: sourceRefs,
    missingSourceRefs: [],
  }));
  const blockers = isCurrent ? [] : [`blocker.public-currentness-${evidence.currentState.toLowerCase()}`];
  const attentions = [
    'attention.public-relay-state-unknown',
    ...(!isCurrent ? [`attention.public-currentness-${evidence.currentState.toLowerCase()}`] : []),
  ].sort();
  const unknownRefs = [
    'public.source.relay-state',
    ...(!isCurrent ? ['public.source.fresh-current-state'] : []),
  ].sort();
  const atlasSourceRef = atlasState.sourceRefs[0];

  return {
    schemaVersion: PUBLIC_PROVIDER_SCHEMA_VERSION,
    providerRef: PUBLIC_PROVIDER_REF,
    providerClass: 'PUBLIC_VEXTREME',
    repositoryRef: PUBLIC_REPOSITORY_REF,
    visibility: 'PUBLIC',
    projectionScope: 'PUBLIC_SAFE',
    observedAt: evidence.observedAt,
    freshnessState: {
      liveSourceRefOrNull: evidence.liveSourceRefOrNull,
      staticSourceRefOrNull: atlasState.projectionReceiptRef,
      selectedSourceClass: isCurrent ? 'LIVE' : 'UNKNOWN',
      selectionReasonRef: isCurrent
        ? 'rule.live-public-evidence-outranks-static-pat'
        : 'rule.public-currentness-fails-closed',
    },
    publicationState: {
      lifecycleState: 'PUBLIC',
      futurePublicIntentSourceRefOrNull: null,
      publicationAuthority: false,
    },
    currentState: evidence.currentState,
    current: {
      currentGlobalRootRef: null,
      currentScopedRootRef: null,
      currentLocalOperationsRef: null,
      currentWorkRef: evidence.currentWorkRef,
      currentEntryRefs: evidence.currentEntryRefs,
      currentAcceptedRefs: evidence.currentAcceptedRefs,
      priorAcceptedRefs: evidence.priorAcceptedRefs,
      supersededRefs: evidence.supersededRefs,
      nextEligibleRefs: evidence.nextEligibleRefs,
      nextHeldRefs: evidence.nextHeldRefs,
    },
    purposeState: {
      rolePurposeRef: 'purpose.public-orientation-provider',
      currentNeedRef: 'need.public-source-addressable-orientation',
      whyThisRoleWasSelectedRef: 'rule.repository-owned-provider',
      whatThisRoleOwnsRefs: ['boundary.public-provider-projection'],
      whatThisRoleMustNotOwnRefs: ['boundary.cross-repository-authority', 'boundary.publication-effect'],
      acceptedInputRefs: [atlasState.atlasRef, evidence.sourceRef].sort(),
      requiredOutputRefs: ['receipt.public-orientation-provider'],
      returnRouteRef: null,
      completionGateRefs: ['gate.fail-closed-currentness', 'gate.public-safe'],
      currentDependencies: [atlasState.atlasRef],
      currentPeers: [],
      whatHappensAfterReturnRefs: ['process.federated-orientation.resolve'],
    },
    functionState: {
      availableFunctionRefs: ['function.public-orientation-provider.project'],
      requiredFunctionRefs: ['function.public-orientation-provider.project'],
      unavailableFunctionRefs: [],
    },
    capabilityState: {
      implementedCapabilityRefs: ['capability.public-orientation-provider', 'capability.public-process-atlas'].sort(),
      mappedCapabilityRefs: ['capability.public-orientation-provider'],
      activeCapabilityRefs: isCurrent ? ['capability.public-orientation-provider'] : [],
      heldCapabilityRefs: ['capability.cross-repository-authority', 'capability.publication-effect'].sort(),
      blockedCapabilityRefs: isCurrent ? [] : ['capability.current-state-answer'],
      completedCapabilityRefs: ['capability.public-process-atlas'],
    },
    edges: [
      {
        edgeRef: 'edge.public-orientation-provider.source-atlas',
        edgeClass: 'SOURCE_ORIGIN',
        fromRef: PUBLIC_PROVIDER_REF,
        toRef: atlasState.atlasRef,
        sourceRefs: [atlasSourceRef],
      },
      {
        edgeRef: 'edge.public-orientation-provider.current-evidence',
        edgeClass: 'VALIDATED_BY',
        fromRef: PUBLIC_PROVIDER_REF,
        toRef: evidence.sourceRef,
        sourceRefs: [evidence.sourceRef],
      },
    ],
    questionCoverage: coverage,
    authorityEnvelope: {
      authorityRefOrNull: null,
      state: 'HELD',
      allowedEffectRefs: [],
      heldEffectRefs: [
        'effect.cross-repository-authority-transfer',
        'effect.publication',
        'effect.source-mutation',
      ].sort(),
      unknownEffectRefs: [],
      victorRequirementRefs: [],
    },
    effectEnvelope: {
      effectRefOrNull: null,
      availableFunctionRefOrNull: 'function.public-orientation-provider.project',
      typedEffectEvidenceOrNull: null,
    },
    resourceEnvelope: {
      machineScopeRefs: [],
      availableResourceRefs: ['resource.public-process-atlas'],
      requiredResourceRefs: ['resource.public-current-state-evidence'],
      unavailableResourceRefs: [],
      unknownResourceRefs: isCurrent ? [] : ['resource.public-current-state-freshness'],
    },
    currentClaimRefs: evidence.currentClaimRefs,
    conflictingClaimRefs: evidence.conflictingClaimRefs,
    relayState: {
      executionState: 'TASK_STATE_UNKNOWN_DO_NOT_EXECUTE',
      taskRefOrNull: null,
      attemptRefOrNull: null,
      taskSha256OrNull: null,
      hostProfileRefOrNull: null,
      repositoryExecutionProfileRefOrNull: null,
      acceptedAtOrNull: null,
      startedAtOrNull: null,
      terminalAtOrNull: null,
      resultZipRefOrNull: null,
      resultZipSha256OrNull: null,
      consumedByRefOrNull: null,
      successorRefOrNull: null,
    },
    unknownRefs,
    attentions,
    blockers,
    exactNextActionRef: isCurrent ? evidence.exactNextActionRef : 'action.refresh-public-current-state',
    privateStateRefs: [],
    currentContext: {
      handoffRefOrNull: null,
      projectionOrNull: null,
    },
    sourceRefs,
  };
}

function parseArgs(args) {
  const request = { task: '', questionIds: [], paths: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--task') request.task = args[++index] || '';
    else if (arg === '--question') request.questionIds.push(args[++index] || '');
    else if (arg === '--path') request.paths.push(args[++index] || '');
    else if (arg === '--max-maps') request.maxMaps = Number(args[++index]);
    else if (arg !== '--json') throw new Error(`unknown argument: ${arg}`);
  }
  return request;
}

function run(args = process.argv.slice(2)) {
  try {
    const projection = JSON.parse(fs.readFileSync(PROJECTION_PATH, 'utf8'));
    const packet = selectOrientationContext(projection, parseArgs(args));
    console.log(JSON.stringify(packet, null, 2));
    return 0;
  } catch (error) {
    console.error(`[select-orientation-context] ${error.message}`);
    return 1;
  }
}

if (require.main === module) process.exitCode = run();

module.exports = {
  BASELINE_MAPS,
  DEFAULT_MAX_MAPS,
  PUBLIC_PROVIDER_SCHEMA_VERSION,
  PUBLIC_PROVIDER_REF,
  PUBLIC_PROVIDER_QUESTION_CLASSES,
  normalizeText,
  normalizeRepoPath,
  pathMatches,
  scoreMaps,
  selectMapIds,
  buildReadOrder,
  selectOrientationContext,
  buildPublicOrientationProviderReceipt,
  parseArgs,
  run,
};

// [VXG RealForever]
