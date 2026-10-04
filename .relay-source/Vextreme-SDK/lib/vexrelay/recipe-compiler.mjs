import { validateTaskObject } from './package.mjs';

export const VEXRELAY_RECIPE_COMPILER_VERSION = 'vex.relay.recipe-compiler/v2';

export const VEXRELAY_RECIPE_FAMILIES = Object.freeze([
  'CurrentMainCompositionProof',
  'ExactHeadSourceOwnerProof',
  'IndependentAssurance',
  'LifecycleCurrentness',
  'OwnerMergeDuty',
  'PostMergeVerification',
]);

export const VEXRELAY_PROOF_PREDICATE_CLASSES = Object.freeze([
  'CURRENT_MAIN_COMPOSITION',
  'SOURCE_OWNER_BEHAVIOR',
  'SOURCE_OWNER_BROWSER',
  'SOURCE_OWNER_REPOSITORY',
  'INDEPENDENT_ASSURANCE',
  'LIFECYCLE_CURRENTNESS',
  'APPROVAL',
  'READY',
  'MERGE',
  'POST_MERGE',
]);

const STOP_ONLY_ON = Object.freeze([
  'TERMINAL',
  'CAGE',
  'USER_ACTION_REQUIRED',
  'AUTHORITY_UNAVAILABLE',
  'EVIDENCE_REJECTED',
  'EXECUTION_SURFACE_REQUIRED',
  'PROTECTED_DECISION_REQUIRED',
]);

const RECIPE_CONTRACTS = Object.freeze({
  CurrentMainCompositionProof: Object.freeze({
    role: 'OPERATIONS',
    scopes: Object.freeze(['READ_ONLY', 'STAGE_BOUNDED']),
    gate: 'CURRENT_MAIN_COMPOSITION_PROOF',
    allowedProofPredicateClasses: Object.freeze(['CURRENT_MAIN_COMPOSITION']),
  }),
  ExactHeadSourceOwnerProof: Object.freeze({
    role: 'CODER',
    scopes: Object.freeze(['STAGE_BOUNDED']),
    gate: 'EXACT_HEAD_SOURCE_OWNER_PROOF',
    allowedProofPredicateClasses: Object.freeze(['SOURCE_OWNER_BEHAVIOR', 'SOURCE_OWNER_BROWSER', 'SOURCE_OWNER_REPOSITORY']),
  }),
  IndependentAssurance: Object.freeze({
    role: 'INDEPENDENT_ASSURANCE',
    scopes: Object.freeze(['READ_ONLY']),
    gate: 'INDEPENDENT_ASSURANCE_EVIDENCE',
  }),
  LifecycleCurrentness: Object.freeze({
    role: 'LIFECYCLE_OPERATIONS',
    scopes: Object.freeze(['READ_ONLY']),
    gate: 'LIFECYCLE_CURRENTNESS_EVIDENCE',
  }),
  OwnerMergeDuty: Object.freeze({
    role: 'LIFECYCLE_OPERATIONS',
    scopes: Object.freeze(['READ_ONLY']),
    gate: 'OWNER_MERGE_DUTY_EVIDENCE',
  }),
  PostMergeVerification: Object.freeze({
    role: 'LIFECYCLE_OPERATIONS',
    scopes: Object.freeze(['READ_ONLY']),
    gate: 'POST_MERGE_VERIFICATION_EVIDENCE',
  }),
});

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!object(value)) throw new Error(`RECIPE_${label.toUpperCase()}_OBJECT_REQUIRED`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '' || ['UNKNOWN', 'NONE'].includes(value.trim().toUpperCase())) {
    throw new Error(`RECIPE_REQUIRED_STRING:${label}`);
  }
  return value;
}

function requireStableRef(value, label) {
  requireString(value, label);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u.test(value)) throw new Error(`RECIPE_STABLE_REF_REQUIRED:${label}`);
  return value;
}

function requireHash(value, label) {
  if (typeof value !== 'string' || !/^[0-9a-f]{40,64}$/i.test(value)) throw new Error(`RECIPE_EXACT_HASH_REQUIRED:${label}`);
  return value;
}

function requireInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) throw new Error(`RECIPE_POSITIVE_INTEGER_REQUIRED:${label}`);
  return value;
}

