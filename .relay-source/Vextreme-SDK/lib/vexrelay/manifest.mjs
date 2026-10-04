import fs from 'node:fs/promises';
import {
  CAPABILITY_STATES, CANDIDATE_STATES, COMPLETION_PROGRESS_MODES, COMPLETION_TARGETS, CONFLICT_STATES, CONTINUITY,
  EFFECT_BY_PRIMITIVE, ENTRY_CLASSES, LIFECYCLE_STATES, LOOP_ALLOWED_PRIMITIVES,
  MUTATING_PRIMITIVES, PRIMITIVE_SET, PUBLISH_EFFECT_BY_ACTION, REPOSITORY_ACTIONS,
  HUMAN_ROUND_TRIP_POLICIES, MAXIMAL_SAFE_STOP_REASONS, REMOTE_OBSERVATION_OWNERS, REPOSITORY_CLONE_TRANSPORTS, REPOSITORY_MODES, ROLE_STATES, SCOPE_MODES, SECRET_ENV_PATTERN, STOP_REASON_CLASSES,
  TASK_SCHEMA_VERSION, WORKSPACE_MODES,
} from './constants.mjs';
import { sha256Object } from './hash.mjs';
import { commandArgumentsContainCredentials, isCommandAuthorized, remoteUrlHasCredentials } from './process.mjs';
import {
  normalizeRelativePath, normalizeRepositoryRef, pathMatchesMembrane, repositoryPathKey,
  validateGitBranchName, validateGitRef, validateGitRemoteName,
} from './paths.mjs';

const REMOTE_QUERY_ACTIONS = new Set(['PULL_REQUEST', 'ISSUE', 'RUN', 'RUN_LOG', 'REMOTE_REVIEW_SNAPSHOT', 'PR_CHECKS']);
const REMOTE_PUBLISH_ACTIONS = new Set(['PUSH', 'PULL_REQUEST', 'UPDATE_PULL_REQUEST_BODY']);
const MUTATION_ROLES = new Set(['CODER', 'PROJECT_PROTOCOL_MAINTENANCE']);
const ROUTE_FIELDS = ['lifecycleState', 'nextFunction', 'nextOwner', 'whyThisIsNext'];

function requiredString(value, field, { allowNone = false } = {}) {
  if (typeof value !== 'string' || value.trim() === '' || value.trim().toUpperCase() === 'UNKNOWN' || (!allowNone && value === 'NONE')) {
    throw new Error(`MANIFEST_REQUIRED_STRING:${field}`);
  }
}

function stringArray(value, field, { nonEmpty = true } = {}) {
  if (!Array.isArray(value) || (nonEmpty && value.length === 0) || !value.every((entry) => typeof entry === 'string' && entry.trim() !== '')) {
    throw new Error(`MANIFEST_STRING_ARRAY:${field}`);
  }
  if (new Set(value).size !== value.length) throw new Error(`MANIFEST_DUPLICATE_VALUES:${field}`);
}

function exactHash(value) { return typeof value === 'string' && /^[0-9a-f]{40,64}$/i.test(value); }
function sha256(value) { return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value); }
function hasUnknown(value) {
  if (typeof value === 'string') return value.trim().toUpperCase() === 'UNKNOWN';
  if (Array.isArray(value)) return value.some(hasUnknown);
  if (value && typeof value === 'object') return Object.values(value).some(hasUnknown);
  return false;
}

function validateRoute(route, field) {
  if (!route || typeof route !== 'object' || Array.isArray(route)) throw new Error(`MANIFEST_ROUTE_REQUIRED:${field}`);
  for (const key of ROUTE_FIELDS) requiredString(route[key], `${field}.${key}`);
  if (!LIFECYCLE_STATES.has(route.lifecycleState)) throw new Error(`MANIFEST_ROUTE_LIFECYCLE_STATE:${field}:${route.lifecycleState}`);
  if (route.remainingGoals !== undefined) stringArray(route.remainingGoals, `${field}.remainingGoals`, { nonEmpty: false });
}

function validateCompletionPolicy(policy, lane, continuationPlan) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) throw new Error('MANIFEST_COMPLETION_POLICY_REQUIRED');
  if (!COMPLETION_PROGRESS_MODES.has(policy.progressMode)) throw new Error(`MANIFEST_COMPLETION_PROGRESS_MODE:${policy.progressMode}`);
  if (!COMPLETION_TARGETS.has(policy.completionTarget)) throw new Error(`MANIFEST_COMPLETION_TARGET:${policy.completionTarget}`);
  if (typeof policy.automaticContinuation !== 'boolean') throw new Error('MANIFEST_COMPLETION_AUTOMATIC_CONTINUATION');
  if (!HUMAN_ROUND_TRIP_POLICIES.has(policy.humanRoundTripPolicy)) throw new Error(`MANIFEST_HUMAN_ROUND_TRIP_POLICY:${policy.humanRoundTripPolicy}`);
  stringArray(policy.stopOnlyOn, 'completionPolicy.stopOnlyOn');
  for (const reason of policy.stopOnlyOn) if (!STOP_REASON_CLASSES.has(reason)) throw new Error(`MANIFEST_COMPLETION_STOP_REASON:${reason}`);
  if (policy.completionTarget === 'EXACT_NAMED_GATE') requiredString(policy.stageGateOrNull, 'completionPolicy.stageGateOrNull');
  else if (policy.stageGateOrNull !== null) throw new Error('MANIFEST_COMPLETION_STAGE_GATE_MUST_BE_NULL');

  if (lane.scopeMode === 'FULL_LOCAL_LIFECYCLE') {
    if (policy.progressMode !== 'MAXIMAL_SAFE_PROGRESS') throw new Error('MANIFEST_FULL_LIFECYCLE_REQUIRES_MAXIMAL_SAFE_PROGRESS');
    if (policy.completionTarget !== 'TERMINAL_LOCAL_RETURN') throw new Error('MANIFEST_FULL_LIFECYCLE_REQUIRES_TERMINAL_RETURN');
    if (policy.automaticContinuation !== true) throw new Error('MANIFEST_FULL_LIFECYCLE_REQUIRES_AUTOMATIC_CONTINUATION');
    const observed = [...policy.stopOnlyOn].sort();
    const expected = [...MAXIMAL_SAFE_STOP_REASONS].sort();
    if (JSON.stringify(observed) !== JSON.stringify(expected)) throw new Error('MANIFEST_FULL_LIFECYCLE_STOP_REASONS_EXACT');
  } else if (policy.progressMode !== 'EXACT_STAGE_GATE') {
    throw new Error('MANIFEST_BOUNDED_SCOPE_REQUIRES_EXACT_STAGE_GATE');
  }

  const routes = [continuationPlan.onPass, continuationPlan.onFailure, continuationPlan.onUserActionRequired];
  if (continuationPlan.currentLifecycleState !== 'TERMINAL_RETURN_PENDING') {
    for (const route of routes) {
      if (route.lifecycleState === 'TERMINAL_RETURNED' || route.nextFunction === 'TERMINAL') {
        throw new Error(`MANIFEST_PREMATURE_TERMINAL_ROUTE:${continuationPlan.currentLifecycleState}`);
      }
    }
  }
}

