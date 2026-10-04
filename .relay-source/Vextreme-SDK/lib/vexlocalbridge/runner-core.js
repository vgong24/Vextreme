'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_HEARTBEAT_MS = 15 * 1000;
const DEFAULT_CHILD_OUTPUT_MAX_BYTES = 4 * 1024 * 1024;
const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;

function isAbsoluteExecutablePath(value) {
  return typeof value === 'string' && (path.isAbsolute(value) || WINDOWS_ABSOLUTE_PATH.test(value));
}

function assertAbsoluteExecutable(value, label = 'executable') {
  if (!isAbsoluteExecutablePath(value)) {
    throw new TypeError(`${label} candidate must be an absolute path`);
  }
}

function expandHome(value, homeDir = os.homedir()) {
  if (typeof value !== 'string') throw new TypeError('path value must be a string');
  if (value === '~') return homeDir;
  if (value.startsWith('~/')) return path.join(homeDir, value.slice(2));
  return value;
}

function ensureDirectory(cwd, fsImpl = fs) {
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) {
    throw new TypeError('cwd must be an absolute path');
  }
  fsImpl.mkdirSync(cwd, { recursive: true });
  const stat = fsImpl.statSync(cwd);
  if (!stat.isDirectory()) throw new Error(`cwd is not a directory: ${cwd}`);
  return cwd;
}

function assertPathWithinRoots(target, roots, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const homeDir = options.homeDir || os.homedir();
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new TypeError('qualified roots must be a non-empty array');
  }
  const targetAbs = path.resolve(target);
  if (!fsImpl.existsSync(targetAbs)) {
    const error = new Error(`input path does not exist: ${targetAbs}`);
    error.code = 'INPUT_PATH_NOT_FOUND';
    throw error;
  }
  const targetReal = fsImpl.realpathSync(targetAbs);
  for (const rootValue of roots) {
    const rootAbs = path.resolve(expandHome(rootValue, homeDir));
    const rootReal = fsImpl.existsSync(rootAbs) ? fsImpl.realpathSync(rootAbs) : rootAbs;
    if (targetReal === rootReal || targetReal.startsWith(`${rootReal}${path.sep}`)) return targetReal;
  }
  const error = new Error(`path is outside qualified roots: ${targetReal}`);
  error.code = 'INPUT_ROOT_VIOLATION';
  throw error;
}

function dependencyInstallCommand(repoRoot, profile, executables, fsImpl = fs) {
  const npm = executables?.npm;
  assertAbsoluteExecutable(npm, 'npm executable');
  const strategy = profile?.dependencyStrategy;
  if (!strategy || !Array.isArray(strategy.lockfilePresent) || !Array.isArray(strategy.lockfileAbsent)) {
    throw new TypeError('dependency strategy is incomplete');
  }
  const hasLockfile = fsImpl.existsSync(path.join(repoRoot, 'package-lock.json'));
  const selected = hasLockfile ? strategy.lockfilePresent : strategy.lockfileAbsent;
  if (selected[0] !== 'npm') throw new Error('dependency strategy must use the qualified npm executable');
  if (hasLockfile && (selected.length !== 2 || selected[1] !== 'ci')) {
    throw new Error('lockfile-present strategy must be npm ci');
  }
  if (!hasLockfile) {
    const required = ['install','--include=dev','--ignore-scripts','--no-audit','--no-fund','--no-save','--package-lock=false'];
    if (JSON.stringify(selected.slice(1)) !== JSON.stringify(required)) {
      throw new Error('lockfile-absent strategy must preserve the approved no-lock install argv');
    }
  }
  return [npm, ...selected.slice(1)];
}

function resolveExecutable(candidates, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const accessMode = options.accessMode ?? fs.constants.X_OK;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new TypeError('executable candidates must be a non-empty array');
  }
  const errors = [];
  for (const candidate of candidates) {
    try {
      assertAbsoluteExecutable(candidate);
      fsImpl.accessSync(candidate, accessMode);
      const stat = fsImpl.statSync(candidate);
      if (!stat.isFile()) throw new Error('not a file');
      return candidate;
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }
  const failure = new Error(`no qualified executable candidate: ${errors.join('; ')}`);
  failure.code = 'EXECUTABLE_NOT_FOUND';
  failure.candidates = [...candidates];
  throw failure;
}