function cloneSeed(seed) {
  requireObject(seed, 'seed');
  for (const forbidden of ['operations', 'completionPolicy', 'continuationPlan', 'result']) {
    if (Object.hasOwn(seed, forbidden)) throw new Error(`RECIPE_SEED_MUST_NOT_DEFINE:${forbidden}`);
  }
  return structuredClone(seed);
}

function validateRecipeBoundary(recipe, manifest) {
  const contract = RECIPE_CONTRACTS[recipe];
  if (!contract) throw new Error(`RECIPE_UNKNOWN_FAMILY:${recipe}`);
  if (manifest?.role?.activeRole !== contract.role) {
    throw new Error(`RECIPE_ROLE_MISMATCH:${recipe}:${manifest?.role?.activeRole ?? 'MISSING'}:${contract.role}`);
  }
  if (!contract.scopes.includes(manifest?.lane?.scopeMode)) {
    throw new Error(`RECIPE_SCOPE_MISMATCH:${recipe}:${manifest?.lane?.scopeMode ?? 'MISSING'}:${contract.scopes.join('|')}`);
  }
  return contract;
}

function proofOperations(commands = [], { repositoryRef, prefix, candidateEvidence, allowedPredicateClasses = [] }) {
  if (!Array.isArray(commands)) throw new Error('RECIPE_PROOF_COMMANDS_ARRAY_REQUIRED');
  return commands.map((command, index) => {
    requireObject(command, `proof_command_${index}`);
    requireString(command.command, `proofCommands[${index}].command`);
    const predicateClass = requireString(command.predicateClass, `proofCommands[${index}].predicateClass`);
    requireStableRef(command.predicateRef, `proofCommands[${index}].predicateRef`);
    if (!VEXRELAY_PROOF_PREDICATE_CLASSES.includes(predicateClass)) throw new Error(`RECIPE_PROOF_PREDICATE_CLASS_UNKNOWN:${index}:${predicateClass}`);
    if (!allowedPredicateClasses.includes(predicateClass)) throw new Error(`RECIPE_PROOF_PREDICATE_CLASS_FORBIDDEN:${index}:${predicateClass}:${allowedPredicateClasses.join('|')}`);
    if (!Array.isArray(command.args) || !command.args.every((value) => typeof value === 'string')) throw new Error(`RECIPE_PROOF_COMMAND_ARGS_REQUIRED:${index}`);
    return {
      ref: `${prefix}.proof.${index + 1}`, op: 'RUN', action: 'COMMAND', repositoryRef,
      command: command.command, args: [...command.args], proofClass: command.proofClass ?? 'TEST',
      mutationClass: 'NONE', candidateEvidence: command.candidateEvidence ?? candidateEvidence,
      acceptedExitCodes: [...(command.acceptedExitCodes ?? [0])],
      ...(command.timeoutMs === undefined ? {} : { timeoutMs: command.timeoutMs }),
      ...(command.cwd === undefined ? {} : { cwd: command.cwd }),
      ...(command.cwdRoot === undefined ? {} : { cwdRoot: command.cwdRoot }),
      ...(command.inheritEnvKeys === undefined ? {} : { inheritEnvKeys: [...command.inheritEnvKeys] }),
      ...(command.env === undefined ? {} : { env: structuredClone(command.env) }),
    };
  });
}

function respond(ref) {
  return { ref, op: 'RESPOND', action: 'CANONICAL_RETURN' };
}

function authGithub(repositoryRef, ref) {
  return { ref, op: 'AUTH', action: 'GITHUB_GH', repositoryRef, loginMode: 'PROMPT_ONLY' };
}

function repositoryUsesGithubGhClone(manifest, repositoryRef) {
  const repository = manifest?.repositories?.find((entry) => entry.repositoryRef === repositoryRef);
  return repository?.mode === 'CLONE_IN_WORKSPACE' && repository?.cloneTransport === 'GITHUB_GH';
}

