'use strict';

const crypto = require('node:crypto');

const PROVIDER_SCHEMA_VERSION = 'vextreme.orientation-provider-receipt/v1';
const PROVIDER_REF = 'provider.vextreme-public.orientation';
const REPOSITORY_REF = 'vgong24/Vextreme';
const PAT_SCHEMA_VERSION = 'vextreme.process-atlas.public-safe/v1';
const PAT_RECEIPT_SCHEMA_VERSION = 'vextreme.process-atlas.projection-receipt/v1';
const PAT_VISIBILITY_REF = 'synthetic.visibility.public-safe';
const CURRENT_STATES = new Set(['CURRENT', 'STALE', 'UNAVAILABLE', 'UNKNOWN']);
const CLAIM_STATUSES = new Set(['active', 'waiting', 'review']);
const REF_RE = /^[A-Za-z0-9][A-Za-z0-9._:/\[\]-]*$/;
const SOURCE_REF_RE = /^[A-Za-z][A-Za-z0-9-]*\.[A-Za-z0-9][A-Za-z0-9._:/\[\]-]*$/;
const TIMESTAMP_RE = /^(?:(?:\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|02-(?:0[1-9]|1\d|2[0-8])))|(?:(?:[02468][048]00|[13579][26]00|\d{2}(?:0[48]|[2468][048]|[13579][26]))-02-29))T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/;
const PUBLIC_GITHUB_REF_RE = /^github\.(?:commit|pr|issue)\.vextreme\.[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const PUBLIC_WORK_REF_RE = /^(?:work|claim)\.vextreme\.[A-Za-z0-9][A-Za-z0-9._:/\[\]-]*$/;
const PUBLIC_SOURCE_REF_RE = /^public\.[A-Za-z0-9][A-Za-z0-9._:/\[\]-]*$/;

const QUESTION_CLASSES = Object.freeze([
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

const COLLECTION_REFS = Object.freeze({
  nodes: 'nodeRef',
  edges: 'edgeRef',
  lenses: 'lensRef',
  priorities: 'priorityRef',
  serialDependencies: 'serialDependencyRef',
  questions: 'questionRef',
  opportunities: 'opportunityRef',
  sources: 'sourceRef',
  evidence: 'evidenceRef',
  decisions: 'decisionRef',
  owners: 'ownerRef',
  authorities: 'authorityRef',
  freshnessAndInvalidation: 'freshnessRef',
  visibilityProfiles: 'visibilityProfileRef',
});

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!object(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
}

function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function sortProjectionCollections(projection) {
  const out = structuredClone(projection);
  for (const [field, refKey] of Object.entries(COLLECTION_REFS)) {
    if (Array.isArray(out[field])) {
      out[field].sort((left, right) => String(left[refKey]).localeCompare(String(right[refKey]), 'en'));
    }
  }
  if (Array.isArray(out.scopeRefs)) out.scopeRefs.sort();
  if (Array.isArray(out.parallelizableRefs)) out.parallelizableRefs.sort();
  return out;
}

function walk(value, visitor, keyPath = '$') {
  visitor(value, keyPath);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${keyPath}[${index}]`));
  } else if (object(value)) {
    Object.entries(value).forEach(([key, child]) => walk(child, visitor, `${keyPath}.${key}`));
  }
}

function refsFrom(value) {
  const refs = [];
  walk(value, (item, keyPath) => {
    const key = keyPath.split('.').pop() || '';
    if (typeof item === 'string' && /Ref$/.test(key)) refs.push(item);
    if (Array.isArray(item) && /Refs$/.test(key)) refs.push(...item.filter(entry => typeof entry === 'string'));
  });
  return refs;
}

function assertRef(value, label) {
  if (typeof value !== 'string' || value.length > 1024 || !REF_RE.test(value)) {
    throw new Error(`${label} must be a reference-safe string`);
  }
  return value;
}

function assertSourceRef(value, label) {
  if (typeof value !== 'string' || value.length > 1024 || !SOURCE_REF_RE.test(value)) {
    throw new Error(`${label} must be a source-reference-safe string`);
  }
  return value;
}

function assertSyntheticRef(value, label) {
  assertRef(value, label);
  if (!value.startsWith('synthetic.')) throw new Error(`${label} must remain in the synthetic namespace`);
  return value;
}

function assertPublicRepositoryRef(value, label, { source = false } = {}) {
  if (source) assertSourceRef(value, label);
  else assertRef(value, label);
  if (!PUBLIC_GITHUB_REF_RE.test(value) && !PUBLIC_WORK_REF_RE.test(value) && !PUBLIC_SOURCE_REF_RE.test(value)) {
    throw new Error(`${label} is outside the public repository reference boundary`);
  }
  return value;
}

function assertPublicRefArray(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return sortedUnique(value.map((item, index) => assertPublicRepositoryRef(item, `${label}[${index}]`)));
}

function isCanonicalUtcTimestamp(value) {
  if (typeof value !== 'string' || !TIMESTAMP_RE.test(value)) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const canonical = value.includes('.') ? value : value.replace(/Z$/, '.000Z');
  return parsed.toISOString() === canonical;
}

function validatePublicAtlas(atlas) {
  if (!object(atlas)) throw new Error('processAtlas must be a public-safe object');
  if (atlas.schemaVersion !== PAT_SCHEMA_VERSION) throw new Error(`${PAT_SCHEMA_VERSION} is required`);
  assertSyntheticRef(atlas.atlasRef, 'processAtlas.atlasRef');

  const allRefs = refsFrom(atlas);
  if (allRefs.length === 0) throw new Error('processAtlas must contain source-addressable refs');
  allRefs.forEach((ref, index) => assertSyntheticRef(ref, `processAtlas.ref[${index}]`));

  const forbiddenKey = /^(secret|password|credential|token|rawReceipt|rawReceiptId|accountId|accountNumber|bankAccount|bankRouting|paymentCard)$/i;
  walk(atlas, (value, keyPath) => {
    const key = keyPath.split('.').pop() || '';
    if (forbiddenKey.test(key)) throw new Error(`processAtlas contains a forbidden field at ${keyPath}`);
  });

  if (!Array.isArray(atlas.nodes) || !Array.isArray(atlas.edges) || !Array.isArray(atlas.sources)) {
    throw new Error('processAtlas nodes, edges, and sources are required');
  }
  if (!atlas.sources.length || atlas.sources.some(source => source.sourceClass !== 'SOURCE_MANAGED_SYNTHETIC')) {
    throw new Error('processAtlas sources must remain source-managed synthetic records');
  }

  const receipt = atlas.projectionReceipt;
  if (!object(receipt) || receipt.schemaVersion !== PAT_RECEIPT_SCHEMA_VERSION) {
    throw new Error(`${PAT_RECEIPT_SCHEMA_VERSION} is required`);
  }
  assertSyntheticRef(receipt.projectionReceiptRef, 'processAtlas.projectionReceipt.projectionReceiptRef');
  if (receipt.publicNodeCount !== atlas.nodes.length || receipt.publicEdgeCount !== atlas.edges.length) {
    throw new Error('processAtlas projection receipt count mismatch');
  }
  if (receipt.omittedPrivateNodeCount !== 0 || receipt.omittedPrivateEdgeCount !== 0 || receipt.transformedAliasCount !== 0) {
    throw new Error('processAtlas projection receipt must remain wholly synthetic and lossless');
  }
  if (!Array.isArray(receipt.visibilityProfileRefs) || !receipt.visibilityProfileRefs.includes(PAT_VISIBILITY_REF)) {
    throw new Error('processAtlas projection receipt must declare the public-safe visibility profile');
  }

  const base = structuredClone(atlas);
  delete base.projectionReceipt;
  const expectedHash = crypto
    .createHash('sha256')
    .update(stableStringify(sortProjectionCollections(base)))
    .digest('hex');
  if (receipt.contentSha256 !== expectedHash) throw new Error('processAtlas projection receipt hash mismatch');

  const sourceRefs = sortedUnique(refsFrom(atlas.sources));
  sourceRefs.forEach((ref, index) => assertSyntheticRef(ref, `processAtlas.sourceRefs[${index}]`));
  if (!sourceRefs.length) throw new Error('processAtlas must include synthetic source refs');

  return {
    atlasRef: atlas.atlasRef,
    projectionReceiptRef: receipt.projectionReceiptRef,
    sourceRefs,
  };
}

function normalizeCoordination(coordination) {
  if (coordination === undefined) {
    return { liveStatus: 'unknown', valid: false, currentClaimRefs: [], blockers: ['blocker.public-work-coordination-unknown'] };
  }
  if (!object(coordination)) throw new Error('currentWorkEvidence.coordination must be an object');
  const allowed = new Set(['liveStatus', 'valid', 'claims']);
  for (const key of Object.keys(coordination)) {
    if (!allowed.has(key)) throw new Error(`currentWorkEvidence.coordination.${key} is not allowed`);
  }
  const liveStatus = String(coordination.liveStatus || 'unknown');
  const valid = coordination.valid === true;
  const claims = Array.isArray(coordination.claims) ? coordination.claims : [];
  if (liveStatus !== 'available' || !valid) {
    return {
      liveStatus,
      valid: false,
      currentClaimRefs: [],
      blockers: [liveStatus === 'available' ? 'blocker.public-work-coordination-invalid' : 'blocker.public-work-coordination-unavailable'],
    };
  }

  const currentClaimRefs = [];
  for (const [index, claim] of claims.entries()) {
    if (!object(claim)) throw new Error(`currentWorkEvidence.coordination.claims[${index}] must be an object`);
    if (claim.repository !== REPOSITORY_REF) throw new Error(`currentWorkEvidence.coordination.claims[${index}] repository mismatch`);
    if (!CLAIM_STATUSES.has(claim.status)) throw new Error(`currentWorkEvidence.coordination.claims[${index}] status is unsupported`);
    if (claim.coordinationOnly !== true || claim.implementationAuthority !== false) {
      throw new Error(`currentWorkEvidence.coordination.claims[${index}] must remain coordination-only`);
    }
    currentClaimRefs.push(assertPublicRepositoryRef(claim.workRef, `currentWorkEvidence.coordination.claims[${index}].workRef`));
  }
  return { liveStatus, valid: true, currentClaimRefs: sortedUnique(currentClaimRefs), blockers: [] };
}

function normalizeCurrentWorkEvidence(value) {
  if (!object(value)) throw new Error('currentWorkEvidence must be an object');
  const allowed = new Set([
    'repositoryRef', 'sourceRef', 'liveSourceRefOrNull', 'currentState', 'currentWorkRef',
    'currentEntryRefs', 'currentAcceptedRefs', 'priorAcceptedRefs', 'supersededRefs',
    'nextEligibleRefs', 'nextHeldRefs', 'exactNextActionRef', 'coordination',
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`currentWorkEvidence.${key} is not allowed`);
  }
  if (value.repositoryRef !== REPOSITORY_REF) throw new Error(`currentWorkEvidence.repositoryRef must be ${REPOSITORY_REF}`);
  if (!CURRENT_STATES.has(value.currentState)) throw new Error('currentWorkEvidence.currentState is unsupported');

  const sourceRef = assertPublicRepositoryRef(value.sourceRef, 'currentWorkEvidence.sourceRef', { source: true });
  const liveSourceRefOrNull = value.liveSourceRefOrNull == null
    ? null
    : assertPublicRepositoryRef(value.liveSourceRefOrNull, 'currentWorkEvidence.liveSourceRefOrNull');
  const currentAcceptedRefs = assertPublicRefArray(value.currentAcceptedRefs, 'currentWorkEvidence.currentAcceptedRefs');
  const coordination = normalizeCoordination(value.coordination);

  let currentState = value.currentState;
  if (currentState === 'CURRENT' && (liveSourceRefOrNull === null || currentAcceptedRefs.length === 0 || coordination.liveStatus !== 'available')) {
    currentState = 'UNKNOWN';
  }

  return {
    sourceRef,
    liveSourceRefOrNull,
    currentState,
    currentWorkRef: value.currentWorkRef == null
      ? null
      : assertPublicRepositoryRef(value.currentWorkRef, 'currentWorkEvidence.currentWorkRef'),
    currentEntryRefs: assertPublicRefArray(value.currentEntryRefs, 'currentWorkEvidence.currentEntryRefs'),
    currentAcceptedRefs,
    priorAcceptedRefs: assertPublicRefArray(value.priorAcceptedRefs, 'currentWorkEvidence.priorAcceptedRefs'),
    supersededRefs: assertPublicRefArray(value.supersededRefs, 'currentWorkEvidence.supersededRefs'),
    nextEligibleRefs: assertPublicRefArray(value.nextEligibleRefs, 'currentWorkEvidence.nextEligibleRefs'),
    nextHeldRefs: assertPublicRefArray(value.nextHeldRefs, 'currentWorkEvidence.nextHeldRefs'),
    exactNextActionRef: value.exactNextActionRef == null
      ? null
      : assertPublicRepositoryRef(value.exactNextActionRef, 'currentWorkEvidence.exactNextActionRef'),
    coordination,
  };
}

function buildPublicOrientationProviderReceipt({ currentWorkEvidence, processAtlas, observedAt }) {
  if (!isCanonicalUtcTimestamp(observedAt)) throw new Error('observedAt must be an explicit valid UTC timestamp');
  const atlas = validatePublicAtlas(processAtlas);
  const evidence = normalizeCurrentWorkEvidence(currentWorkEvidence);
  const isCurrent = evidence.currentState === 'CURRENT';
  const coordinationHealthy = evidence.coordination.valid;
  const sourceRefs = sortedUnique([
    ...atlas.sourceRefs,
    evidence.sourceRef,
    ...(evidence.liveSourceRefOrNull ? [evidence.liveSourceRefOrNull] : []),
  ]);
  sourceRefs.forEach((ref, index) => assertSourceRef(ref, `sourceRefs[${index}]`));

  const freshnessBlocked = !isCurrent;
  const blockers = sortedUnique([
    ...evidence.coordination.blockers,
    ...(freshnessBlocked ? [`blocker.public-currentness-${evidence.currentState.toLowerCase()}`] : []),
  ]);
  const attentions = sortedUnique([
    'attention.public-relay-state-unknown',
    ...(!coordinationHealthy ? ['attention.public-work-coordination'] : []),
    ...(freshnessBlocked ? ['attention.public-currentness'] : []),
  ]);
  const unknownRefs = sortedUnique([
    'public.source.relay-state',
    ...(!coordinationHealthy ? ['public.source.work-coordination'] : []),
    ...(freshnessBlocked ? ['public.source.fresh-current-state'] : []),
  ]);
  const exactNextActionRef = isCurrent && coordinationHealthy
    ? evidence.exactNextActionRef
    : (coordinationHealthy ? 'action.refresh-public-current-state' : 'action.refresh-public-work-coordination');

  const questionCoverage = QUESTION_CLASSES.map(questionClass => ({
    questionClass,
    requiredSourceRefs: sourceRefs,
    optionalSourceRefs: [],
    alreadyCoveredSourceRefs: sourceRefs,
    missingSourceRefs: [],
  }));

  return {
    schemaVersion: PROVIDER_SCHEMA_VERSION,
    providerRef: PROVIDER_REF,
    providerClass: 'PUBLIC_VEXTREME',
    repositoryRef: REPOSITORY_REF,
    visibility: 'PUBLIC',
    projectionScope: 'PUBLIC_SAFE',
    observedAt,
    freshnessState: {
      liveSourceRefOrNull: evidence.liveSourceRefOrNull,
      staticSourceRefOrNull: atlas.projectionReceiptRef,
      selectedSourceClass: isCurrent ? 'LIVE' : 'UNKNOWN',
      selectionReasonRef: isCurrent
        ? 'rule.live-public-evidence-outranks-static-process-grammar'
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
      whyThisRoleWasSelectedRef: 'rule.repository-owned-public-provider',
      whatThisRoleOwnsRefs: ['boundary.public-provider-projection'],
      whatThisRoleMustNotOwnRefs: ['boundary.cross-repository-authority', 'boundary.publication-effect'],
      acceptedInputRefs: [atlas.atlasRef, evidence.sourceRef].sort(),
      requiredOutputRefs: ['receipt.public-orientation-provider'],
      returnRouteRef: null,
      completionGateRefs: ['gate.public-currentness', 'gate.public-safe'],
      currentDependencies: [atlas.atlasRef],
      currentPeers: [],
      whatHappensAfterReturnRefs: ['process.federated-orientation-resolve'],
    },
    functionState: {
      availableFunctionRefs: ['function.public-orientation-provider-project'],
      requiredFunctionRefs: ['function.public-orientation-provider-project'],
      unavailableFunctionRefs: [],
    },
    capabilityState: {
      implementedCapabilityRefs: ['capability.public-orientation-provider', 'capability.public-process-atlas'].sort(),
      mappedCapabilityRefs: ['capability.public-orientation-provider'],
      activeCapabilityRefs: isCurrent && coordinationHealthy ? ['capability.public-orientation-provider'] : [],
      heldCapabilityRefs: ['capability.cross-repository-authority', 'capability.publication-effect'].sort(),
      blockedCapabilityRefs: isCurrent && coordinationHealthy ? [] : ['capability.current-state-answer'],
      completedCapabilityRefs: ['capability.public-process-atlas'],
    },
    edges: [
      {
        edgeRef: 'edge.public-orientation-provider-source-atlas',
        edgeClass: 'SOURCE_ORIGIN',
        fromRef: PROVIDER_REF,
        toRef: atlas.atlasRef,
        sourceRefs: atlas.sourceRefs,
      },
      {
        edgeRef: 'edge.public-orientation-provider-current-evidence',
        edgeClass: 'VALIDATED_BY',
        fromRef: PROVIDER_REF,
        toRef: evidence.sourceRef,
        sourceRefs: [evidence.sourceRef],
      },
    ],
    questionCoverage,
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
      availableFunctionRefOrNull: 'function.public-orientation-provider-project',
      typedEffectEvidenceOrNull: null,
    },
    resourceEnvelope: {
      machineScopeRefs: [],
      availableResourceRefs: ['resource.public-process-atlas'],
      requiredResourceRefs: ['resource.public-current-state-evidence'],
      unavailableResourceRefs: [],
      unknownResourceRefs: isCurrent ? [] : ['resource.public-current-state-freshness'],
    },
    currentClaimRefs: coordinationHealthy ? evidence.coordination.currentClaimRefs : [],
    conflictingClaimRefs: [],
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
    exactNextActionRef,
    privateStateRefs: [],
    currentContext: {
      handoffRefOrNull: null,
      projectionOrNull: null,
    },
    sourceRefs,
  };
}

module.exports = {
  PROVIDER_SCHEMA_VERSION,
  PROVIDER_REF,
  REPOSITORY_REF,
  QUESTION_CLASSES,
  stableStringify,
  sortProjectionCollections,
  refsFrom,
  validatePublicAtlas,
  normalizeCurrentWorkEvidence,
  buildPublicOrientationProviderReceipt,
};

// [VXG RealForever]