function resolveExecutableMap(profile, requiredKeys = ['git','gh','node','npm'], options = {}) {
  const result = {};
  for (const key of requiredKeys) {
    const candidates = profile?.executables?.[key];
    result[key] = resolveExecutable(candidates, options);
  }
  return result;
}

function normalizeExitCode(result) {
  return Number.isInteger(result?.status) ? result.status : 127;
}

function runArgvSync(argv, options = {}) {
  if (!Array.isArray(argv) || argv.length === 0 || !argv.every((item) => typeof item === 'string')) {
    throw new TypeError('argv must be a non-empty string array');
  }
  assertAbsoluteExecutable(argv[0], 'argv[0]');
  const cwd = ensureDirectory(path.resolve(options.cwd || process.cwd()), options.fsImpl || fs);
  const spawnSyncImpl = options.spawnSyncImpl || spawnSync;
  const result = spawnSyncImpl(argv[0], argv.slice(1), {
    cwd,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
    shell: false,
  });
  return {
    argv: [...argv], cwd, exitCode: normalizeExitCode(result),
    stdout: result?.stdout || '',
    stderr: result?.stderr || (result?.error ? String(result.error.message) : ''),
    timedOut: result?.error?.code === 'ETIMEDOUT',
    errorCode: result?.error?.code || null,
  };
}

function semanticAcceptance(result, command) {
  const acceptedExitCodes = Array.isArray(command.acceptedExitCodes) ? command.acceptedExitCodes : [0];
  const exitAccepted = acceptedExitCodes.includes(result.exitCode);
  const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
  const required = command.semantic?.requiredOutputIncludes || [];
  const forbidden = command.semantic?.forbiddenOutputIncludes || [];
  const requiredSatisfied = required.every((token) => combined.includes(token));
  const forbiddenAbsent = forbidden.every((token) => !combined.includes(token));
  return {
    accepted: exitAccepted && requiredSatisfied && forbiddenAbsent && !result.timedOut,
    exitAccepted,
    semanticAccepted: requiredSatisfied && forbiddenAbsent,
    semanticFailures: [
      ...required.filter((token) => !combined.includes(token)).map((token) => `required output missing: ${token}`),
      ...forbidden.filter((token) => combined.includes(token)).map((token) => `forbidden output present: ${token}`),
    ],
  };
}

function runCommandMatrix(commands, options = {}) {
  if (!Array.isArray(commands)) throw new TypeError('commands must be an array');
  const byRef = new Map();
  const receipts = [];
  let interrupted = false;
  let firstFailure = null;
  for (const command of commands) {
    if (!command || typeof command.commandRef !== 'string' || !Array.isArray(command.argv)) {
      throw new TypeError('command definition is invalid');
    }
    const dependencies = command.dependsOn || [];
    const dependencyBlocked = dependencies.some((ref) => byRef.get(ref)?.accepted !== true);
    if (interrupted || dependencyBlocked) {
      const receipt = {
        commandRef: command.commandRef,
        argv: [...command.argv],
        cwd: path.resolve(command.cwd || options.cwd || process.cwd()),
        exitCode: 125,
        accepted: false,
        skipped: true,
        stopReason: interrupted ? 'INTERRUPTED_UPSTREAM' : 'DEPENDENCY_NOT_ACCEPTED',
      };
      receipts.push(receipt);
      byRef.set(command.commandRef, receipt);
      if (!firstFailure) firstFailure = receipt;
      continue;
    }
    const raw = (options.runFn || runArgvSync)(command.argv, {
      cwd: command.cwd || options.cwd,
      env: { ...(options.env || {}), ...(command.env || {}) },
      timeoutMs: command.timeoutMs || options.timeoutMs,
    });
    const acceptance = semanticAcceptance(raw, command);
    const receipt = {
      commandRef: command.commandRef,
      argv: [...raw.argv], cwd: raw.cwd, exitCode: raw.exitCode,
      accepted: acceptance.accepted,
      exitAccepted: acceptance.exitAccepted,
      semanticAccepted: acceptance.semanticAccepted,
      semanticFailures: acceptance.semanticFailures,
      timedOut: Boolean(raw.timedOut), stdout: raw.stdout, stderr: raw.stderr, skipped: false,
    };
    receipts.push(receipt);
    byRef.set(command.commandRef, receipt);
    if (!receipt.accepted && !firstFailure) firstFailure = receipt;
    if (receipt.timedOut || raw.errorCode === 'EINTR' || raw.errorCode === 'SIGINT') interrupted = true;
  }
  return { receipts, firstFailure, interrupted };
}

