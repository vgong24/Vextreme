'use strict';

const crypto = require('node:crypto');

const TASK_SCHEMA_VERSION = 'vextreme.vexlocalbridge-task-manifest/v1';
const RETURN_SCHEMA_VERSION = 'vextreme.vexlocalbridge-return-manifest/v1';
const TASK_STATE = 'TASK_PREPARED';
const RETURN_STATE = 'TASK_TERMINAL_RESULT_AVAILABLE';
const SAFE_CANCELLED_DISPOSITION = 'SAFE_CANCELLED_BY_HUMAN';
const SAFE_CANCELLED_STOP_REASON = 'HUMAN_CANCEL_REQUEST';
const RETAINED_ARTIFACT_DISPOSITIONS = new Set(['CONSUMPTION_CUSTODY','AUTHORIZED_RETAINED_EFFECT','NONE']);
const HEX64 = /^[a-f0-9]{64}$/;
const RFC3339_INSTANT = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/;
const STORAGE_KEY_ASCII = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const PACKAGE_SEGMENT_ASCII = /^[A-Za-z0-9._-]+$/;
const WINDOWS_DEVICE = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/i;
const ZIP_DIGEST = /--sha256-([a-f0-9]{64})\.zip$/;
const DISPOSITIONS = new Set(['PASS','SAFE_FAILURE','BLOCKED','DUPLICATE_ATTEMPT','IDENTITY_CONFLICT',SAFE_CANCELLED_DISPOSITION]);
const INVENTORY_CLASSES = Object.freeze([
  'CONTEXT','PAYLOAD','AUTHORITY','IMMUTABLE_INPUT','COMMAND_RECEIPT','LOG','EVIDENCE',
  'JSON_EVIDENCE','TEXT_EVIDENCE','COMMAND_LEDGER','DIGEST_INVENTORY','SCREENSHOT',
  'DOM_EVIDENCE','DATA','OTHER',
]);
const INVENTORY_CLASS_SET = new Set(INVENTORY_CLASSES);
const EFFECT_FIELDS = Object.freeze([
  'sourceMutationPerformed','branchMutationPerformed','claimMutationPerformed','prMetadataMutationPerformed',
  'reviewPerformed','approvalPerformed','readyTransitionPerformed','mergePerformed','mainMutationPerformed',
  'checkpointMutationPerformed','forcePushPerformed','historyRewritePerformed','hostInstallationPerformed',
  'modelRuntimePerformed','providerOrNetworkEffectPerformed','publicationPerformed',
  'credentialSerializationPerformed','filesystemOutsideQualifiedRootsPerformed',
]);
const PERMISSION_FIELDS = Object.freeze([
  'filesAndFoldersPermissionRequested','automationPermissionRequested','fullDiskAccessRequested',
  'permissionDenied','taskCompletedDespiteOptionalPermissionDenial',
]);
const TASK_KEYS = new Set([
  'schemaVersion','artifactClass','taskRef','attemptRef','packageRef','requestRef','correlationRef',
  'taskStorageKey','attemptStorageKey','requestingRoleRef','requestingInstanceRef','parentOperationsRef',
  'returnRouteRef','hostProfileRef','repositoryExecutionProfileRefOrNull','repositoryRefOrNull',
  'baseRefOrNull','headRefOrNull','treeRefOrNull','branchRefOrNull','claimRefOrNull','exactPathRefs',
  'authorityBinding','payload','executionStateAtFormation','singleUseNonce','stopConditions',
  'formedAt','expiresAt','contentSetSha256','archiveDigestBinding',
]);
const AUTHORITY_KEYS = new Set([
  'authoritySchemaRef','authorityEnvelopePath','authorityEnvelopeSha256','semanticAdmissionRef',
  'transactionRef','transactionVersion','allowedEffectRefs','heldEffectRefs',
]);
const PAYLOAD_KEYS = new Set(['payloadClass','payloadRuntime','payloadPath','payloadSha256','typedArgv','immutableInputs']);
const INPUT_KEYS = new Set(['path','sha256']);
const RETURN_KEYS = new Set([
  'schemaVersion','artifactClass','taskRef','attemptRef','packageRef','requestRef','correlationRef',
  'requestingRoleRef','hostProfileRef','repositoryExecutionProfileRefOrNull','startedAt','completedAt',
  'executionState','disposition','stopReasonOrNull','firstSubstantiveFailureOrNull',
  'inputArchiveSha256','archiveDigestBinding','contentSetSha256','canonicalResultPath',
  'commandReceipts','inventory','candidateFindings','harnessFindings','environmentFindings',
  'unknownFindings','nextSafeRouteRef','effects','hostPermissionObservations',
  'testOwnedProcessLeakObserved','testOwnedTransientResourceLeakObserved','payloadSandboxCleanupVerified',
  'cleanupFailureRefs','retainedArtifactDisposition',
]);
const FAILURE_KEYS = new Set(['failureFamily','failureFingerprint','stage','summary','evidenceRef']);
const COMMAND_KEYS = new Set(['argv','cwd','exitCode','accepted']);
const INVENTORY_KEYS = new Set(['path','sha256','class']);
const PERMISSION_KEYS = new Set([...PERMISSION_FIELDS, 'promptedResourceRefs']);
const ATTEMPT_IDENTITY_KEYS = new Set(['taskRef','attemptRef','packageRef','packageSha256','singleUseNonce']);

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = (value) => typeof value === 'string' && value.length > 0;
const hex64 = (value) => typeof value === 'string' && HEX64.test(value);
function parseInstant(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(RFC3339_INSTANT);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = match[7] ?? '';
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);

  if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 60 || offsetHour > 23 || offsetMinute > 59) return null;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > monthDays[month - 1]) return null;

  const local = new Date(0);
  local.setUTCFullYear(year, month - 1, day);
  local.setUTCHours(hour, minute, Math.min(second, 59), 0);
  if (!Number.isFinite(local.getTime())) return null;

  const signedOffsetMinutes = match[8] === '-'
    ? -(offsetHour * 60 + offsetMinute)
    : offsetHour * 60 + offsetMinute;
  const baseSecond = BigInt(Math.trunc(local.getTime() / 1000) - signedOffsetMinutes * 60);

  let leapRank = 0;
  if (second === 60) {
    const utc = new Date(Number(baseSecond) * 1000);
    const leapMonthEnd = (utc.getUTCMonth() === 5 && utc.getUTCDate() === 30)
      || (utc.getUTCMonth() === 11 && utc.getUTCDate() === 31);
    if (!leapMonthEnd || utc.getUTCHours() !== 23 || utc.getUTCMinutes() !== 59 || utc.getUTCSeconds() !== 59) return null;
    leapRank = 1;
  }

  return { baseSecond, leapRank, fraction };
}