function validateSourcePathRecord(record, field, repositories, membranes) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`MANIFEST_SOURCE_PATH_RECORD:${field}`);
  const repositoryRef = normalizeRepositoryRef(record.repositoryRef);
  if (!repositories.has(repositoryRef)) throw new Error(`MANIFEST_SOURCE_REPOSITORY_UNKNOWN:${field}:${repositoryRef}`);
  const rel = normalizeRelativePath(record.path, `${field}_path`);
  const membrane = membranes.get(repositoryRef);
  if (!membrane || !pathMatchesMembrane(rel, membrane)) throw new Error(`MANIFEST_SOURCE_PATH_OUTSIDE_MEMBRANE:${repositoryRef}:${rel}`);
  return { repositoryRef, path: rel, key: repositoryPathKey(repositoryRef, rel) };
}

function effectFor(operation) {
  if (operation.op === 'PUBLISH') return PUBLISH_EFFECT_BY_ACTION[operation.action];
  return EFFECT_BY_PRIMITIVE[operation.op];
}

function operationRepositoryRef(operation, repositories, field) {
  if (operation.op === 'RESPOND') return null;
  if (operation.op === 'READ' && operation.action === 'PACKAGE_FILE') return null;
  if (operation.op === 'LOOP') return null;
  const ref = normalizeRepositoryRef(operation.repositoryRef);
  if (!repositories.has(ref)) throw new Error(`MANIFEST_OPERATION_REPOSITORY_UNKNOWN:${field}:${ref}`);
  return ref;
}

function validateLoop(operation, field, repositories, authority, capabilities, refs) {
  if (!Number.isInteger(operation.maxIterations) || operation.maxIterations < 1 || operation.maxIterations > 50) {
    throw new Error(`MANIFEST_LOOP_MAX_ITERATIONS:${field}`);
  }
  if (!Number.isInteger(operation.intervalMs) || operation.intervalMs < 0 || operation.intervalMs > 60_000) {
    throw new Error(`MANIFEST_LOOP_INTERVAL:${field}`);
  }
  if (!Array.isArray(operation.body) || operation.body.length === 0) throw new Error(`MANIFEST_LOOP_BODY_REQUIRED:${field}`);
  if (!operation.exitWhen || typeof operation.exitWhen !== 'object') throw new Error(`MANIFEST_LOOP_EXIT_PREDICATE_REQUIRED:${field}`);
  if (!['EQUALS', 'IN', 'TRUTHY'].includes(operation.exitWhen.operator)) throw new Error(`MANIFEST_LOOP_EXIT_OPERATOR:${field}`);
  requiredString(operation.exitWhen.path, `${field}.exitWhen.path`);
  for (const [index, child] of operation.body.entries()) {
    const childField = `${field}.body[${index}]`;
    if (!child || typeof child !== 'object' || !LOOP_ALLOWED_PRIMITIVES.has(child.op)) {
      throw new Error(`MANIFEST_LOOP_MUTATION_OR_CONTROL_FORBIDDEN:${childField}:${child?.op ?? 'INVALID'}`);
    }
    validateOperation(child, childField, repositories, authority, capabilities, refs, { nested: true });
  }
}