function appendBoundedOutput(state, chunk, maxBytes) {
  const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
  state.totalBytes += bytes.length;
  if (bytes.length >= maxBytes) {
    state.buffer = bytes.subarray(bytes.length - maxBytes);
    state.truncated = true;
    return bytes.length;
  }
  let combined = Buffer.concat([state.buffer, bytes]);
  if (combined.length > maxBytes) {
    combined = combined.subarray(combined.length - maxBytes);
    state.truncated = true;
  }
  state.buffer = combined;
  return bytes.length;
}

function runBoundedChild(argv, options = {}) {
  if (!Array.isArray(argv) || argv.length === 0 || !argv.every((item) => typeof item === 'string')) {
    return Promise.reject(new TypeError('argv must be a non-empty string array'));
  }
  assertAbsoluteExecutable(argv[0], 'argv[0]');
  const cwd = ensureDirectory(path.resolve(options.cwd || process.cwd()));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_CHILD_OUTPUT_MAX_BYTES;
  const abortSettleMs = options.abortSettleMs ?? null;
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes <= 0) {
    return Promise.reject(new TypeError('maxOutputBytes must be a positive integer'));
  }
  if (abortSettleMs !== null && (!Number.isInteger(abortSettleMs) || abortSettleMs < 0)) {
    return Promise.reject(new TypeError('abortSettleMs must be null or a non-negative integer'));
  }
  const spawnImpl = options.spawnImpl || spawn;
  const startedAt = new Date().toISOString();
  return new Promise((resolve) => {
    const child = spawnImpl(argv[0], argv.slice(1), {
      cwd,
      env: { ...process.env, ...(options.env || {}) },
      shell: false,
      detached: options.taskOwnedProcessGroup === true && process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    options.onSpawn?.(child);
    const stdoutState = { buffer: Buffer.alloc(0), totalBytes: 0, truncated: false };
    const stderrState = { buffer: Buffer.alloc(0), totalBytes: 0, truncated: false };
    let terminal = false;
    let artifactSatisfied = false;
    let timedOut = false;
    let heartbeatCount = 0;
    let artifactTimer = null;
    let abortSettleTimer = null;
    let abortReason = null;
    child.stdout?.on('data', (chunk) => {
      const deltaBytes = appendBoundedOutput(stdoutState, chunk, maxOutputBytes);
      options.onOutputActivity?.({
        stream: 'stdout',
        deltaBytes,
        totalBytes: stdoutState.totalBytes,
        retainedBytes: stdoutState.buffer.length,
        truncated: stdoutState.truncated,
      });
    });
    child.stderr?.on('data', (chunk) => {
      const deltaBytes = appendBoundedOutput(stderrState, chunk, maxOutputBytes);
      options.onOutputActivity?.({
        stream: 'stderr',
        deltaBytes,
        totalBytes: stderrState.totalBytes,
        retainedBytes: stderrState.buffer.length,
        truncated: stderrState.truncated,
      });
    });
    const heartbeat = setInterval(() => {
      heartbeatCount += 1;
      options.onHeartbeat?.({
        argv,
        cwd,
        heartbeatCount,
        elapsedMs: heartbeatCount * heartbeatMs,
        stdoutBytes: stdoutState.totalBytes,
        stderrBytes: stderrState.totalBytes,
      });
    }, heartbeatMs);
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => { if (!terminal) child.kill('SIGKILL'); }, 1000).unref?.();
    }, timeoutMs);

    const finish = (code, signal, settlement = {}) => {
      if (terminal) return;
      terminal = true;
      clearInterval(heartbeat);
      clearTimeout(timeout);
      if (artifactTimer) clearInterval(artifactTimer);
      if (abortSettleTimer) clearTimeout(abortSettleTimer);
      if (options.signal) options.signal.removeEventListener('abort', abort);
      const terminalObserved = settlement.terminalObserved !== false;
      resolve({
        argv: [...argv],
        cwd,
        pid: Number.isInteger(child.pid) ? child.pid : null,
        exitCode: Number.isInteger(code) ? code : 128,
        signal: signal || null,
        stdout: stdoutState.buffer.toString('utf8'),
        stderr: stderrState.buffer.toString('utf8'),
        stdoutTotalBytes: stdoutState.totalBytes,
        stderrTotalBytes: stderrState.totalBytes,
        stdoutTruncated: stdoutState.truncated,
        stderrTruncated: stderrState.truncated,
        outputMaxBytes: maxOutputBytes,
        timedOut,
        artifactSatisfied,
        taskOwnedProcessIdentity: options.taskOwnedProcessIdentity || null,
        heartbeatCount,
        startedAt,
        finishedAt: new Date().toISOString(),
        terminalObserved,
        childStillRunning: settlement.childStillRunning === true,
        abortSettled: settlement.abortSettled === true,
        abortReason,
      });
    };

    const abort = () => {
      if (terminal) return;
      abortReason = typeof options.signal?.reason === 'string'
        ? options.signal.reason
        : options.signal?.reason == null ? 'ABORT_REQUESTED' : String(options.signal.reason);
      try {
        child.kill('SIGTERM');
      } catch (error) {
        appendBoundedOutput(stderrState, `\nabort SIGTERM error: ${error.message}`, maxOutputBytes);
      }
      if (abortSettleMs !== null && !abortSettleTimer) {
        abortSettleTimer = setTimeout(() => {
          abortSettleTimer = null;
          if (terminal) return;
          child.stdout?.destroy?.();
          child.stderr?.destroy?.();
          child.unref?.();
          finish(130, null, {
            terminalObserved: false,
            childStillRunning: true,
            abortSettled: true,
          });
        }, abortSettleMs);
        abortSettleTimer.unref?.();
      }
    };
    if (options.signal) {
      if (options.signal.aborted) abort();
      else options.signal.addEventListener('abort', abort, { once: true });
    }
    if (typeof options.artifactPredicate === 'function') {
      artifactTimer = setInterval(() => {
        try {
          if (options.artifactPredicate()) {
            artifactSatisfied = true;
            if (options.artifactTerminatesChild !== false) child.kill('SIGTERM');
          }
        } catch (error) {
          appendBoundedOutput(stderrState, `\nartifact predicate error: ${error.message}`, maxOutputBytes);
        }
      }, Math.min(250, heartbeatMs));
    }
    child.on('error', (error) => {
      appendBoundedOutput(stderrState, `\n${error.message}`, maxOutputBytes);
      finish(127, null, { terminalObserved: true, childStillRunning: false, abortSettled: false });
    });
    child.on('close', (code, signal) => {
      finish(code, signal, { terminalObserved: true, childStillRunning: false, abortSettled: false });
    });
  });
}