function buildOperations(recipe, stage, manifest) {
  const repositoryRef = requireString(stage.repositoryRef, 'stage.repositoryRef');
  const expectedHead = stage.expectedHead === undefined ? null : requireHash(stage.expectedHead, 'stage.expectedHead');
  const expectedTree = stage.expectedTree === undefined ? null : requireHash(stage.expectedTree, 'stage.expectedTree');
  const expectedBase = stage.expectedBase === undefined ? null : requireHash(stage.expectedBase, 'stage.expectedBase');
  const branch = stage.branch === undefined ? null : requireString(stage.branch, 'stage.branch');
  const maxFiles = stage.maxFiles ?? 10;
  const contract = RECIPE_CONTRACTS[recipe];

  if (recipe === 'CurrentMainCompositionProof') {
    if (!expectedHead) throw new Error('RECIPE_CURRENT_MAIN_EXPECTED_HEAD_REQUIRED');
    return [
      { ref: 'recipe.current-main.read-state', op: 'READ', action: 'REPOSITORY_STATE', repositoryRef },
      { ref: 'recipe.current-main.expected-head', op: 'CHECK', action: 'EXPECTED_HEAD', repositoryRef, expected: expectedHead },
      ...(expectedTree ? [{ ref: 'recipe.current-main.expected-tree', op: 'CHECK', action: 'EXPECTED_TREE', repositoryRef, expected: expectedTree }] : []),
      ...proofOperations(stage.proofCommands ?? [], { repositoryRef, prefix: 'recipe.current-main', candidateEvidence: false, allowedPredicateClasses: contract.allowedProofPredicateClasses }),
      respond('recipe.current-main.respond'),
    ];
  }

  if (recipe === 'ExactHeadSourceOwnerProof') {
    if (!expectedHead || !expectedTree || !expectedBase) throw new Error('RECIPE_SOURCE_OWNER_EXACT_BASE_HEAD_TREE_REQUIRED');
    const githubGhClone = repositoryUsesGithubGhClone(manifest, repositoryRef);
    return [
      ...(githubGhClone ? [authGithub(repositoryRef, 'recipe.source-owner.auth-github')] : []),
      { ref: 'recipe.source-owner.read-state', op: 'READ', action: 'REPOSITORY_STATE', repositoryRef },
      { ref: 'recipe.source-owner.expected-head', op: 'CHECK', action: 'EXPECTED_HEAD', repositoryRef, expected: expectedHead },
      { ref: 'recipe.source-owner.expected-tree', op: 'CHECK', action: 'EXPECTED_TREE', repositoryRef, expected: expectedTree },
      ...proofOperations(stage.proofCommands ?? [], { repositoryRef, prefix: 'recipe.source-owner', candidateEvidence: true, allowedPredicateClasses: contract.allowedProofPredicateClasses }),
      { ref: 'recipe.source-owner.review', op: 'QUERY', action: 'REVIEW_SNAPSHOT', repositoryRef, base: expectedBase, head: expectedHead, maxFiles },
      respond('recipe.source-owner.respond'),
    ];
  }

  if (recipe === 'IndependentAssurance') {
    if (!expectedHead || !expectedBase || !branch) throw new Error('RECIPE_ASSURANCE_BASE_HEAD_BRANCH_REQUIRED');
    return [
      authGithub(repositoryRef, 'recipe.assurance.auth'),
      { ref: 'recipe.assurance.remote-review', op: 'QUERY', action: 'REMOTE_REVIEW_SNAPSHOT', repositoryRef, base: expectedBase, head: expectedHead, branch, maxFiles },
      respond('recipe.assurance.respond'),
    ];
  }

  if (recipe === 'LifecycleCurrentness') {
    if (!expectedHead || !branch) throw new Error('RECIPE_LIFECYCLE_HEAD_BRANCH_REQUIRED');
    const pullRequestNumber = requireInteger(stage.pullRequestNumber, 'stage.pullRequestNumber');
    return [
      authGithub(repositoryRef, 'recipe.lifecycle.auth'),
      { ref: 'recipe.lifecycle.branch-head', op: 'CHECK', action: 'REMOTE_BRANCH_HEAD', repositoryRef, branch, expected: expectedHead },
      { ref: 'recipe.lifecycle.pull-request', op: 'QUERY', action: 'PULL_REQUEST', repositoryRef, number: pullRequestNumber },
      { ref: 'recipe.lifecycle.checks', op: 'QUERY', action: 'PR_CHECKS', repositoryRef, head: expectedHead },
      respond('recipe.lifecycle.respond'),
    ];
  }

  if (recipe === 'OwnerMergeDuty') {
    if (!expectedHead || !expectedBase || !branch) throw new Error('RECIPE_OWNER_MERGE_BASE_HEAD_BRANCH_REQUIRED');
    const pullRequestNumber = requireInteger(stage.pullRequestNumber, 'stage.pullRequestNumber');
    return [
      authGithub(repositoryRef, 'recipe.owner-merge.auth'),
      { ref: 'recipe.owner-merge.base-head', op: 'CHECK', action: 'REMOTE_BASE_HEAD', repositoryRef, expected: expectedBase },
      { ref: 'recipe.owner-merge.branch-head', op: 'CHECK', action: 'REMOTE_BRANCH_HEAD', repositoryRef, branch, expected: expectedHead },
      { ref: 'recipe.owner-merge.pull-request', op: 'QUERY', action: 'PULL_REQUEST', repositoryRef, number: pullRequestNumber },
      { ref: 'recipe.owner-merge.checks', op: 'QUERY', action: 'PR_CHECKS', repositoryRef, head: expectedHead },
      respond('recipe.owner-merge.respond'),
    ];
  }

  if (recipe === 'PostMergeVerification') {
    const mergedMainHead = requireHash(stage.mergedMainHead, 'stage.mergedMainHead');
    const pullRequestNumber = requireInteger(stage.pullRequestNumber, 'stage.pullRequestNumber');
    return [
      authGithub(repositoryRef, 'recipe.post-merge.auth'),
      { ref: 'recipe.post-merge.main-head', op: 'CHECK', action: 'REMOTE_BASE_HEAD', repositoryRef, expected: mergedMainHead },
      { ref: 'recipe.post-merge.pull-request', op: 'QUERY', action: 'PULL_REQUEST', repositoryRef, number: pullRequestNumber },
      { ref: 'recipe.post-merge.checks', op: 'QUERY', action: 'PR_CHECKS', repositoryRef, head: mergedMainHead },
      respond('recipe.post-merge.respond'),
    ];
  }

  throw new Error(`RECIPE_UNKNOWN_FAMILY:${recipe}`);
}

