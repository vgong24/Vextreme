'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const WORKMAP_ROOT = 'docs/ingestion/workmaps';
const DEFAULT_POINTER = `${WORKMAP_ROOT}/content-forge-current.json`;

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, deepSort(value[key])]));
}

function stableJson(value) {
  return `${JSON.stringify(deepSort(value), null, 2)}\n`;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function firstString(...values) {
  return values.find(value => typeof value === 'string' && value.length > 0) || null;
}

function normalizeRepoPath(repoPath) {
  if (typeof repoPath !== 'string' || repoPath.trim() === '') {
    throw new Error('repository path must be a non-empty string');
  }
  const normalized = path.posix.normalize(repoPath.replace(/\\/g, '/'));
  if (path.posix.isAbsolute(normalized) || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`unsafe repository path: ${repoPath}`);
  }
  return normalized;
}

function assertWorkmapPath(repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  if (!(normalized === WORKMAP_ROOT || normalized.startsWith(`${WORKMAP_ROOT}/`))) {
    throw new Error(`work-map path escapes ${WORKMAP_ROOT}: ${repoPath}`);
  }
  if (!normalized.endsWith('.json')) throw new Error(`work-map path must be JSON: ${repoPath}`);
  return normalized;
}

function loadJson(repoRoot, repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  const absolute = path.join(repoRoot, ...normalized.split('/'));
  const relative = path.relative(repoRoot, absolute);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`resolved path escapes repository root: ${repoPath}`);
  }
  let text;
  try {
    text = fs.readFileSync(absolute, 'utf8');
  } catch (error) {
    throw new Error(`cannot read ${normalized}: ${error.message}`);
  }
  try {
    return { value: JSON.parse(text), text, absolute, repoPath: normalized };
  } catch (error) {
    throw new Error(`invalid JSON in ${normalized}: ${error.message}`);
  }
}

function walkObjects(value, visitor, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (!Array.isArray(value)) visitor(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    walkObjects(child, visitor, seen);
  }
}

function allStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach(item => allStrings(item, output));
  else if (isObject(value)) Object.values(value).forEach(item => allStrings(item, output));
  return output;
}

module.exports = {
  DEFAULT_POINTER,
  WORKMAP_ROOT,
  allStrings,
  assertWorkmapPath,
  firstString,
  isObject,
  loadJson,
  normalizeRepoPath,
  sha256Text,
  stableJson,
  walkObjects,
};