function sleepSync(milliseconds) {
  if (!Number.isInteger(milliseconds) || milliseconds < 0) throw new TypeError('milliseconds must be a non-negative integer');
  const state = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(state, 0, 0, milliseconds);
}

function posixProcessGroupExists(rootPid, killFn = process.kill) {
  try { killFn(-rootPid, 0); return true; }
  catch (error) { if (error?.code === 'ESRCH') return false; throw error; }
}

function cleanupPosixProcessGroup(rootPid, options = {}) {
  const killFn = options.killFn || process.kill;
  const settleMs = options.settleMs ?? 100;
  const failures = [];
  if (!Number.isInteger(rootPid) || rootPid <= 0) {
    return { observedPids: [], remainingPids: [], failures: ['TASK_OWNED_PROCESS_ROOT_PID_INVALID'] };
  }
  let observed = false;
  try { observed = posixProcessGroupExists(rootPid, killFn); }
  catch (error) { failures.push('TASK_OWNED_PROCESS_GROUP_OBSERVE_FAILED'); }
  if (observed) {
    try { killFn(-rootPid, 'SIGTERM'); }
    catch (error) { if (error?.code !== 'ESRCH') failures.push('TASK_OWNED_PROCESS_GROUP_SIGTERM_FAILED'); }
    sleepSync(settleMs);
    let remains = false;
    try { remains = posixProcessGroupExists(rootPid, killFn); }
    catch { failures.push('TASK_OWNED_PROCESS_GROUP_REOBSERVE_FAILED'); }
    if (remains) {
      try { killFn(-rootPid, 'SIGKILL'); }
      catch (error) { if (error?.code !== 'ESRCH') failures.push('TASK_OWNED_PROCESS_GROUP_SIGKILL_FAILED'); }
      sleepSync(settleMs);
    }
  }
  let remaining = false;
  try { remaining = posixProcessGroupExists(rootPid, killFn); }
  catch { failures.push('TASK_OWNED_PROCESS_GROUP_FINAL_OBSERVE_FAILED'); remaining = true; }
  if (remaining) failures.push('TASK_OWNED_PROCESS_GROUP_REMAINS');
  return { observedPids: observed ? [rootPid] : [], remainingPids: remaining ? [rootPid] : [], failures: [...new Set(failures)] };
}