function instant(value) {
  return parseInstant(value) !== null;
}

function compareInstants(left, right) {
  const a = parseInstant(left);
  const b = parseInstant(right);
  if (!a || !b) return null;
  if (a.baseSecond < b.baseSecond) return -1;
  if (a.baseSecond > b.baseSecond) return 1;
  if (a.leapRank < b.leapRank) return -1;
  if (a.leapRank > b.leapRank) return 1;
  const width = Math.max(a.fraction.length, b.fraction.length);
  const af = a.fraction.padEnd(width, '0');
  const bf = b.fraction.padEnd(width, '0');
  return af < bf ? -1 : af > bf ? 1 : 0;
}
const nullableString = (value) => value === null || nonempty(value);
const byteLike = (value) => Buffer.isBuffer(value) || value instanceof Uint8Array;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const codePointCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort(codePointCompare).map((key) => [key, canonical(value[key])])) : value;
const canonicalJson = (value) => JSON.stringify(canonical(value));
const hashCanonical = (value) => sha256(Buffer.from(canonicalJson(value)));

function extras(value, allowed, label) {
  return object(value)
    ? Object.keys(value).filter((key) => !allowed.has(key)).map((key) => `${label}.${key} is not allowed`)
    : [`${label} must be an object`];
}

function uniqueStrings(value, { nonemptyArray = false, caseFold = false } = {}) {
  if (!Array.isArray(value) || (nonemptyArray && value.length === 0) || !value.every(nonempty)) return false;
  const normalized = caseFold ? value.map((item) => item.toLowerCase()) : value;
  return new Set(normalized).size === normalized.length;
}

function safeSegment(value) {
  return typeof value === 'string'
    && value !== '.'
    && value !== '..'
    && STORAGE_KEY_ASCII.test(value)
    && !value.endsWith('.')
    && !WINDOWS_DEVICE.test(value);
}

function storageKey(value) {
  return safeSegment(value);
}

function packagePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('/') || value.includes('\\') || /^[A-Za-z]:/.test(value)) return false;
  const segments = value.split('/');
  return segments.every((segment) => segment !== '.'
    && segment !== '..'
    && PACKAGE_SEGMENT_ASCII.test(segment)
    && !segment.endsWith('.')
    && !WINDOWS_DEVICE.test(segment));
}

function secretLikePath(value) {
  if (!packagePath(value)) return false;
  return value.split('/').some((segment) => {
    const lower = segment.toLowerCase();
    return lower === '.env'
      || lower.startsWith('.env.')
      || lower === '.npmrc'
      || lower === '.netrc'
      || lower === 'credentials'
      || lower === 'credentials.json'
      || lower === 'client-secret.json'
      || lower === 'client_secret.json'
      || lower === 'token'
      || lower === 'token.json'
      || /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/u.test(lower)
      || /\.(?:pem|key|p12|pfx|kdbx)$/u.test(lower);
  });
}

