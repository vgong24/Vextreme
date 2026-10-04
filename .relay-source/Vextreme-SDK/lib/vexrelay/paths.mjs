import fs from 'node:fs/promises';
import path from 'node:path';
import { canonicalUtf8Compare } from './hash.mjs';

export function normalizeRelativePath(value, field = 'path') {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`INVALID_${field.toUpperCase()}:EMPTY`);
  if (path.isAbsolute(value)) throw new Error(`INVALID_${field.toUpperCase()}:ABSOLUTE`);
  if (/[\0\r\n]/.test(value)) throw new Error(`INVALID_${field.toUpperCase()}:CONTROL_CHARACTER`);
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`INVALID_${field.toUpperCase()}:TRAVERSAL_OR_EMPTY_SEGMENT`);
  }
  return normalized;
}


export function validateGitRemoteName(value, field = 'remote') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
    throw new Error(`INVALID_${field.toUpperCase()}:GIT_REMOTE_NAME`);
  }
  return value;
}

export function validateGitBranchName(value, field = 'branch') {
  if (typeof value !== 'string' || value.length < 1 || value.length > 255) {
    throw new Error(`INVALID_${field.toUpperCase()}:GIT_BRANCH_LENGTH`);
  }
  if (/^[./-]|[/.]$/.test(value) || value.includes('..') || value.includes('//') || value.includes('@{')) {
    throw new Error(`INVALID_${field.toUpperCase()}:GIT_BRANCH_STRUCTURE`);
  }
  if (/[\x00-\x20~^:?*\[\]\\]/.test(value) || value === '@') {
    throw new Error(`INVALID_${field.toUpperCase()}:GIT_BRANCH_CHARACTER`);
  }
  for (const segment of value.split('/')) {
    if (!segment || segment.startsWith('.') || segment.endsWith('.lock')) {
      throw new Error(`INVALID_${field.toUpperCase()}:GIT_BRANCH_SEGMENT`);
    }
  }
  return value;
}

export function validateGitRef(value, field = 'ref') {
  if (value === 'HEAD' || /^[0-9a-f]{40,64}$/i.test(value ?? '')) return value;
  if (typeof value === 'string' && value.startsWith('refs/heads/')) {
    validateGitBranchName(value.slice('refs/heads/'.length), field);
    return value;
  }
  validateGitBranchName(value, field);
  return value;
}

export function normalizeRepositoryRef(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
    throw new Error(`INVALID_REPOSITORY_REF:${String(value)}`);
  }
  return value;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function nearestExistingParent(candidate) {
  let current = candidate;
  for (;;) {
    try {
      await fs.lstat(current);
      return current;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw new Error(`NO_EXISTING_PARENT:${candidate}`);
      current = parent;
    }
  }
}

export async function realDirectory(rootPath, { create = false } = {}) {
  const absolute = path.resolve(rootPath);
  if (create) await fs.mkdir(absolute, { recursive: true });
  const stat = await fs.lstat(absolute);
  if (stat.isSymbolicLink()) throw new Error(`ROOT_SYMLINK_FORBIDDEN:${absolute}`);
  if (!stat.isDirectory()) throw new Error(`ROOT_NOT_DIRECTORY:${absolute}`);
  return fs.realpath(absolute);
}

export async function resolveWithinRoot(rootPath, relativePath, {
  forWrite = false,
  rejectSymlinks = true,
  createParents = false,
} = {}) {
  const rel = normalizeRelativePath(relativePath);
  const root = await realDirectory(rootPath);
  const candidate = path.resolve(root, rel);
  if (!isWithin(root, candidate)) throw new Error(`PATH_OUTSIDE_ROOT:${rel}`);

  const anchor = forWrite ? await nearestExistingParent(candidate) : candidate;
  const realAnchor = await fs.realpath(anchor);
  if (!isWithin(root, realAnchor)) throw new Error(`SYMLINK_ESCAPE:${rel}`);

  if (rejectSymlinks) {
    let cursor = root;
    for (const segment of rel.split('/')) {
      cursor = path.join(cursor, segment);
      try {
        const stat = await fs.lstat(cursor);
        if (stat.isSymbolicLink()) throw new Error(`SYMLINK_PATH_FORBIDDEN:${rel}`);
      } catch (error) {
        if (error?.code === 'ENOENT' && forWrite) break;
        throw error;
      }
    }
  }
  if (createParents) await fs.mkdir(path.dirname(candidate), { recursive: true });
  return candidate;
}

export function pathMatchesMembrane(relativePath, membrane) {
  const rel = normalizeRelativePath(relativePath);
  return membrane.some((entry) => {
    const bound = normalizeRelativePath(entry, 'membrane_path');
    return rel === bound || rel.startsWith(`${bound}/`);
  });
}

export function assertPathInMembrane(relativePath, membrane) {
  if (!Array.isArray(membrane) || membrane.length === 0) throw new Error('PATH_MEMBRANE_EMPTY');
  if (!pathMatchesMembrane(relativePath, membrane)) throw new Error(`PATH_OUTSIDE_MEMBRANE:${relativePath}`);
}

function globToRegExp(glob) {
  const normalized = normalizeRelativePath(glob, 'glob');
  let out = '^';
  for (let i = 0; i < normalized.length; i += 1) {
    const c = normalized[i];
    if (c === '*') {
      if (normalized[i + 1] === '*') { i += 1; out += '.*'; }
      else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else out += c.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(`${out}$`);
}

export function matchesAny(relativePath, globs) {
  const rel = normalizeRelativePath(relativePath);
  return (globs ?? []).some((glob) => globToRegExp(glob).test(rel));
}

export async function listFilesRecursive(rootPath, relativeRoot = null) {
  const root = await realDirectory(rootPath);
  const base = relativeRoot ? await resolveWithinRoot(root, relativeRoot) : root;
  const output = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => canonicalUtf8Compare(a.name, b.name))) {
      const full = path.join(current, entry.name);
      const rel = path.relative(root, full).replaceAll('\\', '/');
      if (entry.isSymbolicLink()) throw new Error(`SYMLINK_IN_TREE_FORBIDDEN:${rel}`);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) output.push(rel);
    }
  }
  await walk(base);
  return output;
}

export function repositoryPathKey(repositoryRef, relativePath) {
  return `${normalizeRepositoryRef(repositoryRef)}:${normalizeRelativePath(relativePath)}`;
}