function windowsTaskJobHostSource() {
  return zlib.gunzipSync(Buffer.from('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', 'base64')).toString('utf8');
}

function validWindowsJobOwnership(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value.kind === 'WINDOWS_JOB_OBJECT'
    && typeof value.jobName === 'string' && /^VLB-[a-f0-9]{24}$/.test(value.jobName)
    && typeof value.helperScript === 'string' && path.isAbsolute(value.helperScript)
    && typeof value.evidencePath === 'string' && path.isAbsolute(value.evidencePath)
    && typeof value.helperSha256 === 'string' && /^[a-f0-9]{64}$/.test(value.helperSha256);
}

function prepareWindowsTaskJob({ powershellExecutable, payloadArgv, cwd, helperRoot, artifactPath, evidencePath, fsImpl = fs } = {}) {
  assertAbsoluteExecutable(powershellExecutable, 'PowerShell executable');
  if (!Array.isArray(payloadArgv) || payloadArgv.length === 0 || !payloadArgv.every((item) => typeof item === 'string')) throw new TypeError('payloadArgv must be a non-empty string array');
  assertAbsoluteExecutable(payloadArgv[0], 'payload executable');
  for (const [label, value] of [['cwd',cwd],['helperRoot',helperRoot],['artifactPath',artifactPath],['evidencePath',evidencePath]]) {
    if (typeof value !== 'string' || !path.isAbsolute(value)) throw new TypeError(label + ' must be an absolute path');
  }
  fsImpl.mkdirSync(helperRoot, { recursive: true });
  fsImpl.mkdirSync(path.dirname(evidencePath), { recursive: true });
  const helperScript = path.join(helperRoot, 'vexlocalbridge-task-job.ps1');
  fsImpl.writeFileSync(helperScript, windowsTaskJobHostSource(), 'utf8');
  const jobName = 'VLB-' + crypto.randomBytes(12).toString('hex');
  const argvBase64 = Buffer.from(JSON.stringify(payloadArgv.slice(1)), 'utf8').toString('base64');
  const helperSha256 = crypto.createHash('sha256').update(fsImpl.readFileSync(helperScript)).digest('hex');
  const identity = { kind: 'WINDOWS_JOB_OBJECT', jobName, helperScript, helperSha256, evidencePath };
  return {
    identity,
    argv: [powershellExecutable,'-NoLogo','-NoProfile','-NonInteractive','-File',helperScript,'-Mode','Run','-Executable',payloadArgv[0],'-ArgvBase64',argvBase64,'-WorkingDirectory',cwd,'-JobName',jobName,'-ArtifactPath',artifactPath,'-EvidencePath',evidencePath],
  };
}

