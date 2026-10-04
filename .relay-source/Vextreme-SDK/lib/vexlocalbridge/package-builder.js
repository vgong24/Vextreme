'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  EFFECT_FIELDS,
  PERMISSION_FIELDS,
  sha256,
  contentSetSha256,
  verifyDigestBoundFilename,
  validateTaskManifest,
  validateReturnManifest,
  attemptIdentity,
  classifyAttemptReservation,
  preserveFirstSubstantiveFailure,
} = require('../continuity-operations/vexlocalbridge-manifest-contract');
const {
  ensureDirectory,
  runArgvSync,
  atomicWriteJson,
} = require('./runner-core');

const TASK_MANIFEST_FILE = 'task-manifest.json';
const RETURN_MANIFEST_FILE = 'return-manifest.json';
const INVENTORY_FILE = 'inventory.json';
const PAYLOAD_RESULT_FILE = 'payload-result.json';
const MAX_TASK_FORMATION_TTL_MS = 24 * 60 * 60 * 1000;


function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function hashFile(filePath) {
  return sha256(fs.readFileSync(filePath));
}

function stableFingerprint(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function assertConfined(root, target, options = {}) {
  const rootAbs = path.resolve(root);
  const targetAbs = path.resolve(target);
  if (targetAbs !== rootAbs && !targetAbs.startsWith(`${rootAbs}${path.sep}`)) {
    throw new Error(`path escapes qualified root: ${targetAbs}`);
  }
  if (!fs.existsSync(rootAbs)) throw new Error(`qualified root does not exist: ${rootAbs}`);
  if (fs.lstatSync(rootAbs).isSymbolicLink()) throw new Error(`qualified root cannot be a symlink: ${rootAbs}`);
  const rootReal = fs.realpathSync(rootAbs);
  const relative = path.relative(rootAbs, targetAbs);
  let current = rootAbs;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) break;
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error(`symlink is not allowed inside qualified root: ${current}`);
    }
    const currentReal = fs.realpathSync(current);
    if (currentReal !== rootReal && !currentReal.startsWith(`${rootReal}${path.sep}`)) {
      throw new Error(`resolved path escapes qualified root: ${currentReal}`);
    }
  }
  if (options.mustExist !== false && fs.existsSync(targetAbs)) {
    const targetReal = fs.realpathSync(targetAbs);
    if (targetReal !== rootReal && !targetReal.startsWith(`${rootReal}${path.sep}`)) {
      throw new Error(`resolved path escapes qualified root: ${targetReal}`);
    }
  }
  return targetAbs;
}

function listFilesRecursive(root) {
  const rootAbs = path.resolve(root);
  const output = [];
  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(rootAbs, absolute).split(path.sep).join('/');
      const lstat = fs.lstatSync(absolute);
      if (lstat.isSymbolicLink()) throw new Error(`symlink is not allowed in package/result roots: ${relative}`);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) output.push(relative);
      else throw new Error(`unsupported filesystem entry: ${relative}`);
    }
  }
  walk(rootAbs);
  return output.sort();
}

function taskExpectedFiles(task) {
  return [
    TASK_MANIFEST_FILE,
    task.authorityBinding.authorityEnvelopePath,
    task.payload.payloadPath,
    ...task.payload.immutableInputs.map((item) => item.path),
  ].sort();
}

function verifyExactTaskArchiveMembers(stagingRoot, task) {
  const actual = listFilesRecursive(stagingRoot);
  const expected = taskExpectedFiles(task);
  const extra = actual.filter((item) => !expected.includes(item));
  const missing = expected.filter((item) => !actual.includes(item));
  return { valid: extra.length === 0 && missing.length === 0, actual, expected, extra, missing };
}