function validateOperation(operation, field, repositories, authority, capabilities, refs, { nested = false } = {}) {
  if (!operation || typeof operation !== 'object' || Array.isArray(operation)) throw new Error(`MANIFEST_OPERATION_OBJECT:${field}`);
  requiredString(operation.ref, `${field}.ref`);
  if (refs.has(operation.ref)) throw new Error(`MANIFEST_DUPLICATE_OPERATION_REF:${operation.ref}`);
  refs.add(operation.ref);
  if (!PRIMITIVE_SET.has(operation.op)) throw new Error(`MANIFEST_OPERATION_PRIMITIVE:${field}:${operation.op}`);
  if (!REPOSITORY_ACTIONS[operation.op]?.has(operation.action)) throw new Error(`MANIFEST_OPERATION_ACTION:${field}:${operation.op}:${operation.action}`);
  if (operation.op === 'LOOP') validateLoop(operation, field, repositories, authority, capabilities, refs);
  const repositoryRef = operationRepositoryRef(operation, repositories, field);
  const effect = effectFor(operation);
  if (effect && !authority.remainingEffects.includes(effect)) throw new Error(`MANIFEST_OPERATION_EFFECT_NOT_AUTHORIZED:${field}:${effect}`);
  if (MUTATING_PRIMITIVES.has(operation.op) && !MUTATION_ROLES.has(authority.activeRole)) throw new Error(`MANIFEST_MUTATION_ROLE_FORBIDDEN:${field}:${authority.activeRole}`);
  if (operation.op === 'RUN' && operation.mutationClass === 'SOURCE' && !MUTATION_ROLES.has(authority.activeRole)) throw new Error(`MANIFEST_RUN_MUTATION_ROLE_FORBIDDEN:${field}`);
  if (operation.op === 'QUERY' && REMOTE_QUERY_ACTIONS.has(operation.action) && capabilities.platformGitHubRead !== 'UNAVAILABLE') {
    throw new Error(`MANIFEST_REMOTE_QUERY_FALLBACK_NOT_EARNED:${field}:${capabilities.platformGitHubRead}`);
  }
  if (operation.op === 'LISTEN' && capabilities.platformGitHubRead !== 'UNAVAILABLE') {
    throw new Error(`MANIFEST_LISTEN_FALLBACK_NOT_EARNED:${field}:${capabilities.platformGitHubRead}`);
  }
  if (operation.op === 'PUBLISH' && REMOTE_PUBLISH_ACTIONS.has(operation.action) && capabilities.platformGitHubWrite !== 'UNAVAILABLE') {
    throw new Error(`MANIFEST_REMOTE_PUBLISH_FALLBACK_NOT_EARNED:${field}:${capabilities.platformGitHubWrite}`);
  }
  if (operation.op === 'READ') {
    if (['FILE', 'LIST', 'PACKAGE_FILE'].includes(operation.action)) normalizeRelativePath(operation.path, `${field}_path`);
    if (operation.action === 'DIFF') {
      if (operation.base !== undefined && !exactHash(operation.base)) throw new Error(`MANIFEST_READ_DIFF_BASE_EXACT:${field}`);
      if (operation.head !== undefined) validateGitRef(operation.head, `${field}_head`);
    }
    if (operation.maxBytes !== undefined && (!Number.isInteger(operation.maxBytes) || operation.maxBytes < 0 || operation.maxBytes > 10_000_000)) {
      throw new Error(`MANIFEST_READ_MAX_BYTES:${field}`);
    }
  }
  if (operation.op === 'QUERY') {
    if (['PULL_REQUEST', 'ISSUE'].includes(operation.action) && (!Number.isInteger(operation.number) || operation.number < 1)) throw new Error(`MANIFEST_QUERY_NUMBER_REQUIRED:${field}`);
    if (['RUN', 'RUN_LOG'].includes(operation.action) && (!Number.isInteger(operation.runId) && !(typeof operation.runId === 'string' && /^\d+$/.test(operation.runId)))) throw new Error(`MANIFEST_QUERY_RUN_ID_REQUIRED:${field}`);
    if (['CHANGED_PATHS', 'REVIEW_SNAPSHOT', 'REMOTE_REVIEW_SNAPSHOT'].includes(operation.action) && operation.base !== undefined && !exactHash(operation.base)) throw new Error(`MANIFEST_QUERY_BASE_EXACT:${field}`);
    if (['CHANGED_PATHS', 'REVIEW_SNAPSHOT'].includes(operation.action) && operation.head !== undefined) validateGitRef(operation.head, `${field}_head`);
    if (operation.action === 'REMOTE_REVIEW_SNAPSHOT' && operation.branch !== undefined) validateGitBranchName(operation.branch, `${field}_branch`);
    for (const [name, paths] of [['includePaths', operation.includePaths], ['excludePaths', operation.excludePaths]]) {
      if (paths !== undefined) {
        if (!Array.isArray(paths) || paths.some((value) => typeof value !== 'string')) throw new Error(`MANIFEST_QUERY_PATHS:${field}:${name}`);
        paths.forEach((value) => normalizeRelativePath(value, `${field}_${name}`));
      }
    }
  }
  if (operation.op === 'WRITE') {
    const target = normalizeRelativePath(operation.target, `${field}_target`);
    const membrane = authority.membranes.get(repositoryRef);
    if (!pathMatchesMembrane(target, membrane)) throw new Error(`MANIFEST_WRITE_OUTSIDE_MEMBRANE:${repositoryRef}:${target}`);
    if (!['ABSENT', 'PRESENT'].includes(operation.expectedBeforeSha256) && !sha256(operation.expectedBeforeSha256)) {
      throw new Error(`MANIFEST_WRITE_PREIMAGE_INVALID:${field}`);
    }
    if (operation.action === 'COPY_FILE') {
      normalizeRelativePath(operation.source, `${field}_source`);
      if (!sha256(operation.sourceSha256)) throw new Error(`MANIFEST_WRITE_SOURCE_SHA256_REQUIRED:${field}`);
      if (operation.mode !== undefined && !/^[0-7]{3,4}$/.test(operation.mode)) throw new Error(`MANIFEST_WRITE_MODE_INVALID:${field}`);
    }
    if (operation.action === 'REPLACE_TEXT') {
      if (typeof operation.find !== 'string' || operation.find.length === 0 || typeof operation.replace !== 'string') throw new Error(`MANIFEST_REPLACE_FIELDS_REQUIRED:${field}`);
      if (operation.expectedCount !== undefined && (!Number.isInteger(operation.expectedCount) || operation.expectedCount < 1)) throw new Error(`MANIFEST_REPLACE_COUNT:${field}`);
    }
  }
  if (operation.op === 'RUN' || (operation.op === 'CHECK' && operation.action === 'COMMAND')) {
    requiredString(operation.command, `${field}.command`);
    if (!Array.isArray(operation.args) || !operation.args.every((value) => typeof value === 'string')) throw new Error(`MANIFEST_COMMAND_ARGS:${field}`);
    if (!isCommandAuthorized(operation.command, authority.allowedExecutables)) {
      throw new Error(`MANIFEST_COMMAND_NOT_ALLOWLISTED:${field}:${operation.command}`);
    }
    if (commandArgumentsContainCredentials(operation.args)) {
      throw new Error(`MANIFEST_COMMAND_ARG_CREDENTIALS_FORBIDDEN:${field}`);
    }
    if (operation.stdin !== undefined && operation.stdin !== null) {
      throw new Error(`MANIFEST_COMMAND_STDIN_FORBIDDEN:${field}`);
    }
    for (const key of operation.inheritEnvKeys ?? []) {
      if (!authority.allowedEnvironment.includes(key)) throw new Error(`MANIFEST_ENV_NOT_ALLOWLISTED:${field}:${key}`);
      if (SECRET_ENV_PATTERN.test(key)) throw new Error(`MANIFEST_SECRET_ENV_INHERIT_FORBIDDEN:${field}:${key}`);
    }
    if (operation.env !== undefined) {
      if (!operation.env || typeof operation.env !== 'object' || Array.isArray(operation.env)) throw new Error(`MANIFEST_COMMAND_ENV_OBJECT:${field}`);
      for (const [key, value] of Object.entries(operation.env)) {
        if (!authority.allowedEnvironment.includes(key)) throw new Error(`MANIFEST_ENV_NOT_ALLOWLISTED:${field}:${key}`);
        if (SECRET_ENV_PATTERN.test(key)) throw new Error(`MANIFEST_SECRET_ENV_INLINE_FORBIDDEN:${field}:${key}`);
        if (typeof value !== 'string') throw new Error(`MANIFEST_ENV_VALUE_STRING:${field}:${key}`);
      }
    }
    if (operation.op === 'RUN' && !['TEST', 'TOOL'].includes(operation.proofClass)) throw new Error(`MANIFEST_RUN_PROOF_CLASS:${field}`);
    if (typeof operation.candidateEvidence !== 'boolean') throw new Error(`MANIFEST_COMMAND_CANDIDATE_EVIDENCE_BOOLEAN:${field}`);
    if (operation.op === 'RUN' && operation.proofClass === 'TEST') {
      const accepted = operation.acceptedExitCodes ?? [0];
      if (accepted.length !== 1 || accepted[0] !== 0) throw new Error(`MANIFEST_TEST_PROOF_REQUIRES_ZERO_EXIT_ONLY:${field}`);
    }
    if (operation.mutationClass !== undefined && !['NONE', 'SOURCE'].includes(operation.mutationClass)) throw new Error(`MANIFEST_COMMAND_MUTATION_CLASS:${field}`);
    if (operation.cwd !== undefined) normalizeRelativePath(operation.cwd, `${field}_cwd`);
    if (operation.cwdRoot !== undefined && !['REPOSITORY', 'PACKAGE', 'WORKSPACE', 'RUN'].includes(operation.cwdRoot)) throw new Error(`MANIFEST_COMMAND_CWD_ROOT:${field}`);
    if (operation.acceptedExitCodes !== undefined && (!Array.isArray(operation.acceptedExitCodes) || operation.acceptedExitCodes.length === 0 || !operation.acceptedExitCodes.every(Number.isInteger))) throw new Error(`MANIFEST_COMMAND_EXIT_CODES:${field}`);
    if (operation.timeoutMs !== undefined && (!Number.isInteger(operation.timeoutMs) || operation.timeoutMs < 1 || operation.timeoutMs > 3_600_000)) throw new Error(`MANIFEST_COMMAND_TIMEOUT:${field}`);
  }
  if (operation.op === 'CHECK') {
    if (operation.action === 'FILE_HASH') {
      normalizeRelativePath(operation.path, `${field}_path`);
      if (!sha256(operation.expectedSha256)) throw new Error(`MANIFEST_CHECK_FILE_HASH_REQUIRED:${field}`);
    }
    if (operation.action === 'EXPECTED_CHANGED_PATHS_EXACT' && operation.paths !== undefined) {
      if (!Array.isArray(operation.paths) || operation.paths.some((value) => typeof value !== 'string')) throw new Error(`MANIFEST_CHECK_PATH_SET:${field}`);
      operation.paths.forEach((value) => normalizeRelativePath(value, `${field}_paths`));
    }
    if (operation.refName !== undefined) validateGitRef(operation.refName, `${field}_ref_name`);
    if (['EXPECTED_HEAD', 'REMOTE_BRANCH_HEAD'].includes(operation.action) && operation.expected !== undefined && operation.expected !== '$CANDIDATE_HEAD' && !exactHash(operation.expected)) throw new Error(`MANIFEST_CHECK_EXPECTED_HEAD:${field}`);
    if (operation.action === 'EXPECTED_TREE' && operation.expected !== '$CANDIDATE_TREE' && !exactHash(operation.expected)) throw new Error(`MANIFEST_CHECK_EXPECTED_TREE:${field}`);
    if (['REMOTE_BRANCH_ABSENT', 'REMOTE_BRANCH_HEAD'].includes(operation.action) && operation.branch !== undefined) validateGitBranchName(operation.branch, `${field}_branch`);
  }
  if (operation.op === 'PUBLISH') {
    if (operation.branch !== undefined) validateGitBranchName(operation.branch, `${field}_branch`);
    if (operation.startPoint !== undefined && !exactHash(operation.startPoint)) throw new Error(`MANIFEST_PUBLISH_START_POINT_EXACT:${field}`);
    if (operation.expectedExistingHead !== undefined && !exactHash(operation.expectedExistingHead)) throw new Error(`MANIFEST_PUBLISH_EXISTING_HEAD_EXACT:${field}`);
    if (operation.expectedRemoteHead !== undefined && operation.expectedRemoteHead !== null && !exactHash(operation.expectedRemoteHead)) throw new Error(`MANIFEST_PUBLISH_REMOTE_HEAD_EXACT:${field}`);
    if (operation.action === 'COMMIT') {
      requiredString(operation.message, `${field}.message`);
      if ((operation.authorName === undefined) !== (operation.authorEmail === undefined)) throw new Error(`MANIFEST_COMMIT_IDENTITY_PAIR_REQUIRED:${field}`);
      if (operation.authorName !== undefined) requiredString(operation.authorName, `${field}.authorName`);
      if (operation.authorEmail !== undefined) requiredString(operation.authorEmail, `${field}.authorEmail`);
    }
    if (operation.action === 'PULL_REQUEST') {
      requiredString(operation.title, `${field}.title`);
      normalizeRelativePath(operation.bodyFile, `${field}_body_file`);
      if (!sha256(operation.bodySha256)) throw new Error(`MANIFEST_PR_BODY_SHA256_REQUIRED:${field}`);
      if (operation.base !== undefined) validateGitBranchName(operation.base, `${field}_base`);
      if (operation.head !== undefined) validateGitBranchName(operation.head, `${field}_head`);
      if (operation.expectedExistingPrNumber !== undefined && (!Number.isInteger(operation.expectedExistingPrNumber) || operation.expectedExistingPrNumber < 1)) throw new Error(`MANIFEST_PR_EXISTING_NUMBER:${field}`);
    }
    if (operation.action === 'UPDATE_PULL_REQUEST_BODY') {
      if (!Number.isInteger(operation.number) || operation.number < 1) throw new Error(`MANIFEST_PR_UPDATE_NUMBER:${field}`);
      requiredString(operation.title, `${field}.title`);
      normalizeRelativePath(operation.bodyFile, `${field}_body_file`);
      if (!sha256(operation.bodySha256)) throw new Error(`MANIFEST_PR_UPDATE_BODY_SHA256_REQUIRED:${field}`);
      if (!sha256(operation.expectedCurrentBodySha256)) throw new Error(`MANIFEST_PR_UPDATE_PREIMAGE_SHA256_REQUIRED:${field}`);
      if (!exactHash(operation.expectedHeadOid)) throw new Error(`MANIFEST_PR_UPDATE_HEAD_OID_REQUIRED:${field}`);
      validateGitBranchName(operation.base, `${field}_base`);
      validateGitBranchName(operation.head, `${field}_head`);
      if (operation.allowAlreadyDesired !== undefined && typeof operation.allowAlreadyDesired !== 'boolean') throw new Error(`MANIFEST_PR_UPDATE_ALLOW_ALREADY_DESIRED_BOOLEAN:${field}`);
    }
  }
  if (operation.op === 'QUERY' && ['REVIEW_SNAPSHOT', 'REMOTE_REVIEW_SNAPSHOT'].includes(operation.action)) {
    const maxFiles = operation.maxFiles ?? 10;
    if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 10) throw new Error(`MANIFEST_REVIEW_FILE_CAP:${field}`);
    if (operation.action === 'REMOTE_REVIEW_SNAPSHOT' && !exactHash(operation.head)) throw new Error(`MANIFEST_REMOTE_REVIEW_HEAD_REQUIRED:${field}`);
  }
  if (operation.op === 'LISTEN') {
    if (authority.remoteObservationOwner !== 'LocalRelay') throw new Error(`MANIFEST_LISTEN_OWNER_MUST_BE_LOCAL_RELAY:${field}`);
    if (!Number.isInteger(operation.maxAttempts) || operation.maxAttempts < 1 || operation.maxAttempts > 120) throw new Error(`MANIFEST_LISTEN_ATTEMPTS:${field}`);
    if (!Number.isInteger(operation.intervalMs) || operation.intervalMs < 250 || operation.intervalMs > 60_000) throw new Error(`MANIFEST_LISTEN_INTERVAL:${field}`);
    if (operation.action === 'RUN') {
      if (!Number.isInteger(operation.runId) && !(typeof operation.runId === 'string' && /^\d+$/.test(operation.runId))) throw new Error(`MANIFEST_LISTEN_RUN_ID_REQUIRED:${field}`);
      if (operation.expectedHead !== '$CANDIDATE_HEAD' && !exactHash(operation.expectedHead)) throw new Error(`MANIFEST_LISTEN_EXACT_HEAD_REQUIRED:${field}`);
      requiredString(operation.expectedWorkflowName, `${field}.expectedWorkflowName`);
      requiredString(operation.expectedEvent, `${field}.expectedEvent`);
      if (!Array.isArray(operation.acceptedConclusions) || operation.acceptedConclusions.length === 0 || operation.acceptedConclusions.some((value) => typeof value !== 'string')) throw new Error(`MANIFEST_LISTEN_ACCEPTED_CONCLUSIONS:${field}`);
    }
    if (operation.action === 'PR_CHECKS') {
      if (operation.head !== undefined) validateGitRef(operation.head, `${field}_head`);
      if (!Array.isArray(operation.acceptedBuckets) || operation.acceptedBuckets.length === 0 || operation.acceptedBuckets.some((value) => !['pass', 'neutral'].includes(value))) throw new Error(`MANIFEST_LISTEN_ACCEPTED_BUCKETS:${field}`);
    }
  }
  if (nested && operation.op === 'RESPOND') throw new Error(`MANIFEST_NESTED_RESPOND_FORBIDDEN:${field}`);
  return { repositoryRef, effect };
}