function cleanupWindowsTaskJob(windowsJobOwnership, powershellExecutable, options = {}) {
  const failures = [];
  if (!validWindowsJobOwnership(windowsJobOwnership)) return { observedPids: [], remainingPids: [], failures: ['WINDOWS_TASK_JOB_OWNERSHIP_MISSING'] };
  assertAbsoluteExecutable(powershellExecutable, 'PowerShell executable');
  let helperBytes;
  try { helperBytes = fs.readFileSync(windowsJobOwnership.helperScript); }
  catch { return { observedPids: [], remainingPids: [], failures: ['WINDOWS_TASK_JOB_HELPER_MISSING'] }; }
  const helperSha256 = crypto.createHash('sha256').update(helperBytes).digest('hex');
  if (helperSha256 !== windowsJobOwnership.helperSha256) return { observedPids: [], remainingPids: [], failures: ['WINDOWS_TASK_JOB_HELPER_IDENTITY_DRIFT'] };
  let evidence = null;
  try {
    evidence = JSON.parse(fs.readFileSync(windowsJobOwnership.evidencePath, 'utf8'));
  } catch {
    failures.push('WINDOWS_TASK_JOB_EVIDENCE_MISSING_OR_INVALID');
  }
  if (evidence && (evidence.CleanupVerified !== true || evidence.ActiveProcessesAfterCleanup !== 0)) failures.push('WINDOWS_TASK_JOB_CLEANUP_NOT_VERIFIED');
  const runFn = options.runFn || runArgvSync;
  const receipt = runFn([powershellExecutable,'-NoLogo','-NoProfile','-NonInteractive','-File',windowsJobOwnership.helperScript,'-Mode','Probe','-JobName',windowsJobOwnership.jobName], {
    cwd: options.cwd || process.cwd(), timeoutMs: options.timeoutMs ?? 30_000,
  });
  if (receipt.exitCode !== 0) failures.push('WINDOWS_TASK_JOB_STILL_PRESENT_OR_PROBE_FAILED');
  else {
    try {
      const probe = JSON.parse(receipt.stdout || '{}');
      if (probe.jobExists !== false || probe.jobName !== windowsJobOwnership.jobName) failures.push('WINDOWS_TASK_JOB_ABSENCE_EVIDENCE_INVALID');
    } catch { failures.push('WINDOWS_TASK_JOB_ABSENCE_EVIDENCE_INVALID'); }
  }
  const observedPids = Number.isInteger(evidence?.RootPid) ? [evidence.RootPid] : [];
  return { observedPids, remainingPids: failures.length === 0 ? [] : observedPids, failures: [...new Set(failures)], receipt, evidence };
}

function cleanupTaskOwnedProcessTree({ rootPid, platform = process.platform, powershellExecutable = null, cwd = process.cwd(), runFn = runArgvSync, killFn = process.kill, windowsJobOwnership = null } = {}) {
  if (platform === 'win32') return cleanupWindowsTaskJob(windowsJobOwnership, powershellExecutable, { cwd, runFn });
  if (!Number.isInteger(rootPid) || rootPid <= 0) return { observedPids: [], remainingPids: [], failures: ['TASK_OWNED_PROCESS_ROOT_PID_INVALID'] };
  return cleanupPosixProcessGroup(rootPid, { killFn });
}