function caseFoldUniquePaths(paths) {
  return Array.isArray(paths)
    && paths.every(packagePath)
    && new Set(paths.map((item) => item.toLowerCase())).size === paths.length;
}

function arrayOfObjects(value, validator, label) {
  if (!Array.isArray(value)) return [`${label} must be an array`];
  return value.flatMap((item, index) => validator(item, `${label}[${index}]`));
}

function validateAuthority(value, label = 'task.authorityBinding') {
  const errors = extras(value, AUTHORITY_KEYS, label);
  if (!object(value)) return errors;
  for (const key of ['authoritySchemaRef','semanticAdmissionRef','transactionRef']) {
    if (!nonempty(value[key])) errors.push(`${label}.${key} is required`);
  }
  if (!packagePath(value.authorityEnvelopePath)) errors.push(`${label}.authorityEnvelopePath is not a cross-platform-safe package path`);
  if (secretLikePath(value.authorityEnvelopePath)) errors.push(`${label}.authorityEnvelopePath is secret-like`);
  if (!hex64(value.authorityEnvelopeSha256)) errors.push(`${label}.authorityEnvelopeSha256 must be SHA-256`);
  if (!Number.isInteger(value.transactionVersion) || value.transactionVersion < 1) errors.push(`${label}.transactionVersion is invalid`);
  if (!uniqueStrings(value.allowedEffectRefs, { nonemptyArray: true })) errors.push(`${label}.allowedEffectRefs must contain non-empty unique strings`);
  if (!uniqueStrings(value.heldEffectRefs)) errors.push(`${label}.heldEffectRefs must contain unique strings`);
  const allowedEffectRefs = Array.isArray(value.allowedEffectRefs) ? value.allowedEffectRefs : [];
  const heldEffectRefs = Array.isArray(value.heldEffectRefs) ? value.heldEffectRefs : [];
  const intersection = allowedEffectRefs.filter((ref) => heldEffectRefs.includes(ref));
  if (intersection.length) errors.push(`${label} effect refs cannot be both allowed and held`);
  return errors;
}

function validateImmutableInput(value, label) {
  const errors = extras(value, INPUT_KEYS, label);
  if (!object(value)) return errors;
  if (!packagePath(value.path)) errors.push(`${label}.path is not a cross-platform-safe package path`);
  if (secretLikePath(value.path)) errors.push(`${label}.path is secret-like`);
  if (!hex64(value.sha256)) errors.push(`${label}.sha256 must be SHA-256`);
  return errors;
}

function validatePayload(value, label = 'task.payload') {
  const errors = extras(value, PAYLOAD_KEYS, label);
  if (!object(value)) return errors;
  for (const key of ['payloadClass','payloadRuntime']) if (!nonempty(value[key])) errors.push(`${label}.${key} is required`);
  if (!packagePath(value.payloadPath)) errors.push(`${label}.payloadPath is not a cross-platform-safe package path`);
  if (secretLikePath(value.payloadPath)) errors.push(`${label}.payloadPath is secret-like`);
  if (!hex64(value.payloadSha256)) errors.push(`${label}.payloadSha256 must be SHA-256`);
  if (!Array.isArray(value.typedArgv) || !value.typedArgv.every((item) => typeof item === 'string')) errors.push(`${label}.typedArgv must be strings`);
  errors.push(...arrayOfObjects(value.immutableInputs, validateImmutableInput, `${label}.immutableInputs`));
  const immutableInputs = Array.isArray(value.immutableInputs) ? value.immutableInputs : [];
  const paths = immutableInputs.map((item) => item?.path).filter((item) => typeof item === 'string');
  if (!caseFoldUniquePaths(paths)) errors.push(`${label}.immutableInputs contains unsafe or case-fold-colliding paths`);
  return errors;
}

