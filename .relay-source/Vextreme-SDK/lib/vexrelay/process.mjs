import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_SAFE_ENV_KEYS, SECRET_ENV_PATTERN } from './constants.mjs';

const URL_USERINFO = /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/)([^\s/@]+(?::[^\s/@]*)?)@/g;
const URL_USERINFO_DETECT = /\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s/@]+(?::[^\s/@]*)?@/;
const SCP_REMOTE = /^([^@\s]+)@([^:\s]+):(.+)$/;
const SCP_USERINFO_TEXT = /\b(?!git@)([A-Za-z0-9._%+~-]+)@([A-Za-z0-9.-]+):([^\s"'`]+)/gi;
const URL_QUERY_OR_FRAGMENT_TEXT = /\b([A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s"'`?#]+)(\?[^\s"'`#]*)?(#[^\s"'`]*)?/g;
const SENSITIVE_ARGUMENT_FLAG = /^--?(?:access[-_]?token|auth[-_]?token|token|password|passwd|secret|api[-_]?key|private[-_]?key|authorization|cookie|session)(?:=|:|$)/i;
const SENSITIVE_HEADER_ARGUMENT = /^(?:authorization|proxy-authorization|cookie|set-cookie|x-api-key)\s*:/i;
const SENSITIVE_INLINE_FLAG_ASSIGNMENT_TEXT = /(^|[\s"'`])(--?(?:access[-_]?token|auth[-_]?token|token|password|passwd|secret|api[-_]?key|private[-_]?key|authorization|cookie|session))([=:])([^\s"'`]+)/gim;
const SENSITIVE_FLAG_NEXT_VALUE_TEXT = /(^|[\s"'`])(--?(?:access[-_]?token|auth[-_]?token|token|password|passwd|secret|api[-_]?key|private[-_]?key|authorization|cookie|session))(\s+)([^\s"'`]+)/gim;
const SENSITIVE_HEADER_TEXT = /\b(authorization|proxy-authorization|cookie|set-cookie|x-api-key)(\s*:\s*)([^\r\n]+)/gi;

export function redactUrlCredentials(text) {
  return String(text ?? '')
    .replace(URL_USERINFO, '$1[REDACTED]@')
    .replace(SCP_USERINFO_TEXT, '[REDACTED]@$2:$3')
    .replace(URL_QUERY_OR_FRAGMENT_TEXT, (_match, base, query, fragment) => `${base}${query ? '?[REDACTED]' : ''}${fragment ? '#[REDACTED]' : ''}`)
    .replace(SENSITIVE_HEADER_TEXT, '$1$2[REDACTED]')
    .replace(SENSITIVE_INLINE_FLAG_ASSIGNMENT_TEXT, '$1$2$3[REDACTED]')
    .replace(SENSITIVE_FLAG_NEXT_VALUE_TEXT, '$1$2$3[REDACTED]');
}

export function remoteUrlHasCredentials(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const raw = value.trim();
  if (URL_USERINFO_DETECT.test(raw)) return true;
  try {
    const parsed = new URL(raw);
    return parsed.username !== '' || parsed.password !== '' || parsed.search !== '' || parsed.hash !== '';
  } catch {
    const scp = raw.match(SCP_REMOTE);
    return Boolean(scp && scp[1].toLowerCase() !== 'git');
  }
}


export function commandArgumentsContainCredentials(args) {
  if (!Array.isArray(args)) return false;
  for (const raw of args) {
    if (typeof raw !== 'string') continue;
    if (remoteUrlHasCredentials(raw) || SENSITIVE_ARGUMENT_FLAG.test(raw) || SENSITIVE_HEADER_ARGUMENT.test(raw)) return true;
  }
  return false;
}

export function sanitizeRemoteUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const raw = value.trim();
  try {
    const parsed = new URL(raw);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    const scp = raw.match(SCP_REMOTE);
    if (scp) return `${scp[1].toLowerCase() === 'git' ? 'git' : '[REDACTED]'}@${scp[2]}:${scp[3]}`;
    return redactUrlCredentials(raw);
  }
}

export function redactText(text, redactions = []) {
  let value = redactUrlCredentials(text);
  for (const secret of redactions.filter((entry) => typeof entry === 'string' && entry.length >= 4)) {
    value = value.split(secret).join('[REDACTED]');
  }
  return value;
}

export function commandDisplay(command, args = []) {
  const quote = (part) => (/^[A-Za-z0-9_./:@%+=,\\-]+$/.test(part) ? part : JSON.stringify(part));
  return redactUrlCredentials([command, ...args].map((part) => quote(String(part))).join(' '));
}

export function buildSafeEnvironment({ inheritKeys = [], explicit = {}, baseKeys = DEFAULT_SAFE_ENV_KEYS } = {}) {
  if (!Array.isArray(inheritKeys) || !inheritKeys.every((key) => typeof key === 'string' && key.length > 0)) {
    throw new Error('ENV_INHERIT_KEYS_INVALID');
  }
  const environment = {};
  const keys = new Set([...baseKeys, ...inheritKeys]);
  for (const key of keys) {
    if (SECRET_ENV_PATTERN.test(key)) throw new Error(`SECRET_ENV_INHERIT_FORBIDDEN:${key}`);
    if (key in process.env) environment[key] = process.env[key];
  }
  for (const [key, value] of Object.entries(explicit ?? {})) {
    if (SECRET_ENV_PATTERN.test(key)) throw new Error(`SECRET_ENV_INLINE_FORBIDDEN:${key}`);
    if (typeof value !== 'string') throw new Error(`ENV_VALUE_MUST_BE_STRING:${key}`);
    environment[key] = value;
  }
  environment.GIT_TERMINAL_PROMPT ??= '0';
  return environment;
}

function isPathCommand(value) {
  return path.isAbsolute(value) || value.includes('/') || value.includes('\\');
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function comparableBare(value) {
  const raw = String(value);
  return process.platform === 'win32' ? raw.toLowerCase() : raw;
}

export function isCommandAuthorized(command, allowExecutables) {
  if (!Array.isArray(allowExecutables) || allowExecutables.length === 0) return false;
  const commandIsPath = isPathCommand(command);
  return allowExecutables.some((entry) => {
    if (typeof entry !== 'string' || entry.length === 0 || isPathCommand(entry) !== commandIsPath) return false;
    return commandIsPath ? comparablePath(entry) === comparablePath(command) : comparableBare(entry) === comparableBare(command);
  });
}

async function executableFile(candidate, platform) {
  try {
    const stat = await fs.stat(candidate);
    if (!stat.isFile()) return null;
    if (platform !== 'win32') await fs.access(candidate, fsConstants.X_OK);
    return path.resolve(candidate);
  } catch { return null; }
}

export async function resolveCommandPath(command, { cwd = process.cwd(), environment = process.env, platform = process.platform } = {}) {
  if (typeof command !== 'string' || command.length === 0) return null;
  if (isPathCommand(command)) return executableFile(path.isAbsolute(command) ? command : path.resolve(cwd, command), platform);

  const pathValue = environment.PATH ?? environment.Path ?? environment.path ?? '';
  const directories = pathValue.split(path.delimiter).filter(Boolean);
  const rawExtensions = platform === 'win32'
    ? (environment.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : [''];
  const commandHasKnownExtension = platform === 'win32' && rawExtensions.some((extension) => command.toLowerCase().endsWith(extension.toLowerCase()));
  const extensions = commandHasKnownExtension ? [''] : rawExtensions;
  for (const directory of directories) {
    for (const extension of extensions) {
      const found = await executableFile(path.join(directory, `${command}${extension}`), platform);
      if (found) return found;
    }
  }
  return null;
}

function quoteCmdToken(token) {
  const value = String(token);
  if (/[&|<>^()%!\r\n]/.test(value)) throw new Error(`WINDOWS_CMD_TOKEN_REJECTED:${value}`);
  if (!/[\s"]/g.test(value)) return value;
  return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`;
}

function physicalCommand(resolvedCommand, args, platform) {
  if (platform !== 'win32' || !/\.(cmd|bat)$/i.test(resolvedCommand)) return { command: resolvedCommand, args };
  const comspec = process.env.ComSpec || 'C:\\Windows\\System32\\cmd.exe';
  const line = [resolvedCommand, ...args].map(quoteCmdToken).join(' ');
  return { command: comspec, args: ['/d', '/s', '/c', line] };
}

export async function runProcess({
  command,
  args = [],
  cwd,
  inheritEnvKeys = [],
  env = {},
  allowExecutables = [],
  timeoutMs = 120_000,
  acceptedExitCodes = [0],
  maxOutputBytes = 2_000_000,
  stdin = null,
}) {
  if (typeof command !== 'string' || command.length === 0) throw new Error('COMMAND_REQUIRED');
  if (!Array.isArray(args) || !args.every((arg) => typeof arg === 'string')) throw new Error('ARGS_MUST_BE_STRINGS');
  if (commandArgumentsContainCredentials(args)) throw new Error('COMMAND_ARGUMENT_CREDENTIALS_FORBIDDEN');
  if (!isCommandAuthorized(command, allowExecutables)) throw new Error(`COMMAND_NOT_AUTHORIZED:${redactUrlCredentials(command)}`);
  if (!Array.isArray(acceptedExitCodes) || acceptedExitCodes.length === 0 || !acceptedExitCodes.every(Number.isInteger)) {
    throw new Error('ACCEPTED_EXIT_CODES_REQUIRED');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30 * 60_000) throw new Error('INVALID_TIMEOUT_MS');
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1 || maxOutputBytes > 25_000_000) throw new Error('INVALID_MAX_OUTPUT_BYTES');

  const environment = buildSafeEnvironment({ inheritKeys: inheritEnvKeys, explicit: env });
  const resolvedCommand = await resolveCommandPath(command, { cwd: cwd ?? process.cwd(), environment });
  if (!resolvedCommand) throw new Error(`COMMAND_NOT_FOUND:${redactUrlCredentials(command)}`);
  const redactions = Object.values(env).filter((value) => typeof value === 'string' && value.length >= 4);
  const physical = physicalCommand(resolvedCommand, args, process.platform);
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const child = spawn(physical.command, physical.args, {
    cwd: cwd ? path.resolve(cwd) : undefined,
    env: environment,
    shell: false,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let overflow = false;
  const append = (current, chunk) => {
    if (current.length >= maxOutputBytes) { overflow = true; return current; }
    const remaining = maxOutputBytes - current.length;
    if (chunk.length > remaining) overflow = true;
    return Buffer.concat([current, chunk.subarray(0, remaining)]);
  };
  child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
  child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
  child.stdin.end(stdin === null || stdin === undefined ? undefined : String(stdin));

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 2_000).unref();
  }, timeoutMs);

  let exit;
  try {
    exit = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => resolve({ code, signal }));
    });
  } finally {
    clearTimeout(timer);
  }

  const result = {
    command: commandDisplay(command, args),
    resolvedExecutable: sanitizeRemoteUrl(resolvedCommand) ?? resolvedCommand,
    physicalCommand: commandDisplay(physical.command, physical.args),
    cwd: cwd ? path.resolve(cwd) : process.cwd(),
    inheritedEnvironmentKeys: [...new Set([...DEFAULT_SAFE_ENV_KEYS, ...inheritEnvKeys])].filter((key) => key in process.env),
    explicitEnvironmentKeys: Object.keys(env),
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedMs,
    exitCode: exit.code,
    signal: exit.signal,
    timedOut,
    outputTruncated: overflow,
    stdout: redactText(stdout.toString('utf8'), redactions),
    stderr: redactText(stderr.toString('utf8'), redactions),
  };
  if (timedOut) {
    const error = new Error(`PROCESS_TIMEOUT:${result.command}`);
    error.processResult = result;
    throw error;
  }
  if (!acceptedExitCodes.includes(exit.code)) {
    const error = new Error(`UNACCEPTED_EXIT_CODE:${exit.code}:${result.command}`);
    error.processResult = result;
    throw error;
  }
  return result;
}

export async function commandExists(command) {
  return Boolean(await resolveCommandPath(command));
}