function normalizeFailureIdentity(text, cwd = '') {
  return String(text || '').split(/\r?\n/).map((line) => line.trim())
    .filter((line) => /not ok|fail|error|ERR_/i.test(line))
    .map((line) => cwd ? line.split(cwd).join('<WORKSPACE>') : line)
    .map((line) => line.replace(/\b\d+(?:\.\d+)?ms\b/g, '<TIME>')).sort();
}

function failureFingerprint(text, cwd = '') {
  const identities = normalizeFailureIdentity(text, cwd);
  const hash = crypto.createHash('sha256').update(JSON.stringify(identities)).digest('hex');
  return { identities, hash, failureCount: identities.length };
}

function compareCandidateBaseline(candidate, baseline) {
  const candidateFp = failureFingerprint(candidate.output, candidate.cwd);
  const baselineFp = failureFingerprint(baseline.output, baseline.cwd);
  const sameFailureIdentity = candidateFp.hash === baselineFp.hash;
  return {
    candidate: candidateFp, baseline: baselineFp, sameFailureIdentity,
    candidateSpecificFailureCount: sameFailureIdentity ? 0 : Math.max(1, candidateFp.failureCount - baselineFp.failureCount),
  };
}

function inspectGitMembrane(cwd, gitExecutable, runFn = runArgvSync) {
  assertAbsoluteExecutable(gitExecutable, 'git executable');
  const staged = runFn([gitExecutable, 'diff', '--cached', '--name-only'], { cwd });
  const unstaged = runFn([gitExecutable, 'diff', '--name-only'], { cwd });
  const status = runFn([gitExecutable, 'status', '--porcelain=v1'], { cwd });
  return {
    stagedPaths: staged.stdout.split(/\r?\n/).filter(Boolean).sort(),
    unstagedPaths: unstaged.stdout.split(/\r?\n/).filter(Boolean).sort(),
    statusLines: status.stdout.split(/\r?\n/).filter(Boolean),
    receipts: [staged, unstaged, status],
  };
}

function assertPathsBlobEqual({ cwd, paths, leftRef, rightRef, gitExecutable, runFn = runArgvSync }) {
  assertAbsoluteExecutable(gitExecutable, 'git executable');
  const mismatches = [];
  for (const filePath of paths) {
    const left = runFn([gitExecutable, 'rev-parse', `${leftRef}:${filePath}`], { cwd });
    const right = runFn([gitExecutable, 'rev-parse', `${rightRef}:${filePath}`], { cwd });
    if (left.exitCode !== 0 || right.exitCode !== 0 || left.stdout.trim() !== right.stdout.trim()) mismatches.push(filePath);
  }
  return { equal: mismatches.length === 0, mismatches };
}

function atomicWriteJson(filePath, value, fsImpl = fs) {
  const directory = path.dirname(filePath);
  fsImpl.mkdirSync(directory, { recursive: true });
  const temp = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fsImpl.writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fsImpl.renameSync(temp, filePath);
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_HEARTBEAT_MS,
  DEFAULT_CHILD_OUTPUT_MAX_BYTES,
  isAbsoluteExecutablePath,
  assertAbsoluteExecutable,
  expandHome,
  ensureDirectory,
  assertPathWithinRoots,
  dependencyInstallCommand,
  resolveExecutable,
  resolveExecutableMap,
  runArgvSync,
  semanticAcceptance,
  runCommandMatrix,
  appendBoundedOutput,
  runBoundedChild,
  sleepSync,
  posixProcessGroupExists,
  cleanupPosixProcessGroup,
  windowsTaskJobHostSource,
  validWindowsJobOwnership,
  prepareWindowsTaskJob,
  cleanupWindowsTaskJob,
  cleanupTaskOwnedProcessTree,
  normalizeFailureIdentity,
  failureFingerprint,
  compareCandidateBaseline,
  inspectGitMembrane,
  assertPathsBlobEqual,
  atomicWriteJson,
};

// [VXG RealForever]