function validateTaskShape(task) {
  const errors = extras(task, TASK_KEYS, 'task');
  if (!object(task)) return errors;
  if (task.schemaVersion !== TASK_SCHEMA_VERSION) errors.push(`task.schemaVersion must be ${TASK_SCHEMA_VERSION}`);
  if (task.artifactClass !== 'EXECUTABLE_RELAY') errors.push('task.artifactClass must be EXECUTABLE_RELAY');
  for (const key of [
    'taskRef','attemptRef','packageRef','requestRef','correlationRef','requestingRoleRef',
    'requestingInstanceRef','parentOperationsRef','returnRouteRef','hostProfileRef',
  ]) if (!nonempty(task[key])) errors.push(`task.${key} is required`);
  if (!storageKey(task.taskStorageKey)) errors.push('task.taskStorageKey is not cross-platform safe');
  if (!storageKey(task.attemptStorageKey)) errors.push('task.attemptStorageKey is not cross-platform safe');
  for (const key of [
    'repositoryExecutionProfileRefOrNull','repositoryRefOrNull','baseRefOrNull','headRefOrNull',
    'treeRefOrNull','branchRefOrNull','claimRefOrNull',
  ]) if (!nullableString(task[key])) errors.push(`task.${key} must be null or non-empty`);
  if (!caseFoldUniquePaths(task.exactPathRefs)) errors.push('task.exactPathRefs must be unique cross-platform-safe paths');
  errors.push(...validateAuthority(task.authorityBinding));
  errors.push(...validatePayload(task.payload));
  if (task.executionStateAtFormation !== TASK_STATE) errors.push(`task.executionStateAtFormation must be ${TASK_STATE}`);
  if (!nonempty(task.singleUseNonce) || task.singleUseNonce.length < 16) errors.push('task.singleUseNonce must be at least 16 characters');
  if (!uniqueStrings(task.stopConditions, { nonemptyArray: true })) errors.push('task.stopConditions must be non-empty unique strings');
  const taskTimeOrder = compareInstants(task.formedAt, task.expiresAt);
  if (taskTimeOrder === null || taskTimeOrder >= 0) errors.push('task formation/expiry timestamps are invalid');
  if (!hex64(task.contentSetSha256)) errors.push('task.contentSetSha256 must be SHA-256');
  if (task.archiveDigestBinding !== 'FILENAME_SHA256') errors.push('task.archiveDigestBinding must be FILENAME_SHA256');
  return errors;
}

function verifyDigestBoundFilename(filename, bytes) {
  const match = typeof filename === 'string' ? filename.match(ZIP_DIGEST) : null;
  if (!match) return { valid: false, errors: ['archive filename lacks --sha256-<digest>.zip binding'] };
  if (!byteLike(bytes)) return { valid: false, errors: ['archive bytes must be byte-like'] };
  const observed = sha256(bytes);
  return observed === match[1]
    ? { valid: true, errors: [], expectedSha256: match[1], observedSha256: observed }
    : { valid: false, errors: [`archive filename digest ${match[1]} does not match bytes ${observed}`], expectedSha256: match[1], observedSha256: observed };
}

function validateInventoryEntry(value, label) {
  const errors = extras(value, INVENTORY_KEYS, label);
  if (!object(value)) return errors;
  if (!packagePath(value.path)) errors.push(`${label}.path is not a cross-platform-safe package path`);
  if (secretLikePath(value.path)) errors.push(`${label}.path is secret-like`);
  if (!hex64(value.sha256)) errors.push(`${label}.sha256 must be SHA-256`);
  if (!INVENTORY_CLASS_SET.has(value.class)) errors.push(`${label}.class is invalid`);
  return errors;
}

function validateInventory(inventory, label = 'inventory') {
  const errors = arrayOfObjects(inventory, validateInventoryEntry, label);
  if (!Array.isArray(inventory)) return errors;
  const paths = inventory.map((entry) => entry?.path).filter((item) => typeof item === 'string');
  if (!caseFoldUniquePaths(paths)) errors.push(`${label} contains unsafe or case-fold-colliding paths`);
  return errors;
}

function canonicalInventory(inventory) {
  const errors = validateInventory(inventory);
  if (errors.length) throw new TypeError(errors.join('; '));
  return [...inventory]
    .sort((left, right) => codePointCompare(left.path, right.path)
      || codePointCompare(left.class, right.class)
      || codePointCompare(left.sha256, right.sha256))
    .map((entry) => `${entry.sha256}  ${entry.class}  ${entry.path}\n`)
    .join('');
}

function contentSetSha256(inventory) {
  return sha256(Buffer.from(canonicalInventory(inventory)));
}

function requireEvidence(options, keys, label, errors) {
  if (!object(options)) {
    errors.push(`${label} evidence must be an object`);
    return;
  }
  for (const key of keys) if (!Object.hasOwn(options, key)) errors.push(`${label} evidence missing: ${key}`);
}

function inventoryMap(inventory) {
  return new Map(inventory.map((entry) => [entry.path.toLowerCase(), entry]));
}

function verifyBoundInventoryMember(inventoryByPath, path, expectedSha, expectedClass, label, errors) {
  if (typeof path !== 'string') {
    errors.push(`${label} path is invalid`);
    return;
  }
  const entry = inventoryByPath.get(path.toLowerCase());
  if (!entry) {
    errors.push(`${label} missing from content inventory`);
    return;
  }
  if (entry.path !== path) errors.push(`${label} inventory path casing does not match`);
  if (entry.sha256 !== expectedSha) errors.push(`${label} inventory digest mismatch`);
  if (entry.class !== expectedClass) errors.push(`${label} inventory class mismatch`);
}