function taskContentInventory(stagingRoot, task) {
  const rows = [
    {
      path: task.authorityBinding.authorityEnvelopePath,
      class: 'AUTHORITY',
      sha256: hashFile(assertConfined(stagingRoot, path.join(stagingRoot, task.authorityBinding.authorityEnvelopePath))),
    },
    {
      path: task.payload.payloadPath,
      class: 'PAYLOAD',
      sha256: hashFile(assertConfined(stagingRoot, path.join(stagingRoot, task.payload.payloadPath))),
    },
    ...task.payload.immutableInputs.map((input) => ({
      path: input.path,
      class: 'IMMUTABLE_INPUT',
      sha256: hashFile(assertConfined(stagingRoot, path.join(stagingRoot, input.path))),
    })),
  ];
  return rows.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function authoritySummaryFromEnvelope(envelope) {
  return {
    authoritySchemaRef: envelope.authoritySchemaRef,
    semanticAdmissionRef: envelope.semanticAdmissionRef,
    transactionRef: envelope.transactionRef,
    transactionVersion: envelope.transactionVersion,
    allowedEffectRefs: envelope.allowedEffectRefs,
    heldEffectRefs: envelope.heldEffectRefs,
  };
}

function verifyInputArchiveBeforeExtraction(archivePath) {
  const bytes = fs.readFileSync(archivePath);
  const checked = verifyDigestBoundFilename(path.basename(archivePath), bytes);
  if (!checked.valid) throw new Error(checked.errors.join('; '));
  return { bytes, sha256: checked.observedSha256 };
}

function legacyDittoArchiveAdapter(dittoExecutable = '/usr/bin/ditto', runFn = runArgvSync) {
  return {
    extract({ archivePath, stagingRoot }) {
      return runFn([dittoExecutable, '-x', '-k', archivePath, stagingRoot], {
        cwd: path.dirname(archivePath), timeoutMs: 120_000,
      });
    },
    create({ bundleRoot, outputZip }) {
      return runFn([dittoExecutable, '-c', '-k', '--sequesterRsrc', bundleRoot, outputZip], {
        cwd: path.dirname(bundleRoot), timeoutMs: 120_000,
      });
    },
  };
}

function requireArchiveAdapter(archiveAdapter, dittoExecutable, runFn) {
  const adapter = archiveAdapter || legacyDittoArchiveAdapter(dittoExecutable, runFn);
  if (typeof adapter.extract !== 'function' || typeof adapter.create !== 'function') {
    throw new TypeError('archiveAdapter must provide extract() and create()');
  }
  return adapter;
}

function extractZip({ archivePath, stagingRoot, archiveAdapter, dittoExecutable = '/usr/bin/ditto', runFn = runArgvSync }) {
  ensureDirectory(stagingRoot);
  if (fs.readdirSync(stagingRoot).length) throw new Error('staging root must be empty before extraction');
  const adapter = requireArchiveAdapter(archiveAdapter, dittoExecutable, runFn);
  const result = adapter.extract({ archivePath, stagingRoot });
  if (result.exitCode !== 0) throw new Error(`archive extraction failed: ${result.stderr || result.stdout}`);
  listFilesRecursive(stagingRoot);
  return result;
}

function loadAndValidateTaskPackage({
  archivePath,
  stagingRoot,
  hostProfileRef,
  repositoryExecutionProfileRef,
  now = new Date().toISOString(),
  archiveAdapter,
  dittoExecutable = '/usr/bin/ditto',
  runFn = runArgvSync,
}) {
  const outer = verifyInputArchiveBeforeExtraction(archivePath);
  extractZip({ archivePath, stagingRoot, archiveAdapter, dittoExecutable, runFn });
  const manifestPath = assertConfined(stagingRoot, path.join(stagingRoot, TASK_MANIFEST_FILE));
  if (!fs.existsSync(manifestPath)) throw new Error('task-manifest.json is missing');
  const task = readJson(manifestPath);
  const members = verifyExactTaskArchiveMembers(stagingRoot, task);
  if (!members.valid) {
    throw new Error(`task archive member mismatch: extra=${members.extra.join(',')} missing=${members.missing.join(',')}`);
  }
  const authorityPath = assertConfined(stagingRoot, path.join(stagingRoot, task.authorityBinding.authorityEnvelopePath));
  const payloadPath = assertConfined(stagingRoot, path.join(stagingRoot, task.payload.payloadPath));
  const authorityEnvelopeBytes = fs.readFileSync(authorityPath);
  const payloadBytes = fs.readFileSync(payloadPath);
  const authorityEnvelope = JSON.parse(authorityEnvelopeBytes.toString('utf8'));
  const immutableInputBytesByPath = Object.fromEntries(task.payload.immutableInputs.map((input) => [
    input.path,
    fs.readFileSync(assertConfined(stagingRoot, path.join(stagingRoot, input.path))),
  ]));
  const contentInventory = taskContentInventory(stagingRoot, task);
  const checked = validateTaskManifest(task, {
    now,
    hostProfileRef,
    repositoryExecutionProfileRef,
    archiveFilename: path.basename(archivePath),
    archiveBytes: outer.bytes,
    authorityEnvelopeBytes,
    authoritySummary: authoritySummaryFromEnvelope(authorityEnvelope),
    payloadBytes,
    immutableInputBytesByPath,
    contentInventory,
  });
  if (!checked.valid) throw new Error(`task admission failed: ${checked.errors.join('; ')}`);
  return {
    task, outer, authorityEnvelope, authorityEnvelopeBytes, payloadBytes, payloadPath,
    immutableInputBytesByPath, contentInventory, members,
  };
}

function taskFormationError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sampleTaskFormationClock(clock, label) {
  if (typeof clock !== 'function') throw new TypeError('task formation clock must be a function');
  const observed = clock();
  const date = observed instanceof Date ? observed : new Date(observed);
  if (Number.isNaN(date.getTime())) throw taskFormationError('TASK_FORMATION_CLOCK_INVALID', 'invalid task formation clock sample: ' + label);
  return date;
}

function validateTaskFormationTtlMs(ttlMs) {
  if (!Number.isInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_TASK_FORMATION_TTL_MS) {
    throw taskFormationError(
      'TASK_FORMATION_TTL_INVALID',
      'task formation ttlMs must be an integer in [1, ' + MAX_TASK_FORMATION_TTL_MS + ']',
    );
  }
  return ttlMs;
}

function taskFormationContentPaths(taskTemplate) {
  if (!taskTemplate || typeof taskTemplate !== 'object' || Array.isArray(taskTemplate)) {
    throw new TypeError('taskTemplate must be an object');
  }
  if (!taskTemplate.authorityBinding || !taskTemplate.payload || !Array.isArray(taskTemplate.payload.immutableInputs)) {
    throw taskFormationError('TASK_FORMATION_TEMPLATE_INCOMPLETE');
  }
  return [
    taskTemplate.authorityBinding.authorityEnvelopePath,
    taskTemplate.payload.payloadPath,
    ...taskTemplate.payload.immutableInputs.map((item) => item.path),
  ];
}

function copyTaskFormationContent({ contentRoot, bundleRoot, taskTemplate }) {
  const sourceRoot = path.resolve(contentRoot);
  const paths = [...new Set(taskFormationContentPaths(taskTemplate))];
  for (const relativePath of paths) {
    if (typeof relativePath !== 'string' || !relativePath || path.isAbsolute(relativePath)) {
      throw taskFormationError('TASK_FORMATION_CONTENT_PATH_INVALID', String(relativePath));
    }
    const sourcePath = assertConfined(sourceRoot, path.join(sourceRoot, relativePath));
    if (!fs.existsSync(sourcePath) || !fs.lstatSync(sourcePath).isFile()) {
      throw taskFormationError('TASK_FORMATION_CONTENT_MISSING', relativePath);
    }
    const targetPath = assertConfined(bundleRoot, path.join(bundleRoot, relativePath), { mustExist: false });
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
  return paths.sort();
}

function createCanonicalTaskZip({
  taskTemplate,
  contentRoot,
  outputDirectory,
  outputStem = 'VexLocalBridge-Task',
  ttlMs,
  clock = () => new Date(),
  archiveAdapter,
  dittoExecutable = '/usr/bin/ditto',
  runFn = runArgvSync,
} = {}) {
  if (!taskTemplate || typeof taskTemplate !== 'object' || Array.isArray(taskTemplate)) {
    throw new TypeError('taskTemplate must be an object');
  }
  if (Object.prototype.hasOwnProperty.call(taskTemplate, 'formedAt')
      || Object.prototype.hasOwnProperty.call(taskTemplate, 'expiresAt')) {
    throw taskFormationError(
      'TASK_FORMATION_CALLER_WINDOW_FORBIDDEN',
      'canonical task formation owns formedAt/expiresAt; callers must not author absolute task windows',
    );
  }
  if (typeof contentRoot !== 'string' || !contentRoot) throw new TypeError('contentRoot is required');
  if (typeof outputDirectory !== 'string' || !outputDirectory) throw new TypeError('outputDirectory is required');
  if (typeof outputStem !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(outputStem)) {
    throw taskFormationError('TASK_FORMATION_OUTPUT_STEM_INVALID');
  }
  const boundedTtlMs = validateTaskFormationTtlMs(ttlMs);
  const outputRoot = path.resolve(outputDirectory);
  ensureDirectory(outputRoot);
  const formationRoot = fs.mkdtempSync(path.join(outputRoot, '.vexlocalbridge-task-formation-'));
  const bundleRoot = path.join(formationRoot, 'bundle');
  fs.mkdirSync(bundleRoot, { recursive: true });
  let finalZip = null;
  try {
    copyTaskFormationContent({ contentRoot, bundleRoot, taskTemplate });

    const formed = sampleTaskFormationClock(clock, 'formedAt');
    const expires = new Date(formed.getTime() + boundedTtlMs);
    const task = {
      ...taskTemplate,
      formedAt: formed.toISOString(),
      expiresAt: expires.toISOString(),
    };
    const contentInventory = taskContentInventory(bundleRoot, task);
    task.contentSetSha256 = contentSetSha256(contentInventory);
    writeJson(path.join(bundleRoot, TASK_MANIFEST_FILE), task);

    const members = verifyExactTaskArchiveMembers(bundleRoot, task);
    if (!members.valid) {
      throw taskFormationError(
        'TASK_FORMATION_MEMBER_MISMATCH',
        'task archive member mismatch: extra=' + members.extra.join(',') + ' missing=' + members.missing.join(','),
      );
    }

    const formingZip = path.join(outputRoot, outputStem + '.forming.zip');
    fs.rmSync(formingZip, { force: true });
    createZipFromDirectory({
      bundleRoot,
      outputZip: formingZip,
      archiveAdapter,
      dittoExecutable,
      runFn,
    });
    const digest = hashFile(formingZip);
    finalZip = path.join(outputRoot, outputStem + '--sha256-' + digest + '.zip');
    if (fs.existsSync(finalZip)) throw taskFormationError('TASK_FORMATION_OUTPUT_EXISTS', finalZip);
    fs.renameSync(formingZip, finalZip);

    const qualified = sampleTaskFormationClock(clock, 'qualificationNow');
    if (qualified.getTime() < formed.getTime() || qualified.getTime() >= expires.getTime()) {
      fs.rmSync(finalZip, { force: true });
      finalZip = null;
      throw taskFormationError(
        'TASK_FORMATION_WINDOW_NOT_CURRENT_AT_FINAL_BYTE_QUALIFICATION',
        'final task bytes are outside the source-managed formation window',
      );
    }

    const authorityPath = assertConfined(bundleRoot, path.join(bundleRoot, task.authorityBinding.authorityEnvelopePath));
    const payloadPath = assertConfined(bundleRoot, path.join(bundleRoot, task.payload.payloadPath));
    const authorityEnvelopeBytes = fs.readFileSync(authorityPath);
    const payloadBytes = fs.readFileSync(payloadPath);
    const authorityEnvelope = JSON.parse(authorityEnvelopeBytes.toString('utf8'));
    const immutableInputBytesByPath = Object.fromEntries(task.payload.immutableInputs.map((input) => [
      input.path,
      fs.readFileSync(assertConfined(bundleRoot, path.join(bundleRoot, input.path))),
    ]));
    const archiveBytes = fs.readFileSync(finalZip);
    const checked = validateTaskManifest(task, {
      now: qualified.toISOString(),
      hostProfileRef: task.hostProfileRef,
      repositoryExecutionProfileRef: task.repositoryExecutionProfileRefOrNull,
      archiveFilename: path.basename(finalZip),
      archiveBytes,
      authorityEnvelopeBytes,
      authoritySummary: authoritySummaryFromEnvelope(authorityEnvelope),
      payloadBytes,
      immutableInputBytesByPath,
      contentInventory,
    });
    if (!checked.valid) {
      fs.rmSync(finalZip, { force: true });
      finalZip = null;
      throw taskFormationError(
        'TASK_FORMATION_FINAL_VALIDATION_FAILED',
        'formed task failed shared validation: ' + checked.errors.join('; '),
      );
    }

    return {
      finalZip,
      digest,
      task,
      formationEvidence: {
        state: 'PASS',
        formedAt: task.formedAt,
        expiresAt: task.expiresAt,
        qualificationNow: qualified.toISOString(),
        ttlMs: boundedTtlMs,
        callerAuthoredAbsoluteWindowAccepted: false,
        finalByteQualification: 'PASS',
      },
    };
  } finally {
    fs.rmSync(formationRoot, { recursive: true, force: true });
  }
}

function loadPersistedAttempt(statePath) {
  if (!fs.existsSync(statePath)) return null;
  try { return readJson(statePath); }
  catch (error) { return { __invalidPersistedState: true, error: error.message }; }
}

function reserveAttempt({ stateRoot, task, packageSha256 }) {
  const slot = path.join(stateRoot, task.taskStorageKey, `${task.attemptStorageKey}.json`);
  assertConfined(stateRoot, slot, { mustExist: false });
  const candidate = attemptIdentity(task, packageSha256);
  const existing = loadPersistedAttempt(slot);
  const classified = classifyAttemptReservation(existing, candidate);
  if (classified.replayPayload === true) atomicWriteJson(slot, candidate);
  return { ...classified, slot, candidate, existing };
}

function effectBooleans(value = {}) {
  return Object.fromEntries(EFFECT_FIELDS.map((field) => [field, value[field] === true]));
}

function permissionBooleans(value = {}) {
  const base = Object.fromEntries(PERMISSION_FIELDS.map((field) => [field, value[field] === true]));
  return { ...base, promptedResourceRefs: Array.isArray(value.promptedResourceRefs) ? [...new Set(value.promptedResourceRefs)] : [] };
}

function cleanupProofFields(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return {
    testOwnedProcessLeakObserved: value.testOwnedProcessLeakObserved,
    testOwnedTransientResourceLeakObserved: value.testOwnedTransientResourceLeakObserved,
    payloadSandboxCleanupVerified: value.payloadSandboxCleanupVerified,
    cleanupFailureRefs: Array.isArray(value.cleanupFailureRefs) ? [...new Set(value.cleanupFailureRefs)] : value.cleanupFailureRefs,
    retainedArtifactDisposition: value.retainedArtifactDisposition,
  };
}

function evidenceClass(relativePath) {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith('.log')) return 'LOG';
  if (lower.endsWith('.json')) return 'JSON_EVIDENCE';
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'TEXT_EVIDENCE';
  return 'EVIDENCE';
}

function buildEvidenceInventory(bundleRoot) {
  return listFilesRecursive(bundleRoot)
    .filter((item) => item !== RETURN_MANIFEST_FILE && item !== INVENTORY_FILE)
    .map((relative) => ({ path: relative, sha256: hashFile(path.join(bundleRoot, relative)), class: evidenceClass(relative) }))
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function failureRecord({ family, stage, summary, evidenceRef }) {
  return {
    failureFamily: family,
    failureFingerprint: stableFingerprint(`${family}\n${stage}\n${summary}\n${evidenceRef}`),
    stage, summary, evidenceRef,
  };
}

function normalizeCommandReceipts(receipts) {
  return (receipts || []).map((receipt) => ({
    argv: [...receipt.argv], cwd: receipt.cwd, exitCode: receipt.exitCode, accepted: receipt.accepted === true,
  }));
}

function buildReturnManifest({
  task, inputArchiveSha256, bundleRoot, startedAt, completedAt, disposition,
  stopReasonOrNull = null, firstSubstantiveFailureOrNull = null, commandReceipts = [],
  candidateFindings = [], harnessFindings = [], environmentFindings = [], unknownFindings = [],
  nextSafeRouteRef, effects = {}, hostPermissionObservations = {}, canonicalResultPath, cleanupProof,
}) {
  const inventory = buildEvidenceInventory(bundleRoot);
  return {
    schemaVersion: 'vextreme.vexlocalbridge-return-manifest/v1',
    artifactClass: 'EXECUTION_RETURN',
    taskRef: task.taskRef,
    attemptRef: task.attemptRef,
    packageRef: task.packageRef,
    requestRef: task.requestRef,
    correlationRef: task.correlationRef,
    requestingRoleRef: task.requestingRoleRef,
    hostProfileRef: task.hostProfileRef,
    repositoryExecutionProfileRefOrNull: task.repositoryExecutionProfileRefOrNull,
    startedAt,
    completedAt,
    executionState: 'TASK_TERMINAL_RESULT_AVAILABLE',
    disposition,
    stopReasonOrNull,
    firstSubstantiveFailureOrNull,
    inputArchiveSha256,
    archiveDigestBinding: 'FILENAME_SHA256',
    contentSetSha256: contentSetSha256(inventory),
    canonicalResultPath,
    commandReceipts: normalizeCommandReceipts(commandReceipts),
    inventory,
    candidateFindings: [...new Set(candidateFindings)],
    harnessFindings: [...new Set(harnessFindings)],
    environmentFindings: [...new Set(environmentFindings)],
    unknownFindings: [...new Set(unknownFindings)],
    nextSafeRouteRef,
    effects: effectBooleans(effects),
    hostPermissionObservations: permissionBooleans(hostPermissionObservations),
    ...cleanupProofFields(cleanupProof),
  };
}

function ensureTerminalEvidenceFiles(bundleRoot, values = {}) {
  fs.mkdirSync(bundleRoot, { recursive: true });
  const defaults = {
    'RESULT-SUMMARY.txt': values.summary || 'VexLocalBridge terminal result\n',
    'execution.log': values.executionLog || '',
    'before-state.json': `${JSON.stringify(values.beforeState || {}, null, 2)}\n`,
    'after-state.json': `${JSON.stringify(values.afterState || {}, null, 2)}\n`,
    'completed-step-receipts.json': `${JSON.stringify(values.completedStepReceipts || [], null, 2)}\n`,
    'first-substantive-failure.json': `${JSON.stringify(values.firstSubstantiveFailure || null, null, 2)}\n`,
  };
  for (const [name, content] of Object.entries(defaults)) {
    const target = path.join(bundleRoot, name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, content);
  }
}

function copyRetainedEvidenceFiles(bundleRoot, files = []) {
  if (!Array.isArray(files)) throw new TypeError('retainedEvidenceFiles must be an array');
  const copied = [];
  for (const item of files) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError('retained evidence entry must be an object');
    if (typeof item.sourcePath !== 'string' || !path.isAbsolute(item.sourcePath)) throw new TypeError('retained evidence sourcePath must be absolute');
    if (typeof item.targetPath !== 'string' || !item.targetPath.startsWith('retained/')) throw new TypeError('retained evidence targetPath must stay under retained/');
    if (!/^[a-f0-9]{64}$/.test(item.expectedSha256 || '')) throw new TypeError('retained evidence expectedSha256 must be lowercase SHA-256');
    if (!fs.existsSync(item.sourcePath) || !fs.lstatSync(item.sourcePath).isFile()) throw new Error(`retained evidence source is unavailable: ${item.sourcePath}`);
    const observed = hashFile(item.sourcePath);
    if (observed !== item.expectedSha256) throw new Error(`retained evidence digest mismatch: ${item.targetPath}`);
    const target = assertConfined(bundleRoot, path.join(bundleRoot, item.targetPath), { mustExist: false });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target)) throw new Error(`retained evidence target already exists: ${item.targetPath}`);
    fs.copyFileSync(item.sourcePath, target);
    if (hashFile(target) !== item.expectedSha256) throw new Error(`retained evidence copied digest mismatch: ${item.targetPath}`);
    copied.push({ targetPath: item.targetPath, sha256: item.expectedSha256 });
  }
  return copied;
}