function continuationPlan(stage) {
  requireString(stage.stateRef, 'stage.stateRef');
  requireString(stage.currentLifecycleState, 'stage.currentLifecycleState');
  requireString(stage.currentGoal, 'stage.currentGoal');
  if (!Array.isArray(stage.remainingGoals) || !stage.remainingGoals.every((value) => typeof value === 'string' && value.trim() !== '')) {
    throw new Error('RECIPE_REMAINING_GOALS_REQUIRED');
  }
  requireObject(stage.onPass, 'on_pass');
  return {
    stateRef: stage.stateRef,
    currentLifecycleState: stage.currentLifecycleState,
    currentGoal: stage.currentGoal,
    remainingGoals: [...stage.remainingGoals],
    onPass: structuredClone(stage.onPass),
    onFailure: {
      lifecycleState: 'BLOCKED',
      nextFunction: 'F11.CLASSIFY_EDGE_CAGE',
      nextOwner: 'Operations',
      whyThisIsNext: 'The bounded recipe stopped; classify the exact first failure without widening source or lifecycle authority.',
    },
    onUserActionRequired: {
      lifecycleState: 'AUTHENTICATION_REQUIRED',
      nextFunction: 'F08.EXECUTE_OR_HANDOFF',
      nextOwner: 'Victor+Operations',
      whyThisIsNext: 'The accepted relay returned one typed irreducible host action; Operations must re-ground before any compatible continuation.',
    },
  };
}

export function compileRelayRecipe({ recipe, seed, stage } = {}) {
  requireString(recipe, 'recipe');
  const manifest = cloneSeed(seed);
  const stageValue = requireObject(stage, 'stage');
  const contract = validateRecipeBoundary(recipe, manifest);
  manifest.operations = buildOperations(recipe, stageValue, manifest);
  manifest.completionPolicy = {
    progressMode: 'EXACT_STAGE_GATE',
    completionTarget: 'EXACT_NAMED_GATE',
    stageGateOrNull: contract.gate,
    automaticContinuation: true,
    humanRoundTripPolicy: 'IRREDUCIBLE_ONLY',
    stopOnlyOn: [...STOP_ONLY_ON],
  };
  manifest.continuationPlan = continuationPlan(stageValue);
  manifest.result = { filename: requireString(stageValue.resultFilename, 'stage.resultFilename') };
  return validateTaskObject(manifest).manifest;
}

export function recipeContract(recipe) {
  requireString(recipe, 'recipe');
  const value = RECIPE_CONTRACTS[recipe];
  if (!value) throw new Error(`RECIPE_UNKNOWN_FAMILY:${recipe}`);
  return structuredClone(value);
}

// [VXG RealForever]