function validateTaskManifest(task, options = {}) {
  const errors = validateTaskShape(task);
  requireEvidence(options, [
    'now','hostProfileRef','repositoryExecutionProfileRef','archiveFilename','archiveBytes',
    'authorityEnvelopeBytes','authoritySummary','payloadBytes','immutableInputBytesByPath','contentInventory',
  ], 'task admission', errors);
  if (errors.length) return { valid: false, errors };

  const formedToNow = compareInstants(task.formedAt, options.now);
  const nowToExpires = compareInstants(options.now, task.expiresAt);
  if (formedToNow === null || nowToExpires === null || formedToNow > 0 || nowToExpires >= 0) errors.push('task is outside formation/expiry window or now is invalid');
  if (task?.hostProfileRef !== options.hostProfileRef) errors.push('task host profile does not match execution host');
  if (task?.repositoryExecutionProfileRefOrNull !== options.repositoryExecutionProfileRef) errors.push('task repository execution profile does not match');
  errors.push(...verifyDigestBoundFilename(options.archiveFilename, options.archiveBytes).errors);

  if (object(task?.authorityBinding) && hex64(task.authorityBinding.authorityEnvelopeSha256)) {
    if (!byteLike(options.authorityEnvelopeBytes)) errors.push('authority envelope bytes must be byte-like');
    else if (sha256(options.authorityEnvelopeBytes) !== task.authorityBinding.authorityEnvelopeSha256) errors.push('authority envelope hash mismatch');
    const expectedSummary = {
      authoritySchemaRef: task.authorityBinding.authoritySchemaRef,
      semanticAdmissionRef: task.authorityBinding.semanticAdmissionRef,
      transactionRef: task.authorityBinding.transactionRef,
      transactionVersion: task.authorityBinding.transactionVersion,
      allowedEffectRefs: task.authorityBinding.allowedEffectRefs,
      heldEffectRefs: task.authorityBinding.heldEffectRefs,
    };
    if (canonicalJson(expectedSummary) !== canonicalJson(options.authoritySummary)) errors.push('authority summary parity mismatch');
  }

  if (object(task?.payload) && hex64(task.payload.payloadSha256)) {
    if (!byteLike(options.payloadBytes)) errors.push('payload bytes must be byte-like');
    else if (sha256(options.payloadBytes) !== task.payload.payloadSha256) errors.push('payload hash mismatch');
    if (!object(options.immutableInputBytesByPath)) errors.push('immutable input byte map must be an object');
    else {
      const immutableInputs = Array.isArray(task.payload.immutableInputs) ? task.payload.immutableInputs : [];
      for (const input of immutableInputs) {
        if (!Object.hasOwn(options.immutableInputBytesByPath, input.path)) errors.push(`immutable input missing: ${input.path}`);
        else {
          const bytes = options.immutableInputBytesByPath[input.path];
          if (!byteLike(bytes)) errors.push(`immutable input bytes must be byte-like: ${input.path}`);
          else if (sha256(bytes) !== input.sha256) errors.push(`immutable input hash mismatch: ${input.path}`);
        }
      }
    }
  }

  const inventoryErrors = validateInventory(options.contentInventory, 'task contentInventory');
  errors.push(...inventoryErrors);
  if (!inventoryErrors.length && hex64(task?.contentSetSha256) && object(task?.authorityBinding) && object(task?.payload)) {
    if (contentSetSha256(options.contentInventory) !== task.contentSetSha256) errors.push('internal content-set digest mismatch');
    const map = inventoryMap(options.contentInventory);
    verifyBoundInventoryMember(map, task.authorityBinding.authorityEnvelopePath, task.authorityBinding.authorityEnvelopeSha256, 'AUTHORITY', 'authority envelope', errors);
    verifyBoundInventoryMember(map, task.payload.payloadPath, task.payload.payloadSha256, 'PAYLOAD', 'payload', errors);
    const immutableInputs = Array.isArray(task.payload.immutableInputs) ? task.payload.immutableInputs : [];
    for (const input of immutableInputs) verifyBoundInventoryMember(map, input.path, input.sha256, 'IMMUTABLE_INPUT', `immutable input ${input.path}`, errors);
  }
  return { valid: errors.length === 0, errors };
}

function validateFailure(value, label) {
  const errors = extras(value, FAILURE_KEYS, label);
  if (!object(value)) return errors;
  for (const key of ['failureFamily','stage','summary','evidenceRef']) if (!nonempty(value[key])) errors.push(`${label}.${key} is required`);
  if (!hex64(value.failureFingerprint)) errors.push(`${label}.failureFingerprint must be SHA-256`);
  return errors;
}