function createZipFromDirectory({ bundleRoot, outputZip, archiveAdapter, dittoExecutable = '/usr/bin/ditto', runFn = runArgvSync }) {
  const adapter = requireArchiveAdapter(archiveAdapter, dittoExecutable, runFn);
  const result = adapter.create({ bundleRoot, outputZip });
  if (result.exitCode !== 0) throw new Error(`result ZIP formation failed: ${result.stderr || result.stdout}`);
  return result;
}

function createCanonicalResultZip({
  task, inputArchiveSha256, resultRoot, startedAt, completedAt, disposition,
  stopReasonOrNull, firstSubstantiveFailureOrNull, commandReceipts, candidateFindings,
  harnessFindings, environmentFindings, unknownFindings, nextSafeRouteRef, effects,
  hostPermissionObservations, cleanupProof, summary, executionLog, beforeState, afterState,
  completedStepReceipts, retainedEvidenceFiles = [], archiveAdapter, dittoExecutable = '/usr/bin/ditto', runFn = runArgvSync,
}) {
  const slotRoot = assertConfined(resultRoot, path.join(resultRoot, task.taskStorageKey, task.attemptStorageKey), { mustExist: false });
  const bundleRoot = assertConfined(resultRoot, path.join(slotRoot, 'bundle'), { mustExist: false });
  const archivesRoot = assertConfined(resultRoot, path.join(slotRoot, 'results'), { mustExist: false });
  fs.rmSync(bundleRoot, { recursive: true, force: true });
  fs.mkdirSync(bundleRoot, { recursive: true });
  fs.mkdirSync(archivesRoot, { recursive: true });
  ensureTerminalEvidenceFiles(bundleRoot, {
    summary, executionLog, beforeState, afterState, completedStepReceipts,
    firstSubstantiveFailure: firstSubstantiveFailureOrNull,
  });
  copyRetainedEvidenceFiles(bundleRoot, retainedEvidenceFiles);
  const canonicalResultPath = path.relative(resultRoot, slotRoot).split(path.sep).join('/');
  const manifest = buildReturnManifest({
    task, inputArchiveSha256, bundleRoot, startedAt, completedAt, disposition,
    stopReasonOrNull, firstSubstantiveFailureOrNull, commandReceipts,
    candidateFindings, harnessFindings, environmentFindings, unknownFindings,
    nextSafeRouteRef, effects, hostPermissionObservations, canonicalResultPath, cleanupProof,
  });
  writeJson(path.join(bundleRoot, INVENTORY_FILE), manifest.inventory);
  writeJson(path.join(bundleRoot, RETURN_MANIFEST_FILE), manifest);
  const stem = `RETURN-${task.taskStorageKey}-${task.attemptStorageKey}`;
  const tempZip = path.join(archivesRoot, `${stem}.forming.zip`);
  fs.rmSync(tempZip, { force: true });
  createZipFromDirectory({ bundleRoot, outputZip: tempZip, archiveAdapter, dittoExecutable, runFn });
  const digest = hashFile(tempZip);
  const finalZip = path.join(archivesRoot, `${stem}--sha256-${digest}.zip`);
  fs.renameSync(tempZip, finalZip);
  const archiveBytes = fs.readFileSync(finalZip);
  const checked = validateReturnManifest(manifest, {
    taskManifest: task,
    observedInputArchiveSha256: inputArchiveSha256,
    archiveFilename: path.basename(finalZip),
    archiveBytes,
    contentInventory: manifest.inventory,
  });
  if (!checked.valid) throw new Error(`formed return failed shared validation: ${checked.errors.join('; ')}`);
  return { finalZip, digest, manifest, bundleRoot, slotRoot };
}

function mergePayloadFailure(existingFailure, laterFailure) {
  return preserveFirstSubstantiveFailure(existingFailure, laterFailure);
}

module.exports = {
  TASK_MANIFEST_FILE,
  RETURN_MANIFEST_FILE,
  INVENTORY_FILE,
  PAYLOAD_RESULT_FILE,
  readJson,
  writeJson,
  hashFile,
  assertConfined,
  listFilesRecursive,
  verifyExactTaskArchiveMembers,
  taskContentInventory,
  authoritySummaryFromEnvelope,
  verifyInputArchiveBeforeExtraction,
  legacyDittoArchiveAdapter,
  requireArchiveAdapter,
  extractZip,
  loadAndValidateTaskPackage,
  reserveAttempt,
  effectBooleans,
  permissionBooleans,
  cleanupProofFields,
  buildEvidenceInventory,
  failureRecord,
  buildReturnManifest,
  ensureTerminalEvidenceFiles,
  copyRetainedEvidenceFiles,
  createZipFromDirectory,
  createCanonicalTaskZip,
  createCanonicalResultZip,
  mergePayloadFailure,
};

// [VXG RealForever]