export function validateManifest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('MANIFEST_OBJECT_REQUIRED');
  const manifest = structuredClone(input);
  if (manifest.schemaVersion !== TASK_SCHEMA_VERSION) throw new Error(`MANIFEST_SCHEMA_UNSUPPORTED:${manifest.schemaVersion}`);
  if (manifest.continuity !== CONTINUITY) throw new Error('MANIFEST_CONTINUITY_MISMATCH');
  for (const field of ['taskRef', 'attemptRef', 'requestRef', 'correlationRef', 'packageRef']) requiredString(manifest[field], field);
  if (hasUnknown({ ...manifest, capabilities: undefined })) throw new Error('MANIFEST_UNKNOWN_CRITICAL_BINDING');

  if (!manifest.original || typeof manifest.original !== 'object') throw new Error('MANIFEST_ORIGINAL_REQUIRED');
  for (const field of ['originalIntent', 'originalGoal', 'userProtectedIntent']) requiredString(manifest.original[field], `original.${field}`);
  stringArray(manifest.original.sourceRefs ?? [], 'original.sourceRefs', { nonEmpty: false });

  if (!manifest.lane || typeof manifest.lane !== 'object') throw new Error('MANIFEST_LANE_REQUIRED');
  for (const field of ['laneRef', 'parentRootRef', 'workRef', 'claimRef', 'returnRouteRef', 'ownerRef', 'rootHubRef']) requiredString(manifest.lane[field], `lane.${field}`);
  if (!ENTRY_CLASSES.has(manifest.lane.entryClass)) throw new Error(`MANIFEST_ENTRY_CLASS:${manifest.lane.entryClass}`);
  if (!SCOPE_MODES.has(manifest.lane.scopeMode)) throw new Error(`MANIFEST_SCOPE_MODE:${manifest.lane.scopeMode}`);

  if (!manifest.role || typeof manifest.role !== 'object') throw new Error('MANIFEST_ROLE_REQUIRED');
  for (const field of ['activeRole', 'roleRef', 'instanceRef', 'occupancyRef', 'providerBindingRef', 'threadRef', 'authorityEnvelopeRef']) requiredString(manifest.role[field], `role.${field}`);
  if (!ROLE_STATES.has(manifest.role.activeRole)) throw new Error(`MANIFEST_ROLE_STATE:${manifest.role.activeRole}`);

  if (!manifest.capabilities || typeof manifest.capabilities !== 'object') throw new Error('MANIFEST_CAPABILITIES_REQUIRED');
  for (const field of ['platformGitHubRead', 'platformGitHubWrite']) {
    if (!CAPABILITY_STATES.has(manifest.capabilities[field])) throw new Error(`MANIFEST_CAPABILITY:${field}:${manifest.capabilities[field]}`);
  }

  if (!manifest.execution || typeof manifest.execution !== 'object') throw new Error('MANIFEST_EXECUTION_REQUIRED');
  for (const field of ['hostProfile', 'executionSurface', 'singleUseNonce', 'duplicateAttemptMarker', 'duplicateProtectionMode', 'formedAt']) requiredString(manifest.execution[field], `execution.${field}`);
  if (!['windows-victor', 'macos-victor', 'test-host'].includes(manifest.execution.hostProfile)) throw new Error(`MANIFEST_HOST_PROFILE:${manifest.execution.hostProfile}`);
  if (!['WINDOWS_ZIP_POWERSHELL', 'MAC_ZIP_RUN_COMMAND', 'PERMANENT_RUNNER_EXPLICIT', 'TEST_DIRECT'].includes(manifest.execution.executionSurface)) throw new Error(`MANIFEST_EXECUTION_SURFACE:${manifest.execution.executionSurface}`);
  if (!['OUTER_RELAY_BOUND', 'LOCAL_MARKER_ROOT'].includes(manifest.execution.duplicateProtectionMode)) throw new Error(`MANIFEST_DUPLICATE_PROTECTION_MODE:${manifest.execution.duplicateProtectionMode}`);
  if (Number.isNaN(Date.parse(manifest.execution.formedAt))) throw new Error('MANIFEST_EXECUTION_FORMED_AT');
  if (manifest.execution.expiresAtOrNull !== null && manifest.execution.expiresAtOrNull !== undefined) {
    requiredString(manifest.execution.expiresAtOrNull, 'execution.expiresAtOrNull');
    if (Number.isNaN(Date.parse(manifest.execution.expiresAtOrNull))) throw new Error('MANIFEST_EXECUTION_EXPIRES_AT');
  }

  if (!manifest.workspace || typeof manifest.workspace !== 'object') throw new Error('MANIFEST_WORKSPACE_REQUIRED');
  if (!WORKSPACE_MODES.has(manifest.workspace.mode)) throw new Error(`MANIFEST_WORKSPACE_MODE:${manifest.workspace.mode}`);
  requiredString(manifest.workspace.projectRef, 'workspace.projectRef');
  normalizeRelativePath(manifest.workspace.projectPath, 'workspace.projectPath');
  if (manifest.workspace.mode !== 'RUN_ROOT') {
    requiredString(manifest.workspace.rootEnv, 'workspace.rootEnv');
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(manifest.workspace.rootEnv)) throw new Error('MANIFEST_WORKSPACE_ENV_NAME');
  }

  if (!Array.isArray(manifest.repositories) || manifest.repositories.length === 0) throw new Error('MANIFEST_REPOSITORIES_REQUIRED');
  const repositories = new Map();
  for (const [index, config] of manifest.repositories.entries()) {
    if (!config || typeof config !== 'object') throw new Error(`MANIFEST_REPOSITORY_OBJECT:${index}`);
    const ref = normalizeRepositoryRef(config.repositoryRef);
    if (repositories.has(ref)) throw new Error(`MANIFEST_DUPLICATE_REPOSITORY_REF:${ref}`);
    if (!REPOSITORY_MODES.has(config.mode)) throw new Error(`MANIFEST_REPOSITORY_MODE:${ref}:${config.mode}`);
    for (const field of ['nameWithOwner', 'remote', 'baseBranch', 'acceptedBase']) requiredString(config[field], `repositories[${index}].${field}`);
    if (!/^[^/\s]+\/[^/\s]+$/.test(config.nameWithOwner)) throw new Error(`MANIFEST_REPOSITORY_NAME:${ref}`);
    validateGitRemoteName(config.remote, `repositories_${index}_remote`);
    validateGitBranchName(config.baseBranch, `repositories_${index}_base_branch`);
    if (!exactHash(config.acceptedBase)) throw new Error(`MANIFEST_REPOSITORY_ACCEPTED_BASE:${ref}`);
    normalizeRelativePath(config.localPath, `repositories[${index}].localPath`);
    if (config.mode === 'CLONE_IN_WORKSPACE') {
      const cloneTransport = config.cloneTransport ?? 'GIT';
      if (!REPOSITORY_CLONE_TRANSPORTS.has(cloneTransport)) throw new Error(`MANIFEST_REPOSITORY_CLONE_TRANSPORT:${ref}:${cloneTransport}`);
      config.cloneTransport = cloneTransport;
      if (cloneTransport === 'GIT') {
        requiredString(config.cloneUrl, `repositories[${index}].cloneUrl`);
        if (remoteUrlHasCredentials(config.cloneUrl)) throw new Error(`MANIFEST_CLONE_URL_CREDENTIALS_FORBIDDEN:${ref}`);
      }
      if (cloneTransport === 'GITHUB_GH' && config.githubHostname !== undefined) requiredString(config.githubHostname, `repositories[${index}].githubHostname`);
    }
    if (config.mode === 'EXISTING_PATH' && manifest.execution.hostProfile !== 'test-host') requiredString(config.expectedRemoteUrl, `repositories[${index}].expectedRemoteUrl`);
    if (config.expectedRemoteUrl !== undefined && config.expectedRemoteUrl !== null) {
      requiredString(config.expectedRemoteUrl, `repositories[${index}].expectedRemoteUrl`);
      if (remoteUrlHasCredentials(config.expectedRemoteUrl)) throw new Error(`MANIFEST_EXPECTED_REMOTE_URL_CREDENTIALS_FORBIDDEN:${ref}`);
    }
    if (config.expectedHead && !exactHash(config.expectedHead)) throw new Error(`MANIFEST_REPOSITORY_EXPECTED_HEAD:${ref}`);
    if (config.branch) validateGitBranchName(config.branch, `repositories_${index}_branch`);
    repositories.set(ref, config);
  }

  if (!manifest.authority || typeof manifest.authority !== 'object') throw new Error('MANIFEST_AUTHORITY_REQUIRED');
  for (const field of ['authorityRef', 'authorityMode']) requiredString(manifest.authority[field], `authority.${field}`);
  for (const field of ['grantedEffects', 'conditionalEffects', 'consumedEffects', 'remainingEffects', 'heldEffects', 'allowedExecutables', 'allowedEnvironment', 'stopConditions']) {
    stringArray(manifest.authority[field] ?? [], `authority.${field}`, { nonEmpty: ['grantedEffects', 'remainingEffects', 'allowedExecutables', 'stopConditions'].includes(field) });
  }
  if (!REMOTE_OBSERVATION_OWNERS.has(manifest.authority.remoteObservationOwner)) throw new Error('MANIFEST_REMOTE_OBSERVATION_OWNER');
  if (manifest.authority.allowMutationLoop !== false) throw new Error('MANIFEST_MUTATION_LOOP_MUST_REMAIN_FALSE');
  const grantable = new Set([...manifest.authority.grantedEffects, ...manifest.authority.conditionalEffects]);
  for (const effect of [...manifest.authority.consumedEffects, ...manifest.authority.remainingEffects]) {
    if (!grantable.has(effect)) throw new Error(`MANIFEST_EFFECT_NOT_GRANTED:${effect}`);
  }
  if (!Array.isArray(manifest.authority.repositoryMembranes) || manifest.authority.repositoryMembranes.length === 0) throw new Error('MANIFEST_REPOSITORY_MEMBRANES_REQUIRED');
  const membranes = new Map();
  for (const [index, entry] of manifest.authority.repositoryMembranes.entries()) {
    const ref = normalizeRepositoryRef(entry.repositoryRef);
    if (!repositories.has(ref)) throw new Error(`MANIFEST_MEMBRANE_REPOSITORY_UNKNOWN:${ref}`);
    if (membranes.has(ref)) throw new Error(`MANIFEST_DUPLICATE_REPOSITORY_MEMBRANE:${ref}`);
    stringArray(entry.allowedPaths, `authority.repositoryMembranes[${index}].allowedPaths`);
    membranes.set(ref, entry.allowedPaths.map((value) => normalizeRelativePath(value, 'membrane_path')));
  }
  for (const ref of repositories.keys()) if (!membranes.has(ref)) throw new Error(`MANIFEST_REPOSITORY_MEMBRANE_MISSING:${ref}`);

  if (!manifest.source || typeof manifest.source !== 'object') throw new Error('MANIFEST_SOURCE_REQUIRED');
  for (const field of ['sourceSetRef', 'sourceVersionRef', 'overlapEvidenceRef']) requiredString(manifest.source[field], `source.${field}`);
  if (!CONFLICT_STATES.has(manifest.source.activeConflictState)) throw new Error(`MANIFEST_SOURCE_CONFLICT_STATE:${manifest.source.activeConflictState}`);
  if (!CANDIDATE_STATES.has(manifest.source.candidateState)) throw new Error(`MANIFEST_CANDIDATE_STATE:${manifest.source.candidateState}`);
  if (manifest.source.candidateState === 'EXACT') {
    if (!exactHash(manifest.source.candidateHead) || !exactHash(manifest.source.candidateTree)) throw new Error('MANIFEST_EXACT_CANDIDATE_BINDING_REQUIRED');
  }
  if (!Array.isArray(manifest.source.expectedChangedPaths) || !Array.isArray(manifest.source.intentionallyUnchangedAuthorizedPaths)) throw new Error('MANIFEST_SOURCE_PATH_ARRAYS_REQUIRED');
  const expected = manifest.source.expectedChangedPaths.map((record, index) => validateSourcePathRecord(record, `source.expectedChangedPaths[${index}]`, repositories, membranes));
  const unchanged = manifest.source.intentionallyUnchangedAuthorizedPaths.map((record, index) => validateSourcePathRecord(record, `source.intentionallyUnchangedAuthorizedPaths[${index}]`, repositories, membranes));
  const expectedKeys = new Set(expected.map((entry) => entry.key));
  if (expectedKeys.size !== expected.length) throw new Error('MANIFEST_DUPLICATE_EXPECTED_CHANGED_PATH');
  for (const entry of unchanged) if (expectedKeys.has(entry.key)) throw new Error(`MANIFEST_SOURCE_PATH_CLASS_OVERLAP:${entry.key}`);

  if (!manifest.continuationPlan || typeof manifest.continuationPlan !== 'object') throw new Error('MANIFEST_CONTINUATION_PLAN_REQUIRED');
  requiredString(manifest.continuationPlan.stateRef, 'continuationPlan.stateRef');
  requiredString(manifest.continuationPlan.currentGoal, 'continuationPlan.currentGoal');
  if (!LIFECYCLE_STATES.has(manifest.continuationPlan.currentLifecycleState)) throw new Error('MANIFEST_CURRENT_LIFECYCLE_STATE');
  stringArray(manifest.continuationPlan.remainingGoals, 'continuationPlan.remainingGoals', { nonEmpty: false });
  validateRoute(manifest.continuationPlan.onPass, 'continuationPlan.onPass');
  validateRoute(manifest.continuationPlan.onFailure, 'continuationPlan.onFailure');
  validateRoute(manifest.continuationPlan.onUserActionRequired, 'continuationPlan.onUserActionRequired');
  validateCompletionPolicy(manifest.completionPolicy, manifest.lane, manifest.continuationPlan);

  if (!manifest.policy || typeof manifest.policy !== 'object') throw new Error('MANIFEST_POLICY_REQUIRED');
  if (manifest.policy.maxOuterReturnFiles !== 10) throw new Error('MANIFEST_RETURN_FILE_COUNT_MUST_EQUAL_10');
  if (!Number.isInteger(manifest.policy.maxSelectedSourceEntries) || manifest.policy.maxSelectedSourceEntries < 1 || manifest.policy.maxSelectedSourceEntries > 10) throw new Error('MANIFEST_SOURCE_ENTRY_CAP');
  if (!Number.isInteger(manifest.policy.maxSelectedSourceBytes) || manifest.policy.maxSelectedSourceBytes < 0 || manifest.policy.maxSelectedSourceBytes > 5_000_000) throw new Error('MANIFEST_SOURCE_BYTE_CAP');
  if (!Number.isInteger(manifest.policy.maxDiffBytes) || manifest.policy.maxDiffBytes < 1 || manifest.policy.maxDiffBytes > 10_000_000) throw new Error('MANIFEST_DIFF_BYTE_CAP');
  for (const field of ['requireRacePreflightBeforeMutation', 'requireLocalValidationBeforePublish', 'requireInputPackageManifest', 'signoffCommit', 'draftPullRequest']) {
    if (typeof manifest.policy[field] !== 'boolean') throw new Error(`MANIFEST_POLICY_BOOLEAN:${field}`);
  }

  if (!Array.isArray(manifest.operations) || manifest.operations.length < 1 || manifest.operations.length > 150) throw new Error('MANIFEST_OPERATIONS_REQUIRED');
  const refs = new Set();
  const normalizedOps = [];
  const mutationRepositories = new Set();
  const raceState = new Map([...repositories.keys()].map((ref) => [ref, { clean: false, localHead: false, base: false, branch: false, overlap: false }]));
  const testProofRepositories = new Set();
  const membraneCheckRepositories = new Set();
  for (const [index, operation] of manifest.operations.entries()) {
    const field = `operations[${index}]`;
    const info = validateOperation(operation, field, repositories, { ...manifest.authority, activeRole: manifest.role.activeRole, membranes }, manifest.capabilities, refs);
    normalizedOps.push({ operation, ...info });
    const repo = info.repositoryRef;
    if (operation.op === 'CHECK' && repo) {
      if (operation.action === 'CLEAN_WORKTREE') raceState.get(repo).clean = true;
      if (operation.action === 'EXPECTED_HEAD') raceState.get(repo).localHead = true;
      if (operation.action === 'REMOTE_BASE_HEAD') raceState.get(repo).base = true;
      if (['REMOTE_BRANCH_ABSENT', 'REMOTE_BRANCH_HEAD'].includes(operation.action)) raceState.get(repo).branch = true;
      if (operation.action === 'OPEN_PR_PATH_OVERLAP_CLEAR') raceState.get(repo).overlap = true;
      if (operation.action === 'PATHS_WITHIN_MEMBRANE') membraneCheckRepositories.add(repo);
    }
    if (operation.op === 'RUN' && operation.proofClass === 'TEST' && repo) testProofRepositories.add(repo);
    const mutates = MUTATING_PRIMITIVES.has(operation.op) || (operation.op === 'RUN' && operation.mutationClass === 'SOURCE');
    if (mutates && repo) {
      mutationRepositories.add(repo);
      if (manifest.source.activeConflictState !== 'NONE') throw new Error(`MANIFEST_MUTATION_CONFLICT_STATE:${manifest.source.activeConflictState}`);
      if (manifest.policy.requireRacePreflightBeforeMutation) {
        const seen = raceState.get(repo);
        if (!seen.clean || !seen.localHead || !seen.base || !seen.branch || !seen.overlap) throw new Error(`MANIFEST_MUTATION_REQUIRES_RACE_PREFLIGHT:${field}:${repo}:${JSON.stringify(seen)}`);
      }
    }
    if (operation.op === 'PUBLISH' && ['PUSH', 'PULL_REQUEST'].includes(operation.action) && manifest.policy.requireLocalValidationBeforePublish) {
      if (!testProofRepositories.has(repo)) throw new Error(`MANIFEST_PUBLISH_REQUIRES_TEST_PROOF:${field}:${repo}`);
      if (!membraneCheckRepositories.has(repo)) throw new Error(`MANIFEST_PUBLISH_REQUIRES_MEMBRANE_CHECK:${field}:${repo}`);
    }
  }
  for (const [repositoryRef, config] of repositories) {
    if (config.mode === 'CLONE_IN_WORKSPACE' && config.cloneTransport === 'GITHUB_GH') {
      const authOperation = manifest.operations.find((operation) => operation.op === 'AUTH' && operation.action === 'GITHUB_GH' && operation.repositoryRef === repositoryRef);
      if (!authOperation) throw new Error(`MANIFEST_GITHUB_CLONE_REQUIRES_AUTH_OPERATION:${repositoryRef}`);
    }
  }

  if (mutationRepositories.size > 1) throw new Error(`MANIFEST_MULTI_REPOSITORY_MUTATION_FORBIDDEN:${[...mutationRepositories].join(',')}`);
  if (manifest.operations.at(-1).op !== 'RESPOND') throw new Error('MANIFEST_LAST_OPERATION_MUST_BE_RESPOND');

  const writeTargets = normalizedOps.filter(({ operation }) => operation.op === 'WRITE').map(({ operation }) => repositoryPathKey(operation.repositoryRef, operation.target));
  for (const key of writeTargets) if (!expectedKeys.has(key)) throw new Error(`MANIFEST_WRITE_TARGET_NOT_EXPECTED:${key}`);

  if (!manifest.result || typeof manifest.result !== 'object') throw new Error('MANIFEST_RESULT_REQUIRED');
  requiredString(manifest.result.filename, 'result.filename');
  normalizeRelativePath(manifest.result.filename, 'result_filename');
  if (!manifest.result.filename.toLowerCase().endsWith('.zip')) throw new Error('MANIFEST_RESULT_FILENAME_MUST_BE_ZIP');

  return Object.freeze({ manifest, manifestDigest: sha256Object(manifest) });
}

export async function loadManifest(manifestPath) {
  let value;
  try { value = JSON.parse(await fs.readFile(manifestPath, 'utf8')); }
  catch (error) { throw new Error(`MANIFEST_JSON_INVALID:${error.message}`); }
  return validateManifest(value);
}