function validateCommand(value, label) {
  const errors = extras(value, COMMAND_KEYS, label);
  if (!object(value)) return errors;
  if (!Array.isArray(value.argv) || value.argv.length === 0 || !value.argv.every((item) => typeof item === 'string')) errors.push(`${label}.argv is invalid`);
  if (!nonempty(value.cwd) || !Number.isInteger(value.exitCode) || typeof value.accepted !== 'boolean') errors.push(`${label} fields are invalid`);
  return errors;
}

function validateReturnShape(value) {
  const errors = extras(value, RETURN_KEYS, 'return');
  if (!object(value)) return errors;
  if (value.schemaVersion !== RETURN_SCHEMA_VERSION) errors.push(`return.schemaVersion must be ${RETURN_SCHEMA_VERSION}`);
  if (value.artifactClass !== 'EXECUTION_RETURN') errors.push('return.artifactClass must be EXECUTION_RETURN');
  for (const key of [
    'taskRef','attemptRef','packageRef','requestRef','correlationRef','requestingRoleRef',
    'hostProfileRef','canonicalResultPath','nextSafeRouteRef',
  ]) if (!nonempty(value[key])) errors.push(`return.${key} is required`);
  if (!nullableString(value.repositoryExecutionProfileRefOrNull)) errors.push('return.repositoryExecutionProfileRefOrNull is invalid');
  const returnTimeOrder = compareInstants(value.startedAt, value.completedAt);
  if (returnTimeOrder === null || returnTimeOrder > 0) errors.push('return timestamps are invalid');
  if (value.executionState !== RETURN_STATE) errors.push(`return.executionState must be ${RETURN_STATE}`);
  if (!DISPOSITIONS.has(value.disposition)) errors.push('return.disposition is invalid');
  if (!nullableString(value.stopReasonOrNull)) errors.push('return.stopReasonOrNull is invalid');
  if (value.firstSubstantiveFailureOrNull !== null) errors.push(...validateFailure(value.firstSubstantiveFailureOrNull, 'return.firstSubstantiveFailureOrNull'));
  if (!hex64(value.inputArchiveSha256) || !hex64(value.contentSetSha256)) errors.push('return archive/content digests are invalid');
  if (value.archiveDigestBinding !== 'FILENAME_SHA256') errors.push('return.archiveDigestBinding must be FILENAME_SHA256');
  errors.push(...arrayOfObjects(value.commandReceipts, validateCommand, 'return.commandReceipts'));
  const commandReceipts = Array.isArray(value.commandReceipts) ? value.commandReceipts : [];
  errors.push(...validateInventory(value.inventory, 'return.inventory'));
  for (const key of ['candidateFindings','harnessFindings','environmentFindings','unknownFindings']) if (!uniqueStrings(value[key])) errors.push(`return.${key} must contain unique strings`);
  errors.push(...extras(value.effects, new Set(EFFECT_FIELDS), 'return.effects'));
  for (const field of EFFECT_FIELDS) if (typeof value.effects?.[field] !== 'boolean') errors.push(`return.effects.${field} must be boolean`);
  errors.push(...extras(value.hostPermissionObservations, PERMISSION_KEYS, 'return.hostPermissionObservations'));
  for (const field of PERMISSION_FIELDS) if (typeof value.hostPermissionObservations?.[field] !== 'boolean') errors.push(`return.hostPermissionObservations.${field} must be boolean`);
  if (!uniqueStrings(value.hostPermissionObservations?.promptedResourceRefs)) errors.push('return.hostPermissionObservations.promptedResourceRefs is invalid');

  if (typeof value.testOwnedProcessLeakObserved !== 'boolean') errors.push('return.testOwnedProcessLeakObserved must be boolean');
  if (typeof value.testOwnedTransientResourceLeakObserved !== 'boolean') errors.push('return.testOwnedTransientResourceLeakObserved must be boolean');
  if (typeof value.payloadSandboxCleanupVerified !== 'boolean') errors.push('return.payloadSandboxCleanupVerified must be boolean');
  if (!uniqueStrings(value.cleanupFailureRefs)) errors.push('return.cleanupFailureRefs must contain unique strings');
  if (!RETAINED_ARTIFACT_DISPOSITIONS.has(value.retainedArtifactDisposition)) errors.push('return.retainedArtifactDisposition is invalid');

  if (value.disposition === 'PASS') {
    if (value.stopReasonOrNull !== null) errors.push('PASS return cannot contain a stop reason');
    if (value.firstSubstantiveFailureOrNull !== null) errors.push('PASS return cannot contain a substantive failure');
    if (commandReceipts.length === 0) errors.push('PASS return requires at least one command receipt');
    if (commandReceipts.some((receipt) => receipt?.accepted !== true)) errors.push('PASS return cannot contain an unaccepted command receipt');
    if ((value.unknownFindings ?? []).length !== 0) errors.push('PASS return cannot contain unknown findings');
    if (value.effects?.credentialSerializationPerformed === true) errors.push('PASS return cannot serialize credentials');
    if (value.effects?.filesystemOutsideQualifiedRootsPerformed === true) errors.push('PASS return cannot write outside qualified roots');
    if (value.testOwnedProcessLeakObserved !== false) errors.push('PASS return requires testOwnedProcessLeakObserved=false');
    if (value.testOwnedTransientResourceLeakObserved !== false) errors.push('PASS return requires testOwnedTransientResourceLeakObserved=false');
    if (value.payloadSandboxCleanupVerified !== true) errors.push('PASS return requires payloadSandboxCleanupVerified=true');
    if ((value.cleanupFailureRefs ?? []).length !== 0) errors.push('PASS return requires cleanupFailureRefs=[]');
    if (!RETAINED_ARTIFACT_DISPOSITIONS.has(value.retainedArtifactDisposition)) errors.push('PASS return requires a valid retainedArtifactDisposition');
  } else if (value.disposition === SAFE_CANCELLED_DISPOSITION) {
    if (value.stopReasonOrNull !== SAFE_CANCELLED_STOP_REASON) errors.push(`SAFE_CANCELLED_BY_HUMAN return stop reason must be ${SAFE_CANCELLED_STOP_REASON}`);
    if (value.firstSubstantiveFailureOrNull !== null) errors.push('SAFE_CANCELLED_BY_HUMAN return cannot contain a substantive failure');
    if ((value.candidateFindings ?? []).length !== 0) errors.push('SAFE_CANCELLED_BY_HUMAN return cannot contain candidate findings');
  } else {
    if (value.stopReasonOrNull === null && value.firstSubstantiveFailureOrNull === null) {
      errors.push('non-PASS return requires stop reason or first substantive failure');
    }
    if (commandReceipts.some((receipt) => receipt?.accepted !== true)
      && value.firstSubstantiveFailureOrNull === null) {
      errors.push('non-PASS return with an unaccepted command requires first substantive failure');
    }
  }

  const permissions = value.hostPermissionObservations ?? {};
  if (value.disposition === 'PASS' && permissions.permissionDenied) {
    const optionalAutomationOnly = permissions.automationPermissionRequested
      && permissions.taskCompletedDespiteOptionalPermissionDenial
      && !permissions.filesAndFoldersPermissionRequested
      && !permissions.fullDiskAccessRequested;
    if (!optionalAutomationOnly) errors.push('PASS permission denial must be proven optional automation-only reveal denial');
  }
  if (permissions.taskCompletedDespiteOptionalPermissionDenial) {
    if (value.disposition !== 'PASS' || !permissions.permissionDenied || !permissions.automationPermissionRequested || permissions.filesAndFoldersPermissionRequested) errors.push('optional permission denial completion requires PASS and an automation-only denial');
  }
  if (permissions.permissionDenied && permissions.filesAndFoldersPermissionRequested && value.disposition === 'PASS') errors.push('Files & Folders permission denial cannot be normalized into PASS');
  if (permissions.fullDiskAccessRequested && value.disposition === 'PASS') errors.push('Full Disk Access request cannot be normalized into PASS');
  return errors;
}

function validateReturnManifest(value, options = {}) {
  const errors = validateReturnShape(value);
  requireEvidence(options, ['taskManifest','observedInputArchiveSha256','archiveFilename','archiveBytes','contentInventory'], 'return verification', errors);
  if (errors.length) return { valid: false, errors };

  const task = options.taskManifest;
  const sourceTaskShapeErrors = validateTaskShape(task).map((error) => `return source task invalid: ${error}`);
  errors.push(...sourceTaskShapeErrors);
  if (sourceTaskShapeErrors.length) return { valid: false, errors };
  for (const key of ['taskRef','attemptRef','packageRef','requestRef','correlationRef','requestingRoleRef','hostProfileRef']) if (value?.[key] !== task?.[key]) errors.push(`return.${key} does not match task`);
  if (value?.repositoryExecutionProfileRefOrNull !== task?.repositoryExecutionProfileRefOrNull) errors.push('return repository execution profile does not match task');
  if (!hex64(options.observedInputArchiveSha256)) errors.push('observed input archive SHA-256 is invalid');
  else if (value?.inputArchiveSha256 !== options.observedInputArchiveSha256) errors.push('return input archive digest does not match independently observed task archive');
  errors.push(...verifyDigestBoundFilename(options.archiveFilename, options.archiveBytes).errors);

  const inventoryErrors = validateInventory(options.contentInventory, 'return contentInventory');
  errors.push(...inventoryErrors);
  if (!inventoryErrors.length && hex64(value?.contentSetSha256) && Array.isArray(value?.inventory)) {
    if (contentSetSha256(options.contentInventory) !== value.contentSetSha256) errors.push('return internal content-set digest mismatch');
    if (canonicalJson([...options.contentInventory].sort((a,b)=>codePointCompare(a.path,b.path))) !== canonicalJson([...value.inventory].sort((a,b)=>codePointCompare(a.path,b.path)))) errors.push('return inventory does not match independently observed content inventory');
  }
  return { valid: errors.length === 0, errors };
}

function classifyArtifactAdmission({ artifactClass, executable, taskManifestPresent, returnManifestPresent }) {
  const errors = [];
  if (artifactClass === 'CONTEXT_HANDOFF') {
    if (executable !== false) errors.push('CONTEXT_HANDOFF must be non-executable');
    if (taskManifestPresent || returnManifestPresent) errors.push('CONTEXT_HANDOFF cannot carry task or return manifest');
  } else if (artifactClass === 'EXECUTABLE_RELAY') {
    if (executable !== true || !taskManifestPresent || returnManifestPresent) errors.push('EXECUTABLE_RELAY requires executable task manifest only');
  } else if (artifactClass === 'EXECUTION_RETURN') {
    if (executable !== false || taskManifestPresent || !returnManifestPresent) errors.push('EXECUTION_RETURN requires non-executable return manifest only');
  } else errors.push('unknown artifact class');
  return { valid: errors.length === 0, errors };
}

function validateAttemptIdentity(value, label = 'attemptIdentity') {
  const errors = extras(value, ATTEMPT_IDENTITY_KEYS, label);
  if (!object(value)) return errors;
  for (const key of ['taskRef','attemptRef','packageRef']) if (!nonempty(value[key])) errors.push(`${label}.${key} is required`);
  if (!hex64(value.packageSha256)) errors.push(`${label}.packageSha256 must be SHA-256`);
  if (!nonempty(value.singleUseNonce) || value.singleUseNonce.length < 16) errors.push(`${label}.singleUseNonce is invalid`);
  return errors;
}

function attemptIdentity(task, packageSha256) {
  const value = { taskRef: task?.taskRef, attemptRef: task?.attemptRef, packageRef: task?.packageRef, packageSha256, singleUseNonce: task?.singleUseNonce };
  const errors = validateAttemptIdentity(value);
  if (errors.length) throw new TypeError(errors.join('; '));
  return value;
}

function classifyAttemptReservation(existing, candidate) {
  const candidateErrors = validateAttemptIdentity(candidate, 'candidateAttemptIdentity');
  if (candidateErrors.length) return { state: 'TASK_STATE_UNKNOWN_DO_NOT_EXECUTE', replayPayload: false, errors: candidateErrors };
  if (existing === null) return { state: 'TASK_NEW', replayPayload: true };
  const existingErrors = validateAttemptIdentity(existing, 'existingAttemptIdentity');
  if (existingErrors.length) return { state: 'TASK_STATE_UNKNOWN_DO_NOT_EXECUTE', replayPayload: false, errors: existingErrors };
  if (existing.taskRef !== candidate.taskRef || existing.attemptRef !== candidate.attemptRef) return { state: 'TASK_STATE_UNKNOWN_DO_NOT_EXECUTE', replayPayload: false, errors: ['persisted attempt identity does not match candidate slot'] };
  const sameIdentity = existing.packageRef === candidate.packageRef && existing.packageSha256 === candidate.packageSha256 && existing.singleUseNonce === candidate.singleUseNonce;
  if (!sameIdentity) return { state: 'TASK_IDENTITY_CONFLICT', replayPayload: false };
  return { state: 'TASK_DUPLICATE_ATTEMPT', replayPayload: false };
}

function preserveFirstSubstantiveFailure(existingFailure, laterFailure) {
  return existingFailure ?? laterFailure ?? null;
}

module.exports = {
  TASK_SCHEMA_VERSION,
  RETURN_SCHEMA_VERSION,
  INVENTORY_CLASSES,
  EFFECT_FIELDS,
  PERMISSION_FIELDS,
  canonicalJson,
  hashCanonical,
  sha256,
  storageKey,
  packagePath,
  secretLikePath,
  canonicalInventory,
  contentSetSha256,
  verifyDigestBoundFilename,
  validateTaskShape,
  validateTaskManifest,
  validateReturnShape,
  validateReturnManifest,
  classifyArtifactAdmission,
  validateAttemptIdentity,
  attemptIdentity,
  classifyAttemptReservation,
  preserveFirstSubstantiveFailure,
};

// [VXG RealForever]
